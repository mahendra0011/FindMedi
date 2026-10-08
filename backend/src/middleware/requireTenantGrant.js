import TenantGrant from '../models/TenantGrant.js';
import { auditLog } from './audit.js';

/**
 * File 25 §8: tenant-level emergency access. When normal checks
 * (care-team/tenant/object) deny, an APPROVED unexpired TenantGrant for the
 * exact subject still opens that ONE record/patient, view-scoped, audited.
 */
export async function findTenantGrant(tenantId, principalId, subjectId) {
  if (!tenantId || !principalId || !subjectId) return null;
  return TenantGrant.findOne({
    tenantId,
    principalId,
    'subject.id': String(subjectId),
    status: 'approved',
    expiresAt: { $gt: new Date() },
  });
}

export const requireTenantGrant = (subjectType) => async (req, res, next) => {
  try {
    const tenantId = req.user?.hospitalId || req.user?.facilityId;
    const subjectId = String(req.params?.id || req.params?.patientId || req.query?.patientId || '');
    if (!subjectId) return res.status(400).json({ message: 'Subject required' });
    const grant = await findTenantGrant(tenantId, req.user?._id || req.user?.id, subjectId);
    if (!grant) {
      return res.status(403).json({ message: 'Tenant grant required', code: 'TENANT_GRANT_REQUIRED' });
    }
    grant.accessLog.push({ ts: new Date(), route: req.originalUrl, objectId: subjectId });
    await grant.save().catch(() => {});
    await auditLog('tenant_grant_used', req.user?._id, {
      grantId: String(grant._id), route: req.originalUrl, subjectId,
      reasonCode: grant.reasonCode, ip: req.ip,
    }).catch(() => {});
    req.tenantGrant = grant;
    void subjectType;
    next();
  } catch (err) {
    next(err);
  }
};

export default requireTenantGrant;
