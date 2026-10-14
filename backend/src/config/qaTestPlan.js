/**
 * Document 18 — QA & Test Plan (incl. UAT) Specifications
 * Comprehensive Quality Strategy, Test Pyramid, 14 Critical E2E Journeys,
 * Feature-Specific Matrices, Non-Functional Tracks, Clinical Safety QA,
 * Release Gates, UAT Scenarios, and Defect Severity SLAs.
 */

export const TEST_PYRAMID = {
  unit: {
    targetSharePct: 50,
    runner: 'Vitest / Jest',
    scope: [
      'Zod validators (.strict())',
      'Pricing, fee, GST, and coupon calculators',
      'Cancellation and refund fee calculators',
      'Slot generation, buffer, and overlap detection',
      'State-machine transition guards',
      'Rx schedule rules (Schedule H/H1/X/NDPS)',
      'Generic substitution consent logic',
      'Taxonomy alias resolution and normalisation',
      'JWT helpers (alg allowlist, claims sanitation)',
      'HIBP password breach lookup wrapper',
      'safeFetch SSRF validation rules',
      'DTO mappers & sanitizers',
      'Permission and role authorization checks',
    ],
  },
  integration: {
    targetSharePct: 25,
    runner: 'Jest / Supertest with real replica sets & Redis',
    scope: [
      'Booking hold → payment webhook → confirm state machine',
      'Concurrency control: double-booking slot contention',
      'Refund and cancellation ledger entries',
      'Waitlist promotion and auto-expiry',
      'Membership renewal and class credit consumption',
      'Event capacity and ticket QR check-in sync',
      'Pharmacy Rx upload → pharmacist review → delivery OTP',
      'Provider application submission → 2-person KYC approval → live listing',
      'Document expiry notification and background retention purge',
      'Webhook idempotency, signature validation, and replay rejection',
      'BullMQ queue retries and dead-letter queue behavior',
    ],
  },
  contractAndAuthz: {
    targetSharePct: 15,
    runner: 'Automated CI Sweeps',
    scope: [
      'DTO leak tests (dtoLeak.spec.js): verify no password, tokenVersion, bank details, or private phone in public payloads',
      'Authorization matrix (authMatrix.spec.js): verify role, ownership, and tenant boundary enforcement across all endpoints',
      'IDOR sweeps: cross-tenant access attempts across bookings, orders, medical records, and documents',
      'Schema contract validation: OpenAPI spec vs Zod runtime schema alignment',
      'Authz coverage check: fails CI if any route lacks authorization classification',
      'Tenant isolation guard: cross-tenant query contamination prevention',
    ],
  },
  e2e: {
    targetSharePct: 10,
    runner: 'Playwright (Desktop + Mobile Viewports)',
    scope: [
      '14 critical user and provider business journeys',
      'Cross-browser matrix: Chromium, WebKit, Firefox',
      'Multilingual validation: Hindi + English end-to-end',
      'Flake control: network stubbing only for 3rd-party gateways, retry limit ≤ 1',
    ],
  },
};

export const TEST_ENVIRONMENTS = [
  {
    name: 'local_dev',
    title: 'Local / Development',
    purpose: 'Rapid developer inner loop, unit testing, component visual development',
    dataSource: 'Synthetic seed (seed-demo.mjs, strictly demo-gated, zero real PHI)',
    infrastructure: 'Local Node.js, Dockerized Mongo/Redis or memory server',
  },
  {
    name: 'ci',
    title: 'Continuous Integration (CI)',
    purpose: 'Automated PR verification, lint, SAST, unit, contract, and ephemeral integration suites',
    dataSource: 'Ephemeral test database with dynamic test fixtures and builders',
    infrastructure: 'GitHub Actions / GitLab CI runner, mongodb-memory-server, mock gateways',
  },
  {
    name: 'staging',
    title: 'Staging / Pre-Production',
    purpose: 'UAT, DAST security scanning (ZAP), load/spike tests, migration rehearsals',
    dataSource: 'Synthetic anonymised datasets matching production distributions — NEVER raw production PHI',
    infrastructure: 'Parity mirror of production topology, Redis cluster, OpenSearch, ClamAV, sandbox payment APIs',
  },
  {
    name: 'prod_canary',
    title: 'Production Canary (5–10%)',
    purpose: 'Controlled phased rollout, production telemetry, error rate & payment monitoring',
    dataSource: 'Live production data with feature flag gating',
    infrastructure: 'Production Kubernetes / Cloud Run cluster with automated rollback triggers',
  },
];

export const CRITICAL_E2E_JOURNEYS = [
  {
    id: 'E2E-01',
    title: 'Patient Discovery to In-Person Booking & Payment',
    category: 'Patient Booking',
    priority: 'P0',
    steps: [
      'Patient signs up or logs in via phone OTP',
      'Searches by specialty, clinic, or symptom in selected city',
      'Views provider detail page, checks credentials, consultation fee, and available slots',
      'Selects in-person slot, enters patient details, applies valid platform coupon',
      'Completes payment via sandbox gateway or selects pay-at-clinic',
      'Receives instant booking confirmation, SMS/WhatsApp alert, and downloadable receipt',
    ],
    passCriteria: 'Booking created with status confirmed, slot marked reserved, payment ledger updated, zero PHI leak in analytics.',
  },
  {
    id: 'E2E-02',
    title: 'Teleconsultation / Video Consult & E-Prescription',
    category: 'Consultation',
    priority: 'P0',
    steps: [
      'Patient and doctor receive joining link 10 minutes prior to appointment',
      'Both parties join WebRTC / LiveKit room within consultation window',
      'Handles simulated network drop and successful reconnection',
      'Doctor concludes consult and generates digitally signed e-prescription',
      'Prescription is automatically indexed in patient health records repository',
    ],
    passCriteria: 'Call connects with audio/video stream; consultation ends with timestamp; prescription PDF created with NMC-compliant doctor registration number.',
  },
  {
    id: 'E2E-03',
    title: 'Home Healthcare Visit Dispatch with Start/End OTP',
    category: 'Home Visit',
    priority: 'P0',
    steps: [
      'Patient books home nursing / physiotherapy visit with GPS address verification',
      'Provider assigns certified practitioner; patient receives live ETA & practitioner card',
      'Practitioner arrives at home and requests Start-of-Service OTP from patient',
      'Session finishes; practitioner requests End-of-Service OTP to log visit duration',
      'Patient submits verified rating and clinical notes are logged',
    ],
    passCriteria: 'OTP validation prevents premature closure; GPS coordinates match service area; visit invoice generated.',
  },
  {
    id: 'E2E-04',
    title: 'Diagnostic Lab Test Booking & Home Collection',
    category: 'Diagnostics',
    priority: 'P0',
    steps: [
      'Patient selects health checkup package with fasting instructions',
      'Phlebotomist is dispatched for home sample collection',
      'Barcode scanned upon sample collection; patient confirms sample handover',
      'NABL-accredited lab processes test and uploads signed diagnostic PDF',
      'Patient receives secure notification and accesses lab report via private viewer',
    ],
    passCriteria: 'Chain of custody tracked with barcode; ClamAV scans uploaded PDF; unauthorized users blocked via tenant-isolated signed URL.',
  },
  {
    id: 'E2E-05',
    title: 'Pharmacy Order, Rx Verification & Generic Substitution',
    category: 'Pharmacy',
    priority: 'P0',
    steps: [
      'Patient uploads prescription image for Schedule H medication',
      'Registered pharmacist reviews prescription and flags suggested generic substitute',
      'Patient reviews cost difference and explicitly records substitution consent',
      'Order is packed, cold-chain verified if required, and dispatched with delivery partner',
      'Delivery completed using customer OTP; Schedule H1 register updated',
    ],
    passCriteria: 'Schedule H prescription mandatory; substitution requires documented consent; delivery OTP prevents misdelivery; narcotics strictly blocked.',
  },
  {
    id: 'E2E-06',
    title: 'Medical Equipment Rental & Security Deposit Refund',
    category: 'Equipment Rental',
    priority: 'P1',
    steps: [
      'Patient rents oxygen concentrator / hospital bed requiring medical necessity proof',
      'Security deposit and recurring rental fee authorized',
      'Equipment delivered with serialized asset tag verification',
      'Patient requests return at end of recovery period',
      'Equipment inspected for damage; security deposit released back to original payment method',
    ],
    passCriteria: 'Security deposit held in escrow; condition report logged with photos; automated refund processed within 48h SLA.',
  },
  {
    id: 'E2E-07',
    title: 'Fitness / Yoga Center Membership & QR Check-In',
    category: 'Fitness & Wellness',
    priority: 'P1',
    steps: [
      'User purchases 3-month center membership with trial session credit',
      'Arrives at facility and scans dynamic entrance QR code for check-in',
      'User requests 14-day medical freeze with supporting doctor note',
      'Membership validity extended automatically; auto-renew notification triggered prior to expiry',
    ],
    passCriteria: 'Offline check-in sync prevents double-scanning; freeze limits enforced strictly; billing schedule recalculated.',
  },
  {
    id: 'E2E-08',
    title: 'Community Health Camp Registration & Ticket QR Check-In',
    category: 'Events & Camps',
    priority: 'P1',
    steps: [
      'Patient registers for free cardiac screening camp in their neighborhood',
      'Digital ticket issued with encrypted verification QR code',
      'Camp desk scans ticket via mobile app (with offline queue support)',
      'Screening vitals recorded and synced to patient health records repository',
    ],
    passCriteria: 'Event capacity limit prevents overselling; duplicate registration rejected; offline sync recovers gracefully.',
  },
  {
    id: 'E2E-09',
    title: 'Provider Join Wizard, Document Upload & Superadmin Approval',
    category: 'Provider Onboarding',
    priority: 'P0',
    steps: [
      'Provider completes multi-step config-driven join wizard based on provider type',
      'Uploads clinic registration, professional license, and GST/PAN certificates',
      'ClamAV scans documents; duplicate detector checks PAN and license numbers',
      'Superadmin KYC review queue triggers two-person approval for high-risk categories',
      'Approval activates public profile, enables slot calendar, and sends onboarding kit',
    ],
    passCriteria: 'Profile blocked from public search until verified; audit log records approving admin identities.',
  },
  {
    id: 'E2E-10',
    title: 'Cancellation & Refund Engine Execution',
    category: 'Billing & Refunds',
    priority: 'P0',
    steps: [
      'Patient cancels appointment > 2 hours prior to scheduled slot: 100% refund initiated',
      'Patient cancels < 2 hours prior: cancellation fee deducted per provider policy snapshot',
      'Provider cancels consult due to emergency: 100% refund + patient goodwill coupon credit',
      'Webhook processes payout adjustment and notifies accounting ledger',
    ],
    passCriteria: 'Policy snapshot taken at booking creation is honoured; refund ledger entries balance to zero discrepancy.',
  },
  {
    id: 'E2E-11',
    title: 'Emergency SOS Broadcast & Fallback Numbers',
    category: 'Emergency',
    priority: 'P0',
    steps: [
      'User triggers SOS emergency button on mobile app',
      'System fetches verified local ambulance services and 24x7 emergency casualty contacts',
      'Simulates offline/low-connectivity mode: cached emergency numbers rendered immediately',
      'Emergency broadcast alert logged in War Room console',
    ],
    passCriteria: 'Emergency numbers display within < 200ms; offline cache never fails; no network request blocks emergency dialer.',
  },
  {
    id: 'E2E-12',
    title: 'DPDP Consent Lifecycle & Data Subject Rights (DSR)',
    category: 'Privacy & DPDP',
    priority: 'P0',
    steps: [
      'User reviews granular consent notice and grants access to health records',
      'User revokes sharing permission for specific diagnostic report',
      'Doctor attempts to access revoked record → HTTP 403 Forbidden',
      'User requests full DSR personal data export; system compiles encrypted ZIP archive',
      'User submits right-to-erasure request; non-statutory data purged while tax/audit logs retained',
    ],
    passCriteria: 'Revocation takes effect immediately; audit log tracks consent timestamp and IP; DSR export generated securely.',
  },
  {
    id: 'E2E-13',
    title: 'Family Profile Management & Minor Guardian Consent',
    category: 'Identity & Access',
    priority: 'P1',
    steps: [
      'User creates dependent profile for elderly parent and minor child',
      'Books pediatric vaccination appointment for minor',
      'Explicit parental/guardian consent recorded per DPDP Act Section 9',
      'Prescription and immunization record isolated to child profile',
    ],
    passCriteria: 'Minor profile strictly excluded from behavioral tracking; parental consent verifiable on record.',
  },
  {
    id: 'E2E-14',
    title: 'Superadmin Incident Command & Dual-Moderation Action',
    category: 'Platform Operations',
    priority: 'P0',
    steps: [
      'User flags fraudulent review or inappropriate provider conduct',
      'Moderator 1 reviews report and initiates provider suspension recommendation',
      'Moderator 2 / Superadmin reviews evidence and authorizes suspension (Four-Eyes principle)',
      'Provider public slots locked instantly; affected upcoming patients notified and refunded',
    ],
    passCriteria: 'Two distinct administrator IDs required; audit log records justification; provider slots immediately delisted.',
  },
];

export const FEATURE_TEST_MATRICES = {
  bookingEngine: {
    title: 'Booking & Scheduling Engine',
    dimensions: [
      'Modes: in-person, video, audio, chat, home visit',
      'Slot boundaries: first/last slot of day, cross-midnight, buffer times, advance booking windows',
      'Concurrency: 50 concurrent requests for single remaining slot → exactly 1 succeeds, 49 receive 409 Conflict',
      'Payment webhooks: success, failure, delayed success (pending → confirmed), duplicate webhook replay rejection',
      'Policy immutability: provider cancellation policy updates do not alter existing booking snapshots',
    ],
  },
  pharmacyAndRx: {
    title: 'Pharmacy, Rx Verification & Dispensing',
    dimensions: [
      'Schedule classification: Schedule H, H1, X, and NDPS compliance enforcement',
      'Narcotics & habit-forming drugs strictly prohibited from digital fulfillment',
      'Look-Alike Sound-Alike (LASA) and duplicate therapy safety warnings',
      'Substitution consent: mandatory digital opt-in before generic replacement',
      'Cold-chain maintenance: temperature-sensitive medicine transport flagging',
      'Delivery verification: secure delivery OTP before handover',
    ],
  },
  onboardingAndKyc: {
    title: 'Provider Onboarding & KYC Verification',
    dimensions: [
      'Mandatory document matrix enforced server-side per provider type',
      'Duplicate entity detection across Phone, PAN, GSTIN, and Medical Council registration numbers',
      'Malware inspection: ClamAV rejects infected uploads (EICAR standard test)',
      'Two-person approval lane enforced for high-risk clinical categories',
      'Document expiry daemon: automated 30-day and 7-day re-verification alerts',
    ],
  },
  membershipsAndRecurring: {
    title: 'Recurring Plans & Memberships',
    dimensions: [
      'Auto-renewal retry schedule with exponential backoff on payment failure',
      'Medical freeze limits: maximum freeze days enforced per tier',
      'Prorated refund math on verified early cancellations',
      'Double check-in prevention: prevents QR code reuse within cooldown interval',
    ],
  },
  eventsAndCamps: {
    title: 'Health Camps & Community Events',
    dimensions: [
      'Strict capacity cap enforcement with waitlist promotion queue',
      'Offline check-in synchronization with local SQLite / IndexedDB cache',
      'Encrypted ticket QR token validation with replay defense',
      'Batch vitals upload mapped to patient records with consent check',
    ],
  },
  searchAndDiscovery: {
    title: 'Search, Geolocation & Recommendations',
    dimensions: [
      'Synonym and multilingual alias matching (e.g., "Orthopedics" ↔ "Haddi ke doctor")',
      'Typo tolerance and phonetics for Indian medical terminology',
      'Geo-distance ranking accuracy within specified radius km',
      'Sponsored listing disclosure: distinct visual badge and no algorithmic manipulation of clinical safety',
      'Sensitive categories (mental health, oncology, sexual health) excluded from trending/autocomplete suggestions',
    ],
  },
  notificationsAndAlerts: {
    title: 'Notifications & Communications',
    dimensions: [
      'Zero PHI in external push / SMS payloads (discreet notification mode)',
      'TRAI / DLT template ID mapping for all transactional SMS in India',
      'Quiet hours enforcement: non-critical marketing alerts suppressed 9 PM – 8 AM',
      'Omnichannel fallback: Push → WhatsApp → SMS',
    ],
  },
  recordsAndConsent: {
    title: 'Health Records & Consent Architecture',
    dimensions: [
      'Encrypted at rest (AES-256-GCM) with tenant-isolated access control',
      'Time-limited signed URLs for medical document viewing (max 15-minute validity)',
      'ClamAV automated anti-virus scanning on every upload',
      'Granular consent revocation immediately invalidates provider view tokens',
      'DSR data export package compilation with password protection',
    ],
  },
};

export const CATALOGUE_SPECIFIC_FLOWS = [
  { category: 'Dialysis centre', testFocus: 'Recurring weekly slots, skip/reschedule single vs series, package refund pro-rata, isolation-slot rules' },
  { category: 'Vaccination', testFocus: 'Schedule generation by DOB, due/overdue alerts, guardian consent, certificate accuracy, stock/expiry blocks' },
  { category: 'Fertility/IVF 🔒', testFocus: 'Cycle workflow, discreet notifications, restricted access (break-glass only), claims-banner presence' },
  { category: 'Elder-care / hospice', testFocus: 'Quote → admission flow, MAR entries, family-portal consent scope, incident log, restricted palliative notes' },
  { category: 'Diet kitchen / meals', testFocus: 'Subscription pause/skip, allergen warnings, delivery-slot cut-off, refund on missed delivery' },
  { category: 'Equipment rental', testFocus: 'Rx-required gating (O2/CPAP), deposit hold/refund, damage inspection, extension billing' },
  { category: 'Info-only listings (govt)', testFocus: 'No booking/payment CTA, stale-source auto-hide, claim-listing verification' },
  { category: 'Home services', testFocus: 'OTP/ID-badge flow, service-area geofence, women-staff preference, SOS' },
  { category: 'Corporate wellness', testFocus: 'Employee consent, aggregate-only reports (k-anonymity), no individual leakage to employer' },
  { category: 'Sensitive categories', testFocus: 'Neutral SMS/push text, hidden from recents/suggestions, two-person approval, adClaims filters' },
];

export const NON_FUNCTIONAL_TRACKS = {
  security: {
    title: 'Security & Penetration Testing',
    tools: ['Semgrep (SAST)', 'CodeQL', 'OWASP ZAP (DAST)', 'gitleaks', 'Trivy', 'npm audit'],
    checks: [
      'Automated SAST & secrets scanning in PR pipelines',
      'OWASP ZAP baseline scan against staging environment',
      'Automated DTO leak verification across all public JSON responses',
      'IDOR regression tests for booking, invoice, and prescription IDs',
      'Rate-limiting and anti-scraping enforcement on search & auth endpoints',
      'Strict CSP, HSTS, X-Content-Type-Options, and CORS headers verification',
    ],
  },
  performance: {
    title: 'Performance & Load Testing (k6 / Artillery)',
    benchmarks: [
      { metric: 'Search API Latency', targetP95Ms: 500, description: 'p95 latency under 200 QPS search volume' },
      { metric: 'Slot Availability Latency', targetP95Ms: 300, description: 'p95 latency for calendar slot fetch' },
      { metric: 'Booking Creation & Checkout', targetP95Ms: 1500, description: 'p95 latency for booking reservation (excl. external PG)' },
      { metric: 'Dashboard Summary Latency', targetP95Ms: 800, description: 'p95 latency for provider dashboard metrics aggregation' },
      { metric: 'Notification Queue Drain', targetP95Ms: 120000, description: 'Batch of 10,000 reminder notifications dispatched within 2 minutes' },
    ],
  },
  resilienceAndChaos: {
    title: 'Resilience, Chaos & Disaster Recovery',
    principles: [
      'Fail-closed security: If ClamAV scanner is offline, file uploads must be rejected (never bypass scan)',
      'Fail-closed authz: If RBAC service or cache is unreachable, requests must be denied',
      'Graceful degradation: If OpenSearch is temporarily degraded, fallback to indexed MongoDB text search',
      'Cached emergency directory: SOS hospital and ambulance phone numbers accessible offline via Service Worker',
      'Quarterly restore drill (restore-drill.sh): Automated database backup restoration rehearsed in staging',
    ],
  },
  accessibility: {
    title: 'Accessibility & Inclusion (WCAG 2.1 AA)',
    standards: [
      'Automated axe-core compliance in component test runner',
      'Lighthouse accessibility score ≥ 90 across all public pages',
      'Full keyboard navigability for appointment booking and search filters',
      'Screen-reader compatibility with ARIA live regions for dynamic alerts',
      'Elder Mode: 1.25x font scale toggle and high-contrast color scheme',
      'Color-blind accessible status indicators (icons + text, not color alone)',
    ],
  },
  i18nAndLocalization: {
    title: 'Internationalization & Localization (Indic Languages)',
    standards: [
      'Full English and Hindi (हिन्दी) parity across core booking and search journeys',
      'Indian currency formatting (₹ Lakh / Crore grouping) via Intl.NumberFormat',
      'Localized date and time formats (12-hour AM/PM with Indian Standard Time UTC+05:30)',
      'Font fallback stack for Devanagari script glyphs without layout shifts',
      'RTL smoke testing for Urdu language support',
    ],
  },
  mobileAndPwa: {
    title: 'Mobile Web, PWA & Low-End Device Support',
    standards: [
      'Smooth performance on entry-level Android devices (2 GB RAM, Android Go)',
      'Resilient behavior under 3G and throttled 4G network conditions',
      'Web App Manifest with offline shell caching via Workbox Service Worker',
      'Client-side image compression prior to uploading medical documents',
      'SMS WebOTP credential autofill integration for seamless sign-in',
    ],
  },
  databaseAndMigrations: {
    title: 'Data Migrations & Backward Compatibility',
    standards: [
      'All migration scripts must be strictly idempotent and support dry-run reporting',
      'Zero-downtime dual-read / dual-write strategy during schema evolution',
      'Synthetic volume migration rehearsal executed on staging clone before production release',
      'Documented one-command rollback plan for every schema migration',
    ],
  },
};

export const CLINICAL_SAFETY_QA = {
  title: 'Clinical Safety & Medical Review QA',
  mandate: 'Mandatory clinical advisor review and sign-off prior to releasing any triage, diagnostic, or prescription feature.',
  redFlagKeywords: [
    { symptom: 'chest pain', urgency: 'CRITICAL', guidance: 'Immediate emergency hospital / cardiac casualty referral' },
    { symptom: 'stroke signs (FAST)', urgency: 'CRITICAL', guidance: 'Immediate acute stroke center emergency referral' },
    { symptom: 'suicidal ideation', urgency: 'CRITICAL', guidance: 'Immediate Tele-MANAS / National Suicide Prevention Helpline escalation' },
    { symptom: 'severe pregnancy bleeding', urgency: 'CRITICAL', guidance: 'Immediate emergency obstetric casualty referral' },
    { symptom: 'anaphylaxis / breathing difficulty', urgency: 'CRITICAL', guidance: 'Immediate emergency adrenaline / casualty care referral' },
  ],
  rules: [
    'AI triage assistant must NEVER provide medical diagnosis or pharmaceutical dosage advice',
    'Any detected red-flag symptom immediately overrides standard chatbot flow with emergency helpline guidance',
    'Prescription builder validates Look-Alike Sound-Alike (LASA) drug safety warnings',
    'Health articles and dietary guides must display medical reviewer attribution and statutory disclaimer',
    'Provider credentials must be verified against state medical council or NMC registry before listing',
  ],
};

export const RELEASE_GATES = [
  {
    stage: 'Pull Request (PR)',
    gate: 'Continuous Integration Checks',
    requirements: [
      'TypeScript compilation & ESLint passing with zero errors',
      'Unit test suite passing (≥ 80% coverage on core business logic)',
      'DTO leak sweep (dtoLeak.spec.js) green',
      'Authorization matrix (authMatrix.spec.js) green',
      'SAST (Semgrep) and secrets detection (gitleaks) clean',
    ],
  },
  {
    stage: 'Main Branch Merge',
    gate: 'Integration & Container Validation',
    requirements: [
      'Full integration test suite passing with replica set & Redis',
      'Docker container security scan (Trivy) with zero High/Critical CVEs',
      'Production asset bundle build verification',
    ],
  },
  {
    stage: 'Staging Deployment',
    gate: 'Pre-Production Verification',
    requirements: [
      'All 14 Critical E2E journeys passing on Playwright runner',
      'OWASP ZAP baseline security scan clean of High vulnerabilities',
      'Migration dry-run report approved with zero data loss',
      'Performance p95 benchmarks satisfied under synthetic load',
    ],
  },
  {
    stage: 'UAT Sign-Off',
    gate: 'Business & Clinical Acceptance',
    requirements: [
      'All 9 UAT scenarios verified by business stakeholders',
      'Clinical Safety Advisor sign-off on medical workflows',
      'Legal & Compliance sign-off on statutory consent & DPDP requirements',
      'Zero open Sev-1 or Sev-2 defects',
    ],
  },
  {
    stage: 'Production Canary (5–10%)',
    gate: 'Telemetry & Guardrail Monitoring',
    requirements: [
      'Error rate < 0.1% over 4-hour window',
      'Payment checkout success rate ≥ 98%',
      'Support ticket surge monitor within baseline limits',
      'Automated rollback trigger ready if Sev-1 defect detected',
    ],
  },
  {
    stage: 'Full Rollout (100%)',
    gate: 'General Availability',
    requirements: [
      'Canary metrics stable for 24 hours',
      'Operational playbooks and customer support team briefed',
      'Post-release bug triage meeting scheduled within 24 hours',
    ],
  },
];

export const UAT_PLAN = {
  participants: [
    { role: 'Elder Patient', persona: '68-year-old requiring Hindi interface, assisted by family member' },
    { role: 'Adult Chronic Patient', persona: 'Managing diabetes and hypertension, ordering regular Rx medicine' },
    { role: 'Parent Caregiver', persona: 'Booking child vaccination with guardian consent verification' },
    { role: 'Dental Clinic Owner', persona: 'Multi-chair clinic onboarding via mobile device' },
    { role: 'Diagnostic Center Manager', persona: 'Managing home collection phlebotomists and report uploads' },
    { role: 'Fitness / Yoga Center Director', persona: 'Configuring monthly memberships and handling QR check-ins' },
    { role: 'KYC Operations Reviewer', persona: 'Conducting background verification and four-eyes review' },
    { role: 'Clinical Safety Advisor', persona: 'Validating medical triage escalation and Rx safety rules' },
    { role: 'Finance / Accounts Manager', persona: 'Auditing platform fee split, 194-O TDS deduction, and payouts' },
  ],
  scripts: [
    {
      id: 'UAT-P1',
      title: 'Elder Patient Books Video Consult in Hindi',
      persona: 'Elder Patient',
      passCriteria: 'Completes booking in ≤ 3 minutes; language switcher persists; fee and refund terms clearly understood.',
    },
    {
      id: 'UAT-P2',
      title: 'Patient Orders Rx Medicine with Generic Substitution',
      persona: 'Adult Chronic Patient',
      passCriteria: 'Prescription verified by pharmacist; price comparison displayed; substitution consent recorded; OTP delivery.',
    },
    {
      id: 'UAT-P3',
      title: 'Parent Books Child Vaccination & Sets Reminder',
      persona: 'Parent Caregiver',
      passCriteria: 'Child dependent selected; guardian consent checkbox captured; calendar reminder synced successfully.',
    },
    {
      id: 'UAT-V1',
      title: 'Dental Clinic Owner Completes Mobile Onboarding',
      persona: 'Dental Clinic Owner',
      passCriteria: 'Submits clinic details & DCI/CEA documents in ≤ 10 min; application tracking dashboard displays live status.',
    },
    {
      id: 'UAT-V2',
      title: 'Gym Owner Configures Plans & Scans Member QR',
      persona: 'Fitness / Yoga Center Director',
      passCriteria: 'Membership plan created; member QR check-in succeeds; offline queue syncs without data corruption.',
    },
    {
      id: 'UAT-V3',
      title: 'Phlebotomist Collects 5 Blood Samples on 3G Network',
      persona: 'Diagnostic Center Manager',
      passCriteria: 'Barcodes scanned; handover OTP verified; zero data loss during simulated network throttling.',
    },
    {
      id: 'UAT-O1',
      title: 'KYC Reviewer Processes High-Risk Clinical Application',
      persona: 'KYC Operations Reviewer',
      passCriteria: 'Two-person approval strictly enforced; single reviewer cannot approve alone; audit log complete.',
    },
    {
      id: 'UAT-O2',
      title: 'Moderator Handles Emergency Crisis Keyword Escalation',
      persona: 'Clinical Safety Advisor',
      passCriteria: 'Crisis keyword triggers immediate priority alert; helpline details communicated within 5-minute SLA.',
    },
    {
      id: 'UAT-F1',
      title: 'Finance Manager Runs Payout Reconciliation Cycle',
      persona: 'Finance / Accounts Manager',
      passCriteria: 'Escrow account balances tally with payment gateway settlements; TDS & GST deductions match ledger.',
    },
  ],
  exitCriteria: [
    '100% of P0 critical UAT scenarios verified and signed off',
    'Task completion success rate ≥ 90% across participant group',
    'System Usability Scale (SUS) score target ≥ 70',
    'Zero open Sev-1 or Sev-2 defects',
    'Formal clinical safety advisor and legal compliance written sign-off',
  ],
};

export const DEFECT_SEVERITIES = {
  SEV_1: {
    level: 'Sev-1 (Critical)',
    definition: 'Patient clinical safety risk, data/PHI security breach, financial loss/fraud, or total platform outage.',
    sla: 'Immediate hotfix (< 4 hours)',
    escalation: 'Executive war room convened; postmortem report published within 24 hours; release blocked.',
  },
  SEV_2: {
    level: 'Sev-2 (Major)',
    definition: 'Core business journey broken (e.g., booking checkout fails for a category) with partial workaround available.',
    sla: 'Resolution within ≤ 48 hours',
    escalation: 'Engineering lead notified; daily triage updates; release blocker for affected module.',
  },
  SEV_3: {
    level: 'Sev-3 (Minor)',
    definition: 'Non-blocking edge case, localized UI visual glitch, or secondary feature malfunction.',
    sla: 'Scheduled for next sprint release',
    escalation: 'Standard backlog triage.',
  },
  SEV_4: {
    level: 'Sev-4 (Cosmetic)',
    definition: 'Minor typo, styling misalignment, or non-functional suggestion.',
    sla: 'Addressed as convenient / quality-of-life improvement',
    escalation: 'Backlog.',
  },
};

export const QA_RELEASE_CHECKLIST = [
  { item: 'Real database integration test harness passing (Mongo replica set + Redis + ClamAV)', status: 'mandatory' },
  { item: 'Authz matrix and DTO leak suites extended to all endpoints and roles', status: 'mandatory' },
  { item: '14 Critical E2E journeys passing on Playwright runner (en + hi)', status: 'mandatory' },
  { item: 'Booking/refund concurrency and idempotency verified under load', status: 'mandatory' },
  { item: 'OWASP ZAP baseline and authenticated security scans clean in staging', status: 'mandatory' },
  { item: 'Performance p95 benchmarks satisfied (Search < 500ms, Slots < 300ms, Booking < 1.5s)', status: 'mandatory' },
  { item: 'Fail-closed behavior confirmed for file virus scanning and authorization', status: 'mandatory' },
  { item: 'Accessibility (axe-core, Lighthouse ≥ 90) and Indic language parity checked', status: 'mandatory' },
  { item: 'Clinical safety triage and red-flag escalation rules signed off by advisor', status: 'mandatory' },
  { item: 'UAT scenarios executed with zero open Sev-1 / Sev-2 defects', status: 'mandatory' },
  { item: 'Database migration rehearsal completed on staging clone with rollback plan', status: 'mandatory' },
];

/**
 * Validates whether a release candidate meets all quality exit criteria.
 */
export function validateReleaseReadiness({
  openSev1Count = 0,
  openSev2Count = 0,
  criticalE2ePassing = true,
  authzMatrixPassing = true,
  dtoLeakPassing = true,
  hasRollbackPlan = true,
  clinicalAdvisorSignoff = true,
  legalSignoff = true,
  performanceBenchmarksMet = true,
} = {}) {
  const blockers = [];
  const warnings = [];

  if (openSev1Count > 0) {
    blockers.push(`Release blocked: ${openSev1Count} open Sev-1 critical defect(s) pending resolution.`);
  }
  if (openSev2Count > 0) {
    blockers.push(`Release blocked: ${openSev2Count} open Sev-2 major defect(s) pending resolution.`);
  }
  if (!criticalE2ePassing) {
    blockers.push('Release blocked: One or more of the 14 Critical E2E journeys failed.');
  }
  if (!authzMatrixPassing) {
    blockers.push('Release blocked: Authorization matrix or tenant isolation test suite failed.');
  }
  if (!dtoLeakPassing) {
    blockers.push('Release blocked: DTO leak test detected private or sensitive fields in public responses.');
  }
  if (!hasRollbackPlan) {
    blockers.push('Release blocked: Documented and rehearsed rollback plan is missing.');
  }
  if (!clinicalAdvisorSignoff) {
    blockers.push('Release blocked: Clinical Safety Advisor sign-off has not been granted.');
  }
  if (!legalSignoff) {
    warnings.push('Warning: Legal / DPDP statutory compliance sign-off is pending final confirmation.');
  }
  if (!performanceBenchmarksMet) {
    warnings.push('Warning: One or more performance p95 latency benchmarks exceeded targets.');
  }

  return {
    canRelease: blockers.length === 0,
    blockers,
    warnings,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Checks a given response latency against the target benchmark.
 */
export function checkPerformanceBenchmark(metricName, latencyMs) {
  const match = NON_FUNCTIONAL_TRACKS.performance.benchmarks.find(
    (b) => b.metric.toLowerCase() === String(metricName).toLowerCase()
  );
  if (!match) {
    return { found: false, passed: false, message: `Benchmark for "${metricName}" not found.` };
  }
  const passed = latencyMs <= match.targetP95Ms;
  return {
    found: true,
    metric: match.metric,
    latencyMs,
    targetP95Ms: match.targetP95Ms,
    passed,
    message: passed
      ? `${match.metric}: ${latencyMs}ms is within target p95 of ${match.targetP95Ms}ms.`
      : `${match.metric}: ${latencyMs}ms exceeds target p95 of ${match.targetP95Ms}ms.`,
  };
}

/**
 * Returns the SLA definition and escalation rules for a defect severity.
 */
export function getDefectSla(severity) {
  const key = String(severity).toUpperCase().replace('-', '_');
  return DEFECT_SEVERITIES[key] || {
    level: `Unknown (${severity})`,
    definition: 'Unclassified defect severity.',
    sla: 'Standard triage',
    escalation: 'Review during sprint planning.',
  };
}

/**
 * Evaluates patient-entered symptom text for acute red-flag clinical conditions.
 */
export function getRedFlagEscalation(symptomText = '') {
  const text = String(symptomText).toLowerCase();
  for (const item of CLINICAL_SAFETY_QA.redFlagKeywords) {
    const term = item.symptom.toLowerCase().split(' ')[0];
    if (text.includes(term) || text.includes(item.symptom.toLowerCase())) {
      return {
        isEmergency: true,
        urgency: item.urgency,
        matchedSymptom: item.symptom,
        guidance: item.guidance,
        action: 'HALT_BOT_AND_ESCALATE_EMERGENCY',
      };
    }
  }
  return {
    isEmergency: false,
    urgency: 'ROUTINE',
    action: 'PROCEED_STANDARD_TRIAGE',
  };
}
