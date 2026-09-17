'use client';

import { useEffect, useRef, useState } from 'react';
import { Phone, Bike } from 'lucide-react';
import { getSocket, joinRoom } from '@/lib/socket';

export interface DeliveryLocation {
  lat: number;
  lng: number;
}

export interface DeliveryPartnerInfo {
  name?: string;
  phone?: string;
  vehicleType?: string;
  vehicleNumber?: string;
}

export interface DeliveryTrackingMapProps {
  orderId: string;
  pickup?: DeliveryLocation;
  drop?: DeliveryLocation;
  partner?: DeliveryPartnerInfo;
}

export default function DeliveryTrackingMap({
  orderId,
  pickup = { lat: 28.6139, lng: 77.2090 },
  drop = { lat: 28.6239, lng: 77.2190 },
  partner,
}: DeliveryTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [position, setPosition] = useState<DeliveryLocation | null>(null);
  const [status, setStatus] = useState('Assigned');

  useEffect(() => {
    if (!orderId) return;
    const socket = getSocket();
    const cleanupJoin = joinRoom('order:join_tracking', orderId);

    const onLocation = ({ lat, lng }: DeliveryLocation) => {
      setPosition({ lat, lng });
      if (markerRef.current) {
        markerRef.current.setPosition({ lat, lng });
      }
    };
    const onStatus = (data: { status: string }) => {
      if (data?.status) setStatus(data.status);
    };

    socket.on('location:updated', onLocation);
    socket.on('delivery:status', onStatus);

    return () => {
      socket.emit('order:leave_tracking', orderId);
      socket.off('location:updated', onLocation);
      socket.off('delivery:status', onStatus);
      cleanupJoin();
    };
  }, [orderId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.google || !mapRef.current) return;
    const map = new window.google.maps.Map(mapRef.current, {
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
  }, [pickup, drop, position]);

  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden bg-card">
      <div ref={mapRef} className="h-64 w-full bg-muted/30" />
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Bike className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{partner?.name || 'Assigned Partner'}</p>
          <p className="text-xs text-muted-foreground">{status}</p>
        </div>
        {partner?.phone && (
          <a
            href={`tel:${partner.phone}`}
            className="w-9 h-9 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground transition-colors shrink-0"
            aria-label="Call delivery partner"
          >
            <Phone className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}
