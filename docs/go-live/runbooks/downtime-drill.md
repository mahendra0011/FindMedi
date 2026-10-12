# Server Read-Only Downtime Drill (F3 / P2-31)

Proves the server-side read-only mode works **before go-live and quarterly
afterwards**. The offline/client-side contingency drill (service worker,
triplicate forms, MRD catch-up) is separate: `docs/security/audit-runbook.md` §5.

## Mechanism (exact code)

- Flag: `SystemSetting` key **`downtime.readOnly`** (`"true"` / `"false"`).
  Read by `backend/src/lib/downtime.js` (`isReadOnly()`, 30 s in-process cache).
- Enforcement: `downtimeGuard` wired in `backend/src/index.js:423` — all
  `POST/PUT/PATCH/DELETE` get **503** `{"code":"DOWNTIME_READ_ONLY"}` +
  `Retry-After: 60` while the flag is on. Reads are never blocked.
- Allowlist (writes still allowed): `/api/auth/refresh`, `/api/auth/logout`,
  `/api/auth/pin/unlock`, `/api/system-settings` (so the flag can be turned off).
- Toggle: `PUT /api/system-settings/downtime.readOnly` (superadmin, `upsert:true`,
  audited as `update_system_setting` with key + value).
- **Cache caveat:** the route does not call `bustDowntimeCache()`, so changes take
  effect in ≤ 30 s. Always wait 30 s between steps.
- **Fail-open:** if the flag read errors (DB down), the guard passes traffic and
  logs `downtime flag read failed`. This is deliberate (availability over
  blocking) — alert on that log line, and re-run this drill after any DB incident.

## Drill procedure (staging, ~10 min)

Prerequisites: superadmin token (`$SA`), base URL (`$API`), two browser tabs.

| # | Action | Expected |
|---|---|---|
| 1 | `GET $API/api/system-settings` (Bearer `$SA`) | `downtime.readOnly` absent or `false` |
| 2 | **Announce** drill start (status channel per `cutover.md` §2) | team aware |
| 3 | `PUT $API/api/system-settings/downtime.readOnly` body `{"value":"true"}` | `200 {"key":"downtime.readOnly","value":"true"}` |
| 4 | **Wait 30 s** (cache TTL) | — |
| 5 | Write probe: any state-changing call, e.g. `POST $API/api/appointments` (or a UI action like "Book") | **503**, body `code: DOWNTIME_READ_ONLY`, header `Retry-After: 60` |
| 6 | Read probe: `GET $API/api/ops-health` (or open any dashboard) | **200**, data flows normally |
| 7 | Allowlist probe: `POST $API/api/auth/refresh` | not 503 (session refresh works) |
| 8 | Frontend check: UI error toast/banner on a save attempt, no crash, no data written | graceful |
| 9 | Disable: `PUT $API/api/system-settings/downtime.readOnly` body `{"value":"false"}` | `200` |
| 10 | **Wait 30 s**, repeat step 5 | succeeds (2xx) — writes restored |
| 11 | `GET $API/api/audit-logs?action=update_system_setting` (superadmin) | rows for both toggle events with key + values |

## Pass criteria

- [ ] Write → 503 `DOWNTIME_READ_ONLY` + `Retry-After` while on; succeeds after off
- [ ] Reads 200 throughout the drill
- [ ] Auth refresh/logout/pin-unlock never blocked (staff cannot be locked out)
- [ ] Toggle audited both ways (`update_system_setting`, value recorded)
- [ ] Zero rows written to business collections during the window
- [ ] Elapsed time + result recorded in `docs/legal/COMPLIANCE-REGISTER.md` §2

## Record

| Date | Staging/Prod | Enabled at | Disabled at | Elapsed | Result | Sign-off |
|---|---|---|---|---|---|---|
| _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

## Notes

- No dedicated UI banner exists for server read-only mode (the `DOWNTIME_READ_ONLY`
  message surfaces through the normal API error path); user communication runs
  through the status channel, not an in-app banner.
- Never run on production without the announcement window from `cutover.md` §2.
- `maintenanceMode` in `DEFAULT_SETTINGS` is a separate, legacy flag — this drill
  tests `downtime.readOnly` only.
