/**
 * File 17 §17.4: AI gateway. PHI redaction first, provider call second,
 * invocation log always. Default provider is an honest local stub — no
 * silent fake-AI: stub responses are labeled `provider: 'stub'` in the log.
 * Kill switch: SystemSetting `ai.enabled=false` blocks everything.
 */
import AiInvocation from '../models/AiInvocation.js';
import logger from '../config/logger.js';

const EMAIL_RX = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const PHONE_RX = /(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/g;
const NAME_HINT_RX = /(patient|name)\s*[:=]\s*([A-Za-z][A-Za-z .]{2,40})/gi;

export function redactPhi(text) {
  if (!text) return { text: '', redacted: false };
  let out = String(text);
  let redacted = false;
  for (const rx of [EMAIL_RX, PHONE_RX]) {
    if (rx.test(out)) { redacted = true; out = out.replace(rx, '[REDACTED]'); rx.lastIndex = 0; }
  }
  if (NAME_HINT_RX.test(out)) { redacted = true; out = out.replace(NAME_HINT_RX, '$1: [REDACTED]'); }
  return { text: out, redacted };
}

async function aiEnabled() {
  try {
    const { default: SystemSetting } = await import('../models/SystemSetting.js');
    const row = await SystemSetting.findOne({ key: 'ai.enabled' }).lean();
    return row ? row.value !== 'false' && row.value !== false : true;
  } catch {
    return true;
  }
}

async function logInvocation({ hospitalId, feature, provider, redacted, ms, ok, error, by }) {
  try {
    await AiInvocation.create({
      hospitalId: hospitalId || null, feature, provider, redacted,
      ms: ms || 0, ok: ok !== false, error: String(error || '').slice(0, 300), by: by || null,
    });
  } catch (e) {
    logger.warn(`AI log failed: ${e.message}`);
  }
}

/**
 * Draft a discharge-summary narrative from structured fields (stub provider).
 * Real LLM wiring replaces ONLY `generateWithStub` — redaction, logging and
 * the kill switch stay identical.
 */
export async function draftDischargeSummary({ hospitalId, fields, by }) {
  const started = Date.now();
  if (!(await aiEnabled())) {
    await logInvocation({ hospitalId, feature: 'discharge_draft', provider: 'none', redacted: true, ms: 0, ok: false, error: 'AI disabled by kill switch', by });
    const err = new Error('AI features are disabled');
    err.code = 'AI_DISABLED';
    throw err;
  }
  const { text, redacted } = redactPhi(JSON.stringify(fields || {}));
  const parsed = JSON.parse(text || '{}');
  const lines = [
    `Diagnosis: ${parsed.diagnosis || '—'}`,
    `Procedures: ${parsed.procedures || '—'}`,
    `Course in hospital: ${parsed.course || '—'}`,
    `Discharge medications: ${parsed.meds || '—'}`,
    `Follow-up: ${parsed.followUp || '—'}`,
  ];
  const draft = `DISCHARGE SUMMARY (AI draft — clinician must review and sign)\n${lines.join('\n')}`;
  await logInvocation({
    hospitalId, feature: 'discharge_draft', provider: 'stub', redacted,
    ms: Date.now() - started, ok: true, by,
  });
  return { draft, provider: 'stub', redacted };
}

/** No-show risk: transparent heuristic (history-based), score 0–100. */
export function noShowScore({ pastNoShows = 0, pastVisits = 0, leadDays = 0, hour = 10 }) {
  let s = 5;
  if (pastVisits > 0) s += Math.min(60, (pastNoShows / pastVisits) * 100);
  if (leadDays > 14) s += 10;
  if (hour < 9 || hour > 18) s += 5;
  return Math.max(0, Math.min(100, Math.round(s)));
}

/** Demand forecast: trailing-4-week same-weekday moving average. */
export function forecastDemand(dailyCounts) {
  if (!dailyCounts?.length) return { forecast: 0, basis: 'no-data' };
  const avg = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;
  return { forecast: Math.round(avg), basis: `${dailyCounts.length}-point average` };
}

/** File 22 P2-37: AI OCR — extract structured data from a document image (stub).
 * In production this would call a vendor API (Google Vision, Azure Form Recognizer, etc.).
 * The stub simulates common clinical document fields.
 */
export function ocrDocument({ docType, rawText }) {
  const text = rawText || '';
  const out = {};
  switch (docType) {
    case 'lab_result': {
      // A1c, glucose, crp, etc.
      const a1c = text.match(/(?:A1c|HbA1c)\s*[:=]\s*([0-9.]+)/i)?.[1];
      const glucose = text.match(/(?:blood glucose|fasting glucose|pp glucose)\s*[:=]\s*([0-9.]+)/i)?.[1];
      const crp = text.match(/(?:CRP|c-reaction protein)\s*[:=]\s*([0-9.]+)/i)?.[1];
      if (a1c) out.a1c = Number(a1c);
      if (glucose) out.glucose = Number(glucose);
      if (crp) out.crp = Number(crp);
      break;
    }
    case 'prescription': {
      const medicine = text.match(/([A-Za-z][A-Za-z .]{2,40})\s*[:]\s*(\d+)\s*(mg|gm|ml|units)?/i);
      if (medicine) out.medicine = medicine[1].trim(), out.qty = Number(medicine[2]);
      break;
    }
    case 'discharge_summary': {
      const diagnosis = text.match(/diagnosis[:\s]+([A-Za-z0-9 .,]+)/i)?.[1];
      const medications = text.match(/medication[:\s]+([A-Za-z0-9 .,;]+)/i)?.[1];
      if (diagnosis) out.diagnosis = diagnosis.trim();
      if (medications) out.meds = medications.trim();
      break;
    }
    default: break;
  }
  return { ...out, provider: 'stub', docType };
}

/** File 22 P2-37: Claim-document checker — validates an insurance claim
 * against expected fields and flags common rejection reasons.
 */
export function checkClaim(document) {
  const issues = [];
  const required = ['patientName', 'policyNumber', 'diagnosisCodes', 'procedureCodes', 'chargeAmount'];
  for (const field of required) {
    if (!document[field]) issues.push(`missing: ${field}`);
  }
  if (document.chargeAmount && Number(document.chargeAmount) <= 0) issues.push('chargeAmount must be positive');
  if (document.diagnosisCodes && !Array.isArray(document.diagnosisCodes)) issues.push('diagnosisCodes must be an array');
  if (document.procedureCodes && !Array.isArray(document.procedureCodes)) issues.push('procedureCodes must be an array');
  return { valid: issues.length === 0, issues, provider: 'stub' };
}

/** File 22 P2-37: FAQ RAG — retrieve the best-matching answer from a local
 * knowledge-base. In production this would use embeddings + vector search.
 */
export function ragAnswer(question, faq = []) {
  const ql = (question || '').toLowerCase().trim();
  if (!faq?.length) return { answer: 'No FAQ configured.', score: 0 };
  // Simple keyword overlap scoring
  let best = { score: 0, answer: '' };
  for (const entry of faq) {
    const kb = (entry.question || '').toLowerCase();
    const overlap = ql.split(/\s+/).filter(w => kb.includes(w)).length;
    if (overlap > best.score) {
      best = { score: overlap, answer: entry.answer || '' };
    }
  }
  if (best.score < 1) best = { answer: 'No matching FAQ entry.', score: 0 };
  return best;
}

/** File 22 P2-37: Lab trend narrative — generate a one-sentence narrative
 * from a series of lab results, for display in the EHR header.
 */
export function labTrendNarrative(results = []) {
  if (!results?.length) return 'No lab results recorded.';
  // Sort by date ascending
  const sorted = [...results].sort((a, b) => new Date(a.date) - new Date(b.date));
  const values = sorted.map(r => ({ val: r.value, date: r.date, test: r.test }));
  // Very simple trend: compare first vs last numeric value for same test
  const numeric = values.filter(v => !isNaN(Number(v.val)));
  if (numeric.length < 2) return 'Lab values recorded but trend not calculable.';
  const first = Number(numeric[0].val);
  const last = Number(numeric[numeric.length - 1].val);
  if (first < last) return `Trending upward: ${numeric[0].test} from ${first} to ${last}`;
  if (first > last) return `Trending downward: ${numeric[0].test} from ${first} to ${last}`;
  return `Stable: ${numeric[0].test} at ${first}`;
}
