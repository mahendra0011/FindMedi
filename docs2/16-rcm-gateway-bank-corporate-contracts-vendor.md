# 16. Revenue Cycle, Payment Gateway Layer, Bank Reconciliation, Corporate, Contracts & Vendors (NEW)

Already covered in 00-12 (skip): billing basics, IPD deposit, cash counter shifts, credit notes, TPA desk, doctor payout, accounts overview (file 05), PO/GRN/3-way match (file 06 §6.2), ChargeItem (file 09).
Is file me wo hain jo ya to **missing the** ya file 05/06 me sirf **ek line** the aur design nahi tha.

Repo check: `rcm|revenueCycle|chargeCapture` = 0; `Payment`, `Refund`, `TransactionLedger`, `Supplier`, `PurchaseOrder`, `License` models hain; payment provider **stub** (`DEFERRED_TODOS.md` #1); `Equipment/AssetUnit` me **AMC/warranty/calibration fields nahi** (grep = none).

---

## 16.1 Revenue Cycle Management (RCM) tracker

**Idea:** `Patient -> Service -> Order -> Delivery -> Charge -> Bill -> Payment -> Claim -> Settlement -> Accounting`: har stage me paisa "leak" ho sakta hai; RCM har stage ka status aur dollar-value track karta hai.

### Logic: leakage detectors (rules in file 13.3)
| Stage gap | Detector | Action |
|---|---|---|
| Order -> Delivery | order Resulted/Dispensed but **no ChargeItem** | auto-post / alert billing |
| Delivery -> Bill | ChargeItems `Pending` > 24h (OPD) / not in running bill (IPD) | task to billing |
| Bill -> Payment | balance > 0 and age buckets | reminders, hold discharge |
| Bill -> Claim | insured bill not submitted within X days | TPA task |
| Claim -> Settlement | settled < approved (short pay) / aging > 30/60/90 | appeal workflow |
| Settlement -> Ledger | UTR received not posted | reconciliation queue |
| Package overrun | actual > package cap | doctor/finance review |
| Free/waived | waivers w/o approval | audit |
### Metrics (computed nightly)
`Charge capture rate = billed charges / (delivered services × tariff)`, `Days in A/R`, `Clean-claim rate`, `Denial rate`, `Net collection %`, `Revenue leakage ₹` (sum of detector hits), `Discharge-to-bill time`.
### Data model
```js
RcmEvent { encounterId, stage:'Ordered'|'Delivered'|'Charged'|'Billed'|'Paid'|'ClaimSubmitted'|'ClaimSettled'|'Posted', amount, refModel, refId, at }
RcmGap { type, encounterId, amountAtRisk, detectedAt, status:'Open'|'Assigned'|'Recovered'|'WrittenOff', assignedTo, note }
DailyRcmMetric { date, hospitalId, chargeCaptureRate, daysInAR, denialRate, netCollectionPct, leakageAmount }
```
### API
`GET /api/rcm/pipeline?from&to` (funnel by stage with amounts), `GET /api/rcm/gaps?status=`, `POST /api/rcm/gaps/:id/assign|resolve`, `GET /api/rcm/metrics`.
### UI design
- **Funnel/Sankey-lite**: horizontal stage bars with amount + count and drop-off %, click -> gap list. Table of gaps with `₹ at risk` sorted desc, assign inline, aging chips.
- Library: existing `recharts` (bar/funnel via stacked bars); Sankey from `recharts` is available but keep simple.
### Animation
Stage bars grow from 0 on first load (framer-motion `scaleX` 400ms stagger 60ms); numbers via count-up (file 19 `useCountUp`). Only on first paint; refreshes tween values without replay.

---

## 16.2 Payment Gateway Abstraction Layer

Goal: Razorpay / Cashfree / PayU / PhonePe ko change karne par billing code na badle (stub abhi 503 deta hai).

### Logic
```
BillingService -> PaymentService -> GatewayRegistry.get(hospital.gateway) -> Adapter (Razorpay | Cashfree | PayU | PhonePe | Mock)
```
- **Adapter interface:** `createOrder(amount,currency,ref,meta)`, `createPaymentLink(...)`, `createQr(...)`, `verifyWebhook(headers,rawBody)`, `parseWebhook()->NormalizedEvent`, `capture(...)`, `refund(paymentId, amount, reason)`, `getPayment(id)`, `getSettlement(range)`, `fees(payment)`.
- **Normalised events:** `payment.authorized|captured|failed`, `refund.processed|failed`, `settlement.processed`, `dispute.opened`.
- **Idempotency:** `Idempotency-Key` per bill attempt; webhook dedupe by `(provider, eventId)` (unique index); **signature verification on raw body**; replay window; return 2xx fast, process in BullMQ job.
- **State machine:** `Created -> Pending -> Captured -> (PartiallyRefunded|Refunded)`, `Failed`, `Expired`; **bill never marked paid from client redirect** - only from verified webhook or server-side `getPayment` poll (reconcile job for missed webhooks every 5 min).
- **Amounts in paise (integers)**, currency fixed INR, rounding rules documented; GST on gateway fee tracked as expense.
- **Split/partial/multi-mode:** a bill can have many `Payment` rows (cash + UPI + card); partial refund by line or amount, linked to refund approval (13.2).
- **Per-hospital credentials** encrypted (KMS/field encryption), test/live mode flag, health-check, circuit breaker + provider fallback (optional).
- **POS/Card machine:** manual-entry flow (approval code, last4, RRN) now; later vendor SDK/integration.
### Data model (extend `Payment`)
`provider, providerOrderId, providerPaymentId, method:'upi'|'card'|'netbanking'|'wallet'|'cash'|'cheque'|'neft', status, amountPaise, feePaise, taxOnFeePaise, settlementId, utr, webhookEventIds[], idempotencyKey, billId, counterId, shiftId, meta`.
### Libraries
Official SDKs (`razorpay` npm, Cashfree PG SDK) wrapped inside adapters only; `crypto.timingSafeEqual` for signatures; `bullmq`; `zod` for normalised payloads; contract tests with recorded webhook fixtures.
### UI design
Payment drawer on bill: amount, **method tabs** (UPI QR | Card | Link | Cash | Cheque | Split), live status chip (`Waiting for payment...` with countdown & polling/WebSocket) and **QR with expiry ring**; receipt auto-opens on success. Failure shows reason + `Retry / Another method`.
### Animation
QR expiry: circular stroke countdown (SVG). Success: green check path-draw + amount settle (count-up) + subtle confetti **not used** (clinical/financial: keep sober). Pending: skeleton shimmer 1.5s.
### Tests
Webhook duplicates/out-of-order, missed webhook recovery, partial refund math, signature tamper, concurrent payment attempts on same bill, reconciliation vs gateway settlement.

---

## 16.3 Bank Reconciliation

(File 05 §5.5 me sirf naam tha.)
### Logic
- **Inputs:** bank statement (CSV/XLSX/MT940), gateway settlement reports, cash deposit slips. Normalise to `BankTxn {date, valueDate, narration, ref/UTR, debit, credit, balance, accountId}`.
- **Auto-match engine** (ordered passes): (1) exact `UTR/RRN` -> payment/settlement; (2) gateway settlement id + net amount (amount − fee − GST); (3) amount + date window ±3 days + counterparty fuzzy; (4) **many-to-one** (one settlement credit = sum of many payments) via subset-sum bounded search with tolerance ₹1; (5) cash deposits = sum of `CashShift` handovers.
- Statuses: `Matched | Suggested(score) | Unmatched | Excluded`; user can **split/merge/adjust** (bank charge, TDS, short settlement) creating ledger entries.
- **Rules**: learned mappings (narration contains "NEFT-APOLLO TPA" => Insurer X receivable), saved per hospital.
- Period close: lock reconciled period; **variance report**; audit trail on every manual match.
### Data model
`BankAccount, BankStatementImport {fileHash,period,rows}, BankTxn, ReconMatch {bankTxnIds[], targetRefs[], type, score, by, at}, ReconRule`
### API
`POST /api/recon/imports` (dedupe by file hash), `POST /api/recon/auto-match`, `GET /api/recon/unmatched`, `POST /api/recon/match`, `POST /api/recon/close-period`.
### Libraries
`exceljs`(installed) / `papaparse` for CSV, `date-fns`, `fastest-levenshtein` or `fuse.js` for narration fuzzy; heavy match in BullMQ worker.
### UI design
```
| Bank statement (left)                | Books/Payments (right)               |
| 14 Oct  UTR123  +₹48,250  [Matched ✓]| Settlement S-882 (14 pay) ₹48,250    |
| 14 Oct  NEFT..  +₹1,20,000 [Suggest ]| Claim C-1042 TPA Medi ₹1,22,500 (-TDS)|
| 15 Oct  CHG     −₹354     [Unmatched ]| [Create expense: bank charge]        |
```
Two-pane with synchronous scroll, drag a left row onto a right row (dnd-kit) to match, confidence badge, keyboard `M` match, `S` split. Totals bar: matched %, unmatched ₹.
### Animation
Matched row: green flash 400ms then collapse into "Matched" group; drag-over target highlight ring. No heavy motion (accountant works long hours).

---

## 16.4 Corporate & Empanelment (credit billing)

File 05 covered insurers/TPA; **corporate (employer) credit billing** missing.
### Logic
- `Corporate {name, gstin, contact, creditLimit, creditDays, rateCardId, discountPct, billingCycle:'perVisit'|'weekly'|'monthly', agreementFrom/To, authorizedSignatory, status}`; `CorporateEmployee {corporateId, empId, patientId, relation (self/dependent), validTill, limits}`.
- **Eligibility at registration:** scan employee ID/letter -> `eligible? (agreement active, employee valid, limit available)`; **Guarantee Letter (GL)** upload with amount cap; bills post to corporate account; patient pays only non-covered.
- **Rate resolution order:** package > corporate rate card > payer-class tariff > default (see file 05 `ServicePrice`).
- **Credit control:** block new credit billing when `outstanding + new > creditLimit` or overdue > N days (override needs approval 13.2).
- **Statements:** consolidated invoice per cycle (GST invoice), annexure with patient-wise bills, e-mail PDF + Excel; **A/R ageing**, reminders, payment allocation (receipt against multiple invoices), TDS handling, disputes.
### UI
Corporate profile page (limits gauge, ageing bar), "Pending GL" list, statement generator wizard (select period -> preview -> send). Library: `exceljs`, template engine 14.2.
### Animation
Credit-limit gauge: radial progress animates to value 600ms, turns warning >80%, destructive >100%.

---

## 16.5 Contract Management (AMC/CMC, vendor, doctor, TPA, corporate, rate contracts)

Repo: `License` + `LicenseExpiryReminder` (regulatory licences only). **Equipment/AssetUnit lack** `warranty`, `amc`, `cmc`, `calibrationDue`, `serviceVendor` (verified). Add:
### Logic
- `Contract {type:'AMC'|'CMC'|'Vendor'|'Doctor'|'TPA'|'Corporate'|'Lease'|'Service', partyRef, title, startDate, endDate, autoRenew, noticeDays, value, paymentTerms, coverage (assets[]/services[]), slaTerms, documents[], status:'Draft'|'Active'|'Expiring'|'Expired'|'Terminated', owner, approvals}`.
- **Expiry engine:** alerts at 90/60/30/7 days (rule engine 13.3), renewal task, **renewal workflow** (draft v2 -> approval -> sign), spend vs contract value, **SLA breach log** (e.g. AMC response time vs breakdown ticket times).
- **Link:** assets <-> AMC; PO rate <-> rate contract (price validation at PO time: warn if > contracted rate); doctor contract <-> payout rules; TPA contract <-> rate card.
- Extend `Equipment/AssetUnit`: `warrantyEnd, amcContractId, nextPmDue, nextCalibrationDue, criticality:'A'|'B'|'C'`.
### UI
Contracts calendar + table (status pills), timeline bar showing term with "today" marker, document vault tab, linked assets chips. Expiring list on dashboard (file 02 widget).
### Animation
Term bar fills to today's position on open (400ms). Expiring chip subtle amber pulse **3 cycles max**.

---

## 16.6 Vendor Management

File 06 had "vendor rating, RFQ" lines only; `Supplier` model exists.
### Logic
- **Onboarding/KYC:** GSTIN (**format + checksum validation** locally; optional GSP API verify), PAN regex, bank (IFSC lookup + penny-drop optional), MSME flag, documents (drug licence, ISO, agreements) with **expiry tracking**; approval workflow; blacklist/hold.
- **Categories & items supplied**, payment terms, price list/rate contracts (16.5), TDS section default.
- **Performance score (0-100)** = `OnTime% × 30 + QualityAcceptance% × 30 + PriceCompetitiveness × 20 + ResponseTime × 10 + DocCompliance × 10` (weights configurable); computed monthly from PO/GRN/return data; tiers A/B/C; auto-flag drop.
- **Payables view:** outstanding, due this week, advance paid, disputes; payment run proposal (select invoices -> batch -> approval -> bank file).
### Data model
`Supplier` (extend: gstin, pan, bank{}, msme, docs[{type,url,expiry}], category[], paymentTerms, tdsSection, status, rating) + `VendorScorecard {supplierId, month, onTimePct, acceptPct, priceIdx, responseHrs, docPct, score}`.
### UI
Vendor 360 page: header (score ring + tier badge), tabs (Overview | Items & Rates | POs | GRNs/Returns | Invoices & Payments | Documents | Performance trend sparkline). Library: `recharts`.
### Animation
Score ring draws to value (700ms ease-out); sparkline path draw 500ms; tab content crossfade 120ms.
