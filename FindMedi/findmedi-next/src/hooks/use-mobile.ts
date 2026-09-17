/**
 * Viewport width hook — returns true if screen is below the given breakpoint.
 *
 * Ported from client/src/hooks/use-mobile.js.
 * Uses matchMedia with SSR-safe guard (returns false on server).
 */
import { useEffect, useState } from 'react';

export function useIsMobile(breakpoint: { key: string; breakpoint: number } = { key: 'md', breakpoint: 768 }): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check initially
    const checkMatch = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint.breakpoint}px)`);
    // Set initial value
    setIsMobile(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', checkMatch);
    return () => mediaQuery.removeEventListener('change', checkMatch);
  }, [breakpoint.breakpoint]);

  return isMobile;
}

export default useIsMobile;
