import { describe, expect, it } from 'vitest';
import { canonicalName, matchesSpecialty, specialtyAliases } from './specialtyFilter';

const CATEGORIES = [
  { name: 'Orthopedics', aliases: ['Orthopaedics', 'Bone & Joint'] },
  { name: 'Pediatrics', aliases: ['Paediatrics'] },
  { name: 'Dental', aliases: ['Dentistry', 'Dentist'] },
  { name: 'Otolaryngology', aliases: ['ENT', 'Ear Nose Throat'] },
];

describe('matchesSpecialty (alias-aware filtering)', () => {
  it('matches everything when no filter is selected', () => {
    expect(matchesSpecialty('Cardiology', '')).toBe(true);
    expect(matchesSpecialty('Cardiology', 'All')).toBe(true);
    expect(matchesSpecialty(undefined, 'All')).toBe(true);
  });

  it('matches a doctor through a spelling variant of the filter label', () => {
    expect(matchesSpecialty('Orthopedics', 'Orthopaedics')).toBe(true);
    expect(matchesSpecialty('Orthopaedics', 'Orthopedics')).toBe(true);
    expect(matchesSpecialty('Pediatrics', 'Paediatrics')).toBe(true);
  });

  it('prefers API aliases over the built-in spelling map', () => {
    expect(matchesSpecialty('Orthopedics', 'Bone & Joint', CATEGORIES)).toBe(true);
    expect(matchesSpecialty('Bone & Joint', 'Orthopedics', CATEGORIES)).toBe(true);
    expect(matchesSpecialty('Cardiology', 'Bone & Joint', CATEGORIES)).toBe(false);
  });

  it('keeps a short filter from swallowing a longer unrelated specialty', () => {
    expect(matchesSpecialty('Dentistry', 'ENT')).toBe(false);
    expect(matchesSpecialty('ENT', 'Dentistry')).toBe(false);
    expect(matchesSpecialty('Otolaryngology', 'ENT', CATEGORIES)).toBe(true);
  });

  it('expands legacy composite chip labels', () => {
    expect(matchesSpecialty('Internal Medicine', 'General Physician/ Internal Medicine')).toBe(true);
    expect(matchesSpecialty('Gastroenterologist', 'Gastroenterology/GI medicine')).toBe(true);
  });

  it('returns false for a doctor with no specialization', () => {
    expect(matchesSpecialty('', 'Cardiology')).toBe(false);
    expect(matchesSpecialty(undefined, 'Cardiology')).toBe(false);
  });
});

describe('specialtyAliases', () => {
  it('reports no aliases for an empty or All filter', () => {
    expect(specialtyAliases('')).toEqual([]);
    expect(specialtyAliases('All')).toEqual([]);
  });

  it('returns the canonical name plus its aliases for a known category', () => {
    const terms = specialtyAliases('Orthopaedics', CATEGORIES);
    expect(terms).toContain('orthopedics');
    expect(terms).toContain('bone joint');
  });
});

describe('canonicalName', () => {
  it('resolves an alias back to the canonical category name', () => {
    expect(canonicalName('Orthopaedics', CATEGORIES)).toBe('Orthopedics');
    expect(canonicalName('Bone & Joint', CATEGORIES)).toBe('Orthopedics');
    expect(canonicalName('Orthopedics', CATEGORIES)).toBe('Orthopedics');
  });

  it('returns null for unknown labels and the All sentinel', () => {
    expect(canonicalName('Cardiology', CATEGORIES)).toBeNull();
    expect(canonicalName('All', CATEGORIES)).toBeNull();
    expect(canonicalName('', CATEGORIES)).toBeNull();
  });
});
