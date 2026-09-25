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
