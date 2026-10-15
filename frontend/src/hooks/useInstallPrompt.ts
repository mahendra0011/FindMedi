/**
 * 15.md §3 PWA install prompt (A2HS).
 *
 * Captures `beforeinstallprompt` once and exposes an explicit install action.
 * Browsers that never fire the event (iOS, already-installed) simply report
 * canInstall=false and callers render nothing — no nagging, no UA sniffing.
 */
import { useCallback, useEffect, useState } from 'react';

interface DeferredPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<DeferredPrompt | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as DeferredPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferred) return 'unavailable';
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') {
      setDeferred(null);
      try {
        const { track } = await import('@/lib/track');
        track('install_prompt_accepted', { platform: 'pwa' });
      } catch { /* analytics must never break install */ }
    }
    return outcome;
  }, [deferred]);

  return { canInstall: Boolean(deferred) && !installed, installed, promptInstall };
}
