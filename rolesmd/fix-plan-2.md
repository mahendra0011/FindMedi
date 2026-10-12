# FindMedi — Round-2 Execution Plan (Bache hue ~40% kaam)

> **Kis ke liye:** Executing agent (antigrivity) ke liye. Round-1 plan (`fix-plan.md`) ke
> baad ka **remaining-work plan** — jo tasks abhi pending hain, unke exact file, exact
> change, exact acceptance criteria.
> **Status date:** 12 Oct 2026 — sab items repo scan se verify kiye gaye hain.
> Line numbers approximate hain — hamesha grep se locate karo.

---

## 0. Context — Round-1 me kya ho chuka (YE DOBARA MAT KARNA)

Round-1 ke P0-1/P0-2/P0-3/P1-1/P1-2/P1-3/P4 **verify karke done mark kiye gaye hain**:

| Kaam | Evidence |
|---|---|
| Specialty lists unified | `frontend/src/data/specialties.ts` (44 canonical), `hooks/useCategories.js`, `data/specialtyVisuals.ts`; `'Psychology'` chip hataya |
| Test categories ek tree | `AllTests.tsx` + `AdminTestCatalog.tsx` → `api.getPublicCategories({type:'test'})`; `backend/scripts/seed-test-categories.mjs` + `migrate-test-categories.mjs` |
| Home live counts | `Home.tsx:185` → `api.getSpecialtyCounts()` |
| **Backend** search facets | `routes/facilities.js:68-123` — `ownership, scheme, system, subType, accreditation, emergency24x7, homeVisit, wheelchair, verified, specialty, openNow` sab query params chalu; `routes/hospitals.js:34-78` me `ownership, scheme, accreditation` |
| Enum expansions | `Billing.source`(15) + `paymentMethod`(11), `Emergency.emergencyType`, `InsurancePolicy.policyType`, `DietOrder.dietaryPreference`(veg/jain/...), `BloodBank.ttiScreen`, pharmacy checkout `rxSchedule` gate (`pharmacy.js:1392`) |
| Languages/concerns | `frontend/src/data/optionLists.ts` — 22 languages + 41 concerns |
| Second-opinion patient UI | `pages/patient/SecondOpinion.tsx` + route `/patient/second-opinion` + api methods (`api.js` — dhyan do: methods `api` object me hain, `radApi` me NAHI) |
| Provider catalog fields | `providerTypeCatalog.js:76-78,93` me `sub_type/ownership/system_of_medicine/schemes_accepted` fields defined; `validate.js:2253` options cap 100 (Round-1 me 50→100 fix hua — 63 subtypes the) |
| Facility model taxonomy | `Facility.js` me `FACILITY_SUBTYPES`(63), `FACILITY_OWNERSHIP`, `SYSTEMS_OF_MEDICINE`, `FACILITY_SCHEMES` sab exported |
| Docs sync | `subcatogary.md` status column updated; `MIGRATIONS.md` entries |

**Health gates (12 Oct 2026 par):**
- Backend: `npm test` → 248/248 suites, 2614 pass ✅
- Frontend: `npm test` → 117/117 pass ✅
- Backend lint: 12 errors — sab pre-existing (aiGateway, astm, iamEvaluator, tokens.js logger, emergency.js admissionId, Prescription/VitalsLog/auth.js dupe keys, clinicalScoresService, Billing.js admissionId dupe line 20+75). **Inhe tabhi mat fix karna jab task ho — unrelated churn se bacho.**
- Frontend `npm run typecheck`: ~12k pre-existing errors (project kabhi green nahi hua). **DoD me typecheck-green mat maango** — sirf ensure karo ki TUMHARE naye/edited files me naye TS errors na aayein (second-opinion methods `api` me rakhna yaad rahe).

**Rules (Round-1 wale hi — sab par laagu):**
- R1 Enums additive-only; R2 DB Category tree = single source; R3 stable `code` mutable `name`;
  R4 backend alias-normalize; R5 migrations `.mjs` + `MIGRATIONS.md`; R6 vocab tests sync;
  R7 T1 par PHI controls / T3 par patient medical data mat dikhao; R8 comment style `// subcatogary.md <Part> — <kya>`.

---

## 1. TASK LIST

> Format: **Goal → Files → Exact changes → Acceptance → Verify**

---

### T1 · Facility search facets — FRONTEND filter UI (Round-1 P0-4 ka bacha hua half)

**Why:** Backend sab filters chalu kar chuka hai (`facilities.js:68-123`, `hospitals.js:34-78`) par koi public page in params ko bhejta hi nahi. Patient "Government hospital" / "Ayushman accepted" / "Open now" nahi khoj sakta. Ye Doc-B4 ka core tha.

**Files:**
| File | Current state (verify) |
|---|---|
| `frontend/src/pages/HospitalDirectory.tsx` | `api.getHospitals(params)` sirf `status/search/city/specialty` bhejta hai (line ~115-119). Client-side filters hain (`filterHospitalType` from `?type=government|private` — line 63-68) par ye `hospitalType` string match karte hain, `ownership` field par nahi. |
| `frontend/src/pages/ClinicDoctors.tsx` | doctors list — `api.getDoctors(params)` (line ~139). Filters: search + specFilter only. |
| `frontend/src/pages/Doctors.tsx` | same pattern. |
| `frontend/src/pages/superadmin/AllFacilities.tsx` | superadmin list — low priority, skip unless time. |
| `backend/src/routes/doctors.js` | **GAP:** `gender`, `language`, `homeVisit` query params ABHI NAHI hain (grep `req.query.gender` → 0). |
| `frontend/src/components/HospitalCard.tsx` | badge dikhane ke liye — ownership/schemes badges add karne hain. |

**Exact changes:**

1. **`HospitalDirectory.tsx` — advanced filters panel me 5 naye controls** (state names follow existing `filter*` convention):
   ```
   filterOwnership: 'all' | 'government' | 'private' | 'trust_charitable' | 'corporate_chain' | 'cooperative' | 'ppp' | 'military_railway_esi'
   filterSchemes: string[]   // chips: pmjay, cghs, esi, echs, state_scheme, insurance_cashless, tpa_empanelled
   filterOpenNow: boolean
   filterSystem: 'all' | 'allopathy' | 'ayurveda' | 'homeopathy' | ...
   filterSubType: string[]   // optional chips: phc, chc, uphc, arogya_mandir, nursing_home, ...
   ```
   - `loadHospitals()` me `api.getHospitals(params)` ke params me add karo (sirf non-default values):
     `ownership`, `scheme` (pehli value ya comma-join — backend `$in` leta hai, verify: `hospitals.js:71` `$in` pattern), `openNow=true`, `system`, `subType`.
   - **URL sync:** `useSearchParams` ke through `?ownership=government&scheme=pmjay&openNow=1` read/write karo (catalogue `subs[].route` already `?category=` style use karta hai — wahi pattern). `setSearchParams(..., { replace: true })`.
   - **Purane client-side filters ko OWNERSHIP par map karo:** `filterHospitalType` me `'Government'` select karne par `ownership=government` param bhejo (line 63-68 wala logic — `hospitalType` regex `includes('government')` se replace/backup ke roop me dono chalao, taaki purane seed rows jinke `hospitalType` me likha hai par `ownership` empty hai wo bhi dikhein: `$or: [{ ownership: 'government' }, { hospitalType: /government/i }]` — **backend me** `hospitals.js` ownership filter ko is dual-pattern me badlo, existing rows orphan nahi hone chahiye).
2. **`ClinicDoctors.tsx` + `Doctors.tsx` — doctor filters:**
   - Gender chips: All/Male/Female (`Doctor.gender` field already hai — verify grep `gender` in `models/Doctor.js`).
   - Language multiselect (options: `optionLists.ts` `LANGUAGES`).
   - "Home visit" toggle.
   - Ye params `api.getDoctors(...)` me bhejo **jab backend support kare** — isliye pehle:
3. **`backend/src/routes/doctors.js` — 3 naye query params (additive):**
   ```
   gender= male|female          → filter.gender exact
   language= Hindi              → filter.languages $in (regex i, escapeRegex)
   homeVisit=true               → filter.appointmentModes $in ['home_visit','home'] (SERVICE_MODES pattern — lib/appointmentModes.js)
   ```
   Existing `specialty` param hai hi — verify karo wo `resolveSpecialtyCode`/`specialtyCondition` se guzarta hai (`doctors.js:~109`), warna add karo.
4. **`HospitalCard.tsx` — badges:** `ownership === 'government'` → "Government" badge (blue); `schemesAccepted` me `pmjay` → "Ayushman PM-JAY" badge (green); `subType === 'jan_aushadhi_kendra'` → "Jan Aushadhi" badge. Data `getHospitals` response me already hai (facilities/hospitals documents) — verify karo list route `schemesAccepted` select karta hai (agar `.select()` se field chhup raha ho to wahan add karo).
5. **Sort param (agar nahi hai):** `hospitals.js` list me `sort=nearest|rating|name` — nearest ke liye `$geoNear` (pattern: `emergencySOS.js:425`).

**Acceptance:**
- [ ] `GET /api/hospitals?type=hospital&ownership=government&scheme=pmjay` seed data par sirf matching rows
- [ ] HospitalDirectory me "Government" chip → URL `?ownership=government` → reload par filter bana rehta hai
- [ ] "Open now" toggle sirf currently-open facilities dikhaye (workingHours parse — backend `facilities.js:123` pattern reuse)
- [ ] `GET /api/doctors?gender=female&language=Tamil&homeVisit=true` works
- [ ] Bina params wale purane calls unchanged (additive)

**Verify:** backend me naya integration spec `test/integration/facilityFacets.spec.js` (pattern: `categoriesPublic.spec.js`); frontend `npm test`.

---

### T2 · Join → Provider me taxonomy fields ka mapping (Round-1 P0-5 ka bacha hua half)

**Why:** JoinWizard config se `sub_type/ownership/system_of_medicine/schemes_accepted` **render aur autosave dono** kar chuka hai (`JoinWizard.tsx:511` → `PATCH /join/:id` → `draft.stepData`). Par approval hone par `mapApplicationToProvider` ye 4 fields **map hi nahi karta** → Provider document par kabhi nahi aate. Aur `Provider` model me `subType` hai hi nahi.

**Files:**
| File | Current state |
|---|---|
| `backend/src/lib/providerTypeCatalog.js:76-78,93,128` | facility steps me 4 fields defined ✅ |
| `backend/src/lib/applicationToProvider.js` | `flattenStepData` + `pick/pickList` — NAME/TAGLINE/ADDRESS/LANGUAGES/AMENITIES map hota hain; **sub_type/ownership/system_of_medicine/schemes_accepted NAHI** |
| `backend/src/models/Provider.js:34-37` | `systemOfMedicine`, `ownership`, `schemesAccepted[]` hain; **`subType` MISSING** |
| `backend/src/routes/providers.js:26,36-37` | SELECT/allowed fields me ownership/schemesAccepted hain |
| `backend/scripts/seed-provider-type-configs.mjs` | config DB me hai — re-run chahiye taaki koi config edit ho to wo reflect ho |

**Exact changes:**

1. **`Provider.js` me `subType` add karo** (additive):
   ```js
   // subcatogary.md §1.1 — facility sub-type (Provider counterpart of Facility.subType)
   subType: { type: String, trim: true, maxlength: 80, default: '' },
   ```
2. **`applicationToProvider.js` — 4 naye pick blocks** (naya code comment `// subcatogary.md P0-5 — taxonomy fields from wizard draft`):
   ```js
   const SUB_TYPE_KEYS = ['sub_type', 'subType'];
   const OWNERSHIP_KEYS = ['ownership'];
   const SYSTEM_KEYS = ['system_of_medicine', 'systemOfMedicine'];
   const SCHEME_KEYS = ['schemes_accepted', 'schemesAccepted'];
   // mapApplicationToProvider return object me:
   subType: pick(leaves, SUB_TYPE_KEYS).toLowerCase(),
   ownership: pick(leaves, OWNERSHIP_KEYS).toLowerCase(),
   systemOfMedicine: pick(leaves, SYSTEM_KEYS).toLowerCase(),
   schemesAccepted: pickList(leaves, SCHEME_KEYS).map(s => String(s).toLowerCase()),
   ```
   **Enum guard:** values ko `Facility.js` ke exported vocab se filter karo (`FACILITY_SUBTYPES`, `FACILITY_OWNERSHIP`, `SYSTEMS_OF_MEDICINE`, `FACILITY_SCHEMES`) — unknown value par `''`/drop, warna DB enum validation create par fail ho jayegi.
3. **`providers.js` allowedFields/update path** me `subType` add karo (line ~36-37 wale list me).
4. **`validate.js`** — agar Provider create/update ka zod schema hai (grep `createProviderSchema` line ~2200) to wahan bhi `subType/ownership/systemOfMedicine/schemesAccepted` optional fields add karo.
5. **Config seed re-run:** `backend/scripts/seed-provider-type-configs.mjs` chalao (idempotent hona chahiye — verify header comment), warna purane DB config me naye fields nahi dikhenge. `MIGRATIONS.md` me note karo.
6. **Read side:** `providers.js` list route ke filter me already `ownership`/`systemOfMedicine` allowed hain (line 26 SELECT me hai) — `subType` filter bhi add karo (`?subType=` → exact match).
7. **Legacy `JoinPlatform.tsx` (route `/join-platform`) — SCOPE CALL:** ye old form hai (`/join/new` = JoinWizard = future). **Sirf ek chhota fix:** JoinPlatform ke hospital/facility submit path me (jo `platform.js`/`facilities.js` ko POST karta hai — grep `api.post('/facilities'` ya similar) `ownership` + `schemesAccepted` optional body se pass karo agar already nahi. Baaki sab JoinWizard me. Agar JoinPlatform ka facility-create path alag schema maangta ho to skip — comment chhod do.

**Acceptance:**
- [ ] JoinWizard se hospital apply → admin approve → Provider document par `subType/ownership/systemOfMedicine/schemesAccepted` populated
- [ ] `GET /api/providers?ownership=government` aur `?subType=phc` filter karte hain
- [ ] Unknown/garbage draft values par Provider create fail nahi (guard ne drop kiya)
- [ ] `npm test` green (join + adminApplications specs)

**Verify:** unit spec `test/unit/applicationToProvider.spec.js` (naya — flattenStepData se 4 fields round-trip); existing `adminApplications` integration spec green.

---

### T3 · Chhote P1 leftovers (frontend + doctors filters)

> Ye sab 15-min wale fixes hain — pehle kar lo, taaki diff chhota rahe.

| # | Kya | Files | Change |
|---|---|---|---|
| T3a | 3 pages me hardcoded `LANGUAGES` arrays | `ClinicDoctors.tsx:34` (16 langs), `HospitalDoctors.tsx:28` (9), `FindLawyer.tsx:108` (9) | `import { LANGUAGES } from '@/data/optionLists'` — display chips waise hi rahenge (`.slice(0,8)` chalega) |
| T3b | Billing payment-method dropdown purana | `Billing.tsx:141` — `['Cash','Card','UPI','Cheque','Insurance','Online','Other']` | `+ 'Wallet','NetBanking','EMI','Govt Scheme'` (model enum already updated Round-1 me) |
| T3c | Billing source dropdown | grep `source` in `Billing.tsx`, `ClinicBilling.tsx` — jo bhi hardcoded source list hai, `+ ambulance, blood_bank, home_service, equipment_rental, membership, event` | additive |
| T3d | Emergency type UI | `pages/admin/AdminEmergency.tsx` — agar form hai to `emergencyType` select add karo (options: `Emergency.js:13` wala enum); list par badge | additive |
| T3e | Insurance policy type UI | `Insurance.tsx`/`TpaDesk.tsx` (grep files) — `policyType` select (options: `InsurancePolicy.js:25` enum) | additive |
| T3f | Diet preference UI | diet order form page (grep `DietOrder` in `frontend/src/pages`) — `dietaryPreference` select (veg/non_veg/eggetarian/vegan/jain/halal) | additive |

**Acceptance:** grep se confirm — koi bhi page abhi bhi purana 7-method payment list ya 11-lang list use nahi karta (fallback files chhod kar).

---

### T4 · Stub dashboards → real features (Round-1 P2-1)

**Problem:** Ye 7 dashboards **thin wrappers** hain (`~1.5KB`), hardcoded KPIs (`{ label: 'Rating', value: '4.5 ★' }` jaise literals), khud comment me "stub" likha hai.

**Backend routes ALREADY exist** (verify before writing anything new):
`routes/events.js`, `routes/rentals.js`, `routes/diet.js`, `routes/memberships.js`, `routes/physio.js`, `routes/dental.js` — **pehle grep karo ki inke kaunse endpoints kya karte hain, naya route mat likho agar existing kaam karta hai.**

| Dashboard | File | KPIs (real) | Backend endpoints (grep to confirm) | CRUD core entity |
|---|---|---|---|---|
| EventOrganizer | `dashboards/EventOrganizerDashboard.tsx` | upcoming events, pending registrations, revenue, cancelled | `events.js` — list/mine/stats | create/edit event + approve/decline registration |
| EquipmentVendor | `dashboards/EquipmentVendorDashboard.tsx` | units out on rent, available, month earnings, overdue returns | `rentals.js` — catalog/rentals/stats | unit CRUD + rental approve/return |
| Dietitian | `dashboards/DietitianDashboard.tsx` | active plans, follow-ups today, earnings, rating | `diet.js` — plans/clients/stats | plan create + follow-up log |
| Gym | `dashboards/GymDashboard.tsx` | active members, expiring, attendance today, earnings | `memberships.js` — mine/expiring/attendance | membership add + check-in |
| YogaStudio | `dashboards/YogaStudioDashboard.tsx` | batch strength, sessions today, bookings | `memberships.js` reuse ya `providerServices.js` | batch/session CRUD |
| Physio | `dashboards/PhysioDashboard.tsx` | sessions today, active care plans, progress logs | `physio.js` — sessions/plans | session schedule + plan CRUD |
| Dentist | `dashboards/DentistDashboard.tsx` | today's appts, treatment plans, pending X-rays | `dental.js` — appointments/plans | plan create + appt manage |

**Pattern (har dashboard ke liye same):**
1. `api.get('/<module>/...')` se KPIs — loading/error states; **hardcoded `value:` literals hatao**.
2. List + ek core create/update form (modal ya tab — `RoleDashboardShell` ka `domainModules[].ctaHref` existing pages pe le jata hai; agar shell me hi embed karna ho to `RoleDashboardShell.tsx` me `children` slot verify karo).
3. Authz: existing route ka `authorize(...)` unchanged; dashboard sirf wahi role (`RoleRoute` App.tsx me already configured).
4. **T3 rule:** gym/yoga/equipment par patient ka medical data mat dikhao.

**Order:** EventOrganizer → EquipmentVendor → Dietitian → Gym → YogaStudio → Physio → Dentist.
Har dashboard ke baad `grep -n "value: '" frontend/src/pages/dashboards/<Name>.tsx` → 0 (KPI literals), `grep -n "stub"` → 0.

**Acceptance (per dashboard):** 4 KPIs API se; ek CRUD flow E2E chale; lint + vitest green.

---

### T5 · `healthcareCatalogue.ts` ke 7 `soon: true` items (Round-1 P2-2)

Abhi bhi 7 items `soon: true` hain (lines ~480, 760, 798, 859, 934, 1009, 1163). Har item: **ya real destination banao, ya `soon` hatao + route do.** Dead-link mat dikhao.

| # | Item id | Minimal deliverable | Exact steps |
|---|---|---|---|
| T5a | `blood-bank` | Patient-facing blood donor/requirement surface | Current: `/bloodbank` route **staff-only** hai (`App.tsx:1081` — roles `hospital_admin/doctor/nurse/blood_bank_admin`). Options (pick one): **(A)** Public read-only page `pages/BloodDonors.tsx` — blood需求 request form (group, city, date) + donor list (naam/group/city sirf, koi medical record nahi — R7) + `api.createBloodRequest`/`getBloodRequests` reuse (`BloodBank.tsx:9-18` me wrappers hain). Route `/blood-donors` public/patient. **(B)** Agar time kam ho: catalogue item ka `route` `/hospitals?emergency=1` rakh ke `soon` hatao (line 495 wala fallback) — minimum honesty. |
| T5b | `home-visit-doctor` | T1 ka `homeVisit` filter hi destination hai | Catalogue route → `/doctors?homeVisit=1`; `soon` hatao; T1 ke doctors.js `homeVisit` param ke baad hi ye task close hoga. Badge "Home visit available" doctor card par (`DoctorCard.tsx`). |
| T5c | `home-physio` | Same | Route → `/physio?homeVisit=1` — **dhyan do:** `/physio` abhi staff-only hai (`App.tsx:1082`). Patient-facing physio listing chahiye: ya `/physio` ko patient role allow karo (read-only listing + book request) ya naya `pages/PhysioAtHome.tsx` jo `api.getProviders({ group:'rehab', ... })` ya `physio.js` public endpoints use kare (grep physio.js public GET). |
| T5d | `vaccination` | Patient vaccination tracker (read-only phase 1) | Backend: grep `routes/vaccinations.js` (exists — verify patient-scoped GETs; agar sirf clinic-side hai to patient GET add karo: `my child's/own vaccination records` — `Record.type` me vaccination type Round-1 me add hua tha, reuse). Page `pages/patient/VaccinationTracker.tsx`: list + next-due highlight. Route `/patient/vaccinations` + `RoleRoute ['patient']`. |
| T5e | `obesity-nutrition` | Dietitian search + diet programs | Route → `/dietitian` (nayi chhoti listing page) — `api.getProviders({ type: 'dietitian' })` (T2 ke baad type filter chalega) fallback: `api.getDoctors({ specialty: 'Endocrinology' })` + DietKitchen packages. Cards par specialty/fee — medical data nahi (R7). |
| T5f | `child-development` | subType listing | T1 ke `subType` filter se: route → `/hospitals?subType=child_development_centre`; content cards (milestones info static); `soon` hatao. |
| T5g | `palliative` | subType listing + helpline | Route → `/hospitals?subType=hospice_palliative` + T7 ka Helplines page link (14416 Tele-MANAS). `soon` hatao. |

**Acceptance:** `grep -c "soon: true" frontend/src/data/healthcareCatalogue.ts` → **0**; har route App.tsx me registered; catalogue click → page load hota hai.

---

### T6 · Search/UX hardening (Round-1 P2-3)

| # | Task | Detail |
|---|---|---|
| T6a | **Hindi aliases (taxonomy)** | `backend/src/lib/taxonomy.js` — 44 specialties me `hi: []` field add karo ( additive — structure dekho, agar object array hai to `hiAliases` property). Examples: Cardiology→हृदय रोग/दिल का डॉक्टर, Orthopaedics→हड्डी रोग/अस्थि रोग, Paediatrics→बाल रोग/बच्चा डॉक्टर, ENT→कान नाक गला, Ophthalmology→आंख/नेत्र, Dermatology→त्वचा रोग, Dental→दांत, Gastroenterology→पेट/जठरांत्र, Pulmonology→फेफड़ा/सांस, Neurology→मस्तिष्क/नस. `resolveSpecialtyCode` ko hindi input par bhi resolve karna chahiye (alias map me hindi keys add). Test: `taxonomy.spec.js` me hindi case. |
| T6b | **`nameHi` search** | `Category.js` text index me `nameHi` add (agar index migrate karna ho to migration script; warna `$or` regex match fallback). Public categories route me `q` param se `nameHi` match. |
| T6c | **adClaimsGuard** | Naya `backend/src/lib/adClaimsGuard.js`: `BANNED_CLAIM_PATTERNS = [/cure[d]? (for|of)?/i, /guaranteed/i, /100\s?%/i, /permanent(ly)? (cure|relief)/i, /weight loss (fast|inver)/i, ...]` + `scanAdClaims(text): string[]` (matched patterns return). Wire-in points (validate, not block-by-default — **moderation queue**): `providers.js` create/update, `providerServices.js` create/update, `featuredListings.js` (grep file) — restricted category (Category.adClaimsRestricted true) ke listing me match → 400 `{ message, code: 'AD_CLAIM', matched }` ya `ModerationItem` create (model exists — grep). Unit spec `test/unit/adClaimsGuard.spec.js`. |
| T6d | **a11y pass (sirf 3 pages)** | `Home.tsx`, `AllTests.tsx`, `HospitalDirectory.tsx`: icon-only buttons par `aria-label`, filter chips par `role="group"`+`aria-pressed`, page `<h1>` ensure, focus-visible ring (Tailwind `focus-visible:ring`). axe-core already node_modules me hai — manual audit chalega, CI gate nahi. |
| T6e | **i18n: mr/bn/ta/te** | `frontend/src/i18n/locales/` me sirf `en.json`/`hi.json`. `en.json` ke **top 100 high-traffic keys** (nav, home CTAs, auth, catalogue headings) ke liye `mr.json`, `bn.json`, `ta.json`, `te.json` banao. `i18n.ts` me locales register (grep `resources` wiring). Full coverage nahi — sirf seed keys. |

**Acceptance:** T6a: `resolveSpecialtyCode('हड्डी रोग')` → `SPEC.ORTHO`; T6c: restricted category listing me "guaranteed cure" → 400/ModerationItem; T6e: locale switch par nav labels badlein.

---

### T7 · Naye category surfaces (Round-1 P3)

| # | Kya | Detail |
|---|---|---|
| T7a | **Helplines page** | Naya `frontend/src/pages/Helplines.tsx` — static data file `frontend/src/data/helplines.ts` me: **112** (All-in-One), **108** (Ambulance, state-wise list jo available ho), **102** (Women & Child), **14416** (Tele-MANAS mental health), **181** (Women helpline), **1098** (Childline), **106** (Poison), **1091** (Women), + state police/health numbers jo datafile me ho. Card per number + `tel:` button + description. Route `/helplines` public (App.tsx me lazy import). Catalogue entry `healthcareCatalogue.ts:499` ka `route: 'tel:112'` → `'/helplines'` (subs `tel:` links wahi rakh sakte hain). |
| T7b | **PHC/CHC/UPHC/Arogya Mandir listing** | T1 ka `ownership=government` + `subType=phc|chc|uphc|arogya_mandir` filter hi cover karega. **Sirf verify + seed:** `backend/mock-data/` (grep `facilities.json`/`hospitals.json`) me kam se kam 2-3 govt primary-centre sample rows `ownership:'government'` + `subType` ke saath add karo (ya seed script). |
| T7c | **PM-JAY badge** | T1 ka scheme filter + `HospitalProfile.tsx` detail page par "Ayushman PM-JAY accepted" badge (facility `schemesAccepted`/hospital `insuranceAccepted` me `pmjay` regex match). |
| T7d | **AYUSH docs checklist** | `providerTypeCatalog.js` — `ayush_clinic` + `ayush_practitioner` ke `rq()` docs me verify: **AYUSH council registration certificate** hai? (grep `rq(` near ayush typeKey). Agar nahi to add karo `DOCUMENT_TYPES` me bhi (`providerTypes.js`). |
| T7e | **Dietitian public listing** | T5e ke saath hi cover — skip alag se. |
| T7f | **Equipment rent/sale store (patient side)** | Naya `pages/EquipmentStore.tsx` — `api.get('/rentals/catalog'` (grep rentals.js public GETs; agar auth-locked hain to patient-scoped read add karo with items only, no deposits internals). Cards: item, ₹/day, availability. Route `/equipment-store`. Catalogue me equipment entry ka route update (grep `equipment` in healthcareCatalogue). |
| T7g | **Home sample collection verify** | E2E flow check: AllTests page → homeCollection toggle → LabBooking (`providerType=phlebotomist`) — sirf manual verify + gap fix (agar booking form me provider type nahi bhejta to wahi ek-line fix). |

---

## 2. Sprint grouping

| Sprint | Tasks | Character |
|---|---|---|
| **R2-S1** | T3 (sare chhote fixes) + T2 (join mapping) | quick wins + backend mapping |
| **R2-S2** | T1 (facets frontend + doctors params + integration spec) | full-stack, sabse zyada user value |
| **R2-S3** | T5a-T5g (soon items — T1/T2 ke baad) + T7a/T7c (helplines page + PM-JAY badge) | frontend |
| **R2-S4** | T4 dashboards: EventOrganizer + EquipmentVendor + Dietitian | full-stack |
| **R2-S5** | T4 dashboards: Gym + YogaStudio + Physio + Dentist | full-stack |
| **R2-S6** | T6 (adClaims, hindi, a11y, i18n) + T7 b/d/f/g + P4 doc sync | hardening |

Har sprint ke end par:
```bash
cd backend && npm run lint && npm test
cd frontend && npm run lint && npm test   # typecheck kabhi green nahi tha — sirf naye files me TS errors check karo
```

---

## 3. Global Definition of Done

- [ ] `grep -c "soon: true" frontend/src/data/healthcareCatalogue.ts` → 0
- [ ] `grep -rn "value: '" frontend/src/pages/dashboards/{Gym,YogaStudio,Dietitian,EquipmentVendor,EventOrganizer,Dentist,Physio}Dashboard.tsx` → 0 stub KPI literals
- [ ] JoinWizard (hospital type) → approve → Provider par 4 taxonomy fields populated
- [ ] HospitalDirectory: government + PM-JAY + open-now filters URL-sync ke saath kaam karte hain
- [ ] Backend tests green + naye specs (facilityFacets, applicationToProvider, adClaimsGuard) green
- [ ] Koi naya hardcoded specialty/language/list fallback file ke bahar nahi
- [ ] Enums additive-only; migrations `MIGRATIONS.md` me
- [ ] Doc sync: `subcatogary.md` status column + ye plan file ke checkboxes update

---

## 4. File index (quick reference)

| Kaam | File |
|---|---|
| Backend facet filters (already done) | `backend/src/routes/facilities.js:68-123`, `hospitals.js:34-78` |
| Doctors route (extend) | `backend/src/routes/doctors.js` |
| Join application → Provider mapping | `backend/src/lib/applicationToProvider.js` |
| Provider model | `backend/src/models/Provider.js` |
| Provider type configs (fields source) | `backend/src/lib/providerTypeCatalog.js` |
| Facility vocab (enums source of truth) | `backend/src/models/Facility.js` (`FACILITY_SUBTYPES` etc.) |
| Canonical specialties + (add) hindi aliases | `backend/src/lib/taxonomy.js` |
| Frontend canonical lists | `frontend/src/data/specialties.ts`, `optionLists.ts`, `specialtyVisuals.ts` |
| Catalogue (soon flags) | `frontend/src/data/healthcareCatalogue.ts` |
| Facets UI target | `frontend/src/pages/HospitalDirectory.tsx`, `ClinicDoctors.tsx`, `Doctors.tsx` |
| Join wizard | `frontend/src/pages/join/JoinWizard.tsx` (legacy: `JoinPlatform.tsx` — scope me sirf T2.7) |
| Stub dashboards | `frontend/src/pages/dashboards/*.tsx` |
| Backend modules for dashboards | `routes/events.js`, `rentals.js`, `diet.js`, `memberships.js`, `physio.js`, `dental.js` |
| API client (methods `api` object me — `radApi` me NAHI) | `frontend/src/lib/api.js` |
| Frontend routes | `frontend/src/App.tsx` |
| Vocab sync tests | `backend/test/unit/validateVocab.spec.js`, `taxonomy.spec.js` |
| Existing migrations | `backend/scripts/migrate-*.mjs`, `seed-*.mjs`, `MIGRATIONS.md` |
