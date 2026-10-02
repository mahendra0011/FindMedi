import { describe, it, expect } from '@jest/globals';
import fs from 'node:fs';

/**
 * MIND-M-01: validated PHQ-9 / GAD-7 scoring.
 *
 * The band tests check every published cut-point rather than a couple of
 * samples, because severity bands are exactly the kind of thing that is "close
 * enough" until a patient at 9 vs 10 is mis-triaged.
 */
const load = () => import('../../src/services/mentalHealthScreening.js');

/** Build a response set that scores exactly N (greedy fill). */
const answersFor = (instrument, n) => {
  const out = {};
  let left = n;
  for (const item of instrument.items) {
    const v = Math.min(3, left);
    out[item.id] = v;
    left -= v;
  }
  return out;
};

describe('MIND-M-01 severity bands match the published cut-points', () => {
  it('PHQ-9: 0-4 Minimal, 5-9 Mild, 10-14 Moderate, 15-19 Mod.severe, 20-27 Severe', async () => {
    const { score, PHQ9 } = await load();
    const expected = [[0,'Minimal'],[4,'Minimal'],[5,'Mild'],[9,'Mild'],[10,'Moderate'],[14,'Moderate'],[15,'Moderately severe'],[19,'Moderately severe'],[20,'Severe'],[27,'Severe']];
    for (const [n, severity] of expected) {
      const r = score('PHQ-9', answersFor(PHQ9, n));
      expect({ n, total: r.total, severity: r.severity }).toEqual({ n, total: n, severity });
    }
  });

  it('GAD-7: 0-4 Minimal, 5-9 Mild, 10-14 Moderate, 15-21 Severe (max 21, not 27)', async () => {
    const { score, GAD7 } = await load();
    const expected = [[0,'Minimal'],[4,'Minimal'],[5,'Mild'],[9,'Mild'],[10,'Moderate'],[14,'Moderate'],[15,'Severe'],[21,'Severe']];
    for (const [n, severity] of expected) {
      const r = score('GAD-7', answersFor(GAD7, n));
      expect({ n, total: r.total, severity: r.severity }).toEqual({ n, total: n, severity });
    }
    expect(GAD7.maxScore).toBe(21);
  });
});

describe('MIND-M-01 the suicidality item is a risk signal, not just a score', () => {
  it('flags on any non-zero answer, even when the total is Minimal', async () => {
    const { score, PHQ9 } = await load();
    // Everything "not at all" except item 9. Total is 1 - the LOWEST possible
    // band. Reporting that as "Minimal, nothing to see" is how a risk signal
    // disappears into a dashboard, so referral must still fire.
    const r = score('PHQ-9', answersFor(PHQ9, 0));
    expect(r.suicidalityFlagged).toBe(false);

    const flagged = score('PHQ-9', { ...answersFor(PHQ9, 0), phq9_9: 1 });
    expect(flagged.total).toBe(1);
    expect(flagged.severity).toBe('Minimal');
    expect(flagged.suicidalityFlagged).toBe(true);
    expect(flagged.referralSuggested).toBe(true);
  });

  it('derives the flag from the ITEM definition, not a hardcoded item number', async () => {
    const src = fs.readFileSync(new URL('../../src/services/mentalHealthScreening.js', import.meta.url), 'utf8');
    const block = src.slice(src.indexOf('const suicidalityFlagged'));
    expect(block).toContain('item.suicidalityItem');
    expect(block).not.toMatch(/phq9_9\s*===|items\[8\]/);
  });

  it('only PHQ-9 has such an item', async () => {
    const { PHQ9, GAD7 } = await load();
    expect(PHQ9.items.filter((i) => i.suicidalityItem)).toHaveLength(1);
    expect(GAD7.items.filter((i) => i.suicidalityItem)).toHaveLength(0);
  });
});

describe('MIND-M-01 an incomplete instrument is INVALID, not a low score', () => {
  it('rejects missing items, names them, and returns NO total', async () => {
    const { score } = await load();
    const r = score('PHQ-9', { phq9_1: 2 });
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('phq9_2');
    // A partial screen scoring 0 would read as "well" downstream.
    expect(r.total).toBeUndefined();
  });

  it('rejects values outside 0-3', async () => {
    const { score, GAD7 } = await load();
    expect(score('GAD-7', { ...answersFor(GAD7, 0), gad7_1: 7 }).valid).toBe(false);
    expect(score('GAD-7', { ...answersFor(GAD7, 0), gad7_1: -1 }).valid).toBe(false);
    expect(score('GAD-7', { ...answersFor(GAD7, 0), gad7_1: 1.5 }).valid).toBe(false);
  });

  it('rejects an unknown instrument rather than defaulting', async () => {
    const { score } = await load();
    const r = score('MMPI-2', {});
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('Unknown instrument');
  });
});
describe('MIND-M-01 trend tracking distinguishes signal from noise', () => {
  it('a change under the reliable-change threshold is NOT a trend', async () => {
    const { trend } = await load();
    // PHQ-9 reliable change is 5. A 2-point move is measurement noise.
    const t = trend('PHQ-9', [{ total: 22, completedAt: '2024-01-01' }, { total: 20, completedAt: '2024-02-01' }]);
    expect(t.direction).toBe('stable');
    expect(t.change).toBe(-2);
    expect(t.clinicallyMeaningful).toBe(false);
  });

  it('uses a DIFFERENT reliable-change threshold per instrument (PHQ 5, GAD 4)', async () => {
    const { trend } = await load();
    const phq = trend('PHQ-9', [{ total: 22, completedAt: '2024-01-01' }, { total: 17, completedAt: '2024-02-01' }]);
    const gad = trend('GAD-7', [{ total: 15, completedAt: '2024-01-01' }, { total: 11, completedAt: '2024-02-01' }]);
    expect(phq.direction).toBe('improving');
    expect(gad.direction).toBe('improving');
    expect(phq.reliableChangeThreshold).toBe(5);
    expect(gad.reliableChangeThreshold).toBe(4);
  });

  it('reports the change SIGNED so "down 6" cannot read as worsening', async () => {
    const { trend } = await load();
    expect(trend('PHQ-9', [{ total: 22, completedAt: '2024-01-01' }, { total: 16, completedAt: '2024-02-01' }]).change).toBe(-6);
    expect(trend('PHQ-9', [{ total: 10, completedAt: '2024-01-01' }, { total: 22, completedAt: '2024-02-01' }]).direction).toBe('worsening');
  });

  it('one administration is not a trend', async () => {
    const { trend } = await load();
    const t = trend('PHQ-9', [{ total: 15, completedAt: '2024-01-01' }]);
    expect(t.direction).toBe('no-data');
    expect(t.clinicallyMeaningful).toBe(false);
  });

  it('sorts out-of-order administrations chronologically', async () => {
    const { trend } = await load();
    const t = trend('PHQ-9', [
      { total: 10, completedAt: '2024-03-01' },
      { total: 22, completedAt: '2024-01-01' },
      { total: 15, completedAt: '2024-02-01' },
    ]);
    expect(t.points.map((p) => p.total)).toEqual([22, 15, 10]);
    expect(t.direction).toBe('improving');
  });
});

describe('MIND-M-01 the flag reaches the crisis queue', () => {
  const routes = () => fs.readFileSync(new URL('../../src/routes/mentalhealth.js', import.meta.url), 'utf8');

  it('pushes a real crisis event onto crisisEvents, not just calls the helper', async () => {
    const src = routes();
    const block = src.slice(src.indexOf("referrals/:id/screening'"), src.indexOf('referrals/:id/screening/trend'));
    expect(block).toContain('openCrisisEvent({');
    // Without this the event object exists but nothing reads it - the crisis
    // queue iterates crisisEvents.
    expect(block).toContain('r.crisisEvents.push(event)');
    expect(block).toContain('openCrisisCount');
    expect(block.indexOf('r.crisisEvents.push')).toBeLessThan(block.indexOf('await r.save()'));
  });

  it('escalates before the screening is reported back', async () => {
    const src = routes();
    const block = src.slice(src.indexOf("referrals/:id/screening'"), src.indexOf('referrals/:id/screening/trend'));
    expect(block.indexOf('openCrisisEvent')).toBeLessThan(block.indexOf('res.status(201)'));
  });

  it('stores raw responses so a stored total stays re-derivable', async () => {
    const model = fs.readFileSync(new URL('../../src/models/MentalHealth.js', import.meta.url), 'utf8');
    expect(model).toMatch(/responses:\s*\{\s*type:\s*mongoose\.Schema\.Types\.Mixed, required: true \}/);
    expect(model).toMatch(/suicidalityFlagged:\s*\{\s*type: Boolean/);
  });
});