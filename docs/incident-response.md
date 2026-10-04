# Incident & Breach Notification Playbook

This is the operational companion to [`SECURITY.md` §7](../SECURITY.md) (which
stays as the five-step summary) and [`docs/privacy/DPIA.md` §9](privacy/DPIA.md).
It answers the three questions an incident team actually has at 2 a.m.: **what
severity is this, who decides what, and which clock is already running.**

Legal basis verified as written (see §6 for the table):

- **DPDP Rules 2025, Rule 7** (notified 13 Nov 2025) — intimation to each
  affected Data Principal *without delay*; to the Data Protection Board *without
  delay* (first description) and the detailed report *within 72 hours* (or a
  longer period the Board allows in writing).
- **CERT-In Directions No. 20(3)/2022** (effective 27 Jun 2022, §70B IT Act) —
  listed cyber incidents, **including data breach and data leak**, reported
  within **6 hours** of noticing or being brought to notice; logs kept on a
  rolling **180 days** within Indian jurisdiction; a designated Point of Contact
  on file with CERT-In. Non-compliance: §70B(7), up to 1 year / ₹1 lakh.
- **HIPAA** (45 CFR §164.400–414) — only if/while a US covered-entity or
  business-associate relationship exists (SECURITY.md scope note).

When law and this playbook disagree, the law wins and this playbook is the bug:
record the divergence in the incident doc and fix the playbook in the
post-mortem.

---

## 1. Severity classification

Severity is declared by the Incident Commander **within 30 minutes** of T0 (see
§5 for T0) and recorded in the incident doc. It may be **raised** by anyone; it
is lowered only by the Incident Commander **and** the Privacy Officer together,
with the reasoning written down.

| SEV | Definition (any one) | Response | Notification posture |
|---|---|---|---|
| **SEV1** | Confirmed or credibly suspected exfiltration/unauthorised read of PHI or special-category mental-health data; multi-tenant read; ransomware; production credential (JWT/DB/backup) compromise; any breach likely to risk a Data Principal's rights | Page immediately; IC + Privacy Officer + Tech Lead from minute zero | Assume notifiable; start §6 clocks NOW, §5 assessment runs in parallel |
| **SEV2** | Single-account takeover with privileged/clinical access; unbounded or unexplained bulk export; secret exposure without evidence of use (e.g. key in a public repo); targeted DoS; processor/partner reports a breach involving our data | Page; IC within 15 min; Privacy Officer same hour | Full §5 assessment mandatory within 2 h of T0 |
| **SEV3** | Confirmed vulnerability with no access evidence; single-tenant misconfiguration; limited exposure of non-PHI personal data (e.g. contact details only) | Business hours; tech lead owns | Written §5 assessment within 24 h; outcome may be "not notifiable" |
| **SEV4** | No data access or impact; hardening item; researcher report with no demonstrated impact | Normal backlog + courtesy reply to reporter | Assessment recorded as one line in the incident doc |

Two rules that exist because they get broken under pressure:

1. **A SEV1/SEV2 is a "potential breach" by default.** The clocks in §6 start
   when the incident is *credible*, not when the §5 assessment concludes. Assess
   while the clock runs.
2. **CERT-In's 6-hour clock starts at *noticing*, not at confirming.** If the
   incident type is in Annexure I (data breach, data leak, unauthorised access,
   compromise of critical systems, attacks on application/cloud/payment
   systems…), file preliminary information to CERT-In within 6 hours of first
   credible notice even if you cannot yet say what was taken. CERT-In accepts
   partial initial reports; a late complete one is still late.

---

## 2. Roles and escalation

Five roles. One person may hold more than one **except** Incident Commander and
Comms Lead, which must be different people. The Privacy Officer role owns every
notification decision (§5–§7) and signs the Board filing.

| Role | Owns | Filled by (primary / backup) |
|---|---|---|
| **Incident Commander (IC)** | The clock, the incident doc, priorities, severity, go/no-go on containment actions | *fill at incident time — engineering on-call* |
| **Tech Lead** | Containment and forensic execution per §4; change deployments under IC authority | *fill at incident time* |
| **Privacy Officer / DPO** | Notifiability decision, DPDP/CERT-In/HIPAA filings, templates in §7, legal liaison | *named contact — security@findmedi.online reaches this role* |
| **Comms Lead** | Every external and internal statement (§7.6–7.7); one voice | *fill at incident time* |
| **Scribe** | Minute-by-minute timeline, evidence log (§8), post-mortem assembly | *fill at incident time* |

- **Real contact details are not in this repo.** The filled-in rota, phone
  numbers and the escalation tree live in the team password vault under
  `incident/contacts` (referenced here so a reader knows where to look without
  the repo leaking personal data).
- **Acknowledgement SLA:** page/notify → no ack in 10 minutes → escalate one
  step up the chain. If the Privacy Officer is unreachable at a decision point,
  the designated alternate (see vault) approves, and the substitution is
  recorded in the incident doc.
- **CERT-In Point of Contact:** one designated person (plus backup) must be
  registered with CERT-In per Annexure II of the Directions. This is a
  standing compliance item (§10), not something you do during an incident.

---

## 3. First 15 minutes (checklist)

Do these roughly in order. 4 and 5 are the ones people skip and regret.

1. **Acknowledge and open the incident doc** from the template in §9. Assign
   IC, Tech Lead, Scribe. Record **T0** = time of first credible notice.
2. **Declare severity** (§1). If SEV1/SEV2, notify the Privacy Officer now —
   not after triage.
3. **Containment decision, scenario-matched:** pick the §4 scenario that fits
   and start its steps. Prefer *revocation* over deletion (see §8: deletion
   destroys evidence).
4. **Preserve evidence BEFORE rotating anything.** Snapshot `AuditLog`,
   `LoginEvent` and application logs for the window `[T0 − 30 days, now]`
   first; then rotate credentials. SECURITY.md §7.2 exists precisely because
   the natural instinct — "rotate everything immediately" — destroys the
   record of what the attacker touched.
5. **Start the CERT-In clock check:** does the incident type fall in Annexure I?
   If yes or unsure, the 6-hour timer is live from T0. The Scribe keeps a
   visible countdown in the incident doc.
6. **Single channel, single doc.** One incident channel, one incident doc.
   Facts go in the doc; hypotheses are labelled as such.
7. **No side conversations that decide things.** Decisions (containment,
   severity, notification) are made in the channel and written in the doc with
   the decider's name.

---

## 4. Containment runbook by scenario

Steps are repo-grounded: each names the mechanism that actually exists here.
IC authorises; Tech Lead executes; Scribe logs every action with timestamp.

### 4.1 Session / token compromise (stolen JWT, refresh leak, account takeover)

1. Rotate `JWT_SECRET` — invalidates every session by design (this is the
   documented procedure; see SECURITY.md §5.7 — a full logout of all users is
   the accepted cost).
2. Bump `User.tokenVersion` (legacy tokens cannot dodge revocation) and revoke
   refresh-token families: set `RefreshToken.revokedAt` for the affected
   `familyId`, plus `replacedBy` chains.
3. Force password reset + 2FA re-enrol for the affected principals; check
   `LoginEvent` for `anomalies` and OTP quota abuse first.
4. Review role changes around T0 (`AuditLog` role-change actions) — account
   takeover often escalates before it exfiltrates.

### 4.2 Database exposure (open port, leaked backup, unauthenticated replica)

1. Verify the exposure is actually closed: production compose must publish no
   datastore ports; Atlas IP allowlist / auth re-verified.
2. Snapshot the instance and recent oplog **before** any credential change;
   treat the snapshot as evidence (§8).
3. Rotate Mongo credentials, Atlas keys and any password that was in the same
   secret scope; then confirm which collections were reachable (use
   [`docs/data-dictionary.md`](data-dictionary.md) to enumerate what was in
   reach, including TTL-sensitive collections).
4. If backups were exposed: assume full-copy exfiltration, SEV1, §6 clocks run.

### 4.3 Application compromise (RCE, admin takeover, malicious deploy)

1. Roll back to the last known-good image (images are digest-pinned) or
   redeploy from a reviewed commit; disable the suspect integration route.
2. Revoke all sessions (§4.1 steps 1–2).
3. Sweep for persistence: role/permission changes, new staff accounts, changed
   `platformAdminOnly`-gated approvals (provider KYC sign-offs), altered
   export scopes — all of these write `AuditLog` rows by design.
4. Rotate the secret set per the 90-day rotation gate procedure (external
   references in the runbook, not in this file).

### 4.4 Third-party processor breach (Razorpay, Brevo, Cloudinary, Twilio, Google, MapTiler)

1. Get the processor's written notice and timeline (processors must notify us
   without delay — both contractually and under DPDP's processor duties).
2. Determine which of *our* data classes they held for us — the processor
   table in SECURITY.md §6 plus the data dictionary answers this.
3. Our obligations run from *our becoming aware*, not from their delay: set T0
   when we receive credible notice (§5).
4. Suspend the integration if safe (fail-closed), capture their incident ID in
   our incident doc, and record whether we are fiduciary or processor for each
   affected population (§7.7 — hospital tenants may need to notify their own
   patients first).

### 4.5 Insider misuse (staff reads/exfiltrates records)

1. **Do not tip off the subject.** Capture the `AuditLog` trail for their
   actions first (reads, exports, consent decisions all audit).
2. Disable access (session revocation per §4.1) via IC decision; preserve
   devices/accounts per HR/legal guidance.
3. Notify HR + Privacy Officer together; the misuse itself may be a notifiable
   breach affecting the data principals whose records were read.

### 4.6 Bulk export abuse or export pipeline compromise

1. Find the window: `bulk_export` audit rows + the `X-Export-Truncated`
   behaviour (exports are capped at 10k rows/attempt — repeated attempts matter
   more than a single capped one).
2. Revoke the exporting principal's export permission and roles; rotate any
   service credentials the pipeline uses.

### 4.7 DoS / DDoS, malware, ransomware

- DoS: mitigate, and report to CERT-In (Annexure I) regardless of whether any
  data was touched — reporting does not depend on harm.
- Ransomware/malware: isolate first (segment/host kill), preserve disk
  images, treat as SEV1. Any decision about payment or regulator press
  contact is a Privacy Officer + company-principal decision, never an
  in-channel one.

---

## 5. Notifiability assessment (the decision that has a clock)

**The clock starts before the assessment.** T0 = the time the organisation
*became aware* — the first credible notice (our detection, a researcher, a
partner, a user report). The Scribe writes T0 at minute zero and it never
moves.

Assessment questions, in order, recorded in the incident doc:

1. **Was there a personal data breach?** (personal data involved + not
   following the Act, Rules or our stated policy — unauthorised access,
   disclosure, alteration, loss, or failure to protect counts.)
2. **Which data classes, how many data principals, what time window?**
   Enumerate with [`docs/data-dictionary.md`](data-dictionary.md) (per-collection
   fields + PII classes) and count distinct affected principals with a query
   over the preserved window — record the query and its result.
3. **Special-category (mental-health) data involved?** If yes, it is SEV1 and
   the highest-sensitivity class in the system (SECURITY.md §2); assume
   notifiable unless the Privacy Officer writes otherwise.
4. **Conclusion: notifiable / not notifiable / needs-more-time.**

Conservative posture, deliberately: DPDP Rule 7 applies to *any* personal data
breach — the Rules carry no de-minimis threshold. So the default answer to
question 4 is **notifiable**, and "not notifiable" is an exception that
requires the Privacy Officer's written, reasoned decision **filed with the
incident doc within the §6 windows** (a decision not to notify is itself
evidence of accountability, and it must exist before the deadline, not after).
"Not needs-more-time" beyond a deadline means: file the best-available first
intimation on time and complete afterwards — both DPDP and CERT-In allow
progressive detail.

---

## 6. Notification timelines and obligations

Clock notation: **T0 = becoming aware / noticing** (§5). "Without delay" is
not a budget — it means the first intimation goes out as soon as the
description exists, while the detailed report is still being prepared.

| # | Obligation | Trigger | Deadline | Channel |
|---|---|---|---|---|
| 1 | **Board first intimation** (DPDP Rules 7(2)(a)): nature, extent, timing, location of occurrence, likely impact | Any personal data breach | **Without delay** from T0 | Data Protection Board's published intimation channel (verify the current portal/format on dpdpb.gov.in at filing time — the format is prescribed and may be updated) |
| 2 | **Board detailed report** (DPDP Rules 7(2)(b) i–vi): updated details, broad facts/circumstances/cause, mitigation, findings on who caused it, remedial measures, report of Data Principal intimations | After intimation | **≤ 72 hours** from T0, or longer if the Board allows in writing | Same channel |
| 3 | **Each affected Data Principal** (DPDP Rules 7(1) a–e): description, consequences, mitigations, safety measures, contact person — concise, clear, plain | Any personal data breach | **Without delay** from T0 | Her user account + any mode she registered with us (email/SMS as held on file) |
| 4 | **CERT-In incident report** (Annexure I types incl. data breach, data leak, unauthorised access) | Noticing or being brought to notice | **≤ 6 hours** from T0 — preliminary detail acceptable | `incident@cert-in.org.in`, phone 1800-11-4949, fax 1800-11-6969; format per cert-in.org.in |
| 5 | **HIPAA individuals** (if a US covered/BA relationship exists) | Breach of unsecured PHI | Without unreasonable delay, **≤ 60 days** from discovery | Written notice per §164.404 |
| 6 | **HIPAA HHS + media** (if ≥500 residents of a State/jurisdiction) | Same | **≤ 60 days** from discovery | OCR + prominent media |
| 7 | **HIPAA HHS annual log** (<500) | Same | ≤ 60 days after end of calendar year | OCR |
| 8 | **Hospital tenants (our customers)** for data where the hospital is the Data Fiduciary | Any breach touching their patients | Per contract, and so **they** can meet their own Rule 7 clocks — practically: with item 3, in parallel | Direct tenant notice (§7.7) |
| 9 | **Internal**: all-hands + status page holding statement | SEV1/SEV2 | ≤ 1 h from T0 | Status page + internal channel (§7.6) |

Two standing technical preconditions, checked in §10 drills rather than during
the incident:

- **CERT-In log retention:** ICT logs on a **rolling 180 days, stored within
  Indian jurisdiction**, producible with the incident report. Our pino logs
  are rotated — retention duration and location are a *verified* property or
  they are a gap; the drill records it as an action if unverified.
- **Time sync:** clocks on NTP sources traceable to NIC/NPL (a mis-synced
  clock corrupts every timeline in this document).

---

## 7. Notification templates

Placeholders are in `[BRACKETS]`. **No PHI in any template beyond what the
recipient needs; no speculation; no blame; Comms Lead + Privacy Officer
co-sign every external send.** Legal review of items 1–3 before first use.

### 7.1 Board — first intimation (Rule 7(2)(a))

```
To: Data Protection Board of India — personal data breach intimation
Incident ID: [ID]            T0 (becoming aware): [YYYY-MM-DD HH:MM IST]
Filing entity: FindMedi [legal entity name, address, DPO contact]

1. Description of the breach: nature [unauthorised access / disclosure / other],
   extent [collections + estimated number of Data Principals], timing
   [first occurrence – discovery], location of occurrence [system/environment].
2. Likely impact: [risk to affected Data Principals, by data class].
3. Point of contact for this incident: [name, phone, email] (CERT-In POC
   designated per Annexure II: [yes/no]).
First intimation filed: [timestamp] (before the 72-hour detailed report due
[T0+72h]).
```

### 7.2 Board — detailed report (Rule 7(2)(b) i–vi), submission checklist

- [ ] (i) Updated and detailed description vs the first intimation
- [ ] (ii) Broad facts, circumstances and reasons leading to the breach
- [ ] (iii) Measures implemented or proposed to mitigate risk
- [ ] (iv) Findings regarding the person who caused the breach
- [ ] (v) Remedial measures taken to prevent recurrence
- [ ] (vi) Report regarding the intimations given to affected Data Principals
      (who, when, through which mode — attach the §7.3 send log)

Due: [T0 + 72h] — or the extended date if the Board allowed one in writing
(attach that permission).

### 7.3 Affected Data Principal notice (Rule 7(1) a–e)

```
Subject: Important notice about your personal data

We are writing to tell you about an incident affecting your personal data at
FindMedi.

What happened: [description — nature, extent, and timing of the occurrence,
plain language].
What it means for you: [consequences likely to arise for her].
What we have done and are doing: [mitigation measures implemented or underway].
What you can do: [specific safety measures — e.g. change your password,
enable two-factor authentication, be alert for unsolicited calls/OTPs; we will
never ask you for an OTP].

Questions? Contact [designated person], [email], [phone] — reachable on
[hours].

[Date]
```

Delivery: her in-app account **and** every registered mode on file (email/SMS),
per Rule 7(1). Keep the send log — the Board's detailed report requires it
(§7.2 vi).

### 7.4 CERT-In — preliminary incident report (≤ 6 h)

Per the format published at cert-in.org.in at time of filing; the essentials:

```
Incident type (Annexure I): [e.g. Data Breach / Unauthorised access of IT
systems / Attack on application]
Entity + Annexure II POC: [name, designation, phone, email]
First observed / noticed (T0): [timestamp IST]   Report filed: [timestamp]
Systems/services affected: [list]
Data involved (classes, indicative volume): [from docs/data-dictionary.md]
Containment actions so far: [list]     Evidence preserved: [yes — what]
Details incomplete: initial report; follow-up to follow.
```

### 7.5 HIPAA individual notice (only if §164.404 applies)

Skeleton: date, what happened (including dates of breach and discovery), types
of unsecured PHI involved, steps individuals should take, what we are doing
(investigation, mitigation, prevention), contact procedures (toll-free number,
email, postal address), and the free-credit-report/ID-theft offer analysis
where risk materialises. Deadline ≤ 60 days from discovery.

### 7.6 Internal all-hands / status-page holding statement (≤ 1 h)

```
[Status: investigating / identified / resolved]
We are aware of an incident involving [systems] and are investigating with the
incident team. We will update by [time] or sooner if material.
Do not comment externally — direct any enquiry to [Comms Lead].
```

Cadence: update every [30 min while SEV1, 4 h while SEV2] or on material
change. Never: speculation on cause, attribution to a person, or any data
content from the incident.

### 7.7 Hospital tenant notice (they may be the Data Fiduciary)

```
To: [Hospital/tenant] DPO/admin
We detected an incident on [T0] affecting [scope] of data we process for your
tenant. Facts so far: [..]. Data classes involved: [..]. Affected records in
your tenant: [count/query]. Actions we have taken: [..].
Your own DPDP Rule 7 obligations to your patients may already be running —
we recommend you begin your assessment now; we will send updates at [cadence].
Your named contact at FindMedi: [..].
```

Sent **in parallel with** the Data Principal notice (§7.3), not after it.

---

## 8. Evidence preservation checklist

Preserve first, rotate after (§3 step 4). The incident doc carries the log.

| # | Preserve | Window | Notes |
|---|---|---|---|
| 1 | `AuditLog` export (reads, exports, consent, role/payment/moderation actions) | [T0 − 30 d, now] | Hash the export; this is the primary PHI-access record |
| 2 | `LoginEvent` (IP, device hash, anomalies, success) | [T0 − 30 d, now] | Account-takeover timeline |
| 3 | Application logs (pino, redacted at writer) + gateway/access logs | [T0 − 30 d, now] | Preserve before any rotation/compression job runs |
| 4 | `RefreshToken` rows for affected users (families, revocations) | current | Session-forensics |
| 5 | Database snapshot / oplog slice for implicated collections | [T0 − 7 d, now] | SEV1: full snapshot of implicated collections |
| 6 | Integration activity (Razorpay/Brevo/Cloudinary/Twilio audit or provider-side logs) | as available | Provider export requests can take days — start at T0 |
| 7 | Chain-of-custody entries for every artifact | continuous | `who | when | what | sha256` — one row per artifact |

**Do not, during an active incident:** delete or "clean up" rows, run account
erasure (place a hold on `DeletionRequest` processing for implicated data —
erasure destroys the evidence of what was accessed), purge logs, rotate
credentials **before** items 1–3 are captured, or close the incident channel.
Retention of the final incident record follows `docs/privacy/RETENTION.md`
(audit-log class: 7 years).

---

## 9. Post-mortem

Required for every **SEV1/SEV2** and **every notifiable breach**, published
within **5 business days** of containment. The failed control gets a
**regression test** (SECURITY.md §7.5) — a post-mortem without one is a
retrospective, not a fix.

Template (copy into the incident repo, one file per incident):

```markdown
# Post-mortem [INCIDENT-ID] — [one line]

- T0: [..]  Contained: [..]  Closed: [..]  Severity: [..]
- IC: [..]  Privacy Officer: [..]

## Impact
- Data classes exposed (per docs/data-dictionary.md): [classes]
- Affected Data Principals: [count] (query: [`..`])
- Special-category (mental-health) data involved: [yes/no]
- Patients/tenants affected: [..]

## Timeline (T0-relative)
| T+ | Event | Source |
|---|---|---|

## Root cause
[How the control failed — the mechanism, not the person.]

## Detection & response gaps
[What took too long; which alert was missing or wrong (see infra/observability).]

## Notification compliance
| Obligation (§6) | Due | Filed | Met? |
|---|---|---|---|
| Board first intimation | T0 + without delay | [ts] | Y/N |
| Board detailed report | T0 + 72h | [ts] | Y/N |
| Data Principals | T0 + without delay | [ts] | Y/N |
| CERT-In (if Annexure I) | T0 + 6h | [ts] | Y/N |
| HIPAA (if applicable) | discovery + 60d | [ts] | Y/N |

## Actions
| # | Action | Owner | Due | Regression test |
|---|---|---|---|---|

## Playbook feedback
[What in this document was wrong, missing, or slow — then fix it (§10).]
```

---

## 10. Drills and maintenance

- **Quarterly tabletop (30 min):** pick one §4 scenario, walk §3's first 15
  minutes and a §5 assessment against a fake T0. Output: action items with
  owners — specifically checking the two standing preconditions in §6
  (180-day log retention in-India, NTP sync) and that the CERT-In Annexure II
  POC registration is current.
- **Annual review** of this playbook, the contact vault (`incident/contacts`)
  and the templates against the current text of Rule 7 and the CERT-In
  Directions.
- **After every SEV1/SEV2:** §9's "Playbook feedback" section is mandatory —
  this document improves the same way the code does, by post-mortem.
- A vulnerability report arrives via `security@findmedi.online` (SECURITY.md
  §1); the triage there feeds this playbook at step 3 of §3 (declare
  severity), never later.

---

## 11. Related documents

- [`SECURITY.md`](../SECURITY.md) §7 — the five-step summary this playbook
  operationalises; §6 processor table; §2 data classes
- [`docs/privacy/DPIA.md`](privacy/DPIA.md) §9 — breach notification in the
  privacy assessment
- [`docs/privacy/RETENTION.md`](privacy/RETENTION.md) — retention of incident
  records
- [`docs/data-dictionary.md`](data-dictionary.md) — blast-radius enumeration
  (which collections, which PII classes, which TTLs could already have deleted
  evidence)
- [`infra/observability/README.md`](../infra/observability/README.md) — alert
  sources that start incidents, SLO signals
- `DEFERRED_TODOS.md` - deferred items requiring provider/prod access
