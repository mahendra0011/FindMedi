/**
 * DL-M-09 + DOC-M-01: retention CI gate.
 *
 * The gate is three parts that must agree, or a new PII collection can ship
 * with no retention decision:
 *   1. backend/scripts/check-retention-gaps.mjs (fails on baseline drift) +
 *      the `retention:gaps` npm script that runs it;
 *   2. retention-gap-baseline.json allowlist == the dictionary's actual
 *      unmapped set (additions and silent removals both fail);
 *   3. docs/privacy/RETENTION.md + DPIA.md carry a control-to-code mapping
 *      table, so the policy names the enforcement point instead of prose.
 */
import { describe, it, expect, beforeAll } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDictionary } from '../../scripts/lib/dataDictionary.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.join(HERE, '..', '..');
const REPO = path.join(BACKEND, '..');

let dict;
beforeAll(async () => {
  dict = await buildDictionary({ modelsDir: path.join(BACKEND, 'src', 'models') });
}, 60000);

describe('retention CI gate wiring', () => {
  it('check-retention-gaps script and npm script exist', () => {
    expect(fs.existsSync(path.join(BACKEND, 'scripts', 'check-retention-gaps.mjs'))).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(path.join(BACKEND, 'package.json'), 'utf8'));
    expect(pkg.scripts?.['retention:gaps']).toContain('check-retention-gaps.mjs');
    const gate = fs.readFileSync(
      path.join(BACKEND, 'scripts', 'check-retention-gaps.mjs'),
      'utf8',
    );
    expect(gate).toContain('retention-gap-baseline.json');
    expect(gate).toContain('process.exit(1)');
  });

  it('every PII collection has a retention class or an explicit allowlist entry', () => {
    const baseline = JSON.parse(
      fs.readFileSync(path.join(BACKEND, 'scripts', 'retention-gap-baseline.json'), 'utf8'),
    );
    // No new unmapped collection may appear without a deliberate baseline review.
    for (const collection of dict.unmappedRetention) {
      expect(baseline).toContain(collection);
    }
    // No stale allowlist entry may linger after its collection was mapped/removed.
    for (const collection of baseline) {
      expect(dict.unmappedRetention).toContain(collection);
    }
    // And every PII collection is decided: a RETENTION.md class or an
    // explicit allowlist entry (tracked gap, never a silent one).
    for (const d of dict.models) {
      if (d.piiFieldCount === 0 || d.orgRecord) continue;
      if (d.retention === null && !baseline.includes(d.collection)) {
        throw new Error(
          `${d.collection} holds PII but maps to no retention class and is not allowlisted`,
        );
      }
      expect(d.retention !== null || baseline.includes(d.collection)).toBe(true);
    }
  });
});

describe('retention control-to-code mapping docs', () => {
  it('RETENTION.md maps each class to its enforcement point', () => {
    const doc = fs.readFileSync(path.join(REPO, 'docs', 'privacy', 'RETENTION.md'), 'utf8');
    expect(doc).toContain('Control-to-code mapping');
    for (const anchor of [
      'check-retention-gaps.mjs',
      'retention-gap-baseline.json',
      'dataDictionary.mjs',
      'data-dictionary.md',
    ]) {
      expect(doc).toContain(anchor);
    }
  });

  it('DPIA.md maps erasure/retention duties to code', () => {
    const doc = fs.readFileSync(path.join(REPO, 'docs', 'privacy', 'DPIA.md'), 'utf8');
    expect(doc).toContain('Control-to-code mapping');
    for (const anchor of ['deletionService.js', 'purgeUserFromSearch', 'user.deleted']) {
      expect(doc).toContain(anchor);
    }
  });
});
