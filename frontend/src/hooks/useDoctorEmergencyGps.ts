import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { api } from '@/lib/api';

export function useDoctorEmergencyGps(isDutyActive: boolean, activeRequestId?: string | null) {
  const [gpsStatus, setGpsStatus] = useState<string>('Standby');
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isDutyActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsStatus('Offline');
      return;
    }

    if (!navigator.geolocation) {
      setGpsStatus('GPS Unsupported');
      return;
    }

    setGpsStatus('Acquiring GPS...');

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy, heading, speed } = pos.coords;
        setLastCoords({ lat, lng });
        setGpsStatus(`Locked (±${Math.round(accuracy)}m)`);

        try {
          const socket = getSocket();
          // 1. Broadcast beacon via Socket to server
          if (socket?.connected) {
            socket.emit('doctor:emergency_location', {
              lat,
              lng,
              accuracy,
              heading: heading || 0,
              speed: speed || 0,
              activeRequestId: activeRequestId || null,
            });

            // 2. If actively en route to patient, send direct telemetry update
            if (activeRequestId) {
              socket.emit('stream_doctor_location', {
                requestId: activeRequestId,
                lat,
                lng,
                heading: heading || 0,
                speed: speed || 0,
              });
            }
          }

          // 3. Fallback REST telemetry update if actively en route
          if (activeRequestId) {
            api.put(`/emergency-doctor/${activeRequestId}/telemetry`, {
              coordinates: [lng, lat],
              heading: heading || 0,
              speed: speed || 0,
            }).catch(() => {});
          }
        } catch (err) {
          console.debug('Telemetry ping skipped:', err);
        }
      },
      (err) => {
        setGpsStatus(`GPS Notice: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isDutyActive, activeRequestId]);

  return { gpsStatus, lastCoords };
}
