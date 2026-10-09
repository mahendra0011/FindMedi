/**
 * File 09 §04.1: structured consult-note templates per specialty.
 * Sections mirror the SOAP + history shape the EMR workspace renders.
 * Served read-only via GET /api/emr/templates?specialty=.
 */
const BASE_SECTIONS = ['chiefComplaint', 'hpi', 'pastHistory', 'familyHistory', 'allergies', 'examination', 'diagnosis', 'plan'];

export const EMR_TEMPLATES = {
  General: {
    sections: BASE_SECTIONS,
    prompts: {
      chiefComplaint: 'Onset, duration, severity (1-10), relieving/aggravating factors',
      examination: 'Vitals, general, systemic examination',
      plan: 'Investigations, treatment, follow-up date',
    },
  },
  Pediatrics: {
    sections: [...BASE_SECTIONS, 'growthChart', 'immunization'],
    prompts: {
      chiefComplaint: 'Fever/cough/feeding history, birth history if infant',
      examination: 'Weight, height, head circumference + percentile',
      plan: 'Weight-based dosing (mg/kg), vaccination due check',
    },
  },
  OBG: {
    sections: [...BASE_SECTIONS, 'obstetricHistory', 'lmpEdd'],
    prompts: {
      chiefComplaint: 'LMP, EDD, gravida/para/abortus, complaints',
      examination: 'P/A: fundal height, presentation, FHS; P/V if indicated',
      plan: 'USG, labs, ANC visit schedule, high-risk flags',
    },
  },
  Ortho: {
    sections: [...BASE_SECTIONS, 'injuryMechanism', 'romAssessment'],
    prompts: {
      chiefComplaint: 'Trauma history, pain site, ROM limitation, neurovascular status',
      examination: 'Inspection, palpation, ROM, special tests, X-ray findings',
      plan: 'Immobilization/physio/surgery decision, follow-up',
    },
  },
  Cardio: {
    sections: [...BASE_SECTIONS, 'cardiacRisk'],
    prompts: {
      chiefComplaint: 'Chest pain (SOCRAtes), dyspnea, palpitations, syncope; risk factors',
      examination: 'BP both arms, JVP, murmurs, edema, ECG findings',
      plan: 'Echo/TMT/lipids, risk stratification, red flags',
    },
  },
  ENT: {
    sections: [...BASE_SECTIONS, 'entExam'],
    prompts: {
      chiefComplaint: 'Ear discharge/hearing loss, nasal block, sore throat, vertigo',
      examination: 'Otoscopy, anterior rhinoscopy, oral cavity, neck nodes',
      plan: 'Audiometry/X-ray SOS, medical vs surgical decision',
    },
  },
  Derm: {
    sections: [...BASE_SECTIONS, 'lesionDescription'],
    prompts: {
      chiefComplaint: 'Lesion: onset, site, itch, triggers, photos if consented',
      examination: 'Morphology, distribution, dermoscopy findings',
      plan: 'Topical/systemic, biopsy SOS, sun-care counselling',
    },
  },
  Ophthal: {
    sections: [...BASE_SECTIONS, 'visionChart'],
    prompts: {
      chiefComplaint: 'Vision loss, redness, pain, floaters, trauma',
      examination: 'VA, refraction, slit-lamp, fundus, IOP',
      plan: 'Glasses/surgery referral, follow-up',
    },
  },
  Psychiatry: {
    sections: [...BASE_SECTIONS, 'mseScale'],
    prompts: {
      chiefComplaint: 'Presenting concerns in patient words; sleep/appetite/substance use',
      examination: 'MSE: appearance, speech, mood, thought, cognition, insight',
      plan: 'PHQ-9/GAD-7, therapy plan, risk assessment, follow-up',
    },
  },
};

export const templateFor = (specialty) => EMR_TEMPLATES[specialty] || EMR_TEMPLATES.General;
export const templateSpecialties = () => Object.keys(EMR_TEMPLATES);
