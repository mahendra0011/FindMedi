# FindMedi / MediCore: Advanced HMS Roadmap (Index)

Ye folder FindMedi repo (`mahendra0011/FindMedi`) ko clone karke code padhne ke baad bana hai.
Goal: ek **complete, real-world Hospital Management System** jisme har department, flow aur role ho.

## Files kaise padhni hain

| # | File | Kya hai |
|---|------|---------|
| 01 | `01-current-state-audit.md` | Abhi repo me kya hai, hospital dashboard ka audit, verified bugs/gaps |
| 02 | `02-hospital-admin-dashboard-v2.md` | Hospital admin dashboard ka naya design (widgets, APIs, KPIs) |
| 03 | `03-end-to-end-flows.md` | OPD, IPD, ER, OT, Lab, Radiology, Pharmacy, Billing ke real-world flows + jahan link tootta hai |
| 04 | `04-missing-clinical-modules.md` | Clinical side ke missing modules |
| 05 | `05-missing-frontoffice-billing-finance.md` | Reception, billing, TPA, accounts ke missing modules |
| 06 | `06-missing-hr-ops-inventory.md` | HR, roster, inventory, facility, biomedical waste, mortuary etc. |
| 07 | `07-compliance-interop-security.md` | ABDM/ABHA, NABH, FHIR, DPDP, MLC, drug registers, audit |
| 08 | `08-roles-permissions-matrix.md` | Role list aur kaun kya kar sakta hai |
| 09 | `09-data-models-and-api-spec.md` | Naye Mongoose models, fields, endpoints |
| 10 | `10-roadmap-and-checklist.md` | Phase-wise plan, priority, acceptance criteria, testing |
| 11 | `11-hospital-doctor-dashboard.md` | Hospital doctor dashboard audit + v2 spec + EMR workspace |
| 12 | `12-clinic-doctor-and-clinic-dashboard.md` | Clinic doctor / clinic dashboard audit + clinic-as-business model + v2 spec |
| 13 | `13-platform-foundation-engines.md` | NEW: workflow engine, approval engine, rule/alert engine, work tasks, global search, org hierarchy, access extras, patient flags |
| 14 | `14-forms-templates-printing-signature.md` | NEW: form builder, print/template builder, notification variables, wristband/barcode scan, e-signature |
| 15 | `15-queue-kiosk-movement-mobile.md` | NEW: unified queue engine, TV display, kiosk, ADT/patient movement, nurse/doctor PWA |
| 16 | `16-rcm-gateway-bank-corporate-contracts-vendor.md` | NEW: RCM, payment gateway layer, bank reconciliation, corporate billing, contracts, vendors |
| 17 | `17-mis-report-studio-kpi-ai.md` | NEW: report catalogue/studio, KPI formulas, analytics pipeline, AI assist |
| 18 | `18-callcenter-integration-hub.md` | NEW: call center, device/integration hub, outbound webhooks |
| 19 | `19-ui-design-system-and-motion.md` | UI system, components, motion/animation rules for all modules |
| 20 | `20-library-and-framework-stack.md` | existing vs recommended libraries, architecture patterns |
| 21 | `21-coverage-matrix-blueprint-vs-repo.md` | 102-section blueprint vs repo vs files (kya already tha, kya naya) |
| 22 | `22-implementation-status-report.md` | **Repo vs md files: kya implement hua / adhura / baki** (latest commit audit) |
| 23 | `23-remaining-work-checklist.md` | **Jo baki hai uski prioritized checklist** (P0/P1/P2) |

## Verification levels (har item pe ye tag hai)

- **[VERIFIED-EXISTS]**: code me file/route/model dekha.
- **[VERIFIED-GAP]**: specific file padhkar ya grep karke confirm kiya ki nahi hai.
- **[VERIFY]**: grep me shaayad hit mila par shallow ho sakta hai. App chalake confirm karo.
- **[NEW]**: real hospital me hota hai, repo me nahi hai, add karna hai.

## Important limitation

Maine code padha aur grep kiya, **app run nahi ki** (DB, env, seed ke bina). Isliye UI ka actual look/behaviour
(`[VERIFY]` wale items) tumhe `npm run dev` karke ek baar click-through se confirm karna hoga.

## Quick summary (30 second version)

1. Repo me features bahut hain (150+ models, 100+ routes), problem **modules ke beech ke connected flow** me hai.
2. Hospital dashboard me stats/ops strip hai, par **money (dues, collection, split), clinical alerts, bed occupancy %, queue, stock alerts** missing hain.
3. Sabse bade flow gaps: **Discharge → Final bill**, **Prescription → Lab/Pharmacy auto-order**, **Receptionist role**, **real payment gateway**.
4. Naye modules jo real HMS me hote hain: Front-desk, Queue display, Ward round, Bed transfer + tariff, IPD deposit, Consent forms, Discharge workflow, CSSD, Mortuary, Visitor mgmt, Duty roster, Accounts, TPA desk, ABDM, MLC, Biomedical waste, Incident reporting.
