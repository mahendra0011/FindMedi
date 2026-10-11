import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { buildDictionary } = await import(new URL('./scripts/lib/dataDictionary.mjs', import.meta.url).href);
const p = path.join(HERE, 'scripts', 'retention-gap-baseline.json');

const dict = await buildDictionary({ modelsDir: path.join(HERE, 'src', 'models') });
const actual = dict.unmappedRetention;
writeFileSync(p, JSON.stringify(actual, null, 2) + '\n');
console.log(`retention-gap-baseline.json = ${actual.length} unmapped PII collections;`);
console.log(actual.join(', '));
