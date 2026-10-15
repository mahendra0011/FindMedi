import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseIdleTimerOptions {
  timeoutMs?: number;
  onIdle?: () => void;
  onActive?: () => void;
  enabled?: boolean;
}

export interface UseIdleTimerReturn {
  isIdle: boolean;
  resetTimer: () => void;
  lastActiveTime: number;
}

/**
 * useIdleTimer Hook (FE-MISSING-01 / SEC-M-04)
 * Monitors user interaction across keyboard, mouse, pointer, and touch.
 * Automatically triggers session lock / idle state after inactivity timeout.
 */
export function useIdleTimer({
  timeoutMs = 15 * 60 * 1000, // 15 minutes default
  onIdle,
  onActive,
  enabled = true,
}: UseIdleTimerOptions = {}): UseIdleTimerReturn {
  const [isIdle, setIsIdle] = useState(false);
  const [lastActiveTime, setLastActiveTime] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleIdle = useCallback(() => {
    setIsIdle(true);
    if (onIdle) onIdle();
  }, [onIdle]);

  const resetTimer = useCallback(() => {
    setLastActiveTime(Date.now());
    if (isIdle) {
      setIsIdle(false);
      if (onActive) onActive();
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (enabled && timeoutMs > 0) {
      timerRef.current = setTimeout(handleIdle, timeoutMs);
    }
  }, [isIdle, onActive, enabled, timeoutMs, handleIdle]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ['mousemove', 'keydown', 'wheel', 'touchstart', 'pointerdown'];
    const handleUserActivity = () => {
      if (!isIdle) {
        setLastActiveTime(Date.now());
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(handleIdle, timeoutMs);
      }
    };

    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));
    timerRef.current = setTimeout(handleIdle, timeoutMs);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, timeoutMs, isIdle, handleIdle]);

  return { isIdle, resetTimer, lastActiveTime };
}

export default useIdleTimer;
