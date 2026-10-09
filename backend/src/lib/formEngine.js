/**
 * File 14 §14.1: form engine — JSON-schema template → zod validator,
 * JSON-logic conditionals, sandboxed formula evaluation. The SAME module
 * validates on the server that the renderer mirrors on the client, so
 * parity is structural, not hoped for.
 */
import { z } from 'zod';
import jsonLogic from 'json-logic-js';

export const FIELD_TYPES = [
  'text', 'textarea', 'number', 'date', 'time', 'select', 'multiselect',
  'radio', 'checkbox', 'yesno', 'scale', 'vitals', 'table', 'file',
  'signature', 'patient_picker', 'staff_picker', 'calculated', 'score',
  'section', 'info',
];

/** Safe condition eval (showIf/requiredIf). Unknown ops fail closed. */
export function evalCondition(rule, values) {
  if (rule === null || rule === undefined) return true;
  try {
    return jsonLogic.apply(rule, values || {}) === true;
  } catch {
    return false;
  }
}

const fieldSchema = (f) => {
  const req = (s) => (f.required ? s : s.optional());
  switch (f.type) {
    case 'number':
    case 'scale': {
      let s = z.coerce.number();
      if (f.min != null) s = s.min(f.min);
      if (f.max != null) s = s.max(f.max);
      return req(s);
    }
    case 'date':
    case 'time':
      return req(z.string().max(40));
    case 'select':
    case 'radio':
      return req(Array.isArray(f.options) && f.options.length
        ? z.enum(f.options.slice(0, 100))
        : z.string().max(300));
    case 'multiselect':
    case 'checkbox':
      return req(z.array(z.string().max(300)).max(100));
    case 'yesno':
      return req(z.union([z.boolean(), z.enum(['yes', 'no', 'na'])]));
    case 'vitals':
      return req(z.object({
        bp: z.string().max(20).optional(), pulse: z.coerce.number().optional(),
        temp: z.coerce.number().optional(), spo2: z.coerce.number().optional(),
        rr: z.coerce.number().optional(), weight: z.coerce.number().optional(),
        height: z.coerce.number().optional(),
      }).passthrough());
    case 'table':
      return req(z.array(z.record(z.string(), z.unknown())).max(500));
    case 'file':
      return req(z.union([z.string().max(2000), z.array(z.string().max(2000)).max(20)]));
    case 'signature':
      return req(z.string().max(200000));
    case 'calculated':
    case 'score':
      return z.number().optional();
    case 'section':
    case 'info':
      return z.unknown().optional();
    case 'text':
    default:
      return req(z.string().max(5000));
  }
};

/** Template → zod object validator (conditionals enforced at validate time). */
export function schemaFromTemplate(template) {
  const shape = {};
  const sections = template?.definition?.sections || [];
  for (const sec of sections) {
    for (const f of (sec.fields || [])) {
      if (!f.id || !FIELD_TYPES.includes(f.type)) continue;
      shape[f.id] = fieldSchema(f);
    }
  }
  const base = z.object(shape).passthrough();
  return base.superRefine((values, ctx) => {
    for (const sec of sections) {
      for (const f of (sec.fields || [])) {
        if (!f.id) continue;
        if (f.requiredIf && evalCondition(f.requiredIf, values)
          && (values[f.id] === undefined || values[f.id] === '' || values[f.id] === null)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [f.id], message: `${f.label || f.id} is required` });
        }
      }
    }
  });
}

/**
 * Sandboxed arithmetic over field refs. Two gates: (1) charset allowlist,
 * (2) every identifier must be a NUMERIC field from scope — anything else
 * (`process`, `globalThis`, `constructor`, …) refuses. Without gate 2 the
 * Function body could reach Node globals (a test proved `process.exit`
 * executed), so gate 2 is load-bearing, not belt-and-braces.
 */
export function evalFormula(formula, values) {
  if (!formula || typeof formula !== 'string') return null;
  if (!/^[0-9a-zA-Z_+\-*/().\s]+$/.test(formula)) return null;
  const scope = {};
  for (const [k, v] of Object.entries(values || {})) {
    const n = Number(v);
    if (Number.isFinite(n)) scope[k] = n;
  }
  const idents = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  const allowed = new Set(Object.keys(scope));
  for (const id of idents) {
    if (!allowed.has(id)) return null;
  }
  try {
    const names = [...allowed].filter((n) => idents.includes(n));
    // eslint-disable-next-line no-new-func
    const fn = new Function(...names, `"use strict"; return (${formula});`);
    const out = fn(...names.map((n) => scope[n]));
    return Number.isFinite(out) ? out : null;
  } catch {
    return null;
  }
}

/** Score bands: first band whose [from,to] contains the value. */
export function bandFor(bands, value) {
  if (!Number.isFinite(value)) return null;
  return (bands || []).find((b) => value >= b.from && value <= b.to) || null;
}

/** Compute all calculated/score fields for a values object. */
export function computeTemplate(template, values) {
  const computed = {};
  const sections = template?.definition?.sections || [];
  for (const sec of sections) {
    for (const f of (sec.fields || [])) {
      if ((f.type === 'calculated' || f.type === 'score') && f.formula) {
        const v = evalFormula(f.formula, { ...values, ...computed });
        if (v !== null) computed[f.id] = +v.toFixed(2);
      }
    }
  }
  const scores = {};
  for (const s of (template?.scoring || [])) {
    const v = evalFormula(s.formula, { ...values, ...computed });
    if (v !== null) {
      const band = bandFor(s.bands, v);
      scores[s.id] = { value: +v.toFixed(2), band: band ? band.label : null, color: band ? band.color : null };
    }
  }
  return { computed, scores };
}
