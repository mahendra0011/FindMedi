# Payments / Billing / Ledger — Bugs

Scope: `routes/payments.js` (4 routes), `routes/transactions.js` (758 lines, 6 routes), `routes/billing.js` (9 routes), `routes/demoPayment.js` (470 lines, 7 routes), `services/ledgerService.js`, `services/pgDualWrite.js`, `middleware/idempotency.js`, `models/{Payment,TransactionLedger,DemoPayment,Billing}.js`.
Companion file: `payments-billing-ledger-missing.md`.

---

## [PAY-001] HIGH — Wallet balances are mutated read-then-write, and no MongoDB transaction wraps the ledger writes
- **Description**: Two independent defects in the money path. (a) **Non-atomic balance mutation**: `routes/transactions.js` L166–L186 reads the profile, checks `profile.walletBalance < amount + MIN_RESERVE`, then does `profile.walletBalance -= amount` — a classic TOCTOU; two concurrent withdrawal requests both pass the check and both debit from the same starting balance. The same pattern appears in `routes/demoPayment.js` L28–L36 and L46–L52: `walletBalanceOf(user)` reads, then `User.updateOne({ _id }, { $set: { 'demoWallet.balance': balance - amount } })` writes an **absolute** value computed from a stale read — worse than `$inc`, since any concurrent credit is silently discarded. (b) **No transaction around the ledger pair**: the withdrawal writes a DEBIT and a CREDIT entry to `TransactionLedger` after mutating the wallet, with no session — a grep of the entire backend shows `mongoose.startSession()` in exactly one file (`services/transactionalOutbox.js`), so the wallet debit and the two ledger inserts are not atomic: a crash between them leaves money moved with no ledger record.
- **Current vs Expected**: Current = concurrent withdrawals can overdraw a provider wallet, and a partial failure corrupts the ledger with no reconciliation path. Expected = an atomic conditional debit (`findOneAndUpdate({ _id, walletBalance: { $gte: amount + MIN_RESERVE } }, { $inc: { walletBalance: -amount } })`) with the ledger pair written in the same transaction, or via the transactional-outbox utility that already exists in the codebase.
- **Flow**: Provider withdrawals (Spec 22 §4) and every demo-wallet payment, hold and refund.
- **Root Cause / Logic**: Balance updates written as in-memory arithmetic followed by a full-value `$set`, plus an available-but-unused transactional-outbox utility. The correct primitive (`$inc` with a conditional filter) exists in MongoDB but is not used.
- **Affected Files**: `routes/transactions.js` (L149–L186), `routes/demoPayment.js` (L21–L52, L440–L455), `services/ledgerService.js`, `services/transactionalOutbox.js`, `models/TransactionLedger.js`
- **UI/Frontend Impact**: Indirect — balances shown in provider/patient dashboards can be wrong with no way to explain why.
- **Security/Data Risk**: **High (financial integrity).** Direct monetary loss is possible via concurrency (a provider firing parallel withdrawals), and the absence of an atomic ledger means disputes cannot be settled from records. It is also a fraud-investigation blocker: the ledger is the artefact an auditor would rely on.
- **Steps to Reproduce**: Fire N parallel `POST /api/transactions/withdraw` requests for an amount just under the balance from the same provider token; observe more than one success and a balance below the reserve.
- **Suggested Fix / Implementation Plan**: Replace every balance mutation with a single conditional `$inc` update and treat a null match as insufficient funds. Wrap the wallet update and ledger entries in one session/transaction, or route them through `transactionalOutbox.js`. Add a `currency` field and assert it. Add a reconciliation job comparing `walletBalance` against the sum of ledger entries, alerting on drift. Unit-test with parallel calls.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Atomic conditional debit (`$inc` + balance filter) everywhere
  - [ ] Transaction/outbox for wallet + ledger writes
  - [ ] Reconciliation job + drift alert
  - [ ] Concurrency tests for withdraw, pay and refund
  - [ ] Confirm `ledgerService` cannot be called outside a transaction

## [PAY-002] HIGH — Demo-payment transitions and refunds have no authorisation; refund idempotency is racy
- **Description**: `routes/demoPayment.js` registers `POST /hold`, `POST /confirm/:id`, `POST /fail/:id` and `POST /refund/:id` with only `protect` + `paymentLimiter` — no role guard and no ownership check on the payment. Contrast `routes/payments.js`, where `PUT /:id` and `PUT /:id/refund` are correctly protected with `adminOnly` + zod validation. The refund handler credits the wallet of `payment.userId` (L450: `User.updateOne({ _id: payment.userId }, { $inc: { 'demoWallet.balance': payment.amount } })`) — the **payment owner**, not the caller — so any authenticated user can trigger a credit to somebody else's wallet by iterating ids. Idempotency is a non-atomic status read (`if (payment.status === 'refunded') return ...` at L444, mutation at L447), so two concurrent refunds can both pass the check and credit twice.
- **Current vs Expected**: Current = state transitions and refunds are open to any authenticated account, including low-trust roles, and are replayable in parallel. Expected = the payment owner or an admin only, with an atomic status transition (`findOneAndUpdate({ _id, status: { $ne: 'refunded' } }, ...)`) acting as the lock.
- **Flow**: Ride/booking/lawyer-consultation payment lifecycle. The demo wallet is the sandbox money used across those flows, so corrupted state propagates into downstream earnings and net-90% commission credits computed from the same records.
- **Root Cause / Logic**: State-transition endpoints written as thin wrappers over a model update, with authorisation assumed from role-gated UI buttons. `idempotencyGuard()` is wired only to `POST /pay`, so the replayable endpoints are precisely the state-changing ones.
- **Affected Files**: `routes/demoPayment.js` (L72 plus the `/hold`, `/confirm`, `/fail`, `/refund` registrations; L440–L455 refund), `routes/payments.js` (L3–L4 as the correct pattern)
- **UI/Frontend Impact**: None visible.
- **Security/Data Risk**: **High (financial integrity).** Cross-user state manipulation and double-refunds on the sandbox ledger; the same handler shape is the template for the production ledger, so the defect class is one refactor away from real money. The ₹10,000 `demoWallet` default (`walletBalanceOf`, L21–L22, via `??`) is intended sandbox credit but must never reach a production wallet path.
- **Steps to Reproduce**: As user A, `POST /api/payment/demo/refund/<user B's payment id>` twice concurrently → B's wallet credited twice (non-deterministically).
- **Suggested Fix / Implementation Plan**: Add ownership checks (payer or admin) and an atomic conditional transition for each state change. Apply `idempotencyGuard()` (after fixing PAY-003) to all state-changing payment endpoints. Make the ledger the source of truth for refunds instead of a direct wallet `$inc`. Replace the implicit ₹10,000 default with an explicit seed step.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Authorise each demo-payment transition (owner or admin)
  - [ ] Atomic status transition to prevent double-refund
  - [ ] `idempotencyGuard()` on hold/confirm/fail/refund
  - [ ] Refund via a ledger entry, not a bare wallet `$inc`
  - [ ] Explicit sandbox-wallet seeding instead of a `??` default
  - [ ] Concurrency test for double refund

## [PAY-003] HIGH — `idempotencyGuard` keys are global, unscoped and fail open; wired to a single route
- **Description**: `middleware/idempotency.js` builds the Redis key as `` `${prefix}:${key}` `` from the client's `Idempotency-Key` header alone — **not** namespaced by user or route. Consequences: (a) two different users sending the same key collide; (b) anyone who supplies a key another client will later use can pre-seed it and cause the victim's legitimate payment to be **suppressed** (returning the attacker's stored body, or `409 IDEMPOTENT_IN_FLIGHT`); (c) whatever response body was stored is **replayed to whoever presents the key**, which for a payment response can include another user's payment data. The guard is also explicitly **fail-open**: no header → pass through; Redis unavailable or not open → pass through; any Redis error → `logger.warn` then `next()`. Finally it is attached to exactly **one** route in the codebase (`POST /api/payment/demo/pay`), leaving `/hold`, `/confirm`, `/fail`, `/refund` and the `billing.js` money endpoints unprotected against replay. Implementation detail: response capture monkey-patches `res.json` only, so anything sent via `res.send`/`res.end` is never cached.
- **Current vs Expected**: Current = an "idempotency" control that can be bypassed by omitting the header, defeated by taking Redis down, mis-bound across users, and is absent from five of the six money-moving routes. Expected = keys scoped as `user:route:key`, storing a reference to the resulting entity rather than the response body, and applied to every non-idempotent POST that moves money or creates an entity.
- **Flow**: Double-payment and double-dispatch protection; its absence on `/confirm` and `/refund` is precisely what enables the double-credits in PAY-002.
- **Root Cause / Logic**: A header-only key was the path of least resistance, and fail-open was chosen to avoid breaking existing clients — reasonable for reads, wrong for payment writes, which need a per-route policy rather than one global behaviour.
- **Affected Files**: `middleware/idempotency.js` (L11–L44), `routes/demoPayment.js` (L72, the only wiring), `routes/{billing,transactions,payments}.js`
- **UI/Frontend Impact**: The frontend must send a stable `Idempotency-Key` per logical action; without it the control is inert.
- **Security/Data Risk**: **High.** Request suppression for payments, cross-user response disclosure, and replay protection that silently vanishes when Redis is degraded — the exact condition under which clients retry most.
- **Steps to Reproduce**: 1) Send a payment with `Idempotency-Key: X`. 2) Replay the same key from a *different* account → the first response body is returned. 3) Stop Redis and repeat → the guard no-ops entirely.
- **Suggested Fix / Implementation Plan**: Scope the key as `prefix:userId:method:path:key`; store the created entity id plus status and re-fetch on replay instead of echoing a stored body; make fail-**closed** the default for money routes with an explicit opt-out; capture via `res.on('finish')` rather than patching `res.json`; apply the guard to every money-moving POST; and audit-log every replay.
- **Priority**: High
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Namespace keys by user and route
  - [ ] Store entity references, not response bodies
  - [ ] Fail-closed option for payment routes
  - [ ] Apply to all money-moving POSTs
  - [ ] Capture on `finish` instead of patching `res.json`
  - [ ] Audit-log replays; test cross-user key and Redis-down behaviour

## [PAY-004] Cross-tenant patient PHI on invoice/bill endpoints, and a 9-route billing module with no role guards
- **Description**: Two related defects. (a) In `routes/transactions.js`, the invoice and bill handlers authorise with `if (payment.patient_id !== req.user._id.toString() && req.user.role !== 'hospital_admin') return ...` (L592, L626) — an allow-by-role escape hatch with **no tenant comparison**, so a `hospital_admin` belonging to *any* hospital can read any patient's invoice. The responses populate patient data (`patientId: 'name phone address uhid'`, `'name phone address'`) at L601, L635 and L716–L728. (b) `routes/billing.js` registers 9 routes — including `PUT /:id`, `DELETE /:id`, `POST /pay`, `GET /:id/invoice`, `GET /:id/bill` — with `protect` only and no role guard at all (per the `AUTHZ-001` sweep), so billing documents can be created, modified, deleted and exported by any authenticated account.
- **Current vs Expected**: Current = patient billing data (name, phone, address, UHID) is readable by admins of unrelated tenants, and billing documents are mutable by any authenticated user. Expected = ownership (`patient_id === req.user.id`) or same-tenant administrative access applied consistently across both modules, with PHI projections limited to the minimum the screen needs.
- **Flow**: Patient payment history, invoices and bills — the documents a patient downloads for insurance and reimbursement, and the ones that carry their UHID.
- **Root Cause / Logic**: Role-based escape hatches used in place of resource-ownership checks, and a second billing implementation (`billing.js`) that duplicates `transactions.js` without inheriting its partial checks — the same duplication pattern flagged elsewhere in this audit.
- **Affected Files**: `routes/transactions.js` (L585–L592, L619–L626, L714–L728), `routes/billing.js` (all 9 registrations), `models/Billing.js`, `models/Payment.js`
- **UI/Frontend Impact**: None visible.
- **Security/Data Risk**: **High.** Cross-tenant PHI disclosure (financial plus identifying data, including UHID) and mutation of billing records by any authenticated role, which supports fraud such as waiving or altering charges.
- **Steps to Reproduce**: As a `hospital_admin` of hospital A, `GET /api/transactions/<id>/invoice` for a payment belonging to hospital B's patient → invoice with name, phone, address and UHID. Then as any authenticated non-admin, `DELETE /api/billing/<id>`.
- **Suggested Fix / Implementation Plan**: Replace the role escape hatch with an explicit ownership-or-same-tenant assertion (`payment.hospitalId === req.user.hospitalId`), add `adminOnly`/`authorize()` to every mutating `billing.js` route, and restrict the `populate` to the fields the screen requires. Merge the duplicate invoice/bill handlers behind one guard. Add cross-tenant denial tests for both modules.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Tenant check alongside ownership in invoice/bill
  - [ ] `authorize()`/`adminOnly` on all mutating billing routes
  - [ ] Minimise the PHI projection (drop `uhid`/`address` where unused)
  - [ ] De-duplicate the two invoice/bill implementations
  - [ ] Cross-tenant and non-admin denial tests
  - [ ] Review every other `role !== 'hospital_admin'` escape hatch in the codebase

## [PAY-005] `POST /api/transactions/pay` is a god-endpoint: it creates an appointment *and* a payment, non-idempotently and non-transactionally
- **Description**: The 758-line `routes/transactions.js` implements `POST /pay` (registered at L192) as a single handler that: derives the payer (`patientId = req.user._id`, L208), may create an **Appointment** (`auditLog('create_appointment', ...)` at L336), maps the payment method (`upi|card|netbanking|cash|wallet`, L371), creates a **Payment** (`patientId: req.user._id, amount, paid: amount, balance: 0, status: 'Paid'`, L473–L478), notifies the doctor and patient (L499–L518), and audits `create_payment` (L529). Two consequences: (a) **no idempotency guard** is attached to this route (contrast `POST /api/payment/demo/pay`, which has `idempotencyGuard()`), so a double-submit or client retry creates a second appointment *and* a second payment; (b) the writes are not atomic — no MongoDB session is used here (sessions appear in exactly one backend file, `services/transactionalOutbox.js`), so a failure after the appointment insert but before the payment insert leaves a confirmed appointment with no payment record, and vice versa.
- **Current vs Expected**: Current = one endpoint owns appointment creation, payment creation, notification fan-out and audit for several service types. Expected = appointment creation and payment capture as separate, individually idempotent operations joined by a reference, with the cross-cutting write wrapped in a transaction or outbox.
- **Flow**: Patient pays for a consultation → an appointment is created; doctors/packages/rides reuse the same entry point via `serviceType` branching, which is why the handler is so large.
- **Root Cause / Logic**: A single "pay" entry point grew to absorb booking creation rather than delegating to the appointments module that already implements it (`routes/appointments.js`).
- **Affected Files**: `routes/transactions.js` (L192–L560), `routes/appointments.js`, `models/{Payment,Appointment}.js`, `services/transactionalOutbox.js`
- **UI/Frontend Impact**: A user retrying a slow payment can end up with duplicate appointments — visible as "two bookings for the same slot".
- **Security/Data Risk**: **High (financial + operational integrity).** Duplicate charges and/or duplicate clinical bookings from an ordinary network retry; an inconsistent appointment-without-payment state that staff cannot reconcile from the UI.
- **Steps to Reproduce**: Submit `POST /api/transactions/pay` twice in quick succession with the same body (no `Idempotency-Key`) → two appointments, two payments.
- **Suggested Fix / Implementation Plan**: Split the handler: `POST /appointments` (idempotent via an idempotency key) then `POST /payments` referencing the appointment id. Reuse the existing appointments module instead of reimplementing it. Wrap the two writes in a session/outbox. Require an `Idempotency-Key` on `/pay` and enforce it with a corrected `idempotencyGuard` (PAY-003). Add a duplicate-booking test.
- **Priority**: High
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Separate appointment creation from payment capture
  - [ ] Require and enforce `Idempotency-Key` on `/pay`
  - [ ] Transaction/outbox across the two writes
  - [ ] Delegate to `routes/appointments.js` rather than duplicating booking logic
  - [ ] Duplicate-submit regression test
  - [ ] Document the `serviceType` matrix this handler branches on

<!-- END -->
