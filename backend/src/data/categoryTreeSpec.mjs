/**
 * §2.1 Specialty category nodes — GENERATED from src/lib/taxonomy.js (SPECIALTIES).
 * DO NOT EDIT BY HAND — edit taxonomy.js (and its subcatogary.md §2.1 seed) instead.
 *
 * Exclusion: every SPEC.DENTAL* code is curated by hand in categoryTree.mjs
 * (procedure/diagnostic leaves + tree-only codes such as SPEC.DENTAL.PAED),
 * so the taxonomy DENTAL subtree is skipped here to avoid duplicate codes.
 *
 * Mapping rules:
 *   - root codes (SPEC.X)      -> type 'specialty',     tier T1, regulatedBy ['NMC']
 *   - sub codes (SPEC.X.Y...)  -> type 'sub_specialty', tier T2 (T1 when sensitive)
 *   - kind 'Practitioner'; sensitive/claimsRestricted inherited from the root
 *   - nameHi copied from taxonomy meta when present
 */
import { SPECIALTIES } from '../lib/taxonomy.js';

const isRootCode = (code) => code.split('.').length === 2;

const ROOT_INDEX = new Map();
for (const entry of SPECIALTIES) {
  if (isRootCode(entry.code)) ROOT_INDEX.set(entry.code, entry);
}

const flagged = (entry, key, metaKey) =>
  Boolean(entry[key] || (entry.meta && entry.meta[metaKey]));

const buildSpecNode = (entry) => {
  const parts = entry.code.split('.');
  const root = isRootCode(entry.code)
    ? entry
    : ROOT_INDEX.get(parts.slice(0, 2).join('.'));
  const sensitive =
    flagged(entry, 'sensitive', 'sensitive') ||
    Boolean(root && flagged(root, 'sensitive', 'sensitive'));
  const claims =
    flagged(entry, 'claimsRestricted', 'adClaimsRestricted') ||
    Boolean(root && flagged(root, 'claimsRestricted', 'adClaimsRestricted'));
  const node = {
    code: entry.code,
    name: entry.name,
    nameHi: (entry.meta && entry.meta.nameHi) || '',
    aliases: [...(entry.aliases || [])],
    parent: isRootCode(entry.code) ? null : parts.slice(0, -1).join('.'),
    type: isRootCode(entry.code) ? 'specialty' : 'sub_specialty',
    tier: sensitive || isRootCode(entry.code) ? 'T1' : 'T2',
    kind: 'Practitioner',
    isSensitive: sensitive,
    adClaimsRestricted: claims,
  };
  if (isRootCode(entry.code)) node.regulatedBy = ['NMC'];
  return node;
};

export const SPEC_CATEGORY_NODES = Object.freeze(
  SPECIALTIES
    .filter((entry) => !entry.code.startsWith('SPEC.DENTAL'))
    .map(buildSpecNode)
);

export default SPEC_CATEGORY_NODES;
