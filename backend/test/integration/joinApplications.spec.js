import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';
import { isEncrypted } from '../../src/utils/fieldEncryption.js';
import { encryptPhi, joinPhiIndex } from '../../src/utils/phiFields.js';

// 10.md 4.2 - the applicant's side of the join flow. These assertions are
// about the gates a client cannot talk past: unknown type, foreign id, a
// status the applicant may no longer touch, a required document still missing.

const OWNER_ID = '7000000000000000000000a1';
const STRANGER_ID = '7000000000000000000000b2';
const APP_ID = '7000000000000000000000c3';
const OTHER_APP_ID = '7000000000000000000000d4';

const owner = { _id: OWNER_ID, role: 'doctor' };
const stranger = { _id: STRANGER_ID, role: 'doctor' };

const CONFIG = {
  typeKey: 'dental_clinic',
  kind: 'facility',
  group: 'clinical',
  tier: 'T1',
  version: 3,
  agreementTemplateId: 'tmpl_clinical',
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
  applicantUserId: OWNER_ID,
  providerId: null,
  typeKey: 'dental_clinic',
  configVersion: 3,
  group: 'clinical',
  tier: 'T1',
  twoPersonApproval: false,
  status: 'draft',
  draft: { stepData: { account: { name: 'Smile Dental Studio' } } },
  submittedAt: null,
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
const appFindOne = jestApi.fn();
const appCount = jestApi.fn();
const appCreate = jestApi.fn();
const docFind = jestApi.fn();
const docFindOne = jestApi.fn();
const docCreate = jestApi.fn();
const configFindOne = jestApi.fn();
const saveApplicationDocument = jestApi.fn();
const validateFileContent = jestApi.fn();
const scanBufferForMalware = jestApi.fn();
const auditLog = jestApi.fn();
// 2.md 11 — the submit-time anti-fraud screen is a SEAM here: its own logic is
// unit-tested in applicationAutoChecks.spec.js; this file only asserts that
// submit STORES the verdict and that a conflict tightens two-person approval.
const autoChecksRun = jestApi.fn();
// 2.md 7 — the activation checklist reads the materialised listing.
const providerFindById = jestApi.fn();
// 2.md 10 — the versioned policy-acceptance ledger (the real lib runs; its
// model is the seam, so this file only asserts WHAT gets recorded at submit).
const policyFindOne = jestApi.fn();
const policyCreate = jestApi.fn();
// 2.md 10 — submit re-reads the applicant's OTP-verification state (the
// harness's verified default user is overridden here so both sides work).
const userFindById = jestApi.fn();
// 2.md 14 — submit pings (applicant receipt + holder heads-up on resubmit).
const notificationCreate = jestApi.fn();

let lastAppFilter = null;
let lastDocFilter = null;

const chain = (value) => {
  const q = query(value);
  q.select = () => q;
  return q;
};

jestApi.unstable_mockModule('../../src/models/ProviderApplication.js', () => ({
  __esModule: true,
  default: {
    find: (filter) => { lastAppFilter = filter; return appFind(filter); },
    findById: (...args) => appFindById(...args),
    findOne: (...args) => appFindOne(...args),
    countDocuments: (...args) => appCount(...args),
    create: (...args) => appCreate(...args),
  },
}));

jestApi.unstable_mockModule('../../src/models/ProviderDocument.js', () => ({
  __esModule: true,
  default: {
    find: (filter) => { lastDocFilter = filter; return docFind(filter); },
    findOne: (...args) => docFindOne(...args),
    create: (...args) => docCreate(...args),
  },
}));

jestApi.unstable_mockModule('../../src/models/ProviderTypeConfig.js', () => ({
  __esModule: true,
  default: { findOne: (...args) => configFindOne(...args) },
}));

jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

// Content checks and the ClamAV call are exercised by upload.js's own suite;
// here the seam is stubbed so a synthetic buffer does not depend on the native
// file-type module, and so no bytes are written to public/uploads.
jestApi.unstable_mockModule('../../src/middleware/upload.js', () => ({
  validateFileContent: (...args) => validateFileContent(...args),
  scanBufferForMalware: (...args) => scanBufferForMalware(...args),
}));

jestApi.unstable_mockModule('../../src/services/applicationDocumentStore.js', () => ({
  saveApplicationDocument: (...args) => saveApplicationDocument(...args),
  APPLICATION_DOCUMENTS_DIR: 'public/uploads/documents',
}));

jestApi.unstable_mockModule('../../src/lib/applicationAutoChecks.js', () => ({
  __esModule: true,
  runAutoChecks: (...args) => autoChecksRun(...args),
  // join.js hashes the submit IP through this module before the screen runs
  // (2.md 11 ip_cluster); a deterministic stand-in keeps this suite off the
  // real digest while still exercising the assignment.
  hashIp: (ip) => (String(ip ?? '').trim() ? `hash_${String(ip).trim()}` : null),
}));

jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({
  __esModule: true,
  default: { findById: (...args) => providerFindById(...args) },
}));

jestApi.unstable_mockModule('../../src/models/PolicyAcceptance.js', () => ({
  __esModule: true,
  default: {
    findOne: (...args) => policyFindOne(...args),
    create: (...args) => policyCreate(...args),
  },
}));

jestApi.unstable_mockModule('../../src/models/Notification.js', () => ({
  __esModule: true,
  default: { create: (...args) => notificationCreate(...args) },
}));

const { as } = await mountApp('join', {
  // Registered after the harness's own User stub, so it wins (harness note):
  // this spec needs to flip isVerified for the submit guard, while keeping the
  '../../src/models/User.js': () => ({
    __esModule: true,
    default: { findById: (...args) => userFindById(...args) },
  }),
});

beforeEach(() => {
  lastAppFilter = null;
  lastDocFilter = null;
  appFind.mockReset().mockImplementation(() => chain([makeApplication()]));
  appFindById.mockReset().mockImplementation(async () => makeApplication());
  appFindOne.mockReset().mockResolvedValue(null);
  appCount.mockReset().mockResolvedValue(1);
  appCreate.mockReset().mockImplementation(async (body) => ({ _id: APP_ID, ...body }));
  docFind.mockReset().mockImplementation(() => chain([]));
  docFindOne.mockReset().mockResolvedValue(null);
  docCreate.mockReset().mockImplementation(async (body) => ({ _id: OTHER_APP_ID, ...body }));
  configFindOne.mockReset().mockImplementation(async () => JSON.parse(JSON.stringify(CONFIG)));
  saveApplicationDocument.mockReset().mockResolvedValue({ url: '/uploads/documents/x-owner_id.pdf', key: 'x-owner_id.pdf', storage: 'local' });
  validateFileContent.mockReset().mockResolvedValue(true);
  scanBufferForMalware.mockReset().mockResolvedValue({ clean: true, skipped: true });
  auditLog.mockReset().mockResolvedValue(undefined);
  autoChecksRun.mockReset().mockResolvedValue({ verdict: 'clear', runAt: new Date(), forceTwoPerson: false, checks: [] });
  providerFindById.mockReset().mockImplementation(() => chain(null));
  policyFindOne.mockReset().mockImplementation(() => ({ lean: async () => null }));
  policyCreate.mockReset().mockImplementation(async (body) => ({ toObject: () => ({ _id: 'pa1', ...body }) }));
  notificationCreate.mockReset().mockResolvedValue({});
  userFindById.mockReset().mockImplementation(() => chain({ _id: OWNER_ID, isVerified: true, twoFactorEnabled: false }));
});

describe('POST /join/applications', () => {
  it('401s an anonymous start', async () => {
    const res = await as().post('/').send({ typeKey: 'dental_clinic' });
    expect(res.status).toBe(401);
  });

  it('creates a draft pinned to the config that was offered, not to client input', async () => {
    const res = await as(owner).post('/').send({ typeKey: 'dental_clinic', kind: 'vendor' });
    expect(res.status).toBe(400); // `.strict()` - no client-supplied kind/group/tier
    expect(appCreate).not.toHaveBeenCalled();

    appCreate.mockImplementation(async (body) => ({ _id: APP_ID, ...body }));
    const ok = await as(owner).post('/').send({ typeKey: 'dental_clinic' });
    expect(ok.status).toBe(201);
    expect(appCreate).toHaveBeenCalledWith(expect.objectContaining({
      applicantUserId: OWNER_ID,
      typeKey: 'dental_clinic',
      configVersion: 3,
      kind: 'facility',
      group: 'clinical',
      tier: 'T1',
      twoPersonApproval: false,
      status: 'draft',
      appealOf: null,
    }));
    expect(auditLog).toHaveBeenCalledWith('create_provider_application', OWNER_ID, expect.objectContaining({ typeKey: 'dental_clinic' }));
  });

  it('refuses a type the config does not offer', async () => {
    configFindOne.mockResolvedValue(null);
    const res = await as(owner).post('/').send({ typeKey: 'dental_clinic' });
    expect(res.status).toBe(400);
    expect(appCreate).not.toHaveBeenCalled();
  });

  it('refuses an appeal of a decision that is not a rejection', async () => {
    const prior = makeApplication({ _id: OTHER_APP_ID, status: 'draft' });
    appFindById.mockResolvedValue(prior);
    const res = await as(owner).post('/').send({ typeKey: 'dental_clinic', appealOf: OTHER_APP_ID });
    expect(res.status).toBe(400);
  });

  it('allows only one appeal per rejection', async () => {
    const prior = makeApplication({ _id: OTHER_APP_ID, status: 'rejected' });
    appFindById.mockResolvedValue(prior);
    appFindOne.mockResolvedValue({ _id: OTHER_APP_ID });
    const res = await as(owner).post('/').send({ typeKey: 'dental_clinic', appealOf: OTHER_APP_ID });
    expect(res.status).toBe(409);
    expect(appCreate).not.toHaveBeenCalled();
  });

  it('404s an appeal of someone else\'s application', async () => {
    const prior = makeApplication({ _id: OTHER_APP_ID, applicantUserId: STRANGER_ID, status: 'rejected' });
    appFindById.mockResolvedValue(prior);
    const res = await as(owner).post('/').send({ typeKey: 'dental_clinic', appealOf: OTHER_APP_ID });
    expect(res.status).toBe(404);
  });
});

describe('GET /join/applications', () => {
  it('scopes the list to the caller', async () => {
    const res = await as(owner).get('/').query({ status: 'draft' });
    expect(res.status).toBe(200);
    expect(lastAppFilter).toEqual({ applicantUserId: OWNER_ID, status: 'draft' });
    expect(res.body.total).toBe(1);
    expect(res.body.limit).toBe(20);
  });

  it('401s without a session', async () => {
    const res = await as().get('/');
    expect(res.status).toBe(401);
  });
});

describe('GET /join/applications/:id', () => {
  it('returns the applicant\'s own application and its documents', async () => {
    const res = await as(owner).get(`/${APP_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.application._id).toBe(APP_ID);
    expect(res.body.documents).toEqual([]);
    expect(lastDocFilter).toEqual({ applicationId: APP_ID });
  });

  it('404s an application the caller does not own', async () => {
    appFindById.mockResolvedValue(makeApplication({ applicantUserId: STRANGER_ID }));
    const res = await as(owner).get(`/${APP_ID}`);
    expect(res.status).toBe(404);
    expect(docFind).not.toHaveBeenCalled();
  });

  it('404s a malformed id before touching the database', async () => {
    const res = await as(owner).get('/not-an-id');
    expect(res.status).toBe(404);
    expect(appFindById).not.toHaveBeenCalled();
  });

  it('decrypts draft secrets for the owner and strips the server-side index (P2-9)', async () => {
    const cipher = encryptPhi('ProviderApplication', 'draft.stepData.pan', 'ABCDE1234F');
    appFindById.mockResolvedValue(makeApplication({
      draft: { stepData: { account: { name: 'Smile Dental Studio', pan: cipher } } },
      phiIndexes: { pan: joinPhiIndex('pan', 'ABCDE1234F'), gstin: null, registration_number: null },
    }));
    const res = await as(owner).get(`/${APP_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.application.draft.stepData.account.pan).toBe('ABCDE1234F');
    expect(res.body.application.draft.stepData.account.name).toBe('Smile Dental Studio');
    expect(res.body.application.phiIndexes).toBeUndefined();
  });
});

describe('PATCH /join/applications/:id (autosave)', () => {
  it('merges the saved step without clobbering the others', async () => {
    const app = makeApplication();
    appFindById.mockResolvedValue(app);
    const res = await as(owner).patch(`/${APP_ID}`).send({ draft: { location: { city: 'Pune' } } });
    expect(res.status).toBe(200);
    expect(app.draft.stepData).toEqual({
      account: { name: 'Smile Dental Studio' },
      location: { city: 'Pune' },
    });
    expect(app.save).toHaveBeenCalled();
  });

  it('409s once the application is out of the applicant\'s hands', async () => {
    const app = makeApplication({ status: 'under_review' });
    appFindById.mockResolvedValue(app);
    const res = await as(owner).patch(`/${APP_ID}`).send({ draft: { account: { name: 'x' } } });
    expect(res.status).toBe(409);
    expect(app.save).not.toHaveBeenCalled();
  });

  it('refuses fields outside the draft', async () => {
    const res = await as(owner).patch(`/${APP_ID}`).send({ draft: { account: {} }, status: 'approved' });
    expect(res.status).toBe(400);
  });

  it('encrypts a tax field at rest and records its blind index (P2-9)', async () => {
    const app = makeApplication();
    appFindById.mockResolvedValue(app);
    const res = await as(owner).patch(`/${APP_ID}`).send({ draft: { account: { pan: 'ABCDE1234F' } } });
    expect(res.status).toBe(200);
    const stored = app.draft.stepData.account.pan;
    expect(isEncrypted(stored)).toBe(true);
    expect(stored).not.toContain('ABCDE1234F');
    expect(app.phiIndexes.pan).toBe(joinPhiIndex('pan', 'ABCDE1234F'));
    // the applicant still reads their own value back as plaintext
    expect(res.body.application.draft.stepData.account.pan).toBe('ABCDE1234F');
    expect(res.body.application.phiIndexes).toBeUndefined();
    expect(app.save).toHaveBeenCalled();
  });

  it('keeps the stored ciphertext and index when the client echoes a masked PAN', async () => {
    const cipher = encryptPhi('ProviderApplication', 'draft.stepData.pan', 'ABCDE1234F');
    const app = makeApplication({
      draft: { stepData: { account: { name: 'Smile Dental Studio', pan: cipher } } },
      phiIndexes: { pan: joinPhiIndex('pan', 'ABCDE1234F'), gstin: null, registration_number: null },
    });
    appFindById.mockResolvedValue(app);
    const res = await as(owner).patch(`/${APP_ID}`).send({ draft: { account: { name: 'Smile Dental Studio', pan: '****1234' } } });
    expect(res.status).toBe(200);
    expect(app.draft.stepData.account.pan).toBe(cipher);
    expect(app.phiIndexes.pan).toBe(joinPhiIndex('pan', 'ABCDE1234F'));
    expect(res.body.application.draft.stepData.account.pan).toBe('ABCDE1234F');
  });
});

describe('POST /join/applications/:id/submit', () => {
  it('refuses an unverified applicant with the join-specific code (2.md 10)', async () => {
    const app = makeApplication();
    appFindById.mockResolvedValue(app);
    userFindById.mockImplementation(() => chain({ _id: OWNER_ID, isVerified: false, twoFactorEnabled: false }));
    const res = await as(owner).post(`/${APP_ID}/submit`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('JOIN_UNVERIFIED');
    expect(res.body.requiresVerification).toBe(true);
    // Nothing downstream runs: no screen, no ledger row, no save.
    expect(autoChecksRun).not.toHaveBeenCalled();
    expect(policyFindOne).not.toHaveBeenCalled();
    expect(app.save).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('blocks submission while a required document is missing', async () => {
    const app = makeApplication();
    appFindById.mockResolvedValue(app);
    const res = await as(owner).post(`/${APP_ID}/submit`);
    expect(res.status).toBe(409);
    expect(res.body.missingDocs).toEqual(['owner_id', 'clinical_establishment_reg']);
    expect(app.save).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
    expect(policyCreate).not.toHaveBeenCalled();
  });

  it('submits when every configured required document is on file', async () => {
    const app = makeApplication();
    appFindById.mockResolvedValue(app);
    docFind.mockImplementation(() => chain([
      { docType: 'owner_id' },
      { docType: 'clinical_establishment_reg' },
    ]));
    const res = await as(owner).post(`/${APP_ID}/submit`);
    expect(res.status).toBe(200);
    expect(app.status).toBe('submitted');
    expect(app.submittedAt).toBeInstanceOf(Date);
    expect(lastDocFilter.status.$in).toEqual(['uploaded', 'under_review', 'verified']);
    expect(auditLog).toHaveBeenCalledWith('submit_provider_application', OWNER_ID, expect.objectContaining({ status: 'submitted' }));
  });

  it('turns a needs_info resubmission into `resubmitted` and closes the items', async () => {
    const app = makeApplication({
      status: 'needs_info',
      resubmissionCount: 1,
      needsInfo: [{ docKey: 'owner_id', comment: 'Blurry scan', resolvedAt: null }],
    });
    appFindById.mockResolvedValue(app);
    docFind.mockImplementation(() => chain([{ docType: 'owner_id' }, { docType: 'clinical_establishment_reg' }]));
    const res = await as(owner).post(`/${APP_ID}/submit`);
    expect(res.status).toBe(200);
    expect(app.status).toBe('resubmitted');
    expect(app.resubmissionCount).toBe(2);
    expect(app.needsInfo[0].resolvedAt).toBeInstanceOf(Date);
  });

  // 2.md 14 — the submit pings.
  it('sends the applicant a PII-free receipt on submit', async () => {
    const app = makeApplication();
    appFindById.mockResolvedValue(app);
    docFind.mockImplementation(() => chain([{ docType: 'owner_id' }, { docType: 'clinical_establishment_reg' }]));
    const res = await as(owner).post(`/${APP_ID}/submit`);
    expect(res.status).toBe(200);
    expect(notificationCreate).toHaveBeenCalledTimes(1);
    expect(notificationCreate.mock.calls[0][0]).toMatchObject({
      userId: OWNER_ID,
      type: 'system',
      referenceId: APP_ID,
      title: 'Application submitted',
    });
    // Static copy only — no draft content travels in the ping.
    expect(notificationCreate.mock.calls[0][0].message).not.toContain('Smile Dental Studio');
  });

  it('pings the current holder on a needs_info resubmission', async () => {
    const REVIEWER_ID = '7000000000000000000000e7';
    const app = makeApplication({
      status: 'needs_info',
      resubmissionCount: 1,
      reviewerAssignments: [{ reviewerId: REVIEWER_ID, assignedBy: REVIEWER_ID, queue: 'needs_info' }],
    });
    appFindById.mockResolvedValue(app);
    docFind.mockImplementation(() => chain([{ docType: 'owner_id' }, { docType: 'clinical_establishment_reg' }]));
    const res = await as(owner).post(`/${APP_ID}/submit`);
    expect(res.status).toBe(200);
    expect(notificationCreate).toHaveBeenCalledTimes(2);
    expect(notificationCreate.mock.calls[0][0]).toMatchObject({ userId: OWNER_ID, title: 'Application updated' });
    expect(notificationCreate.mock.calls[1][0]).toMatchObject({
      userId: REVIEWER_ID,
      title: 'Applicant resubmitted',
      referenceId: APP_ID,
    });
  });

  it('skips the holder ping when nobody holds the row', async () => {
    const app = makeApplication({ status: 'needs_info', resubmissionCount: 1 });
    appFindById.mockResolvedValue(app);
    docFind.mockImplementation(() => chain([{ docType: 'owner_id' }, { docType: 'clinical_establishment_reg' }]));
    const res = await as(owner).post(`/${APP_ID}/submit`);
    expect(res.status).toBe(200);
    expect(notificationCreate).toHaveBeenCalledTimes(1);
    expect(notificationCreate.mock.calls[0][0]).toMatchObject({ userId: OWNER_ID });
  });

  it('409s a submit after review has started', async () => {
    const app = makeApplication({ status: 'under_review' });
    appFindById.mockResolvedValue(app);
    const res = await as(owner).post(`/${APP_ID}/submit`);
    expect(res.status).toBe(409);
  });

  // 2.md 10 — the acceptance ledger rows.
  it('records the group\'s provider-agreement acceptance at submit', async () => {
    const app = makeApplication();
    appFindById.mockResolvedValue(app);
    docFind.mockImplementation(() => chain([{ docType: 'owner_id' }, { docType: 'clinical_establishment_reg' }]));
    const res = await as(owner).post(`/${APP_ID}/submit`);
    expect(res.status).toBe(200);
    expect(policyCreate).toHaveBeenCalledTimes(1);
    expect(policyCreate.mock.calls[0][0]).toMatchObject({
      userId: OWNER_ID,
      providerId: null,
      templateId: 'tmpl_clinical',
      templateVersion: 'v3',
      context: 'provider_agreement',
    });
    expect(policyCreate.mock.calls[0][0].ip).toEqual(expect.any(String));
    expect(policyCreate.mock.calls[0][0].userAgent).toEqual(expect.any(String));
  });

  it('does not duplicate the ledger row when the version is already accepted', async () => {
    policyFindOne.mockImplementation(() => ({ lean: async () => ({ _id: 'pa-existing' }) }));
    const app = makeApplication();
    appFindById.mockResolvedValue(app);
    docFind.mockImplementation(() => chain([{ docType: 'owner_id' }, { docType: 'clinical_establishment_reg' }]));
    const res = await as(owner).post(`/${APP_ID}/submit`);
    expect(res.status).toBe(200);
    expect(policyCreate).not.toHaveBeenCalled();
    expect(app.status).toBe('submitted');
  });

  it('fails soft: a ledger outage never blocks a submission that committed', async () => {
    policyCreate.mockRejectedValue(new Error('ledger down'));
    const app = makeApplication();
    appFindById.mockResolvedValue(app);
    docFind.mockImplementation(() => chain([{ docType: 'owner_id' }, { docType: 'clinical_establishment_reg' }]));
    const res = await as(owner).post(`/${APP_ID}/submit`);
    expect(res.status).toBe(200);
    expect(app.status).toBe('submitted');
    expect(auditLog).toHaveBeenCalledWith('submit_provider_application', OWNER_ID, expect.objectContaining({ status: 'submitted' }));
  });

  it('404s an application the caller does not own', async () => {
    appFindById.mockResolvedValue(makeApplication({ applicantUserId: STRANGER_ID }));
    const res = await as(owner).post(`/${APP_ID}/submit`);
    expect(res.status).toBe(404);
  });
});

describe('POST /join/applications/:id/submit (auto-screen)', () => {
  it('stores the verdict on the application and echoes it into the audit row', async () => {
    const app = makeApplication();
    appFindById.mockResolvedValue(app);
    docFind.mockImplementation(() => chain([{ docType: 'owner_id' }, { docType: 'clinical_establishment_reg' }]));
    autoChecksRun.mockResolvedValue({ verdict: 'review', runAt: new Date(), forceTwoPerson: false, checks: [{ key: 'disposable_email', status: 'flag', severity: 'review', note: 'x' }] });

    const res = await as(owner).post(`/${APP_ID}/submit`);
    expect(res.status).toBe(200);
    expect(autoChecksRun).toHaveBeenCalledWith(expect.objectContaining({ application: app }));
    expect(app.autoChecks.verdict).toBe('review');
    expect(app.twoPersonApproval).toBe(false);
    expect(auditLog).toHaveBeenCalledWith('submit_provider_application', OWNER_ID, expect.objectContaining({ autoCheckVerdict: 'review' }));
  });

  it('a conflict verdict forces the second approver, whatever the config said', async () => {
    const app = makeApplication({ twoPersonApproval: false });
    appFindById.mockResolvedValue(app);
    docFind.mockImplementation(() => chain([{ docType: 'owner_id' }, { docType: 'clinical_establishment_reg' }]));
    autoChecksRun.mockResolvedValue({ verdict: 'conflict', runAt: new Date(), forceTwoPerson: true, checks: [{ key: 'duplicate_pan', status: 'flag', severity: 'conflict', note: 'PAN reused' }] });

    const res = await as(owner).post(`/${APP_ID}/submit`);
    expect(res.status).toBe(200);
    expect(app.autoChecks.verdict).toBe('conflict');
    expect(app.twoPersonApproval).toBe(true);
    expect(auditLog).toHaveBeenCalledWith('submit_provider_application', OWNER_ID, expect.objectContaining({ autoCheckVerdict: 'conflict' }));
  });

  it('never runs the screen when the document gate already refused', async () => {
    appFindById.mockResolvedValue(makeApplication());
    const res = await as(owner).post(`/${APP_ID}/submit`);
    expect(res.status).toBe(409);
    expect(autoChecksRun).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });
});

describe('GET /join/applications/:id/activation', () => {
  it('404s an application the caller does not own', async () => {
    appFindById.mockResolvedValue(makeApplication({ applicantUserId: STRANGER_ID }));
    const res = await as(owner).get(`/${APP_ID}/activation`);
    expect(res.status).toBe(404);
    expect(providerFindById).not.toHaveBeenCalled();
  });

  it('returns the six-item checklist computed from draft + owner + listing', async () => {
    const app = makeApplication({
      providerId: '7000000000000000000000e5',
      draft: {
        stepData: {
          account: { display_name: 'Smile Dental Studio' },
          payout: { account_holder: 'Ramesh Kumar', account_number: '123456789012', ifsc: 'HDFC0001234' },
          availability: { slots_per_day: 6 },
        },
      },
    });
    appFindById.mockResolvedValue(app);
    configFindOne.mockResolvedValue({
      ...CONFIG,
      steps: [{ key: 'account' }, { key: 'payout' }, { key: 'availability' }],
    });
    providerFindById.mockImplementation(() => chain({
      onboarding: { testBookingAt: new Date('2026-10-05T10:00:00Z'), trainingCompletedAt: null },
      status: 'live',
    }));

    const res = await as(owner).get(`/${APP_ID}/activation`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(6);
    expect(res.body.approved).toBe(true);
    const byKey = Object.fromEntries(res.body.items.map((i) => [i.key, i]));
    expect(byKey.profile_80.done).toBe(true);
    expect(byKey.payout.done).toBe(true);
    expect(byKey.availability.done).toBe(true);
    expect(byKey.test_booking.done).toBe(true);
    expect(byKey.training.done).toBe(false);
    // The harness account has no 2FA — the checklist must say so honestly.
    expect(byKey.two_factor.done).toBe(false);
    expect(res.body.complete).toBe(false);
  });
});

describe('POST /join/applications/:id/documents', () => {
  const attachPdf = (req, docType, { expiry } = {}) => {
    let r = req.field('docType', docType);
    if (expiry) r = r.field('expiryDate', expiry);
    return r.attach('document', Buffer.from('%PDF-1.7 synthetic'), { filename: `${docType}.pdf`, contentType: 'application/pdf' });
  };

  it('requires a file', async () => {
    const res = await as(owner).post(`/${APP_ID}/documents`).field('docType', 'owner_id');
    expect(res.status).toBe(400);
    expect(saveApplicationDocument).not.toHaveBeenCalled();
  });

  it('refuses a document type this provider type never asks for', async () => {
    const res = await attachPdf(as(owner).post(`/${APP_ID}/documents`), 'vehicle_rc');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('vehicle_rc');
    expect(saveApplicationDocument).not.toHaveBeenCalled();
  });

  it('enforces an expiry date when the config demands one', async () => {
    const res = await attachPdf(as(owner).post(`/${APP_ID}/documents`), 'clinical_establishment_reg');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('expiry');
    expect(saveApplicationDocument).not.toHaveBeenCalled();
  });

  it('stores a new document at version 1 with a content hash', async () => {
    const res = await attachPdf(as(owner).post(`/${APP_ID}/documents`), 'owner_id');
    expect(res.status).toBe(201);
    expect(docCreate).toHaveBeenCalledWith(expect.objectContaining({
      applicationId: APP_ID,
      docType: 'owner_id',
      status: 'uploaded',
      version: 1,
      hash: expect.stringMatching(/^[0-9a-f]{64}$/),
      fileRef: expect.objectContaining({ storage: 'local', mimetype: 'application/pdf' }),
    }));
    expect(validateFileContent).toHaveBeenCalled();
    expect(scanBufferForMalware).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith('upload_provider_document', OWNER_ID, expect.objectContaining({ docType: 'owner_id' }));
  });

  it('bumps the version when the same docType is re-filed', async () => {
    const existing = {
      _id: OTHER_APP_ID, version: 1, docType: 'owner_id',
      save: jestApi.fn().mockResolvedValue(undefined),
    };
    docFindOne.mockResolvedValue(existing);
    const res = await attachPdf(as(owner).post(`/${APP_ID}/documents`), 'owner_id');
    expect(res.status).toBe(201);
    expect(existing.version).toBe(2);
    expect(existing.status).toBe('uploaded');
    expect(existing.save).toHaveBeenCalled();
    expect(docCreate).not.toHaveBeenCalled();
  });

  it('refuses a file whose bytes do not match its declared type', async () => {
    validateFileContent.mockResolvedValue(false);
    const res = await attachPdf(as(owner).post(`/${APP_ID}/documents`), 'owner_id');
    expect(res.status).toBe(400);
    expect(saveApplicationDocument).not.toHaveBeenCalled();
  });

  it('refuses a file the scanner flags', async () => {
    scanBufferForMalware.mockResolvedValue({ clean: false, malware: 'Eicar-Test-Signature' });
    const res = await attachPdf(as(owner).post(`/${APP_ID}/documents`), 'owner_id');
    expect(res.status).toBe(400);
    expect(saveApplicationDocument).not.toHaveBeenCalled();
  });

  it('404s an application the caller does not own', async () => {
    appFindById.mockResolvedValue(makeApplication({ applicantUserId: STRANGER_ID }));
    const res = await attachPdf(as(owner).post(`/${APP_ID}/documents`), 'owner_id');
    expect(res.status).toBe(404);
    expect(saveApplicationDocument).not.toHaveBeenCalled();
  });

  it('refuses uploads once review has started', async () => {
    appFindById.mockResolvedValue(makeApplication({ status: 'under_review' }));
    const res = await attachPdf(as(owner).post(`/${APP_ID}/documents`), 'owner_id');
    expect(res.status).toBe(409);
    expect(saveApplicationDocument).not.toHaveBeenCalled();
  });
});
