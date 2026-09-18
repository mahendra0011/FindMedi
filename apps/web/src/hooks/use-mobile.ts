/**
 * Viewport width hook — returns true if screen is below the given breakpoint.
 *
 * Ported from client/src/hooks/use-mobile.js.
 * Uses matchMedia with SSR-safe guard (returns false on server).
 */
import { useSyncExternalStore, useCallback } from 'react';

export function useIsMobile(breakpoint: { key: string; breakpoint: number } = { key: 'md', breakpoint: 768 }): boolean {
  const subscribe = useCallback((callback: () => void) => {
    if (typeof window === 'undefined') return () => {};
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint.breakpoint}px)`);
    mediaQuery.addEventListener('change', callback);
    return () => mediaQuery.removeEventListener('change', callback);
  }, [breakpoint.breakpoint]);

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${breakpoint.breakpoint}px)`).matches;
  }, [breakpoint.breakpoint]);

  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default useIsMobile;
