import FamilyMember from '../models/FamilyMember.js';

/**
 * Object-level authz for profile-scoped patient reads (6.md §8: "object-level
 * authz (self or authorised family)"). Extracted as a helper because the
 * decision is made IN the handler — there is no route id to hand to
 * authorizeObject(), the profile arrives as a QUERY parameter, and the rule is
 * "this session manages this profile", not "this row is owned by this user".
 *
 * Semantics of `profileId`:
 *   - absent / 'self' / the session's own user id  -> self, no lookup at all;
 *   - anything else must be a FamilyMember row THIS account manages
 *     (`patientId` = session, or `dependentOf` = session) and still active.
 *
 * Misses answer with `{ ok: false }` and the caller returns **404, never 403**:
 * a 403 would confirm which family profile ids exist, the same oracle the
 * provider-detail and DSR routes refuse to give.
 *
 * The returned profile is a DTO allowlist — id/kind/name/relation only.
 * FamilyMember carries clinical and contact fields (allergies, medicalNotes,
 * phone, bloodGroup, emergencyCard, privacyPrefs); a dashboard SUMMARY must
 * not copy any of them into its response, and building the object key-by-key
 * is how that stays true after the model grows.
 *
 * Authz is fail-closed: any malformed id, unknown row, inactive member or
 * foreign account is the same NOT_FOUND.
 */
export async function resolveProfileAccess(req, profileId) {
  const me = String(req.user?._id ?? req.user?.id ?? '');
  const raw = profileId == null ? '' : String(profileId).trim();

  if (!raw || raw === 'self' || raw === me) {
    return { ok: true, profile: { id: me, kind: 'self' }, scope: null };
  }
  if (!/^[0-9a-f]{24}$/i.test(raw)) return { ok: false };

  const member = await FamilyMember.findOne({
    _id: raw,
    isActive: true,
    $or: [{ patientId: me }, { dependentOf: me }],
  }).lean();
  if (!member) return { ok: false };

  return {
    ok: true,
    profile: { id: raw, kind: 'family', name: member.name, relation: member.relation },
    scope: raw,
  };
}
