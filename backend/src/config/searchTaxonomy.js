/**
 * Search Taxonomy & Multilingual Symptom-to-Specialty Engine
 * Supports English, Hindi, and colloquial Hinglish symptom phrases.
 * Flags emergencies (red-flag escalation) and sensitive mental-health topics.
 */

export const EMERGENCY_TRIGGERS = [
  'chest pain', 'seene me dard', 'dil ka daura', 'heart attack',
  'breathlessness', 'saans nahi aa rahi', 'choking', 'unconscious', 'behosh',
  'severe bleeding', 'khoon beh raha hai', 'stroke', 'paralysis attack',
  'poisoning', 'zehar', 'snake bite', 'saanp ka katna', 'head trauma', 'sir pe chot'
];

export const SENSITIVE_MENTAL_HEALTH_TRIGGERS = [
  'suicide', 'suicidal', 'kill myself', 'marne ka mann', 'self harm',
  'depression', 'anxiety', 'tanav', 'ghabrahat', 'panic attack',
  'hopeless', 'crying all day', 'mental health', 'psychologist', 'counsellor'
];

export const SYMPTOM_TAXONOMY = [
  {
    keywords: ['tooth pain', 'daant me dard', 'daant dard', 'cavity', 'bleeding gums', 'root canal', 'braces', 'teeth whitening', 'wisdom tooth', 'dentist'],
    specialty: 'Dentistry',
    category: 'dental_clinic',
    suggestedQuery: 'Dentist / Dental Clinic',
  },
  {
    keywords: ['chest pain', 'seene me dard', 'heart palpitation', 'high bp', 'heart attack', 'cholesterol', 'dil ka doctor', 'cardiology'],
    specialty: 'Cardiology',
    category: 'hospital',
    suggestedQuery: 'Cardiologist',
    emergency: true,
  },
  {
    keywords: ['hadda ka doctor', 'bone fracture', 'joint pain', 'knee pain', 'ghutne me dard', 'back pain', 'kamar dard', 'scoliosis', 'orthopedics', 'orthopaedic'],
    specialty: 'Orthopaedics',
    category: 'clinic',
    suggestedQuery: 'Orthopedic Doctor',
  },
  {
    keywords: ['skin rash', 'khujli', 'itching', 'pimples', 'acne', 'hair fall', 'dandruff', 'eczema', 'psoriasis', 'chamdi ka doctor', 'dermatology'],
    specialty: 'Dermatology',
    category: 'clinic',
    suggestedQuery: 'Dermatologist',
  },
  {
    keywords: ['chashma', 'eye test', 'aankh me dard', 'cataract', 'motiyabind', 'blurry vision', 'glasses', 'spectacles', 'ophthalmology', 'optician'],
    specialty: 'Ophthalmology',
    category: 'optician',
    suggestedQuery: 'Eye Specialist / Optician',
  },
  {
    keywords: ['sugar', 'diabetes', 'sugar test', 'thyroid', 'hormone', 'weight gain', 'weight loss', 'endocrinology'],
    specialty: 'Endocrinology',
    category: 'clinic',
    suggestedQuery: 'Diabetologist / Endocrinologist',
  },
  {
    keywords: ['pregnancy', 'delivery', 'bachha', 'periods', 'irregular periods', 'pcos', 'pcod', 'lady doctor', 'gynecology', 'gynaecologist', 'ivf'],
    specialty: 'Obstetrics & Gynaecology',
    category: 'hospital',
    suggestedQuery: 'Gynecologist / Maternity',
  },
  {
    keywords: ['bachhe ka doctor', 'fever in baby', 'infant', 'child doctor', 'pediatrics', 'pediatrician', 'baccha bimar'],
    specialty: 'Paediatrics',
    category: 'clinic',
    suggestedQuery: 'Pediatrician',
  },
  {
    keywords: ['pet me dard', 'stomach pain', 'gas', 'acidity', 'constipation', 'kabz', 'vomiting', 'loose motion', 'ulcer', 'gastroenterology'],
    specialty: 'Gastroenterology',
    category: 'clinic',
    suggestedQuery: 'Gastroenterologist',
  },
  {
    keywords: ['physio', 'physiotherapy', 'paralysis recovery', 'stroke rehab', 'neck pain', 'cervical', 'sports injury'],
    specialty: 'Physiotherapy',
    category: 'physiotherapy',
    suggestedQuery: 'Physiotherapist',
  },
  {
    keywords: ['diet', 'dietitian', 'nutrition', 'weight loss plan', 'diet chart', 'motapa', 'fat loss', 'pcos diet'],
    specialty: 'Dietetics & Clinical Nutrition',
    category: 'dietitian',
    suggestedQuery: 'Dietitian & Nutritionist',
  },
  {
    keywords: ['tanav', 'anxiety', 'depression', 'stress', 'insomnia', 'neend nahi aati', 'mind support', 'therapy', 'counseling', 'psychiatry'],
    specialty: 'Psychiatry & Clinical Psychology',
    category: 'counsellor',
    suggestedQuery: 'Mental Health Counsellor',
    sensitive: true,
  },
  {
    keywords: ['ayurveda', 'ayush', 'homeopathy', 'unani', 'jadibuti', 'panchakarma', 'herbal', 'nadi pariksha'],
    specialty: 'AYUSH / Integrative Medicine',
    category: 'ayush_centre',
    suggestedQuery: 'AYUSH Practitioner / Wellness Centre',
  },
  {
    keywords: ['yoga', 'pranayam', 'meditation', 'surya namaskar', 'yoga trainer', 'asana'],
    specialty: 'Yoga & Mindful Movement',
    category: 'yoga_centre',
    suggestedQuery: 'Yoga Studio & Certified Trainer',
  },
  {
    keywords: ['gym', 'fitness', 'workout', 'bodybuilding', 'gym trainer', 'personal trainer', 'crossfit'],
    specialty: 'Fitness & Physical Training',
    category: 'fitness_gym',
    suggestedQuery: 'Fitness Gym & Athletic Coach',
  },
  {
    keywords: ['khoon test', 'blood test', 'cbc', 'lipid profile', 'rt pcr', 'urine test', 'lft', 'kft', 'lab report', 'pathology'],
    specialty: 'Pathology & Diagnostic Laboratory',
    category: 'diagnostic',
    suggestedQuery: 'Diagnostic Center & Lab Tests',
  },
  {
    keywords: ['dawa', 'medicine', 'tablet', 'syrup', 'generic medicine', 'capsule', 'chemist', 'pharmacy', 'rx delivery'],
    specialty: 'Pharmacy & Medical Store',
    category: 'pharmacy',
    suggestedQuery: 'Licensed Pharmacy & Home Delivery',
  },
  {
    keywords: ['ambulance', 'emergency gaadi', 'icu ambulance', 'oxygen ambulance', 'patient transport'],
    specialty: 'Emergency Transport & Ambulance',
    category: 'ambulance_service',
    suggestedQuery: 'Emergency Ambulance (or call 108)',
    emergency: true,
  },
  {
    keywords: ['khoon chahiye', 'blood required', 'blood donor', 'blood bank', 'plasma', 'platelets', 'o negative', 'b positive'],
    specialty: 'Blood Banking & Transfusion',
    category: 'blood_bank',
    suggestedQuery: 'Verified Blood Bank & Component Stock',
  },
  {
    keywords: ['wheelchair', 'oxygen cylinder', 'hospital bed rental', 'bipap', 'cpap', 'walker', 'equipment rental'],
    specialty: 'Medical Equipment & Device Rental',
    category: 'equipment_rental',
    suggestedQuery: 'Medical Equipment & Device Store',
  },
  {
    keywords: ['home nursing', 'nurse at home', 'elder care', 'attendant', 'caretaker', 'patient care at home', 'injection nurse'],
    specialty: 'Home Health Nursing & Attendant Care',
    category: 'home_nursing',
    suggestedQuery: 'Verified Home Nurse & Ward Attendant',
  },
  {
    keywords: ['dialysis', 'hemodialysis', 'kidney care', 'nephrology', 'dialysis session'],
    specialty: 'Nephrology & Dialysis Care',
    category: 'dialysis',
    suggestedQuery: 'Dialysis Center',
  },
];

/**
 * Expand a user search query into taxonomy insights, red flags, and aliases
 */
export function expandSearchQuery(query = '') {
  const qLower = String(query).toLowerCase().trim();
  if (!qLower) {
    return {
      normalizedQuery: '',
      isEmergency: false,
      isSensitive: false,
      matchedTaxonomy: null,
      synonyms: [],
    };
  }

  // Check emergency triggers
  const isEmergency = EMERGENCY_TRIGGERS.some((t) => qLower.includes(t));
  let emergencyMessage = null;
  if (isEmergency) {
    emergencyMessage = 'Critical symptoms detected: If experiencing severe chest pain, breathing difficulty, or loss of consciousness, immediately call 108 / 112 or visit the nearest emergency trauma room. Do not delay for online bookings.';
  }

  // Check sensitive mental health triggers
  const isSensitive = SENSITIVE_MENTAL_HEALTH_TRIGGERS.some((t) => qLower.includes(t));
  let crisisHotline = null;
  if (isSensitive) {
    crisisHotline = 'If you or someone you know is in crisis or distress, please reach out to Tele-MANAS (Govt 24/7 Helpline: 14416 or 1800-891-4416). Confidential support is available free of charge.';
  }

  // Match symptom taxonomy
  let matchedTaxonomy = null;
  for (const item of SYMPTOM_TAXONOMY) {
    if (item.keywords.some((kw) => qLower.includes(kw))) {
      matchedTaxonomy = item;
      break;
    }
  }

  return {
    normalizedQuery: qLower,
    isEmergency: Boolean(isEmergency || matchedTaxonomy?.emergency),
    emergencyMessage: emergencyMessage || (matchedTaxonomy?.emergency ? 'If this is an emergency medical condition, immediately call 108 or go to the nearest hospital emergency room.' : null),
    isSensitive: Boolean(isSensitive || matchedTaxonomy?.sensitive),
    crisisHotline: crisisHotline || (matchedTaxonomy?.sensitive ? 'National 24/7 Mental Health Helpline: 14416 (Tele-MANAS)' : null),
    matchedTaxonomy,
    synonyms: matchedTaxonomy ? matchedTaxonomy.keywords.slice(0, 5) : [],
  };
}
