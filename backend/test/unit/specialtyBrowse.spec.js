// Browse-by-Specialties taxonomy invariants (subcatogary.md v2 rules):
// Â§4 de-dup via canonical single-record cross-lists, legacy code aliases,
// PSURGâ†’PAEDSURG rename, and the Â§2/Â§3 browse meta (groups, chips, symptoms).
import { jest as jestApi } from '@jest/globals';
import { describe, it, expect } from '@jest/globals';import {
  SPECIALTIES,
  SPECIALTY_GROUPS,
  SPEC_CODE_ALIASES,
  buildSpecialtyTree,
  buildSpecialtyGroups,
  resolveSpecialty,
  resolveSpecialtyCode,
  remapSubSpecialtyCode,
  remapSubSpecialtyCodes,
  isTopLevelSpecialty,
} from '../../src/lib/taxonomy.js';

const tops = SPECIALTIES.filter(isTopLevelSpecialty);
const tree = buildSpecialtyTree();
const treeByCode = new Map(tree.map((t) => [t.code, t]));

describe('Browse-by-Specialties: catalogue shape', () => {
  it('has exactly 43 top-level tiles and 13 browse groups', () => {
    expect(tops.length).toBe(43);
    expect(buildSpecialtyGroups().length).toBe(13);
  });

  it('leaves no top-level tile without children in the tree', () => {
    const childless = tree.filter((top) => top.children.length === 0);
    expect(childless.map((t) => t.code)).toEqual([]);
  });

  it('gives every tile complete browse meta (group, icon, chips, symptoms)', () => {
    for (const top of tops) {
      expect(top.meta).toBeTruthy();
      expect(SPECIALTY_GROUPS.some((g) => g.id === top.meta.group)).toBe(true);
      expect(top.meta.icon.length).toBeGreaterThan(0);
      expect(top.meta.conditions.length).toBeGreaterThan(0);
      expect(top.meta.procedures.length).toBeGreaterThan(0);
      expect(top.meta.symptoms.length).toBeGreaterThan(0);
    }
  });

  it('flags the four sensitive tiles ðŸ”’ (Psychiatry, Sexology, Infertility, Palliative)', () => {
    const sensitive = tops.filter((t) => t.meta.sensitive).map((t) => t.code).sort();
    expect(sensitive).toEqual(['SPEC.INFERT', 'SPEC.PALLI', 'SPEC.PSYCH', 'SPEC.SEXO'].sort());
  });

  it('keeps claims-restricted âš  flags on cosmetic/hair/weight-loss/IVF nodes', () => {
    const restricted = SPECIALTIES.filter((s) => s.claimsRestricted).map((s) => s.code);
    expect(restricted).toEqual(
      expect.arrayContaining([
        'SPEC.DERM.COSMETIC', 'SPEC.DERM.TRICHOLOGY', 'SPEC.DERM.LASER',
        'SPEC.INFERT.IVF', 'SPEC.GENSURG.BARIATRIC', 'SPEC.GASTRO.BARIATRIC',
      ]),
    );
    const restrictedTops = tops.filter((t) => t.meta.adClaimsRestricted).map((t) => t.code);
    expect(restrictedTops).toEqual(expect.arrayContaining(['SPEC.PLASTSURG', 'SPEC.SEXO', 'SPEC.INFERT']));
  });
});

describe('Browse-by-Specialties: Â§4 de-dup + cross-lists', () => {
  it('resolves every legacy duplicate code to its canonical record', () => {
    const cases = {
      'SPEC.PAED.NEONATO': 'SPEC.NEONATO',
      'SPEC.PAED.CARDIOLOGY': 'SPEC.CARDIO.PAED',
      'SPEC.PAED.SURGERY': 'SPEC.PAEDSURG',
      'SPEC.PSURG.NEONATAL': 'SPEC.PAEDSURG.NEONATAL',
      'SPEC.PSURG.UROLOGY': 'SPEC.PAEDSURG.UROLOGY',
      'SPEC.PSURG.ONCOLOGY': 'SPEC.PAEDSURG.ONCOLOGY',
      'SPEC.CTVS.VASCULAR': 'SPEC.VASC',
      'SPEC.OBGY.INFERT_IVF': 'SPEC.INFERT',
      'SPEC.GASTRO.HEPATOLOGY': 'SPEC.HEPAT',
      'SPEC.PULMO.SLEEP': 'SPEC.SLEEP',
      'SPEC.PSYCH.SLEEP': 'SPEC.SLEEP',
      'SPEC.ORTHO.SPORTS': 'SPEC.SPORTS',
      'SPEC.URO.ANDROLOGY': 'SPEC.SEXO',
      'SPEC.URO.SEXUAL_HEALTH': 'SPEC.SEXO',
    };
    for (const [legacy, canonical] of Object.entries(cases)) {
      expect(SPEC_CODE_ALIASES[legacy]).toBe(canonical);
      expect(resolveSpecialty(legacy)?.code).toBe(canonical);
    }
  });

  it('no longer contains the duplicate records themselves', () => {
    for (const legacyCode of Object.keys(SPEC_CODE_ALIASES)) {
      expect(SPECIALTIES.some((s) => s.code === legacyCode)).toBe(false);
    }
  });

  it('cross-lists render the same record under every secondary parent (alsoUnder)', () => {
    // Neonatology under Paediatrics, Sports under Ortho, IVF under OBGY...
    expect(treeByCode.get('SPEC.PAED').children.map((c) => c.code)).toContain('SPEC.NEONATO');
    expect(treeByCode.get('SPEC.PAED').children.map((c) => c.code)).toContain('SPEC.PAEDSURG');
    expect(treeByCode.get('SPEC.ORTHO').children.map((c) => c.code)).toContain('SPEC.SPORTS');
    expect(treeByCode.get('SPEC.OBGY').children.map((c) => c.code)).toContain('SPEC.INFERT');
    expect(treeByCode.get('SPEC.GASTRO').children.map((c) => c.code)).toContain('SPEC.HEPAT');
    expect(treeByCode.get('SPEC.URO').children.map((c) => c.code)).toContain('SPEC.SEXO');
    // A cross-listed record must KNOW both parents, but carry one identity.
    const haemOnc = SPECIALTIES.find((s) => s.code === 'SPEC.PAED.HAEM_ONC');
    expect(haemOnc.alsoUnder).toEqual(expect.arrayContaining(['SPEC.ONCO', 'SPEC.HAEM']));
  });

  it('dedupes and remaps doctor sub-specialty code arrays', () => {
    expect(remapSubSpecialtyCode('SPEC.PAED.NEONATO')).toBe('SPEC.NEONATO');
    expect(remapSubSpecialtyCode('spec.ctvs.vascular')).toBe('SPEC.VASC');
    expect(remapSubSpecialtyCode('not a code')).toBe('not a code');
    expect(
      remapSubSpecialtyCodes(['SPEC.ORTHO.SPORTS', 'SPEC.SPORTS', 'SPEC.PSURG.ONCOLOGY', 'SPEC.ORTHO.SPORTS']),
    ).toEqual(['SPEC.SPORTS', 'SPEC.PAEDSURG.ONCOLOGY']);
  });
});

describe('Browse-by-Specialties: Â§5 alias + symptom search', () => {
  it('resolves spellings the checklist calls out', () => {
    expect(resolveSpecialtyCode('Orthopedics')).toBe('SPEC.ORTHO');
    expect(resolveSpecialtyCode('Orthopaedics')).toBe('SPEC.ORTHO');
    expect(resolveSpecialtyCode('bone doctor')).toBe('SPEC.ORTHO');
  });

  it('maps IVF phrasing to the canonical Infertility record (not a stale dup)', () => {
    expect(resolveSpecialtyCode('IVF Specialist')).toBe('SPEC.INFERT');
    expect(resolveSpecialtyCode('Fertility Specialist')).toBe('SPEC.INFERT');
  });
});
