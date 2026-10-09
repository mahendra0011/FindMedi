/**
 * File 13 §13.5: pure DNF condition matcher shared by live sweep,
 * test-fire and backtest. `get` reads dot-path fields.
 */
export function get(obj, path) {
  return String(path || '').split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

function cmp(actual, op, value) {
  switch (op) {
    case '=': return actual === value;
    case '!=': return actual !== value;
    case '>': return Number(actual) > Number(value);
    case '>=': return Number(actual) >= Number(value);
    case '<': return Number(actual) < Number(value);
    case '<=': return Number(actual) <= Number(value);
    case 'between': {
      const [lo, hi] = Array.isArray(value) ? value : [null, null];
      const n = Number(actual);
      return (lo == null || n >= Number(lo)) && (hi == null || n <= Number(hi));
    }
    case 'in': return Array.isArray(value) && value.includes(actual);
    case 'contains': return String(actual ?? '').toLowerCase().includes(String(value ?? '').toLowerCase());
    case 'is_set': return actual !== undefined && actual !== null && actual !== '';
    case 'is_empty': return actual === undefined || actual === null || actual === '';
    default: return false;
  }
}

export function ruleMatches(rule, row) {
  const groups = rule?.groups || [];
  if (!groups.length) return false;
  return groups.some((conds) => (conds || []).every((c) => cmp(get(row, c.field), c.op, c.value)));
}
