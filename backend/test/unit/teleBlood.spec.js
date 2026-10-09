/**
 * File 22 P1-20/21/24: score engine (covered), teleRx prohibited list,
 * donor auto-deferral math (mirrors the route rules).
 */
import { checkTeleRx, isTeleMode } from '../../src/lib/teleRx.js';

describe('teleRx', () => {
  test('flags NDPS/Schedule-X substrings, case-insensitive', () => {
    const hits = checkTeleRx([
      { medicineName: 'Alprazolam 0.5mg' },
      { medicineName: 'Paracetamol 650' },
      { medicineName: 'Tramadol+Paracetamol' },
    ]);
    expect(hits.map((h) => h.matched).sort()).toEqual(['alprazolam', 'tramadol']);
  });

  test('clean list passes', () => {
    expect(checkTeleRx([{ medicineName: 'Amoxicillin' }])).toEqual([]);
    expect(checkTeleRx([])).toEqual([]);
  });

  test('tele modes detected', () => {
    expect(isTeleMode('video')).toBe(true);
    expect(isTeleMode('audio')).toBe(true);
    expect(isTeleMode('in_person')).toBe(false);
    expect(isTeleMode('offline')).toBe(false);
  });
});

describe('donor deferral rules', () => {
  const defer = ({ age, weightKg, hb, lastDonationAt }) => {
    const reasons = [];
    if (age != null && Number(age) < 18) reasons.push('under 18');
    if (weightKg != null && Number(weightKg) < 45) reasons.push('weight < 45kg');
    if (hb != null && Number(hb) < 12.5) reasons.push('Hb < 12.5');
    if (lastDonationAt) {
      const days = (Date.now() - new Date(lastDonationAt).getTime()) / 86400000;
      if (days < 90) reasons.push('too soon');
    }
    return reasons;
  };

  test('healthy adult passes; violations defer', () => {
    expect(defer({ age: 30, weightKg: 70, hb: 14 })).toEqual([]);
    expect(defer({ age: 16, weightKg: 70, hb: 14 })).toContain('under 18');
    expect(defer({ age: 30, weightKg: 40, hb: 14 })).toContain('weight < 45kg');
    expect(defer({ age: 30, weightKg: 70, hb: 11 })).toContain('Hb < 12.5');
    expect(defer({ age: 30, weightKg: 70, hb: 14, lastDonationAt: new Date().toISOString() })).toContain('too soon');
  });
});
