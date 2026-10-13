/**
 * Sensitive Categories Governance (FindMedi Pruned Catalogue §24).
 *
 * Covers high-sensitivity clinical areas requiring privacy and dignity protections:
 * - IVF & fertility
 * - De-addiction & rehab
 * - Palliative & hospice
 * - Sexual health & andrology/STD
 * - Cosmetic surgery & aesthetics (claims-restricted)
 * - Organ/bone-marrow transplant
 * - Mental-health support groups
 * - HIV/STD diagnostics
 *
 * Controls:
 * 1. Tier T1 enforcement
 * 2. adClaimsRestricted where claims risk
 * 3. Discreet notifications (neutral copy masking sensitive specialties on push/SMS)
 * 4. Exclusion from generic public discovery / trending suggestions
 */

export const SENSITIVE_CATEGORY_CODES = Object.freeze([
  // IVF & fertility
  'SPEC.OBGY.INFERT_IVF',
  'SPEC.INFERT',
  'WCH.FAC.IVF_FERTILITY',
  'WCH.FERTILITY',
  // De-addiction & psychiatric rehab
  'SPEC.PSYCH.ADDICTION',
  'FAC.HOSPITAL.PSYCH_REHAB',
  'MH.FAC.DE_ADDICTION',
  'MH.DE_ADDICTION',
  // Palliative & hospice
  'SPEC.PALLI',
  'ELDER.FAC.PALLIATIVE_HOSPICE',
  'ELDER.PALLIATIVE',
  // Sexual health
  'SPEC.SEXO',
  'SPEC.URO.SEXUAL_HEALTH',
  'CENTRE.FAC.SEXUAL_HEALTH',
  'CENTRE.SEXUAL_HEALTH',
  'DIAG.TEST.STD_PANEL',
  // Cosmetic surgery & aesthetics
  'SPEC.PLASTSURG.COSMETIC',
  'CENTRE.FAC.COSMETIC_SURGERY',
  'CARE.DERM.AESTHETICS',
  // Transplant
  'SPEC.NEPHRO.TRANSPLANT',
  'SPEC.HAEM.BMT',
  'CENTRE.FAC.TRANSPLANT',
  // Mental-health support groups
  'MH.SERVICE.SUPPORT_GROUPS',
  'MH.SUPPORT_GROUP',
]);

export const SENSITIVE_SUBTYPES = Object.freeze([
  'fertility_clinic',
  'de_addiction_centre',
  'hospice_palliative',
  'sexual_health_clinic',
  'plastic_cosmetic_surgery',
  'transplant_centre',
  'laser_aesthetics_clinic',
  'psychiatric_hospital',
]);

const SENSITIVE_CODE_SET = new Set(SENSITIVE_CATEGORY_CODES);
const SENSITIVE_SUBTYPE_SET = new Set(SENSITIVE_SUBTYPES);

/**
 * Checks if a category, specialty code, or facility subtype is marked sensitive.
 */
export function isSensitiveCategory(input) {
  if (!input) return false;
  if (typeof input === 'string') {
    const norm = input.trim();
    return SENSITIVE_CODE_SET.has(norm) || SENSITIVE_SUBTYPE_SET.has(norm);
  }
  if (input.isSensitive === true) return true;
  if (input.code && SENSITIVE_CODE_SET.has(input.code)) return true;
  if (input.specialtyCode && SENSITIVE_CODE_SET.has(input.specialtyCode)) return true;
  if (input.subType && SENSITIVE_SUBTYPE_SET.has(input.subType)) return true;
  return false;
}

/**
 * Masks notification text if the underlying appointment/record is in a sensitive category.
 */
export function maskSensitiveNotificationText(text, categoryInput) {
  if (!isSensitiveCategory(categoryInput)) return text;
  return 'You have a confidential healthcare update in FindMedi. Open the app to view.';
}

/**
 * Excludes sensitive items from public trending or generic discovery feeds.
 */
export function filterSensitiveForDiscovery(items = []) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => !isSensitiveCategory(item));
}

export default {
  SENSITIVE_CATEGORY_CODES,
  SENSITIVE_SUBTYPES,
  isSensitiveCategory,
  maskSensitiveNotificationText,
  filterSensitiveForDiscovery,
};
