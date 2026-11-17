# NMC Telemedicine Practice Guidelines 2020 — rule matrix (for legal review)

> **Status:** DRAFT for lawyer review. English source of law: NMC Telemedicine
> Practice Guidelines 2020 (issued 25 March 2020, MoHFW Board of Governors,
> in supersession of MCI). This matrix maps the Guidelines onto FindMedi's
> implementation surface so counsel can sign off section-by-section.
>
> **Controlling:** the NMC Guidelines text (Gazette of India). Do not rely on
> this matrix as legal advice.
> Drafted 2026-11-16.

## Legend

| Status | Meaning |
|---|---|
| ✅ Implemented | Code path exists and is tested |
| 🟡 Partial | Base control present; full rule needs sign-off |
| 🔴 Gap | Missing or pending legal validation |

## Identity verification (Patient side)

| Rule (NMC) | FindMedi implementation | Status |
|---|---|---|
| Patient identity verified (e.g., name, age, sex, phone) before teleconsult | `middleware/telemedicineGate.js`: identity check via User.isVerified + booking auth; `SignUp` enforces phone OTP verify | ✅ |
| Explicit consent for telemedicine mode | `consentRecords` via BookingModal TelemedicineConsentGate; `POST /api/patient/telemedicine-consent` records Granted/date/scope | ✅ |

## Identity verification (Practitioner side)

| Rule (NMC) | FindMedi implementation | Status |
|---|---|---|
| Practitioner registered with NMC / state medical council | `PractitionerApplication` T0/T1 review + `nmcRegNumber` field; provider type validation `Dentist`/`Doctor` require DCI/NMC reg | ✅ (existing flow) |
| Practitioner identity on screen during consult | Booking modal shows provider name, specialty, clinic; proof relies on admitting-time profile | 🟡 |

## Mode of consultation

| Rule | Implementation | Status |
|---|---|---|
| Mode selectable: text / audio / video | BookingModal has modes: In-Person (Offline), Video, Audio Call, Chat; `appointmentMode` persisted on Booking | ✅ |
| Video mandatory for second consultations / new patients (NMC warned against first-time diagnosis via telemedicine where video not feasible) | No enforcement (requires rule engine) — flag: NEEDS COUNSEL GUIDANCE | 🟡 |
| Audio/text allowed for follow-ups | No hard enforcement; code allows both for all modes | 🟡 — counsel must confirm whether strict rule applies to FindMedi's provider mix |

## Prescribing rules

| Rule (NMC summary) | Implementation | Status |
|---|---|---|
| First consultation → only symptomatic/otc | Not enforced | 🔴 |
| Follow-up → full prescription allowed | Not enforced | 🔴 |
| Schedule H/H1: only after in-person first visit (for Schedule X different rules) | Not enforced | 🔴 |
| Narcotics/psychedelics cannot be prescribed without in-person | Not enforced (pharmacies block NDPS anyway) | 🟡 |
| Telemedicine docs must include patient ID, practitioner reg no., date | Prescription PDF gen exists (`pdfkit`); Rx carries doctor reg (no strict NMC-formatted header yet) | 🟡 |

## Emergency handling

| Rule | Implementation | Status |
|---|---|---|
| In emergency, redirect to nearest hospital / ambulance | SOS flow (`POST /api/sos/dispatch`) with 108/112; EmergencyVideoRoom; ambulance tracking | ✅ |
| Clear statement that telemedicine is not for emergency | UI disclaimers; SOS path; provider can escalate | ✅ |

## Record keeping

| Rule | Implementation | Status |
|---|---|---|
| Consultation notes confidential, stored securely | `Record` (AES), T3 restrictions, field encryption, audit log | ✅ |
| Patient identity in record | `Record` + `Appointment` references `patientId` | ✅ |

## Verification workflow steps for counsel

1. Confirm Telemedicine gate messages shown to every online-mode booking match NMC-approved wording.
2. Advise whether enforce-first-video as a config toggle is acceptable, and under which provider specialties.
3. Advise on Schedule H/H1/X restriction enforcement tier (block at Rx upload vs warn-only).
4. Sign off Hindi and plain-English consent microcopy (see `docs/legal/short-form-summaries-hi.md`).

## Recommended decisions (counsel)

1. [ ] First-video enforcement: no / yes / which specialties
2. [ ] Schedule H/H1 enforcement: block / warn / none
3. [ ] Telemedicine-vs-in-person flag visibility: neutral / red-banner / hidden
4. [ ] Consent microcopy approval — English + Hindi text

## Out of scope (these are separate reviews)

- Provider licensing verification (NMC API is out of scope for this platform) — covered by `FindMedi-Final-Docs/04-Provider-Profiles.md`.
- CRN/registrar-specific restrictions (Tamil Nadu, Maharashtra vary) — flagged, no jurisdiction currently active.
