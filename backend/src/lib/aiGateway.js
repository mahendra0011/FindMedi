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
