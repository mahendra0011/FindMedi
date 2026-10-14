import { describe, it, expect } from '@jest/globals';
import { CATEGORY_TREE } from '../../src/data/categoryTree.mjs';
import { CATEGORY_TYPES, CATEGORY_TIERS, CATEGORY_CODE_RE, SPECIALTIES, resolveSpecialtyCode } from '../../src/lib/taxonomy.js';
import { FACILITY_SUBTYPES } from '../../src/models/Facility.js';
import Category from '../../src/models/Category.js';
import {
  isSensitiveCategory,
  maskSensitiveNotificationText,
  filterSensitiveForDiscovery,
  SENSITIVE_CATEGORY_CODES,
  SENSITIVE_SUBTYPES,
} from '../../src/lib/sensitiveCategories.js';
import { PROVIDER_TYPE_CATALOG } from '../../src/lib/providerTypeCatalog.js';

const FORBIDDEN_TOKENS = [
  'veterinary', 'pet care', 'tattoo', 'piercing', 'salon', 'pest control',
  'ro purifier', 'purifier service', 'air ambulance', 'medical tourism',
  'cremation', 'funeral', 'crowdfunding', 'medical emi', 'medical loans',
  'insurance comparison', 'insurance advisor', 'cord blood bank',
];

describe('FindMedi Final Category Catalogue (Pruned)', () => {
  it('covers all 24 sections with valid codes matching CATEGORY_CODE_RE', () => {
    expect(CATEGORY_TREE.length).toBeGreaterThanOrEqual(150);

    const prefixes = new Set(CATEGORY_TREE.map((c) => c.code.split('.')[0]));
    // Expected top prefixes across all sections
    const expectedPrefixes = [
      'FAC', 'PRO', 'DIAG', 'MED', 'EMG', 'AYUSH', 'CENTRE',
      'MH', 'REHAB', 'WCH', 'ELDER', 'PROG', 'NUT', 'FIT',
      'CARE', 'DEV', 'EVENT', 'GOV', 'FIN', 'LEGAL', 'CONTENT',
      'HOME', 'TRANS', 'B2B',
    ];

    for (const prefix of expectedPrefixes) {
      expect(prefixes.has(prefix)).toBe(true);
    }

    for (const item of CATEGORY_TREE) {
      expect(CATEGORY_CODE_RE.test(item.code)).toBe(true);
      expect(CATEGORY_TYPES).toContain(item.type);
      if (item.tier) expect(CATEGORY_TIERS).toContain(item.tier);
    }
  });

  it('guarantees unique codes and resolvable parent lineage', () => {
    const codes = CATEGORY_TREE.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);

    const codeSet = new Set(codes);
    for (const item of CATEGORY_TREE) {
      if (item.parent !== null && item.parent !== undefined) {
        expect(codeSet.has(item.parent)).toBe(true);
      }
    }
  });

  it('contains zero dropped or out-of-scope categories', () => {
    for (const item of CATEGORY_TREE) {
      const text = `${item.code} ${item.name} ${(item.aliases || []).join(' ')}`.toLowerCase();
      for (const forbidden of FORBIDDEN_TOKENS) {
        expect(text).not.toContain(forbidden);
      }
    }
  });

  it('enforces sensitive categories tier T1, isSensitive, and adClaimsRestricted', () => {
    const sensitiveItems = CATEGORY_TREE.filter((c) => c.isSensitive);
    expect(sensitiveItems.length).toBeGreaterThanOrEqual(8);

    for (const item of sensitiveItems) {
      expect(item.tier).toBe('T1');
      expect(item.isSensitive).toBe(true);
      expect(isSensitiveCategory(item)).toBe(true);
    }

    // Cosmetic surgery and aesthetics must be claims restricted
    const cosmetic = CATEGORY_TREE.find((c) => c.code === 'CENTRE.FAC.COSMETIC_SURGERY');
    expect(cosmetic).toBeDefined();
    expect(cosmetic.adClaimsRestricted).toBe(true);

    const skinAesthetic = CATEGORY_TREE.find((c) => c.code === 'CARE.DERM.AESTHETICS');
    expect(skinAesthetic).toBeDefined();
    expect(skinAesthetic.adClaimsRestricted).toBe(true);
  });

  it('includes sub-specialties in SPECIALTIES_LIST while preserving existing codes', () => {
    expect(resolveSpecialtyCode('SPEC.CARDIO.INTERVENTIONAL')).toBe('SPEC.CARDIO.INTERVENTIONAL');
    expect(resolveSpecialtyCode('Interventional Cardiology')).toBe('SPEC.CARDIO.INTERVENTIONAL');
    expect(resolveSpecialtyCode('SPEC.ORTHO.JOINT')).toBe('SPEC.ORTHO.JOINT');
    expect(resolveSpecialtyCode('Joint Replacement')).toBe('SPEC.ORTHO.JOINT');
    expect(resolveSpecialtyCode('SPEC.CARDIO')).toBe('SPEC.CARDIO');
    expect(resolveSpecialtyCode('Cardiology')).toBe('SPEC.CARDIO');
  });

  it('includes new facility subtypes in FACILITY_SUBTYPES enum', () => {
    const requiredSubtypes = [
      'dialysis_centre', 'optical_shop', 'panchakarma_centre', 'naturopathy_hospital',
      'audiology_hearing_aid_centre', 'cardiac_cath_lab', 'diabetes_clinic',
      'skin_hair_clinic', 'pain_clinic', 'wound_care_clinic', 'urology_centre',
      'plastic_cosmetic_surgery', 'sexual_health_clinic', 'travel_medicine_clinic',
      'transplant_centre', 'trichology_clinic', 'laser_aesthetics_clinic',
      'geriatric_daycare', 'sports_academy_turf',
    ];
    for (const st of requiredSubtypes) {
      expect(FACILITY_SUBTYPES).toContain(st);
    }
  });

  it('declares kind, isSensitive, and soon on the Category model schema', () => {
    expect(Category.schema.path('kind')).toBeTruthy();
    expect(Category.schema.path('isSensitive')).toBeTruthy();
    expect(Category.schema.path('soon')).toBeTruthy();
  });

  it('governs sensitive notifications and discovery filtering', () => {
    const sensitiveDoc = { name: 'Dr Rao', specialization: 'IVF Specialist', specialtyCode: 'SPEC.OBGY.INFERT_IVF' };
    const normalDoc = { name: 'Dr Sharma', specialization: 'General Physician', specialtyCode: 'SPEC.GENMED' };

    expect(isSensitiveCategory(sensitiveDoc)).toBe(true);
    expect(isSensitiveCategory(normalDoc)).toBe(false);

    const masked = maskSensitiveNotificationText('Appointment confirmed for IVF consultation', sensitiveDoc);
    expect(masked).toBe('You have a confidential healthcare update in FindMedi. Open the app to view.');
    expect(maskSensitiveNotificationText('Normal appointment', normalDoc)).toBe('Normal appointment');

    const filtered = filterSensitiveForDiscovery([sensitiveDoc, normalDoc]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].specialtyCode).toBe('SPEC.GENMED');
  });

  it('contains strictly 46 approved provider types in providerTypeCatalog', () => {
    const typeKeys = PROVIDER_TYPE_CATALOG.map((p) => p.typeKey);
    expect(typeKeys.length).toBe(46);
    const prunedKeys = [
      'occupational_therapist', 'prosthetist_orthotist', 'lactation_consultant',
      'doula', 'audiologist', 'acupuncturist',
    ];
    for (const key of prunedKeys) {
      expect(typeKeys).not.toContain(key);
    }
  });

  it('verifies subcategories facility subtypes, practitioner roles, and reference lists', async () => {
    const {
      SUPPORTED_LANGUAGES, CONSULTATION_MODES, ACCESSIBILITY_AMENITIES, VERIFICATION_BADGES
    } = await import('../../src/lib/taxonomy.js');
    const { default: PractitionerProfile } = await import('../../src/models/PractitionerProfile.js');

    const addedSubtypes = [
      'community_health_centre', 'teaching_hospital', 'ortho_spine_clinic', 'ent_clinic',
      'paediatric_clinic', 'women_clinic', 'sleep_clinic', 'travel_vaccination_clinic',
      'eye_diagnostic', 'audiology_lab', 'yoga_studio', 'hearing_aid_centre',
    ];
    for (const st of addedSubtypes) {
      expect(FACILITY_SUBTYPES).toContain(st);
    }

    const roleTypes = PractitionerProfile.schema.path('roleType').enumValues;
    expect(roleTypes).toContain('radiographer');
    expect(roleTypes).toContain('sonographer');
    expect(roleTypes).toContain('lab_technician');
    expect(roleTypes).toContain('pharmacist');
    expect(roleTypes).toContain('paramedic_emt');
    expect(roleTypes).toContain('psychotherapist');
    expect(roleTypes).toContain('meditation_teacher');
    expect(roleTypes).toContain('peer_mentor');

    expect(SUPPORTED_LANGUAGES).toContain('Hindi');
    expect(SUPPORTED_LANGUAGES).toContain('Indian Sign Language');
    expect(CONSULTATION_MODES).toHaveLength(5);
    expect(ACCESSIBILITY_AMENITIES).toContain('wheelchair_access');
    expect(VERIFICATION_BADGES).toContain('licence_verified');
  });
});
