# 05. Front Office, Billing, Insurance & Finance

## 5.1 Reception / Front Desk (P0)
**Role**: `receptionist` (enum me add; F7). Dashboard: `/frontdesk`.
- Quick patient search (UHID / phone / ABHA / name), duplicate detection, merge-patient tool (with audit).
- Registration form: demographics, photo, ID proof (Aadhaar masked, PAN etc.), next of kin, payer type, ABHA create/link, consent for data use.
- Appointment desk: book/reschedule/cancel, doctor-wise slots, walk-in token, priority, no-show tracking, overbooking rules.
- Check-in/out, registration fee/receipt, card/wristband print (QR/barcode UHID).
- Enquiry & call log (doctor availability, price, bed), complaint log.
- Visitor management (P1): visitor pass (IPD patient, attendant), time window, blacklist, photo, gate log.
- **Queue display screen** (TV mode): `/display/queue/:doctorId|:departmentId` (token now serving, next 5, language switch, voice call-out).
- Courier/dispatch of reports, report counter (hand-over with signature/OTP).

## 5.2 Tariff & Price Master (P0)
- `ServicePrice` master: service code, name, department, category (consult/procedure/investigation/bed/package), price by **payer class** (cash/insurance/corporate/govt scheme), by **room type**, effective-from/to, HSN/SAC, GST rate.
- Doctor fee master (first visit/follow-up/emergency/tele), surgeon fee splits (surgeon/assistant/anaesthetist/OT/consumables).
- Package master (HealthPackage exists, extend to surgical/maternity packages with inclusions/exclusions, LOS cap, overage rules).
- Version history of price changes; approval for changes.

## 5.3 Billing (P0)
- **Unified patient account** (encounter/admission ledger): all charges (consult, lab, rad, pharmacy, OT, bed, nursing, consumables) accrue as `ChargeItem`; interim bills + final bill.
- Interim billing every N days, bill-on-demand, running-bill alert when deposit < X%.
- **IPD deposit/advance** ledger (receive, adjust, refund, transfer).
- Discounts with **authority matrix** (≤5% receptionist, ≤15% manager, >15% director) + reason code + audit.
- Concession for BPL/staff/senior/ex-serviceman categories.
- Refund workflow (Refund model exists): request → approve → pay-out → ledger.
- Bill cancellation/edit with approval, **credit note / debit note** (none exist).
- Split payment (cash+UPI+card), part payment, payment links, EMI (optional), **Razorpay/Cashfree integration** (stub today).
- Receipts: GST-compliant invoice, HSN, e-invoice (large hospitals), receipt series per counter/year, duplicate print watermark.
- **Cash counter**: open/close shift, denomination count, variance report, handover to accounts, deposit-to-bank entry.
- Billing for **medico-legal / free-of-cost** cases and govt schemes (Ayushman Bharat PM-JAY, CGHS, ECHS, state schemes).

## 5.4 Insurance / TPA Desk (P0)
Existing: Insurance (claimId, tpaName, preAuthStatus/Attempts, claimStatus), roles `tpa_agent`, `medical_reviewer`.
Add:
- Insurer/TPA master, **empanelment & rate agreements**, policy verification (card scan, eligibility), cashless limit.
- Pre-auth form per insurer (PDF), document checklist (ID, policy, reports, estimate), query/response thread, enhancement requests, final authorization.
- Co-pay, deductible, non-payable items, room-rent proportionate deduction calculator.
- Claim file generator (discharge summary + itemised bill + reports bundle), submission tracking, settlement reconciliation (UTR, TDS, short-settlement reasons), rejection → appeal.
- TPA ageing dashboard; claim TAT; rejection analytics.
- PM-JAY/HBP package mapping, e-claim.

## 5.5 Accounts & Finance (P1)
- Chart of accounts, journal entries, day-book, cash/bank book, ledger, trial balance, P&L, balance sheet (export to Tally/Zoho Books if full ERP out of scope).
- Revenue recognition by department; **doctor payout** (consultant share, visit-based, % of revenue; CommissionConfig/Payout exist) with TDS (194J), statements, payment batches.
- Accounts payable: vendor bills (PO → GRN → invoice 3-way match), payment schedule, TDS, debit notes to vendors.
- Accounts receivable: corporate/TPA ageing, reminders, write-off approval.
- Expense management (petty cash, utilities, AMC), budget vs actual, cost-center per department.
- Bank reconciliation; payment gateway settlement reconciliation.
- GST returns data (GSTR-1/3B export), audit-trail.
- Role: `finance_admin`, `accountant` exist; add approval chains.

## 5.6 Patient Communication (P1)
- WhatsApp/SMS/Email templates (DLT-registered in India): appointment confirm/reminder, token call, report ready, bill, discharge, follow-up, feedback request, vaccination due.
- Notification infra exists (NotificationTemplate/Delivery/Preference): connect a real provider and add template approval + delivery tracking.
- Two-way chat for non-clinical queries; IVR/missed-call appointment (optional).

## 5.7 Patient Feedback & Grievance (P1)
- NPS/CSAT survey after OPD/discharge, department-wise ratings, complaint ticketing with SLA (SupportTicket exists), suggestion box, service-recovery workflow, public vs private reviews. Link to NABH patient-rights.

## 5.8 CRM / Marketing (P2)
- Lead model exists. Add camp management (health camps, screening), referral doctors' tracking (**referral fee policy: compliance risk, handle with legal guidance**), campaigns, package promotion, patient recall lists (diabetics due for HbA1c).
