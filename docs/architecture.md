# FindMedi Architecture

## 8. Instant Dispatch (rider · lawyer · assistant · SOS · emergency doctor)

Reference pattern: `backend/src/services/emergencyDispatchService.js`
(`runWave`, accept-is-vote, `everNotified`, `dispatchLog`, `recoverStuckRequests`).
It is **not rewritten** — `backend/src/services/instantDispatchService.js`
is its generic, config-driven version (`startInstantDispatch`,
`handleInstantAccept`, `handleInstantReject`).

| Piece | Location |
|---|---|
| Generic wave engine | `backend/src/services/instantDispatchService.js` |
| Thin wrappers | `rideDispatchService.js`, `lawyerDispatchService.js`, `assistantDispatchService.js`, `emergencyDoctorDispatchService.js` |
| H3 fast-path cache | `backend/src/lib/h3Cache.js` (`hex:providers:{h3}` sets, `provider:location:{id}` JSON, 5-min TTL) + `backend/src/config/h3.js` (res 8 city / res 9 fine) |
| Canonical geo helpers | `backend/src/lib/geoUtils.js` (re-exports `calculateDistanceKm` from `rideService.js`) |
| Reconciler (5-min drift fix) | `backend/src/jobs/hexCacheReconcile.job.js` (started in `src/index.js`) |
| Backfill (city-center defaults) | `backend/scripts/instant/backfill-provider-locations.mjs` |
| Routes | `/api/instant/:type/:id/accept|reject` (`src/routes/instantDispatch.js`), `/api/emergency-doctor/*`; SOS keeps `/api/emergency-sos/*` |
| Frontend | `frontend/src/components/instant/` (`InstantSearchingScreen`, `InstantAssignedScreen`, `InstantNoRespondersScreen`, `useInstantDispatch`), `frontend/src/lib/instantDispatchSocket.ts`, Redux `store/slices/instantDispatchSlice.js`, provider full-screen `components/emergency/ProviderIncomingCall.tsx` |

Rules (binding):

- **Reuse over rewrite** — per-type logic is a `config` object, not a new engine.
- **H3 is fast-path only.** Every lookup falls back to MongoDB `$geoNear` /
  `$centerSphere`; all location models keep their `2dsphere` index.
- **Accept is a vote.** The backend atomically decides (`status: 'searching'`
  guard); clients treat `{type}_assigned` as source of truth.
- **Urgent = full-screen.** No toast/modal accept-reject for instant flows.
- **Radii are env-tunable** — see `.env.example` (`INSTANT_*_RADII`, `H3_*`, `SOS_*`).
- One central location writer: `upsertProviderLocationCache()` (+ GPS ping
  routes); offline always calls `removeProviderFromCache()`.
- Tests: `backend/test/instant-dispatch.test.js` (race, Redis-down fallback,
  exhaustion). Rollout note: ride bookings still run the legacy sequential
  path by default; flip per-booking via the instant wrapper when ready.

## 9. Dispatch protocol depth (specs 03/20)

- Per-vertical wave windows: `INSTANT_WINDOW_RIDE/LAWYER/ASSISTANT/DOCTOR`
  (15/60/45/25s); SOS keeps `SOS_WINDOW_SECONDS`.
- `Idempotency-Key` replay guard (`middleware/idempotency.js`, Redis 24h
  replay) on instant accept/reject, ride accept/cancel, demo `/pay`.
- Single automatic retry on exhaustion (45s backoff, 1.5x radii) + socket
  `packet_ack` tracking per wave (unacked providers logged).
- H3 multi-resolution: SOS res 6, consult res 7, rider res 8
  (`getResolutionForVertical`, `geo:h3:<res>:<cell>:<vertical>` keys,
  legacy `hex:providers` compat, 120s TTL).

## 10. Event backbone in-process (specs 10/11)

- `writeOutboxEvent()` (fail-soft) called at dispatch start + assignment in
  all 5 flows; assistant booking create already uses session transactions.
- Poller (`outboxPollerService.js`, started at boot): Redis 24h dedup,
  retry×5 → FAILED terminal + DLQ alert log, then delivers to
  `kafkaConsumerService.js` handlers (demand counters, presence sync,
  receipt pre-generation). Real broker transport stays gated behind
  `KAFKA_BOOTSTRAP_SERVERS` (no `kafkajs` dep by design).

## 11. Payments, ledger & guards (specs 21/22/25)

- Demo escrow lifecycle: `/hold /confirm /fail /refund /wallet/me` +
  lawyer `/hold-retainer`; statuses `held_in_escrow/released/refunded/failed`;
  `demoWallet.balance` (₹10k default) debited/credited for real.
- GRL Redis sliding-window limiter live on 5 booking-creation routes; SOS
  paths exempt (`middleware/rateLimit.js`).
- Provider withdrawals: `POST /api/transactions/withdraw` (₹100 reserve,
  double-entry ledger pair).
- Referral fraud: IP/device hash, 3-in-24h ring → `fraud_flagged`, rewards
  only via `earnPoints` after qualification (cooling intact).

## 12. Vertical depth (specs 05-09)

- Rider: LERP-smoothed map marker (`markerInterpolation.ts` wired),
  150m arrival geofence, pickup OTP.
- Lawyer: FIR/police-station/opposing-party fields end-to-end +
  conflict-of-interest exclusion in dispatch.
- Assistant: allergy profile end-to-end + bedside vitals API
  (`POST/GET /assistant-bookings/:id/vitals` → `VitalsLog`).
- SOS: trauma-desk pre-alert + Valhalla emergency green-corridor emit.
- Emergency doctor: ESI severity score, video-room issuance
  (`POST /:id/room`), 1-tap ALS escalation (endpoint + dashboard card).

## 13. Search, surge, lake, clinical (specs 14-16, expansion-09)

- `/api/search/providers` (OpenSearch when `OPENSEARCH_NODE` set, else Mongo
  fallback) + boot `ensureIndices()`.
- In-process surge job (`surgeCalc.job.js`, 60s) + `/api/surge/:cell`;
  Flink/Pinot clusters replace it without key-format changes.
- Nightly JSONL lake export (`scripts/lake/export-day.mjs`).
- Clinical alerts: `/api/clinical-alerts/code-blue|lab-panic|mtp` + socket
  rooms + WarRoom tones (`code_blue`/`lab_panic` presets).
- Infra: compose gains mongo replica-set, Valhalla (profile-gated),
  NGINX edge (`infra/nginx/nginx.conf`, SOS bypass); `scripts/mongo-init-rs.js`
  proves transactions locally.

## 14. Honestly still external-server-bound

Live Kafka broker, Flink/Pinot clusters, Hudi/Hive, gRPC mesh, NHA
gateway (mock OTP `123456`), Mongo replica set in
prod, Valhalla tile server, provider video media path. Everything above
degrades gracefully when they are unset.
