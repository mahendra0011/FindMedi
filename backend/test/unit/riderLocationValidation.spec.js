import { describe, expect, it } from '@jest/globals';
import { riderLocationSchema } from '../../src/utils/validate.js';

describe('riderLocationSchema', () => {
  it('accepts valid coordinates and bounded optional accuracy', () => {
    expect(riderLocationSchema.safeParse({ lat: 23.18, lng: 79.98, accuracy: 35 }).success).toBe(true);
  });

  it.each([
    { lat: 91, lng: 0 },
    { lat: 0, lng: -181 },
    { lat: Number.NaN, lng: 0 },
    { lat: 0, lng: Number.POSITIVE_INFINITY },
    { lat: 0, lng: 0, accuracy: 0 },
    { lat: 0, lng: 0, accuracy: 1001 },
  ])('rejects out-of-range GPS payload %#', (payload) => {
    expect(riderLocationSchema.safeParse(payload).success).toBe(false);
  });
});
