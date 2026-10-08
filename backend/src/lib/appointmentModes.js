// R0 taxonomy (rolesmd/subcatogary.md Part A1 #10 + D1 step 6,
// docs/platform-expansion-plan.md T0.1).
//
// Appointment-mode normalization: `home` duplicated `home_visit` and
// `voice`/`call` duplicated `audio`. The canonical list is the five modes the
// plan names; the three legacy spellings stay accepted on the way in (stored
// documents still hold them) and are rewritten onto the canonical value.
//
// `offline` is deliberately NOT remapped: it is still the key
// `Appointment.appointmentMode`, `appointmentFees.offline` and the clinic UI
// read (see models/Facility.js), so rewriting it would break fee lookups.
// Unknown values pass through untouched — the model enum (not this helper)
// decides what is rejected.
//
// Pure module: no model imports, safe to require from models, routes and
// validate.js alike.
export const CANONICAL_APPOINTMENT_MODES = Object.freeze([
  'in_person',
  'video',
  'audio',
  'chat',
  'home_visit',
]);

// Legacy spelling -> canonical mode. Lowercase keys; lookup lowercases input.
const MODE_ALIASES = Object.freeze({
  home: 'home_visit',
  voice: 'audio',
  call: 'audio',
});

// normalizeMode('home') -> 'home_visit'; normalizeMode('Voice') -> 'audio';
// normalizeMode('video') -> 'video'. Non-strings and unknown strings are
// returned unchanged.
export function normalizeMode(raw) {
  if (typeof raw !== 'string') return raw;
  const key = raw.trim().toLowerCase();
  if (!key) return raw;
  return MODE_ALIASES[key] ?? raw.trim();
}

// normalizeModes(['home', 'video', 'call', 'video']) ->
// ['home_visit', 'video', 'audio']. Dedupes while preserving first-seen order.
// Non-array input is returned unchanged.
export function normalizeModes(list) {
  if (!Array.isArray(list)) return list;
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const mode = normalizeMode(item);
    if (!seen.has(mode)) {
      seen.add(mode);
      out.push(mode);
    }
  }
  return out;
}

export default normalizeMode;
