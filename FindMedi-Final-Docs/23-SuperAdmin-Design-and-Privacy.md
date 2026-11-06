# 23 — Super Admin: Kya Rakhna Hai, Kya Hatana Hai, Privacy Kaise Bachegi

> **Goal:** aapka platform chalane ka kaam (providers approve karna, refunds, disputes, support, moderation, finance, compliance) **bhi ho**, aur **patients/providers ki privacy bhi bachi rahe**.
> **Core rule:** *Platform operators marketplace chalate hain; patient ka clinical data default me nahi dekhte.* Zarurat ho to **break-glass** (reason + time-box + audit + alert).
> Review: repo clone ki static padhai (superadmin pages, routes, middleware). App run nahi ki; jin routes ko maine nahi dekha unhe verify karna.

---

## 1. Abhi aapke code me kya hai (verified)

### 1.1 Superadmin pages jo mile
`UserManagement · DataExport · EmergencyWarRoom · AllFacilities · SupportTickets · AuditLogs · SuperAdminTeam · Security · Legal · AiSafety · Disputes · KycCommand · TenantQuotas` + endpoints: pending approvals, facilities, delivery-partners, lawyers/assistants/riders (pending + list), revenue, SOS/vehicle settings, categories, licences, commission, coupons, featured listings, content, broadcast, integrations, cities, deletion requests, review moderation, ops health, wallet guards.

### 1.2 Privacy ke nazariye se findings (important)

| # | Finding | Kahan | Risk |
|---|---|---|---|
| 1 | **`superadmin` = god-mode:** permission check `if (role === 'superadmin') return next()` | `middleware/authorize.js:15` | Ek compromised/curious admin account = poora platform |
| 2 | **Superadmin kisi bhi record ko access kar sakta hai** (`canAccessRecordDoc` → `true`) | `routes/records.js:381` | Medical records bina reason ke readable |
| 3 | **Patients list/lookup:** "superadmin sees all" | `routes/patients.js` (~L22, L32) | Poora patient directory |
| 4 | **Mental-health:** superadmin ke liye list `filter = {}` (sab records) + tenant check skip | `routes/mentalhealth.js:188, :120` | **Sabse sensitive data** platform-wide visible |
| 5 | **Appointments platform-wide** for superadmin | `routes/appointments.js:84, :269` | Kaun kis doctor ko kyun dikha raha hai |
| 6 | Lab ("superadmin → anyone"), billing, IPD, triage, nursing, insurance, pharmacy me tenant-bypass | respective `routes/*.js` | Tenant isolation superadmin par lagu nahi |
| 7 | **Sirf 5 step-up scopes:** `export:full`, `payouts:add`, `records:amend`, `refunds:issue`, `users:role-change` | `requireStepUp` usage | PHI **read** par koi step-up/reason nahi |
| 8 | **PHI-access ka alag audit event mujhe nahi mila** (grep: `phi_view/record_viewed/...` — koi match nahi) | AuditLog usage | "Kisne meri file dekhi?" ka jawab nahi (DPDP + patient trust) — *verify karo, ho sakta hai aur naam se ho* |
| 9 | `SuperAdminTeam` sirf `role: superadmin` users list karta hai — **scoped sub-roles nahi** | `SuperAdminTeam.tsx` | Har admin ko full power ya kuch nahi |
| 10 | `chat`, `mindsupport`, `vitals`, `healthId` routes me explicit superadmin mention nahi (achha), par generic `authorize()` bypass lag sakta hai | — | Verify per-route |

**Achhi baatein (already ✅):** `export:full` step-up + capped/audited exports, `platformAdminOnly`, `superadminOnly` on platform config routes, audit logs, role-change step-up, `TWO_FACTOR_REQUIRED_ROLES` support.

> **Conclusion:** abhi superadmin ek "sab kuch dekh sakta hai" role hai. Privacy-by-design ke liye ise **tod kar scoped roles + break-glass** banana chahiye.

---

## 2. Naya model: role split (superadmin ko tod do)

### 2.1 Roles (naye admin roles)

| Role | Kaun | Kya kar sakta hai | PHI? |
|---|---|---|---|
| **Owner / Super Admin** | 2–3 log max (founders) | Roles assign, billing plan, break-glass **approve**, kill-switches | **Nahi** (sirf break-glass se) |
| **Platform Admin (Config)** | Product/ops lead | Categories, cities, feature flags, commission, coupons, notification templates | Nahi |
| **KYC / Compliance Reviewer** | Verification team | Provider applications, docs, licences, re-verification | Provider KYC docs (business data), patient PHI **nahi** |
| **Catalog Manager** | Content/ops | Taxonomy, test/medicine masters, product approvals | Nahi |
| **Moderator** | T&S team | Reviews, profiles, events, UGC, reports | Masked; no records |
| **Support Agent (L1)** | Support | Tickets, booking/order status, refunds (limit) | **Masked** PII; no records |
| **Support Specialist (L2)** | Senior support | Disputes, larger refunds, patient-consented session view | Masked; consent-based reveal |
| **Finance Admin** | Finance | Payouts, reconciliation, GST/TDS, refunds approval | Money data; no clinical |
| **City / Ops Manager** | Field ops | Supply onboarding, city launch, camps approvals, provider success | Aggregates + provider data |
| **Medical Reviewer / Content Editor** | Clinical advisor | Articles, claims review | Nahi |
| **Clinical Safety Officer** | Clinical advisor (part-time) | Safety incidents, crisis escalations, AI-safety events | **Break-glass only**, minimal |
| **Data Protection Officer (DPO)** | Privacy owner | DSR queue, consent ledger, breach register, access-log review | Metadata + DSR-scoped data |
| **Security Admin** | DevSecOps | Sessions, keys, alerts, IP allowlist, audit | Nahi (logs masked) |
| **Analyst** | Data | Aggregated dashboards | **Aggregated only** (k ≥ 10) |
| **Auditor (read-only)** | External/internal | Audit logs, configs, compliance evidence | Nahi |

### 2.2 Data-access matrix (kya dikhega)

| Data type | Owner | Config | KYC | Support L1 | Support L2 | Finance | Moderator | DPO | Analyst | Clinical Safety |
|---|---|---|---|---|---|---|---|---|---|---|
| Patient identity (name/phone/email) | masked | ❌ | ❌ | **masked** | masked + reveal-with-reason | masked | masked | scoped (DSR) | ❌ (pseudonymous) | break-glass |
| Medical records/Rx/reports | ❌ | ❌ | ❌ | ❌ | ❌ (consent only) | ❌ | ❌ | DSR-scoped | ❌ | **break-glass** |
| Mental-health/sexual-health/de-addiction | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | DSR-scoped | ❌ | **break-glass + dual approval** |
| Chats/calls content | ❌ | ❌ | ❌ | ❌ | consent/ticket-evidence only | ❌ | reported-content only | ❌ | ❌ | break-glass |
| Booking/order metadata (no clinical) | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | aggregate | ✅ |
| Payments/refunds | ✅ | ❌ | ❌ | limited | ✅ | ✅ | ❌ | ❌ | aggregate | ❌ |
| Provider business data & KYC docs | ✅ | ✅ | ✅ | limited | limited | payout fields | profile only | ✅ | aggregate | ❌ |
| Provider staff data | ✅ | ❌ | scoped | ❌ | ❌ | ❌ | ❌ | scoped | ❌ | ❌ |
| Aggregated analytics | ✅ | ✅ | ✅ | limited | limited | ✅ | ❌ | ✅ | ✅ | ✅ |
| Audit logs | ✅ | ❌ | own actions | ❌ | ❌ | own | ❌ | ✅ | ❌ | ❌ |
| System config/secrets | ✅ (no secret values) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 3. Sidebar: kya rakho, kya add karo, kya hatao/restrict karo

### 3.1 ✅ KEEP (with changes)

| Section | Change |
|---|---|
| **Dashboard** | Sirf **aggregated** KPIs (k ≥ 10); no patient names/lists |
| **KYC Command / Approvals / Licences** | Role: KYC Reviewer; split-pane review workspace (file 08); two-person approval for high-risk; doc viewer watermarked, no bulk download |
| **All Facilities / Providers** | Business data only; suspend/delist/merge with reason; branch view; **no patient counts per provider that reveal individuals** |
| **Categories / Cities / Commission / Coupons / Featured** | Role: Platform Admin / Catalog Manager; change-history + approval for commission/coupon changes |
| **Disputes / Support Tickets** | Support L1/L2; masked data, evidence attachments from parties, SLA timers, refund limits by role |
| **Review Moderation / Content / Broadcast** | Moderator/Editor; claims-policy filters; **broadcast** needs approval + no PHI targeting + DND/consent |
| **Security (adminSecurity)** | Security Admin: sessions, IP allowlist, 2FA enforcement status, key-rotation reminders |
| **Audit Logs** | Auditor/DPO/Owner; searchable; export capped; **hash-chain/immutable** |
| **Tenant Quotas / Ops Health / Wallet Guards** | Ops/Security roles |
| **Legal** | DPO/Compliance: policy versions, acceptance records, takedown/legal requests |
| **AI Safety** | Clinical Safety Officer/DPO: aggregated flags; transcript view = break-glass |
| **Emergency War Room** | Keep, but **role-gated (Clinical Safety/Ops on-call)**; show live incident metadata (type, location **coarse**), patient identity masked until incident-lead break-glass |
| **Revenue / Finance** | Finance Admin; reconciliation, payouts (dual approval), GST/TDS reports |
| **Delivery partners / riders / assistants / lawyers (pending + list)** | KYC Reviewer + Provider Success; background-check docs restricted; police-verification docs access audited |
| **SOS / Vehicle settings** | Platform Admin; change-approval |
| **Super Admin Team** | Convert to **Admin Team & Roles** (see §3.2) |
| **Deletion requests** | DPO queue (DSR workflow) |
| **Data Export** | Keep **capped + step-up ✅**; default = **de-identified**; identified export only via DPO + dual approval + purpose + expiry |

### 3.2 🆕 ADD these sections

| Section | Why | Key features |
|---|---|---|
| **Admin Team & Roles** | Scoped permissions instead of god-mode | Role templates (§2), custom permission sets, invite/offboard, access reviews, last-active, 2FA/passkey status, forced logout, IP/device restrictions |
| **Break-glass Requests** | Controlled PHI access | Request (reason, ticket/incident id, subject, scope, duration) → approver(s) → time-boxed grant → auto-revoke → patient notification (after, unless law prevents) → review report |
| **Privacy Centre (DPO)** | DPDP duties | DSR queue (access/correct/erase/export/consent withdrawal) with SLA timers, consent ledger, children's-data cases, breach register, vendor/DPA register, retention-job status, **"who accessed what" report** |
| **Access Review & Alerts** | Insider-risk detection | Dashboards: PHI break-glass usage, mass views/exports, off-hours access, new admins, role changes, failed step-ups; alerts to Owner/Security |
| **Trust & Safety Console** | Fraud, safety, crisis | Incident lane, crisis escalation queue (24x7), fraud signals (fake reviews/providers/coupons), blocklists/denylists, strikes |
| **Provider Quality & Strikes** | Marketplace health | Scorecards, strike ladder, probation, payout holds, re-verification calendar |
| **Document Expiry Tracker** | Licences expire | 60/30/7-day queue, auto-hide rules |
| **Compliance Register** | Regulatory control | Regulation → owner → evidence → due date; policy acceptance records |
| **Policy & Template Manager** | Versioned legal/comms | ToS/Privacy/Provider agreements versions, notification templates (incl. **discreet variants**), localisation |
| **Marketplace Analytics (aggregate)** | Business decisions | Supply/demand by city/category, unmet-demand searches, funnels, cohort retention — **k-anonymous** |
| **Finance Ops** | Money | Payout runs (dual approval), holds, reconciliation, chargebacks, TDS/GST |
| **Support Workspace** | Efficient support | Unified inbox, macros, **masked customer card**, reveal-with-reason, patient-consented "assist session" |
| **Feature Flags & City Launch** | Controlled rollout | Unleash ✅ UI: per category/city toggles, kill switches (owner-only) |
| **Vendor & Integration Health** | Reliability | Payment/SMS/WhatsApp/LiveKit status, failover toggles |
| **Change Log / Approvals** | Maker-checker | Pending sensitive changes (commission, payouts, role→admin) awaiting second approver |

### 3.3 ⛔ REMOVE or heavily RESTRICT

| Item | Action |
|---|---|
| Superadmin **patient list/search** with identity | Remove from default; replace with masked support lookup (by booking/order ID or patient-provided code) |
| Superadmin access to **medical records, prescriptions, reports, vitals, care plans** | Remove default; break-glass only |
| **Mental-health records list** (`filter = {}`) | **Remove for all admin roles**; aggregated counts only; clinical-safety break-glass with dual approval |
| **Chat/call content browsing** | Remove; reported-message snippets only within moderation/dispute evidence |
| **"Impersonate/view-as" with full data** | Replace with read-only, masked, time-boxed, audited "view-as" (no PHI) |
| **Bulk exports of identified data** | Restrict to DPO flow (dual approval + purpose) |
| Shared admin accounts | Remove; individual accounts + 2FA/passkeys |
| Permanent super-admin credentials for engineers | Remove; break-glass + time-boxed |
| Free-text "notes" visible across roles containing health info | Restrict; structured fields; redact |
| Raw document downloads for reviewers | View-only watermarked; download needs permission |
| Superadmin bypass in `authorize()` / `canAccessRecordDoc` / tenant filters | **Replace with permission-based checks** (§5) |

---

## 4. PHI access model: default deny + break-glass

### 4.1 When is PHI access *legitimately* needed?
1. Patient-initiated support ("please check my report issue") → **patient consent / assist code**.
2. Clinical-safety incident (adverse event, wrong medicine, crisis) → Clinical Safety Officer.
3. Legal/regulatory order (court/police/regulator) → Legal + DPO + Owner dual approval.
4. Fraud/abuse investigation involving records → T&S + DPO.
5. Data migration/repair (rare) → engineering with approval + masked/sandbox where possible.

### 4.2 Break-glass flow
```
Requester → [reason code + ticket/incident ID + subject (single patient/record) + scope + duration ≤ 60 min]
        → Approver (different person; dual approval for mental/sexual health, legal requests)
        → Time-boxed grant token (scoped: subject+fields+actions=READ)
        → Every read logged (who, what, when, why, grant ID)
        → Auto-expire; session banner "BREAK-GLASS ACTIVE"
        → Patient notified after (in-app/email) unless legally restricted
        → Post-access review by DPO (weekly sample 100%) + alerts on anomalies
```
**Rules:** no bulk; no export; no copy/print (watermark); view-only; subject must be linked to a ticket; self-approval impossible; repeated use triggers review.

### 4.3 Support without PHI (default)
- **Masked customer card:** `Rahul K***`, `98******12`, `r***@gmail.com`, area-level address.
- Support sees: booking ID, status timeline, provider, fee, payment, refund state, policy snapshot, device/app version, non-clinical error logs.
- **Assist session:** patient shares a short-lived code (OTP) from app → support gets scoped view of *only that item* (e.g., one booking's issue) for 15–30 min; logged.
- **Reveal-with-reason:** reveal one masked field (e.g., phone for callback) with reason; rate-limited; audited.
- **Evidence handling:** attachments user uploads to a ticket = visible to support for that ticket only; auto-purge after retention.

### 4.4 Privacy-preserving admin data views
- Aggregates need **k-anonymity (min group ≥ 10)**; suppress small cells.
- No raw free-text health content in dashboards/tickets; classify tickets by category codes.
- Geography coarse (area/H3 cell), age bands, price bands.
- Analytics via pseudonymous IDs (file 17); mapping table access restricted (DPO/security).
- Sensitive categories: **count-only** everywhere outside the clinical relationship.
- Exports: **de-identified by default**; identified exports = DPO flow with expiry & watermark.

---

## 5. Code-level changes (implementation guide)

### 5.1 Replace blanket bypass with permissions
```js
// middleware/authorize.js  (today: if (role==='superadmin') return next())
// New: superadmin NO LONGER auto-passes PHI-class permissions
const PHI_PERMISSIONS = new Set(['records:read','patients:read','mentalhealth:read','chat:read','prescriptions:read', ...]);

export const authorize = (...perms) => (req,res,next) => {
  const role = req.user?.role;
  if (!role) return res.status(401).json({ message:'Not authorized' });
  const need = perms.flat();
  const ok = need.every(p => roleHasPermission(role, p));            // role→permission matrix (config/permissions.js)
  if (!ok) return res.status(403).json({ message:'Forbidden' });
  if (need.some(p => PHI_PERMISSIONS.has(p)) && isPlatformRole(role)) {
    // platform roles must hold an active break-glass grant for this subject
    return requireBreakGlass(req,res,next);
  }
  next();
};
```
Define new roles in `User.role` enum + `config/permissions.js`: `platform_admin, kyc_reviewer, catalog_manager, moderator, support_l1, support_l2, finance_admin, dpo, security_admin, clinical_safety, analyst, auditor` (+ keep `superadmin` as *Owner* with minimal permissions, **no PHI permissions**).

### 5.2 Break-glass grant model & middleware
```js
// models/BreakGlassGrant.js
{ requesterId, approverIds:[], subject:{type:'patient|record|booking', id}, scope:['read'], fields:[],
  reasonCode, ticketId, durationMin, approvedAt, expiresAt, revokedAt, status:'pending|approved|expired|revoked|denied',
  accessLog:[{ts, route, objectId}], patientNotifiedAt }

// middleware/requireBreakGlass.js
export async function requireBreakGlass(req,res,next){
  const subjectId = resolveSubjectId(req);               // from route/objectId
  const g = await BreakGlassGrant.findOne({ requesterId:req.user._id, 'subject.id':subjectId, status:'approved', expiresAt:{ $gt:new Date() } });
  if(!g) return res.status(403).json({ message:'Break-glass approval required', code:'BREAK_GLASS_REQUIRED' });
  await logPhiAccess({ grantId:g._id, actor:req.user._id, route:req.originalUrl, subjectId });   // immutable audit
  req.breakGlass = g; next();
}
```
Plus: step-up (`requireStepUp('phi:breakglass')`) to *request/approve*; alerts on creation; weekly DPO report.

### 5.3 Specific code fixes
| File | Change |
|---|---|
| `routes/records.js:381` `canAccessRecordDoc` | `superadmin → true` hatao; `breakGlass` grant check instead |
| `routes/patients.js` | superadmin list → **masked DTO** (no identity) or disabled; support lookup by booking/order ID |
| `routes/mentalhealth.js:120,188` | Remove superadmin branches; admin roles get **aggregates only** endpoint; clinical-safety = break-glass + dual approval |
| `routes/appointments.js:84,269` | Platform-wide listing → metadata-only DTO (no reason/symptoms/notes) |
| `routes/lab.js`, `billing.js`, `ipd.js`, `triage.js`, `nursing.js`, `insurance.js`, `pharmacy.js` | Tenant-bypass for superadmin → platform roles get **metadata/financial views** only; PHI fields stripped |
| `middleware/authorize.js:15` | Remove blanket superadmin pass (see 5.1) |
| `AuditLog` | Add events: `phi_access`, `breakglass_requested/approved/denied/expired`, `admin_role_changed`, `export_created`, `masked_field_revealed`; hash-chain or external append-only sink |
| `requireStepUp` | Add scopes: `phi:breakglass`, `admin:role-assign`, `commission:change`, `payout:approve`, `legal:takedown`, `export:identified`, `provider:ban` |
| `authz-manifest` + tests | Mark PHI routes `phiClass: true`; **authMatrix**: every platform role → DENY on PHI routes without grant; with grant → ALLOW only for that subject; `dtoLeak` for admin DTOs (no identity/PHI) |
| Frontend | New nav from permissions; masked components; "BREAK-GLASS ACTIVE" banner; remove patient-list/records pages from superadmin nav |

### 5.4 Migration without breaking your ops
1. **Shadow mode (1–2 sprints):** log "would-deny" for superadmin PHI access; see what ops really use.
2. Build masked support tools + aggregate dashboards so ops don't *need* PHI.
3. Introduce new roles; move current admins into them; keep one **Owner** account(s).
4. Flip enforcement per module (mental health first, records next, rest after).
5. Remove dead superadmin PHI pages; update tests/docs; announce internally; quarterly access review.

---

## 6. Admin console security (hardening)

| Control | Setting |
|---|---|
| **Auth** | Passkeys/TOTP mandatory for all admin roles (`TWO_FACTOR_REQUIRED_ROLES`), no SMS-only MFA; no social login |
| **Sessions** | Short (idle 15 min, absolute 8–12 h), concurrent limit 2, re-auth for sensitive actions, device binding optional |
| **Network** | Separate admin hostname (`admin.`), IP allowlist/VPN/Cloudflare Access, strict CSP (`script-src 'self'`), `frame-ancestors 'none'`, no third-party scripts/analytics on admin |
| **Step-up** | All sensitive actions (§5.3 scopes) |
| **Dual approval (maker-checker)** | Role→admin, commission change, payouts above threshold, legal takedown/law-enforcement disclosure, identified export, provider ban for high-risk, break-glass for mental/sexual health |
| **Audit** | Immutable, tamper-evident, exported to separate store; **admins can't edit/delete logs**; 100% retention per policy |
| **Alerts** | New admin created, role changed, break-glass requested, mass access/export, off-hours PHI access, many failed step-ups, admin login from new geo/device |
| **Access reviews** | Quarterly: who has which role; remove stale; offboarding checklist (revoke sessions/keys same day) |
| **Secrets** | Admin UI shows secret **names/status**, never values; rotation reminders only |
| **Anti-phishing** | Passkeys, domain pinning, email warnings for admin actions, security training |
| **Data handling** | No PHI in screenshots/Slack/email; masked by default; DLP rules in support tools; watermark on sensitive views |
| **Impersonation** | Read-only, masked, time-boxed, banner, audited; disabled for PHI |

---

## 7. "Mera kaam bhi ho jaye" — ops jobs → kaun, kya data, kaise (bina PHI ke)

| Job | Role | Data needed | Kaise bina patient PHI ke |
|---|---|---|---|
| Naye provider approve karna | KYC Reviewer | Provider docs, registry links, duplicates | Business/KYC data only; patient data irrelevant |
| Provider suspend/ban | Ops/T&S | Complaints count, ratings, evidence | Complaint summaries (masked) + evidence attached to case |
| Refund/dispute resolve | Support L2 / Finance | Booking timeline, payment, policy snapshot, parties' evidence | Metadata + uploaded evidence; no records |
| "Doctor aaya nahi" complaint | Support L1 | Booking status, provider response logs | Status/timeline only |
| Order galat aaya | Support | Order items **category**, store, delivery proof | Product-level info; Rx content not required |
| Fraud/fake reviews | T&S | Review patterns, device/IP clusters | Aggregated signals; no clinical text |
| Content/claims moderation | Moderator | Profile/review text | Provider-generated content only |
| Payout & reconciliation | Finance | Amounts, bank refs, TDS | No clinical data |
| City launch/supply planning | City Manager | Supply density, unmet searches | Aggregated, k-anonymous |
| Compliance audit | Compliance/Auditor | Licence status, policy acceptance, audit logs | Metadata |
| DSR (patient ne data maanga) | DPO | Patient's own data across systems | DSR-scoped, logged, delivered to patient |
| Emergency/SOS incident | Clinical Safety / Ops on-call | Incident type, coarse location, status | Live metadata; identity reveal via incident-lead break-glass |
| Clinical-safety investigation | Clinical Safety Officer | Specific record(s) | **Break-glass** (dual approval for mental health) |
| Bug fix needing real data | Engineer | Reproduction | Synthetic/anonymised; else break-glass with approval |
| Marketing/broadcast | Marketing + approver | Segments (non-health) | Consent-based; no PHI targeting |

> Is table ke hisaab se: **roz ke 95% kaam PHI ke bina ho jaate hain.** Bacha 5% break-glass se.

---

## 8. Proposed final admin sidebar

```
OVERVIEW
  Dashboard (aggregate)               [Owner, Platform Admin, City Mgr, Analyst]
SUPPLY (Providers)
  Applications & KYC                  [KYC Reviewer, Compliance]
  Providers & Facilities              [Ops, KYC, T&S]
  Document Expiry Tracker             [KYC, Compliance]
  Provider Quality & Strikes          [T&S, Provider Success]
  Field Ops / City Launch             [City Mgr]
CATALOG
  Categories & Taxonomy               [Catalog Mgr]
  Tests / Medicines / Products        [Catalog Mgr]
  Cities & Service Areas              [Platform Admin]
MARKETPLACE OPS
  Bookings & Orders (metadata)        [Support, Finance, Ops]
  Disputes & Refunds                  [Support L2, Finance]
  Support Workspace                   [Support L1/L2]
  Events & Camps Approvals            [City Mgr]
TRUST & SAFETY
  Moderation Queues                   [Moderator]
  Fraud & Abuse                       [T&S]
  Safety Incidents / War Room         [Clinical Safety, Ops on-call]
  AI Safety (aggregate)               [Clinical Safety, DPO]
FINANCE
  Revenue & Reconciliation            [Finance]
  Payouts (dual approval)             [Finance + Owner]
  Commission / Coupons / Featured     [Platform Admin + approval]
COMPLIANCE & PRIVACY
  Privacy Centre (DSR, consent ledger, breach register)   [DPO]
  Break-glass Requests                [Approvers, DPO]
  Access Reviews & Alerts             [Owner, Security, DPO]
  Compliance Register & Policies      [Compliance, Legal]
  Audit Logs                          [Auditor, DPO, Owner]
GROWTH
  Content & Medical Review            [Editor, Medical Reviewer]
  Broadcast / Campaigns (approval)    [Marketing + approver]
  Marketplace Analytics (k-anon)      [Analyst, City Mgr]
PLATFORM
  Admin Team & Roles                  [Owner]
  Feature Flags & Kill Switches       [Owner, Platform Admin]
  Integrations & Vendor Health        [Security, Platform Admin]
  Tenant Quotas / Ops Health          [Security, Ops]
  Security Settings (sessions, IPs, MFA)  [Security Admin]
  Data Export (de-identified; identified via DPO)  [DPO + approvals]
```
Har item permission se dikhe/chhupe; role ke bahar wale ko 404/hidden.

---

## 9. Privacy guarantees jo aap patients/providers ko keh sakte ho (agar upar sab implement ho)
1. "FindMedi staff aapka medical record default me nahi dekh sakta."
2. "Kisi bhi emergency/legal wajah se access hua to hum reason ke saath log karte hain aur aapko batate hain (jahan law allow kare)."
3. "Aap Privacy Centre me dekh sakte ho kisne kab access kiya."
4. "Hamara support team aapka data masked dekhta hai; zarurat par aapki permission se."
5. "Analytics aggregated/anonymised hai; hum aapka health data bechte nahi."
(Ye claims tabhi karo jab implement + test + audit ho chuka ho. Overclaim mat karo.)

---

## 10. Checklist
- [ ] Naye admin roles + permission sets; `superadmin` → Owner (no PHI perms)
- [ ] `authorize()` bypass hatao; PHI-class permissions + break-glass middleware
- [ ] `BreakGlassGrant` model + request/approve UI + patient notification + DPO review
- [ ] Records/patients/mentalhealth/appointments/lab/billing/ipd/triage/nursing/insurance/pharmacy: superadmin PHI branches replace
- [ ] Masked support tools + assist-session code + reveal-with-reason
- [ ] Aggregate dashboards with k-anonymity; de-identified exports default
- [ ] Naye step-up scopes + dual-approval flows (maker-checker)
- [ ] `phi_access` & related audit events (immutable/hash-chain) + alerts
- [ ] Admin console hardening: passkeys, short sessions, IP allowlist/Cloudflare Access, strict CSP, separate hostname
- [ ] Tests: authMatrix (platform roles DENY on PHI), dtoLeak (admin DTOs), break-glass flows
- [ ] Shadow mode → staged enforcement (mental health first) → remove dead pages
- [ ] Quarterly access review + offboarding checklist
- [ ] Update SECURITY.md/DPIA/Privacy Policy to match actual access model
