// 6.md §2.11 "Based on your care plan" (diabetes → eye check, foot care,
// dietitian). Pure vocabulary: the CARE PLAN stays server-side and only the
// selected titles leave in the response — no condition name is echoed unless
// the caller opted into personalisation, and nothing here ever reaches a
// third party (6.md §9: no raw PHI to third parties/analytics).
//
// Keys are stable so the frontend can deep-link later; titles are the same
// for every account with the same condition, which is what keeps this
// "recommendation" from becoming a fingerprint.

export const CARE_PLAN_RECOMMENDATIONS = Object.freeze({
  Diabetes: [
    { key: 'eye_check', title: 'Annual eye check-up', detail: 'Screening for diabetic retinopathy, once a year.' },
    { key: 'foot_care', title: 'Foot care check', detail: 'Nerve and circulation check for diabetic feet.' },
    { key: 'dietitian', title: 'Dietitian consult', detail: 'Meal planning matched to your sugar targets.' },
  ],
  Hypertension: [
    { key: 'bp_review', title: 'Home BP review', detail: 'Bring your home readings for a trend check.' },
    { key: 'low_sodium_diet', title: 'Low-sodium diet plan', detail: 'Dietitian guidance on salt without losing taste.' },
    { key: 'dietitian', title: 'Dietitian consult', detail: 'Meal planning matched to your salt and weight targets.' },
    { key: 'cardio_check', title: 'Cardiac risk check', detail: 'Periodic heart and vessel review.' },
  ],
  Thyroid: [
    { key: 'thyroid_retest', title: 'Thyroid function retest', detail: 'TSH/T3/T4 follow-up on your schedule.' },
    { key: 'endocrinologist', title: 'Endocrinologist review', detail: 'Dose review if symptoms changed.' },
  ],
  Asthma: [
    { key: 'inhaler_technique', title: 'Inhaler technique check', detail: 'Technique review — the biggest lever on control.' },
    { key: 'lung_function', title: 'Lung function test', detail: 'Spirometry to track how well treatment works.' },
  ],
  'Heart Disease': [
    { key: 'cardio_followup', title: 'Cardiology follow-up', detail: 'Review symptoms, medicines and reports.' },
    { key: 'lipid_panel', title: 'Lipid profile', detail: 'Cholesterol follow-up on your doctor’s interval.' },
  ],
  Arthritis: [
    { key: 'joint_function', title: 'Joint function review', detail: 'Mobility and pain trend with your physician.' },
    { key: 'physio_plan', title: 'Physiotherapy plan', detail: 'Strength and range-of-motion exercises.' },
  ],
  COPD: [
    { key: 'spirometry', title: 'Spirometry follow-up', detail: 'Track lung function on schedule.' },
    { key: 'smoking_support', title: 'Quitting support', detail: 'Counselling and nicotine replacement options.' },
  ],
  Other: [],
});

// Dedupes by `key` across conditions so two plans never double-list the same
// suggestion (dietitian appears under several conditions).
export function carePlanRecommendations(conditions = []) {
  const seen = new Set();
  const out = [];
  for (const condition of conditions) {
    for (const item of CARE_PLAN_RECOMMENDATIONS[condition] ?? []) {
      if (seen.has(item.key)) continue;
      seen.add(item.key);
      out.push({ ...item });
    }
  }
  return out;
}
