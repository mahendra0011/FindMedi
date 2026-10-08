/**
 * subcatogary.md §79 — Test.sampleType free-text → enum.
 *
 * What it pins:
 *  - the write vocabulary coerces (trim + case-insensitive): 'blood' and
 *    '  Urine ' arrive at the model as 'Blood' / 'Urine', '' stays '';
 *  - anything outside the catalog vocabulary 400s at the zod boundary
 *    (garbage can no longer be typed into the catalogue or the
 *    collect-sample form);
 *  - createTestSchema persists sampleType end-to-end through validate() —
 *    before this slice the create path silently STRIPPED it (unknown key on
 *    a non-strict schema), so the enum only ever applied on PUT.
 */
import { describe, it, expect } from '@jest/globals';
import {
  TEST_SAMPLE_TYPES, canonicalSampleType, sampleTypeSchema, createTestSchema,
} from '../../src/utils/validate.js';

describe('TEST_SAMPLE_TYPES vocabulary', () => {
  it('keeps the unspecified tail so legacy catalog rows stay valid', () => {
    expect(TEST_SAMPLE_TYPES).toContain('');
    expect(TEST_SAMPLE_TYPES).toContain('Blood');
  });

  it('canonicalizes staff-typed input without rejecting it', () => {
    expect(sampleTypeSchema.parse('blood')).toBe('Blood');
    expect(sampleTypeSchema.parse('  Urine ')).toBe('Urine');
    expect(sampleTypeSchema.parse('Blood')).toBe('Blood');
    expect(sampleTypeSchema.parse('')).toBe('');
    expect(canonicalSampleType('  serum\t')).toBe('Serum');
  });

  it('rejects vocabulary outside the catalog at the boundary', () => {
    expect(() => sampleTypeSchema.parse('marrow soup')).toThrow();
    expect(() => sampleTypeSchema.parse('plasmaa')).toThrow();
  });

  it('persists sampleType through the catalog create schema', () => {
    const parsed = createTestSchema.parse({
      name: 'CBC', category: 'Blood', price: 100, sampleType: 'blood',
    });
    expect(parsed.sampleType).toBe('Blood');
  });

  it('leaves create untouched when sampleType is omitted', () => {
    const parsed = createTestSchema.parse({ name: 'CBC', category: 'Blood', price: 100 });
    expect(parsed).not.toHaveProperty('sampleType');
  });
});
