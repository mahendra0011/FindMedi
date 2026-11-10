# Browse by Specialties — implementation TODO

Source: `FindMedi-Browse-By-Specialties.md` sections 2–7. This tracker distinguishes existing implementation from work completed in this pass.

## Existing and retained

- [x] 43 canonical specialties, 300 sub-specialties and 13 grouped browse tiles, with taxonomy-backed icons, colors, aliases, metadata and cross-lists.
- [x] Specialty detail route/page with sub-specialties, conditions, procedures, related tests/packages and provider links.
- [x] Doctor profile stores `subSpecialtyCodes`, `conditionsTreated` and `procedures`; specialty profile editor exposes these fields.
- [x] Doctor query supports condition/procedure filtering with specialty fallback.
- [x] Symptom search, Hinglish entries and emergency red-flag banner.
- [x] Sensitive specialty discovery filtering and discreet booking copy; claims-restricted taxonomy flags raise moderation severity.
- [x] Facility views use facility-provided specialties or facility-scoped doctors.
- [x] Specialty code alias resolution, cross-listing and category seed fields.

## Completed in this pass

- [x] Home and browse-all use the API taxonomy; Home shows up to 8 city-scoped tiles ranked by doctor availability (zero-count tiles muted with a Request link), and browse-all has the available-only toggle.
- [x] `/search/suggest` includes safe doctor-name suggestions alongside taxonomy entries.
- [x] Cross-listed parent specialty filters/counts include canonical children consistently.
- [x] Reconcile specialty visual map (43 distinct root icons; the design table intentionally repeats some suggested icons).
- [x] Update the reference document checklist and its old 298/341 counts to match the canonical tree.
- [x] Reconcile the subcategory reference against all 43 roots and 348 displayed child links, including cross-listed children.

## Revalidated against repo (this pass)

- [x] Articles tab: specialty detail page renders published + medically-reviewed `PlatformContent` articles via `GET /platform-content?contentType=article&specialtyCode=...`; mocked-API specialty-detail flow (including Articles tab) passes.
- [x] §5.5 extra “Browse by” tabs (Systems of Medicine, Allied & Therapy, Mind, age/care-area) are live on browse-all and link to real search/directory routes.
- [x] Counts reconciled: 1417 canonical categories; specialty taxonomy 343 (43 roots + 300 subs); 13 grouped browse tiles; 348 display-child links including cross-lists.

## Explicit verification work

- [x] Backend category/specialty suites: 45 tests passed across 4 suites (`categoryCatalogue` 12, `specialtyBrowse` 11, `providerTypeCatalog` 9, `specialtiesApi` 13); integration coverage calls detail and counts for all 343 canonical codes, every registered alias, and checks children for all 43 roots.
- [x] Frontend specialty-filter suite: 12 tests passed, including canonical legacy-code and cross-list matching; specialty dashboard suite 22 tests passed.
- [x] Frontend production build and backend route/schema syntax passed; category seed dry-run passes with 0 errors.
- [x] Specialty browse journey covered by `frontend/e2e/specialty-full-journey.spec.ts` (mocked tile -> detail -> tabs) and `frontend/e2e/specialty-live-backend.spec.ts` (live read-only tree/count/detail/tile -> detail -> conditions/procedures/tests/articles in English + Hindi; 2/2 passed on 2026-11-10). Full configured Chromium suite passed 39/39 (46.9s); the broader suite uses API mocks and does not satisfy the 14-flow Hindi/English matrix.
- [ ] Article feed stays empty until medically reviewed specialty articles are authored and published (`PlatformContent` authoring - content-team dependency). Seeder scaffold added: `backend/scripts/seed/seed-specialty-articles.mjs` (creates reviewed+published articles for SPEC.CARDIO/DERM/ORTHO); production article authoring still pending.

Scope note: specialty-path tests, mocked-API browser flow, live read-only backend flow in English/Hindi (2/2), and production build passed; the full configured Chromium suite passed 39/39 on 2026-11-10 (46.9s). Production medical article authoring/review is still pending. A separate migration rehearsal used an ephemeral local Mongo replica set and a synthetic legacy doctor; no configured/live database was targeted. Home ranks by provider availability because patient-demand analytics are not available.



