# Payments & Billing — Missing Features & Capabilities

## [PAY-MISSING-01] UPI AutoPay & e-Mandate Recurring Billing Execution Engine
- **Description**: While `Membership.js` defines `mandateRef` and `autoRenew: true`, the API routes for initiating, authorizing, and executing recurring UPI AutoPay mandates via Razorpay Subscriptions / NPCI e-Mandate are missing.
- **Current vs Expected Behavior**:
  - *Current*: Memberships must be manually re-purchased each month by the patient; auto-renewal cannot execute recurring charges.
  - *Expected*: Complete lifecycle for recurring subscriptions:
    1. `POST /api/memberships/mandate/create` (initiate mandate with max debit amount).
    2. Webhook listener for `subscription.charged` / `mandate.authenticated`.
    3. Automated renewal cron runner executing billing 24 hours prior to term expiry.
- **Flow**: Chronic care patient subscribing to monthly medicine delivery, dialysis package, or fitness membership.
- **Root Cause / Logic**: Razorpay Subscriptions integration was postponed during initial checkout design.
- **Affected Files**: `backend/src/routes/memberships.js`, `backend/src/services/paymentSettlement.js`, `backend/src/routes/webhook.js`
- **UI/Frontend Impact**: Membership checkout needs UPI AutoPay authorization flow (Google Pay / PhonePe mandate consent screen).
- **Security/Data Risk**: **Medium**. Incomplete recurring payment logic can lead to unauthorized charge attempts if mandate cancellation is not synchronized with NPCI.
- **Suggested Fix / Implementation Plan**:
  1. Add Razorpay Subscriptions API wrapper in `backend/src/services/paymentSettlement.js`.
  2. Implement `POST /api/memberships/:id/mandate` endpoint.
  3. Wire `subscription.charged` webhook in `webhook.js` to automatically extend membership `endAt`.
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Implement Razorpay recurring mandate creation.
  - [ ] Add webhook handler for recurring subscription settlement.
  - [ ] Write integration test for auto-renewal lifecycle.

---

## [PAY-MISSING-02] Automated GSTIN e-Invoicing (IRN & Signed QR Code) B2B Dispatch
- **Description**: While `einvoiceService.js` contains stubs, FindMedi does not have live integration with the Indian GST E-Invoice Portal (NIC / ClearTax / Cygnet) for generating official Invoice Reference Numbers (IRN) and digitally signed QR codes for corporate B2B hospital billing > ₹50,000.
- **Current vs Expected Behavior**:
  - *Current*: Standard internal PDF invoices are generated with plain GSTIN breakdown, but without government-issued IRN or cryptographic QR code required under Indian GST law for B2B supplies.
  - *Expected*: B2B hospital billing transactions automatically dispatch an e-invoice generation request to NIC API, retrieve the 64-character IRN + signed QR payload, and embed it into the generated invoice PDF.
- **Flow**: Hospital billing insurance TPAs, corporate employer packages, medical equipment rentals.
- **Root Cause / Logic**: Statutory compliance service was developed with mock response fallbacks.
- **Affected Files**: `backend/src/services/einvoiceService.js`, `backend/src/routes/billing.js`, `backend/src/services/billPdfService.js`
- **UI/Frontend Impact**: Corporate invoice print displays the NIC-mandated e-invoice QR code.
- **Security/Data Risk**: **Medium**. Non-compliance with Section 48(4) of CGST Rules can attract statutory penalties and disallowance of input tax credit (ITC) for B2B clients.
- **Suggested Fix / Implementation Plan**:
  1. Add authentic GSP (GST Suvidha Provider) credentials config in `backend/src/config/envValidator.js`.
  2. Implement IRN generation and signature parsing in `einvoiceService.js`.
  3. Render 2D barcode in `billPdfService.js`.
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Integrate GSP e-invoice API in `einvoiceService.js`.
  - [ ] Add IRN validation tests.
