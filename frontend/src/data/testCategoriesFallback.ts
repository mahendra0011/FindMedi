// subcatogary.md §4.1 — Fallback test categories and mapped test catalogs
import {
  Droplets,
  Beaker,
  Activity,
  Heart,
  Scan,
  Syringe,
  Dna,
  Brain,
  TestTube,
  ShieldAlert,
  Wind,
  Baby,
  Eye,
  Ear,
  Bone,
  Pill,
  Sparkles,
  FlaskConical,
  type LucideIcon,
} from 'lucide-react';

export interface TestCategoryItem {
  code: string;
  name: string;
  icon: LucideIcon;
  color: string;
  textColor: string;
}

export const FALLBACK_TEST_CATEGORIES: TestCategoryItem[] = [
  { code: 'TEST.BLOOD_BASICS', name: 'Blood Basics', icon: Droplets, color: 'from-red-500/20 to-red-500/5', textColor: 'text-red-500' },
  { code: 'TEST.DIABETES', name: 'Diabetes', icon: Activity, color: 'from-amber-500/20 to-amber-500/5', textColor: 'text-amber-500' },
  { code: 'TEST.LIPID_HEART', name: 'Lipid & Heart', icon: Heart, color: 'from-rose-500/20 to-rose-500/5', textColor: 'text-rose-500' },
  { code: 'TEST.LIVER', name: 'Liver Function', icon: Activity, color: 'from-yellow-500/20 to-yellow-500/5', textColor: 'text-yellow-500' },
  { code: 'TEST.KIDNEY', name: 'Kidney Function', icon: Beaker, color: 'from-sky-500/20 to-sky-500/5', textColor: 'text-sky-500' },
  { code: 'TEST.THYROID_HORMONES', name: 'Thyroid & Hormones', icon: Dna, color: 'from-fuchsia-500/20 to-fuchsia-500/5', textColor: 'text-fuchsia-500' },
  { code: 'TEST.VITAMINS_MINERALS', name: 'Vitamins & Minerals', icon: Pill, color: 'from-emerald-500/20 to-emerald-500/5', textColor: 'text-emerald-500' },
  { code: 'TEST.INFECTION_SEROLOGY', name: 'Infection / Serology', icon: ShieldAlert, color: 'from-orange-500/20 to-orange-500/5', textColor: 'text-orange-500' },
  { code: 'TEST.MICROBIOLOGY', name: 'Microbiology & Culture', icon: TestTube, color: 'from-lime-500/20 to-lime-500/5', textColor: 'text-lime-500' },
  { code: 'TEST.ALLERGY', name: 'Allergy Panel', icon: ShieldAlert, color: 'from-rose-500/20 to-rose-500/5', textColor: 'text-rose-500' },
  { code: 'TEST.AUTOIMMUNE', name: 'Autoimmune & Arthritis', icon: ShieldAlert, color: 'from-purple-500/20 to-purple-500/5', textColor: 'text-purple-500' },
  { code: 'TEST.CANCER_MARKERS', name: 'Cancer Screening Markers', icon: Dna, color: 'from-teal-500/20 to-teal-500/5', textColor: 'text-teal-500' },
  { code: 'TEST.WOMENS_HEALTH', name: "Women's Health & Prenatal", icon: Baby, color: 'from-pink-500/20 to-pink-500/5', textColor: 'text-pink-500' },
  { code: 'TEST.MENS_HEALTH', name: "Men's Health", icon: Activity, color: 'from-blue-500/20 to-blue-500/5', textColor: 'text-blue-500' },
  { code: 'TEST.HISTOPATHOLOGY', name: 'Histopathology & Biopsy', icon: Syringe, color: 'from-stone-500/20 to-stone-500/5', textColor: 'text-stone-500' },
  { code: 'TEST.GENETIC_MOLECULAR', name: 'Genetic & Molecular', icon: Dna, color: 'from-indigo-500/20 to-indigo-500/5', textColor: 'text-indigo-500' },
  { code: 'TEST.STOOL_URINE', name: 'Stool & Urine Specials', icon: Beaker, color: 'from-amber-500/20 to-amber-500/5', textColor: 'text-amber-500' },
  { code: 'TEST.STD_SEXUAL_HEALTH', name: 'Sexual Health Panel', icon: Dna, color: 'from-red-500/20 to-red-500/5', textColor: 'text-red-500' },
  { code: 'TEST.PULMONOLOGY', name: 'Pulmonology & Respiratory', icon: Wind, color: 'from-cyan-500/20 to-cyan-500/5', textColor: 'text-cyan-500' },
  { code: 'TEST.NEURO_CARDIAC_FUNC', name: 'Functional (ECG/Echo/EEG/TMT)', icon: Brain, color: 'from-violet-500/20 to-violet-500/5', textColor: 'text-violet-500' },
  { code: 'TEST.IMAGING_BASIC', name: 'Basic Imaging (X-Ray)', icon: Scan, color: 'from-blue-500/20 to-blue-500/5', textColor: 'text-blue-500' },
  { code: 'TEST.IMAGING_ADVANCED', name: 'Advanced Imaging (MRI/CT/USG)', icon: Scan, color: 'from-indigo-500/20 to-indigo-500/5', textColor: 'text-indigo-500' },
  { code: 'TEST.HEALTH_PACKAGES', name: 'Preventive Health Packages', icon: Sparkles, color: 'from-emerald-500/20 to-emerald-500/5', textColor: 'text-emerald-500' },
];

export const CATEGORY_TESTS_FALLBACK: Record<string, string[]> = {
  'Blood Basics': ['Complete Blood Count (CBC)', 'Hemoglobin (Hb) Test', 'Blood Group & Rh', 'ESR Test', 'Coagulation (PT/INR)', 'Iron Studies'],
  'Diabetes': ['Blood Sugar (Fasting/PP/Random)', 'HbA1c (Diabetes 3-month average)', 'Glucose Tolerance Test', 'Urine Microalbumin'],
  'Lipid & Heart': ['Lipid Profile (Cholesterol)', 'Troponin-I', 'hs-CRP', 'CK-MB', 'Homocysteine'],
  'Liver Function': ['Liver Function Test (LFT)', 'Bilirubin Total & Direct', 'SGOT/SGPT', 'Viral Hepatitis Panel'],
  'Kidney Function': ['Kidney Function Test (KFT/RFT)', 'Serum Creatinine', 'Blood Urea Nitrogen', 'Uric Acid Test', 'Electrolytes'],
  'Thyroid & Hormones': ['Thyroid Profile (T3, T4, TSH)', 'Free T3/T4', 'Anti-TPO Antibodies', 'Prolactin', 'Testosterone'],
  'Vitamins & Minerals': ['Vitamin D (25-OH)', 'Vitamin B12', 'Serum Calcium', 'Ferritin', 'Folate'],
  'Infection / Serology': ['Dengue NS1/IgM/IgG', 'Malaria Antigen', 'Widal Test (Typhoid)', 'HIV 1 & 2', 'HBsAg', 'HCV'],
  'Microbiology & Culture': ['Urine Culture & Sensitivity', 'Blood Culture', 'Sputum AFB', 'Throat Swab Culture'],
  'Allergy Panel': ['Total IgE', 'Food Allergy Comprehensive Panel', 'Inhalant Allergy Panel'],
  'Autoimmune & Arthritis': ['RA Factor', 'Anti-CCP', 'ANA by IFA', 'Uric Acid'],
  'Cancer Screening Markers': ['PSA (Prostate)', 'CA-125 (Ovarian)', 'CEA', 'AFP', 'CA 19-9'],
  "Women's Health & Prenatal": ['Beta-hCG', 'Pap Smear', 'Dual Marker', 'Quadruple Marker', 'TORCH Panel', 'AMH'],
  "Men's Health": ['PSA Total', 'Semen Analysis', 'Testosterone Total'],
  'Histopathology & Biopsy': ['Small Biopsy Examination', 'FNAC', 'Cytology Smear'],
  'Genetic & Molecular': ['Karyotyping', 'Thalassemia Screening (HPLC)', 'RT-PCR'],
  'Stool & Urine Specials': ['Urine Routine Examination', 'Stool Routine & Occult Blood', '24-hour Urine Protein'],
  'Sexual Health Panel': ['VDRL (Syphilis)', 'HIV 4th Gen Duo', 'HBsAg', 'Chlamydia PCR'],
  'Pulmonology & Respiratory': ['Spirometry (PFT)', 'Allergy Screening'],
  'Functional (ECG/Echo/EEG/TMT)': ['ECG (12-Lead)', '2D Echocardiography', 'TMT (Stress Test)', 'EEG'],
  'Basic Imaging (X-Ray)': ['Chest X-Ray PA View', 'X-Ray Knee AP/Lat', 'X-Ray Spine'],
  'Advanced Imaging (MRI/CT/USG)': ['Ultrasound Abdomen & Pelvis', 'MRI Brain', 'MRI Lumbar Spine', 'CT Scan Head', 'Mammography'],
  'Preventive Health Packages': ['Basic Wellness Package', 'Comprehensive Health Checkup', 'Executive Health Package', 'Senior Citizen Health Package'],
};

export const FALLBACK_CATEGORY_TESTS = CATEGORY_TESTS_FALLBACK;

export function getTestCategoryVisual(nameOrCode: string): {
  icon: LucideIcon;
  color: string;
  textColor: string;
} {
  const norm = String(nameOrCode || '').toLowerCase().trim();
  const match = FALLBACK_TEST_CATEGORIES.find(c =>
    c.code.toLowerCase() === norm ||
    c.name.toLowerCase() === norm ||
    c.name.toLowerCase().includes(norm) ||
    norm.includes(c.name.toLowerCase())
  );
  if (match) {
    return {
      icon: match.icon,
      color: match.color,
      textColor: match.textColor,
    };
  }
  return {
    icon: FlaskConical,
    color: 'from-primary/20 to-primary/5',
    textColor: 'text-primary',
  };
}
