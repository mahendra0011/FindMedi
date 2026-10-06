# Data Dictionary (generated)

> **Generated file — do not edit by hand.** Regenerate with
> `npm run docs:dictionary` (from `backend/`). The generator reads the
> mongoose schemas directly, so this table cannot drift from the code —
> `test/unit/dataDictionary.spec.js` fails if it does.
>
> PII classification is field-name driven and conservative (see legend).
> Organization/catalog records (facility lists, drug catalogs…) are not
> personal data and classify as operational config.
> Retention classes come from [`docs/privacy/RETENTION.md`](privacy/RETENTION.md);
> collections with PII but no class are listed as gaps rather than guessed at.

## Summary

- **116 models** across 115 files (0 skipped)
- **3227 schema fields**, of which **465 classified as PII** in **84 collections**
- **6 collections** carry a TTL index
- **17 collections** hold PII but map to no retention class in RETENTION.md (gaps below)

### PII categories

| Category | Collections containing it |
|---|---|
| Credential | 3 |
| Government ID | 1 |
| Contact | 22 |
| Financial | 7 |
| Health | 18 |
| Demographic | 12 |
| Location | 16 |
| Image/Biometric | 3 |
| Device/Network | 5 |
| Identifier | 74 |
| Identity | 41 |

## Collections

| Collection | Model | Fields | PII fields | Indexes | TTL | Retention class |
|---|---|---|---|---|---|---|
| `admissions` | Admission | 95 | 22 | 2 | — | Clinical records |
| `aisafetyevents` | AiSafetyEvent | 12 | 1 | 2 | — | **UNMAPPED — see gaps** |
| `ambulances` | Ambulance | 35 | 5 | 8 | — | Ride and SOS location traces |
| `ambulancesetupcodes` | AmbulanceSetupCode | 9 | 2 | 3 | 0s | OTP / setup codes / tokens |
| `announcements` | Announcement | 9 | 0 | 1 | — | Operational config (organization/catalog record — not personal data) |
| `appointments` | Appointment | 78 | 10 | 12 | — | Clinical records |
| `appointmentseries` | AppointmentSeries | 24 | 4 | 3 | — | **UNMAPPED — see gaps** |
| `assistantbookings` | AssistantBooking | 82 | 15 | 11 | — | Clinical records |
| `assistantprofiles` | AssistantProfile | 73 | 13 | 13 | — | Provider KYC documents |
| `auditlogs` | AuditLog | 9 | 3 | 3 | 31536000s | Audit logs |
| `beds` | Bed | 15 | 0 | 2 | — | No PII fields detected |
| `billings` | Billing | 38 | 3 | 3 | — | Payment and ledger entries |
| `bloodrequests` | BloodRequest | 35 | 6 | 2 | — | Clinical records |
| `bloodunits` | BloodUnit | 24 | 1 | 2 | — | Clinical records |
| `calllogs` | CallLog | 16 | 0 | 5 | — | No PII fields detected |
| `categories` | Category | 10 | 0 | 1 | — | Operational config (organization/catalog record — not personal data) |
| `chatconversations` | ChatConversation | 37 | 4 | 4 | — | **UNMAPPED — see gaps** |
| `chatmessages` | ChatMessage | 33 | 3 | 4 | 0s | **UNMAPPED — see gaps** |
| `chatprivacies` | ChatPrivacy | 61 | 1 | 1 | — | **UNMAPPED — see gaps** |
| `chatreports` | ChatReport | 13 | 1 | 6 | — | **UNMAPPED — see gaps** |
| `chroniccareplans` | ChronicCarePlan | 22 | 4 | 2 | — | Clinical records |
| `cities` | City | 9 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `clinicprofiles` | ClinicProfile | 17 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `commissionconfigs` | CommissionConfig | 13 | 1 | 1 | — | Payment and ledger entries |
| `consentrecords` | ConsentRecord | 14 | 2 | 4 | — | ABDM consent records |
| `deletionrequests` | DeletionRequest | 27 | 1 | 2 | — | Audit logs |
| `deliverypartners` | DeliveryPartner | 44 | 16 | 3 | — | Provider KYC documents |
| `demopayments` | DemoPayment | 19 | 5 | 17 | — | Payment and ledger entries |
| `departments` | Department | 9 | 0 | 1 | — | Operational config (organization/catalog record — not personal data) |
| `dietorders` | DietOrder | 30 | 6 | 2 | — | Clinical records |
| `disputes` | Dispute | 17 | 1 | 3 | — | Payment and ledger entries |
| `doctors` | Doctor | 113 | 11 | 14 | — | Provider KYC documents |
| `emergencies` | Emergency | 19 | 7 | 1 | — | Ride and SOS location traces |
| `emergencydoctorrequests` | EmergencyDoctorRequest | 75 | 21 | 6 | — | Ride and SOS location traces |
| `emergencyrequests` | EmergencyRequest | 62 | 17 | 4 | — | Ride and SOS location traces |
| `equipment` | Equipment | 16 | 0 | 1 | — | Operational config (organization/catalog record — not personal data) |
| `facilities` | Facility | 75 | 0 | 8 | — | Operational config (organization/catalog record — not personal data) |
| `familymembers` | FamilyMember | 13 | 7 | 1 | — | Clinical records |
| `featuredlistings` | FeaturedListing | 11 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `healthpackages` | HealthPackage | 17 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `hospitals` | Hospital | 52 | 0 | 6 | — | Operational config (organization/catalog record — not personal data) |
| `housekeepings` | Housekeeping | 15 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `insurances` | Insurance | 42 | 5 | 2 | — | Payment and ledger entries |
| `integrationconfigs` | IntegrationConfig | 18 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `inventories` | Inventory | 23 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `labbookings` | LabBooking | 33 | 3 | 4 | — | Clinical records |
| `laborders` | LabOrder | 39 | 7 | 3 | — | Clinical records |
| `lawyerbookings` | LawyerBooking | 88 | 19 | 14 | — | **UNMAPPED — see gaps** |
| `lawyerprofiles` | LawyerProfile | 87 | 12 | 14 | — | Provider KYC documents |
| `leaverequests` | LeaveRequest | 15 | 2 | 1 | — | **UNMAPPED — see gaps** |
| `licenses` | License | 17 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `loginevents` | LoginEvent | 10 | 3 | 4 | 15552000s | Audit logs |
| `loyaltyearnrules` | LoyaltyEarnRule | 6 | 0 | 2 | — | No PII fields detected |
| `loyaltyledgers` | LoyaltyLedger | 9 | 1 | 4 | — | Payment and ledger entries |
| `medicinedoselogs` | MedicineDoseLog | 11 | 1 | 4 | — | Clinical records |
| `medicinereminders` | MedicineReminder | 20 | 2 | 1 | — | Clinical records |
| `medicines` | Medicine | 21 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `mentalhealths` | MentalHealth | 82 | 11 | 4 | — | Mental-health records |
| `notificationaudits` | NotificationAudit | 11 | 1 | 6 | — | Audit logs |
| `notificationdeliveries` | NotificationDelivery | 19 | 1 | 6 | — | Notifications |
| `notificationpreferences` | NotificationPreference | 14 | 2 | 1 | — | **UNMAPPED — see gaps** |
| `notifications` | Notification | 15 | 1 | 3 | — | Notifications |
| `nursingcharts` | NursingChart | 34 | 12 | 1 | — | Clinical records |
| `operationtheatres` | OperationTheatre | 52 | 7 | 2 | — | Clinical records |
| `otps` | OTP | 12 | 3 | 6 | 3600s | OTP / setup codes / tokens |
| `outboxevents` | OutboxEvent | 15 | 0 | 9 | — | No PII fields detected |
| `patientaddresses` | PatientAddress | 11 | 4 | 1 | — | Clinical records |
| `patients` | Patient | 36 | 10 | 7 | — | Clinical records |
| `payments` | Payment | 20 | 2 | 3 | — | Payment and ledger entries |
| `payouts` | Payout | 20 | 1 | 1 | — | Payment and ledger entries |
| `pharmacydeliveries` | PharmacyDelivery | 34 | 9 | 5 | — | Clinical records |
| `pharmacyoffers` | PharmacyOffer | 14 | 0 | 2 | — | No PII fields detected |
| `pharmacyorders` | PharmacyOrder | 39 | 4 | 5 | — | Clinical records |
| `pharmacyreturns` | PharmacyReturn | 18 | 2 | 2 | — | Clinical records |
| `pharmacystaffs` | PharmacyStaff | 13 | 3 | 1 | — | Provider KYC documents |
| `physiotherapies` | Physiotherapy | 34 | 6 | 2 | — | Clinical records |
| `platformcontents` | PlatformContent | 10 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `platformcouponredemptions` | PlatformCouponRedemption | 8 | 1 | 4 | — | Payment and ledger entries |
| `platformcoupons` | PlatformCoupon | 17 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `platformcouponuserusages` | PlatformCouponUserUsage | 6 | 1 | 1 | — | Payment and ledger entries |
| `preferredpharmacies` | PreferredPharmacy | 7 | 1 | 2 | — | **UNMAPPED — see gaps** |
| `prescriptions` | Prescription | 40 | 7 | 2 | — | Clinical records |
| `purchaseorders` | PurchaseOrder | 25 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `pushsubscriptions` | PushSubscription | 9 | 2 | 2 | — | **UNMAPPED — see gaps** |
| `radiologies` | Radiology | 25 | 5 | 2 | — | Clinical records |
| `records` | Record | 35 | 12 | 1 | — | Clinical records |
| `recordversions` | RecordVersion | 16 | 2 | 3 | — | Clinical records |
| `referrals` | Referral | 14 | 0 | 5 | — | No PII fields detected |
| `referralsettings` | ReferralSettings | 8 | 0 | 0 | — | No PII fields detected |
| `refreshtokens` | RefreshToken | 13 | 3 | 5 | 0s | OTP / setup codes / tokens |
| `refunds` | Refund | 16 | 1 | 5 | — | Payment and ledger entries |
| `reports` | Report | 15 | 1 | 2 | — | Clinical records |
| `reviews` | Review | 18 | 4 | 5 | — | **UNMAPPED — see gaps** |
| `rewardcatalogitems` | RewardCatalogItem | 15 | 0 | 2 | — | No PII fields detected |
| `rewardredemptions` | RewardRedemption | 11 | 1 | 4 | — | Payment and ledger entries |
| `ridebookings` | RideBooking | 72 | 13 | 9 | — | Ride and SOS location traces |
| `riderprofiles` | RiderProfile | 49 | 12 | 12 | — | Provider KYC documents |
| `ridetrackings` | RideTracking | 10 | 3 | 3 | — | Ride and SOS location traces |
| `savedfavorites` | SavedFavorite | 8 | 1 | 2 | — | **UNMAPPED — see gaps** |
| `schedulechangerequests` | ScheduleChangeRequest | 35 | 2 | 1 | — | **UNMAPPED — see gaps** |
| `servicecities` | ServiceCity | 8 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `sosvehiclesettings` | SOSVehicleSettings | 8 | 0 | 0 | — | No PII fields detected |
| `staffs` | Staff | 40 | 6 | 2 | — | Provider KYC documents |
| `suppliers` | Supplier | 18 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `supporttickets` | SupportTicket | 23 | 1 | 3 | — | **UNMAPPED — see gaps** |
| `systemsettings` | SystemSetting | 7 | 0 | 1 | — | Operational config (organization/catalog record — not personal data) |
| `tests` | Test | 39 | 0 | 1 | — | Operational config (organization/catalog record — not personal data) |
| `tokens` | Token | 24 | 4 | 3 | — | OTP / setup codes / tokens |
| `transactionledgers` | TransactionLedger | 20 | 4 | 9 | — | Payment and ledger entries |
| `triages` | Triage | 46 | 16 | 2 | — | Clinical records |
| `users` | User | 94 | 26 | 18 | — | **UNMAPPED — see gaps** |
| `vehicles` | Vehicle | 20 | 0 | 4 | — | Operational config (organization/catalog record — not personal data) |
| `vitalslogs` | VitalsLog | 23 | 3 | 6 | — | Clinical records |
| `vitalsreminders` | VitalsReminder | 13 | 1 | 1 | — | Clinical records |
| `waitlistentries` | WaitlistEntry | 17 | 4 | 4 | — | **UNMAPPED — see gaps** |
| `walletguards` | WalletGuard | 16 | 1 | 1 | — | Payment and ledger entries |

## Retention gaps (PII present, no class in RETENTION.md)

These collections hold personal data that the retention schedule does not
cover yet — each needs a decision, not a guess:

- `aisafetyevents`
- `appointmentseries`
- `chatconversations`
- `chatmessages`
- `chatprivacies`
- `chatreports`
- `lawyerbookings`
- `leaverequests`
- `notificationpreferences`
- `preferredpharmacies`
- `pushsubscriptions`
- `reviews`
- `savedfavorites`
- `schedulechangerequests`
- `supporttickets`
- `users`
- `waitlistentries`

## Detail by collection

### `admissions` — Admission

source `Admission.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Health, Identifier, Identity, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `admissionId` | String | yes | yes |  |  |  |  |
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `patientName` | String | yes |  |  |  |  | Identity |
| `bedId` | ObjectId |  |  |  |  | Bed |  |
| `bedNumber` | String |  |  |  |  |  |  |
| `ward` | String |  |  |  |  |  |  |
| `admittedBy` | ObjectId | yes |  |  |  | User |  |
| `admittingDoctor` | String | yes |  |  |  |  |  |
| `primaryDiagnosis` | String |  |  |  |  |  |  |
| `source` | String |  |  | "OPD" | OPD, Emergency, Direct, Referral |  |  |
| `status` | String |  |  | "Admitted" | Admitted, Transferred, Discharged, DOD |  |  |
| `attendantName` | String |  |  |  |  |  |  |
| `attendantPhone` | String |  |  |  |  |  |  |
| `estimatedStay` | Number |  |  |  |  |  |  |
| `admissionNotes` | String |  |  |  |  |  |  |
| `vitals` | Array<subdocument> |  |  |  |  |  | Health |
| `vitals.date` | Date |  |  | [function] |  |  | Health |
| `vitals.shift` | String |  |  |  | Morning, Evening, Night |  | Health |
| `vitals.bp` | String |  |  |  |  |  | Health |
| `vitals.pulse` | Number |  |  |  |  |  | Health |
| `vitals.temperature` | Number |  |  |  |  |  | Health |
| `vitals.spo2` | Number |  |  |  |  |  | Health |
| `vitals.bloodSugar` | Number |  |  |  |  |  | Health |
| `vitals.weight` | Number |  |  |  |  |  | Health |
| `vitals.recordedBy` | String |  |  |  |  |  | Health |
| `mar` | Array<subdocument> |  |  |  |  |  |  |
| `mar.date` | Date |  |  | [function] |  |  |  |
| `mar.medicineName` | String | yes |  |  |  |  |  |
| `mar.dose` | String |  |  |  |  |  |  |
| `mar.route` | String |  |  |  | Oral, IV, IM, SC, Topical, Inhalation |  |  |
| `mar.frequency` | String |  |  |  |  |  |  |
| `mar.administeredAt` | Date |  |  |  |  |  |  |
| `mar.administeredBy` | String |  |  |  |  |  |  |
| `mar.status` | String |  |  | "Given" | Given, Refused, Missed, Held |  |  |
| `mar.reasonIfMissed` | String |  |  |  |  |  |  |
| `ioChart` | Array<subdocument> |  |  |  |  |  |  |
| `ioChart.date` | Date |  |  | [function] |  |  |  |
| `ioChart.inputType` | String |  |  |  | Oral, IV Fluid, Blood, Ryles |  |  |
| `ioChart.inputAmount` | Number |  |  |  |  |  |  |
| `ioChart.outputType` | String |  |  |  | Urine, Stool, Vomit, Drain, Other |  |  |
| `ioChart.outputAmount` | Number |  |  |  |  |  |  |
| `ioChart.recordedBy` | String |  |  |  |  |  |  |
| `nursingNotes` | Array<subdocument> |  |  |  |  |  |  |
| `nursingNotes.date` | Date |  |  | [function] |  |  |  |
| `nursingNotes.shift` | String |  |  |  | Morning, Evening, Night |  |  |
| `nursingNotes.subjective` | String |  |  |  |  |  |  |
| `nursingNotes.objective` | String |  |  |  |  |  |  |
| `nursingNotes.assessment` | String |  |  |  |  |  |  |
| `nursingNotes.plan` | String |  |  |  |  |  |  |
| `nursingNotes.nurseName` | String |  |  |  |  |  |  |
| `doctorNotes` | Array<subdocument> |  |  |  |  |  | Health |
| `doctorNotes.date` | Date |  |  | [function] |  |  | Health |
| `doctorNotes.subjective` | String |  |  |  |  |  | Health |
| `doctorNotes.objective` | String |  |  |  |  |  | Health |
| `doctorNotes.assessment` | String |  |  |  |  |  | Health |
| `doctorNotes.plan` | String |  |  |  |  |  | Health |
| `doctorNotes.doctorName` | String |  |  |  |  |  | Health |
| `woundCare` | Array<subdocument> |  |  |  |  |  |  |
| `woundCare.date` | Date |  |  | [function] |  |  |  |
| `woundCare.woundType` | String |  |  |  |  |  |  |
| `woundCare.location` | String |  |  |  |  |  | Location |
| `woundCare.dressingType` | String |  |  |  |  |  |  |
| `woundCare.findings` | String |  |  |  |  |  |  |
| `woundCare.performedBy` | String |  |  |  |  |  |  |
| `dischargeChecklist.medicinesPackaged` | Boolean |  |  | false |  |  |  |
| `dischargeChecklist.documentsReady` | Boolean |  |  | false |  |  |  |
| `dischargeChecklist.patientEducated` | Boolean |  |  | false |  |  |  |
| `dischargeChecklist.followUpGiven` | Boolean |  |  | false |  |  |  |
| `dischargeChecklist.billSettled` | Boolean |  |  | false |  |  |  |
| `dischargeSummary` | String |  |  |  |  |  |  |
| `dischargeMedicines` | Array<subdocument> |  |  |  |  |  |  |
| `dischargeMedicines.name` | String |  |  |  |  |  | Identity |
| `dischargeMedicines.dose` | String |  |  |  |  |  |  |
| `dischargeMedicines.duration` | String |  |  |  |  |  |  |
| `dischargeMedicines.instructions` | String |  |  |  |  |  |  |
| `medicinesToContinue` | Array<subdocument> |  |  |  |  |  |  |
| `medicinesToContinue.name` | String |  |  |  |  |  | Identity |
| `medicinesToContinue.dose` | String |  |  |  |  |  |  |
| `medicinesToContinue.frequency` | String |  |  |  |  |  |  |
| `medicinesToContinue.duration` | String |  |  |  |  |  |  |
| `medicinesToContinue.instructions` | String |  |  |  |  |  |  |
| `followUpDate` | Date |  |  |  |  |  |  |
| `followUpInstructions` | String |  |  |  |  |  |  |
| `dietInstructions` | Array<subdocument> |  |  |  |  |  |  |
| `dietInstructions.meal` | String |  |  |  | Morning, Noon, Evening, Night, Other |  |  |
| `dietInstructions.instructions` | String |  |  |  |  |  |  |
| `dischargeNotes` | String |  |  |  |  |  |  |
| `dischargeCondition` | String |  |  |  | Stable, Improved, Critical, DOD |  |  |
| `dischargedAt` | Date |  |  |  |  |  |  |
| `dischargedBy` | ObjectId |  |  |  |  | User |  |
| `handoverNotes` | String |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `admissionId:1` | unique |
| `hospitalId:1` |  |

### `aisafetyevents` — AiSafetyEvent

source `AiSafetyEvent.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `kind` | String |  |  | "request" | red_flag, request |  |  |
| `trigger` | String |  |  | "" |  |  |  |
| `userId` | ObjectId |  |  |  |  | User | Identifier |
| `model` | String |  |  | "" |  |  |  |
| `latencyMs` | Number |  |  | 0 |  |  |  |
| `promptChars` | Number |  |  | 0 |  |  |  |
| `replyChars` | Number |  |  | 0 |  |  |  |
| `promptTokensEst` | Number |  |  | 0 |  |  |  |
| `replyTokensEst` | Number |  |  | 0 |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `kind:1` |  |
| `createdAt:1` |  |

### `ambulances` — Ambulance

source `Ambulance.js` · timestamps: yes · virtuals: 0 · retention: Trip duration + 30 days (dispute window) (docs/privacy/RETENTION.md) · PII: Identifier, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId | yes |  |  |  | Hospital |  |
| `registrationNumber` | String | yes | yes |  |  |  |  |
| `vehicleModel` | String |  |  | "" |  |  |  |
| `ambulanceType` | String |  |  | "BLS" | BLS, ALS, PATIENT_TRANSPORT, MORTUARY |  |  |
| `equipmentLevel` | String |  |  | "" |  |  |  |
| `currentDriverId` | ObjectId |  |  | null |  | Staff |  |
| `currentDriverPhone` | String |  |  | "" |  |  |  |
| `userId` | ObjectId |  | yes |  |  | User | Identifier |
| `driverName` | String |  |  | "" |  |  |  |
| `driverPhone` | String |  |  | "" |  |  |  |
| `loginEmail` | String |  |  | "" |  |  |  |
| `loginStatus` | String |  |  | "none" | none, invited, active |  |  |
| `lastPingAt` | Date |  |  | null |  |  |  |
| `currentEmergencyId` | ObjectId |  |  | null |  | EmergencyRequest |  |
| `isOnline` | Boolean |  |  | false |  |  |  |
| `isOnDuty` | Boolean |  |  | false |  |  |  |
| `emergencySupport` | Boolean |  |  | true |  |  |  |
| `currentLocation.type` | String |  |  | "Point" | Point |  | Location |
| `currentLocation.coordinates` | Array<Mixed> |  |  |  |  |  | Location |
| `currentLocation.accuracy` | Number |  |  | null |  |  | Location |
| `currentLocation.updatedAt` | Date |  |  | null |  |  | Location |
| `settings.lifeSupportTier` | String |  |  | "BLS" | BLS, ALS, PTV, NICU |  |  |
| `settings.oxygenOk` | Boolean |  |  | false |  |  |  |
| `settings.aedOk` | Boolean |  |  | false |  |  |  |
| `settings.suctionOk` | Boolean |  |  | false |  |  |  |
| `settings.spineBoardOk` | Boolean |  |  | false |  |  |  |
| `settings.emtOnBoard` | Boolean |  |  | false |  |  |  |
| `settings.baseDispatchFee` | Number |  |  | 0 |  |  |  |
| `settings.perKmRate` | Number |  |  | 0 |  |  |  |
| `settings.oxygenFee` | Number |  |  | 0 |  |  |  |
| `settings.erAutoAlert` | Boolean |  |  | true |  |  |  |
| `settings.maxRadiusKm` | Number |  |  | 25 |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `registrationNumber:1` | unique |
| `userId:1` | unique, sparse |
| `loginStatus:1` |  |
| `isOnline:1` |  |
| `isOnDuty:1` |  |
| `emergencySupport:1` |  |
| `currentLocation.coordinates:2dsphere` |  |

### `ambulancesetupcodes` — AmbulanceSetupCode

source `AmbulanceSetupCode.js` · timestamps: yes · virtuals: 0 · retention: 15–60 minutes (TTL index) — tokens until logout or expiry (docs/privacy/RETENTION.md) · PII: Contact, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `code` | String | yes | yes |  |  |  |  |
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `email` | String | yes |  |  |  |  | Contact |
| `ambulanceId` | ObjectId |  |  |  |  | Ambulance |  |
| `expiresAt` | Date | yes |  |  |  |  |  |
| `usedAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `code:1` | unique |
| `userId:1` |  |
| `expiresAt:1` | TTL 0s |

### `announcements` — Announcement

source `Announcement.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId | yes |  |  |  | Hospital |  |
| `title` | String | yes |  |  |  |  |  |
| `message` | String | yes |  |  |  |  |  |
| `priority` | String |  |  | "normal" | low, normal, high, urgent |  |  |
| `targetRoles` | Array<Mixed> |  |  |  |  |  |  |
| `createdBy` | ObjectId | yes |  |  |  | User |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `appointments` — Appointment

source `Appointment.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Contact, Health, Identifier, Identity, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `tokenNumber` | String |  | yes |  |  |  |  |
| `uhid` | String |  |  |  |  |  |  |
| `patient` | String | yes |  |  |  |  |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `doctor` | String | yes |  |  |  |  |  |
| `doctorId` | ObjectId |  |  |  |  | Doctor | Identifier |
| `department` | String | yes |  |  |  |  |  |
| `date` | String | yes |  |  |  |  |  |
| `time` | String | yes |  |  |  |  |  |
| `status` | String |  |  | "Pending" | Pending, Confirmed, Cancelled, Completed, In Queue, Serving, Missed |  |  |
| `patientRecordId` | ObjectId |  |  |  |  | Patient |  |
| `checkoutExpiresAt` | Date |  |  | null |  |  |  |
| `cancellationReason` | String |  |  | "" |  |  |  |
| `cancelledAt` | Date |  |  |  |  |  |  |
| `priority` | String |  |  | "Normal" | Normal, Urgent, Emergency |  |  |
| `type` | String |  |  | "Consultation" | Consultation, Follow-up, Check-up, Emergency, Chat Consultation, Video Consultation, Audio Call Consultation, Audio Consultation, Home Visit Consultation |  |  |
| `appointmentMode` | String |  |  | "offline" | chat, video, audio, voice, call, offline, in_person, home_visit, home |  |  |
| `patientLocation.lat` | Number |  |  |  |  |  | Location |
| `patientLocation.lng` | Number |  |  |  |  |  | Location |
| `patientLocation.address` | String |  |  | "" |  |  | Contact |
| `patientLocation.updatedAt` | Date |  |  |  |  |  |  |
| `patientLocation.transitStatus` | String |  |  | "pending_departure" | pending_departure, on_the_way, nearby, arrived, completed |  |  |
| `patientLocation.etaMinutes` | Number |  |  |  |  |  |  |
| `patientLocation.distanceKm` | Number |  |  |  |  |  |  |
| `notes` | String |  |  | "" |  |  |  |
| `symptoms` | String |  |  | "" |  |  | Health |
| `packageId` | String |  |  | "" |  |  |  |
| `packageName` | String |  |  | "" |  |  |  |
| `packageSessions` | Number |  |  | 0 |  |  |  |
| `preConsultationDetails.chiefComplaint` | String |  |  | "" |  |  | Health |
| `preConsultationDetails.chiefComplaintOther` | String |  |  | "" |  |  |  |
| `preConsultationDetails.symptomsDuration` | String |  |  | "" |  |  |  |
| `preConsultationDetails.pastMedicalHistory.hasHistory` | Boolean |  |  | false |  |  |  |
| `preConsultationDetails.pastMedicalHistory.details` | String |  |  | "" |  |  |  |
| `preConsultationDetails.currentTreatment.hasPastTreatment` | Boolean |  |  | false |  |  |  |
| `preConsultationDetails.currentTreatment.doctorName` | String |  |  | "" |  |  | Identity |
| `preConsultationDetails.currentTreatment.cityState` | String |  |  | "" |  |  |  |
| `preConsultationDetails.currentTreatment.when` | String |  |  | "" |  |  |  |
| `preConsultationDetails.currentTreatment.prescriptionFile` | String |  |  | "" |  |  |  |
| `preConsultationDetails.currentTreatment.takingMedicines` | Boolean |  |  | false |  |  |  |
| `preConsultationDetails.testReports.hasReports` | Boolean |  |  | false |  |  |  |
| `preConsultationDetails.testReports.reportFile` | String |  |  | "" |  |  |  |
| `preConsultationDetails.currentMedications.hasMedications` | Boolean |  |  | false |  |  |  |
| `preConsultationDetails.currentMedications.details` | String |  |  | "" |  |  |  |
| `preConsultationDetails.allergies.hasAllergies` | Boolean |  |  | false |  |  | Health |
| `preConsultationDetails.allergies.details` | String |  |  | "" |  |  | Health |
| `preConsultationDetails.familyHistory.hasHistory` | Boolean |  |  | false |  |  |  |
| `preConsultationDetails.familyHistory.details` | String |  |  | "" |  |  |  |
| `preConsultationDetails.filledAt` | Date |  |  |  |  |  |  |
| `services` | Array<Mixed> |  |  |  |  |  |  |
| `fees` | Number |  |  | 0 |  |  |  |
| `queuePosition` | Number |  |  | 0 |  |  |  |
| `estimatedWaitTime` | Number |  |  | 0 |  |  |  |
| `checkedInAt` | Date |  |  |  |  |  |  |
| `consultationStartTime` | Date |  |  |  |  |  |  |
| `consultationEndTime` | Date |  |  |  |  |  |  |
| `followUpDate` | Date |  |  |  |  |  |  |
| `reminderSent` | Boolean |  |  | false |  |  |  |
| `reminderState.t24` | Subdocument |  |  |  |  |  |  |
| `reminderState.t24.status` | String |  |  |  | pending, sending, sent, failed, skipped |  |  |
| `reminderState.t24.claimedAt` | Date |  |  |  |  |  |  |
| `reminderState.t24.sentAt` | Date |  |  |  |  |  |  |
| `reminderState.t24.attempts` | Number |  |  | 0 |  |  |  |
| `reminderState.t24.nextAttemptAt` | Date |  |  |  |  |  |  |
| `reminderState.t24.lastReason` | String |  |  |  |  |  |  |
| `reminderState.t2` | Subdocument |  |  |  |  |  |  |
| `reminderState.t2.status` | String |  |  |  | pending, sending, sent, failed, skipped |  |  |
| `reminderState.t2.claimedAt` | Date |  |  |  |  |  |  |
| `reminderState.t2.sentAt` | Date |  |  |  |  |  |  |
| `reminderState.t2.attempts` | Number |  |  | 0 |  |  |  |
| `reminderState.t2.nextAttemptAt` | Date |  |  |  |  |  |  |
| `reminderState.t2.lastReason` | String |  |  |  |  |  |  |
| `seriesId` | ObjectId |  |  |  |  | AppointmentSeries |  |
| `seriesIndex` | Number |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `tokenNumber:1` | unique, sparse |
| `uhid:1` |  |
| `patientRecordId:1` |  |
| `checkoutExpiresAt:1` |  |
| `seriesId:1` |  |
| `hospitalId:1` |  |
| `doctorId:1, patientId:1, date:1, time:1` | unique, partial |
| `doctorId:1, date:-1` |  |
| `patientId:1, date:-1` |  |
| `hospitalId:1, date:-1` |  |
| `status:1, createdAt:-1` |  |
| `date:-1` |  |

### `appointmentseries` — AppointmentSeries

source `AppointmentSeries.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Health, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `patientName` | String |  |  | "" |  |  | Identity |
| `doctorId` | ObjectId | yes |  |  |  | Doctor | Identifier |
| `doctor` | String | yes |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `department` | String |  |  | "General" |  |  |  |
| `type` | String |  |  | "Consultation" |  |  |  |
| `appointmentMode` | String |  |  | "offline" |  |  |  |
| `notes` | String |  |  | "" |  |  |  |
| `symptoms` | String |  |  | "" |  |  | Health |
| `frequency` | String | yes |  |  | weekly, biweekly, monthly |  |  |
| `count` | Number | yes |  |  |  |  |  |
| `startDate` | String | yes |  |  |  |  |  |
| `time` | String | yes |  |  |  |  |  |
| `occurrenceDates` | Array<Mixed> |  |  |  |  |  |  |
| `occurrenceIds` | Array<Mixed> |  |  |  |  |  |  |
| `feesPerOccurrence` | Number |  |  | 0 |  |  |  |
| `totalFees` | Number |  |  | 0 |  |  |  |
| `status` | String |  |  | "active" | active, cancelled |  |  |
| `cancelledAt` | Date |  |  |  |  |  |  |
| `cancellationReason` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `patientId:1, createdAt:-1` |  |
| `doctorId:1, startDate:1` |  |

### `assistantbookings` — AssistantBooking

source `AssistantBooking.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Contact, Demographic, Identifier, Identity, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `bookingNumber` | String |  | yes | [function] |  |  |  |
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `assistantId` | ObjectId |  |  | null |  | User | Identifier |
| `hospital` | String | yes |  |  |  |  |  |
| `serviceCategories` | Array<Mixed> |  |  |  |  |  |  |
| `isUrgent` | Boolean |  |  | false |  |  |  |
| `targetAssistantOnly` | Boolean |  |  | false |  |  |  |
| `intakeSource` | String |  |  | "scheduled_profile_form" | quick_urgent_card, scheduled_profile_form, booking_wizard |  |  |
| `broadcastFallbackAt` | Date |  |  |  |  |  |  |
| `urgencyWindow` | String |  |  | "asap" | asap, specific_time |  |  |
| `onBehalfOf` | String |  |  | "self" | self, family, other |  |  |
| `familyMemberId` | ObjectId |  |  | null |  | FamilyMember |  |
| `otherPatient.name` | String |  |  | "" |  |  | Identity |
| `otherPatient.phone` | String |  |  | "" |  |  | Contact |
| `otherPatient.age` | String |  |  | "" |  |  | Demographic |
| `taskDescription` | String |  |  | "" |  |  |  |
| `phone` | String |  |  | "" |  |  | Contact |
| `documents` | Array<Mixed> |  |  |  |  |  |  |
| `scheduledDate` | Date | yes |  |  |  |  |  |
| `startTime` | String | yes |  |  |  |  |  |
| `durationType` | String |  |  | "4hr" | 2hr, 4hr, full_day, overnight |  |  |
| `specialInstructions` | String |  |  | "" |  |  |  |
| `patientAllergies` | Array<Mixed> |  |  |  |  |  |  |
| `cost.ratePerHour` | Number |  |  | 150 |  |  |  |
| `cost.estimatedHours` | Number |  |  | 4 |  |  |  |
| `cost.total` | Number | yes |  |  |  |  |  |
| `location.type` | String |  |  | "Point" | Point |  | Location |
| `location.coordinates` | Array<Mixed> |  |  | [79.9864,23.1815] |  |  | Location |
| `location.lat` | Number |  |  | 23.1815 |  |  | Location |
| `location.lng` | Number |  |  | 79.9864 |  |  | Location |
| `location.address` | String |  |  | "" |  |  | Contact |
| `status` | String |  |  | "requested" | searching, requested, confirmed, in_progress, completed, declined_by_assistant, cancelled_by_patient, cancelled_by_assistant, no_responders_found |  |  |
| `notified` | Array<subdocument> |  |  |  |  |  |  |
| `notified.providerId` | String |  |  |  |  |  | Identifier |
| `notified.userId` | String |  |  |  |  |  | Identifier |
| `everNotified` | Array<subdocument> |  |  |  |  |  |  |
| `everNotified.providerId` | String |  |  |  |  |  | Identifier |
| `acceptances` | Array<subdocument> |  |  |  |  |  |  |
| `acceptances.providerId` | String |  |  |  |  |  | Identifier |
| `acceptances.distanceKm` | Number |  |  |  |  |  |  |
| `acceptances.acceptedAt` | Date |  |  | [function] |  |  |  |
| `rejections` | Array<Mixed> |  |  |  |  |  |  |
| `windowEndsAt` | Date |  |  | null |  |  |  |
| `retryCount` | Number |  |  | 0 |  |  |  |
| `retryAt` | Date |  |  | null |  |  |  |
| `retryRadii` | Array<Mixed> |  |  | [] |  |  |  |
| `currentSearchRadiusKm` | Number |  |  | 5 |  |  |  |
| `dispatchLog` | Array<subdocument> |  |  |  |  |  |  |
| `dispatchLog.radiusKm` | Number |  |  |  |  |  |  |
| `dispatchLog.candidateCount` | Number |  |  |  |  |  |  |
| `dispatchLog.outcome` | String |  |  |  | assigned, no_response, no_acceptance, escalated |  |  |
| `dispatchLog.timestamp` | Date |  |  | [function] |  |  |  |
| `statusHistory` | Array<subdocument> |  |  |  |  |  |  |
| `statusHistory.status` | String |  |  |  |  |  |  |
| `statusHistory.at` | Date |  |  | [function] |  |  |  |
| `statusHistory.note` | String |  |  | "" |  |  |  |
| `taskChecklist` | Array<subdocument> |  |  |  |  |  |  |
| `taskChecklist.label` | String | yes |  |  |  |  |  |
| `taskChecklist.category` | String |  |  | "general" |  |  |  |
| `taskChecklist.isCustom` | Boolean |  |  | false |  |  |  |
| `taskChecklist.isDone` | Boolean |  |  | false |  |  |  |
| `taskChecklist.doneAt` | Date |  |  |  |  |  |  |
| `checkInAt` | Date |  |  |  |  |  |  |
| `completedAt` | Date |  |  |  |  |  |  |
| `settledAt` | Date |  |  | null |  |  |  |
| `settlementAmount` | Number |  |  | 0 |  |  |  |
| `completionSummary` | String |  |  | "" |  |  |  |
| `payment.method` | String |  |  | "pending" | demo_wallet, cash, pending, |  |  |
| `payment.status` | String |  |  | "pending" | pending, paid, failed |  |  |
| `payment.transactionRef` | String |  |  | "" |  |  |  |
| `payment.paidAt` | Date |  |  |  |  |  |  |
| `ratingByPatient.stars` | Number |  |  |  |  |  |  |
| `ratingByPatient.comment` | String |  |  | "" |  |  |  |
| `ratingByPatient.createdAt` | Date |  |  |  |  |  |  |
| `ratingByAssistant.stars` | Number |  |  |  |  |  |  |
| `ratingByAssistant.comment` | String |  |  | "" |  |  |  |
| `ratingByAssistant.createdAt` | Date |  |  |  |  |  |  |
| `cancellationReason` | String |  |  | "" |  |  |  |
| `cancelledBy` | String |  |  | "" | patient, assistant, system, |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `bookingNumber:1` | unique |
| `patientId:1` |  |
| `assistantId:1` |  |
| `hospital:1` |  |
| `isUrgent:1` |  |
| `targetAssistantOnly:1` |  |
| `scheduledDate:1` |  |
| `status:1` |  |
| `retryAt:1` |  |
| `createdAt:1` |  |
| `location:2dsphere` |  |

### `assistantprofiles` — AssistantProfile

source `AssistantProfile.js` · timestamps: yes · virtuals: 0 · retention: Life of the provider relationship + 1 year (provider deletion flow) (docs/privacy/RETENTION.md) · PII: Contact, Financial, Identifier, Identity, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes | yes |  |  | User | Identifier |
| `govtIdType` | String | yes |  |  | Aadhaar, PAN, Voter ID, Passport, Other |  |  |
| `govtIdNumber` | String | yes |  |  |  |  |  |
| `govtIdNumberHash` | String |  |  | "" |  |  |  |
| `govtIdDocUrl` | String |  |  | "" |  |  |  |
| `policeVerificationDocUrl` | String |  |  | "" |  |  |  |
| `emergencyContact.name` | String |  |  | "" |  |  | Identity |
| `emergencyContact.phone` | String |  |  | "" |  |  | Contact |
| `experienceYears` | Number |  |  | 1 |  |  |  |
| `experienceTypes` | Array<Mixed> |  |  |  |  |  |  |
| `certifications` | Array<Mixed> |  |  |  |  |  |  |
| `languages` | Array<Mixed> |  |  |  |  |  |  |
| `bio` | String |  |  | "" |  |  |  |
| `serviceCategories` | Array<Mixed> |  |  |  |  |  |  |
| `hospitalsCovered` | Array<Mixed> |  |  |  |  |  |  |
| `operatingCity` | String |  |  | "Jabalpur" |  |  |  |
| `shiftTypes` | Array<Mixed> |  |  |  |  |  |  |
| `pricePerHour` | Number |  |  | 150 |  |  |  |
| `pricePerFullDay` | Number |  |  | 1000 |  |  |  |
| `extraSkills.mobilityAssistance` | Boolean |  |  | false |  |  |  |
| `extraSkills.wheelchairComfort` | Boolean |  |  | false |  |  |  |
| `extraSkills.ownVehicleMedicine` | Boolean |  |  | false |  |  |  |
| `extraSkills.overnightStays` | Boolean |  |  | false |  |  |  |
| `policeVerificationStatus` | String |  |  | "verified" | verified, pending, not_submitted |  |  |
| `healthCertification.isVaccinated` | Boolean |  |  | true |  |  |  |
| `healthCertification.vaccines` | Array<Mixed> |  |  | ["COVID-19 Booster","Hepatitis B"] |  |  |  |
| `healthCertification.healthCertDocUrl` | String |  |  | "" |  |  |  |
| `healthCertification.isCertifiedFit` | Boolean |  |  | true |  |  |  |
| `onTimeRate` | Number |  |  | 98 |  |  |  |
| `completionRate` | Number |  |  | 99 |  |  |  |
| `repeatClientsCount` | Number |  |  | 12 |  |  |  |
| `trainedEmergencyAdmissions` | Boolean |  |  | true |  |  |  |
| `badgeIdentifier` | String |  |  | "FindMedi Blue Lanyard & Attendant ID" |  |  |  |
| `dayInWorkDescription` | String |  |  | "" |  |  |  |
| `bankDetails.accountHolder` | String |  |  | "" |  |  |  |
| `bankDetails.accountNumber` | String |  |  | "" |  |  | Financial |
| `bankDetails.ifsc` | String |  |  | "" |  |  | Financial |
| `bankDetails.upiId` | String |  |  | "" |  |  | Financial |
| `bankDetails.verified` | Boolean |  |  | false |  |  |  |
| `settings.emergencyStandby` | Boolean |  |  | false |  |  |  |
| `settings.refundPolicy` | String |  |  | "full_6h" | full_6h, half_2_6h, none_enroute |  |  |
| `settings.rateCard.halfDay4h` | Number |  |  | 0 |  |  |  |
| `settings.rateCard.day8h` | Number |  |  | 0 |  |  |  |
| `settings.rateCard.night12h` | Number |  |  | 0 |  |  |  |
| `settings.rateCard.full24h` | Number |  |  | 0 |  |  |  |
| `settings.clinicalTags` | Array<Mixed> |  |  |  |  |  |  |
| `settings.preferredHospitals` | Array<Mixed> |  |  |  |  |  |  |
| `availableDays` | Array<Mixed> |  |  |  |  |  |  |
| `availableTimeSlots` | Array<subdocument> |  |  |  |  |  |  |
| `availableTimeSlots.start` | String |  |  | "09:00 AM" |  |  |  |
| `availableTimeSlots.end` | String |  |  | "06:00 PM" |  |  |  |
| `assistantStatus` | String |  |  | "pending_approval" | pending_approval, active, rejected, suspended |  |  |
| `rejectionReason` | String |  |  | "" |  |  |  |
| `isAvailable` | Boolean |  |  | false |  |  |  |
| `lastLocationAt` | Date |  |  | null |  |  |  |
| `activeDispatchRequestId` | ObjectId |  |  | null |  |  |  |
| `isOnlineForUrgent` | Boolean |  |  | false |  |  |  |
| `isDocumentVerified` | Boolean |  |  | false |  |  |  |
| `rating.avg` | Number |  |  | 5 |  |  |  |
| `rating.count` | Number |  |  | 0 |  |  |  |
| `totalEarnings` | Number |  |  | 0 |  |  |  |
| `walletBalance` | Number |  |  | 0 |  |  |  |
| `favoritedByCount` | Number |  |  | 0 |  |  |  |
| `currentLocation.type` | String |  |  | "Point" | Point |  | Location |
| `currentLocation.coordinates` | Array<Mixed> |  |  | [79.9864,23.1815] |  |  | Location |
| `currentLocation.lat` | Number |  |  | 23.1815 |  |  | Location |
| `currentLocation.lng` | Number |  |  | 79.9864 |  |  | Location |
| `currentLocation.h3Index8` | String |  |  | null |  |  | Location |
| `currentLocation.h3Index9` | String |  |  | null |  |  | Location |
| `currentLocation.updatedAt` | Date |  |  | [function] |  |  | Location |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` | unique |
| `govtIdNumberHash:1` |  |
| `hospitalsCovered:1` |  |
| `operatingCity:1` |  |
| `assistantStatus:1` |  |
| `isAvailable:1` |  |
| `lastLocationAt:1` |  |
| `activeDispatchRequestId:1` |  |
| `isOnlineForUrgent:1` |  |
| `currentLocation.h3Index8:1` |  |
| `currentLocation.h3Index9:1` |  |
| `createdAt:1` |  |
| `currentLocation:2dsphere` |  |

### `auditlogs` — AuditLog

source `AuditLog.js` · timestamps: yes · virtuals: 0 · retention: 7 years (longer than the data they describe) (docs/privacy/RETENTION.md) · PII: Device/Network, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  |  | Identifier |
| `action` | String | yes |  |  |  |  |  |
| `details` | Mixed |  |  | [function] |  |  |  |
| `ip` | String |  |  |  |  |  | Device/Network |
| `userAgent` | String |  |  |  |  |  | Device/Network |
| `timestamp` | Date |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `action:1` |  |
| `timestamp:1` | TTL 31536000s |

### `beds` — Bed

source `Bed.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `bedNumber` | String | yes | yes |  |  |  |  |
| `ward` | String | yes |  |  | General, Semi-Private, Private, ICU, NICU, PICU, Emergency |  |  |
| `bedType` | String | yes |  |  | General, Semi-Private, Private, ICU, NICU, PICU |  |  |
| `status` | String |  |  | "Available" | Available, Occupied, Under Cleaning, Maintenance |  |  |
| `currentPatientId` | ObjectId |  |  |  |  | User |  |
| `currentPatientName` | String |  |  |  |  |  |  |
| `admissionId` | ObjectId |  |  |  |  | Admission |  |
| `occupiedSince` | Date |  |  |  |  |  |  |
| `dailyRate` | Number | yes |  |  |  |  |  |
| `floor` | String |  |  |  |  |  |  |
| `isAC` | Boolean |  |  | false |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `bedNumber:1` | unique |
| `hospitalId:1` |  |

### `billings` — Billing

source `Billing.js` · timestamps: yes · virtuals: 0 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `invoiceId` | String | yes | yes |  |  |  |  |
| `patient` | String | yes |  |  |  |  |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `doctor` | String |  |  |  |  |  |  |
| `doctorId` | ObjectId |  |  |  |  | Doctor | Identifier |
| `appointmentId` | ObjectId |  |  |  |  | Appointment |  |
| `admissionId` | ObjectId |  |  |  |  | Admission |  |
| `service` | String | yes |  |  |  |  |  |
| `services` | Array<subdocument> |  |  |  |  |  |  |
| `services.id` | String |  |  | "" |  |  |  |
| `services.name` | String | yes |  |  |  |  | Identity |
| `services.description` | String |  |  |  |  |  |  |
| `services.price` | Number | yes |  |  |  |  |  |
| `services.quantity` | Number |  |  | 1 |  |  |  |
| `services.category` | String |  |  | "General" |  |  |  |
| `services.discount` | Number |  |  | 0 |  |  |  |
| `source` | String |  |  | "manual" | manual, appointment, lab, pharmacy, ipd, ot, radiology, physio, diet |  |  |
| `amount` | Number | yes |  |  |  |  |  |
| `subTotal` | Number |  |  | 0 |  |  |  |
| `discount` | Number |  |  | 0 |  |  |  |
| `tax` | Number |  |  | 0 |  |  |  |
| `taxRate` | Number |  |  | 0 |  |  |  |
| `taxableAmount` | Number |  |  | 0 |  |  |  |
| `paid` | Number |  |  | 0 |  |  |  |
| `balance` | Number |  |  | 0 |  |  |  |
| `status` | String |  |  | "Pending" | Paid, Pending, Overdue, Partial, Cancelled, Refunded |  |  |
| `date` | String | yes |  |  |  |  |  |
| `dueDate` | String |  |  |  |  |  |  |
| `paymentMethod` | String |  |  |  | Cash, Card, UPI, Cheque, Insurance, Online, Other |  |  |
| `transactionId` | String |  |  |  |  |  |  |
| `insuranceClaimId` | String |  |  |  |  |  |  |
| `insuranceApprovedAmount` | Number |  |  | 0 |  |  |  |
| `insuranceStatus` | String |  |  | "Not Submitted" | Not Submitted, Submitted, Approved, Rejected, Partial |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `facilityId` | ObjectId |  |  |  |  | Facility |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `invoiceId:1` | unique |
| `hospitalId:1` |  |
| `facilityId:1` |  |

### `bloodrequests` — BloodRequest

source `BloodBank.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Demographic, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `requestId` | String | yes | yes |  |  |  |  |
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `patientName` | String | yes |  |  |  |  | Identity |
| `doctorId` | ObjectId | yes |  |  |  | User | Identifier |
| `doctorName` | String | yes |  |  |  |  | Identity |
| `bloodGroup` | String | yes |  |  | A+, A-, B+, B-, AB+, AB-, O+, O- |  | Demographic |
| `unitsRequired` | Number |  |  | 1 |  |  |  |
| `reason` | String |  |  |  |  |  |  |
| `priority` | String |  |  | "Routine" | Routine, Urgent, Emergency |  |  |
| `status` | String |  |  | "Pending" | Pending, Crossmatching, Issued, Transfusing, Reaction, Completed, Cancelled |  |  |
| `issuedUnits` | Array<Mixed> |  |  |  |  |  |  |
| `crossMatchResult` | String |  |  | "Not Done" | Compatible, Incompatible, Not Done |  |  |
| `crossMatchTechnician` | String |  |  |  |  |  |  |
| `patientBloodGroup` | String |  |  |  |  |  |  |
| `donorBloodGroup` | String |  |  |  |  |  |  |
| `transfusionStartedAt` | Date |  |  |  |  |  |  |
| `transfusionEndedAt` | Date |  |  |  |  |  |  |
| `transfusionCompleteTime` | Date |  |  |  |  |  |  |
| `transfusionNurse` | String |  |  |  |  |  |  |
| `preTransfusionVitals.bp` | String |  |  |  |  |  |  |
| `preTransfusionVitals.hr` | Number |  |  |  |  |  |  |
| `preTransfusionVitals.temp` | Number |  |  |  |  |  |  |
| `reaction` | Boolean |  |  | false |  |  |  |
| `reactionReported` | Boolean |  |  | false |  |  |  |
| `reactionType` | String |  |  |  | Fever, Allergic, Hemolytic, Bacterial, Anaphylactic, Other |  |  |
| `reactionSeverity` | String |  |  |  | Mild, Moderate, Severe |  |  |
| `reactionSymptoms` | String |  |  |  |  |  |  |
| `reactionActionTaken` | String |  |  |  |  |  |  |
| `reactionStopped` | Boolean |  |  | false |  |  |  |
| `reactionNotes` | String |  |  |  |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `requestId:1` | unique |

### `bloodunits` — BloodUnit

source `BloodBank.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Demographic

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `unitId` | String | yes | yes |  |  |  |  |
| `bloodGroup` | String | yes |  |  | A+, A-, B+, B-, AB+, AB-, O+, O- |  | Demographic |
| `donorName` | String |  |  |  |  |  |  |
| `donorId` | String |  |  |  |  |  |  |
| `donationDate` | Date | yes |  |  |  |  |  |
| `expiryDate` | Date | yes |  |  |  |  |  |
| `volume` | Number |  |  | 450 |  |  |  |
| `status` | String |  |  | "Available" | Available, Reserved, Issued, Expired, Discarded |  |  |
| `components` | Array<Mixed> |  |  |  |  |  |  |
| `hiv` | String |  |  | "Negative" | Negative, Positive |  |  |
| `hbsag` | String |  |  | "Negative" | Negative, Positive |  |  |
| `hcv` | String |  |  | "Negative" | Negative, Positive |  |  |
| `malaria` | String |  |  | "Negative" | Negative, Positive |  |  |
| `vdrl` | String |  |  | "Negative" | Negative, Positive |  |  |
| `crossMatchPatient` | String |  |  |  |  |  |  |
| `crossMatchResult` | String |  |  | "Not Done" | Compatible, Incompatible, Not Done |  |  |
| `issuedTo` | String |  |  |  |  |  |  |
| `issuedAt` | Date |  |  |  |  |  |  |
| `issuedBy` | String |  |  |  |  |  |  |
| `requestId` | ObjectId |  |  |  |  | BloodRequest |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `unitId:1` | unique |
| `hospitalId:1` |  |

### `calllogs` — CallLog

source `CallLog.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `caller` | ObjectId | yes |  |  |  | User |  |
| `receiver` | ObjectId | yes |  |  |  | User |  |
| `callType` | String | yes |  | "audio" | audio, video |  |  |
| `status` | String |  |  | "completed" | completed, missed, rejected, busy, cancelled, failed |  |  |
| `startedAt` | Date |  |  | [function] |  |  |  |
| `answeredAt` | Date |  |  | null |  |  |  |
| `endedAt` | Date |  |  | null |  |  |  |
| `duration` | Number |  |  | 0 |  |  |  |
| `recordingUrl` | String |  |  | null |  |  |  |
| `recordingDuration` | Number |  |  | 0 |  |  |  |
| `appointmentId` | ObjectId |  |  | null |  | Appointment |  |
| `deletedFor` | Array<Mixed> |  |  |  |  |  |  |
| `notes` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `caller:1` |  |
| `receiver:1` |  |
| `status:1` |  |
| `caller:1, createdAt:-1` |  |
| `receiver:1, createdAt:-1` |  |

### `categories` — Category

source `Category.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `name` | String | yes |  |  |  |  |  |
| `type` | String | yes |  |  | test, medicine, department, service |  |  |
| `description` | String |  |  | "" |  |  |  |
| `parent` | ObjectId |  |  | null |  | Category |  |
| `icon` | String |  |  | "" |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `displayOrder` | Number |  |  | 0 |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `name:1, type:1` | unique |

### `chatconversations` — ChatConversation

source `ChatConversation.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `participants` | Array<Mixed> |  |  |  |  |  |  |
| `contextType` | String |  |  | null | assistant-booking, lawyer-booking |  |  |
| `contextId` | ObjectId |  |  | null |  |  |  |
| `contextParticipants` | Array<Mixed> |  |  |  |  |  |  |
| `mutedBy` | Array<Mixed> |  |  |  |  |  |  |
| `blockedBy` | Array<Mixed> |  |  |  |  |  |  |
| `pinnedBy` | Array<Mixed> |  |  |  |  |  |  |
| `archivedBy` | Array<Mixed> |  |  |  |  |  |  |
| `clearedFor` | Array<subdocument> |  |  |  |  |  |  |
| `clearedFor.userId` | ObjectId |  |  |  |  | User | Identifier |
| `clearedFor.at` | Date |  |  |  |  |  |  |
| `deletedFor` | Array<Mixed> |  |  |  |  |  |  |
| `drafts` | Array<subdocument> |  |  |  |  |  |  |
| `drafts.userId` | ObjectId |  |  |  |  | User | Identifier |
| `drafts.text` | String |  |  |  |  |  |  |
| `unreadCounts` | Array<subdocument> |  |  |  |  |  |  |
| `unreadCounts.userId` | ObjectId |  |  |  |  | User | Identifier |
| `unreadCounts.count` | Number |  |  | 0 |  |  |  |
| `requestStatus` | String |  |  | "accepted" | accepted, pending, declined |  |  |
| `initiatedBy` | ObjectId |  |  | null |  | User |  |
| `disappearing.enabled` | Boolean |  |  | false |  |  |  |
| `disappearing.durationHours` | Number |  |  | 24 |  |  |  |
| `disappearing.setBy` | ObjectId |  |  | null |  | User |  |
| `pinnedMessage` | ObjectId |  |  | null |  | ChatMessage |  |
| `lockedBy` | Array<subdocument> |  |  |  |  |  |  |
| `lockedBy.userId` | ObjectId |  |  |  |  | User | Identifier |
| `lockedBy.pinHash` | String |  |  |  |  |  |  |
| `lockedBy.hidePreview` | Boolean |  |  | true |  |  |  |
| `lockedBy.at` | Date |  |  |  |  |  |  |
| `wallpapers` | Array<subdocument> |  |  |  |  |  |  |
| `wallpapers.userId` | ObjectId |  |  |  |  | User |  |
| `wallpapers.value` | String |  |  |  |  |  |  |
| `lastMessage` | ObjectId |  |  |  |  | ChatMessage |  |
| `lastMessageAt` | Date |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `participants:1` |  |
| `requestStatus:1` |  |
| `lastMessageAt:1` |  |
| `contextType:1, contextId:1` | unique, partial |

### `chatmessages` — ChatMessage

source `ChatMessage.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `conversationId` | ObjectId | yes |  |  |  | ChatConversation |  |
| `sender` | ObjectId | yes |  |  |  | User |  |
| `type` | String |  |  | "text" | text, image, video, audio, voice, file |  |  |
| `content` | String |  |  | "" |  |  |  |
| `attachments` | Array<subdocument> |  |  |  |  |  |  |
| `attachments.url` | String |  |  | "" |  |  |  |
| `attachments.type` | String |  |  | "file" |  |  |  |
| `attachments.name` | String |  |  | "" |  |  |  |
| `attachments.size` | Number |  |  | 0 |  |  |  |
| `attachments.mimeType` | String |  |  | "" |  |  |  |
| `attachments.duration` | Number |  |  | 0 |  |  |  |
| `attachments.caption` | String |  |  | "" |  |  |  |
| `replyTo` | ObjectId |  |  | null |  | ChatMessage |  |
| `forwarded` | Boolean |  |  | false |  |  |  |
| `reactions` | Array<subdocument> |  |  |  |  |  |  |
| `reactions.userId` | ObjectId | yes |  |  |  | User | Identifier |
| `reactions.emoji` | String | yes |  |  |  |  |  |
| `reactions.at` | Date |  |  | [function] |  |  |  |
| `edited` | Boolean |  |  | false |  |  |  |
| `deletedForEveryone` | Boolean |  |  | false |  |  |  |
| `deletedFor` | Array<Mixed> |  |  |  |  |  |  |
| `starredBy` | Array<Mixed> |  |  |  |  |  |  |
| `deliveredTo` | Array<subdocument> |  |  |  |  |  |  |
| `deliveredTo.userId` | ObjectId | yes |  |  |  | User | Identifier |
| `deliveredTo.at` | Date |  |  | [function] |  |  |  |
| `readBy` | Array<subdocument> |  |  |  |  |  |  |
| `readBy.userId` | ObjectId | yes |  |  |  | User | Identifier |
| `readBy.at` | Date |  |  | [function] |  |  |  |
| `clientGeneratedId` | String |  |  | "" |  |  |  |
| `expiresAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `conversationId:1` |  |
| `clientGeneratedId:1` |  |
| `expiresAt:1` | TTL 0s, partial |
| `conversationId:1, createdAt:-1` |  |

### `chatprivacies` — ChatPrivacy

source `ChatPrivacy.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes | yes |  |  | User | Identifier |
| `lastSeen` | String |  |  | "everyone" | everyone, contacts, nobody |  |  |
| `online` | String |  |  | "everyone" | everyone, contacts, nobody |  |  |
| `profilePhoto` | String |  |  | "everyone" | everyone, contacts, nobody |  |  |
| `about` | String |  |  | "everyone" | everyone, contacts, nobody |  |  |
| `readReceipts` | Boolean |  |  | true |  |  |  |
| `typingIndicator` | Boolean |  |  | true |  |  |  |
| `recordingIndicator` | Boolean |  |  | true |  |  |  |
| `screenshotProtection` | Boolean |  |  | false |  |  |  |
| `callsPrivacy` | String |  |  | "everyone" | everyone, contacts, nobody |  |  |
| `silenceUnknownCallers` | Boolean |  |  | false |  |  |  |
| `notificationsEnabled` | Boolean |  |  | true |  |  |  |
| `messageNotifications` | Boolean |  |  | true |  |  |  |
| `callNotifications` | Boolean |  |  | true |  |  |  |
| `reactionNotifications` | Boolean |  |  | false |  |  |  |
| `notificationPreview` | Boolean |  |  | true |  |  |  |
| `notificationSound` | Boolean |  |  | true |  |  |  |
| `notificationVibration` | Boolean |  |  | true |  |  |  |
| `notificationBadge` | Boolean |  |  | true |  |  |  |
| `desktopNotifications` | Boolean |  |  | true |  |  |  |
| `enterKeyBehaviour` | String |  |  | "send" | send, newline |  |  |
| `mediaVisibilityInGallery` | Boolean |  |  | true |  |  |  |
| `keepArchivedUnmuted` | Boolean |  |  | false |  |  |  |
| `autoArchiveInactive` | Boolean |  |  | false |  |  |  |
| `fontScale` | Number |  |  | 100 |  |  |  |
| `appLockEnabled` | Boolean |  |  | false |  |  |  |
| `appLockScope` | String |  |  | "always" | always, 1min, 30min, never |  |  |
| `appLockPinHash` | String |  |  | "" |  |  |  |
| `appLockBiometric` | Boolean |  |  | false |  |  |  |
| `hideLockedNotifications` | Boolean |  |  | true |  |  |  |
| `messageRequestsEnabled` | Boolean |  |  | true |  |  |  |
| `requestPolicy` | String |  |  | "ask" | accept, ask, block |  |  |
| `appearance.theme` | String |  |  | "system" | light, dark, system |  |  |
| `appearance.accent` | String |  |  | "emerald" |  |  |  |
| `appearance.wallpaper` | String |  |  | "default" |  |  |  |
| `appearance.bubbleStyle` | String |  |  | "rounded" | rounded, classic, compact |  |  |
| `appearance.density` | String |  |  | "comfortable" | comfortable, compact |  |  |
| `appearance.animations` | Boolean |  |  | true |  |  |  |
| `appearance.reduceMotion` | Boolean |  |  | false |  |  |  |
| `mediaQuality` | String |  |  | "standard" | standard, hd, original |  |  |
| `autoDownload.mobileData.photos` | Boolean |  |  | true |  |  |  |
| `autoDownload.mobileData.videos` | Boolean |  |  | false |  |  |  |
| `autoDownload.mobileData.documents` | Boolean |  |  | false |  |  |  |
| `autoDownload.mobileData.audio` | Boolean |  |  | true |  |  |  |
| `autoDownload.wifi.photos` | Boolean |  |  | true |  |  |  |
| `autoDownload.wifi.videos` | Boolean |  |  | true |  |  |  |
| `autoDownload.wifi.documents` | Boolean |  |  | true |  |  |  |
| `autoDownload.wifi.audio` | Boolean |  |  | true |  |  |  |
| `autoDownload.roaming.photos` | Boolean |  |  | false |  |  |  |
| `autoDownload.roaming.videos` | Boolean |  |  | false |  |  |  |
| `autoDownload.roaming.documents` | Boolean |  |  | false |  |  |  |
| `autoDownload.roaming.audio` | Boolean |  |  | false |  |  |  |
| `autoDeleteDownloaded` | Boolean |  |  | false |  |  |  |
| `backup.enabled` | Boolean |  |  | false |  |  |  |
| `backup.frequency` | String |  |  | "off" | daily, weekly, monthly, off |  |  |
| `backup.includeVideos` | Boolean |  |  | false |  |  |  |
| `backup.encrypted` | Boolean |  |  | true |  |  |  |
| `backup.lastBackupAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` | unique |

### `chatreports` — ChatReport

source `ChatReport.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `reporterId` | ObjectId | yes |  |  |  | User | Identifier |
| `reportedUserId` | ObjectId | yes |  |  |  | User |  |
| `reportedMessageId` | ObjectId |  |  |  |  | ChatMessage |  |
| `conversationId` | ObjectId |  |  |  |  | ChatConversation |  |
| `reason` | String |  |  | "other" | spam, abuse, fake_profile, inappropriate, medical_misinformation, scam, other |  |  |
| `details` | String |  |  | "" |  |  |  |
| `messageSnapshot` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "pending" | pending, reviewed, action_taken, dismissed |  |  |
| `reviewedBy` | ObjectId |  |  |  |  | User |  |
| `reviewedAt` | Date |  |  |  |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `reporterId:1` |  |
| `reportedUserId:1` |  |
| `status:1` |  |
| `createdAt:1` |  |
| `reportedUserId:1, createdAt:-1` |  |
| `status:1, createdAt:-1` |  |

### `chroniccareplans` — ChronicCarePlan

source `ChronicCarePlan.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Health, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `patientId` | ObjectId |  |  | null |  | Patient | Identifier |
| `planName` | String | yes |  |  |  |  |  |
| `condition` | String | yes |  | "Diabetes" | Diabetes, Hypertension, Thyroid, Asthma, Heart Disease, Arthritis, COPD, Other |  | Health |
| `customCondition` | String |  |  | "" |  |  |  |
| `linkedDoctorId` | ObjectId |  |  | null |  | Doctor |  |
| `medicineReminderIds` | Array<Mixed> |  |  |  |  |  |  |
| `vitalsTracked` | Array<subdocument> |  |  |  |  |  |  |
| `vitalsTracked.vitalType` | String | yes |  |  | bp, blood_sugar, weight, temperature |  |  |
| `vitalsTracked.targetDescription` | String |  |  | "" |  |  |  |
| `vitalsTracked.personalizedTarget.min` | Number |  |  | null |  |  |  |
| `vitalsTracked.personalizedTarget.max` | Number |  |  | null |  |  |  |
| `followUpIntervalDays` | Number |  |  | 30 |  |  |  |
| `lastFollowUpAt` | Date |  |  | null |  |  |  |
| `nextFollowUpDueAt` | Date |  |  | null |  |  |  |
| `shareWithDoctor` | Boolean |  |  | false |  |  |  |
| `status` | String |  |  | "active" | active, paused, completed, pending_patient_acceptance |  |  |
| `notes` | String |  |  | "" |  |  |  |
| `createdBy` | String |  |  | "patient" | patient, doctor |  | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `linkedDoctorId:1` |  |

### `cities` — City

source `City.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `name` | String | yes | yes |  |  |  |  |
| `state` | String |  |  | "" |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `isOnboarding` | Boolean |  |  | false |  |  |  |
| `onboardingDate` | Date |  |  |  |  |  |  |
| `displayOrder` | Number |  |  | 0 |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `name:1` | unique |
| `isActive:1, displayOrder:1` |  |

### `clinicprofiles` — ClinicProfile

source `ClinicProfile.js` · timestamps: yes · virtuals: 11 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `clinicId` | String |  | yes |  |  |  |  |
| `doctorId` | ObjectId | yes | yes |  |  | Doctor |  |
| `clinic_name` | String |  |  | "" |  |  |  |
| `clinic_address` | String |  |  | "" |  |  |  |
| `clinic_category` | String |  |  | "" |  |  |  |
| `clinic_timing` | Mixed |  |  | [function] |  |  |  |
| `clinic_photos` | Array<Mixed> |  |  | [] |  |  |  |
| `clinic_facilities` | Array<Mixed> |  |  | [] |  |  |  |
| `clinic_treatments` | Array<Mixed> |  |  | [] |  |  |  |
| `clinic_insurance` | Array<Mixed> |  |  | [] |  |  |  |
| `clinic_faqs` | Array<Mixed> |  |  | [] |  |  |  |
| `clinic_license` | String |  |  | "" |  |  |  |
| `established_year` | Number |  |  | null |  |  |  |
| `social` | Mixed |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `clinicId:1` | unique, sparse |
| `doctorId:1` | unique |

### `commissionconfigs` — CommissionConfig

source `CommissionConfig.js` · timestamps: yes · virtuals: 0 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `facilityId` | ObjectId | yes | yes |  |  | Hospital |  |
| `facilityName` | String |  |  | "" |  |  | Identity |
| `facilityType` | String |  |  | "hospital" | hospital, clinic, lab, pharmacy |  |  |
| `commissionPercent` | Number |  |  | 10 |  |  |  |
| `commissionCap` | Number |  |  | 0 |  |  |  |
| `payoutSchedule` | String |  |  | "monthly" | weekly, biweekly, monthly |  |  |
| `totalEarnings` | Number |  |  | 0 |  |  |  |
| `pendingPayout` | Number |  |  | 0 |  |  |  |
| `lastPayoutDate` | Date |  |  |  |  |  |  |
| `status` | String |  |  | "active" | active, paused |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `facilityId:1` | unique |

### `consentrecords` — ConsentRecord

source `ConsentRecord.js` · timestamps: yes · virtuals: 0 · retention: Consent validity, then 1 year (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `consentId` | String | yes | yes |  |  |  |  |
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `doctorId` | ObjectId |  |  |  |  | User | Identifier |
| `purposeOfCare` | String |  |  | "General Clinical Evaluation" |  |  |  |
| `dataTypes` | Array<Mixed> |  |  |  |  |  |  |
| `status` | String |  |  | "REQUESTED" | REQUESTED, GRANTED, DENIED, REVOKED, EXPIRED |  |  |
| `validityHours` | Number |  |  | 24 |  |  |  |
| `grantedAt` | Date |  |  |  |  |  |  |
| `expiresAt` | Date |  |  |  |  |  |  |
| `revokedAt` | Date |  |  |  |  |  |  |
| `hipSessionKey` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `consentId:1` | unique |
| `patientId:1` |  |
| `doctorId:1` |  |
| `status:1` |  |

### `deletionrequests` — DeletionRequest

source `DeletionRequest.js` · timestamps: yes · virtuals: 0 · retention: 7 years (longer than the data they describe) (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `status` | String |  |  | "pending" | pending, approved, executing, completed, failed, cancelled |  |  |
| `reason` | String |  |  | "" |  |  |  |
| `channel` | String |  |  | "user_self_service" | user_self_service, admin_initiated |  |  |
| `requestedBy` | ObjectId |  |  |  |  | User |  |
| `approvedBy` | ObjectId |  |  |  |  | User |  |
| `approvedAt` | Date |  |  | null |  |  |  |
| `executedBy` | ObjectId |  |  |  |  | User |  |
| `executedAt` | Date |  |  | null |  |  |  |
| `steps` | Array<subdocument> |  |  |  |  |  |  |
| `steps.name` | String | yes |  |  |  |  |  |
| `steps.status` | String | yes |  |  | ok, skipped, failed |  |  |
| `steps.detail` | String |  |  | "" |  |  |  |
| `steps.at` | Date |  |  | [function] |  |  |  |
| `attempts` | Number |  |  | 0 |  |  |  |
| `lastError` | String |  |  | "" |  |  |  |
| `certificate.id` | String |  |  |  |  |  |  |
| `certificate.sha256` | String |  |  |  |  |  |  |
| `certificate.issuedAt` | Date |  |  |  |  |  |  |
| `certificate.scope` | Array<Mixed> |  |  |  |  |  |  |
| `certificate.skipped` | Array<subdocument> |  |  |  |  |  |  |
| `certificate.skipped.name` | String |  |  |  |  |  |  |
| `certificate.skipped.reason` | String |  |  |  |  |  |  |
| `certificate.schemaVersion` | Number |  |  | 1 |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `status:1` |  |

### `deliverypartners` — DeliveryPartner

source `DeliveryPartner.js` · timestamps: yes · virtuals: 0 · retention: Life of the provider relationship + 1 year (provider deletion flow) (docs/privacy/RETENTION.md) · PII: Contact, Demographic, Financial, Identifier, Identity, Image/Biometric, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes | yes |  |  | User | Identifier |
| `name` | String | yes |  |  |  |  | Identity |
| `phone` | String | yes |  |  |  |  | Contact |
| `email` | String |  |  |  |  |  | Contact |
| `photo` | String |  |  |  |  |  | Image/Biometric |
| `dob` | Date |  |  |  |  |  | Demographic |
| `gender` | String |  |  |  | Male, Female, Other |  | Demographic |
| `address` | String |  |  |  |  |  | Contact |
| `city` | String |  |  |  |  |  |  |
| `pincode` | String |  |  |  |  |  | Contact |
| `vehicleType` | String | yes |  |  | bike, scooter, bicycle, foot |  |  |
| `vehicleNumber` | String |  |  |  |  |  |  |
| `drivingLicenseDoc` | String |  |  |  |  |  |  |
| `vehicleRcDoc` | String |  |  |  |  |  |  |
| `insuranceDoc` | String |  |  |  |  |  |  |
| `aadharDoc` | String | yes |  |  |  |  |  |
| `panDoc` | String | yes |  |  |  |  |  |
| `bankDetails.accountNo` | String |  |  |  |  |  |  |
| `bankDetails.ifsc` | String |  |  |  |  |  | Financial |
| `bankDetails.holderName` | String |  |  |  |  |  |  |
| `bankDetails.upiId` | String |  |  |  |  |  | Financial |
| `workZone` | Array<Mixed> |  |  |  |  |  |  |
| `availability` | String |  |  | "flexible" | full-time, part-time, flexible |  |  |
| `emergencyContact.name` | String |  |  |  |  |  | Identity |
| `emergencyContact.phone` | String |  |  |  |  |  | Contact |
| `status` | String |  |  | "pending" | pending, approved, rejected, suspended |  |  |
| `rejectionReason` | String |  |  |  |  |  |  |
| `currentLocation.lat` | Number |  |  |  |  |  | Location |
| `currentLocation.lng` | Number |  |  |  |  |  | Location |
| `currentLocation.updatedAt` | Date |  |  |  |  |  | Location |
| `isOnline` | Boolean |  |  | false |  |  |  |
| `isAvailable` | Boolean |  |  | false |  |  |  |
| `assignedPharmacyId` | ObjectId |  |  |  |  | Facility |  |
| `rating` | Number |  |  | 0 |  |  |  |
| `totalDeliveries` | Number |  |  | 0 |  |  |  |
| `settings.nightDispatch` | Boolean |  |  | false |  |  |  |
| `settings.codCeiling` | Number |  |  | 2000 |  |  |  |
| `settings.insulatedBag` | Boolean |  |  | false |  |  |  |
| `settings.maxRadiusKm` | Number |  |  | 5 |  |  |  |
| `settings.payoutUpi` | String |  |  | "" |  |  |  |
| `settings.breakdownSos` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` | unique |
| `status:1, isAvailable:1` |  |
| `isOnline:1, isAvailable:1` |  |

### `demopayments` — DemoPayment

source `DemoPayment.js` · timestamps: yes · virtuals: 0 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `bookingType` | String |  |  | "ride" | ride, assistant, lawyer, emergency_doctor |  |  |
| `rideId` | ObjectId |  |  |  |  | RideBooking |  |
| `bookingId` | ObjectId |  |  |  |  | AssistantBooking |  |
| `lawyerBookingId` | ObjectId |  |  |  |  | LawyerBooking |  |
| `doctorRequestId` | ObjectId |  |  |  |  | EmergencyDoctorRequest |  |
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `riderId` | ObjectId |  |  |  |  | User | Identifier |
| `assistantId` | ObjectId |  |  |  |  | User | Identifier |
| `lawyerId` | ObjectId |  |  |  |  | User | Identifier |
| `doctorId` | ObjectId |  |  |  |  | Doctor | Identifier |
| `amount` | Number | yes |  |  |  |  |  |
| `method` | String |  |  | "demo_wallet" | demo_wallet, cash |  |  |
| `status` | String |  |  | "pending" | pending, held_in_escrow, paid, refunded, failed |  |  |
| `transactionRef` | String |  | yes | [function] |  |  |  |
| `bookingRef` | String |  |  |  |  |  |  |
| `paidAt` | Date |  |  |  |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `bookingType:1` |  |
| `rideId:1` |  |
| `bookingId:1` |  |
| `lawyerBookingId:1` |  |
| `doctorRequestId:1` |  |
| `userId:1` |  |
| `riderId:1` |  |
| `assistantId:1` |  |
| `lawyerId:1` |  |
| `doctorId:1` |  |
| `status:1` |  |
| `transactionRef:1` | unique |
| `bookingType:1, bookingId:1` | unique, sparse, partial |
| `bookingType:1, rideId:1` | unique, sparse, partial |
| `bookingType:1, lawyerBookingId:1` | unique, sparse, partial |
| `bookingType:1, doctorRequestId:1` | unique, sparse, partial |
| `bookingRef:1` | unique, sparse, partial |

### `departments` — Department

source `Department.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `name` | String | yes |  |  |  |  |  |
| `description` | String |  |  | "" |  |  |  |
| `head` | String |  |  | "" |  |  |  |
| `active` | Boolean |  |  | true |  |  |  |
| `fees_structure` | Number |  |  | 0 |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `dietorders` — DietOrder

source `DietOrder.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Health, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `orderId` | String | yes | yes |  |  |  |  |
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `patientName` | String | yes |  |  |  |  | Identity |
| `admissionId` | ObjectId |  |  |  |  | Admission |  |
| `ward` | String |  |  |  |  |  |  |
| `bedNumber` | String |  |  |  |  |  |  |
| `doctorId` | ObjectId | yes |  |  |  | User | Identifier |
| `doctorName` | String | yes |  |  |  |  | Identity |
| `dietType` | String | yes |  |  | Regular, Diabetic, Low Sodium, Liquid, Soft, High Protein, Low Fat, Renal, NPO, Other |  |  |
| `mealTimes` | Array<Mixed> |  |  |  |  |  |  |
| `instructions` | String |  |  |  |  |  |  |
| `allergies` | String |  |  |  |  |  | Health |
| `status` | String |  |  | "Active" | Active, Completed, Cancelled |  |  |
| `reviewedByDietitian` | Boolean |  |  | false |  |  |  |
| `dietitianName` | String |  |  |  |  |  |  |
| `meals` | Array<subdocument> |  |  |  |  |  |  |
| `meals.mealType` | String |  |  |  | Breakfast, Lunch, Evening Snack, Dinner |  |  |
| `meals.date` | Date |  |  |  |  |  |  |
| `meals.items` | String |  |  |  |  |  |  |
| `meals.deliveredAt` | Date |  |  |  |  |  |  |
| `meals.deliveredBy` | String |  |  |  |  |  |  |
| `meals.confirmedByNurse` | Boolean |  |  | false |  |  |  |
| `meals.nurseName` | String |  |  |  |  |  |  |
| `meals.patientFeedback` | String |  |  |  | Good, Average, Poor, Not Eaten |  |  |
| `meals.feedbackNote` | String |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `orderId:1` | unique |
| `hospitalId:1` |  |

### `disputes` — Dispute

source `Dispute.js` · timestamps: yes · virtuals: 0 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `disputeId` | String | yes | yes |  |  |  |  |
| `raisedBy` | ObjectId | yes |  |  |  | User |  |
| `raisedByName` | String |  |  |  |  |  |  |
| `againstType` | String | yes |  |  | hospital, doctor, pharmacy, lab, clinic, patient |  |  |
| `againstId` | ObjectId |  |  |  |  |  |  |
| `againstName` | String |  |  |  |  |  |  |
| `reason` | String | yes |  |  |  |  |  |
| `description` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "Open" | Open, In Review, Resolved, Dismissed |  |  |
| `priority` | String |  |  | "Medium" | Low, Medium, High, Critical |  |  |
| `assignedTo` | ObjectId |  |  |  |  | User | Identifier |
| `resolution` | String |  |  | "" |  |  |  |
| `resolvedAt` | Date |  |  |  |  |  |  |
| `resolvedBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `disputeId:1` | unique |
| `status:1, createdAt:-1` |  |
| `raisedBy:1, createdAt:-1` |  |

### `doctors` — Doctor

source `Doctor.js` · timestamps: yes · virtuals: 29 · retention: Life of the provider relationship + 1 year (provider deletion flow) (docs/privacy/RETENTION.md) · PII: Contact, Identifier, Identity, Image/Biometric, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `doctorId` | String |  | yes |  |  |  | Identifier |
| `name` | String | yes |  |  |  |  | Identity |
| `specialization` | String | yes |  |  |  |  |  |
| `experience` | String |  |  | "1 year" |  |  |  |
| `rating` | Number |  |  | 0 |  |  |  |
| `patients` | Number |  |  | 0 |  |  |  |
| `available` | Boolean |  |  | true |  |  |  |
| `phone` | String |  |  | "" |  |  | Contact |
| `email` | String | yes | yes |  |  |  | Contact |
| `initials` | String |  |  | "" |  |  |  |
| `department` | String |  |  | "" |  |  |  |
| `consultation_fees` | Number |  |  | 500 |  |  |  |
| `location` | String |  |  | "" |  |  | Location |
| `profile_photo` | String |  |  | "" |  |  | Image/Biometric |
| `qualifications` | String |  |  | "" |  |  |  |
| `bio` | String |  |  | "" |  |  |  |
| `time_slots` | Array<Mixed> |  |  | ["09:00 AM","10:00 AM","11:00 AM","02:00 PM","03:00 PM","04:00 PM"] |  |  |  |
| `weekly_schedule` | Mixed |  |  | {"monday":true,"tuesday":true,"wednesday":true,"thursday":true,"friday":true,"sa… (109 chars) |  |  |  |
| `leaves` | Array<Mixed> |  |  | [] |  |  |  |
| `leaveBalance.sick` | Number |  |  | 12 |  |  |  |
| `leaveBalance.casual` | Number |  |  | 15 |  |  |  |
| `leaveBalance.earned` | Number |  |  | 20 |  |  |  |
| `leaveBalance.personal` | Number |  |  | 10 |  |  |  |
| `leaveBalance.maternity` | Number |  |  | 90 |  |  |  |
| `approved` | Boolean |  |  | false |  |  |  |
| `user_id` | ObjectId |  |  | null |  | User |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `facilityId` | ObjectId |  |  |  |  | Facility |  |
| `facilityType` | String |  |  | "" | hospital, clinic, lab, pharmacy, |  |  |
| `reviews_count` | Number |  |  | 0 |  |  |  |
| `signatureUrl` | String |  |  | "" |  |  | Image/Biometric |
| `settings.emergencyOnCall` | Boolean |  |  | false |  |  |  |
| `settings.refundGuarantee` | String |  |  | "auto-refund" | auto-refund, manual-review, no-refund |  |  |
| `settings.videoFee` | Number |  |  | 0 |  |  |  |
| `settings.inPersonFee` | Number |  |  | 0 |  |  |  |
| `settings.emergencyFee` | Number |  |  | 0 |  |  |  |
| `settings.followUpFee` | String |  |  | "" |  |  |  |
| `settings.followUpWindow` | String |  |  | "7 Days" |  |  |  |
| `settings.bufferTime` | String |  |  | "5 min" |  |  |  |
| `settings.vacationFrom` | String |  |  | "" |  |  |  |
| `settings.vacationTo` | String |  |  | "" |  |  |  |
| `settings.vacationReason` | String |  |  | "" |  |  |  |
| `settings.councilName` | String |  |  | "" |  |  |  |
| `settings.councilRegNo` | String |  |  | "" |  |  |  |
| `settings.councilYear` | String |  |  | "" |  |  |  |
| `settings.payoutUpi` | String |  |  | "" |  |  |  |
| `settings.payoutAccount` | String |  |  | "" |  |  |  |
| `settings.payoutIfsc` | String |  |  | "" |  |  |  |
| `doctor_type` | String |  |  | "hospital" | hospital, clinic |  |  |
| `languages` | Array<Mixed> |  |  | [] |  |  |  |
| `practice_type` | String |  |  | "" | private, corporate, |  |  |
| `areas_of_expertise` | Array<Mixed> |  |  | [] |  |  |  |
| `services_offered` | Array<Mixed> |  |  | [] |  |  |  |
| `surgeries_procedures` | Array<Mixed> |  |  | [] |  |  |  |
| `education` | Array<Mixed> |  |  | [] |  |  |  |
| `work_experience` | Array<Mixed> |  |  | [] |  |  |  |
| `memberships` | Array<Mixed> |  |  | [] |  |  |  |
| `awards` | Array<Mixed> |  |  | [] |  |  |  |
| `registrations` | Mixed |  |  | [function] |  |  |  |
| `clinic_reception_phone` | String |  |  | "" |  |  | Contact |
| `walk_in_accepted` | Boolean |  |  | false |  |  |  |
| `in_house_pharmacy` | Boolean |  |  | false |  |  |  |
| `in_house_lab` | Boolean |  |  | false |  |  |  |
| `admission_available` | Boolean |  |  | false |  |  |  |
| `emergency_consultation` | Boolean |  |  | false |  |  |  |
| `emergencySupport` | Boolean |  |  | false |  |  |  |
| `isEmergencyDutyActive` | Boolean |  |  | false |  |  |  |
| `activeDispatchRequestId` | ObjectId |  |  | null |  |  |  |
| `emergencyRadiusKm` | Number |  |  | 10 |  |  |  |
| `emergencyDoctorLocation.type` | String |  |  | "Point" | Point |  |  |
| `emergencyDoctorLocation.coordinates` | Array<Mixed> |  |  | [79.9864,23.1815] |  |  | Location |
| `emergencyDoctorLocation.lat` | Number |  |  | 23.1815 |  |  | Location |
| `emergencyDoctorLocation.lng` | Number |  |  | 79.9864 |  |  | Location |
| `emergencyDoctorLocation.h3Index8` | String |  |  | null |  |  |  |
| `emergencyDoctorLocation.h3Index9` | String |  |  | null |  |  |  |
| `emergencyDoctorLocation.lastUpdatedAt` | Date |  |  | null |  |  |  |
| `emergencyEquipmentKit` | Array<Mixed> |  |  | ["BLS Kit","Pulse Oximeter","BP Monitor","Nebulizer","Glucometer","Emergency Inj… (92 chars) |  |  |  |
| `refundOnMissedOrCancelled` | Boolean |  |  | true |  |  |  |
| `appointmentModes` | Array<Mixed> |  |  | ["chat","video","offline","home_visit","audio"] |  |  |  |
| `appointmentFees.chat` | Number |  |  | 300 |  |  |  |
| `appointmentFees.video` | Number |  |  | 500 |  |  |  |
| `appointmentFees.audio` | Number |  |  | 400 |  |  |  |
| `appointmentFees.offline` | Number |  |  | 500 |  |  |  |
| `appointmentFees.home_visit` | Number |  |  | 800 |  |  |  |
| `supportPlanPrices.oneTime` | Number |  |  | 0 |  |  |  |
| `supportPlanPrices.shortTerm` | Number |  |  | 0 |  |  |  |
| `supportPlanPrices.mediumTerm` | Number |  |  | 0 |  |  |  |
| `supportPlanPrices.longTerm` | Number |  |  | 0 |  |  |  |
| `chat_fee` | Number |  |  | 300 |  |  |  |
| `video_fee` | Number |  |  | 500 |  |  |  |
| `audio_fee` | Number |  |  | 400 |  |  |  |
| `offline_fee` | Number |  |  | 500 |  |  |  |
| `home_visit_fee` | Number |  |  | 1000 |  |  |  |
| `emergency_fee` | Number |  |  | 800 |  |  |  |
| `surgery_available` | Boolean |  |  | false |  |  |  |
| `home_visit` | Boolean |  |  | false |  |  |  |
| `payment_modes` | Array<Mixed> |  |  | ["Cash","UPI","Card"] |  |  |  |
| `opd_timings` | String |  |  | "9:00 AM – 5:00 PM" |  |  |  |
| `workingHours.start` | String |  |  | "09:00" |  |  |  |
| `workingHours.end` | String |  |  | "17:00" |  |  |  |
| `slotDuration` | Number |  |  | 15 |  |  |  |
| `bufferPerHour` | Number |  |  | 1 |  |  |  |
| `autoConfirmAppointment` | Boolean |  |  | null |  |  |  |
| `maxBookingsPerSlot` | Number |  |  | 1 |  |  |  |
| `disabled_time_slots` | Array<Mixed> |  |  | [] |  |  |  |
| `breakTime.start` | String |  |  | "" |  |  |  |
| `breakTime.end` | String |  |  | "" |  |  |  |
| `dateDisabledSlots` | Mixed |  |  | [function] |  |  |  |
| `bookingWindow.unit` | String |  |  | "weeks" | hours, days, weeks, months |  |  |
| `bookingWindow.value` | Number |  |  | 2 |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `doctorId:1` | unique, sparse |
| `email:1` | unique |
| `hospitalId:1` |  |
| `facilityId:1` |  |
| `activeDispatchRequestId:1` |  |
| `emergencyDoctorLocation.h3Index8:1` |  |
| `emergencyDoctorLocation.h3Index9:1` |  |
| `facilityId:1, approved:1` |  |
| `hospitalId:1, approved:1` |  |
| `specialization:1` |  |
| `department:1` |  |
| `emergencyDoctorLocation:2dsphere` |  |
| `isEmergencyDutyActive:1, emergencySupport:1` |  |
| `createdAt:-1` |  |

### `emergencies` — Emergency

source `Emergency.js` · timestamps: yes · virtuals: 0 · retention: Trip duration + 30 days (dispute window) (docs/privacy/RETENTION.md) · PII: Contact, Demographic, Health, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientName` | String |  |  | "Unknown" |  |  | Identity |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `age` | Number |  |  |  |  |  | Demographic |
| `gender` | String |  |  |  | Male, Female, Other |  | Demographic |
| `phone` | String |  |  |  |  |  | Contact |
| `condition` | String | yes |  |  |  |  | Health |
| `severity` | String |  |  | "Serious" | Critical, Serious, Stable |  |  |
| `status` | String |  |  | "Pending" | Pending, Assigned, Under Treatment, Stable, Transferred, Discharged, Rejected |  |  |
| `assignedDoctor` | ObjectId |  |  |  |  | User |  |
| `assignedDoctorName` | String |  |  |  |  |  |  |
| `notes` | Array<subdocument> |  |  |  |  |  |  |
| `notes.text` | String |  |  |  |  |  |  |
| `notes.timestamp` | Date |  |  | [function] |  |  |  |
| `notes.doctorName` | String |  |  |  |  |  | Identity |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `responseTime` | Number |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `emergencydoctorrequests` — EmergencyDoctorRequest

source `EmergencyDoctorRequest.js` · timestamps: yes · virtuals: 0 · retention: Trip duration + 30 days (dispute window) (docs/privacy/RETENTION.md) · PII: Contact, Credential, Demographic, Identifier, Identity, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `bookingId` | String |  | yes | [function] |  |  |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `patientName` | String |  |  | "" |  |  | Identity |
| `patientPhone` | String |  |  | "" |  |  |  |
| `patientAge` | Number |  |  | null |  |  |  |
| `patientGender` | String |  |  | "" |  |  |  |
| `bloodGroup` | String |  |  | "Unknown" |  |  | Demographic |
| `emergencyCategory` | String |  |  | "General Medical Emergency" |  |  |  |
| `symptomsDescription` | String |  |  | "" |  |  |  |
| `severity` | String |  |  | "Severe" |  |  |  |
| `pickupAddress` | String |  |  | "" |  |  | Location |
| `landmark` | String |  |  | "" |  |  |  |
| `pricing.consultationFee` | Number |  |  | 800 |  |  |  |
| `pricing.emergencySurcharge` | Number |  |  | 200 |  |  |  |
| `pricing.total` | Number |  |  | 1000 |  |  |  |
| `timeline` | Array<subdocument> |  |  |  |  |  |  |
| `timeline.stage` | String |  |  |  |  |  |  |
| `timeline.timestamp` | Date |  |  | [function] |  |  |  |
| `timeline.note` | String |  |  | "" |  |  |  |
| `timeline.coordinates` | Array<Mixed> |  |  |  |  |  | Location |
| `transitDistanceKm` | Number |  |  | 0 |  |  |  |
| `estimatedArrivalMinutes` | Number |  |  | 0 |  |  |  |
| `doctorLiveLocation.type` | String |  |  | "Point" | Point |  |  |
| `doctorLiveLocation.coordinates` | Array<Mixed> |  |  | [0,0] |  |  | Location |
| `doctorLiveLocation.updatedAt` | Date |  |  | [function] |  |  |  |
| `patientDetails.name` | String |  |  | "" |  |  | Identity |
| `patientDetails.age` | Number |  |  | null |  |  | Demographic |
| `patientDetails.gender` | String |  |  | "" | male, female, other, |  | Demographic |
| `patientDetails.phone` | String |  |  | "" |  |  | Contact |
| `symptomCategory` | String |  |  | "other" | chest_pain, high_fever, breathing_issue, severe_pain, injury, mental_health_crisis, other |  |  |
| `symptomNote` | String |  |  | "" |  |  |  |
| `consultationMode` | String |  |  | "video" | video, audio, chat, home_visit |  |  |
| `webrtcRoom.sessionId` | String |  |  | "" |  |  | Credential |
| `webrtcRoom.token` | String |  |  | "" |  |  |  |
| `webrtcRoom.startedAt` | Date |  |  | null |  |  |  |
| `webrtcRoom.endedAt` | Date |  |  | null |  |  |  |
| `severityScore` | Number |  |  | null |  |  |  |
| `location.type` | String |  |  | "Point" | Point |  | Location |
| `location.coordinates` | Array<Mixed> | yes |  |  |  |  | Location |
| `location.address` | String |  |  | "" |  |  | Contact |
| `pickupLocation.type` | String |  |  | "Point" | Point |  | Location |
| `pickupLocation.coordinates` | Array<Mixed> |  |  | [79.9864,23.1815] |  |  | Location |
| `status` | String |  |  | "searching" | searching, assigned, in_progress, completed, cancelled_by_user, cancelled_by_doctor, no_responders_found, escalated_to_ambulance |  |  |
| `currentSearchRadiusKm` | Number |  |  | 10 |  |  |  |
| `assignedDoctorId` | ObjectId |  |  | null |  | Doctor |  |
| `assignedDoctorUserId` | ObjectId |  |  | null |  | User |  |
| `assignedAt` | Date |  |  | null |  |  |  |
| `notified` | Array<subdocument> |  |  |  |  |  |  |
| `notified.providerId` | String |  |  |  |  |  | Identifier |
| `notified.userId` | String |  |  |  |  |  | Identifier |
| `everNotified` | Array<subdocument> |  |  |  |  |  |  |
| `everNotified.providerId` | String |  |  |  |  |  | Identifier |
| `acceptances` | Array<subdocument> |  |  |  |  |  |  |
| `acceptances.providerId` | String |  |  |  |  |  | Identifier |
| `acceptances.distanceKm` | Number |  |  |  |  |  |  |
| `acceptances.acceptedAt` | Date |  |  | [function] |  |  |  |
| `windowEndsAt` | Date |  |  | null |  |  |  |
| `retryCount` | Number |  |  | 0 |  |  |  |
| `retryAt` | Date |  |  | null |  |  |  |
| `retryRadii` | Array<Mixed> |  |  | [] |  |  |  |
| `dispatchLog` | Array<subdocument> |  |  |  |  |  |  |
| `dispatchLog.radiusKm` | Number |  |  |  |  |  |  |
| `dispatchLog.candidateCount` | Number |  |  |  |  |  |  |
| `dispatchLog.outcome` | String |  |  |  | assigned, no_response, no_acceptance, escalated |  |  |
| `dispatchLog.timestamp` | Date |  |  | [function] |  |  |  |
| `fee` | Number |  |  | 0 |  |  |  |
| `appointmentId` | ObjectId |  |  | null |  | Appointment |  |
| `cancelledAt` | Date |  |  | null |  |  |  |
| `cancelledBy` | String |  |  | "" | doctor, patient, |  |  |
| `cancellationReason` | String |  |  | "" |  |  |  |
| `completedAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `bookingId:1` | unique, sparse |
| `status:1` |  |
| `retryAt:1` |  |
| `createdAt:1` |  |
| `location:2dsphere` |  |

### `emergencyrequests` — EmergencyRequest

source `EmergencyRequest.js` · timestamps: yes · virtuals: 0 · retention: Trip duration + 30 days (dispute window) (docs/privacy/RETENTION.md) · PII: Contact, Demographic, Identifier, Identity, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `reporterMode` | String | yes |  |  | self, other |  |  |
| `patientDetails.name` | String |  |  | "" |  |  | Identity |
| `patientDetails.age` | Number |  |  | null |  |  | Demographic |
| `patientDetails.gender` | String |  |  | "" | male, female, other, |  | Demographic |
| `patientDetails.bloodGroup` | String |  |  | "" |  |  | Demographic |
| `patientDetails.knownAllergies` | String |  |  | "" |  |  |  |
| `patientDetails.knownConditions` | String |  |  | "" |  |  |  |
| `patientDetails.phone` | String |  |  | "" |  |  | Contact |
| `reporterOwnDetailsShared` | Boolean |  |  | false |  |  |  |
| `reporterDetails.name` | String |  |  | "" |  |  | Identity |
| `reporterDetails.phone` | String |  |  | "" |  |  | Contact |
| `category` | String |  |  | "" | accident, heart_attack, breathing_issue, burn, fall, stroke, other, |  |  |
| `location.type` | String |  |  | "Point" | Point |  | Location |
| `location.coordinates` | Array<Mixed> | yes |  |  |  |  | Location |
| `location.address` | String |  |  | "" |  |  | Contact |
| `location.accuracy` | Number |  |  | null |  |  | Location |
| `status` | String |  |  | "searching" | searching, assigned, en_route, completed, cancelled_by_user, no_responders_found |  |  |
| `requestMode` | String |  |  | "manual_select" | manual_select, auto_select_vehicle, auto_select_ambulance |  |  |
| `selectedVehicleTypes` | Array<Mixed> |  |  |  |  |  |  |
| `autoBookEnabled` | Boolean |  |  | false |  |  |  |
| `autoFindEnabled` | Boolean |  |  | false |  |  |  |
| `startingRadiusKm` | Number |  |  | 5 |  |  |  |
| `currentSearchRadiusKm` | Number |  |  | 5 |  |  |  |
| `currentSearchPhase` | String |  |  | "ambulance" | ambulance, vehicle |  |  |
| `assignedProviderId` | ObjectId |  |  | null |  |  |  |
| `assignedProviderType` | String |  |  | null | ambulance, rider, null |  |  |
| `assignedVehicleType` | String |  |  | null |  |  |  |
| `assignedHospitalId` | ObjectId |  |  | null |  | Hospital |  |
| `assignedAt` | Date |  |  | null |  |  |  |
| `selectedHospitalId` | ObjectId |  |  | null |  | Hospital |  |
| `notified` | Array<subdocument> |  |  |  |  |  |  |
| `notified.providerId` | String |  |  |  |  |  | Identifier |
| `notified.providerType` | String |  |  |  | ambulance, rider |  |  |
| `notified.userId` | String |  |  |  |  |  | Identifier |
| `everNotified` | Array<subdocument> |  |  |  |  |  |  |
| `everNotified.providerId` | String |  |  |  |  |  | Identifier |
| `acceptances` | Array<subdocument> |  |  |  |  |  |  |
| `acceptances.providerId` | String |  |  |  |  |  | Identifier |
| `acceptances.providerType` | String |  |  |  |  |  |  |
| `acceptances.userId` | String |  |  |  |  |  | Identifier |
| `acceptances.distanceKm` | Number |  |  |  |  |  |  |
| `acceptances.acceptedAt` | Date |  |  | [function] |  |  |  |
| `rejections` | Array<Mixed> |  |  |  |  |  |  |
| `windowEndsAt` | Date |  |  | null |  |  |  |
| `progressStage` | String |  |  | "assigned" | assigned, reached_pickup, heading_to_hospital, reached_hospital, completed |  |  |
| `progressLog` | Array<subdocument> |  |  |  |  |  |  |
| `progressLog.stage` | String |  |  |  |  |  |  |
| `progressLog.at` | Date |  |  | [function] |  |  |  |
| `dispatchLog` | Array<subdocument> |  |  |  |  |  |  |
| `dispatchLog.radiusKm` | Number |  |  |  |  |  |  |
| `dispatchLog.phase` | String |  |  |  | ambulance, vehicle |  |  |
| `dispatchLog.attemptNumber` | Number |  |  | 1 |  |  |  |
| `dispatchLog.candidateCount` | Number |  |  |  |  |  |  |
| `dispatchLog.acceptedProviderIds` | Array<Mixed> |  |  |  |  |  |  |
| `dispatchLog.outcome` | String |  |  |  | assigned, no_response, no_acceptance, escalated, booked |  |  |
| `dispatchLog.timestamp` | Date |  |  | [function] |  |  |  |
| `cancelledAt` | Date |  |  | null |  |  |  |
| `completedAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `status:1` |  |
| `createdAt:1` |  |
| `location:2dsphere` |  |

### `equipment` — Equipment

source `Equipment.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `name` | String | yes |  |  |  |  |  |
| `type` | String | yes |  |  | MRI, CT Scan, X-Ray, Ultrasound, ECG, EEG, Mammography, DEXA, PET Scan, Lab Analyzer, Centrifuge, Microscope, Other |  |  |
| `model` | String |  |  |  |  |  |  |
| `serialNumber` | String |  |  |  |  |  |  |
| `manufacturer` | String |  |  |  |  |  |  |
| `installationDate` | Date |  |  |  |  |  |  |
| `lastMaintenanceDate` | Date |  |  |  |  |  |  |
| `nextMaintenanceDate` | Date |  |  |  |  |  |  |
| `maintenanceInterval` | Number |  |  | 90 |  |  |  |
| `status` | String |  |  | "Operational" | Operational, Under Maintenance, Out of Service, Retired |  |  |
| `location` | String |  |  |  |  |  |  |
| `notes` | String |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `facilities` — Facility

source `Facility.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `facilityId` | String |  | yes |  |  |  |  |
| `name` | String | yes |  |  |  |  |  |
| `slug` | String |  | yes |  |  |  |  |
| `type` | String | yes |  |  | hospital, clinic, lab, pharmacy |  |  |
| `email` | String | yes |  |  |  |  |  |
| `phone` | String | yes |  |  |  |  |  |
| `address` | String | yes |  |  |  |  |  |
| `city` | String |  |  |  |  |  |  |
| `state` | String |  |  | "" |  |  |  |
| `pincode` | String |  |  | "" |  |  |  |
| `licenseNumber` | String | yes |  |  |  |  |  |
| `logo` | String |  |  | "" |  |  |  |
| `description` | String |  |  | "" |  |  |  |
| `specialties` | Array<Mixed> |  |  |  |  |  |  |
| `status` | String |  |  | "pending" | pending, approved, rejected, suspended |  |  |
| `rejectionReason` | String |  |  | "" |  |  |  |
| `rating` | Number |  |  | 0 |  |  |  |
| `reviewsCount` | Number |  |  | 0 |  |  |  |
| `subscriptionPlan` | String |  |  | "free" | free, basic, premium |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `establishedYear` | Number |  |  | null |  |  |  |
| `totalDoctors` | Number |  |  | 0 |  |  |  |
| `accreditations` | Array<Mixed> |  |  |  |  |  |  |
| `hospitalType` | String |  |  | "Private" |  |  |  |
| `emergency24x7` | Boolean |  |  | false |  |  |  |
| `emergencySupport` | Boolean |  |  | false |  |  |  |
| `refundOnMissedOrCancelled` | Boolean |  |  | true |  |  |  |
| `appointmentModes` | Array<Mixed> |  |  | ["chat","video","offline","home_visit","audio"] |  |  |  |
| `appointmentFees.chat` | Number |  |  | 300 |  |  |  |
| `appointmentFees.video` | Number |  |  | 500 |  |  |  |
| `appointmentFees.audio` | Number |  |  | 400 |  |  |  |
| `appointmentFees.offline` | Number |  |  | 500 |  |  |  |
| `appointmentFees.home_visit` | Number |  |  | 800 |  |  |  |
| `bedAvailability` | Number |  |  | 0 |  |  |  |
| `ambulanceService` | Boolean |  |  | false |  |  |  |
| `image` | String |  |  | "" |  |  |  |
| `nablNumber` | String |  |  | "" |  |  |  |
| `aerbNumber` | String |  |  | "" |  |  |  |
| `workingHours` | String |  |  | "8:00 AM - 8:00 PM" |  |  |  |
| `pathologistName` | String |  |  | "" |  |  |  |
| `pathologistQualification` | String |  |  | "" |  |  |  |
| `radiologistName` | String |  |  | "" |  |  |  |
| `radiologistQualification` | String |  |  | "" |  |  |  |
| `cardiologistName` | String |  |  | "" |  |  |  |
| `cardiologistQualification` | String |  |  | "" |  |  |  |
| `technicianName` | String |  |  | "" |  |  |  |
| `technicianRole` | String |  |  | "" |  |  |  |
| `technicianQualification` | String |  |  | "" |  |  |  |
| `technicianExperience` | String |  |  | "" |  |  |  |
| `timing.monday` | String |  |  | "8:00 AM - 8:00 PM" |  |  |  |
| `timing.tuesday` | String |  |  | "8:00 AM - 8:00 PM" |  |  |  |
| `timing.wednesday` | String |  |  | "8:00 AM - 8:00 PM" |  |  |  |
| `timing.thursday` | String |  |  | "8:00 AM - 8:00 PM" |  |  |  |
| `timing.friday` | String |  |  | "8:00 AM - 8:00 PM" |  |  |  |
| `timing.saturday` | String |  |  | "9:00 AM - 6:00 PM" |  |  |  |
| `timing.sunday` | String |  |  | "Closed" |  |  |  |
| `amenities.parking` | Boolean |  |  | false |  |  |  |
| `amenities.acWaitingArea` | Boolean |  |  | false |  |  |  |
| `amenities.wheelchairAccess` | Boolean |  |  | false |  |  |  |
| `amenities.cardPayment` | Boolean |  |  | false |  |  |  |
| `amenities.inHousePharmacy` | Boolean |  |  | false |  |  |  |
| `amenities.drinkingWater` | Boolean |  |  | false |  |  |  |
| `amenities.wifi` | Boolean |  |  | false |  |  |  |
| `amenities.homeVisit` | Boolean |  |  | false |  |  |  |
| `amenities.homeDelivery` | Boolean |  |  | false |  |  |  |
| `amenities.prescriptionUpload` | Boolean |  |  | false |  |  |  |
| `socialLinks.facebook` | String |  |  | "" |  |  |  |
| `socialLinks.instagram` | String |  |  | "" |  |  |  |
| `socialLinks.youtube` | String |  |  | "" |  |  |  |
| `location.type` | String |  |  | "Point" | Point |  |  |
| `location.coordinates` | Array<Mixed> |  |  |  |  |  |  |
| `settings.autoConfirmAppointment` | Boolean |  |  | true |  |  |  |
| `details` | Mixed |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `facilityId:1` | unique, sparse |
| `slug:1` | unique |
| `type:1` |  |
| `city:1` |  |
| `status:1` |  |
| `createdAt:1` |  |
| `type:1, status:1` |  |
| `location:2dsphere` |  |

### `familymembers` — FamilyMember

source `FamilyMember.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Contact, Demographic, Health, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `name` | String | yes |  |  |  |  | Identity |
| `relation` | String | yes |  |  | Spouse, Child, Parent, Sibling, Grandparent, Other |  |  |
| `gender` | String |  |  | "Other" | Male, Female, Other |  | Demographic |
| `dateOfBirth` | Date |  |  |  |  |  | Demographic |
| `phone` | String |  |  |  |  |  | Contact |
| `bloodGroup` | String |  |  |  |  |  | Demographic |
| `allergies` | String |  |  |  |  |  | Health |
| `medicalNotes` | String |  |  |  |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `patientId:1` |  |

### `featuredlistings` — FeaturedListing

source `FeaturedListing.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `facilityId` | ObjectId | yes |  |  |  |  |  |
| `facilityType` | String | yes |  |  | hospital, clinic, lab, pharmacy |  |  |
| `facilityName` | String |  |  |  |  |  |  |
| `startDate` | Date | yes |  |  |  |  |  |
| `endDate` | Date | yes |  |  |  |  |  |
| `placement` | String |  |  | "homepage" | homepage, category, search |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `placement:1, isActive:1` |  |
| `isActive:1, endDate:1` |  |

### `healthpackages` — HealthPackage

source `HealthPackage.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `name` | String | yes |  |  |  |  |  |
| `description` | String |  |  |  |  |  |  |
| `category` | String |  |  | "Basic" | Basic, Comprehensive, Cardiac, Diabetic, Women, Senior Citizen, Corporate, Other |  |  |
| `tests` | Array<Mixed> |  |  |  |  |  |  |
| `testNames` | Array<Mixed> |  |  |  |  |  |  |
| `originalPrice` | Number | yes |  |  |  |  |  |
| `packagePrice` | Number | yes |  |  |  |  |  |
| `discount` | Number |  |  | 0 |  |  |  |
| `popular` | Boolean |  |  | false |  |  |  |
| `homeCollectionAvailable` | Boolean |  |  | false |  |  |  |
| `reportTime` | String |  |  | "24-48 hrs" |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `facilityId` | ObjectId |  |  |  |  | Facility |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `facilityId:1` |  |

### `hospitals` — Hospital

source `Hospital.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | String |  | yes |  |  |  |  |
| `name` | String | yes |  |  |  |  |  |
| `slug` | String |  | yes |  |  |  |  |
| `email` | String | yes |  |  |  |  |  |
| `phone` | String | yes |  |  |  |  |  |
| `address` | String | yes |  |  |  |  |  |
| `city` | String |  |  |  |  |  |  |
| `state` | String |  |  | "" |  |  |  |
| `pincode` | String |  |  | "" |  |  |  |
| `licenseNumber` | String | yes |  |  |  |  |  |
| `website` | String |  |  | "" |  |  |  |
| `logo` | String |  |  | "" |  |  |  |
| `description` | String |  |  | "" |  |  |  |
| `specialties` | Array<Mixed> |  |  |  |  |  |  |
| `status` | String |  |  | "pending" | pending, approved, rejected, suspended |  |  |
| `rejectionReason` | String |  |  | "" |  |  |  |
| `rating` | Number |  |  | 0 |  |  |  |
| `reviewsCount` | Number |  |  | 0 |  |  |  |
| `subscriptionPlan` | String |  |  | "free" | free, basic, premium |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `establishedYear` | Number |  |  | null |  |  |  |
| `totalDoctors` | Number |  |  | 0 |  |  |  |
| `accreditations` | Array<Mixed> |  |  |  |  |  |  |
| `hospitalType` | String |  |  | "Private" |  |  |  |
| `emergency24x7` | Boolean |  |  | false |  |  |  |
| `emergencySupport` | Boolean |  |  | false |  |  |  |
| `refundOnMissedOrCancelled` | Boolean |  |  | true |  |  |  |
| `appointmentModes` | Array<Mixed> |  |  | ["chat","video","offline","home_visit","audio"] |  |  |  |
| `appointmentFees.chat` | Number |  |  | 300 |  |  |  |
| `appointmentFees.video` | Number |  |  | 500 |  |  |  |
| `appointmentFees.audio` | Number |  |  | 400 |  |  |  |
| `appointmentFees.offline` | Number |  |  | 500 |  |  |  |
| `appointmentFees.home_visit` | Number |  |  | 800 |  |  |  |
| `bedAvailability` | Number |  |  | 0 |  |  |  |
| `ambulanceService` | Boolean |  |  | false |  |  |  |
| `image` | String |  |  | "" |  |  |  |
| `amenities` | Array<Mixed> |  |  |  |  |  |  |
| `socialLinks.facebook` | String |  |  | "" |  |  |  |
| `socialLinks.instagram` | String |  |  | "" |  |  |  |
| `socialLinks.youtube` | String |  |  | "" |  |  |  |
| `location.type` | String |  |  | "Point" | Point |  |  |
| `location.coordinates` | Array<Mixed> |  |  |  |  |  |  |
| `insuranceAccepted` | Array<subdocument> |  |  |  |  |  |  |
| `insuranceAccepted.provider` | String |  |  |  |  |  |  |
| `insuranceAccepted.planType` | String |  |  |  |  |  |  |
| `paymentModes` | Array<Mixed> |  |  |  |  |  |  |
| `settings.autoConfirmAppointment` | Boolean |  |  | true |  |  |  |
| `workingHours.weekdays` | String |  |  | "9:00 AM - 6:00 PM" |  |  |  |
| `workingHours.saturday` | String |  |  | "9:00 AM - 2:00 PM" |  |  |  |
| `workingHours.sunday` | String |  |  | "Closed" |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` | unique, sparse |
| `slug:1` | unique |
| `city:1` |  |
| `status:1` |  |
| `createdAt:1` |  |
| `location:2dsphere` |  |

### `housekeepings` — Housekeeping

source `Housekeeping.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `taskId` | String | yes | yes |  |  |  |  |
| `room` | String | yes |  |  |  |  |  |
| `bedNumber` | String |  |  |  |  |  |  |
| `ward` | String |  |  |  |  |  |  |
| `type` | String | yes |  |  | Routine Cleaning, Deep Cleaning, Discharge Cleaning, Terminal Cleaning, Fumigation |  |  |
| `status` | String |  |  | "Pending" | Pending, In Progress, Completed, Verified |  |  |
| `assignedTo` | String |  |  |  |  |  |  |
| `notes` | String |  |  |  |  |  |  |
| `completedAt` | Date |  |  |  |  |  |  |
| `verifiedBy` | String |  |  |  |  |  |  |
| `verifiedAt` | Date |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `taskId:1` | unique |
| `hospitalId:1` |  |

### `insurances` — Insurance

source `Insurance.js` · timestamps: yes · virtuals: 0 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Health, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `claimId` | String | yes | yes |  |  |  |  |
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `patientName` | String | yes |  |  |  |  | Identity |
| `admissionId` | ObjectId |  |  |  |  | Admission |  |
| `insuranceProvider` | String | yes |  |  |  |  |  |
| `policyNumber` | String | yes |  |  |  |  |  |
| `insuranceId` | String |  |  |  |  |  |  |
| `tpaName` | String |  |  |  |  |  |  |
| `tpaContact` | String |  |  |  |  |  |  |
| `coverageType` | String |  |  | "Cashless" | Cashless, Reimbursement |  |  |
| `preAuthAttempts` | Array<subdocument> |  |  |  |  |  |  |
| `preAuthAttempts.attemptNumber` | Number | yes |  |  |  |  |  |
| `preAuthAttempts.requestedAmount` | Number | yes |  |  |  |  |  |
| `preAuthAttempts.status` | String |  |  | "Pending" | Pending, Approved, Partially Approved, Rejected |  |  |
| `preAuthAttempts.decisionAmount` | Number |  |  |  |  |  |  |
| `preAuthAttempts.denialReason` | String |  |  |  |  |  |  |
| `preAuthAttempts.requestedBy` | ObjectId |  |  |  |  | User |  |
| `preAuthAttempts.requestedAt` | Date |  |  | [function] |  |  |  |
| `preAuthAttempts.decidedBy` | ObjectId |  |  |  |  | User |  |
| `preAuthAttempts.decidedAt` | Date |  |  |  |  |  |  |
| `preAuthDenialReason` | String |  |  |  |  |  |  |
| `preAuthAmount` | Number |  |  |  |  |  |  |
| `preAuthStatus` | String |  |  | "Not Required" | Not Required, Pending, Approved, Partially Approved, Rejected |  |  |
| `preAuthDate` | Date |  |  |  |  |  |  |
| `preAuthExpiry` | Date |  |  |  |  |  |  |
| `claimAmount` | Number |  |  |  |  |  |  |
| `approvedAmount` | Number |  |  |  |  |  |  |
| `claimStatus` | String |  |  | "Not Filed" | Not Filed, Filed, Processing, Settled, Rejected |  |  |
| `claimDate` | Date |  |  |  |  |  |  |
| `settlementDate` | Date |  |  |  |  |  |  |
| `documents` | Array<subdocument> |  |  |  |  |  |  |
| `documents.name` | String |  |  |  |  |  | Identity |
| `documents.url` | String |  |  |  |  |  |  |
| `diagnosis` | String |  |  |  |  |  | Health |
| `treatmentPlan` | String |  |  |  |  |  |  |
| `estimatedCost` | Number |  |  |  |  |  |  |
| `remarks` | String |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `claimId:1` | unique |
| `hospitalId:1` |  |

### `integrationconfigs` — IntegrationConfig

source `IntegrationConfig.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `provider` | String | yes | yes |  |  |  |  |
| `label` | String | yes |  |  |  |  |  |
| `category` | String | yes |  |  | payment, sms, email, storage, maps, webhook, analytics, other |  |  |
| `isEnabled` | Boolean |  |  | false |  |  |  |
| `config` | Mixed |  |  | [function] |  |  |  |
| `webhooks` | Array<subdocument> |  |  |  |  |  |  |
| `webhooks.name` | String |  |  |  |  |  |  |
| `webhooks.url` | String |  |  |  |  |  |  |
| `webhooks.events` | Array<Mixed> |  |  |  |  |  |  |
| `webhooks.isActive` | Boolean |  |  | true |  |  |  |
| `webhooks.secret` | String |  |  |  |  |  |  |
| `webhooks.createdAt` | Date |  |  | [function] |  |  |  |
| `lastTestedAt` | Date |  |  |  |  |  |  |
| `lastTestStatus` | String |  |  | "untested" | success, failed, untested |  |  |
| `updatedBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `provider:1` | unique |
| `category:1, provider:1` |  |

### `inventories` — Inventory

source `Inventory.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `itemName` | String | yes |  |  |  |  |  |
| `category` | String | yes |  |  | Medical Supplies, Surgical Instruments, Disposables, Stationery, Cleaning, Electrical, Others |  |  |
| `itemCode` | String |  | yes |  |  |  |  |
| `unit` | String |  |  | "Pcs" | Pcs, Box, Pair, Set, Litre, Kg, Meter, Roll |  |  |
| `currentStock` | Number |  |  | 0 |  |  |  |
| `minStockLevel` | Number |  |  | 10 |  |  |  |
| `maxStockLevel` | Number |  |  | 500 |  |  |  |
| `unitPrice` | Number |  |  | 0 |  |  |  |
| `supplier` | String |  |  |  |  |  |  |
| `location` | String |  |  |  |  |  |  |
| `expiryDate` | Date |  |  |  |  |  |  |
| `batchNumber` | String |  |  |  |  |  |  |
| `transactionHistory` | Array<subdocument> |  |  |  |  |  |  |
| `transactionHistory.type` | String |  |  |  | Purchase, Issue, Return, Adjustment |  |  |
| `transactionHistory.quantity` | Number |  |  |  |  |  |  |
| `transactionHistory.date` | Date |  |  | [function] |  |  |  |
| `transactionHistory.reference` | String |  |  |  |  |  |  |
| `transactionHistory.doneBy` | String |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `itemCode:1` | unique |
| `hospitalId:1` |  |

### `labbookings` — LabBooking

source `LabBooking.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `bookingId` | String | yes | yes |  |  |  |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdForUserId` | ObjectId |  |  |  |  | User |  |
| `patientName` | String | yes |  |  |  |  | Identity |
| `patientPhone` | String |  |  |  |  |  |  |
| `patientEmail` | String |  |  |  |  |  |  |
| `tests` | Array<Mixed> |  |  |  |  |  |  |
| `testIds` | Array<Mixed> |  |  |  |  |  |  |
| `totalAmount` | Number | yes |  |  |  |  |  |
| `discountedAmount` | Number |  |  |  |  |  |  |
| `paymentStatus` | String |  |  | "Pending" | Pending, Partially Paid, Paid, Refunded |  |  |
| `status` | String |  |  | "Pending" | Pending, Confirmed, Sample Collected, Processing, Completed, Cancelled, Rescheduled |  |  |
| `bookingDate` | Date | yes |  |  |  |  |  |
| `timeSlot` | String |  |  |  |  |  |  |
| `visitType` | String |  |  | "Walk-in" | Walk-in, Home Collection, Appointment |  |  |
| `homeCollectionAddress` | String |  |  |  |  |  |  |
| `homeCollectionFee` | Number |  |  | 0 |  |  |  |
| `prescriptionUrl` | String |  |  |  |  |  |  |
| `prescriptionVerified` | Boolean |  |  | false |  |  |  |
| `isWalkin` | Boolean |  |  | false |  |  |  |
| `notes` | String |  |  |  |  |  |  |
| `reportUrl` | String |  |  |  |  |  |  |
| `reportReadyAt` | Date |  |  |  |  |  |  |
| `reportStatus` | String |  |  | "Pending Upload" | Pending Upload, Uploaded, Delivered |  |  |
| `reportDeliveryMode` | String |  |  | "Digital" | Digital, Courier, Pickup |  |  |
| `reportDeliveryFee` | Number |  |  | 0 |  |  |  |
| `reportDeliveredAt` | Date |  |  |  |  |  |  |
| `reportDeliveryTaskId` | ObjectId |  |  |  |  | PharmacyDelivery |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `bookingId:1` | unique |
| `createdBy:1` |  |
| `createdForUserId:1` |  |
| `hospitalId:1` |  |

### `laborders` — LabOrder

source `LabOrder.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Health, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `orderId` | String | yes | yes |  |  |  |  |
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `patientName` | String | yes |  |  |  |  | Identity |
| `doctorId` | ObjectId | yes |  |  |  | User | Identifier |
| `doctorName` | String | yes |  |  |  |  | Identity |
| `tests` | Array<subdocument> |  |  |  |  |  |  |
| `tests.testName` | String | yes |  |  |  |  |  |
| `tests.category` | String |  |  | "Blood" | Blood, Urine, Stool, Imaging, Cardiac, Other |  |  |
| `tests.priority` | String |  |  | "Routine" | Routine, Urgent, STAT |  |  |
| `tests.status` | String |  |  | "Ordered" | Ordered, Sample Needed, Sample Collected, Processing, Completed, Verified, Report Delivered |  |  |
| `tests.sampleId` | String |  |  |  |  |  |  |
| `tests.sampleType` | String |  |  |  |  |  |  |
| `tests.sampleCollectedAt` | Date |  |  |  |  |  |  |
| `tests.collectedBy` | String |  |  |  |  |  |  |
| `tests.resultValue` | String |  |  |  |  |  | Health |
| `tests.normalRange` | String |  |  |  |  |  |  |
| `tests.unit` | String |  |  |  |  |  |  |
| `tests.isAbnormal` | Boolean |  |  | false |  |  |  |
| `tests.isCritical` | Boolean |  |  | false |  |  |  |
| `tests.resultEnteredBy` | ObjectId |  |  |  |  | User |  |
| `tests.resultEnteredAt` | Date |  |  |  |  |  |  |
| `tests.verifiedBy` | ObjectId |  |  |  |  | User |  |
| `tests.verifiedByRole` | String |  |  |  |  |  |  |
| `tests.verifiedAt` | Date |  |  |  |  |  |  |
| `tests.verificationNotes` | String |  |  |  |  |  |  |
| `tests.rejectionReason` | String |  |  |  |  |  |  |
| `clinicalNotes` | String |  |  |  |  |  | Health |
| `status` | String |  |  | "Ordered" | Ordered, Sample Pending, Processing, Under Verification, Completed, Partially Completed, Cancelled |  |  |
| `priority` | String |  |  | "Routine" | Routine, Urgent, STAT |  |  |
| `sampleIds` | Array<Mixed> |  |  |  |  |  |  |
| `reportUrl` | String |  |  |  |  |  |  |
| `isBilled` | Boolean |  |  | false |  |  |  |
| `billAmount` | Number |  |  | 0 |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `facilityId` | ObjectId |  |  |  |  | Facility |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `orderId:1` | unique |
| `hospitalId:1` |  |
| `facilityId:1` |  |

### `lawyerbookings` — LawyerBooking

source `LawyerBooking.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Contact, Demographic, Identifier, Identity, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `bookingNumber` | String |  | yes | [function] |  |  |  |
| `caseThreadId` | ObjectId |  |  |  |  | LawyerBooking |  |
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `lawyerId` | ObjectId |  |  | null |  | User | Identifier |
| `category` | String | yes |  |  |  |  |  |
| `caseDescription` | String | yes |  |  |  |  |  |
| `firNumber` | String |  |  | "" |  |  |  |
| `policeStationName` | String |  |  | "" |  |  |  |
| `opposingPartyName` | String |  |  | "" |  |  |  |
| `urgency` | String |  |  | "normal" | normal, urgent |  |  |
| `consultationMode` | String |  |  | "in_person" | in_person, video, phone, chat |  |  |
| `scheduledDate` | Date |  |  | [function] |  |  |  |
| `scheduledTime` | String |  |  | "Immediate" |  |  |  |
| `budgetRange.min` | Number |  |  | 0 |  |  |  |
| `budgetRange.max` | Number |  |  | 5000 |  |  |  |
| `documents` | Array<Mixed> |  |  |  |  |  |  |
| `fee` | Number | yes |  |  |  |  |  |
| `isFollowUp` | Boolean |  |  | false |  |  |  |
| `targetLawyerOnly` | Boolean |  |  | false |  |  |  |
| `intakeSource` | String |  |  | "scheduled_profile_form" | quick_urgent_card, scheduled_profile_form |  |  |
| `broadcastFallbackAt` | Date |  |  |  |  |  |  |
| `location.type` | String |  |  | "Point" | Point |  | Location |
| `location.coordinates` | Array<Mixed> |  |  | [79.9864,23.1815] |  |  | Location |
| `location.lat` | Number |  |  | 23.1815 |  |  | Location |
| `location.lng` | Number |  |  | 79.9864 |  |  | Location |
| `location.address` | String |  |  | "" |  |  | Contact |
| `location.landmarkName` | String |  |  | "" |  |  | Location |
| `location.city` | String |  |  | "" |  |  | Location |
| `lawyerCurrentLocation.lat` | Number |  |  |  |  |  | Location |
| `lawyerCurrentLocation.lng` | Number |  |  |  |  |  | Location |
| `lawyerCurrentLocation.updatedAt` | Date |  |  |  |  |  |  |
| `bookingFor` | String |  |  | "self" | self, family, other |  |  |
| `familyMemberId` | ObjectId |  |  | null |  | FamilyMember |  |
| `otherPatient.name` | String |  |  | "" |  |  | Identity |
| `otherPatient.phone` | String |  |  | "" |  |  | Contact |
| `otherPatient.age` | Number |  |  |  |  |  | Demographic |
| `phone` | String |  |  | "" |  |  | Contact |
| `acknowledgeUrgent` | Boolean |  |  | false |  |  |  |
| `status` | String |  |  | "requested" | searching, requested, confirmed, in_progress, completed, declined_by_lawyer, cancelled_by_user, cancelled_by_lawyer, reschedule_proposed, no_responders_found |  |  |
| `notified` | Array<subdocument> |  |  |  |  |  |  |
| `notified.providerId` | String |  |  |  |  |  | Identifier |
| `notified.userId` | String |  |  |  |  |  | Identifier |
| `everNotified` | Array<subdocument> |  |  |  |  |  |  |
| `everNotified.providerId` | String |  |  |  |  |  | Identifier |
| `acceptances` | Array<subdocument> |  |  |  |  |  |  |
| `acceptances.providerId` | String |  |  |  |  |  | Identifier |
| `acceptances.distanceKm` | Number |  |  |  |  |  |  |
| `acceptances.acceptedAt` | Date |  |  | [function] |  |  |  |
| `rejections` | Array<Mixed> |  |  |  |  |  |  |
| `windowEndsAt` | Date |  |  | null |  |  |  |
| `retryCount` | Number |  |  | 0 |  |  |  |
| `retryAt` | Date |  |  | null |  |  |  |
| `retryRadii` | Array<Mixed> |  |  | [] |  |  |  |
| `currentSearchRadiusKm` | Number |  |  | 5 |  |  |  |
| `dispatchLog` | Array<subdocument> |  |  |  |  |  |  |
| `dispatchLog.radiusKm` | Number |  |  |  |  |  |  |
| `dispatchLog.candidateCount` | Number |  |  |  |  |  |  |
| `dispatchLog.outcome` | String |  |  |  | assigned, no_response, no_acceptance, escalated |  |  |
| `dispatchLog.timestamp` | Date |  |  | [function] |  |  |  |
| `proposedNewTime.date` | Date |  |  |  |  |  |  |
| `proposedNewTime.time` | String |  |  |  |  |  |  |
| `proposedNewTime.reason` | String |  |  | "" |  |  |  |
| `statusHistory` | Array<subdocument> |  |  |  |  |  |  |
| `statusHistory.status` | String |  |  |  |  |  |  |
| `statusHistory.at` | Date |  |  | [function] |  |  |  |
| `statusHistory.note` | String |  |  | "" |  |  |  |
| `startedAt` | Date |  |  |  |  |  |  |
| `completedAt` | Date |  |  |  |  |  |  |
| `settledAt` | Date |  |  |  |  |  |  |
| `settlementAmount` | Number |  |  | 0 |  |  |  |
| `finalCaseSummary` | String |  |  | "" |  |  |  |
| `caseNotes` | Array<subdocument> |  |  |  |  |  |  |
| `caseNotes.note` | String | yes |  |  |  |  |  |
| `caseNotes.sessionNumber` | Number |  |  | 1 |  |  |  |
| `caseNotes.authorRole` | String |  |  | "lawyer" |  |  |  |
| `caseNotes.createdAt` | Date |  |  | [function] |  |  |  |
| `isCaseClosed` | Boolean |  |  | false |  |  |  |
| `payment.method` | String |  |  | "pending" | demo_wallet, cash, pending, |  |  |
| `payment.status` | String |  |  | "pending" | pending, paid, failed |  |  |
| `payment.transactionRef` | String |  |  | "" |  |  |  |
| `payment.paidAt` | Date |  |  |  |  |  |  |
| `ratingByUser.stars` | Number |  |  |  |  |  |  |
| `ratingByUser.comment` | String |  |  | "" |  |  |  |
| `ratingByUser.ratedAt` | Date |  |  |  |  |  |  |
| `confidential` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `bookingNumber:1` | unique |
| `caseThreadId:1` |  |
| `userId:1` |  |
| `lawyerId:1` |  |
| `category:1` |  |
| `urgency:1` |  |
| `scheduledDate:1` |  |
| `isFollowUp:1` |  |
| `targetLawyerOnly:1` |  |
| `status:1` |  |
| `retryAt:1` |  |
| `isCaseClosed:1` |  |
| `createdAt:1` |  |
| `location:2dsphere` |  |

### `lawyerprofiles` — LawyerProfile

source `LawyerProfile.js` · timestamps: yes · virtuals: 0 · retention: Life of the provider relationship + 1 year (provider deletion flow) (docs/privacy/RETENTION.md) · PII: Financial, Identifier, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes | yes |  |  | User | Identifier |
| `barCouncilNumber` | String | yes | yes |  |  |  |  |
| `barCouncilCertUrl` | String |  |  | "" |  |  |  |
| `stateBarCouncil` | String | yes |  |  |  |  |  |
| `yearOfEnrollment` | Number | yes |  |  |  |  |  |
| `lawDegreeCertUrl` | String |  |  | "" |  |  |  |
| `govtIdType` | String |  |  | "Aadhaar" | Aadhaar, PAN, Voter ID, Passport, Other |  |  |
| `govtIdNumber` | String |  |  | "" |  |  |  |
| `govtIdNumberHash` | String |  |  | "" |  |  |  |
| `govtIdDocUrl` | String |  |  | "" |  |  |  |
| `practiceCategories` | Array<Mixed> |  |  |  |  |  |  |
| `yearsOfPractice` | Number |  |  | 1 |  |  |  |
| `courtsPracticedIn` | Array<Mixed> |  |  |  |  |  |  |
| `jurisdictionCity` | String |  |  | "Jabalpur" |  |  |  |
| `operatingCity` | String |  |  | "Jabalpur" |  |  |  |
| `lawFirmName` | String |  |  | "" |  |  |  |
| `bio` | String |  |  | "" |  |  |  |
| `languages` | Array<Mixed> |  |  |  |  |  |  |
| `consultationModes` | Array<Mixed> |  |  |  |  |  |  |
| `consultationFee` | Number |  |  | 800 |  |  |  |
| `followUpFee` | Number |  |  | 500 |  |  |  |
| `freeFirstConsultation` | Boolean |  |  | false |  |  |  |
| `sessionDuration` | Number |  |  | 30 |  |  |  |
| `bankDetails.accountHolder` | String |  |  | "" |  |  |  |
| `bankDetails.accountNumber` | String |  |  | "" |  |  | Financial |
| `bankDetails.ifsc` | String |  |  | "" |  |  | Financial |
| `bankDetails.upiId` | String |  |  | "" |  |  | Financial |
| `bankDetails.verified` | Boolean |  |  | false |  |  |  |
| `gstin` | String |  |  | "" |  |  | Financial |
| `settings.emergencyStandby` | Boolean |  |  | false |  |  |  |
| `settings.refundPolicy` | String |  |  | "lawyer_cancels_full" | lawyer_cancels_full, court_clash_reschedule, client_12h_full |  |  |
| `settings.feeSchedule.video30m` | Number |  |  | 0 |  |  |  |
| `settings.feeSchedule.chamberVisit` | Number |  |  | 0 |  |  |  |
| `settings.feeSchedule.bedsideVisit` | Number |  |  | 0 |  |  |  |
| `settings.feeSchedule.noticeDrafting` | Number |  |  | 0 |  |  |  |
| `settings.practicingCourts` | Array<Mixed> |  |  |  |  |  |  |
| `settings.privilegeLocked` | Boolean |  |  | true |  |  |  |
| `licenseExpiryDate` | Date |  |  | null |  |  |  |
| `verificationLastChecked` | Date |  |  | null |  |  |  |
| `nextVerificationDue` | Date |  |  | null |  |  |  |
| `verificationStatus` | String |  |  | "pending" | pending, verified, expired, under_review |  |  |
| `verificationDocuments` | Array<subdocument> |  |  |  |  |  |  |
| `verificationDocuments.kind` | String | yes |  |  | license_cert, state_cert, degree_cert, id_proof |  |  |
| `verificationDocuments.docUrl` | String | yes |  |  |  |  |  |
| `verificationDocuments.uploadedAt` | Date |  |  | [function] |  |  |  |
| `verificationDocuments.verifiedAt` | Date |  |  |  |  |  |  |
| `verificationDocuments.verifiedBy` | String |  |  | "" |  |  |  |
| `availableDays` | Array<Mixed> |  |  |  |  |  |  |
| `availableTimeSlots` | Array<subdocument> |  |  |  |  |  |  |
| `availableTimeSlots.start` | String |  |  | "10:00 AM" |  |  |  |
| `availableTimeSlots.end` | String |  |  | "06:00 PM" |  |  |  |
| `acceptsUrgent` | Boolean |  |  | true |  |  |  |
| `lawyerStatus` | String |  |  | "pending_approval" | pending_approval, active, rejected, suspended |  |  |
| `rejectionReason` | String |  |  | "" |  |  |  |
| `isAvailable` | Boolean |  |  | false |  |  |  |
| `lastLocationAt` | Date |  |  | null |  |  |  |
| `activeDispatchRequestId` | ObjectId |  |  | null |  |  |  |
| `isDocumentVerified` | Boolean |  |  | false |  |  |  |
| `rating.avg` | Number |  |  | 5 |  |  |  |
| `rating.count` | Number |  |  | 0 |  |  |  |
| `totalEarnings` | Number |  |  | 0 |  |  |  |
| `walletBalance` | Number |  |  | 0 |  |  |  |
| `lastWithdrawalAt` | Date |  |  |  |  |  |  |
| `casesHandled` | Number |  |  | 25 |  |  |  |
| `favorableOutcomesRate` | Number |  |  | 88 |  |  |  |
| `notableCases` | Array<Mixed> |  |  |  |  |  |  |
| `practiceType` | String |  |  | "independent" | independent, firm |  |  |
| `yearsAtCurrentPractice` | Number |  |  | 3 |  |  |  |
| `avgResponseMinutes` | Number |  |  | 12 |  |  |  |
| `currentSessionStatus` | String |  |  | "available" | available, in_session, offline |  |  |
| `faqs` | Array<subdocument> |  |  |  |  |  |  |
| `faqs.question` | String | yes |  |  |  |  |  |
| `faqs.answer` | String | yes |  |  |  |  |  |
| `awards` | Array<Mixed> |  |  |  |  |  |  |
| `isPoliceVerified` | Boolean |  |  | false |  |  |  |
| `policeVerificationDocUrl` | String |  |  | "" |  |  |  |
| `currentLocation.type` | String |  |  | "Point" | Point |  | Location |
| `currentLocation.coordinates` | Array<Mixed> |  |  | [79.9864,23.1815] |  |  | Location |
| `currentLocation.lat` | Number |  |  | 23.1815 |  |  | Location |
| `currentLocation.lng` | Number |  |  | 79.9864 |  |  | Location |
| `currentLocation.h3Index8` | String |  |  | null |  |  | Location |
| `currentLocation.h3Index9` | String |  |  | null |  |  | Location |
| `currentLocation.updatedAt` | Date |  |  | [function] |  |  | Location |
| `isOnlineForUrgent` | Boolean |  |  | false |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` | unique |
| `barCouncilNumber:1` | unique |
| `govtIdNumberHash:1` |  |
| `jurisdictionCity:1` |  |
| `operatingCity:1` |  |
| `acceptsUrgent:1` |  |
| `lawyerStatus:1` |  |
| `isAvailable:1` |  |
| `lastLocationAt:1` |  |
| `activeDispatchRequestId:1` |  |
| `currentLocation.h3Index8:1` |  |
| `currentLocation.h3Index9:1` |  |
| `isOnlineForUrgent:1` |  |
| `currentLocation:2dsphere` |  |

### `leaverequests` — LeaveRequest

source `LeaveRequest.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `doctorId` | ObjectId | yes |  |  |  | Doctor | Identifier |
| `doctorName` | String |  |  |  |  |  | Identity |
| `doctorEmail` | String |  |  |  |  |  |  |
| `leaveType` | String | yes |  |  | Sick Leave, Casual Leave, Earned Leave, Personal Leave, Maternity/Paternity Leave, Other |  |  |
| `startDate` | String | yes |  |  |  |  |  |
| `endDate` | String | yes |  |  |  |  |  |
| `reason` | String | yes |  |  |  |  |  |
| `status` | String |  |  | "Pending" | Pending, Approved, Rejected |  |  |
| `adminNotes` | String |  |  | "" |  |  |  |
| `reviewedBy` | ObjectId |  |  |  |  | User |  |
| `reviewedAt` | Date |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `licenses` — License

source `License.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `facilityId` | ObjectId | yes |  |  |  |  |  |
| `facilityType` | String | yes |  |  | hospital, lab, pharmacy, clinic |  |  |
| `facilityName` | String |  |  |  |  |  |  |
| `licenseType` | String | yes |  |  |  |  |  |
| `licenseNumber` | String | yes |  |  |  |  |  |
| `issuingAuthority` | String |  |  | "" |  |  |  |
| `issueDate` | Date | yes |  |  |  |  |  |
| `expiryDate` | Date | yes |  |  |  |  |  |
| `status` | String |  |  | "Active" | Active, Expiring Soon, Expired, Revoked |  |  |
| `documentUrl` | String |  |  | "" |  |  |  |
| `notes` | String |  |  | "" |  |  |  |
| `reminders` | Array<subdocument> |  |  |  |  |  |  |
| `reminders.daysBefore` | Number |  |  |  |  |  |  |
| `reminders.sentAt` | Date |  |  |  |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `status:1, expiryDate:1` |  |
| `facilityId:1, status:1` |  |

### `loginevents` — LoginEvent

source `LoginEvent.js` · timestamps: yes · virtuals: 0 · retention: 7 years (longer than the data they describe) (docs/privacy/RETENTION.md) · PII: Device/Network, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `ip` | String | yes |  |  |  |  | Device/Network |
| `deviceHash` | String | yes |  |  |  |  |  |
| `userAgent` | String |  |  | "" |  |  | Device/Network |
| `success` | Boolean |  |  | true |  |  |  |
| `anomalies` | Array<Mixed> |  |  | [] |  |  |  |
| `country` | String |  |  | null |  |  |  |
| `city` | String |  |  | null |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `deviceHash:1` |  |
| `createdAt:1` | TTL 15552000s |
| `userId:1, createdAt:-1` |  |

### `loyaltyearnrules` — LoyaltyEarnRule

source `LoyaltyEarnRule.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `action` | String |  | yes |  | appointment_completed, lab_order_completed, pharmacy_order_completed, review_submitted, referral_qualified, profile_completed |  |  |
| `points` | Number | yes |  |  |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `action:1` | unique |
| `isActive:1` |  |

### `loyaltyledgers` — LoyaltyLedger

source `LoyaltyLedger.js` · timestamps: yes · virtuals: 0 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `type` | String | yes |  |  | earn, redeem, expire, admin_adjustment, reverse |  |  |
| `points` | Number | yes |  |  |  |  |  |
| `reason` | String | yes |  |  |  |  |  |
| `refId` | ObjectId |  |  | null |  |  |  |
| `balanceAfter` | Number | yes |  |  |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `userId:1, createdAt:-1` |  |
| `type:1` |  |
| `userId:1, reason:1, refId:1` | unique, partial |

### `medicinedoselogs` — MedicineDoseLog

source `MedicineDoseLog.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `reminderId` | ObjectId | yes |  |  |  | MedicineReminder |  |
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `carePlanId` | ObjectId |  |  | null |  | ChronicCarePlan |  |
| `scheduledAt` | Date | yes |  |  |  |  |  |
| `status` | String | yes |  |  | taken, skipped, missed, snoozed_then_taken, snoozed_then_missed |  |  |
| `respondedAt` | Date |  |  | null |  |  |  |
| `snoozeCount` | Number |  |  | 0 |  |  |  |
| `note` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `reminderId:1` |  |
| `userId:1` |  |
| `userId:1, scheduledAt:-1` |  |
| `reminderId:1, scheduledAt:-1` |  |

### `medicinereminders` — MedicineReminder

source `MedicineReminder.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `patientId` | ObjectId |  |  |  |  | Patient | Identifier |
| `prescriptionId` | ObjectId |  |  | null |  | Prescription |  |
| `medicineName` | String | yes |  |  |  |  |  |
| `dosage` | String | yes |  |  |  |  |  |
| `form` | String |  |  | "Tablet" | Tablet, Capsule, Syrup, Injection, Inhaler, Drops, Ointment, Other |  |  |
| `frequency` | String |  |  | "once_daily" | once_daily, twice_daily, thrice_daily, custom |  |  |
| `times` | Array<Mixed> |  |  |  |  |  |  |
| `startDate` | Date |  |  | [function] |  |  |  |
| `endDate` | Date |  |  | null |  |  |  |
| `alarmSound.presetId` | String |  |  | "classic_alarm" | classic_alarm, digital_buzzer, gentle_rise, chime_cascade, custom |  |  |
| `alarmSound.customSoundUrl` | String |  |  | null |  |  |  |
| `autoMissAfterMinutes` | Number |  |  | 10 |  |  |  |
| `notifyDoctorOnMissThreshold` | Number |  |  | null |  |  |  |
| `instructions` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "active" | active, paused, completed |  |  |
| `carePlanId` | ObjectId |  |  | null |  | ChronicCarePlan |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |

### `medicines` — Medicine

source `Medicine.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `name` | String | yes |  |  |  |  |  |
| `genericName` | String | yes |  |  |  |  |  |
| `category` | String | yes |  |  | Antibiotic, Analgesic, Antihypertensive, Antidiabetic, Antacid, Antihistamine, Antiviral, Antifungal, Vitamin, Steroid, Anesthetic, Diuretic, Cardiac, Respiratory, Prescription, OTC, Generic, Baby Care, Ayurvedic, Devices, Vitamins, Supplements, Personal Care, Other |  |  |
| `form` | String | yes |  |  | Tablet, Capsule, Syrup, Injection, Drop, Cream, Inhaler, Infusion, Other |  |  |
| `manufacturer` | String | yes |  |  |  |  |  |
| `batchNumber` | String | yes |  |  |  |  |  |
| `expiryDate` | Date | yes |  |  |  |  |  |
| `purchasePrice` | Number | yes |  |  |  |  |  |
| `sellingPrice` | Number | yes |  |  |  |  |  |
| `currentStock` | Number | yes |  | 0 |  |  |  |
| `reorderLevel` | Number |  |  | 10 |  |  |  |
| `prescriptionReq` | Boolean |  |  | false |  |  |  |
| `rackLocation` | String |  |  | "" |  |  |  |
| `interactions` | Array<Mixed> |  |  |  |  |  |  |
| `contraindications` | Array<Mixed> |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `facilityId` | ObjectId |  |  |  |  | Facility |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `facilityId:1` |  |

### `mentalhealths` — MentalHealth

source `MentalHealth.js` · timestamps: yes · virtuals: 0 · retention: Clinical statutory period, plus the consent validity period (docs/privacy/RETENTION.md) · PII: Contact, Health, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `referralId` | String | yes | yes |  |  |  |  |
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `patientName` | String | yes |  |  |  |  | Identity |
| `referralSource` | String |  |  | "Doctor" | Doctor, Self, Family, Emergency |  |  |
| `referrerName` | String |  |  |  |  |  |  |
| `assessment.mentalStatus` | String |  |  |  |  |  |  |
| `assessment.personalHistory` | String |  |  |  |  |  |  |
| `assessment.familyHistory` | String |  |  |  |  |  |  |
| `assessment.socialHistory` | String |  |  |  |  |  |  |
| `assessment.riskAssessment` | String |  |  |  | Low, Medium, High, Immediate |  |  |
| `assessment.diagnosis` | String |  |  |  |  |  | Health |
| `assessment.diagnosisCode` | String |  |  |  |  |  |  |
| `treatmentPlan` | String |  |  |  |  |  |  |
| `treatmentType` | String |  |  |  | Medication, Therapy, Counseling, Combined |  |  |
| `sessions` | Array<Mixed> |  |  |  |  |  |  |
| `medications` | Array<subdocument> |  |  |  |  |  | Health |
| `medications.name` | String |  |  |  |  |  | Health |
| `medications.dosage` | String |  |  |  |  |  | Health |
| `medications.frequency` | String |  |  |  |  |  | Health |
| `medications.prescribedBy` | String |  |  |  |  |  | Health |
| `medications.prescribedAt` | Date |  |  |  |  |  | Health |
| `familyInvolvement` | Array<subdocument> |  |  |  |  |  |  |
| `familyInvolvement.familyMemberName` | String |  |  |  |  |  |  |
| `familyInvolvement.relationship` | String |  |  |  |  |  |  |
| `familyInvolvement.involvementType` | String |  |  |  | Support, Caregiver, Decision Maker |  |  |
| `familyInvolvement.notes` | String |  |  |  |  |  |  |
| `familyInvolvement.contactNumber` | String |  |  |  |  |  | Contact |
| `familyInvolvement.addedBy` | String |  |  |  |  |  |  |
| `familyInvolvement.addedAt` | Date |  |  | [function] |  |  |  |
| `consents` | Array<subdocument> |  |  |  |  |  |  |
| `consents.consentType` | String |  |  |  | Treatment Consent, Medication Consent, Data Sharing, Discharge Consent |  |  |
| `consents.documentUrl` | String |  |  |  |  |  |  |
| `consents.signedBy` | String |  |  |  |  |  |  |
| `consents.signedAt` | Date |  |  | [function] |  |  |  |
| `consents.expiryDate` | Date |  |  |  |  |  |  |
| `consents.notes` | String |  |  |  |  |  |  |
| `consents.purposes` | Array<Mixed> |  |  |  |  |  |  |
| `consents.retentionDays` | Number |  |  |  |  |  |  |
| `consents.grantedAt` | Date |  |  | [function] |  |  |  |
| `consents.renewedFrom` | String |  |  | null |  |  |  |
| `consents.status` | String |  |  | "Active" | Active, Expired, Revoked |  |  |
| `screenings` | Array<subdocument> |  |  |  |  |  |  |
| `screenings.instrument` | String | yes |  |  | PHQ-9, GAD-7 |  |  |
| `screenings.responses` | Mixed | yes |  |  |  |  |  |
| `screenings.total` | Number | yes |  |  |  |  |  |
| `screenings.maxScore` | Number | yes |  |  |  |  |  |
| `screenings.severity` | String | yes |  |  |  |  |  |
| `screenings.suicidalityFlagged` | Boolean |  |  | false |  |  |  |
| `screenings.referralSuggested` | Boolean |  |  | false |  |  |  |
| `screenings.completedAt` | Date |  |  | [function] |  |  |  |
| `screenings.completedBy` | String |  |  |  |  |  |  |
| `confidentiality` | Boolean |  |  | true |  |  |  |
| `consentToShare` | Boolean |  |  | false |  |  |  |
| `status` | String |  |  | "Active" | Active, Completed, Discontinued, Referred |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `dataClassification` | String |  |  | "PSYCHIATRIC_SPECIAL_CATEGORY" | PSYCHIATRIC_SPECIAL_CATEGORY |  |  |
| `purposeOfProcessing` | String |  |  | "Assessment" | Assessment, Direct Care, Crisis Intervention, Court Ordered, Insurance Claim, Family Support |  |  |
| `consentBasis.grantedBy` | String |  |  | "Patient" | Patient, Guardian, Court Order, Emergency |  |  |
| `consentBasis.consentRecordedAt` | Date |  |  | [function] |  |  |  |
| `consentBasis.consentReference` | String |  |  | "" |  |  |  |
| `consentBasis.scope` | String |  |  | "Care Team Only" | Care Team Only, Care Team + Family, Care Team + Insurer |  |  |
| `consentBasis.explicitlyRefused.marketing` | Boolean |  |  | false |  |  |  |
| `consentBasis.explicitlyRefused.research` | Boolean |  |  | false |  |  |  |
| `consentBasis.explicitlyRefused.thirdPartyDisclosure` | Boolean |  |  | false |  |  |  |
| `crisisEvents` | Array<subdocument> |  |  |  |  |  |  |
| `crisisEvents.flaggedAt` | Date |  |  | [function] |  |  |  |
| `crisisEvents.severity` | String | yes |  |  | Medium, High, Immediate |  |  |
| `crisisEvents.risk` | String |  |  | "" |  |  |  |
| `crisisEvents.responseDueAt` | Date | yes |  |  |  |  |  |
| `crisisEvents.acknowledgedAt` | Date |  |  | null |  |  |  |
| `crisisEvents.acknowledgedBy` | ObjectId |  |  | null |  | User |  |
| `crisisEvents.escalatedAt` | Date |  |  | null |  |  |  |
| `crisisEvents.escalatedTo` | String |  |  | "" |  |  |  |
| `crisisEvents.actionTaken` | String |  |  | "" |  |  |  |
| `crisisEvents.resolvedAt` | Date |  |  | null |  |  |  |
| `crisisEvents.notes` | String |  |  | "" |  |  |  |
| `openCrisisCount` | Number |  |  | 0 |  |  |  |
| `lastCrisisAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `referralId:1` | unique |
| `hospitalId:1` |  |
| `crisisEvents.acknowledgedAt:1, crisisEvents.responseDueAt:1` |  |
| `patientId:1, createdAt:-1` |  |

### `notificationaudits` — NotificationAudit

source `NotificationAudit.js` · virtuals: 0 · retention: 7 years (longer than the data they describe) (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | String | yes |  |  |  |  | Identifier |
| `type` | String | yes |  |  |  |  |  |
| `priority` | String |  |  | "normal" | critical, normal |  |  |
| `outcome` | String | yes |  |  | sent, suppressed, duplicate |  |  |
| `reason` | String |  |  | null |  |  |  |
| `notificationId` | String |  |  | null |  |  |  |
| `dedupKey` | String |  |  | null |  |  |  |
| `metadata` | Mixed |  |  | null |  |  |  |
| `actor` | String |  |  | "system" |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `type:1` |  |
| `outcome:1` |  |
| `createdAt:1` |  |
| `userId:1, createdAt:-1` |  |
| `outcome:1, createdAt:-1` |  |

### `notificationdeliveries` — NotificationDelivery

source `NotificationDelivery.js` · virtuals: 0 · retention: 90 days (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `notificationId` | String | yes |  |  |  |  |  |
| `userId` | String | yes |  |  |  |  | Identifier |
| `channel` | String | yes |  |  | email, sms, push, inApp |  |  |
| `status` | String |  |  | "queued" | queued, sent, delivered, failed, dead-letter |  |  |
| `attempts` | Array<subdocument> |  |  | [] |  |  |  |
| `attempts.attempt` | Number | yes |  |  |  |  |  |
| `attempts.at` | Date |  |  | [function] |  |  |  |
| `attempts.ok` | Boolean | yes |  |  |  |  |  |
| `attempts.errorCode` | String |  |  | null |  |  |  |
| `attempts.error` | String |  |  | null |  |  |  |
| `attemptCount` | Number |  |  | 0 |  |  |  |
| `providerMessageId` | String |  |  | null |  |  |  |
| `lastError` | String |  |  | null |  |  |  |
| `nextAttemptAt` | Date |  |  | null |  |  |  |
| `deadLetteredAt` | Date |  |  | null |  |  |  |
| `readAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `notificationId:1` |  |
| `userId:1` |  |
| `status:1` |  |
| `status:1, nextAttemptAt:1` |  |
| `userId:1, createdAt:-1` |  |
| `notificationId:1, channel:1` | unique |

### `notificationpreferences` — NotificationPreference

source `NotificationPreference.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Contact, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | String | yes | yes |  |  |  | Identifier |
| `channels.inApp` | Boolean |  |  | true |  |  |  |
| `channels.email` | Boolean |  |  | true |  |  | Contact |
| `channels.sms` | Boolean |  |  | true |  |  |  |
| `channels.push` | Boolean |  |  | true |  |  |  |
| `marketingOptIn` | Boolean |  |  | true |  |  |  |
| `mutedTypes` | Array<Mixed> |  |  | [] |  |  |  |
| `quietHours` | Subdocument |  |  | [function] |  |  |  |
| `quietHours.enabled` | Boolean |  |  | false |  |  |  |
| `quietHours.startMinute` | Number |  |  | 1320 |  |  |  |
| `quietHours.endMinute` | Number |  |  | 420 |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` | unique |

### `notifications` — Notification

source `Notification.js` · timestamps: yes · virtuals: 0 · retention: 90 days (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `title` | String | yes |  |  |  |  |  |
| `message` | String | yes |  |  |  |  |  |
| `type` | String |  |  | "system" | reminder, payment, appointment, records, system, ride, assistant, lawyer, lab, sos, billing, emergency, prescription, radiology, token |  |  |
| `read` | Boolean |  |  | false |  |  |  |
| `userId` | String | yes |  |  |  |  | Identifier |
| `referenceId` | String |  |  | null |  |  |  |
| `date` | String |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `details` | Mixed |  |  | null |  |  |  |
| `pushTitle` | String |  |  | null |  |  |  |
| `pushBody` | String |  |  | null |  |  |  |
| `priority` | String |  |  | "normal" | critical, normal |  |  |
| `dedupKey` | String |  |  | null |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `referenceId:1` |  |
| `userId:1, read:1` |  |
| `userId:1, dedupKey:1` | unique, partial |

### `nursingcharts` — NursingChart

source `NursingChart.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Health, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `patientName` | String | yes |  |  |  |  | Identity |
| `admissionId` | ObjectId |  |  |  |  | Admission |  |
| `shift` | String | yes |  |  | Morning, Evening, Night |  |  |
| `date` | Date |  |  | [function] |  |  |  |
| `chartType` | String |  |  | "Vitals" | Vitals, MAR, InputOutput, WoundDressing, General |  |  |
| `recordedBy` | ObjectId | yes |  |  |  | User |  |
| `recordedByName` | String | yes |  |  |  |  |  |
| `vitals.bpSystolic` | Number |  |  |  |  |  | Health |
| `vitals.bpDiastolic` | Number |  |  |  |  |  | Health |
| `vitals.heartRate` | Number |  |  |  |  |  | Health |
| `vitals.respRate` | Number |  |  |  |  |  | Health |
| `vitals.temperature` | Number |  |  |  |  |  | Health |
| `vitals.spO2` | Number |  |  |  |  |  | Health |
| `vitals.bloodSugar` | Number |  |  |  |  |  | Health |
| `vitals.painScale` | Number |  |  |  |  |  | Health |
| `vitals.urineOutput` | Number |  |  |  |  |  | Health |
| `vitals.stool` | String |  |  |  |  |  | Health |
| `medicationAdmin.medicineName` | String |  |  |  |  |  |  |
| `medicationAdmin.dosage` | String |  |  |  |  |  |  |
| `medicationAdmin.route` | String |  |  |  |  |  |  |
| `medicationAdmin.time` | String |  |  |  |  |  |  |
| `medicationAdmin.status` | String |  |  | "Given" | Given, Refused, Missed, Held |  |  |
| `medicationAdmin.reason` | String |  |  |  |  |  |  |
| `woundDressing.woundSite` | String |  |  |  |  |  |  |
| `woundDressing.appearance` | String |  |  |  |  |  |  |
| `woundDressing.size` | String |  |  |  |  |  |  |
| `woundDressing.dressingType` | String |  |  |  |  |  |  |
| `woundDressing.notes` | String |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `notes` | String |  |  |  |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `operationtheatres` — OperationTheatre

source `OperationTheatre.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Health, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `otId` | String | yes | yes |  |  |  |  |
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `patientName` | String | yes |  |  |  |  | Identity |
| `doctorId` | ObjectId | yes |  |  |  | User | Identifier |
| `doctorName` | String | yes |  |  |  |  | Identity |
| `surgeryName` | String | yes |  |  |  |  |  |
| `surgeryType` | String |  |  | "Elective" | Elective, Emergency, Urgent |  |  |
| `anaesthesiaType` | String |  |  | "General" | General, Spinal, Epidural, Local, Sedation, Not Required |  |  |
| `assistants` | Array<Mixed> |  |  |  |  |  |  |
| `preOpChecklist.consentSigned` | Boolean |  |  | false |  |  |  |
| `preOpChecklist.bloodGroupConfirmed` | Boolean |  |  | false |  |  |  |
| `preOpChecklist.anaesthesiaFitness` | Boolean |  |  | false |  |  |  |
| `preOpChecklist.npoStatus` | Boolean |  |  | false |  |  |  |
| `preOpChecklist.allergiesChecked` | Boolean |  |  | false |  |  |  |
| `preOpChecklist.implantsReady` | Boolean |  |  | false |  |  |  |
| `preOpChecklist.siteMarked` | Boolean |  |  | false |  |  |  |
| `preOpChecklist.investigationsReviewed` | Boolean |  |  | false |  |  |  |
| `preOpVitals.bp` | String |  |  |  |  |  |  |
| `preOpVitals.hr` | Number |  |  |  |  |  |  |
| `preOpVitals.temp` | Number |  |  |  |  |  |  |
| `preOpVitals.spO2` | Number |  |  |  |  |  | Health |
| `preOpVitals.weight` | Number |  |  |  |  |  |  |
| `surgeonSignature` | String |  |  |  |  |  |  |
| `anesthetistSignature` | String |  |  |  |  |  |  |
| `otNumber` | String |  |  |  |  |  |  |
| `scheduledDate` | Date |  |  |  |  |  |  |
| `startTime` | Date |  |  |  |  |  |  |
| `endTime` | Date |  |  |  |  |  |  |
| `totalDuration` | Number |  |  |  |  |  |  |
| `instrumentsCount.before` | Number |  |  | 0 |  |  |  |
| `instrumentsCount.after` | Number |  |  | 0 |  |  |  |
| `instrumentsCount.correct` | Boolean |  |  |  |  |  |  |
| `spongeCount.before` | Number |  |  | 0 |  |  |  |
| `spongeCount.after` | Number |  |  | 0 |  |  |  |
| `spongeCount.correct` | Boolean |  |  |  |  |  |  |
| `findings` | String |  |  |  |  |  |  |
| `procedure` | String |  |  |  |  |  |  |
| `complications` | String |  |  |  |  |  |  |
| `postOpInstructions` | String |  |  |  |  |  |  |
| `status` | String |  |  | "Scheduled" | Scheduled, Pre-Op, In Progress, Recovery, Completed, Cancelled |  |  |
| `recoveryNotes` | String |  |  |  |  |  |  |
| `recoveryVitals` | Array<subdocument> |  |  |  |  |  |  |
| `recoveryVitals.time` | Date |  |  |  |  |  |  |
| `recoveryVitals.bp` | String |  |  |  |  |  |  |
| `recoveryVitals.hr` | Number |  |  |  |  |  |  |
| `recoveryVitals.spO2` | Number |  |  |  |  |  | Health |
| `recoveryVitals.consciousness` | String |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `otId:1` | unique |
| `hospitalId:1` |  |

### `otps` — OTP

source `OTP.js` · timestamps: yes · virtuals: 0 · retention: 15–60 minutes (TTL index) — tokens until logout or expiry (docs/privacy/RETENTION.md) · PII: Contact, Credential

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `user` | ObjectId | yes |  |  |  | User |  |
| `email` | String | yes |  |  |  |  | Contact |
| `otpHash` | String | yes |  |  |  |  | Credential |
| `hashAlgo` | String |  |  | "unknown" | rust-sha256, js-sha256-fallback, bcrypt, unknown |  |  |
| `type` | String |  |  | "email" | email, sms, password_reset |  |  |
| `phone` | String |  |  | "" |  |  | Contact |
| `used` | Boolean |  |  | false |  |  |  |
| `expiresAt` | Date |  |  |  |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `lastRequestAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `email:1` |  |
| `used:1` |  |
| `expiresAt:1` |  |
| `lastRequestAt:1` |  |
| `email:1, used:1, expiresAt:1` |  |
| `createdAt:1` | TTL 3600s |

### `outboxevents` — OutboxEvent

source `OutboxEvent.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `aggregateType` | String | yes |  |  | ride, lawyer, assistant, emergency_sos, emergency_doctor, payment, user, provider, Prescription, RideBooking, LawyerBooking, AssistantBooking, EmergencyRequest, PharmacyOrder |  |  |
| `aggregateId` | String | yes |  |  |  |  |  |
| `eventType` | String | yes |  |  |  |  |  |
| `payload` | Mixed | yes |  |  |  |  |  |
| `destinationTopic` | String | yes |  | "findmedi.dispatch.booking-events.v1" |  |  |  |
| `status` | String |  |  | "PENDING" | PENDING, PROCESSING, PUBLISHED, FAILED |  |  |
| `retryCount` | Number |  |  | 0 |  |  |  |
| `nextAttemptAt` | Date |  |  | null |  |  |  |
| `lastError` | String |  |  | null |  |  |  |
| `publishedAt` | Date |  |  | null |  |  |  |
| `processingAt` | Date |  |  | null |  |  |  |
| `processingBy` | String |  |  | null |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `aggregateType:1` |  |
| `aggregateId:1` |  |
| `eventType:1` |  |
| `status:1` |  |
| `nextAttemptAt:1` |  |
| `processingAt:1` |  |
| `status:1, createdAt:1` |  |
| `status:1, nextAttemptAt:1` |  |
| `status:1, processingAt:1` |  |

### `patientaddresses` — PatientAddress

source `PatientAddress.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Contact, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `label` | String |  |  | "Home" |  |  |  |
| `address` | String | yes |  |  |  |  | Contact |
| `city` | String |  |  |  |  |  |  |
| `state` | String |  |  |  |  |  |  |
| `pincode` | String |  |  |  |  |  | Contact |
| `phone` | String |  |  |  |  |  | Contact |
| `isDefault` | Boolean |  |  | false |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `patientId:1` |  |

### `patients` — Patient

source `Patient.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Contact, Demographic, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `name` | String | yes |  |  |  |  | Identity |
| `age` | Number | yes |  |  |  |  | Demographic |
| `gender` | String | yes |  |  | Male, Female, Other |  | Demographic |
| `disease` | String |  |  | "" |  |  |  |
| `doctor` | String |  |  | "" |  |  |  |
| `doctorId` | ObjectId |  |  |  |  | Doctor | Identifier |
| `userId` | ObjectId |  |  |  |  | User | Identifier |
| `uhid` | String |  | yes |  |  |  |  |
| `phone` | String |  |  | "" |  |  | Contact |
| `email` | String |  |  | "" |  |  | Contact |
| `address` | String |  |  | "" |  |  | Contact |
| `bloodGroup` | String |  |  | "" |  |  | Demographic |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `birthRecord.placeOfBirth` | String |  |  |  |  |  |  |
| `birthRecord.attendingDoctor` | String |  |  |  |  |  |  |
| `birthRecord.certificateGenerated` | Boolean |  |  | false |  |  |  |
| `birthRecord.certificateUrl` | String |  |  |  |  |  |  |
| `deathRecord.dateOfDeath` | Date |  |  |  |  |  |  |
| `deathRecord.causeOfDeath` | String |  |  |  |  |  |  |
| `deathRecord.attendingDoctor` | String |  |  |  |  |  |  |
| `deathRecord.certificateGenerated` | Boolean |  |  | false |  |  |  |
| `deathRecord.certificateUrl` | String |  |  |  |  |  |  |
| `infectiousDisease` | Array<subdocument> |  |  |  |  |  |  |
| `infectiousDisease.disease` | String | yes |  |  |  |  |  |
| `infectiousDisease.diagnosisDate` | Date |  |  | [function] |  |  |  |
| `infectiousDisease.notified` | Boolean |  |  | false |  |  |  |
| `infectiousDisease.notificationDate` | Date |  |  |  |  |  |  |
| `parentName` | String |  |  |  |  |  |  |
| `birthPlace` | String |  |  |  |  |  |  |
| `dateOfBirth` | Date |  |  |  |  |  | Demographic |
| `deathDate` | Date |  |  |  |  |  |  |
| `admitted` | Date |  |  | [function] |  |  |  |
| `status` | String |  |  | "Active" | Active, Discharged, Critical |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `uhid:1` | unique, sparse |
| `hospitalId:1` |  |
| `hospitalId:1, status:1` |  |
| `phone:1` |  |
| `createdAt:-1` |  |
| `hospitalId:1, phone:1` | unique, partial |
| `hospitalId:1, email:1` | unique, partial |

### `payments` — Payment

source `Payment.js` · timestamps: yes · virtuals: 5 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `transaction_id` | String | yes |  |  |  |  |  |
| `patient_id` | String | yes |  |  |  |  |  |
| `patient_name` | String | yes |  |  |  |  | Identity |
| `amount` | Number | yes |  |  |  |  |  |
| `method` | String |  |  | "card" | card, upi, netbanking, cash, wallet |  |  |
| `status` | String |  |  | "pending" | completed, pending, failed, refunded, partially_refunded |  |  |
| `invoice_id` | String |  |  | "" |  |  |  |
| `serviceType` | String |  |  | "appointment" | appointment, test, medicine |  |  |
| `referenceId` | String |  |  | "" |  |  |  |
| `description` | String |  |  | "" |  |  |  |
| `provider` | String |  |  | "" |  |  |  |
| `lineItems` | Array<subdocument> |  |  |  |  |  |  |
| `lineItems.name` | String |  |  |  |  |  | Identity |
| `lineItems.price` | Number |  |  |  |  |  |  |
| `lineItems.qty` | Number |  |  |  |  |  |  |
| `refund_amount` | Number |  |  | 0 |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `transaction_id:1` | unique, sparse |
| `referenceId:1, status:1` | unique, partial |

### `payouts` — Payout

source `Payout.js` · timestamps: yes · virtuals: 0 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `facilityId` | ObjectId | yes |  |  |  | Hospital |  |
| `facilityName` | String |  |  | "" |  |  | Identity |
| `facilityType` | String |  |  | "hospital" |  |  |  |
| `periodStart` | Date | yes |  |  |  |  |  |
| `periodEnd` | Date | yes |  |  |  |  |  |
| `grossRevenue` | Number |  |  | 0 |  |  |  |
| `commissionAmount` | Number |  |  | 0 |  |  |  |
| `netPayout` | Number |  |  | 0 |  |  |  |
| `transactionCount` | Number |  |  | 0 |  |  |  |
| `status` | String |  |  | "pending" | pending, paid, cancelled |  |  |
| `paidAt` | Date |  |  |  |  |  |  |
| `transactionRef` | String |  |  | "" |  |  |  |
| `notes` | String |  |  | "" |  |  |  |
| `approvals` | Array<subdocument> |  |  |  |  |  |  |
| `approvals.adminId` | ObjectId |  |  |  |  | User |  |
| `approvals.adminName` | String |  |  | "" |  |  |  |
| `approvals.at` | Date |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `facilityId:1` |  |

### `pharmacydeliveries` — PharmacyDelivery

source `PharmacyDelivery.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identity, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `serviceType` | String |  |  | "pharmacy" | pharmacy, lab_report, lab_sample |  |  |
| `orderId` | String | yes |  |  |  |  |  |
| `orderRef` | ObjectId |  |  |  |  | PharmacyOrder |  |
| `labBookingId` | ObjectId |  |  |  |  | LabBooking |  |
| `labOrderId` | ObjectId |  |  |  |  | LabOrder |  |
| `deliveryPartnerId` | ObjectId |  |  |  |  | DeliveryPartner |  |
| `status` | String |  |  | "Pending Assignment" | Pending Assignment, Assigned, Picked Up, Out for Delivery, Delivered, Failed, Cancelled |  |  |
| `pickupName` | String |  |  |  |  |  |  |
| `pickupAddress` | String | yes |  |  |  |  | Location |
| `pickupLocation.lat` | Number |  |  |  |  |  | Location |
| `pickupLocation.lng` | Number |  |  |  |  |  | Location |
| `dropAddress` | String | yes |  |  |  |  | Location |
| `dropLocation.lat` | Number |  |  |  |  |  | Location |
| `dropLocation.lng` | Number |  |  |  |  |  | Location |
| `patientName` | String |  |  |  |  |  | Identity |
| `patientPhone` | String |  |  |  |  |  |  |
| `deliveryFee` | Number |  |  | 0 |  |  |  |
| `notes` | String |  |  |  |  |  |  |
| `estimatedTime` | String |  |  |  |  |  |  |
| `deliveryOtp` | String |  |  |  |  |  |  |
| `otpVerified` | Boolean |  |  | false |  |  |  |
| `deliveryProofPhoto` | String |  |  |  |  |  |  |
| `trackingHistory` | Array<subdocument> |  |  |  |  |  |  |
| `trackingHistory.lat` | Number |  |  |  |  |  | Location |
| `trackingHistory.lng` | Number |  |  |  |  |  | Location |
| `trackingHistory.timestamp` | Date |  |  | [function] |  |  |  |
| `assignedAt` | Date |  |  |  |  |  |  |
| `pickedUpAt` | Date |  |  |  |  |  |  |
| `deliveredAt` | Date |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `facilityId` | ObjectId |  |  |  |  | Facility |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `serviceType:1` |  |
| `labBookingId:1` |  |
| `labOrderId:1` |  |
| `hospitalId:1` |  |
| `facilityId:1` |  |

### `pharmacyoffers` — PharmacyOffer

source `PharmacyOffer.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `title` | String | yes |  |  |  |  |  |
| `code` | String | yes | yes |  |  |  |  |
| `discount` | Number | yes |  |  |  |  |  |
| `type` | String |  |  | "percentage" | percentage, flat |  |  |
| `minPurchase` | Number |  |  | 0 |  |  |  |
| `maxDiscount` | Number |  |  | 0 |  |  |  |
| `validTill` | Date |  |  |  |  |  |  |
| `usageLimit` | Number |  |  | 100 |  |  |  |
| `used` | Number |  |  | 0 |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `code:1` | unique |
| `hospitalId:1` |  |

### `pharmacyorders` — PharmacyOrder

source `PharmacyOrder.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Contact, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `orderId` | String | yes | yes |  |  |  |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `patientName` | String | yes |  |  |  |  | Identity |
| `phone` | String |  |  |  |  |  | Contact |
| `deliveryAddress` | String |  |  |  |  |  |  |
| `items` | Array<subdocument> |  |  |  |  |  |  |
| `items.medicineId` | ObjectId |  |  |  |  | Medicine |  |
| `items.medicineName` | String | yes |  |  |  |  |  |
| `items.qty` | Number | yes |  |  |  |  |  |
| `items.price` | Number | yes |  |  |  |  |  |
| `total` | Number | yes |  |  |  |  |  |
| `payableBeforeDiscount` | Number |  |  | 0 |  |  |  |
| `status` | String |  |  | "Pending" | Pending, Confirmed, Preparing, Shipped, Out for Delivery, Delivered, Cancelled, Returned |  |  |
| `paymentStatus` | String |  |  | "Unpaid" | Pending, Unpaid, Paid, Refunded |  |  |
| `inventoryReservationStatus` | String |  |  | "none" | none, reserved, consumed, released |  |  |
| `inventoryReservationExpiresAt` | Date |  |  | null |  |  |  |
| `note` | String |  |  | "" |  |  |  |
| `orderDate` | Date |  |  | [function] |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `facilityId` | ObjectId |  |  |  |  | Facility |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `prescriptionUrl` | String |  |  | "" |  |  |  |
| `prescriptionStatus` | String |  |  | "not_required" | pending, verified, rejected, not_required |  |  |
| `rejectionReason` | String |  |  | "" |  |  |  |
| `deliveryFee` | Number |  |  | 0 |  |  |  |
| `deliveryMode` | String |  |  | "delivery" | delivery, pickup |  |  |
| `deliverySlot` | String |  |  | "" |  |  |  |
| `paymentMethod` | String |  |  | "COD" | COD, UPI, Card, NetBanking |  |  |
| `discount` | Number |  |  | 0 |  |  |  |
| `couponCode` | String |  |  | "" |  |  |  |
| `platformFee` | Number |  |  | 0 |  |  |  |
| `gst` | Number |  |  | 0 |  |  |  |
| `refunded` | Boolean |  |  | false |  |  |  |
| `refundAmount` | Number |  |  | 0 |  |  |  |
| `refundReason` | String |  |  | "" |  |  |  |
| `refundDate` | Date |  |  |  |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `orderId:1` | unique |
| `inventoryReservationStatus:1` |  |
| `inventoryReservationExpiresAt:1` |  |
| `hospitalId:1` |  |
| `facilityId:1` |  |

### `pharmacyreturns` — PharmacyReturn

source `PharmacyReturn.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `returnId` | String | yes | yes |  |  |  |  |
| `orderId` | String | yes |  |  |  |  |  |
| `orderRef` | ObjectId |  |  |  |  | PharmacyOrder |  |
| `patientName` | String | yes |  |  |  |  | Identity |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `items` | Array<subdocument> |  |  |  |  |  |  |
| `items.medicineName` | String |  |  |  |  |  |  |
| `items.qty` | Number |  |  |  |  |  |  |
| `items.reason` | String |  |  |  |  |  |  |
| `reason` | String |  |  |  |  |  |  |
| `total` | Number | yes |  |  |  |  |  |
| `status` | String |  |  | "Pending" | Pending, Approved, Rejected, Refunded |  |  |
| `initiatedAt` | Date |  |  | [function] |  |  |  |
| `completedAt` | Date |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `returnId:1` | unique |
| `hospitalId:1` |  |

### `pharmacystaffs` — PharmacyStaff

source `PharmacyStaff.js` · timestamps: yes · virtuals: 0 · retention: Life of the provider relationship + 1 year (provider deletion flow) (docs/privacy/RETENTION.md) · PII: Contact, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `name` | String | yes |  |  |  |  | Identity |
| `role` | String | yes |  |  | Pharmacist, Senior Pharmacist, Pharmacy Technician, Store Manager |  |  |
| `email` | String |  |  |  |  |  | Contact |
| `phone` | String |  |  |  |  |  | Contact |
| `licenseNumber` | String |  |  |  |  |  |  |
| `experience` | String |  |  |  |  |  |  |
| `shift` | String |  |  | "Morning" | Morning, Evening, Night, Rotating |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `joinedAt` | Date |  |  | [function] |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `physiotherapies` — Physiotherapy

source `Physiotherapy.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Health, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `referralId` | String | yes | yes |  |  |  |  |
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `patientName` | String | yes |  |  |  |  | Identity |
| `doctorId` | ObjectId | yes |  |  |  | User | Identifier |
| `doctorName` | String | yes |  |  |  |  | Identity |
| `diagnosis` | String |  |  |  |  |  | Health |
| `initialAssessment.painScale` | Number |  |  |  |  |  |  |
| `initialAssessment.rangeOfMotion` | String |  |  |  |  |  |  |
| `initialAssessment.strengthTest` | String |  |  |  |  |  |  |
| `initialAssessment.functionalAssessment` | String |  |  |  |  |  |  |
| `initialAssessment.notes` | String |  |  |  |  |  |  |
| `treatmentPlan.sessionsTotal` | Number |  |  | 6 |  |  |  |
| `treatmentPlan.sessionsCompleted` | Number |  |  | 0 |  |  |  |
| `treatmentPlan.therapyType` | String |  |  |  |  |  |  |
| `treatmentPlan.goals` | String |  |  |  |  |  |  |
| `sessions` | Array<subdocument> |  |  |  |  |  |  |
| `sessions.sessionNumber` | Number |  |  |  |  |  |  |
| `sessions.date` | Date |  |  |  |  |  |  |
| `sessions.exercisesPerformed` | String |  |  |  |  |  |  |
| `sessions.progressNote` | String |  |  |  |  |  |  |
| `sessions.painLevelBefore` | Number |  |  |  |  |  |  |
| `sessions.painLevelAfter` | Number |  |  |  |  |  |  |
| `sessions.therapistName` | String |  |  |  |  |  |  |
| `sessions.duration` | Number |  |  |  |  |  |  |
| `status` | String |  |  | "Referred" | Referred, In Progress, Mid Review, Completed, Discontinued |  |  |
| `reviewNotes` | String |  |  |  |  |  |  |
| `dischargePlan.homeExercise` | String |  |  |  |  |  |  |
| `dischargePlan.precautions` | String |  |  |  |  |  |  |
| `dischargePlan.followUpDate` | Date |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `referralId:1` | unique |
| `hospitalId:1` |  |

### `platformcontents` — PlatformContent

source `PlatformContent.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `key` | String | yes | yes |  |  |  |  |
| `title` | String | yes |  |  |  |  |  |
| `body` | String |  |  | "" |  |  |  |
| `version` | Number |  |  | 1 |  |  |  |
| `publishedAt` | Date |  |  |  |  |  |  |
| `updatedBy` | ObjectId |  |  |  |  | User |  |
| `changeNotes` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `key:1` | unique |
| `updatedAt:-1` |  |

### `platformcouponredemptions` — PlatformCouponRedemption

source `PlatformCouponRedemption.js` · timestamps: yes · virtuals: 0 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `couponCode` | String | yes |  |  |  |  |  |
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `discountPaise` | Number | yes |  |  |  |  |  |
| `orderRef` | String | yes |  |  |  |  |  |
| `status` | String |  |  | "applied" | applied, settled, reversed |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `status:1` |  |
| `couponCode:1, orderRef:1` | unique |
| `couponCode:1, userId:1, status:1` |  |

### `platformcoupons` — PlatformCoupon

source `PlatformCoupon.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `code` | String | yes | yes |  |  |  |  |
| `description` | String |  |  | "" |  |  |  |
| `discountType` | String | yes |  |  | percentage, fixed |  |  |
| `discountValue` | Number | yes |  |  |  |  |  |
| `minOrderValue` | Number |  |  | 0 |  |  |  |
| `maxDiscount` | Number |  |  | 0 |  |  |  |
| `usageLimit` | Number |  |  | 0 |  |  |  |
| `usedCount` | Number |  |  | 0 |  |  |  |
| `perUserLimit` | Number |  |  | 1 |  |  |  |
| `applicableServices` | Array<Mixed> |  |  |  |  |  |  |
| `validFrom` | Date | yes |  |  |  |  |  |
| `validUntil` | Date | yes |  |  |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `code:1` | unique |
| `isActive:1, validFrom:1, validUntil:1` |  |

### `platformcouponuserusages` — PlatformCouponUserUsage

source `PlatformCouponUserUsage.js` · timestamps: yes · virtuals: 0 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `couponCode` | String | yes |  |  |  |  |  |
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `usedCount` | Number | yes |  | 0 |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `couponCode:1, userId:1` | unique |

### `preferredpharmacies` — PreferredPharmacy

source `PreferredPharmacy.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `pharmacyId` | ObjectId | yes |  |  |  | Facility |  |
| `name` | String | yes |  |  |  |  |  |
| `priority` | Number | yes |  |  |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `patientId:1, priority:1` | unique |
| `patientId:1, pharmacyId:1` | unique |

### `prescriptions` — Prescription

source `Prescription.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Health, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `prescriptionId` | String | yes | yes |  |  |  |  |
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `patientName` | String | yes |  |  |  |  | Identity |
| `doctorId` | ObjectId | yes |  |  |  | User | Identifier |
| `doctorName` | String | yes |  |  |  |  | Identity |
| `appointmentId` | ObjectId |  |  |  |  | Appointment |  |
| `medicines` | Array<subdocument> |  |  |  |  |  |  |
| `medicines.medicineId` | ObjectId |  |  |  |  | Medicine |  |
| `medicines.medicineName` | String | yes |  |  |  |  |  |
| `medicines.dosage` | String | yes |  |  |  |  |  |
| `medicines.frequency` | String | yes |  |  |  |  |  |
| `medicines.duration` | String | yes |  |  |  |  |  |
| `medicines.route` | String |  |  | "Oral" | Oral, IV, IM, Topical, Sublingual, Inhalation, Other |  |  |
| `medicines.instructions` | String |  |  | "" |  |  |  |
| `medicines.quantity` | Number | yes |  |  |  |  |  |
| `medicines.isDispensed` | Boolean |  |  | false |  |  |  |
| `medicines.dispensedAt` | Date |  |  |  |  |  |  |
| `medicines.dispensedBy` | String |  |  |  |  |  |  |
| `diagnosis` | String |  |  |  |  |  | Health |
| `clinicalNotes` | String |  |  |  |  |  | Health |
| `status` | String |  |  | "Active" | Active, Dispensed, Partially Dispensed, Cancelled |  |  |
| `verificationStatus` | String |  |  | "pending" | pending, verified, rejected |  |  |
| `verificationNotes` | String |  |  | "" |  |  |  |
| `verifiedBy` | ObjectId |  |  |  |  | User |  |
| `verifiedAt` | Date |  |  |  |  |  |  |
| `isEmergency` | Boolean |  |  | false |  |  |  |
| `prescriptionFile` | String |  |  | "" |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `integrity.version` | String |  |  |  |  |  |  |
| `integrity.algorithm` | String |  |  |  |  |  |  |
| `integrity.digest` | String |  |  |  |  |  |  |
| `integrity.signature` | String |  |  |  |  |  |  |
| `integrity.issuedAt` | Date |  |  |  |  |  |  |
| `integrity.nonceHash` | String |  |  |  |  |  |  |
| `revokedAt` | Date |  |  |  |  |  |  |
| `cancelledAt` | Date |  |  |  |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `prescriptionId:1` | unique |
| `hospitalId:1` |  |

### `purchaseorders` — PurchaseOrder

source `PurchaseOrder.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `poNumber` | String | yes | yes |  |  |  |  |
| `supplierId` | ObjectId | yes |  |  |  | Supplier |  |
| `supplierName` | String | yes |  |  |  |  |  |
| `items` | Array<subdocument> |  |  |  |  |  |  |
| `items.inventoryItemId` | ObjectId |  |  |  |  | Inventory |  |
| `items.itemName` | String | yes |  |  |  |  |  |
| `items.category` | String | yes |  |  |  |  |  |
| `items.quantity` | Number | yes |  |  |  |  |  |
| `items.unitPrice` | Number | yes |  |  |  |  |  |
| `items.discount` | Number |  |  | 0 |  |  |  |
| `items.total` | Number | yes |  |  |  |  |  |
| `subTotal` | Number | yes |  |  |  |  |  |
| `taxRate` | Number |  |  | 0 |  |  |  |
| `taxAmount` | Number |  |  | 0 |  |  |  |
| `grandTotal` | Number | yes |  |  |  |  |  |
| `status` | String |  |  | "Draft" | Draft, Submitted, Approved, Ordered, Partially Received, Received, Cancelled |  |  |
| `expectedDelivery` | Date |  |  |  |  |  |  |
| `receivedDate` | Date |  |  |  |  |  |  |
| `approvedBy` | ObjectId |  |  |  |  | User |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdBy` | ObjectId | yes |  |  |  | User |  |
| `notes` | String |  |  |  |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `poNumber:1` | unique |
| `hospitalId:1` |  |

### `pushsubscriptions` — PushSubscription

source `PushSubscription.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Device/Network, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | String | yes |  |  |  |  | Identifier |
| `endpoint` | String | yes |  |  |  |  |  |
| `keys.p256dh` | String | yes |  |  |  |  |  |
| `keys.auth` | String | yes |  |  |  |  |  |
| `userAgent` | String |  |  | "" |  |  | Device/Network |
| `lastSeenAt` | Date |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `userId:1, endpoint:1` | unique |

### `radiologies` — Radiology

source `Radiology.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `orderId` | String | yes | yes |  |  |  |  |
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `patientName` | String | yes |  |  |  |  | Identity |
| `doctorId` | ObjectId | yes |  |  |  | User | Identifier |
| `doctorName` | String | yes |  |  |  |  | Identity |
| `modality` | String | yes |  |  | X-Ray, MRI, CT Scan, Ultrasound, Echo, ECG, Mammography |  |  |
| `bodyPart` | String | yes |  |  |  |  |  |
| `clinicalHistory` | String |  |  |  |  |  |  |
| `priority` | String |  |  | "Routine" | Routine, Urgent, STAT |  |  |
| `status` | String |  |  | "Ordered" | Ordered, Scheduled, In Progress, Completed, Reported, Delivered |  |  |
| `scheduledAt` | Date |  |  |  |  |  |  |
| `performedAt` | Date |  |  |  |  |  |  |
| `performedBy` | String |  |  |  |  |  |  |
| `findings` | String |  |  |  |  |  |  |
| `impression` | String |  |  |  |  |  |  |
| `recommendation` | String |  |  |  |  |  |  |
| `reportUrl` | String |  |  |  |  |  |  |
| `imageUrls` | Array<Mixed> |  |  |  |  |  |  |
| `reportedBy` | ObjectId |  |  |  |  | User |  |
| `reportedAt` | Date |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `orderId:1` | unique |
| `hospitalId:1` |  |

### `records` — Record

source `Record.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Health, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patient` | String | yes |  |  |  |  |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `doctor` | String | yes |  |  |  |  |  |
| `doctorId` | ObjectId |  |  |  |  | Doctor | Identifier |
| `appointmentId` | ObjectId |  |  |  |  | Appointment |  |
| `date` | String | yes |  |  |  |  |  |
| `diagnosis` | String |  |  | "" |  |  | Health |
| `prescription` | String |  |  | "" |  |  | Health |
| `type` | String |  |  | "diagnosis" | diagnosis, prescription, lab_report, imaging, discharge_summary, bill_invoice, payment_invoice |  |  |
| `notes` | String |  |  | "" |  |  |  |
| `vitals.bp` | String |  |  |  |  |  | Health |
| `vitals.temp` | Number |  |  |  |  |  | Health |
| `vitals.weight` | Number |  |  |  |  |  | Health |
| `vitals.spo2` | Number |  |  |  |  |  | Health |
| `vitals.pulse` | Number |  |  |  |  |  | Health |
| `vitals.respiration` | Number |  |  |  |  |  | Health |
| `vitals.height` | Number |  |  |  |  |  | Health |
| `icdCodes` | Array<subdocument> |  |  |  |  |  |  |
| `icdCodes.code` | String | yes |  |  |  |  |  |
| `icdCodes.description` | String |  |  |  |  |  |  |
| `icdCodes.diagnosis` | String |  |  | "" |  |  | Health |
| `examination.general` | String |  |  |  |  |  |  |
| `examination.systemic` | String |  |  |  |  |  |  |
| `examination.local` | String |  |  |  |  |  |  |
| `examination.cardiovascular` | String |  |  |  |  |  |  |
| `examination.respiratory` | String |  |  |  |  |  |  |
| `examination.abdominal` | String |  |  |  |  |  |  |
| `examination.neurological` | String |  |  |  |  |  |  |
| `examination.musculoskeletal` | String |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `data` | Mixed |  |  | [function] |  |  |  |
| `attachments` | Array<Mixed> |  |  |  |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `recordversions` — RecordVersion

source `RecordVersion.js` · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Device/Network

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `recordId` | ObjectId | yes |  |  |  | Record |  |
| `version` | Number | yes |  |  |  |  |  |
| `snapshot` | Mixed | yes |  |  |  |  |  |
| `changed` | Array<subdocument> |  |  |  |  |  |  |
| `changed.field` | String |  |  |  |  |  |  |
| `changed.from` | Mixed |  |  |  |  |  |  |
| `changed.to` | Mixed |  |  |  |  |  |  |
| `editedBy` | ObjectId |  |  |  |  | User |  |
| `editedByRole` | String |  |  | "" |  |  |  |
| `editedByName` | String |  |  | "" |  |  |  |
| `editReason` | String |  |  | "" |  |  |  |
| `ip` | String |  |  | "" |  |  | Device/Network |
| `userAgent` | String |  |  | "" |  |  | Device/Network |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `prevHash` | String |  |  | "" |  |  |  |
| `hash` | String | yes |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `recordId:1` |  |
| `recordId:1, version:1` | unique |
| `recordId:1, createdAt:-1` |  |

### `referrals` — Referral

source `Referral.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `referrerId` | ObjectId | yes |  |  |  | User |  |
| `refereeId` | ObjectId | yes | yes |  |  | User |  |
| `code` | String | yes |  |  |  |  |  |
| `ipHash` | String |  |  | "" |  |  |  |
| `deviceHash` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "pending" | pending, qualified, rewarded, expired, fraud_flagged |  |  |
| `qualifyingAction` | String |  |  | "" |  |  |  |
| `qualifiedAt` | Date |  |  |  |  |  |  |
| `referrerRewardPoints` | Number |  |  | 0 |  |  |  |
| `refereeRewardPoints` | Number |  |  | 0 |  |  |  |
| `rewardedAt` | Date |  |  |  |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `referrerId:1` |  |
| `refereeId:1` | unique |
| `ipHash:1` |  |
| `referrerId:1, status:1` |  |
| `status:1` |  |

### `referralsettings` — ReferralSettings

source `ReferralSettings.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `isEnabled` | Boolean |  |  | true |  |  |  |
| `qualifyingAction` | String |  |  | "first_appointment" | signup_only, first_appointment, first_order, first_lab_test |  |  |
| `referrerPoints` | Number |  |  | 200 |  |  |  |
| `refereePoints` | Number |  |  | 100 |  |  |  |
| `maxReferralsPerMonth` | Number |  |  | 20 |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

_No indexes beyond the default `_id`._

### `refreshtokens` — RefreshToken

source `RefreshToken.js` · timestamps: yes · virtuals: 0 · retention: 15–60 minutes (TTL index) — tokens until logout or expiry (docs/privacy/RETENTION.md) · PII: Device/Network, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `tokenKey` | String | yes |  |  |  |  |  |
| `tokenHash` | String | yes |  |  |  |  |  |
| `expiresAt` | Date | yes |  |  |  |  |  |
| `jti` | String |  |  |  |  |  |  |
| `familyId` | String |  |  |  |  |  |  |
| `replacedBy` | String |  |  | null |  |  |  |
| `revokedAt` | Date |  |  | null |  |  |  |
| `userAgent` | String |  |  | "" |  |  | Device/Network |
| `ip` | String |  |  | "" |  |  | Device/Network |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `tokenKey:1` |  |
| `jti:1` |  |
| `familyId:1` |  |
| `expiresAt:1` | TTL 0s |

### `refunds` — Refund

source `Refund.js` · timestamps: yes · virtuals: 0 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Financial

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `paymentId` | ObjectId | yes |  |  |  | Payment | Financial |
| `amount` | Number | yes |  |  |  |  |  |
| `ledgerEntryType` | String |  |  | "DEBIT" | DEBIT, REVERSAL |  |  |
| `status` | String |  |  | "REQUESTED" | REQUESTED, APPROVED, PROCESSING, PARTIALLY_REFUNDED, REFUNDED, FAILED, REJECTED |  |  |
| `reason` | String | yes |  |  |  |  |  |
| `reasonCode` | String |  |  | "patient_request" | orphan_payment_no_appointment, service_not_delivered, duplicate_payment, overcharge, patient_request, fraud, goodwill |  |  |
| `requestedBy` | ObjectId |  |  |  |  | User |  |
| `approvedBy` | ObjectId |  |  |  |  | User |  |
| `decidedAt` | Date |  |  |  |  |  |  |
| `settledAt` | Date |  |  |  |  |  |  |
| `idempotencyKey` | String | yes |  |  |  |  |  |
| `gatewayRefundId` | String |  |  |  |  |  |  |
| `failureReason` | String |  |  |  |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `paymentId:1` |  |
| `status:1` |  |
| `requestedBy:1` |  |
| `idempotencyKey:1` | unique |
| `paymentId:1, status:1` |  |

### `reports` — Report

source `Report.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `reportId` | String | yes | yes |  |  |  |  |
| `reportType` | String | yes |  |  | Daily, Monthly, Government, Custom |  |  |
| `category` | String | yes |  |  | OPD, IPD, Revenue, OT, Emergency, Lab, Radiology, Birth, Death, Notifiable Disease, PCPNDT, Bed Occupancy, Doctor Performance, Department |  |  |
| `dateFrom` | Date | yes |  |  |  |  |  |
| `dateTo` | Date | yes |  |  |  |  |  |
| `department` | String |  |  |  |  |  |  |
| `doctorId` | ObjectId |  |  |  |  | User | Identifier |
| `generatedBy` | ObjectId | yes |  |  |  | User |  |
| `generatedAt` | Date |  |  | [function] |  |  |  |
| `data` | Mixed |  |  |  |  |  |  |
| `summary` | Mixed |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `reportId:1` | unique |
| `hospitalId:1` |  |

### `reviews` — Review

source `Review.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `doctorId` | String | yes |  |  |  |  | Identifier |
| `doctorName` | String | yes |  |  |  |  | Identity |
| `patientName` | String | yes |  |  |  |  | Identity |
| `rating` | Number | yes |  |  |  |  |  |
| `comment` | String |  |  | "" |  |  |  |
| `date` | String |  |  | [function] |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `flagged` | Boolean |  |  | false |  |  |  |
| `flagReason` | String |  |  | "" |  |  |  |
| `flaggedBy` | String |  |  | "" |  |  |  |
| `reply` | String |  |  | "" |  |  |  |
| `repliedAt` | Date |  |  |  |  |  |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `repliedBy` | ObjectId |  |  |  |  | User |  |
| `isVerifiedVisit` | Boolean |  |  | false |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `patientId:1` |  |
| `doctorId:1, patientId:1` | unique, partial |
| `doctorId:1, createdAt:-1` |  |
| `createdAt:-1` |  |

### `rewardcatalogitems` — RewardCatalogItem

source `RewardCatalogItem.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `title` | String | yes |  |  |  |  |  |
| `description` | String |  |  | "" |  |  |  |
| `category` | String | yes |  |  | medicine_discount, free_delivery, free_lab_test, appointment_discount, custom |  |  |
| `pointsRequired` | Number | yes |  |  |  |  |  |
| `rewardType` | String | yes |  |  | percentage, fixed, free_item |  |  |
| `rewardValue` | Number |  |  | 0 |  |  |  |
| `applicableService` | String |  |  | "all" | pharmacy, lab, delivery, consultation, all |  |  |
| `maxCapAmount` | Number |  |  | 0 |  |  |  |
| `validityDays` | Number |  |  | 30 |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `stockLimit` | Number |  |  | 0 |  |  |  |
| `redeemedCount` | Number |  |  | 0 |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `isActive:1, category:1` |  |
| `pointsRequired:1` |  |

### `rewardredemptions` — RewardRedemption

source `RewardRedemption.js` · timestamps: yes · virtuals: 0 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `rewardCatalogItemId` | ObjectId | yes |  |  |  | RewardCatalogItem |  |
| `pointsSpent` | Number | yes |  |  |  |  |  |
| `code` | String | yes | yes |  |  |  |  |
| `status` | String |  |  | "active" | active, used, expired |  |  |
| `expiresAt` | Date | yes |  |  |  |  |  |
| `usedAt` | Date |  |  |  |  |  |  |
| `usedOnOrderId` | ObjectId |  |  | null |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `code:1` | unique |
| `userId:1, status:1` |  |
| `expiresAt:1` |  |

### `ridebookings` — RideBooking

source `RideBooking.js` · timestamps: yes · virtuals: 0 · retention: Trip duration + 30 days (dispute window) (docs/privacy/RETENTION.md) · PII: Contact, Identifier, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `bookingNumber` | String |  | yes | [function] |  |  |  |
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `riderId` | ObjectId |  |  | null |  | User | Identifier |
| `vehicleId` | ObjectId |  |  | null |  | Vehicle |  |
| `vehicleType` | String | yes |  |  | bike, auto, e_rickshaw, car, van |  |  |
| `isEmergency` | Boolean |  |  | false |  |  |  |
| `pickup.address` | String | yes |  |  |  |  | Contact |
| `pickup.lat` | Number | yes |  |  |  |  | Location |
| `pickup.lng` | Number | yes |  |  |  |  | Location |
| `drop.address` | String | yes |  |  |  |  | Contact |
| `drop.lat` | Number | yes |  |  |  |  | Location |
| `drop.lng` | Number | yes |  |  |  |  | Location |
| `distanceKm` | Number |  |  | 0 |  |  |  |
| `durationMin` | Number |  |  | 0 |  |  |  |
| `fare.base` | Number |  |  | 0 |  |  |  |
| `fare.distanceCharge` | Number |  |  | 0 |  |  |  |
| `fare.surge` | Number |  |  | 0 |  |  |  |
| `fare.total` | Number |  |  | 0 |  |  |  |
| `pickupOtp` | String |  |  | [function] |  |  |  |
| `status` | String |  |  | "searching" | searching, accepted, rider_arriving, arrived, in_progress, completed, cancelled_by_user, cancelled_by_rider, no_riders_found |  |  |
| `statusHistory` | Array<subdocument> |  |  |  |  |  |  |
| `statusHistory.status` | String |  |  |  |  |  |  |
| `statusHistory.at` | Date |  |  | [function] |  |  |  |
| `statusHistory.note` | String |  |  | "" |  |  |  |
| `dispatchAttempts` | Array<subdocument> |  |  |  |  |  |  |
| `dispatchAttempts.riderId` | ObjectId |  |  |  |  | User | Identifier |
| `dispatchAttempts.distanceKm` | Number |  |  |  |  |  |  |
| `dispatchAttempts.sentAt` | Date |  |  | [function] |  |  |  |
| `dispatchAttempts.respondedAt` | Date |  |  |  |  |  |  |
| `dispatchAttempts.outcome` | String |  |  | "pending" | pending, accepted, rejected, timeout |  |  |
| `currentDispatchRadius` | Number |  |  | 5 |  |  |  |
| `notified` | Array<subdocument> |  |  |  |  |  |  |
| `notified.providerId` | String |  |  |  |  |  | Identifier |
| `notified.userId` | String |  |  |  |  |  | Identifier |
| `everNotified` | Array<subdocument> |  |  |  |  |  |  |
| `everNotified.providerId` | String |  |  |  |  |  | Identifier |
| `acceptances` | Array<subdocument> |  |  |  |  |  |  |
| `acceptances.providerId` | String |  |  |  |  |  | Identifier |
| `acceptances.distanceKm` | Number |  |  |  |  |  |  |
| `acceptances.acceptedAt` | Date |  |  | [function] |  |  |  |
| `rejections` | Array<Mixed> |  |  |  |  |  |  |
| `windowEndsAt` | Date |  |  | null |  |  |  |
| `retryCount` | Number |  |  | 0 |  |  |  |
| `retryAt` | Date |  |  | null |  |  |  |
| `retryRadii` | Array<Mixed> |  |  | [] |  |  |  |
| `retryWaveIndex` | Number |  |  | 0 |  |  |  |
| `currentSearchRadiusKm` | Number |  |  | 5 |  |  |  |
| `dispatchLog` | Array<subdocument> |  |  |  |  |  |  |
| `dispatchLog.radiusKm` | Number |  |  |  |  |  |  |
| `dispatchLog.candidateCount` | Number |  |  |  |  |  |  |
| `dispatchLog.outcome` | String |  |  |  | assigned, no_response, no_acceptance, escalated |  |  |
| `dispatchLog.timestamp` | Date |  |  | [function] |  |  |  |
| `payment.method` | String |  |  | "pending" | demo_wallet, cash, pending, |  |  |
| `payment.status` | String |  |  | "pending" | pending, paid, failed |  |  |
| `payment.transactionRef` | String |  |  | "" |  |  |  |
| `payment.paidAt` | Date |  |  |  |  |  |  |
| `ratingByUser.stars` | Number |  |  |  |  |  |  |
| `ratingByUser.comment` | String |  |  | "" |  |  |  |
| `ratingByUser.createdAt` | Date |  |  |  |  |  |  |
| `ratingByRider.stars` | Number |  |  |  |  |  |  |
| `ratingByRider.comment` | String |  |  | "" |  |  |  |
| `ratingByRider.createdAt` | Date |  |  |  |  |  |  |
| `cancellationReason` | String |  |  | "" |  |  |  |
| `cancelledBy` | String |  |  | "" | user, rider, system, |  |  |
| `lakeArchivedAt` | Date |  |  | null |  |  |  |
| `acceptedAt` | Date |  |  |  |  |  |  |
| `arrivedAt` | Date |  |  |  |  |  |  |
| `startedAt` | Date |  |  |  |  |  |  |
| `completedAt` | Date |  |  |  |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `bookingNumber:1` | unique |
| `userId:1` |  |
| `riderId:1` |  |
| `vehicleType:1` |  |
| `isEmergency:1` |  |
| `status:1` |  |
| `retryAt:1` |  |
| `lakeArchivedAt:1` |  |
| `createdAt:1` |  |

### `riderprofiles` — RiderProfile

source `RiderProfile.js` · timestamps: yes · virtuals: 0 · retention: Life of the provider relationship + 1 year (provider deletion flow) (docs/privacy/RETENTION.md) · PII: Financial, Identifier, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes | yes |  |  | User | Identifier |
| `role` | String |  |  | "rider" |  |  |  |
| `vehicleId` | ObjectId |  |  |  |  | Vehicle |  |
| `govtIdType` | String | yes |  |  | Aadhaar, PAN, Voter ID, Passport |  |  |
| `govtIdNumber` | String | yes |  |  |  |  |  |
| `govtIdNumberHash` | String |  |  | "" |  |  |  |
| `govtIdDocUrl` | String |  |  | "" |  |  |  |
| `drivingLicenseNumber` | String | yes |  |  |  |  |  |
| `drivingLicenseDocUrl` | String |  |  | "" |  |  |  |
| `drivingLicenseExpiry` | Date | yes |  |  |  |  |  |
| `bankDetails.accountHolder` | String |  |  | "" |  |  |  |
| `bankDetails.accountNumber` | String |  |  | "" |  |  | Financial |
| `bankDetails.ifsc` | String |  |  | "" |  |  | Financial |
| `bankDetails.upiId` | String |  |  | "" |  |  | Financial |
| `operatingArea` | String |  |  | "" |  |  |  |
| `operatingCity` | String |  |  | "Jabalpur" |  |  |  |
| `availableDays` | Array<Mixed> |  |  |  |  |  |  |
| `availableTimeSlot.start` | String |  |  | "08:00" |  |  |  |
| `availableTimeSlot.end` | String |  |  | "20:00" |  |  |  |
| `riderStatus` | String |  |  | "pending_approval" | pending_approval, active, rejected, suspended |  |  |
| `rejectionReason` | String |  |  | "" |  |  |  |
| `isOnline` | Boolean |  |  | false |  |  |  |
| `lastLocationAt` | Date |  |  | null |  |  |  |
| `activeDispatchRequestId` | ObjectId |  |  | null |  |  |  |
| `emergencySupport` | Boolean |  |  | false |  |  |  |
| `currentLocation.type` | String |  |  | "Point" | Point |  | Location |
| `currentLocation.coordinates` | Array<Mixed> |  |  | [79.9864,23.1815] |  |  | Location |
| `currentLocation.lat` | Number |  |  | 23.1815 |  |  | Location |
| `currentLocation.lng` | Number |  |  | 79.9864 |  |  | Location |
| `currentLocation.h3Index8` | String |  |  | null |  |  | Location |
| `currentLocation.h3Index9` | String |  |  | null |  |  | Location |
| `currentLocation.accuracy` | Number |  |  | null |  |  | Location |
| `currentLocation.updatedAt` | Date |  |  | [function] |  |  | Location |
| `rating.avg` | Number |  |  | 5 |  |  |  |
| `rating.count` | Number |  |  | 0 |  |  |  |
| `totalEarnings` | Number |  |  | 0 |  |  |  |
| `walletBalance` | Number |  |  | 0 |  |  |  |
| `cancellationStrikes` | Number |  |  | 0 |  |  |  |
| `docs` | Mixed |  |  | [function] |  |  |  |
| `settings.waitMinutes` | Number |  |  | 5 |  |  |  |
| `settings.noShowFee` | Number |  |  | 50 |  |  |  |
| `settings.lateRefund` | Boolean |  |  | true |  |  |  |
| `settings.acAvailable` | Boolean |  |  | false |  |  |  |
| `settings.wheelchairFit` | Boolean |  |  | false |  |  |  |
| `settings.transferScope` | String |  |  | "local" | local, regional, intercity |  |  |
| `settings.payoutUpi` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` | unique |
| `vehicleId:1` |  |
| `govtIdNumberHash:1` |  |
| `operatingCity:1` |  |
| `riderStatus:1` |  |
| `isOnline:1` |  |
| `lastLocationAt:1` |  |
| `activeDispatchRequestId:1` |  |
| `emergencySupport:1` |  |
| `currentLocation.h3Index8:1` |  |
| `currentLocation.h3Index9:1` |  |
| `currentLocation.coordinates:2dsphere` |  |

### `ridetrackings` — RideTracking

source `RideTracking.js` · timestamps: yes · virtuals: 0 · retention: Trip duration + 30 days (dispute window) (docs/privacy/RETENTION.md) · PII: Identifier, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `rideId` | ObjectId | yes |  |  |  | RideBooking |  |
| `riderId` | ObjectId |  |  |  |  | User | Identifier |
| `lat` | Number | yes |  |  |  |  | Location |
| `lng` | Number | yes |  |  |  |  | Location |
| `speed` | Number |  |  | 0 |  |  |  |
| `heading` | Number |  |  | 0 |  |  |  |
| `timestamp` | Date |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `rideId:1` |  |
| `riderId:1` |  |
| `timestamp:1` |  |

### `savedfavorites` — SavedFavorite

source `SavedFavorite.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `refType` | String | yes |  |  | doctor, hospital, clinic, lab, pharmacy, technician |  |  |
| `refId` | String | yes |  |  |  |  |  |
| `refName` | String |  |  |  |  |  |  |
| `notes` | String |  |  |  |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `patientId:1` |  |
| `patientId:1, refType:1, refId:1` | unique |

### `schedulechangerequests` — ScheduleChangeRequest

source `ScheduleChangeRequest.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `doctorId` | ObjectId | yes |  |  |  | Doctor | Identifier |
| `doctorName` | String |  |  |  |  |  | Identity |
| `doctorEmail` | String |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `status` | String |  |  | "Pending" | Pending, Approved, Rejected, Cancelled |  |  |
| `requestedChanges.slotDuration` | Number |  |  |  |  |  |  |
| `requestedChanges.workingHours.start` | String |  |  |  |  |  |  |
| `requestedChanges.workingHours.end` | String |  |  |  |  |  |  |
| `requestedChanges.breakTime.start` | String |  |  |  |  |  |  |
| `requestedChanges.breakTime.end` | String |  |  |  |  |  |  |
| `requestedChanges.bookingWindow.unit` | String |  |  |  |  |  |  |
| `requestedChanges.bookingWindow.value` | Number |  |  |  |  |  |  |
| `requestedChanges.weekly_schedule` | Mixed |  |  |  |  |  |  |
| `requestedChanges.leaves` | Array<Mixed> |  |  |  |  |  |  |
| `requestedChanges.dateDisabledSlots` | Mixed |  |  |  |  |  |  |
| `requestedChanges.bufferPerHour` | Number |  |  |  |  |  |  |
| `oldValues.slotDuration` | Number |  |  |  |  |  |  |
| `oldValues.workingHours.start` | String |  |  |  |  |  |  |
| `oldValues.workingHours.end` | String |  |  |  |  |  |  |
| `oldValues.breakTime.start` | String |  |  |  |  |  |  |
| `oldValues.breakTime.end` | String |  |  |  |  |  |  |
| `oldValues.bookingWindow.unit` | String |  |  |  |  |  |  |
| `oldValues.bookingWindow.value` | Number |  |  |  |  |  |  |
| `oldValues.weekly_schedule` | Mixed |  |  |  |  |  |  |
| `oldValues.leaves` | Array<Mixed> |  |  |  |  |  |  |
| `oldValues.dateDisabledSlots` | Mixed |  |  |  |  |  |  |
| `oldValues.bufferPerHour` | Number |  |  |  |  |  |  |
| `appliedFields` | Array<Mixed> |  |  | [] |  |  |  |
| `rejectionNote` | String |  |  | "" |  |  |  |
| `adminNote` | String |  |  | "" |  |  |  |
| `reviewedBy` | ObjectId |  |  |  |  | User |  |
| `reviewedAt` | Date |  |  |  |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `servicecities` — ServiceCity

source `ServiceCity.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `name` | String | yes | yes |  |  |  |  |
| `state` | String |  |  | "" |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `centerLat` | Number |  |  | 23.1815 |  |  |  |
| `centerLng` | Number |  |  | 79.9864 |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `name:1` | unique |
| `isActive:1` |  |

### `sosvehiclesettings` — SOSVehicleSettings

source `SOSVehicleSettings.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `radiusSteps` | Array<Mixed> |  |  | [5,10,15,20] |  |  |  |
| `windowSeconds` | Number |  |  | 30 |  |  |  |
| `maxRetriesPerRadius` | Number |  |  | 3 |  |  |  |
| `retryPauseSeconds` | Number |  |  | 3 |  |  |  |
| `includeAmbulanceInAutoVehicleMode` | Boolean |  |  | false |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

_No indexes beyond the default `_id`._

### `staffs` — Staff

source `Staff.js` · timestamps: yes · virtuals: 0 · retention: Life of the provider relationship + 1 year (provider deletion flow) (docs/privacy/RETENTION.md) · PII: Contact, Financial, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `employeeId` | String | yes | yes |  |  |  |  |
| `userId` | ObjectId |  |  |  |  | User | Identifier |
| `name` | String | yes |  |  |  |  | Identity |
| `role` | String | yes |  |  | hospital_admin, Doctor, Nurse, Pharmacist, Lab Technician, Radiologist, Dietitian, Physiotherapist, Counselor, Technician, Helper, Security, Accountant, Receptionist, Driver, Ambulance Driver |  |  |
| `assignedAmbulanceId` | ObjectId |  |  | null |  | Ambulance |  |
| `department` | String |  |  |  |  |  |  |
| `designation` | String |  |  |  |  |  |  |
| `joinDate` | Date | yes |  |  |  |  |  |
| `employmentType` | String |  |  | "Full-time" | Full-time, Part-time, Contract, Intern |  |  |
| `shift` | String |  |  | "Morning" | Morning, Evening, Night, Rotating |  |  |
| `salary` | Number |  |  |  |  |  | Financial |
| `contactNumber` | String |  |  |  |  |  | Contact |
| `emergencyContact` | String |  |  |  |  |  |  |
| `address` | String |  |  |  |  |  | Contact |
| `qualifications` | Array<subdocument> |  |  |  |  |  |  |
| `qualifications.degree` | String |  |  |  |  |  |  |
| `qualifications.year` | Number |  |  |  |  |  |  |
| `qualifications.institute` | String |  |  |  |  |  |  |
| `certifications` | Array<subdocument> |  |  |  |  |  |  |
| `certifications.name` | String |  |  |  |  |  |  |
| `certifications.issuedBy` | String |  |  |  |  |  |  |
| `certifications.expiryDate` | Date |  |  |  |  |  |  |
| `leaveBalance.casual` | Number |  |  | 12 |  |  |  |
| `leaveBalance.sick` | Number |  |  | 10 |  |  |  |
| `leaveBalance.annual` | Number |  |  | 15 |  |  |  |
| `attendance` | Array<subdocument> |  |  |  |  |  |  |
| `attendance.date` | Date |  |  |  |  |  |  |
| `attendance.status` | String |  |  |  | Present, Absent, Leave, Half Day |  |  |
| `overtime` | Array<subdocument> |  |  |  |  |  |  |
| `overtime.date` | Date |  |  | [function] |  |  |  |
| `overtime.hours` | Number |  |  | 0 |  |  |  |
| `overtime.reason` | String |  |  |  |  |  |  |
| `overtime.approvedBy` | String |  |  |  |  |  |  |
| `overtime.approvedAt` | Date |  |  |  |  |  |  |
| `status` | String |  |  | "Active" | Active, Inactive, On Leave, Resigned |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `employeeId:1` | unique |
| `hospitalId:1` |  |

### `suppliers` — Supplier

source `Supplier.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `supplierId` | String | yes | yes |  |  |  |  |
| `name` | String | yes |  |  |  |  |  |
| `contactPerson` | String |  |  |  |  |  |  |
| `email` | String |  |  |  |  |  |  |
| `phone` | String | yes |  |  |  |  |  |
| `address` | String |  |  |  |  |  |  |
| `gstNumber` | String |  |  |  |  |  |  |
| `category` | String |  |  | "General" | Medical Supplies, Pharmaceuticals, Surgical Instruments, Equipment, General |  |  |
| `items` | Array<Mixed> |  |  |  |  |  |  |
| `rating` | Number |  |  |  |  |  |  |
| `leadTime` | Number |  |  | 7 |  |  |  |
| `paymentTerms` | String |  |  | "Net 30" |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `notes` | String |  |  |  |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `supplierId:1` | unique |
| `hospitalId:1` |  |

### `supporttickets` — SupportTicket

source `SupportTicket.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `ticketId` | String | yes | yes |  |  |  |  |
| `raisedBy` | ObjectId | yes |  |  |  | User |  |
| `raisedByName` | String |  |  |  |  |  |  |
| `facilityId` | ObjectId |  |  |  |  |  |  |
| `facilityType` | String |  |  |  | hospital, clinic, lab, pharmacy, |  |  |
| `subject` | String | yes |  |  |  |  |  |
| `description` | String | yes |  |  |  |  |  |
| `category` | String |  |  | "Other" | Technical, Billing, Account, Feature Request, Other |  |  |
| `priority` | String |  |  | "Medium" | Low, Medium, High, Urgent |  |  |
| `status` | String |  |  | "Open" | Open, In Progress, Waiting on User, Resolved, Closed |  |  |
| `assignedTo` | ObjectId |  |  |  |  | User | Identifier |
| `assignedToName` | String |  |  |  |  |  |  |
| `messages` | Array<subdocument> |  |  |  |  |  |  |
| `messages.sender` | ObjectId |  |  |  |  | User |  |
| `messages.senderName` | String |  |  |  |  |  |  |
| `messages.message` | String | yes |  |  |  |  |  |
| `messages.attachments` | Array<subdocument> |  |  |  |  |  |  |
| `messages.attachments.url` | String |  |  |  |  |  |  |
| `messages.attachments.name` | String |  |  |  |  |  |  |
| `messages.createdAt` | Date |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `ticketId:1` | unique |
| `raisedBy:1, createdAt:-1` |  |
| `status:1, createdAt:-1` |  |

### `systemsettings` — SystemSetting

source `SystemSetting.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `key` | String | yes | yes |  |  |  |  |
| `value` | Mixed | yes |  |  |  |  |  |
| `description` | String |  |  | "" |  |  |  |
| `updatedBy` | String |  |  | "" |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `key:1` | unique |

### `tests` — Test

source `Test.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `name` | String | yes |  |  |  |  |  |
| `category` | String | yes |  |  |  |  |  |
| `department` | String |  |  | "Pathology" |  |  |  |
| `price` | Number | yes |  |  |  |  |  |
| `mrp` | Number |  |  | 0 |  |  |  |
| `discount` | Number |  |  | 0 |  |  |  |
| `reportTime` | String |  |  | "24 hrs" |  |  |  |
| `prescriptionReq` | Boolean |  |  | false |  |  |  |
| `homeCollection` | Boolean |  |  | false |  |  |  |
| `homeCollectionFee` | Number |  |  | 0 |  |  |  |
| `popular` | Boolean |  |  | false |  |  |  |
| `nablAccredited` | Boolean |  |  | false |  |  |  |
| `aerbCertified` | Boolean |  |  | false |  |  |  |
| `reportsOnline` | Boolean |  |  | true |  |  |  |
| `quickTest` | Boolean |  |  | false |  |  |  |
| `walkinAvailable` | Boolean |  |  | true |  |  |  |
| `description` | String |  |  | "" |  |  |  |
| `preparation` | String |  |  | "" |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `providerType` | String |  |  | "lab_technician" | hospital, clinic, lab_technician, phlebotomist, radiographer, sonographer |  |  |
| `providerName` | String |  |  | "" |  |  |  |
| `providerId` | String |  |  | "" |  |  |  |
| `providerLogo` | String |  |  | "" |  |  |  |
| `distance` | String |  |  | "" |  |  |  |
| `rating` | Number |  |  | 4.5 |  |  |  |
| `reviewsCount` | Number |  |  | 0 |  |  |  |
| `clinicType` | String |  |  | "" |  |  |  |
| `linkedDoctor` | String |  |  | "" |  |  |  |
| `doctor` | String |  |  | "" |  |  |  |
| `admissionReq` | Boolean |  |  | false |  |  |  |
| `mode` | String |  |  | "" |  |  |  |
| `certifiedPhlebotomist` | Boolean |  |  | false |  |  |  |
| `certifiedSonographer` | Boolean |  |  | false |  |  |  |
| `sampleType` | String |  |  | "" |  |  |  |
| `equipmentType` | String |  |  | "" |  |  |  |
| `scanType` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `tokens` — Token

source `Token.js` · timestamps: yes · virtuals: 0 · retention: 15–60 minutes (TTL index) — tokens until logout or expiry (docs/privacy/RETENTION.md) · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `tokenNumber` | String | yes | yes |  |  |  |  |
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `patientName` | String | yes |  |  |  |  | Identity |
| `uhid` | String |  |  |  |  |  |  |
| `doctorId` | ObjectId |  |  |  |  | Doctor | Identifier |
| `doctorName` | String |  |  |  |  |  | Identity |
| `department` | String | yes |  |  |  |  |  |
| `appointmentId` | ObjectId |  |  |  |  | Appointment |  |
| `type` | String |  |  | "OPD" | OPD, IPD, Emergency, Lab, Pharmacy, Radiology |  |  |
| `priority` | String |  |  | "Normal" | Normal, Urgent, Emergency |  |  |
| `status` | String |  |  | "Waiting" | Waiting, Called, In Consultation, Completed, Skipped, Cancelled |  |  |
| `queuePosition` | Number |  |  |  |  |  |  |
| `estimatedWaitTime` | Number |  |  |  |  |  |  |
| `checkedInAt` | Date |  |  |  |  |  |  |
| `calledAt` | Date |  |  |  |  |  |  |
| `consultationStartTime` | Date |  |  |  |  |  |  |
| `consultationEndTime` | Date |  |  |  |  |  |  |
| `completedAt` | Date |  |  |  |  |  |  |
| `roomNumber` | String |  |  |  |  |  |  |
| `notes` | String |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `tokenNumber:1` | unique |
| `uhid:1` |  |
| `hospitalId:1` |  |

### `transactionledgers` — TransactionLedger

source `TransactionLedger.js` · timestamps: yes · virtuals: 0 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `facilityId` | ObjectId |  |  | null |  | Hospital |  |
| `facilityName` | String |  |  | "" |  |  | Identity |
| `facilityType` | String |  |  | "hospital" |  |  |  |
| `providerId` | ObjectId |  |  | null |  | User | Identifier |
| `userId` | ObjectId |  |  | null |  | User | Identifier |
| `source` | String |  |  | "ride" | ride, lawyer, assistant, emergency_doctor, ambulance, appointment, lab, pharmacy, ipd, radiology, ot, physio, other |  |  |
| `sourceId` | String |  |  | "" |  |  |  |
| `bookingNumber` | String |  |  | "" |  |  |  |
| `patientName` | String |  |  | "" |  |  | Identity |
| `amount` | Number |  |  | 0 |  |  |  |
| `commissionPercent` | Number |  |  | 10 |  |  |  |
| `commissionAmount` | Number |  |  | 0 |  |  |  |
| `taxAmount` | Number |  |  | 0 |  |  |  |
| `netAmount` | Number |  |  | 0 |  |  |  |
| `entryType` | String |  |  | "CREDIT" | CREDIT, DEBIT |  |  |
| `status` | String |  |  | "completed" | completed, held_in_escrow, refunded, cancelled |  |  |
| `payoutId` | ObjectId |  |  | null |  | Payout |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `facilityId:1` |  |
| `providerId:1` |  |
| `userId:1` |  |
| `source:1` |  |
| `sourceId:1` |  |
| `createdAt:-1` |  |
| `providerId:1, createdAt:-1` |  |
| `facilityId:1, createdAt:-1` |  |
| `source:1, sourceId:1` | unique, partial |

### `triages` — Triage

source `Triage.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Contact, Demographic, Health, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `emergencyId` | String | yes | yes |  |  |  |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `patientName` | String | yes |  |  |  |  | Identity |
| `age` | Number |  |  |  |  |  | Demographic |
| `gender` | String |  |  |  |  |  | Demographic |
| `phone` | String |  |  |  |  |  | Contact |
| `arrivalMode` | String |  |  | "Walk-in" | Walk-in, Ambulance, Police, Referral |  |  |
| `broughtBy` | String |  |  |  |  |  |  |
| `chiefComplaint` | String | yes |  |  |  |  | Health |
| `triageLevel` | String | yes |  |  | P1-Immediate, P2-Urgent, P3-Less Urgent, P4-Non Urgent, P5-Deceased |  |  |
| `triageNotes` | String |  |  |  |  |  |  |
| `triagedBy` | ObjectId |  |  |  |  | User |  |
| `triagedAt` | Date |  |  |  |  |  |  |
| `vitals.bpSystolic` | Number |  |  |  |  |  | Health |
| `vitals.bpDiastolic` | Number |  |  |  |  |  | Health |
| `vitals.heartRate` | Number |  |  |  |  |  | Health |
| `vitals.respRate` | Number |  |  |  |  |  | Health |
| `vitals.temperature` | Number |  |  |  |  |  | Health |
| `vitals.spO2` | Number |  |  |  |  |  | Health |
| `vitals.bloodSugar` | Number |  |  |  |  |  | Health |
| `vitals.painScale` | Number |  |  |  |  |  | Health |
| `isMLCO` | Boolean |  |  | false |  |  |  |
| `mlcNumber` | String |  |  |  |  |  |  |
| `mlc` | Subdocument |  |  |  |  |  |  |
| `mlc.caseType` | String |  |  |  | Road Accident, Assault, Poisoning, Burns, Fall, Others |  |  |
| `mlc.policeStation` | String |  |  |  |  |  |  |
| `mlc.policeOfficer` | String |  |  |  |  |  |  |
| `mlc.officerPhone` | String |  |  |  |  |  |  |
| `mlc.firNumber` | String |  |  |  |  |  |  |
| `mlc.notes` | String |  |  |  |  |  |  |
| `mlc.reportedAt` | Date |  |  |  |  |  |  |
| `status` | String |  |  | "In Treatment" | In Treatment, Admitted, Referred, Discharged, DOD |  |  |
| `assignedDoctor` | ObjectId |  |  |  |  | User |  |
| `assignedDoctorName` | String |  |  |  |  |  |  |
| `treatmentNotes` | Array<subdocument> |  |  |  |  |  |  |
| `treatmentNotes.text` | String |  |  |  |  |  |  |
| `treatmentNotes.doctorName` | String |  |  |  |  |  | Identity |
| `treatmentNotes.timestamp` | Date |  |  | [function] |  |  |  |
| `referredTo` | String |  |  |  |  |  |  |
| `referredReason` | String |  |  |  |  |  |  |
| `dischargedAt` | Date |  |  |  |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `emergencyId:1` | unique |
| `hospitalId:1` |  |

### `users` — User

source `User.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Contact, Credential, Demographic, Financial, Government ID, Health, Identity, Image/Biometric, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `name` | String | yes |  |  |  |  | Identity |
| `email` | String | yes | yes |  |  |  | Contact |
| `password` | String | yes |  |  |  |  | Credential |
| `passwordHistory` | Array<Mixed> |  |  | [] |  |  |  |
| `mustResetPassword` | Boolean |  |  | false |  |  |  |
| `tokenVersion` | Number |  |  | 0 |  |  |  |
| `role` | String |  |  | "patient" | superadmin, hospital_admin, doctor, clinic_doctor, patient, lab_owner, lab_receptionist, lab_technician, pathologist, pharmacy_owner, pharmacist, nurse, radiologist, dietitian, physiotherapist, counsellor, counselor, mid_level_counselor, senior_counselor, psychiatrist, accountant… (361 chars) |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `facilityId` | ObjectId |  |  |  |  | Facility |  |
| `facilityType` | String |  |  | "" | hospital, clinic, lab, pharmacy, |  |  |
| `avatar` | String |  |  | "" |  |  | Image/Biometric |
| `phone` | String | yes |  |  |  |  | Contact |
| `address` | String |  |  | "" |  |  | Contact |
| `uhid` | String |  | yes |  |  |  |  |
| `gender` | String |  |  | "" | , Male, Female, Other |  | Demographic |
| `bloodGroup` | String |  |  | "" |  |  | Demographic |
| `isBloodDonor` | Boolean |  |  | false |  |  |  |
| `donorOptInAt` | Date |  |  | null |  |  |  |
| `dateOfBirth` | Date |  |  |  |  |  | Demographic |
| `allergies` | Array<subdocument> |  |  |  |  |  | Health |
| `allergies.allergen` | String | yes |  |  |  |  | Health |
| `allergies.reaction` | String |  |  |  |  |  | Health |
| `allergies.severity` | String |  |  | "Mild" | Mild, Moderate, Severe |  | Health |
| `allergies.notes` | String |  |  |  |  |  | Health |
| `knownConditions` | Array<subdocument> |  |  |  |  |  |  |
| `knownConditions.condition` | String | yes |  |  |  |  | Health |
| `knownConditions.since` | String |  |  | "" |  |  |  |
| `knownConditions.notes` | String |  |  | "" |  |  |  |
| `specialization` | String |  |  | "" |  |  |  |
| `experience` | String |  |  | "" |  |  |  |
| `qualification` | String |  |  | "" |  |  |  |
| `licenseNumber` | String |  |  | "" |  |  |  |
| `consultationFee` | Number |  |  | 0 |  |  |  |
| `isVerified` | Boolean |  |  | false |  |  |  |
| `status` | String |  |  | "active" | active, blocked |  |  |
| `erasedAt` | Date |  |  | null |  |  |  |
| `flagged` | Boolean |  |  | false |  |  |  |
| `flagReason` | String |  |  | "" |  |  |  |
| `approvalStatus` | String |  |  | "not_required" | not_required, pending, approved, rejected |  |  |
| `twoFactorEnabled` | Boolean |  |  | false |  |  |  |
| `twoFactorSecret` | String |  |  | "" |  |  |  |
| `twoFactorBackupCodes` | Array<Mixed> |  |  |  |  |  |  |
| `twoFactorTempSecret` | String |  |  | "" |  |  |  |
| `driveTokens` | Mixed |  |  | null |  |  |  |
| `settings` | Mixed |  |  | [function] |  |  |  |
| `vehicleType` | String |  |  | "" | bike, scooter, bicycle, on-foot, |  |  |
| `vehicleNumber` | String |  |  | "" |  |  |  |
| `drivingLicenseNumber` | String |  |  | "" |  |  |  |
| `docs.aadharFront` | String |  |  | "" |  |  |  |
| `docs.aadharBack` | String |  |  | "" |  |  |  |
| `docs.panCard` | String |  |  | "" |  |  | Government ID |
| `docs.photo` | String |  |  | "" |  |  | Image/Biometric |
| `docs.drivingLicense` | String |  |  | "" |  |  | Government ID |
| `docs.rc` | String |  |  | "" |  |  |  |
| `docs.addressProof` | String |  |  | "" |  |  |  |
| `bankDetails.accountNumber` | String |  |  | "" |  |  | Financial |
| `bankDetails.ifsc` | String |  |  | "" |  |  | Financial |
| `bankDetails.accountHolderName` | String |  |  | "" |  |  |  |
| `bankDetails.upiId` | String |  |  | "" |  |  | Financial |
| `pharmacyId` | ObjectId |  |  |  |  | Facility |  |
| `currentLocation.lat` | Number |  |  | null |  |  | Location |
| `currentLocation.lng` | Number |  |  | null |  |  | Location |
| `isOnline` | Boolean |  |  | false |  |  |  |
| `lastActive` | Date |  |  | [function] |  |  |  |
| `deliveryZone` | Array<Mixed> |  |  |  |  |  |  |
| `workingHours` | Mixed |  |  | [function] |  |  |  |
| `emergencyContact.name` | String |  |  | "" |  |  | Identity |
| `emergencyContact.phone` | String |  |  | "" |  |  | Contact |
| `referral.code` | String |  | yes |  |  |  |  |
| `referral.referredBy` | ObjectId |  |  | null |  | User |  |
| `referral.referredByCode` | String |  |  | "" |  |  |  |
| `loyalty.pointsBalance` | Number |  |  | 0 |  |  |  |
| `loyalty.lifetimePoints` | Number |  |  | 0 |  |  |  |
| `loyalty.tier` | String |  |  | "Bronze" | Bronze, Silver, Gold, Platinum |  |  |
| `demoWallet.balance` | Number |  |  | 10000 |  |  |  |
| `demoWallet.currency` | String |  |  | "INR" |  |  |  |
| `healthIdCard.isEnabled` | Boolean |  |  | true |  |  |  |
| `healthIdCard.qrToken` | String |  | yes |  |  |  |  |
| `healthIdCard.qrTokenExpiry` | Date |  |  | null |  |  |  |
| `healthIdCard.qrTokenRotatedAt` | Date |  |  | null |  |  |  |
| `healthIdCard.qrTokenRevokedAt` | Date |  |  | null |  |  |  |
| `healthIdCard.lastRotatedAt` | Date |  |  |  |  |  |  |
| `healthIdCard.shareLevel` | String |  |  | "full" | full, minimal |  |  |
| `healthIdCard.abhaNumber` | String |  |  | "" |  |  | Government ID |
| `healthIdCard.abhaAddress` | String |  |  | "" |  |  |  |
| `healthIdCard.abhaStatus` | String |  |  | "NOT_LINKED" | NOT_LINKED, PENDING_OTP, LINKED |  |  |
| `healthIdCard.abhaLinkedAt` | Date |  |  |  |  |  |  |
| `healthIdCard.abhaPendingTxnId` | String |  |  | "" |  |  |  |
| `healthIdCard.abhaOtpHash` | String |  |  | "" |  |  |  |
| `healthIdCard.abhaOtpExpiresAt` | Date |  |  |  |  |  |  |
| `healthIdCard.abhaOtpAttempts` | Number |  |  | 0 |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `email:1` | unique |
| `mustResetPassword:1` |  |
| `tokenVersion:1` |  |
| `role:1` |  |
| `hospitalId:1` |  |
| `facilityId:1` |  |
| `uhid:1` | unique, sparse |
| `isBloodDonor:1` |  |
| `isVerified:1` |  |
| `status:1` |  |
| `erasedAt:1` |  |
| `flagged:1` |  |
| `approvalStatus:1` |  |
| `pharmacyId:1` |  |
| `lastActive:1` |  |
| `referral.code:1` | unique, sparse |
| `healthIdCard.qrToken:1` | unique, sparse |
| `healthIdCard.abhaNumber:1` |  |

### `vehicles` — Vehicle

source `Vehicle.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `riderId` | ObjectId |  |  |  |  | User |  |
| `type` | String | yes |  |  | bike, auto, e_rickshaw, car, van |  |  |
| `brand` | String | yes |  |  |  |  |  |
| `model` | String | yes |  |  |  |  |  |
| `rcNumber` | String | yes | yes |  |  |  |  |
| `rcDocUrl` | String |  |  | "" |  |  |  |
| `insuranceNumber` | String | yes |  |  |  |  |  |
| `insuranceDocUrl` | String |  |  | "" |  |  |  |
| `insuranceExpiry` | Date | yes |  |  |  |  |  |
| `color` | String |  |  | "" |  |  |  |
| `photos` | Array<Mixed> |  |  |  |  |  |  |
| `capacity` | Number |  |  | 4 |  |  |  |
| `fuelType` | String |  |  | "Petrol" | Petrol, Diesel, CNG, Electric, Hybrid, Other |  |  |
| `extraFields` | Mixed |  |  | [function] |  |  |  |
| `isDocumentVerified` | Boolean |  |  | false |  |  |  |
| `verifiedAt` | Date |  |  |  |  |  |  |
| `verifiedBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `riderId:1` |  |
| `type:1` |  |
| `rcNumber:1` | unique |
| `isDocumentVerified:1` |  |

### `vitalslogs` — VitalsLog

source `VitalsLog.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Health, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `patientId` | ObjectId |  |  | null |  | Patient | Identifier |
| `carePlanId` | ObjectId |  |  | null |  | ChronicCarePlan |  |
| `vitalType` | String | yes |  |  | bp, blood_sugar, weight, temperature, pulse, spo2 |  |  |
| `values.systolic` | Number |  |  | null |  |  |  |
| `values.diastolic` | Number |  |  | null |  |  |  |
| `values.sugarValue` | Number |  |  | null |  |  |  |
| `values.sugarContext` | String |  |  | "random" | fasting, post_meal, random, bedtime |  |  |
| `values.weightKg` | Number |  |  | null |  |  |  |
| `values.tempValue` | Number |  |  | null |  |  |  |
| `values.tempUnit` | String |  |  | "F" | F, C |  |  |
| `values.pulse` | Number |  |  | null |  |  |  |
| `values.spo2` | Number |  |  | null |  |  | Health |
| `bookingKind` | String |  |  | null | assistant, appointment, ipd, null |  |  |
| `bookingId` | ObjectId |  |  | null |  |  |  |
| `recordedBy` | ObjectId |  |  | null |  | User |  |
| `note` | String |  |  | "" |  |  |  |
| `recordedAt` | Date |  |  | [function] |  |  |  |
| `isBackdated` | Boolean |  |  | false |  |  |  |
| `flag` | String |  |  | "normal" | normal, high, low, fever |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `carePlanId:1` |  |
| `vitalType:1` |  |
| `bookingId:1` |  |
| `recordedAt:1` |  |
| `userId:1, vitalType:1, recordedAt:-1` |  |

### `vitalsreminders` — VitalsReminder

source `VitalsReminder.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `carePlanId` | ObjectId |  |  | null |  | ChronicCarePlan |  |
| `vitalType` | String | yes |  |  | bp, blood_sugar, weight, temperature |  |  |
| `times` | Array<Mixed> |  |  |  |  |  |  |
| `frequency` | String |  |  | "daily" | daily, specific_days |  |  |
| `daysOfWeek` | Array<Mixed> |  |  |  |  |  |  |
| `alarmSound.presetId` | String |  |  | "classic_alarm" | classic_alarm, digital_buzzer, gentle_rise, chime_cascade, custom |  |  |
| `alarmSound.customSoundUrl` | String |  |  | null |  |  |  |
| `status` | String |  |  | "active" | active, paused |  |  |
| `instructions` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |

### `waitlistentries` — WaitlistEntry

source `WaitlistEntry.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `patientName` | String |  |  | "" |  |  | Identity |
| `doctorId` | ObjectId | yes |  |  |  | Doctor | Identifier |
| `doctorName` | String |  |  | "" |  |  | Identity |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `department` | String |  |  | "General" |  |  |  |
| `date` | String | yes |  |  |  |  |  |
| `time` | String | yes |  |  |  |  |  |
| `status` | String |  |  | "waiting" | waiting, offered, accepted, expired, cancelled, declined |  |  |
| `offerAppointmentId` | ObjectId |  |  | null |  | Appointment |  |
| `offerFee` | Number |  |  | 0 |  |  |  |
| `offeredAt` | Date |  |  | null |  |  |  |
| `offerExpiresAt` | Date |  |  | null |  |  |  |
| `note` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `patientId:1, doctorId:1, date:1, time:1` | unique, partial |
| `status:1, offerExpiresAt:1` |  |
| `patientId:1, status:1` |  |
| `doctorId:1, date:1, time:1, status:1, createdAt:1` |  |

### `walletguards` — WalletGuard

source `WalletGuard.js` · timestamps: yes · virtuals: 0 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | String | yes | yes |  |  |  | Identifier |
| `kycStatus` | String |  |  | "unverified" | unverified, pending, verified, rejected |  |  |
| `kycVerifiedAt` | Date |  |  |  |  |  |  |
| `kycVerifiedBy` | String |  |  |  |  |  |  |
| `frozen.active` | Boolean |  |  | false |  |  |  |
| `frozen.reason` | String |  |  | "" |  |  |  |
| `frozen.at` | Date |  |  |  |  |  |  |
| `frozen.by` | String |  |  | "system" |  |  |  |
| `daily.dayKey` | String |  |  | "" |  |  |  |
| `daily.amount` | Number |  |  | 0 |  |  |  |
| `daily.count` | Number |  |  | 0 |  |  |  |
| `hourly.hourKey` | String |  |  | "" |  |  |  |
| `hourly.count` | Number |  |  | 0 |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` | unique |
