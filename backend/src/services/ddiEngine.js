import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../config/interactions.json');
let interactionDb = [];
try {
  interactionDb = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch {
  interactionDb = [];
}

/**
 * Normalizes drug name: lowercases, trims, and strips generic suffixes/brackets.
 */
function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.toLowerCase().trim().replace(/\s*\([^)]*\)/g, '').replace(/[^a-z0-9 ]/g, '');
}

/**
 * Checks a list of prescribed drug names against known drug-drug interaction pairs.
 * @param {Array<string>} drugs - list of drug / medicine names
 * @returns {Array<object>} - list of detected interactions sorted by severity (major > moderate > minor)
 */
export function checkDrugInteractions(drugs = []) {
  if (!Array.isArray(drugs) || drugs.length < 2) return [];

  const normalizedList = drugs
    .map((d) => normalizeName(typeof d === 'string' ? d : d?.name || d?.genericName || ''))
    .filter(Boolean);

  const matched = [];
  const seenPairKeys = new Set();

  for (let i = 0; i < normalizedList.length; i++) {
    for (let j = i + 1; j < normalizedList.length; j++) {
      const drug1 = normalizedList[i];
      const drug2 = normalizedList[j];

      for (const entry of interactionDb) {
        const entryA = normalizeName(entry.drugA);
        const entryB = normalizeName(entry.drugB);

        const match1 = (drug1.includes(entryA) && drug2.includes(entryB)) || (drug1.includes(entryB) && drug2.includes(entryA));
        if (match1) {
          const pairKey = [entryA, entryB].sort().join('::');
          if (!seenPairKeys.has(pairKey)) {
            seenPairKeys.add(pairKey);
            matched.push({
              drugA: entry.drugA,
              drugB: entry.drugB,
              detectedPair: [drugs[i], drugs[j]],
              severity: entry.severity,
              effect: entry.effect,
              recommendation: entry.recommendation,
            });
          }
        }
      }
    }
  }

  const severityOrder = { major: 1, moderate: 2, minor: 3 };
  return matched.sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99));
}

export default {
  checkDrugInteractions,
};
