#!/usr/bin/env node
/** Fail when model PII retention gaps differ from the reviewed baseline. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildDictionary } from './lib/dataDictionary.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const expected = JSON.parse(readFileSync(path.join(HERE, 'retention-gap-baseline.json'), 'utf8'));
const { unmappedRetention: actual } = await buildDictionary({ modelsDir: path.join(HERE, '..', 'src', 'models') });
const additions = actual.filter((collection) => !expected.includes(collection));
const removals = expected.filter((collection) => !actual.includes(collection));

if (additions.length || removals.length) {
  console.error('PII retention-gap baseline drifted. Review each collection and update the policy/baseline deliberately.');
  if (additions.length) console.error(`New unmapped PII collections: ${additions.join(', ')}`);
  if (removals.length) console.error(`Resolved/removed collections requiring baseline review: ${removals.join(', ')}`);
  process.exit(1);
}

console.log(`Retention-gap gate OK (${actual.length} explicitly tracked unmapped PII collections).`);
