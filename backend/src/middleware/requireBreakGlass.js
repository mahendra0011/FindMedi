import BreakGlassGrant from '../models/BreakGlassGrant.js';
import { auditLog } from './audit.js';

/**
 * Break-glass gate (file 23 §4.2/§5.2): platform roles hold NO default PHI
 * access. A request passes only with an APPROVED, unexpired grant for the
 * exact subject being read. Every pass is logged as `phi_access`
 * (who/what/when/why/grant) for DPO review + patient notification.
 *
 * resolveSubjectId: extracts the subject id from the request (params → query
 * → body). Routes for a single subject pass `{ type }`; subject id comes
 * from `req.params.id || req.params.patientId || req.query.patientId`.
 */
export const resolveBreakGlassSubjectId = (req) => {
  const raw = req.params?.id || req.params?.patientId || req.params?.recordId
    || req.query?.patientId || req.query?.subjectId || req.body?.patientId;
  return raw ? String(raw) : null;
};

export const requireBreakGlass = (subjectType) => async (req, res, next) => {
  try {
    const subjectId = resolveBreakGlassSubjectId(req);
    if (!subjectId) {
      return res.status(400).json({ message: 'Subject required for break-glass access' });
    }
    const me = String(req.user?._id || req.user?.id || '');
    const grant = await BreakGlassGrant.findOne({
      requesterId: req.user._id || req.user.id,
      'subject.id': subjectId,
      status: 'approved',
      expiresAt: { $gt: new Date() },
    });
    if (!grant) {
      await auditLog('breakglass_denied', req.user?._id, {
        route: req.originalUrl, subjectId, subjectType, ip: req.ip,
      }).catch(() => {});
      return res.status(403).json({ message: 'Break-glass approval required', code: 'BREAK_GLASS_REQUIRED' });
    }
    grant.accessLog.push({ ts: new Date(), route: req.originalUrl, objectId: subjectId });
    await grant.save().catch(() => {});
    await auditLog('phi_access', req.user?._id, {
      grantId: String(grant._id), route: req.originalUrl, subjectId,
      reasonCode: grant.reasonCode, ticketId: grant.ticketId,
      ip: req.ip, userAgent: req.get('user-agent'),
    }).catch(() => {});
    req.breakGlass = grant;
    void me;
    next();
  } catch (err) {
    next(err);
  }
};

export default requireBreakGlass;
