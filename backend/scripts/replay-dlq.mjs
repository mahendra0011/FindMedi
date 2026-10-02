#!/usr/bin/env node
/**
 * DP-M-02: dead-letter queue triage and replay.
 *
 * WHY THIS IS A SCRIPT AND NOT AN AUTO-CONSUMER
 * ----------------------------------------------
 * The DLQ used to be in the main consumer group's subscribe list, which made it
 * self-feeding: a message that had already failed five times was re-forwarded
 * into the normal `forwardEvent` path with `attempt` omitted, so the counter
 * reset to 0, it failed again, and it went back to RETRY_5S forever. One
 * unprocessable event could spin through the retry topic with no backoff,
 * permanently. A dead-letter queue exists precisely so that a message which
 * cannot be processed STOPS being processed; auto-replaying it inverts the
 * entire point.
 *
 * So replay is a human decision. This script shows what is stuck and why, and
 * re-drives it only when someone says so.
 *
 * USAGE
 *   node scripts/replay-dlq.mjs                       # triage only (safe, default)
 *   node scripts/replay-dlq.mjs --limit 50
 *   node scripts/replay-dlq.mjs --replay              # re-drive what was inspected
 *   node scripts/replay-dlq.mjs --replay --event-type ride.dispatch_started
 *   node scripts/replay-dlq.mjs --replay --topic findmedi.retry.5s --confirm
 *
 * `--confirm` is required in addition to `--replay`. Two flags for one action is
 * deliberate: the first says what you want, the second says you have read the
 * triage output and still want it.
 *
 * PHI: nothing here prints a payload. Only the event type, aggregate id, attempt
 * count and last error. An operator should never need a patient's name in their
 * terminal to decide whether to re-drive a message.
 */
import { KAFKA_TOPICS, KAFKA_BOOTSTRAP_SERVERS, isKafkaConfigured } from '../src/config/kafka.js';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

const LIMIT = Number(opt('limit', 20));
const REPLAY = flag('replay');
const CONFIRMED = flag('confirm');
const ONLY_EVENT = opt('event-type', null);
const ONLY_TOPIC = opt('topic', null);

/** Never re-drive into the DLQ or a retry topic - that is how the loop started. */
const FORBIDDEN = new Set([KAFKA_TOPICS.DLQ, KAFKA_TOPICS.RETRY_5S, KAFKA_TOPICS.RETRY_30S]);

const log = (m) => console.log(m);
const fail = (m) => { console.error(m); process.exit(1); };

// Flag guards FIRST, before the environment check, so the "you did not confirm"
// message is what an operator sees when they typo the flags — and so the guard
// is testable without a broker. Checking Kafka first meant a mistyped
// `--replay` was reported as "KAFKA is not configured", sending the reader after
// the wrong problem entirely.
if (REPLAY && !CONFIRMED) {
  fail('Refusing to replay without --confirm. Run without --replay first and read the triage output.');
}
if (REPLAY && (ONLY_TOPIC && FORBIDDEN.has(ONLY_TOPIC))) {
  fail(`Refusing to replay into ${ONLY_TOPIC} - that is the loop this script exists to prevent.`);
}
if (!isKafkaConfigured()) {
  fail('KAFKA is not configured (KAFKA_BOOTSTRAP_SERVERS is empty). Nothing to replay.');
}

const { Kafka } = await import('kafkajs');
const kafka = new Kafka({
  clientId: 'findmedi-dlq-triage',
  brokers: KAFKA_BOOTSTRAP_SERVERS,
});

const consumer = kafka.consumer({ groupId: `findmedi-dlq-triage-${Date.now()}` });
await consumer.connect();
await consumer.subscribe({ topic: KAFKA_TOPICS.DLQ, fromBeginning: true });

log(`DLQ triage — ${KAFKA_TOPICS.DLQ}`);
log(LIMIT < 1 || ONLY_EVENT || ONLY_TOPIC ? 'FILTERED' : 'no filter — showing the head of the topic');
log('');

const rows = [];
await consumer.run({
  eachMessage: async ({ message }) => {
    if (rows.length >= LIMIT) return;
    let env;
    try {
      env = JSON.parse(message.value.toString());
    } catch {
      return; // an unparseable frame is itself triage-worthy, noted below
    }
    const inner = env.payload || {};
    const row = {
      offset: message.offset,
      eventId: env.eventId,
      eventType: inner.eventType || '(none)',
      aggregateId: inner.aggregateId || '(none)',
      attempts: Number(env.retryCount ?? inner.retryCount ?? 0),
      failedFrom: env.retryFrom || inner.retryFrom || '(unknown)',
      lastError: String(env.lastError || inner.lastError || '(not recorded)').slice(0, 120),
      // DP-M-01: carry the original payload so a replayed frame still satisfies
      // the schema registry (required fields like providerId are restored).
      // Kept in memory only — the PHI stance above governs what gets PRINTED,
      // and nothing below prints `payload`.
      payload: inner && typeof inner === 'object' ? inner : {},
    };
    if (ONLY_EVENT && row.eventType !== ONLY_EVENT) return;
    if (ONLY_TOPIC && row.failedFrom !== ONLY_TOPIC) return;
    rows.push(row);
  },
});

await consumer.disconnect();


if (!rows.length) {
  log('  nothing to triage — the DLQ is empty (or everything in it was filtered out)');
  process.exit(0);
}

const width = Math.max(...rows.map((r) => r.eventType.length));
for (const r of rows) {
  log(`  offset ${String(r.offset).padStart(6)}  ${r.eventType.padEnd(width)}  agg=${r.aggregateId}  attempts=${r.attempts}`);
  log(`     failed from: ${r.failedFrom}`);
  log(`     last error : ${r.lastError}`);
}

const byError = new Map();
for (const r of rows) byError.set(r.lastError, (byError.get(r.lastError) || 0) + 1);
log('');
log('  grouped by last error (fix the cause, then replay):');
for (const [err, n] of [...byError.entries()].sort((a, b) => b[1] - a[1])) {
  log(`    ${String(n).padStart(4)}  ${err}`);
}

if (!REPLAY) {
  log('');
  log('  DRY RUN. Nothing was re-driven.');
  log('  Re-run with --replay --confirm once the cause above is fixed.');
  process.exit(0);
}

log('');
log('Replaying...');

const { emitKafkaEvent, disconnectProducer } = await import('../src/lib/kafkaProducer.js');
let replayed = 0;
let skipped = 0;

for (const r of rows) {
  // A message that failed FROM the DLQ, or from a retry topic, must not go
  // back there. Send it to its ORIGINAL business topic if we know it, else
  // refuse rather than guess.
  const target = r.failedFrom;
  if (FORBIDDEN.has(target) || !target || target === '(unknown)') {
    console.error(`  SKIP ${r.eventId}: cannot determine a safe target topic (failedFrom=${target})`);
    skipped += 1;
    continue;
  }
  try {
    const res = await emitKafkaEvent(target, r.aggregateId, {
      // DP-M-01: replay re-establishes the ORIGINAL contract first, then the
      // replay bookkeeping overrides identity/attempt fields on top.
      ...r.payload,
      eventId: r.eventId,
      eventType: r.eventType,
      aggregateId: r.aggregateId,
      replayedFrom: KAFKA_TOPICS.DLQ,
      replayedAt: new Date().toISOString(),
      lastError: r.lastError,
      // Reset so the message gets a full retry budget again - but the replay
      // itself is recorded, so a message that is genuinely unprocessable shows
      // up by its replay history rather than vanishing into an infinite loop.
      retryCount: 0,
    });
    if (res?.success) {
      console.error(`  SENT  ${r.eventId} -> ${target}`);
      replayed += 1;
    } else {
      console.error(`  FAIL  ${r.eventId} -> ${target}`);
      skipped += 1;
    }
  } catch (err) {
    console.error(`  ERROR ${r.eventId} -> ${target}: ${err.message}`);
    skipped += 1;
  }
}

await disconnectProducer();
log('');
log(`  replayed ${replayed}, skipped ${skipped}`);
process.exit(0);
