/**
 * §2.2–2.5 Practitioner groups — PRO.AYUSH / PRO.ALLIED / PRO.MH / PRO.WELL.
 * Sibling groups of the existing PRO.PRACTITIONER subtree.
 * Sources: subcatogary.md §2.2 (AYUSH), §2.3 (Allied), §2.4 (MH — sensitive),
 * §2.5 (Wellness). Practitioner profiles are always tier T1 (PHI surface).
 */

export const PRO_CATEGORY_NODES = Object.freeze([
  // ─── §2.2 AYUSH practitioners ───────────────────────────────────────────────
  { code: 'PRO.AYUSH', name: 'AYUSH Practitioners', nameHi: 'आयुष चिकित्सक', aliases: ['AYUSH Doctors', 'Traditional Medicine Practitioners'], parent: null, type: 'provider_type', tier: 'T1', kind: 'Practitioner' },
  { code: 'PRO.AYUSH.AYURVEDA', name: 'Ayurveda Doctor (BAMS)', nameHi: 'आयुर्वेद चिकित्सक', aliases: ['BAMS Doctor', 'Ayurvedic Physician', 'Vaidya'], parent: 'PRO.AYUSH', type: 'provider_type', tier: 'T1', regulatedBy: ['NCISM'], kind: 'Practitioner' },
  { code: 'PRO.AYUSH.AYURVEDA.KAYACHIKITSA', name: 'Kayachikitsa (General Medicine)', nameHi: 'कायचिकित्सा', aliases: ['Ayurveda Internal Medicine'], parent: 'PRO.AYUSH.AYURVEDA', type: 'provider_type', tier: 'T1', regulatedBy: ['NCISM'], kind: 'Practitioner' },
  { code: 'PRO.AYUSH.AYURVEDA.PANCHAKARMA', name: 'Panchakarma Specialist', nameHi: 'पंचकर्म विशेषज्ञ', aliases: ['Panchakarma Doctor', 'Detox Therapy Specialist'], parent: 'PRO.AYUSH.AYURVEDA', type: 'provider_type', tier: 'T1', regulatedBy: ['NCISM'], kind: 'Practitioner' },
  { code: 'PRO.AYUSH.AYURVEDA.SHALYA', name: 'Shalya Tantra (Surgery)', nameHi: 'शल्य तंत्र', aliases: ['Ayurveda Surgeon', 'Kshar Sutra Specialist'], parent: 'PRO.AYUSH.AYURVEDA', type: 'provider_type', tier: 'T1', regulatedBy: ['NCISM'], kind: 'Practitioner' },
  { code: 'PRO.AYUSH.AYURVEDA.SHALAKYA', name: 'Shalakya Tantra (ENT & Eye)', nameHi: 'शालाक्य तंत्र', aliases: ['Ayurveda ENT', 'Ayurveda Ophthalmology'], parent: 'PRO.AYUSH.AYURVEDA', type: 'provider_type', tier: 'T1', regulatedBy: ['NCISM'], kind: 'Practitioner' },
  { code: 'PRO.AYUSH.AYURVEDA.PRASUTI', name: 'Prasuti Tantra & Stri Roga', nameHi: 'प्रसूति तंत्र एवं स्त्री रोग', aliases: ['Ayurveda Gynaecology', 'Ayurveda Obstetrics'], parent: 'PRO.AYUSH.AYURVEDA', type: 'provider_type', tier: 'T1', regulatedBy: ['NCISM'], kind: 'Practitioner' },
  { code: 'PRO.AYUSH.AYURVEDA.KAUMARBHRITYA', name: 'Kaumarbhritya (Paediatrics)', nameHi: 'कौमारभृत्य', aliases: ['Ayurveda Child Care', 'Ayurveda Paediatrics'], parent: 'PRO.AYUSH.AYURVEDA', type: 'provider_type', tier: 'T1', regulatedBy: ['NCISM'], kind: 'Practitioner' },
  { code: 'PRO.AYUSH.AYURVEDA.SWASTHAVRITTA', name: 'Swasthavritta & Yoga', nameHi: 'स्वास्थ्यवृत्त एवं योग', aliases: ['Ayurveda Preventive Care', 'Ayurveda Lifestyle'], parent: 'PRO.AYUSH.AYURVEDA', type: 'provider_type', tier: 'T1', regulatedBy: ['NCISM'], kind: 'Practitioner' },
  { code: 'PRO.AYUSH.HOMOEOPATHY', name: 'Homoeopathy Doctor (BHMS)', nameHi: 'होम्योपैथी चिकित्सक', aliases: ['BHMS Doctor', 'Homeopathic Physician', 'Homeopath'], parent: 'PRO.AYUSH', type: 'provider_type', tier: 'T1', regulatedBy: ['NCISM'], kind: 'Practitioner' },
  { code: 'PRO.AYUSH.UNANI', name: 'Unani Doctor (BUMS)', nameHi: 'यूनानी चिकित्सक', aliases: ['BUMS Doctor', 'Unani Physician', 'Hakim'], parent: 'PRO.AYUSH', type: 'provider_type', tier: 'T1', regulatedBy: ['NCISM'], kind: 'Practitioner' },
  { code: 'PRO.AYUSH.SIDDHA', name: 'Siddha Doctor', nameHi: 'सिद्ध चिकित्सक', aliases: ['Siddha Physician', 'Siddha Vaidya'], parent: 'PRO.AYUSH', type: 'provider_type', tier: 'T1', regulatedBy: ['NCISM'], kind: 'Practitioner' },
  { code: 'PRO.AYUSH.NATUROPATHY', name: 'Naturopathy Doctor (BNYS)', nameHi: 'नेचरोपैथी चिकित्सक', aliases: ['BNYS Doctor', 'Naturopath', 'Nature Cure Doctor'], parent: 'PRO.AYUSH', type: 'provider_type', tier: 'T1', regulatedBy: ['NCISM'], kind: 'Practitioner' },
  { code: 'PRO.AYUSH.YOGA_THERAPY', name: 'Yoga Therapist', nameHi: 'योग चिकित्सक', aliases: ['Yoga Therapy Expert', 'Therapeutic Yoga'], parent: 'PRO.AYUSH', type: 'provider_type', tier: 'T1', kind: 'Practitioner' },

  // ─── §2.3 Allied health professionals ───────────────────────────────────────
  { code: 'PRO.ALLIED', name: 'Allied Health Professionals', nameHi: 'एलाइड हेल्थ पेशेवर', aliases: ['Allied Health', 'Paramedical Professionals'], parent: null, type: 'provider_type', tier: 'T1', kind: 'Practitioner' },
  { code: 'PRO.ALLIED.PHYSIO', name: 'Physiotherapist (BPT / MPT)', nameHi: 'फिजियोथेरेपिस्ट', aliases: ['Physical Therapist', 'PT', 'Musculoskeletal Physio'], parent: 'PRO.ALLIED', type: 'provider_type', tier: 'T1', kind: 'Practitioner' },
  { code: 'PRO.ALLIED.OT', name: 'Occupational Therapist', nameHi: 'ऑक्यूपेशनल थेरेपिस्ट', aliases: ['OT Specialist', 'Occupational Therapy'], parent: 'PRO.ALLIED', type: 'provider_type', tier: 'T1', kind: 'Practitioner' },
  { code: 'PRO.ALLIED.SLP', name: 'Speech & Language Therapist', nameHi: 'वाणी एवं भाषा चिकित्सक', aliases: ['Speech Therapist', 'SLP', 'Audiology & Speech'], parent: 'PRO.ALLIED', type: 'provider_type', tier: 'T1', kind: 'Practitioner' },
  { code: 'PRO.ALLIED.AUDIOLOGIST', name: 'Audiologist', nameHi: 'ऑडियोलॉजिस्ट', aliases: ['Hearing Specialist', 'Audiometry Expert'], parent: 'PRO.ALLIED', type: 'provider_type', tier: 'T1', kind: 'Practitioner' },
  { code: 'PRO.ALLIED.DIETITIAN', name: 'Dietitian / Nutritionist', nameHi: 'आहार विशेषज्ञ', aliases: ['Clinical Dietitian', 'Nutrition Expert'], parent: 'PRO.ALLIED', type: 'provider_type', tier: 'T1', regulatedBy: ['FSSAI'], kind: 'Practitioner' },
  { code: 'PRO.ALLIED.OPTOMETRIST', name: 'Optometrist', nameHi: 'ऑप्टोमेट्रिस्ट', aliases: ['Eye Vision Specialist', 'Optometry'], parent: 'PRO.ALLIED', type: 'provider_type', tier: 'T1', kind: 'Practitioner' },
  { code: 'PRO.ALLIED.PO', name: 'Prosthetist & Orthotist', nameHi: 'प्रोस्थेटिस्ट एवं ऑर्थोटिस्ट', aliases: ['Artificial Limb Specialist', 'P&O Professional'], parent: 'PRO.ALLIED', type: 'provider_type', tier: 'T1', kind: 'Practitioner' },
  { code: 'PRO.ALLIED.RADIOGRAPHER', name: 'Radiographer', nameHi: 'रेडियोग्राफर', aliases: ['X-ray Technologist', 'Imaging Technician'], parent: 'PRO.ALLIED', type: 'provider_type', tier: 'T1', regulatedBy: ['AERB'], kind: 'Practitioner' },
  { code: 'PRO.ALLIED.SONOGRAPHER', name: 'Sonographer', nameHi: 'सोनोग्राफर', aliases: ['Ultrasound Technician', 'USG Technologist'], parent: 'PRO.ALLIED', type: 'provider_type', tier: 'T1', kind: 'Practitioner' },
  { code: 'PRO.ALLIED.LAB_TECH', name: 'Lab Technician', nameHi: 'लैब टेक्नीशियन', aliases: ['Medical Laboratory Technologist', 'MLT', 'Pathology Technician'], parent: 'PRO.ALLIED', type: 'provider_type', tier: 'T1', kind: 'Practitioner' },
  { code: 'PRO.ALLIED.PHLEBOTOMIST', name: 'Phlebotomist', nameHi: 'फ्लेबोटोमिस्ट', aliases: ['Blood Sample Collector', 'Home Blood Draw'], parent: 'PRO.ALLIED', type: 'provider_type', tier: 'T1', kind: 'Practitioner' },
  { code: 'PRO.ALLIED.PHARMACIST', name: 'Pharmacist', nameHi: 'फार्मासिस्ट', aliases: ['Chemist', 'Registered Pharmacist'], parent: 'PRO.ALLIED', type: 'provider_type', tier: 'T1', regulatedBy: ['PCI'], kind: 'Practitioner' },
  { code: 'PRO.ALLIED.NURSE', name: 'Nurse (GNM / BSc)', nameHi: 'नर्स', aliases: ['Staff Nurse', 'Registered Nurse', 'Home Nurse'], parent: 'PRO.ALLIED', type: 'provider_type', tier: 'T1', regulatedBy: ['INC'], kind: 'Practitioner' },
  { code: 'PRO.ALLIED.PARAMEDIC_EMT', name: 'Paramedic / EMT', nameHi: 'पैरामेडिक / EMT', aliases: ['Emergency Medical Technician', 'Ambulance Paramedic'], parent: 'PRO.ALLIED', type: 'provider_type', tier: 'T1', kind: 'Practitioner' },

  // ─── §2.4 Mental-health practitioners (sensitive — discreet handling) ───────
  { code: 'PRO.MH', name: 'Mental Health Professionals', nameHi: 'मानसिक स्वास्थ्य पेशेवर', aliases: ['MH Experts', 'Therapists & Psychologists'], parent: null, type: 'provider_type', tier: 'T1', isSensitive: true, kind: 'Practitioner' },
  { code: 'PRO.MH.CLINICAL_PSY', name: 'Clinical Psychologist', nameHi: 'क्लिनिकल साइकोलॉजिस्ट', aliases: ['RCI Licensed Psychologist', 'Clinical Psychology'], parent: 'PRO.MH', type: 'provider_type', tier: 'T1', regulatedBy: ['RCI'], isSensitive: true, kind: 'Practitioner' },
  { code: 'PRO.MH.COUNSELLING_PSY', name: 'Counselling Psychologist', nameHi: 'काउंसलिंग साइकोलॉजिस्ट', aliases: ['Counselling Psychology Expert'], parent: 'PRO.MH', type: 'provider_type', tier: 'T1', isSensitive: true, kind: 'Practitioner' },
  { code: 'PRO.MH.COUNSELLOR', name: 'Counsellor', nameHi: 'काउंसलर', aliases: ['Therapist', 'Mental Health Counsellor'], parent: 'PRO.MH', type: 'provider_type', tier: 'T1', isSensitive: true, kind: 'Practitioner' },
  { code: 'PRO.MH.PSYCHOTHERAPIST', name: 'Psychotherapist', nameHi: 'साइकोथेरेपिस्ट', aliases: ['Talk Therapy Expert'], parent: 'PRO.MH', type: 'provider_type', tier: 'T1', isSensitive: true, kind: 'Practitioner' },
  { code: 'PRO.MH.CHILD_ADOLESCENT', name: 'Child & Adolescent Psychologist', nameHi: 'बाल एवं किशोर मनोवैज्ञानिक', aliases: ['Child Therapist', 'Teen Counsellor'], parent: 'PRO.MH', type: 'provider_type', tier: 'T1', isSensitive: true, kind: 'Practitioner' },
  { code: 'PRO.MH.NEUROPSY', name: 'Neuropsychologist', nameHi: 'न्यूरोसाइकोलॉजिस्ट', aliases: ['Brain Behaviour Specialist'], parent: 'PRO.MH', type: 'provider_type', tier: 'T1', isSensitive: true, kind: 'Practitioner' },
  { code: 'PRO.MH.REHAB_PSY', name: 'Rehabilitation Psychologist', nameHi: 'पुनर्वास मनोवैज्ञानिक', aliases: ['Rehab Psychology Expert'], parent: 'PRO.MH', type: 'provider_type', tier: 'T1', isSensitive: true, kind: 'Practitioner' },
  { code: 'PRO.MH.PSYCH_SOCIAL_WORKER', name: 'Psychiatric Social Worker', nameHi: 'साइकियाट्रिक सोशल वर्कर', aliases: ['PSW', 'Mental Health Social Worker'], parent: 'PRO.MH', type: 'provider_type', tier: 'T1', isSensitive: true, kind: 'Practitioner' },
  { code: 'PRO.MH.ARTS_THERAPIST', name: 'Art / Music / Dance Therapist', nameHi: 'आर्ट / म्यूजिक / डांस थेरेपिस्ट', aliases: ['Expressive Arts Therapist', 'Creative Therapy'], parent: 'PRO.MH', type: 'provider_type', tier: 'T1', isSensitive: true, kind: 'Practitioner' },
  { code: 'PRO.MH.DEADDICTION_COUNSELLOR', name: 'De-addiction Counsellor', nameHi: 'डी-एडिक्शन काउंसलर', aliases: ['Addiction Counsellor', 'Substance Abuse Counsellor'], parent: 'PRO.MH', type: 'provider_type', tier: 'T1', isSensitive: true, kind: 'Practitioner' },
  { code: 'PRO.MH.PEER_MENTOR', name: 'Peer Mentor (Lived Experience)', nameHi: 'पीयर मेंटर', aliases: ['Peer Support Specialist', 'Recovery Mentor'], parent: 'PRO.MH', type: 'provider_type', tier: 'T1', isSensitive: true, kind: 'Practitioner' },

  // ─── §2.5 Wellness practitioners ────────────────────────────────────────────
  { code: 'PRO.WELL', name: 'Wellness Practitioners', nameHi: 'वेलनेस पेशेवर', aliases: ['Wellness Experts'], parent: null, type: 'provider_type', tier: 'T1', kind: 'Practitioner' },
  { code: 'PRO.WELL.YOGA_TEACHER', name: 'Yoga Teacher / Instructor', nameHi: 'योग शिक्षक', aliases: ['Yoga Instructor', 'Yoga Guru'], parent: 'PRO.WELL', type: 'provider_type', tier: 'T1', kind: 'Practitioner' },
  { code: 'PRO.WELL.PERSONAL_TRAINER', name: 'Personal Trainer', nameHi: 'पर्सनल ट्रेनर', aliases: ['Fitness Trainer', 'Gym Coach'], parent: 'PRO.WELL', type: 'provider_type', tier: 'T1', kind: 'Practitioner' },
  { code: 'PRO.WELL.GROUP_FITNESS', name: 'Group Fitness Instructor', nameHi: 'ग्रुप फिटनेस इंस्ट्रक्टर', aliases: ['Aerobics Instructor', 'Zumba Instructor'], parent: 'PRO.WELL', type: 'provider_type', tier: 'T1', kind: 'Practitioner' },
  { code: 'PRO.WELL.SPORTS_COACH', name: 'Sports Coach', nameHi: 'स्पोर्ट्स कोच', aliases: ['Athletic Coach', 'Sports Trainer'], parent: 'PRO.WELL', type: 'provider_type', tier: 'T1', kind: 'Practitioner' },
  { code: 'PRO.WELL.MEDITATION_TEACHER', name: 'Meditation Teacher', nameHi: 'ध्यान शिक्षक', aliases: ['Dhyana Instructor', 'Mindfulness Teacher'], parent: 'PRO.WELL', type: 'provider_type', tier: 'T1', kind: 'Practitioner' },
]);

export default PRO_CATEGORY_NODES;
