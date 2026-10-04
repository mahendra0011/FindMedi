#!/usr/bin/env node
/**
 * DL-B-01: purge/reindex documents created with a shared (or missing) salt.
 *
 * Background: before the fail-closed salt gate, EHR docs could be indexed with
 * a common fallback key. Those rows are NOT isolated per patient and must be
 * purged (then re-indexed from Mongo with the real per-deployment salt).
 *
 * Heuristic for "suspect": an EHR doc whose stored patientId/patientPseudonym
 * is not a 32-hex keyed pseudonym (raw Mongo id, empty, or legacy shared key
 * that fails the shape check). Shape-only on purpose: without the original
 * salt we cannot recompute the old key, but anything that is not a 32-hex
 * pseudonym provably did not come through pseudonymizePatientId().
 *
 * Usage:
 *   node scripts/purge-shared-key-docs.mjs --dry-run [--index <name>] [--limit 100]
 *   node scripts/purge-shared-key-docs.mjs --confirm --index <name>
 *
 * --dry-run only reports (exit 0, no writes). A real purge requires --confirm
 * and refuses to run without OPENSEARCH_NODE + credentials.
 */
const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const CONFIRM = args.has('--confirm');

const opt = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const NODE = (process.env.OPENSEARCH_NODE || '').replace(/\/$/, '');
const INDEX = opt('--index', process.env.EHR_INDEX || 'findmedi_ehr_docs_v1');
const LIMIT = Number(opt('--limit', '100'));
const USER = process.env.OPENSEARCH_USERNAME || '';
const PASS = process.env.OPENSEARCH_PASSWORD || '';

const isPseudonymShape = (v) => /^[a-f0-9]{32}$/.test(String(v || ''));

async function osReq(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (USER && PASS) {
    headers.Authorization = `Basic ${Buffer.from(`${USER}:${PASS}`).toString('base64')}`;
  }
  const res = await fetch(`${NODE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`OpenSearch ${res.status} on ${path}`);
  return res.json().catch(() => ({}));
}

if (!DRY_RUN && !CONFIRM) {
  console.error('Refusing to run: pass --dry-run to report or --confirm to purge.');
  process.exit(2);
}
if (!NODE) {
  console.error('OPENSEARCH_NODE is not set; nothing to scan.');
  process.exit(2);
}
if (!DRY_RUN && !(USER && PASS)) {
  console.error('OPENSEARCH_USERNAME/OPENSEARCH_PASSWORD are required for a real purge.');
  process.exit(2);
}

// Pull a page of docs and classify by shape. Pagination is deliberately
// bounded: this is a triage tool, not a migration runner.
const data = await osReq('POST', `/${INDEX}/_search`, {
  size: Number.isFinite(LIMIT) ? Math.min(Math.max(LIMIT, 1), 1000) : 100,
  _source: ['recordId', 'patientId', 'patientPseudonym'],
  query: { match_all: {} },
  sort: [{ _doc: 'asc' }],
});
const hits = data?.hits?.hits || [];
const suspect = hits.filter((h) => {
  const s = h._source || {};
  return !isPseudonymShape(s.patientId) || !isPseudonymShape(s.patientPseudonym);
});

console.log(`Scanned ${hits.length} doc(s) in ${INDEX}.`);
console.log(`Suspect shared-key/raw-id docs: ${suspect.length}.`);
for (const h of suspect.slice(0, 20)) {
  const s = h._source || {};
  console.log(`  - _id=${h._id} recordId=${s.recordId} patientId=${s.patientId} pseudonym=${s.patientPseudonym}`);
}
if (suspect.length > 20) console.log(`  ... and ${suspect.length - 20} more`);

if (DRY_RUN) {
  console.log('dry-run: no writes performed. Re-index suspects from Mongo, then re-run with --confirm to purge.');
  console.log('Reindex procedure: set OPENSEARCH_PSEUDONYM_SALT (>=32 chars), re-run the EHR backfill so each doc is rewritten via pseudonymizePatientId(), then purge the suspects above with --confirm and verify the count returns to 0.');
  process.exit(0);
}

// Real purge: delete exactly the suspect ids reported above.
let deleted = 0;
for (const h of suspect) {
  await osReq('DELETE', `/${INDEX}/_doc/${encodeURIComponent(String(h._id))}`);
  deleted += 1;
}
console.log(`Purged ${deleted} suspect doc(s). Re-index from Mongo with the current salt, then re-run --dry-run (expect 0 suspects).`);
