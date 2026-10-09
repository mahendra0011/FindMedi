# 14. Form Builder, Template Builder, Printing, Labels & e-Signature (NEW)

Repo check: `formBuilder|customForm|FormTemplate|printTemplate|letterhead|kiosk|wristband|signature_pad` = **0 hits** (backend + frontend deps). Hai sirf: `pdfkit` (code-drawn PDFs), `NotificationTemplate` model, `qrcode`/`qrcode.react`, `ConsentRecord`, `Prescription.integrity` (HMAC-type seal), `FileUpload` page.
(Files 01-12 me `ConsentForm` model aur "e-sign" sirf naam level pe the, yahan full design hai.)

---

## 14.1 Custom Form Builder (department-wise forms)

**Use cases:** nursing admission assessment, pre-anaesthesia check, WHO checklist, falls risk, dialysis session sheet, antenatal card, camp screening, internal audit checklists, consent forms, intake questionnaires.

### Logic
- Form = **versioned JSON schema** (`FormTemplate`), submissions = `FormResponse` pinned to template version (old data renders with old version).
- Field types: text, textarea, number (unit, min/max), date/time, select/multi, radio, checkbox, yes/no/NA, scale (pain 0-10), **vitals group** (BP, pulse, temp, SpO2, RR, weight, height -> BMI auto), table (repeatable rows), file/photo, signature, patient-picker, staff-picker, **calculated** (formula), **score** (Morse, Braden, GCS, Barthel with auto-interpretation), section/heading, info text.
- **Conditional logic**: `showIf` / `requiredIf` / `disableIf` using a safe expression (JSON-logic style; **no `eval`**).
- **Formulas**: sandboxed evaluator (`mathjs` restricted scope or `jsonlogic`) with field refs; show formula result live + store computed value.
- **Prefill**: bind fields to patient/encounter data (`{{patient.age}}`, last vitals), mark prefilled values.
- **Validation**: generated at runtime -> zod schema (`schemaFromTemplate(template)`), same validator on server.
- **Lifecycle**: Draft -> Review -> Published; clinical templates need approval (13.2) by clinical_safety/quality role.
- **Locking & amendment**: once signed, response becomes read-only; changes via **addendum** (new version linked, reason, who/when). Never overwrite.
- Access: template-level + field-level permission (e.g. psychiatric fields restricted).
- Autosave drafts every 5s locally (IndexedDB) + server on blur; offline-capable for ward tablets.

### Flow
`Admin builds template -> test with sample -> publish v1 -> assign to context (Admission / OT / Dialysis / Dept) -> nurse opens in encounter -> fills (autosave) -> sign -> PDF render + store in record -> shown in timeline`.

### Data model
```js
FormTemplate { key, title, category, version, status, schema:{sections:[{id,title,fields:[{id,type,label,labelHi,required,unit,options[],min,max,showIf,requiredIf,formula,bind,permission}]}]}, scoring:[{id,formula,bands:[{from,to,label,color}]}], print:{templateId}, contexts[], hospitalId }
FormResponse { templateKey, templateVersion, encounterId, patientId, values:{}, computed:{}, status:'Draft'|'Signed'|'Amended', signatures:[{role,userId,at,hash}], amendmentOf, createdBy }
```
### API
`GET/POST /api/forms/templates`, `POST /templates/:id/publish`, `GET /api/forms/contexts/:context` (templates for a context), `POST /api/forms/responses`, `PUT /responses/:id` (draft), `POST /responses/:id/sign`, `POST /responses/:id/amend`, `GET /responses/:id/pdf`.

### Frontend framework / libraries
- **Renderer:** `react-hook-form` + `zod` (already in repo) + `@hookform/resolvers` (installed). Renderer maps `type -> component` registry (reuse shadcn `input/select/checkbox/radio-group/calendar/slider`).
- **Builder:** `@dnd-kit/core` + `sortable` (palette -> canvas, reorder sections/fields), property panel in `sheet.tsx`, live preview tab, JSON view (Monaco optional, lazy-loaded).
- **Expressions:** `json-logic-js` (small, safe) for `showIf/requiredIf`; `mathjs` (with `limitedEval` scope) for formulas.
- **Don't** adopt SurveyJS Creator/Form.io unless licence is checked (Creator tooling is commercial); custom builder fits shadcn design better.

### UI design
```
+---------------------------------------------------------------------------------+
| Form Builder: "Nursing Admission Assessment" v2 Draft   [Preview][Save][Publish] |
+---------+---------------------------------------------+-------------------------+
| Fields  |  ▼ Section 1: Vitals                        | Field properties         |
| Text    |   [Vitals group  ⋮⋮]                        | Label EN/HI              |
| Number  |  ▼ Section 2: Risk Scores                   | Required ☐  Unit [  ]    |
| Vitals  |   [Morse fall scale ⋮⋮]  Score: 45 (High)   | Show if: [ + condition ] |
| Score   |   [Braden scale  ⋮⋮]                        | Bind to: patient.weight  |
| Table   |  ▼ Section 3: Allergies [table]             |                          |
| Signature  [ + Add section ]                          |                          |
+---------+---------------------------------------------+-------------------------+
```
- Filling mode is **dense, keyboard-first** (Tab order, Enter-next, numeric keypad for vitals), sticky score summary at top, "required missing: 3" jump link.
- Mobile/tablet: single column, 44px min touch targets, sticky bottom `Save draft | Sign`.
### Animation
- Builder: drag ghost + drop indicator line (2px primary), reorder via framer-motion `layout` (spring 400/35).
- Filling: **no decorative motion**. Only: conditional section reveal (height 0→auto, 180ms), score band chip color cross-fade, field error shake **disabled** (use inline message; shake hurts accessibility).
### Tests
Schema->zod parity client/server, formula injection attempts, showIf cycles, version pinning, addendum chain integrity, large forms (200 fields) render <100ms/interaction, Hindi labels fallback.

---

## 14.2 Document / Print Template Builder + Printing System

**Docs to cover:** OPD slip, token, Rx, lab report, radiology report, bill/receipt/estimate, admission form, consent, discharge summary, claim bundle, certificates (medical, fitness, sick leave, birth/death), barcode labels, wristband.

### Logic
- `PrintTemplate` = **HTML (Handlebars) + CSS** with page setup (A4/A5/thermal 58/80mm/label), margins, header/footer (letterhead image, hospital reg no, NABH logo), per-doc variables, repeat blocks (`{{#each items}}`), conditionals, i18n (`{{t 'bill.total'}}` EN/HI), number->words (₹ Indian grouping), QR/barcode helpers.
- **Variable registry** per document type (typed, documented) so admin can't reference non-existent fields; live preview with sample data; lint warnings.
- **Render pipeline** (server): `data -> Handlebars -> HTML -> headless Chromium -> PDF` in a **BullMQ worker** (isolated, timeout, memory cap); cache by `(docId, version, hash)`; for tiny thermal receipts also support direct **ESC/POS** output.
- **Versioning + approval**; each issued PDF stores `templateVersion` + SHA-256 + (optional) digital seal (see 14.5). Reprints add **"DUPLICATE COPY"** watermark + audit.
- Security: Handlebars **no raw helpers from users**, HTML sanitised (`sanitize-html` already in backend), no external resource fetch from template (allow-list), CSS `@page` only.
### Flow
`Admin edits template (WYSIWYG + HTML tab) -> preview(sample patient) -> publish -> module calls printService.render('bill', billId) -> PDF -> view/print/WhatsApp/email -> PrintLog`.
### Data model
```js
PrintTemplate { docType, name, version, status, pageSetup:{size,orientation,margins}, html, css, assets:[{key,url}], languages[], default:Boolean, hospitalId, branchId }
PrintLog { docType, entityRef, templateVersion, printedBy, printedAt, copies, isDuplicate, channel:'print'|'pdf'|'whatsapp'|'email', hash }
```
### Libraries
- Backend: `handlebars`; HTML->PDF: `playwright` or `puppeteer` (Playwright already in repo devDeps for tests; run in worker image with fonts incl. Devanagari **Noto Sans Devanagari** for Hindi); keep `pdfkit` for simple code-drawn docs; `pdf-lib` to merge/stamp (claim bundles, watermark); `bwip-js` for barcodes; `qrcode` (installed).
- Frontend: editor = `@tiptap/react` (rich text + variable chips) **or** `monaco-editor` (HTML/CSS tab, lazy); preview via sandboxed `<iframe sandbox>` with `srcdoc`; `react-pdf`/`pdfjs-dist` viewer for results.
- Printing: browser `window.print()` + `@page` CSS for A4/A5; **Print agent** (small local service or WebUSB/WebSerial) for thermal/ZPL printers, because browsers cannot silently print.
### UI design
Split view: left editor (Visual | HTML | CSS tabs), middle variable palette (searchable tree: `patient.name`, `bill.items[]`...) drag/insert as chip, right live preview with sample selector + zoom + "Paper" frame showing margins. Top: `Test print`, `Publish`, `History`.
### Animation
Preview refresh: crossfade 120ms (debounced 400ms) with subtle top progress bar; variable chip insert: scale-in 120ms.
### Tests
Hindi glyph rendering, long item tables page-break (`break-inside: avoid`), 500-page batch render, template injection attempts, duplicate watermark, PDF/A optional, same PDF reproducible by hash.

---

## 14.3 Notification Template Variable Engine (extension of existing `NotificationTemplate`)

Existing: `NotificationTemplate`, `NotificationDelivery`, `NotificationPreference`. Add:
- **Variable registry** per event (`{{patient_name}}`, `{{doctor_name}}`, `{{time}}`, `{{bill_amount}}`, `{{report_link}}`) with required/optional, sample values; save-time **lint** (unknown variable => block).
- **Per-channel variants** (SMS 160 char/DLT-registered ID, WhatsApp template name + approved params, email HTML, push title/body) with **preview per channel + char counter**.
- **Locale variants** (en/hi), **quiet hours**, **channel fallback** (WhatsApp fail -> SMS), opt-out/consent check, per-hospital override on global template, versioning.
- Delivery receipts -> `NotificationDelivery` status timeline.
### UI
Template editor with channel tabs (SMS | WhatsApp | Email | Push), chips for variables, phone-frame preview (rounded device mock), delivery stats strip.
### Animation
Phone preview bubble pops in (scale .95→1, 150ms) on edit; char counter color shifts to warning near limit.

---

## 14.4 Labels, Wristbands, Barcodes & Positive Patient Identification (PPID)

Existing: UHID + QR on Health ID page (`qrcode.react`). Missing: printable wristband/labels and **scan-to-verify** workflows.

### Logic
- Symbologies: **Code128** (UHID, lab accession, bed), **QR** (deep link `https://app/.../p/{token}` + short code), **DataMatrix** for small labels. Encode **opaque IDs**, never PHI in barcode.
- Wristband: name, UHID, DOB/age-sex, ward/bed, allergy alert band colour flag, barcode. Print at admission; reprint requires reason.
- **Scan checkpoints** (enforce “5 rights”): medication administration (patient wristband + drug barcode), sample collection (patient + tube label), blood transfusion (patient + blood unit + 2-person check), OT time-out (patient + procedure), report handover, bed assignment.
- Mismatch => hard stop with reason + supervisor override logged.
### Flow
`Admission -> print wristband -> nurse scans at bedside -> app fetches due meds -> scans drug -> match? -> record MAR -> else alert`.
### API
`POST /api/labels/render {type, entityRef}` -> ZPL/PDF; `POST /api/scan/verify {context, scans[]}` -> `{ok, mismatches[]}`.
### Libraries
- Generate: `bwip-js` (barcodes, ZPL-friendly), `qrcode`. Print: ZPL via print agent / network printer (port 9100) / `window.print` PDF for label sheets.
- Scan: native **`BarcodeDetector`** API where available, fallback `@zxing/browser`; support **HID keyboard-wedge scanners** (rapid keystrokes + Enter) via a global scan listener hook (`useScanner`).
### UI design
Scan screen = big camera/scan field, **three-state feedback**: scanning (neutral), match (full-width green band + check icon + success beep), mismatch (full-width red band + shake-free pulse + error beep + "Do not administer"). Show scanned vs expected side by side.
### Animation
Match/mismatch band slides up 160ms; success check path-draw 250ms; **sound + vibration** cues (configurable); no confetti/celebration in clinical context.

---

## 14.5 e-Signature & Digital Seal

Existing: `Doctor.signatureUrl`, `Prescription.integrity {digest, signature, nonceHash}`, `StepUpDialog` (re-auth). Missing: signature capture + multi-party signing on consent/discharge/OT docs.

### Logic
- Signature levels: **L1** drawn signature (patient/relative) with timestamp+device+IP+witness; **L2** staff e-sign = **step-up auth** (PIN/OTP/password via existing `StepUpDialog`) + typed intent ("I certify...") + embed stored signature image; **L3** (optional) PKI/DSC or Aadhaar eSign through a licensed provider for legal-heavy docs.
- Every signing event creates `SignatureEvent {docRef, signerId|name+relation, method, hash(doc bytes), signedAt, ip, device, geo?}`; doc gets **tamper seal** (SHA-256 + HMAC with server key, QR to verify page — same pattern as Prescription.integrity, reuse).
- Multi-party order: patient -> doctor -> witness; each step must complete; incapacitated patient => relative with relation + reason; minors => guardian.
- Language: show consent text in patient's language (en/hi) and record language shown.
### Libraries
`signature_pad` (canvas, smoothing, pressure), `pdf-lib` (stamp signature + footer seal into PDF), existing `qrcode`; verify page `/verify/doc/:id` (public, minimal info).
### UI design
Full-width canvas with baseline, `Clear | Undo | Done`, legal text above, signer identity chips (Patient / Relative / Witness), progress stepper (1 Patient → 2 Witness → 3 Doctor). Tablet landscape optimised; palm-rejection tip.
### Animation
Stepper advance: progress bar fill 200ms; signature accepted: stroke "settles" (opacity .6→1) + check; document seal badge fade-in. No bouncy motion.
### Tests
Hash verifies after storage, tamper detection, replay protection (nonce), step-up expiry, consent in Hindi stored with language flag, audit completeness.
