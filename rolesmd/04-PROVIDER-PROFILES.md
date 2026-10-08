# 04 — Provider Profiles (Spec)

> Generic practitioner profile (`frontend/src/pages/practitioner/PractitionerProfile.tsx`)
> for dentist / physiotherapist / dietitian / nurse / yoga teacher / lawyer and other
> individual providers. Facility detail pages link here from their staff lists.

## 1. Page anatomy

```
[Breadcrumb: Home › Category › Name]
[Header: photo · name ✓ · specialty · qualifications(short) · ★ (hide if <3) · exp · area · reg-verified badge · Share]
[Qualifications & Focus: education, focus chips (max 4), bio, reg-no masked (last-4 only)]
[Modes & Fees: in-person/home/video/chat/audio rows with per-mode fee; languages]
[Slots: next 12 live slots, cached 1–2 min; empty → "No slots published yet"]
[Reviews: histogram + verified-visit badge + report]
[Sticky bottom bar: Call · Book (+selected slot)]
```

## 2. Card → profile field mapping (base fields from 02-cards + per-type from 01-onboarding)

| Card field (public DTO) | Profile section |
|---|---|
| `name, imageUrl, verified` | Header |
| `specialty/category{label}` | Header subtitle |
| `ratingAvg, ratingCount` | Header (number only if count ≥ 3 else "New") |
| `priceFrom/fee{mode:amount}` | Modes & Fees table |
| `languages[]` | Modes & Fees footer |
| `nextSlotAt` | Slots (expanded to slot list) |
| `city/area` (never exact home address) | Header meta |

Per-type extras (from `rolesmd/2.md §4.2–4.3`):

| Type | Extra profile fields |
|---|---|
| Dentist | BDS/MDS, sub-specialty, clinic affiliation, DCI/state council reg (verified badge) |
| Physiotherapist | Focus (neuro/ortho/sports/paeds/geriatric), home-visit radius, equipment |
| Dietitian | Focus (diabetes/renal/weight/sports/paeds/PCOS), plan types + sample plan |
| Nurse (home) | Skills (IV/wound/ICU-at-home), shifts (4h/12h/24h), nursing-council + police-verified badges |
| Yoga teacher | Styles, batches, YCB cert, prenatal/therapy note (doctor-clearance) |
| Lawyer | Bar council + state, courts, practice areas, experience |

## 3. Rules

- Public DTO only: no full licence/reg numbers (mask to last-4), no phone/email before booking.
- Home-based practitioners: show area only, never exact address.
- Discreet mode for sensitive categories (§3-cards §1 privacy rule).
- Booking opens shared `BookingModal` with practitioner preselected.
- SEO: `/practitioner/:id`, JSON-LD `Physician`/`ProfessionalService` when verified.
