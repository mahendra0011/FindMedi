# Payments / Billing / Ledger — Missing Features

Scope: absent capabilities in the money path (`routes/{payments,transactions,billing,demoPayment}.js`, `services/{ledgerService,pgDualWrite}.js`).
Companion file: `payments-billing-ledger-bugs.md` (5 findings).

---

## [MISS-PAY-001] No verified payment-gateway webhook — no signature check anywhere in the backend
- **Description**: A repository-wide grep finds **no** use of `crypto.timingSafeEqual` anywhere in `backend/src`, and no webhook handler that verifies a provider signature. Payment-provider references are confined to `routes/integrations.js` (12 occurrences) and `models/IntegrationConfig.js`; `services/pgDualWrite.js` talks to Postgres via Prisma — there is no raw `pg` usage. The platform therefore has no trustworthy server-to-server confirmation of a payment: the client's own success response is the source of truth.
- **Why it matters**: Without a signed webhook, "paid" is whatever the client claims. A crafted request to the pay endpoint can mark an order paid without money moving, and there is no independent record to reconcile against.
- **Expected**: A webhook endpoint that verifies the provider's HMAC signature with a constant-time comparison, is idempotent by provider event id, and drives the payment status transition — with the client redirect treated only as UI feedback.
- **Workaround**: None. `routes/integrations.js` contains a connection "test" that does not perform a real provider call, so even the integration surface cannot confirm a live account.
- **Suggested implementation**: Add `POST /api/payments/webhook/:provider` that (1) reads the raw body (`express.raw` — the app must not JSON-parse it first), (2) verifies the signature with `crypto.timingSafeEqual`, (3) stores the event id for idempotency, (4) transitions the payment and writes the ledger entry inside a transaction. Make the client-side path advisory only.
- **Priority**: High
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Raw-body route + HMAC signature verification (constant-time)
  - [ ] Provider event-id idempotency table
  - [ ] Status transitions driven by the webhook, not the client
  - [ ] Reconciliation report: provider settlements vs. local payments
  - [ ] Alert on any payment marked paid without a matching webhook event
  - [ ] Confirm whether any provider SDK is actually integrated (only `integrations.js` references one)

---

## [MISS-PAY-002] No refund workflow: no partial refunds, no reason capture, no approval trail
- **Description**: Refunds are a binary status flip. In the verified demo path, `payment.status = 'refunded'` is set and the **full** `payment.amount` is credited back (`routes/demoPayment.js` L444–L450). There is no `refundAmount`, no `refundReason`, no `refundedBy`, no partial-refund support, no link to a ledger reversal entry, and no approval step for refunds above a threshold.
- **Why it matters**: Partial and reasoned refunds are the everyday case in healthcare billing (cancelled consultation, unused package session, part-refund on a cancelled ride). Without them staff either over-refund or handle money outside the system entirely, which destroys reconciliation.
- **Expected**: A `Refund` record (`paymentId`, `amount`, `reason`, `requestedBy`, `approvedBy`, `ledgerEntryId`) supporting multiple partial refunds summing to no more than the captured amount, with threshold-based approval.
- **Suggested implementation**: Add the model plus `POST /api/payments/:id/refunds`; enforce `sum(refunds) <= payment.amount` with an atomic check; write the matching ledger reversal (or outbox entry) in the same transaction; add `authorize('payments:refund')` and a maker–checker step above a configurable threshold.
- **Priority**: High
- **Phase**: Phase 2
- **TODOs**:
  - [ ] `Refund` model with reason/approver/ledger link
  - [ ] Partial refunds with an atomic over-refund guard
  - [ ] Ledger reversal in the same transaction
  - [ ] Threshold approval via the maker–checker flow
  - [ ] Refund report for finance
  - [ ] Tests: partial refund, over-refund rejected, concurrent refunds

---

## [MISS-PAY-003] No reconciliation, no settlement/payout statements, no drift detection
- **Description**: Nothing compares the authoritative ledger against derived balances. The wallet balance is a mutable field (`walletBalance`) updated by arithmetic in application code (PAY-001), and there is no job, report or dashboard that would notice the two diverging. Withdrawal history exists only as ledger rows — there is no periodic statement, no settlement file and no provider-vs-local comparison.
- **Why it matters**: Money systems are trusted because they can be *proved*, not because they are correct. Without reconciliation, a single silent failure (or the double-spend in PAY-001) becomes an unexplained discrepancy weeks later, with no artefact to hand an auditor or a payment provider.
- **Expected**: A scheduled reconciliation job (ledger sum vs. wallet field vs. provider settlements per provider per day), a drift alert, and a downloadable statement per provider per period.
- **Suggested implementation**: A daily job rebuilding balances from `TransactionLedger` and comparing to the stored field, writing a report document and alerting on any non-zero delta; `GET /api/providers/me/statement?from&to` producing PDF/CSV from ledger rows.
- **Priority**: Medium
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Ledger-derived balance recomputation job
  - [ ] Drift detection + alerting
  - [ ] Provider statement export (PDF/CSV)
  - [ ] Provider-settlement comparison (depends on MISS-PAY-001)
  - [ ] Document the ledger as the system of record

<!-- END -->
