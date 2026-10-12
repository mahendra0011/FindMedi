import { describe, it, expect, beforeEach, jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';
import { DATASETS } from '../../src/lib/datasets.js';
import { ruleMatches } from '../../src/lib/ruleEngine.js';

const mockRules = [];
const mockRuleFirings = [];
const mockIcuScores = [];
const mockRaisedAlerts = [];

const raiseAlertSpy = jestApi.fn(async (alert) => {
  mockRaisedAlerts.push(alert);
  return { _id: `al-${mockRaisedAlerts.length}`, ...alert };
});

const { as } = await mountApp('rules', {
  '../../src/models/Rule.js': () => ({
    default: {
      find: (filter) => {
        let res = mockRules;
        if (filter.hospitalId) res = res.filter((r) => String(r.hospitalId) === String(filter.hospitalId));
        if (filter.enabled !== undefined) res = res.filter((r) => r.enabled === filter.enabled);
        return query(res);
      },
      findById: (id) => query(mockRules.find((r) => String(r._id) === String(id)) || null),
    },
  }),
  '../../src/models/RuleFiring.js': () => ({
    default: {
      find: () => query(mockRuleFirings),
      findOne: (filter) => {
        const found = mockRuleFirings.find((f) => {
          if (filter.ruleId && String(f.ruleId) !== String(filter.ruleId)) return false;
          if (filter.dedupHash && f.dedupHash !== filter.dedupHash) return false;
          if (filter.status && f.status !== filter.status) return false;
          if (filter.firedAt?.$gte && f.firedAt < filter.firedAt.$gte) return false;
          return true;
        });
        return Promise.resolve(found || null);
      },
      create: async (data) => {
        const doc = { _id: `rf-${mockRuleFirings.length + 1}`, firedAt: new Date(), ...data };
        mockRuleFirings.push(doc);
        return doc;
      },
    },
  }),
  '../../src/models/WorkTask.js': () => ({
    default: {
      create: async (data) => ({ _id: 'wt-1', ...data }),
      find: () => query([]),
    },
  }),
  '../../src/models/IcuScore.js': () => ({
    default: {
      find: (filter) => {
        let res = [...mockIcuScores];
        if (filter.hospitalId) res = res.filter((s) => String(s.hospitalId) === String(filter.hospitalId));
        if (filter.scoreType) res = res.filter((s) => s.scoreType === filter.scoreType);
        if (filter.recordedAt?.$gte) res = res.filter((s) => s.recordedAt >= filter.recordedAt.$gte);
        res.sort((a, b) => b.recordedAt - a.recordedAt);
        return query(res);
      },
      findOne: (filter) => {
        let res = [...mockIcuScores];
        if (filter.hospitalId) res = res.filter((s) => String(s.hospitalId) === String(filter.hospitalId));
        if (filter.admissionId) res = res.filter((s) => String(s.admissionId) === String(filter.admissionId));
        if (filter.scoreType) res = res.filter((s) => s.scoreType === filter.scoreType);
        if (filter.recordedAt?.$lt) res = res.filter((s) => s.recordedAt < filter.recordedAt.$lt);
        res.sort((a, b) => b.recordedAt - a.recordedAt);
        return Promise.resolve(res[0] || null);
      },
    },
  }),
  '../../src/lib/alerts.js': () => ({
    raiseAlert: (...args) => raiseAlertSpy(...args),
  }),
  '../../src/middleware/audit.js': () => ({
    auditLog: async () => ({}),
  }),
});

const admin = {
  _id: '507f191e810c19729de86001',
  role: 'hospital_admin',
  hospitalId: '507f191e810c19729de86002',
};

describe('E6 SOFA acute deterioration alert rule (sofa-delta-2)', () => {
  const hospitalId = '507f191e810c19729de86002';
  const admissionId = '507f191e810c19729de860aa';
  const patientId = '507f191e810c19729de860bb';

  const defaultSofaRule = {
    _id: 'rule-sofa-delta-2',
    hospitalId,
    key: 'sofa-delta-2',
    name: 'SOFA acute deterioration (delta ≥ +2 in 24h)',
    dataset: 'icu_scores',
    groups: [[{ field: 'sofaDelta', op: '>=', value: 2 }]],
    cooldownMinutes: 1440,
    enabled: true,
    actions: {
      type: 'alert',
      severity: 'critical',
      roleQueue: 'doctor',
    },
  };

  beforeEach(() => {
    mockRules.length = 0;
    mockRuleFirings.length = 0;
    mockIcuScores.length = 0;
    mockRaisedAlerts.length = 0;
    raiseAlertSpy.mockClear();
    mockRules.push({ ...defaultSofaRule });
  });

  it('exposes icu_scores in datasetNames() and DATASETS registry', () => {
    expect(DATASETS.icu_scores).toBeDefined();
    expect(DATASETS.icu_scores.fields).toContain('sofaDelta');
    expect(DATASETS.icu_scores.fields).toContain('prevScore');
  });

  it('evaluates ruleMatches correctly across delta boundaries', () => {
    expect(ruleMatches(defaultSofaRule, { sofaDelta: 2 })).toBe(true);
    expect(ruleMatches(defaultSofaRule, { sofaDelta: 3 })).toBe(true);
    expect(ruleMatches(defaultSofaRule, { sofaDelta: 1 })).toBe(false);
    expect(ruleMatches(defaultSofaRule, { sofaDelta: 0 })).toBe(false);
    expect(ruleMatches(defaultSofaRule, { sofaDelta: -2 })).toBe(false);
  });

  it('fires critical alert when SOFA increases from 4 to 6 (delta = +2)', async () => {
    const t0 = new Date(Date.now() - 6 * 3600 * 1000);
    const t1 = new Date();

    // Baseline score = 4
    mockIcuScores.push({
      _id: 'score-1',
      hospitalId,
      admissionId,
      patientId,
      scoreType: 'SOFA',
      score: 4,
      recordedAt: t0,
    });

    // New score = 6 (deterioration)
    mockIcuScores.push({
      _id: 'score-2',
      hospitalId,
      admissionId,
      patientId,
      scoreType: 'SOFA',
      score: 6,
      recordedAt: t1,
    });

    const res = await as(admin).post('/rules/sweep').expect(200);
    expect(res.body.fired).toBe(1);
    expect(res.body.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'sofa-delta-2', matched: 1 }),
      ])
    );

    expect(raiseAlertSpy).toHaveBeenCalledTimes(1);
    expect(mockRaisedAlerts[0].severity).toBe('critical');
    expect(mockRaisedAlerts[0].ruleKey).toBe('sofa-delta-2');
    expect(mockRaisedAlerts[0].hospitalId).toBe(hospitalId);
  });

  it('does NOT fire alert when SOFA increases mildly from 4 to 5 (delta = +1)', async () => {
    const t0 = new Date(Date.now() - 4 * 3600 * 1000);
    const t1 = new Date();

    mockIcuScores.push({
      _id: 'score-1',
      hospitalId,
      admissionId,
      patientId,
      scoreType: 'SOFA',
      score: 4,
      recordedAt: t0,
    });
    mockIcuScores.push({
      _id: 'score-2',
      hospitalId,
      admissionId,
      patientId,
      scoreType: 'SOFA',
      score: 5,
      recordedAt: t1,
    });

    const res = await as(admin).post('/rules/sweep').expect(200);
    expect(res.body.fired).toBe(0);
    expect(raiseAlertSpy).not.toHaveBeenCalled();
  });

  it('does NOT fire alert when SOFA is flat from 6 to 6 (delta = 0)', async () => {
    const t0 = new Date(Date.now() - 4 * 3600 * 1000);
    const t1 = new Date();

    mockIcuScores.push({
      _id: 'score-1',
      hospitalId,
      admissionId,
      patientId,
      scoreType: 'SOFA',
      score: 6,
      recordedAt: t0,
    });
    mockIcuScores.push({
      _id: 'score-2',
      hospitalId,
      admissionId,
      patientId,
      scoreType: 'SOFA',
      score: 6,
      recordedAt: t1,
    });

    const res = await as(admin).post('/rules/sweep').expect(200);
    expect(res.body.fired).toBe(0);
    expect(raiseAlertSpy).not.toHaveBeenCalled();
  });

  it('suppresses duplicate firing during re-sweep within cooldown window', async () => {
    const t0 = new Date(Date.now() - 4 * 3600 * 1000);
    const t1 = new Date();

    mockIcuScores.push({
      _id: 'score-1',
      hospitalId,
      admissionId,
      patientId,
      scoreType: 'SOFA',
      score: 4,
      recordedAt: t0,
    });
    mockIcuScores.push({
      _id: 'score-2',
      hospitalId,
      admissionId,
      patientId,
      scoreType: 'SOFA',
      score: 6,
      recordedAt: t1,
    });

    // First sweep -> fires
    const res1 = await as(admin).post('/rules/sweep').expect(200);
    expect(res1.body.fired).toBe(1);
    expect(raiseAlertSpy).toHaveBeenCalledTimes(1);

    // Second sweep immediately -> suppressed by cooldown
    const res2 = await as(admin).post('/rules/sweep').expect(200);
    expect(res2.body.fired).toBe(0);
    expect(raiseAlertSpy).toHaveBeenCalledTimes(1);

    const suppressed = mockRuleFirings.find((f) => f.status === 'suppressed');
    expect(suppressed).toBeDefined();
  });

  it('does NOT fire when rule is disabled', async () => {
    mockRules[0].enabled = false;

    const t0 = new Date(Date.now() - 4 * 3600 * 1000);
    const t1 = new Date();

    mockIcuScores.push({
      _id: 'score-1',
      hospitalId,
      admissionId,
      patientId,
      scoreType: 'SOFA',
      score: 4,
      recordedAt: t0,
    });
    mockIcuScores.push({
      _id: 'score-2',
      hospitalId,
      admissionId,
      patientId,
      scoreType: 'SOFA',
      score: 6,
      recordedAt: t1,
    });

    const res = await as(admin).post('/rules/sweep').expect(200);
    expect(res.body.fired).toBe(0);
    expect(raiseAlertSpy).not.toHaveBeenCalled();
  });
});
