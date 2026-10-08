import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

// 8.md §5 on the READ side: actioned content stops being served, an
// auto-detected violation lands in the queue the moment it is written, and the
// verified-visit badge is looked up server-side.

const REVIEW_ID = '7000000000000000000000a1';
const DOCTOR_ID = '7000000000000000000000b2';
const PATIENT = '7000000000000000000000c3';

const reviewFind = jestApi.fn();
const reviewCount = jestApi.fn();
const reviewFindOne = jestApi.fn();
const reviewCreate = jestApi.fn();
const reviewUpdateOne = jestApi.fn();
const reviewFindByIdAndUpdate = jestApi.fn();
const appointmentExists = jestApi.fn();
const ensureItem = jestApi.fn();
const auditLog = jestApi.fn();

let lastListFilter = null;
let lastCreateBody = null;

jestApi.unstable_mockModule('../../src/models/Review.js', () => ({
  __esModule: true,
  default: {
    find: (filter) => { lastListFilter = filter; return query([]); },
    countDocuments: (...a) => reviewCount(...a),
    findOne: (...a) => reviewFindOne(...a),
    create: (body) => { lastCreateBody = body; return reviewCreate(body); },
    updateOne: (...a) => reviewUpdateOne(...a),
    findByIdAndUpdate: (...a) => reviewFindByIdAndUpdate(...a),
  },
}));

jestApi.unstable_mockModule('../../src/models/Appointment.js', () => ({
  __esModule: true,
  default: { exists: (...a) => appointmentExists(...a) },
}));

jestApi.unstable_mockModule('../../src/lib/moderationActions.js', () => ({
  __esModule: true,
  ensureModerationItem: (...a) => ensureItem(...a),
}));

jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('reviews');

const patient = { _id: PATIENT, role: 'patient', name: 'Asha' };

beforeEach(() => {
  lastListFilter = null;
  lastCreateBody = null;
  reviewFind.mockReset();
  reviewCount.mockReset().mockResolvedValue(0);
  reviewFindOne.mockReset().mockImplementation(() => query(null));
  reviewCreate.mockReset().mockImplementation(async (body) => ({ _id: REVIEW_ID, flagged: false, ...body }));
  reviewUpdateOne.mockReset().mockResolvedValue({ matchedCount: 1 });
  reviewFindByIdAndUpdate.mockReset().mockImplementation(() => query({ _id: REVIEW_ID }));
  appointmentExists.mockReset().mockResolvedValue(null);
  ensureItem.mockReset().mockResolvedValue({ item: { _id: 'mod1' }, created: true });
  auditLog.mockReset().mockResolvedValue(undefined);
});

describe('GET /reviews — moderation filter on the public list', () => {
  it('serves only content with no (or a visible) moderation verdict', async () => {
    const res = await as().get('/');
    expect(res.status).toBe(200);
    expect(lastListFilter.moderationStatus).toEqual({
      $nin: ['hidden', 'removed', 'shadow_hidden'],
    });
  });
});

describe('POST /reviews — verified-visit gate + auto-flag', () => {
  const body = {
    doctorId: DOCTOR_ID,
    doctorName: 'Dr. Menon',
    rating: 5,
    comment: 'Very patient and thorough.',
  };

  it('stamps isVerifiedVisit from a COMPLETED appointment, not the body', async () => {
    appointmentExists.mockResolvedValue({ _id: 'appt1' });
    const res = await as(patient).post('/').send(body);
    expect(res.status).toBe(201);
    expect(lastCreateBody.isVerifiedVisit).toBe(true);
    expect(lastCreateBody.patientId).toBe(PATIENT);
    expect(lastCreateBody.patientName).toBe('Asha');
    expect(ensureItem).not.toHaveBeenCalled();
  });

  it('leaves the badge off when there is no completed visit', async () => {
    appointmentExists.mockResolvedValue(null);
    const res = await as(patient).post('/').send(body);
    expect(res.status).toBe(201);
    expect(lastCreateBody.isVerifiedVisit).toBe(false);
  });

  it('queues abusive text at write time and marks the review flagged', async () => {
    const res = await as(patient).post('/').send({
      ...body,
      comment: 'What an idiot, completely useless and pathetic.',
    });
    expect(res.status).toBe(201);
    expect(ensureItem).toHaveBeenCalledTimes(1);
    const arg = ensureItem.mock.calls[0][0];
    expect(arg.targetType).toBe('review');
    expect(arg.targetId).toBe(REVIEW_ID);
    expect(arg.category).toBe('abuse');
    expect(arg.source).toBe('auto_filter');
    expect(arg.subjectUserId).toBe(PATIENT);
    expect(reviewUpdateOne).toHaveBeenCalledWith(
      { _id: REVIEW_ID },
      { $set: { flagged: true, flagReason: 'auto_filter' } },
    );
  });

  it('flags a guaranteed-cure medical claim as high severity', async () => {
    const res = await as(patient).post('/').send({
      ...body,
      comment: 'This treatment guarantees a 100% cure for diabetes.',
    });
    expect(res.status).toBe(201);
    const arg = ensureItem.mock.calls[0][0];
    expect(arg.category).toBe('medical_claim');
    expect(arg.severity).toBe('high');
  });

  it('401s anonymous submissions', async () => {
    const res = await as().post('/').send(body);
    expect(res.status).toBe(401);
  });

  it('409s a duplicate review (one per patient per doctor)', async () => {
    reviewFindOne.mockImplementation(() => query({ _id: REVIEW_ID }));
    const res = await as(patient).post('/').send(body);
    expect(res.status).toBe(409);
    expect(reviewCreate).not.toHaveBeenCalled();
  });
});
