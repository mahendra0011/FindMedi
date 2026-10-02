/**
 * DOC-M-03: regenerate docs/data-dictionary.md from the mongoose schemas.
 *
 *   node scripts/gen-data-dictionary.mjs           # write the file
 *   node scripts/gen-data-dictionary.mjs --check   # exit 1 if it is stale
 *
 * `--check` is what makes the freshness test meaningful outside Jest too: CI
 * (or a pre-commit hook) can assert the committed dictionary matches the code
 * without running the full test suite.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDictionary, renderMarkdown } from './lib/dataDictionary.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = path.join(HERE, '..', 'src', 'models');
const OUTPUT = path.join(HERE, '..', '..', 'docs', 'data-dictionary.md');

const dict = await buildDictionary({ modelsDir: MODELS_DIR });
const rendered = renderMarkdown(dict);

if (process.argv.includes('--check')) {
  const current = existsSync(OUTPUT) ? readFileSync(OUTPUT, 'utf8') : '';
  if (current !== rendered) {
    console.error('docs/data-dictionary.md is STALE — run: npm run docs:dictionary');
    process.exit(1);
  }
  console.log(`data dictionary fresh (${dict.counts.models} models, ${dict.counts.piiFields} PII fields)`);
  process.exit(0);
}

mkdirSync(path.dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, rendered, 'utf8');

console.log(`wrote ${path.relative(process.cwd(), OUTPUT)}`);
console.log(`  models: ${dict.counts.models}/${dict.counts.files} files (skipped ${dict.counts.skipped})`);
console.log(`  fields: ${dict.counts.fields} (${dict.counts.piiFields} PII in ${dict.counts.collectionsWithPii} collections)`);
console.log(`  TTL collections: ${dict.counts.ttlCollections}`);
if (dict.counts.skipped > 0) {
  for (const s of dict.skipped) console.log(`  SKIPPED ${s.file}: ${s.reason}`);
}
if (dict.counts.unmappedRetention > 0) {
  console.log(`  retention gaps (PII, no class): ${dict.unmappedRetention.join(', ')}`);
}
