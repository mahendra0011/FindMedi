# Payments & Billing — Bugs

## [PAY-BUG-01] Premature External Gateway Refund Execution Before DB Record & Idempotency Settlement
- **Description**: In `backend/src/routes/payments.js` (lines 336-359), the payment gateway refund call (`payGateway.refund(...)`) is invoked before recording the refund record in MongoDB.
- **Current vs Expected Behavior**:
  - *Current*: `payGateway.refund` runs first. If the subsequent `Refund.requestRefund` throws an error or MongoDB connectivity drops, the gateway has already debited the merchant account and refunded the patient, but the database shows the payment as unrefunded.
  - *Expected*: Create a `Refund` record with status `PENDING` and a database lock/idempotency key first. Then call the gateway. On gateway success, mark the refund `SETTLED`. On failure, mark `FAILED`.
- **Flow**: Hospital Admin or Patient Support issuing a refund on an appointment or pharmacy order.
- **Root Cause / Logic**: Inverted order of operations in `backend/src/routes/payments.js:336-370`.
- **Affected Files**: `backend/src/routes/payments.js`, `backend/src/models/Refund.js`
- **UI/Frontend Impact**: Admin clicks refund, sees an error toast, clicks refund again, causing a second deduction from the hospital escrow account.
- **Security/Data Risk**: **High**. Financial loss / double-refunding vulnerability.
- **Steps to Reproduce**:
  1. Trigger `POST /api/payments/:id/refund` with an invalid body attribute after the gateway refund completes.
  2. The gateway registers the refund, but the API returns 500 and database payment state remains `completed`.
- **Suggested Fix / Implementation Plan**:
  1. Wrap refund creation in a two-phase state machine: `INITIATED` -> `GATEWAY_DISPATCH` -> `SETTLED`/`FAILED`.
  2. Use MongoDB transaction session or atomic `findOneAndUpdate` lock.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [x] Reorder refund operations in `backend/src/routes/payments.js`.
  - [x] Add idempotency test for concurrent refund triggers.

---

## [PAY-BUG-02] Concurrency Race Condition in Doctor/Hospital Payout Claim Generation
- **Description**: In `backend/src/routes/commission.js` (lines 212-250), `TransactionLedger.find({ status: 'unclaimed' })` finds eligible fees and then creates a `Payout` row, followed by `TransactionLedger.updateMany(...)`. This is performed without a multi-document database transaction or lock.
- **Current vs Expected Behavior**:
  - *Current*: Two concurrent payout requests for the same provider can both read the exact same unclaimed transactions, generating two duplicate payout vouchers for the same revenue.
  - *Expected*: Payout calculation and ledger marking must occur within an atomic MongoDB replica set transaction (`session.startTransaction()`) with optimistic concurrency control.
- **Flow**: Monthly finance closing, doctor payout generation, hospital revenue settlement.
- **Root Cause / Logic**: Missing Mongoose transaction session around ledger claiming in `backend/src/routes/commission.js`.
- **Affected Files**: `backend/src/routes/commission.js:212-255`, `backend/src/models/TransactionLedger.js`
- **UI/Frontend Impact**: Duplicate payouts generated on admin ledger dashboard.
- **Security/Data Risk**: **High**. Double-payout to doctors/vendors; ledger imbalance.
- **Steps to Reproduce**:
  1. Send two parallel `POST /api/commission/payouts/generate` requests with the same provider ID.
  2. Check `Payout` table — two payouts created referencing the same ledger entries.
- **Suggested Fix / Implementation Plan**:
  1. Use `mongoose.startSession()` and execute `Payout.create` + `TransactionLedger.updateMany` inside `session.withTransaction(...)`.
  2. Add atomic versioning/status check on ledger rows (`status: 'unclaimed' -> 'claimed'`).
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [x] Wrap `commission.js` payout generation in `startSession` transaction.
  - [x] Add unit test checking parallel payout generation concurrency.

---

## [PAY-BUG-03] Plaintext Bank Account Details Exposing Full Account Numbers Without Masking
- **Description**: In `backend/src/routes/recon.js` line 26, `BankAccount.find({ ...tenant(req), active: true }).lean()` returns complete plaintext bank account numbers to any user with `billing:read` permission.
- **Current vs Expected Behavior**:
  - *Current*: `{ accountNo: "12345678901234", ifsc: "HDFC0001234", bankName: "HDFC Bank" }` returned in full.
  - *Expected*: Account numbers must be masked by default (`accountNo: "********1234"`), only unmasking via dedicated step-up auth or break-glass access with audit logging.
- **Flow**: Bank account reconciliation, accountant statement verification.
- **Root Cause / Logic**: Direct `.lean()` projection without response DTO masking in `backend/src/routes/recon.js`.
- **Affected Files**: `backend/src/routes/recon.js:23-31`, `backend/src/models/BankAccount.js`
- **UI/Frontend Impact**: Full bank account number visible in frontend tables.
- **Security/Data Risk**: **High**. Data leak of corporate and doctor bank credentials; violates financial data minimization principles.
- **Steps to Reproduce**:
  1. Log in with billing role.
  2. Request `GET /api/recon/accounts`.
  3. Inspect JSON response; observe unmasked 14-digit bank account number.
- **Suggested Fix / Implementation Plan**:
  1. Add `maskBankAccountNumber(accNo)` helper returning last 4 digits.
  2. Apply transformation in `recon.js` GET handler.
- **Priority**: High
- **Phase**: Phase 0
- **TODOs**:
  - [x] Implement `maskAccountNumber` in `backend/src/utils/masking.js`.
  - [x] Update `backend/src/routes/recon.js` to mask `accountNo`.

---

## [PAY-BUG-04] Mass Assignment on Bank Account Creation Endpoint
- **Description**: In `backend/src/routes/recon.js` line 35, `BankAccount.create({ ...tenant(req), ...req.body })` blindly spreads the entire request body into the Mongoose model.
- **Current vs Expected Behavior**:
  - *Current*: An attacker can supply arbitrary fields, override `active`, or inject unvalidated properties into the bank account document.
  - *Expected*: Explicit Zod schema validation validating `bankName`, `accountNo` (regex for numeric account), `ifsc` (regex for Indian IFSC format), and `kind`.
- **Flow**: Hospital accountant adding a settlement bank account.
- **Root Cause / Logic**: Missing Zod validation middleware on `POST /api/recon/accounts`.
- **Affected Files**: `backend/src/routes/recon.js:33-42`
- **UI/Frontend Impact**: None directly, but could cause schema corruption.
- **Security/Data Risk**: **Medium**. Mass assignment vulnerability.
- **Steps to Reproduce**:
  1. Send `POST /api/recon/accounts` with `{ bankName: 'Bank', accountNo: '123', arbitraryField: 'malicious' }`.
  2. Inspect database document; extra fields are saved.
- **Suggested Fix / Implementation Plan**:
  1. Define `createBankAccountSchema` in `backend/src/utils/validate.js`.
  2. Attach `validate(createBankAccountSchema)` middleware to `POST /accounts`.
- **Priority**: Medium
- **Phase**: Phase 1
- **TODOs**:
  - [x] Add `createBankAccountSchema` in validation utilities.
  - [x] Attach validator in `backend/src/routes/recon.js`.
