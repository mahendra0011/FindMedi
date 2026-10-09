# 09. Data Models & API Spec (naye / badle hue)

Convention: Mongoose, har model me `hospitalId`, `facilityId`, `createdBy`, `updatedBy`, timestamps, soft-delete (`isDeleted`), index `{hospitalId, createdAt}`.

## 9.1 Core linking (sabse pehle, P0)

### Encounter [NEW]
```js
Encounter {
  encounterNo: String (unique, e.g. ENC-2026-000123),
  type: 'OPD'|'IPD'|'ER'|'TELE'|'HOME'|'DAYCARE',
  patientId: ref User, uhid: String,
  appointmentId, admissionId, emergencyId,   // origin
  departmentId, primaryDoctorId,
  payerType: 'cash'|'insurance'|'corporate'|'govt',
  payerRef: { insurerId, policyId, corporateId, scheme },
  status: 'Open'|'Closed'|'Cancelled',
  openedAt, closedAt, isMLC: Boolean
}
```
Existing models me add: `encounterId` in Prescription, LabOrder, Radiology, PharmacyOrder, Billing, DietOrder, Referral, Record.
Migration script: `scripts/backfill-encounters.mjs` (appointmentId/admissionId se).

### ChargeItem [NEW]
```js
ChargeItem {
  encounterId, admissionId, patientId,
  source: 'consult'|'lab'|'radiology'|'pharmacy'|'ot'|'bed'|'nursing'|'procedure'|'consumable'|'package'|'other',
  sourceRef: { model, id },               // LabOrder/_id etc
  serviceCode, description, qty, unitPrice, discount, taxRate, taxAmount, amount,
  status: 'Pending'|'Billed'|'Cancelled'|'Waived',
  billId: ref Billing, postedAt, postedBy, performedBy
}
```
Rule: koi bhi order create hone par ChargeItem auto-post (service layer, outbox event `order.created`). Final bill = ChargeItems ka roll-up.

### Billing (modify)
Add: `encounterId`, `billType: 'Interim'|'Final'|'Pharmacy'|'Package'`, `payerSplit: {patient, insurer, corporate}`, `deposits[]`, `creditNotes[]`, `counterId`, `shiftId`, `invoiceSeries`, `gstin`, `hsn` per line, `cancelledBy/Reason`.

## 9.2 IPD (P0)

```js
IpdDeposit { admissionId, patientId, type:'Receive'|'Adjust'|'Refund', amount, mode, receiptNo, counterId, shiftId }

BedTransfer { admissionId, fromBedId, toBedId, fromWard, toWard, reason, orderedBy, effectiveAt, tariffChange }

RoomTariff { hospitalId, roomType:'General'|'SemiPrivate'|'Private'|'Deluxe'|'ICU'|'NICU'|'HDU'|'Isolation',
             bedPerDay, nursingPerDay, rmoPerDay, doctorVisitPerDay, effectiveFrom, effectiveTo, payerClass }

DischargeWorkflow {
  admissionId, state:'Initiated'|'DoctorApproved'|'NursingClear'|'PharmacyClear'|'BillingClear'|'Discharged'|'Cancelled',
  type:'Normal'|'LAMA'|'DAMA'|'Referred'|'Absconded'|'Death',
  approvals: [{ stage, by, at, remarks }],
  summary: { diagnosis[], procedures[], course, investigations, conditionAtDischarge,
             medicines[{drug,dose,route,freq,days}], advice, followUp:{date,dept}, redFlags },
  finalBillId, summaryPdfUrl, abdmPushed: Boolean
}

WardRound { admissionId, doctorId, roundAt, soap:{s,o,a,p}, orders[] }
ShiftHandover { wardId, shift, fromNurse, toNurse, sbar:[{admissionId,s,b,a,r}], ackAt }
ConsentForm { encounterId, templateId, language, content, signedBy:{patient|guardian}, witness, signatureImg, signedAt, revokedAt }
```

### IPD endpoints
```
POST   /api/ipd/admissions/:id/transfer
POST   /api/ipd/admissions/:id/deposits           GET list, POST receive/refund
GET    /api/ipd/admissions/:id/running-bill
POST   /api/ipd/admissions/:id/discharge/initiate
PUT    /api/ipd/admissions/:id/discharge/approve  (doctor)
PUT    /api/ipd/admissions/:id/discharge/clear/:stage   (nursing|pharmacy|billing)
POST   /api/ipd/admissions/:id/discharge/finalize (creates final bill, frees bed, triggers housekeeping task, sends summary)
POST   /api/ipd/admissions/:id/rounds
POST   /api/ipd/admissions/:id/doctor-notes        (allow doctor role; FIX F10)
```
Server-side invariants: discharge finalize **fails** if balance > 0 unless approved waiver/credit; bed set to `Cleaning`; housekeeping task auto-created; idempotent.

## 9.3 Orders (P0)

```js
Order { encounterId, patientId, orderedBy, kind:'lab'|'radiology'|'medication'|'diet'|'nursing'|'procedure'|'consult',
        items[], priority:'Routine'|'Urgent'|'STAT', status:'Ordered'|'Ack'|'InProgress'|'Resulted'|'Reviewed'|'Cancelled',
        prescriptionId, linkedDocs:{ labOrderId, pharmacyOrderId, radiologyId }, reviewedBy, reviewedAt }
```
Prescription save → optionally "Send to lab/pharmacy" creates LabOrder/PharmacyOrder with `prescriptionId`, `encounterId` ref. Add `prescriptionId` + `encounterId` to `LabOrder`, `PharmacyOrder`, `Radiology`.

## 9.4 Front desk & queue (P0)

```js
Token { hospitalId, doctorId, deptId, date, number, patientId, appointmentId, priority, status:'Waiting'|'Called'|'InConsult'|'Done'|'NoShow'|'Skipped',
        calledAt, startedAt, completedAt, counter }
VisitorPass { patientId, admissionId, visitorName, phone, idType, idLast4, photoUrl, relation, validFrom, validTo, status, issuedBy }
Enquiry { callerName, phone, type, notes, followUpAt, assignedTo, status }
```
Endpoints: `POST /tokens/:id/call`, `GET /display/queue?doctorId=` (public read-only, token-scoped), websocket `queue:update`.

## 9.5 Finance (P1)

```js
CashCounter { hospitalId, name, location }
CashShift { counterId, cashierId, openedAt, openingFloat, closedAt, expected, counted, variance, denominations{}, status }
CreditNote { billId, amount, reason, approvedBy, issuedAt, series }
ServicePrice { code, name, deptId, category, hsn, gstRate, prices:[{payerClass, roomType, amount, from, to}], active }
DiscountPolicy { role, maxPercent, requiresReason, approverRole }
Expense { date, category, costCenter, vendorId, amount, tax, mode, attachments[], approvedBy }
LedgerEntry { date, accountId, debit, credit, refModel, refId, narration }
PayoutStatement { doctorId, period, lines[], gross, tds, net, status }
```

## 9.6 Insurance (P0/P1)
```js
Insurer { name, type:'Insurer'|'TPA'|'Govt', contact, empanelmentNo, rateCardId, docChecklist[] }
PreAuthRequest { admissionId, insurerId, policyId, estimate, diagnosis, plannedProcedure, status, queries[{by,text,at,attachments}], approvedAmount, validTill, enhancements[] }
Claim { admissionId, preAuthId, billId, documents[], submittedAt, status, queries[], settledAmount, utr, tds, shortSettlement:[{reason,amount}], appealOf }
```
(Insurance model existing fields ko in me migrate ya extend karo.)

## 9.7 Inventory/CSSD/Assets (P1)
```js
Store { name, type:'Central'|'Pharmacy'|'OT'|'Ward'|'Lab', parentStoreId }
Indent { fromStore, toStore, items[], status, issuedBy, receivedBy }
GRN { poId, supplierId, invoiceNo, items[{item,batch,expiry,qty,rate,mrp,gst}], qcStatus, receivedBy }
StockLedger { storeId, itemId, batch, qtyIn, qtyOut, balance, refModel, refId }
InstrumentSet { code, name, items[{instrument,qty}] }
SterilisationCycle { machineId, cycleNo, method, loadItems[setId], parameters, biologicalIndicator, chemicalIndicator, result, operator }
AssetMaintenance { assetId, type:'PM'|'Breakdown'|'Calibration', dueOn, doneOn, vendor, cost, notes }
```

## 9.8 HR (P1)
```js
Roster { month, wardId|deptId, entries:[{staffId, date, shift, onCall}], status:'Draft'|'Published' }
ShiftSwap { fromStaff, toStaff, date, shift, status, approvedBy }
Credential { staffId, type:'NMC'|'StateCouncil'|'NursingCouncil'|'BLS'|'ACLS'|..., number, validTill, docUrl, privileges[] }
Payslip { staffId, month, earnings[], deductions[], net, generatedAt, pdfUrl }
```

## 9.9 Quality & compliance (P1)
```js
Incident { type, severity, location, reportedBy, involved, description, immediateAction, rca, capa[], status, closedAt }
BmwLog { date, wardId, yellowKg, redKg, whiteKg, blueKg, handedTo, manifestNo }
MlcCase { encounterId, mlcNo, policeStation, intimationAt, injuryType, history, opinion, sealedExhibits[] }
DeathRecord { encounterId, timeOfDeath, causeIcd10, certifiedBy, mortuaryTagNo, releasedTo, releasedAt, certificateNo }
BirthRecord { motherId, babyId, weight, sex, timeOfBirth, deliveryType, certificateNo }
AdrReport { patientId, drug, reaction, severity, outcome, causality, reportedToPvPI }
DashboardAlert { type, severity, entityRef, status, ackedBy, ackedAt, snoozeUntil }
```

## 9.10 API standards
- Versioned `/api/v1`, zod validation, pagination `{page,limit,cursor}`, filters, sort.
- Idempotency-Key header for payments/discharge/POST charge.
- Error format `{code, message, details, requestId}`; UI me raw backend message nahi dikhana (userFacingError pattern already hai).
- OpenAPI spec auto-generate (`lib/openapi.js` exists), contract tests (backend/test/contract).
- Events via outbox: `order.created`, `result.ready`, `bill.posted`, `discharge.finalized`, `bed.status.changed`, `alert.raised`.
