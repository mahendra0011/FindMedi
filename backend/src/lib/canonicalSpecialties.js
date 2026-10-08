// R0 taxonomy (rolesmd/subcatogary.md Part A1 #1 + D1 step 1,
// docs/platform-expansion-plan.md T0.1).
//
// The canonical specialty list itself lives in `./taxonomy.js` (`SPECIALTIES`
// + `resolveSpecialty`) so there is exactly one definition. This module is the
// public entry point the task asks for: the canonical list, a static alias
// map, and a `normalizeSpecialty()` helper for the model pre-save hooks and
// the migration script.
//
// Backward-compatible: pure data + pure functions, no model imports, no side
// effects.
import { SPECIALTIES, resolveSpecialty } from './taxonomy.js';

// Canonical list: [{ code: 'SPEC.ORTHO', name: 'Orthopaedics',
// aliases: ['Orthopedics', 'Ortho', ...] }, ...]. Re-exported by reference so
// this module can never drift from taxonomy.js.
export const CANONICAL_SPECIALTIES = SPECIALTIES;

// Static alias map: every spelling (lowercased + trimmed) -> canonical code.
// Built once at import; covers canonical names AND every alias, so
// "Orthopedics", "Pediatrics", "Gynecology", "Dentist" etc. all resolve.
const buildAliasMap = () => {
  const map = new Map();
  for (const specialty of SPECIALTIES) {
    map.set(specialty.name.toLowerCase().trim(), specialty.code);
    for (const alias of specialty.aliases ?? []) {
      const key = String(alias).toLowerCase().trim();
      // First definition wins; aliases are unique across specialties.
      if (key && !map.has(key)) map.set(key, specialty.code);
    }
  }
  return map;
};

export const SPECIALTY_ALIAS_MAP = buildAliasMap();

// normalizeSpecialty('Orthopedics') -> { code: 'SPEC.ORTHO',
// name: 'Orthopaedics' }. Returns null for unknown/empty input — callers keep
// the original free text (e.g. Doctor.specialization) and leave the code
// blank rather than inventing data.
export function normalizeSpecialty(value) {
  const hit = resolveSpecialty(value);
  if (!hit) return null;
  return { code: hit.code, name: hit.name };
}

export default CANONICAL_SPECIALTIES;
