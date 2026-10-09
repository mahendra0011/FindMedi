# 13. Platform Foundation Engines (NEW: repo + files 01-12 me nahi hain)

Ye 8 cheezein HMS ko "hardcoded screens" se "configurable platform" banati hain. Inke bina har naye rule ke liye code change karna padega.

Repo reality check (code se verified):
- Workflow engine, approval engine, rule engine: **koi model/route/service nahi** (grep = 0).
- `routes/clinicalAlerts.js` me sirf 3 hardcoded endpoints hain: `/code-blue`, `/lab-panic`, `/mtp`.
- `models/Task.js` CRM-style hai (`related.type`: lead/account/partner/camp/ticket/application...), clinical/ops tasks ke liye nahi.
- `Bed.bedNumber` **globally `unique: true`** hai (`models/Bed.js:4`) => do hospitals me same bed number "101" nahi ban sakta (multi-tenant bug).
- `Bed.ward` fixed enum (General/Semi-Private/Private/ICU/NICU/PICU/Emergency), `status` = Available/Occupied/Under Cleaning/Maintenance (Reserved/Blocked/Isolation nahi).
- `Department` me `head` plain string hai, `parent` nahi; `Facility.type` sirf hospital/clinic/lab/pharmacy.
- Unified search: OpenSearch services hain (`searchProviders`, `searchDrugs`, `searchEhr`, `assertEhrSearchAccess`) par UHID/bill/lab-no/claim-no jaisa internal master search nahi.

---

## 13.1 Workflow Engine

**Goal:** admin (developer nahi) flows define kare: `Admission → Approval → Deposit → Bed allocation`, `Purchase → Approval → PO → GRN → Payment`, `Discharge: Doctor → Nursing → Pharmacy → Billing`, `Pre-auth → Enhancement → Claim`.

### Logic
- **Definition** = directed graph of `states` + `transitions` + `guards` + `actions` + `SLA`. Stored as JSON, versioned; running instances pin to the version they started on.
- **Instance** = ek entity ka journey (`entityRef: {model,id}`), current state, history[], timers.
- Transition rules: `from → to` on `event`, `guard(role/permission/condition)`, `actions[]` (create task, send notification, post charge, call webhook, emit outbox event).
- Parallel branches (discharge clearances run in parallel; join when all done).
- SLA/timers: per state `slaMinutes`, escalate to role/user at 100%, again at 150%.
- Idempotent events (`Idempotency-Key`), optimistic concurrency (`version` field).
- Never delete: cancel with reason.

### Flow
```
Admin designs (visual editor) -> Publish (v3) -> Entity created -> Engine.start(defId, entityRef)
 -> state=Initiated -> actions run (tasks to roles) -> user clicks action (event) -> guard check -> transition
 -> parallel join -> final state -> outbox event (e.g. discharge.finalized) -> downstream (billing, housekeeping)
```

### Data model
```js
WorkflowDefinition { key, name, entityModel, version, status:'Draft'|'Published'|'Archived',
  states:[{id,label,type:'start'|'task'|'parallel'|'join'|'end', slaMinutes, onEnter:[Action], onExit:[Action]}],
  transitions:[{id,from,to,event,guard:{roles[],permissions[],expr},label}], hospitalId }
WorkflowInstance { defKey, defVersion, entityRef, state, activeStates[], history:[{from,to,event,by,at,note}], timers:[{state,dueAt,escalatedAt}], status, hospitalId }
```
### API
```
POST /api/workflows/definitions            PUT /:id/publish    GET /definitions?entity=Admission
POST /api/workflows/instances              GET /instances/:id  POST /instances/:id/events {event, note}
GET  /api/workflows/inbox?role=            (pending actions for me)
```
### Framework / libraries
- **Runtime:** `xstate` v5 (pure state machines, serialisable, testable) on the backend; the instance doc is the persisted snapshot. Alternative: plain table-driven transition checker (simpler; fine for linear flows).
- **Timers:** existing `bullmq` delayed jobs (backend already has it) for SLA/escalation.
- **Designer UI:** `@xyflow/react` (React Flow) nodes/edges, `dagre`/`elkjs` auto-layout, `@dnd-kit` palette -> canvas.
- **Validation:** `zod` schema for definition; graph checks (single start, no orphan, all paths reach end, no deadlock in parallel/join).

### UI design
```
+-----------------------------------------------------------------------------------+
| Workflow Designer: "IPD Discharge" v3 (Draft)      [Validate] [Test run] [Publish] |
+-----------+-------------------------------------------------------+---------------+
| Palette   |  (Initiated)-->(Doctor approval)-->[Parallel]--+       | Properties    |
| ▢ Task    |                                     |Nursing   |-->(Join)->(Billing)->|  state: Doctor|
| ◇ Decision|                                     |Pharmacy  |       |       (End)  |  SLA: 120 min |
| ⫴ Parallel|                                     |Billing   |       |              |  Roles: [Doctor]
| ● End     |  minimap                                               |  On enter: +  |
+-----------+-------------------------------------------------------+---------------+
```
- Nodes color by type (task=primary tint, parallel=info, end=success, SLA-risk=warning).
- Right panel = form (react-hook-form + zod). Validation errors listed bottom with click-to-focus node.
- **Instance viewer** (read-only graph) highlights current state, shows history timeline, SLA countdown chips.
### Animation
- Edge "flow" dash animation only for **active** transitions (CSS `stroke-dashoffset`), 1.2s linear loop; stop on `prefers-reduced-motion`.
- Node entry on drop: framer-motion `scale 0.9→1`, 150ms ease-out. Current-state node soft pulse (box-shadow, 2s) not bounce.
### Edge cases / tests
Concurrent events, version upgrade mid-flight (stay on old version), deleted role in guard, orphan instance cleanup, replay history, load: 1000 active instances/hospital.

---

## 13.2 Master Approval Engine

**Goal:** discount, refund, bill cancel, purchase, credit billing, stock adjustment, expense, vendor payment, salary, surgery cancel, discharge-with-dues ke liye ek hi configurable approval system (file 05 me sirf discount matrix tha).

### Logic
- `ApprovalPolicy` per `subject` (e.g. `discount`, `refund`, `purchase_order`) with **tiers** by amount/percent/risk: `[{max: 5, approverRole:'receptionist'}, {max: 15, role:'billing_manager'}, {max: null, role:'director'}]`.
- Rules: requester cannot approve own request (**segregation of duties**), approver must have scope (hospital/department), **self-escalation on timeout**, **delegation** (approver on leave => substitute with date range), reason code mandatory, optional second approver (dual control) above threshold, attachments.
- Result is applied only after final approval; request is **immutable audit**, original value stored (before/after).
- Bulk approve (safe only for low-risk subjects).

### Flow
```
Action attempted (e.g. 18% discount) -> PolicyResolver(subject, amount) -> tier(s) -> ApprovalRequest(Pending)
 -> notify approver (push/socket/WhatsApp) -> Approve/Reject(+reason) -> if multi-tier go next -> Approved -> executor applies change
 -> Rejected -> requester notified, action blocked -> all steps in AuditLog
```
### Data model
```js
ApprovalPolicy { subject, tiers:[{from,to,approverRoles[],approverUsers[],dual:Boolean,slaMinutes,escalateTo}], blockSelfApproval:true, requireReason:true, hospitalId }
ApprovalRequest { subject, entityRef, payload:{before,after,amount}, requestedBy, reason, tierIndex, status:'Pending'|'Approved'|'Rejected'|'Cancelled'|'Expired',
                  decisions:[{by,decision,note,at,viaDelegationOf}], appliedAt }
Delegation { fromUserId, toUserId, subjects[], from, to, reason, active }
```
### API
`POST /api/approvals/requests`, `GET /api/approvals/inbox`, `POST /api/approvals/requests/:id/decide {decision,note}`, `GET/PUT /api/approvals/policies/:subject`, `POST /api/delegations`.
### Libraries/Framework
Service layer function `requireApproval(subject, ctx, executor)` (higher-order) so every module calls the same helper; BullMQ for expiry/escalation; socket.io rooms `user:{id}` for live inbox; `zod`.
### UI design
- **Approvals Inbox** (sidebar badge with count): tabs `Pending for me | Requested by me | History`. Row = subject icon, patient/entity, amount, requester, age, SLA chip. Drawer shows before/after diff (red/green), bill summary, reason, attachments, buttons `Approve` (primary) / `Reject` (destructive, reason required).
- Inline in requester flow: instead of blocking error show a **"Needs approval from Billing Manager" banner** with status tracker (stepper).
- Policy admin page: tier table editor with live preview ("₹12,000 discount -> Manager").
### Animation
- Badge count: spring bump (framer-motion `scale 1→1.2→1`, 250ms) when new request arrives.
- Approve action: row collapses (`height→0, opacity→0`, 200ms) with `AnimatePresence`; toast via existing `sonner`.
### Tests
Self-approval blocked, delegation window, threshold boundary (exact limit), concurrent double-approve (idempotent), request expiry, audit completeness, role removed after request creation.

---

## 13.3 Rule & Alert Engine (config-driven)

**Why:** abhi alerts hardcoded hain (`clinicalAlerts.js`: code-blue, lab-panic, mtp). Hospital ko rules khud edit karne hote hain (thresholds, escalation, recipients).

### Logic
- **Rule** = `trigger` (event/stream/schedule) + `condition` (JSON expression) + `actions[]` + `severity` + `cooldown/dedupe key` + `ack requirement` + `escalation ladder`.
- Examples: `lab.result.created where flag='critical' -> alert ordering doctor + ward in-charge, must-ack 15 min, escalate to HOD`; `vitals.NEWS2>=7 -> rapid-response`; `stock.qty<=reorderLevel -> task to store`; `bed.cleaning>30min -> alert housekeeping supervisor`; `bill.balance>0 && discharge.initiated`; `drug.expiry<=60d`.
- Evaluation: **event-driven** (consume `OutboxEvent`/Kafka/BullMQ events) + **scheduled** sweeps (node-cron/BullMQ repeatable). Dedupe by `ruleId+entityId+window`.
- Clinical safety: rules that touch patient care are **versioned + approved by clinical_safety role** (role exists in enum), with test-fire sandbox.
- Alert lifecycle: `Open -> Acknowledged -> Resolved/Snoozed/Escalated`, with `ackBy`, `ackAt`, comments.

### Flow
`Source event -> RuleMatcher -> (cooldown/dedupe) -> Alert created -> delivery (in-app/socket, push, SMS/WhatsApp by severity) -> unacked timer -> escalation step -> resolve`.
### Data model
```js
Rule { key, name, domain:'clinical'|'inventory'|'finance'|'ops', trigger:{type:'event'|'cron', event, cron}, condition:Object /*json-rules*/, actions:[{type, params}], severity:'info'|'warning'|'critical', cooldownMin, ackRequired, escalation:[{afterMin, to:{role|user}}], enabled, version, approvedBy }
Alert { ruleKey, severity, entityRef, title, detail, status, recipients[], ackBy, ackAt, resolvedAt, escalatedLevel, snoozeUntil, hospitalId }
```
### Libraries
- Backend: **`json-rules-engine`** (conditions as JSON, facts from DB) or a tiny in-house evaluator (jsonlogic) if you want zero dependency; `bullmq` repeatable jobs; `ioredis` for dedupe keys (SET NX EX).
- Frontend: alert center list virtualised (`@tanstack/react-virtual`), live via existing socket.io.
- Migration: move 3 hardcoded endpoints into seeded rules; keep the endpoints as thin "manual trigger" wrappers.
### UI design
- **Alert Center** (top-bar bell opens right sheet using existing `sheet.tsx`/`vaul`): severity filter chips, grouped by patient/location, **critical** at top with persistent banner until acknowledged.
- **Rule Builder**: IF [fact ▼][operator ▼][value] AND/OR groups (nested), THEN [action list], preview "Would have fired 12 times last 7 days" (backtest), `Test-fire` button.
- Severity colors: info = `--info`, warning = `--warning`, critical = `--destructive` (all tokens already in `index.css`) + icon + text (never color-only).
### Animation
- Critical alert: **banner slide-down (200ms)** + subtle border pulse (CSS keyframe 1.6s, **max 5 cycles then static**, to avoid alarm fatigue); sound only if user enabled (`audioCallSounds.js` already exists in `lib/`).
- Ack: banner collapses, count decrements with number tween.
### Tests
Dedupe storms, cooldown, escalation chain, rule version rollback, backtest accuracy, rule disabled mid-alert, timezone (IST) for scheduled rules.

---

## 13.4 Task Management (clinical + operational)

Repo `Task` = CRM tasks. Hospital ke liye alag **`WorkTask`** (ya `Task.related.type` enum extend + `domain` field).

### Logic
- Task types: `collect_sample`, `clean_bed`, `transport_patient`, `deliver_blood`, `repair_equipment`, `approve_purchase`, `verify_rx`, `dispense`, `sterilise_set`, custom.
- Auto-created by workflows/rules/events (e.g. discharge finalised -> `clean_bed` for housekeeping; lab order -> `collect_sample` for phlebotomist).
- Status: `Pending -> Assigned -> InProgress -> Completed -> Verified` (+ `Blocked`, `Cancelled`).
- Assignment: direct, **pool claim** (first to accept), round-robin by shift roster + skill, geo/ward-based. Priority + SLA + **auto-reassign** if unaccepted in N min.
- Completion proof: scan (bed QR / sample barcode), photo, checklist, signature.
### Data model
```js
WorkTask { type, title, priority:'routine'|'urgent'|'stat', domain, entityRef, locationRef:{ward,bed,room}, assignedTo, pool:{role,ward}, status, slaAt, startedAt, completedAt, verifiedBy, checklist[], proof:{scanCode,photoUrl}, createdBy:'system'|userId, parentWorkflowInstanceId }
```
### API
`GET /api/work-tasks?mine=1&status=`, `POST /:id/accept|start|complete|verify`, `POST /api/work-tasks/bulk-assign`, socket `task:new`.
### Libraries/UI
- **Kanban board** for supervisors: `@dnd-kit/core + sortable` columns Pending/Assigned/In progress/Done; **My Tasks** list for staff (mobile-first, large tap targets, swipe-to-complete using framer-motion `drag="x"`).
- Task card: type icon, location chip (Ward-B / Bed 204), SLA ring (SVG circle progress, color shifts info->warning->destructive), priority stripe at left.
### Animation
- Drag: lift (`scale 1.02`, shadow), drop settle spring (`stiffness 400, damping 30`). Complete: check-mark path draw (SVG `pathLength`, 250ms) then card exits.
- New task arrival on mobile: haptic via `navigator.vibrate(30)` + list item slide-in.

---

## 13.5 Global Master Search

**Goal:** ek search box se `UHID / mobile / name / ABHA / bill / invoice / lab no / admission / IPD no / Rx / claim no / token / bed`.

### Logic
- **Query parser**: detect pattern prefixes (`U-`, `INV-`, `ADM-`, `LAB-`, `CLM-`, 10-digit mobile, 14-digit ABHA) -> targeted lookup first (exact, indexed), else fuzzy name search.
- Sources: Mongo indexed exact lookups (cheap) + existing **OpenSearch** `searchEhr` for names/free text (keep `assertEhrSearchAccess` for PHI authorisation).
- Results grouped: Patients | Admissions | Bills | Lab/Radiology | Prescriptions | Claims | Staff | Beds, each with **quick actions** (Open, Bill, Admit, Print wristband).
- RBAC: result types filtered by role; PHI minimised (mask phone/Aadhaar for non-clinical roles); every PHI search/open logged (audit + break-glass if outside care relationship).
- Recent + pinned searches; rate-limit; debounce 200ms; min 2 chars.
### API
`GET /api/search/global?q=&types=&limit=` -> `{groups:[{type,items[{id,title,subtitle,badge,url,actions[]}]}], took}`.
### Libraries/UI
- `cmdk` already in repo (`components/ui/command.tsx`) => **Ctrl/Cmd+K command palette** with scoped prefixes (`p:` patients, `b:` bills, `>` actions like "New OPD bill").
- `@tanstack/react-query` with `placeholderData` for no-flash; `useDeferredValue`.
### UI design
Palette modal centered (max-w 640), input top, grouped results, right-aligned keyboard hints (`↵ open`, `⌘↵ new tab`), patient row shows photo/initials, age/sex, UHID, payer chip, alert flags (allergy/MLC/VIP).
### Animation
Open: `opacity 0→1, y 8→0, scale .98→1` 140ms; results stagger 20ms (cap 8 items), no animation on subsequent keystrokes (avoid flicker).

---

## 13.6 Organisation / Facility Hierarchy & Master Data

### Target hierarchy
`Organization -> Hospital -> Branch -> Building -> Floor -> Wing -> Department -> Sub-department -> Unit/Ward -> Room -> Bed` + **Counters** (OPD counter, billing counter, pharmacy counter) + **Operating Theatres/Labs** as Locations.

### Logic
- Single `Location` tree (`type`, `parentId`, `path` materialised e.g. `/org1/h1/b2/bldgA/f3/wingW`) => query descendants with `path` regex/prefix index.
- Every transactional doc stores `hospitalId, branchId, locationId` (department/ward) => branch-wise billing/inventory/reports.
- **Central patient ID** at Organization level; visit/encounter at branch level.
- Bed statuses extend: `Available | Occupied | Reserved | Cleaning | Maintenance | Blocked | Isolation | Out-of-service` (+ `reason`, `until`).
- Ward types come from a **master** (not enum): `WardType {code, name, tariffClass, isCritical, genderPolicy}`.
- Fix `bedNumber` uniqueness: compound unique `{hospitalId, bedNumber}`; migrate existing data (script + dry-run).
- Department: add `parentId`, `headUserId` (ref User), `code`, `costCenter`, `isClinical`, `locationIds[]`.
### Masters to add (from doc) not yet in repo
Clinical: Symptom, Diagnosis (ICD-10 seed), Procedure (CPT/local), Protocol/CarePathway, Clinical template. Financial: DiscountRule, TaxRule (GST slabs), PaymentMethod, Counter. Operational: ShiftMaster, HolidayCalendar, ReasonCode (cancel/refund/discount/DAMA...), DocumentType, ConsentTemplate.
### Data model (core)
```js
Location { orgId, hospitalId, branchId, type:'Building'|'Floor'|'Wing'|'Dept'|'Ward'|'Room'|'Bed'|'OT'|'Lab'|'Counter', name, code, parentId, path, attrs:{}, active }
```
### Libraries/UI
- **Tree editor**: `@dnd-kit/sortable` + Radix `collapsible` (already installed) with indent guides; breadcrumb (existing `breadcrumb.tsx`).
- **Bed Board / Floor-plan view**: ward-wise grid of `BedTile` (see file 19) + optional floor plan using SVG with `maplibre-gl` NOT needed; use plain SVG/CSS grid.
- Bulk import masters via `exceljs` (already in backend) with validation report (row-wise errors) and dry-run.
### Animation
Tree expand/collapse height animation (Radix collapsible `data-state`), bed status change -> tile color crossfade 200ms + tiny scale pop.
### Tests
Tenant isolation after migration, path integrity when moving subtree, bed uniqueness per hospital, report roll-ups by branch.

---

## 13.7 Access-control extras (beyond current IAM)

Repo already has `IamRole/IamPolicy/IamGroup/IamAssignment`, `AccessRequest`, `AccessReview`, `BreakGlassGrant`, `LoginEvent`, 2FA. Missing from doc:
1. **Screen/field-level permission**: permission keys like `billing.discount.apply`, `emr.note.edit`, `patient.phone.view` (field mask). UI hides + API enforces (never UI-only).
2. **Financial approval limits per role** (feeds 13.2).
3. **Delegation / substitute user** with date range and scope (13.2 `Delegation`), audit shows "acted as X".
4. **Device/IP/location restrictions** (allow-list for admin; ward PCs bind to location), **shift-bound access** (nurse can log in only during assigned shift unless override).
5. **Idle lock** (15 min on shared PCs; PIN re-entry rather than full logout for ward tablets).
6. **Sensitive-record flags** (HIV, psychiatric, MTP, abuse) -> restricted view + reason prompt.
### UI
Permission matrix editor = table (rows permissions grouped by module, columns roles) with tri-state checkboxes, search, "diff vs template", export. Access review campaign UI: reviewer sees user -> roles -> last used; `Keep/Revoke`.
### Animation
Matrix cell toggle: instant (no animation, data-dense). Revoke -> row fade 150ms.

---

## 13.8 Patient Flags & Safety Banner

### Logic
`PatientFlag {patientId, type, severity, note, source, from, until, createdBy}`; types: `allergy`, `VIP`, `high_risk`, `fall_risk`, `isolation`, `MLC`, `DNR`, `pregnant`, `infectious`, `behavioural`, `blacklist`, `deceased`, `identity_unverified`.
- Auto flags from rules (13.3): NEWS2 high -> `high_risk`; positive culture -> `isolation`.
- **Deceased flag blocks** new billing/appointments (hard stop) except documentation; **blacklist** requires approval to register.
- Visible everywhere via one **PatientBanner** component (file 19): name, age/sex, UHID, ABHA, flags chips (red allergies first), payer, bed, doctor.
### Animation
New flag added while viewing: chip slides in from right + 1 gentle highlight; no looping animation on banners (safety-critical info must be stable/readable).
