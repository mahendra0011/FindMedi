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

- **288 models** across 287 files (0 skipped)
- **6302 schema fields**, of which **704 classified as PII** in **201 collections**
- **6 collections** carry a TTL index
- **101 collections** hold PII but map to no retention class in RETENTION.md (gaps below)

### PII categories

| Category | Collections containing it |
|---|---|
| Credential | 4 |
| Government ID | 1 |
| Contact | 32 |
| Financial | 13 |
| Health | 29 |
| Demographic | 15 |
| Location | 23 |
| Image/Biometric | 4 |
| Device/Network | 7 |
| Identifier | 172 |
| Identity | 77 |

## Collections

| Collection | Model | Fields | PII fields | Indexes | TTL | Retention class |
|---|---|---|---|---|---|---|
| `accessrequests` | AccessRequest | 16 | 0 | 4 | — | No PII fields detected |
| `accessreviews` | AccessReview | 11 | 0 | 2 | — | No PII fields detected |
| `accounts` | Account | 11 | 2 | 2 | — | **UNMAPPED — see gaps** |
| `activities` | Activity | 11 | 0 | 4 | — | No PII fields detected |
| `admissions` | Admission | 96 | 22 | 3 | — | Clinical records |
| `adrreports` | AdrReport | 13 | 1 | 2 | — | Clinical records |
| `agentsessions` | AgentSession | 8 | 0 | 2 | — | No PII fields detected |
| `aiinvocations` | AiInvocation | 13 | 0 | 3 | — | No PII fields detected |
| `aisafetyevents` | AiSafetyEvent | 12 | 1 | 2 | — | **UNMAPPED — see gaps** |
| `ambulances` | Ambulance | 35 | 5 | 8 | — | Ride and SOS location traces |
| `ambulancesetupcodes` | AmbulanceSetupCode | 9 | 2 | 3 | 0s | OTP / setup codes / tokens |
| `announcements` | Announcement | 9 | 0 | 1 | — | Operational config (organization/catalog record — not personal data) |
| `antenatalrecords` | AntenatalRecord | 28 | 3 | 4 | — | Clinical records |
| `apikeys` | ApiKey | 13 | 2 | 5 | — | **UNMAPPED — see gaps** |
| `appointments` | Appointment | 86 | 11 | 14 | — | Clinical records |
| `appointmentseries` | AppointmentSeries | 24 | 4 | 3 | — | **UNMAPPED — see gaps** |
| `approvalpolicies` | ApprovalPolicy | 14 | 1 | 3 | — | **UNMAPPED — see gaps** |
| `approvalrequests` | ApprovalRequest | 23 | 0 | 2 | — | No PII fields detected |
| `assetmaintenances` | AssetMaintenance | 14 | 1 | 5 | — | **UNMAPPED — see gaps** |
| `assetunits` | AssetUnit | 24 | 2 | 7 | — | **UNMAPPED — see gaps** |
| `assistantbookings` | AssistantBooking | 82 | 15 | 11 | — | Clinical records |
| `assistantprofiles` | AssistantProfile | 73 | 13 | 13 | — | Provider KYC documents |
| `auditlogs` | AuditLog | 9 | 3 | 3 | 31536000s | Audit logs |
| `bankaccounts` | BankAccount | 9 | 1 | 2 | — | **UNMAPPED — see gaps** |
| `banktxns` | BankTxn | 13 | 0 | 3 | — | No PII fields detected |
| `beds` | Bed | 19 | 0 | 3 | — | No PII fields detected |
| `bedtransfers` | BedTransfer | 13 | 1 | 3 | — | Clinical records |
| `billings` | Billing | 62 | 4 | 5 | — | Payment and ledger entries |
| `birthrecords` | BirthRecord | 12 | 0 | 1 | — | No PII fields detected |
| `bloodrequests` | BloodRequest | 35 | 6 | 2 | — | Clinical records |
| `bloodunits` | BloodUnit | 24 | 1 | 2 | — | Clinical records |
| `bmwlogs` | BmwLog | 13 | 1 | 3 | — | **UNMAPPED — see gaps** |
| `breakglassgrants` | BreakGlassGrant | 23 | 0 | 6 | — | No PII fields detected |
| `calllogs` | CallLog | 16 | 0 | 5 | — | No PII fields detected |
| `callqueues` | CallQueue | 11 | 2 | 2 | — | **UNMAPPED — see gaps** |
| `campaigns` | Campaign | 18 | 1 | 5 | — | **UNMAPPED — see gaps** |
| `capas` | Capa | 16 | 1 | 3 | — | **UNMAPPED — see gaps** |
| `casepresentations` | CasePresentation | 14 | 0 | 4 | — | No PII fields detected |
| `cashcounters` | CashCounter | 8 | 0 | 1 | — | Operational config (organization/catalog record — not personal data) |
| `cashshifts` | CashShift | 15 | 0 | 4 | — | No PII fields detected |
| `categories` | Category | 23 | 0 | 3 | — | Operational config (organization/catalog record — not personal data) |
| `chargeitems` | ChargeItem | 23 | 1 | 8 | — | Clinical records |
| `chatconversations` | ChatConversation | 37 | 4 | 4 | — | **UNMAPPED — see gaps** |
| `chatmessages` | ChatMessage | 33 | 3 | 4 | 0s | **UNMAPPED — see gaps** |
| `chatprivacies` | ChatPrivacy | 61 | 1 | 1 | — | **UNMAPPED — see gaps** |
| `chatreports` | ChatReport | 13 | 1 | 6 | — | **UNMAPPED — see gaps** |
| `chemocycles` | ChemoCycle | 17 | 2 | 5 | — | Clinical records |
| `chemoprotocols` | ChemoProtocol | 16 | 3 | 2 | — | Clinical records |
| `chroniccareplans` | ChronicCarePlan | 22 | 4 | 2 | — | Clinical records |
| `cities` | City | 9 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `claims` | Claim | 30 | 2 | 5 | — | Clinical records |
| `clinicprofiles` | ClinicProfile | 21 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `cmecredits` | CMECredit | 9 | 1 | 3 | — | **UNMAPPED — see gaps** |
| `commissionconfigs` | CommissionConfig | 13 | 1 | 1 | — | Payment and ledger entries |
| `consentforms` | ConsentForm | 17 | 2 | 5 | — | ABDM consent records |
| `consentrecords` | ConsentRecord | 14 | 2 | 4 | — | ABDM consent records |
| `contracts` | Contract | 19 | 0 | 4 | — | No PII fields detected |
| `corporateemployees` | CorporateEmployee | 8 | 1 | 2 | — | **UNMAPPED — see gaps** |
| `corporates` | Corporate | 10 | 2 | 1 | — | **UNMAPPED — see gaps** |
| `credentials` | Credential | 12 | 0 | 4 | — | No PII fields detected |
| `creditnotes` | CreditNote | 14 | 2 | 3 | — | Payment and ledger entries |
| `dailymetrics` | DailyMetric | 6 | 0 | 2 | — | No PII fields detected |
| `dailyrcmmetrics` | DailyRcmMetric | 11 | 0 | 3 | — | No PII fields detected |
| `dashboardalerts` | DashboardAlert | 16 | 0 | 5 | — | No PII fields detected |
| `datasubjectrequests` | DataSubjectRequest | 18 | 1 | 7 | — | Audit logs |
| `deathrecords` | DeathRecord | 18 | 2 | 1 | — | Clinical records |
| `delegations` | Delegation | 10 | 0 | 1 | — | No PII fields detected |
| `deletionrequests` | DeletionRequest | 27 | 1 | 2 | — | Audit logs |
| `deliverypartners` | DeliveryPartner | 44 | 16 | 3 | — | Provider KYC documents |
| `demopayments` | DemoPayment | 19 | 5 | 17 | — | Payment and ledger entries |
| `dentalcharts` | DentalChart | 12 | 3 | 3 | — | **UNMAPPED — see gaps** |
| `dentallabworks` | DentalLabWork | 12 | 2 | 5 | — | **UNMAPPED — see gaps** |
| `dentaltreatmentplans` | DentalTreatmentPlan | 13 | 3 | 4 | — | **UNMAPPED — see gaps** |
| `departments` | Department | 9 | 0 | 1 | — | Operational config (organization/catalog record — not personal data) |
| `dialysissessions` | DialysisSession | 18 | 2 | 4 | — | **UNMAPPED — see gaps** |
| `dialysiswaterqualities` | DialysisWaterQuality | 10 | 1 | 3 | — | **UNMAPPED — see gaps** |
| `dietorders` | DietOrder | 31 | 6 | 3 | — | Clinical records |
| `dischargeworkflows` | DischargeWorkflow | 31 | 2 | 4 | — | Clinical records |
| `discountpolicies` | DiscountPolicy | 10 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `disputes` | Dispute | 36 | 1 | 4 | — | Payment and ledger entries |
| `dndentries` | DndEntry | 8 | 2 | 3 | — | **UNMAPPED — see gaps** |
| `doctorfees` | DoctorFee | 12 | 2 | 3 | — | **UNMAPPED — see gaps** |
| `doctors` | Doctor | 117 | 11 | 15 | — | Provider KYC documents |
| `donorscreenings` | DonorScreening | 17 | 3 | 2 | — | **UNMAPPED — see gaps** |
| `emergencies` | Emergency | 21 | 7 | 3 | — | Ride and SOS location traces |
| `emergencydoctorrequests` | EmergencyDoctorRequest | 75 | 21 | 6 | — | Ride and SOS location traces |
| `emergencyrequests` | EmergencyRequest | 62 | 17 | 4 | — | Ride and SOS location traces |
| `encounters` | Encounter | 24 | 2 | 8 | — | Clinical records |
| `enquiries` | Enquiry | 13 | 3 | 4 | — | **UNMAPPED — see gaps** |
| `equipment` | Equipment | 22 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `eventregistrations` | EventRegistration | 17 | 2 | 5 | — | **UNMAPPED — see gaps** |
| `events` | Event | 44 | 4 | 8 | — | **UNMAPPED — see gaps** |
| `expenses` | Expense | 15 | 1 | 4 | — | Payment and ledger entries |
| `eyeexams` | EyeExam | 21 | 3 | 3 | — | **UNMAPPED — see gaps** |
| `eyesurgeryleads` | EyeSurgeryLead | 10 | 2 | 5 | — | **UNMAPPED — see gaps** |
| `facilities` | Facility | 79 | 0 | 8 | — | Operational config (organization/catalog record — not personal data) |
| `familymembers` | FamilyMember | 35 | 12 | 3 | — | Clinical records |
| `featuredlistings` | FeaturedListing | 11 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `fertilitycycles` | FertilityCycle | 19 | 3 | 6 | — | **UNMAPPED — see gaps** |
| `formresponses` | FormResponse | 19 | 3 | 6 | — | Clinical records |
| `formtemplates` | FormTemplate | 38 | 0 | 4 | — | Operational config (organization/catalog record — not personal data) |
| `grns` | GRN | 19 | 0 | 3 | — | Operational config (organization/catalog record — not personal data) |
| `healthpackages` | HealthPackage | 17 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `hospitals` | Hospital | 52 | 0 | 6 | — | Operational config (organization/catalog record — not personal data) |
| `housekeepings` | Housekeeping | 15 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `hubintegrations` | HubIntegration | 10 | 0 | 3 | — | No PII fields detected |
| `iamassignments` | IamAssignment | 18 | 1 | 6 | — | **UNMAPPED — see gaps** |
| `iamgroups` | IamGroup | 9 | 2 | 2 | — | **UNMAPPED — see gaps** |
| `iampolicies` | IamPolicy | 15 | 3 | 3 | — | **UNMAPPED — see gaps** |
| `iamroles` | IamRole | 10 | 2 | 3 | — | **UNMAPPED — see gaps** |
| `icuflowsheets` | IcuFlowsheet | 20 | 3 | 3 | — | Clinical records |
| `incidents` | Incident | 19 | 1 | 5 | — | Clinical records |
| `indents` | Indent | 16 | 0 | 3 | — | Operational config (organization/catalog record — not personal data) |
| `instrumentsets` | InstrumentSet | 11 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `insurancepolicies` | InsurancePolicy | 11 | 1 | 2 | — | **UNMAPPED — see gaps** |
| `insurances` | Insurance | 42 | 5 | 2 | — | Payment and ledger entries |
| `insurers` | Insurer | 12 | 2 | 3 | — | **UNMAPPED — see gaps** |
| `integrationconfigs` | IntegrationConfig | 18 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `integrationmessages` | IntegrationMessage | 10 | 0 | 5 | — | No PII fields detected |
| `interactions` | Interaction | 18 | 2 | 5 | — | **UNMAPPED — see gaps** |
| `inventories` | Inventory | 24 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `invoiceseries` | InvoiceSeries | 7 | 0 | 2 | — | No PII fields detected |
| `ipddeposits` | IpdDeposit | 15 | 2 | 4 | — | Payment and ledger entries |
| `kpidefinitions` | KpiDefinition | 9 | 1 | 1 | — | **UNMAPPED — see gaps** |
| `labbookings` | LabBooking | 33 | 3 | 4 | — | Clinical records |
| `laborders` | LabOrder | 65 | 7 | 7 | — | Clinical records |
| `labourrecords` | LabourRecord | 19 | 2 | 3 | — | Clinical records |
| `lawyerbookings` | LawyerBooking | 88 | 19 | 14 | — | **UNMAPPED — see gaps** |
| `lawyerprofiles` | LawyerProfile | 87 | 12 | 14 | — | Provider KYC documents |
| `leads` | Lead | 34 | 6 | 10 | — | **UNMAPPED — see gaps** |
| `leaverequests` | LeaveRequest | 15 | 2 | 1 | — | **UNMAPPED — see gaps** |
| `ledgerentries` | LedgerEntry | 12 | 1 | 4 | — | Payment and ledger entries |
| `licenses` | License | 17 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `loanadvances` | LoanAdvance | 11 | 1 | 4 | — | **UNMAPPED — see gaps** |
| `locations` | Location | 9 | 1 | 3 | — | **UNMAPPED — see gaps** |
| `loginevents` | LoginEvent | 10 | 3 | 4 | 15552000s | Audit logs |
| `loyaltyearnrules` | LoyaltyEarnRule | 6 | 0 | 2 | — | No PII fields detected |
| `loyaltyledgers` | LoyaltyLedger | 9 | 1 | 4 | — | Payment and ledger entries |
| `mappingprofiles` | MappingProfile | 8 | 0 | 2 | — | No PII fields detected |
| `mealsubscriptions` | MealSubscription | 23 | 3 | 5 | — | **UNMAPPED — see gaps** |
| `medicinedoselogs` | MedicineDoseLog | 11 | 1 | 4 | — | Clinical records |
| `medicinereminders` | MedicineReminder | 20 | 2 | 1 | — | Clinical records |
| `medicines` | Medicine | 38 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `memberships` | Membership | 37 | 4 | 9 | — | **UNMAPPED — see gaps** |
| `mentalhealths` | MentalHealth | 82 | 11 | 4 | — | Mental-health records |
| `mlccases` | MlcCase | 15 | 2 | 4 | — | Clinical records |
| `moderationitems` | ModerationItem | 40 | 1 | 13 | — | **UNMAPPED — see gaps** |
| `mtpregisters` | MtpRegister | 12 | 3 | 1 | — | **UNMAPPED — see gaps** |
| `nabhassessments` | NabhAssessment | 10 | 0 | 3 | — | No PII fields detected |
| `nabhchapters` | NabhChapter | 9 | 0 | 1 | — | No PII fields detected |
| `notificationaudits` | NotificationAudit | 11 | 1 | 6 | — | Audit logs |
| `notificationdeliveries` | NotificationDelivery | 19 | 1 | 6 | — | Notifications |
| `notificationpreferences` | NotificationPreference | 15 | 2 | 1 | — | **UNMAPPED — see gaps** |
| `notifications` | Notification | 15 | 1 | 3 | — | Notifications |
| `notificationtemplates` | NotificationTemplate | 12 | 0 | 3 | — | No PII fields detected |
| `notifytemplates` | NotifyTemplate | 14 | 2 | 3 | — | **UNMAPPED — see gaps** |
| `nursingcharts` | NursingChart | 34 | 12 | 1 | — | Clinical records |
| `objectives` | Objective | 15 | 1 | 3 | — | **UNMAPPED — see gaps** |
| `operationtheatres` | OperationTheatre | 77 | 9 | 4 | — | Clinical records |
| `opticaljobcards` | OpticalJobCard | 19 | 2 | 4 | — | **UNMAPPED — see gaps** |
| `orders` | Order | 20 | 1 | 7 | — | Clinical records |
| `otps` | OTP | 12 | 3 | 6 | 3600s | OTP / setup codes / tokens |
| `outboundcampaigns` | OutboundCampaign | 14 | 2 | 2 | — | **UNMAPPED — see gaps** |
| `outboxevents` | OutboxEvent | 15 | 0 | 9 | — | No PII fields detected |
| `partners` | Partner | 23 | 2 | 6 | — | **UNMAPPED — see gaps** |
| `patientaddresses` | PatientAddress | 11 | 4 | 1 | — | Clinical records |
| `patientflags` | PatientFlag | 10 | 1 | 3 | — | **UNMAPPED — see gaps** |
| `patientmovements` | PatientMovement | 23 | 1 | 6 | — | Clinical records |
| `patients` | Patient | 42 | 10 | 9 | — | Clinical records |
| `payments` | Payment | 31 | 2 | 4 | — | Payment and ledger entries |
| `payouts` | Payout | 20 | 1 | 1 | — | Payment and ledger entries |
| `payoutstatements` | PayoutStatement | 15 | 2 | 4 | — | **UNMAPPED — see gaps** |
| `payslips` | Payslip | 21 | 1 | 4 | — | **UNMAPPED — see gaps** |
| `pcpndtformfs` | PcpndtFormF | 13 | 4 | 1 | — | **UNMAPPED — see gaps** |
| `pharmacydeliveries` | PharmacyDelivery | 34 | 9 | 5 | — | Clinical records |
| `pharmacyoffers` | PharmacyOffer | 14 | 0 | 2 | — | No PII fields detected |
| `pharmacyorders` | PharmacyOrder | 52 | 4 | 7 | — | Clinical records |
| `pharmacyreturns` | PharmacyReturn | 18 | 2 | 2 | — | Clinical records |
| `pharmacystaffs` | PharmacyStaff | 13 | 3 | 1 | — | Provider KYC documents |
| `physiotherapies` | Physiotherapy | 34 | 6 | 2 | — | Clinical records |
| `plans` | Plan | 19 | 0 | 3 | — | No PII fields detected |
| `platformcontents` | PlatformContent | 14 | 0 | 3 | — | Operational config (organization/catalog record — not personal data) |
| `platformcouponredemptions` | PlatformCouponRedemption | 8 | 1 | 4 | — | Payment and ledger entries |
| `platformcoupons` | PlatformCoupon | 17 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `platformcouponuserusages` | PlatformCouponUserUsage | 6 | 1 | 1 | — | Payment and ledger entries |
| `pmjaypackages` | PmjayPackage | 7 | 1 | 1 | — | **UNMAPPED — see gaps** |
| `policyacceptances` | PolicyAcceptance | 12 | 4 | 4 | — | **UNMAPPED — see gaps** |
| `practitionerprofiles` | PractitionerProfile | 31 | 5 | 6 | — | Provider KYC documents |
| `preauthrequests` | PreAuthRequest | 25 | 3 | 4 | — | Clinical records |
| `preferredpharmacies` | PreferredPharmacy | 7 | 1 | 2 | — | **UNMAPPED — see gaps** |
| `prescriptions` | Prescription | 50 | 7 | 3 | — | Clinical records |
| `printlogs` | PrintLog | 13 | 0 | 3 | — | No PII fields detected |
| `printtemplates` | PrintTemplate | 17 | 0 | 4 | — | Operational config (organization/catalog record — not personal data) |
| `products` | Product | 30 | 0 | 6 | — | No PII fields detected |
| `providerapplications` | ProviderApplication | 44 | 1 | 10 | — | Provider KYC documents |
| `providerdocuments` | ProviderDocument | 29 | 1 | 7 | — | Provider KYC documents |
| `providers` | Provider | 69 | 10 | 15 | — | Provider KYC documents |
| `providertypeconfigs` | ProviderTypeConfig | 45 | 0 | 6 | — | No PII fields detected |
| `purchaseorders` | PurchaseOrder | 25 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `pushsubscriptions` | PushSubscription | 9 | 2 | 2 | — | **UNMAPPED — see gaps** |
| `qcruns` | QcRun | 12 | 0 | 4 | — | No PII fields detected |
| `qualitychecklists` | QualityChecklist | 12 | 1 | 3 | — | **UNMAPPED — see gaps** |
| `queues` | Queue | 18 | 0 | 5 | — | Operational config (organization/catalog record — not personal data) |
| `queuetickets` | QueueTicket | 21 | 2 | 5 | — | Clinical records |
| `quotes` | Quote | 48 | 7 | 8 | — | **UNMAPPED — see gaps** |
| `radiologies` | Radiology | 28 | 5 | 5 | — | Clinical records |
| `rcmevents` | RcmEvent | 10 | 0 | 3 | — | No PII fields detected |
| `rcmgaps` | RcmGap | 11 | 0 | 3 | — | No PII fields detected |
| `reasoncodes` | ReasonCode | 9 | 0 | 3 | — | No PII fields detected |
| `recalllogs` | RecallLog | 11 | 1 | 3 | — | **UNMAPPED — see gaps** |
| `recallrules` | RecallRule | 11 | 1 | 4 | — | **UNMAPPED — see gaps** |
| `reconmatches` | ReconMatch | 10 | 0 | 1 | — | No PII fields detected |
| `reconrules` | ReconRule | 8 | 1 | 1 | — | **UNMAPPED — see gaps** |
| `records` | Record | 38 | 12 | 3 | — | Clinical records |
| `recordversions` | RecordVersion | 16 | 2 | 3 | — | Clinical records |
| `referrals` | Referral | 14 | 0 | 5 | — | No PII fields detected |
| `referralsettings` | ReferralSettings | 8 | 0 | 0 | — | No PII fields detected |
| `refreshtokens` | RefreshToken | 13 | 3 | 5 | 0s | OTP / setup codes / tokens |
| `refunds` | Refund | 16 | 1 | 5 | — | Payment and ledger entries |
| `rentals` | Rental | 39 | 1 | 8 | — | **UNMAPPED — see gaps** |
| `reportdefinitions` | ReportDefinition | 10 | 1 | 1 | — | **UNMAPPED — see gaps** |
| `reportruns` | ReportRun | 12 | 0 | 3 | — | No PII fields detected |
| `reports` | Report | 15 | 1 | 2 | — | Clinical records |
| `reportschedules` | ReportSchedule | 11 | 0 | 1 | — | No PII fields detected |
| `resourcescopes` | ResourceScope | 9 | 0 | 3 | — | Operational config (organization/catalog record — not personal data) |
| `reviews` | Review | 19 | 4 | 6 | — | **UNMAPPED — see gaps** |
| `rewardcatalogitems` | RewardCatalogItem | 15 | 0 | 2 | — | No PII fields detected |
| `rewardredemptions` | RewardRedemption | 11 | 1 | 4 | — | Payment and ledger entries |
| `ridebookings` | RideBooking | 72 | 13 | 9 | — | Ride and SOS location traces |
| `riderprofiles` | RiderProfile | 49 | 12 | 12 | — | Provider KYC documents |
| `ridetrackings` | RideTracking | 10 | 3 | 3 | — | Ride and SOS location traces |
| `roomtariffs` | RoomTariff | 13 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `rosters` | Roster | 14 | 1 | 4 | — | **UNMAPPED — see gaps** |
| `rulefirings` | RuleFiring | 10 | 0 | 4 | — | No PII fields detected |
| `rules` | Rule | 13 | 2 | 4 | — | **UNMAPPED — see gaps** |
| `rxtemplates` | RxTemplate | 16 | 3 | 3 | — | **UNMAPPED — see gaps** |
| `savedfavorites` | SavedFavorite | 8 | 1 | 2 | — | **UNMAPPED — see gaps** |
| `savedviews` | SavedView | 9 | 1 | 1 | — | **UNMAPPED — see gaps** |
| `schedulechangerequests` | ScheduleChangeRequest | 35 | 2 | 1 | — | **UNMAPPED — see gaps** |
| `secondopinionrequests` | SecondOpinionRequest | 14 | 3 | 6 | — | **UNMAPPED — see gaps** |
| `servicecities` | ServiceCity | 8 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `serviceprices` | ServicePrice | 18 | 0 | 4 | — | Operational config (organization/catalog record — not personal data) |
| `services` | Service | 34 | 0 | 7 | — | No PII fields detected |
| `shifthandovers` | ShiftHandover | 16 | 1 | 3 | — | Clinical records |
| `shiftswaps` | ShiftSwap | 12 | 1 | 3 | — | **UNMAPPED — see gaps** |
| `signatureevents` | SignatureEvent | 20 | 1 | 3 | — | Clinical records |
| `sosvehiclesettings` | SOSVehicleSettings | 8 | 0 | 0 | — | No PII fields detected |
| `staffs` | Staff | 40 | 6 | 2 | — | Provider KYC documents |
| `statementimports` | StatementImport | 11 | 0 | 1 | — | No PII fields detected |
| `sterilisationcycles` | SterilisationCycle | 15 | 0 | 4 | — | No PII fields detected |
| `sterilisationlogs` | SterilisationLog | 13 | 1 | 4 | — | **UNMAPPED — see gaps** |
| `stockledgers` | StockLedger | 12 | 0 | 4 | — | Operational config (organization/catalog record — not personal data) |
| `stores` | Store | 9 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `strikes` | Strike | 25 | 2 | 8 | — | **UNMAPPED — see gaps** |
| `suppliers` | Supplier | 29 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `supporttickets` | SupportTicket | 26 | 1 | 4 | — | **UNMAPPED — see gaps** |
| `systemsettings` | SystemSetting | 7 | 0 | 1 | — | Operational config (organization/catalog record — not personal data) |
| `tasks` | Task | 17 | 2 | 5 | — | **UNMAPPED — see gaps** |
| `teammembers` | TeamMember | 18 | 1 | 4 | — | **UNMAPPED — see gaps** |
| `teleconsents` | TeleConsent | 10 | 3 | 4 | — | **UNMAPPED — see gaps** |
| `tenantgrants` | TenantGrant | 20 | 0 | 6 | — | No PII fields detected |
| `territories` | Territory | 11 | 1 | 2 | — | **UNMAPPED — see gaps** |
| `tests` | Test | 45 | 0 | 2 | — | Operational config (organization/catalog record — not personal data) |
| `tokens` | Token | 24 | 4 | 3 | — | OTP / setup codes / tokens |
| `transactionledgers` | TransactionLedger | 20 | 4 | 9 | — | Payment and ledger entries |
| `triages` | Triage | 46 | 16 | 2 | — | Clinical records |
| `users` | User | 94 | 26 | 18 | — | **UNMAPPED — see gaps** |
| `vaccinationschedules` | VaccinationSchedule | 17 | 1 | 5 | — | Clinical records |
| `vehicles` | Vehicle | 20 | 0 | 4 | — | Operational config (organization/catalog record — not personal data) |
| `vendorbills` | VendorBill | 21 | 1 | 5 | — | **UNMAPPED — see gaps** |
| `vendorscorecards` | VendorScorecard | 10 | 0 | 3 | — | No PII fields detected |
| `visitorpasses` | VisitorPass | 16 | 3 | 3 | — | **UNMAPPED — see gaps** |
| `visits` | Visit | 16 | 6 | 3 | — | **UNMAPPED — see gaps** |
| `vitalslogs` | VitalsLog | 24 | 3 | 7 | — | Clinical records |
| `vitalsreminders` | VitalsReminder | 13 | 1 | 1 | — | Clinical records |
| `waitlistentries` | WaitlistEntry | 17 | 4 | 4 | — | **UNMAPPED — see gaps** |
| `walletguards` | WalletGuard | 16 | 1 | 1 | — | Payment and ledger entries |
| `wardrounds` | WardRound | 13 | 2 | 3 | — | Clinical records |
| `wardtypes` | WardType | 8 | 1 | 1 | — | **UNMAPPED — see gaps** |
| `webhookdeliveries` | WebhookDelivery | 11 | 0 | 4 | — | No PII fields detected |
| `webhooksubscriptions` | WebhookSubscription | 8 | 1 | 1 | — | **UNMAPPED — see gaps** |
| `wellnesslogs` | WellnessLog | 7 | 1 | 4 | — | **UNMAPPED — see gaps** |
| `wellnessprofiles` | WellnessProfile | 6 | 1 | 3 | — | **UNMAPPED — see gaps** |
| `womenshealthlogs` | WomensHealthLog | 7 | 1 | 4 | — | **UNMAPPED — see gaps** |
| `womenshealthprofiles` | WomensHealthProfile | 7 | 1 | 3 | — | **UNMAPPED — see gaps** |
| `workflowdefinitions` | WorkflowDefinition | 29 | 2 | 4 | — | **UNMAPPED — see gaps** |
| `workflowinstances` | WorkflowInstance | 25 | 1 | 4 | — | **UNMAPPED — see gaps** |
| `worktasks` | WorkTask | 19 | 1 | 4 | — | **UNMAPPED — see gaps** |

## Retention gaps (PII present, no class in RETENTION.md)

These collections hold personal data that the retention schedule does not
cover yet — each needs a decision, not a guess:

- `accounts`
- `aisafetyevents`
- `apikeys`
- `appointmentseries`
- `approvalpolicies`
- `assetmaintenances`
- `assetunits`
- `bankaccounts`
- `bmwlogs`
- `callqueues`
- `campaigns`
- `capas`
- `chatconversations`
- `chatmessages`
- `chatprivacies`
- `chatreports`
- `cmecredits`
- `corporateemployees`
- `corporates`
- `dentalcharts`
- `dentallabworks`
- `dentaltreatmentplans`
- `dialysissessions`
- `dialysiswaterqualities`
- `dndentries`
- `doctorfees`
- `donorscreenings`
- `enquiries`
- `eventregistrations`
- `events`
- `eyeexams`
- `eyesurgeryleads`
- `fertilitycycles`
- `iamassignments`
- `iamgroups`
- `iampolicies`
- `iamroles`
- `insurancepolicies`
- `insurers`
- `interactions`
- `kpidefinitions`
- `lawyerbookings`
- `leads`
- `leaverequests`
- `loanadvances`
- `locations`
- `mealsubscriptions`
- `memberships`
- `moderationitems`
- `mtpregisters`
- `notificationpreferences`
- `notifytemplates`
- `objectives`
- `opticaljobcards`
- `outboundcampaigns`
- `partners`
- `patientflags`
- `payoutstatements`
- `payslips`
- `pcpndtformfs`
- `pmjaypackages`
- `policyacceptances`
- `preferredpharmacies`
- `pushsubscriptions`
- `qualitychecklists`
- `quotes`
- `recalllogs`
- `recallrules`
- `reconrules`
- `rentals`
- `reportdefinitions`
- `reviews`
- `rosters`
- `rules`
- `rxtemplates`
- `savedfavorites`
- `savedviews`
- `schedulechangerequests`
- `secondopinionrequests`
- `shiftswaps`
- `sterilisationlogs`
- `strikes`
- `supporttickets`
- `tasks`
- `teammembers`
- `teleconsents`
- `territories`
- `users`
- `vendorbills`
- `visitorpasses`
- `visits`
- `waitlistentries`
- `wardtypes`
- `webhooksubscriptions`
- `wellnesslogs`
- `wellnessprofiles`
- `womenshealthlogs`
- `womenshealthprofiles`
- `workflowdefinitions`
- `workflowinstances`
- `worktasks`

## Detail by collection

### `accessrequests` — AccessRequest

source `AccessRequest.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `tenantId` | ObjectId | yes |  |  |  | Facility |  |
| `requesterId` | ObjectId | yes |  |  |  | User |  |
| `requested.kind` | String | yes |  |  | role, policy, actions |  |  |
| `requested.roleId` | ObjectId |  |  | null |  | IamRole |  |
| `requested.policyId` | ObjectId |  |  | null |  | IamPolicy |  |
| `requested.actions` | Array<Mixed> |  |  |  |  |  |  |
| `requested.scope` | Mixed |  |  | [function] |  |  |  |
| `requested.expiresAt` | Date |  |  | null |  |  |  |
| `reason` | String | yes |  |  |  |  |  |
| `status` | String |  |  | "pending" | pending, approved, denied, expired |  |  |
| `approverIds` | Array<Mixed> |  |  |  |  |  |  |
| `decidedAt` | Date |  |  | null |  |  |  |
| `decidedBy` | ObjectId |  |  | null |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `tenantId:1` |  |
| `requesterId:1` |  |
| `status:1` |  |
| `tenantId:1, status:1` |  |

### `accessreviews` — AccessReview

source `AccessReview.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `tenantId` | ObjectId | yes |  |  |  | Facility |  |
| `cycle` | String | yes |  |  |  |  |  |
| `reviewerId` | ObjectId | yes |  |  |  | User |  |
| `items` | Array<subdocument> |  |  |  |  |  |  |
| `items.assignmentId` | ObjectId |  |  |  |  | IamAssignment |  |
| `items.decision` | String |  |  | "pending" | keep, revoke, pending |  |  |
| `items.note` | String |  |  | "" |  |  |  |
| `completedAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `tenantId:1` |  |
| `tenantId:1, cycle:1` |  |

### `accounts` — Account

source `Account.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `code` | String | yes |  |  |  |  |  |
| `name` | String | yes |  |  |  |  | Identity |
| `group` | String | yes |  |  | Asset, Liability, Income, Expense, Equity |  |  |
| `gstApplicable` | Boolean |  |  | false |  |  |  |
| `bankAccountId` | ObjectId |  |  | null |  | BankAccount |  |
| `active` | Boolean |  |  | true |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `hospitalId:1, code:1` | unique |

### `activities` — Activity

source `Activity.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `objectType` | String | yes |  |  | lead, account, partner, camp |  |  |
| `objectId` | ObjectId | yes |  |  |  |  |  |
| `type` | String | yes |  |  | call, visit, whatsapp, email, note, stage_change, task_done |  |  |
| `by` | ObjectId | yes |  |  |  | User |  |
| `at` | Date |  |  | [function] |  |  |  |
| `outcome` | String |  |  | "" |  |  |  |
| `summary` | String |  |  | "" |  |  |  |
| `durationSec` | Number |  |  | 0 |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `objectType:1` |  |
| `objectId:1` |  |
| `at:1` |  |
| `objectType:1, objectId:1, at:-1` |  |

### `admissions` — Admission

source `Admission.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Health, Identifier, Identity, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `admissionId` | String | yes | yes |  |  |  |  |
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
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
| `encounterId:1` |  |
| `hospitalId:1` |  |

### `adrreports` — AdrReport

source `AdrReport.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `drug` | String | yes |  |  |  |  |  |
| `reaction` | String | yes |  |  |  |  |  |
| `severity` | String |  |  | "Moderate" | Mild, Moderate, Severe, Fatal |  |  |
| `outcome` | String |  |  | "" |  |  |  |
| `causality` | String |  |  | "" | , Certain, Probable, Possible, Unlikely |  |  |
| `reportedToPvPI` | Boolean |  |  | false |  |  |  |
| `reportedBy` | ObjectId |  |  |  |  | User |  |
| `status` | String |  |  | "Open" | Open, UnderReview, Closed |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `status:1` |  |

### `agentsessions` — AgentSession

source `AgentSession.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `agent` | ObjectId | yes |  |  |  | User |  |
| `status` | String |  |  | "offline" | available, on-call, wrap-up, break, offline |  |  |
| `loginAt` | Date |  |  | [function] |  |  |  |
| `logoutAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `agent:1` |  |

### `aiinvocations` — AiInvocation

source `AiInvocation.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `feature` | String | yes |  |  |  |  |  |
| `provider` | String |  |  | "stub" |  |  |  |
| `redacted` | Boolean |  |  | true |  |  |  |
| `tokensIn` | Number |  |  | 0 |  |  |  |
| `tokensOut` | Number |  |  | 0 |  |  |  |
| `ms` | Number |  |  | 0 |  |  |  |
| `ok` | Boolean |  |  | true |  |  |  |
| `error` | String |  |  | "" |  |  |  |
| `by` | ObjectId |  |  | null |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `feature:1` |  |
| `hospitalId:1, feature:1` |  |

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
| `ambulanceType` | String |  |  | "BLS" | BLS, ALS, PATIENT_TRANSPORT, MORTUARY, NICU, NEONATAL, AIR, BIKE_RESPONDER, CARDIAC_AMBULANCE |  |  |
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

### `antenatalrecords` — AntenatalRecord

source `AntenatalRecord.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
| `lmp` | Date |  |  | null |  |  |  |
| `edd` | Date |  |  | null |  |  |  |
| `gravida` | Number |  |  | 0 |  |  |  |
| `para` | Number |  |  | 0 |  |  |  |
| `visits` | Array<subdocument> |  |  |  |  |  |  |
| `visits.at` | Date |  |  | [function] |  |  |  |
| `visits.weightKg` | Number |  |  | null |  |  |  |
| `visits.bp` | String |  |  | "" |  |  |  |
| `visits.fundalHeightCm` | Number |  |  | null |  |  |  |
| `visits.fetalHeart` | String |  |  | "" |  |  |  |
| `visits.notes` | String |  |  | "" |  |  |  |
| `visits.by` | ObjectId |  |  |  |  | User |  |
| `usg` | Array<subdocument> |  |  |  |  |  |  |
| `usg.at` | Date |  |  |  |  |  |  |
| `usg.finding` | String |  |  |  |  |  |  |
| `labs` | Array<subdocument> |  |  |  |  |  |  |
| `labs.name` | String |  |  |  |  |  | Identity |
| `labs.result` | String |  |  |  |  |  |  |
| `labs.at` | Date |  |  |  |  |  |  |
| `riskFlags` | Array<Mixed> |  |  |  |  |  |  |
| `status` | String |  |  | "Active" | Active, Delivered, Closed |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `patientId:1` |  |
| `hospitalId:1` |  |
| `status:1` |  |
| `patientId:1, status:1` |  |

### `apikeys` — ApiKey

source `ApiKey.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `tenantId` | ObjectId |  |  | null |  | Facility |  |
| `name` | String | yes |  |  |  |  | Identity |
| `policyId` | ObjectId |  |  | null |  | IamPolicy |  |
| `hash` | String | yes |  |  |  |  |  |
| `prefix` | String | yes |  |  |  |  |  |
| `ipBinding` | Array<Mixed> |  |  |  |  |  |  |
| `expiresAt` | Date |  |  | null |  |  |  |
| `lastUsedAt` | Date |  |  | null |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `revokedAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `tenantId:1` |  |
| `prefix:1` |  |
| `expiresAt:1` |  |
| `revokedAt:1` |  |
| `tenantId:1, revokedAt:1` |  |

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
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
| `prescriptionId` | ObjectId |  |  | null |  | Prescription |  |
| `checkoutExpiresAt` | Date |  |  | null |  |  |  |
| `cancellationReason` | String |  |  | "" |  |  |  |
| `cancelledAt` | Date |  |  |  |  |  |  |
| `cancelledBy` | String |  |  |  | patient, provider, system |  |  |
| `cancellationTier` | String |  |  |  | early, mid, late, no_show |  |  |
| `cancellationFee` | Number |  |  | 0 |  |  |  |
| `refundAmount` | Number |  |  | 0 |  |  |  |
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
| `serviceId` | ObjectId |  |  | null |  | Service |  |
| `providerId` | ObjectId |  |  | null |  | Provider | Identifier |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `tokenNumber:1` | unique, sparse |
| `uhid:1` |  |
| `patientRecordId:1` |  |
| `encounterId:1` |  |
| `checkoutExpiresAt:1` |  |
| `seriesId:1` |  |
| `hospitalId:1` |  |
| `doctorId:1, patientId:1, date:1, time:1` | unique, partial |
| `doctorId:1, date:-1` |  |
| `patientId:1, date:-1` |  |
| `hospitalId:1, date:-1` |  |
| `providerId:1, date:-1` |  |
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

### `approvalpolicies` — ApprovalPolicy

source `ApprovalPolicy.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `key` | String | yes |  |  |  |  |  |
| `name` | String |  |  | "" |  |  | Identity |
| `scope.model` | String |  |  | "" |  |  |  |
| `scope.amountField` | String |  |  | "total" |  |  |  |
| `tiers` | Array<subdocument> |  |  |  |  |  |  |
| `tiers.min` | Number |  |  | 0 |  |  |  |
| `tiers.roles` | Array<Mixed> |  |  |  |  |  |  |
| `tiers.steps` | Number |  |  | 1 |  |  |  |
| `excludedRoles` | Array<Mixed> |  |  |  |  |  |  |
| `active` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `key:1` |  |
| `hospitalId:1, key:1` |  |

### `approvalrequests` — ApprovalRequest

source `ApprovalRequest.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `policyKey` | String | yes |  |  |  |  |  |
| `entityRef.model` | String |  |  | "" |  |  |  |
| `entityRef.id` | ObjectId |  |  | null |  |  |  |
| `title` | String |  |  | "" |  |  |  |
| `amount` | Number |  |  | 0 |  |  |  |
| `requiredRoles` | Array<Mixed> |  |  |  |  |  |  |
| `steps` | Array<subdocument> |  |  |  |  |  |  |
| `steps.step` | Number |  |  |  |  |  |  |
| `steps.role` | String |  |  |  |  |  |  |
| `steps.status` | String |  |  | "pending" | pending, approved, rejected, skipped |  |  |
| `steps.by` | ObjectId |  |  | null |  | User |  |
| `steps.at` | Date |  |  | null |  |  |  |
| `steps.comment` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "pending" | pending, approved, rejected, expired |  |  |
| `requestedBy` | ObjectId |  |  |  |  | User |  |
| `dueAt` | Date |  |  | null |  |  |  |
| `consumedAt` | Date |  |  | null |  |  |  |
| `consumedBy` | ObjectId |  |  | null |  | User |  |
| `consumedFor` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `status:1` |  |

### `assetmaintenances` — AssetMaintenance

source `AssetMaintenance.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `assetUnitId` | ObjectId |  |  | null |  | AssetUnit |  |
| `equipmentName` | String |  |  | "" |  |  |  |
| `kind` | String | yes |  |  | preventive, calibration, repair, inspection |  |  |
| `dueDate` | Date |  |  | null |  |  |  |
| `doneDate` | Date |  |  | null |  |  |  |
| `vendor` | String |  |  | "" |  |  |  |
| `cost` | Number |  |  | 0 |  |  |  |
| `reportUrl` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "Scheduled" | Scheduled, Done, Overdue, Cancelled |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `assetUnitId:1` |  |
| `kind:1` |  |
| `status:1` |  |
| `hospitalId:1, status:1` |  |

### `assetunits` — AssetUnit

source `AssetUnit.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Health, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `vendorId` | ObjectId | yes |  |  |  | Provider |  |
| `productId` | ObjectId |  |  | null |  | Product |  |
| `productName` | String | yes |  |  |  |  |  |
| `kind` | String |  |  | "equipment" |  |  |  |
| `serial` | String | yes | yes |  |  |  |  |
| `status` | String |  |  | "available" | available, reserved, rented, maintenance, retired |  |  |
| `isListed` | Boolean |  |  | true |  |  |  |
| `ratePerDay` | Number | yes |  |  |  |  |  |
| `deposit` | Number |  |  | 0 |  |  |  |
| `sanitisationCycleDays` | Number |  |  | 0 |  |  |  |
| `lastSanitisedAt` | Date |  |  | null |  |  |  |
| `maintenance` | Array<subdocument> |  |  |  |  |  |  |
| `maintenance.at` | Date |  |  | [function] |  |  |  |
| `maintenance.note` | String |  |  | "" |  |  |  |
| `maintenance.cost` | Number |  |  | 0 |  |  |  |
| `blackoutDates` | Array<subdocument> |  |  |  |  |  |  |
| `blackoutDates.from` | Date |  |  |  |  |  |  |
| `blackoutDates.to` | Date |  |  |  |  |  |  |
| `blackoutDates.reason` | String |  |  | "" |  |  |  |
| `location` | String |  |  | "" |  |  | Location |
| `condition` | String |  |  | "" |  |  | Health |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `vendorId:1` |  |
| `serial:1` | unique |
| `status:1` |  |
| `isListed:1` |  |
| `vendorId:1, status:1` |  |
| `status:1, isListed:1` |  |
| `productName:text` |  |

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

### `bankaccounts` — BankAccount

source `BankAccount.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Financial

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `bankName` | String | yes |  |  |  |  |  |
| `accountNo` | String | yes |  |  |  |  |  |
| `ifsc` | String |  |  | "" |  |  | Financial |
| `kind` | String |  |  | "current" | current, savings, escrow, od |  |  |
| `active` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `hospitalId:1, accountNo:1` | unique |

### `banktxns` — BankTxn

source `BankTxn.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `importId` | ObjectId |  |  |  |  | StatementImport |  |
| `bankAccountId` | ObjectId |  |  |  |  | BankAccount |  |
| `date` | Date | yes |  |  |  |  |  |
| `narration` | String |  |  | "" |  |  |  |
| `utr` | String |  |  | "" |  |  |  |
| `debit` | Number |  |  | 0 |  |  |  |
| `credit` | Number |  |  | 0 |  |  |  |
| `balance` | Number |  |  | null |  |  |  |
| `matchId` | ObjectId |  |  | null |  | ReconMatch |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `importId:1` |  |
| `utr:1` |  |

### `beds` — Bed

source `Bed.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `bedNumber` | String | yes |  |  |  |  |  |
| `ward` | String | yes |  |  | General, Semi-Private, Private, ICU, NICU, PICU, Emergency |  |  |
| `bedType` | String | yes |  |  | General, Semi-Private, Private, Deluxe/Suite, ICU, NICU, PICU, HDU, Isolation, Day-Care, Dialysis Chair |  |  |
| `status` | String |  |  | "Available" | Available, Occupied, Under Cleaning, Maintenance |  |  |
| `srcStatus` | String |  |  | "manual" | admit, discharge, transfer, cleaning, maintenance, available, manual |  |  |
| `oxygenPoint` | Boolean |  |  | false |  |  |  |
| `locationId` | ObjectId |  |  | null |  | Location |  |
| `wardTypeId` | ObjectId |  |  | null |  | WardType |  |
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
| `locationId:1` |  |
| `hospitalId:1` |  |
| `hospitalId:1, bedNumber:1` | unique |

### `bedtransfers` — BedTransfer

source `BedTransfer.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `admissionId` | ObjectId | yes |  |  |  | Admission |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `fromBedId` | ObjectId |  |  | null |  | Bed |  |
| `toBedId` | ObjectId | yes |  |  |  | Bed |  |
| `fromWard` | String |  |  | "" |  |  |  |
| `toWard` | String |  |  | "" |  |  |  |
| `reason` | String |  |  | "" |  |  |  |
| `orderedBy` | ObjectId |  |  |  |  | User |  |
| `effectiveAt` | Date |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `admissionId:1` |  |
| `hospitalId:1` |  |
| `admissionId:1, effectiveAt:1` |  |

### `billings` — Billing

source `Billing.js` · timestamps: yes · virtuals: 0 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Financial, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `invoiceId` | String | yes | yes |  |  |  |  |
| `patient` | String | yes |  |  |  |  |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `doctor` | String |  |  |  |  |  |  |
| `doctorId` | ObjectId |  |  |  |  | Doctor | Identifier |
| `appointmentId` | ObjectId |  |  |  |  | Appointment |  |
| `admissionId` | ObjectId |  |  | null |  | Admission |  |
| `service` | String | yes |  |  |  |  |  |
| `services` | Array<subdocument> |  |  |  |  |  |  |
| `services.id` | String |  |  | "" |  |  |  |
| `services.name` | String | yes |  |  |  |  | Identity |
| `services.description` | String |  |  |  |  |  |  |
| `services.price` | Number | yes |  |  |  |  |  |
| `services.quantity` | Number |  |  | 1 |  |  |  |
| `services.category` | String |  |  | "General" |  |  |  |
| `services.discount` | Number |  |  | 0 |  |  |  |
| `services.hsn` | String |  |  | "" |  |  |  |
| `services.gstRate` | Number |  |  | 0 |  |  |  |
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
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
| `billType` | String |  |  | "Other" | Interim, Final, Pharmacy, Package, Other |  |  |
| `payerSplit.patient` | Number |  |  | 0 |  |  |  |
| `payerSplit.insurer` | Number |  |  | 0 |  |  |  |
| `payerSplit.corporate` | Number |  |  | 0 |  |  |  |
| `counterId` | ObjectId |  |  | null |  | CashCounter |  |
| `shiftId` | ObjectId |  |  | null |  | CashShift |  |
| `approvalRef` | ObjectId |  |  | null |  | ApprovalRequest |  |
| `payments` | Array<subdocument> |  |  |  |  |  |  |
| `payments.mode` | String |  |  | "Cash" | Cash, Card, UPI, Cheque, Insurance, Online, Other |  |  |
| `payments.amount` | Number | yes |  |  |  |  |  |
| `payments.txnRef` | String |  |  | "" |  |  |  |
| `payments.at` | Date |  |  | [function] |  |  |  |
| `payments.by` | ObjectId |  |  | null |  | User |  |
| `gstin` | String |  |  | "" |  |  | Financial |
| `invoiceSeries` | String |  |  | "" |  |  |  |
| `packageId` | String |  |  | "" |  |  |  |
| `packageCap` | Number |  |  | 0 |  |  |  |
| `overage` | Number |  |  | 0 |  |  |  |
| `cancelReason` | String |  |  | "" |  |  |  |
| `cancelledBy` | ObjectId |  |  | null |  | User |  |
| `cancelApprovalRef` | ObjectId |  |  | null |  | ApprovalRequest |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `invoiceId:1` | unique |
| `admissionId:1` |  |
| `hospitalId:1` |  |
| `facilityId:1` |  |
| `encounterId:1` |  |

### `birthrecords` — BirthRecord

source `BirthRecord.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `motherId` | ObjectId |  |  |  |  | User |  |
| `babyId` | ObjectId |  |  | null |  | User |  |
| `admissionId` | ObjectId |  |  | null |  | Admission |  |
| `weightKg` | Number |  |  | 0 |  |  |  |
| `sex` | String |  |  | "" | , Male, Female, Other |  |  |
| `timeOfBirth` | Date | yes |  |  |  |  |  |
| `deliveryType` | String |  |  | "" | , Normal, C-Section, Assisted |  |  |
| `certificateNo` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

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

### `bmwlogs` — BmwLog

source `BmwLog.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId | yes |  |  |  | Hospital |  |
| `date` | String | yes |  |  |  |  |  |
| `wardId` | String |  |  | "" |  |  |  |
| `yellowKg` | Number |  |  | 0 |  |  |  |
| `redKg` | Number |  |  | 0 |  |  |  |
| `whiteKg` | Number |  |  | 0 |  |  |  |
| `blueKg` | Number |  |  | 0 |  |  |  |
| `handedTo` | String |  |  | "" |  |  |  |
| `manifestNo` | String |  |  | "" |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `date:1` |  |
| `hospitalId:1, date:1` |  |

### `breakglassgrants` — BreakGlassGrant

source `BreakGlassGrant.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `requesterId` | ObjectId | yes |  |  |  | User |  |
| `approverIds` | Array<Mixed> |  |  |  |  |  |  |
| `secondApproverId` | ObjectId |  |  | null |  | User |  |
| `subject.type` | String | yes |  |  | patient, record, booking, mental_health |  |  |
| `subject.id` | ObjectId | yes |  |  |  |  |  |
| `scope` | Array<Mixed> |  |  | ["read"] |  |  |  |
| `fields` | Array<Mixed> |  |  | [] |  |  |  |
| `reasonCode` | String | yes |  |  | patient_support_consent, safety_incident, legal_order, fraud_investigation, data_repair |  |  |
| `ticketId` | String |  |  | "" |  |  |  |
| `reasonNote` | String |  |  | "" |  |  |  |
| `durationMin` | Number |  |  | 30 |  |  |  |
| `status` | String |  |  | "pending" | pending, approved, denied, expired, revoked |  |  |
| `approvedAt` | Date |  |  | null |  |  |  |
| `expiresAt` | Date |  |  | null |  |  |  |
| `revokedAt` | Date |  |  | null |  |  |  |
| `patientNotifiedAt` | Date |  |  | null |  |  |  |
| `accessLog` | Array<subdocument> |  |  |  |  |  |  |
| `accessLog.ts` | Date |  |  | [function] |  |  |  |
| `accessLog.route` | String |  |  |  |  |  |  |
| `accessLog.objectId` | String |  |  |  |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `requesterId:1` |  |
| `subject.id:1` |  |
| `status:1` |  |
| `expiresAt:1` |  |
| `requesterId:1, status:1` |  |
| `subject.id:1, status:1` |  |

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

### `callqueues` — CallQueue

source `CallQueue.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Contact, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `phone` | String | yes |  |  |  |  | Contact |
| `patientId` | ObjectId |  |  | null |  | User | Identifier |
| `priority` | String |  |  | "normal" | normal, vip, callback |  |  |
| `status` | String |  |  | "waiting" | waiting, assigned, done, missed |  |  |
| `assignedAgent` | ObjectId |  |  | null |  | User |  |
| `externalId` | String |  |  | "" |  |  |  |
| `dndHit` | Boolean |  |  | false |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `status:1` |  |

### `campaigns` — Campaign

source `Campaign.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `type` | String |  |  | "health_camp" | health_camp, specialty_camp, vaccination_drive, blood_drive, workshop, webinar, marketing |  |  |
| `title` | String | yes |  |  |  |  |  |
| `date` | Date |  |  | null |  |  |  |
| `venue` | String |  |  | "" |  |  |  |
| `city` | String |  |  | "" |  |  |  |
| `partnerId` | ObjectId |  |  | null |  | Partner |  |
| `facilityId` | ObjectId |  |  | null |  | Facility |  |
| `budget` | Number |  |  | 0 |  |  |  |
| `capacity` | Number |  |  | 0 |  |  |  |
| `registrations` | Number |  |  | 0 |  |  |  |
| `attendees` | Number |  |  | 0 |  |  |  |
| `conversions` | Number |  |  | 0 |  |  |  |
| `status` | String |  |  | "idea" | idea, partner_confirmed, ops_ready, registrations_open, completed, reported, cancelled |  |  |
| `reportRef` | String |  |  | "" |  |  |  |
| `ownerId` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `type:1` |  |
| `city:1` |  |
| `status:1` |  |
| `ownerId:1` |  |
| `city:1, status:1` |  |

### `capas` — Capa

source `Capa.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `source` | String |  |  | "audit" | audit, incident, assessment, complaint, other |  |  |
| `sourceRef` | String |  |  | "" |  |  |  |
| `finding` | String | yes |  |  |  |  |  |
| `rootCause` | String |  |  | "" |  |  |  |
| `corrective` | String |  |  | "" |  |  |  |
| `preventive` | String |  |  | "" |  |  |  |
| `owner` | ObjectId |  |  | null |  | User |  |
| `dueDate` | Date |  |  | null |  |  |  |
| `status` | String |  |  | "Open" | Open, InProgress, Verification, Closed |  |  |
| `effectiveness` | String |  |  | "" |  |  |  |
| `closedAt` | Date |  |  | null |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `status:1` |  |
| `hospitalId:1, status:1` |  |

### `casepresentations` — CasePresentation

source `CasePresentation.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
| `kind` | String |  |  | "Teaching" | TumourBoard, MM, Teaching |  |  |
| `title` | String | yes |  |  |  |  |  |
| `summary` | String |  |  | "" |  |  |  |
| `questions` | Array<Mixed> |  |  |  |  |  |  |
| `discussion` | String |  |  | "" |  |  |  |
| `decision` | String |  |  | "" |  |  |  |
| `presentedBy` | ObjectId | yes |  |  |  | User |  |
| `presentedAt` | Date |  |  | null |  |  |  |
| `status` | String |  |  | "Draft" | Draft, Presented, Closed |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `kind:1` |  |
| `status:1` |  |
| `hospitalId:1, kind:1, status:1` |  |

### `cashcounters` — CashCounter

source `CashCounter.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId | yes |  |  |  | Hospital |  |
| `name` | String | yes |  |  |  |  |  |
| `location` | String |  |  | "" |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `cashshifts` — CashShift

source `CashShift.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `counterId` | ObjectId | yes |  |  |  | CashCounter |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `cashierId` | ObjectId | yes |  |  |  | User |  |
| `openedAt` | Date |  |  | [function] |  |  |  |
| `openingFloat` | Number |  |  | 0 |  |  |  |
| `closedAt` | Date |  |  | null |  |  |  |
| `expected` | Number |  |  | 0 |  |  |  |
| `counted` | Number |  |  | null |  |  |  |
| `variance` | Number |  |  | null |  |  |  |
| `denominations` | Mixed |  |  | [function] |  |  |  |
| `depositToBankRef` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "Open" | Open, Closed |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `counterId:1` |  |
| `hospitalId:1` |  |
| `status:1` |  |
| `counterId:1, status:1` |  |

### `categories` — Category

source `Category.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `name` | String | yes |  |  |  |  |  |
| `nameHi` | String |  |  | "" |  |  |  |
| `code` | String |  |  |  |  |  |  |
| `type` | String | yes |  |  | test, medicine, department, service, specialty, sub_specialty, facility_type, provider_type, imaging, medicine_class, medicine_form, rx_schedule, product_line, diet, condition, event_type, program, wellness, device, language, accreditation, scheme, insurance_policy, legal_practic… (315 chars) |  |  |
| `aliases` | Array<Mixed> |  |  | [] |  |  |  |
| `description` | String |  |  | "" |  |  |  |
| `parent` | ObjectId |  |  | null |  | Category |  |
| `path` | String |  |  | "" |  |  |  |
| `level` | Number |  |  | 0 |  |  |  |
| `tier` | String |  |  |  | T1, T2, T3 |  |  |
| `regulatedBy` | Array<Mixed> |  |  | [] |  |  |  |
| `adClaimsRestricted` | Boolean |  |  | false |  |  |  |
| `externalCodes.snomed` | String |  |  | "" |  |  |  |
| `externalCodes.atc` | String |  |  | "" |  |  |  |
| `externalCodes.loinc` | String |  |  | "" |  |  |  |
| `externalCodes.icd10` | String |  |  | "" |  |  |  |
| `externalCodes.hsn` | String |  |  | "" |  |  |  |
| `icon` | String |  |  | "" |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `displayOrder` | Number |  |  | 0 |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `type:1, code:1` | unique, partial |
| `type:1, parent:1, name:1` |  |
| `name:text, aliases:text` |  |

### `chargeitems` — ChargeItem

source `ChargeItem.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `encounterId` | ObjectId |  |  |  |  | Encounter |  |
| `admissionId` | ObjectId |  |  |  |  | Admission |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `source` | String | yes |  |  | consult, lab, radiology, pharmacy, ot, bed, nursing, procedure, consumable, package, other |  |  |
| `sourceRef.model` | String |  |  | "" |  |  |  |
| `sourceRef.id` | ObjectId |  |  | null |  |  |  |
| `serviceCode` | String |  |  | "" |  |  |  |
| `description` | String | yes |  |  |  |  |  |
| `qty` | Number |  |  | 1 |  |  |  |
| `unitPrice` | Number |  |  | 0 |  |  |  |
| `discount` | Number |  |  | 0 |  |  |  |
| `taxRate` | Number |  |  | 0 |  |  |  |
| `taxAmount` | Number |  |  | 0 |  |  |  |
| `amount` | Number | yes |  |  |  |  |  |
| `status` | String |  |  | "Pending" | Pending, Billed, Cancelled, Waived |  |  |
| `billId` | ObjectId |  |  | null |  | Billing |  |
| `postedAt` | Date |  |  | [function] |  |  |  |
| `postedBy` | ObjectId |  |  |  |  | User |  |
| `performedBy` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `encounterId:1` |  |
| `admissionId:1` |  |
| `patientId:1` |  |
| `hospitalId:1` |  |
| `source:1` |  |
| `status:1` |  |
| `hospitalId:1, status:1, createdAt:-1` |  |
| `billId:1` |  |

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

### `chemocycles` — ChemoCycle

source `ChemoCycle.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `protocolId` | ObjectId | yes |  |  |  | ChemoProtocol |  |
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `cycleNo` | Number | yes |  |  |  |  |  |
| `scheduledAt` | Date |  |  | null |  |  |  |
| `bsa` | Number |  |  | 0 |  |  |  |
| `doses` | Array<subdocument> |  |  |  |  |  |  |
| `doses.name` | String |  |  |  |  |  | Identity |
| `doses.plannedMg` | Number |  |  | 0 |  |  |  |
| `doses.givenMg` | Number |  |  | 0 |  |  |  |
| `cytotoxicLog` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "Scheduled" | Scheduled, Administered, Delayed, Cancelled |  |  |
| `administeredAt` | Date |  |  | null |  |  |  |
| `administeredBy` | ObjectId |  |  | null |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `protocolId:1` |  |
| `patientId:1` |  |
| `hospitalId:1` |  |
| `status:1` |  |
| `protocolId:1, patientId:1, cycleNo:1` | unique |

### `chemoprotocols` — ChemoProtocol

source `ChemoProtocol.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `name` | String | yes |  |  |  |  | Identity |
| `cancerType` | String |  |  | "" |  |  |  |
| `totalCycles` | Number |  |  | 1 |  |  |  |
| `cycleDays` | Number |  |  | 21 |  |  |  |
| `drugs` | Array<subdocument> |  |  |  |  |  |  |
| `drugs.name` | String |  |  |  |  |  | Identity |
| `drugs.dosePerM2` | Number |  |  | 0 |  |  |  |
| `drugs.unit` | String |  |  | "mg" |  |  |  |
| `drugs.day` | Number |  |  | 1 |  |  |  |
| `drugs.route` | String |  |  | "IV" |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `hospitalId:1, name:1` |  |

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

### `claims` — Claim

source `Claim.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `admissionId` | ObjectId | yes |  |  |  | Admission |  |
| `preAuthId` | ObjectId |  |  | null |  | PreAuthRequest |  |
| `billId` | ObjectId |  |  | null |  | Billing |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `insurerId` | ObjectId |  |  |  |  | Insurer |  |
| `corporateId` | ObjectId |  |  | null |  | Corporate |  |
| `documents` | Array<Mixed> |  |  |  |  |  |  |
| `submittedAt` | Date |  |  | null |  |  |  |
| `status` | String |  |  | "NotSubmitted" | NotSubmitted, Submitted, Approved, Partial, Rejected, Settled, Appealed |  |  |
| `queries` | Array<subdocument> |  |  |  |  |  |  |
| `queries.by` | String |  |  | "" |  |  |  |
| `queries.text` | String |  |  |  |  |  |  |
| `queries.at` | Date |  |  | [function] |  |  |  |
| `settledAmount` | Number |  |  | 0 |  |  |  |
| `utr` | String |  |  | "" |  |  |  |
| `tds` | Number |  |  | 0 |  |  |  |
| `shortSettlement` | Array<subdocument> |  |  |  |  |  |  |
| `shortSettlement.reason` | String |  |  |  |  |  |  |
| `shortSettlement.amount` | Number |  |  |  |  |  |  |
| `deductions` | Array<subdocument> |  |  |  |  |  |  |
| `deductions.kind` | String |  |  | "" |  |  |  |
| `deductions.amount` | Number |  |  | 0 |  |  |  |
| `deductions.notes` | String |  |  | "" |  |  |  |
| `deductions.at` | Date |  |  | [function] |  |  |  |
| `appealOf` | ObjectId |  |  | null |  | Claim |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `admissionId:1` |  |
| `hospitalId:1` |  |
| `corporateId:1` |  |
| `status:1` |  |
| `hospitalId:1, status:1` |  |

### `clinicprofiles` — ClinicProfile

source `ClinicProfile.js` · timestamps: yes · virtuals: 11 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `clinicId` | String |  | yes |  |  |  |  |
| `doctorId` | ObjectId | yes | yes |  |  | Doctor |  |
| `modules.dental` | Boolean |  |  | false |  |  |  |
| `modules.eye` | Boolean |  |  | false |  |  |  |
| `modules.ayush` | Boolean |  |  | false |  |  |  |
| `modules.physio` | Boolean |  |  | false |  |  |  |
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

### `cmecredits` — CMECredit

source `CMECredit.js` · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `doctorId` | ObjectId | yes |  |  |  | Doctor | Identifier |
| `doctorUserId` | ObjectId | yes |  |  |  | User |  |
| `title` | String | yes |  |  |  |  |  |
| `organizer` | String |  |  | "" |  |  |  |
| `credits` | Number | yes |  |  |  |  |  |
| `date` | String | yes |  |  |  |  |  |
| `certificateUrl` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `doctorId:1` |  |
| `doctorUserId:1` |  |
| `doctorId:1, date:-1` |  |

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

### `consentforms` — ConsentForm

source `ConsentForm.js` · timestamps: yes · virtuals: 0 · retention: Consent validity, then 1 year (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
| `admissionId` | ObjectId |  |  | null |  | Admission |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `templateId` | String |  |  | "other" | admission, surgery, anesthesia, blood, high_risk, dama, other |  |  |
| `language` | String |  |  | "en" |  |  |  |
| `content` | String |  |  | "" |  |  |  |
| `signedBy` | String |  |  | "patient" | patient, guardian |  |  |
| `signerName` | String |  |  | "" |  |  |  |
| `witness` | String |  |  | "" |  |  |  |
| `signatureImg` | String |  |  | "" |  |  |  |
| `signedAt` | Date |  |  | null |  |  |  |
| `revokedAt` | Date |  |  | null |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `encounterId:1` |  |
| `admissionId:1` |  |
| `templateId:1` |  |
| `admissionId:1, templateId:1` |  |

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

### `contracts` — Contract

source `Contract.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `kind` | String | yes |  |  | rate, amc, service, lease |  |  |
| `counterparty` | String |  |  | "" |  |  |  |
| `supplierId` | ObjectId |  |  | null |  | Supplier |  |
| `value` | Number |  |  | 0 |  |  |  |
| `startDate` | Date | yes |  |  |  |  |  |
| `endDate` | Date | yes |  |  |  |  |  |
| `terms` | String |  |  | "" |  |  |  |
| `documentUrl` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "active" | active, expired, terminated |  |  |
| `lines` | Array<subdocument> |  |  |  |  |  |  |
| `lines.item` | String |  |  | "" |  |  |  |
| `lines.rate` | Number |  |  | 0 |  |  |  |
| `enforceMax` | Boolean |  |  | false |  |  |  |
| `assetUnitId` | ObjectId |  |  | null |  | AssetUnit |  |
| `equipmentName` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `kind:1` |  |
| `endDate:1` |  |
| `status:1` |  |

### `corporateemployees` — CorporateEmployee

source `CorporateEmployee.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `corporateId` | ObjectId | yes |  |  |  | Corporate |  |
| `name` | String | yes |  |  |  |  | Identity |
| `employeeId` | String |  |  | "" |  |  |  |
| `active` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `corporateId:1` |  |

### `corporates` — Corporate

source `Corporate.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Financial, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `name` | String | yes |  |  |  |  | Identity |
| `gstin` | String |  |  | "" |  |  | Financial |
| `creditLimit` | Number |  |  | 0 |  |  |  |
| `creditUsed` | Number |  |  | 0 |  |  |  |
| `billingCycle` | String |  |  | "monthly" | weekly, fortnightly, monthly |  |  |
| `active` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `credentials` — Credential

source `Credential.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `staffId` | ObjectId | yes |  |  |  | Staff |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `type` | String | yes |  |  | NMC, StateCouncil, NursingCouncil, BLS, ACLS, PharmacyCouncil, Other |  |  |
| `number` | String |  |  | "" |  |  |  |
| `validTill` | Date |  |  | null |  |  |  |
| `docUrl` | String |  |  | "" |  |  |  |
| `privileges` | Array<Mixed> |  |  |  |  |  |  |
| `verifiedAt` | Date |  |  | null |  |  |  |
| `verifiedBy` | ObjectId |  |  | null |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `staffId:1` |  |
| `hospitalId:1` |  |
| `validTill:1` |  |
| `staffId:1, type:1` |  |

### `creditnotes` — CreditNote

source `CreditNote.js` · timestamps: yes · virtuals: 0 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `billId` | ObjectId | yes |  |  |  | Billing |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `kind` | String |  |  | "Credit" | Credit, Debit |  |  |
| `amount` | Number | yes |  |  |  |  |  |
| `reason` | String | yes |  |  |  |  |  |
| `series` | String |  |  | "" |  |  |  |
| `approvedBy` | ObjectId |  |  | null |  | User |  |
| `appliedAt` | Date |  |  | null |  |  |  |
| `status` | String |  |  | "Issued" | Issued, Applied, Cancelled |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `billId:1` |  |
| `status:1` |  |

### `dailymetrics` — DailyMetric

source `DailyMetric.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `day` | String | yes |  |  |  |  |  |
| `metrics` | Mixed |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `hospitalId:1, day:1` | unique |

### `dailyrcmmetrics` — DailyRcmMetric

source `DailyRcmMetric.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `day` | String | yes |  |  |  |  |  |
| `firstPassRate` | Number |  |  | null |  |  |  |
| `denialRate` | Number |  |  | null |  |  |  |
| `avgDaysToPayment` | Number |  |  | null |  |  |  |
| `arDays` | Number |  |  | null |  |  |  |
| `collected` | Number |  |  | 0 |  |  |  |
| `billed` | Number |  |  | 0 |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `day:1` |  |
| `hospitalId:1, day:1` | unique |

### `dashboardalerts` — DashboardAlert

source `DashboardAlert.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `type` | String | yes |  |  | critical_lab, overdue_vitals, missed_dose, pending_discharge, drug_expiry, low_stock, blood_expiry, tpa_query, tpa_expiry, license_expiry, cert_expiry, maintenance_due, refund_pending, bill_overdue, bed_cleaning, other |  |  |
| `severity` | String |  |  | "warning" | info, warning, critical |  |  |
| `entityRef.model` | String |  |  | "" |  |  |  |
| `entityRef.id` | ObjectId |  |  | null |  |  |  |
| `message` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "open" | open, acked, snoozed, resolved |  |  |
| `escalationLevel` | Number |  |  | 0 |  |  |  |
| `escalatedAt` | Date |  |  | null |  |  |  |
| `ackedBy` | ObjectId |  |  | null |  | User |  |
| `ackedAt` | Date |  |  | null |  |  |  |
| `snoozeUntil` | Date |  |  | null |  |  |  |
| `resolvedAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `type:1` |  |
| `severity:1` |  |
| `status:1` |  |
| `hospitalId:1, status:1, severity:-1` |  |

### `datasubjectrequests` — DataSubjectRequest

source `DataSubjectRequest.js` · timestamps: yes · virtuals: 0 · retention: 7 years (longer than the data they describe) (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `type` | String | yes |  |  | access, correction, export |  |  |
| `status` | String |  |  | "submitted" | submitted, in_review, verified, fulfilled, rejected |  |  |
| `requestedAt` | Date |  |  | [function] |  |  |  |
| `dueAt` | Date | yes |  |  |  |  |  |
| `extensionReason` | String |  |  | "" |  |  |  |
| `fulfilledAt` | Date |  |  | null |  |  |  |
| `decidedAt` | Date |  |  | null |  |  |  |
| `decidedBy` | ObjectId |  |  | null |  | User |  |
| `details` | String |  |  | "" |  |  |  |
| `exportRef` | String |  |  | "" |  |  |  |
| `resolutionNote` | String |  |  | "" |  |  |  |
| `verification.method` | String |  |  | "" | , email_otp, sms_otp, in_person, manual |  |  |
| `verification.at` | Date |  |  | null |  |  |  |
| `verification.by` | ObjectId |  |  | null |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `type:1` |  |
| `status:1` |  |
| `requestedAt:1` |  |
| `dueAt:1` |  |
| `userId:1, status:1` |  |
| `status:1, dueAt:1` |  |

### `deathrecords` — DeathRecord

source `DeathRecord.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
| `admissionId` | ObjectId |  |  | null |  | Admission |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `patientName` | String |  |  | "" |  |  | Identity |
| `timeOfDeath` | Date | yes |  |  |  |  |  |
| `causeIcd10` | String |  |  | "" |  |  |  |
| `causeText` | String |  |  | "" |  |  |  |
| `certifiedBy` | ObjectId |  |  |  |  | User |  |
| `mlcCaseId` | ObjectId |  |  | null |  | MlcCase |  |
| `mortuaryTagNo` | String |  |  | "" |  |  |  |
| `releasedTo` | String |  |  | "" |  |  |  |
| `releasedToId` | String |  |  | "" |  |  |  |
| `releasedAt` | Date |  |  | null |  |  |  |
| `certificateNo` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `delegations` — Delegation

source `Delegation.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `fromUser` | ObjectId | yes |  |  |  | User |  |
| `toUser` | ObjectId | yes |  |  |  | User |  |
| `scope` | String |  |  | "all" |  |  |  |
| `from` | Date | yes |  |  |  |  |  |
| `to` | Date | yes |  |  |  |  |  |
| `active` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

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

### `dentalcharts` — DentalChart

source `DentalChart.js` · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Health, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `providerId` | ObjectId | yes |  |  |  | Provider | Identifier |
| `recordedBy` | ObjectId | yes |  |  |  | User |  |
| `teeth` | Array<subdocument> |  |  |  |  |  |  |
| `teeth.fdi` | String | yes |  |  |  |  |  |
| `teeth.condition` | String |  |  | "healthy" | healthy, caries, filling, crown, implant, missing, rct, fracture, extraction_planned, other |  | Health |
| `teeth.notes` | String |  |  | "" |  |  |  |
| `images` | Array<Mixed> |  |  |  |  |  |  |
| `photoConsent.granted` | Boolean |  |  | false |  |  |  |
| `photoConsent.grantedAt` | Date |  |  | null |  |  |  |
| `recordedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `patientId:1` |  |
| `providerId:1` |  |
| `patientId:1, recordedAt:-1` |  |

### `dentallabworks` — DentalLabWork

source `DentalLabWork.js` · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `providerId` | ObjectId | yes |  |  |  | Provider | Identifier |
| `recordedBy` | ObjectId | yes |  |  |  | User |  |
| `workType` | String | yes |  |  | crown, aligner, denture, bridge, implant, other |  |  |
| `teeth` | Array<Mixed> |  |  |  |  |  |  |
| `labName` | String |  |  | "" |  |  |  |
| `costAmount` | Number |  |  | 0 |  |  |  |
| `status` | String |  |  | "sent" | sent, received, fitted |  |  |
| `sentAt` | Date |  |  | [function] |  |  |  |
| `receivedAt` | Date |  |  | null |  |  |  |
| `fittedAt` | Date |  |  | null |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `patientId:1` |  |
| `providerId:1` |  |
| `workType:1` |  |
| `status:1` |  |
| `patientId:1, createdAt:-1` |  |

### `dentaltreatmentplans` — DentalTreatmentPlan

source `DentalTreatmentPlan.js` · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `providerId` | ObjectId | yes |  |  |  | Provider | Identifier |
| `recordedBy` | ObjectId | yes |  |  |  | User |  |
| `title` | String |  |  | "" |  |  |  |
| `stages` | Array<subdocument> |  |  |  |  |  |  |
| `stages.name` | String | yes |  |  |  |  | Identity |
| `stages.teeth` | Array<Mixed> |  |  |  |  |  |  |
| `stages.costAmount` | Number |  |  | 0 |  |  |  |
| `stages.status` | String |  |  | "planned" | planned, in_progress, done |  |  |
| `status` | String |  |  | "draft" | draft, active, completed, cancelled |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `patientId:1` |  |
| `providerId:1` |  |
| `status:1` |  |
| `patientId:1, createdAt:-1` |  |

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

### `dialysissessions` — DialysisSession

source `DialysisSession.js` · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `providerId` | ObjectId | yes |  |  |  | Provider | Identifier |
| `recordedBy` | ObjectId | yes |  |  |  | User |  |
| `machineId` | String |  |  | "" |  |  |  |
| `date` | String | yes |  |  |  |  |  |
| `preWeightKg` | Number | yes |  |  |  |  |  |
| `postWeightKg` | Number | yes |  |  |  |  |  |
| `preSystolic` | Number |  |  |  |  |  |  |
| `preDiastolic` | Number |  |  |  |  |  |  |
| `postSystolic` | Number |  |  |  |  |  |  |
| `postDiastolic` | Number |  |  |  |  |  |  |
| `ufLitres` | Number |  |  |  |  |  |  |
| `durationMin` | Number |  |  |  |  |  |  |
| `isolation` | String |  |  | "none" | none, hbv, hcv, hbv_hcv, other |  |  |
| `complications` | String |  |  | "" |  |  |  |
| `notes` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `patientId:1` |  |
| `providerId:1` |  |
| `isolation:1` |  |
| `patientId:1, date:-1` |  |

### `dialysiswaterqualities` — DialysisWaterQuality

source `DialysisWaterQuality.js` · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `providerId` | ObjectId | yes |  |  |  | Provider | Identifier |
| `recordedBy` | ObjectId | yes |  |  |  | User |  |
| `date` | String | yes |  |  |  |  |  |
| `freeChlorinePpm` | Number |  |  |  |  |  |  |
| `tdsPpm` | Number |  |  |  |  |  |  |
| `bacterialCountCfuMl` | Number |  |  |  |  |  |  |
| `pass` | Boolean | yes |  |  |  |  |  |
| `notes` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `providerId:1` |  |
| `pass:1` |  |
| `providerId:1, date:-1` |  |

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
| `dietType` | String | yes |  |  | Regular, Diabetic, Low Sodium, Liquid, Soft, High Protein, Low Fat, Renal, NPO, Other, Cardiac, Bland, Low Residue, Clear Liquid, Full Liquid, Pureed/Dysphagia, Tube/Enteral, Gluten Free, Neutropenic, Paediatric, Weight Loss, Keto, Post Surgery, Pregnancy/Lactation, Geriatric |  |  |
| `mealTimes` | Array<Mixed> |  |  |  |  |  |  |
| `instructions` | String |  |  |  |  |  |  |
| `allergies` | String |  |  |  |  |  | Health |
| `status` | String |  |  | "Active" | Active, Completed, Cancelled |  |  |
| `reviewedByDietitian` | Boolean |  |  | false |  |  |  |
| `dietitianName` | String |  |  |  |  |  |  |
| `meals` | Array<subdocument> |  |  |  |  |  |  |
| `meals.mealType` | String |  |  |  | Breakfast, Lunch, Evening Snack, Dinner, Early Morning, Mid Morning, Bedtime, Supplement |  |  |
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
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `orderId:1` | unique |
| `hospitalId:1` |  |
| `encounterId:1` |  |

### `dischargeworkflows` — DischargeWorkflow

source `DischargeWorkflow.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Health, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `admissionId` | ObjectId | yes | yes |  |  | Admission |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `state` | String |  |  | "Initiated" | Initiated, DoctorApproved, NursingClear, PharmacyClear, BillingClear, Discharged, Cancelled |  |  |
| `type` | String |  |  | "Normal" | Normal, LAMA, DAMA, Referred, Absconded, Death |  |  |
| `approvals` | Array<subdocument> |  |  |  |  |  |  |
| `approvals.stage` | String |  |  |  |  |  |  |
| `approvals.by` | ObjectId |  |  |  |  | User |  |
| `approvals.at` | Date |  |  | [function] |  |  |  |
| `approvals.remarks` | String |  |  | "" |  |  |  |
| `summary.diagnosis` | Array<Mixed> |  |  |  |  |  | Health |
| `summary.procedures` | Array<Mixed> |  |  |  |  |  |  |
| `summary.course` | String |  |  | "" |  |  |  |
| `summary.investigations` | String |  |  | "" |  |  |  |
| `summary.conditionAtDischarge` | String |  |  | "" |  |  |  |
| `summary.medicines` | Array<subdocument> |  |  |  |  |  |  |
| `summary.medicines.drug` | String |  |  |  |  |  |  |
| `summary.medicines.dose` | String |  |  |  |  |  |  |
| `summary.medicines.route` | String |  |  |  |  |  |  |
| `summary.medicines.freq` | String |  |  |  |  |  |  |
| `summary.medicines.days` | String |  |  |  |  |  |  |
| `summary.advice` | String |  |  | "" |  |  |  |
| `summary.followUp.date` | Date |  |  | null |  |  |  |
| `summary.followUp.dept` | String |  |  | "" |  |  |  |
| `summary.redFlags` | String |  |  | "" |  |  |  |
| `finalBillId` | ObjectId |  |  | null |  | Billing |  |
| `summaryPdfUrl` | String |  |  | "" |  |  |  |
| `abdmPushed` | Boolean |  |  | false |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `admissionId:1` | unique |
| `patientId:1` |  |
| `hospitalId:1` |  |
| `state:1` |  |

### `discountpolicies` — DiscountPolicy

source `DiscountPolicy.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `role` | String | yes |  |  |  |  |  |
| `maxPercent` | Number | yes |  |  |  |  |  |
| `requiresReason` | Boolean |  |  | true |  |  |  |
| `approverRole` | String |  |  | "hospital_admin" |  |  |  |
| `active` | Boolean |  |  | true |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `hospitalId:1, role:1` |  |

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
| `evidence` | Array<subdocument> |  |  |  |  |  |  |
| `evidence.url` | String | yes |  |  |  |  |  |
| `evidence.kind` | String |  |  | "other" | screenshot, invoice, chat, medical_doc, photo, other |  |  |
| `evidence.uploadedBy` | ObjectId |  |  | null |  | User |  |
| `evidence.uploadedAt` | Date |  |  | [function] |  |  |  |
| `evidence.note` | String |  |  | "" |  |  |  |
| `providerResponse` | String |  |  | "" |  |  |  |
| `providerRespondedAt` | Date |  |  | null |  |  |  |
| `decision.type` | String |  |  | "" | , upheld, partially_upheld, rejected, withdrawn |  |  |
| `decision.rationale` | String |  |  | "" |  |  |  |
| `decision.decidedBy` | ObjectId |  |  | null |  | User |  |
| `decision.decidedAt` | Date |  |  | null |  |  |  |
| `appeal.appealedBy` | ObjectId |  |  | null |  | User |  |
| `appeal.appealedAt` | Date |  |  | null |  |  |  |
| `appeal.reason` | String |  |  | "" |  |  |  |
| `appeal.status` | String |  |  | "none" | none, pending, decided |  |  |
| `appeal.outcome` | String |  |  | "" | , overturned, upheld |  |  |
| `appeal.decidedBy` | ObjectId |  |  | null |  | User |  |
| `appeal.decidedAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `disputeId:1` | unique |
| `appeal.status:1, createdAt:-1` |  |
| `status:1, createdAt:-1` |  |
| `raisedBy:1, createdAt:-1` |  |

### `dndentries` — DndEntry

source `DndEntry.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Contact, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `phone` | String | yes |  |  |  |  | Contact |
| `channel` | String |  |  | "all" | call, sms, whatsapp, all |  |  |
| `reason` | String |  |  | "" |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `phone:1` |  |
| `hospitalId:1, phone:1` | unique |

### `doctorfees` — DoctorFee

source `DoctorFee.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `doctorId` | ObjectId | yes |  |  |  | Doctor | Identifier |
| `consultFee` | Number |  |  | 0 |  |  |  |
| `followUpFee` | Number |  |  | 0 |  |  |  |
| `emergencyFee` | Number |  |  | 0 |  |  |  |
| `revenueSharePct` | Number |  |  | 0 |  |  |  |
| `effectiveFrom` | Date |  |  | [function] |  |  |  |
| `active` | Boolean |  |  | true |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `doctorId:1` |  |
| `hospitalId:1, doctorId:1, effectiveFrom:-1` |  |

### `doctors` — Doctor

source `Doctor.js` · timestamps: yes · virtuals: 29 · retention: Life of the provider relationship + 1 year (provider deletion flow) (docs/privacy/RETENTION.md) · PII: Contact, Identifier, Identity, Image/Biometric, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `doctorId` | String |  | yes |  |  |  | Identifier |
| `name` | String | yes |  |  |  |  | Identity |
| `specialization` | String | yes |  |  |  |  |  |
| `specialtyCode` | String |  |  | "" |  |  |  |
| `dutyStatus` | String |  |  | "On duty" | On duty, On call, Off |  |  |
| `subSpecialtyCodes` | Array<Mixed> |  |  |  |  |  |  |
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
| `settings.flyingSquadOptIn` | Boolean |  |  | false |  |  |  |
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
| `specialtyCode:1` |  |
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

### `donorscreenings` — DonorScreening

source `DonorScreening.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Contact, Demographic

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `donorName` | String | yes |  |  |  |  |  |
| `phone` | String |  |  | "" |  |  | Contact |
| `bloodGroup` | String | yes |  |  | A+, A-, B+, B-, AB+, AB-, O+, O- |  | Demographic |
| `age` | Number |  |  | null |  |  | Demographic |
| `weightKg` | Number |  |  | null |  |  |  |
| `hb` | Number |  |  | null |  |  |  |
| `bp` | String |  |  | "" |  |  |  |
| `lastDonationAt` | Date |  |  | null |  |  |  |
| `questionnaire` | Mixed |  |  | [function] |  |  |  |
| `eligible` | Boolean |  |  | true |  |  |  |
| `deferralReason` | String |  |  | "" |  |  |  |
| `deferredTill` | Date |  |  | null |  |  |  |
| `screenedBy` | ObjectId |  |  | null |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `hospitalId:1, phone:1` |  |

### `emergencies` — Emergency

source `Emergency.js` · timestamps: yes · virtuals: 0 · retention: Trip duration + 30 days (dispute window) (docs/privacy/RETENTION.md) · PII: Contact, Demographic, Health, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientName` | String |  |  | "Unknown" |  |  | Identity |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `tempUhid` | String |  |  | "" |  |  |  |
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
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `responseTime` | Number |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `tempUhid:1` |  |
| `hospitalId:1` |  |
| `encounterId:1` |  |

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

### `encounters` — Encounter

source `Encounter.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `encounterNo` | String |  | yes |  |  |  |  |
| `type` | String |  |  | "OPD" | OPD, IPD, ER, TELE, HOME, DAYCARE |  |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `uhid` | String |  |  | "" |  |  |  |
| `appointmentId` | ObjectId |  |  | null |  | Appointment |  |
| `admissionId` | ObjectId |  |  | null |  | Admission |  |
| `emergencyId` | ObjectId |  |  | null |  | Emergency |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `facilityId` | ObjectId |  |  |  |  | Facility |  |
| `departmentId` | String |  |  | "" |  |  |  |
| `primaryDoctorId` | ObjectId |  |  | null |  | Doctor |  |
| `payerType` | String |  |  | "cash" | cash, insurance, corporate, govt |  |  |
| `payerRef.insurerId` | ObjectId |  |  | null |  | Insurer |  |
| `payerRef.policyId` | String |  |  | "" |  |  |  |
| `payerRef.corporateId` | String |  |  | "" |  |  |  |
| `payerRef.scheme` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "Open" | Open, Closed, Cancelled |  |  |
| `isMLC` | Boolean |  |  | false |  |  |  |
| `openedAt` | Date |  |  | [function] |  |  |  |
| `closedAt` | Date |  |  | null |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `encounterNo:1` | unique, sparse |
| `type:1` |  |
| `patientId:1` |  |
| `hospitalId:1` |  |
| `facilityId:1` |  |
| `status:1` |  |
| `hospitalId:1, status:1` |  |
| `patientId:1, createdAt:-1` |  |

### `enquiries` — Enquiry

source `Enquiry.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Contact, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `name` | String | yes |  |  |  |  | Identity |
| `phone` | String |  |  | "" |  |  | Contact |
| `source` | String |  |  | "walkin" | walkin, call, online, referral, camp, other |  |  |
| `interest` | String |  |  | "" |  |  |  |
| `notes` | String |  |  | "" |  |  |  |
| `followUpAt` | Date |  |  | null |  |  |  |
| `status` | String |  |  | "Open" | Open, FollowUp, Converted, Dropped |  |  |
| `convertedPatientId` | ObjectId |  |  | null |  | Patient |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `phone:1` |  |
| `status:1` |  |
| `hospitalId:1, status:1` |  |

### `equipment` — Equipment

source `Equipment.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `name` | String | yes |  |  |  |  |  |
| `type` | String | yes |  |  | MRI, CT Scan, X-Ray, Ultrasound, ECG, EEG, Mammography, DEXA, PET Scan, Lab Analyzer, Centrifuge, Microscope, Other, Ventilator, Defibrillator, Infusion Pump, Dialysis Machine, Autoclave, Anaesthesia Machine, Patient Monitor, OT Table/Lights, C-Arm, Portable USG/X-Ray, Suction, N… (340 chars) |  |  |
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
| `warrantyTill` | Date |  |  | null |  |  |  |
| `amcVendor` | String |  |  | "" |  |  |  |
| `contractId` | ObjectId |  |  | null |  | Contract |  |
| `calibrationDue` | Date |  |  | null |  |  |  |
| `nextPmDue` | Date |  |  | null |  |  |  |
| `criticality` | String |  |  | "Medium" | Low, Medium, High, LifeSupport |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `contractId:1` |  |

### `eventregistrations` — EventRegistration

source `EventRegistration.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Financial, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `eventId` | ObjectId | yes |  |  |  | Event |  |
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `status` | String |  |  | "REGISTERED" | REGISTERED, CHECKED_IN, CANCELLED, REFUNDED |  |  |
| `feeAmount` | Number |  |  | 0 |  |  |  |
| `currency` | String |  |  | "INR" |  |  |  |
| `paymentId` | ObjectId |  |  | null |  | Payment | Financial |
| `checkInCode` | String | yes |  |  |  |  |  |
| `checkedInAt` | Date |  |  | null |  |  |  |
| `checkedInBy` | ObjectId |  |  | null |  | User |  |
| `consentGivenAt` | Date |  |  | null |  |  |  |
| `cancelledAt` | Date |  |  | null |  |  |  |
| `cancelReason` | String |  |  | "" |  |  |  |
| `refundedAt` | Date |  |  | null |  |  |  |
| `refundId` | ObjectId |  |  | null |  | Refund |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `eventId:1` |  |
| `userId:1` |  |
| `status:1` |  |
| `eventId:1, userId:1` | unique |
| `eventId:1, status:1` |  |

### `events` — Event

source `Event.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Contact, Demographic, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `organizerId` | ObjectId | yes |  |  |  | Provider |  |
| `partnerProviderId` | ObjectId |  |  | null |  | Provider |  |
| `type` | String | yes |  |  | camp, workshop, webinar, vaccination, blood_drive, training, retreat |  |  |
| `title` | String | yes |  |  |  |  |  |
| `description` | String |  |  | "" |  |  |  |
| `slug` | String |  | yes |  |  |  |  |
| `schedule.start` | Date | yes |  |  |  |  |  |
| `schedule.end` | Date | yes |  |  |  |  |  |
| `schedule.tz` | String |  |  | "Asia/Kolkata" |  |  |  |
| `venue.mode` | String |  |  | "venue" | venue, online |  |  |
| `venue.address` | String |  |  | "" |  |  | Contact |
| `venue.city` | String |  |  | "" |  |  |  |
| `venue.pincode` | String |  |  | "" |  |  | Contact |
| `venue.geo.type` | String |  |  |  | Point |  |  |
| `venue.geo.coordinates` | Array<Mixed> |  |  |  |  |  | Location |
| `venue.onlineLink` | String |  |  | "" |  |  |  |
| `capacity` | Number | yes |  |  |  |  |  |
| `registeredCount` | Number |  |  | 0 |  |  |  |
| `fee.amount` | Number |  |  | 0 |  |  |  |
| `fee.currency` | String |  |  | "INR" |  |  |  |
| `eligibility.ageMin` | Number |  |  | 0 |  |  |  |
| `eligibility.ageMax` | Number |  |  | 120 |  |  |  |
| `eligibility.gender` | String |  |  | "any" | any, male, female, other |  | Demographic |
| `agenda` | Array<subdocument> |  |  |  |  |  |  |
| `agenda.at` | String |  |  |  |  |  |  |
| `agenda.label` | String |  |  |  |  |  |  |
| `speakers` | Array<subdocument> |  |  |  |  |  |  |
| `speakers.title` | String |  |  |  |  |  |  |
| `speakers.affiliation` | String |  |  |  |  |  |  |
| `speakers.bio` | String |  |  |  |  |  |  |
| `languages` | Array<Mixed> |  |  |  |  |  |  |
| `consentText` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "draft" | draft, open, cancelled, ended |  |  |
| `refundCutoffHours` | Number |  |  | 24 |  |  |  |
| `publishedAt` | Date |  |  | null |  |  |  |
| `endedAt` | Date |  |  | null |  |  |  |
| `cancelledAt` | Date |  |  | null |  |  |  |
| `cancelReason` | String |  |  | "" |  |  |  |
| `outcomeReport.summary` | String |  |  | "" |  |  |  |
| `outcomeReport.attendeeCount` | Number |  |  | 0 |  |  |  |
| `outcomeReport.feedbackAvg` | Number |  |  | 0 |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `organizerId:1` |  |
| `type:1` |  |
| `slug:1` | unique, sparse |
| `schedule.start:1` |  |
| `status:1` |  |
| `status:1, schedule.start:1` |  |
| `organizerId:1, status:1` |  |
| `title:text, description:text` |  |

### `expenses` — Expense

source `Expense.js` · timestamps: yes · virtuals: 0 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `date` | Date |  |  | [function] |  |  |  |
| `category` | String | yes |  |  |  |  |  |
| `costCenter` | String |  |  | "" |  |  |  |
| `vendorId` | ObjectId |  |  | null |  | Supplier |  |
| `amount` | Number | yes |  |  |  |  |  |
| `tax` | Number |  |  | 0 |  |  |  |
| `mode` | String |  |  | "Cash" | Cash, Card, UPI, Bank, Other |  |  |
| `attachments` | Array<Mixed> |  |  |  |  |  |  |
| `approvedBy` | ObjectId |  |  | null |  | User |  |
| `status` | String |  |  | "Pending" | Pending, Approved, Rejected, Paid |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `date:1` |  |
| `status:1` |  |
| `hospitalId:1, status:1` |  |

### `eyeexams` — EyeExam

source `EyeExam.js` · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Health, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `providerId` | ObjectId | yes |  |  |  | Provider | Identifier |
| `recordedBy` | ObjectId | yes |  |  |  | User |  |
| `od` | Subdocument |  |  | {} |  |  |  |
| `od.sph` | Number |  |  |  |  |  |  |
| `od.cyl` | Number |  |  |  |  |  |  |
| `od.axis` | Number |  |  |  |  |  |  |
| `od.va` | String |  |  | "" |  |  |  |
| `os` | Subdocument |  |  | {} |  |  |  |
| `os.sph` | Number |  |  |  |  |  |  |
| `os.cyl` | Number |  |  |  |  |  |  |
| `os.axis` | Number |  |  |  |  |  |  |
| `os.va` | String |  |  | "" |  |  |  |
| `iopOd` | Number |  |  |  |  |  |  |
| `iopOs` | Number |  |  |  |  |  |  |
| `diagnosis` | String |  |  | "" |  |  | Health |
| `prescriptionIssued` | Boolean |  |  | false |  |  |  |
| `prescriptionType` | String |  |  | "none" | glasses, contacts, none |  |  |
| `nextReviewDate` | String |  |  |  |  |  |  |
| `recordedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `patientId:1` |  |
| `providerId:1` |  |
| `patientId:1, recordedAt:-1` |  |

### `eyesurgeryleads` — EyeSurgeryLead

source `EyeSurgeryLead.js` · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `providerId` | ObjectId | yes |  |  |  | Provider | Identifier |
| `recordedBy` | ObjectId | yes |  |  |  | User |  |
| `procedure` | String | yes |  |  | cataract, lasik, other |  |  |
| `eye` | String | yes |  |  | od, os, both |  |  |
| `stage` | String |  |  | "lead" | lead, pre_op, scheduled, completed, follow_up, cancelled |  |  |
| `notes` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `patientId:1` |  |
| `providerId:1` |  |
| `procedure:1` |  |
| `stage:1` |  |
| `patientId:1, createdAt:-1` |  |

### `facilities` — Facility

source `Facility.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `facilityId` | String |  | yes |  |  |  |  |
| `name` | String | yes |  |  |  |  |  |
| `slug` | String |  | yes |  |  |  |  |
| `type` | String | yes |  |  | hospital, clinic, lab, pharmacy |  |  |
| `subType` | String |  |  | "" | multi_specialty, super_specialty, single_specialty, nursing_home, maternity_hospital, day_care_surgery, government_hospital, district_hospital, medical_college, phc, chc, uphc, sub_centre, arogya_mandir, mohalla_community_clinic, trauma_centre, rehabilitation_hospital, psychiatri… (1121 chars) |  |  |
| `ownership` | String |  |  | "" | government, private, trust_charitable, corporate_chain, cooperative, ppp, military_railway_esi, |  |  |
| `systemOfMedicine` | String |  |  | "" | allopathy, ayurveda, homeopathy, unani, siddha, yoga_naturopathy, sowa_rigpa, integrative, |  |  |
| `schemesAccepted` | Array<Mixed> |  |  |  |  |  |  |
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
| `dependentOf` | ObjectId |  |  | null |  | User |  |
| `guardianConsent.granted` | Boolean |  |  | false |  |  |  |
| `guardianConsent.grantedBy` | ObjectId |  |  | null |  | User |  |
| `guardianConsent.grantedAt` | Date |  |  | null |  |  |  |
| `guardianConsent.note` | String |  |  | "" |  |  |  |
| `emergencyCard.allergies` | String |  |  | "" |  |  | Health |
| `emergencyCard.conditions` | String |  |  | "" |  |  | Health |
| `emergencyCard.bloodGroup` | String |  |  | "" |  |  | Demographic |
| `emergencyCard.contacts` | Array<subdocument> |  |  |  |  |  |  |
| `emergencyCard.contacts.name` | String |  |  |  |  |  | Identity |
| `emergencyCard.contacts.relation` | String |  |  |  |  |  |  |
| `emergencyCard.contacts.phone` | String |  |  |  |  |  | Contact |
| `emergencyCard.sharedInSos` | Boolean |  |  | false |  |  |  |
| `emergencyCard.sharedAt` | Date |  |  | null |  |  |  |
| `privacyPrefs.hiddenCategories` | Array<Mixed> |  |  |  |  |  |  |
| `privacyPrefs.discreetNotifications` | Boolean |  |  | false |  |  |  |
| `wearableLinks` | Array<subdocument> |  |  |  |  |  |  |
| `wearableLinks.provider` | String | yes |  |  |  |  |  |
| `wearableLinks.externalId` | String |  |  | "" |  |  |  |
| `wearableLinks.kind` | String |  |  | "other" | watch, band, scale, bp_monitor, glucometer, other |  |  |
| `wearableLinks.linkedAt` | Date |  |  | [function] |  |  |  |
| `wearableLinks.lastSyncAt` | Date |  |  | null |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `patientId:1` |  |
| `dependentOf:1` |  |
| `patientId:1, isActive:1` |  |

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

### `fertilitycycles` — FertilityCycle

source `FertilityCycle.js` · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `providerId` | ObjectId | yes |  |  |  | Provider | Identifier |
| `recordedBy` | ObjectId | yes |  |  |  | User |  |
| `cycleNo` | Number | yes |  |  |  |  |  |
| `cycleType` | String | yes |  |  | ivf, icsi, iui, frozen_embryo, other |  |  |
| `status` | String |  |  | "active" | active, completed, cancelled |  |  |
| `procedures` | Array<subdocument> |  |  |  |  |  |  |
| `procedures.name` | String | yes |  |  |  |  | Identity |
| `procedures.date` | String |  |  |  |  |  |  |
| `procedures.status` | String |  |  | "planned" | planned, done, skipped |  |  |
| `artConsent.granted` | Boolean |  |  | false |  |  |  |
| `artConsent.grantedAt` | Date |  |  | null |  |  |  |
| `artDocuments` | Array<Mixed> |  |  |  |  |  |  |
| `outcome.result` | String |  |  | null | positive, negative, biochemical, ectopic, ongoing |  |  |
| `outcome.recordedAt` | Date |  |  | null |  |  |  |
| `notes` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `patientId:1` |  |
| `providerId:1` |  |
| `cycleType:1` |  |
| `status:1` |  |
| `patientId:1, createdAt:-1` |  |
| `patientId:1, cycleNo:1` |  |

### `formresponses` — FormResponse

source `FormResponse.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `templateKey` | String | yes |  |  |  |  |  |
| `templateVersion` | Number | yes |  |  |  |  |  |
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `values` | Mixed |  |  | [function] |  |  |  |
| `computed` | Mixed |  |  | [function] |  |  |  |
| `status` | String |  |  | "Draft" | Draft, Signed, Amended |  |  |
| `signatures` | Array<subdocument> |  |  |  |  |  |  |
| `signatures.role` | String |  |  | "" |  |  |  |
| `signatures.userId` | ObjectId |  |  |  |  | User | Identifier |
| `signatures.at` | Date |  |  | [function] |  |  |  |
| `signatures.hash` | String |  |  | "" |  |  |  |
| `amendmentOf` | ObjectId |  |  | null |  | FormResponse |  |
| `amendmentReason` | String |  |  | "" |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `templateKey:1` |  |
| `encounterId:1` |  |
| `patientId:1` |  |
| `status:1` |  |
| `encounterId:1, templateKey:1` |  |

### `formtemplates` — FormTemplate

source `FormTemplate.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `key` | String | yes |  |  |  |  |  |
| `title` | String | yes |  |  |  |  |  |
| `category` | String |  |  | "" |  |  |  |
| `version` | Number |  |  | 1 |  |  |  |
| `status` | String |  |  | "Draft" | Draft, Review, Published, Deprecated |  |  |
| `definition.sections` | Array<subdocument> |  |  |  |  |  |  |
| `definition.sections.id` | String |  |  |  |  |  |  |
| `definition.sections.title` | String |  |  | "" |  |  |  |
| `definition.sections.fields` | Array<subdocument> |  |  | [] |  |  |  |
| `definition.sections.fields.id` | String | yes |  |  |  |  |  |
| `definition.sections.fields.type` | String | yes |  |  |  |  |  |
| `definition.sections.fields.label` | String |  |  | "" |  |  |  |
| `definition.sections.fields.labelHi` | String |  |  | "" |  |  |  |
| `definition.sections.fields.required` | Boolean |  |  | false |  |  |  |
| `definition.sections.fields.unit` | String |  |  | "" |  |  |  |
| `definition.sections.fields.options` | Array<Mixed> |  |  |  |  |  |  |
| `definition.sections.fields.min` | Number |  |  | null |  |  |  |
| `definition.sections.fields.max` | Number |  |  | null |  |  |  |
| `definition.sections.fields.showIf` | Mixed |  |  | null |  |  |  |
| `definition.sections.fields.requiredIf` | Mixed |  |  | null |  |  |  |
| `definition.sections.fields.formula` | String |  |  | "" |  |  |  |
| `definition.sections.fields.bind` | String |  |  | "" |  |  |  |
| `definition.sections.fields.permission` | String |  |  | "" |  |  |  |
| `scoring` | Array<subdocument> |  |  |  |  |  |  |
| `scoring.id` | String |  |  |  |  |  |  |
| `scoring.formula` | String |  |  | "" |  |  |  |
| `scoring.bands` | Array<subdocument> |  |  |  |  |  |  |
| `scoring.bands.from` | Number |  |  |  |  |  |  |
| `scoring.bands.to` | Number |  |  |  |  |  |  |
| `scoring.bands.label` | String |  |  |  |  |  |  |
| `scoring.bands.color` | String |  |  | "" |  |  |  |
| `printTemplateId` | ObjectId |  |  | null |  | PrintTemplate |  |
| `contexts` | Array<Mixed> |  |  |  |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `key:1` |  |
| `status:1` |  |
| `hospitalId:1, key:1, version:-1` |  |

### `grns` — GRN

source `GRN.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `poId` | ObjectId |  |  | null |  | PurchaseOrder |  |
| `supplierId` | ObjectId |  |  | null |  | Supplier |  |
| `storeId` | ObjectId |  |  | null |  | Store |  |
| `invoiceNo` | String |  |  | "" |  |  |  |
| `items` | Array<subdocument> |  |  |  |  |  |  |
| `items.itemId` | String |  |  |  |  |  |  |
| `items.name` | String |  |  |  |  |  |  |
| `items.batch` | String |  |  | "" |  |  |  |
| `items.expiry` | Date |  |  | null |  |  |  |
| `items.qty` | Number | yes |  |  |  |  |  |
| `items.rate` | Number |  |  | 0 |  |  |  |
| `items.mrp` | Number |  |  | 0 |  |  |  |
| `items.gst` | Number |  |  | 0 |  |  |  |
| `qcStatus` | String |  |  | "Pending" | Pending, Passed, Rejected |  |  |
| `receivedBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `qcStatus:1` |  |
| `hospitalId:1, qcStatus:1` |  |

### `healthpackages` — HealthPackage

source `HealthPackage.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `name` | String | yes |  |  |  |  |  |
| `description` | String |  |  |  |  |  |  |
| `category` | String |  |  | "Basic" | Basic, Comprehensive, Cardiac, Diabetic, Women, Senior Citizen, Corporate, Executive, Thyroid, Liver, Kidney, Bone & Joint, Men, Child, Pregnancy, Pre-Marital, Pre-Employment, Cancer Screening, Fever/Seasonal, Vitamin/Immunity, Fitness/Athlete, Allergy, Sexual Health, Travel/Visa… (314 chars) |  |  |
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
| `type` | String | yes |  |  | Routine Cleaning, Deep Cleaning, Discharge Cleaning, Terminal Cleaning, Fumigation, Biomedical Waste Pickup, Linen Change, Pest Control, Water Tank Cleaning |  |  |
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

### `hubintegrations` — HubIntegration

source `HubIntegration.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `key` | String | yes |  |  |  |  |  |
| `kind` | String | yes |  |  | lis, pacs, telephony, sms, email, payment, insurance, other |  |  |
| `transport` | String |  |  | "rest" | rest, hl7, mqtt, serial, file |  |  |
| `status` | String |  |  | "disabled" | connected, degraded, down, disabled |  |  |
| `lastSeenAt` | Date |  |  | null |  |  |  |
| `config` | Mixed |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `status:1` |  |
| `hospitalId:1, key:1` | unique |

### `iamassignments` — IamAssignment

source `IamAssignment.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Health

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `tenantId` | ObjectId | yes |  |  |  | Facility |  |
| `principalType` | String | yes |  |  | user, group |  |  |
| `principalId` | ObjectId | yes |  |  |  |  |  |
| `roleId` | ObjectId |  |  | null |  | IamRole |  |
| `policyId` | ObjectId |  |  | null |  | IamPolicy |  |
| `scope.deptIds` | Array<Mixed> |  |  |  |  |  |  |
| `scope.wardIds` | Array<Mixed> |  |  |  |  |  |  |
| `scope.locationIds` | Array<Mixed> |  |  |  |  |  |  |
| `scope.careTeamOnly` | Boolean |  |  | false |  |  |  |
| `conditions` | Mixed |  |  | [function] |  |  | Health |
| `expiresAt` | Date |  |  | null |  |  |  |
| `grantedBy` | ObjectId |  |  |  |  | User |  |
| `approvedBy` | ObjectId |  |  | null |  | User |  |
| `reason` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "active" | active, revoked, expired |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `tenantId:1` |  |
| `principalId:1` |  |
| `expiresAt:1` |  |
| `status:1` |  |
| `tenantId:1, principalId:1` |  |
| `tenantId:1, status:1` |  |

### `iamgroups` — IamGroup

source `IamGroup.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `tenantId` | ObjectId | yes |  |  |  | Facility |  |
| `name` | String | yes |  |  |  |  | Identity |
| `memberIds` | Array<Mixed> |  |  |  |  |  |  |
| `roleIds` | Array<Mixed> |  |  |  |  |  |  |
| `policyIds` | Array<Mixed> |  |  |  |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `tenantId:1` |  |
| `tenantId:1, name:1` | unique |

### `iampolicies` — IamPolicy

source `IamPolicy.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Health, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `tenantId` | ObjectId |  |  | null |  | Facility |  |
| `name` | String | yes |  |  |  |  | Identity |
| `type` | String |  |  | "custom" | managed, custom |  |  |
| `statements` | Array<subdocument> |  |  | [] |  |  |  |
| `statements.sid` | String |  |  | "" |  |  |  |
| `statements.effect` | String | yes |  |  | Allow, Deny |  |  |
| `statements.actions` | Array<Mixed> |  |  |  |  |  |  |
| `statements.resources` | Array<Mixed> |  |  |  |  |  |  |
| `statements.conditions` | Mixed |  |  | [function] |  |  | Health |
| `version` | Number |  |  | 1 |  |  |  |
| `status` | String |  |  | "active" | active, deprecated |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `tenantId:1` |  |
| `type:1` |  |
| `tenantId:1, name:1` | unique |

### `iamroles` — IamRole

source `IamRole.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `tenantId` | ObjectId |  |  | null |  | Facility |  |
| `name` | String | yes |  |  |  |  | Identity |
| `type` | String |  |  | "custom" | managed, custom |  |  |
| `policyIds` | Array<Mixed> |  |  |  |  |  |  |
| `boundaryId` | ObjectId |  |  | null |  | IamPolicy |  |
| `version` | Number |  |  | 1 |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `tenantId:1` |  |
| `type:1` |  |
| `tenantId:1, name:1` | unique |

### `icuflowsheets` — IcuFlowsheet

source `IcuFlowsheet.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Health, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `admissionId` | ObjectId | yes |  |  |  | Admission |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `hourSlot` | Date | yes |  |  |  |  |  |
| `vitals` | Mixed |  |  | [function] |  |  | Health |
| `ventilator.mode` | String |  |  | "" |  |  |  |
| `ventilator.fio2` | Number |  |  | null |  |  |  |
| `ventilator.peep` | Number |  |  | null |  |  |  |
| `ventilator.rate` | Number |  |  | null |  |  |  |
| `infusions` | Array<subdocument> |  |  |  |  |  |  |
| `infusions.name` | String |  |  |  |  |  | Identity |
| `infusions.rate` | String |  |  |  |  |  |  |
| `gcs.e` | Number |  |  | null |  |  |  |
| `gcs.v` | Number |  |  | null |  |  |  |
| `gcs.m` | Number |  |  | null |  |  |  |
| `sedationScore` | String |  |  | "" |  |  |  |
| `recordedBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `admissionId:1` |  |
| `hospitalId:1` |  |
| `admissionId:1, hourSlot:1` | unique |

### `incidents` — Incident

source `Incident.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `type` | String | yes |  |  | Fall, MedicationError, NeedleStick, HAI, Sentinel, NearMiss, Equipment, Security, Other |  |  |
| `severity` | String |  |  | "Medium" | Low, Medium, High, Critical |  |  |
| `location` | String |  |  | "" |  |  | Location |
| `reportedBy` | ObjectId |  |  |  |  | User |  |
| `involvedPatientId` | ObjectId |  |  | null |  | User |  |
| `description` | String |  |  | "" |  |  |  |
| `immediateAction` | String |  |  | "" |  |  |  |
| `rca` | String |  |  | "" |  |  |  |
| `capa` | Array<subdocument> |  |  |  |  |  |  |
| `capa.action` | String |  |  |  |  |  |  |
| `capa.owner` | String |  |  |  |  |  |  |
| `capa.dueAt` | Date |  |  |  |  |  |  |
| `capa.doneAt` | Date |  |  | null |  |  |  |
| `status` | String |  |  | "Open" | Open, Investigating, CAPA, Closed |  |  |
| `closedAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `type:1` |  |
| `severity:1` |  |
| `status:1` |  |
| `hospitalId:1, status:1` |  |

### `indents` — Indent

source `Indent.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `fromStoreId` | ObjectId | yes |  |  |  | Store |  |
| `toStoreId` | ObjectId | yes |  |  |  | Store |  |
| `items` | Array<subdocument> |  |  |  |  |  |  |
| `items.itemId` | String |  |  |  |  |  |  |
| `items.name` | String |  |  |  |  |  |  |
| `items.batch` | String |  |  | "" |  |  |  |
| `items.qty` | Number | yes |  |  |  |  |  |
| `items.issuedQty` | Number |  |  | 0 |  |  |  |
| `status` | String |  |  | "Draft" | Draft, Requested, Issued, Received, Cancelled |  |  |
| `issuedBy` | ObjectId |  |  | null |  | User |  |
| `receivedBy` | ObjectId |  |  | null |  | User |  |
| `createdBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `status:1` |  |
| `hospitalId:1, status:1` |  |

### `instrumentsets` — InstrumentSet

source `InstrumentSet.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId | yes |  |  |  | Hospital |  |
| `code` | String | yes |  |  |  |  |  |
| `name` | String | yes |  |  |  |  |  |
| `items` | Array<subdocument> |  |  |  |  |  |  |
| `items.instrument` | String |  |  |  |  |  |  |
| `items.qty` | Number |  |  | 1 |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `hospitalId:1, code:1` | unique |

### `insurancepolicies` — InsurancePolicy

source `InsurancePolicy.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `insurer` | String | yes |  |  |  |  |  |
| `tpa` | String |  |  | "" |  |  |  |
| `policyNumber` | String | yes |  |  |  |  |  |
| `memberIds` | Array<Mixed> |  |  |  |  |  |  |
| `scheme` | String |  |  | null | PM-JAY, CGHS, ESI, null |  |  |
| `validFrom` | Date | yes |  |  |  |  |  |
| `validTo` | Date | yes |  |  |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `patientId:1` |  |
| `patientId:1, validTo:-1` |  |

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

### `insurers` — Insurer

source `Insurer.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `name` | String | yes |  |  |  |  | Identity |
| `type` | String |  |  | "Insurer" | Insurer, TPA, Govt |  |  |
| `contact` | String |  |  | "" |  |  |  |
| `empanelmentNo` | String |  |  | "" |  |  |  |
| `rateCardId` | ObjectId |  |  | null |  | ServicePrice |  |
| `docChecklist` | Array<Mixed> |  |  |  |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `type:1` |  |
| `hospitalId:1, name:1` |  |

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

### `integrationmessages` — IntegrationMessage

source `IntegrationMessage.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `direction` | String | yes |  |  | in, out |  |  |
| `integrationKey` | String | yes |  |  |  |  |  |
| `kind` | String |  |  | "" |  |  |  |
| `payload` | Mixed |  |  | [function] |  |  |  |
| `status` | String |  |  | "received" | received, queued, processed, failed, dead |  |  |
| `error` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `direction:1` |  |
| `integrationKey:1` |  |
| `status:1` |  |
| `hospitalId:1, status:1` |  |

### `interactions` — Interaction

source `Interaction.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Contact, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `channel` | String | yes |  |  | call, sms, whatsapp, email, walkin |  |  |
| `direction` | String |  |  | "in" | in, out |  |  |
| `phone` | String |  |  | "" |  |  | Contact |
| `patientId` | ObjectId |  |  | null |  | User | Identifier |
| `agent` | ObjectId |  |  | null |  | User |  |
| `disposition` | String |  |  | "" |  |  |  |
| `notes` | String |  |  | "" |  |  |  |
| `durationSec` | Number |  |  | 0 |  |  |  |
| `recordingUrl` | String |  |  | "" |  |  |  |
| `createdTicket` | ObjectId |  |  | null |  | WorkTask |  |
| `externalId` | String |  |  | "" |  |  |  |
| `dndHit` | Boolean |  |  | false |  |  |  |
| `afterHours` | Boolean |  |  | false |  |  |  |
| `at` | Date |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `channel:1` |  |
| `phone:1` |  |
| `externalId:1` |  |
| `hospitalId:1, channel:1, at:-1` |  |

### `inventories` — Inventory

source `Inventory.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `itemName` | String | yes |  |  |  |  |  |
| `category` | String | yes |  |  | Medical Supplies, Surgical Instruments, Disposables, Stationery, Cleaning, Electrical, Others, Implants/Prosthetics, Linen, Lab Reagents/Kits, Radiology Films/Contrast, Medical Gases, Kitchen/Food, BMW Bags, PPE, Fire Safety, IT, OT Consumables |  |  |
| `itemCode` | String |  | yes |  |  |  |  |
| `unit` | String |  |  | "Pcs" | Pcs, Box, Pair, Set, Litre, Kg, Meter, Roll, Vial, Ampoule, Strip, Bottle, Tube, Pack, mL, Cartridge |  |  |
| `currentStock` | Number |  |  | 0 |  |  |  |
| `minStockLevel` | Number |  |  | 10 |  |  |  |
| `maxStockLevel` | Number |  |  | 500 |  |  |  |
| `unitPrice` | Number |  |  | 0 |  |  |  |
| `supplier` | String |  |  |  |  |  |  |
| `location` | String |  |  |  |  |  |  |
| `expiryDate` | Date |  |  |  |  |  |  |
| `batchNumber` | String |  |  |  |  |  |  |
| `ved` | String |  |  | "Essential" | Vital, Essential, Desirable |  |  |
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

### `invoiceseries` — InvoiceSeries

source `InvoiceSeries.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `prefix` | String | yes |  |  |  |  |  |
| `fy` | String | yes |  |  |  |  |  |
| `next` | Number |  |  | 1 |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `hospitalId:1, prefix:1, fy:1` | unique |

### `ipddeposits` — IpdDeposit

source `IpdDeposit.js` · timestamps: yes · virtuals: 0 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `admissionId` | ObjectId | yes |  |  |  | Admission |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `type` | String | yes |  |  | Receive, Adjust, Refund |  |  |
| `amount` | Number | yes |  |  |  |  |  |
| `mode` | String |  |  | "Cash" | Cash, Card, UPI, NetBanking, Insurance, Online, Other |  |  |
| `receiptNo` | String |  |  | "" |  |  |  |
| `billId` | ObjectId |  |  | null |  | Billing |  |
| `counterId` | ObjectId |  |  | null |  | CashCounter |  |
| `shiftId` | ObjectId |  |  | null |  | CashShift |  |
| `remarks` | String |  |  | "" |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `admissionId:1` |  |
| `patientId:1` |  |
| `hospitalId:1` |  |
| `admissionId:1, createdAt:1` |  |

### `kpidefinitions` — KpiDefinition

source `KpiDefinition.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `key` | String | yes | yes |  |  |  |  |
| `name` | String | yes |  |  |  |  | Identity |
| `category` | String |  |  | "ops" |  |  |  |
| `unit` | String |  |  | "number" |  |  |  |
| `target` | Mixed |  |  | null |  |  |  |
| `roles` | Array<Mixed> |  |  |  |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `key:1` | unique |

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
| `accessionNo` | String |  |  | "" |  |  |  |
| `tests` | Array<subdocument> |  |  |  |  |  |  |
| `tests.testName` | String | yes |  |  |  |  |  |
| `tests.category` | String |  |  | "Blood" | Blood, Urine, Stool, Imaging, Cardiac, Other |  |  |
| `tests.priority` | String |  |  | "Routine" | Routine, Urgent, STAT |  |  |
| `tests.status` | String |  |  | "Ordered" | Ordered, Sample Needed, Sample Collected, Processing, Completed, Verified, Report Delivered, Rejected, Recollect |  |  |
| `tests.sampleId` | String |  |  |  |  |  |  |
| `tests.sampleType` | String |  |  |  |  |  |  |
| `tests.sampleCollectedAt` | Date |  |  |  |  |  |  |
| `tests.collectedBy` | String |  |  |  |  |  |  |
| `tests.resultValue` | String |  |  |  |  |  | Health |
| `tests.refLow` | Number |  |  | null |  |  |  |
| `tests.refHigh` | Number |  |  | null |  |  |  |
| `tests.criticalLow` | Number |  |  | null |  |  |  |
| `tests.criticalHigh` | Number |  |  | null |  |  |  |
| `tests.flag` | String |  |  | "" | , H, L, HH, LL |  |  |
| `tests.prevValue` | String |  |  | "" |  |  |  |
| `tests.deltaPct` | Number |  |  | null |  |  |  |
| `tests.deltaFlag` | Boolean |  |  | false |  |  |  |
| `tests.recollectReason` | String |  |  | "" |  |  |  |
| `tests.recollectCount` | Number |  |  | 0 |  |  |  |
| `tests.outsourced.lab` | String |  |  | "" |  |  |  |
| `tests.outsourced.sentAt` | Date |  |  | null |  |  |  |
| `tests.outsourced.receivedAt` | Date |  |  | null |  |  |  |
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
| `criticalCallbacks` | Array<subdocument> |  |  |  |  |  |  |
| `criticalCallbacks.testName` | String |  |  | "" |  |  |  |
| `criticalCallbacks.calledTo` | String |  |  | "" |  |  |  |
| `criticalCallbacks.calledBy` | ObjectId |  |  | null |  | User |  |
| `criticalCallbacks.at` | Date |  |  | [function] |  |  |  |
| `criticalCallbacks.notes` | String |  |  | "" |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `facilityId` | ObjectId |  |  |  |  | Facility |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
| `admissionId` | ObjectId |  |  | null |  | Admission |  |
| `prescriptionId` | ObjectId |  |  | null |  | Prescription |  |
| `appointmentId` | ObjectId |  |  | null |  | Appointment |  |
| `reviewedBy` | ObjectId |  |  | null |  | User |  |
| `reviewedAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `orderId:1` | unique |
| `accessionNo:1` |  |
| `hospitalId:1` |  |
| `facilityId:1` |  |
| `encounterId:1` |  |
| `admissionId:1` |  |
| `prescriptionId:1` |  |

### `labourrecords` — LabourRecord

source `LabourRecord.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `antenatalId` | ObjectId |  |  | null |  | AntenatalRecord |  |
| `admissionId` | ObjectId |  |  | null |  | Admission |  |
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `onsetAt` | Date |  |  | null |  |  |  |
| `partogram` | Array<subdocument> |  |  |  |  |  |  |
| `partogram.at` | Date |  |  |  |  |  |  |
| `partogram.dilationCm` | Number |  |  | null |  |  |  |
| `partogram.contractions` | String |  |  | "" |  |  |  |
| `partogram.fetalHeart` | String |  |  | "" |  |  |  |
| `deliveryAt` | Date |  |  | null |  |  |  |
| `deliveryType` | String |  |  | "" | , Normal, C-Section, Assisted |  |  |
| `babyWeightKg` | Number |  |  | 0 |  |  |  |
| `babySex` | String |  |  | "" | , Male, Female, Other |  |  |
| `notes` | String |  |  | "" |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `antenatalId:1` |  |
| `patientId:1` |  |
| `hospitalId:1` |  |

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

### `leads` — Lead

source `Lead.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Contact, Identifier, Identity, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `businessName` | String | yes |  |  |  |  |  |
| `typeKey` | String |  |  | "" |  |  |  |
| `subType` | String |  |  | "" |  |  |  |
| `city` | String |  |  | "" |  |  |  |
| `area` | String |  |  | "" |  |  |  |
| `pincode` | String |  |  | "" |  |  | Contact |
| `geo.type` | String |  |  | "Point" | Point |  |  |
| `geo.coordinates` | Array<Mixed> |  |  |  |  |  | Location |
| `contacts` | Array<subdocument> |  |  |  |  |  |  |
| `contacts.name` | String |  |  | "" |  |  | Identity |
| `contacts.role` | String |  |  | "" |  |  |  |
| `contacts.phoneEnc` | String |  |  | "" |  |  |  |
| `contacts.emailEnc` | String |  |  | "" |  |  |  |
| `source` | String |  |  | "field_visit" | field_visit, referral, association, inbound, event, ads, other |  |  |
| `ownerId` | ObjectId |  |  |  |  | User | Identifier |
| `territoryId` | ObjectId |  |  |  |  | Territory |  |
| `stage` | String |  |  | "identified" | identified, contacted, interested, demo_done, docs_collected, application_submitted, under_review, approved, activated, active, at_risk, churned |  |  |
| `stageEnteredAt` | Date |  |  | [function] |  |  |  |
| `score` | Number |  |  | 0 |  |  |  |
| `tags` | Array<Mixed> |  |  |  |  |  |  |
| `estMonthlyVolume` | Number |  |  | 0 |  |  |  |
| `lostReason` | String |  |  | "" |  |  |  |
| `nextAction.type` | String |  |  | "" |  |  |  |
| `nextAction.dueAt` | Date |  |  | null |  |  |  |
| `consent.whatsapp` | Boolean |  |  | false |  |  |  |
| `consent.sms` | Boolean |  |  | false |  |  |  |
| `consent.email` | Boolean |  |  | false |  |  | Contact |
| `linkedApplicationId` | ObjectId |  |  | null |  | ProviderApplication |  |
| `linkedProviderId` | ObjectId |  |  | null |  | Provider |  |
| `dedupeKey` | String |  |  | "" |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `businessName:1` |  |
| `typeKey:1` |  |
| `city:1` |  |
| `ownerId:1` |  |
| `territoryId:1` |  |
| `stage:1` |  |
| `dedupeKey:1` |  |
| `ownerId:1, stage:1` |  |
| `typeKey:1, city:1, stage:1` |  |
| `geo:2dsphere` |  |

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

### `ledgerentries` — LedgerEntry

source `LedgerEntry.js` · timestamps: yes · virtuals: 0 · retention: 8 years (statutory accounting) (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `date` | Date |  |  | [function] |  |  |  |
| `accountId` | String | yes |  |  |  |  |  |
| `debit` | Number |  |  | 0 |  |  |  |
| `credit` | Number |  |  | 0 |  |  |  |
| `refModel` | String |  |  | "" |  |  |  |
| `refId` | ObjectId |  |  | null |  |  |  |
| `narration` | String |  |  | "" |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `date:1` |  |
| `accountId:1` |  |
| `hospitalId:1, accountId:1, date:-1` |  |

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

### `loanadvances` — LoanAdvance

source `LoanAdvance.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `staffId` | ObjectId | yes |  |  |  | Staff |  |
| `kind` | String | yes |  |  | Loan, Advance |  |  |
| `principal` | Number | yes |  |  |  |  |  |
| `recovered` | Number |  |  | 0 |  |  |  |
| `emi` | Number |  |  | 0 |  |  |  |
| `status` | String |  |  | "Open" | Open, Closed |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `staffId:1` |  |
| `status:1` |  |
| `hospitalId:1, staffId:1, status:1` |  |

### `locations` — Location

source `Location.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `kind` | String | yes |  |  | campus, block, floor, wing, room |  |  |
| `name` | String | yes |  |  |  |  | Identity |
| `code` | String |  |  | "" |  |  |  |
| `parentId` | ObjectId |  |  | null |  | Location |  |
| `active` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `parentId:1` |  |
| `hospitalId:1, parentId:1` |  |

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

### `mappingprofiles` — MappingProfile

source `MappingProfile.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `integrationKey` | String | yes |  |  |  |  |  |
| `domain` | String | yes |  |  |  |  |  |
| `mappings` | Mixed |  |  | [function] |  |  |  |
| `updatedBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `hospitalId:1, integrationKey:1, domain:1` | unique |

### `mealsubscriptions` — MealSubscription

source `MealSubscription.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Health, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `providerId` | ObjectId | yes |  |  |  | Provider | Identifier |
| `planId` | ObjectId |  |  | null |  | Plan |  |
| `dietType` | String |  |  | "custom" | veg, non_veg, eggetarian, vegan, jain, custom |  |  |
| `allergies` | Array<Mixed> |  |  |  |  |  | Health |
| `notes` | String |  |  | "" |  |  |  |
| `weeklyMenu` | Array<subdocument> |  |  |  |  |  |  |
| `weeklyMenu.day` | String | yes |  |  | mon, tue, wed, thu, fri, sat, sun |  |  |
| `weeklyMenu.items` | Array<Mixed> |  |  |  |  |  |  |
| `weeklyMenu.skipped` | Boolean |  |  | false |  |  |  |
| `deliverySlot` | String |  |  | "" |  |  |  |
| `deliveryAddress` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "active" | active, paused, cancelled, completed |  |  |
| `startAt` | Date | yes |  |  |  |  |  |
| `endAt` | Date |  |  |  |  |  |  |
| `pause.from` | Date |  |  | null |  |  |  |
| `pause.to` | Date |  |  | null |  |  |  |
| `pause.reason` | String |  |  | "" |  |  |  |
| `pause.pausedDays` | Number |  |  | 0 |  |  |  |
| `skippedDates` | Array<Mixed> |  |  |  |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `providerId:1` |  |
| `status:1` |  |
| `endAt:1` |  |
| `userId:1, status:1` |  |

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
| `form` | String | yes |  |  | Tablet, Capsule, Syrup, Injection, Drop, Cream, Inhaler, Infusion, Other, Ointment, Gel, Lotion, Powder, Sachet, Suppository, Patch, Spray, Lozenge, Eye Drop, Ear Drop, Nasal Drop, Kit |  |  |
| `therapeuticClass` | String |  |  |  | Antibiotic, Antiviral, Antifungal, Antiparasitic, Antimalarial, Anti-TB, Analgesic, NSAID, Muscle Relaxant, Anesthetic, Opioid, Antihypertensive, Diuretic, Statin, Antiplatelet, Anticoagulant, Antiarrhythmic, Nitrate, Antidiabetic, Insulin, Thyroid, Corticosteroid, Sex Hormone, A… (739 chars) |  |  |
| `rxSchedule` | String |  |  |  | otc, rx, schedule_h, h1, x, schedule_g, narcotic_ndps, ayurvedic, OTC, H, H1, X, G, NDPS, NON_SCHEDULED_RX, AYUSH |  |  |
| `productLine` | String |  |  |  | Prescription, OTC, Generic, Branded, Ayurvedic, Homeopathic, Unani/Siddha, Supplements, Baby Care, Personal Care, Sexual Wellness, Women's Hygiene, Elder Care, Diabetic Care, Surgical/Ortho, Medical Devices, First Aid, Hygiene, Health Foods, Other |  |  |
| `storage.coldChain` | Boolean |  |  | false |  |  |  |
| `storage.coldChainTemp` | String |  |  | "" |  |  |  |
| `storage.controlled` | Boolean |  |  | false |  |  |  |
| `storage.ageRestricted` | Boolean |  |  | false |  |  |  |
| `storage.pregnancyUnsafe` | Boolean |  |  | false |  |  |  |
| `storage.lasaWarning` | Boolean |  |  | false |  |  |  |
| `composition` | String |  |  | "" |  |  |  |
| `strength` | String |  |  | "" |  |  |  |
| `packSize` | String |  |  | "" |  |  |  |
| `mrp` | Number |  |  |  |  |  |  |
| `gstRate` | Number |  |  |  |  |  |  |
| `hsn` | String |  |  | "" |  |  |  |
| `habitForming` | Boolean |  |  |  |  |  |  |
| `atcCode` | String |  |  | "" |  |  |  |
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

### `memberships` — Membership

source `Membership.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Financial, Identifier, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `planId` | ObjectId | yes |  |  |  | Plan |  |
| `providerId` | ObjectId | yes |  |  |  | Provider | Identifier |
| `status` | String |  |  | "TRIAL" | TRIAL, ACTIVE, FROZEN, PAST_DUE, GRACE, CANCELLED, EXPIRED, RENEWED |  |  |
| `startAt` | Date | yes |  |  |  |  |  |
| `endAt` | Date |  |  |  |  |  |  |
| `creditsLeft` | Number |  |  | null |  |  |  |
| `mandateRef` | String |  |  | "" |  |  |  |
| `autoRenew` | Boolean |  |  | false |  |  |  |
| `freeze.frozenAt` | Date |  |  | null |  |  |  |
| `freeze.resumeAt` | Date |  |  | null |  |  |  |
| `freeze.daysUsed` | Number |  |  | 0 |  |  |  |
| `freeze.windows` | Array<subdocument> |  |  |  |  |  |  |
| `freeze.windows.from` | Date | yes |  |  |  |  |  |
| `freeze.windows.to` | Date | yes |  |  |  |  |  |
| `freeze.windows.days` | Number | yes |  |  |  |  |  |
| `freeze.windows.reason` | String |  |  | "" |  |  |  |
| `checkIns` | Array<subdocument> |  |  |  |  |  |  |
| `checkIns.at` | Date |  |  | [function] |  |  |  |
| `checkIns.method` | String |  |  | "qr" | qr, app, manual |  |  |
| `checkIns.location` | String |  |  | "" |  |  | Location |
| `pricePaid` | Number |  |  | 0 |  |  |  |
| `currency` | String |  |  | "INR" |  |  |  |
| `paymentId` | ObjectId |  |  | null |  | Payment | Financial |
| `pastDueSince` | Date |  |  | null |  |  |  |
| `graceUntil` | Date |  |  | null |  |  |  |
| `cancelledAt` | Date |  |  | null |  |  |  |
| `cancellationReason` | String |  |  | "" |  |  |  |
| `history` | Array<subdocument> |  |  |  |  |  |  |
| `history.from` | String | yes |  |  | TRIAL, ACTIVE, FROZEN, PAST_DUE, GRACE, CANCELLED, EXPIRED, RENEWED |  |  |
| `history.to` | String | yes |  |  | TRIAL, ACTIVE, FROZEN, PAST_DUE, GRACE, CANCELLED, EXPIRED, RENEWED |  |  |
| `history.by` | ObjectId |  |  | null |  | User |  |
| `history.at` | Date |  |  | [function] |  |  |  |
| `history.note` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `planId:1` |  |
| `providerId:1` |  |
| `status:1` |  |
| `endAt:1` |  |
| `userId:1, status:1` |  |
| `providerId:1, status:1` |  |
| `status:1, endAt:1` |  |
| `paymentId:1` | unique, partial |

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

### `mlccases` — MlcCase

source `MlcCase.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `mlcNo` | String | yes |  |  |  |  |  |
| `policeStation` | String |  |  | "" |  |  |  |
| `intimationAt` | Date |  |  | null |  |  |  |
| `injuryType` | String |  |  | "" |  |  |  |
| `history` | String |  |  | "" |  |  |  |
| `opinion` | String |  |  | "" |  |  |  |
| `sealedExhibits` | Array<Mixed> |  |  |  |  |  |  |
| `status` | String |  |  | "Open" | Open, Reported, Closed |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `mlcNo:1` |  |
| `status:1` |  |
| `hospitalId:1, mlcNo:1` | unique, sparse |

### `moderationitems` — ModerationItem

source `ModerationItem.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `targetType` | String | yes |  |  | review, provider_profile, product_listing, event, article, chat_report |  |  |
| `targetId` | String | yes |  |  |  |  |  |
| `category` | String | yes |  |  | abuse, pii, medical_claim, misleading, crisis, spam, verified_booking, defamation, copyright, other |  |  |
| `reason` | String |  |  | "" |  |  |  |
| `severity` | String |  |  | "medium" | low, medium, high, critical |  |  |
| `status` | String |  |  | "open" | open, in_review, actioned, dismissed, appealed |  |  |
| `source` | String |  |  | "auto_filter" | auto_filter, user_report, provider_report, ops |  |  |
| `reporterId` | ObjectId |  |  | null |  | User | Identifier |
| `subjectUserId` | ObjectId |  |  | null |  | User |  |
| `subjectProviderId` | ObjectId |  |  | null |  | Provider |  |
| `assignee` | ObjectId |  |  | null |  | User |  |
| `pendingAction.action` | String |  |  | null |  |  |  |
| `pendingAction.by` | ObjectId |  |  | null |  |  |  |
| `pendingAction.at` | Date |  |  | null |  |  |  |
| `pendingAction.note` | String |  |  | "" |  |  |  |
| `actions` | Array<subdocument> |  |  |  |  |  |  |
| `actions.action` | String | yes |  |  | hide, restore, shadow_hide, remove, warn_user, escalate, strike |  |  |
| `actions.by` | ObjectId | yes |  |  |  | User |  |
| `actions.at` | Date |  |  | [function] |  |  |  |
| `actions.note` | String |  |  | "" |  |  |  |
| `actions.secondReviewer` | Boolean |  |  | false |  |  |  |
| `notes` | Array<subdocument> |  |  |  |  |  |  |
| `notes.note` | String | yes |  |  |  |  |  |
| `notes.by` | ObjectId | yes |  |  |  | User |  |
| `notes.at` | Date |  |  | [function] |  |  |  |
| `escalated` | Boolean |  |  | false |  |  |  |
| `strikeIssued` | Boolean |  |  | false |  |  |  |
| `targetSnapshot` | Mixed |  |  | null |  |  |  |
| `appeal.appealedBy` | ObjectId |  |  | null |  | User |  |
| `appeal.appealedAt` | Date |  |  | null |  |  |  |
| `appeal.note` | String |  |  | "" |  |  |  |
| `appeal.resolvedBy` | ObjectId |  |  | null |  | User |  |
| `appeal.resolvedAt` | Date |  |  | null |  |  |  |
| `appeal.outcome` | String |  |  | null | upheld, overturned, null |  |  |
| `appeal.resolutionNote` | String |  |  | "" |  |  |  |
| `policyVersion` | String |  |  | "2026.10-8md5" |  |  |  |
| `slaDueAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `targetType:1` |  |
| `category:1` |  |
| `severity:1` |  |
| `status:1` |  |
| `reporterId:1` |  |
| `subjectUserId:1` |  |
| `assignee:1` |  |
| `slaDueAt:1` |  |
| `status:1, slaDueAt:1` |  |
| `status:1, createdAt:-1` |  |
| `targetType:1, status:1, severity:1` |  |
| `targetId:1, targetType:1` |  |
| `assignee:1, status:1` |  |

### `mtpregisters` — MtpRegister

source `MtpRegister.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `patientId` | ObjectId |  |  | null |  | User | Identifier |
| `patientName` | String | yes |  |  |  |  | Identity |
| `gestationalAgeWeeks` | Number | yes |  |  |  |  |  |
| `indication` | String |  |  | "other" | A, B, C, failure-contraception, other |  |  |
| `doctorOpinion` | String |  |  | "" |  |  |  |
| `consentTaken` | Boolean |  |  | false |  |  |  |
| `procedureDate` | Date |  |  | null |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `nabhassessments` — NabhAssessment

source `NabhAssessment.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `chapter` | String | yes |  |  |  |  |  |
| `scores` | Mixed |  |  | [function] |  |  |  |
| `autoValues` | Mixed |  |  | [function] |  |  |  |
| `scorePct` | Number |  |  | null |  |  |  |
| `assessor` | ObjectId |  |  | null |  | User |  |
| `assessedAt` | Date |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `chapter:1` |  |
| `hospitalId:1, chapter:1` |  |

### `nabhchapters` — NabhChapter

source `NabhChapter.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `code` | String | yes | yes |  |  |  |  |
| `title` | String | yes |  |  |  |  |  |
| `objectives` | Array<subdocument> |  |  |  |  |  |  |
| `objectives.code` | String |  |  | "" |  |  |  |
| `objectives.label` | String |  |  | "" |  |  |  |
| `objectives.autoKpi` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `code:1` | unique |

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
| `discreetMode` | Boolean |  |  | false |  |  |  |
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
| `type` | String |  |  | "system" | reminder, payment, appointment, records, system, ride, assistant, lawyer, lab, sos, billing, emergency, prescription, radiology, token, recall |  |  |
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

### `notificationtemplates` — NotificationTemplate

source `NotificationTemplate.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `code` | String | yes |  |  |  |  |  |
| `channel` | String | yes |  |  | email, sms, push, inapp, whatsapp |  |  |
| `locale` | String |  |  | "en" |  |  |  |
| `subject` | String |  |  | "" |  |  |  |
| `body` | String | yes |  |  |  |  |  |
| `discreetVariant` | String |  |  | "" |  |  |  |
| `variables` | Array<Mixed> |  |  |  |  |  |  |
| `version` | Number |  |  | 1 |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `channel:1` |  |
| `isActive:1` |  |
| `code:1, locale:1` | unique |

### `notifytemplates` — NotifyTemplate

source `NotifyTemplate.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `key` | String | yes |  |  |  |  |  |
| `name` | String | yes |  |  |  |  | Identity |
| `channel` | String | yes |  |  | sms, whatsapp, email, push, inapp |  |  |
| `variables` | Array<Mixed> |  |  |  |  |  |  |
| `body` | String | yes |  |  |  |  |  |
| `subject` | String |  |  | "" |  |  |  |
| `dltTemplateId` | String |  |  | "" |  |  |  |
| `dltEntityId` | String |  |  | "" |  |  |  |
| `active` | Boolean |  |  | true |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `channel:1` |  |
| `hospitalId:1, key:1, channel:1` | unique |

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

### `objectives` — Objective

source `Objective.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `level` | String | yes |  |  | company, city, team, person |  |  |
| `ownerId` | ObjectId |  |  |  |  | User | Identifier |
| `city` | String |  |  | "" |  |  |  |
| `period` | String | yes |  |  |  |  |  |
| `title` | String | yes |  |  |  |  |  |
| `keyResults` | Array<subdocument> |  |  |  |  |  |  |
| `keyResults.title` | String | yes |  |  |  |  |  |
| `keyResults.target` | Number | yes |  |  |  |  |  |
| `keyResults.current` | Number |  |  | 0 |  |  |  |
| `keyResults.metric` | String |  |  | "" |  |  |  |
| `keyResults.confidence` | String |  |  | "on_track" | on_track, at_risk, off_track |  |  |
| `status` | String |  |  | "active" | active, closed |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `level:1` |  |
| `ownerId:1` |  |
| `level:1, period:1` |  |

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
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
| `admissionId` | ObjectId |  |  | null |  | Admission |  |
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
| `pac.asaGrade` | String |  |  | "" | , I, II, III, IV, V, VI |  |  |
| `pac.npoConfirmed` | Boolean |  |  | false |  |  |  |
| `pac.fitness` | String |  |  | "" | , Fit, Unfit, HighRisk |  |  |
| `pac.notes` | String |  |  | "" |  |  |  |
| `pac.by` | ObjectId |  |  | null |  | User |  |
| `pac.at` | Date |  |  | null |  |  |  |
| `whoChecklist.signIn` | Boolean |  |  | false |  |  |  |
| `whoChecklist.timeOut` | Boolean |  |  | false |  |  |  |
| `whoChecklist.signOut` | Boolean |  |  | false |  |  |  |
| `whoChecklist.by` | ObjectId |  |  | null |  | User |  |
| `whoChecklist.at` | Date |  |  | null |  |  |  |
| `anaesthesiaRecord` | String |  |  | "" |  |  |  |
| `implants` | Array<subdocument> |  |  |  |  |  |  |
| `implants.name` | String |  |  |  |  |  | Identity |
| `implants.serial` | String |  |  | "" |  |  |  |
| `implants.price` | Number |  |  | 0 |  |  |  |
| `consumables` | Array<subdocument> |  |  |  |  |  |  |
| `consumables.name` | String |  |  |  |  |  | Identity |
| `consumables.qty` | Number |  |  | 1 |  |  |  |
| `consumables.price` | Number |  |  | 0 |  |  |  |
| `teamFees.surgeon` | Number |  |  | 0 |  |  |  |
| `teamFees.assistant` | Number |  |  | 0 |  |  |  |
| `teamFees.anaesthetist` | Number |  |  | 0 |  |  |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `otId:1` | unique |
| `encounterId:1` |  |
| `admissionId:1` |  |
| `hospitalId:1` |  |

### `opticaljobcards` — OpticalJobCard

source `OpticalJobCard.js` · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `providerId` | ObjectId | yes |  |  |  | Provider | Identifier |
| `recordedBy` | ObjectId | yes |  |  |  | User |  |
| `frames` | String |  |  | "" |  |  |  |
| `lensOd.sph` | Number |  |  |  |  |  |  |
| `lensOd.cyl` | Number |  |  |  |  |  |  |
| `lensOd.axis` | Number |  |  |  |  |  |  |
| `lensOs.sph` | Number |  |  |  |  |  |  |
| `lensOs.cyl` | Number |  |  |  |  |  |  |
| `lensOs.axis` | Number |  |  |  |  |  |  |
| `lensMaterial` | String |  |  | "" |  |  |  |
| `coating` | String |  |  | "" |  |  |  |
| `priceAmount` | Number |  |  | 0 |  |  |  |
| `status` | String |  |  | "booked" | booked, in_lab, ready, delivered, cancelled |  |  |
| `bookedAt` | Date |  |  | [function] |  |  |  |
| `inLabAt` | Date |  |  | null |  |  |  |
| `readyAt` | Date |  |  | null |  |  |  |
| `deliveredAt` | Date |  |  | null |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `patientId:1` |  |
| `providerId:1` |  |
| `status:1` |  |
| `patientId:1, createdAt:-1` |  |

### `orders` — Order

source `Order.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `encounterId` | ObjectId |  |  |  |  | Encounter |  |
| `admissionId` | ObjectId |  |  | null |  | Admission |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `orderedBy` | ObjectId | yes |  |  |  | User |  |
| `kind` | String | yes |  |  | lab, radiology, medication, diet, nursing, procedure, consult |  |  |
| `items` | Array<subdocument> |  |  |  |  |  |  |
| `items.description` | String |  |  |  |  |  |  |
| `items.qty` | Number |  |  | 1 |  |  |  |
| `priority` | String |  |  | "Routine" | Routine, Urgent, STAT |  |  |
| `status` | String |  |  | "Ordered" | Ordered, Ack, InProgress, Resulted, Reviewed, Cancelled |  |  |
| `prescriptionId` | ObjectId |  |  | null |  | Prescription |  |
| `linkedDocs.labOrderId` | ObjectId |  |  | null |  | LabOrder |  |
| `linkedDocs.pharmacyOrderId` | ObjectId |  |  | null |  | PharmacyOrder |  |
| `linkedDocs.radiologyId` | ObjectId |  |  | null |  | Radiology |  |
| `reviewedBy` | ObjectId |  |  | null |  | User |  |
| `reviewedAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `encounterId:1` |  |
| `admissionId:1` |  |
| `patientId:1` |  |
| `hospitalId:1` |  |
| `kind:1` |  |
| `status:1` |  |
| `hospitalId:1, status:1` |  |

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

### `outboundcampaigns` — OutboundCampaign

source `OutboundCampaign.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `name` | String | yes |  |  |  |  | Identity |
| `channel` | String |  |  | "sms" | sms, whatsapp, call |  |  |
| `template` | String |  |  | "" |  |  |  |
| `audience` | Mixed |  |  | [function] |  |  |  |
| `consentChecked` | Boolean |  |  | false |  |  |  |
| `status` | String |  |  | "draft" | draft, running, paused, done |  |  |
| `stats.queued` | Number |  |  | 0 |  |  |  |
| `stats.sent` | Number |  |  | 0 |  |  |  |
| `stats.failed` | Number |  |  | 0 |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `status:1` |  |

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

### `partners` — Partner

source `Partner.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `orgName` | String | yes |  |  |  |  |  |
| `type` | String |  |  | "other" | rwa, corporate, ngo, association, school, insurer, govt, hospital_group, media, other |  |  |
| `city` | String |  |  | "" |  |  |  |
| `area` | String |  |  | "" |  |  |  |
| `size` | Number |  |  | 0 |  |  |  |
| `contacts` | Array<subdocument> |  |  |  |  |  |  |
| `contacts.name` | String |  |  | "" |  |  | Identity |
| `contacts.role` | String |  |  | "" |  |  |  |
| `contacts.phoneEnc` | String |  |  | "" |  |  |  |
| `contacts.emailEnc` | String |  |  | "" |  |  |  |
| `stage` | String |  |  | "identified" | identified, intro_done, proposal_sent, negotiation, agreement_signed, pilot, active, renewal, lost |  |  |
| `ownerId` | ObjectId |  |  |  |  | User | Identifier |
| `offer` | String |  |  | "" |  |  |  |
| `mouStatus` | String |  |  | "" | , draft, signed, expired |  |  |
| `mouDocRef` | String |  |  | "" |  |  |  |
| `outcomes.eventsHeld` | Number |  |  | 0 |  |  |  |
| `outcomes.registrations` | Number |  |  | 0 |  |  |  |
| `outcomes.conversions` | Number |  |  | 0 |  |  |  |
| `nextStep` | String |  |  | "" |  |  |  |
| `nextStepDueAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `orgName:1` |  |
| `type:1` |  |
| `city:1` |  |
| `stage:1` |  |
| `ownerId:1` |  |
| `ownerId:1, stage:1` |  |

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

### `patientflags` — PatientFlag

source `PatientFlag.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `patient` | ObjectId | yes |  |  |  | Patient |  |
| `kind` | String | yes |  |  | allergy, vip, fall-risk, isolation, difficult-vein, blacklisted, deceased, mlc, other |  |  |
| `severity` | String |  |  | "warning" | info, warning, critical |  |  |
| `note` | String |  |  | "" |  |  |  |
| `active` | Boolean |  |  | true |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `patient:1` |  |
| `hospitalId:1, patient:1, active:1` |  |

### `patientmovements` — PatientMovement

source `PatientMovement.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
| `admissionId` | ObjectId |  |  | null |  | Admission |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `from` | String |  |  | "" |  |  |  |
| `to` | String | yes |  |  |  |  |  |
| `reason` | String |  |  | "" |  |  |  |
| `transportMode` | String |  |  | "wheelchair" | walk, wheelchair, stretcher, bed, ambulance |  |  |
| `escort` | String |  |  | "porter" | porter, nurse, doctor, none |  |  |
| `handover.ivLines` | Boolean |  |  | false |  |  |  |
| `handover.oxygen` | Boolean |  |  | false |  |  |  |
| `handover.monitor` | Boolean |  |  | false |  |  |  |
| `handover.consent` | Boolean |  |  | false |  |  |  |
| `handover.idBand` | Boolean |  |  | false |  |  |  |
| `status` | String |  |  | "Requested" | Requested, Assigned, PickedUp, Delivered, Returned, Cancelled |  |  |
| `requestedBy` | ObjectId |  |  |  |  | User |  |
| `timestamps.requestedAt` | Date |  |  | [function] |  |  |  |
| `timestamps.assignedAt` | Date |  |  | null |  |  |  |
| `timestamps.pickedAt` | Date |  |  | null |  |  |  |
| `timestamps.deliveredAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `encounterId:1` |  |
| `admissionId:1` |  |
| `patientId:1` |  |
| `status:1` |  |
| `hospitalId:1, status:1` |  |

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
| `mergedInto` | ObjectId |  |  | null |  | Patient |  |
| `mergedAt` | Date |  |  | null |  |  |  |
| `mergedBy` | ObjectId |  |  | null |  | User |  |
| `abhaAddress` | String |  |  | "" |  |  |  |
| `abhaStatus` | String |  |  | "" | , Unverified, Verified |  |  |
| `provisional` | Boolean |  |  | false |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `uhid:1` | unique, sparse |
| `hospitalId:1` |  |
| `mergedInto:1` |  |
| `provisional:1` |  |
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
| `gateway` | String |  |  | "mock" |  |  |  |
| `gatewayOrderId` | String |  |  | "" |  |  |  |
| `gatewayPaymentId` | String |  |  | "" |  |  |  |
| `gatewaySignature` | String |  |  | "" |  |  |  |
| `attempts` | Array<subdocument> |  |  |  |  |  |  |
| `attempts.at` | Date |  |  | [function] |  |  |  |
| `attempts.gateway` | String |  |  | "" |  |  |  |
| `attempts.event` | String |  |  | "" |  |  |  |
| `attempts.payload` | Mixed |  |  |  |  |  |  |
| `refundedAt` | Date |  |  | null |  |  |  |
| `settledAt` | Date |  |  | null |  |  |  |
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
| `gatewayOrderId:1` |  |
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

### `payoutstatements` — PayoutStatement

source `PayoutStatement.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `doctorId` | ObjectId | yes |  |  |  | Doctor | Identifier |
| `period` | String | yes |  |  |  |  |  |
| `gross` | Number | yes |  |  |  |  |  |
| `tdsRate` | Number |  |  | 10 |  |  |  |
| `tds` | Number |  |  | 0 |  |  |  |
| `otherDeductions` | Number |  |  | 0 |  |  |  |
| `net` | Number |  |  | 0 |  |  |  |
| `status` | String |  |  | "Draft" | Draft, Approved, Paid |  |  |
| `approvedBy` | ObjectId |  |  | null |  | User |  |
| `paidAt` | Date |  |  | null |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `doctorId:1` |  |
| `status:1` |  |
| `hospitalId:1, doctorId:1, period:1` | unique |

### `payslips` — Payslip

source `Payslip.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `staffId` | ObjectId | yes |  |  |  | Staff |  |
| `month` | String | yes |  |  |  |  |  |
| `earnings.basic` | Number |  |  | 0 |  |  |  |
| `earnings.hra` | Number |  |  | 0 |  |  |  |
| `earnings.allowances` | Number |  |  | 0 |  |  |  |
| `earnings.overtime` | Number |  |  | 0 |  |  |  |
| `deductions.pf` | Number |  |  | 0 |  |  |  |
| `deductions.esi` | Number |  |  | 0 |  |  |  |
| `deductions.pt` | Number |  |  | 0 |  |  |  |
| `deductions.tds` | Number |  |  | 0 |  |  |  |
| `deductions.advances` | Number |  |  | 0 |  |  |  |
| `gross` | Number |  |  | 0 |  |  |  |
| `totalDeductions` | Number |  |  | 0 |  |  |  |
| `net` | Number |  |  | 0 |  |  |  |
| `status` | String |  |  | "Draft" | Draft, Released, Paid |  |  |
| `releasedBy` | ObjectId |  |  | null |  | User |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `staffId:1` |  |
| `status:1` |  |
| `hospitalId:1, staffId:1, month:1` | unique |

### `pcpndtformfs` — PcpndtFormF

source `PcpndtFormF.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `patientId` | ObjectId |  |  | null |  | User | Identifier |
| `patientName` | String | yes |  |  |  |  | Identity |
| `husbandName` | String |  |  | "" |  |  |  |
| `doctorName` | String |  |  | "" |  |  | Identity |
| `indication` | String |  |  | "" |  |  |  |
| `gestationalAgeWeeks` | Number |  |  | null |  |  |  |
| `declarationSigned` | Boolean |  |  | false |  |  |  |
| `formDate` | Date |  |  | [function] |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

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
| `verifiedBy` | ObjectId |  |  | null |  | User |  |
| `h1Register` | String |  |  | "" |  |  |  |
| `substitution` | Array<subdocument> |  |  |  |  |  |  |
| `substitution.itemIndex` | Number |  |  | 0 |  |  |  |
| `substitution.originalName` | String | yes |  |  |  |  |  |
| `substitution.suggestedName` | String | yes |  |  |  |  |  |
| `substitution.reason` | String |  |  | "" |  |  |  |
| `substitution.consent` | String |  |  | "pending" | pending, accepted, declined |  |  |
| `substitution.consentAt` | Date |  |  | null |  |  |  |
| `substitution.substitutedBy` | ObjectId |  |  | null |  | User |  |
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
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
| `prescriptionId` | ObjectId |  |  | null |  | Prescription |  |
| `appointmentId` | ObjectId |  |  | null |  | Appointment |  |
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
| `encounterId:1` |  |
| `prescriptionId:1` |  |

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

### `plans` — Plan

source `Plan.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `providerId` | ObjectId | yes |  |  |  | Provider |  |
| `type` | String | yes |  |  | gym, yoga, program, class_pack, meal |  |  |
| `name` | String | yes |  |  |  |  |  |
| `duration.value` | Number | yes |  |  |  |  |  |
| `duration.unit` | String |  |  | "month" | day, week, month, year |  |  |
| `price` | Number | yes |  |  |  |  |  |
| `currency` | String |  |  | "INR" |  |  |  |
| `joiningFee` | Number |  |  | 0 |  |  |  |
| `sessionCredits` | Number |  |  | 0 |  |  |  |
| `inclusions` | Array<Mixed> |  |  |  |  |  |  |
| `freezeRules.maxFreezeDaysPerYear` | Number |  |  | 0 |  |  |  |
| `freezeRules.maxFreezesPerYear` | Number |  |  | 0 |  |  |  |
| `freezeRules.minNoticeDays` | Number |  |  | 0 |  |  |  |
| `autoRenew` | Boolean |  |  | false |  |  |  |
| `cancellationPolicy` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "draft" | draft, active, archived |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `providerId:1` |  |
| `status:1` |  |
| `providerId:1, type:1, status:1` |  |

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
| `status` | String |  |  | "published" | draft, in_review, published |  |  |
| `reviewedBy` | ObjectId |  |  | null |  | User |  |
| `reviewedAt` | Date |  |  | null |  |  |  |
| `reviewNote` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `key:1` | unique |
| `status:1` |  |
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

### `pmjaypackages` — PmjayPackage

source `PmjayPackage.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `code` | String | yes | yes |  |  |  |  |
| `name` | String | yes |  |  |  |  | Identity |
| `rate` | Number | yes |  |  |  |  |  |
| `active` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `code:1` | unique |

### `policyacceptances` — PolicyAcceptance

source `PolicyAcceptance.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Device/Network, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `providerId` | ObjectId |  |  | null |  | Provider | Identifier |
| `templateId` | String | yes |  |  |  |  |  |
| `templateVersion` | String | yes |  |  |  |  |  |
| `context` | String | yes |  |  | provider_agreement, privacy_policy, terms_of_service, teleconsult_consent, booking_cancellation |  |  |
| `acceptedAt` | Date |  |  | [function] |  |  |  |
| `ip` | String |  |  | "" |  |  | Device/Network |
| `userAgent` | String |  |  | "" |  |  | Device/Network |
| `documentHash` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `providerId:1` |  |
| `acceptedAt:1` |  |
| `userId:1, templateId:1, templateVersion:1` |  |

### `practitionerprofiles` — PractitionerProfile

source `PractitionerProfile.js` · timestamps: yes · virtuals: 0 · retention: Life of the provider relationship + 1 year (provider deletion flow) (docs/privacy/RETENTION.md) · PII: Demographic, Health, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes | yes |  |  | User | Identifier |
| `providerId` | ObjectId |  |  | null |  | Provider | Identifier |
| `roleType` | String | yes |  |  | doctor, dentist, physio, dietitian, nurse, counsellor, yoga_teacher, trainer, lawyer, ayush_practitioner, phlebotomist |  |  |
| `specialtyCode` | String |  |  | "" |  |  |  |
| `subSpecialtyCodes` | Array<Mixed> |  |  |  |  |  |  |
| `conditions` | Array<Mixed> |  |  |  |  |  | Health |
| `registration.council` | String |  |  | "" |  |  |  |
| `registration.numberEnc` | String |  |  | "" |  |  |  |
| `registration.verifiedAt` | Date |  |  | null |  |  |  |
| `qualifications` | Array<Mixed> |  |  |  |  |  |  |
| `experienceYears` | Number |  |  | 0 |  |  |  |
| `languages` | Array<Mixed> |  |  |  |  |  |  |
| `gender` | String |  |  | "" | Male, Female, Other, |  | Demographic |
| `modes` | Array<subdocument> |  |  |  |  |  |  |
| `modes.mode` | String | yes |  |  | in_person, video, audio, chat, home_visit |  |  |
| `modes.fee` | Number | yes |  |  |  |  |  |
| `modes.duration` | Number |  |  | 15 |  |  |  |
| `modes.followUp` | Number |  |  | 0 |  |  |  |
| `locations` | Array<subdocument> |  |  |  |  |  |  |
| `locations.providerId` | ObjectId |  |  |  |  | Provider | Identifier |
| `locations.schedule` | String |  |  | "" |  |  |  |
| `locations.fees` | Number |  |  | 0 |  |  |  |
| `bioI18n` | Map |  |  |  |  |  |  |
| `bioI18n.$*` | String |  |  |  |  |  |  |
| `badges` | Array<Mixed> |  |  |  |  |  |  |
| `status` | String |  |  | "draft" | draft, active, suspended, archived |  |  |
| `rating` | Number |  |  | 0 |  |  |  |
| `ratingCount` | Number |  |  | 0 |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` | unique |
| `providerId:1` |  |
| `roleType:1` |  |
| `status:1` |  |
| `roleType:1, status:1` |  |
| `specialtyCode:1, status:1` |  |

### `preauthrequests` — PreAuthRequest

source `PreAuthRequest.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Health, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `admissionId` | ObjectId | yes |  |  |  | Admission |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `insurerId` | ObjectId | yes |  |  |  | Insurer |  |
| `policyId` | String |  |  | "" |  |  |  |
| `estimate` | Number |  |  | 0 |  |  |  |
| `diagnosis` | String |  |  | "" |  |  | Health |
| `plannedProcedure` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "Draft" | Draft, Submitted, QueryRaised, Approved, PartiallyApproved, Rejected, Expired |  |  |
| `queries` | Array<subdocument> |  |  |  |  |  |  |
| `queries.by` | String |  |  | "" |  |  |  |
| `queries.text` | String |  |  |  |  |  |  |
| `queries.at` | Date |  |  | [function] |  |  |  |
| `queries.attachments` | Array<Mixed> |  |  |  |  |  |  |
| `approvedAmount` | Number |  |  | 0 |  |  |  |
| `validTill` | Date |  |  | null |  |  |  |
| `enhancements` | Array<subdocument> |  |  |  |  |  |  |
| `enhancements.amount` | Number |  |  |  |  |  |  |
| `enhancements.reason` | String |  |  |  |  |  |  |
| `enhancements.at` | Date |  |  | [function] |  |  |  |
| `enhancements.status` | String |  |  | "Pending" |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `admissionId:1` |  |
| `hospitalId:1` |  |
| `status:1` |  |
| `admissionId:1, status:1` |  |

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
| `doctorRmp` | String |  |  | "" |  |  |  |
| `teleConsult` | Boolean |  |  | false |  |  |  |
| `teleConsentId` | ObjectId |  |  | null |  | TeleConsent |  |
| `appointmentId` | ObjectId |  |  | null |  | Appointment |  |
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
| `diagnosisIcd` | String |  |  | "" |  |  |  |
| `followUpDate` | Date |  |  | null |  |  |  |
| `genericPreferred` | Boolean |  |  | false |  |  |  |
| `cdsOverride.reason` | String |  |  | "" |  |  |  |
| `cdsOverride.at` | Date |  |  | null |  |  |  |
| `cdsOverride.by` | ObjectId |  |  | null |  | User |  |
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
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `prescriptionId:1` | unique |
| `hospitalId:1` |  |
| `encounterId:1` |  |

### `printlogs` — PrintLog

source `PrintLog.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `docType` | String | yes |  |  |  |  |  |
| `entityRef` | String |  |  | "" |  |  |  |
| `templateVersion` | Number |  |  | 1 |  |  |  |
| `printedBy` | ObjectId |  |  |  |  | User |  |
| `printedAt` | Date |  |  | [function] |  |  |  |
| `copies` | Number |  |  | 1 |  |  |  |
| `isDuplicate` | Boolean |  |  | false |  |  |  |
| `channel` | String |  |  | "print" | print, pdf, whatsapp, email |  |  |
| `hash` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `docType:1` |  |
| `docType:1, entityRef:1` |  |

### `printtemplates` — PrintTemplate

source `PrintTemplate.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `branchId` | ObjectId |  |  | null |  | Facility |  |
| `docType` | String | yes |  |  |  |  |  |
| `name` | String | yes |  |  |  |  |  |
| `version` | Number |  |  | 1 |  |  |  |
| `status` | String |  |  | "Draft" | Draft, Approved, Deprecated |  |  |
| `pageSetup.size` | String |  |  | "A4" | A4, A5, thermal58, thermal80, label |  |  |
| `pageSetup.orientation` | String |  |  | "portrait" | portrait, landscape |  |  |
| `pageSetup.margins` | String |  |  | "12mm" |  |  |  |
| `html` | String |  |  | "" |  |  |  |
| `css` | String |  |  | "" |  |  |  |
| `languages` | Array<Mixed> |  |  |  |  |  |  |
| `isDefault` | Boolean |  |  | false |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `docType:1` |  |
| `status:1` |  |
| `hospitalId:1, docType:1, version:-1` |  |

### `products` — Product

source `Product.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `vendorId` | ObjectId | yes |  |  |  | Provider |  |
| `kind` | String | yes |  |  | medicine, supplement, food, skincare, device, optical, consumable |  |  |
| `categoryCodes` | Array<Mixed> |  |  |  |  |  |  |
| `brand` | String |  |  | "" |  |  |  |
| `name` | String | yes |  |  |  |  |  |
| `variants` | Array<subdocument> |  |  |  |  |  |  |
| `variants.sku` | String | yes |  |  |  |  |  |
| `variants.pack` | String | yes |  |  |  |  |  |
| `variants.mrp` | Number |  |  | 0 |  |  |  |
| `variants.price` | Number | yes |  |  |  |  |  |
| `variants.stock` | Number |  |  | 0 |  |  |  |
| `variants.batch` | String |  |  | "" |  |  |  |
| `variants.expiry` | Date |  |  | null |  |  |  |
| `composition` | String |  |  | "" |  |  |  |
| `rxSchedule` | String |  |  |  | otc, rx, schedule_h, h1, x, schedule_g, narcotic_ndps, ayurvedic, OTC, H, H1, X, G, NDPS, NON_SCHEDULED_RX, AYUSH |  |  |
| `fssaiNo` | String |  |  | "" |  |  |  |
| `cdscoNo` | String |  |  | "" |  |  |  |
| `hsn` | String |  |  | "" |  |  |  |
| `gstRate` | Number |  |  | 0 |  |  |  |
| `claims` | Array<Mixed> |  |  |  |  |  |  |
| `images` | Array<Mixed> |  |  |  |  |  |  |
| `storage` | String |  |  | "ambient" | ambient, cold_chain |  |  |
| `warrantyMonths` | Number |  |  | 0 |  |  |  |
| `rentable.perDay` | Number |  |  | 0 |  |  |  |
| `rentable.deposit` | Number |  |  | 0 |  |  |  |
| `rentable.available` | Boolean |  |  | false |  |  |  |
| `status` | String |  |  | "draft" | draft, active, archived |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `vendorId:1` |  |
| `kind:1` |  |
| `status:1` |  |
| `vendorId:1, status:1` |  |
| `kind:1, status:1` |  |
| `vendorId:1, variants.sku:1` | unique, sparse |

### `providerapplications` — ProviderApplication

source `ProviderApplication.js` · timestamps: yes · virtuals: 0 · retention: Life of the provider relationship + 1 year (provider deletion flow) (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `applicationId` | String |  | yes |  |  |  |  |
| `applicantUserId` | ObjectId | yes |  |  |  | User |  |
| `providerId` | ObjectId |  |  | null |  | Provider | Identifier |
| `typeKey` | String | yes |  |  |  |  |  |
| `configVersion` | Number |  |  | 1 |  |  |  |
| `kind` | String |  |  | "" |  |  |  |
| `group` | String |  |  | "" |  |  |  |
| `tier` | String |  |  | "" |  |  |  |
| `twoPersonApproval` | Boolean |  |  | false |  |  |  |
| `draft.stepData` | Mixed |  |  | [function] |  |  |  |
| `status` | String |  |  | "draft" | draft, submitted, under_review, needs_info, resubmitted, approved, rejected, expired |  |  |
| `submittedAt` | Date |  |  | null |  |  |  |
| `decidedAt` | Date |  |  | null |  |  |  |
| `resubmissionCount` | Number |  |  | 0 |  |  |  |
| `escalated` | Boolean |  |  | false |  |  |  |
| `rejectionReason` | String |  |  | "" |  |  |  |
| `reviewerAssignments` | Array<subdocument> |  |  |  |  |  |  |
| `reviewerAssignments.reviewerId` | ObjectId |  |  |  |  | User |  |
| `reviewerAssignments.assignedBy` | ObjectId |  |  |  |  | User |  |
| `reviewerAssignments.assignedAt` | Date |  |  | [function] |  |  |  |
| `reviewerAssignments.queue` | String |  |  | "default" |  |  |  |
| `checklistResults` | Array<subdocument> |  |  |  |  |  |  |
| `checklistResults.key` | String | yes |  |  |  |  |  |
| `checklistResults.status` | String | yes |  |  | pass, fail, pending |  |  |
| `checklistResults.note` | String |  |  | "" |  |  |  |
| `checklistResults.by` | ObjectId |  |  |  |  | User |  |
| `checklistResults.at` | Date |  |  | [function] |  |  |  |
| `decisions` | Array<subdocument> |  |  |  |  |  |  |
| `decisions.by` | ObjectId | yes |  |  |  | User |  |
| `decisions.at` | Date |  |  | [function] |  |  |  |
| `decisions.decision` | String | yes |  |  | approve, reject, needs_info, escalate |  |  |
| `decisions.reason` | String |  |  | "" |  |  |  |
| `needsInfo` | Array<subdocument> |  |  |  |  |  |  |
| `needsInfo.docKey` | String | yes |  |  |  |  |  |
| `needsInfo.comment` | String | yes |  |  |  |  |  |
| `needsInfo.by` | ObjectId |  |  |  |  | User |  |
| `needsInfo.at` | Date |  |  | [function] |  |  |  |
| `needsInfo.resolvedAt` | Date |  |  | null |  |  |  |
| `approvalState.firstApprovedBy` | ObjectId |  |  | null |  | User |  |
| `approvalState.firstApprovedAt` | Date |  |  | null |  |  |  |
| `appealOf` | ObjectId |  |  | null |  | ProviderApplication |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `applicationId:1` | unique, sparse |
| `applicantUserId:1` |  |
| `providerId:1` |  |
| `typeKey:1` |  |
| `status:1` |  |
| `appealOf:1` |  |
| `applicantUserId:1, status:1` |  |
| `status:1, group:1, submittedAt:1` |  |
| `typeKey:1, status:1` |  |
| `twoPersonApproval:1, status:1` |  |

### `providerdocuments` — ProviderDocument

source `ProviderDocument.js` · timestamps: yes · virtuals: 0 · retention: Life of the provider relationship + 1 year (provider deletion flow) (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `applicationId` | ObjectId |  |  | null |  | ProviderApplication |  |
| `providerId` | ObjectId |  |  | null |  | Provider | Identifier |
| `practitionerId` | ObjectId |  |  | null |  | Doctor |  |
| `docType` | String | yes |  |  |  |  |  |
| `fileRef.url` | String |  |  | "" |  |  |  |
| `fileRef.key` | String |  |  | "" |  |  |  |
| `fileRef.storage` | String |  |  | "local" | local, remote |  |  |
| `fileRef.originalName` | String |  |  | "" |  |  |  |
| `fileRef.mimetype` | String |  |  | "" |  |  |  |
| `fileRef.sizeBytes` | Number |  |  | 0 |  |  |  |
| `hash` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "uploaded" | uploaded, under_review, verified, rejected, expired |  |  |
| `expiryDate` | Date |  |  | null |  |  |  |
| `verifiedBy` | ObjectId |  |  | null |  | User |  |
| `verifiedAt` | Date |  |  | null |  |  |  |
| `rejectionReason` | String |  |  | "" |  |  |  |
| `version` | Number |  |  | 1 |  |  |  |
| `scanResult.clean` | Boolean |  |  | null |  |  |  |
| `scanResult.skipped` | Boolean |  |  | false |  |  |  |
| `scanResult.blocked` | Boolean |  |  | false |  |  |  |
| `scanResult.engine` | String |  |  | "" |  |  |  |
| `scanResult.scannedAt` | Date |  |  | null |  |  |  |
| `expiryReminders` | Mixed |  |  | [function] |  |  |  |
| `lastReminderAt` | Date |  |  | null |  |  |  |
| `uploadedBy` | ObjectId |  |  | null |  | User |  |
| `uploadedAt` | Date |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `applicationId:1` |  |
| `providerId:1` |  |
| `docType:1` |  |
| `status:1` |  |
| `applicationId:1, docType:1` | unique, partial |
| `providerId:1, docType:1` |  |
| `status:1, expiryDate:1` |  |

### `providers` — Provider

source `Provider.js` · timestamps: yes · virtuals: 0 · retention: Life of the provider relationship + 1 year (provider deletion flow) (docs/privacy/RETENTION.md) · PII: Contact, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `providerId` | String |  | yes |  |  |  | Identifier |
| `ownerUserId` | ObjectId |  |  |  |  | User |  |
| `kind` | String | yes |  |  | facility, practitioner, vendor, organizer |  |  |
| `type` | String | yes |  |  |  |  |  |
| `group` | String | yes |  |  | clinical, wellness, commerce, home_service, transport, community, professional |  |  |
| `tier` | String |  |  | "T3" | T1, T2, T3 |  |  |
| `name` | String | yes |  |  |  |  | Identity |
| `slug` | String |  | yes |  |  |  |  |
| `tagline` | String |  |  | "" |  |  |  |
| `description` | String |  |  | "" |  |  |  |
| `media` | Array<subdocument> |  |  |  |  |  |  |
| `media.url` | String |  |  |  |  |  |  |
| `media.type` | String |  |  | "image" | image, video, document |  |  |
| `media.alt` | String |  |  | "" |  |  |  |
| `categoryCodes` | Array<Mixed> |  |  |  |  |  |  |
| `systemOfMedicine` | String |  |  | "" |  |  |  |
| `ownership` | String |  |  | "" |  |  |  |
| `accreditations` | Array<Mixed> |  |  |  |  |  |  |
| `schemesAccepted` | Array<Mixed> |  |  |  |  |  |  |
| `address.line1` | String |  |  | "" |  |  | Contact |
| `address.area` | String |  |  | "" |  |  | Contact |
| `address.city` | String |  |  | "" |  |  | Contact |
| `address.state` | String |  |  | "" |  |  | Contact |
| `address.pincode` | String |  |  | "" |  |  | Contact |
| `address.geo.type` | String |  |  | "Point" | Point |  | Contact |
| `address.geo.coordinates` | Array<Mixed> |  |  |  |  |  | Contact |
| `serviceArea.radiusKm` | Number |  |  | 0 |  |  |  |
| `serviceArea.pincodes` | Array<Mixed> |  |  |  |  |  |  |
| `timings.weekly` | Array<subdocument> |  |  |  |  |  |  |
| `timings.weekly.day` | String |  |  |  | mon, tue, wed, thu, fri, sat, sun |  |  |
| `timings.weekly.open` | String |  |  | "" |  |  |  |
| `timings.weekly.close` | String |  |  | "" |  |  |  |
| `timings.weekly.closed` | Boolean |  |  | false |  |  |  |
| `timings.exceptions` | Array<subdocument> |  |  |  |  |  |  |
| `timings.exceptions.date` | String |  |  |  |  |  |  |
| `timings.exceptions.closed` | Boolean |  |  | false |  |  |  |
| `timings.exceptions.open` | String |  |  | "" |  |  |  |
| `timings.exceptions.close` | String |  |  | "" |  |  |  |
| `timings.is24x7` | Boolean |  |  | false |  |  |  |
| `languages` | Array<Mixed> |  |  |  |  |  |  |
| `amenities` | Array<Mixed> |  |  |  |  |  |  |
| `contact.publicPhone` | String |  |  | "" |  |  |  |
| `contact.relayPhone` | String |  |  | "" |  |  |  |
| `contact.email` | String |  |  | "" |  |  | Contact |
| `verification.status` | String |  |  | "unverified" | unverified, in_review, verified, rejected, expired |  |  |
| `verification.level` | Number |  |  | 0 |  |  |  |
| `verification.verifiedAt` | Date |  |  | null |  |  |  |
| `verification.verifiedBy` | ObjectId |  |  | null |  | User |  |
| `verification.scope` | Array<Mixed> |  |  |  |  |  |  |
| `verification.nextReviewAt` | Date |  |  | null |  |  |  |
| `verification.riskScore` | Number |  |  | 0 |  |  |  |
| `status` | String |  |  | "draft" | draft, submitted, under_review, needs_info, approved, live, suspended, expired, rejected, archived |  |  |
| `probation.active` | Boolean |  |  | false |  |  |  |
| `probation.bookingCap` | Number |  |  | 0 |  |  |  |
| `probation.payoutHold` | Boolean |  |  | false |  |  |  |
| `trusted` | Boolean |  |  | false |  |  |  |
| `plan` | String |  |  | "free" | free, basic, premium |  |  |
| `commissionConfigId` | ObjectId |  |  | null |  | CommissionConfig |  |
| `stats.ratingAvg` | Number |  |  | 0 |  |  |  |
| `stats.ratingCount` | Number |  |  | 0 |  |  |  |
| `stats.responseTimeMin` | Number |  |  | 0 |  |  |  |
| `stats.completionRate` | Number |  |  | 0 |  |  |  |
| `parentProviderId` | ObjectId |  |  | null |  | Provider |  |
| `branches` | Array<Mixed> |  |  |  |  |  |  |
| `claimedBy` | ObjectId |  |  | null |  | User |  |
| `importedFrom` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `providerId:1` | unique, sparse |
| `ownerUserId:1` |  |
| `kind:1` |  |
| `type:1` |  |
| `group:1` |  |
| `name:1` |  |
| `slug:1` | unique, sparse |
| `address.city:1` |  |
| `verification.status:1` |  |
| `status:1` |  |
| `parentProviderId:1` |  |
| `address.geo:2dsphere` |  |
| `type:1, status:1, address.city:1` |  |
| `group:1, status:1` |  |
| `name:text, tagline:text` |  |

### `providertypeconfigs` — ProviderTypeConfig

source `ProviderTypeConfig.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `typeKey` | String | yes | yes |  |  |  |  |
| `kind` | String | yes |  |  | facility, practitioner, vendor, organizer |  |  |
| `group` | String | yes |  |  | clinical, wellness, commerce, home_service, transport, community, professional |  |  |
| `tier` | String |  |  | "T3" | T1, T2, T3 |  |  |
| `label` | String | yes |  |  |  |  |  |
| `icon` | String |  |  | "" |  |  |  |
| `description` | String |  |  | "" |  |  |  |
| `steps` | Array<subdocument> |  |  |  |  |  |  |
| `steps.key` | String | yes |  |  |  |  |  |
| `steps.label` | String | yes |  |  |  |  |  |
| `steps.fields` | Array<Mixed> |  |  |  |  |  |  |
| `fields` | Array<subdocument> |  |  |  |  |  |  |
| `fields.key` | String | yes |  |  |  |  |  |
| `fields.label` | String | yes |  |  |  |  |  |
| `fields.type` | String | yes |  |  | text, textarea, number, date, select, multiselect, boolean, file, phone, email, geo, address |  |  |
| `fields.required` | Boolean |  |  | false |  |  |  |
| `fields.help` | String |  |  | "" |  |  |  |
| `fields.options` | Array<Mixed> |  |  |  |  |  |  |
| `fields.defaultValue` | Mixed |  |  |  |  |  |  |
| `requiredDocs` | Array<subdocument> |  |  |  |  |  |  |
| `requiredDocs.key` | String | yes |  |  |  |  |  |
| `requiredDocs.label` | String | yes |  |  |  |  |  |
| `requiredDocs.mandatory` | Boolean |  |  | true |  |  |  |
| `requiredDocs.expiryRequired` | Boolean |  |  | false |  |  |  |
| `requiredDocs.maxMb` | Number |  |  | 10 |  |  |  |
| `optionalDocs` | Array<subdocument> |  |  |  |  |  |  |
| `optionalDocs.key` | String | yes |  |  |  |  |  |
| `optionalDocs.label` | String | yes |  |  |  |  |  |
| `optionalDocs.mandatory` | Boolean |  |  | true |  |  |  |
| `optionalDocs.expiryRequired` | Boolean |  |  | false |  |  |  |
| `optionalDocs.maxMb` | Number |  |  | 10 |  |  |  |
| `agreementTemplateId` | String |  |  | "" |  |  |  |
| `approvalPolicy.level` | String |  |  | "single" | auto, single, dual |  |  |
| `approvalPolicy.slaHours` | Number |  |  | 72 |  |  |  |
| `approvalPolicy.twoPerson` | Boolean |  |  | false |  |  |  |
| `enabledCities` | Array<Mixed> |  |  |  |  |  |  |
| `allowedStatus` | Array<Mixed> |  |  |  |  |  |  |
| `commissionDefaults.percent` | Number |  |  | 0 |  |  |  |
| `commissionDefaults.fixed` | Number |  |  | 0 |  |  |  |
| `commissionDefaults.currency` | String |  |  | "INR" |  |  |  |
| `version` | Number |  |  | 1 |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `typeKey:1` | unique |
| `kind:1` |  |
| `group:1` |  |
| `isActive:1` |  |
| `isActive:1, group:1` |  |
| `label:text, description:text` |  |

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

### `qcruns` — QcRun

source `QcRun.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `analyzer` | String |  |  | "" |  |  |  |
| `testName` | String | yes |  |  |  |  |  |
| `controlLevel` | String |  |  | "L1" | L1, L2, L3 |  |  |
| `mean` | Number | yes |  |  |  |  |  |
| `sd` | Number | yes |  |  |  |  |  |
| `value` | Number | yes |  |  |  |  |  |
| `at` | Date |  |  | [function] |  |  |  |
| `runBy` | ObjectId |  |  | null |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `analyzer:1` |  |
| `testName:1` |  |
| `hospitalId:1, analyzer:1, testName:1, at:-1` |  |

### `qualitychecklists` — QualityChecklist

source `QualityChecklist.js` · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `providerId` | ObjectId | yes |  |  |  | Provider | Identifier |
| `recordedBy` | ObjectId | yes |  |  |  | User |  |
| `checklistType` | String | yes |  |  | nabh, kayakalp, fire_safety, bmw, infection_control, other |  |  |
| `title` | String |  |  | "" |  |  |  |
| `items` | Array<subdocument> |  |  |  |  |  |  |
| `items.code` | String | yes |  |  |  |  |  |
| `items.label` | String | yes |  |  |  |  |  |
| `items.status` | String | yes |  |  | compliant, partial, non_compliant, na |  |  |
| `items.evidence` | String |  |  | "" |  |  |  |
| `items.remarks` | String |  |  | "" |  |  |  |
| `conductedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `providerId:1` |  |
| `checklistType:1` |  |
| `providerId:1, conductedAt:-1` |  |

### `queues` — Queue

source `Queue.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId | yes |  |  |  | Hospital |  |
| `type` | String | yes |  |  | OPD, LAB, RAD, PHARM, BILL, ER |  |  |
| `resourceId` | String |  |  | "" |  |  |  |
| `name` | String | yes |  |  |  |  |  |
| `prefix` | String |  |  | "A" |  |  |  |
| `counters` | Array<subdocument> |  |  |  |  |  |  |
| `counters.id` | String |  |  |  |  |  |  |
| `counters.name` | String |  |  | "" |  |  |  |
| `counters.staffId` | ObjectId |  |  | null |  | User |  |
| `counters.open` | Boolean |  |  | true |  |  |  |
| `priorityRules` | Mixed |  |  | [function] |  |  |  |
| `slaMinutes` | Number |  |  | 30 |  |  |  |
| `avgServiceSec` | Number |  |  | 600 |  |  |  |
| `active` | Boolean |  |  | true |  |  |  |
| `seq` | Number |  |  | 0 |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `type:1` |  |
| `resourceId:1` |  |
| `active:1` |  |
| `hospitalId:1, type:1, resourceId:1` |  |

### `queuetickets` — QueueTicket

source `QueueTicket.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `queueId` | ObjectId | yes |  |  |  | Queue |  |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `number` | Number | yes |  |  |  |  |  |
| `display` | String | yes |  |  |  |  |  |
| `patientId` | ObjectId |  |  | null |  | User | Identifier |
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
| `priority` | String |  |  | "Walkin" | Emergency, Critical, Senior, Appointment, Walkin |  |  |
| `boosted` | Boolean |  |  | false |  |  |  |
| `status` | String |  |  | "Waiting" | Waiting, Called, InService, Done, NoShow, Skipped, Transferred, Cancelled |  |  |
| `arrivedAt` | Date |  |  | [function] |  |  |  |
| `calledAt` | Date |  |  | null |  |  |  |
| `startedAt` | Date |  |  | null |  |  |  |
| `completedAt` | Date |  |  | null |  |  |  |
| `recallCount` | Number |  |  | 0 |  |  |  |
| `counterId` | String |  |  | "" |  |  |  |
| `createdVia` | String |  |  | "reception" | kiosk, reception, app, walkin |  |  |
| `nextQueueId` | ObjectId |  |  | null |  | Queue |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `queueId:1` |  |
| `hospitalId:1` |  |
| `priority:1` |  |
| `status:1` |  |
| `queueId:1, status:1, priority:1, arrivedAt:1` |  |

### `quotes` — Quote

source `Quote.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Contact, Financial, Identifier, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `providerId` | ObjectId | yes |  |  |  | Provider | Identifier |
| `providerOwnerId` | ObjectId | yes |  |  |  | User |  |
| `status` | String |  |  | "REQUESTED" | REQUESTED, QUOTE_SENT, ACCEPTED, DECLINED, EXPIRED, CANCELLED |  |  |
| `request` | Subdocument |  |  |  |  |  |  |
| `request.serviceDescription` | String | yes |  |  |  |  |  |
| `request.preferredMode` | String |  |  | "in_person" | in_person, video, audio, chat, home_visit, delivery, class |  |  |
| `request.location.line1` | String |  |  | "" |  |  | Location |
| `request.location.city` | String |  |  | "" |  |  | Location |
| `request.location.state` | String |  |  | "" |  |  | Location |
| `request.location.pincode` | String |  |  | "" |  |  | Contact |
| `request.budget.min` | Number |  |  | 0 |  |  |  |
| `request.budget.max` | Number |  |  | 0 |  |  |  |
| `request.notes` | String |  |  | "" |  |  |  |
| `request.attachments` | Array<Mixed> |  |  |  |  |  |  |
| `quote` | Subdocument |  |  |  |  |  |  |
| `quote.lineItems` | Array<subdocument> |  |  |  |  |  |  |
| `quote.lineItems.description` | String | yes |  |  |  |  |  |
| `quote.lineItems.quantity` | Number | yes |  | 1 |  |  |  |
| `quote.lineItems.unitPrice` | Number | yes |  |  |  |  |  |
| `quote.lineItems.amount` | Number |  |  | 0 |  |  |  |
| `quote.subtotal` | Number |  |  | 0 |  |  |  |
| `quote.gstRate` | Number |  |  | 0 |  |  |  |
| `quote.gstAmount` | Number |  |  | 0 |  |  |  |
| `quote.totalAmount` | Number |  |  | 0 |  |  |  |
| `quote.currency` | String |  |  | "INR" |  |  |  |
| `quote.validUntil` | Date |  |  |  |  |  |  |
| `quote.cancellationTerms` | String |  |  | "" |  |  |  |
| `quote.notes` | String |  |  | "" |  |  |  |
| `quote.sentAt` | Date |  |  |  |  |  |  |
| `expiresAt` | Date |  |  | null |  |  |  |
| `decision.reason` | String |  |  | "" |  |  |  |
| `decision.by` | ObjectId |  |  | null |  | User |  |
| `decision.at` | Date |  |  | null |  |  |  |
| `history` | Array<subdocument> |  |  |  |  |  |  |
| `history.from` | String | yes |  |  | REQUESTED, QUOTE_SENT, ACCEPTED, DECLINED, EXPIRED, CANCELLED |  |  |
| `history.to` | String | yes |  |  | REQUESTED, QUOTE_SENT, ACCEPTED, DECLINED, EXPIRED, CANCELLED |  |  |
| `history.by` | ObjectId |  |  | null |  | User |  |
| `history.role` | String |  |  | "" |  |  |  |
| `history.note` | String |  |  | "" |  |  |  |
| `history.at` | Date |  |  | [function] |  |  |  |
| `acceptedAt` | Date |  |  | null |  |  |  |
| `advance.amount` | Number |  |  | 0 |  |  |  |
| `advance.held` | Boolean |  |  | false |  |  |  |
| `advance.paymentId` | ObjectId |  |  | null |  | Payment | Financial |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `patientId:1` |  |
| `providerId:1` |  |
| `providerOwnerId:1` |  |
| `status:1` |  |
| `patientId:1, status:1` |  |
| `providerId:1, status:1` |  |
| `providerOwnerId:1, status:1` |  |
| `status:1, expiresAt:1` |  |

### `radiologies` — Radiology

source `Radiology.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `orderId` | String | yes | yes |  |  |  |  |
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `patientName` | String | yes |  |  |  |  | Identity |
| `doctorId` | ObjectId | yes |  |  |  | User | Identifier |
| `doctorName` | String | yes |  |  |  |  | Identity |
| `modality` | String | yes |  |  | X-Ray, MRI, CT Scan, Ultrasound, Echo, ECG, Mammography, DEXA, PET Scan, EEG, Nuclear Scan, Fluoroscopy, Angiography, OPG/CBCT, Stress Echo, Elastography, Doppler, TMT, EMG/NCV |  |  |
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
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
| `admissionId` | ObjectId |  |  | null |  | Admission |  |
| `prescriptionId` | ObjectId |  |  | null |  | Prescription |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `orderId:1` | unique |
| `hospitalId:1` |  |
| `encounterId:1` |  |
| `admissionId:1` |  |
| `prescriptionId:1` |  |

### `rcmevents` — RcmEvent

source `RcmEvent.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `stage` | String | yes |  |  | scheduled, checked_in, authorized, serviced, coded, billed, claimed, paid, denied, appealed, written_off |  |  |
| `entityRef.model` | String |  |  | "" |  |  |  |
| `entityRef.id` | ObjectId |  |  | null |  |  |  |
| `amount` | Number |  |  | 0 |  |  |  |
| `meta` | Mixed |  |  | [function] |  |  |  |
| `at` | Date |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `stage:1` |  |
| `hospitalId:1, stage:1, at:-1` |  |

### `rcmgaps` — RcmGap

source `RcmGap.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `kind` | String | yes |  |  | auth_pending, uncoded, unbilled, unclaimed, denial_open, ar_90, writeoff_review, settlement_pending |  |  |
| `entityRef.model` | String |  |  | "" |  |  |  |
| `entityRef.id` | ObjectId |  |  | null |  |  |  |
| `amount` | Number |  |  | 0 |  |  |  |
| `openedAt` | Date |  |  | [function] |  |  |  |
| `closedAt` | Date |  |  | null |  |  |  |
| `ownerRole` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `kind:1` |  |
| `hospitalId:1, closedAt:1` |  |

### `reasoncodes` — ReasonCode

source `ReasonCode.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `module` | String | yes |  |  |  |  |  |
| `code` | String | yes |  |  |  |  |  |
| `label` | String |  |  | "" |  |  |  |
| `requiresNote` | Boolean |  |  | false |  |  |  |
| `active` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `module:1` |  |
| `hospitalId:1, module:1, code:1` | unique |

### `recalllogs` — RecallLog

source `RecallLog.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `ruleId` | ObjectId |  |  | null |  | RecallRule |  |
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `kind` | String |  |  | "" |  |  |  |
| `dedupeKey` | String | yes | yes |  |  |  |  |
| `channel` | String |  |  | "notification" |  |  |  |
| `sentAt` | Date |  |  | [function] |  |  |  |
| `sentBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `patientId:1` |  |
| `dedupeKey:1` | unique |

### `recallrules` — RecallRule

source `RecallRule.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `facilityId` | ObjectId |  |  |  |  | Facility |  |
| `kind` | String | yes |  |  | follow_up, vaccination, chronic_lab, post_procedure |  |  |
| `intervalDays` | Number |  |  | 90 |  |  |  |
| `messageTemplate` | String |  |  | "" |  |  |  |
| `channel` | String |  |  | "notification" | notification, whatsapp, sms |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `facilityId:1` |  |
| `kind:1` |  |
| `hospitalId:1, kind:1` |  |

### `reconmatches` — ReconMatch

source `ReconMatch.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `bankTxnId` | ObjectId | yes |  |  |  | BankTxn |  |
| `targetModel` | String | yes |  |  |  |  |  |
| `targetId` | ObjectId | yes |  |  |  |  |  |
| `mode` | String |  |  | "auto" | auto, manual |  |  |
| `confidence` | Number |  |  | 0 |  |  |  |
| `matchedBy` | ObjectId |  |  | null |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `reconrules` — ReconRule

source `ReconRule.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `name` | String | yes |  |  |  |  | Identity |
| `pattern` | String |  |  | "" |  |  |  |
| `targetModel` | String |  |  | "Payment" |  |  |  |
| `active` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
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
| `diagnosisIcd` | String |  |  | "" |  |  |  |
| `prescription` | String |  |  | "" |  |  | Health |
| `type` | String |  |  | "diagnosis" | diagnosis, prescription, lab_report, imaging, discharge_summary, bill_invoice, payment_invoice, vaccination_record, consent_form, referral_letter, operative_note, histopathology_report, ecg_echo_report, mlc_report, medical_certificate, allergy_list, growth_chart, insurance_claim_… (382 chars) |  |  |
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
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
| `sensitivity` | String |  |  | "standard" | standard, sensitive, restricted, vip, minor |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `encounterId:1` |  |
| `sensitivity:1` |  |

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
| `reasonCode` | String |  |  | "patient_request" | orphan_payment_no_appointment, service_not_delivered, duplicate_payment, overcharge, patient_request, fraud, goodwill, appointment_cancelled, provider_cancelled |  |  |
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

### `rentals` — Rental

source `Rental.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `vendorId` | ObjectId | yes |  |  |  | Provider |  |
| `vendorOwnerId` | ObjectId | yes |  |  |  | User |  |
| `assetUnitId` | ObjectId | yes |  |  |  | AssetUnit |  |
| `startAt` | Date | yes |  |  |  |  |  |
| `endAt` | Date | yes |  |  |  |  |  |
| `days` | Number |  |  | 1 |  |  |  |
| `ratePerDay` | Number | yes |  |  |  |  |  |
| `rentalAmount` | Number | yes |  |  |  |  |  |
| `deposit` | Number |  |  | 0 |  |  |  |
| `depositRefundAmount` | Number |  |  | null |  |  |  |
| `currency` | String |  |  | "INR" |  |  |  |
| `depositPaymentId` | ObjectId |  |  | null |  | Payment |  |
| `conditionOut` | Array<Mixed> |  |  |  |  |  |  |
| `conditionIn` | Array<Mixed> |  |  |  |  |  |  |
| `damage.notes` | String |  |  | "" |  |  |  |
| `damage.amount` | Number |  |  | 0 |  |  |  |
| `sanitisation.requiredCycleDays` | Number |  |  | 0 |  |  |  |
| `sanitisation.performedAt` | Date |  |  | null |  |  |  |
| `sanitisation.performedBy` | ObjectId |  |  | null |  | User |  |
| `sanitisation.notes` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "REQUESTED" | REQUESTED, APPROVED, ACTIVE, RETURNED, INSPECTION, CLOSED, REJECTED, CANCELLED, DEPOSIT_REFUNDED |  |  |
| `cancelReason` | String |  |  | "" |  |  |  |
| `requestedAt` | Date |  |  | null |  |  |  |
| `approvedAt` | Date |  |  | null |  |  |  |
| `activatedAt` | Date |  |  | null |  |  |  |
| `returnedAt` | Date |  |  | null |  |  |  |
| `inspectedAt` | Date |  |  | null |  |  |  |
| `closedAt` | Date |  |  | null |  |  |  |
| `depositRefundedAt` | Date |  |  | null |  |  |  |
| `history` | Array<subdocument> |  |  |  |  |  |  |
| `history.from` | String | yes |  |  | REQUESTED, APPROVED, ACTIVE, RETURNED, INSPECTION, CLOSED, REJECTED, CANCELLED, DEPOSIT_REFUNDED |  |  |
| `history.to` | String | yes |  |  | REQUESTED, APPROVED, ACTIVE, RETURNED, INSPECTION, CLOSED, REJECTED, CANCELLED, DEPOSIT_REFUNDED |  |  |
| `history.by` | ObjectId |  |  | null |  | User |  |
| `history.role` | String |  |  | "" |  |  |  |
| `history.at` | Date |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `vendorId:1` |  |
| `vendorOwnerId:1` |  |
| `assetUnitId:1` |  |
| `status:1` |  |
| `userId:1, status:1` |  |
| `vendorId:1, status:1` |  |
| `assetUnitId:1, status:1` |  |

### `reportdefinitions` — ReportDefinition

source `ReportDefinition.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `key` | String | yes | yes |  |  |  |  |
| `name` | String | yes |  |  |  |  | Identity |
| `category` | String |  |  | "ops" |  |  |  |
| `dataset` | String | yes |  |  |  |  |  |
| `defaultFilters` | Mixed |  |  | [function] |  |  |  |
| `defaultColumns` | Array<Mixed> |  |  |  |  |  |  |
| `roles` | Array<Mixed> |  |  |  |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `key:1` | unique |

### `reportruns` — ReportRun

source `ReportRun.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `reportKey` | String | yes |  |  |  |  |  |
| `by` | ObjectId |  |  | null |  | User |  |
| `format` | String |  |  | "json" |  |  |  |
| `rowCount` | Number |  |  | 0 |  |  |  |
| `ms` | Number |  |  | 0 |  |  |  |
| `status` | String |  |  | "done" | queued, running, done, failed |  |  |
| `error` | String |  |  | "" |  |  |  |
| `result` | Mixed |  |  | null |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `status:1` |  |
| `hospitalId:1, createdAt:-1` |  |

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

### `reportschedules` — ReportSchedule

source `ReportSchedule.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `reportKey` | String | yes |  |  |  |  |  |
| `cron` | String | yes |  |  |  |  |  |
| `format` | String |  |  | "xlsx" | csv, xlsx |  |  |
| `recipients` | Array<Mixed> |  |  |  |  |  |  |
| `savedViewId` | ObjectId |  |  | null |  | SavedView |  |
| `active` | Boolean |  |  | true |  |  |  |
| `lastRunAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `resourcescopes` — ResourceScope

source `ResourceScope.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `tenantId` | ObjectId | yes |  |  |  | Facility |  |
| `type` | String | yes |  |  | department, ward, location |  |  |
| `name` | String | yes |  |  |  |  |  |
| `key` | String | yes |  |  |  |  |  |
| `parentId` | ObjectId |  |  | null |  | ResourceScope |  |
| `createdBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `tenantId:1` |  |
| `type:1` |  |
| `tenantId:1, type:1, key:1` | unique |

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
| `moderationStatus` | String |  |  | "visible" | visible, hidden, shadow_hidden, removed |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `patientId:1` |  |
| `moderationStatus:1` |  |
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

### `roomtariffs` — RoomTariff

source `RoomTariff.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId | yes |  |  |  | Hospital |  |
| `roomType` | String | yes |  |  | General, SemiPrivate, Private, Deluxe, ICU, NICU, HDU, Isolation, Emergency |  |  |
| `payerClass` | String |  |  | "cash" | cash, insurance, corporate, govt |  |  |
| `bedPerDay` | Number |  |  | 0 |  |  |  |
| `nursingPerDay` | Number |  |  | 0 |  |  |  |
| `rmoPerDay` | Number |  |  | 0 |  |  |  |
| `doctorVisitPerDay` | Number |  |  | 0 |  |  |  |
| `effectiveFrom` | Date |  |  | [function] |  |  |  |
| `effectiveTo` | Date |  |  | null |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `hospitalId:1, roomType:1, payerClass:1` |  |

### `rosters` — Roster

source `Roster.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId | yes |  |  |  | Hospital |  |
| `month` | String | yes |  |  |  |  |  |
| `wardId` | String |  |  | "" |  |  |  |
| `deptId` | String |  |  | "" |  |  |  |
| `entries` | Array<subdocument> |  |  |  |  |  |  |
| `entries.staffId` | ObjectId |  |  |  |  | Staff |  |
| `entries.date` | String |  |  |  |  |  |  |
| `entries.shift` | String |  |  |  | Morning, Evening, Night, Off, OnCall |  |  |
| `entries.onCall` | Boolean |  |  | false |  |  |  |
| `status` | String |  |  | "Draft" | Draft, Published |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `month:1` |  |
| `status:1` |  |
| `hospitalId:1, month:1` |  |

### `rulefirings` — RuleFiring

source `RuleFiring.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `ruleId` | ObjectId |  |  |  |  | Rule |  |
| `dedupHash` | String | yes |  |  |  |  |  |
| `entityRef.model` | String |  |  | "" |  |  |  |
| `entityRef.id` | ObjectId |  |  | null |  |  |  |
| `status` | String |  |  | "fired" | fired, suppressed, ack |  |  |
| `firedAt` | Date |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `ruleId:1` |  |
| `dedupHash:1` |  |
| `ruleId:1, dedupHash:1` |  |

### `rules` — Rule

source `Rule.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `key` | String | yes |  |  |  |  |  |
| `name` | String | yes |  |  |  |  | Identity |
| `dataset` | String | yes |  |  |  |  |  |
| `enabled` | Boolean |  |  | true |  |  |  |
| `groups` | Array<Mixed> |  |  | [] |  |  |  |
| `cooldownMinutes` | Number |  |  | 1440 |  |  |  |
| `actions` | Mixed |  |  | [function] |  |  |  |
| `schedule` | String |  |  | "15m" |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `key:1` |  |
| `dataset:1` |  |
| `hospitalId:1, key:1` | unique |

### `rxtemplates` — RxTemplate

source `RxTemplate.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Health, Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `doctorId` | ObjectId | yes |  |  |  | User | Identifier |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `name` | String | yes |  |  |  |  | Identity |
| `diagnosis` | String |  |  | "" |  |  | Health |
| `diagnosisIcd` | String |  |  | "" |  |  |  |
| `medicines` | Array<subdocument> |  |  |  |  |  |  |
| `medicines.medicineName` | String |  |  |  |  |  |  |
| `medicines.dosage` | String |  |  | "" |  |  |  |
| `medicines.frequency` | String |  |  | "" |  |  |  |
| `medicines.duration` | String |  |  | "" |  |  |  |
| `medicines.route` | String |  |  | "Oral" |  |  |  |
| `medicines.instructions` | String |  |  | "" |  |  |  |
| `favourite` | Boolean |  |  | false |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `doctorId:1` |  |
| `hospitalId:1` |  |
| `doctorId:1, name:1` |  |

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

### `savedviews` — SavedView

source `SavedView.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `reportKey` | String | yes |  |  |  |  |  |
| `name` | String | yes |  |  |  |  | Identity |
| `filters` | Mixed |  |  | [function] |  |  |  |
| `columns` | Array<Mixed> |  |  |  |  |  |  |
| `owner` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

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

### `secondopinionrequests` — SecondOpinionRequest

source `SecondOpinionRequest.js` · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `familyMemberId` | ObjectId |  |  | null |  | FamilyMember |  |
| `patientName` | String |  |  | "" |  |  | Identity |
| `doctorId` | ObjectId | yes |  |  |  | Doctor | Identifier |
| `doctorUserId` | ObjectId | yes |  |  |  | User |  |
| `recordIds` | Array<Mixed> |  |  |  |  |  |  |
| `question` | String | yes |  |  |  |  |  |
| `status` | String |  |  | "REQUESTED" | REQUESTED, ANSWERED, DECLINED, CANCELLED |  |  |
| `answer.text` | String |  |  | "" |  |  |  |
| `answer.answeredAt` | Date |  |  | null |  |  |  |
| `consentId` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `patientId:1` |  |
| `familyMemberId:1` |  |
| `doctorId:1` |  |
| `doctorUserId:1` |  |
| `status:1` |  |
| `patientId:1, familyMemberId:1, doctorId:1, status:1` |  |

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

### `serviceprices` — ServicePrice

source `ServicePrice.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `code` | String | yes |  |  |  |  |  |
| `name` | String | yes |  |  |  |  |  |
| `deptId` | String |  |  | "" |  |  |  |
| `category` | String |  |  | "other" | consult, procedure, investigation, bed, package, consumable, other |  |  |
| `hsn` | String |  |  | "" |  |  |  |
| `gstRate` | Number |  |  | 0 |  |  |  |
| `prices` | Array<subdocument> |  |  |  |  |  |  |
| `prices.payerClass` | String |  |  | "cash" | cash, insurance, corporate, govt |  |  |
| `prices.roomType` | String |  |  | "" |  |  |  |
| `prices.amount` | Number | yes |  |  |  |  |  |
| `prices.from` | Date |  |  | [function] |  |  |  |
| `prices.to` | Date |  |  | null |  |  |  |
| `active` | Boolean |  |  | true |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `code:1` |  |
| `category:1` |  |
| `hospitalId:1, code:1` |  |

### `services` — Service

source `Service.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `providerId` | ObjectId | yes |  |  |  | Provider |  |
| `practitionerId` | ObjectId |  |  | null |  | Doctor |  |
| `categoryCode` | String | yes |  |  |  |  |  |
| `name` | String | yes |  |  |  |  |  |
| `description` | String |  |  | "" |  |  |  |
| `modes` | Array<subdocument> |  |  |  |  |  |  |
| `modes.mode` | String | yes |  |  | in_person, video, audio, chat, home_visit, delivery, class |  |  |
| `modes.fee` | Number |  |  | 0 |  |  |  |
| `modes.durationMin` | Number |  |  | 30 |  |  |  |
| `modes.followUpDays` | Number |  |  | 0 |  |  |  |
| `durationMin` | Number |  |  | 30 |  |  |  |
| `price.amount` | Number |  |  | 0 |  |  |  |
| `price.currency` | String |  |  | "INR" |  |  |  |
| `price.taxInclusive` | Boolean |  |  | true |  |  |  |
| `price.gstRate` | Number |  |  | 0 |  |  |  |
| `packages` | Array<subdocument> |  |  |  |  |  |  |
| `packages.name` | String | yes |  |  |  |  |  |
| `packages.sessions` | Number | yes |  |  |  |  |  |
| `packages.price` | Number | yes |  |  |  |  |  |
| `packages.validityDays` | Number |  |  | 90 |  |  |  |
| `eligibility.ageMin` | Number |  |  | 0 |  |  |  |
| `eligibility.ageMax` | Number |  |  | 120 |  |  |  |
| `eligibility.gender` | String |  |  | "any" | any, male, female, other |  |  |
| `prerequisites` | Array<Mixed> |  |  |  |  |  |  |
| `prepInstructions` | String |  |  | "" |  |  |  |
| `requiresRx` | Boolean |  |  | false |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `capacity.perSlot` | Number |  |  | 1 |  |  |  |
| `capacity.perDay` | Number |  |  | 0 |  |  |  |
| `cancellationPolicyId` | ObjectId |  |  | null |  |  |  |
| `regulatoryTags` | Array<Mixed> |  |  |  |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `providerId:1` |  |
| `practitionerId:1` |  |
| `categoryCode:1` |  |
| `isActive:1` |  |
| `providerId:1, isActive:1` |  |
| `categoryCode:1, isActive:1` |  |
| `name:text, description:text` |  |

### `shifthandovers` — ShiftHandover

source `ShiftHandover.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `wardId` | String |  |  | "" |  |  |  |
| `shift` | String | yes |  |  | Morning, Evening, Night |  |  |
| `fromNurse` | ObjectId | yes |  |  |  | User |  |
| `toNurse` | ObjectId |  |  | null |  | User |  |
| `sbar` | Array<subdocument> |  |  |  |  |  |  |
| `sbar.admissionId` | ObjectId |  |  |  |  | Admission |  |
| `sbar.s` | String |  |  | "" |  |  |  |
| `sbar.b` | String |  |  | "" |  |  |  |
| `sbar.a` | String |  |  | "" |  |  |  |
| `sbar.r` | String |  |  | "" |  |  |  |
| `ackAt` | Date |  |  | null |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `wardId:1` |  |
| `hospitalId:1, wardId:1, createdAt:-1` |  |

### `shiftswaps` — ShiftSwap

source `ShiftSwap.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `fromStaffId` | ObjectId | yes |  |  |  | Staff |  |
| `toStaffId` | ObjectId | yes |  |  |  | Staff |  |
| `shiftDate` | String | yes |  |  |  |  |  |
| `shift` | String |  |  | "Morning" | Morning, Evening, Night, Rotating |  |  |
| `reason` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "Pending" | Pending, Approved, Rejected |  |  |
| `decidedBy` | ObjectId |  |  | null |  | User |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `status:1` |  |
| `hospitalId:1, status:1` |  |

### `signatureevents` — SignatureEvent

source `SignatureEvent.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Device/Network

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `docRef.kind` | String |  |  | "other" | consent, discharge, ot, form, other |  |  |
| `docRef.id` | ObjectId | yes |  |  |  |  |  |
| `level` | String | yes |  |  | L1, L2 |  |  |
| `signerRole` | String | yes |  |  | patient, relative, witness, doctor, staff |  |  |
| `signerId` | ObjectId |  |  | null |  | User |  |
| `signerName` | String |  |  | "" |  |  |  |
| `relation` | String |  |  | "" |  |  |  |
| `language` | String |  |  | "en" |  |  |  |
| `intent` | String |  |  | "" |  |  |  |
| `imageRef` | String |  |  | "" |  |  |  |
| `digest` | String |  |  | "" |  |  |  |
| `signature` | String |  |  | "" |  |  |  |
| `nonceHash` | String |  |  | "" |  |  |  |
| `ip` | String |  |  | "" |  |  | Device/Network |
| `device` | String |  |  | "" |  |  |  |
| `signedAt` | Date |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `docRef.id:1` |  |
| `docRef.kind:1, docRef.id:1` |  |

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
| `role` | String | yes |  |  | hospital_admin, Doctor, Nurse, Pharmacist, Lab Technician, Radiologist, Dietitian, Physiotherapist, Counselor, Technician, Helper, Security, Accountant, Receptionist, Driver, Ambulance Driver, Anaesthetist, Surgeon, Resident/Intern, OT Technician, Ward Boy/Ayah, Paramedic/EMT, Ph… (529 chars) |  |  |
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

### `statementimports` — StatementImport

source `StatementImport.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `bankAccountId` | ObjectId | yes |  |  |  | BankAccount |  |
| `fileName` | String |  |  | "" |  |  |  |
| `periodFrom` | Date |  |  | null |  |  |  |
| `periodTo` | Date |  |  | null |  |  |  |
| `rowCount` | Number |  |  | 0 |  |  |  |
| `status` | String |  |  | "parsed" | parsed, matched, closed |  |  |
| `uploadedBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `sterilisationcycles` — SterilisationCycle

source `SterilisationCycle.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `machineId` | String |  |  | "" |  |  |  |
| `cycleNo` | String | yes |  |  |  |  |  |
| `method` | String |  |  | "Autoclave" | Autoclave, ETO, Plasma, DryHeat |  |  |
| `loadItems` | Array<subdocument> |  |  |  |  |  |  |
| `loadItems.setId` | ObjectId |  |  |  |  | InstrumentSet |  |
| `loadItems.qty` | Number |  |  | 1 |  |  |  |
| `parameters` | Mixed |  |  | [function] |  |  |  |
| `biologicalIndicator` | String |  |  | "" | , Pass, Fail |  |  |
| `chemicalIndicator` | String |  |  | "" | , Pass, Fail |  |  |
| `result` | String |  |  | "Pending" | Pending, Released, Recalled |  |  |
| `operator` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `cycleNo:1` |  |
| `result:1` |  |
| `hospitalId:1, result:1` |  |

### `sterilisationlogs` — SterilisationLog

source `SterilisationLog.js` · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `providerId` | ObjectId | yes |  |  |  | Provider | Identifier |
| `recordedBy` | ObjectId | yes |  |  |  | User |  |
| `method` | String | yes |  |  | autoclave, dry_heat, chemical |  |  |
| `temperatureC` | Number |  |  |  |  |  |  |
| `durationMin` | Number |  |  |  |  |  |  |
| `indicator` | String | yes |  |  | pass, fail |  |  |
| `machineId` | String |  |  | "" |  |  |  |
| `loadContents` | String |  |  | "" |  |  |  |
| `operatedBy` | String |  |  | "" |  |  |  |
| `date` | String | yes |  |  |  |  |  |
| `notes` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `providerId:1` |  |
| `method:1` |  |
| `indicator:1` |  |
| `providerId:1, date:-1` |  |

### `stockledgers` — StockLedger

source `StockLedger.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `storeId` | ObjectId | yes |  |  |  | Store |  |
| `itemId` | String | yes |  |  |  |  |  |
| `batch` | String |  |  | "" |  |  |  |
| `qtyIn` | Number |  |  | 0 |  |  |  |
| `qtyOut` | Number |  |  | 0 |  |  |  |
| `refModel` | String |  |  | "" |  |  |  |
| `refId` | ObjectId |  |  | null |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `storeId:1` |  |
| `itemId:1` |  |
| `storeId:1, itemId:1, batch:1` |  |

### `stores` — Store

source `Store.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId | yes |  |  |  | Hospital |  |
| `name` | String | yes |  |  |  |  |  |
| `type` | String |  |  | "Central" | Central, Pharmacy, OT, Ward, Lab |  |  |
| `parentStoreId` | ObjectId |  |  | null |  | Store |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `hospitalId:1, name:1` | unique |

### `strikes` — Strike

source `Strike.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `subjectType` | String | yes |  |  | provider, user |  |  |
| `subjectId` | ObjectId | yes |  |  |  |  |  |
| `providerId` | ObjectId |  |  | null |  | Provider | Identifier |
| `userId` | ObjectId |  |  | null |  | User | Identifier |
| `moderationItemId` | ObjectId | yes |  |  |  | ModerationItem |  |
| `targetType` | String | yes |  |  | review, provider_profile, product_listing, event, article, chat_report |  |  |
| `category` | String | yes |  |  | abuse, pii, medical_claim, misleading, crisis, spam, verified_booking, defamation, copyright, other |  |  |
| `severity` | String |  |  | "medium" | low, medium, high, critical |  |  |
| `reason` | String |  |  | "" |  |  |  |
| `weight` | Number |  |  | 1 |  |  |  |
| `status` | String |  |  | "active" | active, overturned |  |  |
| `level` | String |  |  | "warning" | warning, listing_suspension, account_suspension |  |  |
| `issuedBy` | ObjectId | yes |  |  |  | User |  |
| `issuedAt` | Date |  |  | [function] |  |  |  |
| `appeal.appealedBy` | ObjectId |  |  | null |  | User |  |
| `appeal.appealedAt` | Date |  |  | null |  |  |  |
| `appeal.note` | String |  |  | "" |  |  |  |
| `appeal.resolvedBy` | ObjectId |  |  | null |  | User |  |
| `appeal.resolvedAt` | Date |  |  | null |  |  |  |
| `appeal.outcome` | String |  |  | null | upheld, overturned, null |  |  |
| `appeal.resolutionNote` | String |  |  | "" |  |  |  |
| `policyVersion` | String |  |  | "2026.10-8md5" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `subjectType:1` |  |
| `subjectId:1` |  |
| `providerId:1` |  |
| `userId:1` |  |
| `moderationItemId:1` |  |
| `status:1` |  |
| `subjectType:1, subjectId:1, status:1` |  |
| `status:1, issuedAt:-1` |  |

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
| `category` | String |  |  | "General" | Medical Supplies, Pharmaceuticals, Surgical Instruments, Equipment, General, Reagents, Implants, Linen, Medical Gases, Food, IT, OT Consumables |  |  |
| `items` | Array<Mixed> |  |  |  |  |  |  |
| `rating` | Number |  |  |  |  |  |  |
| `pan` | String |  |  | "" |  |  |  |
| `bankName` | String |  |  | "" |  |  |  |
| `bankAccount` | String |  |  | "" |  |  |  |
| `ifsc` | String |  |  | "" |  |  |  |
| `msmeNo` | String |  |  | "" |  |  |  |
| `documents` | Array<subdocument> |  |  |  |  |  |  |
| `documents.name` | String |  |  | "" |  |  |  |
| `documents.url` | String |  |  | "" |  |  |  |
| `documents.uploadedAt` | Date |  |  | [function] |  |  |  |
| `onTimePct` | Number |  |  | null |  |  |  |
| `qualityPct` | Number |  |  | null |  |  |  |
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
| `category` | String |  |  | "Other" | Safety/Emergency, Booking, Payments/Refunds, Orders, Records/Privacy, Quality/Complaint, Provider onboarding, Technical, Content/Legal, Feedback/Feature, Billing, Account, Feature Request, Other |  |  |
| `priority` | String |  |  | "Medium" | Low, Medium, High, Urgent |  |  |
| `status` | String |  |  | "Open" | Open, In Progress, Waiting on User, Resolved, Closed |  |  |
| `slaDueAt` | Date |  |  | null |  |  |  |
| `slaHours` | Number |  |  | null |  |  |  |
| `tags` | Array<Mixed> |  |  |  |  |  |  |
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
| `slaDueAt:1` |  |
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

### `tasks` — Task

source `Task.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `title` | String | yes |  |  |  |  |  |
| `type` | String |  |  | "follow_up" | call, visit, follow_up, doc_request, renewal, training, review, custom |  |  |
| `dueAt` | Date |  |  | null |  |  |  |
| `priority` | String |  |  | "medium" | low, medium, high, urgent |  |  |
| `ownerId` | ObjectId | yes |  |  |  | User | Identifier |
| `related.type` | String |  |  | "none" | lead, account, partner, camp, ticket, application, none |  |  |
| `related.id` | ObjectId |  |  | null |  |  |  |
| `slaAt` | Date |  |  | null |  |  |  |
| `status` | String |  |  | "open" | open, in_progress, blocked, done |  |  |
| `checklist` | Array<subdocument> |  |  |  |  |  |  |
| `checklist.label` | String |  |  |  |  |  |  |
| `checklist.done` | Boolean |  |  | false |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `automationRuleId` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `dueAt:1` |  |
| `ownerId:1` |  |
| `status:1` |  |
| `ownerId:1, status:1, dueAt:1` |  |
| `related.type:1, related.id:1` |  |

### `teammembers` — TeamMember

source `TeamMember.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes | yes |  |  | User | Identifier |
| `roleTemplate` | String |  |  | "other" | field_exec, team_lead, city_manager, kyc_reviewer, support, finance, provider_success, other |  |  |
| `managerId` | ObjectId |  |  | null |  | User |  |
| `city` | String |  |  | "" |  |  |  |
| `territoryId` | ObjectId |  |  | null |  | Territory |  |
| `joinDate` | Date |  |  | null |  |  |  |
| `status` | String |  |  | "active" | active, on_leave, exited |  |  |
| `trainingRecords` | Array<subdocument> |  |  |  |  |  |  |
| `trainingRecords.module` | String |  |  |  |  |  |  |
| `trainingRecords.completedAt` | Date |  |  | null |  |  |  |
| `trainingRecords.expiresAt` | Date |  |  | null |  |  |  |
| `onboardingChecklist` | Array<subdocument> |  |  |  |  |  |  |
| `onboardingChecklist.label` | String |  |  |  |  |  |  |
| `onboardingChecklist.done` | Boolean |  |  | false |  |  |  |
| `goals` | Array<Mixed> |  |  |  |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` | unique |
| `roleTemplate:1` |  |
| `status:1` |  |
| `roleTemplate:1, status:1` |  |

### `teleconsents` — TeleConsent

source `TeleConsent.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `patientId` | ObjectId | yes |  |  |  | User | Identifier |
| `doctorId` | ObjectId |  |  | null |  | User | Identifier |
| `appointmentId` | ObjectId |  |  | null |  | Appointment |  |
| `mode` | String |  |  | "video" | video, audio, chat |  |  |
| `consentedAt` | Date |  |  | [function] |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `patientId:1` |  |
| `appointmentId:1` |  |
| `appointmentId:1, patientId:1` |  |

### `tenantgrants` — TenantGrant

source `TenantGrant.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `tenantId` | ObjectId | yes |  |  |  | Facility |  |
| `principalId` | ObjectId | yes |  |  |  | User |  |
| `subject.type` | String | yes |  |  | patient, record |  |  |
| `subject.id` | ObjectId | yes |  |  |  |  |  |
| `actions` | Array<Mixed> |  |  |  |  |  |  |
| `reasonCode` | String | yes |  |  | emergency_care, safety_incident, legal_order, treatment |  |  |
| `ticketId` | String |  |  | "" |  |  |  |
| `reasonNote` | String |  |  | "" |  |  |  |
| `startsAt` | Date |  |  | [function] |  |  |  |
| `expiresAt` | Date | yes |  |  |  |  |  |
| `status` | String |  |  | "pending" | pending, approved, denied, expired, revoked |  |  |
| `approvedBy` | Array<Mixed> |  |  |  |  |  |  |
| `patientNotifiedAt` | Date |  |  | null |  |  |  |
| `accessLog` | Array<subdocument> |  |  |  |  |  |  |
| `accessLog.ts` | Date |  |  | [function] |  |  |  |
| `accessLog.route` | String |  |  |  |  |  |  |
| `accessLog.objectId` | String |  |  |  |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `tenantId:1` |  |
| `principalId:1` |  |
| `subject.id:1` |  |
| `expiresAt:1` |  |
| `status:1` |  |
| `tenantId:1, principalId:1, status:1` |  |

### `territories` — Territory

source `Territory.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `name` | String | yes |  |  |  |  | Identity |
| `city` | String | yes |  |  |  |  |  |
| `pincodes` | Array<Mixed> |  |  |  |  |  |  |
| `ownerIds` | Array<Mixed> |  |  |  |  |  |  |
| `targets.visitsPerDay` | Number |  |  | 0 |  |  |  |
| `targets.leadsPerWeek` | Number |  |  | 0 |  |  |  |
| `targets.activationsPerMonth` | Number |  |  | 0 |  |  |  |
| `isActive` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `city:1` |  |
| `city:1, isActive:1` |  |

### `tests` — Test

source `Test.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `name` | String | yes |  |  |  |  |  |
| `category` | String | yes |  |  |  |  |  |
| `categoryCode` | String |  |  | "" |  |  |  |
| `department` | String |  |  | "Pathology" |  |  |  |
| `price` | Number | yes |  |  |  |  |  |
| `refLow` | Number |  |  | null |  |  |  |
| `refHigh` | Number |  |  | null |  |  |  |
| `criticalLow` | Number |  |  | null |  |  |  |
| `criticalHigh` | Number |  |  | null |  |  |  |
| `unit` | String |  |  | "" |  |  |  |
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
| `sampleType` | String |  |  | "" | Blood, Serum, Plasma, Urine, Stool, Sputum, Swab, CSF, Tissue, Semen, Body Fluid, Saliva, |  |  |
| `equipmentType` | String |  |  | "" |  |  |  |
| `scanType` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `categoryCode:1` |  |
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
| `status` | String |  |  | "Waiting" | Waiting, Called, In Consultation, Completed, Skipped, Cancelled, NoShow |  |  |
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
| `role` | String |  |  | "patient" | superadmin, hospital_admin, doctor, clinic_doctor, patient, lab_owner, lab_receptionist, lab_technician, pathologist, pharmacy_owner, pharmacist, nurse, radiologist, dietitian, physiotherapist, counsellor, counselor, mid_level_counselor, senior_counselor, psychiatrist, accountant… (1547 chars) |  |  |
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

### `vaccinationschedules` — VaccinationSchedule

source `VaccinationSchedule.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `familyMemberId` | ObjectId |  |  | null |  | FamilyMember |  |
| `vaccineName` | String | yes |  |  |  |  |  |
| `scheduleType` | String |  |  | "child_uip" | child_uip, adult_booster, travel, covid, other |  |  |
| `doses` | Array<subdocument> |  |  |  |  |  |  |
| `doses.number` | Number | yes |  |  |  |  |  |
| `doses.dueAt` | Date | yes |  |  |  |  |  |
| `doses.givenAt` | Date |  |  | null |  |  |  |
| `doses.recordId` | ObjectId |  |  | null |  | Record |  |
| `doses.centre` | String |  |  | "" |  |  |  |
| `doses.batchNo` | String |  |  | "" |  |  |  |
| `status` | String |  |  | "scheduled" | scheduled, completed, cancelled |  |  |
| `completedAt` | Date |  |  | null |  |  |  |
| `source` | String |  |  | "manual" | uip, provider, manual, import |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `familyMemberId:1` |  |
| `status:1` |  |
| `userId:1, status:1` |  |
| `userId:1, doses.dueAt:1` |  |

### `vehicles` — Vehicle

source `Vehicle.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `riderId` | ObjectId |  |  |  |  | User |  |
| `type` | String | yes |  |  | bike, auto, e_rickshaw, car, van, wheelchair_stretcher_van, ambulance_bls, ambulance_als, ambulance_nicu, bus, mini_truck |  |  |
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

### `vendorbills` — VendorBill

source `VendorBill.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `supplierId` | ObjectId | yes |  |  |  | Supplier |  |
| `billNo` | String | yes |  |  |  |  |  |
| `billDate` | Date |  |  | [function] |  |  |  |
| `purchaseOrderId` | ObjectId |  |  | null |  | PurchaseOrder |  |
| `lines` | Array<subdocument> |  |  |  |  |  |  |
| `lines.item` | String |  |  | "" |  |  |  |
| `lines.poQty` | Number |  |  | 0 |  |  |  |
| `lines.grnQty` | Number |  |  | 0 |  |  |  |
| `lines.billQty` | Number |  |  | 0 |  |  |  |
| `lines.rate` | Number |  |  | 0 |  |  |  |
| `lines.gstRate` | Number |  |  | 0 |  |  |  |
| `subTotal` | Number |  |  | 0 |  |  |  |
| `gstTotal` | Number |  |  | 0 |  |  |  |
| `grandTotal` | Number |  |  | 0 |  |  |  |
| `matchStatus` | String |  |  | "Unmatched" | Matched, Short, Excess, Unmatched |  |  |
| `status` | String |  |  | "Draft" | Draft, Posted, Paid, Cancelled |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `supplierId:1` |  |
| `matchStatus:1` |  |
| `status:1` |  |
| `hospitalId:1, supplierId:1, billNo:1` | unique |

### `vendorscorecards` — VendorScorecard

source `VendorScorecard.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `supplierId` | ObjectId | yes |  |  |  | Supplier |  |
| `period` | String | yes |  |  |  |  |  |
| `onTimePct` | Number |  |  | null |  |  |  |
| `qualityPct` | Number |  |  | null |  |  |  |
| `fillRatePct` | Number |  |  | null |  |  |  |
| `score` | Number |  |  | null |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `supplierId:1` |  |
| `supplierId:1, period:1` | unique |

### `visitorpasses` — VisitorPass

source `VisitorPass.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Contact, Identifier, Image/Biometric

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `admissionId` | ObjectId |  |  | null |  | Admission |  |
| `visitorName` | String | yes |  |  |  |  |  |
| `phone` | String |  |  | "" |  |  | Contact |
| `idType` | String |  |  | "" |  |  |  |
| `idLast4` | String |  |  | "" |  |  |  |
| `photoUrl` | String |  |  | "" |  |  | Image/Biometric |
| `relation` | String |  |  | "" |  |  |  |
| `validFrom` | Date |  |  | [function] |  |  |  |
| `validTo` | Date | yes |  |  |  |  |  |
| `status` | String |  |  | "Active" | Active, Expired, Revoked |  |  |
| `issuedBy` | ObjectId |  |  |  |  | User |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `status:1` |  |
| `hospitalId:1, phone:1` |  |

### `visits` — Visit

source `Visit.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Location

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `leadId` | ObjectId |  |  | null |  | Lead |  |
| `providerId` | ObjectId |  |  | null |  | Provider | Identifier |
| `plannedAt` | Date |  |  | null |  |  |  |
| `checkIn.at` | Date |  |  | null |  |  |  |
| `checkIn.lat` | Number |  |  | null |  |  | Location |
| `checkIn.lng` | Number |  |  | null |  |  | Location |
| `checkOut.at` | Date |  |  | null |  |  |  |
| `checkOut.lat` | Number |  |  | null |  |  | Location |
| `checkOut.lng` | Number |  |  | null |  |  | Location |
| `outcome` | String |  |  | "" | , interested, demo_done, docs_collected, not_interested, unreachable, follow_up |  |  |
| `notes` | String |  |  | "" |  |  |  |
| `photoRefs` | Array<Mixed> |  |  |  |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `leadId:1` |  |
| `userId:1, plannedAt:1` |  |

### `vitalslogs` — VitalsLog

source `VitalsLog.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Health, Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `recordedBy` | ObjectId |  |  | null |  | User |  |
| `encounterId` | ObjectId |  |  | null |  | Encounter |  |
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
| `encounterId:1` |  |
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

### `wardrounds` — WardRound

source `WardRound.js` · timestamps: yes · virtuals: 0 · retention: Statutory period for the jurisdiction, minimum 3 years (docs/privacy/RETENTION.md) · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `admissionId` | ObjectId | yes |  |  |  | Admission |  |
| `patientId` | ObjectId |  |  |  |  | User | Identifier |
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `doctorId` | ObjectId | yes |  |  |  | User | Identifier |
| `roundAt` | Date |  |  | [function] |  |  |  |
| `soap.s` | String |  |  | "" |  |  |  |
| `soap.o` | String |  |  | "" |  |  |  |
| `soap.a` | String |  |  | "" |  |  |  |
| `soap.p` | String |  |  | "" |  |  |  |
| `orders` | Array<Mixed> |  |  |  |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `admissionId:1` |  |
| `hospitalId:1` |  |
| `admissionId:1, roundAt:-1` |  |

### `wardtypes` — WardType

source `WardType.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `name` | String | yes |  |  |  |  | Identity |
| `code` | String |  |  | "" |  |  |  |
| `defaultRate` | Number |  |  | 0 |  |  |  |
| `active` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `webhookdeliveries` — WebhookDelivery

source `WebhookDelivery.js` · timestamps: yes · virtuals: 0 · retention: n/a — no personal data detected in this collection

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `subId` | ObjectId |  |  |  |  | WebhookSubscription |  |
| `event` | String | yes |  |  |  |  |  |
| `payload` | Mixed |  |  | [function] |  |  |  |
| `status` | String |  |  | "pending" | pending, delivered, failed |  |  |
| `attempts` | Number |  |  | 0 |  |  |  |
| `nextRetryAt` | Date |  |  | null |  |  |  |
| `lastError` | String |  |  | "" |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `subId:1` |  |
| `status:1` |  |
| `status:1, nextRetryAt:1` |  |

### `webhooksubscriptions` — WebhookSubscription

source `WebhookSubscription.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Credential

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `url` | String | yes |  |  |  |  |  |
| `events` | Array<Mixed> |  |  |  |  |  |  |
| `secret` | String | yes |  |  |  |  | Credential |
| `active` | Boolean |  |  | true |  |  |  |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |

### `wellnesslogs` — WellnessLog

source `WellnessLog.js` · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `familyMemberId` | ObjectId |  |  | null |  | FamilyMember |  |
| `kind` | String | yes |  |  | steps, workout, class_attendance, meal, water, grocery |  |  |
| `date` | String | yes |  |  |  |  |  |
| `details` | Mixed |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `familyMemberId:1` |  |
| `kind:1` |  |
| `userId:1, familyMemberId:1, date:-1` |  |

### `wellnessprofiles` — WellnessProfile

source `WellnessProfile.js` · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `familyMemberId` | ObjectId |  |  | null |  | FamilyMember |  |
| `fitnessConsentedAt` | Date |  |  | null |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `familyMemberId:1` |  |
| `userId:1, familyMemberId:1` |  |

### `womenshealthlogs` — WomensHealthLog

source `WomensHealthLog.js` · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `familyMemberId` | ObjectId |  |  | null |  | FamilyMember |  |
| `kind` | String | yes |  |  | period, symptom, pregnancy, postpartum, visit |  |  |
| `date` | String | yes |  |  |  |  |  |
| `details` | Mixed |  |  | [function] |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `familyMemberId:1` |  |
| `kind:1` |  |
| `userId:1, familyMemberId:1, date:-1` |  |

### `womenshealthprofiles` — WomensHealthProfile

source `WomensHealthProfile.js` · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `userId` | ObjectId | yes |  |  |  | User | Identifier |
| `familyMemberId` | ObjectId |  |  | null |  | FamilyMember |  |
| `consentedAt` | Date |  |  | null |  |  |  |
| `cycleLengthDays` | Number |  |  | 28 |  |  |  |
| `createdAt` | Date |  |  | [function] |  |  |  |
| `updatedAt` | Date |  |  | [function] |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `userId:1` |  |
| `familyMemberId:1` |  |
| `userId:1, familyMemberId:1` |  |

### `workflowdefinitions` — WorkflowDefinition

source `WorkflowDefinition.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier, Identity

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `key` | String | yes |  |  |  |  |  |
| `name` | String | yes |  |  |  |  | Identity |
| `entityModel` | String |  |  | "" |  |  |  |
| `version` | Number |  |  | 1 |  |  |  |
| `status` | String |  |  | "Draft" | Draft, Published, Archived |  |  |
| `states` | Array<subdocument> |  |  | [] |  |  |  |
| `states.id` | String | yes |  |  |  |  |  |
| `states.label` | String |  |  | "" |  |  |  |
| `states.type` | String |  |  | "task" | start, task, parallel, join, end |  |  |
| `states.slaMinutes` | Number |  |  | 0 |  |  |  |
| `states.onEnter` | Array<subdocument> |  |  | [] |  |  |  |
| `states.onEnter.kind` | String | yes |  |  | task, notify, charge, webhook, event |  |  |
| `states.onEnter.params` | Mixed |  |  | [function] |  |  |  |
| `states.onExit` | Array<subdocument> |  |  | [] |  |  |  |
| `states.onExit.kind` | String | yes |  |  | task, notify, charge, webhook, event |  |  |
| `states.onExit.params` | Mixed |  |  | [function] |  |  |  |
| `transitions` | Array<subdocument> |  |  | [] |  |  |  |
| `transitions.id` | String |  |  | "" |  |  |  |
| `transitions.from` | String | yes |  |  |  |  |  |
| `transitions.to` | String | yes |  |  |  |  |  |
| `transitions.event` | String | yes |  |  |  |  |  |
| `transitions.guard.roles` | Array<Mixed> |  |  |  |  |  |  |
| `transitions.guard.permissions` | Array<Mixed> |  |  |  |  |  |  |
| `transitions.label` | String |  |  | "" |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `key:1` |  |
| `status:1` |  |
| `hospitalId:1, key:1, version:-1` |  |

### `workflowinstances` — WorkflowInstance

source `WorkflowInstance.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `defKey` | String | yes |  |  |  |  |  |
| `defVersion` | Number | yes |  |  |  |  |  |
| `entityRef.model` | String |  |  | "" |  |  |  |
| `entityRef.id` | ObjectId |  |  | null |  |  |  |
| `state` | String |  |  | "" |  |  |  |
| `activeStates` | Array<Mixed> |  |  |  |  |  |  |
| `history` | Array<subdocument> |  |  |  |  |  |  |
| `history.from` | String |  |  |  |  |  |  |
| `history.to` | String |  |  |  |  |  |  |
| `history.event` | String |  |  |  |  |  |  |
| `history.by` | ObjectId |  |  | null |  | User |  |
| `history.at` | Date |  |  | [function] |  |  |  |
| `history.note` | String |  |  | "" |  |  |  |
| `timers` | Array<subdocument> |  |  |  |  |  |  |
| `timers.state` | String |  |  |  |  |  |  |
| `timers.dueAt` | Date |  |  |  |  |  |  |
| `timers.escalatedAt` | Date |  |  | null |  |  |  |
| `status` | String |  |  | "Active" | Active, Done, Cancelled |  |  |
| `cancelReason` | String |  |  | "" |  |  |  |
| `version` | Number |  |  | 0 |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `defKey:1` |  |
| `status:1` |  |
| `hospitalId:1, status:1` |  |

### `worktasks` — WorkTask

source `WorkTask.js` · timestamps: yes · virtuals: 0 · retention: **UNMAPPED — holds PII but no class in RETENTION.md** · PII: Identifier

| Path | Type | Req | Unique | Default | Enum | Ref | PII |
|---|---|---|---|---|---|---|---|
| `hospitalId` | ObjectId |  |  |  |  | Hospital |  |
| `title` | String | yes |  |  |  |  |  |
| `detail` | String |  |  | "" |  |  |  |
| `entityRef.model` | String |  |  | "" |  |  |  |
| `entityRef.id` | ObjectId |  |  | null |  |  |  |
| `assignee` | ObjectId |  |  | null |  | User |  |
| `roleQueue` | String |  |  | "" |  |  |  |
| `priority` | String |  |  | "P2" | P0, P1, P2, P3 |  |  |
| `status` | String |  |  | "Open" | Open, InProgress, Blocked, Done, Cancelled |  |  |
| `dueAt` | Date |  |  | null |  |  |  |
| `tags` | Array<Mixed> |  |  |  |  |  |  |
| `activity` | Array<subdocument> |  |  |  |  |  |  |
| `activity.by` | ObjectId |  |  | null |  | User |  |
| `activity.at` | Date |  |  | [function] |  |  |  |
| `activity.text` | String |  |  | "" |  |  |  |
| `createdBy` | ObjectId |  |  |  |  | User | Identifier |
| `createdAt` | Date |  |  |  |  |  |  |
| `updatedAt` | Date |  |  |  |  |  |  |
| `__v` | Number |  |  |  |  |  |  |

Indexes:

| Keys | Flags |
|---|---|
| `hospitalId:1` |  |
| `priority:1` |  |
| `status:1` |  |
| `hospitalId:1, status:1` |  |
