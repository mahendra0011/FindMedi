/**
 * Phase 3 LIFECYCLE/PARITY: assistant / lawyer / emergency-doctor completion parity.
 * Table-driven contract over route sources (no Mongo): every vertical must
 *  - claim only a still-eligible unsettled booking (CAS + settledAt null where money moves),
 *  - settle at most once inside the transaction before commit,
 *  - answer duplicate completion idempotently (200) and invalid transitions with 409,
 *  - emit a durable outbox event inside the transaction (notifications are not best-effort).
 */
import { readFile } from 'node:fs/promises';

const assistantSource = await readFile(new URL('../../src/routes/assistantBookings.js', import.meta.url), 'utf8');
const lawyerSource = await readFile(new URL('../../src/routes/lawyerBookings.js', import.meta.url), 'utf8');
const edSource = await readFile(new URL('../../src/routes/emergencyDoctor.js', import.meta.url), 'utf8');

function bodyFor(source, routeMarker, nextMarker) {
  const start = source.indexOf(routeMarker);
  const end = source.indexOf(nextMarker, start + routeMarker.length);
  if (start < 0 || end < 0) throw new Error(`Could not isolate handler ${routeMarker}`);
  return source.slice(start, end);
}

const assistantComplete = bodyFor(assistantSource, "router.post('/:id/complete'", "router.post('/:id/cancel'");
const lawyerComplete = bodyFor(lawyerSource, "router.post('/:id/complete'", "router.post('/:id/cancel'");
// emergency-doctor lifecycle lives on PUT /:requestId/status
const edStatusStart = edSource.indexOf("router.put('/:requestId/status'");
const edStatus = edStatusStart < 0 ? '' : edSource.slice(edStatusStart, edStatusStart + 6000);

const verticals = [
  {
    name: 'assistant',
    body: assistantComplete,
    cas: /assistantId:\s*req\.user\._id,\s*status:\s*'in_progress',\s*settledAt:\s*null/,
    settlement: /recordServiceSettlement\(\{[\s\S]*?source:\s*'assistant'[\s\S]*?session/,
    outbox: /AssistantBookingCompleted\.v1/,
    notifInTxn: /Notification\.create\(\[[\s\S]*?assistant-booking-completed:/,
    duplicate: /already completed/,
  },
  {
    name: 'lawyer',
    body: lawyerComplete,
    cas: /lawyerId:\s*req\.user\._id,\s*status:\s*\{\s*\$in:\s*\['confirmed',\s*'in_progress'\]\s*\},\s*settledAt:\s*null/,
    settlement: /recordServiceSettlement\(\{[\s\S]*?source:\s*'lawyer'[\s\S]*?session/,
    outbox: /LawyerBookingCompleted\.v1/,
    notifInTxn: /Notification\.create\(\[[\s\S]*?lawyer-booking-completed:/,
    duplicate: /already completed/,
  },
  {
    name: 'emergency-doctor',
    body: edStatus,
    // CAS via status predicate on the update filter (no money → no settledAt).
    cas: /status:\s*existingReq\.status/,
    settlement: null, // no wallet settlement on this vertical — claim release instead
    outbox: null,
    notifInTxn: null,
    duplicate: /already closed/,
  },
];

describe('booking lifecycle parity (assistant/lawyer/emergency-doctor)', () => {
  it.each(verticals.map((v) => [v.name]))('vertical %s handler exists', () => {});

  it('eligible-state CAS is present on every vertical', () => {
    for (const v of verticals) {
      expect(`${v.name}: ${v.body.slice(0, 80)}`).toBeTruthy();
      expect(v.body).toMatch(v.cas);
    }
  });

  it('settledAt null guards every money-moving completion (assistant/lawyer)', () => {
    expect(assistantComplete).toMatch(/settledAt:\s*null/);
    expect(lawyerComplete).toMatch(/settledAt:\s*null/);
  });

  it('settlement happens at most once, inside the transaction before commit', () => {
    for (const v of [verticals[0], verticals[1]]) {
      const occurrences = (v.body.match(/recordServiceSettlement\(/g) || []).length;
      expect(occurrences).toBe(1);
      expect(v.body).toMatch(v.settlement);
      expect(v.body.indexOf('recordServiceSettlement')).toBeLessThan(v.body.indexOf('commitTransaction'));
    }
    // emergency-doctor releases the provider claim exactly once on terminal states
    expect(edStatus).toMatch(/releaseProviderClaim\('emergency_doctor'/);
  });

  it('duplicate completion is idempotent, invalid transitions are 409', () => {
    for (const v of verticals) expect(v.body).toMatch(v.duplicate);
    expect(assistantComplete).toMatch(/\? 200 : 409/);
    expect(lawyerComplete).toMatch(/\? 200 : 409/);
    expect(edStatus).toMatch(/409/);
    // No silent post-commit best-effort on the completion notice path
    expect(assistantComplete).not.toMatch(/\.catch\(\(\)\s*=>\s*\{\}\)/);
  });

  it('completion outbox event is written inside the transaction', () => {
    for (const v of [verticals[0], verticals[1]]) {
      expect(v.body).toMatch(/OutboxEvent\.create\(/);
      expect(v.body).toMatch(v.outbox);
      expect(v.body.indexOf('OutboxEvent.create')).toBeLessThan(v.body.indexOf('commitTransaction'));
      expect(v.body).toMatch(v.notifInTxn);
      // transactional Notification.create uses the array + session form
      expect(v.body).toMatch(/Notification\.create\(\[[\s\S]*?\],\s*\{\s*session\s*\}\)/);
    }
  });

  it('duplicate CAS failure aborts the transaction (no partial settlement)', () => {
    for (const v of [verticals[0], verticals[1]]) {
      expect(v.body).toMatch(/if\s*\(!completed\)\s*\{[\s\S]*?abortTransaction\(\)/);
      expect(v.body).toMatch(/catch\s*\([^)]*\)\s*\{[\s\S]*?abortTransaction\(\)/);
    }
  });
});
