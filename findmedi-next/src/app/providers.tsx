/**
 * Client-only providers wrapper.
 *
 * Wraps children in:
 *   1. Redux <Provider store={store}>
 *   2. TanStack Query <QueryClientProvider>
 *   3. AuthInitializer — dispatches initializeAuth on mount
 *   4. SettingsInitializer — applies persisted settings (theme, density, language) to the DOM
 *
 * This is a Client Component because it uses localStorage, timers, and the Redux store.
 */
'use client';

import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store, useAppDispatch } from '@/store';
import { initializeAuth } from '@/store/slices/authSlice';
import { loadSettings } from '@/store/slices/settingsSlice';
import { applyUserSettings, readStoredSettings } from '@/lib/settings';
import { useProactiveTokenRefresh } from '@/hooks/useProactiveTokenRefresh';
import SocketProvider from '@/components/shared/realtime/SocketProvider';
import type { ReactNode } from 'react';
import type { UserSettings } from '@/types/models/user';

/** Single TanStack Query client instance — stable across re-renders. */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (TanStack Query v5 renames cacheTime → gcTime)
      retry: (failureCount, error) => {
        // Only retry on network errors, not on 4xx
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 3;
      },
    },
  },
});

/**
 * Inner component that dispatches Redux thunks on mount.
 * Must be inside both <Provider> and <QueryClientProvider>.
 */
function InitializeApp({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Restore persisted settings (localStorage → Redux → DOM)
    const stored = readStoredSettings() as UserSettings;
    dispatch(loadSettings(stored));
    applyUserSettings(stored);

    // Verify the session token with the backend
    dispatch(initializeAuth());
  }, [dispatch]);

  // Proactive silent token refresh (10-min interval, on mount + tab focus)
  useProactiveTokenRefresh();

  return <>{children}</>;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <InitializeApp>{children}</InitializeApp>
        </SocketProvider>
      </QueryClientProvider>
    </Provider>
  );
}
