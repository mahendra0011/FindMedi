# FINDMEDI — MASTER EXECUTION PLAN (for Antigravity)

**Repo:** `D:\projects\Findmedi` (Windows / PowerShell · Node 24 local · CI Node 20.x)
**Verified on:** HEAD `fcf3927e`, 12 Oct 2026
**Scope:** P0 green fixes + test gaps + partial features + go-live. Har task me: *kya, kahan, kaise, verify kaise*.

---

## 0. GROUND RULES (pehle padho)

### 0.1 Command gotchas (ye galat kiya to sab specs fail dikhenge)

```powershell
# BACKEND TESTS — hamesha aise (npx jest GALAT hai, "Must use import" error aayega):
cd D:\projects\Findmedi\backend
$env:NODE_OPTIONS='--max-old-space-size=6144'
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --forceExit test/integration          # ~5 min
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --forceExit test/unit test/security test/contract  # ~4 min
# Poora ek saath mat chalao (4GB pe OOM aata hai). Do batch me chalao.

# FRONTEND
cd D:\projects\Findmedi\frontend
npm test                    # vitest, 13 files/117 tests, ~26s
npx playwright test         # e2e; dev server khud start hota hai (webServer config)
npx eslint src              # lint REAL signal (npm run lint storybook-static tak scan karta hai = noise)

# BACKEND LINT / CHECKS
cd D:\projects\Findmedi\backend
npm run lint                # target: 0 errors
npm run authz:coverage      # authz-manifest.json regenerate karta hai (scripts/check-authz-coverage.mjs:142)

# FRONTEND TYPE RATCHET
cd D:\projects\Findmedi\frontend
node scripts/typecheck-ratchet.mjs   # CHECK (exit 1 if count > baseline)
# npm run typecheck:baseline         # sirf tab chalao jab count already ≤ baseline ho (lock karne ke liye).
#                                    # COUNT BADHANE KE LIYE MAT CHALAO — CI policy ke against hai.
```

### 0.2 Parallel session warning

Verify karte waqt repo me **doosra agent active** tha (HEAD `43b336b` → `fcf3927e` chala gaya, wave1-4 commits aaye, ~47 uncommitted files the). **Har phase shuru me chalao:**

```powershell
git log --oneline -3; git status --short
```

Uncommitted files kisi aur ka WIP ho sakte hain — **revert mat karo**, bas coordinate (user se poochho agar block ho).

### 0.3 Definition of Done (har task)

code + test (unit/integration ya e2e jo applicable ho) + `npm run lint` 0 errors + `node scripts/typecheck-ratchet.mjs` pass + `cd frontend; npx vite build` green + `CHANGELOG.md` me 1 line + phase ke end pe commit (message me test names).

---

## PHASE 0 — RE-VERIFY (5 min, koi code change nahi)

```powershell
cd backend
$env:NODE_OPTIONS='--max-old-space-size=6144'
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --forceExit test/unit/dataDictionary.spec.js test/security/authzManifest.spec.js test/security/authzGapClosure.spec.js
cd ../frontend; npx playwright test
```

Agar sab green ho jaaye (parallel session ne fix kar diya ho) → Phase 1 ke relevant tasks skip. Neeche P0 tasks **current state se derive** karo, andhere me mat karo.

---

## PHASE 1 — P0: GREEN BOARD (1–2 din) ⚠️ sabse pehle

### T1. App crash: `MessageSquare` undefined (5 min) 🔴 BLOCKER

- **Kya:** `frontend/src/components/AppSidebar.tsx` line **176** `{ icon: MessageSquare, labelKey: 'Feedback & NPS', path: '/hospital/feedback' }` use karta hai, **par line 3-7 ka lucide-react import me `MessageSquare` nahi hai** (commit `72bedcce` "wave1" me drop hua).
- **Asar:** Har page pe `ReferenceError: MessageSquare is not defined` → poora SPA white screen → **saari 6 Playwright specs fail** (probe me `PAGEERROR` confirm hua).
- **Fix:** line 6 ke import list me `MessageSquare` add karo. Bas 1 word.
- **Safety net:** `cd frontend; npx tsc --noEmit -p tsconfig.json` me `Cannot find name 'MessageSquare'` aani chahiye thi — agar aur koi undefined icon/import ho to wo bhi pakad lo.
- **Verify:** `npx playwright test` → specs page load tak pahunche (T2 ke baad full green hona chahiye).

### T2. `accessibility.spec.ts` ESM crash (10 min) 🔴 BLOCKER

- **Kya:** `frontend/e2e/accessibility.spec.ts:13` `path.join(__dirname, ...)` — par `frontend/package.json` me `"type": "module"` hai → `__dirname is not defined in ES module scope` → poori playwright run collection pe hi abort.
- **Fix:** file ke top ESM pattern lagao:

```ts
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

- **Verify:** `npx playwright test accessibility.spec.ts` → run ho jaye (violation count alag baat).

### T3. authz manifest stale (10 min) 🟡

- **Kya:** `backend/test/security/authzManifest.spec.js` FAIL — "matches what the parser sees in the source right now": line numbers drift (e.g. `doctors.js:173→156`) kyunki route files recent edits se badle.
- **Fix:** `cd backend; npm run authz:coverage` → `authz-manifest.json` regenerate + coverage check (unclassified must be 0).
- **Order:** ye **backend route-file edits khatam hone ke baad** chalao (warna dobara). `.authz-coverage-baseline.json` ka `total` mismatch aaye to `node scripts/bump-authz-baseline.mjs` (sirf jab naye routes legitimately added hon, note likho).
- **Verify:** `jest test/security/authzManifest.spec.js test/security/authzGapClosure.spec.js` → 2/2 green.

### T4. dataDictionary stale (5 min) 🟡

- **Kya:** `test/unit/dataDictionary.spec.js:185` committed `docs/data-dictionary.md` vs fresh render compare karta hai. Fail ho.
- **Fix:** `cd backend; node scripts/gen-data-dictionary.mjs` → doc regen → commit. (Script name `Get-ChildItem scripts | ? name -match dict` se verify kar lena.)
- **Verify:** `jest test/unit/dataDictionary.spec.js` → green.

### T5. Backend lint: 13 errors (1–2 ghante) — **isme real bugs hain**

| File:Line | Error | Kaise fix |
|---|---|---|
| `src/routes/emergency.js:284` | `no-undef 'admissionId'` | **REAL BUG** — variable define/typo fix (runtime ReferenceError hai) |
| `src/routes/tokens.js:210` & `:247` | `no-undef 'logger'` | **REAL BUG** — import karo ya sahi naam use karo |
| `src/models/Billing.js:75` | dupe key `admissionId` | JS me **second key win karta hai** — dono context padho, galat wala hatao/rename |
| `src/models/Prescription.js:75` | dupe key `appointmentId` | same |
| `src/models/VitalsLog.js:53` | dupe key `recordedBy` | same |
| `src/routes/auth.js:1055` | dupe key `ip` | same |
| `src/lib/aiGateway.js:112` | no-unused-expressions | statement ko call/assign banao |
| `src/lib/astm.js:26,32` | prefer-const | `let`→`const` |
| `src/lib/iamEvaluator.js:187` | prefer-const | `let`→`const` |
| `src/services/clinicalScoresService.js:17` | prefer-const | `let`→`const` |
| `test/integration/fhirAbdm.spec.js:67` | dupe key `'../../src/models/AuditLog.js'` | mock object ka duplicate merge karo |

- **Verify:** `cd backend; npm run lint` → `0 errors` (warnings rehne do).

### T6. Frontend lint (30 min)

1. `src/lib/settings.js:347,354,356` — dupe keys `nav.calls`, `nav.ot`, `nav.inventory` (T5 jaisa hi: context padho, ek rakho).
2. `npm run lint` (= `eslint .`) **34,367 problems** dikhata hai kyunki untracked build artifact `storybook-static/` scan hota hai. ESLint config me `ignorePatterns` / `ignores` add karo: `storybook-static`, `dist`, `test-results`, `playwright-report`. Uske baad `npm run lint` ≈ `npx eslint src` output.
- **Verify:** `cd frontend; npm run lint` → `0 errors`.

### T7. TS ratchet wapas green (2–4 ghante)

- **State:** `tsconfig.baseline.json` = **11971** (committed), actual count = **11988 (+17)** → ratchet BROKEN, CI fail.
- **Steps:**
  1. Candidate files: `git diff 43b336b..HEAD --name-only -- frontend/src` + `git status --short` (uncommitted) — ye wo files hain jahan se naye errors aaye.
  2. `npx tsc --noEmit -p tsconfig.json` chalao (**10–20 min lagta hai — timeout bada rakho**, output ko file me pipe karo), phir candidate files filter karo.
  3. Un files ke errors fix karo (mukhya pattern: `useState<any>` → interface banao, `never`/`null` state ke generic args theek karo — sample errors `AIChatAssistant.tsx:93-116` me dikhe the).
  4. **Target: count ≤ 11971.** Phir `npm run typecheck:baseline` chala ke **11971 se kam** value lock karo.
- **Zaroori:** kabhi `--update` se count mat badhao.

### T8. Doctor sidebar duplicate labels (30 min)

`frontend/src/components/AppSidebar.tsx` `doctor` block:
- line **243 vs 252**: dono `nav.inPersonAppointments` (`/doctor/home-visit` vs `/doctor/in-person`)
- line **249 vs 250**: dono `nav.approvedOfflineAppointments` (`/doctor/appointments` vs `/doctor/appointments/approved`)
- line **260 vs 271**: dono `nav.consultations` (`/doctor/consultations` vs `/doctor-consultation`)

**Fix:** har pair me `App.tsx` check karo — dead route wala entry hatao; dono alive ho to distinct `labelKey` do (aur i18n translation add karo agar key chahiye).
**Careful:** `test/unit/menuRouteParity.spec.js` + `newRoleMenuParity.spec.js` sidebar↔route parity assert karte hain — ye do chalao fix ke baad.

### T9. GREEN GATE (30 min) — Phase 1 ka exit

```powershell
# 1. Backend sab (do batch, 0 fail):
cd backend; $env:NODE_OPTIONS='--max-old-space-size=6144'
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --forceExit test/integration
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --forceExit test/unit test/security test/contract
# expected: integration ~95/95, unit+security+contract ~154/154
npm run lint                    # 0 errors

# 2. Frontend:
cd ../frontend
npm test                        # 13 files / 117 tests pass
npx playwright test             # sab specs pass (6 files)
npm run lint                    # 0 errors
node scripts/typecheck-ratchet.mjs   # "ratchet OK"
npx vite build                  # green

# 3. Commit (phase boundary):
#   "fix: MessageSquare import, a11y spec ESM, authz manifest regen, lint errors, sidebar dupes"
```

---

## PHASE 2 — P1: TEST GAPS (B) (4–6 din) ⚠️ sabse bada risk: 25k lines untested

**Pattern (copy karo):**
- Backend integration: `import { mountApp, query } from '../helpers/appHarness.js'` — example `test/integration/securityDepth.spec.js` / `feedbackNps.spec.js`
- Frontend unit: `.test.jsx` colocated — example `PatientBanner.test.jsx` (path glob se dhoondh lo)
- Playwright: `import { mockApiBaselineFor, adminUser } from '../test-utils/helpers'` + `page.route('**/api/...')` — example `e2e/frontdesk.spec.ts`

### B1. NEW `backend/test/integration/checklistApis.spec.js` (~1.5 d)

HTTP-level tests (abhi sirf schema-level `unit/checklistModules.spec.js` hai) — har route par: RBAC (`restrictTo`/`authorize`), validation 400, tenant filter:

- **Gate pass:** request → approve/reject(reason) → use; wrong role 403; expired badge logic
- **Security rounds:** start → checkpoint tick+note → close; missed checkpoint highlight; index OOB 400
- **Feedback:** POST (patient), `GET /summary` (staff:manage only → 403 for patient), `PUT /:id/respond`
- **Ambulance:** trip start→end (odometerEnd ≥ odometerStart enforce), fuel/maintenance log, stats
- **Linen:** request lifecycle
- **H1 register:** `GET /h1-register` (pharmacy:read|manage), `/gaps`, `/export` — patient ko 403; dispense se auto-entry + gaps=0

### B2. Extend `test/integration/routeAuthz.http.spec.js` (~1 d)

Abhi sirf `assistantBookings` cover hai. Loop over new route families — **unauth → 401, wrong-role → 403**: feedback, ambulance-trips, security (gate-pass/rounds), h1-register, certificates, biomedical, bmw, biometric, recruitment, canteen, parking, clinicPackages, encounters, dicom viewer-url.

### B3. Frontend component tests ×4 (~1 d)

`PacsDicomViewer` (window/level/zoom state), `LinenLaundryPage` (status transitions), `ParkingManagementPage` (fee calc display), `DialysisPage` (render + primary action). Vitest pattern `PatientBanner.test.jsx` copy karo.

### B4. Playwright e2e ×4 naye pages (~1 d)

`frontend/e2e/`: `feedback.spec.ts`, `ambulance.spec.ts`, `security.spec.ts`, `h1-register.spec.ts` — template `frontdesk.spec.ts`:

- login (mocked) → route pe goto → table/heading visible → primary action → toast
- Route URLs: `/hospital/feedback`, `/hospital/ambulance-trips`, `/hospital/security`, `/pharmacy/h1-register`
- `accessibility.spec.ts` ke page list me ye routes add karo (file me page list hai — check karo), axe serious/critical = 0

### B5. Thin specs strengthen (~1.5 d)

- `certificates.spec.js` (99 ln): baaki 3 cert types + cross-tenant 404 + audit entry
- `unit/lisAnalyzerDriver.spec.js` (78 ln): unknown test-code → quarantine; duplicate message idempotent
- `unit/einvoice.spec.js` (157 ln): B2B vs B2C branch; cancel-window boundary
- `biomedical.spec.js`: negative RBAC (nurse → 403)
- `tenantIsolationNew.spec.js` (79 ln): abhi sirf biomedical+BMW — loop me add: recruitment, canteen, parking, packages, encounters, biometric, certificates, dicom

**Coverage gate:** `npm run test:coverage` (backend) — naye `services/`+`routes/` ≥70% lines; critical (scores, einvoice, approvals, discharge finalize, payments webhook) ≥90%.

---

## PHASE 3 — P1: PARTIAL FEATURES (D) (~7–8 din)

> **D1 Generic substitution = ALREADY DONE** (`Prescription.noSubstitution` :23, `GET /medicines/:id/substitutes` pharmacy.js:239, dispense-time checks :934-975, `genericSubstitution.spec.js`) — sirf smoke-verify karo, mat dohra banao.

### D2. Auto follow-up booking — 70% pending (~1.5 d)

- ✅ Exists: auto-book `appointments.js:1276-1310`; `POST /recalls/book` (tentative) `recall.js:131`; T-24h/T-2 reminder `jobs/appointmentReminder.job.js:45-51`
- ❌ **Fix 1:** `followup_confirm` SMS/WhatsApp template create karo (template registry dhoondho — `test/integration/notifyTemplates.spec.js` se location identify)
- ❌ **Fix 2:** `appointmentReminder.job.js:58` — `ACTIVE_STATUSES = ['Pending','Confirmed']` me `'Tentative'` add karo (warna recall-booked follow-ups ko reminder nahi jaata)
- ❌ **Fix 3 (optional):** free follow-up window rule (config, e.g. 7 din tak fee 0) billing check me
- **Tests:** `autoFollowUpBooking.spec.js` extend — slot conflict → next free; confirm/reject; no double booking; reminder IST timing

### D3. Birth certificate seal/QR — 70% pending (~1 d)

- ✅ Exists: `generateBirthCertificatePDF` pdfService.js:768, `GET /births/:id/certificate` maternity.js:110, `GET /crs-export` :145
- ❌ **Fix:** PDF par `sealDoc` (`lib/docSeal.js`) lagao + **`SignatureEvent` with `kind:'birth'` write karo** (abhi koi nahi likhta → `/verify/doc/birth/:id` hamesha `{valid:false}` dega). Pattern: `routes/signatures.js:36,61,107` kaise create karta hai; verify reader `routes/verify.js:11`. Death-cert wala flow (`mortuary.js:90`) reference lo.
- **Tests:** `maternityBirth.spec.js` extend — PDF buffer non-empty, seal verify true, only authorised roles, tenant scope.

### D4. Multi-level SLA escalation — 60% pending (~1.5 d)

- ✅ Exists: 3-level sweep `approvals.js:204-226` (100%→medical_director, 75%→hospital_admin, 50%→billing_manager), `escalationLevel` field, tests `approvalEscalation.spec.js`
- ❌ **Fix:** sweep **hardcoded** hai; `ApprovalPolicy.escalation[]` array (model line 17-20: `{afterPct, toRole}`) **kabhi read hi nahi hota**. Sweep ko policy se read karne do (fallback = current default), per-subject `slaHours`, level badge `ApprovalsInbox` UI me.
- **Tests:** `approvalEscalation.spec.js` extend — policy-driven 0/50/100/150% → levels 0/1/2/3; idempotent re-sweep; expired.

### D5. Forms Hindi labels — 50% pending (~1.5 d)

- ✅ Exists: `localizeTemplate` (`formEngine.js:104-120`), `labelHi` renderer (`FormRenderer.tsx:62,86`), test hook `formsPrint.spec.js:51-75`
- ❌ **Fix:**
  1. `models/FormTemplate.js:14` — schema me sirf `labelHi` hai → `placeholderHi`, `optionsHi`, `titleHi`, `helpHi` add karo
  2. `routes/forms.js` — `?locale=hi` accept → `localizeTemplate()` call (abhi kabhi call hota hi nahi)
  3. `FormBuilderStudio.tsx` — har field ka doosra "Hindi" input (+ optional auto-translate stub)
  4. `FormsFill.tsx` — language toggle (`i18n/i18n.ts` existing), `labelHi` fallback `label`
  5. `printEngine.js` — language param + pdfkit me Noto Sans Devanagari embed (Devanagari glyphs, no tofu)
- **Tests:** missing-Hindi fallback; localised validation msgs; PDF Devanagari glyph render.

### D7. OCR image/PDF vision — 40% pending (~2 d)

- ✅ Exists: text OCR `aiGateway.js:136` (Gemini, key ke saath real), `AiReview` queue backend (`aiFeatures.js:22-31,95,105`)
- ❌ **Fix:**
  1. `aiFeatures.js:39` — `fileId` accept karo (abhi `rawText` ke bina 400); upload → `clamav.js` scan → store
  2. `aiGateway.js` — image/PDF ko base64 `inlineData` (mime ke saath) bhejo Gemini **vision** (abhi sirf `parts:[{text}]`), per-docType JSON-schema constrained output, per-field confidence
  3. **Frontend human-review screen** (image left, fields right) → `PATCH /ai/reviews/:id` — abhi koi frontend file `/ai/ocr` call hi nahi karti; `AiSafety.tsx:99-107` placeholder text hai
  4. PHI note: hospital opt-in flag + zero-retention, size/page limits, kill-switch (exists)
- **Tests:** schema validation of model output; malformed JSON retry; **prompt-injection text inside doc treated as data**; no-key stub fallback.

### D6. Headless-Chromium print — 0% pending (~2–3 d) — *bada kaam, last rakho*

1. `npm i playwright` (**backend worker ke liye alag image**; `npx playwright install --with-deps chromium`)
2. NEW `backend/src/lib/pdfRender.js`: `renderHtmlToPdf({html, css, pageSetup})` — per-worker browser pool, `page.setContent` → `page.pdf({format, margin, printBackground, preferCSSPageSize})`, 20s timeout, **block all network** (`page.route('**/*', ...)` sirf `data:` allow), memory cap
3. `workers/pdfWorker.js:15-26` — naya kind `template` → `printEngine.renderTemplate()` → `renderHtmlToPdf()`; failure pe pdfkit fallback; cache by `(docType, templateVersion, dataHash)`
4. Docker: `fonts-noto` + Noto Sans Devanagari, `--no-sandbox` sirf locked container me, resource limits
5. Duplicate-copy watermark + PrintLog hash (designed already)
- **Tests:** golden text extraction `pdf-parse`; Hindi glyphs; 100-page batch memory stable; template-injection blocked.

---

## PHASE 4 — P2: E ITEMS (~8–10 din)

| # | Kaam | Steps | Effort |
|---|---|---|---|
| **E5** | Certificates QR/preview | `ClinicCertificates.tsx:126-146` sirf blob download → inline preview (iframe/modal) + QR on PDF + `/verify/doc/...` link (death-cert pattern). Abhi verification code plain text hai (:280) | 0.5 d |
| **E6** | SOFA alert rule | Trend UI ✅ (`IcuChart.tsx:247-262`) + endpoints ✅ (`clinical.js:206,217`) — **missing:** "SOFA ≥ +2 in 24h" alert rule (`routes/rules.js` + seed pattern: `scripts/seed-clinical-alert-rules.mjs`) | 1 d |
| **A3** | TS debt -300/wk | P1 T7 ke baad ongoing; top offenders `UserDashboard.tsx`, `Pharmacy.tsx`, `ChatSettingsPanel.tsx`, `HospitalProfile.tsx` (~250-350 err each) | ongoing |
| **E1** | Real e-invoice IRP | `einvoiceService.js:23` abhi `EINVOICE_MODE` default `sandbox`. GSP/IRP choose → creds env → `generateIrn`/`cancelIrn` (24h window) → signed QR store → retry/queue → `lib/gstin.js` validation. **.env.example me placeholder docs add karo** (abhi hai hi nahi). Legal threshold advisor se confirm | 3 d |
| **E2** | PACS production | `backend/.env.example` ORTHANC/OHIF **missing — add karo**: `ORTHANC_HTTP_URL`, `ORTHANC_HTTP_PORT`, `OHIF_URL`. Orthanc Docker deploy + DICOM AE config + TLS/auth; CT/MRI series scroll/MPR ke liye OHIF via `/dicom/viewer-url` (fallback already in `dicom` spec) | 2 d |
| **E3** | Payment gateways live | Razorpay/Cashfree/PayU/PhonePe test→live keys, webhook URLs+secrets (`.env.example` me RAZORPAY placeholders **missing — add**), `PaymentGatewaySettings.tsx` per-hospital, replay guard test, reconcile job, refund e2e test mode | 2 d |

---

## PHASE 5 — GO-LIVE (F) (~5–10 din, mostly non-code)

### F1. Env/secrets (`.env.production` + vault)

Checklist: `MONGODB_URI` (**replica set**), `REDIS_URL`, `JWT_*`, `FIELD_ENCRYPTION_KEY`, `GEMINI_API_KEY/MODEL`, `ORTHANC_*`/`OHIF_URL`, payment keys+webhook secrets, SMS/WA keys + **DLT template IDs**, SMTP, S3+KMS, `ABDM_*`, `WEB_PUSH` VAPID, telephony webhook secret, Sentry/OTel. **Repo me koi secret nahi** (gitleaks pass: `.gitleaks.toml` — currently clean ✅). `.env.example` me missing placeholders document karo (E1/E2/E3 se).

### F2. Data migrations (prod se pehle dry-run + backup)

```powershell
node backend/scripts/migrate-bed-unique.js --dry-run
node backend/scripts/backfill-encounters.mjs --dry-run
node backend/scripts/bump-authz-baseline.mjs   # sirf jab authz baseline badalni ho
node backend/scripts/seed-demo-hospital.mjs    # sirf demo/UAT, PRODUCTION ME NAHI
```

Har script: backup → dry-run report → run → verify counts → rollback note (`backend/scripts/MIGRATIONS.md` update).

### F3. Security

- ⚠️ **ZAP/SBOM repo me NAHI hain** (purana claim galat tha) — **fresh** OWASP ZAP baseline scan chalao, results `ZAP/` me store, high/critical fix
- Rate limits + WAF; CORS allow-list; CSP; secure cookies
- Role matrix (`roleMatrixSnapshot.spec` ✅) + `AccessReview` campaign schedule
- Break-glass weekly reports; audit hash-chain verify cron
- Backup: Mongo PITR + restore drill (RPO/RTO documented)
- Downtime mode drill + printed fallback forms

### F4. Compliance (advisor se confirm — code nahi)

DPDP consent/retention (`docs/privacy/RETENTION.md` ✅)/breach SOP · ABDM M1-M3 · NABH chapter owners · BMW authorisation · PCPNDT/MTP registers · H1 register inspection format · Clinical Establishments registration · telemedicine compliance · DLT registration · GST e-invoice applicability · AERB/Fire/Lift NOC tracking (`License` model).

### F5. Performance

`k6/` me 6 scripts hain ✅ + naye: queue call-next, kiosk burst, report-studio 100k export, discharge finalize. Targets: p95 < 500ms dashboards, no 5xx @ 200 concurrent. Top-10 queries ka `explain()` + index review.

### F6. Observability

pino → central logs, `prom-client` metrics, alerts (queue lag, webhook fail, DLQ, job fail), uptime checks, status page, runbooks, on-call rota.

### F7. People/process

Role-wise SOPs + training · UAT sign-off per dept · help-desk · NPS feedback loop · cutover plan (freeze → migrate → parallel-run 1-2 wks → rollback criteria).

---

## PHASE 6 — G: UAT SCRIPTS (3–4 din)

`docs/uat/` me 12 flows (original MASTER TODO section G table copy karo), har ek me: preconditions, numbered steps, expected result, pass/fail sign-off column:

1. OPD journey · 2. IPD→discharge→TPA · 3. ER→MLC→admit · 4. OT day · 5. Lab critical · 6. Pharmacy H1 · 7. Procurement · 8. Payroll · 9. Queue/Kiosk/Display · 10. Offline PWA · 11. Feedback/NPS · 12. Security gate/rounds.

---

## SUGGESTED SPRINT ORDER

| Sprint | Kaam | Exit gate |
|---|---|---|
| **S1 (1 hafta)** | Phase 0 + **Phase 1 (T1-T9)** | Green Gate: backend 249+ specs, frontend vitest+e2e, lint 0 err, ratchet OK, build green |
| **S2 (1 hafta)** | B1-B5 tests | integration me naye specs green; coverage target |
| **S3 (1 hafta)** | D2, D3, D4, D5, E5, E6 (+B4 e2e) | har feature ke tests green |
| **S4 (1-2 hafta)** | D7, D6, E1-E3, F (security/perf), G (UAT) | go-live checklist sign-off |

---

## REFERENCE: VERIFIED STATE (12 Oct 2026, HEAD `fcf3927e`)

### Test status (mai chala ke verify kiya)

| Suite | Result |
|---|---|
| `test/integration` (95 files) | **94 pass, 1 skip, 809 tests** (authzManifest tha fail, T3 se fix hoga) |
| `test/unit + test/security + test/contract` (154) | 151 pass / 3 fail (`dataDictionary`, `authzManifest`, `authzGapClosure` — T3/T4 se fix) |
| `formsPrint.spec.js` | **9/9 PASS** (A1 ESM issue clear — sahi invocation me) |
| Frontend vitest | **13 files / 117 tests PASS** |
| Playwright e2e | **16 FAILED** — root cause T1 (MessageSquare) + T2 (`__dirname`) |
| `vite build` | GREEN |

### Feature status (code grep + agent verification)

| Item | Status | Evidence |
|---|---|---|
| **C1-C4 UIs** | ✅ BUILT | `FeedbackDashboard.tsx`(381), `AmbulanceTripsPage.tsx`(590), `SecurityDeskPage.tsx`(585), `H1RegisterPage.tsx`(282) + App.tsx routes/roles + `/feedback/summary`(feedback.js:78) + `/h1-register/export`(pharmacy.js:1144) |
| D1 Generic substitution | ✅ DONE | `noSubstitution` Prescription.js:23; substitutes pharmacy.js:239; dispense checks :934-975 |
| D2 Auto follow-up | 🟡 70% | auto-book appointments.js:1276; recall book recall.js:131; **missing:** followup_confirm template, Tentative not in reminder ACTIVE_STATUSES |
| D3 Birth certificate | 🟡 70% | PDF pdfService.js:768; route maternity.js:110; **missing:** sealDoc + SignatureEvent → verify endpoint always invalid |
| D4 SLA escalation | 🟡 60% | 3-level sweep approvals.js:204-226 works; **`ApprovalPolicy.escalation[]` never read** |
| D5 Hindi labels | 🟡 50% | localizeTemplate formEngine.js:104; **not wired:** forms.js route, FormBuilderStudio, FormsFill toggle, printEngine |
| D6 Chromium render | 🔴 0% | no playwright/pdfRender in backend |
| D7 OCR vision | 🟡 40% | text-only aiGateway.js:136; **missing:** inlineData vision, frontend review screen |
| E1 IRP | 🔴 sandbox | einvoiceService.js:23 default sandbox |
| E2 PACS env | 🔴 | ORTHANC/OHIF not in .env.example |
| E3 payments env | 🔴 | RAZORPAY not in .env.example |
| E5 Certificates | 🟡 | download only, no QR/preview |
| E6 SOFA alert | 🟡 | trend UI ✅, +2 alert rule ❌ |
| E7 Docs | ✅ | CHANGELOG active; docs/hms-roadmap/ exists |

### Test coverage gaps (B targets)

| Required | Status |
|---|---|
| `unit/clinicalScores.spec.js` SOFA/APACHE | ✅ 154 ln |
| `unit/einvoice.spec.js` | ✅ 157 ln (gap: B2B/B2C, cancel window) |
| `unit/lisAnalyzerDriver.spec.js` | ✅ 78 ln (gap: quarantine, idempotent) |
| `integration/certificates.spec.js` | ✅ 99 ln (gap: 3 more types, tenant) |
| `biomedical/bmw/biometric/recruitment/canteenParking/dicom/approvalEscalation/feedbackNps/genericSubstitution/autoFollowUpBooking/maternityBirth` | ✅ sab exist |
| `checklistApis.spec.js` (HTTP-level) | ❌ MISSING → B1 |
| `routeAuthz.http.spec.js` new routes | ❌ only assistantBookings → B2 |
| Frontend tests: PacsDicomViewer, Linen, Parking, Dialysis | ❌ MISSING → B3 |
| e2e: feedback, ambulance, security, h1-register | ❌ MISSING → B4 |
| `tenantIsolationNew` breadth | 🟡 only biomedical+BMW → B5 |

### Hygiene status

| Check | Status |
|---|---|
| Backend lint | 🔴 13 errors (T5 table) |
| Frontend lint (src) | 🔴 3 errors (settings.js dupes) |
| `npm audit --omit=dev` | ✅ 0 vulns (dono) |
| gitleaks (`.gitleaks.toml`) | ✅ clean |
| TS ratchet | 🔴 11988 vs baseline 11971 (+17) |
| Sidebar dupes (doctor) | ❌ 3 pairs (T8) |
| k6 scripts | ✅ 6 |
| Migration scripts | ✅ bed-unique, backfill-encounters, bump-authz, seed-demo |
| `docs/privacy/RETENTION.md` | ✅ |
| ZAP/SBOM | ❌ repo me nahi (F3 me fresh chalana) |

---

# PART 2 — PENDING ITEMS (13 Oct 2026 status ke baad)

**Status check (Phase 1-3 verify kiya, 13 Oct):** Phase 1 (T1-T9 Green Gate) **sab green** ✅ · B1-B5 tests ✅ · D2-D5 ✅ · **Pending: D6, D7, E1-E6 (E5/E6/E1/E2/E3), F, G.** ⚠️ **137 files uncommitted, 0 commits** — Step 0 zaroori.

Ground rules (section 0) wahi. Har task ke baad: Green Gate + commit + CHANGELOG line.

## STEP 0 — PEHLE COMMIT (0.2 d) ⚠️ zaroori

137 files (115 modified + 22 new, ~3647 insertions) uncommitted hain. Phase-wise:

1. `fix(p0): MessageSquare import, a11y ESM __dirname, authz manifest + data-dictionary regen, lint errors, sidebar dupes, TS ratchet 11971→11934`
2. `test: checklistApis, routeAuthz extension, h1Register, 4 component tests, 4 e2e specs, thin spec strengthening (B1-B5)`
3. `feat(d2-d5): follow-up reminders + template, birth cert seal/QR, policy-driven SLA escalation, Hindi form labels`
4. `docs: antigravity-master-plan + CHANGELOG`

Untracked `rolesmd/`, `src/data/*`, plan file bhi include karo (`rolesmd/fix-plan*.md` alag chore commit). Exit: `git status` clean.

## D7. OCR image/PDF vision (~2 din)

**Current:** `routes/aiFeatures.js:39` `POST /ocr` sirf `rawText` → `ocrDocumentWithProvider({docType, rawText})` (`aiGateway.js:136`, `parts:[{text}]`). `AiReview` enqueue `aiFeatures.js:22`, `GET /reviews` :95, `PATCH /reviews/:id` :105 — backend ready. **Frontend me koi `/ai/ocr` ya `/ai/reviews` call nahi karta.** `clamav.js` exist **nahi** karta (purana plan galat).

Steps:
1. `POST /ocr` me `fileId`/`imageBase64 + mime` accept (multer pattern `routes/reports.js`/`drive.js` se copy; 10MB cap, PDF max 10 pages). Virus scan: `services/virusScan.js` banao (ClamAV socket, `CLAMAV_URL` unset → skip) ya defer + TODO note.
2. `aiGateway.js:136` — file ho to Gemini `parts:[{inlineData:{mimeType, data}}]` + text prompt; warna purana text path. Output JSON-schema constrained (docType-wise: insurance-card/ID/invoice/discharge-summary/lab-report), per-field confidence.
3. Malformed JSON → 1 retry ("return valid JSON only") → phir bhi fail → `{error:'parse'}` + AiReview reject.
4. `GEMINI_VISION_ENABLED` kill-switch (default OFF, hospital opt-in), size/page limits, `AiInvocation` log (already).
5. Frontend **naya** `frontend/src/pages/superadmin/AiReviewQueue.tsx`: left image/PDF preview (blob/iframe), right editable fields + confidence badges, Save (`PATCH /ai/reviews/:id` approved) / Reject. Route `/superadmin/ai-reviews` (`authorize('records:write')` match), `App.tsx` lazy route + `AppSidebar.tsx` superadmin entry (~line 67).
6. Prompt-injection: doc text kabhi system prompt me nahi — data part me; test me injection string → assert data-treated.

Tests: `integration/aiOcr.spec.js` — no-key stub, fileId w/o rawText accepted, 10MB cap → 400, stub schema-validate, PATCH RBAC. Unit: malformed-JSON retry (aiGateway fetch mock).

## D6. Headless-Chromium print render (~3 din)

**Current:** `printEngine.js` exports `VARIABLE_REGISTRY` :12, `lintTemplate` :55, `renderTemplate(html, css, data, {duplicate, lang})` :73 (HTML string, koi `.hbs` file nahi — templates inline), `toEscPos` :92. `pdfWorker.js`: BullMQ `QUEUE_NAMES.pdf` :47, `generatePdf(kind,data)` switch :13 — kinds `prescription|lab-report|discharge-summary|invoice`, unknown → `UnrecoverableError` :25. `backend/Dockerfile` ✅, root docker-compose ❌. PDF abhi pdfkit (`pdfService.js`).

Steps:
1. `cd backend; npm i playwright` + Dockerfile me `npx playwright install --with-deps chromium` + `fonts-noto fonts-noto-devanagari`.
2. **NEW `backend/src/lib/pdfRender.js`:** `renderHtmlToPdf({html, css, pageSetup})` — per-process browser singleton/pool, `page.setContent` → `page.pdf({format:'A4', margin, printBackground:true, preferCSSPageSize:true})`, 20s timeout, buffer cap, **network block:** `page.route('**/*', r => url.startsWith('data:') ? r.continue() : r.abort())`. `--no-sandbox` sirf `PDF_RENDER_NO_SANDBOX=1` par.
3. `pdfWorker.js` naya kind `'template'` (`{kind:'template', data:{docType, templateVersion, payload}}`) → `renderTemplate()` → `renderHtmlToPdf()`; catch → **fallback** legacy pdfkit `generatePdf(docType)` + `job.log()`. Cache: `dataHash=sha256(docType|templateVersion|payload)` → Redis GET/SET TTL 1h.
4. Pilot: prescription print route ko `'template'` job pe switch (ek docType), baaki baad me.
5. Container: worker memory limit + ulimit; `duplicate:true` watermark + PrintLog hash `printEngine` already.

Tests: unit `pdfRender.spec.js` — skip if `PDF_RENDER_DISABLED=1` (CI); simple HTML → `%PDF` header + `pdf-parse` roundtrip; Handlebars injection `{{constructor}}` → `lintTemplate` block (`formsPrint.spec.js:51` pattern); Hindi Devanagari → glyph, no tofu.

## E1. E-invoice real IRP (~3 din)

**Current:** `einvoiceService.js` — `einvoiceConfig()` :22 (`EINVOICE_MODE` def sandbox), `generateMockIrn` :40, `generateAckNo` :48, `buildEinvoicePayload` :56, `generateEinvoice` :128, `cancelEinvoice` :229. **`.env.example` me EINVOICE_* nahi.**

**Exact env names (code pehle se padhta hai, :23-32):** `EINVOICE_MODE` (sandbox|live), `EINVOICE_GSTIN`, `EINVOICE_USERNAME`, `EINVOICE_PASSWORD`, `EINVOICE_CLIENT_ID`, `EINVOICE_CLIENT_SECRET`, `EINVOICE_BASE_URL` (blank → auto SANDBOX/LIVE URL). Enabled flag = GSTIN && USERNAME (:32) — ye comment `.env.example` me.

Steps:
1. `.env.example` me section + placeholders + GSP/NIC sandbox URL comment.
2. `generateEinvoice` me live branch (mode live + creds → real HTTP IRN, 20s timeout; nahi → mock), retry queue (BullMQ `queues.js` pattern, 3 attempts exponential + log), `cancelEinvoice` me 24h window check (invoiceDate+24h < now → 400).
3. Invoice/Billing model: `irn`, `signedQr` (base64), `einvoiceStatus` fields (missing ho to add + MIGRATIONS.md note).
4. GSTIN validate create time `lib/gstin.js`.
5. B2B (buyer gstin present) vs B2C mini-invoice payload branch.
6. `docs/` me 2-line legal note: turnover threshold advisor confirm.

Tests: `unit/einvoice.spec.js` extend — live w/o creds → fallback mock; cancel >24h → 400; retry (fetch fail×2 then success); `signedQr` stored. Real IRP smoke script `scripts/einvoice-sandbox-smoke.mjs` (manual, CI bahar).

## E2. PACS production (~2 din)

**Exact env names (code grep se, guess nahi):**
- DIMSE `radiology.js:1088-1091`: `ORTHANC_HOST` (def localhost), `ORTHANC_PORT` (def 4242), `ORTHANC_AE` (def RIS_AE), `ORTHANC_CALLED_AE` (def PACS_AE)
- HTTP `radiology.js:1210-1211`: `OHIF_URL` (blank → Orthanc built-in viewer fallback), `ORTHANC_HTTP_URL`, `ORTHANC_HTTP_PORT` (def 8042)

Steps:
1. `.env.example` me ye 7 vars + comments.
2. `docs/infra/pacs.md`: Orthanc Docker run (port 8042, TLS ya reverse-proxy), AE titles, OHIF Docker (`ohif/ohif` + `VITE_APP_ORTHANC_URL`), firewall notes, "OHIF_URL blank = small hospital fallback works".
3. Manual verify: sample study upload → `/dicom/viewer-url` → OHIF open (checklist line).

Tests: existing `dicom.spec.js` + `radiologyDicom.spec.js` green; naya: OHIF_URL set (env mock) → `viewer:'ohif'` URL returned.

## E3. Payment gateways live (~2 din)

**Exact env names (`lib/gateways.js` + `webhook.js:13-16`):**
- Razorpay :53-54: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- Cashfree :134-136: `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV` (def sandbox)
- PayU :257-286: `PAYU_MERCHANT_KEY`, `PAYU_MERCHANT_SALT`, `PAYU_ENV` (def test), `PAYU_SUCCESS_URL`, `PAYU_FAIL_URL`
- PhonePe :327-357: `PHONEPE_MERCHANT_ID`, `PHONEPE_SALT_KEY`, `PHONEPE_SALT_INDEX` (def 1), `PHONEPE_ENV` (def test), `PHONEPE_REDIRECT_URL`
- Webhook secrets `webhook.js:13-16`: `WEBHOOK_SECRET_PAYTM`, `WEBHOOK_SECRET_RAZORPAY`, `WEBHOOK_SECRET_STRIPE` + `webhookSecurity.js` grep karke baaki providers ke names bhi add.

Steps:
1. `.env.example` me "PAYMENTS" section + ye sab placeholders + webhook URL instructions.
2. `PaymentGatewaySettings.tsx` audit: kya save hota hai, test/live toggle + webhook URL display/copy missing ho to add.
3. **Replay guard test:** same payload+timestamp 2× → 2nd 400 (`webhookSecurity.js` HMAC + timestamp window; `gatewayWebhook`/`webhookDeliveryRetry` spec extend).
4. Reconcile job schedule verify (grep `reconcile` in jobs; missing → cron).
5. Refund happy-path test mode (mock gateway) — `paymentsRefundProductionGuard.spec.js` ke saath.

Tests: webhook replay, refund idempotent, gateway settings RBAC (hospital_admin write only).

## E5. Certificates QR + preview (~0.5 d)

**Ready:** `docSeal.js:11` `sealDoc(docType, docId, bytes)` + `verifySeal` :19; `verify.js:11` `GET /doc/:kind/:id` (SignatureEvent); **`App.tsx:836` `/verify/doc/:kind/:id` → `VerifyDoc` public route exists**; frontend `qrcode.react@4.2.0` installed. `ClinicCertificates.tsx:126` blob download only, :280 verification code plain.

Steps:
1. Backend `routes/certificates.js`: PDF ke baad `sealDoc('certificate', certId, bytes)` + SignatureEvent create (D3 `maternity.js:110` wala pattern exactly reuse) → response me `verifyUrl`.
2. Frontend `ClinicCertificates.tsx`: download ke baad preview modal (blob → iframe), row me QR (`QRCodeSVG`) with `window.origin + /verify/doc/certificate/${id}` (hash-router check → App.tsx:836 path-based hai, seedha chalega), verification code `<code>` + Copy button.

Tests: `integration/certificates.spec.js` extend — verifyUrl in response, seal verify true, wrong id invalid; component: QR renders (vitest snapshot).

## E6. SOFA +2 alert rule (~1 d)

**Critical correction:** rule engine `DATASETS` whitelist (`lib/datasets.js`) me **sirf 4 datasets**: `ipd_stays`, `bills_unpaid`, `lab_critical`, `ops_snapshot`. **`icu_scores` dataset hi nahi** — rule seed karke kuch nahi hoga. Engine: `ruleMatches` (`ruleEngine.js:30`) row-based, sweep `rules.js` `sweepRulesTenant` :200, dedup `dedupHash` :111, `raiseAlert` (`lib/alerts.js`). Model `IcuScore`: scoreType SOFA/…, `hospitalId+admissionId+scoreType+recordedAt` index ready. Score save `clinical.js:256` `IcuScore.create`.

Steps:
1. `datasets.js` me **naya `icu_scores` dataset**: `fetch(hospitalId)` → `IcuScore.find({hospitalId, scoreType:'SOFA', recordedAt:{$gte: now-24h}})` → group by `admissionId` → latest + previous → computed row field **`sofaDelta = latest - previous`** (fields: `admissionId, patientId, score, prevScore, sofaDelta, recordedAt`). **Delta dataset me hi compute karo — `ruleEngine.js` me delta logic mat daalo.**
2. Seeds (`rules.js` + `scripts/seed-clinical-alert-rules.mjs`): rule `key:'sofa-delta-2'`, `dataset:'icu_scores'`, `enabled:true`, `actions:{type:'alert', severity:'critical', roleQueue:'doctor'}`, condition `sofaDelta >= 2`, `cooldownMinutes:1440`.
3. Alert path ready (`raiseAlert` + `RuleFiring`) — kuch nahi banana, sirf dataset + seed.

Tests: `scoreAlert.spec.js` extend (file already modified) — 4→6 fire; 4→5 no fire; 6→6 no fire; duplicate suppression (cooldown); disabled rule no fire.

## F. GO-LIVE (mostly non-code, ~5-7 din)

- **F1** (0.5 d + E1/E2/E3 placeholders): `.env.example` complete + `docs/go-live/env-checklist.md` (vault, koi secret repo me nahi, gitleaks clean ✅)
- **F2** (0.5 d): migrations dry-run staging par — bed-unique → backfill-encounters → counts verify → `MIGRATIONS.md` run log + rollback notes
- **F3** (2-3 d): **fresh ZAP baseline** (ZAP/ dir nahi hai → `docker run ... zap-baseline.py -t target` → `ZAP/baseline-report.md`, high/critical fix) · OWASP audit (rate limits/CORS/CSP/cookies) · backup restore drill `docs/go-live/backup-runbook.md` · downtime-mode drill
- **F5** (1-2 d): `k6/` me 4 naye — queue-call-next, kiosk-burst, report-export, discharge-finalize (6 existing pattern); targets p95<500ms, 0 5xx@200VU; top-10 `explain()` + index → `migrate-index` scripts
- **F6** (1 d): alerts config (queue lag/webhook fail/DLQ/job fail), `GET /ops-health` wiring, runbooks `docs/go-live/runbooks/` (payment-webhook-fail, queue-stuck, db-failover)
- **F4/F7** (manual): compliance owners + SOPs + training + `docs/go-live/cutover.md` (freeze → migrate → parallel-run → rollback criteria)

## G. UAT SCRIPTS (1-2 d)

`docs/uat/uat-01-opd.md` … `uat-12-security.md` (12 files), har ek me: Preconditions (seed data + role) / numbered Steps (exact URL `App.tsx` se match — galat URL = useless) / Expected (observable) / Sign-off `[ ] Dept head Date: __`.

Flows: OPD · IPD→discharge→TPA · ER→MLC→admit · OT day · Lab critical · Pharmacy H1 · Procurement · Payroll · Queue/Kiosk/Display · Offline PWA · Feedback/NPS · Security gate/rounds.

## PART 2 SPRINT ORDER

| Step | Kaam | Time | Exit |
|---|---|---|---|
| 0 | Phase-wise commits (existing 137 files) | 0.2 d | `git status` clean |
| 1 | E5 (sabse chhota — confidence builder) | 0.5 d | QR+preview+seal tests green |
| 2 | E6 icu_scores dataset + sofa-delta-2 | 1 d | scoreAlert spec green |
| 3 | D7 OCR vision | 2 d | aiOcr spec + review UI e2e |
| 4 | E1 + E2 + E3 (env/docs sprint) | 3-4 d | specs + `.env.example` complete |
| 5 | D6 Chromium render | 3 d | pdfRender spec + pilot docType |
| 6 | F1-F3, F5-F6 | 3-4 d | ZAP report + k6 targets |
| 7 | G UAT docs | 1-2 d | 12 sign-off sheets |

**Total ~13-17 dev-days.** Step 3/2 parallel, 4/5 parallel possible. Har step end pe: Green Gate (section 0) + commit + CHANGELOG line.
