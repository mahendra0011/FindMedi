# Route Inventory: App.jsx -> Next.js App Router Mapping

**Source:** `client/src/App.jsx` (React Router v6 with HashRouter)

**Total routes:** 169

## Legend

| Column | Description |
|--------|-------------|
| Path | Current React Router v6 path (HashRouter) |
| Component | Source page file (lazy import name) |
| Auth | public / auth (any logged-in user) / role (role-guarded) |
| Roles | Specific roles allowed when auth=role |
| Render | SSR (Server Component, SEO-critical) / CSR (Client Component, interactive/stateful) |
| Target | App Router folder path in findmedi-next/src/app/ |


## Auth Pages (public, no authentication)

| # | Path | Component | Auth | Roles | Render | Target |
|---|------|-----------|------|-------|--------|--------|
| 1 | `/doctor-setup` | DoctorSetup | public | - | SSR | `(public)/` |
| 2 | `/forgot-password` | ForgotPassword | public | - | SSR | `(public)/` |
| 3 | `/join-platform` | JoinPlatform | public | - | SSR | `(public)/` |
| 4 | `/login` | Login | public | - | SSR | `(public)/` |
| 5 | `/pending-approval` | PendingApproval | public | - | SSR | `(public)/` |
| 6 | `/register/delivery-partner` | DeliveryPartnerRegister | public | - | SSR | `(public)/` |
| 7 | `/signup` | Signup | public | - | SSR | `(public)/` |
| 8 | `/verify-otp` | OTPVerification | public | - | SSR | `(public)/` |

## Public Listing Pages (no auth, SEO-critical)

| # | Path | Component | Auth | Roles | Render | Target |
|---|------|-----------|------|-------|--------|--------|
| 9 | `/` | Home | public | - | SSR | `(public)/` |

## Super Admin Routes (role: superadmin)

| # | Path | Component | Auth | Roles | Render | Target |
|---|------|-----------|------|-------|--------|--------|
| 10 | `/superadmin/audit` | SAAuditLogs | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 11 | `/superadmin/broadcast` | SABroadcast | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 12 | `/superadmin/catalog` | SAGlobalCatalog | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 13 | `/superadmin/categories` | SACategories | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 14 | `/superadmin/cities` | SACities | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 15 | `/superadmin/delivery-partners` | SuperAdminDeliveryPartners | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 16 | `/superadmin/disputes` | SADisputes | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 17 | `/superadmin/export` | SADataExport | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 18 | `/superadmin/facilities` | SAAllFacilities | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 19 | `/superadmin/integrations` | SAIntegrations | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 20 | `/superadmin/legal` | SALegal | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 21 | `/superadmin/licenses` | SALicenses | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 22 | `/superadmin/moderation` | SAContentModeration | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 23 | `/superadmin/overview` | SAPlatformKPIs | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 24 | `/superadmin/pending` | SAPendingApprovals | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 25 | `/superadmin/promotions` | SAPromotions | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 26 | `/superadmin/revenue` | SARevenue | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 27 | `/superadmin/settings` | SASystemSettings | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 28 | `/superadmin/stats` | SAPlatformStats | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 29 | `/superadmin/team` | SASuperAdminTeam | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 30 | `/superadmin/tickets` | SASupportTickets | role | superadmin | CSR | `(dashboard)/superadmin/` |
| 31 | `/superadmin/users` | SAUserManagement | role | superadmin | CSR | `(dashboard)/superadmin/` |

## Admin Routes (role: hospital_admin)

| # | Path | Component | Auth | Roles | Render | Target |
|---|------|-----------|------|-------|--------|--------|
| 32 | `/admin/analytics` | AdminAnalytics | role | [hospital_admin] | CSR | `(dashboard)/admin/` |
| 33 | `/admin/announcements` | AdminAnnouncements | role | [hospital_admin] | CSR | `(dashboard)/admin/` |
| 34 | `/admin/beds` | AdminBedManagement | role | [hospital_admin] | CSR | `(dashboard)/admin/` |
| 35 | `/admin/clinic-settings` | AdminClinicSettings | role | [hospital_admin, clinic_doctor] | CSR | `(dashboard)/admin/` |
| 36 | `/admin/departments` | AdminDepartments | role | [hospital_admin] | CSR | `(dashboard)/admin/` |
| 37 | `/admin/diagnostic` | DiagnosticDashboard | role | [hospital_admin, doctor, lab_receptionist, lab_technician, pathologist] | CSR | `(dashboard)/admin/` |
| 38 | `/admin/doctors` | AdminDoctors | role | [hospital_admin] | CSR | `(dashboard)/admin/` |
| 39 | `/admin/emergency` | AdminEmergency | role | [hospital_admin] | CSR | `(dashboard)/admin/` |
| 40 | `/admin/hospital-settings` | AdminHospitalSettings | role | [hospital_admin] | CSR | `(dashboard)/admin/` |
| 41 | `/admin/lab-settings` | AdminLabSettings | role | [hospital_admin, lab_owner] | CSR | `(dashboard)/admin/` |
| 42 | `/admin/leave-requests` | AdminLeaveRequests | role | [hospital_admin] | CSR | `(dashboard)/admin/` |
| 43 | `/admin/pharmacy-settings` | AdminPharmacySettings | role | [hospital_admin, pharmacy_owner] | CSR | `(dashboard)/admin/` |
| 44 | `/admin/prescription-verification` | AdminPrescriptionVerificationQueue | role | [hospital_admin] | CSR | `(dashboard)/admin/` |
| 45 | `/admin/reviews` | AdminReviews | role | [hospital_admin] | CSR | `(dashboard)/admin/` |
| 46 | `/admin/schedule-manage` | AdminScheduleManage | role | [hospital_admin] | CSR | `(dashboard)/admin/` |
| 47 | `/admin/test-catalog` | AdminTestCatalog | role | [hospital_admin] | CSR | `(dashboard)/admin/` |
| 48 | `/admin/users` | AdminUsers | role | [hospital_admin, superadmin] | CSR | `(dashboard)/admin/` |

## Patient Routes (role: patient)

| # | Path | Component | Auth | Roles | Render | Target |
|---|------|-----------|------|-------|--------|--------|
| 49 | `/patient/addresses` | PatientAddresses | role | patient | CSR | `(dashboard)/patient/` |
| 50 | `/patient/appointments` | PatientAppointments | role | patient | CSR | `(dashboard)/patient/` |
| 51 | `/patient/booking-history` | PatientBookingHistory | role | patient | CSR | `(dashboard)/patient/` |
| 52 | `/patient/bookings` | PatientBookings | role | patient | CSR | `(dashboard)/patient/` |
| 53 | `/patient/emergency` | PatientEmergency | role | patient | CSR | `(dashboard)/patient/` |
| 54 | `/patient/family` | PatientFamily | role | patient | CSR | `(dashboard)/patient/` |
| 55 | `/patient/favorites` | PatientFavorites | role | patient | CSR | `(dashboard)/patient/` |
| 56 | `/patient/history` | PatientHistory | role | patient | CSR | `(dashboard)/patient/` |
| 57 | `/patient/medicine-orders` | PatientMedicineOrders | role | patient | CSR | `(dashboard)/patient/` |
| 58 | `/patient/prescriptions` | PatientPrescriptions | role | patient | CSR | `(dashboard)/patient/` |
| 59 | `/patient/profile` | Settings | role | patient | CSR | `(dashboard)/patient/` |
| 60 | `/patient/records` | PatientRecords | role | patient | CSR | `(dashboard)/patient/` |
| 61 | `/patient/refunds` | PatientRefunds | role | patient | CSR | `(dashboard)/patient/` |
| 62 | `/patient/reports` | PatientReports | role | patient | CSR | `(dashboard)/patient/` |
| 63 | `/patient/reviews` | PatientReviews | role | patient | CSR | `(dashboard)/patient/` |
| 64 | `/patient/reviews/write` | PatientWriteReview | role | patient | CSR | `(dashboard)/patient/` |
| 65 | `/patient/services` | PatientServices | role | patient | CSR | `(dashboard)/patient/` |
| 66 | `/patient/settings` | PatientSettings | role | patient | CSR | `(dashboard)/patient/` |
| 67 | `/patient/support` | PatientSupport | role | patient | CSR | `(dashboard)/patient/` |

## Doctor Routes (role: doctor)

| # | Path | Component | Auth | Roles | Render | Target |
|---|------|-----------|------|-------|--------|--------|
| 68 | `/doctor/appointments` | DoctorAppointments | role | doctor | CSR | `(dashboard)/doctor/` |
| 69 | `/doctor/appointments/approve` | DoctorAppointments | role | doctor | CSR | `(dashboard)/doctor/` |
| 70 | `/doctor/appointments/history` | DoctorAppointments | role | doctor | CSR | `(dashboard)/doctor/` |
| 71 | `/doctor/consultations` | DoctorConsultations | role | doctor | CSR | `(dashboard)/doctor/` |
| 72 | `/doctor/earnings` | DoctorEarnings | role | doctor | CSR | `(dashboard)/doctor/` |
| 73 | `/doctor/emergency` | DoctorEmergency | role | doctor | CSR | `(dashboard)/doctor/` |
| 74 | `/doctor/leave-requests` | DoctorLeaveRequests | role | doctor | CSR | `(dashboard)/doctor/` |
| 75 | `/doctor/patients` | DoctorPatients | role | doctor | CSR | `(dashboard)/doctor/` |
| 76 | `/doctor/prescriptions` | DoctorPrescriptions | role | doctor | CSR | `(dashboard)/doctor/` |
| 77 | `/doctor/profile` | DoctorProfile | role | doctor | CSR | `(dashboard)/doctor/` |
| 78 | `/doctor/reviews` | DoctorReviews | role | doctor | CSR | `(dashboard)/doctor/` |
| 79 | `/doctor/schedule` | DoctorScheduleEdit | role | doctor | CSR | `(dashboard)/doctor/` |
| 80 | `/doctor/test-results` | DoctorTestResults | role | doctor | CSR | `(dashboard)/doctor/` |

## Clinic Doctor Routes (role: clinic_doctor)

| # | Path | Component | Auth | Roles | Render | Target |
|---|------|-----------|------|-------|--------|--------|
| 81 | `/clinic/analytics` | ClinicAnalytics | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 82 | `/clinic/appointments` | ClinicAppointments | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 83 | `/clinic/appointments/approve` | ClinicAppointments | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 84 | `/clinic/appointments/history` | ClinicAppointments | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 85 | `/clinic/billing` | ClinicBilling | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 86 | `/clinic/consultations` | ClinicConsultations | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 87 | `/clinic/dashboard` | ClinicDashboard | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 88 | `/clinic/earnings` | ClinicEarnings | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 89 | `/clinic/fees` | ClinicFees | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 90 | `/clinic/management` | ClinicManagement | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 91 | `/clinic/notifications` | ClinicNotifications | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 92 | `/clinic/patients` | ClinicPatients | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 93 | `/clinic/payment-history` | ClinicPaymentHistory | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 94 | `/clinic/platform-settings` | ClinicPlatformSettings | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 95 | `/clinic/prescriptions` | ClinicPrescriptions | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 96 | `/clinic/reviews` | ClinicReviews | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 97 | `/clinic/schedule` | ClinicSchedule | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 98 | `/clinic/settings` | AdminClinicSettings | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 99 | `/clinic/staff` | ClinicStaff | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 100 | `/clinic/test-requests` | ClinicTestRequests | role | clinic_doctor | CSR | `(dashboard)/clinic/` |
| 101 | `/clinic/tests` | ClinicTests | role | clinic_doctor | CSR | `(dashboard)/clinic/` |

## Pharmacy Business Routes (role: pharmacy_owner)

| # | Path | Component | Auth | Roles | Render | Target |
|---|------|-----------|------|-------|--------|--------|
| 102 | `/pharmacy-business/analytics` | PharmacyAnalytics | role | pharmacy_owner | CSR | `(dashboard)/pharmacy/` |
| 103 | `/pharmacy-business/dashboard` | PharmacyBusinessDashboard | role | pharmacy_owner | CSR | `(dashboard)/pharmacy/` |
| 104 | `/pharmacy-business/delivery` | PharmacyDelivery | role | pharmacy_owner | CSR | `(dashboard)/pharmacy/` |
| 105 | `/pharmacy-business/inventory` | PharmacyInventory | role | pharmacy_owner | CSR | `(dashboard)/pharmacy/` |
| 106 | `/pharmacy-business/offers` | PharmacyOffers | role | pharmacy_owner | CSR | `(dashboard)/pharmacy/` |
| 107 | `/pharmacy-business/orders` | PharmacyOrders | role | pharmacy_owner | CSR | `(dashboard)/pharmacy/` |
| 108 | `/pharmacy-business/prescriptions` | PharmacyPrescriptionQueue | role | pharmacy_owner | CSR | `(dashboard)/pharmacy/` |
| 109 | `/pharmacy-business/returns` | PharmacyReturns | role | pharmacy_owner | CSR | `(dashboard)/pharmacy/` |
| 110 | `/pharmacy-business/reviews` | PharmacyReviews | role | pharmacy_owner | CSR | `(dashboard)/pharmacy/` |
| 111 | `/pharmacy-business/settings` | AdminPharmacySettings | role | pharmacy_owner | CSR | `(dashboard)/pharmacy/` |
| 112 | `/pharmacy-business/staff` | PharmacyStaff | role | pharmacy_owner | CSR | `(dashboard)/pharmacy/` |

## Lab Business Routes (role: lab_owner)

| # | Path | Component | Auth | Roles | Render | Target |
|---|------|-----------|------|-------|--------|--------|
| 113 | `/lab-business/analytics` | LabReportsAnalytics | role | lab_owner | CSR | `(dashboard)/labcenter/` |
| 114 | `/lab-business/appointments` | LabAppointments | role | lab_owner | CSR | `(dashboard)/labcenter/` |
| 115 | `/lab-business/billing` | LabBilling | role | lab_owner | CSR | `(dashboard)/labcenter/` |
| 116 | `/lab-business/bookings` | LabBookingManagement | role | lab_owner | CSR | `(dashboard)/labcenter/` |
| 117 | `/lab-business/dashboard` | LabCenterDashboard | role | lab_owner | CSR | `(dashboard)/labcenter/` |
| 118 | `/lab-business/equipment` | LabEquipment | role | lab_owner | CSR | `(dashboard)/labcenter/` |
| 119 | `/lab-business/packages` | LabPackages | role | lab_owner | CSR | `(dashboard)/labcenter/` |
| 120 | `/lab-business/prescriptions` | LabPrescriptionQueue | role | lab_owner | CSR | `(dashboard)/labcenter/` |
| 121 | `/lab-business/reports` | LabReports | role | lab_owner | CSR | `(dashboard)/labcenter/` |
| 122 | `/lab-business/reviews` | LabReviews | role | lab_owner | CSR | `(dashboard)/labcenter/` |
| 123 | `/lab-business/samples` | LabSampleCollection | role | lab_owner | CSR | `(dashboard)/labcenter/` |
| 124 | `/lab-business/settings` | AdminLabSettings | role | lab_owner | CSR | `(dashboard)/labcenter/` |
| 125 | `/lab-business/staff` | LabStaff | role | lab_owner | CSR | `(dashboard)/labcenter/` |
| 126 | `/lab-business/tests` | LabTestCatalog | role | lab_owner | CSR | `(dashboard)/labcenter/` |

## Delivery Partner Routes (role: delivery_boy)

| # | Path | Component | Auth | Roles | Render | Target |
|---|------|-----------|------|-------|--------|--------|
| 127 | `/delivery/documents` | DeliveryDocuments | role | delivery_boy | CSR | `(dashboard)/delivery/` |
| 128 | `/delivery/earnings` | DeliveryEarnings | role | delivery_boy | CSR | `(dashboard)/delivery/` |
| 129 | `/delivery/history` | DeliveryHistory | role | delivery_boy | CSR | `(dashboard)/delivery/` |
| 130 | `/delivery/orders` | DeliveryOrders | role | delivery_boy | CSR | `(dashboard)/delivery/` |
| 131 | `/delivery/reviews` | DeliveryReviews | role | delivery_boy | CSR | `(dashboard)/delivery/` |
| 132 | `/delivery/settings` | DeliverySettings | role | delivery_boy | CSR | `(dashboard)/delivery/` |
| 133 | `/delivery/zone` | DeliveryZone | role | delivery_boy | CSR | `(dashboard)/delivery/` |

## Dashboard Shell Routes (authenticated)

| # | Path | Component | Auth | Roles | Render | Target |
|---|------|-----------|------|-------|--------|--------|
| 134 | `/ai-chat` | AIChatPage | auth | - | CSR | `(dashboard)/` |
| 135 | `/analytics-reports` | Reports | auth | - | CSR | `(dashboard)/` |
| 136 | `/appointments` | Appointments | auth | - | CSR | `(dashboard)/` |
| 137 | `/audit-logs` | SAAuditLogs | auth | - | CSR | `(dashboard)/` |
| 138 | `/billing` | Billing | auth | - | CSR | `(dashboard)/` |
| 139 | `/bloodbank` | BloodBank | auth | - | CSR | `(dashboard)/` |
| 140 | `/dashboard` | RoleDashboard | auth | - | CSR | `(dashboard)/` |
| 141 | `/diet` | DietKitchen | auth | - | CSR | `(dashboard)/` |
| 142 | `/doctor-consultation` | DoctorConsultation | auth | - | CSR | `(dashboard)/` |
| 143 | `/doctors` | Doctors | auth | - | CSR | `(dashboard)/` |
| 144 | `/housekeeping` | Housekeeping | auth | - | CSR | `(dashboard)/` |
| 145 | `/import-export` | ImportExport | auth | - | CSR | `(dashboard)/` |
| 146 | `/insurance` | Insurance | auth | - | CSR | `(dashboard)/` |
| 147 | `/inventory` | Inventory | auth | - | CSR | `(dashboard)/` |
| 148 | `/ipd` | IPD | auth | - | CSR | `(dashboard)/` |
| 149 | `/lab` | Lab | auth | - | CSR | `(dashboard)/` |
| 150 | `/mentalhealth` | MentalHealth | auth | - | CSR | `(dashboard)/` |
| 151 | `/notifications` | Notifications | auth | - | CSR | `(dashboard)/` |
| 152 | `/nursing` | NursingCharts | auth | - | CSR | `(dashboard)/` |
| 153 | `/opd-registration` | OPDRegistration | auth | - | CSR | `(dashboard)/` |
| 154 | `/opd-token` | OPDToken | auth | - | CSR | `(dashboard)/` |
| 155 | `/ot` | OperationTheatre | auth | - | CSR | `(dashboard)/` |
| 156 | `/patient-registration` | PatientRegistration | auth | - | CSR | `(dashboard)/` |
| 157 | `/patients` | Patients | auth | - | CSR | `(dashboard)/` |
| 158 | `/pharmacy` | Pharmacy | auth | - | CSR | `(dashboard)/` |
| 159 | `/physio` | Physiotherapy | auth | - | CSR | `(dashboard)/` |
| 160 | `/radiology` | Radiology | auth | - | CSR | `(dashboard)/` |
| 161 | `/records` | MedicalRecords | auth | - | CSR | `(dashboard)/` |
| 162 | `/reports` | PDFReports | auth | - | CSR | `(dashboard)/` |
| 163 | `/settings` | Settings | auth | - | CSR | `(dashboard)/` |
| 164 | `/staff` | Staff | auth | - | CSR | `(dashboard)/` |
| 165 | `/superadmin` | Navigate->/superadmin/overview (redirect) | auth | - | CSR | `(dashboard)/` |
| 166 | `/triage` | TriagePage | auth | - | CSR | `(dashboard)/` |
| 167 | `/upload` | FileUpload | auth | - | CSR | `(dashboard)/` |
| 168 | `/verify-transaction` | VerifyTransaction | auth | - | CSR | `(dashboard)/` |

## Other Routes

| # | Path | Component | Auth | Roles | Render | Target |
|---|------|-----------|------|-------|--------|--------|
| 169 | `*` | NotFound | public | - | SSR | `(public)/` |


---

## Summary

**Routes by section:**

- Auth Pages (public, no authentication): 8
- Public Listing Pages (no auth, SEO-critical): 1
- Super Admin Routes (role: superadmin): 22
- Admin Routes (role: hospital_admin): 17
- Patient Routes (role: patient): 19
- Doctor Routes (role: doctor): 13
- Clinic Doctor Routes (role: clinic_doctor): 21
- Pharmacy Business Routes (role: pharmacy_owner): 11
- Lab Business Routes (role: lab_owner): 14
- Delivery Partner Routes (role: delivery_boy): 7
- Dashboard Shell Routes (authenticated): 35
- Other Routes: 1

**Routes by auth requirement:**

- public: 10
- role: 124
- auth: 35

**Routes by rendering strategy:**

- SSR: 10
- CSR: 159
