import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';
import { verifyFileUrlSignature } from '../../src/utils/signedFileUrl.js';

// 8.md 2 / 10.md 4.4 - the ops side: queue filters, the review workspace, and
// the decision state machine (including two-person approval for high-risk
// types). Every decision must leave a decision-log row and an audit row.

const SUPERADMIN = { _id: '7000000000000000000000f1', role: 'superadmin' };
const REVIEWER_B = { _id: '7000000000000000000000f2', role: 'superadmin' };
const STAFF = { _id: '7000000000000000000000f3', role: 'hospital_admin' };
const KYC_REVIEWER = { _id: '7000000000000000000000f5', role: 'kyc_reviewer' };
const ASSIGN_TARGET = '7000000000000000000000f6';
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
const providerFindById = jestApi.fn();
const auditLog = jestApi.fn();
// 2.md 6 — assignment targets are validated against the User row (active
// reviewer role), so the assign route needs this model stubbed too.
const userFindOne = jestApi.fn();

let lastListFilter = null;
let lastDocumentsFilter = null;
let lastUserFilter = null;

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
  default: {
    create: (...args) => providerCreate(...args),
    findById: (...args) => providerFindById(...args),
  },
}));

jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('adminApplications', {
  // Registered after the harness's own User stub, so it wins (harness note):
  // the assign route validates its target against the User row (active
  // reviewer role), so this spec needs findOne while keeping the rest of the
  // harness stub inert.
  '../../src/models/User.js': () => ({
    __esModule: true,
    default: { findOne: (filter) => { lastUserFilter = filter; return userFindOne(filter); } },
  }),
});

beforeEach(() => {
  lastListFilter = null;
  lastDocumentsFilter = null;
  lastUserFilter = null;
  appFind.mockReset().mockImplementation(() => chain([makeApplication()]));
  appFindById.mockReset().mockImplementation(async () => makeApplication());
  appCount.mockReset().mockResolvedValue(1);
  docFind.mockReset().mockImplementation(() => chain([{ _id: '7000000000000000000000b9', docType: 'owner_id', status: 'uploaded', fileRef: { url: '/uploads/documents/x.pdf' } }]));
  configFindOne.mockReset().mockImplementation(async () => JSON.parse(JSON.stringify(CONFIG)));
  notificationCreate.mockReset().mockResolvedValue({});
  providerCreate.mockReset().mockImplementation(async (body) => ({ _id: PROVIDER_ID, ...body }));
  providerFindById.mockReset().mockResolvedValue(null);
  userFindOne.mockReset().mockImplementation(() => chain({ _id: ASSIGN_TARGET }));
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

  // 2.md 7: activation stamps live on the LISTING, so the workspace fetch
  // must surface them or a reviewer could re-stamp an already-stamped item.
  it('embeds the listing onboarding when the application has a provider', async () => {
    appFindById.mockResolvedValue(makeApplication({ providerId: PROVIDER_ID, status: 'approved' }));
    providerFindById.mockImplementation(() =>
      chain({ _id: PROVIDER_ID, onboarding: { testBookingAt: '2026-10-02T10:00:00.000Z', trainingCompletedAt: null } }),
    );
    const res = await as(SUPERADMIN).get(`/${APP_ID}`);
    expect(res.status).toBe(200);
    expect(providerFindById).toHaveBeenCalledWith(PROVIDER_ID);
    expect(res.body.provider.onboarding.testBookingAt).toBe('2026-10-02T10:00:00.000Z');
  });

  it('skips the provider lookup entirely for an unmaterialised application', async () => {
    const res = await as(SUPERADMIN).get(`/${APP_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.provider).toBeNull();
    expect(providerFindById).not.toHaveBeenCalled();
  });

  // 2.md 5 — the preview link is a short-lived signature bound to the
  // reviewer who asked; an unsigned fetch of the same path is still gated by
  // the /uploads access check, and a copied link expires (and belongs to one
  // account) on its own.
  it('mints a short-lived signed preview URL per reviewer, never a raw static link', async () => {
    const res = await as(KYC_REVIEWER).get(`/${APP_ID}`);
    expect(res.status).toBe(200);
    const doc = res.body.documents[0];
    expect(doc.fileRef.url).toBe('/uploads/documents/x.pdf'); // stored ref untouched
    expect(doc.url).toMatch(/^\/uploads\/documents\/x\.pdf\?exp=\d+&sig=[0-9a-f]{64}$/);
    const { exp, sig } = Object.fromEntries(new URLSearchParams(String(doc.url).split('?')[1]));
    expect(verifyFileUrlSignature({ path: '/uploads/documents/x.pdf', exp, sig, userId: KYC_REVIEWER._id })).toBe(true);
    // bound to the reviewer who asked and to this exact file
    expect(verifyFileUrlSignature({ path: '/uploads/documents/x.pdf', exp, sig, userId: SUPERADMIN._id })).toBe(false);
    expect(verifyFileUrlSignature({ path: '/uploads/documents/OTHER.pdf', exp, sig, userId: KYC_REVIEWER._id })).toBe(false);
    // ...and it is genuinely short-lived
    expect(Number(exp) - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(600);
  });

  it('passes a remote-storage document URL through untouched (provider signs its own)', async () => {
    docFind.mockImplementation(() => chain([{
      _id: '7000000000000000000000ba',
      docType: 'owner_id',
      status: 'uploaded',
      fileRef: { url: 'https://cdn.example.test/doc.pdf', storage: 'remote' },
    }]));
    const res = await as(SUPERADMIN).get(`/${APP_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.documents[0].url).toBe('https://cdn.example.test/doc.pdf');
    expect(String(res.body.documents[0].url)).not.toContain('sig=');
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

describe('GET /admin/applications (flagged queue — 2.md 11)', () => {
  it('filters the fraud lane on the stored auto-check verdict', async () => {
    const res = await as(SUPERADMIN).get('/').query({ queue: 'flagged' });
    expect(res.status).toBe(200);
    expect(res.body.queue).toBe('flagged');
    expect(lastListFilter).toEqual({ 'autoChecks.verdict': { $in: ['review', 'conflict'] } });
  });
});

describe('POST /admin/applications/:id/activation (2.md 7)', () => {
  const activationApp = (overrides = {}) => makeApplication({ status: 'approved', providerId: PROVIDER_ID, ...overrides });
  const makeListing = (overrides = {}) => ({
    _id: PROVIDER_ID,
    onboarding: {},
    save: jestApi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  it('404s a malformed id before touching the database', async () => {
    const res = await as(SUPERADMIN).post('/nope/activation').send({ item: 'test_booking', done: true });
    expect(res.status).toBe(404);
    expect(appFindById).not.toHaveBeenCalled();
  });

  it('rejects an item the schema does not know', async () => {
    const res = await as(SUPERADMIN).post(`/${APP_ID}/activation`).send({ item: 'approval', done: true });
    expect(res.status).toBe(400);
    expect(appFindById).not.toHaveBeenCalled();
  });

  it('409s while the application has no listing to stamp', async () => {
    appFindById.mockResolvedValue(makeApplication({ providerId: null }));
    const res = await as(SUPERADMIN).post(`/${APP_ID}/activation`).send({ item: 'test_booking', done: true });
    expect(res.status).toBe(409);
    expect(providerFindById).not.toHaveBeenCalled();
  });

  it('stamps the reviewer flag onto the listing and audits it', async () => {
    const app = activationApp();
    const listing = makeListing();
    appFindById.mockResolvedValue(app);
    providerFindById.mockResolvedValue(listing);

    const res = await as(SUPERADMIN).post(`/${APP_ID}/activation`).send({ item: 'test_booking', done: true });
    expect(res.status).toBe(200);
    expect(listing.onboarding.testBookingAt).toBeInstanceOf(Date);
    expect(listing.save).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith('application_activation_flag', SUPERADMIN._id, expect.objectContaining({
      applicationId: APP_ID,
      providerId: PROVIDER_ID,
      item: 'test_booking',
      done: true,
    }));
    // Serialized back as an ISO string — presence is the contract here.
    expect(typeof res.body.onboarding.testBookingAt).toBe('string');
  });

  it('clears a stamp when the reviewer un-checks it', async () => {
    const listing = makeListing({ onboarding: { testBookingAt: new Date('2026-10-01T10:00:00Z') } });
    appFindById.mockResolvedValue(activationApp());
    providerFindById.mockResolvedValue(listing);

    const res = await as(SUPERADMIN).post(`/${APP_ID}/activation`).send({ item: 'test_booking', done: false });
    expect(res.status).toBe(200);
    expect(listing.onboarding.testBookingAt).toBeNull();
    expect(auditLog).toHaveBeenCalledWith('application_activation_flag', SUPERADMIN._id, expect.objectContaining({ done: false }));
  });

  it('404s when the listing the application points at is gone', async () => {
    appFindById.mockResolvedValue(activationApp());
    providerFindById.mockResolvedValue(null);
    const res = await as(SUPERADMIN).post(`/${APP_ID}/activation`).send({ item: 'training', done: true });
    expect(res.status).toBe(404);
    expect(auditLog).not.toHaveBeenCalled();
  });
});

describe('POST /admin/applications/:id/claim (2.md 6)', () => {
  it('appends the caller as the current holder and audits it', async () => {
    const app = makeApplication({ reviewerAssignments: [] });
    appFindById.mockResolvedValue(app);
    const res = await as(KYC_REVIEWER).post(`/${APP_ID}/claim`).send({ queue: 'pending' });
    expect(res.status).toBe(200);
    expect(res.body.alreadyClaimed).toBe(false);
    expect(app.reviewerAssignments).toHaveLength(1);
    expect(app.reviewerAssignments[0]).toMatchObject({
      reviewerId: KYC_REVIEWER._id,
      assignedBy: KYC_REVIEWER._id,
      queue: 'pending',
    });
    expect(app.reviewerAssignments[0].assignedAt).toBeInstanceOf(Date);
    expect(app.save).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith('application_claimed', KYC_REVIEWER._id, expect.objectContaining({
      applicationId: APP_ID,
      queue: 'pending',
    }));
  });

  it('is a no-op while the caller already holds the row', async () => {
    const app = makeApplication({
      reviewerAssignments: [{ reviewerId: KYC_REVIEWER._id, assignedBy: KYC_REVIEWER._id, assignedAt: new Date(), queue: 'pending' }],
    });
    appFindById.mockResolvedValue(app);
    const res = await as(KYC_REVIEWER).post(`/${APP_ID}/claim`).send({});
    expect(res.status).toBe(200);
    expect(res.body.alreadyClaimed).toBe(true);
    expect(app.reviewerAssignments).toHaveLength(1);
    expect(app.save).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('409s once the application is decided', async () => {
    const app = makeApplication({ status: 'approved' });
    appFindById.mockResolvedValue(app);
    const res = await as(KYC_REVIEWER).post(`/${APP_ID}/claim`).send({});
    expect(res.status).toBe(409);
    expect(app.save).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('refuses a queue the console does not have', async () => {
    const app = makeApplication();
    appFindById.mockResolvedValue(app);
    const res = await as(KYC_REVIEWER).post(`/${APP_ID}/claim`).send({ queue: 'everything' });
    expect(res.status).toBe(400);
    expect(app.save).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });
});

describe('POST /admin/applications/:id/assign (2.md 6)', () => {
  it('superadmin hands the row to a named reviewer, pings them, audits it', async () => {
    const app = makeApplication({ reviewerAssignments: [] });
    appFindById.mockResolvedValue(app);
    const res = await as(SUPERADMIN).post(`/${APP_ID}/assign`).send({ reviewerId: ASSIGN_TARGET, queue: 'flagged' });
    expect(res.status).toBe(200);
    expect(app.reviewerAssignments).toHaveLength(1);
    expect(app.reviewerAssignments[0]).toMatchObject({
      reviewerId: ASSIGN_TARGET,
      assignedBy: SUPERADMIN._id,
      queue: 'flagged',
    });
    expect(app.save).toHaveBeenCalled();
    expect(lastUserFilter).toMatchObject({ _id: ASSIGN_TARGET, status: 'active' });
    expect(lastUserFilter.role.$in).toEqual(['superadmin', 'kyc_reviewer']);
    expect(notificationCreate).toHaveBeenCalledTimes(1);
    expect(notificationCreate.mock.calls[0][0]).toMatchObject({
      userId: ASSIGN_TARGET,
      type: 'system',
      referenceId: APP_ID,
    });
    expect(auditLog).toHaveBeenCalledWith('application_assigned', SUPERADMIN._id, expect.objectContaining({
      applicationId: APP_ID,
      reviewerId: ASSIGN_TARGET,
      queue: 'flagged',
    }));
  });

  it('refuses a target that is not an active reviewer', async () => {
    const app = makeApplication();
    appFindById.mockResolvedValue(app);
    userFindOne.mockImplementation(() => chain(null));
    const res = await as(SUPERADMIN).post(`/${APP_ID}/assign`).send({ reviewerId: ASSIGN_TARGET });
    expect(res.status).toBe(400);
    expect(app.save).not.toHaveBeenCalled();
    expect(notificationCreate).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('a kyc_reviewer may not assign (superadmin only)', async () => {
    const res = await as(KYC_REVIEWER).post(`/${APP_ID}/assign`).send({ reviewerId: ASSIGN_TARGET });
    expect(res.status).toBe(403);
    expect(appFindById).not.toHaveBeenCalled();
  });

  it('rejects a malformed reviewerId before anything loads', async () => {
    const res = await as(SUPERADMIN).post(`/${APP_ID}/assign`).send({ reviewerId: 'nope' });
    expect(res.status).toBe(400);
    expect(appFindById).not.toHaveBeenCalled();
  });

  it('409s assigning an application that is already decided', async () => {
    appFindById.mockResolvedValue(makeApplication({ status: 'rejected' }));
    const res = await as(SUPERADMIN).post(`/${APP_ID}/assign`).send({ reviewerId: ASSIGN_TARGET });
    expect(res.status).toBe(409);
    expect(userFindOne).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });
});
