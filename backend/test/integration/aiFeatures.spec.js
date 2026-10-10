/**
 * File 22 P2-37: AI feature routes — review queue, PHI redaction, kill switch.
 * The gateway itself is unit-tested elsewhere; this spec proves the ROUTE
 * enqueues a human review, refuses unauthenticated callers, and honours the
 * 423 kill switch end to end.
 */
import { mountApp, query } from '../helpers/appHarness.js';

const reviews = [];
const invocations = [];
const settings = [];

const { as } = await mountApp('aiFeatures', {
  '../../src/models/AiReview.js': () => ({
    default: {
      find: () => query(reviews),
      create: async (d) => {
        const row = { _id: `rv${reviews.length}`, status: 'Pending', createdAt: new Date(), ...d };
        reviews.push(row);
        return row;
      },
      findOneAndUpdate: async (filter, update) => {
        const row = reviews.find((r) => String(r._id) === String(filter._id));
        if (!row) return null;
        Object.assign(row, update.$set);
        return row;
      },
    },
  }),
  '../../src/models/AiInvocation.js': () => ({
    default: {
      create: async (d) => { invocations.push(d); return { _id: `iv${invocations.length}` }; },
      find: () => query(invocations),
    },
  }),
  '../../src/models/SystemSetting.js': () => ({
    default: {
      findOne: (f) => query(settings.find((s) => s.key === f.key) || null),
      findOneAndUpdate: async (filter, update) => {
        const row = settings.find((s) => s.key === filter.key) || { key: filter.key };
        Object.assign(row, update);
        if (!settings.includes(row)) settings.push(row);
        return row;
      },
    },
  }),
  '../../src/middleware/audit.js': () => ({
    auditLog: async () => ({}),
    scrubAuditDetails: (v) => v,
  }),
});

const nurse = { _id: 'n1', id: 'n1', role: 'nurse', hospitalId: 'h1' };
const admin = { _id: 'a1', id: 'a1', role: 'hospital_admin', hospitalId: 'h1' };
const superadmin = { _id: 's1', id: 's1', role: 'superadmin', hospitalId: 'h1' };

describe('P2-37 AI feature routes', () => {
  beforeEach(() => { reviews.length = 0; invocations.length = 0; settings.length = 0; });

  test('unauthenticated caller is refused before any handler runs', async () => {
    const r = await as(null).post('/ocr').send({ rawText: 'x' });
    expect(r.status).toBe(401);
    expect(reviews).toHaveLength(0);
  });

  test('POST /ocr requires rawText', async () => {
    const r = await as(nurse).post('/ocr').send({ docType: 'lab' });
    expect(r.status).toBe(400);
  });

  test('POST /ocr extracts fields and queues a review WITHOUT the raw text', async () => {
    const raw = 'Patient phone: 9876543210, email: ramesh@example.com, Paracetamol: 500 mg';
    const r = await as(nurse).post('/ocr').send({ docType: 'prescription', rawText: raw });
    expect(r.status).toBe(200);
    expect(r.body.reviewId).toBeTruthy();
    expect(r.body.status).toBe('Pending');
    expect(r.body.fields.provider).toBe('stub');
    // the review queue stores the structured result, never the source document
    const queued = reviews[0];
    expect(JSON.stringify(queued)).not.toContain('ramesh@example.com');
    expect(JSON.stringify(queued)).not.toContain('9876543210');
    expect(JSON.stringify(queued)).not.toContain(raw);
  });

  test('POST /faq requires a question', async () => {
    const r = await as(nurse).post('/faq').send({ faq: [] });
    expect(r.status).toBe(400);
  });

  test('POST /faq answers from the supplied FAQ rows', async () => {
    const r = await as(nurse).post('/faq').send({
      question: 'What are the OPD timings?',
      faq: [{ question: 'What are the OPD timings for new patients?', answer: '9am to 5pm' }],
    });
    expect(r.status).toBe(200);
    expect(r.body.answer).toBe('9am to 5pm');
    expect(r.body.score).toBeGreaterThan(0);
  });

  test('GET /reviews lists the human-review queue, filterable by status', async () => {
    await as(nurse).post('/lab-narrative').send({ results: [{ test: 'Hb', value: 7.1 }] });
    const r = await as(admin).get('/reviews?status=Pending');
    expect(r.status).toBe(200);
    expect(r.body.reviews).toHaveLength(1);
    expect(reviews[0].feature).toBe('lab_narrative');
  });

  test('PATCH /reviews/:id rejects an invalid status and accepts a decision', async () => {
    await as(nurse).post('/lab-narrative').send({ results: [] });
    const bad = await as(admin).patch(`/reviews/${reviews[0]._id}`).send({ status: 'Whatever' });
    expect(bad.status).toBe(400);

    const ok = await as(admin).patch(`/reviews/${reviews[0]._id}`).send({ status: 'Approved', reviewerNote: 'looks right' });
    expect(ok.status).toBe(200);
    expect(ok.body.review.status).toBe('Approved');
    expect(reviews[0].reviewerId).toBe('a1');
  });

  test('PATCH /reviews/:id 404s for an unknown id', async () => {
    const r = await as(admin).patch('/reviews/nope').send({ status: 'Approved' });
    expect(r.status).toBe(404);
  });

  test('kill switch defaults to enabled when no setting row exists', async () => {
    const r = await as(admin).get('/kill-switch');
    expect(r.status).toBe(200);
    expect(r.body.enabled).toBe(true);
  });

  test('kill switch POST is admin-only and persists the toggle', async () => {
    const denied = await as(nurse).post('/kill-switch').send({ enabled: false });
    expect(denied.status).toBe(403);

    const r = await as(superadmin).post('/kill-switch').send({ enabled: false });
    expect(r.status).toBe(200);
    expect(r.body.enabled).toBe(false);
    expect(settings.find((s) => s.key === 'ai.enabled')?.value).toBe(false);
  });

  test('kill switch off turns AI calls into 423 AI_DISABLED', async () => {
    await as(superadmin).post('/kill-switch').send({ enabled: false });
    const r = await as(admin).post('/discharge-draft').send({ fields: { diagnosis: 'Asthma' } });
    expect(r.status).toBe(423);
    expect(r.body.code).toBe('AI_DISABLED');
    // the refusal itself is logged as a failed invocation
    expect(invocations.some((i) => i.feature === 'discharge_draft' && i.ok === false)).toBe(true);
  });

  test('GET /invocations exposes the audit trail to admins', async () => {
    await as(admin).post('/discharge-draft').send({ fields: { diagnosis: 'Asthma' } });
    const r = await as(admin).get('/invocations');
    expect(r.status).toBe(200);
    expect(r.body.invocations.length).toBeGreaterThanOrEqual(1);
  });
});
