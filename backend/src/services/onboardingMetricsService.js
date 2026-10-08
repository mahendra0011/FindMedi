/**
 * 2.md 13 — onboarding metrics: visit -> start -> submit -> approved, drop-off
 * per wizard step, average review time, rejection reasons, doc-resubmission
 * rate and profile completeness.
 *
 * ONE SNAPSHOT, ONE PASS. Everything is derived from a single read of
 * ProviderApplication (plus two counts on ProviderDocument and the config rows
 * that define the steps), so the numbers in one response are consistent with
 * each other — a funnel assembled from five independent queries at five
 * different instants cannot be trusted to add up.
 *
 * `visit` is the one stage with no first-party collection: the backend has no
 * page-view table, so the closest backend-owned signal is the HTTP counter for
 * the join flow's entry routes. It is labelled as such in the payload instead
 * of being passed off as a real page-view count.
 *
 * Everything here is read-only and aggregated; no PII leaves the endpoint
 * (2.md 13 metrics are counts and rates, 8.md 10 "aggregated/anonymised").
 */
import ProviderApplication from '../models/ProviderApplication.js';
import ProviderTypeConfig from '../models/ProviderTypeConfig.js';
import ProviderDocument from '../models/ProviderDocument.js';
import { httpRequestsTotal } from '../lib/metrics.js';

/** Row cap: the step-level pass is in-memory. Truncation is reported, never hidden. */
export const MAX_APPLICATION_ROWS = 20000;
/** 2.md 7 activation checklist: completeness >= 80% counts as "complete". */
export const COMPLETENESS_THRESHOLD = 0.8;
/**
 * The join flow's entry routes (the chooser fetch and the applicant tracker).
 * Read as `visit` because nothing else in the backend observes a page load.
 */
export const VISIT_ROUTES = ['/api/config/provider-types', '/api/join'];

/** APPLICATION_STATUSES that mean "the applicant has submitted". */
const SUBMITTED_STATUSES = new Set([
  'submitted', 'resubmitted', 'under_review', 'needs_info', 'approved', 'rejected', 'expired',
]);

const isSubmitted = (row) => Boolean(row.submittedAt) || SUBMITTED_STATUSES.has(row.status);
const pct = (n, d) => (d > 0 ? Number((n / d).toFixed(4)) : 0);
const toMs = (value) => (value ? new Date(value).getTime() : NaN);

/**
 * Requests the backend served for the join entry routes since this process
 * started. `null` when the counter cannot be read — an unavailable number is
 * reported as unavailable rather than as zero visits.
 */
export async function visitCount() {
  try {
    const metric = await httpRequestsTotal.get();
    const values = metric?.values ?? [];
    return values
      .filter((v) => v.labels?.method === 'GET' && VISIT_ROUTES.includes(v.labels?.route))
      .reduce((sum, v) => sum + Number(v.value || 0), 0);
  } catch {
    return null;
  }
}

/**
 * Drop-off across a wizard step ordering.
 *
 * `stops[i]` is how many applications ended at step i, `progress[i]` how many
 * reached i or beyond, and `dropOff[i] = progress[i] - progress[i+1]` how many
 * stopped there. Progress rather than raw key presence: an applicant who saved
 * step 5 has passed steps 1-4 whether or not each was individually persisted.
 *
 * @param {number[]} stops    applications whose furthest saved step is index i
 * @param {Array<{key:string,label:string}>} labels step key/label per index
 * @param {number} stepCount  length of the ordering
 */
export function buildStepFunnel(stops, labels, stepCount) {
  const steps = [];
  const progress = [];
  let running = 0;
  for (let i = stepCount - 1; i >= 0; i -= 1) {
    running += stops[i] || 0;
    progress[i] = running;
  }
  for (let i = 0; i < stepCount; i += 1) {
    const reached = progress[i];
    const dropOff = i === stepCount - 1 ? (stops[i] || 0) : reached - (progress[i + 1] || 0);
    steps.push({
      index: i,
      key: labels[i]?.key ?? null,
      label: labels[i]?.label ?? `Step ${i + 1}`,
      reached,
      dropOff,
      pctReached: pct(reached, progress[0] || 0),
      pctDropped: pct(dropOff, reached),
    });
  }
  return steps;
}

/** Most frequent step key/label seen at each index (for the pooled view). */
function modalLabels(votesAt) {
  return [...votesAt.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, counts]) => {
      let best = { key: null, label: null };
      let bestCount = -1;
      for (const [key, label, n] of counts) {
        if (n > bestCount) { best = { key, label }; bestCount = n; }
      }
      return best;
    });
}

export async function buildOnboardingMetrics({ now = new Date() } = {}) {
  const [configs, appRows, totalDocuments, resubmittedDocuments] = await Promise.all([
    ProviderTypeConfig.find({}).select('typeKey label group tier steps').lean(),
    ProviderApplication.find({})
      .select('typeKey status draft.stepData submittedAt decidedAt resubmissionCount rejectionReason createdAt')
      .sort({ createdAt: 1 })
      .limit(MAX_APPLICATION_ROWS + 1)
      .lean(),
    ProviderDocument.countDocuments({}),
    ProviderDocument.countDocuments({ version: { $gt: 1 } }),
  ]);

  const truncated = appRows.length > MAX_APPLICATION_ROWS;
  const rows = truncated ? appRows.slice(0, MAX_APPLICATION_ROWS) : appRows;
  const configByType = new Map((configs || []).map((c) => [c.typeKey, c]));

  // ── funnel ────────────────────────────────────────────────────────────────
  const submittedRows = rows.filter(isSubmitted);
  const approvedRows = rows.filter((r) => r.status === 'approved');
  const visit = await visitCount();
  const funnel = {
    visit,
    start: rows.length,
    submit: submittedRows.length,
    approved: approvedRows.length,
    rates: {
      startPerVisit: visit === null ? null : pct(rows.length, visit),
      submitPerStart: pct(submittedRows.length, rows.length),
      approvedPerSubmit: pct(approvedRows.length, submittedRows.length),
    },
    meta: {
      visitSource: 'http_requests_total(GET /api/config/provider-types + GET /api/join), since process start',
      submittedDefinition: 'submittedAt set, or status past draft',
    },
  };

  // ── drop-off per wizard step ──────────────────────────────────────────────
  const perType = new Map();
  const pooledStops = [];
  const pooledVotes = new Map(); // index -> Map(`${key}|${label}`, [key, label, count])
  let pooledStepCount = 0;
  let pooledMapped = 0;
  let unmapped = 0;
  let measured = 0;
  let complete = 0;
  let completenessSum = 0;

  for (const row of rows) {
    const config = configByType.get(row.typeKey);
    const steps = config?.steps ?? [];
    if (!config || steps.length === 0) {
      unmapped += 1;
      continue;
    }
    const present = new Set(Object.keys(row.draft?.stepData ?? {}));

    // Furthest step the applicant actually saved data for.
    let maxIndex = -1;
    steps.forEach((step, i) => {
      if (present.has(step.key)) maxIndex = i;
    });

    let bucket = perType.get(row.typeKey);
    if (!bucket) {
      bucket = {
        typeKey: row.typeKey,
        label: config.label || row.typeKey,
        group: config.group || '',
        tier: config.tier || '',
        stepCount: steps.length,
        stops: new Array(steps.length).fill(0),
        neverStarted: 0,
        labels: steps.map((s) => ({ key: s.key, label: s.label })),
        total: 0,
      };
      perType.set(row.typeKey, bucket);
    }
    bucket.total += 1;
    if (maxIndex >= 0) bucket.stops[maxIndex] += 1;
    else bucket.neverStarted += 1;

    pooledMapped += 1;

    // Pooled (by index) view across types that share the base step ordering.
    if (steps.length > pooledStepCount) pooledStepCount = steps.length;
    if (maxIndex >= 0) {
      pooledStops[maxIndex] = (pooledStops[maxIndex] || 0) + 1;
      const vote = steps[maxIndex];
      if (!pooledVotes.has(maxIndex)) pooledVotes.set(maxIndex, new Map());
      const indexVotes = pooledVotes.get(maxIndex);
      const voteKey = `${vote.key}|${vote.label}`;
      const existing = indexVotes.get(voteKey) || [vote.key, vote.label, 0];
      existing[2] += 1;
      indexVotes.set(voteKey, existing);
    }

    // Profile completeness (2.md 7): share of this type's wizard steps saved.
    const presentSteps = steps.filter((s) => present.has(s.key)).length;
    const ratio = presentSteps / steps.length;
    measured += 1;
    completenessSum += ratio;
    if (ratio >= COMPLETENESS_THRESHOLD) complete += 1;
  }

  const startedPooled = pooledStops.reduce((a, b) => a + (b || 0), 0);
  const dropOff = {
    byType: [...perType.values()]
      .map((b) => ({
        typeKey: b.typeKey,
        label: b.label,
        group: b.group,
        tier: b.tier,
        total: b.total,
        neverStarted: b.neverStarted,
        steps: buildStepFunnel(b.stops, b.labels, b.stepCount),
      }))
      .sort((a, b) => a.typeKey.localeCompare(b.typeKey)),
    pooled: {
      stepCount: pooledStepCount,
      // Mapped only: an application whose type has no config rows is reported
      // under `unmappedApplications`, never counted as "never started".
      mapped: pooledMapped,
      started: startedPooled,
      neverStarted: pooledMapped - startedPooled,
      steps: buildStepFunnel(pooledStops, modalLabels(pooledVotes), pooledStepCount),
    },
    unmappedApplications: unmapped,
  };

  // ── average review time (submittedAt -> decidedAt) ────────────────────────
  const durations = rows
    .filter((r) => r.submittedAt && r.decidedAt)
    .map((r) => toMs(r.decidedAt) - toMs(r.submittedAt))
    .filter((d) => Number.isFinite(d) && d >= 0)
    .sort((a, b) => a - b);
  const mean = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;
  const median = durations.length ? durations[Math.floor((durations.length - 1) / 2)] : null;

  // ── rejection reasons histogram ───────────────────────────────────────────
  const rejected = rows.filter((r) => r.status === 'rejected');
  const byReason = new Map();
  for (const row of rejected) {
    const reason = (row.rejectionReason || '').trim() || '(no reason recorded)';
    byReason.set(reason, (byReason.get(reason) || 0) + 1);
  }

  // ── doc-resubmission rate ─────────────────────────────────────────────────
  const resubmittedApps = submittedRows.filter((r) => (r.resubmissionCount || 0) > 0).length;

  return {
    generatedAt: now,
    sample: { applicationsAnalyzed: rows.length, truncated, maxRows: MAX_APPLICATION_ROWS },
    funnel,
    dropOff,
    reviewTime: {
      count: durations.length,
      avgMs: mean,
      avgHours: mean === null ? null : Number((mean / 3_600_000).toFixed(2)),
      p50Ms: median,
    },
    rejections: {
      total: rejected.length,
      histogram: [...byReason.entries()]
        .map(([reason, count]) => ({ reason, count, pct: pct(count, rejected.length) }))
        .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)),
    },
    docResubmission: {
      // A ProviderDocument row whose `version` is > 1 is a re-upload (10.md 2.4).
      rate: pct(resubmittedDocuments, totalDocuments),
      resubmittedDocuments,
      totalDocuments,
      applicationRate: pct(resubmittedApps, submittedRows.length),
      resubmittedApplications: resubmittedApps,
      submittedApplications: submittedRows.length,
    },
    profileCompleteness: {
      threshold: COMPLETENESS_THRESHOLD,
      measured,
      complete,
      pctComplete: pct(complete, measured),
      avgCompleteness: measured ? Number((completenessSum / measured).toFixed(4)) : 0,
      definition: 'share of the provider type wizard steps with saved data, per application',
    },
  };
}
