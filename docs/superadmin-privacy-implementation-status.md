# Super-admin privacy implementation status

Review date: 2026-11-07
Scope: static repository changes only. No app deployment, production infrastructure, external audit sink, legal review, or live patient/provider data was accessed.

This document evaluates the supplied `#23 — Super Admin` checklist. “Implemented in code” means repository evidence exists; it does not certify a production deployment or legal compliance.

## Implemented in the repository

- **Scoped roles and least privilege:** platform roles have explicit permissions; Owner roles no longer use `*` and do not receive clinical PHI permissions by default. `authorize()` no longer has a superadmin pass-through. See `backend/src/config/permissions.js` and `backend/src/middleware/authorize.js`.
- **Owner MFA policy:** superadmin/super_admin added to mandatory 2FA roles. Break-glass request/decision step-up refuses accounts that have not enrolled. See `backend/src/config/permissions.js`, `backend/src/middleware/stepUpAuth.js`, `backend/src/routes/breakGlass.js`.
- **Break-glass core:** request includes subject, ticket/incident and reason; requests expire within 60 minutes; requester cannot approve; sensitive mental-health/legal requests require distinct approvers; PHI reads require a matching active grant and required audit; platform grants are read-only. See `backend/src/models/BreakGlassGrant.js`, `backend/src/routes/breakGlass.js`, `backend/src/middleware/requireBreakGlass.js`.
- **Mental-health privacy:** platform-wide referrals are denied; per-subject platform reads require a matching mental-health grant; writes are denied to platform operators; aggregate counts suppress cells below 10. See `backend/src/services/mentalHealthAccess.js` and `backend/src/routes/mentalhealth.js`.
- **Clinical-module platform blocking:** platform operators are denied from legacy clinical module handlers while tenant and DTO migrations are incomplete. This can disable some operator workflows. See `denyPlatformClinicalAccess` in `backend/src/middleware/auth.js` and affected routes.
- **Tenant isolation:** protected requests from tenant-staff roles stop at authentication when the account has neither a hospital nor facility link. Legacy list filters now return 403 when hospital scope is missing; object mutations/reads deny missing or mismatched hospital scope. Patient emergency and blood inventory/request views are subject-scoped. OT, physiotherapy and housekeeping routers deny platform roles by default. `authz:tenant-guard` now passes with zero active legacy patterns.
- **Patient directory/report controls:** patient list responses are masked/scoped; owner-wide appointment and clinical report listing is denied; platform patient-linked bill lists/details and billing documents are denied.
- **Bulk exports:** raw user, revenue and booking exports are disabled pending a protected DPO artifact workflow. Remaining export endpoints require enrolled MFA and a required audit record; audit CSVs omit staff names/emails, targets and raw details. Platform superadmins are denied the hospital-wide patient/billing report export; tenant reports require hospital scope, enrolled MFA and required audit. This is a deliberate availability reduction until the DPO artifact flow exists.
- **Audit and review UI:** access-log view is wired into the superadmin console; IAM access reviews are tenant-scoped and review mutation checks tenant on both review and assignment. Quarterly campaigns no longer fall back to cross-tenant superadmin reviewers.
- **Vendor/DPA register:** a DPO/compliance register now records vendor service, data categories, processing regions, subprocessors, DPA status and review dates. API writes are role-restricted and audited; the DPO/Security UI is mounted. Contract retention is defined as term plus seven years, but contract-specific legal holds and evidence attachment/renewal reminders still need operational workflow.
- **Retention inventory:** support assist sessions expire after 30 days; the data dictionary now maps both support sessions and vendor contracts. AuditLog TTL now matches the seven-year policy. A TTL schema assertion and dictionary freshness check pass.
- **Admin Team:** permanent deletion action removed from the Super Admin Team UI.
- **Route inventory:** latest `npm run authz:coverage --prefix backend` reports 1,897 routes and 0 unclassified auth markers.

## Implemented partially; still needs work

- **Role catalogue:** 8 new scoped roles exist; additional template roles in the brief (catalog_manager, moderator, finance_admin, KYC reviewer, etc.) exist in parts of the application, but their permission surfaces and navigation are not consistently consolidated into one admin IAM workspace.
- **Break-glass:** patient in-app notices now have bounded retries and a DPO post-access review queue; new requests attempt critical in-app plus email alerts to active superadmin/super_admin/security_admin/DPO users with bounded retries. Breach deadline sweeps also attempt email escalation with retry state and required audit records. Provider configuration and human acknowledgement are still deployment concerns; there is no SLA dashboard or automated DPO sampling. Current audit hash chain is in Mongo; it is not an external immutable/WORM sink. Step-up grants are process-memory stored, so they need shared storage for multi-instance deployments.
- **Audit coverage:** required audit is enforced at platform break-glass PHI middleware; many legacy clinical read paths use best-effort logging, and access-log screens do not yet unify every audit source or alert channel.
- **Access reviews:** quarterly IAM tenant campaigns and a read-only access-history screen exist; platform-role certification and an offboarding checklist/reviewer assignment workflow are incomplete. Blocking a platform admin bumps token version and disconnects sockets; the team directory shows MFA and last-active status while omitting phone, gender and DOB.
- **IAM maker-checker:** direct critical permission assignment now refuses caller-supplied approver IDs and requires the access-request flow; critical requests need two distinct approvers and decision reads are tenant-scoped. This covers the IAM assignment path, not every high-impact action (commission, legal disclosure, provider ban and all payout paths still need a complete control audit).
- **K-anonymity:** mental-health aggregate endpoint suppresses small groups; a universal aggregation layer for all dashboards/exports is not in place.
- **Billing/support:** platform patient-linked billing endpoints are denied. Support now has assigned-case metadata, L2-only ticket body access after a patient-generated five-minute code, selected contact-field reveal, reason capture, enrolled-2FA step-up, 15-minute session expiry, revocation, required audit, and a 30-day Mongo TTL retention index. A current consent session is also required to reply. Owner sees only masked metadata and can assign to L2 or manage ticket status. Distributed fail-closed limits now cover assist-code issuance, verification and contact reveal. Reliable patient notification, operator assignment picker, abuse alerting and role-based refund limits remain incomplete.
- **Sidebar role gating:** some admin navigation entries exist and support L2 no longer sees a break-glass page it cannot access, but all sections are not consistently permission-rendered with server permission templates.
- **Step-up/maker-checker:** break-glass and selected existing actions have step-up; the full scope list and maker-checker controls for commission, payouts, legal disclosure, export, provider bans and role assignments are not complete.

## Not complete or cannot be verified from this workspace

- Complete DPO Privacy Centre and legal operations flows for DSR correction/erasure/consent withdrawal execution, children’s-data cases, and vendor contract legal holds/evidence workflow. Patient DSR submission/tracking, DPO/compliance-only admin review, identity verification and a breach register with a 72-hour deadline/status lifecycle exist in code. DSR submission and status changes now create critical in-app privacy notices. Identified export fulfillment is intentionally disabled with HTTP 503 until a private artifact registry, de-identification/watermarking checks, secure delivery and expiry purge exist. In-app notices do not prove delivery or acknowledgement.
- De-identified-by-default policy across every export; watermarking and artifact delivery/purge verification.
- Production-complete Support Workspace: patient notification delivery, abuse alerts, operator assignment/directory flow, assist-session scheduled purge and incident response. Assist consent-code issuance, verification and contact reveal have distributed fail-closed rate limits in code; production Redis availability/configuration and abuse alerting still require operational verification.
- Separate admin hostname, Cloudflare Access/VPN/IP allowlist and production TLS certificate are represented in Nginx configuration but remain unconfigured by default: the admin allowlist deliberately denies all until approved CIDRs are entered. Confirm the edge forwards the admin hostname and uses the hardened Nginx config; a source file cannot prove deployment. The admin CSP is scoped to that hostname. Passkey-only or TOTP policy and production session settings still require environment/operator verification.
- Verified external alert delivery/recipient acknowledgement, off-hours/mass-access detection across all PHI routes, and verified breach/customer notification delivery. Break-glass and breach email delivery now use the configured transactional email provider with bounded retries, but do not prove that a human received/read/acknowledged an alert; on-call paging integrations remain unwired.
- Shadow-mode migration evidence, production role migration, quarterly live access review, and offboarding runbook execution.
- SECURITY.md, DPIA and Privacy Policy/legal claims review. Existing public privacy claims must not be expanded based only on this code review.
- End-to-end build/deploy and live verification. Frontend type-check passes, but no deployed environment or production alert delivery was exercised.

## Checks run

- Backend earlier focused suites: 10 suites / 216 tests passed. Latest focused IAM/DSR/break-glass run: 6 suites / 166 tests passed. Latest export/report scope run: 2 suites / 40 tests passed; focused lint on touched export/report/audit routes had 0 errors (warnings remain, including pre-existing warnings in reports.js).
- `node --check` passed for edited DSR, user-team, break-glass and breach routes.
- `npm run authz:coverage --prefix backend`: 1,897 routes, 0 unclassified.
- `npm run authz:tenant-guard --prefix backend`: passes; 0 active legacy conditional tenant guards remain.
- Six focused backend suites passed: 70 tests total, including tenant routes, platform clinical denial, DPA register, breach alerts, retention schema, and emergency ownership. `retention:gaps` and `docs:dictionary:check` pass.
- `supportTicketPrivacy.spec.js`: 5 tests passed; both changed route/middleware files pass `node --check`. In the same Jest invocation, the separate `ticketCsat.spec.js` suite failed to load because its audit mock does not export `auditLogRequired` (test harness/module setup issue); it was not counted as passing.
- Full backend Jest suite was started but stopped after repeated MongoDB buffering timeouts in reviewer-assignment tests; no full-suite pass is claimed.
- Focused ESLint: 0 errors on the edited DSR, user-team, and break-glass route files.
- `frontend`: `npm run typecheck` passes, including the vendor DPA register and review editor.

## Conclusion

The high-risk superadmin PHI bypasses are substantially reduced in repository code, but checklist 23 is **not 100% complete**. Do not claim all staff are unable to view patient data or that the deployment satisfies the full privacy/security model until the partial/infrastructure items above are implemented and verified.


