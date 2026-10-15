/**
 * File 18 §10 Rx QA: data-driven checks over the real DDI knowledge base
 * (backend/src/config/interactions.json via services/ddiEngine.js).
 *
 * What it pins:
 *  - known high-risk pairs from the SHIPPED db are detected at the right
 *    severity (warfarin+aspirin, sildenafil+nitroglycerin = major);
 *  - matching is symmetric (A+B = B+A) and strength-tolerant ("warfarin 5mg");
 *  - unknown drugs are reported as unknownDrugs, never silently "safe";
 *  - fewer than 2 drugs means no pairs (no phantom interactions).
 *
 * NOTE (honest gap): look-alike/sound-alike (LASA) confusion pairs need a
 * pharmacist-curated list that does not exist in-repo yet — this suite covers
 * interaction QA, not LASA. Do not extend it with invented clinical pairs.
 */
import { checkDrugInteractionsDetailed, getKnowledgeBase } from '../../src/services/ddiEngine.js';

describe('Rx interaction QA over the shipped knowledge base', () => {
  it('flags canonical major pairs at major severity', () => {
    const { interactions } = checkDrugInteractionsDetailed(['warfarin', 'aspirin']);
    expect(interactions.length).toBeGreaterThan(0);
    expect(interactions.some((i) => i.severity === 'major')).toBe(true);
  });

  it('flags sildenafil + nitroglycerin as major (hypotension risk)', () => {
    const { interactions } = checkDrugInteractionsDetailed(['sildenafil', 'nitroglycerin']);
    expect(interactions.some((i) => i.severity === 'major')).toBe(true);
  });

  it('matches symmetrically and tolerates strength suffixes', () => {
    const fwd = checkDrugInteractionsDetailed(['warfarin', 'aspirin']).interactions;
    const rev = checkDrugInteractionsDetailed(['aspirin', 'warfarin']).interactions;
    expect(rev.length).toBe(fwd.length);
    const dosed = checkDrugInteractionsDetailed(['warfarin 5mg', 'aspirin 75mg']).interactions;
    expect(dosed.length).toBe(fwd.length);
  });

  it('reports unknown drugs instead of implying safe', () => {
    // Names are normalized (punctuation stripped) before the unknown check.
    const out = checkDrugInteractionsDetailed(['paracetamol', 'someobscureherb_xyz']);
    expect(out.unknownDrugs).toContain('someobscureherbxyz');
    expect(out.unknownDrugs).toContain('paracetamol');
    expect(out.interactions).toEqual([]);
  });

  it('emits no pairs for fewer than two drugs', () => {
    expect(checkDrugInteractionsDetailed([]).interactions).toEqual([]);
    expect(checkDrugInteractionsDetailed(['warfarin']).interactions).toEqual([]);
  });

  it('carries knowledge-base provenance with every answer', () => {
    const kb = getKnowledgeBase();
    expect(kb.pairCount).toBeGreaterThan(100);
    expect(typeof kb.disclaimer).toBe('string');
    expect(kb.disclaimer.length).toBeGreaterThan(0);
  });
});
