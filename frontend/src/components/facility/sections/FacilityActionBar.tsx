import { Phone, Navigation, Heart, Share2, Calendar, ShoppingBag, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FacilityActionBarProps {
  facility: {
    name: string;
    phone?: string;
    emergencyPhone?: string;
    geo?: { lat?: number; lng?: number };
    address?: string;
  };
  primaryLabel?: string;
  onPrimary?: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onShare?: () => void;
}

export default function FacilityActionBar({
  facility,
  primaryLabel = 'Book Appointment',
  onPrimary,
  isSaved,
  onToggleSave,
  onShare,
}: FacilityActionBarProps) {
  const handleCall = () => {
    const num = facility.emergencyPhone || facility.phone;
    if (num) {
      window.location.href = `tel:${num}`;
    }
  };

  const handleDirections = () => {
    const q = facility.geo?.lat && facility.geo?.lng
      ? `${facility.geo.lat},${facility.geo.lng}`
      : encodeURIComponent(`${facility.name}, ${facility.address || ''}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  };

  return (
    <>
      {/* Desktop Sticky Header Bar (appears on scroll or top) */}
      <div className="hidden md:flex items-center justify-between gap-4 p-4 rounded-2xl bg-card border shadow-sm sticky top-16 z-30 backdrop-blur-md bg-card/95">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h3 className="font-bold text-sm truncate text-foreground">{facility.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{facility.address || 'Verified Healthcare Location'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={handleCall}>
            <Phone className="w-3.5 h-3.5 text-primary" /> Call Facility
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={handleDirections}>
            <Navigation className="w-3.5 h-3.5 text-blue-500" /> Directions
          </Button>
          <Button size="sm" className="gap-1.5 text-xs h-9 font-semibold shadow-sm px-5" onClick={onPrimary}>
            {primaryLabel}
          </Button>
        </div>
      </div>

      {/* Mobile Bottom Sticky Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t p-3 flex items-center justify-between gap-2 shadow-2xl safe-bottom">
        <Button variant="outline" size="sm" className="flex-1 gap-1 h-10 text-xs" onClick={handleCall}>
          <Phone className="w-3.5 h-3.5 text-primary" /> Call
        </Button>
        <Button variant="outline" size="sm" className="flex-1 gap-1 h-10 text-xs" onClick={handleDirections}>
          <Navigation className="w-3.5 h-3.5 text-blue-500" /> Directions
        </Button>
        <Button size="sm" className="flex-[1.5] h-10 text-xs font-bold shadow-md" onClick={onPrimary}>
          {primaryLabel}
        </Button>
      </div>
    </>
  );
}
