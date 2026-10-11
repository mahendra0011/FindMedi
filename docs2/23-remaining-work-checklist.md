# 23. Remaining Work Checklist (updated, HEAD b3d4bfb: see file 25)

Pichhle P0/P1/P2 ka bada hissa implement ho chuka hai. **Ab sirf ye baki hai**, priority order me.

## 0. Pehle: build + test fixes (30 min)
1. `DentistDashboard.tsx:12` → `label: "Week's earnings"` (colon missing).
2. `DoctorQueue.tsx` → grid `<div>` close karo (root `</div>` se pehle).  *(verified: 2 fixes ke baad `vite build` pass)*
3. `menuRouteParity.spec.js` → `allowedRoles={CLINIC_ROLES}` jaise constants resolve kare (abhi false failure).
4. `formsPrint.spec.js` → Jest me `sanitize-html/htmlparser2` ESM issue: `transformIgnorePatterns` ya dependency pin; CI Node 20 par check.
5. `npm run typecheck:ratchet` chalake confirm karo ki ~12k TS errors baseline ke andar hain.
6. Integration (75) + Playwright e2e (5) local me chalao (MongoDB chahiye).

## 1. Chhote functional gaps
| # | Kaam | Kahan |
|---|---|---|
| 1 | Public **`/verify/doc/:id`** page (Rx/consent/discharge seal verify) | frontend + `verify.js` |
| 2 | **Idle PIN-lock** UI component (backend `pinLockout` ready) | `components/` + layout |
| 3 | Print: headless Chromium (Playwright) template render + Devanagari fonts in `pdfWorker.js` | `workers/pdfWorker.js`, `printEngine.js` |
| 4 | AI OCR ko real provider (Gemini vision/Document AI) + review UI, stub label hata ke | `aiGateway.js`, `aiFeatures.js` |
| 5 | Clinical CSS tokens (`--esi-*`, `--bed-*`, `--sev-*`) + critical pulse; axe test in CI/e2e | `index.css`, `frontend/e2e`, `ci.yml` |
| 6 | Appointment auto follow-up booking | `appointments.js`, `recall.js` |
| 7 | Pharmacy H1/narcotic register + generic substitution | `pharmacy.js`, `Medicine.js` |
| 8 | Bed statuses Reserved/Blocked/Isolation (confirm in `Bed.js`) | model + BedBoard |
| 9 | Death/birth certificate PDF | `mortuary.js`, `maternity.js` |
| 10 | Vendor GSTIN checksum + onboarding approval | `Supplier`, `enterprise.js` |
| 11 | Queue priority aging + Redis sorted set | `queues.js` |
| 12 | Forms: addendum chain, Hindi labels, offline autosave | `formEngine.js`, `FormsFill` |

## 2. Naye modules (abhi shuru nahi)
NPS / feedback survey · Ambulance trip sheet + fuel/maintenance log · Linen & laundry · Gate pass / security rounds · NICU phototherapy + bilirubin chart · Dialysis extension (machine allocation, dialyser reuse count, serology segregation) · PACS viewer integration (Orthanc + OHIF/Cornerstone).

## 3. Test gaps (abhi bhi)
Gateway webhook idempotency under load · approval boundary + delegation · tenant isolation for **every** new route · queue concurrency (2 counters) · discharge finalize idempotency · reconciliation accuracy · print golden files · RBAC route × role matrix · offline replay · k6 for queues/kiosk.

## Local commands
```bash
cd backend && npm test                       # unit + integration (MongoDB needed)
cd frontend && npm run typecheck:ratchet && npm run lint && npm run build
npx playwright test
```
