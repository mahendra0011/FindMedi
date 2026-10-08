const REGEX_META = /[.*+?^${}()|[\]\\]/g;

const norm = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const escape = (value) => value.replace(REGEX_META, '\\$&');

/**
 * Chip labels that predate the canonical taxonomy: they bundle two names into
 * one label ("General Physician/ Internal Medicine"), so the label itself never
 * matches a stored specialization. Expanding them is what keeps those chips
 * working once the option list comes from Category(type:'specialty').
 */
const LEGACY_LABELS = {
  'general physician internal medicine': ['general medicine', 'internal medicine'],
  'gastroenterology gi medicine': ['gastroenterology', 'gastroenterologist', 'gastro'],
  'pulmonology respiratory medicine': ['pulmonology', 'chest medicine', 'respiratory medicine'],
  'general laparoscopic surgeon': ['general surgery', 'laparoscopic surgery'],
  'medical oncology': ['oncology'],
  'diabetology': ['diabetology', 'diabetologist', 'diabetes specialist'],
  'dentist': ['dentist', 'dentistry', 'dental'],
};

/** Spellings the old hardcoded lists disagreed on (subcatogary.md Part A #1). */
const SPELLINGS = {
  'orthopedics': ['orthopedics', 'orthopaedics', 'ortho'],
  'orthopaedics': ['orthopedics', 'orthopaedics', 'ortho'],
  'pediatrics': ['pediatrics', 'paediatrics', 'pediatrician'],
  'paediatrics': ['pediatrics', 'paediatrics', 'paediatrician'],
  'gynecology': ['gynecology', 'gynaecology', 'obstetrics', 'gynecologist'],
  'gynaecology': ['gynecology', 'gynaecology', 'obstetrics', 'gynaecologist'],
  'obstetrics gynaecology': ['obstetrics', 'gynaecology', 'gynecology', 'ob gyn'],
  'general medicine': ['general medicine', 'general physician', 'internal medicine'],
  'psychology': ['psychology', 'psychologist'],
};

/**
 * Every spelling a filter label can legitimately match on, normalised.
 * Category rows (name + aliases) win; the static maps only cover labels the
 * API does not know yet.
 */
export function specialtyAliases(filter, categories = []) {
  const key = norm(filter);
  if (!key || key === 'all') return [];

  const hit = (categories || []).find((c) => norm(c.name) === key)
    || (categories || []).find((c) => (c.aliases || []).some((a) => norm(a) === key));
  if (hit) return [hit.name, ...(hit.aliases || [])].map(norm).filter(Boolean);

  return [...(LEGACY_LABELS[key] || []), ...(SPELLINGS[key] || [])].map(norm).filter(Boolean);
}

/**
 * Canonical category name a UI label resolves to (exact name or alias), or
 * null when the taxonomy does not know the label. Lets a screen keep its
 * presentation-only extras while dropping anything the API already owns.
 */
export function canonicalName(label, categories = []) {
  const key = norm(label);
  if (!key || key === 'all') return null;
  return (categories || []).reduce((found, c) => {
    if (found) return found;
    const names = [c.name, ...(c.aliases || [])].map(norm);
    return names.includes(key) ? c.name : null;
  }, null);
}

/** Boundary-anchored so an 'ENT' filter cannot swallow 'Dentistry'. */
const containsTerm = (target, term) =>
  new RegExp(`(?:^|[^a-z])${escape(term)}(?:[^a-z]|$)`, 'i').test(target);

/**
 * True when a doctor's free-text specialization satisfies a filter label.
 * Aliases are consulted first, so "Orthopaedics" (label) finds the doctor who
 * wrote "Orthopedics" - the defect that made filters silently drop doctors.
 */
export function matchesSpecialty(value, filter, categories) {
  if (!filter || filter === 'All') return true;
  const target = norm(value);
  if (!target) return false;

  const terms = specialtyAliases(filter, categories);
  if (!terms.length) return containsTerm(target, norm(filter));
  return terms.some((term) => containsTerm(target, term));
}
