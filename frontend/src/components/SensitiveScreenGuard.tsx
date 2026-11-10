import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { isSensitiveNativeRoute } from '@/lib/sensitiveScreenRoutes';

interface SensitiveScreenPlugin {
  setEnabled(options: { enabled: boolean }): Promise<void>;
}

const SensitiveScreen = registerPlugin<SensitiveScreenPlugin>('SensitiveScreen');

/** Enables Android FLAG_SECURE while authenticated or identity-sensitive screens are visible. */
export default function SensitiveScreenGuard() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    void SensitiveScreen.setEnabled({ enabled: isSensitiveNativeRoute(pathname) }).catch(() => {
      // Browser builds and Android shells without the native plugin must remain usable.
    });
  }, [pathname]);

  return null;
}
