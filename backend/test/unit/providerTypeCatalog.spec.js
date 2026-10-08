import { describe, it, expect } from '@jest/globals';
import { PROVIDER_TYPE_CATALOG, providerTypeGroups } from '../../src/lib/providerTypeCatalog.js';
import { DOCUMENT_TYPES, APPROVAL_LEVELS } from '../../src/lib/providerTypes.js';
import { createProviderTypeConfigSchema } from '../../src/utils/validate.js';

// rolesmd/2.md 1-4: the catalogue IS the join flow's contract. Everything the
// wizard renders, join.js validates against and the approval queue branches on
// comes from these rows, so a malformed row is a broken onboarding - caught
// here rather than by an applicant.

const TYPE_KEYS = PROVIDER_TYPE_CATALOG.map((config) => config.typeKey);

describe('providerTypeCatalog', () => {
  it('covers every type 2.md 2 puts in the chooser', () => {
    const required = [
      'hospital', 'clinic', 'dental_clinic', 'eye_hospital', 'diagnostic', 'imaging_centre',
      'pharmacy', 'ayush_clinic', 'dialysis_centre', 'maternity_ivf', 'rehab_centre',
      'blood_bank', 'ambulance_operator',
      'doctor', 'dentist', 'physiotherapist', 'dietitian', 'home_nurse', 'counsellor',
      'psychiatrist', 'ayush_practitioner', 'speech_therapist', 'phlebotomist',
      'yoga_studio', 'gym', 'wellness_centre', 'sports_academy', 'personal_trainer',
      'equipment_rental', 'health_food_store', 'supplement_store', 'skincare_brand',
      'medical_device_seller',
      'home_nursing_agency', 'assistant', 'home_sample_collection', 'home_physio',
      'delivery', 'rider', 'patient_transport',
      'event_organizer', 'ngo', 'support_group_host', 'training_provider',
      'lawyer', 'insurance_tpa_desk',
    ];
    const missing = required.filter((key) => !TYPE_KEYS.includes(key));
    expect(missing).toEqual([]);
    expect(TYPE_KEYS.length).toBeGreaterThanOrEqual(40);
  });

  it('keeps the legacy typeKeys the old JoinPlatform already used', () => {
    // Providers created before this catalogue exist with these `type` values;
    // renaming them would orphan live listings (10.md rollout step 4).
    for (const legacy of ['hospital', 'clinic', 'diagnostic', 'pharmacy', 'delivery', 'rider', 'assistant', 'lawyer', 'counsellor', 'psychiatrist']) {
      expect(TYPE_KEYS).toContain(legacy);
    }
  });

  it('has unique snake_case typeKeys with unique labels', () => {
    expect(new Set(TYPE_KEYS).size).toBe(TYPE_KEYS.length);
    for (const key of TYPE_KEYS) expect(key).toMatch(/^[a-z0-9][a-z0-9_]{1,59}$/);
    const labels = PROVIDER_TYPE_CATALOG.map((config) => config.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('passes every row through the admin create schema (the same one the API validates)', () => {
    for (const config of PROVIDER_TYPE_CATALOG) {
      // version/isActive are storage concerns the create API does not accept
      // (the model applies its own defaults), so they are stripped for the check.
      const { version, isActive, ...payload } = config;
      const parsed = createProviderTypeConfigSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(`${config.typeKey}: ${JSON.stringify(parsed.error.issues.slice(0, 3))}`);
      }
    }
  });

  it('only asks for documents that exist in the vocabulary', () => {
    for (const config of PROVIDER_TYPE_CATALOG) {
      const keys = [...config.requiredDocs, ...config.optionalDocs].map((doc) => doc.key);
      const unknown = keys.filter((key) => !DOCUMENT_TYPES.includes(key));
      expect({ typeKey: config.typeKey, unknown }).toEqual({ typeKey: config.typeKey, unknown: [] });
      expect(config.requiredDocs.length).toBeGreaterThan(0);
      for (const doc of [...config.requiredDocs, ...config.optionalDocs]) {
        expect(doc.label.length).toBeGreaterThan(0);
        if (doc.expiryRequired) expect(doc.key.length).toBeGreaterThan(0);
      }
    }
  });

  it('resolves every step field exactly once', () => {
    for (const config of PROVIDER_TYPE_CATALOG) {
      const used = config.steps.flatMap((step) => step.fields);
      expect(new Set(used).size).toBe(used.length);
      expect(used.sort()).toEqual(config.fields.map((field) => field.key).sort());
      expect(used.length).toBeGreaterThan(5);
      expect(config.steps.map((step) => step.key)).toContain('review');
      expect(config.fields.some((field) => field.key === 'display_name')).toBe(true);
    }
  });

  it('marks the 2.md 6 high-risk types for two-person approval only', () => {
    const twoPerson = PROVIDER_TYPE_CATALOG.filter((config) => config.approvalPolicy?.twoPerson)
      .map((config) => config.typeKey).sort();
    expect(twoPerson).toEqual(['ambulance_operator', 'maternity_ivf', 'rehab_centre', 'support_group_host']);
    for (const config of PROVIDER_TYPE_CATALOG) {
      expect(APPROVAL_LEVELS).toContain(config.approvalPolicy.level);
      expect(config.approvalPolicy.slaHours).toBeGreaterThanOrEqual(0);
    }
  });

  it('tiers every clinical type T1/T2 and every wellness/commerce type T3', () => {
    for (const config of PROVIDER_TYPE_CATALOG) {
      if (config.group === 'clinical') expect(['T1', 'T2']).toContain(config.tier);
      if (config.group === 'wellness' || config.group === 'commerce') expect(config.tier).toBe('T3');
    }
  });

  it('groups the chooser exactly as 2.md 2 tabulates it', () => {
    const groups = providerTypeGroups();
    expect(groups.map((group) => group.group)).toEqual([
      'clinical', 'commerce', 'community', 'home_service', 'professional', 'transport', 'wellness',
    ]);
    for (const group of groups) expect(group.count).toBe(group.types.length);
    expect(groups.find((group) => group.group === 'clinical').count).toBe(23);
  });
});
