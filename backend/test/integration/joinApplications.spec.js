import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

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

const { as } = await mountApp('join', {});

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
});

describe('POST /join/applications/:id/submit', () => {
  it('blocks submission while a required document is missing', async () => {
    const app = makeApplication();
    appFindById.mockResolvedValue(app);
    const res = await as(owner).post(`/${APP_ID}/submit`);
    expect(res.status).toBe(409);
    expect(res.body.missingDocs).toEqual(['owner_id', 'clinical_establishment_reg']);
    expect(app.save).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
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

  it('409s a submit after review has started', async () => {
    const app = makeApplication({ status: 'under_review' });
    appFindById.mockResolvedValue(app);
    const res = await as(owner).post(`/${APP_ID}/submit`);
    expect(res.status).toBe(409);
  });

  it('404s an application the caller does not own', async () => {
    appFindById.mockResolvedValue(makeApplication({ applicantUserId: STRANGER_ID }));
    const res = await as(owner).post(`/${APP_ID}/submit`);
    expect(res.status).toBe(404);
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
