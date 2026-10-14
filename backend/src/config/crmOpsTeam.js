/**
 * Document 24 — Ops CRM & Team Management Specification
 * "Platform operators marketplace chalate hain; patient ka clinical data CRM me KABHI NAHI aata."
 *
 * Scopes: Supply CRM, Partnerships CRM, Field Ops, Team/Task Management,
 * Command Center, Role-based KPIs, Scoring Engines, and Automation Rules.
 */

export const CRM_NAV_MODULES = [
  {
    id: 'command_center',
    title: 'Command Center',
    path: '/superadmin/crm/command-center',
    purpose: 'Platform progress cockpit: North star metrics, supply funnels, city gates, alerts, and OKRs.',
    coreMetric: 'Completed Bookings / Week per City',
  },
  {
    id: 'supply_pipeline',
    title: 'Supply Pipeline',
    path: '/superadmin/crm/supply-pipeline',
    purpose: 'Provider leads conversion: Identified → Contacted → Demo → Docs → Application → Approved → Activated.',
    coreMetric: 'Lead-to-Activation Velocity & Conversion %',
  },
  {
    id: 'accounts_360',
    title: 'Accounts (Provider 360)',
    path: '/superadmin/crm/accounts',
    purpose: 'Live provider single view: Health score (0-100), bookings, no-show rate, licence expiries, ticket history.',
    coreMetric: 'Provider Health Score & 90-Day Retention %',
  },
  {
    id: 'partnerships',
    title: 'Partnerships CRM',
    path: '/superadmin/crm/partnerships',
    purpose: 'Institutional pipeline: RWAs, Corporates, NGOs, Associations, Schools, Insurers, Govt departments.',
    coreMetric: 'MoUs Signed & Camp Attendees / Registrations',
  },
  {
    id: 'field_ops',
    title: 'Field Ops & White-Space',
    path: '/superadmin/crm/field-ops',
    purpose: 'Territories, daily route planning, duty check-ins, collateral kit inventory, white-space demand mapping.',
    coreMetric: 'Field Visits / Day & White-Space Coverage %',
  },
  {
    id: 'tasks_followups',
    title: 'Tasks & Follow-ups',
    path: '/superadmin/crm/tasks',
    purpose: 'Unified task engine across Leads, Accounts, Partners, and KYC with SLA timers and auto-escalations.',
    coreMetric: 'SLA Adherence % & Overdue Task Count',
  },
  {
    id: 'campaigns_camps',
    title: 'Campaigns & Health Camps',
    path: '/superadmin/crm/campaigns',
    purpose: 'Events and camps pipeline from ideation to post-camp follow-up with UTM/QR booking attribution.',
    coreMetric: 'Cost per Attendee & OPD Conversion %',
  },
  {
    id: 'team_management',
    title: 'Team & People Management',
    path: '/superadmin/crm/team',
    purpose: 'Platform team roster, roles, capacity, onboarding checklists, training, and 1:1 meeting feedback.',
    coreMetric: 'Workload Balance % & Training Certification Rate',
  },
  {
    id: 'goals_okrs',
    title: 'Goals & OKRs',
    path: '/superadmin/crm/goals-okrs',
    purpose: 'Objectives and Key Results at company, city, team, and person levels linked to live metric targets.',
    coreMetric: 'Quarterly OKR Confidence & Completion %',
  },
  {
    id: 'projects_roadmap',
    title: 'Projects & Roadmap',
    path: '/superadmin/crm/projects-roadmap',
    purpose: 'Engineering sprint/release tracker, phases R-1 to R4 mapping, and executive decision log.',
    coreMetric: 'Milestone Delivery On-Time Rate %',
  },
  {
    id: 'playbooks_knowledge',
    title: 'Playbooks & Knowledge',
    path: '/superadmin/crm/playbooks',
    purpose: 'SOP library, objection handling scripts, WhatsApp/email templates, and city launch playbooks.',
    coreMetric: 'Playbook Adoption & SOP Compliance %',
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    path: '/superadmin/crm/reports',
    purpose: 'Scheduled and custom ops reports, provider cohort retention, and pipeline forecasting.',
    coreMetric: 'Operational Hygiene & Supply Funnel Efficiency',
  },
  {
    id: 'crm_settings',
    title: 'CRM Settings',
    path: '/superadmin/crm/settings',
    purpose: 'Pipelines configuration, custom fields, lead sources, scoring rules, automation triggers, and IAM.',
    coreMetric: 'System Automation Health & Audit Integrity',
  },
];

export const HYBRID_ARCHITECTURE_DECISION = {
  approach: 'Hybrid (Build Core Supply/Ops + Buy/Integrate Generic SaaS)',
  rationale: 'Core supply and partnership workflows tightly couple with platform applications, KYC vetting, booking fulfillment, reviews, and payouts. Generic tools lack native healthcare taxonomy and multi-tenant marketplace linkages.',
  buildInHouse: [
    'Supply CRM (Leads → KYC → Live Onboarding)',
    'Accounts 360 (Provider Health Score & Performance)',
    'Partnership CRM (RWAs, Corporates, Camp Logistics)',
    'Field Ops & Territory White-Space Mapping',
    'Platform Progress Cockpit (Command Center)',
    'Unified SLA Task Engine & Playbooks Library',
  ],
  buyOrIntegrate: [
    'HR & Payroll / Statutory Compliance (Keep platform team salary strictly out of app)',
    'Engineering Issue Tracker (Link with Jira / Linear / GitHub Projects)',
    'Docs & Internal Wiki (Notion / Google Workspace)',
    'Telephony & Cloud Contact Center (Exotel / Twilio / Knowlarity)',
  ],
  externalToolGuardrails: [
    'Strictly Zero PHI (Patient health information never synced to external tools)',
    'Signed Data Processing Agreements (DPA) with explicit India data residency where mandated',
    'SSO + Mandatory 2FA for all administrative logins',
    'Automated offboarding access revocation upon role cessation',
    'Minimum field synchronization (Least-privilege API payloads)',
  ],
};

export const SUPPLY_PIPELINE_STAGES = [
  {
    stage: 'identified',
    label: '1. Identified',
    slaDays: null,
    exitCriteria: 'Clinic/doctor name, category, area, and primary contact phone/email captured.',
  },
  {
    stage: 'contacted',
    label: '2. Contacted',
    slaDays: 2,
    exitCriteria: 'First introductory phone call or field visit completed and logged.',
  },
  {
    stage: 'interested',
    label: '3. Interested',
    slaDays: 5,
    exitCriteria: 'Positive intent confirmed and primary decision maker (doctor/owner) identified.',
  },
  {
    stage: 'demo_done',
    label: '4. Demo / Visit Done',
    slaDays: 7,
    exitCriteria: 'Platform walkthrough demonstrated; commercial objections and fee model discussed.',
  },
  {
    stage: 'docs_collected',
    label: '5. Docs Collected',
    slaDays: 7,
    exitCriteria: 'Medical council registration, clinic photo, drug license (if pharmacy), and PAN collected.',
  },
  {
    stage: 'application_submitted',
    label: '6. Application Submitted',
    slaDays: 3,
    exitCriteria: 'Online join wizard submitted; linked ProviderApplication record generated.',
  },
  {
    stage: 'under_review',
    label: '7. Under Review',
    slaDays: 2,
    exitCriteria: 'KYC review team verifying documents against official medical councils / drug registries.',
  },
  {
    stage: 'approved',
    label: '8. Approved',
    slaDays: 1,
    exitCriteria: 'Provider verified on platform; welcome onboarding kit and credentials issued.',
  },
  {
    stage: 'activated',
    label: '9. Activated',
    slaDays: 14,
    exitCriteria: 'Profile completeness >= 80%, slots published, and first patient booking completed.',
  },
  {
    stage: 'active',
    label: '10. Active',
    slaDays: null,
    exitCriteria: 'Consistently fulfilling bookings with average rating >= 4.0 and active licence validity.',
  },
];

export const LOST_REASONS = [
  'NOT_INTERESTED',
  'FEE_COMMISSION_CONCERN',
  'TECH_BARRIER_UNWILLING',
  'COMPETITOR_EXCLUSIVE',
  'NO_SUPPLY_FIT',
  'UNVERIFIABLE_DOCUMENTS',
  'UNRESPONSIVE_OVER_30D',
  'REGULATORY_LEGAL_BARRIER',
  'OTHER',
];

export const PARTNERSHIP_STAGES = [
  { stage: 'identified', label: 'Identified', exitCriteria: 'Target organisation, category, and size identified.' },
  { stage: 'intro_done', label: 'Intro Done', exitCriteria: 'Introductory pitch delivered to secretary / HR head.' },
  { stage: 'proposal_sent', label: 'Proposal Sent', exitCriteria: 'Custom camp / corporate wellness package submitted.' },
  { stage: 'negotiation', label: 'Negotiation', exitCriteria: 'Budget, date, doctor participation, and logistics aligned.' },
  { stage: 'mou_signed', label: 'MoU Signed', exitCriteria: 'Formal memorandum of understanding executed.' },
  { stage: 'pilot_event', label: 'Pilot / First Event', exitCriteria: 'First on-ground health camp or screening drive executed.' },
  { stage: 'active', label: 'Active Partner', exitCriteria: 'Recurring camps scheduled with tracking QR codes.' },
  { stage: 'renewal_expansion', label: 'Renewal / Expansion', exitCriteria: 'Annual contract renewal or multi-branch rollout.' },
  { stage: 'lost', label: 'Lost / Inactive', exitCriteria: 'Declined proposal or unrenewed agreement.' },
];

export const LEAD_SCORING_WEIGHTS = {
  categoryPriority: 25, // High demand gap (Dentist, Paediatrician, Diagnostic, Physio)
  sizeVolumePotential: 20, // Estimated OPD footfall > 30 patients/day
  decisionMakerAccess: 15, // Direct contact with doctor-owner vs receptionist
  digitalReadiness: 10, // Uses WhatsApp/online billing vs pure paper
  proximityToCluster: 10, // Within 3 km of active patient demand cluster
  responsiveness: 10, // Responded to outreach within 24 hours
  docsReadiness: 10, // Has registration certificates and bank account ready
};

export const PROVIDER_HEALTH_WEIGHTS = {
  bookingsTrend: 25, // 30-day booking volume vs previous period
  ratingScore: 20, // Patient review rating (out of 5.0)
  responseTime: 15, // Slot confirmation & query response latency
  noShowCancelRate: 15, // Percentage of missed or provider-cancelled visits
  profileCompleteness: 10, // Bio, photos, services, pricing, operating hours
  docsValidity: 10, // Days until nearest license / registration expiry
  supportDisputeLoad: 5, // Open disputes or complaints in last 30 days
};

export const ROLE_BASED_KPIS = [
  {
    role: 'field_executive',
    title: 'Field Operations Executive',
    department: 'Supply Operations',
    quantityKpis: ['Visits per day (Target: 6-8)', 'New leads created per week (Target: 15)', 'Applications submitted (Target: 5/wk)'],
    qualityKpis: ['Application KYC approval rate (>= 85%)', 'Onboarding doc completeness (>= 90%)', 'Activation within 14 days (>= 50%)', 'Provider onboarding NPS (>= 60)'],
  },
  {
    role: 'provider_success',
    title: 'Provider Success Manager (PSM)',
    department: 'Account Management',
    quantityKpis: ['Active accounts managed (Target: 35-50)', 'Proactive monthly check-ins completed', 'Profile optimization audits'],
    qualityKpis: ['90-day provider retention rate (>= 88%)', 'Monthly booking growth per account (>= 15%)', 'Provider cancellation rate (<= 4%)', 'Complaint ticket frequency (< 2%)'],
  },
  {
    role: 'kyc_reviewer',
    title: 'Provider KYC Reviewer',
    department: 'Compliance & Verification',
    quantityKpis: ['Applications reviewed per day (Target: 25)', 'Re-verification requests processed'],
    qualityKpis: ['Turnaround Time vs SLA (<= 24 hours)', 'Review accuracy in peer audits (>= 98%)', 'Re-open rate due to missed verification (<= 3%)'],
  },
  {
    role: 'support_agent',
    title: 'Customer Support Specialist',
    department: 'Customer Care',
    quantityKpis: ['Tickets resolved per shift (Target: 40-50)', 'Call handles completed'],
    qualityKpis: ['First Response Time (<= 5 min chat / <= 1 hr ticket)', 'Customer Satisfaction CSAT (>= 4.4/5)', 'Reopen rate (<= 6%)', 'QA score (>= 90%)'],
  },
  {
    role: 'camps_lead',
    title: 'Partnerships & Health Camps Lead',
    department: 'Strategic Partnerships',
    quantityKpis: ['Partners signed per month (Target: 4)', 'Health camps executed (Target: 8/month)'],
    qualityKpis: ['Camp attendees / registrations ratio (>= 75%)', 'Downstream OPD conversions (>= 12%)', 'Cost per attendee (<= target budget)', 'Partner NPS (>= 70)'],
  },
  {
    role: 'city_manager',
    title: 'City General Manager',
    department: 'Regional Leadership',
    quantityKpis: ['Total active supply added per month', 'City weekly completed bookings', 'Territory coverage percentage'],
    qualityKpis: ['Slot fill rate (>= 65%)', '30-day patient repeat rate (>= 28%)', 'Zero critical clinical safety incidents', 'Gross contribution margin positivity'],
  },
  {
    role: 'finance_ops',
    title: 'Settlements & Finance Executive',
    department: 'Finance & Treasury',
    quantityKpis: ['Weekly payout runs processed', 'Gateway reconciliation cycles closed'],
    qualityKpis: ['Zero unresolved bank reconciliation mismatches', 'Payout execution TAT (<= 48 hrs from cycle)', 'Chargeback / refund dispute rate (<= 0.5%)'],
  },
  {
    role: 'trust_safety',
    title: 'Trust, Safety & Moderation Specialist',
    department: 'Trust & Safety',
    quantityKpis: ['Reviews & feedback tickets moderated', 'Abuse and fake listing flags triaged'],
    qualityKpis: ['Moderation SLA compliance (<= 4 hours)', 'Second-review audit consistency (>= 96%)', 'Appeal overturn rate (<= 5%)'],
  },
];

export const AUTOMATION_WORKFLOW_RULES = [
  {
    id: 'AUTO-01',
    trigger: 'New lead created by field executive',
    action: 'Dedupe check (phone/geo) → Assign territory owner → Create task: "Call lead within 24 hours"',
    slaHours: 24,
  },
  {
    id: 'AUTO-02',
    trigger: 'Lead idle in current stage exceeding SLA',
    action: 'Notify lead owner → If idle >= 2x SLA, escalate alert to City Manager',
    slaHours: 48,
  },
  {
    id: 'AUTO-03',
    trigger: 'Provider application submitted on platform',
    action: 'Auto-advance lead to "Application submitted" → Create verification task for KYC team → Notify owner',
    slaHours: 4,
  },
  {
    id: 'AUTO-04',
    trigger: 'Application approved by KYC team',
    action: 'Advance stage to "Approved" → Generate Activation Checklist tasks → Send welcome WhatsApp template',
    slaHours: 1,
  },
  {
    id: 'AUTO-05',
    trigger: 'No patient booking within 14 days of approval',
    action: 'Mark account as "At-Risk" → Create priority task for Provider Success Manager to audit pricing & slots',
    slaHours: 24,
  },
  {
    id: 'AUTO-06',
    trigger: 'Provider document expiring in 60, 30, or 7 days',
    action: 'Auto-create renewal task → Send automated doc update link via WhatsApp / Email → Escalate if expiring in 7d',
    slaHours: 24,
  },
  {
    id: 'AUTO-07',
    trigger: 'Provider average rating drops below 3.8 or complaint spike',
    action: 'Flag account as "Quality Watch" → Create review task for Trust & Safety → Restrict featured promotion',
    slaHours: 12,
  },
  {
    id: 'AUTO-08',
    trigger: 'Institutional partner moves to "MoU Signed"',
    action: 'Create camp planning tasks → Assign designated Health Camp Coordinator → Draft venue logistics',
    slaHours: 24,
  },
  {
    id: 'AUTO-09',
    trigger: 'Task past due date without completion',
    action: 'Send automated push notification to assignee → Escalate to reporting Team Lead if overdue > 24 hours',
    slaHours: 24,
  },
  {
    id: 'AUTO-10',
    trigger: 'Health camp event concluded',
    action: 'Task coordinator to upload attendee manifest & clinical summary report → Trigger consent-based follow-up',
    slaHours: 48,
  },
  {
    id: 'AUTO-11',
    trigger: 'Team member approved leave begins',
    action: 'Auto-reassign open urgent tasks and lead follow-ups to designated backup team member',
    slaHours: 2,
  },
  {
    id: 'AUTO-12',
    trigger: 'Provider marked as churned / lost',
    action: 'Mandate lost reason code entry → Schedule exit interview task → Queue for win-back campaign in 90 days',
    slaHours: 24,
  },
];

export const CRM_ROLE_PERMISSIONS_MATRIX = [
  { role: 'superadmin', leads: 'All', accounts: 'All', partners: 'All', tasks: 'All', team: 'All (No HR Salary)', okrs: 'All', reports: 'All' },
  { role: 'city_manager', leads: 'City Territory', accounts: 'City Territory', partners: 'City Territory', tasks: 'City Territory', team: 'City Team', okrs: 'City OKRs', reports: 'City' },
  { role: 'team_lead', leads: 'Team Leads', accounts: 'Team Accounts', partners: 'Team Partners', tasks: 'Team Tasks', team: 'Team Members', okrs: 'Team OKRs', reports: 'Team' },
  { role: 'field_executive', leads: 'Assigned + Territory', accounts: 'Assigned', partners: 'Own Partners', tasks: 'Own Tasks', team: 'Self', okrs: 'Self', reports: 'Self' },
  { role: 'provider_success', leads: 'Assigned Pipeline', accounts: 'Assigned 360', partners: 'None', tasks: 'Own Tasks', team: 'Self', okrs: 'Self', reports: 'Own Accounts' },
  { role: 'kyc_reviewer', leads: 'Applications Only', accounts: 'KYC View Only', partners: 'None', tasks: 'KYC Tasks', team: 'Self', okrs: 'Self', reports: 'KYC TAT' },
  { role: 'finance_admin', leads: 'None', accounts: 'Payout Fields Only', partners: 'None', tasks: 'Finance Tasks', team: 'Self', okrs: 'Self', reports: 'Financials' },
  { role: 'auditor', leads: 'Aggregate Only', accounts: 'Aggregate Only', partners: 'Aggregate Only', tasks: 'None', team: 'None', okrs: 'Read Only', reports: 'Aggregate' },
];

/**
 * Calculates a Lead Priority Score (0-100) based on commercial readiness
 */
export function calculateLeadScore(factors = {}) {
  const {
    isPriorityCategory = false,
    estDailyFootfall = 0,
    hasDirectDecisionMakerAccess = false,
    isDigitallyReady = false,
    isCloseToCluster = false,
    hasFastResponse = false,
    hasDocsReady = false,
  } = factors;

  let score = 0;
  if (isPriorityCategory) score += LEAD_SCORING_WEIGHTS.categoryPriority;
  if (estDailyFootfall >= 30) score += LEAD_SCORING_WEIGHTS.sizeVolumePotential;
  else if (estDailyFootfall >= 15) score += Math.round(LEAD_SCORING_WEIGHTS.sizeVolumePotential * 0.6);
  if (hasDirectDecisionMakerAccess) score += LEAD_SCORING_WEIGHTS.decisionMakerAccess;
  if (isDigitallyReady) score += LEAD_SCORING_WEIGHTS.digitalReadiness;
  if (isCloseToCluster) score += LEAD_SCORING_WEIGHTS.proximityToCluster;
  if (hasFastResponse) score += LEAD_SCORING_WEIGHTS.responsiveness;
  if (hasDocsReady) score += LEAD_SCORING_WEIGHTS.docsReadiness;

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculates a Provider Composite Health Score (0-100) and health band
 */
export function calculateProviderHealthScore(metrics = {}) {
  const {
    monthlyBookings = 0,
    prevMonthlyBookings = 0,
    averageRating = 5.0,
    avgResponseMinutes = 15,
    cancellationRatePercent = 0,
    profileCompletenessPercent = 100,
    daysUntilDocExpiry = 365,
    openDisputesCount = 0,
  } = metrics;

  let score = 0;

  // 1. Bookings trend (25 pts)
  if (monthlyBookings > 0) {
    if (monthlyBookings >= prevMonthlyBookings) score += PROVIDER_HEALTH_WEIGHTS.bookingsTrend;
    else score += Math.round(PROVIDER_HEALTH_WEIGHTS.bookingsTrend * Math.max(0.2, monthlyBookings / Math.max(1, prevMonthlyBookings)));
  }

  // 2. Rating (20 pts) - rating >= 4.5 gives full, drops linearly below
  const ratingRatio = Math.max(0, Math.min(1, (averageRating - 2.5) / 2.0));
  score += Math.round(PROVIDER_HEALTH_WEIGHTS.ratingScore * ratingRatio);

  // 3. Response time (15 pts) - <= 15 min gives full, drops for slower responses
  if (avgResponseMinutes <= 15) score += PROVIDER_HEALTH_WEIGHTS.responseTime;
  else if (avgResponseMinutes <= 60) score += Math.round(PROVIDER_HEALTH_WEIGHTS.responseTime * 0.7);
  else if (avgResponseMinutes <= 180) score += Math.round(PROVIDER_HEALTH_WEIGHTS.responseTime * 0.4);

  // 4. Cancel / No-show rate (15 pts) - <= 3% gives full
  if (cancellationRatePercent <= 3) score += PROVIDER_HEALTH_WEIGHTS.noShowCancelRate;
  else if (cancellationRatePercent <= 8) score += Math.round(PROVIDER_HEALTH_WEIGHTS.noShowCancelRate * 0.6);
  else if (cancellationRatePercent <= 15) score += Math.round(PROVIDER_HEALTH_WEIGHTS.noShowCancelRate * 0.2);

  // 5. Profile completeness (10 pts)
  score += Math.round(PROVIDER_HEALTH_WEIGHTS.profileCompleteness * (Math.min(100, profileCompletenessPercent) / 100));

  // 6. Docs validity (10 pts) - > 60 days gives full, < 15 days gives 0
  if (daysUntilDocExpiry > 60) score += PROVIDER_HEALTH_WEIGHTS.docsValidity;
  else if (daysUntilDocExpiry > 30) score += Math.round(PROVIDER_HEALTH_WEIGHTS.docsValidity * 0.7);
  else if (daysUntilDocExpiry > 15) score += Math.round(PROVIDER_HEALTH_WEIGHTS.docsValidity * 0.3);

  // 7. Support / dispute load (5 pts) - 0 disputes gives full
  if (openDisputesCount === 0) score += PROVIDER_HEALTH_WEIGHTS.supportDisputeLoad;
  else if (openDisputesCount === 1) score += Math.round(PROVIDER_HEALTH_WEIGHTS.supportDisputeLoad * 0.5);

  score = Math.min(100, Math.max(0, score));

  let healthBand = 'at_risk';
  if (score >= 75) healthBand = 'healthy';
  else if (score >= 50) healthBand = 'watch';

  return {
    score,
    healthBand, // 'healthy' | 'watch' | 'at_risk'
    isHealthy: score >= 75,
    isAtRisk: score < 50,
  };
}
