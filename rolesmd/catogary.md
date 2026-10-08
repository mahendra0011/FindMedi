# FindMedi — Saari Categories ka Master Catalogue

> Ek jagah: jo **pehle se hai** + jo **humne discuss kiya** + jo **aur ho sakti hain** (Indian cities me real).
> Status repo scan (models/pages ke naam) se liya hai — **depth/quality verify nahi ki**, isliye ✅ ka matlab "module dikha", "fully complete" nahi.
>
> | Status | Matlab |
> |---|---|
> | ✅ | Repo me model/page/route dikha |
> | 🟡 | Partial (kuch hai, poora nahi / sirf tag ya sub-feature) |
> | ❌ | Nahi mila |
>
> **Tier** (data sensitivity → security controls):
> **T1** = PHI / sabse sensitive · **T2** = health-adjacent · **T3** = commerce / wellness (medical data yahan mat laao)
>
> **Phase:** 1 = abhi · 2 = agla · 3 = commerce/compliance-heavy · 4 = sensitive/regulated
>
> **Regulatory tags (verify with lawyer, state-wise alag ho sakta hai):**
> CEA = Clinical Establishments Act/state registration · DL = Drug License · CDSCO = devices/cosmetics ·
> FSSAI = food · AYUSH = council/state board · RCI = Rehabilitation Council · NMC = telemedicine/doctor registration ·
> PCPNDT/AERB = ultrasound/radiology · ART = IVF Act 2021 · MHCA = Mental Healthcare Act 2017 · BMW = bio-medical waste ·
> NABL/NABH = optional quality accreditation · DPDP = data protection

---

## 1. Healthcare facilities (clinical)

| Category | Examples | Status | Tier | Phase | Reg |
|---|---|---|---|---|---|
| Hospital (multi-specialty) | Private/trust/corporate | ✅ Hospital | T1 | 1 | CEA, BMW, fire NOC |
| Clinic / polyclinic | Single/multi-doctor OPD | ✅ ClinicProfile | T1 | 1 | CEA |
| Nursing home / maternity home | Small IPD, delivery | 🟡 (Hospital type) | T1 | 2 | CEA |
| Day-care / surgery center | Cataract, laparoscopy, endoscopy | ❌ | T1 | 2 | CEA |
| Government hospital / district hospital | Civil hospital, medical-college hospital | ❌ | T1 | 1 | — |
| PHC / CHC / UPHC | Primary health centers | ❌ | T1 | 1 | — |
| Ayushman Arogya Mandir (ex-HWC) | Sub-centre level | ❌ | T1 | 1 | — |
| Mohalla / community clinic | Delhi-type free clinics | ❌ | T1 | 2 | — |
| Telemedicine-only clinic | Online practice | 🟡 DoctorConsultation | T1 | 1 | NMC telemedicine |
| Urgent-care / 24x7 clinic | Walk-in | ❌ | T1 | 2 | CEA |
| Corporate / industrial clinic | Factory/office dispensary | ❌ | T1 | 3 | CEA |
| Campus / school / college clinic | Student health center | ❌ | T1 | 3 | — |
| Railway / ESI / CGHS / defence hospital & dispensary | Scheme-based facilities | ❌ | T1 | 3 | — |
| Medical college & teaching hospital | Referral/tertiary | ❌ | T1 | 3 | NMC |

## 2. Doctors & specialties

| Category | Status | Tier | Phase |
|---|---|---|---|
| Doctor profiles (OPD, slots, fees, online consult) | ✅ Doctor | T1 | 1 |
| General physician / family doctor | ✅ (specialty tag) | T1 | 1 |
| Specialties (tag/filter): Cardiology, Orthopaedics, Gynaecology & Obstetrics, Paediatrics, Dermatology, ENT, Ophthalmology, Dental/Oral, Neurology, Neurosurgery, Psychiatry, Gastroenterology, Hepatology, Nephrology, Urology, Pulmonology/Chest, Endocrinology/Diabetology, Rheumatology, Oncology (Medical/Surgical/Radiation), Haematology, General Surgery, Plastic & Reconstructive, Vascular, CTVS, Anaesthesia/Pain, Radiology, Pathology, Emergency Medicine, Geriatrics, Sports Medicine, Sexology/Andrology, Infertility, Neonatology, Paediatric Surgery, Nuclear Medicine, Physical Medicine & Rehab, Occupational Medicine, Palliative Medicine, Sleep Medicine, Allergy & Immunology, Infectious Disease, Clinical Genetics | 🟡 (verify list coverage) | T1 | 1 |
| Second-opinion service | ❌ | T1 | 2 |
| Home-visit doctor | ❌ | T1 | 2 |
| Doctor Q&A / e-consult chat | 🟡 ChatPage | T1 | 2 |
| Hospital-employed vs independent practitioner linkage | ✅ (facility ↔ doctor) | T1 | 1 |

## 3. Diagnostics

| Category | Examples | Status | Tier | Phase | Reg |
|---|---|---|---|---|---|
| Pathology lab | Blood/urine/stool tests | ✅ Lab/Test | T1 | 1 | CEA, NABL(opt) |
| Radiology / imaging centre | X-ray, CT, MRI, USG | ✅ Radiology | T1 | 1 | AERB, PCPNDT |
| Health packages | Full-body, senior, women, cardiac | ✅ HealthPackage | T1 | 1 | — |
| Lab booking / orders | Slot + report | ✅ LabBooking/LabOrder | T1 | 1 | — |
| Home sample collection (phlebotomist) | Pickup at home | 🟡 (verify) | T1 | 1 | — |
| Collection centres / franchise | Lab network | ❌ | T1 | 2 | — |
| Cardiac diagnostics | ECG, Echo, TMT, Holter | ❌ | T1 | 2 | CEA |
| Sleep study, PFT, EEG/EMG, Audiometry | Specialised diagnostics | ❌ | T1 | 3 | CEA |
| Genetic / NIPT / molecular labs | Advanced tests | ❌ | T1 | 4 | PCPNDT (care) |
| Mobile diagnostic van / camp lab | Camps | ❌ | T1 | 2 | — |
| Report storage + trends | Records | ✅ Record/PDFReports | T1 | 1 | DPDP |
| Dental / eye / hearing diagnostic centres | OPG, OCT, audiometry | ❌ | T1 | 2 | — |

## 4. Pharmacy & medicines

| Category | Examples | Status | Tier | Phase | Reg |
|---|---|---|---|---|---|
| Retail pharmacy / medical store | Local chemist | ✅ Pharmacy | T1 | 1 | DL + pharmacist |
| Medicine catalog + search | Brand/generic/salt | ✅ Medicine | T2 | 1 | — |
| Prescription orders + delivery | Upload Rx, deliver | ✅ PharmacyOrder/Delivery | T1 | 1 | DL |
| Returns / offers / preferred pharmacy | — | ✅ | T2 | 1 | — |
| Medicine reminders / dose log | Adherence | ✅ | T1 | 1 | — |
| Jan Aushadhi Kendra | PMBJP generics | ❌ | T2 | 1 | PMBJP |
| Wholesale / distributor / stockist | B2B supply | 🟡 Supplier/PurchaseOrder | T3 | 3 | DL wholesale |
| Hospital pharmacy / in-house | IPD pharmacy | 🟡 | T1 | 1 | DL |
| Chronic-medicine refill subscription | Monthly auto-refill | ❌ | T1 | 2 | DL |
| Cold-chain medicines (insulin, vaccines) | Temperature-controlled | ❌ | T1 | 3 | DL |
| Ayurvedic / homeopathic medicine stores | AYUSH pharmacy | ❌ | T2 | 2 | AYUSH |
| Surgical / ortho store | Braces, belts, footwear | ❌ | T3 | 2 | — |
| Veterinary pharmacy | Pets | ❌ | T3 | 4 | DL |
| Medicine disposal / take-back | Expired meds | ❌ | T3 | 4 | — |
| Drug interaction / fake-medicine checker | Safety tools | 🟡 (AI safety events) | T2 | 2 | — |

## 5. Emergency & critical care

| Category | Status | Tier | Phase |
|---|---|---|---|
| SOS / emergency request + doctor request | ✅ Emergency/EmergencyRequest | T1 | 1 |
| Ambulance (BLS/ALS, tracking) | ✅ Ambulance/RideTracking | T1 | 1 |
| Blood bank + blood request | ✅ BloodBank | T1 | 1 |
| Donor directory (blood/plasma) | 🟡 | T1 | 1 |
| ICU / bed / OT availability | ✅ Bed/OperationTheatre | T1 | 1 |
| Non-emergency patient transport | ❌ | T1 | 2 |
| Air ambulance | ❌ | T1 | 4 |
| Trauma centres / burn units / poison centres | ❌ | T1 | 3 |
| Oxygen cylinder / concentrator supply | ❌ | T2 | 1 |
| Freezer box / mortuary van | ❌ | T2 | 4 |
| Helpline directory (112, 108, 102, Tele-MANAS 14416, poison, women/child helplines) | ❌ | T3 | 1 |
| First-responder / CPR volunteers | ❌ | T2 | 3 |

## 6. AYUSH & traditional / integrative

| Category | Status | Tier | Phase | Reg |
|---|---|---|---|---|
| Ayurveda clinics / hospitals | ❌ | T1 | 1 | AYUSH |
| Panchakarma centres | ❌ | T1 | 1 | AYUSH |
| Homeopathy clinics | ❌ | T1 | 1 | AYUSH |
| Unani / Siddha clinics | ❌ | T1 | 2 | AYUSH |
| Naturopathy & yoga hospitals | ❌ | T1 | 2 | AYUSH |
| Acupuncture / acupressure / cupping | ❌ | T2 | 3 | state rules |
| Reiki / energy healing | ❌ | T3 | 4 | (claims par saavdhaan) |
| Sowa-Rigpa / folk practitioners | ❌ | T2 | 4 | AYUSH |

## 7. Specialty centres

| Category | Status | Tier | Phase | Reg |
|---|---|---|---|---|
| Dental clinic / orthodontics / implants | ❌ | T1 | 1 | CEA, DCI |
| Eye hospital / LASIK / cataract | ❌ | T1 | 1 | CEA |
| Optical shop (spectacles, lenses) | ❌ | T3 | 1 | — |
| ENT / audiology / hearing-aid centre | ❌ | T1 | 2 | RCI (audiologist) |
| Dialysis centre | ❌ | T1 | 2 | CEA |
| Cancer / chemo / radiotherapy centre | ❌ | T1 | 3 | AERB, CEA |
| Cardiac cath-lab / heart institute | ❌ | T1 | 3 | CEA |
| Orthopaedic / joint-replacement / spine centre | ❌ | T1 | 2 | CEA |
| Diabetes / thyroid / endocrine centre | ❌ | T1 | 2 | CEA |
| Skin / hair / laser / cosmetology clinic | ❌ | T1 | 3 | CEA (claims) |
| Plastic / cosmetic surgery centre | ❌ | T1 | 4 | CEA |
| Sleep clinic | ❌ | T1 | 3 | CEA |
| Pain clinic | ❌ | T1 | 3 | CEA |
| Wound-care / diabetic-foot clinic | ❌ | T1 | 3 | CEA |
| Urology / kidney-stone (lithotripsy) | ❌ | T1 | 3 | CEA |
| Transplant centres | ❌ | T1 | 4 | THOA |
| Sexual-health clinic | ❌ | T1 | 4 | CEA (discreet) |
| Travel-medicine / vaccination clinic | ❌ | T1 | 3 | CEA |

## 8. Mental & emotional health

| Category | Status | Tier | Phase | Reg |
|---|---|---|---|---|
| Psychiatrist | 🟡 | T1 | 1 | NMC/MHCA |
| Psychologist / counsellor / therapist | ✅ MentalHealth | T1 | 1 | RCI (clinical) |
| De-addiction / rehabilitation centres | ❌ | T1 | 4 | MHCA, state |
| Support groups (cancer, diabetes, grief, AA/NA, caregivers) | ❌ | T1 | 3 | — |
| Helplines (Tele-MANAS etc.) | ❌ | T3 | 1 | — |
| Meditation / mindfulness programs | ❌ | T3 | 2 | — |
| Student / workplace stress programs | ❌ | T2 | 3 | — |
| Child & adolescent counselling | ❌ | T1 | 3 | RCI |
| Couple / family / marriage counselling | ❌ | T1 | 3 | RCI |
| Career / life coaching (non-clinical) | ❌ | T3 | 4 | (clinical claims nahi) |

## 9. Rehab & therapy

| Category | Status | Tier | Phase | Reg |
|---|---|---|---|---|
| Physiotherapy clinic / home physio | ✅ Physiotherapy | T1 | 1 | allied-health reg |
| Sports-injury rehab | ❌ | T1 | 2 | — |
| Stroke / neuro rehab | ❌ | T1 | 2 | — |
| Cardiac / pulmonary rehab | ❌ | T1 | 3 | — |
| Occupational therapy | ❌ | T1 | 2 | RCI/allied |
| Speech & language therapy | ❌ | T1 | 2 | RCI |
| Child development / autism / ADHD / special-education centres | ❌ | T1 | 2 | RCI |
| Prosthetics & orthotics centre | ❌ | T2 | 3 | RCI |
| Pain / chiropractic / manual therapy | ❌ | T2 | 3 | state rules |
| Post-surgery / post-accident rehab at home | ❌ | T1 | 2 | — |
| Vision / hearing rehab | ❌ | T1 | 3 | RCI |

## 10. Women, maternity & child

| Category | Status | Tier | Phase | Reg |
|---|---|---|---|---|
| Gynaecologist / obstetrician | 🟡 (specialty) | T1 | 1 | — |
| Maternity / delivery hospital | 🟡 | T1 | 2 | CEA |
| IVF / fertility clinic | ❌ | T1 | 4 | ART Act |
| Antenatal / postnatal care programs | ❌ | T1 | 2 | — |
| Prenatal yoga / lactation consultant / doula | ❌ | T2 | 3 | — |
| Paediatrician / neonatal care | 🟡 | T1 | 1 | — |
| Vaccination centres + schedule tracker | ❌ | T1 | 1 | UIP |
| Child growth & milestone tracking | ❌ | T1 | 2 | — |
| Menstrual / PCOS / menopause programs | ❌ | T1 | 3 | — |
| Women-only clinics / women-doctor filter | ❌ | T3 | 2 | — |
| Cord-blood banks | ❌ | T2 | 4 | licensing |
| Adolescent / school health | ❌ | T1 | 3 | — |

## 11. Elderly & long-term care

| Category | Status | Tier | Phase | Reg |
|---|---|---|---|---|
| Caregiver / attendant booking | ✅ AssistantProfile/BookAssistant | T2 | 1 | — |
| Family members + shared dashboard | ✅ FamilyMember | T1 | 1 | DPDP |
| Home nursing | ❌ | T1 | 1 | — |
| Elder-care / assisted-living homes | ❌ | T2 | 3 | state |
| Dementia / Alzheimer's care | ❌ | T1 | 3 | — |
| Palliative / hospice care | ❌ | T1 | 3 | — |
| Fall-detection / personal emergency devices | ❌ | T2 | 3 | CDSCO (device) |
| Senior health packages | ✅ (HealthPackage) | T1 | 1 | — |
| Geriatric physio / daycare centres | ❌ | T2 | 3 | — |
| Companion / senior social clubs | ❌ | T3 | 4 | — |
| Medication + vitals monitoring for remote family | ✅ (VitalsLog/MedicineReminder) | T1 | 1 | — |

## 12. Chronic-disease & lifestyle programs

| Category | Status | Tier | Phase |
|---|---|---|---|
| Chronic care plans | ✅ ChronicCarePlan | T1 | 1 |
| Vitals logging + reminders | ✅ VitalsLog/VitalsReminder | T1 | 1 |
| Diabetes program (glucometer/CGM, dietitian, doctor) | 🟡 | T1 | 2 |
| Hypertension / heart program | 🟡 | T1 | 2 |
| Thyroid / PCOS / obesity / weight-management | ❌ | T1 | 2 |
| Asthma / COPD | ❌ | T1 | 3 |
| Kidney (CKD) program | ❌ | T1 | 3 |
| Arthritis / back-pain program | ❌ | T1 | 3 |
| Cancer survivorship / follow-up | ❌ | T1 | 4 |
| De-addiction / quit-smoking / quit-alcohol | ❌ | T1 | 3 |
| Digital therapeutics / coaching subscriptions | ❌ | T2 | 3 |

## 13. Nutrition & food

| Category | Status | Tier | Phase | Reg |
|---|---|---|---|---|
| Diet kitchen / meal plans | ✅ DietKitchen/DietOrder | T2 | 1 | FSSAI |
| Hospital diet (inpatient) | 🟡 | T1 | 1 | FSSAI |
| Dietitian / nutritionist | ❌ | T1/T2 | 1 | RD/IDA |
| Diabetic / renal / cardiac / keto / weight-loss meals | 🟡 | T2 | 2 | FSSAI |
| Healthy tiffin / cloud kitchen | ❌ | T3 | 2 | FSSAI |
| Organic / millet / health-food stores | ❌ | T3 | 3 | FSSAI |
| Supplements, protein, vitamins | ❌ | T3 | 3 | FSSAI nutraceutical |
| Baby food / infant formula | ❌ | T3 | 4 | FSSAI + IMS Act |
| Elder / dysphagia / tube-feeding nutrition | ❌ | T2 | 3 | FSSAI |
| Safe-water (RO, purifier service) | ❌ | T3 | 4 | BIS |
| Cooking classes / nutrition workshops | ❌ | T3 | 3 | — |

## 14. Fitness & wellness

| Category | Status | Tier | Phase | Reg |
|---|---|---|---|---|
| Gym / fitness centre | ❌ | T3 | 2 | GST, shop est. |
| Yoga studio / teacher / camp | ❌ | T3 | 2 | YCB (cert) |
| Zumba / aerobics / Pilates / dance / martial arts | ❌ | T3 | 3 | — |
| Sports academy / swimming / turf | ❌ | T3 | 3 | — |
| Personal trainer / online coach | ❌ | T3 | 2 | — |
| Wellness centre / retreat / spa (wellness side) | ❌ | T3 | 2 | — |
| Meditation / pranayama / sleep programs | ❌ | T3 | 2 | — |
| Corporate wellness programs | ❌ | T3 | 3 | — |
| Fitness trackers / smartwatch integration | ❌ | T2 | 3 | CDSCO (if medical claim) |
| Running clubs / walkathons / challenges | ❌ | T3 | 3 | — |
| Sports-medicine / injury prevention | ❌ | T1 | 3 | — |
| Fitness-challenge rewards (loyalty) | 🟡 Loyalty/Rewards exist | T3 | 2 | — |

## 15. Skin, hair & personal care

| Category | Status | Tier | Phase | Reg |
|---|---|---|---|---|
| Dermatologist / skin clinic | ❌ | T1 | 2 | CEA |
| Hair-fall / trichology / hair transplant | ❌ | T1 | 3 | CEA |
| Dermatology / skincare products (sunscreen, moisturiser, medicated) | ❌ | T3 | 3 | CDSCO cosmetics |
| Cosmetology / laser / aesthetics | ❌ | T1 | 4 | CEA, ad rules |
| Baby care / feminine hygiene / oral care / grooming | ❌ | T3 | 3 | CDSCO/BIS |
| Ayurvedic / herbal personal care | ❌ | T3 | 3 | AYUSH |
| Ayurvedic spa / massage (wellness) | ❌ | T3 | 3 | — |
| Salon (hygiene-focused) | ❌ | T3 | 4 | — |
| Tattoo / piercing safety | ❌ | T3 | 4 | — |

## 16. Medical devices & supplies

| Category | Status | Tier | Phase | Reg |
|---|---|---|---|---|
| Hospital equipment / asset tracking (internal) | ✅ Equipment/Inventory | T1 | 1 | — |
| Home devices: BP monitor, glucometer, oximeter, thermometer, nebuliser | ❌ | T2/T3 | 3 | MDR 2017 |
| Respiratory: CPAP/BiPAP, oxygen concentrator | ❌ | T2 | 2 | MDR 2017 |
| Mobility: wheelchair, walker, crutches, commode | ❌ | T3 | 1 | — |
| Hospital bed / air mattress (rent/sale) | ❌ | T3 | 1 | — |
| Hearing aids | ❌ | T2 | 3 | MDR 2017, RCI |
| Spectacles / contact lenses | ❌ | T3 | 1 | — |
| Ortho: braces, belts, diabetic footwear, compression stockings | ❌ | T3 | 2 | — |
| Wound care / dressing / incontinence / diapers | ❌ | T3 | 2 | — |
| Home-test kits (pregnancy, dengue, covid, glucose) | ❌ | T3 | 3 | CDSCO |
| First-aid kits | ❌ | T3 | 2 | — |
| Masks, sanitiser, PPE | ❌ | T3 | 3 | BIS/CDSCO |
| Rental marketplace (equipment on rent) | ❌ | T3 | 2 | — |
| Surgical / OT consumables (B2B) | 🟡 Supplier/PurchaseOrder | T3 | 3 | — |

## 17. Preventive & public health (camps, events, workshops)

| Category | Status | Tier | Phase |
|---|---|---|---|
| Health camps (general checkup, eye, dental, diabetes) | ❌ | T2 | 2 |
| Vaccination drives | ❌ | T1 | 2 |
| Blood-donation drives | 🟡 (BloodBank) | T2 | 2 |
| Awareness workshops / webinars (Heart Day, Diabetes Day, etc.) | 🟡 Announcement | T3 | 2 |
| Yoga Day / wellness events / walkathons | ❌ | T3 | 2 |
| CPR / first-aid / BLS training | ❌ | T3 | 2 |
| Screening programs (cancer, TB, anaemia, BP) | ❌ | T1 | 3 |
| School / college health programs | ❌ | T2 | 3 |
| Corporate / RWA / community camps | ❌ | T2 | 2 |
| Event calendar + registration + reminders | ❌ | T3 | 2 |
| Seasonal alerts (dengue, flu, heatwave, air quality) | ❌ | T3 | 3 |
| Disease surveillance / outbreak alerts (gov feed) | ❌ | T3 | 4 |
| Health survey / research participation (consent) | ❌ | T1 | 4 |

## 18. Government & schemes

| Category | Status | Tier | Phase |
|---|---|---|---|
| Ayushman Bharat PM-JAY empanelled hospitals (filter) | ❌ | T3 | 1 |
| ABHA / ABDM health ID + consent | ✅ (ABDM consent in SECURITY.md) | T1 | 1 |
| State schemes (e.g., Chiranjeevi-type, CGHS, ESI) info + eligibility | ❌ | T3 | 2 |
| Govt hospital OPD queue/token info | 🟡 OPDToken | T2 | 2 |
| Free-medicine lists / Jan Aushadhi | ❌ | T3 | 1 |
| Maternal & child schemes (JSY, PMMVY) info | ❌ | T3 | 3 |
| Disability certificate / UDID help | ❌ | T2 | 4 |
| Birth / death certificate guidance | ❌ | T3 | 4 |
| Medical board / council verification lookup | 🟡 (License model) | T3 | 2 |
| Grievance redressal | ✅ GrievanceRedressal | T2 | 1 |

## 19. Finance, insurance & legal

| Category | Status | Tier | Phase |
|---|---|---|---|
| Health insurance (policies, claims) | ✅ Insurance | T1 | 1 |
| TPA / cashless desk | 🟡 | T1 | 2 |
| Billing / payments / refunds / payouts | ✅ Billing/Payment/Refund/Payout | T1 | 1 |
| Wallet / loyalty / rewards / referral / coupons | ✅ | T2 | 1 |
| Medical EMI / treatment loans | ❌ | T2 | 3 |
| Crowdfunding / NGO assistance / charity | ❌ | T2 | 4 |
| Medical lawyer / consumer-court help | ✅ LawyerProfile/LawyerBooking | T2 | 1 |
| Patient rights info | ✅ PatientRights | T3 | 1 |
| Medico-legal case (MLC) workflows | ✅ (Triage MLC) | T1 | 1 |
| Insurance comparison / advisor | ❌ | T3 | 3 |
| Claims-fraud detection (internal) | ❌ | T1 | 4 |

## 20. End-of-life & after-care

| Category | Status | Tier | Phase |
|---|---|---|---|
| Palliative / hospice | ❌ | T1 | 3 |
| Mortuary / freezer box / hearse | ❌ | T2 | 4 |
| Cremation / funeral services | ❌ | T3 | 4 |
| Organ / eye / body donation pledge | ❌ | T1 | 4 |
| Grief counselling / bereavement support | ❌ | T1 | 4 |
| Death certificate / legal-heir help | ❌ | T3 | 4 |

## 21. Education, content & community

| Category | Status | Tier | Phase |
|---|---|---|---|
| Verified health articles / videos | ✅ PlatformContent | T3 | 1 |
| Courses (CPR, nutrition, yoga-teacher, caregiver training) | ❌ | T3 | 3 |
| Webinars / live Q&A with doctors | ❌ | T3 | 2 |
| Community forums / patient groups | ❌ | T2 | 3 |
| Reviews & ratings | ✅ Review | T3 | 1 |
| Medical-student / professional learning (CME) | ❌ | T3 | 4 |
| Multilingual content (Hindi + regional) | 🟡 | T3 | 1 |
| AI chat / symptom triage | ✅ AIChatPage/TriagePage | T1 | 1 |
| Myth-busting / fact-check | ❌ | T3 | 3 |

## 22. Home services

| Category | Status | Tier | Phase |
|---|---|---|---|
| Home sample collection | 🟡 | T1 | 1 |
| Home nursing / attendant | 🟡 | T1 | 1 |
| Home doctor visit | ❌ | T1 | 2 |
| Home physio / home therapy | 🟡 | T1 | 1 |
| Home vaccination | ❌ | T1 | 3 |
| Home ICU setup | ❌ | T1 | 3 |
| Home medicine / lab / equipment delivery | ✅ (delivery) | T1 | 1 |
| Housekeeping / sanitation (hospital) | ✅ Housekeeping | T3 | 1 |
| Pest control / disinfection (health) | ❌ | T3 | 4 |
| Telehealth at home (devices + monitoring) | 🟡 | T1 | 3 |

## 23. Transport & logistics

| Category | Status | Tier | Phase |
|---|---|---|---|
| Ambulance + tracking | ✅ | T1 | 1 |
| Ride / vehicle for patients | ✅ FindVehicle/RideBooking/Vehicle | T2 | 1 |
| Delivery partners / riders | ✅ DeliveryPartner/RiderProfile | T2 | 1 |
| Non-emergency patient transport | ❌ | T1 | 2 |
| Medical courier (samples, reports, organs) | ❌ | T2 | 3 |
| Cold-chain logistics | ❌ | T2 | 4 |
| Patient + attendant travel / stay (near hospitals) | ❌ | T3 | 4 |
| Medical tourism facilitation | ❌ | T2 | 4 |

## 24. Hospital / clinic operations (B2B back-office — repo me kaafi hai)

| Module | Status |
|---|---|
| OPD registration / token / queue | ✅ OPDRegistration/OPDToken |
| IPD / admissions / beds / nursing charts | ✅ IPD/Admission/Bed/NursingChart |
| Operation theatre scheduling | ✅ OperationTheatre |
| Departments / staff / leave / schedule | ✅ Department/Staff/LeaveRequest/ScheduleChangeRequest |
| Billing / commission / payouts | ✅ Billing/CommissionConfig/Payout |
| Inventory / suppliers / purchase orders | ✅ |
| Prescriptions + integrity | ✅ Prescription |
| Records + versions + amendments | ✅ Record/RecordVersion |
| Housekeeping, diet, equipment | ✅ |
| Referrals, waitlist, recurring appointments | ✅ Referral/WaitlistEntry/AppointmentSeries |
| Licenses / KYC / approvals | ✅ License/PendingApproval |
| Integrations (HL7/FHIR, lab machines, PACS) | 🟡 IntegrationConfig |
| Analytics / dashboards | 🟡 |
| HR / payroll / attendance | ❌ |
| Asset maintenance / biomedical equipment calibration (AMC) | ❌ |
| Bio-medical waste tracking | ❌ |
| Fire / safety / NABH compliance checklists | ❌ |
| Quality / incident reporting | ❌ |
| Marketing: featured listings, announcements, coupons | ✅ FeaturedListing/Announcement/PlatformCoupon |

## 25. B2B / institutional customers

| Category | Status | Tier | Phase |
|---|---|---|---|
| Corporate employee health (OPD plans, checkups) | ❌ | T1 | 3 |
| Insurers / TPAs integration | 🟡 | T1 | 3 |
| Schools / colleges / hostels | ❌ | T2 | 3 |
| NGOs / CSR / trusts / RWA | ❌ | T2 | 3 |
| Pharma companies (compliant awareness, no doctor-data sale) | ❌ | T3 | 4 |
| Medical-device companies | ❌ | T3 | 4 |
| Diagnostic franchise networks | ❌ | T2 | 3 |
| Government health departments (data/analytics, anonymized) | ❌ | T2 | 4 |
| Research / clinical-trial recruitment (consent) | ❌ | T1 | 4 |

## 26. Environment, safety & adjacent

| Category | Status | Tier | Phase |
|---|---|---|---|
| Air-quality / heat / pollen health alerts | ❌ | T3 | 3 |
| Water / sanitation / vector control info | ❌ | T3 | 4 |
| Workplace health & safety / occupational health | ❌ | T2 | 4 |
| Road-safety / accident-first-aid | ❌ | T3 | 3 |
| Pet / veterinary care (adjacent) | ❌ | T3 | 4 |
| Home safety for elderly / child-proofing | ❌ | T3 | 4 |
| Travel-health advisories / vaccination for travel | ❌ | T2 | 4 |

## 27. Cross-cutting platform capabilities (sab categories ke liye)

| Capability | Status |
|---|---|
| Multi-city / service-city management | ✅ City/ServiceCity |
| Unified search + filters (city, area, open-now, home-visit, Ayushman, price, language, women-friendly) | 🟡 |
| Appointments / booking / waitlist | ✅ |
| Payments, wallet, refunds, loyalty | ✅ |
| Notifications (push, SMS, email) + preferences | ✅ |
| Chat + video (LiveKit) | ✅ ChatPage / 🟡 video |
| Records + consent + ABHA | ✅ |
| AI triage / assistant + safety events | ✅ |
| Reviews + disputes + support tickets | ✅ Review/Dispute/SupportTicket |
| Provider onboarding + verification + moderation queue | 🟡 License/PendingApproval — **type-wise checklists add karo** |
| Events/programs/subscriptions engine | ❌ |
| Generic Provider + Product/Catalog (type + category + regulatory fields) | 🟡 Facility/ClinicProfile |
| Audit, RBAC, tenant isolation, DPDP consent | ✅ |
| Localization (Hindi + regional) | 🟡 |
| Accessibility (screen reader, large-font, voice) — elderly | ❌ |
| Offline/low-bandwidth mode (tier-2/3 cities) | ❌ |
| Public APIs / partner integrations | 🟡 |

---

## Summary: Phase-wise kya pakadna hai

**Phase 1 (high demand, kam friction):**
Dental · Eye + Optical · Dietitian · AYUSH clinics · Home sample collection · Home nursing · Equipment rent/sale (wheelchair, bed, oxygen) · Jan Aushadhi · Govt PHC/UPHC/Arogya Mandir · PM-JAY filter · Helpline directory · Government hospitals

**Phase 2:**
Gym / Yoga / Wellness · Health camps + events engine · Diabetes/BP programs · Women & child (vaccination tracker, antenatal) · Elder care · Dialysis · Ortho/spine · Child therapy centres · Dermatology · Home doctor visit · Non-emergency transport · Second opinion

**Phase 3:**
Supplements / health food / skincare / devices marketplace (FSSAI/CDSCO) · Cancer/cardiac centres · Corporate wellness · Courses · Community forums · Medical EMI · Alerts (AQI/dengue)

**Phase 4 (sensitive / heavily regulated):**
IVF · De-addiction · Palliative/hospice · Mortuary/funeral · Organ pledge · Transplant · Cosmetic surgery · Medical tourism · Research recruitment · Pharma/device B2B

---

## Rules (har nayi category par)

1. **Tier ke hisaab se security:** T1 par full stack (authz, tenant scope, field encryption, audit, step-up). T3 (gym, store) ko patient ka medical data **kabhi** mat dikhao.
2. **Type-wise verification documents** mandatory; unverified listing "verified" dikhe hi nahi.
3. **Health claims moderate karo** (cure/weight-loss/cosmetic/sexual-health) — ad rules + Consumer Protection Act.
4. **Products bechne par** FSSAI/CDSCO fields (`licenseNo`, `batch`, `expiry`, `claims`) aur return/recall flow.
5. **Sensitive categories** (mental health, de-addiction, fertility, HIV/STD, sexual health) me discreet notifications + masked listings.
6. **Ek-ek phase launch karo**, ek city se; quality aur compliance pehle.
7. Regulation state-wise alag hota hai — launch se pehle local lawyer/consultant se confirm karo.

*Status column code scan se aaya hai; kisi module ko ✅ kehne ka matlab sirf ye hai ki model/page dikha. Actual coverage/quality aap verify karo.*