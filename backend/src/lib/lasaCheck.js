/**
 * LASA (look-alike / sound-alike) confusion-pair checker.
 *
 * Data lives in config/lasaPairs.json and is pharmacist-owned: pairs are
 * filled AFTER a pharmacist joins via the Join Platform (provider type
 * `pharmacy`, `pharmacist_reg` document) and passes KYC. The engine enforces
 * that contract in code:
 *  - ONLY entries with verified:true can ever fire an alert;
 *  - unverified entries are counted (ignoredUnverified) and skipped;
 *  - a file with reviewStatus anything other than "verified" still works,
 *    but every alert carries the dataset provenance so the UI can show
 *    "pending pharmacist review" next to LASA warnings.
 *
 * checkLasa answers ONE question: "is anything on this prescription a known
 * confusion risk — i.e. should the dispenser double-check the pack?" It does
 * NOT judge safety and MUST NOT move the DDI overallRiskLevel (ddi.js keeps
 * that pure; lasaAlerts ride alongside as a separate verify channel).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEVERITIES = new Set(['high', 'moderate']);
const TYPES = new Set(['look-alike', 'sound-alike', 'both']);

function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\b\d+(\.\d+)?\s*(mg|mcg|g|ml|iu|units?)\b/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Validate one raw pair entry. Returns { ok, errors[], pair }. */
export function validateLasaPair(raw, index = 0) {
  const errors = [];
  const p = raw && typeof raw === 'object' ? raw : {};
  if (typeof p.id !== 'string' || !p.id.trim()) errors.push(`pairs[${index}].id is required`);
  if (typeof p.drugA !== 'string' || !normalizeName(p.drugA)) errors.push(`pairs[${index}].drugA is required`);
  if (typeof p.drugB !== 'string' || !normalizeName(p.drugB)) errors.push(`pairs[${index}].drugB is required`);
  if (p.drugA && p.drugB && normalizeName(p.drugA) === normalizeName(p.drugB)) {
    errors.push(`pairs[${index}] drugA and drugB are the same drug`);
  }
  if (!TYPES.has(p.type)) errors.push(`pairs[${index}].type must be look-alike | sound-alike | both`);
  if (!SEVERITIES.has(p.severity)) errors.push(`pairs[${index}].severity must be high | moderate`);
  if (p.note !== undefined && (typeof p.note !== 'string' || p.note.length > 300)) {
    errors.push(`pairs[${index}].note must be a string <= 300 chars`);
  }
  if (p.verified === true && (typeof p.reviewedBy !== 'string' || !p.reviewedBy.trim())) {
    errors.push(`pairs[${index}] verified:true requires reviewedBy (pharmacist accountability)`);
  }
  return { ok: errors.length === 0, errors, pair: p };
}

/**
 * Load + validate the dataset. Never throws: a missing/corrupt file means
 * "no LASA coverage" (empty pairs), never a 500 on the prescription screen.
 */
export function loadLasaPairs(filePath) {
  const resolved = filePath || path.join(__dirname, '../config/lasaPairs.json');
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch {
    return { pairs: [], ignoredUnverified: 0, invalid: 0, errors: [], meta: { version: 'missing', reviewStatus: 'missing' } };
  }
  const list = Array.isArray(raw?.pairs) ? raw.pairs : [];
  const pairs = [];
  let ignoredUnverified = 0;
  let invalid = 0;
  const errors = [];
  list.forEach((entry, i) => {
    const { ok, errors: errs, pair } = validateLasaPair(entry, i);
    if (!ok) {
      invalid += 1;
      errors.push(...errs);
      return;
    }
    if (pair.verified === true) pairs.push(pair);
    else ignoredUnverified += 1;
  });
  return {
    pairs,
    ignoredUnverified,
    invalid,
    errors,
    meta: {
      version: raw?.meta?.version || 'unversioned',
      reviewStatus: raw?.meta?.reviewStatus || 'unknown',
    },
  };
}

/**
 * Check a prescription drug list against VERIFIED confusion pairs.
 * A hit means "this name confuses with X — verify the pack", with the
 * pharmacist's note attached. Matching is normalized + symmetric.
 */
export function checkLasa(drugs = [], pairs = []) {
  if (!Array.isArray(drugs) || !Array.isArray(pairs) || pairs.length === 0) return [];
  // Defense in depth: the loader filters to verified-only, but direct
  // callers might not — an unverified pair must NEVER fire from here either.
  const live = pairs.filter((p) => p && p.verified === true);
  if (live.length === 0) return [];
  const alerts = [];
  for (const raw of drugs) {
    const name = typeof raw === 'string' ? raw : raw?.name;
    const norm = normalizeName(name);
    if (!norm) continue;
    for (const pair of live) {
      const a = normalizeName(pair.drugA);
      const b = normalizeName(pair.drugB);
      if (!a || !b) continue;
      const hitSide = norm === a || norm === b
        || norm.split(' ').some((w) => w && (w === a || w === b));
      if (!hitSide) continue;
      const confusedWith = norm === a ? pair.drugB : pair.drugA;
      alerts.push({
        pairId: pair.id,
        drug: String(name),
        confusedWith,
        type: pair.type,
        severity: pair.severity,
        note: pair.note || 'Verify pack against prescription — known confusion pair.',
      });
    }
  }
  // De-dupe identical (drug, pair) hits from multi-token matching.
  const seen = new Set();
  return alerts.filter((al) => {
    const k = `${al.drug.toLowerCase()}::${al.pairId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
