/**
 * Delivery tracking map — shows real-time delivery partner location.
 *
 * Ported from client/src/components/DeliveryTrackingMap.jsx.
 * Uses Google Maps JS API + Socket.IO for live position updates.
 *
 * Client Component — renders only on the client (guarded useEffects).
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { Phone, Bike } from 'lucide-react';
import { getSocket, joinRoom } from '@/lib/socket';

interface Coordinates {
  lat: number;
  lng: number;
}

interface Partner {
  name: string;
  phone: string;
}

interface DeliveryTrackingMapProps {
  orderId: string;
  pickup: google.maps.LatLngLiteral;
  drop: google.maps.LatLngLiteral;
  partner?: Partner;
}

export default function DeliveryTrackingMap({ orderId, pickup, drop, partner }: DeliveryTrackingMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState('Assigned');

  useEffect(() => {
    if (!orderId) return;
    const socket = getSocket();
    const cleanupJoin = joinRoom('order:join_tracking', orderId);

    const onLocation = ({ lat, lng }: Coordinates) => {
      setPosition({ lat, lng });
      if (markerRef.current) markerRef.current.setPosition({ lat, lng });
    };
    const onStatus = ({ status: newStatus }: { status: string }) => setStatus(newStatus);
    socket.on('location:updated', onLocation);
    socket.on('delivery:status', onStatus);

    return () => {
      socket.emit('order:leave_tracking', orderId);
      socket.off('location:updated', onLocation);
      socket.off('delivery:status', onStatus);
      cleanupJoin();
    };
  }, [orderId]);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.google || !mapContainerRef.current) return;
    if (mapRef.current) return;

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: pickup,
      zoom: 14,
    });
    new window.google.maps.Marker({ position: pickup, map, label: 'P' });
    new window.google.maps.Marker({ position: drop, map, label: 'D' });
    markerRef.current = new window.google.maps.Marker({
      position: position || pickup,
      map,
      icon: { url: '/icons/scooter.svg', scaledSize: new window.google.maps.Size(32, 32) },
    });
    mapRef.current = map;
  }, [pickup, drop, position]);

  return (
    <div className="rounded-2xl border overflow-hidden">
      <div ref={mapContainerRef} className="h-64 w-full" />
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Bike className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{partner?.name ?? 'Delivery Partner'}</p>
          <p className="text-xs text-muted-foreground">{status}</p>
        </div>
        {partner?.phone && (
          <a href={`tel:${partner.phone}`} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <Phone className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}
