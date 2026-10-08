import { describe, it, expect } from '@jest/globals';
import {
  CATEGORY_TYPES, CATEGORY_CODE_RE, SPECIALTIES,
  deriveCategoryCode, resolveSpecialtyCode, specialtyPattern, specialtyCondition,
} from '../../src/lib/taxonomy.js';
import { createCategorySchema, updateCategorySchema } from '../../src/utils/validate.js';
import Category from '../../src/models/Category.js';
import Doctor from '../../src/models/Doctor.js';

describe('R0 taxonomy foundation', () => {
  it('keeps the legacy category types and adds the PART B3 ones', () => {
    for (const legacy of ['test', 'medicine', 'department', 'service']) {
      expect(CATEGORY_TYPES).toContain(legacy);
    }
    for (const added of ['specialty', 'sub_specialty', 'facility_type', 'provider_type', 'emergency_type', 'medicine_class']) {
      expect(CATEGORY_TYPES).toContain(added);
    }
    expect(new Set(CATEGORY_TYPES).size).toBe(CATEGORY_TYPES.length);
  });

  it('derives a stable code per type', () => {
    expect(deriveCategoryCode('test', 'CBC Blood Test')).toBe('TEST.CBC_BLOOD_TEST');
    expect(deriveCategoryCode('sub_specialty', 'Cardiac - Paed')).toBe('SUBSPECIALTY.CARDIAC_PAED');
    expect(CATEGORY_CODE_RE.test(deriveCategoryCode('medicine', 'Paracetamol 500'))).toBe(true);
  });

  it('rejects malformed codes', () => {
    for (const bad of ['spec.cardio', 'SPEC', 'SPEC.', 'SPEC.A B', 'SPEC.a/b', 'SPEC;DROP']) {
      expect(CATEGORY_CODE_RE.test(bad)).toBe(false);
    }
  });

  it('gives every canonical specialty a unique, well-formed code', () => {
    const codes = SPECIALTIES.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => CATEGORY_CODE_RE.test(code))).toBe(true);
    expect(SPECIALTIES.length).toBeGreaterThanOrEqual(40);
  });

  it("resolves every spelling of a specialty to one canonical code", () => {
    const pairs = [
      ['Orthopedics', 'SPEC.ORTHO'],
      ['Orthopaedics', 'SPEC.ORTHO'],
      ['Pediatrics', 'SPEC.PAED'],
      ['Paediatrics', 'SPEC.PAED'],
      ['Gynecologist', 'SPEC.OBGY'],
      ['Obstetrics & Gynaecology', 'SPEC.OBGY'],
      ['Dentist', 'SPEC.DENTAL'],
      ['Dentistry', 'SPEC.DENTAL'],
      ['General Physician', 'SPEC.GENMED'],
      ['Chest Physician', 'SPEC.PULMO'],
      ['Diabetologist', 'SPEC.ENDO'],
    ];
    for (const [input, code] of pairs) expect(resolveSpecialtyCode(input)).toBe(code);
    expect(resolveSpecialtyCode('definitely not a specialty')).toBeNull();
    expect(resolveSpecialtyCode('')).toBeNull();
  });

  it('matches alias spellings without matching mid-word', () => {
    expect(specialtyPattern('Orthopaedics').test('Dr Mehta - Orthopedics')).toBe(true);
    expect(specialtyPattern('Orthopaedics').test('Cardiology')).toBe(false);
    expect(specialtyPattern('ENT').test('Patient')).toBe(false);
    expect(specialtyPattern('Cardiology').test('Interventional Cardiology')).toBe(true);
    expect(specialtyPattern('unknown specialty')).toBeNull();
  });

  it('returns a code + alias condition for doctor filters', () => {
    const condition = specialtyCondition('Cardiology');
    expect(condition.$or[0]).toEqual({ specialtyCode: 'SPEC.CARDIO' });
    expect(condition.$or[1].specialization).toBeInstanceOf(RegExp);
    expect(specialtyCondition('   ')).toBeNull();
    expect(specialtyCondition('not a specialty')).toEqual({ specialization: expect.any(RegExp) });
  });

  it('validates category writes and keeps code server-owned on update', () => {
    expect(createCategorySchema.parse({ name: ' Cardiology ', type: 'specialty', aliases: ['Heart'] }))
      .toMatchObject({ name: 'Cardiology', type: 'specialty' });
    expect(() => createCategorySchema.parse({ name: 'x', type: 'nope' })).toThrow();
    expect(() => createCategorySchema.parse({ name: 'x', type: 'test', code: 'spec.cardio' })).toThrow();
    const updated = updateCategorySchema.parse({ name: 'Renamed', code: 'SPEC.X', path: 'X', level: 9 });
    expect(updated).toEqual({ name: 'Renamed' });
  });

  it('declares the PART B2 fields and indexes on the Category model', () => {
    expect(Category.schema.path('type').enumValues).toEqual(expect.arrayContaining([...CATEGORY_TYPES]));
    expect(Category.schema.path('code').options.immutable).toBe(true);
    for (const field of ['code', 'aliases', 'path', 'level', 'tier', 'regulatedBy', 'adClaimsRestricted', 'externalCodes.snomed', 'externalCodes.icd10', 'nameHi']) {
      expect(Category.schema.path(field)).toBeTruthy();
    }
    const indexes = Category.schema.indexes();
    expect(indexes.some(([keys, options]) => keys.type === 1 && keys.code === 1 && options.unique === true)).toBe(true);
    expect(indexes.some(([keys]) => keys.type === 1 && keys.parent === 1 && keys.name === 1)).toBe(true);
    expect(indexes.some(([keys]) => keys.name === 'text')).toBe(true);
  });

  it('adds the canonical specialtyCode field to the Doctor model', () => {
    const field = Doctor.schema.path('specialtyCode');
    expect(field).toBeTruthy();
    expect(field.instance).toBe('String');
    expect(field.options.default).toBe('');
  });
});
