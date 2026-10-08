/**
 * 2.md 13 — onboarding metrics endpoint and the aggregation behind it.
 *
 * Two things are tested that a handler-level assertion would miss:
 *
 *   1. THE GUARD, THROUGH THE ROUTE — 401 with no identity, 403 for every role
 *      that is not superadmin, 200 for one that is. The numbers are platform
 *      intelligence (where applicants abandon, why they get rejected), so the
 *      guard chain is the part that matters most and it is exercised over real
 *      HTTP via the harness.
 *   2. THE ARITHMETIC — funnel ratios, step drop-off, rejection histogram,
 *      review time and completeness are asserted against a fixture whose
 *      answers can be computed by hand, because a dashboard that is 40% wrong
 *      is worse than no dashboard.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mountApp, query } from '../helpers/appHarness.js';
import { buildInventory } from '../../scripts/lib/authzClassify.mjs';
import { httpRequestsTotal } from '../../src/lib/metrics.js';

const appFind = jest.fn();
const configFind = jest.fn();
const docCount = jest.fn();

const { as } = await mountApp('onboardingMetrics', {
  '../../src/models/ProviderApplication.js': () => ({ default: { find: (...a) => appFind(...a) } }),
  '../../src/models/ProviderTypeConfig.js': () => ({ default: { find: (...a) => configFind(...a) } }),
  '../../src/models/ProviderDocument.js': () => ({ default: { countDocuments: (...a) => docCount(...a) } }),
});

const svc = await import('../../src/services/onboardingMetricsService.js');
const { MAX_APPLICATION_ROWS, COMPLETENESS_THRESHOLD } = svc;

const SUPERADMIN = { id: 'sa1', role: 'superadmin' };

const PHARMACY = {
  typeKey: 'pharmacy',
  label: 'Pharmacy',
  group: 'retail',
  tier: 'standard',
  steps: [
    { key: 'basics', label: 'Basics' },
    { key: 'location', label: 'Location' },
    { key: 'documents', label: 'Documents' },
  ],
};

const stepData = (...keys) => ({ stepData: Object.fromEntries(keys.map((k) => [k, {}])) });

const seedFixture = () => {
  configFind.mockReturnValue(query([PHARMACY]));
  appFind.mockReturnValue(query([
    // approved after a full three-step wizard, reviewed in 2 days
    {
      typeKey: 'pharmacy', status: 'approved',
      submittedAt: new Date('2026-09-01T00:00:00Z'), decidedAt: new Date('2026-09-03T00:00:00Z'),
      resubmissionCount: 0, rejectionReason: null, createdAt: new Date('2026-08-30T00:00:00Z'),
      draft: stepData('basics', 'location', 'documents'),
    },
    // abandoned after step 1 - the drop-off 2.md 13 is about
    {
      typeKey: 'pharmacy', status: 'submitted',
      submittedAt: new Date('2026-09-05T00:00:00Z'), decidedAt: null,
      resubmissionCount: 0, rejectionReason: null, createdAt: new Date('2026-09-04T00:00:00Z'),
      draft: stepData('basics'),
    },
    // never opened the wizard
    {
      typeKey: 'pharmacy', status: 'draft',
      submittedAt: null, decidedAt: null,
      resubmissionCount: 0, rejectionReason: null, createdAt: new Date('2026-09-06T00:00:00Z'),
      draft: stepData(),
    },
    // rejected after resubmission, reviewed in 1 day
    {
      typeKey: 'pharmacy', status: 'rejected',
      submittedAt: new Date('2026-09-10T00:00:00Z'), decidedAt: new Date('2026-09-11T00:00:00Z'),
      resubmissionCount: 2, rejectionReason: 'missing_document', createdAt: new Date('2026-09-09T00:00:00Z'),
      draft: stepData('basics', 'location', 'documents'),
    },
    // a type with no config rows: reported, never guessed at
    {
      typeKey: 'clinic', status: 'draft',
      submittedAt: null, decidedAt: null,
      resubmissionCount: 0, rejectionReason: null, createdAt: new Date('2026-09-07T00:00:00Z'),
      draft: stepData('basics'),
    },
  ]));
  docCount.mockImplementation(async (filter) => (filter?.version ? 2 : 10));
  httpRequestsTotal.reset();
  httpRequestsTotal.inc({ method: 'GET', route: '/api/join', status_code: '200' }, 7);
};

beforeEach(() => {
  appFind.mockReset();
  configFind.mockReset();
  docCount.mockReset();
  seedFixture();
});

// ── guard chain over real HTTP ───────────────────────────────────────────────

describe('2.md 13 endpoint guard', () => {
  it('401s an unauthenticated caller', async () => {
    const res = await as().get('/');
    expect(res.status).toBe(401);
  });

  it('403s every role that is not superadmin', async () => {
    for (const role of ['patient', 'doctor', 'hospital_admin', 'staff', 'pharmacy_admin', 'platform_user']) {
      const res = await as({ id: 'u1', role }).get('/');
      expect(res.status).toBe(403);
    }
  });

  it('200s a superadmin and refuses to let a cache hold the payload', async () => {
    const res = await as(SUPERADMIN).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('returns a useful 500 without leaking the database error', async () => {
    appFind.mockReturnValueOnce({
      select() { return this; },
      sort() { return this; },
      limit() { return this; },
      lean() { return Promise.reject(new Error('mongo down')); },
    });
    const res = await as(SUPERADMIN).get('/');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Could not build onboarding metrics');
    expect(res.body.errorId).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toContain('mongo down');
  });
});

// ── payload shape + arithmetic ──────────────────────────────────────────────

describe('2.md 13 payload', () => {
  it('carries every stage, every breakdown and the sample it was computed from', async () => {
    const { body } = await as(SUPERADMIN).get('/');
    expect(body).toEqual(expect.objectContaining({
      generatedAt: expect.any(String),
      funnel: expect.objectContaining({ visit: 7, start: 5, submit: 3, approved: 1 }),
      dropOff: expect.objectContaining({ unmappedApplications: 1 }),
      reviewTime: expect.objectContaining({ count: 2 }),
      rejections: expect.objectContaining({ total: 1 }),
      docResubmission: expect.objectContaining({ totalDocuments: 10, resubmittedDocuments: 2 }),
      profileCompleteness: expect.objectContaining({ threshold: COMPLETENESS_THRESHOLD }),
    }));
    expect(body.sample).toEqual({ applicationsAnalyzed: 5, truncated: false, maxRows: MAX_APPLICATION_ROWS });
  });

  it('derives visit from the join entry routes and labels the source', async () => {
    const { body } = await as(SUPERADMIN).get('/');
    expect(body.funnel.visit).toBe(7);
    expect(body.funnel.rates.startPerVisit).toBe(0.7143); // 5/7
    expect(body.funnel.meta.visitSource).toContain('http_requests_total');
    expect(body.funnel.meta.submitPerStart).toBeUndefined();
    expect(body.funnel.rates.submitPerStart).toBe(0.6); // 3/5
    expect(body.funnel.rates.approvedPerSubmit).toBe(0.3333); // 1/3
  });

  it('reports drop-off per wizard step against a hand-computable fixture', async () => {
    const { body } = await as(SUPERADMIN).get('/');
    const [pharmacy] = body.dropOff.byType;
    expect(body.dropOff.byType).toHaveLength(1);
    expect(pharmacy).toMatchObject({ typeKey: 'pharmacy', label: 'Pharmacy', total: 4, neverStarted: 1 });

    const steps = pharmacy.steps;
    expect(steps.map((s) => s.key)).toEqual(['basics', 'location', 'documents']);
    // reached: 3, 2, 2 (one applicant stopped after step 1)
    expect(steps.map((s) => s.reached)).toEqual([3, 2, 2]);
    // dropped at that step: 1 at basics, 0 at location, 2 finished at documents
    expect(steps.map((s) => s.dropOff)).toEqual([1, 0, 2]);
    expect(steps.map((s) => s.pctDropped)).toEqual([0.3333, 0, 1]);
    expect(steps[0].label).toBe('Basics');

    // pooled view excludes the application whose type has no config rows
    expect(body.dropOff.pooled).toMatchObject({ mapped: 4, started: 3, neverStarted: 1, stepCount: 3 });
    expect(body.dropOff.pooled.steps.map((s) => s.reached)).toEqual([3, 2, 2]);
    expect(body.dropOff.unmappedApplications).toBe(1);
  });

  it('averages review time from submittedAt -> decidedAt only', async () => {
    const { body } = await as(SUPERADMIN).get('/');
    expect(body.reviewTime.count).toBe(2);
    expect(body.reviewTime.avgMs).toBe(129_600_000); // (2d + 1d) / 2
    expect(body.reviewTime.avgHours).toBe(36);
    expect(body.reviewTime.p50Ms).toBe(86_400_000);
  });

  it('histograms rejection reasons with their share of rejections', async () => {
    const { body } = await as(SUPERADMIN).get('/');
    expect(body.rejections.histogram).toEqual([
      { reason: 'missing_document', count: 1, pct: 1 },
    ]);
  });

  it('computes the doc-resubmission rate from document versions', async () => {
    const { body } = await as(SUPERADMIN).get('/');
    expect(body.docResubmission).toMatchObject({
      totalDocuments: 10, resubmittedDocuments: 2, rate: 0.2,
      submittedApplications: 3, resubmittedApplications: 1, applicationRate: 0.3333,
    });
  });

  it('measures profile completeness as saved steps / configured steps', async () => {
    const { body } = await as(SUPERADMIN).get('/');
    // pharmacy only: 1.0, 0.3333, 0, 1.0  -> 2 of 4 complete, mean 0.5833
    expect(body.profileCompleteness).toMatchObject({
      measured: 4, complete: 2, pctComplete: 0.5, avgCompleteness: 0.5833,
    });
  });

  it('reports truncation instead of silently dropping rows past the cap', async () => {
    appFind.mockReturnValue(query(
      Array.from({ length: MAX_APPLICATION_ROWS + 1 }, () => ({
        typeKey: 'pharmacy', status: 'draft', submittedAt: null, decidedAt: null,
        resubmissionCount: 0, rejectionReason: null, createdAt: new Date(0),
        draft: stepData(),
      })),
    ));
    const { body } = await as(SUPERADMIN).get('/');
    expect(body.sample).toEqual({
      applicationsAnalyzed: MAX_APPLICATION_ROWS,
      truncated: true,
      maxRows: MAX_APPLICATION_ROWS,
    });
    expect(body.funnel.start).toBe(MAX_APPLICATION_ROWS);
  });

  it('never emits an empty-ratio database as NaN', async () => {
    configFind.mockReturnValue(query([]));
    appFind.mockReturnValue(query([]));
    docCount.mockResolvedValue(0);
    httpRequestsTotal.reset();
    const { body } = await as(SUPERADMIN).get('/');
    expect(body.funnel).toMatchObject({ visit: 0, start: 0, submit: 0, approved: 0 });
    expect(body.funnel.rates).toEqual({ startPerVisit: 0, submitPerStart: 0, approvedPerSubmit: 0 });
    expect(body.dropOff.byType).toEqual([]);
    expect(body.reviewTime).toEqual({ count: 0, avgMs: null, avgHours: null, p50Ms: null });
    expect(body.rejections.histogram).toEqual([]);
    expect(body.profileCompleteness.avgCompleteness).toBe(0);
    const text = JSON.stringify(body);
    expect(text).not.toMatch(/NaN/);
  });
});

// ── wiring ──────────────────────────────────────────────────────────────────

describe('wiring', () => {
  const indexSrc = fs.readFileSync(new URL('../../src/index.js', import.meta.url), 'utf8');
  const routeSrc = fs.readFileSync(new URL('../../src/routes/onboardingMetrics.js', import.meta.url), 'utf8');
  const ROUTES_DIR = fileURLToPath(new URL('../../src/routes', import.meta.url));

  it('index.js mounts the endpoint once', () => {
    expect(indexSrc).toContain("app.use('/api/onboarding-metrics', onboardingMetricsRoutes)");
    expect(indexSrc.match(/api\/onboarding-metrics/g)).toHaveLength(1);
  });

  it('the classifier records the route as role-gated, never public or unclassified', () => {
    const rows = buildInventory(ROUTES_DIR).filter((r) => r.file === 'onboardingMetrics.js');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ method: 'GET', target: "'/'", tag: 'role' });
    expect(routeSrc).toContain('// authz: role');
    // The grammar only declares these tags - a stray one fails the manifest test.
    expect(routeSrc).not.toMatch(/\/\/ authz:\s*(superadmin|admin)\b/);
  });
});
