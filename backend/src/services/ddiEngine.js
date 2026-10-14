import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../config/interactions.json');
let interactionDb;
try {
  interactionDb = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch {
  interactionDb = [];
}

// T3: knowledge-base provenance lives NEXT TO the pair data (not inside it —
// interactions.json must remain a pure array for the data-lint test).
const metaPath = path.join(__dirname, '../config/interactions.meta.json');
let knowledgeBaseMeta;
try {
  knowledgeBaseMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
} catch {
  knowledgeBaseMeta = null;
}

/**
 * Provenance for /ddi/check consumers: version, review status and the
 * clinical disclaimer. `pairCount` is computed live so it can never drift
 * from the actual knowledge base.
 */
export function getKnowledgeBase() {
  return {
    version: knowledgeBaseMeta?.version || 'unversioned',
    updatedAt: knowledgeBaseMeta?.updatedAt || null,
    pairCount: NORMALIZED_DB.length,
    reviewStatus: knowledgeBaseMeta?.reviewStatus || 'unknown',
    reviewedBy: knowledgeBaseMeta?.reviewedBy || null,
    reviewedAt: knowledgeBaseMeta?.reviewedAt || null,
    reviewCadence: knowledgeBaseMeta?.reviewCadence || null,
    disclaimer:
      knowledgeBaseMeta?.disclaimer
      || 'Clinical decision support — not a substitute for professional judgement.',
  };
}

// Pre-compute normalized keys once at load — the hot loop below used to
// re-normalize every entry for every (drug_i, drug_j) pair: O(n² · db).
const NORMALIZED_DB = interactionDb.map((entry) => ({
  entry,
  keyA: normalizeName(entry.drugA),
  keyB: normalizeName(entry.drugB),
  pairKey: [normalizeName(entry.drugA), normalizeName(entry.drugB)].sort().join('::'),
}));

/**
 * Normalizes drug name: lowercases, trims, strips strength tokens
 * (500mg, 0.5mg, 10ml), brackets and generic suffixes.
 */
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

// T3: memoize repeated checks (pharmacy re-checks the same Rx on every render
// pass; the doctor's draft re-checks on each keystroke via the route layer).
const checkCache = new Map();
const CACHE_MAX = 500;

/**
 * Checks a list of prescribed drug names against known drug-drug interaction pairs.
 * Matching is symmetric (A+B = B+A) and subsumption-based ("warfarin 5mg"
 * matches entry "warfarin"). Unknown drugs are reported as `unknownDrugs` so
 * the UI can say "not checked" instead of silently showing "safe".
 * @param {Array<string|object>} drugs - list of drug / medicine names
 * @returns {{interactions: Array<object>, unknownDrugs: Array<string>}}
 */
export function checkDrugInteractionsDetailed(drugs = []) {
  if (!Array.isArray(drugs) || drugs.length < 2) {
    return { interactions: [], unknownDrugs: Array.isArray(drugs) ? drugs.map((d) => label(d)).filter(Boolean) : [] };
  }

  const labels = drugs.map((d) => label(d));
  const normalizedList = drugs
    .map((d) => normalizeName(typeof d === 'string' ? d : d?.name || d?.medicineName || d?.genericName || ''))
    .filter(Boolean);

  const cacheKey = [...normalizedList].sort().join('|');
  const cached = checkCache.get(cacheKey);
  if (cached) return cached;

  const matched = [];
  const seenPairKeys = new Set();
  const matchedDrugIdx = new Set();

  for (let i = 0; i < normalizedList.length; i++) {
    for (let j = i + 1; j < normalizedList.length; j++) {
      const drug1 = normalizedList[i];
      const drug2 = normalizedList[j];

      for (const { entry, keyA, keyB, pairKey } of NORMALIZED_DB) {
        if (!keyA || !keyB) continue;
        // Symmetric subsumption match.
        const match =
          (drug1.includes(keyA) && drug2.includes(keyB)) ||
          (drug1.includes(keyB) && drug2.includes(keyA));
        if (!match) continue;
        if (!seenPairKeys.has(pairKey)) {
          seenPairKeys.add(pairKey);
          matched.push({
            drugA: entry.drugA,
            drugB: entry.drugB,
            detectedPair: [labels[i], labels[j]],
            severity: entry.severity,
            effect: entry.effect,
            recommendation: entry.recommendation,
          });
        }
        matchedDrugIdx.add(i);
        matchedDrugIdx.add(j);
      }
    }
  }

  const severityOrder = { major: 1, moderate: 2, minor: 3 };
  matched.sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99));

  // Any prescribed drug that matched NOTHING against the DB may still be
  // unknown to the knowledge base — surface it as "not checked". A drug that
  // matched at least one pair is obviously known, so we only report the rest
  // when the DB did not cover them at all. This is heuristic: an unknown drug
  // paired with a known drug with no interaction row is indistinguishable from
  // "checked, no interaction" without a drug formulary — so we mark ALL
  // non-matching drugs as unchecked when they don't appear verbatim in the DB.
  const dbKeys = new Set();
  for (const { keyA, keyB } of NORMALIZED_DB) {
    if (keyA) dbKeys.add(keyA);
    if (keyB) dbKeys.add(keyB);
  }
  const unknownDrugs = normalizedList.filter((n, idx) => !matchedDrugIdx.has(idx) && !dbKeys.has(n));

  const result = { interactions: matched, unknownDrugs };
  if (checkCache.size >= CACHE_MAX) checkCache.clear();
  checkCache.set(cacheKey, result);
  return result;
}

function label(d) {
  if (typeof d === 'string') return d;
  return d?.name || d?.medicineName || d?.genericName || '';
}

/**
 * Back-compat wrapper: returns just the interaction list (sorted by severity).
 */
export function checkDrugInteractions(drugs = []) {
  return checkDrugInteractionsDetailed(drugs).interactions;
}

export default {
  checkDrugInteractions,
  checkDrugInteractionsDetailed,
  getKnowledgeBase,
};
