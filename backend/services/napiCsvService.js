/**
 * Native Rust-backed CSV service (Phase 7 migration).
 *
 * Provides fast CSV serialization and parsing via the napi-core native module.
 * Falls back to JavaScript implementations when the native module is unavailable.
 *
 * Migration targets (per baseline-2026-09-08.json):
 *   - toCSV:    0.5ms (100 rows) → 4.5ms (1k rows) → 47.6ms (10k rows)
 *   - json2csv: 6.7ms (1k rows) → 66.2ms (10k rows)
 *   - ExcelJS xlsx parse: 7.4ms (50) → 20.8ms (500) → 206.9ms (5k rows)
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let _napi = null;
let _loadError = null;

const NATIVE_NOT_AVAILABLE = 'NATIVE_NOT_AVAILABLE';

function getNapi() {
  if (_napi !== null) return _napi;
  if (_loadError !== null) throw Object.assign(new Error(_loadError.message), { code: NATIVE_NOT_AVAILABLE });

  try {
    _napi = require('../rust-helper/index.js');
  } catch (e) {
    _loadError = e;
  }
  return _napi;
}

/**
 * Serialize an array of objects to a CSV string using the Rust native module.
 *
 * Mirrors `toCSV` in server/routes/export.js — always quotes fields (CSV QuoteStyle::All).
 *
 * @param {Array<Object>} rows     - Array of row objects
 * @param {Array<string>} fields   - Column/field names (order matters)
 * @returns {string} CSV string with header row
 */
export function toCsvNative(rows, fields) {
  const napi = getNapi();
  return napi.toCsv(JSON.stringify(rows), JSON.stringify(fields));
}

/**
 * Parse a CSV string into an array of objects using the Rust native module.
 *
 * @param {string} input - Raw CSV text (UTF-8)
 * @returns {Array<Object>} Array of row objects with keys from the header row
 */
export function parseCsvNative(input) {
  const napi = getNapi();
  const json = napi.parseCsv(input);
  return JSON.parse(json);
}

/**
 * Whether the native Rust CSV functions are available.
 * @type {boolean}
 */
export const NATIVE_CSV_AVAILABLE = (() => {
  try {
    getNapi();
    return true;
  } catch {
    return false;
  }
})();

// ── Fallback implementations (pure JavaScript, mirrors original logic) ─────

/**
 * Hand-rolled CSV writer — matches the `toCSV` function in server/routes/export.js.
 * Always wraps fields in double quotes; doubles embedded quotes.
 *
 * @param {Array<Object>} data - Array of row objects
 * @param {Array<string>} fields - Column/field names (order matters)
 * @returns {string} CSV string
 */
export function toCsvFallback(data, fields) {
  const header = fields.map(f => `"${f}"`).join(',');
  const rows = data.map(row => fields.map(f => {
    const val = row[f];
    if (val === null || val === undefined) return '""';
    return `"${String(val).replace(/"/g, '""')}"`;
  }).join(','));
  return [header, ...rows].join('\n');
}

/**
 * Pure-JS CSV parser using a minimal RFC-4180 compliant reader.
 *
 * @param {string} input - Raw CSV text
 * @returns {Array<Object>} Parsed rows
 */
export function parseCsvFallback(input) {
  const rows = [];
  let cur = '';
  let field = '';
  let inQuotes = false;
  let row = [];
  let headers = null;

  const flushField = () => {
    row.push(field);
    field = '';
  };

  const flushRow = () => {
    if (headers === null) {
      headers = row.slice();
    } else {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
      rows.push(obj);
    }
    row = [];
  };

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        flushField();
      } else if (ch === '\r') {
        // handled with \n below
      } else if (ch === '\n') {
        flushField();
        flushRow();
      } else {
        field += ch;
      }
    }
  }

  // Handle last field/row if no trailing newline
  if (field || row.length > 0) {
    flushField();
    flushRow();
  }

  return rows;
}
