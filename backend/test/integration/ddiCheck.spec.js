import { describe, it, expect, jest } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';

/**
 * T3 (file 31): DDI checker API — /check must flag major pairs and surface
 * unknown drugs as "not checked"; /override must persist an audit row with a
 * reason and reject empty/invalid payloads.
 */

const overrideStore = [];
const auditCalls = [];

const { as } = await mountApp('ddi', {
  '../../src/models/DdiOverride.js': () => ({
    default: {
      create: async (data) => {
        const row = { _id: '507f191e810c19729de860aa', ...data };
        overrideStore.push(row);
        return row;
      },
    },
  }),
  '../../src/middleware/audit.js': () => ({
    auditLog: async (action, userId, details) => {
      auditCalls.push({ action, userId, details });
      return {};
    },
  }),
});

const doctor = {
  _id: '507f191e810c19729de860d1',
  id: '507f191e810c19729de860d1',
  role: 'doctor',
  name: 'Dr Test',
  hospitalId: '507f191e810c19729de860ed',
  permissions: ['prescriptions:write'],
};

describe('DDI check API (T3)', () => {
  it('requires authentication', async () => {
    await as(null).post('/check').send({ drugs: ['a', 'b'] }).expect(401);
  });

  it('rejects a non-array drugs payload', async () => {
    await as(doctor).post('/check').send({ drugs: 'warfarin' }).expect(400);
  });

  it('flags warfarin + aspirin as HIGH/major', async () => {
    const res = await as(doctor)
      .post('/check')
      .send({ drugs: ['Warfarin 5mg', 'Aspirin 75mg'] })
      .expect(200);

    expect(res.body.overallRiskLevel).toBe('HIGH');
    expect(res.body.hasSevereConflict).toBe(true);
    expect(res.body.interactions).toHaveLength(1);
    expect(res.body.interactions[0].severity).toBe('major');
    expect(res.body.interactions[0].recommendation).toBeTruthy();
  });

  it('returns CLEAR with unknownDrugs for drugs outside the knowledge base', async () => {
    const res = await as(doctor)
      .post('/check')
      .send({ drugs: ['Totallyunknown Drug 10mg', 'Anotherunknown Tab 5mg'] })
      .expect(200);

    expect(res.body.overallRiskLevel).toBe('CLEAR');
    expect(res.body.interactions).toHaveLength(0);
    // Both drugs must be reported as not-checked — never silently "safe".
    expect(res.body.unknownDrugs.length).toBe(2);
  });
});

describe('DDI override audit (T3)', () => {
  it('rejects an override without a reason', async () => {
    await as(doctor)
      .post('/override')
      .send({ pair: { drugA: 'warfarin', drugB: 'aspirin' }, severity: 'major', reason: '   ' })
      .expect(400);
  });

  it('rejects an invalid severity', async () => {
    await as(doctor)
      .post('/override')
      .send({ pair: { drugA: 'warfarin', drugB: 'aspirin' }, severity: 'catastrophic', reason: 'monitoring' })
      .expect(400);
  });

  it('persists a valid override and writes an audit entry', async () => {
    const res = await as(doctor)
      .post('/override')
      .send({
        prescriptionNo: 'RX-T3-1',
        pair: { drugA: 'warfarin', drugB: 'aspirin' },
        severity: 'major',
        effect: 'Severe bleeding risk',
        reason: 'Benefit outweighs risk — INR monitored daily',
      })
      .expect(201);

    expect(res.body.pair.drugA).toBe('warfarin');
    expect(res.body.reason).toContain('INR monitored');
    expect(res.body.by).toBe(doctor._id);

    expect(overrideStore).toHaveLength(1);
    expect(auditCalls.some((c) => c.action === 'ddi.override')).toBe(true);
  });
});

// Guard against the harness leaking state across specs in the same worker.
afterEach(() => {
  jest.clearAllMocks();
});