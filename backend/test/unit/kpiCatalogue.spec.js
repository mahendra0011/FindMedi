/**
 * File 22 P2-36: KPI catalogue parity.
 *
 * A catalogue entry the compute route never fills in is a dashboard card that
 * silently shows nothing forever — so the two lists are asserted against each
 * other, not just counted.
 */
import fs from 'node:fs';
import path from 'node:path';
import { KPI_CATALOGUE } from '../../src/models/KpiDefinition.js';

const insightsSrc = fs.readFileSync(
  path.join(process.cwd(), 'src/routes/insights.js'), 'utf8',
);

const catalogueKeys = KPI_CATALOGUE.map((k) => k.key);

describe('P2-36 KPI catalogue', () => {
  test('catalogue carries the 35 documented KPIs', () => {
    expect(KPI_CATALOGUE).toHaveLength(35);
  });

  test('every key is unique', () => {
    expect(new Set(catalogueKeys).size).toBe(catalogueKeys.length);
  });

  test('every entry has name, category and unit', () => {
    for (const k of KPI_CATALOGUE) {
      expect(typeof k.key).toBe('string');
      expect(k.name).toBeTruthy();
      expect(k.category).toBeTruthy();
      expect(k.unit).toBeTruthy();
    }
  });

  test('categories stay within the dashboard vocabulary', () => {
    const allowed = new Set(['ops', 'finance', 'clinical', 'growth']);
    for (const k of KPI_CATALOGUE) expect(allowed.has(k.category)).toBe(true);
  });

  test('every catalogue key is actually assigned by /kpis/compute', () => {
    const assigned = new Set(
      [...insightsSrc.matchAll(/\bout\.([a-z_0-9]+)\s*=/g)].map((m) => m[1]),
    );
    const missing = catalogueKeys.filter((key) => !assigned.has(key));
    expect(missing).toEqual([]);
  });

  test('compute never writes a key the catalogue does not describe', () => {
    const catalogued = new Set(catalogueKeys);
    const orphan = [...insightsSrc.matchAll(/\bout\.([a-z_0-9]+)\s*=/g)]
      .map((m) => m[1])
      .filter((key) => !catalogued.has(key));
    expect(orphan).toEqual([]);
  });

  test('every KPI is assigned somewhere in the compute handler (before the response)', () => {
    // The handler returns `{ kpis: out }` — each assignment must appear above
    // that return, otherwise it is dead code that never reaches the client.
    const returnIdx = insightsSrc.indexOf('return res.json({ kpis: out })');
    expect(returnIdx).toBeGreaterThan(0);
    const handler = insightsSrc.slice(0, returnIdx);
    const missing = catalogueKeys.filter(
      (key) => !new RegExp(`\\bout\\.${key}\\s*=`).test(handler),
    );
    expect(missing).toEqual([]);
  });
});
