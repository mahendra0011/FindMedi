/**
 * File 19 §19.1: shared motion tokens. One import for every animation so
 * motion stays one language: fast UI feedback, slow ambient, nothing else.
 */
export const MOTION = {
  fast: { duration: 0.15, ease: 'easeOut' as const },
  base: { duration: 0.25, ease: 'easeOut' as const },
  slow: { duration: 0.5, ease: 'easeInOut' as const },
  spring: { type: 'spring' as const, stiffness: 320, damping: 28 },
} as const;

export const STAGGER = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.05 } } },
  item: {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: MOTION.base },
  },
} as const;

/** Count-up hook for hero numbers (KPI tiles, wallboard). */
import { useEffect, useRef, useState } from 'react';

export function useCountUp(target: number, durationMs = 800): number {
  const [value, setValue] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const from = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, durationMs]);
  return value;
}
