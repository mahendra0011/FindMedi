# 20. Library & Framework Stack (existing + recommended additions)

Rule: **jo repo me already hai wo dobara mat lao.** Versions yahan pin nahi kiye: install se pehle `npm view <pkg> version` + changelog + licence check karo, aur exact version pin karo (lockfile).

## 1. Already in repo (reuse) [VERIFIED from package.json]
**Frontend:** React 18, Vite, TypeScript, Tailwind v4, Radix UI + shadcn, `framer-motion`, `gsap`, `lenis`, `@tanstack/react-query`, `react-hook-form` + `zod` + `@hookform/resolvers`, `zustand` + Redux Toolkit (dono hain), `react-router-dom`, `socket.io-client`, `recharts`, `cmdk`, `vaul`, `sonner`, `date-fns`, `react-day-picker`, `embla-carousel`, `qrcode.react`, `input-otp`, `livekit-client`, `maplibre-gl`, Playwright/Vitest (tests).
**Backend:** Express, Mongoose, `zod`, `bullmq` + `ioredis`, `kafkajs`, `socket.io`, `pino`, `pdfkit`, `exceljs`, `sharp`, `sanitize-html`, ClamAV scan, `web-push`, `node-cron`, `jsonwebtoken`/2FA, OpenSearch client, Prisma (dual-write), gRPC proto.
**Gap noticed:** state management me Redux Toolkit **aur** Zustand dono hain; naye modules me **ek hi convention** rakho (server state = React Query, UI/local state = Zustand; Redux sirf legacy slices).

## 2. Recommended additions (frontend)
| Need | Library | Why / alternatives | Used in |
|---|---|---|---|
| Data grids | `@tanstack/react-table` + `@tanstack/react-virtual` | headless, fits shadcn; alt AG Grid (heavy, enterprise licence for advanced) | 13,16,17 |
| Drag & drop | `@dnd-kit/core`, `@dnd-kit/sortable` | accessible, lightweight; alt pragmatic-drag-and-drop | 13,14,16 |
| Flow designer | `@xyflow/react` (React Flow) + `elkjs`/`dagre` | workflow/graph UIs; check licence terms for commercial use | 13.1 |
| State machines (UI+server) | `xstate` v5 | serialisable, testable; alt table-driven transitions | 13.1 |
| Calendar/scheduling | `react-big-calendar` or `@schedule-x/react` (verify features) / custom timeline with dnd-kit | **FullCalendar resource-timeline is a paid premium plugin** (licence), so decide early for OT/roster | OT, roster |
| Rich text / template editor | `@tiptap/react` ; code tab `@monaco-editor/react` (lazy) | variable chips, HTML/CSS editing | 14.2 |
| Signature | `signature_pad` | MIT, mobile-friendly | 14.5 |
| PDF view/edit | `react-pdf`/`pdfjs-dist`; `pdf-lib` (stamp/merge) | preview + seals | 14,16 |
| Barcode scan | native `BarcodeDetector` + `@zxing/browser` fallback | no native app needed | 14.4 |
| Barcode/label gen | `bwip-js` (also backend) | many symbologies, ZPL | 14.4 |
| JSON logic | `json-logic-js` | safe conditions (no eval) | 13,14 |
| Math/formulas | `mathjs` (restricted scope) | form formulas/scores | 14.1 |
| PWA/offline | `vite-plugin-pwa` (Workbox), `dexie` (IndexedDB), `@simplewebauthn/browser` | nurse/doctor mobile | 15.5 |
| On-screen keyboard (kiosk) | `react-simple-keyboard` | optional | 15.3 |
| Virtual lists | `@tanstack/react-virtual` | alerts, tasks, audit logs | all |
| Fuzzy search (client) | `fuse.js` | small local lists only | search |
| Diff view | `diff` / `react-diff-viewer-continued` | approvals, amendments | 13.2 |
| Forms a11y/testing | `@axe-core/playwright`, `eslint-plugin-jsx-a11y` | a11y gate in CI | 19 |
| Storybook | `storybook` (Vite builder) | component catalogue | 19 |

## 3. Recommended additions (backend)
| Need | Library/Tool | Notes |
|---|---|---|
| Rule evaluation | `json-rules-engine` (or in-house jsonlogic) | 13.3 |
| Templates | `handlebars` | 14.2 (no user-defined helpers) |
| HTML→PDF | `playwright`/`puppeteer` in an isolated BullMQ worker | fonts: Noto Sans Devanagari |
| PDF ops | `pdf-lib` | stamp, merge claim bundles |
| Barcode | `bwip-js` | labels/wristbands |
| Fuzzy match (recon) | `fastest-levenshtein` / `fuse.js` | 16.3 |
| CSV parse | `papaparse` (or `csv-parse`) | statements, imports |
| Webauthn | `@simplewebauthn/server` | biometric step-up |
| Device protocols | `mqtt`, `serialport`, `hl7-standard`/`node-hl7-client` (evaluate), custom ASTM framer | 18.2 edge gateway |
| DICOM | Orthanc (service), `dcmjs` | PACS, 03/07 |
| Forecasting | `simple-statistics` (start), Python `statsforecast` microservice (later) | 17.5 |
| OCR/AI | Gemini vision / Google Document AI (existing Google auth) ; `tesseract.js` for offline fallback | 17.5 |
| Metrics/tracing | `prom-client`, OpenTelemetry | infra |
| Idempotency/locks | Redis `SET NX EX`, `redlock` (if multi-node) | payments, queue |
| Validation of GSTIN/IFSC | in-house regex + checksum; optional paid API | 16.6 |

## 4. Do NOT add (conflicts / bloat)
- Another UI kit (MUI/AntD/Chakra) - shadcn/Radix already standard.
- `moment`/`dayjs` - `date-fns` present.
- `react-i18next` right now - custom i18n stub exists; either migrate fully later or keep stub (don't run both).
- `axios` duplicates if project already uses `fetch` wrapper (check `lib/api`).
- Second charting lib unless needed (ECharts only if >50k points/heatmaps beyond recharts).
- Heavy form builders with commercial licence (SurveyJS Creator, Form.io Enterprise) unless licence budgeted.

## 5. Architecture frameworks / patterns
| Concern | Pattern | Notes |
|---|---|---|
| Modularity | **Modular monolith** (domain modules: patient, clinical, diagnostics, pharmacy, revenue, supply, hr, ops, platform) with explicit module APIs; extract services only for hot spots (integration hub, report worker, AI gateway) | repo is monolith + some services: keep boundaries via folder + lint rules (`eslint-plugin-boundaries`) |
| Consistency | **Outbox pattern** (exists: `OutboxEvent`) + idempotent consumers | `order.created -> ChargeItem`, `discharge.finalized -> housekeeping` |
| Sagas | Workflow engine (13.1) orchestrates multi-module flows | discharge, admission |
| Multi-tenancy | `hospitalId/branchId` on every doc + mandatory query scoping helper; compound unique indexes per tenant; tenant-isolation tests | fix `Bed.bedNumber` |
| Auth | RBAC + scope + approvals + step-up; policies in IAM models (exist) | 13.7 |
| Caching | Redis read-through for masters, per-user permission cache, dashboard aggregates | invalidate on events |
| Realtime | socket.io rooms per tenant/queue/user; fallback polling; backpressure | queue, alerts |
| Files | object storage + signed URLs + ClamAV; thumbnails via `sharp` | docs, OCR |
| Jobs | BullMQ queues by priority (`critical`, `default`, `bulk`) + DLQ + dashboards (bull-board) | reports, PDFs, recon |
| API | REST + OpenAPI (exists) ; FHIR facade for interop; GraphQL not needed | |
| Testing | Vitest (unit), supertest+mongodb-memory-server (integration), Playwright (e2e + a11y), k6 (load), contract tests | |
| Observability | pino -> Loki/ELK, OpenTelemetry traces, Prometheus/Grafana, Sentry-style error tracking, audit logs separate | infra folder |
| CI/CD | lint + typecheck + tests + gitleaks (exists) + `npm audit` + SBOM; preview envs; DB migration checks (dry-run) | |
| Feature flags | per-hospital flags (`SystemSetting`) to ship modules incrementally (kiosk, AI, rule engine) | |
| Data migrations | versioned scripts with dry-run + rollback notes (`scripts/`) | Encounter backfill, bed index fix |

## 6. Bundle & performance budget
- Route-level code splitting (`React.lazy`); heavy libs lazy: `monaco`, `pdfjs`, `@xyflow/react`, `tiptap`, `maplibre`.
- Budgets: initial JS < 250KB gz for staff app shell, kiosk bundle < 150KB gz, per-route chunk < 150KB gz.
- Image: `sharp` thumbnails; fonts: self-host Inter/Jakarta/Noto Devanagari (avoid Google Fonts runtime import at `index.css:1` for privacy/offline kiosk).
- Measure: Lighthouse CI, `rollup-plugin-visualizer`, Web Vitals to analytics.

## 7. Security libraries/practices checklist
`helmet`, strict CORS, rate limits (per IP/user/tenant), `express-mongo-sanitize`-style input sanitising (verify existing), schema validation everywhere (zod), CSRF for cookie auth, secure cookies, CSP, dependency scanning, secret rotation, field encryption for ID numbers, signed webhooks, audit on PHI reads.
