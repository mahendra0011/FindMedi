/**
 * DP-M-02: the dead-letter queue must not feed itself.
 *
 * The DLQ was in the main consumer group's subscribe list. A message that had
 * exhausted its retries was therefore re-forwarded into the same
 * `forwardEvent` path as healthy traffic, with `attempt` omitted — so
 * `forwardEvent` reset it to 0 (`opts.attempt || 0`), the handler failed again,
 * `routeToRetry` computed `next = 1`, and the message went straight back to
 * RETRY_5S. Forever.
 *
 * The duplicate-suppression marker does not save you here, and that is the part
 * worth remembering: `isDuplicate` writes `event:seen:<id>` only on SUCCESSFUL
 * delivery, so a message that never succeeds is never marked and never
 * suppressed. One unprocessable event became a permanent hot loop.
 *
 * These are static assertions because the failure is a control-flow shape in a
 * subscription list — reproducing it in a test would need a live broker, and a
 * test that cannot run is a test that cannot catch the regression.
 */
import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const consumer = read('../../src/services/kafkaConsumerService.js');
const forwarder = read('../../src/services/eventForwarder.js');
const topics = read('../../src/config/kafka.js');

/** The literal topic list passed to consumer.subscribe, comments excluded. */
const subscribedTopics = () => {
  const at = consumer.indexOf('consumer.subscribe(');
  const open = consumer.indexOf('[', at);
  const close = consumer.indexOf(']', open);
  return consumer
    .slice(open, close)
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, '').trim().replace(/,$/, ''))
    .filter((l) => l.startsWith('KAFKA_TOPICS.'));
};

describe('DP-M-02 · the DLQ is terminal, not a loop input', () => {
  it('the main consumer does NOT subscribe to the DLQ', () => {
    expect(subscribedTopics()).not.toContain('KAFKA_TOPICS.DLQ');
  });

  it('it still subscribes to the retry topics and the business topics', () => {
    // The fix must not become "stop consuming" - the cascade has to work.
    const t = subscribedTopics();
    expect(t).toContain('KAFKA_TOPICS.RETRY_5S');
    expect(t).toContain('KAFKA_TOPICS.RETRY_30S');
    expect(t).toContain('KAFKA_TOPICS.BOOKING_EVENTS');
  });

  it('the DLQ topic still exists and is still written to', () => {
    // Removing the subscription must not remove the topic or the emission -
    // otherwise a failure would be silently dropped instead of parked.
    expect(topics).toMatch(/DLQ: 'findmedi\.dlq'/);
    expect(forwarder).toMatch(/emitKafkaEvent\(KAFKA_TOPICS\.DLQ/);
  });

  it('the attempt count survives the broker hop', () => {
    // Without this the documented 5s -> 30s -> DLQ cascade never escalates for
    // anything arriving over Kafka: every redelivery restarted at 0, so a
    // message could never accumulate enough failures to reach the DLQ at all.
    expect(consumer).toMatch(/attempt: Number\(enveloped\.retryCount/);
    expect(consumer).toMatch(/retryCount: enveloped\.retryCount \?\? inner\.retryCount/);
  });

  it('the forwarder actually defaults its attempt counter to zero', () => {
    // Pins the premise of the bug. If this ever changes, the bug above cannot
    // recur in the same way and this file can be revisited.
    expect(forwarder).toMatch(/attempt: opts\.attempt \|\| 0/);
  });

  it('the replay tool exists and refuses to re-drive into a retry topic', () => {
    const script = read('../../scripts/replay-dlq.mjs');
    expect(script).toMatch(/FORBIDDEN/);
    expect(script).toMatch(/Refusing to replay into/);
    // Two flags for one action: intent, then confirmation.
    expect(script).toMatch(/Refusing to replay without --confirm/);
    // PHI: the triage table must not print a payload.
    expect(script).not.toMatch(/JSON\.stringify\(inner\)/);
  });
});
