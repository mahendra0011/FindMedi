import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';

export function useAmbulanceGps(active: boolean) {
  const last = useRef(0);
  const wake = useRef<any>(null);

  useEffect(() => {
    if (!active || !('geolocation' in navigator)) return;

    (async () => { try { wake.current = await (navigator as any).wakeLock?.request('screen'); } catch {} })();

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - last.current < 5000) return;
        last.current = now;
        api.put('/ambulance/me/location', { lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {});
      },
      (err) => console.warn('[GPS]', err.message),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );

    return () => { navigator.geolocation.clearWatch(id); try { wake.current?.release?.(); } catch {} };
  }, [active]);
}
