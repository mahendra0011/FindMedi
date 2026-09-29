# Rides / Ambulance / Emergency â€” Bugs

Scope: `routes/rides.js` (658 lines, 14 routes), `routes/emergencySOS.js` (17 routes), `routes/instantDispatch.js`, `routes/ambulanceDriver.js` (8 routes), `routes/emergencyDoctor.js` (10 routes), `lib/valhallaRouting.js`.
All five files appear in the `AUTHZ-001` zero-guard set.

---

## [RIDE-001] Debug/diagnostic endpoints are exposed to ordinary authenticated users
- **Description**: `routes/emergencySOS.js` registers `GET /debug/eligible-providers` and `GET /:id/diagnostics` with `protect` only, and `AUTHZ-001` confirms the file contains no authorisation helper at all. These are development instruments â€” provider-selection internals and per-SOS diagnostics â€” reachable by any logged-in account, including low-trust roles.
- **Current vs Expected**: Current = internal dispatch state (which providers are considered eligible and why) is readable by any user. Expected = debug surfaces absent from production builds or gated behind `superadminOnly`/an environment flag.
- **Flow**: The dispatch diagnostics expose the platform's provider-selection logic and, depending on payload, provider identities and locations â€” useful reconnaissance for abusing the dispatch flow, and the kind of endpoint that leaks infrastructure details nobody intended to publish.
- **Root Cause / Logic**: Helper endpoints written for local testing and shipped in the same router without an environment guard.
- **Affected Files**: `routes/emergencySOS.js` (`/debug/eligible-providers`, `/:id/diagnostics`)
- **UI/Frontend Impact**: None.
- **Security/Data Risk**: **Mediumâ€“High.** Information disclosure of internal selection logic plus provider PII (position/identity) to any authenticated account, and a stepping stone to the dispatch-abuse issues below.
- **Steps to Reproduce**: `GET /api/emergency-sos/debug/eligible-providers` with any user token.
- **Suggested Fix / Implementation Plan**: Remove both routes from production, or wrap them in `superadminOnly` plus `if (process.env.NODE_ENV !== 'production')`. Sweep for other `debug`/`diagnostics`/`test` route names and apply the same rule. Add a CI grep for routes containing `debug`.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Remove or gate `/debug/*` and `/diagnostics` routes
  - [ ] Sweep all routers for debug/test endpoints
  - [ ] CI check for newly added debug routes
  - [ ] Confirm the diagnostics payload contains no provider PII

---

## [RIDE-002] Dispatch accept/complete flows have no role guard â€” the actor is whatever `protect` lets through
- **Description**: Across the emergency/dispatch surface, every state-changing route is registered with `protect` alone: `emergencySOS.js` `POST /:id/accept`, `/:id/reject`, `/:id/cancel`, `PUT /:id/complete`, `/:id/select-hospital`, `/:id/progress`; `emergencyDoctor.js` `POST /dispatch`, `PUT /toggle-duty`, `/:requestId/accept`, `/:requestId/status`, `/:requestId/escalate`; `rides.js` `POST /:id/accept`, `/arrived`, `/start`, `/complete`, `/cancel`; `instantDispatch.js` `POST /:type/:id/accept` and `/:type/:id/reject`. Only the last two also carry `idempotencyGuard()` (good practice worth propagating). None declares which role may perform the transition, so a `patient`, `delivery_boy` or `lawyer` token reaches handlers written for riders/drivers/doctors.
- **Current vs Expected**: Current = correct behaviour depends on an inline check inside each of ~20 transition handlers. Expected = `authorize('rider')`, `authorize('ambulance_driver')`, `authorize('doctor')` (or the new permission model) declared on the route, with the handler owning only business rules.
- **Flow**: Live dispatch â€” the highest-consequence flow on the platform: accepting a job commits a physical resource to a real emergency.
- **Root Cause / Logic**: Role logic embedded in handlers rather than declared on routes â€” exactly where `REC-001/002/007` and `CHAT-003` went wrong.
- **Affected Files**: `routes/{emergencySOS,emergencyDoctor,rides,instantDispatch,ambulanceDriver}.js`
- **UI/Frontend Impact**: None visible.
- **Security/Data Risk**: **Critical if any single handler omits its check** â€” dispatch hijacking (accepting someone else's ambulance job, completing it to fake the trip, cancelling a competitor's) is a life-safety and fraud scenario. Treat every route as a candidate until the inline checks are converted to declarative guards and tested.
- **Steps to Reproduce**: For each transition, attempt it with the token of a role that should not be allowed and record which succeed.
- **Suggested Fix / Implementation Plan**: Convert every transition to declarative `authorize(...)`. Add a table-driven (route Ã— role) test asserting allow/deny per the policy matrix â€” the only way to make ~20 handlers verifiable. Require `idempotencyGuard()` on all of them, following the `instantDispatch.js` precedent.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Declarative role guards on every dispatch transition
  - [ ] (route Ã— role) authorisation test matrix
  - [ ] `idempotencyGuard()` on all transitions
  - [ ] Audit every transition with actor + previous state
  - [ ] Document the dispatch state machine

## [RIDE-003] `instantDispatch` accepts an arbitrary `:type` and `:id` from the URL
- **Description**: `routes/instantDispatch.js` exposes `POST /:type/:id/accept` and `POST /:type/:id/reject`, taking both the entity kind and the entity id from the path with only `protect` + `idempotencyGuard()`. The router therefore resolves a resource type chosen by the caller â€” the classic shape enabling cross-collection id substitution (a lawyer-booking id used where a ride id is expected) and, if `:type` is ever interpolated into a model lookup, model injection.
- **Current vs Expected**: Current = the caller picks both the collection and the document. Expected = one route per entity kind (`/rides/:id/accept`, `/lawyer-bookings/:id/accept`, â€¦) or a strictly validated `:type` resolved through a fixed allowlist map, with the caller's eligibility asserted server-side.
- **Flow**: Broadcast dispatch shared by rides, lawyer bookings and assistant bookings.
- **Root Cause / Logic**: Generic dispatch implemented by parameterising the resource type â€” convenient, but it moves a security decision into the URL.
- **Affected Files**: `routes/instantDispatch.js` (both registrations), the shared dispatch service
- **UI/Frontend Impact**: None.
- **Security/Data Risk**: **High.** Cross-entity id substitution can attach a provider to an unrelated booking; if `:type` influences model or field names, the same endpoint becomes an injection surface for anything reachable through those models.
- **Steps to Reproduce**: Call `/api/instant-dispatch/ride/<lawyerBookingId>/accept` and compare the behaviour with the correct type.
- **Suggested Fix / Implementation Plan**: Replace `:type` with explicit routes or an allowlisted `{ type â†’ model }` map never built from user input; assert eligibility (this provider is an invited candidate for this specific dispatch) inside a shared helper used by both verbs.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Static route per entity kind (or an allowlisted type map)
  - [ ] Server-side eligibility assertion
  - [ ] Reject ids that do not belong to the declared kind
  - [ ] Tests for cross-kind id substitution

---

## [RIDE-004] Ride receipts disclose trip and fare data to any authenticated user (IDOR)
- **Description**: `rides.js` registers `GET /:id`, `GET /:id/receipt` and `GET /:id/thermal-receipt` with `protect` only and no ownership guard declared on the route. Receipts carry fare breakdown, pickup/drop addresses and timestamps â€” effectively a location history of a patient's journeys, which in a healthcare context is sensitive (it can reveal which clinic or hospital a person visited).
- **Current vs Expected**: Current = receipts are addressable by id and the authorisation decision lives inside three separate handlers. Expected = a single ownership assertion (`ride.patientId === req.user.id || ride.riderId === req.user.id || same-tenant admin`), declared once and reused.
- **Flow**: Post-trip receipt download and thermal printing for patients and riders.
- **Root Cause / Logic**: Content-addressed endpoints without a shared resource-ownership guard â€” the same pattern as `REC-007` (prescription PDF).
- **Affected Files**: `routes/rides.js` (`/:id`, `/:id/receipt`, `/:id/thermal-receipt`)
- **UI/Frontend Impact**: None visible.
- **Security/Data Risk**: **High.** Movement history and fare data for arbitrary users obtainable by enumerating ids, including trips to medical facilities â€” a privacy harm distinct from the medical record itself.
- **Steps to Reproduce**: `GET /api/rides/<id>/receipt` with an unrelated user's token.
- **Suggested Fix / Implementation Plan**: Add a shared `assertRideAccess(ride, user)` helper covering patient, assigned rider and same-tenant admin; attach it to all three routes; return 404 for non-participants; restrict the receipt projection to what the document needs and stop embedding patient identifiers beyond a reference number.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Shared ride-access assertion on all ride-by-id routes
  - [ ] 404 for non-participants
  - [ ] Minimise identifiers on printed receipts
  - [ ] Test with an unrelated account

## [RIDE-005] Ambulance GPS update — koi ownership check nahi, koi bhi ambulance ki fake live location (hospitals.js L406-427)`r`n- **Description**: `PUT /api/hospitals/ambulances/:id/location` me sirf `protect` hai. `findByIdAndUpdate(req.params.id, {coordinates:[lng,lat]})` — na `hospitalId` match, na driver/role check. Koi bhi logged-in user kisi bhi ambulance-id par lat/lng push karke dispatch map par fake live location dikha sakta hai; purani location silently overwrite ho jati hai (koi history/trail nahi).`r`n- **Risk**: **High (life-safety).** Fake-ambulance misdirection, ETA fraud, real emergency me galat dispatch.`r`n- **Fix**: `requireRole(['ambulance_driver'])` + assert `ambulance.currentDriverId === req.user._id` ya hospital-scope; location-history append karo (overwrite nahi); range/speed sanity-check lagao.`r`n`r`n---`r`n`r`n## [RIDE-006] Ride detail endpoint — poori ride + phone/email/PII, zero ownership check (rides.js L260-300)`r`n- **Description**: `GET /api/ride/:id` kisi bhi logged-in user ko poori ride de deta hai: `populate(userId, 'name phone avatar email')` + `populate(riderId, ...)` + `riderProfile.currentLocation` tak. Na `patientId === caller` check, na `riderId === caller`, na hospital-scope. Matlab ek ID se dusre ki trip-history, phone, email, live-location sab nikal jata hai — RIDE-004 (receipt) se bhi bada leak, kyunki yahan live location bhi hai.`r`n- **Risk**: **Critical (privacy + physical safety).** Stalking/doxxing, targeted fraud; live-location leak se physical harm tak.`r`n- **Fix**: shared `assertRideAccess(ride, user)` me patient/rider/same-tenant-admin check; 404 on miss (403 se existence leak nahi); `phone/email/currentLocation` ko role-wise projection me kaato (rider ko patient ka phone trip-active me hi).`r`n`r`n---`r`n`r`n## [RIDE-007] hospitalId-less staff + records + patients me tenant-check skip — ek hi pattern 3 jagah (staff.js L31-51, records pattern, patients.js L15)`r`n- **Description**: `GET /staff` + `GET /staff/:id` me `filter.hospitalId` sirf tab lagta hai jab `req.user.hospitalId` set ho: `if (req.user.hospitalId && role !== 'superadmin') filter.hospitalId = ...`. Jiska `hospitalId` null hai (lawyers/riders/delivery/staff-role users) unka filter `{}` rehta hai = **poori staff directory (salary/contactNumber/address/qualifications sahit)**. `PUT /:id` + `DELETE /:id` me bhi same (`filter={_id}` only) — sirf `adminOnly` role-check rehta hai, tenant-check nahi. Ye wahi fail-open shape hai jo records (REC-001/002) me mila tha.`r`n- **Risk**: **High.** Salary/PII leak + cross-tenant staff edit/delete (PII + HR fraud).`r`n- **Fix**: tenant-assertion ko mandatory banao (deny jab `hospitalId` missing ho, except superadmin); salary/contact ko role-wise projection me rakho; `PUT /:id` me `req.body` ki jagah allowlist.`r`n`r`n---`r`n`r`n## [APT-001] Appointments list — `?search=` doctor-scope overwrite + patient name-oracle (appointments.js L66-82)`r`n- **Description**: Patient-branch `filter.$or` (own-id OR name-match) ke baad doctor-search branch **usi `$or` key ko overwrite** karta hai (`filter.$or = [{patient: regex}]`). Doctor-role ke liye to scope bana rehta hai, par koi bhi non-listed role (rider/lawyer/staff) scope-branches me aata hi nahi — unka filter `{}` + search-regex = poori collection scan. Dusra, patient-branch khud name-based fallback rakhta hai (`patient: req.user.name`): common naam wale patients ki appointments cross-visible hoti hain (name-oracle).`r`n- **Risk**: **High.** Unlisted-role full-listing + name-collision PHI leak — REC-002/REC-003 ka sibling pattern.`r`n- **Fix**: scope aur search ko `$and` me jodo; name-fallback hatao (sirf `patientId` match); unlisted roles ko explicit deny.`r`n`r`n---`r`n`r`n## [APT-002] Appointment `PUT /:id` full-object overwrite + `DELETE` no-owner check for staff/others (appointments.js L665-761)`r`n- **Description**: `const updates = {...req.body}` (L696) ke baad `findByIdAndUpdate(id, updates, {runValidators:true})` — field-allowlist nahi: `patientId/doctorId/hospitalId/status/paymentStatus/fees` sab client se badal sakta hai (mass-assignment ka appointment roop). `DELETE /:id` me patient-check + tenant-check + doctor-check hain, par `hospital-admin-null`, `staff`, `receptionist` jaise roles teeno se nikal jate hain = unke liye delete open. Tenant-check bhi `appointment.hospitalId` blank hone par skip.`r`n- **Risk**: **High.** Appointment hijack/reassign, fee/status tampering, silent delete — booking-integrity + billing-fraud.`r`n- **Fix**: update ke liye strict allowlist (`status/date/time/notes` role-wise); `patientId/doctorId/hospitalId/fees` immutable; DELETE me default-deny + owner/staff-scope matrix.`r`n`r`n---`r`n`r`n## [APT-003] Transit/intake me owner-bypass + location-spoof + silent clinical overwrite (appointments.js L592-664)`r`n- **Description**: `PUT /:id/transit` me `isAdmin` (`hospital_admin`, koi bhi hospital ka) ko bhi patient-location likhne ka haq hai — cross-tenant GPS spoof. `lat/lng` `Number()` me convert hote hain par range-check (lat ±90, lng ±180) nahi, aur `etaMinutes/distanceKm` negative bhi ho sakte hain. `PUT /:id/intake` me sirf patient-owner check hai — doctor/staff apne patient ka intake nahi bhar sakta (workflow-block), ulta jis appointment ka `patientId` null ho (walk-in legacy) usme koi bhi patient apna intake likh sakta hai kyunki `appointment.patientId?.toString() !== req.user._id` null-par true nahi hota? (null?.toString() = undefined ? id ? 403 milta hai — safe, par null-owner records ka ownerless-state khud ek issue hai). Intake `preConsultationDetails` ko poora overwrite karta hai — purani allergies/medications bina history ke gayab.`r`n- **Risk**: **Medium-High.** Fake GPS/ETA se queue-manipulation; clinical-history loss.`r`n- **Fix**: transit-writer ko patient/assigned-driver tak seemit karo; lat/lng range + speed-sanity; intake ko versioned/append-only banao (allergies ka diff-log rakho).`r`n`r`n---`r`n`r`n<!-- END -->
