/**
 * DP-B-03: producer-to-Flink-to-Pinot contract.
 *
 * The drift this pins: the ride producer and surge_live.sql disagreed on
 * field names while the live job was print-only, so demand/surge analytics
 * were silently empty. The fix aligned them; this spec fails the build if
 * either side drifts again.
 *
 * Static on purpose: it asserts the RIDE booking outbox payload keys
 * (backend/src/routes/rides.js RideBookingCreated.v1) are a subset of the
 * Flink source-table columns (data-platform/flink/surge_live.sql
 * booking_requests_stream), that the Kafka topic matches, and that the sink
 * targets the Pinot surge_by_cell table with the freshness-alerted fields.
 */
import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const RIDES_JS = readFileSync(path.join(REPO, 'backend', 'src', 'routes', 'rides.js'), 'utf8');
const SURGE_SQL = readFileSync(
  path.join(REPO, 'data-platform', 'flink', 'surge_live.sql'),
  'utf8',
);

const sourceColumns = () => {
  const m = SURGE_SQL.match(/CREATE TABLE booking_requests_stream\s*\(([\s\S]*?)\)\s*WITH/i);
  if (!m) throw new Error('booking_requests_stream DDL not found in surge_live.sql');
  return m[1]
    .split('\n')
    .map((l) => l.trim().split(/\s+/)[0]?.replace(/[,;]$/, ''))
    .filter((c) => c && /^[A-Za-z_][A-Za-z0-9_]*$/.test(c));
};

describe('DP-B-03 producer-to-Flink contract', () => {
  it('ride producer payload keys exist in the Flink source table', () => {
    const cols = sourceColumns();
    // The keys the RideBookingCreated outbox payload actually emits.
    for (const key of ['bookingId', 'vertical', 'h3_cell', 'event_time']) {
      expect(RIDES_JS).toContain(key);
      expect(cols).toContain(key);
    }
  });

  it('Flink source topic matches the ride outbox destination topic', () => {
    expect(RIDES_JS).toContain('findmedi.dispatch.booking-events.v1');
    expect(SURGE_SQL).toContain("'topic' = 'findmedi.dispatch.booking-events.v1'");
  });

  it('live job sinks to Pinot surge_by_cell with the alerted fields', () => {
    expect(SURGE_SQL).toContain("'table-name' = 'surge_by_cell'");
    for (const field of ['h3_cell', 'window_end', 'booking_count', 'surge_multiplier']) {
      expect(SURGE_SQL).toContain(field);
    }
    // Not a debug print sink anymore.
    expect(SURGE_SQL).not.toMatch(/connector'\s*=\s*'print'/i);
  });

  it('Pinot sink freshness alert watches the same table and fields', () => {
    const alert = readFileSync(
      path.join(REPO, 'data-platform', 'pinot', 'surge_sink_freshness.yaml'),
      'utf8',
    );
    expect(alert).toContain('table: surge_by_cell');
    expect(alert).toContain('source_sql: data-platform/flink/surge_live.sql');
    for (const field of ['h3_cell', 'window_end', 'booking_count', 'surge_multiplier']) {
      expect(alert).toContain(field);
    }
    // A realtime sink with an hourly SLO is the alert that never fires.
    const slo = alert.match(/max_staleness_minutes:\s*(\d+)/);
    if (!slo) throw new Error('surge_sink_freshness.yaml has no max_staleness_minutes SLO');
    expect(Number(slo[1])).toBeLessThanOrEqual(5);
  });
});
