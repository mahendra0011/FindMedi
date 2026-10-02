#!/usr/bin/env node
/**
 * DP-M-01 — event schema registry compatibility gate.
 *
 * The registry (src/events/schemaRegistry.js) enforces contracts at runtime;
 * this script enforces the things runtime cannot see:
 *
 *   1. COMPLETENESS  every `case '<literal>'` in the Kafka consumer, every
 *      KAFKA_TOPICS topic, and every producer-side `eventType: '<literal>'`
 *      must have a registry entry. A new consumer branch or producer event
 *      that skips the registry fails CI until it is registered.
 *   2. BACKWARD COMPAT  every entry ships a valid fixture that must parse
 *      against the current schema — fixtures are the append-only history of
 *      what consumers have already accepted, so loosening/re-typing a field in
 *      an incompatible way fails here. Every entry also ships a negative
 *      fixture (`*.invalid.json`) that must NOT parse, proving the schema
 *      still rejects garbage rather than having been loosened into a rubber
 *      stamp.
 *   3. STATIC COMPLETENESS LIMIT  dynamic eventTypes (template literals like
 *      `${type}.assigned`) cannot be enumerated statically; they are printed
 *      as info and constrained at runtime (registered + invalid → throw).
 *
 * Run:  node scripts/check-event-schema-compat.mjs     (CI: tenant-guard job)
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { KAFKA_TOPICS } from '../src/config/kafka.js';
import { EVENT_SCHEMA_ENTRIES, lookupEntry } from '../src/events/schemaRegistry.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND = join(HERE, '..');
const SRC = join(BACKEND, 'src');
const FIXTURES = join(SRC, 'events', 'fixtures');
const REGISTRY_FILE = join(SRC, 'events', 'schemaRegistry.js');

function jsFilesUnder(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const name of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, name.name);
      if (name.isDirectory()) stack.push(p);
      else if (name.isFile() && name.name.endsWith('.js')) out.push(p);
    }
  }
  return out;
}

/** All `case '<literal>'` values in the consumer's event switch. */
export function collectConsumerCases() {
  const src = readFileSync(join(SRC, 'services', 'kafkaConsumerService.js'), 'utf8');
  return [...src.matchAll(/case\s+'([^']+)'/g)].map((m) => m[1]);
}

/**
 * Static producer-side eventTypes: `eventType: '<literal>'` object fields plus
 * the positional emit* wrappers (`emitPharmacyInventoryEvent(id, 'type', …)`).
 * The registry's own definition file is skipped — it is the definition site,
 * not a producer. Dynamic (backtick) names are returned separately as info.
 */
export function collectProducerEventTypes() {
  const literals = new Set();
  const dynamic = [];
  for (const file of jsFilesUnder(SRC)) {
    if (file === REGISTRY_FILE) continue;
    const rel = relative(SRC, file).split(sep).join('/');
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/eventType:\s*'([^']+)'/g)) literals.add(m[1]);
    for (const m of src.matchAll(
      /emit(?:HospitalAdmission|PharmacyInventory)Event\(\s*[^,]+,\s*'([^']+)'/g
    )) {
      literals.add(m[1]);
    }
    for (const m of src.matchAll(/eventType:\s*`([^`]+)`/g)) dynamic.push(`${rel}: ${m[1]}`);
  }
  return { literals: [...literals].sort(), dynamic };
}

export function runChecks() {
  const problems = [];
  const registeredTypes = new Set(
    EVENT_SCHEMA_ENTRIES.filter((e) => e.eventType).map((e) => e.eventType)
  );

  // 1a. Every consumer switch case must be registered.
  const consumerCases = collectConsumerCases();
  for (const c of consumerCases) {
    if (!registeredTypes.has(c)) {
      problems.push(
        `consumer case '${c}' has no registry entry — an event arriving for it passes unvalidated`
      );
    }
  }

  // 1b. Every topic in the manifest must have at least one entry.
  for (const topic of Object.values(KAFKA_TOPICS)) {
    if (!EVENT_SCHEMA_ENTRIES.some((e) => e.topic === topic)) {
      problems.push(`topic ${topic} has no registry entry — payloads on it are never validated`);
    }
  }

  // 1c. Every static producer literal must be registered.
  const { literals, dynamic } = collectProducerEventTypes();
  for (const t of literals) {
    if (!registeredTypes.has(t)) {
      problems.push(
        `producer emits eventType '${t}' but no registry entry exists — consumers of it see a silent default`
      );
    }
  }

  // 2. Fixture contract: valid must pass, invalid must fail, both must exist.
  for (const entry of EVENT_SCHEMA_ENTRIES) {
    const validPath = join(FIXTURES, entry.fixture);
    const invPath = join(FIXTURES, entry.fixture.replace(/\.json$/, '.invalid.json'));
    if (!existsSync(validPath)) {
      problems.push(`entry ${entry.key} is missing its fixture ${entry.fixture}`);
      continue;
    }
    let valid;
    try {
      valid = JSON.parse(readFileSync(validPath, 'utf8'));
    } catch (e) {
      problems.push(`fixture ${entry.fixture} is not valid JSON: ${e.message}`);
      continue;
    }
    const res = entry.schema.safeParse(valid);
    if (!res.success) {
      const detail = res.error.issues
        .map((i) => `${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`)
        .join('; ');
      problems.push(
        `fixture ${entry.fixture} no longer validates (BACKWARD-COMPAT BREAK): ${detail}`
      );
    }
    if (!existsSync(invPath)) {
      problems.push(
        `entry ${entry.key} is missing its negative fixture ${entry.fixture.replace(/\.json$/, '.invalid.json')}`
      );
      continue;
    }
    let inv;
    try {
      inv = JSON.parse(readFileSync(invPath, 'utf8'));
    } catch (e) {
      problems.push(`negative fixture ${invPath} is not valid JSON: ${e.message}`);
      continue;
    }
    if (entry.schema.safeParse(inv).success) {
      problems.push(
        `negative fixture ${entry.fixture.replace(/\.json$/, '.invalid.json')} PASSES the schema — the entry no longer rejects malformed payloads`
      );
    }
  }

  // Sanity: lookup fallback must not shadow an exact entry anywhere.
  for (const entry of EVENT_SCHEMA_ENTRIES) {
    if (entry.eventType && lookupEntry(entry.topic, entry.eventType)?.key !== entry.key) {
      problems.push(`entry ${entry.key} is shadowed by another registry entry`);
    }
  }

  return { problems, consumerCases, literals, dynamic, entryCount: EVENT_SCHEMA_ENTRIES.length };
}

const separator = '='.repeat(72);

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const { problems, consumerCases, literals, dynamic, entryCount } = runChecks();
  console.log(separator);
  console.log('DP-M-01 · event schema registry compatibility');
  console.log(separator);
  console.log(`registry entries        : ${entryCount}`);
  console.log(`consumer cases covered  : ${consumerCases.length}`);
  console.log(`producer literals       : ${literals.length}`);
  if (dynamic.length) {
    console.log(`dynamic eventTypes (info, runtime-enforced): ${dynamic.length}`);
    for (const d of dynamic) console.log(`    ${d}`);
  }

  if (problems.length) {
    console.error(`\n${problems.length} PROBLEM(S):\n`);
    for (const p of problems) console.error(`  - ${p}\n`);
    console.error(separator);
    process.exit(1);
  }

  console.log(
    '\nOK — every consumer case, topic and producer literal is registered; ' +
      'all fixtures validate; all negative fixtures reject.'
  );
  console.log(separator);
}
