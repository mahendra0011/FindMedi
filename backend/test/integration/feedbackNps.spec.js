import { describe, it, expect } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const feedbackStore = [];

const { as } = await mountApp('feedback', {
  '../../src/models/Feedback.js': () => ({
    default: {
      create: async (data) => {
        const item = {
          _id: '507f191e810c19729de860f1',
          createdAt: new Date(),
          status: 'new',
          ...data,
        };
        feedbackStore.push(item);
        return item;
      },
      find: (filter) => {
        let results = [...feedbackStore];
        if (filter?.patientId) {
          results = results.filter((r) => String(r.patientId) === String(filter.patientId));
        }
        if (filter?.status) {
          results = results.filter((r) => r.status === filter.status);
        }
        return {
          sort: () => ({
            limit: () => ({
              lean: async () => results,
            }),
          }),
          lean: async () => results,
        };
      },
      findOne: (filter) => {
        let results = [...feedbackStore];
        if (filter?.patientId) {
          results = results.filter((r) => String(r.patientId) === String(filter.patientId));
        }
        if (filter?.refId) {
          results = results.filter((r) => String(r.refId) === String(filter.refId));
        }
        if (filter?.context) {
          results = results.filter((r) => r.context === filter.context);
        }
        const item = results[0] || null;
        return {
          lean: async () => item,
        };
      },
      findById: async (id) => {
        const item = feedbackStore.find((r) => String(r._id) === String(id));
        if (!item) return null;
        return {
          ...item,
          save: async () => item,
        };
      },
    },
  }),
  '../../src/middleware/audit.js': () => ({
    auditLog: async () => ({}),
  }),
});

describe('Feedback & NPS API Endpoints', () => {
  const patient = {
    _id: '507f191e810c19729de860ea',
    id: '507f191e810c19729de860ea',
    role: 'patient',
    hospitalId: '507f191e810c19729de860ed',
  };

  const admin = {
    _id: '507f191e810c19729de860eb',
    id: '507f191e810c19729de860eb',
    role: 'hospital_admin',
    hospitalId: '507f191e810c19729de860ed',
    permissions: ['staff:manage'],
  };

  it('allows a patient to submit NPS feedback', async () => {
    const res = await as(patient)
      .post('/')
      .send({
        context: 'visit',
        department: 'Cardiology',
        npsScore: 10,
        rating: 5,
        comment: 'Excellent doctor and nursing care!',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
  });

  it('allows patient to fetch their submitted feedback', async () => {
    const res = await as(patient).get('/mine').expect(200);
    expect(res.body.feedback).toBeDefined();
    expect(res.body.feedback.length).toBeGreaterThan(0);
  });

  it('calculates NPS correctly on admin list endpoint', async () => {
    // Add a detractor entry
    feedbackStore.push({
      _id: '507f191e810c19729de860f2',
      hospitalId: '507f191e810c19729de860ed',
      npsScore: 4,
      rating: 2,
      department: 'Pharmacy',
      comment: 'Long wait times',
      createdAt: new Date(),
    });

    const res = await as(admin).get('/').expect(200);
    expect(res.body.promoters).toBe(1);
    expect(res.body.detractors).toBe(1);
    // NPS = ((1 - 1) / 2) * 100 = 0
    expect(res.body.nps).toBe(0);
  });

  it('provides aggregate metrics on /summary endpoint', async () => {
    const res = await as(admin).get('/summary').expect(200);
    expect(res.body.totalResponses).toBeGreaterThanOrEqual(2);
    expect(res.body.avgCsat).toBeDefined();
    expect(res.body.byDepartment).toBeDefined();
    expect(res.body.byDepartment.Cardiology).toBeDefined();
  });

  it('accepts feedback with refModel and refId and blocks duplicate submission', async () => {
    const aptRefId = '64f000000000000000000101';
    // First submission
    const res1 = await as(patient)
      .post('/')
      .send({
        context: 'visit',
        department: 'Cardiology',
        refModel: 'Appointment',
        refId: aptRefId,
        npsScore: 9,
        rating: 5,
        comment: 'Great appointment experience!',
      })
      .expect(201);
    expect(res1.body.id).toBeDefined();

    // Query mine with refId
    const mineRes = await as(patient)
      .get(`/mine?refId=${aptRefId}`)
      .expect(200);
    expect(mineRes.body.hasSubmitted).toBe(true);

    // Second submission with same refId should be blocked with 409
    const res2 = await as(patient)
      .post('/')
      .send({
        context: 'visit',
        department: 'Cardiology',
        refModel: 'Appointment',
        refId: aptRefId,
        npsScore: 8,
        rating: 4,
      })
      .expect(409);
    expect(res2.body.code).toBe('FEEDBACK_DUPLICATE');
  });
});
