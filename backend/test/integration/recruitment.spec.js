import { describe, it, expect } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const jobs = [];
const candidates = [];

const { as } = await mountApp('recruitment', {
  '../../src/models/JobOpening.js': () => ({
    default: {
      find: () => ({ sort: () => ({ limit: () => ({ lean: async () => jobs }) }) }),
      create: async (data) => {
        const item = { _id: '507f191e810c19729de860j1', ...data };
        jobs.push(item);
        return item;
      },
      findOneAndUpdate: async () => jobs[0] || null,
    },
  }),
  '../../src/models/Candidate.js': () => ({
    default: {
      find: () => ({
        populate: () => ({
          sort: () => ({
            limit: () => ({
              lean: async () => candidates,
            }),
          }),
        }),
      }),
      findOne: (filter) => query(candidates.find((c) => String(c._id) === String(filter._id)) || null),
      create: async (data) => {
        const item = {
          _id: '507f191e810c19729de860c1',
          stage: 'Applied',
          stageHistory: [],
          ...data,
          save: async function () { return this; },
        };
        candidates.push(item);
        return item;
      },
    },
  }),
  '../../src/models/OnboardingTask.js': () => ({
    default: {
      find: () => ({ populate: () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) }) }),
    },
  }),
  '../../src/models/Staff.js': () => ({
    default: {},
  }),
  '../../src/middleware/audit.js': () => ({
    auditLog: async () => ({}),
  }),
});

describe('HR Recruitment & Candidate Pipeline Integration', () => {
  const hrAdmin = {
    _id: '507f191e810c19729de860ea',
    id: '507f191e810c19729de860ea',
    role: 'hr_manager',
    hospitalId: '507f191e810c19729de860ed',
    permissions: ['staff:manage', 'admin:manage', 'admin:read'],
  };

  it('posts a new clinical job opening', async () => {
    const res = await as(hrAdmin)
      .post('/jobs')
      .send({
        title: 'Staff Nurse - Critical Care',
        department: 'ICU',
        experienceYears: 2,
        employmentType: 'Full-time',
        openings: 3,
      })
      .expect(201);

    expect(res.body.title).toBe('Staff Nurse - Critical Care');
    expect(res.body.openings).toBe(3);
  });

  it('registers applicant candidate under job opening', async () => {
    const res = await as(hrAdmin)
      .post('/candidates')
      .send({
        jobOpeningId: '507f191e810c19729de860j1',
        name: 'Pooja Verma',
        email: 'pooja.verma@example.com',
        phone: '9876543210',
        experienceYears: 3,
      })
      .expect(201);

    expect(res.body.name).toBe('Pooja Verma');
    expect(res.body.stage).toBe('Applied');
  });

  it('advances candidate through recruitment stages (Applied -> Shortlisted -> Hired)', async () => {
    const res = await as(hrAdmin)
      .patch('/candidates/507f191e810c19729de860c1/stage')
      .send({
        stage: 'Shortlisted',
        notes: 'Clinical qualifications verified by Nursing Superintendent',
      })
      .expect(200);

    expect(res.body.stage).toBe('Shortlisted');
    expect(res.body.stageHistory).toHaveLength(1);
    expect(res.body.stageHistory[0].toStage).toBe('Shortlisted');
  });

  it('rejects invalid applicant stage name', async () => {
    await as(hrAdmin)
      .patch('/candidates/507f191e810c19729de860c1/stage')
      .send({ stage: 'INVALID_STAGE_NAME' })
      .expect(400);
  });
});
