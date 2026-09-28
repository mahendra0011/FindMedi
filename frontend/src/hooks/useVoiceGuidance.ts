import { useCallback, useEffect, useRef } from 'react';

/**
 * Turn-by-turn voice guidance via the Web Speech API.
 *
 * Wraps `speechSynthesis` with the three things a navigation prompt needs and
 * the raw API does not give you:
 *
 *  1. **Utterance de-duplication.** `watchPosition` fires several times a
 *     second, so the same instruction would otherwise be announced dozens of
 *     times. Each phrasing is spoken once per maneuver.
 *  2. **Queue management.** Speaking a new prompt cancels the previous one, so
 *     guidance never lags behind the driver by a whole instruction.
 *  3. **Availability detection.** `speechSynthesis` is absent in jsdom and in
 *     some webviews; `isSupported` lets the UI hide the mute toggle instead of
 *     rendering a dead control.
 */
export interface UseVoiceGuidanceOptions {
  /** Master switch — set false when the user has muted guidance. */
  enabled?: boolean;
  /** BCP-47 tag. Defaults to Indian English, matching the app's locale. */
  lang?: string;
  /** 0–1. Slightly under 1 so prompts don't clip on phone speakers. */
  volume?: number;
  /** 0.1–10. Navigation prompts read best a touch faster than conversation. */
  rate?: number;
}

export interface UseVoiceGuidanceResult {
  isSupported: boolean;
  /** Announce `text`, replacing anything currently being spoken. */
  speak: (text: string) => void;
  /** Immediately stop speaking (used when navigation ends). */
  cancel: () => void;
  /** Clear the "already announced" memory, e.g. after a reroute. */
  reset: () => void;
}

export function useVoiceGuidance({
  enabled = true,
  lang = 'en-IN',
  volume = 0.9,
  rate = 1.05,
}: UseVoiceGuidanceOptions = {}): UseVoiceGuidanceResult {
  const isSupported =
    typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';

  // Texts already spoken, so a repeated GPS fix doesn't repeat the prompt.
  const spoken = useRef<Set<string>>(new Set());
  // Read inside `speak` without making it a dependency of the callback.
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const cancel = useCallback(() => {
    if (!isSupported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* speechSynthesis can throw if the tab is being torn down */
    }
  }, [isSupported]);

  const reset = useCallback(() => {
    spoken.current.clear();
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !enabledRef.current) return;
      const phrase = (text || '').trim();
      // Empty text is a common shape when Valhalla falls back to a straight
      // line and returns no maneuvers at all.
      if (!phrase) return;
      // De-dupe on normalised text so casing/whitespace changes don't re-speak.
      const key = phrase.toLowerCase();
      if (spoken.current.has(key)) return;
      spoken.current.add(key);

      try {
        // Drop any in-flight prompt: stale guidance is worse than none.
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(phrase);
        utterance.lang = lang;
        utterance.volume = volume;
        utterance.rate = rate;
        window.speechSynthesis.speak(utterance);
      } catch {
        /* never let a TTS failure break navigation */
      }
    },
    [isSupported, lang, volume, rate],
  );

  // Muting mid-prompt should silence it immediately; unmuting should allow the
  // current instruction to be announced again.
  useEffect(() => {
    if (!enabled) {
      cancel();
      spoken.current.clear();
    }
  }, [enabled, cancel]);

  // Leaving the screen must not leave a disembodied voice talking.
  useEffect(() => () => cancel(), [cancel]);

  return { isSupported, speak, cancel, reset };
}

export default useVoiceGuidance;
