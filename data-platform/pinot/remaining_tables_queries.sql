-- Reference queries for the three new REALTIME tables (p95 target <50ms).
-- Run against the Pinot broker: POST http://localhost:9000/query/sql

-- 1. Bed/OT cockpit: ICU occupancy by hospital (last 1h)
-- SELECT hospitalId, department,
--   SUM(occupied_beds) AS occupied, SUM(total_beds) AS total,
--   AVG(ed_wait_minutes) AS ed_wait, AVG(or_turnaround_minutes) AS or_turnaround
-- FROM bed_ot_cockpit
-- WHERE timestamp_epoch_ms > (UNIX_TIMESTAMP() - 3600) * 1000
-- GROUP BY hospitalId, department LIMIT 50;

-- 2. Drug shortage / epidemic: top molecules by district (last 24h)
-- SELECT molecule, district, SUM(dispense_count) AS dispensed,
--   MAX(shortage_flag) AS shortage
-- FROM prescription_rollup
-- WHERE timestamp_epoch_ms > (UNIX_TIMESTAMP() - 86400) * 1000
-- GROUP BY molecule, district ORDER BY dispensed DESC LIMIT 50;

-- 3. Doctor SLA: p50/p95/p99 accept latency per vertical + chronic delayers
-- SELECT vertical, providerId,
--   PERCENTILEEST50(accept_latency_seconds) AS p50,
--   PERCENTILEEST95(accept_latency_seconds) AS p95,
--   PERCENTILEEST99(accept_latency_seconds) AS p99
-- FROM provider_sla
-- WHERE timestamp_epoch_ms > (UNIX_TIMESTAMP() - 86400) * 1000
-- GROUP BY vertical, providerId HAVING p95 > 120 LIMIT 50;
SELECT 1;
