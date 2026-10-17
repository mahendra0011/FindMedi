# 25 — Access Control Center (AWS-IAM jaisa) — Hospital/Clinic ke andar fine-grained access

> **Aapki requirement:** hospital (ya kisi bhi tenant) me owner/admin **kisi ko sirf selected cheez ka access** de sake — jaise AWS IAM me: "Ravi ko sirf Ward-3 ke vitals", "Meena ko sirf billing read", "intern ko 7 din ke liye sirf OPD schedule".
> **Review:** repo clone ki static padhai. App run nahi ki; jahan "verify" likha hai wahan khud check karo.

---

## 1. Abhi aapke code me kya hai (verified)

| Cheez | Current state |
|---|---|
| Permission model | **Static RBAC:** `config/permissions.js` → `ROLE_PERMISSIONS` (role → permission strings), `roleHasPermission()`, role aliases/families (`counselor`→`counsellor`, `doctor`≈`clinic_doctor`) |
| Permissions ka size | Routes me ~**41 distinct** strings (e.g., `records:read`, `billing:write`, `lab:enter_result`, `staff:manage`) — **coarse**: `records:read` = tenant ke saare records |
| Roles | ~25 **fixed** roles (`hospital_admin, doctor, nurse, lab_technician, pharmacist, accountant, …`). `superadmin: ['*']` |
| Hospital admin | Ek bundle role jisme ~50 permissions hain (records, billing, pharmacy, lab, patients, reports…) |
| Staff creation | `routes/staff.js` — `staff:manage` + `adminOnly`; role change par `requireStepUp('users:role-change')` ✅ |
| Patient self-service | `:own` suffix (`records:read:own`) ✅ achha pattern |
| Object-level | `authorizeObject`, tenant scope ✅ (404-on-mismatch), authz coverage scripts ✅ (`check-authz-coverage.mjs`) |
| **Custom roles / policies** | **Nahi hain** (grep: koi `customRole/policyDocument/permissionSet` nahi) |
| Resource scope (department/ward/location) | **Nahi** — role dene ka matlab poore tenant me access |
| Time/IP/MFA conditions | Nahi (sirf step-up for kuch actions) |
| Temporary access / approvals / access review | Nahi |

> **Gap:** admin ke paas "kaun kya kare" ka sirf **fixed role dropdown** hai. AWS-style me chahiye: **custom role + selected permissions + selected resources + conditions + expiry + audit**.

---

## 2. AWS IAM → FindMedi mapping

| AWS concept | FindMedi equivalent |
|---|---|
| Account | **Tenant** (hospital / clinic / lab / pharmacy / gym org) |
| Root user | **Tenant Owner** (2+ owners; MFA mandatory) |
| IAM User | **Staff member** (login identity) |
| IAM Group | **Team / Department group** (e.g., "Ward-3 Nurses", "Billing Team") |
| IAM Role | **Role** (custom ya managed template) |
| Policy (JSON) | **Access Policy** (Allow/Deny, actions, resources, conditions) |
| Managed policies | **System templates** (Nurse, Receptionist, Billing…) — read-only, versioned by platform |
| Inline/custom policies | **Tenant custom policies** |
| Permission boundary | **Boundary** (max power ek delegated admin/role de sakta hai) |
| SCP (Organizations) | **Platform guardrails** (jo koi tenant admin bhi grant nahi kar sakta — e.g., T3 vendor ko clinical data) |
| Resource ARN | **Resource path** (`record/<id>`, `ward/<id>`, `dept/<id>`, `bill/<id>`) + attributes |
| Condition keys | **Conditions** (MFA, IP, time/shift, department, care-team, sensitivity, consent) |
| STS temporary creds | **Time-bound grants** (expiry) + **break-glass** |
| Access Analyzer | **Access Analyzer** (over-permissioned, unused, stale, external) |
| Policy Simulator | **"Can X do Y on Z?" simulator** |
| Access Advisor (last used) | **Last-used permissions** report |
| CloudTrail | **Access & change audit** (immutable) |
| Access keys | **API keys/service accounts** (HL7/PACS/integrations) |
| MFA enforcement | **Conditions + tenant security settings** |

**Jo AWS feature copy NAHI karna (shuru me):** poora AWS JSON grammar (bahut complex). Pehle simple UI: *Role + Scope + Conditions*; JSON editor sirf advanced users ke liye.

---

## 3. Layered authorization model (evaluation order)

```
Request: (principal, action, resource, context)
 L0  Platform guardrails        ← SCP-jaisa: platform-wide hard limits (cannot be overridden by tenants)
 L1  Tenant boundary            ← tenantId match (cross-tenant = deny)
 L2  Identity policies          ← roles + groups + user policies (Allow/Deny)
 L3  Resource scope             ← department / ward / location / care-team
 L4  Conditions                 ← MFA, IP/device, shift/time, expiry
 L5  Sensitivity + consent      ← restricted labels (psych/HIV/etc.), patient consent, VIP, minors
 L6  Session/step-up            ← re-auth for sensitive actions, session policy
 Decision: explicit Deny > Allow > default Deny   (fail-closed on any error)
```

### 3.1 Evaluator (sketch)
```js
export async function can(principal, action, resource, ctx) {
  try {
    if (!guardrailsAllow(principal, action, resource)) return deny('guardrail');
    if (!principal.isPlatform && resource.tenantId !== principal.tenantId) return deny('tenant');

    const stmts = await effectiveStatements(principal);           // cached by (principalId, policyVersion)
    let allowed = false;
    for (const s of stmts) {
      if (!matchAction(s.actions, action)) continue;
      if (!matchResource(s.resources, resource)) continue;       // path + attribute match (no eval!)
      if (!evalConditions(s.conditions, ctx, principal, resource)) continue;
      if (s.effect === 'Deny') return deny('explicit-deny');
      allowed = true;
    }
    if (!allowed) return deny('default-deny');
    if (!withinBoundary(principal, action, resource)) return deny('boundary');
    if (!sensitivityAndConsentOk(principal, action, resource, ctx)) return deny('sensitivity/consent');
    return allow({ obligations: requiredStepUpOrReason(action, resource) });  // e.g. reason prompt, step-up
  } catch (e) { return deny('evaluator-error'); }                 // FAIL CLOSED
}
```
**Obligations:** allow ke saath conditions jaise "reason batao", "step-up karo", "access log banao".

### 3.2 Query-level enforcement (leak roko)
Sirf `can()` check kaafi nahi — **list/search endpoints me scope DB query me inject karo** (fetch-all-then-filter nahi):
```js
const scope = await scopeFilter(principal, 'records');   // { tenantId, departmentId:{$in:[...]}, sensitivity:{$nin:[...]} }
Record.find({ ...scope, ...userFilters });
```

---

## 4. Policy format (simple + safe)

```json
{
  "name": "Ward3-Nurse-Vitals",
  "version": 3,
  "statements": [
    {
      "sid": "VitalsInWard3",
      "effect": "Allow",
      "actions": ["patients:profile:read", "vitals:read", "vitals:write", "beds:read"],
      "resources": ["ward/ward-3/*"],
      "conditions": { "mfa": true, "shift": "current", "ip": ["hospital-network"] }
    },
    {
      "sid": "NeverRestricted",
      "effect": "Deny",
      "actions": ["records:restricted:*"],
      "resources": ["*"]
    }
  ]
}
```
- **Actions:** `module:resource:verb` (wildcards allowed: `records:clinical:*`).
- **Resources:** `type/id` paths + attribute selectors: `dept/{ownDepts}`, `patient/{careTeam}`, `ward/ward-3/*`.
- **Conditions (allowlist, no code eval):** `mfa`, `ip`, `device_trusted`, `time_between`, `shift`, `expires_at`, `dept_in`, `ward_in`, `careteam_includes_me`, `sensitivity_not`, `reason_required`, `consent_required`, `emergency_flag`.
- **Validation:** JSON-schema, size limits (e.g., ≤ 50 statements), no unknown keys, action must exist in catalog, resource types must exist; **no templating/eval/regex from user input** (ReDoS/injection).
- **Versioning:** every edit = new version; rollback; diff view; who changed.

### 4.1 Example policies (aapke jaise use-cases)
| Need | Policy idea |
|---|---|
| **"Ravi ko sirf Ward-3 ke vitals"** | Allow `vitals:*`, `patients:profile:read` on `ward/ward-3/*`; Deny `records:clinical:*` |
| **"Meena ko sirf billing read"** | Allow `billing:invoice:read`, `billing:report:read`; Deny `records:*`, `patients:contact:read` |
| **Receptionist** | Allow `appointments:*`, `patients:demographics:read/write`, `queue:*`; Deny `records:*`, `billing:refund:*` |
| **Intern, 7 din** | Allow `appointments:schedule:read` with `expires_at: +7d`, `dept_in: [OPD]` |
| **Doctor (care-team only)** | Allow `records:clinical:read/write` on `patient/{careTeam}`; Deny `records:restricted:*` unless `reason_required + consent` |
| **Lab technician** | Allow `lab:order:read`, `lab:result:enter` on `dept/lab`; Deny `lab:result:verify` (SoD) |
| **Auditor (read-only)** | Allow `audit:*:read`, `reports:*:read` (de-identified); Deny everything else |
| **Locum doctor (temporary)** | Role Doctor + condition `expires_at`, `ip: hospital-network`, `shift: current` |

---

## 5. Permission catalog (fine-grained; current 41 → ~120)

> Current `records:read` ko todo. Mapping rakho (backward compatible).

| Module | Actions (examples) | Sensitivity |
|---|---|---|
| **Patients** | `patients:demographics:read/write`, `patients:contact:read`, `patients:merge`, `patients:export` | Standard / Sensitive |
| **Appointments/OPD** | `appointments:schedule:read`, `appointments:book`, `appointments:cancel`, `queue:manage`, `token:issue` | Standard |
| **Clinical records** | `records:summary:read`, `records:clinical:read`, `records:clinical:write`, `records:clinical:amend` (step-up), `records:restricted:read` (psych/HIV/sexual/substance), `records:attachments:read`, `records:print` | Sensitive / **Restricted** |
| **Prescriptions** | `prescriptions:read`, `prescriptions:write`, `prescriptions:sign`, `prescriptions:cancel` | Sensitive |
| **Lab** | `lab:order:read/write`, `lab:sample:collect`, `lab:result:enter`, `lab:result:verify`, `lab:result:release`, `lab:catalog:manage` | Sensitive |
| **Radiology** | `radiology:order:read`, `radiology:image:view`, `radiology:report:write`, `radiology:report:verify` | Sensitive |
| **Pharmacy** | `pharmacy:stock:read`, `pharmacy:dispense`, `pharmacy:rx:verify`, `pharmacy:h1register:write`, `pharmacy:return` | Sensitive |
| **IPD/Beds/OT/Nursing** | `ipd:admit`, `ipd:discharge`, `beds:read/assign`, `ot:schedule`, `nursing:chart:write`, `vitals:read/write` | Sensitive |
| **Billing** | `billing:invoice:read/write`, `billing:discount:apply` (limit), `billing:refund:issue` (step-up), `billing:report:read`, `billing:insurance:claim` | Financial |
| **Insurance/TPA** | `insurance:preauth:read/write`, `insurance:claim:submit` | Financial/Sensitive |
| **Inventory/Procurement** | `inventory:read/write`, `po:create`, `po:approve` (SoD), `supplier:manage` | Standard |
| **Staff/HR** | `staff:profile:read`, `staff:manage`, `staff:salary:read` (restricted), `attendance:manage`, `payroll:run` | HR-sensitive |
| **Reports/Exports** | `reports:operational:read`, `reports:financial:read`, `reports:clinical:read` (de-identified), `export:identified` (step-up + approval) | Sensitive |
| **Communication** | `chat:read/write`, `notifications:send`, `broadcast:send` | Standard |
| **Settings/IAM** | `settings:manage`, `iam:user:invite`, `iam:role:create`, `iam:policy:attach`, `iam:grant:approve`, `apikey:manage` | **Admin-critical** |
| **Audit** | `audit:read`, `audit:export`, `accessreview:run` | Admin |
| **Emergency** | `emergency:access:breakglass` (reason + notify) | Restricted |

**Sensitivity classes:** `Standard` · `Sensitive` · `Restricted` (mental health, HIV/STD, sexual health, substance use, abuse cases) · `Financial` · `HR-sensitive` · `Admin-critical`.
Restricted/Admin-critical = **extra rules** (§8, §9).

---

## 6. Managed role templates (starting points; tenant clone/customize kar sakta hai)

> `R`=read, `W`=write, `—`=none, `own`=sirf apne patients/department. **Starting suggestion** — clinical advisor/ops se tune karo.

| Role template | Patients | Appts | Clinical records | Rx | Lab | Billing | Pharmacy | Inventory | HR | Reports | IAM/Settings |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Owner/Admin** | R/W | R/W | R (no restricted) | R | R | R/W | R | R/W | R/W | R | **Full** |
| **Medical Superintendent** | R | R | R (audit-style) | R | R | R | R | R | — | R | — |
| **Doctor** | care-team | R/W own | R/W care-team | W | order/read | — | — | — | — | own | — |
| **Resident/Intern** | care-team | R | R (W with co-sign) | draft | read | — | — | — | — | — | — |
| **Nurse (ward-scoped)** | ward | R | summary + vitals W | — | read | — | — | — | — | — | — |
| **Front-desk/Receptionist** | demographics | R/W | — | — | — | collect payment | — | — | — | — | — |
| **Billing executive** | demographics | R | — | — | — | R/W (discount limit) | — | — | — | financial | — |
| **TPA/Insurance exec** | limited | — | minimal necessary | — | — | claims | — | — | — | — | — |
| **Lab technician** | minimal | — | — | — | enter result | — | — | reagents | — | — | — |
| **Pathologist/Radiologist** | minimal | — | — | — | verify | — | — | — | — | — | — |
| **Pharmacist** | minimal | — | — | verify/dispense | — | — | R/W | R/W | — | — | — |
| **Store keeper** | — | — | — | — | — | — | — | R/W | — | — | — |
| **Accountant** | — | — | — | — | — | R/W | — | R | — | financial | — |
| **HR** | — | — | — | — | — | — | — | — | R/W | — | — |
| **IT admin** | — | — | — | — | — | — | — | — | — | — | users/roles (no PHI) |
| **Medical records officer** | R | — | R (no restricted) | R | R | — | — | — | — | — | — |
| **Quality/NABH officer** | — | — | de-identified | — | — | — | — | — | — | clinical (de-id) | — |
| **Auditor (read-only)** | — | — | — | — | — | R | — | R | R (no salary) | R | audit |
**Other tenant types — managed role templates (catalogue ke hisaab se):**

| Tenant type | Role templates |
|---|---|
| Dental clinic | Dentist · Dental assistant · Front desk · Lab-work coordinator · Billing |
| Eye clinic / optical | Ophthalmologist · Optometrist · Optician/job-card tech · Front desk |
| Dialysis centre | Nephrologist · Dialysis technician · Nurse · Water-quality officer · Billing |
| Fertility/IVF 🔒 | Fertility doctor · Embryologist · Counsellor · Coordinator (restricted-record roles only) |
| Lab / imaging | Lab technician · Pathologist · Radiographer · Sonographer · Receptionist · Collection coordinator · Phlebotomist |
| Pharmacy | Pharmacist · Pharmacy assistant · Store keeper · Delivery coordinator · Accountant |
| Elder-care / hospice | Care manager · Nurse · Attendant · Physician-on-call · Billing |
| Rehab / child-development / de-addiction 🔒 | Therapist · Counsellor · Case manager · Admin (restricted records need break-glass) |
| Vaccination centre | Vaccinator · Cold-chain officer · Registrar · Admin |
| Home-care agency | Agency admin · Roster coordinator · Nurse/attendant · Billing |
| Equipment vendor | Owner · Inventory manager · Delivery technician · Billing |
| Diet kitchen | Kitchen manager · Dietitian · Delivery coordinator · Billing |
| Gym / yoga / wellness (T3) | Owner · Manager · Trainer/instructor · Front desk · Accountant — **no clinical actions** |
| Camp organiser / NGO partner | Organiser · Camp coordinator · Check-in volunteer |
| Corporate (B2B) | HR admin · Billing admin — **aggregate/de-identified reports only** |
| Govt facility (Info) | Facility in-charge (info update only; no PHI) |

**Guardrail:** gym/yoga/wellness/store = T3 → clinical actions grant hi nahi ho sakte.

---

## 7. Access Control Center — UI sections (hospital admin)

```
ACCESS CONTROL
 ├─ Users               invite/disable, roles, groups, MFA status, last active
 ├─ Teams (Groups)      "Ward-3 Nurses", "Billing Team" — attach roles/policies
 ├─ Roles               templates + custom roles, clone, versions
 ├─ Policies            visual builder + JSON editor, validate, version/diff/rollback
 ├─ Resource Scopes     departments, wards, locations, care-teams
 ├─ Temporary Access    time-bound grants (expiry), auto-revoke
 ├─ Access Requests     staff request → approver(s) → grant
 ├─ Access Reviews      periodic certification ("is access still needed?")
 ├─ Policy Simulator    "Can <user> do <action> on <resource>? why/why not"
 ├─ Access Analyzer     over-permissioned, unused perms, stale users, risky combos (SoD)
 ├─ Activity & Audit    who accessed what; IAM changes; export (capped)
 ├─ API Keys & Integrations  service accounts (HL7, PACS, lab machines)
 └─ Security Settings   MFA required, IP allowlist, session length, password/passkey policy, break-glass rules
```

### 7.1 Role/policy builder (wireframe)
```
┌ Create role: "Ward-3 Nurse" ─────────────────────────────────────────┐
│ Start from: [Nurse template ▾]    Boundary: Dept Admin (max)           │
│ Permissions (tick):                                                    │
│  Vitals      ▢ read ▣ write         Patients ▣ profile-read ▢ contact   │
│  Records     ▣ summary-read ▢ clinical ⛔ restricted (not allowed)      │
│  Beds        ▣ read ▢ assign                                           │
│ Scope:  Department [Nursing ▾]  Ward [Ward-3 ▾]  Patients [care-team ▾]│
│ Conditions: ▣ MFA   ▣ During shift   ▢ Hospital network only            │
│ Expiry: [None ▾]                                                        │
│ ⚠ Analyzer: 0 risky combos      [Simulate]  [Save as v1]  [Assign…]    │
└───────────────────────────────────────────────────────────────────────┘
```
### 7.2 Policy simulator
```
User: Ravi K.   Action: records:clinical:read   Resource: patient/P-1043 (Ward-5, Cardiology)
Result: ❌ DENY — reason: resource outside scope (Ward-3 only) · policy: Ward3-Nurse-Vitals v3 · Statement: VitalsInWard3
Try: change scope · request access · view effective permissions
```
### 7.3 Access Analyzer findings (examples)
"Role *Receptionist* can read clinical records (unused for 90 d) → remove" · "User *Meena* has billing:write + billing:refund + po:approve (SoD risk)" · "5 users without MFA" · "Locum access expired 3 days ago but account active" · "Admin role assigned to 9 users (reduce)" · "API key unused 60d / no IP binding".

---

## 8. Healthcare-specific controls (AWS me nahi milte — yahan zaruri)

| Control | Kya |
|---|---|
| **Care-team (need-to-know)** | Doctor/nurse sirf wahi patients dekh sake jinse unka treating relationship hai (appointment/admission/assignment). Others ko "not in care team" |
| **Sensitivity labels** | Records par label: `standard / sensitive / restricted / vip / minor`; restricted ko alag permission + reason + step-up |
| **Restricted categories** | Mental health, HIV/STD, sexual & reproductive health, substance use, abuse/MLC: default **deny**; sirf trained roles (e.g., treating psychiatrist/counsellor) |
| **Reason-for-access** | Sensitive/restricted open karne par reason dropdown (treatment, billing query, audit…) → log |
| **Patient consent layer** | Patient ke consents (ABDM ✅) policy me condition: `consent_required` |
| **Emergency break-glass (tenant-level)** | Doctor ko not-in-care-team patient ka emergency access: reason + time-box (30–60 min) + alert to compliance officer + patient-visible log |
| **VIP / restricted patients** | "Restricted chart" flag → sirf named staff; baaki ko alert-on-attempt |
| **Colleague/relative snooping** | Staff ke apne relatives/colleagues ke records khole to extra alert/review |
| **Minors/guardian rules** | Guardian-based access rules; adolescent confidentiality settings |
| **Shift/location binding** | Access shift-time/hospital-network tak (jahan zaruri) |
| **Patient-visible access log** | Patient dekh sake "kisne meri file kab dekhi" (DPDP trust) |
| **Segregation of duties (SoD)** | Same person: create PO + approve PO ✗; enter lab result + verify ✗; bill + refund approve ✗; dispense H1 + edit register ✗ |
| **Four-eyes** | High-risk: `export:identified`, `records:clinical:amend`, role→admin grant, large refunds |

---

## 9. IAM ki apni security (kya-kya add hogi)

| Threat | Control |
|---|---|
| **Privilege escalation** (admin khud ko ya dost ko zyada power de) | Boundary: aap wahi permissions de sakte ho jo aapke paas hain; `iam:*` actions alag high-risk; no self-grant; dual approval for admin-critical grants |
| **Last-owner lockout / takeover** | Minimum 2 owners; last owner remove/demote blocked; owner changes need step-up + email alert + cooling period |
| **Over-permissive custom roles** | Managed templates; analyzer warnings; "*" action/resource blocked for tenants; max statements/size; risky combos flagged (SoD) |
| **Policy injection / evaluator bugs** | Strict JSON-schema; allowlisted conditions; **no eval/regex from user input**; catalog-validated actions; property-based tests; fail-closed |
| **Stale/leaked permissions via cache** | Permission cache keyed by `(user, policyVersion)`; version bump invalidates; `tokenVersion++` on role/policy change ✅ (existing pattern) → sessions refresh; short TTL; sockets disconnect on revoke |
| **JWT carries power** | JWT me sirf `userId, tenantId, roleIds, tv`; **permissions server-side resolve** (token se nahi) |
| **Account takeover of admins** | Passkeys/TOTP mandatory for IAM-capable users (`TWO_FACTOR_REQUIRED_ROLES`), step-up for IAM changes, new-device alerts, IP allowlist optional |
| **Insider snooping** | Reason-for-access, care-team, anomaly alerts (mass views, off-hours, relative records), patient-visible logs, periodic access reviews |
| **Tampering with logs** | Immutable/append-only audit (hash-chain or external sink); IAM changes + access events; tenant admins can't delete |
| **API key abuse** | Keys scoped to policy, hashed at rest (show once), expiry, IP binding, rate limit, rotation, last-used, instant revoke; no PHI-wide keys |
| **Cross-tenant leakage** | tenantId in every query ✅, resource tenant check in evaluator, isolation tests; platform roles separate (file 23) |
| **Dangling access after offboarding** | Offboarding checklist: disable user → revoke sessions/tokens/API keys → reassign tasks → access review; auto-disable on HR termination/inactivity (e.g., 60d) |
| **Over-reliance on UI** | Server-side enforcement only; UI hides but backend decides |
| **Policy sprawl/confusion** | Simulator, analyzer, naming standards, ownership, review cadence |
| **DoS via heavy evaluation** | Cached effective permissions, limits, timeouts, simple matchers |
| **Replay/CSRF on IAM endpoints** | CSRF ✅, idempotency keys, rate limits, step-up |
| **Privilege creep** | Quarterly access reviews (certify/revoke), "last used" data, expiring grants default |

**Tests (must):** auto-generate authz matrix from policies; property-based tests for evaluator (deny precedence, scope isolation); IDOR/tenant sweeps with custom roles; regression for escalation paths; policy fuzzing; migration equivalence tests (old role == managed template).

---

## 10. Data model (new collections)

```js
Role            { tenantId|null(system), name, type:'managed|custom', policyIds[], boundaryId?, version, createdBy }
Policy          { tenantId|null, name, type:'managed|custom', statements[], version, status, createdBy }
PolicyVersion   { policyId, version, statements[], changedBy, changeNote, at }
Group           { tenantId, name, memberIds[], roleIds[], policyIds[] }
Assignment      { tenantId, principalType:'user|group', principalId, roleId|policyId, scope:{deptIds,wardIds,locationIds,careTeam:true?},
                  conditions:{...}, expiresAt?, grantedBy, approvedBy?, reason }
ResourceScope   { tenantId, type:'department|ward|location', name, parentId?, ... }
AccessRequest   { tenantId, requesterId, requested:{role|policy|actions,scope}, reason, status, approverIds[], decidedAt }
AccessReview    { tenantId, cycle, reviewerId, items:[{assignmentId, decision:'keep|revoke', note}], completedAt }
Grant (temporary/break-glass) { principalId, subject, actions, reasonCode, ticket, startsAt, expiresAt, approvedBy[], patientNotifiedAt, accessLog[] }
ApiKey          { tenantId, name, policyId, hash, prefix, ipBinding[], expiresAt, lastUsedAt, createdBy, revokedAt }
IamAuditEvent   { tenantId, actor, action, target, before, after, ip, ua, at, hash, prevHash }   // append-only
// Existing: User.role (system role) stays → mapped to managed role
```
Indexes: `{tenantId, principalId}`, `{expiresAt}` (TTL job), `{tenantId, status}`.

## 11. Existing system se migration (bina tode)

1. **Inventory:** `authz-manifest` ✅ se saare routes + unki current permission strings nikalo; naye fine-grained actions ka **mapping table** banao (e.g., `records:read` → `records:summary:read + records:clinical:read`).
2. **Managed roles = existing roles:** `ROLE_PERMISSIONS` ko system templates ke roop me convert; behaviour **identical** rakho (equivalence tests).
3. **Engine shadow mode:** naya `can()` chalao par decision old `authorize()` ka hi use ho; mismatches log karo (1–2 sprints).
4. **Scopes introduce:** department/ward/care-team models + query-level scope filters — pehle read endpoints, phir write.
5. **Custom roles UI** (hospital admin) behind feature flag — pilot 2–3 hospitals.
6. **Enforce** module-wise (restricted records pehle → clinical → billing → baaki); remove coarse checks.
7. **Conditions/temporary/approvals/reviews/analyzer** next.
8. **API keys/SSO (SAML/OIDC)/SCIM** later.
9. Superadmin/platform roles ko same engine par laao (file 23 ke guardrails/break-glass ke saath).

## 12. Build plan (rough; velocity se re-estimate)

| Phase | Scope | Size |
|---|---|---|
| **A — Foundation** | Action catalog, managed roles mapping, `Role/Policy/Assignment` models, evaluator + cache + audit, shadow mode, tests | L |
| **B — Scopes & custom roles** | Departments/wards/care-team, query-level scope, role/policy builder UI, simulator, step-up on IAM | L |
| **C — Governance** | Conditions (MFA/IP/shift), temporary access, access requests/approvals, access reviews, analyzer, SoD rules | L |
| **D — Healthcare depth** | Sensitivity labels, restricted-category rules, reason-for-access, tenant break-glass, patient-visible access log, VIP/relative alerts | L |
| **E — Integrations** | API keys/service accounts, SSO/SCIM, platform-roles unification | M |

## 13. Risks & mitigations
| Risk | Mitigation |
|---|---|
| **Complexity → misconfiguration** (AWS ki sabse badi problem) | Templates first, simple UI, simulator, analyzer, safe defaults, limits |
| Performance (per-request policy eval) | Cache effective permissions, precompute scopes, indexed scope fields |
| Breaking existing hospitals | Shadow mode, equivalence tests, flags, staged enforcement |
| Admins confused/locked out | Owner recovery flow, ≥2 owners, support-assisted recovery with strong verification |
| Policy sprawl | Quotas per tenant, ownership, review cadence |
| Security bugs in evaluator | Fail-closed, property tests, independent review/pentest of IAM |
| Compliance mismatch | Align with DPDP/medical confidentiality; document access model in DPIA/Privacy Policy |

## 14. Checklist
- [ ] Action catalog (~120) + sensitivity classes + mapping from current 41 permissions
- [ ] Managed role templates per tenant type; equivalence tests with `ROLE_PERMISSIONS`
- [ ] Models: Role, Policy(+versions), Group, Assignment, ResourceScope, AccessRequest, AccessReview, Grant, ApiKey, IamAuditEvent
- [ ] Evaluator (`can()`), fail-closed, cached by policyVersion, `tokenVersion` bump on change
- [ ] Query-level scope injection for list/search endpoints; care-team + department/ward scopes
- [ ] Platform guardrails (SCP-like); T3 tenants cannot get clinical actions
- [ ] Boundary + anti-escalation rules; ≥2 owners; last-owner protection
- [ ] Builder UI + JSON editor + validation + versioning + simulator + analyzer
- [ ] Conditions: MFA, IP/device, shift/time, expiry; temporary access + approvals + reviews
- [ ] Sensitivity labels + restricted-category rules + reason-for-access + tenant break-glass
- [ ] SoD rules + four-eyes for high-risk actions
- [ ] Patient-visible access log + anomaly alerts (mass views, off-hours, relatives/colleagues)
- [ ] Immutable IAM/access audit; API keys (hashed, scoped, expiring, IP-bound)
- [ ] Tests: generated authz matrix, property-based evaluator tests, tenant isolation sweeps, escalation regression
- [ ] Docs: admin guide (kaise least-privilege roles banayein), SECURITY.md/DPIA/Privacy Policy update
