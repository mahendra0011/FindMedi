/**
 * File 48 (Part A) — Platform, Trust & Governance role dashboards.
 *
 * Spec-driven dashboards for the platform/trust ops roles that previously had
 * no dedicated configuration. Every KPI starts as an em-dash placeholder so the
 * universal renderer never invents a measurement; live values are merged in by
 * `useLiveKpis` from the matching endpoints.
 */
import type { HmsDashboardConfig } from './hmsDashboardSpec';

export interface ExtraSpecSeed {
  roleKey: string;
  title: string;
  subtitle: string;
  layer?: 1 | 2 | 3 | 4 | 5 | 6;
  layerName?: string;
  permissions: string[];
  sidebarSections: string[];
  kpis: Array<[label: string, hint: string]>;
  tasks: string[];
  alerts: Array<[text: string, level: 'info' | 'warn' | 'urgent']>;
  workQueues: string[];
  quickActions: string[];
  domainModules: Array<[key: string, emoji: string, label: string, description: string, ctaLabel: string, ctaHref: string]>;
}

/** Build a shell-compatible config from a compact seed (keeps specs terse). */
export function buildDashboardSpec(seed: ExtraSpecSeed): HmsDashboardConfig {
  return {
    roleKey: seed.roleKey,
    layer: seed.layer ?? 6,
    layerName: seed.layerName ?? 'Platform & Marketplace',
    title: seed.title,
    subtitle: seed.subtitle,
    permissions: seed.permissions,
    sidebarSections: seed.sidebarSections,
    kpis: seed.kpis.map(([label, hint]) => ({ label, value: '—', hint })),
    tasks: seed.tasks.map((text, i) => ({ id: `${seed.roleKey}-t${i + 1}`, text })),
    alerts: seed.alerts.map(([text, level], i) => ({ id: `${seed.roleKey}-a${i + 1}`, text, level })),
    workQueues: seed.workQueues,
    quickActions: seed.quickActions,
    domainModules: seed.domainModules.map(([key, emoji, label, description, ctaLabel, ctaHref]) => ({
      key, emoji, label, description, ctaLabel, ctaHref,
    })),
  };
}

export const PLATFORM_TRUST_SPECS: Record<string, HmsDashboardConfig> = {
  platform_admin: buildDashboardSpec({
    roleKey: 'platform_admin',
    title: 'Platform Admin Dashboard',
    subtitle: 'Day-to-day platform operations, tenant health, rollout rings and incidents',
    permissions: ['platform:manage', 'tenants:read', 'flags:manage', 'incidents:manage'],
    sidebarSections: ['Dashboard', 'Tenants', 'Feature Flags', 'Incidents', 'Announcements'],
    kpis: [
      ['Healthy Tenants', 'Tenants with green health score'],
      ['Open Escalations', 'Escalations awaiting platform action'],
      ['Active Rollouts', 'Feature flags in canary or ring rollout'],
      ['Open Incidents', 'Unresolved platform incidents'],
    ],
    tasks: [
      'Review tenant health exceptions raised overnight',
      'Promote canary feature flags after smoke verification',
      'Publish maintenance window to affected tenants',
    ],
    alerts: [
      ['Incident severity upgraded — notify tenant admins', 'urgent'],
      ['Feature flag rollout error rate above threshold', 'warn'],
    ],
    workQueues: ['Tenant Escalations', 'Flag Rollout Ring', 'Tenant Change Requests', 'Platform Incidents'],
    quickActions: ['Toggle Feature Flag', 'Open Tenant 360', 'Create Announcement', 'Open Incident'],
    domainModules: [
      ['tenants', '🏢', 'Tenant 360', 'Plan, usage, health and billing for each tenant.', 'Open Tenants', '/superadmin/facilities'],
      ['flags', '🚩', 'Feature Flags', 'Canary-to-all rollout rings per tenant.', 'Open Flags', '/superadmin/settings'],
    ],
  }),

  support_l1: buildDashboardSpec({
    roleKey: 'support_l1',
    title: 'Support Agent L1 Dashboard',
    subtitle: 'First-line ticket inbox with SLA timers and canned replies',
    permissions: ['support:tickets', 'support:reply'],
    sidebarSections: ['Dashboard', 'Inbox', 'SLA', 'Knowledge Base'],
    kpis: [
      ['Open Tickets', 'Tickets assigned or unassigned in L1'],
      ['First Response Time', 'Average first response (minutes)'],
      ['Resolved Today', 'Tickets closed by this agent today'],
      ['CSAT', 'Customer satisfaction for L1 closures'],
    ],
    tasks: [
      'Triage unassigned tickets older than 15 minutes',
      'Reply to pending customer follow-ups',
      'Escalate tickets breaching SLA to L2',
    ],
    alerts: [
      ['SLA breach in under 15 minutes', 'urgent'],
      ['Unassigned ticket queue above threshold', 'warn'],
    ],
    workQueues: ['My Queue', 'Unassigned Tickets', 'SLA At Risk', 'Knowledge Base Drafts'],
    quickActions: ['Reply to Ticket', 'Escalate to L2', 'Merge Tickets', 'Open Knowledge Base'],
    domainModules: [
      ['inbox', '🎧', 'Ticket Inbox', 'SLA-aware inbox with canned replies in Hindi and English.', 'Open Inbox', '/superadmin/tickets'],
      ['kb', '📚', 'Knowledge Base', 'Approved macros and troubleshooting playbooks.', 'Open KB', '/admin/knowledge-base'],
    ],
  }),

  support_l2: buildDashboardSpec({
    roleKey: 'support_l2',
    title: 'Support Specialist L2 Dashboard',
    subtitle: 'Escalations, refunds and disputes requiring specialist handling',
    permissions: ['support:tickets', 'support:escalations', 'refunds:request', 'disputes:manage'],
    sidebarSections: ['Dashboard', 'Escalations', 'Refunds', 'Disputes'],
    kpis: [
      ['Open Escalations', 'Tickets escalated from L1'],
      ['Refunds Pending', 'Refund requests awaiting decision'],
      ['Dispute Age', 'Average dispute age (days)'],
      ['Resolution Time', 'Average L2 resolution time (hours)'],
    ],
    tasks: [
      'Review high-value refunds above agent limit',
      'Update dispute timeline for open cases',
      'Hand off product defects to engineering',
    ],
    alerts: [
      ['SLA breach on an escalated ticket', 'urgent'],
      ['High-value refund requires approval', 'warn'],
    ],
    workQueues: ['Escalated Queue', 'Refund Approvals', 'Dispute Cases', 'Provider Contact Queue'],
    quickActions: ['Approve Refund', 'Escalate to L3', 'Request Evidence', 'Open Dispute'],
    domainModules: [
      ['escalations', '🔺', 'Escalation Desk', 'Escalated tickets with full conversation context.', 'Open Escalations', '/superadmin/tickets'],
      ['disputes', '⚖️', 'Dispute Timeline', 'Chronological case file with provider contact tools.', 'Open Disputes', '/superadmin/disputes'],
    ],
  }),

  support_agent: buildDashboardSpec({
    roleKey: 'support_agent',
    title: 'Support Agent Dashboard',
    subtitle: 'Shared support queue for tickets, refunds and dispute triage',
    permissions: ['support:tickets', 'support:reply'],
    sidebarSections: ['Dashboard', 'Inbox', 'Tickets', 'Knowledge Base'],
    kpis: [
      ['Open Tickets', 'Assigned tickets across channels'],
      ['SLA At Risk', 'Tickets nearing first-response SLA'],
      ['Resolved Today', 'Tickets closed today'],
      ['CSAT', 'Rolling customer satisfaction'],
    ],
    tasks: [
      'Clear unassigned ticket queue',
      'Tag tickets with correct category and priority',
      'Route billing disputes to the finance desk',
    ],
    alerts: [
      ['Ticket SLA about to breach', 'urgent'],
      ['Repeated complaint from same account', 'warn'],
    ],
    workQueues: ['My Queue', 'Unassigned Tickets', 'Refund Requests', 'Dispute Intake'],
    quickActions: ['Reply to Ticket', 'Create Ticket', 'Escalate', 'Open Knowledge Base'],
    domainModules: [
      ['inbox', '🎧', 'Ticket Inbox', 'Multi-channel support inbox with SLA timers.', 'Open Inbox', '/superadmin/tickets'],
      ['kb', '📚', 'Knowledge Base', 'Canned replies and escalation playbooks.', 'Open KB', '/admin/knowledge-base'],
    ],
  }),

  moderator: buildDashboardSpec({
    roleKey: 'moderator',
    title: 'Content Moderator Dashboard',
    subtitle: 'Review, listing and community moderation queue',
    permissions: ['moderation:review', 'moderation:action'],
    sidebarSections: ['Dashboard', 'Queue', 'Reports', 'Appeals'],
    kpis: [
      ['Queue Size', 'Items awaiting moderation'],
      ['Avg Review Time', 'Median review time (minutes)'],
      ['Approve / Reject Ratio', 'Decision mix for the last 7 days'],
      ['Abuse Reports', 'Open abuse reports on content'],
    ],
    tasks: [
      'Review reported listings with policy context',
      'Process appeals filed against prior decisions',
      'Escalate coordinated abuse clusters to trust team',
    ],
    alerts: [
      ['Abuse report spike detected', 'urgent'],
      ['Moderation queue age above target', 'warn'],
    ],
    workQueues: ['Review Moderation', 'Reported Listings', 'Provider Media Review', 'Appeals'],
    quickActions: ['Approve Content', 'Reject With Reason', 'Ban Account', 'Open Policy Sheet'],
    domainModules: [
      ['queue', '🛡️', 'Moderation Queue', 'Policy cheat-sheet and bulk decision actions.', 'Open Queue', '/superadmin/moderation'],
      ['community', '💬', 'Community Reports', 'Community flagged posts and abuse reports.', 'Open Reports', '/moderation/community'],
    ],
  }),

  kyc_reviewer: buildDashboardSpec({
    roleKey: 'kyc_reviewer',
    title: 'KYC Reviewer Dashboard',
    subtitle: 'Provider verification, licence checks and re-KYC expiry watch',
    permissions: ['kyc:review', 'onboarding:review'],
    sidebarSections: ['Dashboard', 'KYC Queue', 'Re-KYC', 'Registry Checks'],
    kpis: [
      ['Pending KYC', 'Applications awaiting review'],
      ['Avg TAT', 'Average verification turnaround (hours)'],
      ['Approve Rate', 'Approved share of decisions'],
      ['Expiring Documents', 'Verified documents expiring in 30 days'],
    ],
    tasks: [
      'Verify provider licences against council registries',
      'Request missing documents from applicants',
      'Queue re-KYC reminders for expiring documents',
    ],
    alerts: [
      ['KYC TAT breach on a pending application', 'urgent'],
      ['Provider document expires within 30 days', 'warn'],
    ],
    workQueues: ['Pending KYC', 'Resubmissions', 'Expiry Watch', 'Registry Cross-Checks'],
    quickActions: ['Approve KYC', 'Request Documents', 'Reject With Reason', 'Open Registry Check'],
    domainModules: [
      ['kyc', '🪪', 'KYC Queue', 'Document viewer with masked IDs and registry checks.', 'Open KYC', '/superadmin/kyc-command'],
      ['onboarding', '📋', 'Onboarding Pipeline', 'Provider-type onboarding checklists.', 'Open Onboarding', '/superadmin/join-applications'],
    ],
  }),

  content_editor: buildDashboardSpec({
    roleKey: 'content_editor',
    title: 'Content Editor Dashboard',
    subtitle: 'Health content drafts, medical review and SEO publishing',
    permissions: ['content:write', 'content:publish'],
    sidebarSections: ['Dashboard', 'Drafts', 'Review', 'Published', 'SEO'],
    kpis: [
      ['Drafts In Progress', 'Articles not yet submitted'],
      ['Published This Month', 'Live articles in the current month'],
      ['Pending Medical Review', 'Articles awaiting clinician sign-off'],
      ['Organic Traffic', 'Sessions on published content'],
    ],
    tasks: [
      'Submit clinically sensitive drafts for medical review',
      'Localise approved articles to Hindi',
      'Refresh SEO metadata on top landing pages',
    ],
    alerts: [
      ['Medical review overdue for a scheduled article', 'warn'],
      ['Article contains unverified clinical claim', 'urgent'],
    ],
    workQueues: ['Draft Queue', 'Medical Review Queue', 'Translation Queue', 'SEO Fix List'],
    quickActions: ['New Article', 'Submit For Review', 'Publish', 'Open SEO Fields'],
    domainModules: [
      ['content', '✍️', 'Content Studio', 'Draft, review and publish health content.', 'Open Content', '/superadmin/legal'],
      ['seo', '🔎', 'SEO Console', 'Schema, alternate links and organic performance.', 'Open SEO', '/analytics-reports'],
    ],
  }),

  catalog_manager: buildDashboardSpec({
    roleKey: 'catalog_manager',
    title: 'Catalogue Manager Dashboard',
    subtitle: 'Taxonomy, specialties, test catalogue and price approvals',
    permissions: ['catalog:manage', 'catalog:approve'],
    sidebarSections: ['Dashboard', 'Taxonomy', 'Items', 'Imports'],
    kpis: [
      ['Categories & Specialties', 'Active taxonomy nodes'],
      ['Items Pending Approval', 'Catalogue changes awaiting approval'],
      ['Duplicates Found', 'Potential duplicate entries'],
      ['Price Changes Pending', 'Price updates awaiting sign-off'],
    ],
    tasks: [
      'Resolve duplicate specialty clusters',
      'Approve staged catalogue imports after dry-run',
      'Review pending price change requests',
    ],
    alerts: [
      ['Duplicate catalogue cluster detected', 'warn'],
      ['Import job failed validation', 'urgent'],
    ],
    workQueues: ['Approval Queue', 'Duplicate Review', 'Price Change Requests', 'Import Jobs'],
    quickActions: ['Add Category', 'Merge Duplicates', 'Approve Price Change', 'Run Import Dry-Run'],
    domainModules: [
      ['taxonomy', '🌳', 'Taxonomy Tree', 'Specialties, groups and category hierarchy.', 'Open Taxonomy', '/superadmin/categories'],
      ['catalog', '🗂️', 'Catalogue Items', 'Tests, packages and service catalogue items.', 'Open Catalogue', '/superadmin/catalog'],
    ],
  }),

  city_manager: buildDashboardSpec({
    roleKey: 'city_manager',
    title: 'City Manager Dashboard',
    subtitle: 'Local supply/demand, provider onboarding and city operations',
    permissions: ['city:manage', 'providers:onboard', 'analytics:read'],
    sidebarSections: ['Dashboard', 'Map', 'Supply', 'Onboarding', 'Campaigns'],
    kpis: [
      ['Live Providers', 'Providers accepting bookings in the city'],
      ['Bookings This Month', 'Completed and upcoming bookings'],
      ['Supply Gaps', 'Specialties below demand threshold'],
      ['Open Complaints', 'City complaints awaiting resolution'],
    ],
    tasks: [
      'Invite providers for high-gap specialties',
      'Review onboarding funnel drop-offs',
      'Track local campaign performance',
    ],
    alerts: [
      ['Specialty supply gap above threshold', 'warn'],
      ['Complaint backlog rising in the city', 'urgent'],
    ],
    workQueues: ['Onboarding Pipeline', 'Supply Gap List', 'City Complaints', 'Campaign Tracker'],
    quickActions: ['Invite Provider', 'Run Campaign', 'Open City Map', 'Review Onboarding'],
    domainModules: [
      ['map', '🗺️', 'City Heat-Map', 'Demand versus supply by neighbourhood.', 'Open Map', '/superadmin/cities'],
      ['crm', '📈', 'City CRM', 'Pipeline, accounts and field operations.', 'Open CRM', '/superadmin/crm'],
    ],
  }),

  clinical_safety: buildDashboardSpec({
    roleKey: 'clinical_safety',
    title: 'Clinical Safety Officer Dashboard',
    subtitle: 'Clinical rule approvals, DDI data changes and alert override review',
    permissions: ['rules:approve', 'ddi:review', 'safety:review'],
    sidebarSections: ['Dashboard', 'Rules', 'DDI', 'Overrides'],
    kpis: [
      ['Rules Awaiting Approval', 'Clinical rules in review'],
      ['Alert Override Rate', 'Share of overridden clinical alerts'],
      ['DDI Reviews Pending', 'Drug-interaction changes awaiting sign-off'],
      ['Rule-linked Incidents', 'Incidents tied to a clinical rule'],
    ],
    tasks: [
      'Backtest and approve pending clinical rules',
      'Review high-frequency DDI overrides',
      'Sign off DDI dataset updates',
    ],
    alerts: [
      ['Clinical rule firing storm detected', 'urgent'],
      ['Override rate above safety threshold', 'warn'],
    ],
    workQueues: ['Rule Approvals', 'Override Reviews', 'DDI Change Requests', 'Safety Incidents'],
    quickActions: ['Approve Rule', 'Reject Rule', 'Review Override', 'Open DDI Dataset'],
    domainModules: [
      ['rules', '🧠', 'Rule Registry', 'Versioned clinical rules with backtest evidence.', 'Open Rules', '/hospital/safety'],
      ['ddi', '💊', 'DDI Dataset', 'Interaction data review and sign-off trail.', 'Open DDI', '/hospital/safety'],
    ],
  }),

  security_admin: buildDashboardSpec({
    roleKey: 'security_admin',
    title: 'Security Admin Dashboard',
    subtitle: 'Access control, break-glass reviews, vulnerabilities and audit',
    permissions: ['iam:manage', 'security:review', 'audit:read'],
    sidebarSections: ['Dashboard', 'Access', 'Break-Glass', 'Vulnerabilities', 'Audit'],
    kpis: [
      ['Failed Logins', 'Failed login attempts in the last 24 hours'],
      ['Break-Glass Events', 'Break-glass accesses in the last 7 days'],
      ['Access Reviews Due', 'Entitlement reviews past due'],
      ['Open Vulnerabilities', 'Unresolved security findings'],
    ],
    tasks: [
      'Review unreviewed break-glass accesses',
      'Complete quarterly access recertification',
      'Triage open vulnerability findings',
    ],
    alerts: [
      ['Break-glass access unreviewed for 24 hours', 'urgent'],
      ['Brute-force login pattern detected', 'urgent'],
    ],
    workQueues: ['Break-Glass Review', 'Access Reviews', 'Vulnerability List', 'Audit Trail'],
    quickActions: ['Revoke Access', 'Start Access Review', 'Verify Audit Chain', 'Open Security Desk'],
    domainModules: [
      ['iam', '🔐', 'IAM Console', 'Policies, segregation of duties and sensitivity labels.', 'Open IAM', '/access-control'],
      ['audit', '🧾', 'Audit Chain', 'Immutable audit trail with hash verification.', 'Open Audit', '/audit-logs'],
    ],
  }),

  analyst: buildDashboardSpec({
    roleKey: 'analyst',
    title: 'Data Analyst Dashboard',
    subtitle: 'De-identified datasets, saved analyses and governed exports',
    permissions: ['analytics:read', 'datasets:export'],
    sidebarSections: ['Dashboard', 'Datasets', 'Reports', 'Exports'],
    kpis: [
      ['Available Datasets', 'De-identified datasets available to the analyst'],
      ['Queries Run Today', 'Analytical queries executed today'],
      ['Exports This Month', 'Governed exports generated this month'],
      ['Freshness', 'Age of the oldest stale dataset'],
    ],
    tasks: [
      'Refresh saved analyses against the latest dataset snapshot',
      'Review re-identification risk flags before export',
      'Document dataset lineage for new dashboards',
    ],
    alerts: [
      ['Re-identification risk flagged on an export', 'urgent'],
      ['Dataset freshness below target', 'warn'],
    ],
    workQueues: ['Saved Analyses', 'Export Requests', 'Data Quality Checks', 'Dataset Catalogue'],
    quickActions: ['New Query', 'Export Dataset', 'Open Report Studio', 'View Lineage'],
    domainModules: [
      ['datasets', '📊', 'Dataset Catalogue', 'k-anonymised, date-shifted datasets.', 'Open Datasets', '/analytics-reports'],
      ['studio', '🧮', 'Report Studio', 'Saved analyses, scheduling and governed exports.', 'Open Report Studio', '/analytics-reports'],
    ],
  }),

  medical_reviewer: buildDashboardSpec({
    roleKey: 'medical_reviewer',
    title: 'Medical Reviewer Dashboard',
    subtitle: 'Clinical review of insurance claims and medical content',
    permissions: ['claims:review', 'content:review'],
    sidebarSections: ['Dashboard', 'Review Queue', 'Decisions', 'Queries'],
    kpis: [
      ['Claims To Review', 'Claims awaiting clinical opinion'],
      ['Avg Review TAT', 'Average clinical review turnaround'],
      ['Approve / Deny Ratio', 'Decision mix for the current period'],
      ['Open Queries', 'Queries raised back to the desk'],
    ],
    tasks: [
      'Review claims flagged by clinical rules',
      'Send structured queries for missing documents',
      'Document decision rationale for audit',
    ],
    alerts: [
      ['Clinical review TAT breach', 'urgent'],
      ['High-value claim awaiting review', 'warn'],
    ],
    workQueues: ['Claim Review Queue', 'Decision Log', 'Query Threads', 'Clinical Rule Flags'],
    quickActions: ['Approve Claim', 'Query Claim', 'Deny With Reason', 'Open Chart Summary'],
    domainModules: [
      ['claims', '🔎', 'Clinical Review', 'Rule flags with a scoped chart summary.', 'Open Reviews', '/insurance/desk'],
      ['decisions', '✅', 'Decision Log', 'Approve/deny trail with rationale.', 'Open Decisions', '/insurance/desk'],
    ],
  }),

  dpo: buildDashboardSpec({
    roleKey: 'dpo',
    title: 'Data Protection Officer Dashboard',
    subtitle: 'Privacy governance, DSRs, breaches and processor register',
    permissions: ['privacy:manage', 'dsr:manage', 'breach:manage'],
    sidebarSections: ['Dashboard', 'DSR', 'Breaches', 'Consents', 'DPIA', 'Processors'],
    kpis: [
      ['Open DSRs', 'Data-subject requests by type'],
      ['DSR SLA At Risk', 'Requests due within three days'],
      ['Open Breaches', 'Breaches in investigation or notification'],
      ['Consent Withdrawals', 'Withdrawals processed this month'],
    ],
    tasks: [
      'Progress erasure and access requests within SLA',
      'Notify breaches within the statutory clock',
      'Review DPIA actions and processor DPAs',
    ],
    alerts: [
      ['DSR SLA due in under three days', 'urgent'],
      ['Breach notification clock running', 'urgent'],
    ],
    workQueues: ['DSR Queue', 'Breach List', 'Consent Withdrawals', 'Processor Register'],
    quickActions: ['Open DSR', 'Notify Breach', 'Approve Retention Exception', 'Open DPIA Tracker'],
    domainModules: [
      ['dsr', '🗂️', 'DSR Automation', 'Access and erasure workflows with legal hold.', 'Open DSR', '/superadmin/dsr'],
      ['privacy', '🛡️', 'Privacy Centre', 'Consents, retention exceptions and processor DPAs.', 'Open Privacy', '/superadmin/vendor-dpas'],
    ],
  }),

  finance_admin: buildDashboardSpec({
    roleKey: 'finance_admin',
    title: 'Finance Admin / CFO Dashboard',
    subtitle: 'Collections, RCM leakage, approvals, payouts and period close',
    permissions: ['finance:manage', 'rcm:read', 'approvals:approve'],
    sidebarSections: ['Dashboard', 'Revenue Cycle', 'Approvals', 'Payouts', 'Close'],
    kpis: [
      ['Collections vs Target', 'Net collections against the period target'],
      ['Net Collection %', 'Collected share of billed revenue'],
      ['Claim Rejection %', 'Rejected claims as a share of submissions'],
      ['Revenue Leakage', 'RCM gaps at risk (INR)'],
      ['Payouts Due', 'Payout batches awaiting release'],
      ['Budget Variance', 'Actual versus budget for the period'],
    ],
    tasks: [
      'Review RCM gaps by value at risk',
      'Approve payout batches with step-up verification',
      'Lock the accounting period after close checks',
    ],
    alerts: [
      ['Leakage spike above finance threshold', 'urgent'],
      ['Payout batch awaiting approval', 'warn'],
      ['Gateway settlement mismatch detected', 'urgent'],
    ],
    workQueues: ['Refund & Write-off Approvals', 'RCM Gap Queue', 'Payout Batches', 'Gateway Exceptions'],
    quickActions: ['Approve Payout Batch', 'Open RCM Gaps', 'Lock Period', 'Export Finance Pack'],
    domainModules: [
      ['rcm', '💰', 'RCM Funnel', 'Billing-to-collection funnel with leakage recovery.', 'Open RCM', '/hospital/rcm'],
      ['approvals', '✅', 'Approvals Inbox', 'Refunds, write-offs, POs and payouts.', 'Open Approvals', '/admin/approvals'],
    ],
  }),
};

const PLATFORM_ALIASES: Record<string, string> = {
  support_agent: 'support_agent',
  'support-agent': 'support_agent',
};

export function getPlatformDashboardSpec(roleKey: string | null | undefined): HmsDashboardConfig | undefined {
  if (!roleKey) return undefined;
  const key = String(roleKey).toLowerCase().trim();
  const base = PLATFORM_TRUST_SPECS[key] ? key : PLATFORM_ALIASES[key];
  const spec = base ? PLATFORM_TRUST_SPECS[base] : undefined;
  return spec ? { ...spec, roleKey: key } : undefined;
}

export function getAllPlatformRoles(): string[] {
  return Object.keys(PLATFORM_TRUST_SPECS);
}
