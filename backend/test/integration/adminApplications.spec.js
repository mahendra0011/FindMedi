import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

// 8.md 2 / 10.md 4.4 - the ops side: queue filters, the review workspace, and
// the decision state machine (including two-person approval for high-risk
// types). Every decision must leave a decision-log row and an audit row.

const SUPERADMIN = { _id: '7000000000000000000000f1', role: 'superadmin' };
const REVIEWER_B = { _id: '7000000000000000000000f2', role: 'superadmin' };
const STAFF = { _id: '7000000000000000000000f3', role: 'hospital_admin' };
const APPLICANT = '7000000000000000000000a1';

const APP_ID = '7000000000000000000000c3';
const PROVIDER_ID = '7000000000000000000000e5';

const CONFIG = {
  typeKey: 'dental_clinic',
  kind: 'facility',
  group: 'clinical',
  tier: 'T1',
  version: 3,
  requiredDocs: [
    { key: 'owner_id', label: 'Owner ID proof', mandatory: true, expiryRequired: false },
    { key: 'clinical_establishment_reg', label: 'Clinical establishment registration', mandatory: true, expiryRequired: true },
  ],
  optionalDocs: [{ key: 'nabh', label: 'NABH accreditation', mandatory: false }],
  approvalPolicy: { level: 'single', slaHours: 48, twoPerson: false },
};

const makeApplication = (overrides = {}) => ({
  _id: APP_ID,
  applicationId: 'APP-A1B2C3D4E5F6',
  applicantUserId: APPLICANT,
  providerId: null,
  typeKey: 'dental_clinic',
  configVersion: 3,
  group: 'clinical',
  tier: 'T1',
  twoPersonApproval: false,
  status: 'submitted',
  draft: { stepData: { account: { name: 'Smile Dental Studio' } } },
  submittedAt: new Date('2026-10-01T09:00:00Z'),
  decidedAt: null,
  resubmissionCount: 0,
  escalated: false,
  rejectionReason: '',
  needsInfo: [],
  decisions: [],
  checklistResults: [],
  approvalState: { firstApprovedBy: null, firstApprovedAt: null },
  appealOf: null,
  save: jestApi.fn().mockImplementation(async function save() { return this; }),
  ...overrides,
});

const appFind = jestApi.fn();
const appFindById = jestApi.fn();
const appCount = jestApi.fn();
const docFind = jestApi.fn();
const configFindOne = jestApi.fn();
const notificationCreate = jestApi.fn();
const providerCreate = jestApi.fn();
const auditLog = jestApi.fn();

let lastListFilter = null;
let lastDocumentsFilter = null;

const chain = (value) => {
  const q = query(value);
  q.select = () => q;
  return q;
};

jestApi.unstable_mockModule('../../src/models/ProviderApplication.js', () => ({
  __esModule: true,
  default: {
    find: (filter) => { lastListFilter = filter; return appFind(filter); },
    findById: (...args) => appFindById(...args),
    countDocuments: (...args) => appCount(...args),
  },
}));

jestApi.unstable_mockModule('../../src/models/ProviderDocument.js', () => ({
  __esModule: true,
  default: { find: (filter) => { lastDocumentsFilter = filter; return docFind(filter); } },
}));

jestApi.unstable_mockModule('../../src/models/ProviderTypeConfig.js', () => ({
  __esModule: true,
  default: { findOne: (...args) => configFindOne(...args) },
}));

jestApi.unstable_mockModule('../../src/models/Notification.js', () => ({
  __esModule: true,
  default: { create: (...args) => notificationCreate(...args) },
}));

jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({
  __esModule: true,
  default: { create: (...args) => providerCreate(...args) },
}));

jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('adminApplications', {});

beforeEach(() => {
  lastListFilter = null;
  lastDocumentsFilter = null;
  appFind.mockReset().mockImplementation(() => chain([makeApplication()]));
  appFindById.mockReset().mockImplementation(async () => makeApplication());
  appCount.mockReset().mockResolvedValue(1);
  docFind.mockReset().mockImplementation(() => chain([{ _id: '7000000000000000000000b9', docType: 'owner_id', status: 'uploaded', fileRef: { url: '/uploads/documents/x.pdf' } }]));
  configFindOne.mockReset().mockImplementation(async () => JSON.parse(JSON.stringify(CONFIG)));
  notificationCreate.mockReset().mockResolvedValue({});
  providerCreate.mockReset().mockImplementation(async (body) => ({ _id: PROVIDER_ID, ...body }));
  auditLog.mockReset().mockResolvedValue(undefined);
});

describe('GET /admin/applications (queue)', () => {
  it('refuses anyone below superadmin', async () => {
    const res = await as(STAFF).get('/');
    expect(res.status).toBe(403);
    expect(appFind).not.toHaveBeenCalled();
  });

  it('defaults to the SLA-bearing pending queue', async () => {
    const res = await as(SUPERADMIN).get('/');
    expect(res.status).toBe(200);
    expect(res.body.queue).toBe('pending');
    expect(lastListFilter).toEqual({ status: { $in: ['submitted', 'resubmitted', 'under_review'] } });
  });

  it('filters the high-risk lane on the two-person snapshot', async () => {
    const res = await as(SUPERADMIN).get('/').query({ queue: 'high_risk' });
    expect(res.status).toBe(200);
    expect(lastListFilter).toEqual({ twoPersonApproval: true });
  });

  it('rejects an unknown queue instead of widening to everything', async () => {
    const res = await as(SUPERADMIN).get('/').query({ queue: 'everything' });
    expect(res.status).toBe(400);
    expect(appFind).not.toHaveBeenCalled();
  });

  it('rejects an unknown status', async () => {
    const res = await as(SUPERADMIN).get('/').query({ status: 'bogus' });
    expect(res.status).toBe(400);
  });
});

describe('GET /admin/applications/:id (review workspace)', () => {
  it('returns the application, its documents and the type config', async () => {
    const res = await as(SUPERADMIN).get(`/${APP_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.application._id).toBe(APP_ID);
    expect(res.body.documents[0].fileRef.url).toBe('/uploads/documents/x.pdf');
    expect(res.body.config.typeKey).toBe('dental_clinic');
    expect(lastDocumentsFilter).toEqual({ applicationId: APP_ID });
  });

  it('404s a malformed id before touching the database', async () => {
    const res = await as(SUPERADMIN).get('/nope');
    expect(res.status).toBe(404);
    expect(appFindById).not.toHaveBeenCalled();
  });
});

describe('POST /admin/applications/:id/decision', () => {
  it('409s an application that is no longer decidable', async () => {
    appFindById.mockResolvedValue(makeApplication({ status: 'approved' }));
    const res = await as(SUPERADMIN).post(`/${APP_ID}/decision`).send({ decision: 'reject', reason: 'Registration number does not resolve' });
    expect(res.status).toBe(409);
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('requires a reason for a rejection', async () => {
    const res = await as(SUPERADMIN).post(`/${APP_ID}/decision`).send({ decision: 'reject' });
    expect(res.status).toBe(400);
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('requires at least one item for a needs-info', async () => {
    const res = await as(SUPERADMIN).post(`/${APP_ID}/decision`).send({ decision: 'needs_info', reason: 'Bank proof unreadable' });
    expect(res.status).toBe(400);
  });

  it('records a rejection with reason, decision log and audit', async () => {
    const app = makeApplication();
    appFindById.mockResolvedValue(app);
    const res = await as(SUPERADMIN).post(`/${APP_ID}/decision`)
      .send({ decision: 'reject', reason: 'Council registration number could not be verified' });
    expect(res.status).toBe(200);
    expect(app.status).toBe('rejected');
    expect(app.rejectionReason).toBe('Council registration number could not be verified');
    expect(app.decisions).toHaveLength(1);
    expect(app.decisions[0]).toEqual(expect.objectContaining({
      by: SUPERADMIN._id,
      decision: 'reject',
      reason: 'Council registration number could not be verified',
    }));
    expect(app.save).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith('application_decision', SUPERADMIN._id, expect.objectContaining({
      decision: 'reject',
      status: 'rejected',
      targetUserId: APPLICANT,
      reason: 'Council registration number could not be verified',
    }));
    expect(notificationCreate).toHaveBeenCalledWith(expect.objectContaining({
      userId: APPLICANT,
      type: 'system',
      referenceId: APP_ID,
    }));
  });

  it('reopens only the steps a needs-info lists', async () => {
    const app = makeApplication();
    appFindById.mockResolvedValue(app);
    const res = await as(SUPERADMIN).post(`/${APP_ID}/decision`).send({
      decision: 'needs_info',
      reason: 'Bank proof is unreadable',
      needsInfo: [{ docKey: 'bank_proof', comment: 'Re-upload a clearer scan of the cancelled cheque' }],
    });
    expect(res.status).toBe(200);
    expect(app.status).toBe('needs_info');
    expect(app.needsInfo).toHaveLength(1);
    expect(app.needsInfo[0].docKey).toBe('bank_proof');
    expect(app.needsInfo[0].resolvedAt).toBeNull();
    expect(auditLog).toHaveBeenCalledWith('application_decision', SUPERADMIN._id, expect.objectContaining({ status: 'needs_info' }));
  });

  it('refuses a checklist key the type never configured', async () => {
    const res = await as(SUPERADMIN).post(`/${APP_ID}/decision`).send({
      decision: 'approve',
      checklist: [{ key: 'nonsense_key', status: 'pass' }],
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('nonsense_key');
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('records checklist results against configured keys', async () => {
    const app = makeApplication();
    appFindById.mockResolvedValue(app);
    const res = await as(SUPERADMIN).post(`/${APP_ID}/decision`).send({
      decision: 'approve',
      checklist: [{ key: 'owner_id', status: 'pass' }, { key: 'clinical_establishment_reg', status: 'fail', note: 'Expired last month' }],
    });
    expect(res.status).toBe(200);
    expect(app.status).toBe('approved');
    expect(app.checklistResults).toHaveLength(2);
    expect(app.checklistResults[1]).toEqual(expect.objectContaining({ key: 'clinical_establishment_reg', status: 'fail', note: 'Expired last month', by: SUPERADMIN._id }));
    expect(app.decisions).toHaveLength(1);
  });

  it('approves a single-reviewer application outright', async () => {
    const app = makeApplication();
    appFindById.mockResolvedValue(app);
    const res = await as(SUPERADMIN).post(`/${APP_ID}/decision`).send({ decision: 'approve' });
    expect(res.status).toBe(200);
    expect(res.body.awaitingSecondApprover).toBe(false);
    expect(app.status).toBe('approved');
    expect(app.decidedAt).toBeInstanceOf(Date);
  });

  it('escalates without closing the application', async () => {
    const app = makeApplication();
    appFindById.mockResolvedValue(app);
    const res = await as(SUPERADMIN).post(`/${APP_ID}/decision`).send({ decision: 'escalate', reason: 'Possible duplicate registration' });
    expect(res.status).toBe(200);
    expect(app.status).toBe('under_review');
    expect(app.escalated).toBe(true);
    expect(app.decidedAt).toBeNull();
  });
});

describe('POST /admin/applications/:id/decision (two-person approval)', () => {
  it('parks the first approval and refuses a second one from the same reviewer', async () => {
    const app = makeApplication({ twoPersonApproval: true });
    appFindById.mockResolvedValue(app);

    const first = await as(SUPERADMIN).post(`/${APP_ID}/decision`).send({ decision: 'approve' });
    expect(first.status).toBe(200);
    expect(first.body.awaitingSecondApprover).toBe(true);
    expect(app.status).toBe('under_review');
    expect(String(app.approvalState.firstApprovedBy)).toBe(SUPERADMIN._id);
    expect(app.decisions).toHaveLength(1);

    const second = await as(SUPERADMIN).post(`/${APP_ID}/decision`).send({ decision: 'approve' });
    expect(second.status).toBe(409);
    expect(app.status).toBe('under_review');
    expect(app.decisions).toHaveLength(1); // no half-written audit trail
    expect(auditLog).toHaveBeenCalledTimes(1);
  });

  it('closes it once a different reviewer approves', async () => {
    const app = makeApplication({ twoPersonApproval: true, status: 'under_review' });
    app.approvalState = { firstApprovedBy: SUPERADMIN._id, firstApprovedAt: new Date() };
    appFindById.mockResolvedValue(app);

    const res = await as(REVIEWER_B).post(`/${APP_ID}/decision`).send({ decision: 'approve' });
    expect(res.status).toBe(200);
    expect(res.body.awaitingSecondApprover).toBe(false);
    expect(app.status).toBe('approved');
    expect(app.decisions).toHaveLength(1);
    expect(auditLog).toHaveBeenCalledWith('application_decision', REVIEWER_B._id, expect.objectContaining({ status: 'approved' }));
    expect(notificationCreate).toHaveBeenCalledWith(expect.objectContaining({ userId: APPLICANT, type: 'system' }));
  });
});

describe('POST /admin/applications/:id/decision (listing materialisation)', () => {
  it('turns an approval into a probationary listing built from the draft', async () => {
    const app = makeApplication({
      draft: {
        stepData: {
          account: { display_name: 'Smile Dental Studio' },
          location: { city: 'Pune', pincode: '411001', latitude: '18.52', longitude: '73.85' },
        },
      },
    });
    appFindById.mockResolvedValue(app);

    const res = await as(SUPERADMIN).post(`/${APP_ID}/decision`).send({ decision: 'approve' });
    expect(res.status).toBe(200);
    expect(providerCreate).toHaveBeenCalledTimes(1);

    const payload = providerCreate.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({
      ownerUserId: APPLICANT,
      kind: 'facility',
      type: 'dental_clinic',
      group: 'clinical',
      tier: 'T1',
      name: 'Smile Dental Studio',
      address: expect.objectContaining({ city: 'Pune', pincode: '411001', geo: { type: 'Point', coordinates: [73.85, 18.52] } }),
      status: 'approved',
      trusted: false,
      probation: { active: true, bookingCap: 10, payoutHold: true },
      verification: expect.objectContaining({ status: 'verified', level: 1, verifiedBy: SUPERADMIN._id }),
    }));
    expect(String(app.providerId)).toBe(PROVIDER_ID);
    expect(app.save).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith('provider_created_from_application', SUPERADMIN._id, expect.objectContaining({
      applicationId: APP_ID,
      providerId: PROVIDER_ID,
      targetUserId: APPLICANT,
    }));
  });

  it('creates no listing for a rejection', async () => {
    appFindById.mockResolvedValue(makeApplication());
    const res = await as(SUPERADMIN).post(`/${APP_ID}/decision`)
      .send({ decision: 'reject', reason: 'Council registration number could not be verified' });
    expect(res.status).toBe(200);
    expect(providerCreate).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalledWith('provider_created_from_application', expect.anything(), expect.anything());
  });

  it('creates no listing while the application is parked for a second approver', async () => {
    const app = makeApplication({ twoPersonApproval: true });
    appFindById.mockResolvedValue(app);
    const res = await as(SUPERADMIN).post(`/${APP_ID}/decision`).send({ decision: 'approve' });
    expect(res.status).toBe(200);
    expect(res.body.awaitingSecondApprover).toBe(true);
    expect(providerCreate).not.toHaveBeenCalled();
    expect(app.providerId).toBeNull();
  });

  it('creates the listing when the second reviewer completes the approval', async () => {
    const app = makeApplication({ twoPersonApproval: true, status: 'under_review' });
    app.approvalState = { firstApprovedBy: SUPERADMIN._id, firstApprovedAt: new Date() };
    appFindById.mockResolvedValue(app);

    const res = await as(REVIEWER_B).post(`/${APP_ID}/decision`).send({ decision: 'approve' });
    expect(res.status).toBe(200);
    expect(providerCreate).toHaveBeenCalledTimes(1);
    expect(String(app.providerId)).toBe(PROVIDER_ID);
  });

  it('never materialises a second listing for the same application', async () => {
    appFindById.mockResolvedValue(makeApplication({ status: 'under_review', providerId: PROVIDER_ID }));
    const res = await as(SUPERADMIN).post(`/${APP_ID}/decision`).send({ decision: 'approve' });
    expect(res.status).toBe(200);
    expect(providerCreate).not.toHaveBeenCalled();
  });
});
