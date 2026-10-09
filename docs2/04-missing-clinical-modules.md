# 04. Missing / Weak Clinical Modules

Format: Module → Kya hona chahiye → Key fields/features → Priority (P0 must, P1 important, P2 nice)

## 4.1 EMR / Encounter core (P0)
- **Encounter** entity (OPD/IPD/ER/Tele) jisse sab link ho.
- Structured consult note: chief complaint, HPI, past/family/social history, allergies (drug/food), ROS, examination, provisional + final diagnosis (ICD-10 search), plan.
- Specialty templates (General, Pediatrics growth chart, OBG, Ortho, Cardio, ENT, Derm, Ophthal, Psychiatry).
- Problem list, chronic conditions, immunization history, surgical history, implants.
- Allergy banner globally (header me), drug-allergy check at prescribing.
- Clinical documents: referral letter, fitness certificate, medical certificate, sick leave, with doctor e-sign + QR verify.
- Version history (RecordVersion hai) + addendum rules (no delete, only amend with reason).

## 4.2 CPOE & Order Sets (P0)
- Doctor orders: lab, radiology, medication, diet, nursing, physio, consult-request, procedure.
- Order status lifecycle: Ordered → Acknowledged → In-progress → Resulted → Reviewed.
- Order sets/protocols (e.g. Chest pain, Sepsis bundle, DKA, Post-op).
- Result review inbox for doctor ("unreviewed results").

## 4.3 Clinical Decision Support (P1)
- Drug-drug interaction, drug-allergy, duplicate therapy, renal/hepatic dose alert, pregnancy/lactation flag, max-dose check, pediatric weight-based dose.
- Early Warning Score (NEWS2/PEWS) from vitals → auto alert (ClinicalAlerts route exists, extend).
- Sepsis/qSOFA flag, fall-risk (Morse), pressure-ulcer risk (Braden).

## 4.4 Ward round & IPD care (P0)
- Ward round list per doctor (assigned patients, pending tasks), round notes (SOAP) with dictation.
- Nursing shift handover (SBAR), care plan, nursing assessment on admission, intake-output balance auto, pain scoring, fall-risk, pressure sore, restraint log, bedside procedures, Ryle's tube/catheter/line insertion-removal tracking (days in situ, infection control).
- Diet order integration (DietOrder exists): doctor → kitchen → bedside delivery confirm.
- Bed transfer & ward-shift history.
- Attendant/visitor pass.

## 4.5 ICU / NICU / HDU (P1)
- ICU flowsheet (hourly vitals, ventilator settings, infusion pumps, GCS, sedation score), APACHE/SOFA scores, ventilator days, central-line bundle checklist, device-associated infection tracking.
- NICU: birth weight/gestation, feeding chart, phototherapy log, bilirubin chart, kangaroo care.

## 4.6 Operation Theatre suite (P0/P1)
- Surgery request → OT calendar (room, surgeon, anaesthetist, team, estimated duration, priority elective/emergency).
- PAC (pre-anaesthesia check) + ASA grade, NPO status, consent verification.
- WHO Surgical Safety Checklist (3 phases) with e-sign.
- Anaesthesia record, intra-op notes, operation note template, swab/instrument count, implants/consumables used (auto-charge), specimen send-out (histopath link).
- PACU/recovery scoring (Aldrete), post-op orders.
- OT utilization, cancellation reasons, turnover time.

## 4.7 Maternity / OBG (P1)
- Antenatal card (LMP/EDD, visits, USG, labs, risk), partogram, labour record, delivery note, baby registration (birth certificate data), postnatal, newborn screening, immunization (BCG/OPV/Hep-B), family planning, Janani Suraksha / PMSMA tracking (India).
- Models exist: FertilityCycle, WomensHealth*; add `AntenatalRecord`, `LabourRecord`, `NewbornRecord`.

## 4.8 Pediatrics (P2)
- Growth charts (WHO/IAP), vaccination schedule (VaccinationSchedule exists, add due/overdue alerts + stock link), dose by weight.

## 4.9 Dialysis, Oncology, Cath-lab, Endoscopy (P2)
- Dialysis exists (session + water quality). Add machine allocation, dialyser reuse count, serology status segregation.
- Oncology: chemo protocol, cycle scheduling, BSA-based dosing, cytotoxic handling log, tumour board notes.
- Cath-lab/Endoscopy: procedure room, scope reprocessing log (link CSSD), consumables.

## 4.10 Blood Bank (extend) (P1)
- Exists: BloodBank with units/expiry/requests.
- Add: donor screening questionnaire & deferral, component separation (PRBC/FFP/Platelet/Cryo), cross-match, issue/return, transfusion monitoring (vitals pre/15min/post), **transfusion reaction report**, TTI testing (HIV/HBV/HCV/Malaria/Syphilis), NACO/ State Blood Transfusion Council reporting.

## 4.11 Radiology & Lab (see file 03) (P0/P1)
- LIS: barcode, reference ranges, critical alerts, QC, TAT, analyzer interface, outsourced tests, histopath/cytology workflow, microbiology (culture & sensitivity matrix, antibiogram).
- RIS/PACS: DICOM worklist + viewer, structured reports, dose log.

## 4.12 Infection Control & Patient Safety (P1)
- HAI surveillance (CAUTI/CLABSI/VAP/SSI), isolation flag on bed/patient, hand-hygiene audit, needle-stick injury log with PEP follow-up, antibiotic stewardship (restricted antibiotic approval), outbreak alert.
- **Incident / Adverse event / Near-miss reporting** (`incident` mentioned in 12 files but no dedicated hospital incident module verified): reporter, category, severity, RCA, CAPA, closure.
- Medication error log, falls log, sentinel events (NABH).

## 4.13 Rehab / Physio / Mental health (extend) (P2)
- Physio, Mental health exist. Add outcome scales (PHQ-9, GAD-7, Barthel, FIM), session packages, therapist scheduling, home-exercise plan with video.

## 4.14 Telemedicine compliance (P1, India)
- Tele-consult consent (TelemedicineConsent page exists), patient ID verification, RMP registration number display, Rx format per NMC Telemedicine Practice Guidelines 2020, prohibited-drug list enforcement (Schedule X etc.), recording consent, follow-up rules.

## 4.15 Home care & home sample collection (P2)
- Home nursing admin role exists, phlebotomist dashboard exists. Add route optimisation, visit checklist, e-consent, device kit inventory, billing per visit.
