/**
 * DP-B-05 — data-pipeline health: freshness and lag, not just "is it up".
 *
 * The problem this solves is a SILENCE failure. The Kafka consumers, the outbox
 * poller and the OpenSearch indexer were all best-effort: each logged its own
 * errors and then kept going, so a consumer that stopped committing offsets — or
 * an indexer whose credentials quietly stopped working — produced exactly the
 * same observable result as a platform with no activity. Dashboards read "no
 * data" and the team concluded the data did not exist. Nothing alerted.
 *
 * A process being alive (/healthz) and a DATA PIPELINE being current are different
 * facts, and only the second one can be asserted. This module records what each
 * pipeline last produced and exposes the result on its own endpoint, so a stale
 * pipeline is a visible, alertable condition.
 *
 * Design notes:
 *   - `recordPipelineEvent` is called by the producers/consumers themselves. That
 *     is the only source of truth available: an external scraper cannot know
 *     whether an event was consumed or merely published.
 *   - Thresholds are per-pipeline because they mean different things. A clinical
 *     event stream 30 seconds behind is fine; a nightly analytics export 30
 *     seconds behind is broken.
 *   - Recording is cheap and in-memory. It is a health signal, not a metric store;
 *     the numeric time series belongs in the observability pipeline.
 */

/** How old a pipeline's output may get before it is considered stale. */
export const DEFAULT_STALE_AFTER_MS = Object.freeze({
  // Realtime clinical + dispatch streams. A minute of lag is visible to a
  // dispatcher watching a bed board, so the bar is tight.
  realtime: 60 * 1000,
  // Indexing/search. Search results a minute stale is user-noticeable but not
  // unsafe.
  search: 60 * 1000,
  // Analytics rollups and exports. These are inherently batch.
  analytics: 6 * 60 * 60 * 1000,
  // Outbox delivery to the bus. Bounded by the poller interval.
  outbox: 5 * 60 * 1000,
});

/** Known pipelines and the freshness class each one is judged against. */
export const PIPELINE_CLASSES = Object.freeze({
  kafka_consumer: 'realtime',
  emergency_dispatch: 'realtime',
  outbox_poller: 'outbox',
  opensearch_indexer: 'search',
  event_forwarder: 'realtime',
  analytics_rollup: 'analytics',
});

/**
 * pipeline name -> recorded progress.
 *
 * `lastEventAt` and `lastSuccessAt` are deliberately separate: a pipeline can be
 * RECEIVING events and failing to PERSIST them, which is the failure mode where a
 * naive "we saw traffic" check reports healthy while nothing is being written.
 * That is exactly the silent failure this module exists to expose.
 */
const state = new Map();

const ensure = (name) => {
  let entry = state.get(name);
  if (!entry) {
    entry = {
      name,
      pipelineClass: PIPELINE_CLASSES[name] || 'realtime',
      firstSeenAt: Date.now(),
      lastEventAt: null,
      lastSuccessAt: null,
      lastErrorAt: null,
      lastErrorMessage: '',
      events: 0,
      successes: 0,
      errors: 0,
    };
    state.set(name, entry);
  }
  return entry;
};

/**
 * Record that a pipeline did something.
 *
 * @param {string} name  pipeline identifier (a key of PIPELINE_CLASSES)
 * @param {'event'|'success'|'error'} kind
 * @param {{ count?: number, error?: Error|string }} [meta]
 */
export function recordPipelineEvent(name, kind = 'success', meta = {}) {
  const entry = ensure(name);
  const now = Date.now();
  const count = Number.isFinite(meta.count) ? meta.count : 1;

  if (kind === 'event') {
    entry.lastEventAt = now;
    entry.events += count;
  } else if (kind === 'success') {
    entry.lastSuccessAt = now;
    entry.successes += count;
    entry.lastErrorMessage = '';
  } else {
    entry.lastErrorAt = now;
    entry.errors += count;
    entry.lastErrorMessage = String(meta.error?.message || meta.error || 'unknown').slice(0, 300);
  }
  return entry;
}

/** Force a pipeline into the failing state (used when a consumer is stopped). */
export function markPipelineStopped(name, reason = 'consumer_stopped') {
  const entry = ensure(name);
  entry.lastErrorAt = Date.now();
  entry.lastErrorMessage = String(reason).slice(0, 300);
  return entry;
}

/**
 * The freshness report.
 *
 * A pipeline is `stale` when its last SUCCESS is older than its class budget.
 * A pipeline that has never reported is `unknown`, not `ok` — an absent signal is
 * not a healthy signal, and collapsing the two is precisely how this defect hid.
 */
export function getPipelineHealth(now = Date.now()) {
  const pipelines = [...state.values()].map((entry) => {
    const budget = DEFAULT_STALE_AFTER_MS[entry.pipelineClass] ?? DEFAULT_STALE_AFTER_MS.realtime;
    const lastSuccessAt = entry.lastSuccessAt;

    let status = 'unknown';
    let ageMs = null;
    if (lastSuccessAt !== null) {
      ageMs = now - lastSuccessAt;
      status = ageMs > budget ? 'stale' : 'ok';
    }

    // Errors since the last success: a pipeline failing on every event would
    // otherwise look like "recent activity" because traffic is still arriving.
    const currentlyFailing =
      entry.lastErrorAt !== null
      && (lastSuccessAt === null || entry.lastErrorAt > lastSuccessAt);

    return {
      name: entry.name,
      pipelineClass: entry.pipelineClass,
      status,
      lastSuccessAt,
      lastEventAt: entry.lastEventAt,
      lastErrorAt: entry.lastErrorAt,
      lastErrorMessage: entry.lastErrorMessage,
      ageMs,
      budgetMs: budget,
      events: entry.events,
      successes: entry.successes,
      errors: entry.errors,
      currentlyFailing,
    };
  });

  const stale = pipelines.filter((p) => p.status === 'stale');
  const unknown = pipelines.filter((p) => p.status === 'unknown');
  const failing = pipelines.filter((p) => p.currentlyFailing);

  const degraded = stale.length > 0 || failing.length > 0;

  return {
    checkedAt: now,
    healthy: !degraded,
    degraded,
    counts: {
      total: pipelines.length,
      stale: stale.length,
      unknown: unknown.length,
      failing: failing.length,
    },
    stalePipelines: stale.map((p) => p.name),
    failingPipelines: failing.map((p) => p.name),
    unknownPipelines: unknown.map((p) => p.name),
    pipelines,
  };
}

/** Test seam: reset module state. */
export function _resetPipelineHealth() {
  state.clear();
}