import { jest as jestApi, describe, it, expect } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const grant = {
  _id: '660000000000000000000001', requesterId: 'operator-1', approverIds: ['approver-1'],
  subject: { type: 'mental_health', id: 'patient-1' }, reasonCode: 'safety_incident',
  reasonNote: 'Review a time-limited safety incident access for necessity and scope.', ticketId: 'INC-17',
  status: 'expired', createdAt: new Date(), expiresAt: new Date(),
  accessLog: [{ ts: new Date(), route: '/records/patient/abc', objectId: 'record-1' }],
  patientNotifiedAt: null, patientNotificationNextAt: new Date(), dpoReviewedAt: null,
};
const audit = jestApi.fn().mockResolvedValue(undefined);
const find = jestApi.fn(() => query([grant]));
const findOneAndUpdate = jestApi.fn(async (_filter, update) => ({ ...grant, ...update.$set }));

jestApi.unstable_mockModule('../../src/models/BreakGlassGrant.js', () => ({
  default: { find, findOneAndUpdate, updateOne: jestApi.fn().mockResolvedValue({ modifiedCount: 1 }) },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({ auditLogRequired: (...args) => audit(...args) }));
jestApi.unstable_mockModule('../../src/middleware/stepUpAuth.js', () => ({ requireStepUp: () => (_req, _res, next) => next() }));

const { as } = await mountApp('breakGlass', {}, { enforceAuthorize: true });

describe('DPO break-glass post-access review', () => {
  it('returns access metadata for DPO review without dereferencing clinical data', async () => {
    const res = await as({ _id: 'dpo-1', role: 'dpo' }).get('/review/queue');
    expect(res.status).toBe(200);
    expect(res.body.grants[0].subjectType).toBe('mental_health');
    expect(res.body.grants[0].accesses).toHaveLength(1);
    expect(JSON.stringify(res.body)).not.toContain('patientName');
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ status: { $in: ['approved', 'expired', 'revoked'] } }));
  });

  it('denies non-DPO access to the review route', async () => {
    const res = await as({ _id: 'owner-1', role: 'superadmin' }).get('/review/queue');
    expect(res.status).toBe(403);
  });

  it('records a reasoned review and required audit event', async () => {
    const res = await as({ _id: 'dpo-1', role: 'dpo' }).post(`/${grant._id}/review`).send({ note: 'Reviewed access scope and confirmed incident justification.' });
    expect(res.status).toBe(200);
    expect(findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ dpoReviewedAt: null }), expect.any(Object), expect.any(Object));
    expect(audit).toHaveBeenCalledWith('breakglass_dpo_reviewed', 'dpo-1', expect.any(Object));
  });
});
