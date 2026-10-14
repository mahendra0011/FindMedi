/**
 * Document 19 — DevOps, Scaling & Cost Plan Specifications (Frontend)
 * TypeScript interfaces, configurations, and calculation utilities for
 * Stage-wise Infrastructure (S0–S3), SLOs, Page vs Ticket alerts,
 * Cost/1k Bookings calculator, and SRE Runbooks.
 */

export interface InfraStage {
  stage: string;
  scope: string;
  recommendedStack: string[];
  skipForNow: string[];
  operationalGuidance: string;
}

export interface SloDefinition {
  metric: string;
  sli: string;
  targetPct?: number;
  targetP95Ms?: number;
  targetStr: string;
  description: string;
}

export interface AlertRule {
  id: string;
  title: string;
  condition: string;
  severity: string;
  runbook: string;
  channel?: string;
}

export interface CostBucket {
  key: string;
  name: string;
  description: string;
  driver: string;
  controlLevers: string;
}

export interface SreRunbook {
  id: string;
  title: string;
  severity: string;
  trigger: string;
  steps: string[];
}

export const INFRA_STAGES: Record<string, InfraStage> = {
  S0_PILOT: {
    stage: 'S0 — Pilot (R-1 / R1)',
    scope: '1 pilot city, ≤ few hundred providers, low-to-medium initial traffic',
    recommendedStack: [
      'Managed PaaS (Render / Fly / Railway) or 1–2 VMs w/ Docker Compose + Nginx',
      'MongoDB Atlas (M10+ replica set with transactions & PITR backups)',
      'Managed Redis (with TLS & auth for sessions, rate-limiting, and BullMQ queues)',
      'Cloudinary / S3 (private signed URLs, ClamAV anti-malware scan pipeline)',
      'OpenSearch managed or Atlas Search / Meilisearch for public catalog discovery',
      'LiveKit Cloud for encrypted video teleconsultations',
      'Cloudflare in front (DNS, WAF, DDoS protection, bot management, cache rules)',
    ],
    skipForNow: [
      'Self-hosted Apache Kafka (use BullMQ over Redis instead)',
      'Apache Flink (use standard async worker processing)',
      'Trino & Apache Pinot (use MongoDB aggregation pipelines for initial analytics)',
      'Full Kubernetes k8s cluster (avoid unnecessary ops complexity until multi-city scale)',
    ],
    operationalGuidance:
      'Keep advanced streaming and analytics behind feature flags/profiles. Run core API, BullMQ workers, MongoDB Atlas, Redis, and Cloudflare to minimize operational overhead and prevent premature cost inflation.',
  },
  S1_GROWTH: {
    stage: 'S1 — Growth',
    scope: '2–3 cities, steady daily bookings, active provider and patient networks',
    recommendedStack: [
      'Containers on managed container platform (AWS ECS / GCP Cloud Run / Render Private Services) or small managed k8s',
      'Autoscaling API and dedicated BullMQ worker pools (notifications, PDFs, verification)',
      'Managed OpenSearch cluster with Index Lifecycle Management (ILM) and search index aliases',
      'MongoDB read replicas for read-heavy operations and dashboard analytics',
      'CDN caching for static assets, public clinic photos, and landing pages',
      'Staging parity with production-like configuration, flags, and synthetic data',
    ],
    skipForNow: [
      'Self-hosted Kafka/Flink clusters unless proven event streaming throughput requires it',
      'Complex multi-cloud setups',
    ],
    operationalGuidance:
      'Split API and background worker deployments. Maintain strict configuration parity between staging and production.',
  },
  S2_SCALE: {
    stage: 'S2 — Scale',
    scope: 'Multi-city / statewide expansion, burst traffic (health camps, seasonal spikes)',
    recommendedStack: [
      'Kubernetes (k8s) with Horizontal Pod Autoscaler (HPA) driven by CPU/memory and queue depth',
      'Dedicated worker pools per queue type (notifications, PDFs, exports, KYC, search indexing)',
      'Managed Kafka (AWS MSK / Confluent) if event volume exceeds Redis queue throughput',
      'Analytics data warehouse (BigQuery / ClickHouse / Trino) fed via change-data-capture (CDC)',
      'Multi-AZ database deployment with automated zero-data-loss failover',
      'Disaster Recovery (DR) secondary region cold-standby plan with automated DNS failover',
    ],
    skipForNow: [
      'Multi-region active-active database replication (unless regulatory mandates require it)',
    ],
    operationalGuidance:
      'Scale workers independently of stateless APIs. Implement automated database archiving for aged medical audit records.',
  },
  S3_ENTERPRISE: {
    stage: 'S3 — Enterprise',
    scope: 'B2B enterprise clients, hospital network consortiums, insurance & TPA integrations',
    recommendedStack: [
      'Enterprise SSO / SAML 2.0 and SCIM directory provisioning',
      'Tenant isolation tiers with optional dedicated database clusters for large hospital networks',
      'Strict contractual SLA / SLO performance guarantees with financial penalty backing',
      'SOC2 Type II, ISO 27001, and HIPAA compliance audit logging and evidence pipelines',
    ],
    skipForNow: [],
    operationalGuidance:
      'Ensure complete physical or logical tenant segregation. Provide dedicated support escalations and private VPC peering options.',
  },
};

export const ENV_TOPOLOGY = {
  dev: {
    purpose: 'Local development and rapid feature iteration',
    hosting: 'Local Docker Compose (docker-compose.dev.yml)',
    data: 'Gated seed-demo data (seed-demo.mjs); mocked 3rd party vendor APIs (Razorpay, Twilio, LiveKit)',
  },
  ci: {
    purpose: 'Automated PR verification and contract testing',
    hosting: 'GitHub Actions ephemeral runners',
    data: 'Ephemeral MongoDB replica set, Redis, ClamAV, and OpenSearch containers',
  },
  staging: {
    purpose: 'Pre-production validation, UAT sign-off, OWASP ZAP scans, and load testing',
    hosting: 'Mirror of production architecture with right-sized instances',
    data: 'Strictly synthetic/anonymized datasets; sandbox payment gateway credentials; never real production PHI',
  },
  prod: {
    purpose: 'Live patient and provider traffic',
    hosting: 'S0/S1 cloud infrastructure in India region (data residency compliance)',
    data: 'Live encrypted customer PHI/PII; strict least-privilege IAM; canary releases (5–10%)',
  },
  preview: {
    purpose: 'Per-PR visual review and frontend preview environments',
    hosting: 'Ephemeral PaaS / CDN branch deployments with automatic PR close teardown',
    data: 'Mocked API contracts or sanitized staging backend',
  },
  dataSafetyPrinciple:
    'STRICT: Under no circumstances should real production PHI or PII ever be transferred or restored to dev, CI, staging, or preview environments.',
};

export const CI_CD_PIPELINE = {
  prGates: [
    'ESLint code quality and style validation',
    'TypeScript strict typechecking (tsc --noEmit)',
    'Unit tests with Vitest / Jest (minimum coverage threshold)',
    'Authorization route coverage verification (authz:coverage)',
    'DTO leak suite (dtoLeak.spec.js: zero secret/PHI leakage)',
    'AuthMatrix route permission check (authMatrix.spec.js)',
    'Static Application Security Testing (SAST: Semgrep & CodeQL)',
    'Secrets scan (gitleaks: prevent API keys / JWT secrets commit)',
    'Dependency vulnerability review (OSV & npm audit)',
    'Production frontend bundle build verification (npm run build)',
  ],
  mainBranchGates: [
    'Full integration test suite against real MongoDB replica set and Redis',
    'Trivy container image and filesystem vulnerability scan',
    'Database schema migration dry-run and safety report',
    'Container image Software Bill of Materials (SBOM) generation',
  ],
  stagingGates: [
    'Automated continuous deployment to staging environment',
    'Automated smoke test suite execution',
    '14 Critical End-to-End journeys automated via Playwright',
    'OWASP ZAP baseline and authenticated DAST security scan',
    'Load and performance smoke test validation (k6)',
  ],
  productionRollout: [
    'Manual or automated release gate sign-off (Zero Sev-1/Sev-2 blockers)',
    'Canary release deployment (5–10% initial traffic routing via feature flags)',
    'Real-time telemetry, error budget, and latency monitoring',
    'Progressive rollout to 100% upon meeting SLA stability criteria',
    'Post-deployment automated healthchecks and synthetic user checks',
  ],
  databaseMigrationPattern:
    'Expand → Migrate → Contract (zero-downtime dual-read schema evolution with pre-tested rollback plans)',
};

export const SLO_DEFINITIONS: Record<string, SloDefinition> = {
  apiAvailability: {
    metric: 'API Availability',
    sli: 'Non-5xx HTTP responses / Total HTTP requests',
    targetPct: 99.9,
    targetStr: '99.9%',
    description: 'Platform API endpoint availability excluding scheduled maintenance windows.',
  },
  bookingSuccess: {
    metric: 'Booking Success Rate',
    sli: 'Confirmed bookings / Initiated bookings (excluding voluntary user abandonment)',
    targetPct: 98.0,
    targetStr: '≥ 98.0%',
    description: 'Percentage of slot booking attempts that successfully complete without system error.',
  },
  paymentSuccess: {
    metric: 'Payment Gateway Success Rate',
    sli: 'Successful gateway transactions / Total non-abandoned gateway attempts',
    targetPct: 97.0,
    targetStr: '≥ 97.0%',
    description: 'Gateway-attributable payment completion rate across UPI, cards, and netbanking.',
  },
  searchLatency: {
    metric: 'Search Latency p95',
    sli: '95th percentile response time for search and autocomplete queries',
    targetP95Ms: 500,
    targetStr: '< 500 ms',
    description: 'Provider, facility, and medical specialty discovery query response time.',
  },
  notificationDelivery: {
    metric: 'Critical Notification Delivery',
    sli: 'Critical OTP, appointment reminders, and SOS alerts delivered within 60 seconds',
    targetPct: 99.0,
    targetStr: '≥ 99.0%',
    description: 'Timely dispatch across Push, WhatsApp, and SMS transactional channels.',
  },
  sosAvailability: {
    metric: 'Emergency SOS Dispatch API Availability',
    sli: 'Uptime and immediate latency (<200ms) for ambulance and casualty dispatch endpoints',
    targetPct: 99.95,
    targetStr: '≥ 99.95%',
    description: 'Critical life-safety emergency endpoint reliability with fail-closed offline fallback.',
  },
};

export const ALERTING_RULES: { pageAlerts: AlertRule[]; ticketAlerts: AlertRule[] } = {
  pageAlerts: [
    {
      id: 'PAGE-01',
      title: 'API 5xx Error Rate Spike',
      condition: 'API 5xx response rate > 1.0% for 3 consecutive minutes',
      severity: 'P1 - On-Call Page',
      runbook: 'RB-04 / RB-02',
      channel: 'PagerDuty / OpsGenie + Emergency SMS',
    },
    {
      id: 'PAGE-02',
      title: 'Payment Gateway Webhook Failure Surge',
      condition: 'Payment webhook failure rate > 2.0% or signature rejection surge',
      severity: 'P1 - On-Call Page',
      runbook: 'RB-05',
      channel: 'PagerDuty / OpsGenie',
    },
    {
      id: 'PAGE-03',
      title: 'Emergency SOS API Degradation or Outage',
      condition: 'SOS endpoint down or p95 response time > 500ms',
      severity: 'P0 - Immediate Executive Page',
      runbook: 'RB-01',
      channel: 'PagerDuty + Phone Call to Primary & Secondary On-Call',
    },
    {
      id: 'PAGE-04',
      title: 'Database Primary Node Failover or High Replication Lag',
      condition: 'MongoDB primary node failover or secondary replication lag > 10s',
      severity: 'P1 - On-Call Page',
      runbook: 'RB-02',
      channel: 'PagerDuty / OpsGenie',
    },
    {
      id: 'PAGE-05',
      title: 'BullMQ Queue Congestion / Backlog Age',
      condition: 'Transactional queue waiting job age > 5 minutes',
      severity: 'P1 - On-Call Page',
      runbook: 'RB-04',
      channel: 'PagerDuty / OpsGenie',
    },
    {
      id: 'PAGE-06',
      title: 'Authentication Anomaly / Credential Stuffing',
      condition: 'Failed authentication attempts > 50 per minute from multiple IPs',
      severity: 'P1 - On-Call Page',
      runbook: 'RB-01',
      channel: 'PagerDuty / Security Incident Channel',
    },
    {
      id: 'PAGE-07',
      title: 'Server Disk or Memory Critical Threshold',
      condition: 'Host or container memory/disk utilization > 90% for 5 minutes',
      severity: 'P1 - On-Call Page',
      runbook: 'RB-03',
      channel: 'PagerDuty / OpsGenie',
    },
    {
      id: 'PAGE-08',
      title: 'TLS / SSL Certificate Expiration Warning',
      condition: 'Production domain SSL certificate expires in < 7 days',
      severity: 'P1 - On-Call Page',
      runbook: 'RB-03',
      channel: 'PagerDuty / OpsGenie',
    },
  ],
  ticketAlerts: [
    {
      id: 'TCK-01',
      title: 'Slow Database Query Detected',
      condition: 'Query execution time exceeds 250ms p95 threshold',
      severity: 'P3 - JIRA Ticket',
      runbook: 'RB-02',
    },
    {
      id: 'TCK-02',
      title: 'Elevated Client 4xx Error Rate',
      condition: '4xx error rate exceeds 5.0% of total traffic',
      severity: 'P3 - JIRA Ticket',
      runbook: 'RB-04',
    },
    {
      id: 'TCK-03',
      title: 'Provider Document Expiration Surge',
      condition: 'Surge in pending re-verification requests (> 100 within 24 hours)',
      severity: 'P3 - Operations Task',
      runbook: 'RB-03',
    },
    {
      id: 'TCK-04',
      title: 'Cloud Cost Anomaly Detected',
      condition: 'Daily cloud expenditure exceeds 20% day-over-day baseline',
      severity: 'P2 - Engineering Task',
      runbook: 'RB-03',
    },
    {
      id: 'TCK-05',
      title: 'Automated Dependency Vulnerability Flagged',
      condition: 'Dependabot / npm audit flags Moderate or Low severity issue',
      severity: 'P3 - Sprint Backlog',
      runbook: 'RB-06',
    },
    {
      id: 'TCK-06',
      title: 'Dead-Letter Queue Message Detected',
      condition: 'Non-critical background worker dead-letter queue count > 0',
      severity: 'P3 - Sprint Task',
      runbook: 'RB-04',
    },
  ],
};

export const COST_BUCKETS: Record<string, CostBucket> = {
  compute: {
    key: 'compute',
    name: 'Compute Infrastructure',
    description: 'Node.js API servers, BullMQ worker containers, frontend hosting',
    driver: 'CPU cores, memory allocation, container runtime hours',
    controlLevers: 'Right-sizing instances, horizontal autoscaling, spot instances for batch background jobs, scale-to-zero preview environments',
  },
  database: {
    key: 'database',
    name: 'MongoDB Atlas',
    description: 'Managed replica set, high-availability disk storage, IOPS, automated backups',
    driver: 'Database tier, IOPS, document storage volume',
    controlLevers: 'Compound index tuning, automated TTL archiving, cold-tier online data storage',
  },
  search: {
    key: 'search',
    name: 'OpenSearch Discovery',
    description: 'Geospatial and text search cluster for provider and catalog discovery',
    driver: 'Cluster node count and shard storage',
    controlLevers: 'Index only public DTO fields, Index Lifecycle Management (ILM), smaller shard sizes',
  },
  cacheAndQueue: {
    key: 'cacheAndQueue',
    name: 'Redis Cache & BullMQ',
    description: 'In-memory caching, rate-limiting counters, and job queues',
    driver: 'RAM consumption and connection count',
    controlLevers: 'Strict TTLs on temporary keys, volatile-lru eviction policies, instance segregation',
  },
  objectStorage: {
    key: 'objectStorage',
    name: 'Cloudinary / S3 & CDN',
    description: 'Medical document storage, doctor profile pictures, clinic imagery',
    driver: 'Storage gigabytes, image transformations, egress bandwidth',
    controlLevers: 'WebP format compression, upload resolution limits, S3 lifecycle archiving',
  },
  messaging: {
    key: 'messaging',
    name: 'Communications (SMS / WhatsApp / Email)',
    description: 'Transactional OTPs, booking confirmation alerts, reminder notifications',
    driver: 'Total message dispatch volume × per-message vendor tariff',
    controlLevers: 'Push-first mobile alerts, DLT template mapping, strict OTP rate limiting, WhatsApp opt-in',
  },
  video: {
    key: 'video',
    name: 'LiveKit Teleconsultation',
    description: 'Encrypted video/audio streaming rooms and TURN relay bandwidth',
    driver: 'Participant-minutes and stream resolution bandwidth',
    controlLevers: 'Audio-first default options, adaptive stream quality, 45-minute hard session limit',
  },
  maps: {
    key: 'maps',
    name: 'Maps & Routing (Valhalla / MapTiler)',
    description: 'Geocoding, address search, route calculations for home visits & ambulances',
    driver: 'Tile renders, geocode queries, and routing API calls',
    controlLevers: 'Self-hosted Valhalla routing engine, browser-side tile caching, lazy map loading',
  },
  payments: {
    key: 'payments',
    name: 'Payment Gateway Interchange',
    description: 'Razorpay / Stripe transaction processing and escrow fees',
    driver: 'Percentage fee + fixed cost per transaction',
    controlLevers: 'UPI payment preference incentives, failed transaction retry dampening, volume discounts',
  },
  verification: {
    key: 'verification',
    name: '3rd-Party Verification & KYC',
    description: 'Medical council registration check, PAN, GSTIN, and bank verification APIs',
    driver: 'Per-lookup API cost',
    controlLevers: 'Permanent caching of verified credentials, verify once upon provider onboarding',
  },
  observability: {
    key: 'observability',
    name: 'Monitoring & Telemetry',
    description: 'Prometheus metrics series, Sentry error tracking, Pino log aggregation',
    driver: 'Log volume gigabytes and monitored events',
    controlLevers: 'Log sampling, log level filtering in production, error deduplication',
  },
  operations: {
    key: 'operations',
    name: 'Support & Human Operations',
    description: 'KYC review staff, field verification agents, 24x7 on-call engineers',
    driver: 'Operational staff headcount and support ticket volume',
    controlLevers: 'Automated document extraction, patient self-service portal, tiered support routing',
  },
};

export const DISASTER_RECOVERY_TIERS = {
  tier1_critical: {
    tier: 'Tier 1 — Mission Critical',
    services: ['Authentication & Session Authority', 'Booking Engine & Slot Hold', 'Payment Webhooks', 'Emergency SOS Dispatch'],
    rpoMinutes: 60,
    rtoMinutes: 120,
    failoverMechanism:
      'Automated multi-AZ database failover, read-only degraded mode for appointment viewing, cached local emergency helpline dialers.',
  },
  tier2_operational: {
    tier: 'Tier 2 — Operational Services',
    services: ['Prescription Dispensing', 'Diagnostic Lab Report Uploads', 'Provider KYC Onboarding', 'Customer Support Chat'],
    rpoMinutes: 240,
    rtoMinutes: 480,
    failoverMechanism:
      'Warm standby worker containers, queue replay from dead-letter logs, manual KYC review backlog processing.',
  },
  tier3_reporting: {
    tier: 'Tier 3 — Analytics & Non-Critical',
    services: ['Superadmin Analytics Dashboards', 'Marketing Email Campaigns', 'Historical Data Export', 'Review Aggregations'],
    rpoMinutes: 1440,
    rtoMinutes: 2880,
    failoverMechanism:
      'Cold backup restoration from daily encrypted snapshots, batch reprocessing from transaction log archives.',
  },
};

export const SRE_RUNBOOKS: SreRunbook[] = [
  {
    id: 'RB-01',
    title: 'JWT_KEYS Active / Retiring Rotation on Credential Compromise',
    severity: 'Sev-1',
    trigger: 'Potential auth secret leak, compromised API token, or scheduled 90-day key rotation.',
    steps: [
      '1. Generate new 256-bit cryptographically secure key pair.',
      '2. Update JWT_KEYS environment variable: append new key with status ACTIVE; mark previous key as RETIRING.',
      '3. Deploy backend configuration without downtime (dual-verification window active).',
      '4. Monitor auth failure metrics for 24 hours to ensure all active user sessions seamlessly refresh.',
      '5. Once all legacy sessions have expired or refreshed, remove the RETIRING key completely.',
    ],
  },
  {
    id: 'RB-02',
    title: 'Database Credential Leak & Primary Replica Failover',
    severity: 'Sev-1',
    trigger: 'Database password exposure in logs, compromised connection string, or primary node hardware fault.',
    steps: [
      '1. Trigger manual failover in MongoDB Atlas to designate a healthy secondary node as primary.',
      '2. Provision fresh database credentials with strict IP allowlisting in Atlas.',
      '3. Update application secrets via Secret Manager and trigger rolling restart of API services.',
      '4. Terminate all previous database user connections.',
      '5. Verify application connectivity and transactional integrity via healthcheck probes.',
    ],
  },
  {
    id: 'RB-03',
    title: 'Cloud Infrastructure & Third-Party Secret Rotation',
    severity: 'Sev-2',
    trigger: 'Scheduled quarterly credential rotation or suspected third-party API token compromise.',
    steps: [
      '1. Generate secondary API credentials in vendor dashboard (Razorpay, Twilio, LiveKit, Cloudinary).',
      '2. Inject secondary keys into staging environment and execute critical E2E tests.',
      '3. Update production secrets via Secret Manager; initiate zero-downtime rolling reload.',
      '4. Verify payment webhooks, SMS delivery, and video room creation via synthetic healthchecks.',
      '5. Revoke legacy credentials in vendor console and log rotation completion in compliance audit register.',
    ],
  },
  {
    id: 'RB-04',
    title: 'BullMQ Queue Congestion & Poison Message Dead-Letter Extraction',
    severity: 'Sev-2',
    trigger: 'Background queue waiting jobs > 5,000 or worker crash loop caused by malformed payload.',
    steps: [
      '1. Scale worker container pool by 2x to absorb backlog spike.',
      '2. Identify repeatedly failing jobs (attempts >= 5) and quarantine them to the Dead-Letter Queue (DLQ).',
      '3. Inspect quarantined payload schema for missing fields or unhandled edge cases.',
      '4. Apply patch to worker consumer validation logic and redeploy.',
      '5. Drain dead-letter queue back into primary processing queue.',
    ],
  },
  {
    id: 'RB-05',
    title: 'Payment Gateway Webhook Discrepancy & Reconciliation Repair',
    severity: 'Sev-1',
    trigger: 'Surge in pending bookings or webhook signature validation mismatches.',
    steps: [
      '1. Verify gateway webhook signing secret in production environment configuration.',
      '2. Run automated reconciliation script: compare internal bookings in PENDING status against gateway API.',
      '3. For successful charges, transition booking state to CONFIRMED and trigger confirmation SMS.',
      '4. For uncaptured authorizations older than 30 minutes, issue automated gateway release.',
      '5. Notify affected patients regarding appointment status confirmation.',
    ],
  },
  {
    id: 'RB-06',
    title: 'Security Breach Incident Response (CERT-In 6-Hour & DPDP Reporting)',
    severity: 'Sev-1',
    trigger: 'Confirmed unauthorized exfiltration of personal data, SQLi/SSRF breach, or ransomware event.',
    steps: [
      '1. Convene Incident Command: isolate compromised systems, revoke active admin sessions, snapshot disk/memory.',
      '2. Engage legal counsel and Data Protection Officer (DPO).',
      '3. File initial incident report with CERT-In within the statutory 6-hour window.',
      '4. Determine data blast radius: identify affected user IDs and categories of personal health data involved.',
      '5. Notify the Data Protection Board of India (DPBI) and affected data principals per DPDP Act Section 8.',
      '6. Publish transparency advisory and implement preventative architecture remediation.',
    ],
  },
  {
    id: 'RB-07',
    title: 'Quarterly Disaster Recovery & Database Restoration Drill (`restore-drill.sh`)',
    severity: 'Sev-2',
    trigger: 'Quarterly scheduled business continuity exercise.',
    steps: [
      '1. Fetch latest encrypted production database snapshot from immutable secondary backup bucket.',
      '2. Restore snapshot to an isolated staging replica set cluster.',
      '3. Run data integrity validation script: verify document counts, index consistency, and checksum matches.',
      '4. Boot test instance of API against restored database and run full integration test suite.',
      '5. Record measured Recovery Time Actual (RTA) against target RTO (target < 120 minutes).',
      '6. Archive drill execution logs and obtain DPO / CTO sign-off for statutory compliance evidence.',
    ],
  },
];

export const HARDENING_GUARDRAILS = {
  smsPumpingDefense: {
    maxDailyOtpPerNumber: 5,
    otpCooldownSeconds: 60,
    enforceGeoAllowlist: ['+91'],
  },
  videoSessionLimits: {
    maxSessionDurationMinutes: 45,
    defaultAudioFirst: true,
  },
  fileUploadHardening: {
    maxUploadSizeBytes: 15 * 1024 * 1024, // 15MB
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
    clamAvScanMandatory: true,
  },
  runtimeContainerSecurity: {
    nonRootUser: 'node',
    readOnlyRootFilesystem: true,
    dropLinuxCapabilities: 'ALL',
    noNewPrivileges: true,
  },
};

export function calculateCostPerThousandBookings(
  costBreakup: Record<string, number> = {},
  bookingCount: number = 0
) {
  const count = Number(bookingCount) || 0;

  let totalCost = 0;
  const breakdown: Array<{
    key: string;
    name: string;
    cost: number;
    driver: string;
    controlLevers: string;
  }> = [];

  for (const [key, bucket] of Object.entries(COST_BUCKETS)) {
    const rawCost = Number(costBreakup[key]) || 0;
    const cost = Math.max(0, rawCost);
    totalCost += cost;
    breakdown.push({
      key,
      name: bucket.name,
      cost,
      driver: bucket.driver,
      controlLevers: bucket.controlLevers,
    });
  }

  const costPerBooking = count > 0 ? Number((totalCost / count).toFixed(2)) : 0;
  const costPerThousandBookings = count > 0 ? Number(((totalCost / count) * 1000).toFixed(2)) : 0;

  return {
    bookingCount: count,
    totalMonthlyCost: Number(totalCost.toFixed(2)),
    costPerBooking,
    costPerThousandBookings,
    breakdown,
    evaluatedAt: new Date().toISOString(),
  };
}

export function evaluateSloCompliance(sloKey: string, observedValue: number) {
  const slo = SLO_DEFINITIONS[sloKey];
  if (!slo) {
    return {
      found: false,
      compliant: false,
      message: `SLO definition for "${sloKey}" not found.`,
    };
  }

  const value = Number(observedValue);
  let compliant = false;

  if (slo.targetP95Ms !== undefined) {
    compliant = value <= slo.targetP95Ms;
  } else if (slo.targetPct !== undefined) {
    compliant = value >= slo.targetPct;
  }

  return {
    found: true,
    sloKey,
    metric: slo.metric,
    sli: slo.sli,
    target: slo.targetStr,
    observedValue: value,
    compliant,
    message: compliant
      ? `${slo.metric}: Observed ${value}${slo.targetP95Ms ? 'ms' : '%'} meets target ${slo.targetStr}.`
      : `${slo.metric}: Observed ${value}${slo.targetP95Ms ? 'ms' : '%'} BREACHES target ${slo.targetStr}!`,
  };
}

export function getAlertRunbookGuide(alertId: string) {
  const pageMatch = ALERTING_RULES.pageAlerts.find((a) => a.id === alertId);
  if (pageMatch) {
    const runbookId = pageMatch.runbook.split(' ')[0];
    const runbook = SRE_RUNBOOKS.find((r) => r.id === runbookId);
    return {
      found: true,
      alert: pageMatch,
      type: 'PAGE',
      runbook,
    };
  }

  const ticketMatch = ALERTING_RULES.ticketAlerts.find((a) => a.id === alertId);
  if (ticketMatch) {
    const runbook = SRE_RUNBOOKS.find((r) => r.id === ticketMatch.runbook);
    return {
      found: true,
      alert: ticketMatch,
      type: 'TICKET',
      runbook,
    };
  }

  return {
    found: false,
    message: `Alert with ID "${alertId}" not found.`,
  };
}
