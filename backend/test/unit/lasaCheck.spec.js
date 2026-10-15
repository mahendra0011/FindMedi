/**
 * LASA pipeline QA: schema validation, verified-only firing, dataset loading.
 *
 * Uses INLINE fixtures only — the shipped config/lasaPairs.json must stay
 * empty until a KYC-approved pharmacist curates it (invented clinical pairs
 * are a patient-safety risk, so no real pair names live in this file's
 * passing assertions beyond obviously synthetic tokens).
 */
import { validateLasaPair, loadLasaPairs, checkLasa } from '../../src/lib/lasaCheck.js';

const good = (over = {}) => ({
  id: 'LASA-T1',
  drugA: 'Alphamycin',
  drugB: 'Alphamycine',
  type: 'sound-alike',
  severity: 'high',
  note: 'Synthetic fixture pair.',
  verified: true,
  reviewedBy: 'pharmacist-fixture',
  ...over,
});

describe('validateLasaPair', () => {
  it('accepts a complete verified pair', () => {
    expect(validateLasaPair(good()).ok).toBe(true);
  });

  it('rejects same-drug pairs, bad enums and long notes', () => {
    expect(validateLasaPair(good({ drugB: 'Alphamycin' })).ok).toBe(false);
    expect(validateLasaPair(good({ type: 'smell-alike' })).ok).toBe(false);
    expect(validateLasaPair(good({ severity: 'extreme' })).ok).toBe(false);
    expect(validateLasaPair(good({ note: 'x'.repeat(301) })).ok).toBe(false);
  });

  it('verified:true without reviewedBy fails (pharmacist accountability)', () => {
    const { ok, errors } = validateLasaPair(good({ reviewedBy: '' }));
    expect(ok).toBe(false);
    expect(errors.join(' ')).toMatch(/reviewedBy/);
  });
});

describe('checkLasa firing rules', () => {
  const pairs = [good()];

  it('alerts on either side of a verified pair, symmetrically', () => {
    const a = checkLasa(['Alphamycin 500mg'], pairs);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ confusedWith: 'Alphamycine', severity: 'high' });
    const b = checkLasa(['alphamycine'], pairs);
    expect(b).toHaveLength(1);
    expect(b[0].confusedWith).toBe('Alphamycin');
  });

  it('never fires unverified pairs', () => {
    expect(checkLasa(['Alphamycin'], [good({ verified: false })])).toEqual([]);
    expect(checkLasa(['Alphamycin'], [good({ verified: undefined })])).toEqual([]);
  });

  it('ignores non-matching drugs and empty inputs', () => {
    expect(checkLasa(['Paracetamol'], pairs)).toEqual([]);
    expect(checkLasa([], pairs)).toEqual([]);
    expect(checkLasa(['Alphamycin'], [])).toEqual([]);
  });
});

describe('loadLasaPairs dataset contract', () => {
  it('loads the shipped (empty, pending-pharmacist) dataset without firing', () => {
    const ds = loadLasaPairs();
    expect(ds.pairs).toEqual([]);
    expect(ds.meta.reviewStatus).toBe('pending-pharmacist');
    expect(checkLasa(['anything'], ds.pairs)).toEqual([]);
  });

  it('returns empty coverage for a missing file instead of throwing', () => {
    const ds = loadLasaPairs('/nonexistent/lasa.json');
    expect(ds.pairs).toEqual([]);
    expect(ds.meta.reviewStatus).toBe('missing');
  });
});
