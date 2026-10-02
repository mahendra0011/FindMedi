/**
 * AUTHZ: call-log participation.
 *
 * `CallLog` rows are referenced by id from two routes that had NO participation
 * check at all:
 *
 *   POST /:id/recording — uploads an audio file and writes its URL onto ANY call
 *     record. A caller could attach a recording to someone else's consultation
 *     log and then read it back through the call detail route. A recording of a
 *     consultation is among the most sensitive artefacts the platform holds: it is
 *     the patient's own voice and their doctor's.
 *
 *   PUT /:id/status — rewrites status, duration, answeredAt and notes on ANY call
 *     record, letting a caller falsify another party's call history.
 *
 * Both now require the caller to be a party to the call. The sibling routes
 * (`GET /`, `GET /stats`, `DELETE /:id`) already scope by `caller`/`receiver`, so
 * this makes the module internally consistent rather than changing its policy.
 */

const same = (a, b) => {
  if (a == null || b == null) return false;
  const norm = (v) => String(typeof v === 'object' ? (v._id ?? v.id ?? v) : v);
  return norm(a) === norm(b);
};

/**
 * @returns {{ ok: true, reason: string } | { ok: false }}
 */
export function assertCallParticipant(req, call) {
  if (!call) return { ok: false };

  const userId = req.user?._id;
  if (!userId) return { ok: false };

  if (req.user?.role === 'superadmin') return { ok: true, reason: 'superadmin' };
  if (same(call.caller, userId)) return { ok: true, reason: 'caller' };
  if (same(call.receiver, userId)) return { ok: true, reason: 'receiver' };

  return { ok: false };
}

/** 404 rather than 403: a 403 confirms the id exists, which is an oracle. */
export function denyCallAccess(res) {
  return res.status(404).json({ success: false, message: 'Call record not found' });
}

export default assertCallParticipant;