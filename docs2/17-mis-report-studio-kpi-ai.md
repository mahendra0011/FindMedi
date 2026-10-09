# 17. MIS / Report Studio, KPI Catalog, Analytics Pipeline & AI Assist Layer (NEW)

Already covered (skip): hospital dashboard widgets & alerts (file 02), NABH KPIs (file 07 §7.3), doctor dashboard analytics (file 11), AI scribe/ICD suggestion bullet (file 11 P2).
Yahan: **report catalogue + report studio**, **KPI formulas jo pehle nahi the** (inventory turnover, vendor/TPA performance, collection efficiency...), **analytics pipeline**, aur **AI layer** (OCR, claim-doc check, forecasting, no-show, discharge draft).

Repo check: `Reports.tsx`, `PDFReports.tsx`, `AnalyticsReports.tsx`, `routes/reports.js`, `AdminPerformanceMetrics`, `exceljs`, `pdfkit` hain; **saved/scheduled reports, report builder, role-wise catalogue nahi**. AI: Gemini chatbot (`AiChat`, `AiSafetyEvent`), no OCR/forecast.

---

## 17.1 Report Catalogue (by audience)

| Group | Reports (new/standardised) | Key filters |
|---|---|---|
| Patient | Registration (new vs repeat), OPD/IPD census, disease-wise (ICD), readmission <30d, discharge types (LAMA/DAMA/transfer/death), age-sex, referral-source | date, dept, doctor, payer |
| Doctor | Consultation count, revenue & share, surgeries, avg consult time, no-show, referrals, utilisation | doctor, dept |
| Department | Revenue, utilisation, TAT, productivity, cancellations | dept, shift |
| Finance | Collection (mode/counter/shift), refund, discount (by approver), outstanding, ageing, GST (HSN-wise), TDS, P&L/dept contribution | counter, payer |
| Pharmacy | Sales, purchase, stock valuation, near-expiry/expired loss, consumption, margin, schedule-drug register | store, batch |
| Lab | Tests, revenue, TAT, critical values, rejected samples, outsourced | test, analyzer |
| Radiology | Studies by modality, TAT, repeat/reject rate, dose log | modality |
| OT | Cases, cancellations (reason), utilisation, turnover time, surgeon-wise, consumables | OT room |
| Insurance | Claims funnel, approval vs rejection, deduction reasons, TPA ageing, settlement TAT | insurer |
| HR | Attendance, leave, overtime, payroll register, headcount, attrition, credential expiry | dept |
| Inventory | Stock ledger, ABC-VED, dead stock, indent aging, vendor performance | store |
| Quality | Incidents, falls, HAI, med errors, patient feedback/NPS | unit |
Each report has: **owner role, row-level scope (hospital/branch/dept), PHI classification (masked columns for non-clinical), export formats (PDF/XLSX/CSV), schedule support**.

---

## 17.2 Report Studio (saved / scheduled / custom)

### Logic
- **ReportDefinition** (declarative): `source` (whitelisted dataset/view, **never raw collection names from client**), `columns`, `filters` (typed, with defaults like "last 7 days"), `groupBy`, `aggregations`, `sort`, `chart` (optional), `permissions`, `phiColumns[]`.
- Execution: validate params (zod) -> RBAC scope injection (`hospitalId/branchId/deptId`) -> **aggregation pipeline builder** (server-side templates; no user-supplied `$where`/JS) -> stream rows -> format.
- **Heavy reports async:** BullMQ job -> `ReportRun {status, progress, fileUrl, expiresAt}`; toast + notification when ready; file in object storage with **signed URL + expiry**; auto-delete.
- **Scheduling:** cron (daily 8:00 IST / weekly Mon / monthly 1st), recipients (users/roles/emails), format, skip-if-empty, delivery log, **PHI reports only to internal verified recipients** (no external email unless allowed).
- **Saved views:** user filters/columns saved per user + shared with role; **pivot-lite** (group by + measure) in UI.
- **Audit:** every export logged (who, which report, filters, row count); big/PHI exports need reason (+ approval above threshold, file 13.2).
### Data model
`ReportDefinition, ReportSavedView {userId, reportKey, params, columns}, ReportSchedule {reportKey, cron, tz, recipients, format, params, lastRunAt}, ReportRun {reportKey, params, requestedBy, status, rowCount, fileUrl, error}`
### API
`GET /api/reports/catalogue`, `POST /api/reports/:key/run`, `GET /api/reports/runs/:id`, `POST /api/reports/schedules`, `GET/POST /api/reports/views`.
### Libraries
Backend `exceljs` (streaming writer for 100k+ rows), `pdfkit`/Playwright for PDF (14.2), `bullmq`, `node-cron`; Frontend: `@tanstack/react-table` + `@tanstack/react-virtual` (virtualised grid, column resize/pin/visibility, server-side pagination/sort), `recharts`, `date-fns`, `react-day-picker` (installed) for ranges.
### UI design
```
Reports ▸ Finance ▸ Collection by Mode
[Date range ▾ Last 7d] [Branch ▾] [Counter ▾] [Compare ☑]      [Save view] [Schedule] [Export ▾]
+--------------------- Summary cards (Total, Cash, UPI, Card, Insurance) ---------------------+
+--------------------------------- Chart (stacked by day) -----------------------------------+
+--------------------------------- Virtualised table (sticky header, pin col) -----------------+
```
- Left rail = catalogue tree with search + favourites; empty state shows "Run a report" suggestions; running state shows skeleton + progress.
- Dense table mode (32px rows), zebra off (use hover), numeric right-aligned monospace tabular-nums, ₹ Indian grouping `Intl.NumberFormat('en-IN')`.
### Animation
Chart bars grow on first render only (400ms); table rows no entry animation (performance); filter change -> table opacity .6 + thin top progress line; export button -> progress ring then check.
### Tests
RBAC scope leakage, injection attempts in filters, 500k-row export memory (stream), schedule timezone (IST) & DST-free correctness, export audit completeness, PHI masking for restricted roles.

---

## 17.3 KPI Catalogue (formulas)

(Items already in file 02/07 are not repeated: bed occupancy %, ALOS, bed turnover, door-to-doctor, 30-day readmission, SSI rate, hand-hygiene, fall rate.)

### Clinical / operational (new)
| KPI | Formula | Target note |
|---|---|---|
| ICU occupancy / ventilator utilisation | ICU occupied beds / ICU beds ; vent-days / bed-days | |
| Mortality rate (crude, ICU, surgical) | deaths / discharges(+deaths) | review via M&M |
| OT utilisation | Σ(in-room→out-room min) / Σ(scheduled available min) | |
| OT first-case on-time start % | cases started ≤ scheduled+10m / first cases | |
| Lab TAT (by priority) | median(result verified − sample received) ; STAT %<60 min | |
| Radiology TAT | median(report verified − study done) | |
| ER LWBS % | left without being seen / ER arrivals | |
| Discharge-before-noon % | discharges < 12:00 / discharges | bed flow |
| Avg discharge-order-to-exit time | median(left bed − discharge ordered) | |
| Appointment no-show / cancellation % | NoShow / booked | |
| Doctor utilisation | consult min / available slot min | |
### Financial (new)
| KPI | Formula |
|---|---|
| Collection efficiency | collected / (billed − written-off) in period |
| Days in A/R | Σ A/R ÷ (net credit revenue/period days) |
| Net collection % (insured) | collected / (billed − contractual adj.) |
| Claim rejection / denial % | rejected claims / submitted (also ₹-weighted) |
| Short-settlement % | (approved − settled)/approved |
| Revenue per occupied bed day (ARPOB) | IPD revenue / occupied bed-days |
| EBITDA proxy by dept | dept revenue − direct costs |
| Discount leakage % | discount ₹ / gross billed ; by approver |
| Refund % | refunds / collections |
### Supply chain (new)
| KPI | Formula |
|---|---|
| Inventory turnover | consumption cost / avg inventory value |
| Stock-out rate | stock-out days / item-days (critical items) |
| Expiry loss % | expired ₹ / purchases ₹ |
| Fill rate (indents) | lines issued in full / lines requested |
| Vendor on-time delivery | on-time GRNs / GRNs |
| PO cycle time | median(GRN − PO approved) |
### Patient experience / HR (new)
`NPS = %promoters − %detractors`, `Complaint resolution TAT`, `Staff attrition %`, `Overtime % of hours`, `Credential-expiry compliance %`.
**Governance:** every KPI has an owner, definition (as above) in a `KpiDefinition` doc, data lineage, refresh cadence; **no KPI ships without a reconciliation test** against raw data.

---

## 17.4 Analytics Pipeline

### Logic (staged, don't over-engineer)
1. **Stage 1 (now):** Mongo aggregation + **pre-aggregated daily tables** (`DailyMetric {date, hospitalId, branchId, deptId, metric, value, dims}`) built by BullMQ jobs (nightly full + 5-min incremental from outbox events). Dashboard/report read these, not raw collections.
2. **Stage 2:** read replica / analytics DB (ClickHouse / BigQuery) fed by CDC (Debezium/Mongo change streams) when data > tens of millions rows; `analytics/` and `data-platform/` folders already exist in repo for this.
3. **Stage 3:** semantic layer (metrics defined once), embedded BI (Metabase/Superset) for power users; **de-identified** datasets for research (k-anonymity, date shifting).
- Caching: Redis 30-60s for dashboards, ETag on report summaries; invalidate on relevant events.
- Data quality: nightly checks (negative amounts, orphan encounters, duplicate UHID), anomalies alert.
- Time zone: store UTC, bucket by IST business day (cutover at midnight IST; late-posted charges tagged by `serviceDate` vs `postedDate`).
### UI patterns
Drill-down breadcrumb (KPI -> dept -> doctor -> patient list), comparison toggle (vs previous period / same period last year), annotation markers on charts (e.g. "new OT opened").
### Animation
Chart transitions on filter change use recharts `isAnimationActive` with 300ms; large datasets (>500 pts) disable animation. Number deltas (▲▼) fade-in only.

---

## 17.5 AI Assist Layer (decision-support, human-in-the-loop)

Repo: Gemini via `@google/genai`/`google-auth-library`, `AiChat`, `AiSafetyEvent` (safety logging) - **reuse the same guardrail pipeline**.

### Principles
1. **Assist, never decide:** AI output = draft/suggestion with visible "AI-generated" tag; clinician **must review & sign**; no autonomous diagnosis/treatment/prescription.
2. **PHI protection:** data minimisation, redact identifiers before external model calls where possible, **no training on PHI** (contractual/zero-retention endpoint), region residency check, per-hospital opt-in, every call logged (`AiInvocation`: user, purpose, model, input hash, tokens, latency, outcome, accepted/edited/rejected).
3. **Evaluate:** golden test sets per feature, hallucination checks (citations to chart sources), acceptance-rate dashboards, kill switch per feature.

### Features & logic
| Feature | Input -> Output | Guardrails |
|---|---|---|
| **Discharge summary draft** | encounter chart (notes, orders, results, meds) -> structured draft (diagnosis, course, procedures, meds, advice, follow-up) | every statement links to source entry; missing data flagged "Not documented"; doctor edits then signs |
| **Clinical note summary / patient history in 5 lines** | last N visits -> bullet summary | read-only, shows source dates |
| **Lab abnormality highlight** | results + ref ranges + prior values -> flags/trends | rule-based first, LLM only for narrative; critical = rule engine (13.3) not LLM |
| **Document OCR & extraction** | uploaded ID/insurance card/discharge/old reports/vendor invoice -> fields (name, policy no, invoice no, GSTIN, line items) | confidence per field, **human confirm screen**, original kept, ClamAV scan first (`clamav.js` exists) |
| **Claim document checker** | claim bundle + insurer checklist -> missing/inconsistent docs (dates mismatch, unsigned, missing ICD) | advisory list; deterministic checks first |
| **No-show prediction** | features: lead time, past no-shows, day/hour, weather(optional), reminders sent -> probability | use for **smart reminders/overbooking**, never to deny service; fairness audit |
| **Demand/inventory forecasting** | consumption history + seasonality -> reorder suggestions | start with moving-average/ETS; explain drivers; buyer approves |
| **Bed/ER demand forecast** | admissions history -> next 7-day census | staffing planner input |
| **Revenue forecast** | historical billing + pipeline | finance review |
| **Patient FAQ chatbot** | hospital FAQs/policies/timings (RAG) -> answers | refuses clinical advice beyond triage guidance, escalates to human, existing `AiSafetyEvent` |
| **Voice-to-text (dictation)** | audio -> text in consult/op note | medical vocab, doctor verifies |
| **Coding assist** | note -> suggested ICD-10/procedure codes | coder approves |
### Architecture
`AI Gateway service` (single entry): prompt templates (versioned), redaction, provider adapters (Gemini now; swappable), rate limits per user/feature, caching, timeouts, JSON-schema constrained outputs (zod), retry/fallback, **async jobs** for OCR/large docs (BullMQ). Forecasting as small Python/Node worker using `statsforecast`/`simple-statistics`; models versioned.
### UI design
- AI results shown in a **distinct "Draft" panel** (subtle violet/neutral tint, "AI draft - review required" badge), per-sentence **source chips**, `Accept | Edit | Discard`, feedback thumbs (use for evaluation), diff view when editing.
- OCR review screen: image left with highlighted regions, extracted fields right with confidence dots (green/amber/red).
### Animation
Streaming text with typing caret **only for chat**; for drafts show skeleton lines then fade-in whole section (avoid distracting token-by-token flicker in clinical notes). Confidence dots static. "Generating..." uses calm shimmer; allow cancel.
### Tests
Hallucination suite, PHI redaction unit tests, prompt-injection from uploaded docs (treat doc text as data), refusal behaviour, latency budgets, per-feature kill switch, bias/fairness for no-show model.
