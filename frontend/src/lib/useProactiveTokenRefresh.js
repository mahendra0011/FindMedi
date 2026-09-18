import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '@/store/slices/authSlice';
import { refreshAccessToken } from './axios';

/**
 * Proactive (silent) token refresh — access token 15 min me expire hota hai.
 * Real-world apps expiry se pehle hi background refresh karte hain taaki:
 *
 *   1. HMR / page reload ke waqt /auth/me turant 200 mile (expired 401 nahi)
 *   2. User idle raho 15 min, phir koi action karo → reactive refresh fail
 *      surface na ho (background me already refreshed)
 *   3. "Code change hone par logout" kabhi na ho — token hamesha fresh
 *
 * Strategy:
 *   - Har 10 min ek silent /auth/refresh call (access token 15m hai, 5 min margin)
 *   - Tab focus hone par bhi ek refresh (user wapas aaya — token fresh kar do)
 *   - Sirf authenticated user ke liye chalta hai
 *   - Refresh fail (401/400/403) hone par genuine logout — authSlice me hota hai
 *     next /auth/me call se; yahan se force-logout nahi karte taaki HMR window
 *     me race na ho.
 */
const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export function useProactiveTokenRefresh() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const timerRef = useRef(null);
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

    // Refresh on window focus (user wapas aaya tab me)
    const onFocus = () => doRefresh();
    window.addEventListener('focus', onFocus);

    // Initial refresh on mount ( Covers HMR reload: token ko turant fresh kar do)
    doRefresh();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAuthenticated]);
}
