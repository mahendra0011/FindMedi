import { useEffect, useRef, useState } from 'react';
import { Phone, Bike } from 'lucide-react';
import { getSocket, joinRoom } from '@/lib/socket';

export default function DeliveryTrackingMap({ orderId, pickup, drop, partner }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [position, setPosition] = useState(null);
  const [status, setStatus] = useState('Assigned');

  useEffect(() => {
    if (!orderId) return;
    const socket = getSocket();
    // Shared socket — order room join har (re)connect par dobara fire hota hai
    const cleanupJoin = joinRoom('order:join_tracking', orderId);

    const onLocation = ({ lat, lng }) => {
      setPosition({ lat, lng });
      if (markerRef.current) markerRef.current.setPosition({ lat, lng });
    };
    const onStatus = ({ status }) => setStatus(status);
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
    if (!window.google || !mapRef.current) return;
    const map = new window.google.maps.Map(mapRef.current, { center: pickup, zoom: 14 });
    new window.google.maps.Marker({ position: pickup, map, label: 'P' });
    new window.google.maps.Marker({ position: drop, map, label: 'D' });
    markerRef.current = new window.google.maps.Marker({
      position: position || pickup, map,
      icon: { url: '/icons/scooter.svg', scaledSize: new window.google.maps.Size(32, 32) },
    });
  }, []);

  return (
    <div className="rounded-2xl border overflow-hidden">
      <div ref={mapRef} className="h-64 w-full" />
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Bike className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{partner?.name}</p>
          <p className="text-xs text-muted-foreground">{status}</p>
        </div>
        <a href={`tel:${partner?.phone}`} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <Phone className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
