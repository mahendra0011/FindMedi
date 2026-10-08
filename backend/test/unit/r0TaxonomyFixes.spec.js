import { describe, it, expect } from '@jest/globals';
import {
  CANONICAL_SPECIALTIES,
  SPECIALTY_ALIAS_MAP,
  normalizeSpecialty,
} from '../../src/lib/canonicalSpecialties.js';
import {
  normalizeMode,
  normalizeModes,
  CANONICAL_APPOINTMENT_MODES,
} from '../../src/lib/appointmentModes.js';
import {
  normalizeMode as validateNormalizeMode,
  canonicalRxSchedule,
  createMedicineSchema,
  MEDICINE_RX_SCHEDULES,
} from '../../src/utils/validate.js';
import { SPECIALTIES } from '../../src/lib/taxonomy.js';
import Doctor from '../../src/models/Doctor.js';
import Medicine, { RX_SCHEDULES, canonicalRxSchedule as modelCanonical } from '../../src/models/Medicine.js';

describe('R0 taxonomy fixes (A1 + D1 / T0.1)', () => {
  it('exposes one canonical specialty list with alias map + normalizer', () => {
    expect(CANONICAL_SPECIALTIES).toBe(SPECIALTIES);
    expect(CANONICAL_SPECIALTIES.length).toBeGreaterThanOrEqual(40);
    for (const [alias, code] of [
      ['orthopedics', 'SPEC.ORTHO'],
      ['orthopaedics', 'SPEC.ORTHO'],
      ['pediatrics', 'SPEC.PAED'],
      ['paediatrics', 'SPEC.PAED'],
      ['gynecology', 'SPEC.OBGY'],
      ['dentist', 'SPEC.DENTAL'],
      ['dentistry', 'SPEC.DENTAL'],
    ]) {
      expect(SPECIALTY_ALIAS_MAP.get(alias)).toBe(code);
    }
    expect(normalizeSpecialty('Orthopedics')).toEqual({ code: 'SPEC.ORTHO', name: 'Orthopaedics' });
    expect(normalizeSpecialty('Pediatrics')).toEqual({ code: 'SPEC.PAED', name: 'Paediatrics' });
    expect(normalizeSpecialty('definitely not a specialty')).toBeNull();
    expect(normalizeSpecialty('')).toBeNull();
  });

  it('normalizes legacy appointment modes, leaving offline/unknown untouched', () => {
    expect(normalizeMode('home')).toBe('home_visit');
    expect(normalizeMode('voice')).toBe('audio');
    expect(normalizeMode('call')).toBe('audio');
    expect(normalizeMode('Voice')).toBe('audio');
    expect(normalizeMode('video')).toBe('video');
    // offline stays: Appointment.appointmentMode + appointmentFees.offline read it
    expect(normalizeMode('offline')).toBe('offline');
    expect(normalizeMode('in_person')).toBe('in_person');
    expect(normalizeMode('carrier-pigeon')).toBe('carrier-pigeon');
    expect(normalizeModes(['home', 'video', 'call', 'video'])).toEqual(['home_visit', 'video', 'audio']);
    expect(normalizeModes('video')).toBe('video');
    expect(CANONICAL_APPOINTMENT_MODES).toEqual(['in_person', 'video', 'audio', 'chat', 'home_visit']);
    expect(validateNormalizeMode).toBe(normalizeMode);
  });

  it('keeps specialization and adds subSpecialtyCodes on Doctor', () => {
    expect(Doctor.schema.path('specialization').isRequired).toBe(true);
    expect(Doctor.schema.path('specialtyCode')).toBeTruthy();
    const sub = Doctor.schema.path('subSpecialtyCodes');
    expect(sub).toBeTruthy();
    expect(sub.instance).toBe('Array');
  });

  it('accepts display Rx-schedule spellings and canonicalizes them', () => {
    for (const alias of ['OTC', 'H', 'H1', 'X', 'G', 'NDPS', 'NON_SCHEDULED_RX', 'AYUSH']) {
      expect(RX_SCHEDULES).toContain(alias);
      expect(MEDICINE_RX_SCHEDULES).toContain(alias);
    }
    expect(new Set(MEDICINE_RX_SCHEDULES)).toEqual(new Set(RX_SCHEDULES));
    expect(modelCanonical('H1')).toBe('h1');
    expect(modelCanonical('NON_SCHEDULED_RX')).toBe('rx');
    expect(canonicalRxSchedule('NDPS')).toBe('narcotic_ndps');
    expect(canonicalRxSchedule('otc')).toBe('otc');
    expect(canonicalRxSchedule('garbage')).toBe('garbage');
    const parsed = createMedicineSchema.parse({
      name: 'Amoxicillin 500', category: 'Antibiotic',
      price: 100, stock: 10, rxSchedule: 'H1',
    });
    expect(parsed.rxSchedule).toBe('h1');
  });

  it('adds migration-safe storage flags on Medicine without touching category', () => {
    expect(Medicine.schema.path('category').isRequired).toBe(true);
    for (const flag of [
      'storage.coldChain', 'storage.coldChainTemp', 'storage.controlled',
      'storage.ageRestricted', 'storage.pregnancyUnsafe', 'storage.lasaWarning',
    ]) {
      expect(Medicine.schema.path(flag)).toBeTruthy();
    }
    expect(Medicine.schema.path('therapeuticClass')).toBeTruthy();
    expect(Medicine.schema.path('productLine')).toBeTruthy();
  });
});
