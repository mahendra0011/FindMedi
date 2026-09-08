/**
 * Proactive (silent) token refresh.
 *
 * Ported from client/src/lib/useProactiveTokenRefresh.js.
 *
 * The access token expires in ~15 minutes. This hook silently refreshes
 * it every 10 minutes in the background so that:
 *
 *   1. Page reloads / HMR never hit a stale 401 wall.
 *   2. Long-idle users don't trigger a jarring reactive refresh.
 *   3. Token stays fresh — no "code change → logout" race.
 *
 * Refresh also fires on window focus (user returns to tab) and on mount.
 * Only runs when the user is authenticated. If the refresh genuinely fails
 * (401/400/403), the authSlice's `initializeAuth` thunk handles the logout
 * — this hook does NOT force-logout to avoid race conditions during HMR.
 */
'use client';

import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/store';
import { selectIsAuthenticated } from '@/store/slices/authSlice';
import { refreshAccessToken } from '@/lib/api/client';

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export function useProactiveTokenRefresh(): void {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const doRefresh = async () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      try {
        await refreshAccessToken();
      } finally {
        refreshingRef.current = false;
      }
    };

    // Periodic silent refresh
    timerRef.current = setInterval(doRefresh, REFRESH_INTERVAL);

    // Refresh when the user returns to the tab
    const onFocus = () => void doRefresh();
    window.addEventListener('focus', onFocus);

    // Initial refresh on mount (covers HMR reloads)
    void doRefresh();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAuthenticated]);
}
