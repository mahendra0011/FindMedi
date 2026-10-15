/**
 * SA-M4 / File 18 §10: red-flag symptom detector for the AI chat interceptor.
 *
 * Pure module (no imports) so the 4-scenario escalation suite can pin it
 * without booting express, mongoose or redis. aiChat.js is the only
 * production consumer: on a hit it locks the chat, surfaces Emergency SOS
 * guidance and logs an AiSafetyEvent with the matched trigger (never the
 * raw prompt text).
 *
 * Coverage contract (doc 18 §10): chest pain, stroke, suicide/self-harm and
 * severe bleeding MUST escalate. Everything else MUST NOT (a false positive
 * sends a routine question down the emergency path and erodes trust in it).
 */
export const RED_FLAG_PATTERNS = [
  { re: /(suicid|kill (myself|me)|end my life|self[\s-]?harm|hurt myself)/i, trigger: 'suicidal-ideation' },
  { re: /(severe chest pain|crushing chest|chest tightness|heart attack|myocardial)/i, trigger: 'cardiac-red-flag' },
  // Stroke (FAST): face droop, arm weakness, speech difficulty, time-critical.
  { re: /\bstroke\b|face drooping|slurred speech|arm weakness|sudden numbness|vision loss|facial droop/i, trigger: 'stroke-red-flag' },
  { re: /(anaphylaxis|throat closing|can'?t breathe|severe allergic)/i, trigger: 'respiratory-red-flag' },
  { re: /(overdose|took too many pills|poisoning)/i, trigger: 'overdose-red-flag' },
  // Severe bleeding: uncontrolled external bleed or red-flag blood loss signs.
  { re: /(severe bleeding|uncontrolled bleed|bleeding heavily|vomiting blood|coughing blood|blood in (stool|urine)|hemorrhage)/i, trigger: 'bleeding-red-flag' },
];

/** Returns the matched {trigger} or null. Input-coerced, never throws. */
export function detectRedFlag(text) {
  const promptText = String(text || '').trim();
  if (!promptText) return null;
  const hit = RED_FLAG_PATTERNS.find((p) => p.re.test(promptText));
  return hit ? { trigger: hit.trigger } : null;
}
