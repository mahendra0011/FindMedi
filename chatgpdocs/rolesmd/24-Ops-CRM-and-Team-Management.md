# 24 — Ops CRM & Team Management (Super Admin ke andar)

> **Goal:** ek jagah se (1) platform ki **progress** dekhna, (2) **supply (providers) aur partners** ko pipeline me manage karna, (3) **team** ke kaam, targets aur performance manage karna.
> **Repo scan:** CRM jaisa kuch **nahi hai** — `Lead`, `Task`, `Activity`, `Visit`, `Target/OKR`, `Campaign` models/routes nahi mile. Jo hai: `Staff` (hospital-tenant HR: attendance/leave/**salary**/emergency contact), `LeaveRequest`, `SupportTicket`, `Dispute`, `Announcement`, `Notification*`, `Referral` (ye **patient referral rewards** hai, CRM nahi), limited analytics (`/analytics/doctor`, `/dashboard/stats`). Matlab CRM **naya banega**.
> ⚠️ `Staff` model ko platform-team ke liye reuse **mat** karo — wo hospital tenant ka HR data hai (salary, address, emergency contact). Platform team ka data alag + strictly restricted rakho.
> Vendor tools ke prices/features ke claims maine nahi diye — decide karte waqt unki current pricing/features khud check karo.

---

## 1. "CRM" ka matlab yahan kya hai (scope clear karo)

| Type | Kya | Is file me? |
|---|---|---|
| **Supply CRM** | Providers (clinic, lab, pharmacy, gym…) ko lead → onboard → activate → retain karna | ✅ **Core** |
| **Partnership CRM** | RWAs, corporates, NGOs, associations, schools, insurers, govt | ✅ |
| **Team/Task management** | Field + ops + support team ke kaam, targets, performance | ✅ |
| **Progress cockpit (OKR/KPI)** | Platform health + goals tracking | ✅ |
| **Projects/roadmap tracker** | Engineering/product delivery tracking | ✅ (light; tools se link) |
| **Patient CRM** | Patients ko marketing/follow-up | ❌ **Alag rakho** — PHI/privacy; sirf consent-based lifecycle messaging (file 21) via pseudonymous segments; CRM me patient health data **kabhi nahi** |

## 2. Build vs Buy vs Hybrid

| Option | Pros | Cons | Kab |
|---|---|---|---|
| **Buy** (generic CRM + task tool + HR tool) | Jaldi shuru, mature features, mobile apps | Platform data se integration mehnat, third-party me provider/team personal data jaata hai (DPA, access control), per-seat cost, customisation limits | Pehle 2–3 mahine / team < ~10 |
| **Build in-app (superadmin)** | Platform data ke saath **native integration** (applications, KYC, bookings, tickets), ek login/permission/audit system, privacy control | Dev time, maintenance, features khud banane padte hain | Jab workflows platform-specific hon |
| **Hybrid (recommended)** | Core supply/ops workflows build; generic cheezein buy | 2 systems sync | ✅ |

**Hybrid recommendation:**
- **Build:** Supply CRM + Partnership CRM + Field tasks/visits + Progress cockpit (kyunki ye `ProviderApplication`, KYC, bookings, reviews, payouts se jude hain).
- **Buy/Use existing:** HR/payroll (salary, statutory), engineering project tracker (Jira/Linear/GitHub Projects), docs/wiki (Notion/Google Workspace), telephony/helpdesk (agar chahiye).
- **Rules for any external tool:** DPA sign, SSO+MFA, **PHI kabhi nahi bhejna**, minimum fields sync, offboarding access removal, data-residency check.
- **Starter shortcut:** shuru me spreadsheet/Notion/Zoho-type CRM se pipeline chalao, 30–60 din me jo workflow stable ho wo build karo (migrate with export).

---

## 3. Super Admin me naye sections (CRM group)

```
CRM & TEAM  (new nav group)
 ├─ Command Center              ← platform progress cockpit
 ├─ Supply Pipeline             ← provider leads → onboarding → active
 ├─ Accounts (Provider 360)     ← every provider ka single view
 ├─ Partnerships                ← RWA/corporate/NGO/association pipeline
 ├─ Field Ops                   ← visit plans, check-ins, territories, map
 ├─ Tasks & Follow-ups          ← my tasks / team tasks / SLAs
 ├─ Campaigns & Camps           ← events/camps pipeline + marketing calendar
 ├─ Team                        ← roster, roles, capacity, scorecards, 1:1s
 ├─ Goals & OKRs                ← objectives, key results, KPI targets
 ├─ Projects & Roadmap          ← sprint/release tracker (link to Jira/Linear)
 ├─ Playbooks & Knowledge       ← SOPs, scripts, templates, training
 ├─ Reports                     ← scheduled + custom, role-based
 └─ CRM Settings                ← pipelines, stages, fields, automation, permissions
```

---

## 4. Module details

### 4.1 Command Center (platform progress cockpit)
**Purpose:** founder/ops lead ko ek screen par dikhe: "platform kaisa chal raha hai, kahan atka hai."

| Block | Content |
|---|---|
| **North-star** | Completed, satisfied bookings/orders per week (per city) |
| **Supply funnel** | Leads → Contacted → Applied → Approved → Activated → Active (counts + conversion + time-in-stage) |
| **Marketplace health** | Active providers by category/city, supply density, slot fill rate, search-no-result (unmet demand), booking success %, cancel/no-show % |
| **Quality & trust** | Avg rating, complaint rate, refund rate, open disputes, safety incidents, KYC TAT |
| **Money** | GMV, revenue, take rate, payouts pending, refund liability (aggregate) |
| **Team health** | Tasks overdue, SLA breaches, workload per person, targets vs achieved |
| **City scorecards** | Per city: supply, demand, fill rate, repeat %, NPS, launch-gate status (red/amber/green) |
| **Alerts** | SLA breaches, doc-expiry spike, fraud spike, provider at-risk list, support backlog, payout failures |
| **OKR progress** | Company/team objectives with % complete |
| **Release/roadmap** | Current sprint status, blockers, upcoming launches |
**Rules:** aggregate only (k ≥ 10 where individuals could be inferred), drill-down to provider/business level only; **no patient identities**; date-range + city + category filters; export capped.

### 4.2 Supply Pipeline (Provider CRM)
**Entities:** `Lead` (prospect provider) → converts to `Account` (provider) when application submitted/approved.

**Pipeline stages (default; configurable):**
| # | Stage | Exit criteria | SLA (suggested) |
|---|---|---|---|
| 1 | Identified | Name + category + area + contact captured | — |
| 2 | Contacted | First call/visit logged | 2 days |
| 3 | Interested | Positive response + decision-maker identified | 5 days |
| 4 | Demo / Visit done | Demo given, objections noted | 7 days |
| 5 | Docs collected | Type-wise checklist docs received | 7 days |
| 6 | Application submitted | Join wizard submitted (auto from platform) | 3 days |
| 7 | Under review | KYC reviewing (auto sync) | per KYC SLA |
| 8 | Approved | Verified (auto) | — |
| 9 | Activated | Profile ≥ 80% + first booking | 14 days |
| 10 | Active | ≥ N bookings/month | — |
| — | At-risk | No bookings 14d / low rating / expiring docs | auto |
| — | Churned/Lost | Reason code mandatory | — |
**Lost reasons:** not interested, fee concern, tech barrier, competitor, no supply fit, unverifiable docs, unresponsive, regulatory issue, other.

**Lead fields:** business name, category/type, sub-type, city/area/pincode, geo pin, contact person(s) (name, role, phone, WhatsApp), source (field visit / referral / association / inbound / event / ads), owner, territory, priority score, estimated monthly volume, current tools (paper/other software), competitor presence, languages, notes (structured), tags, next action + due date, consent status (for WhatsApp/SMS), documents (links, not raw KYC), duplicates flag.
**Features:** Kanban + list + map views; bulk import (CSV) with dedupe (phone/PAN/GST/registration/geo+name fuzzy); assignment (manual/round-robin/territory); lead scoring (see §7); click-to-call/WhatsApp (templates, opt-in); call outcome logging; quick-add from mobile; duplicate merge; stage-change rules (required fields/checklist); convert-to-account; recycle stale leads; SLA timers & overdue alerts; saved views/filters; activity timeline; audit.

### 4.3 Accounts (Provider 360)
Single page per live provider:
- **Profile & status:** type, tier, city, status (live/suspended/expiring), plan, commission config, verification level, probation flag, documents + expiry dates.
- **Performance:** bookings (7/30/90d), conversion (views→bookings), no-show/cancel %, avg rating, response time, revenue/GMV, payouts state, refund/dispute count.
- **Health score:** composite (see §7) + trend + reasons ("expiring licence", "no bookings 14d").
- **Relationship:** owner (account manager), contacts, activity timeline (calls, visits, WhatsApp, tickets), tasks, notes, QBR/check-in history, training completed.
- **Tickets & disputes:** open/closed linked.
- **Actions:** assign owner, create task, send template message, request doc renewal, suggest upsell (Premium/featured), flag at-risk, escalate to KYC/T&S, schedule visit.
- **Privacy:** business metrics only; **no patient names/records**; booking counts aggregated.

### 4.4 Partnerships CRM
Entities: Partner (RWA, corporate, NGO/CSR, association, school/college, insurer/TPA, govt dept, hospital group, media).
**Stages:** Identified → Intro done → Proposal sent → Negotiation → Agreement/MoU signed → Pilot/first event → Active → Renewal/Expansion → Lost.
**Fields:** org, type, size (residents/employees/students), city/area, decision-makers, interests (camps, employee checkups, elder care, CPR training), proposed offer, value estimate, MoU status/docs, event calendar, outcomes (attendees, sign-ups, conversions), owner, next step.
**Features:** pipeline board, event/camp linkage (§4.7), partner scorecard (events held, registrations, bookings attributed via UTM/QR), contract renewal reminders, co-branding assets, impact reports (aggregate), referral QR/links tracking.

### 4.5 Field Ops
- **Territories:** area/pincode polygons or lists; assign owners; coverage map; white-space (areas with no supply).
- **Visit planning:** daily plan (route suggestions), visit tasks, check-in/out (geo + time; **only during duty, disclosed policy**), visit outcome form (interested/docs/objection), photos (storefront; no patient info), next steps.
- **Collateral kit:** leaflets, demo script, QR stickers inventory (issued/returned).
- **Targets:** visits/day, leads/week, activations/month by person/territory.
- **Field mobile PWA:** offline-first (cache assigned leads, queue notes/photos, sync), quick call/WhatsApp, voice notes → text (optional), SOS/safety check-in for field staff.
- **Expense claims** (optional/light): travel, collateral — approvals; or leave to HR tool.
- **Quality:** mystery-shop checks, verification visit forms for high-risk categories (links to KYC).

### 4.6 Tasks & Follow-ups
Unified task engine across Leads/Accounts/Partners/Tickets/KYC.
- Types: call, visit, follow-up, doc request, renewal, training, review, custom.
- Fields: title, due, priority, owner, related object, SLA, status (open/in progress/blocked/done), checklist/subtasks, comments, attachments.
- Views: My tasks (today/overdue), Team board, Calendar, by object.
- Reminders (push/email/WhatsApp-internal), **auto-created tasks** from automation (doc expiring, SLA breach, at-risk).
- Delegation/handover when someone is on leave (reassign bulk).
- Daily digest per person; manager digest.

### 4.7 Campaigns & Camps
- **Camp pipeline:** Idea → Partner confirmed → Facility/doctors assigned → Permissions/consents ready → Registrations open → Day-of ops → Results delivered → Report → Follow-up conversions.
- Fields: type, date/venue, partner, partner facility, budget, capacity, registrations, attendees, conversions (bookings within X days via tracking), cost per attendee, outcome report.
- **Marketing calendar:** health days, seasonal campaigns, city launches, content publishing, partner events.
- **Campaign tracking:** UTM/QR attribution (PHI-free), channel CAC, referral performance (provider-driven QR).
- Approvals: claims/ads review workflow (marketing → clinical advisor → legal for sensitive).

### 4.8 Team (people management)
> **Separate from hospital `Staff` model.** Platform team ke liye `TeamMember` profile (HR-lite). Payroll/salary/statutory ke liye proper HR tool.

| Area | Features |
|---|---|
| **Roster & roles** | Members, role (field exec, team lead, city manager, KYC reviewer, support, finance, provider success, etc.), city/territory, manager, join date, status |
| **Capacity & workload** | Open tasks/leads per person, overload alerts, auto-balance |
| **Attendance/leave (light)** | Leave calendar, coverage view (or sync with HR tool); no invasive tracking |
| **Scorecards** | Role-based KPIs (see §6) with targets, trend, qualitative notes — shown to person + manager |
| **1:1s & feedback** | Meeting notes (private to manager+member), goals, feedback, recognition |
| **Onboarding checklists** | Per role: access, training, SOP reading, privacy training, shadow visits, first-30-60-90 goals |
| **Training & certification** | Required modules (privacy/PHI handling, claims policy, KYC checklists, crisis handling), completion tracking, expiry, quizzes |
| **Access & security link** | Role/permission (file 23), 2FA status, last login, access review reminders, offboarding checklist |
| **Hiring pipeline (light)** | Open roles, candidates stages (or ATS tool integration) |
| **Recognition** | Wins feed, leaderboards (careful: team-based + quality-weighted; avoid toxic competition) |
| **Announcements** | Internal broadcast (policy updates, launches) with read receipts |
**Privacy for employees:** HR data (salary, performance notes, health leave reasons) → HR/manager only; transparent monitoring policy; geo-tracking only for field duty with disclosure/consent (legal review); no keystroke/screen monitoring.

### 4.9 Goals & OKRs
- **Objective → Key Results → Initiatives/tasks** (company → city → team → person levels).
- KR types: numeric (target/current), % complete, milestone, auto-linked metric (e.g., "Active dental providers in Bhopal = 40" pulls live count).
- Cadence: quarterly OKRs, weekly check-ins (confidence: on track/at risk/off track), retrospectives.
- Dashboards: progress %, risk list, owner accountability, alignment tree.
- **Launch gates** as OKRs per city (supply density, fill rate, repeat %, support load).

### 4.10 Projects & Roadmap
- Link to engineering tool (Jira/Linear/GitHub Projects) via API: show sprint progress, release calendar, blockers.
- Roadmap view mapped to phases R-1…R4 (file 14): features, owner, status, dependencies, risk.
- Incident/postmortem log summary (from ops).
- Decision log (what we decided, why, date) — useful for founders.
(If you don't want to build this, embed/sync only; don't rebuild a project tracker.)

### 4.11 Playbooks & Knowledge
SOP library (file 20), call scripts, pitch decks, objection handling, FAQ, templates (WhatsApp/email/SMS — approved), training videos, city launch kits, policy docs; versioned, searchable, read-tracking, role-targeted.

### 4.12 Reports
- **Standard:** weekly ops report, city scorecard, supply funnel, provider quality, field productivity, partner outcomes, team scorecards, campaign ROI, onboarding TAT, churn analysis.
- **Custom report builder** (filters, group-by, charts) — saved views; scheduled email (PDF/CSV) to roles; exports capped + audited.
- **Cohort/retention** for providers (by onboarding month, category, city).
- **Forecasting (basic):** pipeline value, expected activations.

### 4.13 CRM Settings (admin of CRM)
Pipelines & stages (edit, required fields, SLAs), custom fields, tags, lost reasons, lead sources, scoring rules, territories, templates, automation rules, roles/permissions, notification rules, data retention, import/export, integration keys (WhatsApp/email/telephony/calendar), audit view.

---

## 5. Automation & workflows (rules examples)

| Trigger | Action |
|---|---|
| New lead created (field exec) | Dedupe check → assign by territory/round-robin → task "call within 24h" |
| Lead idle in stage > SLA | Notify owner → escalate to team lead after 2× SLA |
| Application submitted on platform | Move lead to "Application submitted"; create task for KYC; notify owner |
| Application approved | Move to Approved; create "Activation checklist" tasks; send welcome template; schedule 7-day check-in |
| No first booking in 14 days | Mark at-risk; task for provider success; suggest profile fixes |
| Document expiring (60/30/7) | Create renewal task; send reminder; escalate if no response |
| Rating drops below threshold / complaint spike | Flag account; create review task; notify T&S |
| High-value partner stage → MoU | Create event planning tasks; assign camp coordinator |
| Task overdue | Reminder → manager escalation |
| Camp completed | Task: upload report; trigger follow-up campaign (consented) |
| Team member leave starts | Reassign open tasks to backup |
| Provider churned | Exit survey task; lost-reason required; add to win-back list after N days |
**Guardrails:** automation logs; rate limits (messages); opt-in checks before WhatsApp/SMS; no PHI in templates; dry-run/test mode; ability to pause rules.

## 6. KPIs & scorecards (role-wise; pair quantity with quality)

| Role | Quantity KPIs | Quality KPIs (to prevent gaming) |
|---|---|---|
| **Field executive** | Visits/day, leads/week, applications submitted | Application approval rate, doc completeness, activation within 14d, provider NPS |
| **Provider success manager** | Accounts managed, check-ins done | Activation %, 90-day retention, bookings growth, complaint rate |
| **KYC reviewer** | Applications reviewed/day | TAT vs SLA, error/reopen rate, audit-sample accuracy |
| **Support agent** | Tickets resolved | First-response time, CSAT, reopen rate, QA score |
| **Partnerships/Camps lead** | Partners signed, camps run | Attendees, conversions, cost/attendee, partner NPS |
| **City manager** | Supply added, launch-gate progress | Fill rate, repeat %, safety incidents, unit economics |
| **Finance ops** | Payout runs completed | Reconciliation mismatches, payout TAT, chargeback rate |
| **Moderator/T&S** | Items reviewed | Accuracy (second-review), appeal overturn %, SLA |
Scorecard design: 3–5 KPIs, targets set with the person, trend lines, weekly review; avoid ranking-only leaderboards.

## 7. Scoring formulas (starter — tune with data)

**Lead score (0–100):** category priority (demand gap) 25 + size/volume potential 20 + decision-maker access 15 + digital readiness 10 + proximity to cluster 10 + responsiveness 10 + docs readiness 10.
**Provider health score (0–100):** bookings trend 25 + rating 20 + response time 15 + cancel/no-show 15 + profile completeness 10 + docs validity 10 + support/dispute load 5. Bands: ≥ 75 healthy, 50–74 watch, < 50 at-risk.
**Partner score:** reach + engagement + conversions + renewal likelihood.
Keep formulas visible/explainable; review quarterly; don't use protected attributes.

## 8. Data model (new collections; sketch)

```js
// Lead (prospect provider)
{ _id, businessName, typeKey, subType, city, area, pincode, geo, contacts:[{name,role,phone,whatsapp,email}],
  source, ownerId, territoryId, stage, stageEnteredAt, score, tags[], estMonthlyVolume, currentTools,
  nextAction:{type,dueAt}, lostReason?, consent:{whatsapp,sms,email}, linkedApplicationId?, linkedProviderId?, dedupeKey, createdBy, ... }

// Account (derived from Provider + CRM overlay)
{ providerId, accountOwnerId, healthScore, healthBand, riskReasons[], plan, lastContactAt, nextCheckInAt, notes[], ... }

// Partner
{ orgName, type, city, size, contacts[], stage, ownerId, offer, mouStatus, mouDocRef, events[], outcomes{}, nextStep, ... }

// Activity (timeline, polymorphic)
{ objectType:'lead|account|partner|camp', objectId, type:'call|visit|whatsapp|email|note|stage_change|task_done',
  by, at, outcome, summary (structured, redacted), attachments[], geo? (visit), durationSec? }

// Task
{ title, type, dueAt, priority, ownerId, related:{type,id}, slaAt, status, checklist[], createdBy, automationRuleId? }

// Visit (field)
{ userId, leadOrAccountId, plannedAt, checkIn:{at,geo}, checkOut:{at,geo}, outcome, photos[], notes }

// Territory
{ name, city, pincodes[], polygon?, ownerIds[], targets{} }

// Objective / KeyResult
{ level:'company|city|team|person', ownerId, period, title, krs:[{title,type,target,current,source:'manual|metric:<id>',confidence}], status }

// Campaign / Camp
{ type, title, date, venue, partnerId, facilityId, budget, capacity, regs, attendees, conversions, status, reportRef }

// TeamMember (platform team; separate from hospital Staff)
{ userId, roleTemplate, managerId, city/territory, joinDate, status, capacity, trainingRecords[], onboardingChecklist[], goals[] }
// HR-sensitive (salary etc.) NOT here; keep in HR tool or separately encrypted/restricted collection

// Automation rule, Template, SavedView, PipelineConfig, CustomFieldDef
```
**Indexes:** `{ownerId,stage}`, `{typeKey,city,stage}`, `{dedupeKey}` unique-ish, `{related.type,related.id}`, geo `2dsphere`, `{dueAt,status,ownerId}`.
**Encryption:** contact phones/emails at-rest field encryption (they are personal data); call recordings/files in private storage.

## 9. Integration with platform data (what makes build worthwhile)

| Platform event/data | CRM effect |
|---|---|
| `ProviderApplication` created/submitted/approved/rejected (file 10) | Auto-advance lead stage; tasks to KYC/owner; notify |
| Provider bookings/ratings/refunds/no-shows (aggregated per provider) | Account health score & dashboards |
| Document expiry job | Auto tasks + alerts |
| SupportTicket/Dispute linked to provider | Appear in Account 360; affects health |
| Payout holds/failures | Alert to finance + account owner |
| Search no-result / unmet demand | Suggest target categories/areas for lead generation (white-space map) |
| Events/Camps registrations & attendance | Camp/partner outcomes |
| Join landing UTM/QR attribution | Source/partner attribution |
| Feature flags/city launch state | City scorecards |
**How:** domain events → outbox/Kafka (✅ exists) or simple DB change streams → CRM read-models (materialised aggregates, k-anonymised). **CRM never queries clinical collections.**

## 10. Roles & permissions (CRM)

| Role | Leads | Accounts | Partners | Tasks | Team | OKRs | Reports | Settings |
|---|---|---|---|---|---|---|---|---|
| **Owner/Exec** | all | all | all | all | all (no HR salary) | all | all | pipeline/automation approve |
| **City Manager** | city | city | city | city | city team | city | city | limited |
| **Team Lead** | team | team | team | team | team | team | team | ❌ |
| **Field Exec** | own + territory | assigned | own | own | self | self | self | ❌ |
| **Provider Success** | assigned | assigned | ❌ | own | self | self | own | ❌ |
| **KYC Reviewer** | applications only | KYC view | ❌ | own | self | self | KYC | ❌ |
| **Finance** | ❌ | payout fields | ❌ | own | self | self | finance | ❌ |
| **HR (if any)** | ❌ | ❌ | ❌ | ❌ | HR fields | ❌ | HR | ❌ |
| **Analyst** | aggregate | aggregate | aggregate | ❌ | ❌ | read | aggregate | ❌ |
| **CRM Admin** | config | config | config | config | ❌ | config | all | all |
Principles: **territory/ownership-based visibility**, field-level permissions (phones masked for non-owners), export restrictions (capped, audited, step-up), 2FA mandatory, audit on view of sensitive contact fields in bulk, immutable audit for stage/ownership/deletion changes.

## 11. Privacy & compliance for CRM
- **Data is personal data** (contact persons' phone/email, field staff geo, employee data) → DPDP: purpose limitation, retention, access controls, DSR for contacts (access/erase), consent for WhatsApp/SMS/calls (opt-in, DND), call recording with consent notice.
- **No PHI/patient data in CRM** (notes templates warn; DLP pattern checks for Aadhaar/PAN-like/health words optional; free-text redaction).
- **Employee monitoring:** disclose policy; geo only during duty; no covert tracking; proportionate; consult labour/privacy counsel.
- **Retention:** lost leads purge after N months; inactive contacts purge; call recordings short retention.
- **Vendors:** if external CRM/telephony/WhatsApp, DPAs + region + minimal sync + SSO/MFA; offboarding.
- **Security:** same admin-console hardening as file 23 (passkeys, IP allowlist, step-up for exports/bulk delete, audit).
- **Ethics:** no pressure tactics on small clinics; accurate pitch; honest fee communication; comply with advertising rules.

## 12. UI wireframes (ASCII)

### 12.1 Command Center
```
┌ Command Center ─ City: Bhopal ▾  Range: Last 30d ▾ ─────────────────────────┐
│ North-star: Completed bookings/wk  ▲ 1,240 (target 1,500)                    │
│ Supply funnel: Leads 320 → Contacted 210 → Applied 96 → Approved 71 → Active 48│
│ [Fill rate 62%] [Booking success 97.8%] [Rating 4.5] [KYC TAT 31h] [Backlog 12]│
│ City gates:  Supply ●  Fill-rate ◐  Repeat ○  Support-load ●                  │
│ Alerts: ⚠ 9 docs expiring · ⚠ 14 providers at-risk · ⚠ 3 SLA breaches         │
│ OKRs: Q4  Activate 60 providers ▓▓▓▓▓░ 80% (on track)                        │
└──────────────────────────────────────────────────────────────────────────────┘
```
### 12.2 Supply pipeline (Kanban)
```
Identified(41) | Contacted(28) | Interested(19) | Demo done(11) | Docs(9) | Applied(8) | Review(6) | Approved(5) | Activated(4)
[Card: Smile Care · Dentist · Arera · ★prio 82 · Owner: Ravi · next: call Tue]  …  (drag to move; SLA badges)
```
### 12.3 Account 360
```
Smile Care (Dentist) · Live · Health 78 (Healthy) · Owner: Meena · Plan: Basic
Bookings 30d: 86 (▲12%) · Rating 4.6 · No-show 6% · Docs: BMW expires in 18d ⚠
Timeline: Call 3 Oct "needs help with price list" · WhatsApp template sent · Ticket #221 resolved
Tasks: [ ] Renew BMW doc (due 20 Oct)  [ ] Upsell Premium demo   Actions: [Message][Task][Visit]
```
### 12.4 Team dashboard
```
Team: City Ops (8)  ·  Workload: ▓▓▓▓▓▓░ 78%  ·  Overdue tasks: 11
Ravi (Field)  visits 5/6 · leads 14/15 · activation 40% · ✓ on track
Meena (PSM)   accounts 34 · retention 92% · at-risk 3 · ⚠ overload
[1:1 notes] [Scorecard] [Training: Privacy ✓ Claims ✗]
```

## 13. Build plan (rough; re-estimate with velocity)

| Phase | Scope | Effort (rough) |
|---|---|---|
| **MVP (2–3 sprints)** | Lead/Account models, supply pipeline (kanban/list), activities, tasks, basic assignment, platform sync for application status, Command Center v1 (funnel + supply + KYC TAT), role permissions, audit | M–L |
| **v2 (2–3 sprints)** | Partnerships CRM, Field Ops (territories, visits, PWA offline), automation rules, Provider 360 health score, reports (standard), WhatsApp templates (opt-in) | L |
| **v3 (2–3 sprints)** | Team module (scorecards, onboarding, training, 1:1s), OKRs, campaigns/camps pipeline, report builder + scheduled reports, projects integration | L |
| **v4** | Forecasting, advanced automation, telephony integration, ATS/HR integrations, BI export | M |
Use existing building blocks: `SupportTicket`, `Announcement`, `Notification*`, audit log, feature flags (Unleash), config-driven forms, DataTable, StatusTimeline (file 11).

## 14. Starter (no-code) path while you build
Use a spreadsheet/Notion/Zoho-type CRM for 30–60 days: fixed stages from §4.2, fields from §4.2, weekly review using the KPI list (§6). Export to CSV → import into built CRM later. Don't put PHI or KYC docs in these tools.

## 15. Risks & mitigations
| Risk | Mitigation |
|---|---|
| Over-building CRM before supply validated | Start with MVP (leads + pipeline + tasks + funnel); spreadsheet first if unsure |
| Data quality (duplicates, stale notes) | Dedupe rules, required fields, stage checklists, weekly hygiene review |
| Gaming of metrics | Pair quantity with quality KPIs; audits; team-level goals |
| Privacy leaks via notes/exports | Structured fields, redaction/DLP, export controls, access audit, no PHI policy |
| Employee surveillance backlash | Transparent policy, minimal tracking, legal review |
| Tool sprawl | Hybrid plan with clear ownership per tool |
| Integration drift | Event-driven sync, reconciliation jobs, data contracts |
| Key-person risk | Playbooks, shared ownership, handover automation |

## 16. Checklist
- [ ] Decide hybrid scope (build vs buy per module); sign DPAs for any external tool
- [ ] Define pipeline stages, SLAs, lost reasons, scoring (§4.2, §7)
- [ ] Models: Lead, Account overlay, Partner, Activity, Task, Visit, Territory, Objective/KR, Campaign, TeamMember (separate from hospital `Staff`)
- [ ] Platform event sync (applications, bookings aggregates, doc expiry, tickets)
- [ ] Command Center v1 (aggregate, k-anonymous) + city launch gates
- [ ] CRM roles/permissions (territory/ownership-based, masked contacts, export controls)
- [ ] Automation rules (SLA, activation, at-risk, doc expiry) with logs + pause
- [ ] Field PWA (offline queue, check-ins with disclosed policy)
- [ ] Team module: scorecards, onboarding, training (privacy/claims/crisis), 1:1s
- [ ] OKRs linked to live metrics; weekly review cadence
- [ ] Privacy: no-PHI policy, consent for WhatsApp/SMS/calls, retention, DSR for contacts, audit
- [ ] Start with spreadsheet/Notion process in parallel; migrate once stable
