/**
 * File 18 §10: the 4-scenario red-flag escalation suite (chest pain, stroke,
 * suicide/self-harm, severe bleeding). Pins that each scenario escalates to
 * its trigger AND that routine questions do not (a false positive pushes a
 * routine question down the emergency path).
 *
 * Pure unit suite over lib/redFlags.js — the same detector aiChat.js runs
 * before any AI call, so pinning the lib pins the route.
 */
import { RED_FLAG_PATTERNS, detectRedFlag } from '../../src/lib/redFlags.js';

describe('red-flag escalation (4 scenarios)', () => {
  it('escalates crushing chest pain as cardiac', () => {
    expect(detectRedFlag('I have severe crushing chest pain since morning')).toEqual({
      trigger: 'cardiac-red-flag',
    });
  });

  it('escalates FAST stroke signs', () => {
    expect(detectRedFlag('My father has sudden slurred speech and arm weakness')).toEqual({
      trigger: 'stroke-red-flag',
    });
    expect(detectRedFlag('face drooping on one side')).toEqual({ trigger: 'stroke-red-flag' });
  });

  it('escalates suicidal ideation and self-harm', () => {
    expect(detectRedFlag('I want to kill myself')).toEqual({ trigger: 'suicidal-ideation' });
    expect(detectRedFlag('thoughts of self harm lately')).toEqual({ trigger: 'suicidal-ideation' });
  });

  it('escalates severe bleeding', () => {
    expect(detectRedFlag('vomiting blood since last night')).toEqual({ trigger: 'bleeding-red-flag' });
    expect(detectRedFlag('uncontrolled bleeding from the wound')).toEqual({ trigger: 'bleeding-red-flag' });
  });

  it('does NOT escalate routine questions (no false positives)', () => {
    for (const benign of [
      'mild headache for two days, what should I eat?',
      'what is a balanced diet for diabetes?',
      'my child has a cold and runny nose',
      'how do I book a lab test?',
      '',
      null,
      undefined,
    ]) {
      expect(detectRedFlag(benign)).toBeNull();
    }
  });

  it('covers all six trigger families with distinct triggers', () => {
    const triggers = RED_FLAG_PATTERNS.map((p) => p.trigger);
    expect(new Set(triggers).size).toBe(triggers.length);
    for (const want of ['suicidal-ideation', 'cardiac-red-flag', 'stroke-red-flag', 'respiratory-red-flag', 'overdose-red-flag', 'bleeding-red-flag']) {
      expect(triggers).toContain(want);
    }
  });
});
