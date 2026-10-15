# FindMedi — Data Leak Prevention Register (Target: 0% Data Leak)

This document is the authoritative vulnerability register for all discovered data leak surfaces across FindMedi. Every surface is analyzed with its exact exploit path, affected files, compromised data types, and concrete remediation code.

---

## 1. API Response Over-Exposure (Excessive Data Exposure)
- **Vulnerability**: Mongoose document responses returning full database objects without DTO projection or `select: false`.
- **Exact Data Leaked**: Internal Mongo `__v`, internal state flags (`tokenVersion`, `loginAttempts`, `passwordChangedAt`), unmasked bank account numbers, raw prescriber phone numbers, and full patient address histories.
- **Affected Routes & Files**:
  - `backend/src/routes/recon.js:25`: returns raw `BankAccount` documents including unmasked `accountNo`.
  - `backend/src/routes/appointments.js:63-75`: returns doctor and patient documents with internal flags.
  - `backend/src/routes/patientInsurancePolicies.js`: returns internal insurance approval metadata to client.
- **Exploit Scenario**: An attacker calls `GET /api/recon/accounts` or `GET /api/appointments/:id` and views internal user attributes, unmasked account numbers, and token version numbers that can be used to coordinate replay attacks.
- **Remediation**:
  1. Attach global `toJSON` transform to all Mongoose schemas:
     ```js
     schema.set('toJSON', {
       transform: (_doc, ret) => {
         delete ret.password;
         delete ret.tokenVersion;
         delete ret.twoFactorSecret;
         delete ret.__v;
         return ret;
       }
     });
     ```
  2. Implement strict `toPublicDTO()` projectors on all responses.

---

## 2. Insecure Direct Object Reference (IDOR)
- **Vulnerability**: Direct query by `_id` parameter without enforcing patient ownership or hospital tenant isolation.
- **Exact Data Leaked**: Full medical history, prescription instructions, confidential legal consultation case notes, and diagnostic lab test values.
- **Affected Routes & Files**:
  - `backend/src/routes/lawyerBookings.js:1109`: `GET /:id` allows any user with `legal:read` to view another user's privileged case notes.
  - `backend/src/routes/assistantBookings.js:474`: `GET /:id/vitals` allowed reading bedside vitals of any patient if booking ID was known (now fixed with `assertAssistantBookingAccess`).
  - `backend/src/routes/lab.js:824`: ASTM/HL7 ingest allows updating/reading orders by `orderId` without `hospitalId` scoping.
- **Exploit Scenario**: An attacker changes the UUID or ObjectId in the URL (`GET /api/lawyer-bookings/65f1234abcd5678`) and retrieves another patient's medical litigation file.
- **Remediation**:
  1. Enforce `authorizeObject({ model, ownerField, tenantFields })` middleware on every single parameterized route (`/:id`).
  2. Return `404 Not Found` (never `403 Forbidden`) on unauthorized requests to prevent object existence enumeration.

---

## 3. Sensitive Fields in Models Without `select: false`
- **Vulnerability**: Models containing credentials or sensitive account numbers without `select: false`.
- **Exact Data Leaked**: Bank account numbers, unhashed secrets, internal reset flags.
- **Affected Routes & Files**:
  - `backend/src/models/BankAccount.js:7`: `accountNo: { type: String, required: true }` missing `select: false`.
  - `backend/src/models/ReviewerAssignment.js`: internal reviewer notes exposed if queried directly.
- **Exploit Scenario**: Any developer or route performing `.find().lean()` automatically includes `accountNo` in the query result payload unless explicitly excluded.
- **Remediation**:
  1. Add `select: false` to sensitive attributes.
  2. Store encrypted blobs and only project masked versions (`accountNoMasked: "******1234"`).

---

## 4. Logging & Telemetry Leaks
- **Vulnerability**: Debug statements printing full request bodies, error objects, and patient IDs into stdout or application log files.
- **Exact Data Leaked**: Patient canonical IDs, hospital IDs, stack traces containing database credentials, and Cloudinary upload error strings.
- **Affected Routes & Files**:
  - `backend/src/routes/appointments.js:616-618, 725`: `console.log('HARDSTOP RESULT', ...)` and `console.log(err.stack)`.
  - `backend/src/routes/upload.js:212, 343`: `console.warn('Cloudinary upload failed...', cloudErr.message)`.
  - `frontend/src/` (245 occurrences of `console.log` in production code).
- **Exploit Scenario**: Cloud log aggregator (e.g. Datadog, Papertrail, AWS CloudWatch) receives unencrypted patient IDs and Cloudinary signing tokens. A junior engineer with log-read access can read patient appointment trails.
- **Remediation**:
  1. Replace all `console.*` in backend with `logger.*` configured with Pino PII redactors for `['req.headers.authorization', 'req.body.password', 'req.body.otp', '*.accountNo']`.
  2. Enable `esbuild.drop: ['console', 'debugger']` in `frontend/vite.config.ts`.

---

## 5. Error Message & Stack Trace Leaks
- **Vulnerability**: 1,063 instances of `res.status(500).json({ message: err.message })` across backend routes.
- **Exact Data Leaked**: MongoDB duplicate key errors (revealing user email/phone existence), database collection names, Mongoose cast errors (revealing internal schema types), and driver connection strings.
- **Affected Routes & Files**:
  - `backend/src/routes/recon.js:29, 40`
  - `backend/src/routes/memberships.js:78, 170, 200, 237, 268`
  - `backend/src/routes/aiFeatures.js:36`
  - `backend/src/routes/auth.js:815`
- **Exploit Scenario**: Attacker sends a malformed query to `POST /api/recon/accounts`. Server responds with `MongoServerError: E11000 duplicate key error collection: findmedi.bankaccounts index: hospitalId_1_accountNo_1 dup key: { hospitalId: ObjectId('...'), accountNo: "123456" }`, revealing the existing hospital's bank account number!
- **Remediation**:
  1. Mandate `sendServerError(res, err, 'An unexpected error occurred')` across all routes.
  2. Add Express error-handling middleware that strips `err.message` when `NODE_ENV === 'production'`.

---

## 6. Third-Party Service Leaks (Sentry, PostHog, Unleash)
- **Vulnerability**: Error monitoring and telemetry tools initialized without scrubbing PII/PHI.
- **Exact Data Leaked**: Full URLs with query parameters (e.g. `/search?query=chemotherapy`), request headers, cookies, and user traits (name, email, phone) forwarded to US-hosted telemetry servers.
- **Affected Routes & Files**:
  - `frontend/src/main.tsx` & `backend/src/index.js`: Sentry initialization missing `beforeSend` request body/cookie sanitizer.
  - `frontend/src/lib/featureFlags.ts`: PostHog `identify(userId, traits)` sending full user profiles.
- **Exploit Scenario**: A patient encounters an error while viewing an HIV lab report. Sentry captures the DOM snapshot and API request body, uploading confidential clinical data to Sentry's cloud.
- **Remediation**:
  1. Configure Sentry `sendDefaultPii: false` and strip `event.request.data` and `event.request.cookies` in `beforeSend`:
     ```js
     Sentry.init({
       dsn,
       sendDefaultPii: false,
       beforeSend(event) {
         if (event.request) {
           delete event.request.cookies;
           delete event.request.data;
           if (event.request.url) event.request.url = event.request.url.split('?')[0];
         }
         return event;
       }
     });
     ```
  2. Disable PostHog Session Replay on medical and mental health routes.

---

## 7. File Upload & Download Storage Leaks
- **Vulnerability**: Presigned URLs with long expiration times and unauthenticated static `/uploads` file access.
- **Exact Data Leaked**: Scanned prescription images, patient ID cards (Aadhaar/PAN), lab result PDFs.
- **Affected Routes & Files**:
  - `backend/src/routes/upload.js`
  - `backend/src/services/cloudinaryService.js`
- **Exploit Scenario**: An uploaded prescription gets a static Cloudinary URL `https://res.cloudinary.com/.../prescription_123.jpg`. Because the resource is public-read without token authorization, anyone possessing or scraping the URL can view the patient's prescription without logging in.
- **Remediation**:
  1. Use Cloudinary `type: 'authenticated'` or private Amazon S3 buckets.
  2. Issue time-limited HMAC-signed download URLs with a 5-minute TTL (`maxAge: 300`).
  3. Re-verify user ownership at the download endpoint before redirecting to the signed URL.

---

## 8. Client-Side Browser LocalStorage Leaks
- **Vulnerability**: Auth tokens and AI symptom consultation histories stored in plaintext `localStorage`.
- **Exact Data Leaked**: Bearer JWT tokens, refresh tokens, sensitive medical symptoms, and medication dosages.
- **Affected Routes & Files**:
  - `frontend/src/context/AuthContext.tsx`: `localStorage.setItem('token', ...)`
  - `frontend/src/pages/AiAssistant.tsx`: `localStorage.setItem('findmedi_ai_history', ...)`
- **Exploit Scenario**: A patient logs in at an internet cafe or shared family computer. Any malicious browser extension, third-party CDN script, or subsequent user can read `localStorage` and steal the patient's session and symptom history.
- **Remediation**:
  1. Move refresh tokens to `httpOnly`, `Secure`, `SameSite=Strict` cookies.
  2. Store access tokens exclusively in in-memory React state.
  3. Switch `findmedi_ai_history` to session storage with an automatic purge on logout.

---

## 9. CORS Misconfiguration Risks
- **Vulnerability**: Potential wildcard `Access-Control-Allow-Origin: *` or reflection of untrusted `Origin` headers on authenticated API routes.
- **Exact Data Leaked**: Entire authenticated API responses via cross-origin fetch.
- **Affected Routes & Files**: `backend/src/config/cors.js`
- **Exploit Scenario**: A malicious website `https://evil-health.com` triggers `fetch('https://findmedi.online/api/appointments', { credentials: 'include' })`. If CORS reflects the origin, the malicious site reads the patient's medical history.
- **Remediation**:
  1. Strict exact-match allowlist in `cors.js`: only `https://findmedi.online` and `https://admin.findmedi.online`.
  2. Refuse wildcard `*` whenever `credentials: true` is set.

---

## 10. Real-Time Chat & Socket Room Guessing Leaks
- **Vulnerability**: Joining Socket.io rooms or LiveKit video consultation rooms without strict participant token validation.
- **Exact Data Leaked**: Doctor-patient live chat messages, video call audio/video streams, live ambulance GPS locations.
- **Affected Routes & Files**:
  - `backend/src/services/socketService.js:450-550`
  - `backend/src/routes/video.js`
- **Exploit Scenario**: An attacker connects to Socket.io and emits `join:room` with `ride:65f001` or `chat:65f002`. Because room join handlers previously lacked `assertRoomAccess`, the attacker eavesdrops on real-time location and chat events.
- **Remediation**:
  1. Enforce `assertRoomAccess(socket.user._id, roomId)` on every single socket event.
  2. Set short TTL (15m) on LiveKit video tokens.

---

## 11. Cross-Tenant Hospital Data Leaks
- **Vulnerability**: Multi-hospital tenant queries omitting `hospitalId` in database filters.
- **Exact Data Leaked**: Hospital inventory stock, doctor shift rotas, inpatient bed occupancy, automated LIS analyzer orders.
- **Affected Routes & Files**:
  - `backend/src/routes/lab.js:824, 1476` (ASTM/HL7 machine result ingestion).
  - `backend/src/routes/doctors.js` (Doctor schedule lookup).
- **Exploit Scenario**: Hospital A's administrator views or updates Hospital B's patient diagnostic reports by sending ASTM frames with shared sample IDs.
- **Remediation**:
  1. Add `hospitalId: req.user.hospitalId` to all database query filters.
  2. Enable Mongoose `tenantScope` plugin on all tenant-owned models.

---

## 12. Search & Analytics Platform Leaks (OpenSearch & Pinot)
- **Vulnerability**: OpenSearch EHR documents index (`ehr_docs_index.json`) missing tenant ID mapping, and Pinot aggregate queries exposing small cohorts (< 10 patients).
- **Exact Data Leaked**: Clinical diagnosis full text across hospitals, de-anonymized rare disease cohorts.
- **Affected Routes & Files**:
  - `data-platform/opensearch/mappings/ehr_docs_index.json`
  - `data-platform/pinot/prescription_rollup-schema.json`
- **Exploit Scenario**: A clinic researcher performs an OpenSearch query and receives search snippets matching clinical notes from other hospitals.
- **Remediation**:
  1. Add `hospitalId` keyword to `ehr_docs_index.json`.
  2. Implement k-anonymity (minimum cohort size ≥ 10) on all Pinot analytics dashboards.

---

## 13. Webhook & Callback Verification Leaks
- **Vulnerability**: Accepting payment gateway or third-party webhooks without strict HMAC signature verification.
- **Exact Data Leaked**: Unauthorized order settlement, fake payment confirmation, ledger manipulation.
- **Affected Routes & Files**: `backend/src/routes/webhook.js`
- **Exploit Scenario**: An attacker crafts a forged HTTP POST to `/api/webhook/razorpay` with `{ event: 'payment.captured', amount: 5000 }`. If HMAC signature is not verified against raw body bytes, orders are settled for free.
- **Remediation**:
  1. Verify `X-Razorpay-Signature` using `crypto.createHmac('sha256', secret).update(rawBody).digest('hex')` using raw unparsed request buffer.
  2. Ensure replay cache prevents duplicate webhook processing (Phase 0 settlement active).

---

## 14. Bulk Backup & Export Authorization Leaks
- **Vulnerability**: Single-click bulk CSV/Excel exports without two-person approval or cryptographic watermarking.
- **Exact Data Leaked**: Thousands of patient demographics, phone numbers, and billing totals dumped to unencrypted CSV files.
- **Affected Routes & Files**: `backend/src/routes/export.js`, `backend/src/routes/recon.js`
- **Exploit Scenario**: A rogue receptionist downloads `export?kind=patients` and sells the hospital roster to competing diagnostic centers.
- **Remediation**:
  1. Enforce `TwoPersonApproval` for bulk exports exceeding 50 records.
  2. Embed invisible digital watermarks ("Exported by emp_123 on 2026-10-15 IP: 1.2.3.4") in exported PDFs and Excel files.

---

## 15. Compliance Leaks (DPDP Act 2023 & ABDM)
- **Vulnerability**: Soft-delete flags leaving data accessible; missing automated hard-delete purge after 30 days.
- **Exact Data Leaked**: Historical data of deleted users retained indefinitely in violation of Section 12 (Right to Erasure).
- **Affected Routes & Files**: `backend/src/services/deletionService.js`, `backend/src/models/User.js`
- **Exploit Scenario**: A patient requests account deletion under DPDP Act 2023. System sets `deleted: true`. Months later, a database backup breach leaks the patient's records because they were never actually purged from storage.
- **Remediation**:
  1. Implement automated hard-delete cron job in `deletionService.js` that permanently purges soft-deleted records after 30 days across MongoDB, OpenSearch, and Cloudinary.

---

## 16. Encryption at Rest & Blind Index Gaps
- **Vulnerability**: High-sensitivity psychiatric therapy notes and bank accounts stored unencrypted at the application layer.
- **Exact Data Leaked**: Cleartext therapy consult notes, prescription salts, doctor bank account numbers.
- **Affected Routes & Files**: `backend/src/models/MentalHealthRecord.js`, `backend/src/models/BankAccount.js`
- **Exploit Scenario**: A compromised developer laptop with a staging database dump exposes full patient psychiatric therapy notes in cleartext.
- **Remediation**:
  1. Apply AES-256-GCM envelope encryption with per-record AAD to clinical notes.
  2. Use HMAC blind indexing for searchable fields.

---

## 17. Supply Chain & Dependency Leaks
- **Vulnerability**: Unpinned npm dependencies and missing automated vulnerability scanning in CI/CD.
- **Exact Data Leaked**: Environment variables, database connection strings, customer auth tokens exfiltrated by typosquatted npm packages.
- **Affected Routes & Files**: `package.json`, `backend/package.json`, `frontend/package.json`
- **Exploit Scenario**: A malicious dependency update publishes code that reads `process.env.MONGODB_URI` and transmits it to a remote command-and-control server.
- **Remediation**:
  1. Enforce `npm ci` with strict package-lock verification.
  2. Run Socket.dev and OSV-Scanner in GitHub Actions CI pipeline.

---

## 18. Session & Token Claims Over-Exposure
- **Vulnerability**: Placing sensitive medical information or full PII inside JWT access token claims.
- **Exact Data Leaked**: Name, phone, email, hospital ID, role permissions readable by anyone who inspects the base64-encoded token.
- **Affected Routes & Files**: `backend/src/utils/jwtKeys.js`, `backend/src/routes/auth.js`
- **Exploit Scenario**: A token sent across networks is decoded by any proxy or browser extension without needing the cryptographic signing key.
- **Remediation**:
  1. Keep JWT payload strictly minimal: `{ sub: userId, role, hospitalId, tokenVersion }`.
  2. Never embed email, phone, medical history, or diagnosis in token claims.

---

## 19. Screenshot & Screen Recording Leaks
- **Vulnerability**: Mobile web clients and Cordova/Capacitor wrappers allowing screenshots on sensitive prescription and lab report screens.
- **Exact Data Leaked**: Prescriptions and lab reports captured via mobile screenshots or rogue background screen recorders.
- **Affected Routes & Files**: `frontend/src/pages/patient/MedicalRecords.tsx`
- **Exploit Scenario**: Malware on an Android device continuously captures screenshots of the banking and healthcare app.
- **Remediation**:
  1. On native mobile builds, set `FLAG_SECURE` on window surfaces containing prescriptions and payments.

---

## 20. Third-Party SDK Data Sharing Leaks
- **Vulnerability**: Client-side analytics scripts (e.g. PostHog, Google Analytics) capturing form field inputs or auto-capturing DOM text containing patient diagnoses.
- **Exact Data Leaked**: Medication names entered into search bars, doctor specialties clicked.
- **Affected Routes & Files**: `frontend/src/lib/featureFlags.ts`
- **Exploit Scenario**: PostHog auto-captures a button click on "Consult Oncologist for Breast Cancer", associating the diagnosis with the user's IP.
- **Remediation**:
  1. Set `autocapture: false` on all analytics SDKs.
  2. Mask all input fields with class `ph-no-capture`.

---

## 21. Metadata Leaks in Exported Documents
- **Vulnerability**: Generating patient billing and prescription PDFs reusing template engines without wiping previous patient metadata.
- **Exact Data Leaked**: Previous patient's name or MRN retained in PDF author, subject, or title EXIF metadata.
- **Affected Routes & Files**: `backend/src/services/billPdfService.js`, `backend/src/services/napiPdfService.js`
- **Exploit Scenario**: Patient B opens their invoice in Adobe Acrobat, inspects Document Properties, and reads Patient A's name in the author metadata.
- **Remediation**:
  1. Explicitly reset PDF metadata: `doc.info['Title'] = 'Tax Invoice'; doc.info['Author'] = 'FindMedi'; doc.info['Subject'] = 'Medical Invoice';`.

---

## 22. Rate-Limit Bypass via Multiple Account Sybil Attacks
- **Vulnerability**: Rate limiters keyed solely on IP address or user ID without device fingerprinting or phone-number velocity limits.
- **Exact Data Leaked**: OTP flooding, SMS quota exhaustion, doctor slot hoarding.
- **Affected Routes & Files**: `backend/src/middleware/rateLimit.js`, `backend/src/routes/auth.js`
- **Exploit Scenario**: An attacker creates 100 fake accounts and books all available appointment slots for a specialist doctor, bypassing per-user rate limits.
- **Remediation**:
  1. Implement composite rate limiting keying on `IP + userAgent + phoneHash`.
  2. Enforce national SMS daily budget caps per phone number.
