# FindMedi — Category Taxonomy Fix Plan (Execution Document)

> **Kis ke liye:** Ye document ek executing agent (antigrivity) ke liye hai.
> **Kya hai:** Repo audit (`subcatogary.md` + master catalogue ka verification) ke baad
> ka **actionable fix plan** — har task me exact file, exact change, acceptance criteria.
> **Scope check date:** 12 Oct 2026 — status repo scan se verify kiya gaya hai (static read,
> app run nahi hui). Line numbers approximate hain — hamesha grep karke locate karo.

---

## 0. Padhne ka tarika + global rules

**Pehle ye padho (context ke liye):**
1. `rolesmd/subcatogary.md` — Part A (bugs), Part B (taxonomy principles), Part C (categories), Part D (migration)
2. Ye file (fix-plan.md) — ky karna hai

**Rules — HAR change par laagu:**

| # | Rule |
|---|---|
| R1 | **Enums additive-only.** Purani values kabhi mat hato (stored documents validate fail ho jayenge). Naye values end me add karo. Jaise `Facility.js:36` me `''` (not-specified) rakha hai — optional enum convention follow karo. |
| R2 | **Single source of truth = DB `Category` tree.** Frontend hardcoded arrays sirf `API fail → fallback` ho sakte hain, primary nahi. |
| R3 | **Stable `code`, mutable `name`.** Entity ko code se link karo (`SPEC.CARDIO`), naam/alias badal sakte hain. |
| R4 | **Backend me aliases se normalize karo** (`backend/src/lib/taxonomy.js` already provides `resolveSpecialtyCode`, `specialtyCondition`). Free-text kabhi directly compare mat karo. |
| R5 | **Migration scripts** `backend/scripts/` me `.mjs` banao, `npm run` script register karo, `backend/scripts/MIGRATIONS.md` me entry likho. Purane rows par fail-soft chalao (jaise `Medicine.js` pre-save try/catch pattern). |
| R6 | **Har enum/list change par test:** `backend/test/unit/validateVocab.spec.js` (model↔validate sync) aur `taxonomy.spec.js` update karo. |
| R7 | **T1 categories par PHI controls** mat hilao; T3 (gym/store) ko patient medical data mat dikhao. |
| R8 | **Naya code comment do** `// subcatogary.md <Part> — <kya>` style me (repo convention hai — dekho `Facility.js:6`, `Medicine.js:3`, `Radiology.js:9`). |

**Verification commands (har sprint ke end par):**
```bash
# backend
cd backend && npm run lint && npm test
# frontend
cd frontend && npm run lint && npm run typecheck && npm test
# migrations (agar banaye)
cd backend && node scripts/<script>.mjs --dry-run
```

---

## 1. ALREADY DONE — ye dobara mat karna (verified inventory)

Audit me ye sab **already implement** mila. In par kaam sirf tab karo jab task explicitly bole.

**Taxonomy core:**
- `backend/src/lib/taxonomy.js` — 26 `CATEGORY_TYPES`, `CATEGORY_CODE_RE`, **44 canonical specialties + aliases**, `resolveSpecialty/specialtyCondition`
- `backend/src/models/Category.js` — `code/aliases/parent/path/level/tier/regulatedBy/adClaimsRestricted/externalCodes` + index `{type,code}` unique, `{type,parent,name}`, text index
- `backend/src/lib/appointmentModes.js` — canonical 5 modes + legacy aliases + normalize
- `backend/src/routes/categories.js` — public + admin endpoints
- `backend/scripts/migrate-category-taxonomy.mjs`, `migrate-enum-normalization.mjs`
- Superadmin UI: `frontend/src/pages/superadmin/Categories.tsx`, `GlobalCatalog.tsx`

**Model-level splits already done:**
- `Doctor.js` → `specialtyCode`, `subSpecialtyCodes`, pre-save resolve
- `Test.js` → `categoryCode`, `sampleType` enum (13 values)
- `Medicine.js` → `therapeuticClass`(55) / `rxSchedule`(+aliases) / `productLine`(20) / forms(22) / `composition/strength/packSize/mrp/gstRate/hsn/atcCode/storage.*`
- `Facility.js` → `subType`(~50) / `ownership` / `systemOfMedicine` / `schemesAccepted`
- `Radiology.modality`(19) ⊇ `Equipment.type` (+ AMC/calibration fields)
- Enums expanded: `Ambulance.ambulanceType`(9), `Vehicle.type`(11), `DietOrder.dietType`(+16)+`MEAL_TYPES`(8), `HealthPackage.category`(27), `Record.type`(+12), `Staff.role`(+9), `Inventory.category/unit`, `LawyerProfile.practiceCategories`
- `H1RegisterEntry` + `pharmacy.js` h1-register route + `H1RegisterPage.tsx` (H1/X/NDPS statutory register)
- Checkout prescription gate: `pharmacy.js:1392` (`PRESCRIPTION_REQUIRED`)

**Provider platform:**
- `backend/src/lib/providerTypeCatalog.js` — **45 provider types** (gym, yoga, dietitian, home_nurse, ayush_clinic, dialysis_centre, maternity_ivf, equipment_rental, event_organizer, …) + **per-type required/optional documents** (`rq()`/`opt()`: CEA, DL, NABL, NABH, AERB, PCPNDT, FSSAI…)
- `providerTypes.js` — kinds/groups/statuses/DOCUMENT_TYPES
- `Provider`, `ProviderApplication`, `ProviderDocument`, `ProviderTypeConfig` models + `providers.js`, `providerCatalog.js`, `join.js` routes
- Frontend: `frontend/src/pages/join/JoinWizard.tsx` (config-driven), role dashboards wired in `App.tsx:1366-1373`
- `frontend/src/data/healthcareCatalogue.ts` — 88 patient-facing catalogue items (7 marked `soon: true`: blood-bank, home-visit-doctor, home-physio, vaccination, obesity-nutrition, child-development, palliative)

**Discreet/sensitive handling (D3) already built:**
- `NotificationPreference.discreetMode` + `services/notificationPreferences.js` + `lib/neutralCopy.js` + template `discreetVariant`
- Category `adClaimsRestricted` exposed in public API + `ContentModeration.tsx`

---

## 2. TASK LIST — priority order me

> Har task ka format: **Goal → Files → Changes → Acceptance → Verify**

---

### P0-1 · Frontend specialty lists ko API se unify karo (bug A1 #1 + #12)

**Why:** Backend canonical list hai (`taxonomy.js`) par 15+ frontend files me **do alag spellings**
chalti hain (Orthopedics vs Orthopaedics) + `Psychology` specialty chip galat hai. Filter me
doctor miss hone ka asli root cause yahi hai.

**Files (sab `frontend/src` me):**
| File | Problem (grep se verify) |
|---|---|
| `pages/HospitalDirectory.tsx:15-33` | British spellings + `'Psychology'` chip (line ~33) |
| `pages/ClinicDoctors.tsx:18-40` | `SPECIALIZATIONS` hardcoded + `'Psychology'` chip |
| `pages/Doctors.tsx:9` | `FALLBACK_SPECIALIZATIONS` American spellings |
| `pages/HospitalDoctors.tsx:16-22` | `DEFAULT_SPECS` American |
| `pages/JoinPlatform.tsx:36` | `SPECIALTIES` 16 mixed (Ayurveda/Homeopathy/Physiotherapy = system-of-medicine, specialty nahi) |
| `pages/Appointments.tsx:11` | `FALLBACK_DEPARTMENTS` |
| `pages/admin/AdminDoctors.tsx:10` | `FALLBACK_SPECIALIZATIONS` |
| `pages/Home.tsx:65-70` | featured chips (query values sahi hain, counts hardcoded — P0-5 me fix) |
| `pages/OPDToken.tsx:78,134` | department dropdown hardcoded |
| `pages/Staff.tsx:88`, `pages/Reports.tsx:138`, `pages/Inventory.tsx:163` | department dropdowns |
| `pages/DoctorConsultation.tsx:476` | filter dropdown |
| `pages/HospitalProfile.tsx:58-73` | icon/style maps keyed by American spelling |
| `components/HospitalCard.tsx:65-80` | icon/style maps |
| `pages/hospital/FeedbackDashboard.tsx:240-241` | `<SelectItem>` values |

**Changes:**
1. Naya hook banao `frontend/src/hooks/useCategories.ts`:
   - `useCategories(type)` → `api.getPublicCategories({ type, isActive: 'true' })`, **session cache** (module-level Map + TTL ~10 min), `fallback` parameter for offline/error.
   - Response DTO already fixed hai: `code name nameHi aliases type parent path level tier icon displayOrder adClaimsRestricted` (`categories.js:13`).
2. Har list ko isse populate karo:
   - Specialty chips: `useCategories('specialty')` (ya static `SPECIALTIES` import from a single new file `frontend/src/data/specialties.ts` jo backend list ka mirror ho — **ek hi jagah**).
   - Icon/style maps ko **code-keyed** banao (`SPEC.ORTHO` etc.), spelling-keyed nahi. Map banao `frontend/src/data/specialtyVisuals.ts`: `{ [code]: {icon, color, textColor} }` + fallback default icon.
3. **`'Psychology'` chip hatao** `HospitalDirectory.tsx` + `ClinicDoctors.tsx` se. Agar mental-health group dikhana hi hai to usko alag section banao (label: "Mental Health Professionals") jo specialty `type` me nahi, `provider_type` me aayega (counsellor/psychiatrist) — in-page static block chalega, specialty filter me nahi.
4. `JoinPlatform.tsx:36` `SPECIALTIES` (16) se **Ayurveda/Homeopathy/Physiotherapy/Dentistry hatao** (ye `systemOfMedicine`/`provider_type` hain). Jagah: specialty dropdown = canonical 44 list; system-of-medicine alag select (options: `Facility.js:49-53` `SYSTEMS_OF_MEDICINE` se).
5. Department dropdowns (OPDToken/Staff/Reports/Inventory): `backend/src/routes/departments.js` se fetch karo, fallback = current hardcoded list.
6. Backend already alias-resolve karta hai (`doctors.js:109` `specialtyCondition`) — **frontend sirf canonical `code` bheje** `?specialty=SPEC.CARDIO` ya canonical name. Param pasand karte waqt `taxonomy.js` `resolveSpecialtyCode` se guzarana ensure karo (agar `doctors.js` abhi sirf naam leta hai to `specialtyCode` param add karo).

**Acceptance:**
- [ ] `grep -rn "Orthopedics\|Pediatrics" frontend/src/pages` → sirf fallback/legacy comment (nayi list me nahi)
- [ ] `grep -rn "'Psychology'" frontend/src` → 0 (specialty context me)
- [ ] HospitalDirectory + ClinicDoctors + Doctors + JoinPlatform SAME specialty list render karein
- [ ] Doctor jiska `specialization="Orthopedics"` hai wo `"Orthopaedics"` filter me dikhe (backend alias already karta hai — E2E se verify)
- [ ] API fail par fallback list dikhe, page crash nahi

**Verify:** `cd frontend && npm run lint && npm run typecheck && npm test`

---

### P0-2 · Test categories merge (bug A1 #3 + #4)

**Why:** 3 alag lists: seed `backend/mock-data/tests.json` (3: Cardiac/Imaging/Pathology),
`frontend/src/pages/admin/AdminTestCatalog.tsx:10` (9), `frontend/src/pages/AllTests.tsx:20-46` (21).
Admin jo category banaye wo patient filter me nahi aati.

**Files:**
- `backend/src/models/Category.js` (type `test` already valid)
- `backend/src/models/Test.js:9-14` (`category` free-text + derived `categoryCode`)
- `backend/scripts/` (naya seed/migration)
- `frontend/src/pages/AllTests.tsx`, `frontend/src/pages/admin/AdminTestCatalog.tsx`
- `frontend/src/pages/labcenter/LabTestCatalog.tsx`, `DiagnosticDashboard.tsx`, `ClinicTests.tsx` (jo bhi category dropdown rakhte hain — grep `category: '`)

**Changes:**
1. **Canonical test-category tree seed banao** `backend/scripts/seed-test-categories.mjs`:
   `subcatogary.md` §4.1 ki tree (Blood Basics, Diabetes, Lipid & Heart, Liver, Kidney, Thyroid & Hormones, Vitamins & Minerals, Infection/Serology, Microbiology, Allergy, Autoimmune, Cancer Markers, Women's Health/Prenatal, Men's Health, Paediatric, Histopathology, Genetic, Stool/Urine, STD, Toxicology, Eye/ENT/Dental, Neuro/Cardiac Functional, Imaging, Health Packages...) — `type:'test'`, `code:'TEST.<SLUG>'` (derived `deriveCategoryCode` use karo `taxonomy.js:102`), parent hierarchy.
2. **`Test.category` migration:** har row ke liye `categoryCode` = canonical code (free-text name se map, alias table seed ke andar rakho: "Blood Tests"→`TEST.BLOOD_BASICS` etc.). Script `scripts/migrate-test-categories.mjs` + `MIGRATIONS.md` entry. Fail-soft.
3. **AdminTestCatalog** → dropdown `api.getPublicCategories({type:'test'})` se; naya test create karte waqt `categoryCode` bhi bhejo. Fallback = current 9.
4. **AllTests.tsx** → `TEST_CATEGORIES` chips + `CATEGORY_TESTS` map (jo hardcoded test-name list hai) hatao:
   - Categories: API se (icon fallback).
   - Tests: `api.getTests({ categoryCode })` se (backend `routes/tests.js` me `categoryCode` filter add karo agar nahi hai).
   - Fallback: purani hardcoded arrays `frontend/src/data/testCategoriesFallback.ts` me le jao (page tuta nahi chahiye API down par).
5. `Test.js` pre-save derivation already hai (`:96-101`) — bas ensure karo admin UI `categoryCode` bhejta hai.

**Acceptance:**
- [ ] Superadmin `Categories.tsx` me `type=test` tree dikhti hai aur `AllTests` page wahi categories dikhata hai
- [ ] Naya category add kiya (admin) → patient filter me turant (ya cache TTL ke baad) dikha
- [ ] `Test.category` free-text abhi bhi required hai (backward compat) par `categoryCode` har nayi row par populated
- [ ] `npm test` (backend) green

**Verify:** backend lint+test, frontend lint+typecheck+test

---

### P0-3 · Home.tsx hardcoded counts hatao (D1 step 9)

**Why:** `frontend/src/pages/Home.tsx:65-70` me `"45+"`, `"32+"` etc. hardcoded hain — misleading.

**Changes:**
1. Backend: `routes/doctors.js` (ya `routes/platform.js`) me counts endpoint —
   `GET /api/platform/specialty-counts` → `{ [specialtyCode]: count }` (approved doctors, group by `specialtyCode`; fallback `specialization` alias se resolve karke). Agar already hai to reuse.
2. `Home.tsx` — chips par count fetch karo; loading me `count` chip chhupao (dikhao hi mat fake); API fail → count chip hide (query chip waise bhi kaam karega).
3. Same `countKey` pattern `healthcareCatalogue.ts` (line ~56 `countKey?: 'hospitals' | 'doctors'`) — wahan bhi hardcoded counts ho to wahi endpoint use karo.

**Acceptance:**
- [ ] `grep -n 'count: "' frontend/src/pages/Home.tsx` → 0
- [ ] Counts real DB se aayein (seed data par match karein)

---

### P0-4 · B4 Search facets — ownership / scheme / open-now / home-visit / accreditation filters

**Why:** `Facility.js` me `ownership`, `schemesAccepted`, `systemOfMedicine`, `subType`,
`accreditations` fields hain par **koi filter nahi banta** — patient "Government hospital",
"Ayushman accepted", "24x7", "women doctor" nahi khoj sakta. Ye Doc-B4 ka core tha.

**Files:**
- `backend/src/routes/facilities.js` (abhi sirf `type+lat+lng+radiusKm` — verify grep `req.query`)
- `backend/src/routes/search.js` (abhi sirf `q,type,vertical,city,lat,lng,radiusKm,size`)
- `backend/src/routes/doctors.js`, `clinics.js`, `providers.js`
- `frontend/src/pages/HospitalDirectory.tsx`, `AllFacilities.tsx`, `Doctors.tsx`, `ClinicDoctors.tsx`

**Changes:**
1. **Query params (all optional, additive):**
   ```
   ownership=government|private|trust_charitable|...
   scheme=pmjay|cghs|esi|echs|state_scheme|insurance_cashless|tpa_empanelled|corporate_tie_up
   system=ayurveda|homeopathy|...      (systemOfMedicine)
   subType=nursing_home|jan_aushadhi_kendra|phc|...
   accreditation=nabh|nabl|aerb|...    (Facility.accreditations array me $in)
   openNow=true                        (timing.monday..sunday parse — IST day+time check)
   emergency24x7=true
   homeVisit=true                      (appointmentModes $in ['home_visit','home'])
   wheelchair=true                      (amenities.wheelchairAccess)
   verified=true                        (status=approved)
   specialty=<name ya code>             (resolveSpecialtyCode → $or specialtyCode/specialization)
   ```
   Implement: `routes/facilities.js` list route + `routes/search.js` (agar wo aggregator hai) + `routes/hospitals.js` + `routes/doctors.js` (homeVisit/language/gender).
   Har filter ko **tenant guard** ke andar hi add karo (existing filter-building pattern follow karo — `pharmacy.js:804-837` jaisa ownership+search AND pattern).
2. **Frontend:** `HospitalDirectory.tsx`, `ClinicDoctors.tsx`, `AllFacilities.tsx` me filter chips/panel:
   - Government/Private/Trust (segmented control)
   - Schemes (checkbox chips: Ayushman PM-JAY, CGHS, ESI, Insurance cashless)
   - Open now / 24x7 toggle
   - Home visit toggle
   - System of medicine chips (All/Allopathy/Ayurveda/Homeopathy)
   - URL query sync (shareable links — catalogue `subs[].route` already `?category=` style use karta hai, wahi pattern)
3. Sorting: `nearest` (geo), `rating`, `price` — agar nahi hai to `sort` param add karo.

**Acceptance:**
- [ ] `GET /api/facilities?type=hospital&ownership=government&scheme=pmjay` → sirf wo facilities jo `schemesAccepted` me `pmjay` rakhti hain
- [ ] UI me ek toggle se govt hospitals filter ho jaye (seed data par verify)
- [ ] `?openNow=true` sirf 8am-8pm wale din ke hisaab se filter kare
- [ ] Purane bina-param calls unchanged (additive)

**Verify:** backend integration test add karo `backend/test/integration/` (naya spec, existing spec ka pattern follow — jaise `categoriesPublic.spec.js`).

---

### P0-5 · Join/Onboarding me Facility taxonomy fields (bug A1 #11 ka UI half)

**Why:** `Facility.js:78-81` me `subType/ownership/systemOfMedicine/schemesAccepted` hain par
**koi bhi join form ye bhejta nahi** (grep: `frontend/src/pages` me 0 matches) → data kabhi bharega hi nahi.

**Files:**
- `frontend/src/pages/join/JoinWizard.tsx` (primary, config-driven)
- `frontend/src/pages/JoinPlatform.tsx` (legacy — agar abhi live hai to wahan bhi)
- `backend/src/lib/providerTypeCatalog.js` — facility types ke `services`/`business` step me naye fields
- `backend/src/routes/join.js` — accept + validate
- `backend/src/utils/validate.js` — zod schema extension

**Changes:**
1. `providerTypeCatalog.js` — facility typeKeys (hospital, clinic, diagnostic, imaging_centre, pharmacy, ayush_clinic, dialysis_centre, maternity_ivf, rehab_centre, blood_bank, dental_clinic, eye_hospital) ke form steps me field add karo (existing `field()` helper pattern dekho line ~286 `schemes_hospital` accreditations wala):
   ```
   field('sub_type', 'Facility sub-type', 'select', { options: [...FACILITY_SUBTYPES relevant slice] })
   field('ownership', 'Ownership', 'select', { options: ['government','private','trust_charitable','corporate_chain','cooperative','ppp','military_railway_esi'] })
   field('system_of_medicine', 'System of medicine', 'select', { options: [...] })
   field('schemes_accepted', 'Schemes accepted', 'multiselect', { options: ['pmjay','cghs','esi','echs','state_scheme','insurance_cashless','tpa_empanelled','corporate_tie_up'] })
   ```
   Options import karo `models/Facility.js` se **export karke** (abhi woh constants module-private hain — `FACILITY_SUBTYPES` etc. ko `export` karo, ya `lib/taxonomy.js` me le jao aur Facility wahan import kare; dono ek hi source).
2. `join.js` route + `validate.js` — schema me 4 fields (enum, optional, default `''`/`[]`). Sanitize karna nahi (enum me already closed).
3. `JoinWizard` — generic field renderer already hai (config-driven) → sirf config badalne se UI aa jayega; verify karo select/multiselect render hota hai.
4. **Migration/seed:** `scripts/seed-provider-type-configs.mjs` dobara chalana hoga (config DB me hai).
5. Read side: `routes/facilities.js` list — filters P0-4 me already cover ho jayenge; detail page (`ClinicDetail/HospitalProfile`) par chips dikhao (government badge, "Ayushman accepted" badge) — `patientRecommendations.js:60` already `ownership:'government'` query karta hai, wahi pattern.

**Acceptance:**
- [ ] Join flow me hospital select karne par 4 fields dikhein
- [ ] Submit ke baad Facility document par `subType/ownership/systemOfMedicine/schemesAccepted` populated
- [ ] Old facilities (fields missing) par validation fail nahi (defaults `''`/`[]`)
- [ ] `npm test` green (join integration tests agar hain)

---

### P1-1 · Enum/logic gaps chhote fixes (backend)

> Sab **additive** hain. Har ke saad zod schema (`utils/validate.js`) + test (`validateVocab.spec.js`) sync karna.

| # | Kya | Files | Change |
|---|---|---|---|
| P1-1a | `Billing.source` 9 → +`ambulance, blood_bank, home_service, equipment_rental, membership, event` | `models/Billing.js` (source enum), `validate.js` (billing schema), billing UI dropdowns (grep `source:` in `frontend/src/pages/Billing.tsx`, `ClinicBilling.tsx`) | additive values |
| P1-1b | `Billing.paymentMethod` + `Wallet, NetBanking, EMI, Govt Scheme` | `models/Billing.js` (2 enums: `paymentMethod` + `mode`) + validate + UI | additive |
| P1-1c | `Emergency.emergencyType` enum add (cardiac, stroke, trauma, burns, poisoning, obstetric, paediatric, psychiatric, snake_bite, drowning, allergic, respiratory, diabetic, seizure, fire_disaster) | `models/Emergency.js` — `emergencyType: { type:String, enum:[...,''], default:'' }`, `condition` free-text rehne do; `validate.js`; routing/analytics me use (dispatch priority) agar easy ho | `emergencyType` optional, `''` = unspecified |
| P1-1d | `InsurancePolicy.policyType` enum: `individual, family_floater, senior_citizen, critical_illness, top_up, group, maternity, accident, government_scheme, disease_specific` | `models/InsurancePolicy.js` + `validate.js` + `Insurance.tsx`/`TpaDesk.tsx` form | additive |
| P1-1e | `DietOrder.dietaryPreference` enum: `veg, non_veg, eggetarian, vegan, jain, halal` + (agar nahi) dietary note | `models/DietOrder.js` (field add, default `''`), `validate.js`, `DietKitchenSheet.tsx` form | `allergies` already exists (`DietOrder.js`) — prefer use |
| P1-1f | Blood bank unit-level TTI screening: `models/BloodBank.js` units me `ttiScreen: { hiv, hbv, hcv, syphilis, malaria: 'positive'\|'negative'\|'pending' }` + `apheresis` (SDP/RDP), `irradiated`, `leukoreduced` booleans | `BloodBank.js` + `validate.js` + `BloodBank.tsx` UI (unit card par badges) | defaults `'pending'`/`false` (old rows valid) |
| P1-1g | Checkout gate `rxSchedule` se bhi (A1 #9 gap) | `routes/pharmacy.js` ~line 1392: `needsPrescription = items.some(m => m.prescriptionReq \|\| ['schedule_h','h1','x','schedule_g','narcotic_ndps'].includes(String(m.rxSchedule||'').toLowerCase()))` — `medicineById` select me `rxSchedule` add karo | Order 422 `PRESCRIPTION_REQUIRED` |

**Acceptance (sabke):** `cd backend && npm test` — khaas kar `validateVocab.spec.js` green; purani rows create/update par validate fail nahi.

---

### P1-2 · Language list (11 → 24) + Counsellor concerns (16 → 40)

**Files:** `frontend/src/pages/JoinPlatform.tsx:68,83` (LAWYER_LANGUAGES, COUNSELLOR_LANGUAGES), `:75` (COUNSELLOR_CONCERNS) — **dono same file me duplicate hain**; `Doctor.languages`/`LawyerProfile.languages` arrays (free arrays hain, validation nahi — theek hai).

**Changes:**
1. Ek hi source: `frontend/src/data/optionLists.ts` banao:
   ```ts
   export const LANGUAGES = ['Hindi','English','Marathi','Bengali','Tamil','Telugu','Gujarati',
     'Punjabi','Urdu','Kannada','Malayalam', 'Odia','Assamese','Bhojpuri','Rajasthani',
     'Maithili','Konkani','Kashmiri','Sindhi','Nepali','Sanskrit','Chhattisgarhi'];
   export const COUNSELLOR_CONCERNS = [ ...16 purane + Grief/Bereavement, Anger Management,
     Parenting, Marriage/Premarital, Breakup, OCD, Phobias/Panic, PTSD, Social Anxiety,
     ADHD, Eating Disorders, Body Image, Postpartum/Perinatal, Infertility Stress,
     Chronic Illness Coping, Caregiver Burnout, Screen/Gaming Addiction,
     Workplace Harassment, Financial Stress, LGBTQ+ Affirming, Gender/Sexual Identity,
     Senior Loneliness, Child Behaviour, Bullying, Substance Use ];
   ```
   (Full list: `subcatogary.md` Part C §8 "Add" block.)
2. `JoinPlatform.tsx` dono imports ko isse kare; yaad rakhna **counsellor + psychiatrist dono steps** (line ~3624 aur ~4110) same list use karte hain — ek jagah se chalega.
3. Backend validation check karo: agar concern list pe kahin zod enum hai to update (`grep -rn "Meditation" backend/src`); warna free-string array hai to sirf frontend.
4. **Discretion:** sensitive concerns (HIV/sexual identity/infertility) — listing par sirf generic labels? `discreetMode` already hai notifications me; concerns display par alag kaam chhota: badge nahi dikhana, service name me neutral wording (existing `neutralCopy.js` pattern dekh lo).

**Acceptance:** Join form me 24 languages + ~41 concerns selectable; backend save ho; old saved values valid.

---

### P1-3 · Patient-side Second-Opinion create UI

**Why:** Backend complete hai (`routes/secondOpinions.js`, model, tests, doctor `ReferralsInbox.tsx`), patient UI nahi — catalogue `healthcareCatalogue.ts:703` `/telemedicine` pe redirect karta hai.

**Changes:**
1. Naya page `frontend/src/pages/patient/SecondOpinion.tsx`:
   - Records multi-select (`api` me `getRecords` pattern — `MedicalRecords.tsx` se reuse)
   - Question textarea + target specialty select (canonical list, P0-1 hook)
   - `POST /second-opinions` payload zod schema ke hisaab se (`validate.js:749` `secondOpinionCreateSchema` — `dataTypes`, `recordIds`, `question`, `specialty` field names wahan se uthao, guess mat karo)
   - List + cancel (`GET /`, `DELETE /:id`?) — `api.js` me client methods add karo (`getSecondOpinionInbox` ke saath `createSecondOpinion/listSecondOpinions/cancelSecondOpinion`)
2. Route `App.tsx` under patient routes: `/patient/second-opinion`.
3. `healthcareCatalogue.ts` `second-opinion` item ka `route: '/telemedicine'` → `/patient/second-opinion` (aur subs bhi).

**Acceptance:**
- [ ] Patient records select karke request bheje → doctor ke `ReferralsInbox` me dikhe
- [ ] Consent/audit log ban (`secondOpinionCreateSchema` me `dataTypes` wala consent flow route already karta hai — sirf UI se sahi aaye)
- [ ] Existing integration test `secondOpinions.spec.js` green + naya UI smoke test (vitest) agar repo pattern ho

---

### P2-1 · Stub dashboards → real features (bada chunk, phased)

**Problem:** Ye pages **1.4-1.6KB ke thin wrappers** hain, hardcoded KPIs, description me khud
"stub" likha hai: `frontend/src/pages/dashboards/GymDashboard.tsx`, `YogaStudioDashboard`,
`DietitianDashboard`, `EquipmentVendorDashboard`, `EventOrganizerDashboard`, `DentistDashboard`,
`PhysioDashboard`.

**Har ek ke liye definition of done (DoD):**
1. **Data:** backend route se KPIs/tasks real (gym → memberships count, earnings, expiring;
   events → upcoming/pending registrations; equipment → active rentals/overdue; dietitian →
   meal plans/orders; dentist → today's appointments/treatment plans).
   Backend me bahut kuch pehle se hai: `memberships.js`, `events.js`, `rentals.js`, `diet.js`,
   `dental.js` — **pehle grep karo, naya route mat likho agar existing endpoint kaam karta hai.**
2. **CRUD:** core entity ka list/create/update (jo `providerServices.js` pattern follow kare —
   parent Provider ke through ownership).
3. **Authz:** `authorize('...')` + tenant guard, role `RoleRoute` waisa hi.
4. **Stub KPI literals hatao** — sab API se.

**Order (value ke hisaab se):** `EventOrganizer` (events backend ready) → `EquipmentVendor`
(rentals ready) → `Dietitian` (diet ready) → `Gym`/`YogaStudio` (Membership reuse) → `Physio`
(`physio.js` + `Physiotherapy` model) → `Dentist` (`dental.js` ready).

**Acceptance (per dashboard):** koi hardcoded number nahi (`grep -n "value: '"` se),
CRUD E2E chale, lint+typecheck green.

---

### P2-2 · `healthcareCatalogue.ts` ke 7 `soon: true` items

`blood-bank, home-visit-doctor, home-physio, vaccination, obesity-nutrition, child-development, palliative`

Har item ke liye **ya to real destination banao ya entry hatao** (dead-link nahi dikhana —
comment khud kehta hai catalogue me):

| Item | Minimal deliverable |
|---|---|
| blood-bank | `BloodBank.tsx` page already hai — check karo route registered hai kyo `soon` hai (`App.tsx` grep `BloodBank`); agar public route missing hai to add + catalogue route set karo |
| home-visit-doctor | Doctors list me `homeVisit=true` filter (P0-4 ka part) + badge "Home visit available"; catalogue route → `/doctors?homeVisit=1` |
| home-physio | same → `/physio?homeVisit=1` (Physiotherapy page) |
| vaccination | Patient vaccination tracker page: `VaccinationSchedule`/`VaccinationAlert` data + `routes/vaccinations.js` se patient endpoints (agar clinic-side hi hai to patient read-only list + next-due). Page `frontend/src/pages/patient/VaccinationTracker.tsx` |
| obesity-nutrition | Dietitian listing + weight-management program (DietKitchen/diet route reuse) — minimum: dietitian search + package cards |
| child-development | `child_development_centre` facility ka listing filter (P0-4 subType filter) + content cards; service booking nahi chahiye phase 1 me |
| palliative | `hospice_palliative` subType listing + helpline/palliative-care info page |

**Acceptance:** `grep -c "soon: true" healthcareCatalogue.ts` → 0 (ya fir entry hi remove).

---

### P2-3 · Search/UX hardening

| # | Task | Detail |
|---|---|---|
| P2-3a | Hindi/Hinglish search | `taxonomy.js` me hindi aliases add karo (`हड्डी`, `हृदय`, `दांत`, `बच्चा डॉक्टर`) — `nameHi` field Category me hai; text index `name+aliases` already hai (`Category.js:37`) — `nameHi` ko bhi text index me add karo agar search hindi me karna hai |
| P2-3b | Spelling tolerance | Search route me fuzzy (OpenSearch hai repo me — `data-platform/opensearch`, `services/opensearchIndexer.js` — agar doctor/test index banta hai to ngram/synonym filter; nahi to `specialtyPattern` fallback already regex deta hai) |
| P2-3c | `adClaimsRestricted` enforcement | Field + moderation page hai. Auto-block: listing create/update path par (`providers.js`, `providerServices.js`, `featuredListings.js`) restricted category ke listing text me banned words (`cure, guaranteed, 100%, permanent, weight loss fast`) → `400` ya moderation queue me `ModerationItem` (model exists). Word list ek config `lib/adClaimsGuard.js` me. |
| P2-3d | Accessibility pass | Home/AllTests/HospitalDirectory par: `aria-label` icon buttons, focus rings, sr-only headings — audit karo (axe already in node_modules `axe-core`) |
| P2-3e | i18n regional | `frontend/src/i18n/locales/` me sirf `en/hi`. Priority: `mr`, `bn`, `ta`, `te` (sirf high-traffic keys — infra already react-i18n pattern me hai) |

---

### P3 · Naye categories (Phase 1 list — sirf taxonomy/onboarding layer)

> Master catalogue ke "Phase 1" items jinke liye **abhi model/route nahi hai**.
> Har ek ka minimal shape: `Facility.subType`/`providerTypeCatalog` type (already exist for
> most!) + category seed + listing/filter + docs checklist. **Naya model sirf tab jab
> workflow ho.**

| Category | Kya banana hai |
|---|---|
| Government PHC/CHC/UPHC/Arogya Mandir listings | subtypes exist; listing page + `ownership=government` chip (P0-4 cover karega) + seed data entry |
| Jan Aushadhi listing | `jan_aushadhi_kendra` subType filter chip + badge (P0-4/P0-5 cover) |
| PM-JAY empanelled filter | `schemesAccepted` filter (P0-4) + hospital detail par badge; rates ke liye `PmjayPackage` already hai |
| Helpline directory page | Catalogue me entry hai; dedicated `pages/Helplines.tsx` me 112/108/102/14416/181/1098/poison + state-wise (data file) |
| AYUSH clinic listing | `ayush_clinic` type + `system=ayurveda` filter (P0-4) + AYUSH docs checklist (providerTypeCatalog me verify `rq()` AYUSH council reg hai — agar nahi to add) |
| Dietitian listing | `dietitian` practitioner type ka public listing (`providers.js` group=`clinical` filter) |
| Equipment rent/sale store | `rentals.js` backend ready; patient-side catalog page (EquipmentVendor ke products + rent terms) + `EquipmentVendorDashboard` real (P2-1) |
| Home sample collection booking | Already: `Test.homeCollection` + `PhlebotomistDashboard` — patient flow verify karo (AllTests → homeCollection toggle → LabBooking with `providerType=phlebotomist`); missing gap hi fix karo |

**Acceptance:** har row ke liye — listing filter se milta hai, join flow se onboard hota hai,
type-wise docs checklist dikhti hai.

---

### P4 · Doc sync (kaam ke baad)

1. `rolesmd/subcatogary.md` Part A1 ka status column update (fixed/partial/open) — warna next
   verification galat hoga.
2. Master catalogue (jo bhi file hai uska status table) me jo ❌ ab ✅/🟡 ho gaye update karo:
   second-opinion, HR/payroll, asset maintenance, BMW, quality/incident, NABH checklists,
   events engine, lawyer practice areas, donor directory, helplines, antenatal, growth charts,
   women's health, dialysis, oncology, rentals, CME.
3. `backend/scripts/MIGRATIONS.md` — naye scripts ki entry.
4. `npm run docs:dictionary:check` green.

---

## 3. Sprint grouping (suggested)

| Sprint | Tasks | Effort |
|---|---|---|
| **S1** | P0-1 (specialty unify) + P0-3 (home counts) + P1-2 (languages/concerns) | frontend-heavy |
| **S2** | P0-2 (test categories) + P1-1g (rx gate) + P1-1a..f (enum gaps) | backend-heavy |
| **S3** | P0-4 (search facets) + P0-5 (join fields) | full-stack |
| **S4** | P1-3 (second-opinion UI) + P2-2 (soon items) | full-stack |
| **S5** | P2-1 (stub dashboards, 2-3 at a time) | full-stack |
| **S6** | P2-3 + P3 (new categories) + P4 (doc sync) | mixed |

Har sprint ke end par: `backend: lint+test` · `frontend: lint+typecheck+test` ·
manual smoke (join flow, doctor search, test booking, pharmacy checkout).

---

## 4. Global Definition of Done

- [ ] Koi bhi naya hardcoded specialty/test/language list file me nahi (sirf fallback file me)
- [ ] Koi bhi naya enum old values ko remove nahi karta
- [ ] Har migration script `MIGRATIONS.md` me + `--dry-run` support
- [ ] `backend && npm test` green · `frontend && npm run typecheck && npm test` green
- [ ] T1 data par authz/audit unchanged; T3 surfaces par PHI nahi
- [ ] Sensitive categories (mental health, sexual health, fertility) — discreet notification pattern follow ho
- [ ] Doc status tables sync (P4)

---

## 5. Reference — quick file index

| Kaam | File |
|---|---|
| Canonical specialties + aliases | `backend/src/lib/taxonomy.js` |
| Category model/public API | `backend/src/models/Category.js`, `backend/src/routes/categories.js` |
| Facility taxonomy enums | `backend/src/models/Facility.js` |
| 45 provider types + docs checklists | `backend/src/lib/providerTypeCatalog.js` |
| Appointment modes | `backend/src/lib/appointmentModes.js` |
| Rx schedule vocab | `backend/src/models/Medicine.js`, `backend/src/utils/validate.js:155-179` |
| Patient catalogue (soon flags) | `frontend/src/data/healthcareCatalogue.ts` |
| Routes registry | `backend/src/index.js` (app.use list) |
| Frontend routes | `frontend/src/App.tsx` |
| API client | `frontend/src/lib/api.js` |
| Existing migrations | `backend/scripts/migrate-*.mjs`, `MIGRATIONS.md` |
| Vocab sync tests | `backend/test/unit/validateVocab.spec.js`, `taxonomy.spec.js` |
