import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// zxcvbn ships CJS; interop via require keeps this working under ESM.
const zxcvbn = require('zxcvbn');

// P2-11: zxcvbn strength gate (server-side). Length/complexity rules live in
// the zod schemas; this rejects passwords that pass the character-class
// checklist but are still trivially guessable (keyboard walks, repeated
// patterns, common substitutions). Threshold score >= 3 ("safely unguessable"
// per zxcvbn). Returns { ok, score, feedback } — callers 400 with the message.
export const MIN_ZXCVBN_SCORE = 3;

export function checkPasswordStrength(password, userInputs = []) {
  let result;
  try {
    result = zxcvbn(String(password || ''), userInputs);
  } catch {
    // Fail-open on estimator errors: length/complexity + HIBP still apply.
    return { ok: true, score: 4, feedback: '' };
  }
  if (result.score >= MIN_ZXCVBN_SCORE) return { ok: true, score: result.score, feedback: '' };
  const fb = result.feedback?.warning || 'This password is too easy to guess.';
  const suggestion = (result.feedback?.suggestions || []).join(' ');
  return { ok: false, score: result.score, feedback: `${fb} ${suggestion}`.trim() };
}

export function strongPasswordMessage(feedback) {
  return `Password is too weak (zxcvbn score < ${MIN_ZXCVBN_SCORE}). ${feedback || 'Use a longer, less predictable passphrase.'}`.trim();
}
