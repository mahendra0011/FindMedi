import { MapPin, Navigation, Bus, Train, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FacilityLocationProps {
  facility: {
    name: string;
    address?: string;
    landmark?: string;
    city?: string;
    pincode?: string;
    geo?: { lat?: number; lng?: number };
    phone?: string;
  };
}

export default function FacilityLocation({ facility }: FacilityLocationProps) {
  const fullAddress = `${facility.address || ''}${facility.landmark ? `, Near ${facility.landmark}` : ''}, ${facility.city || ''} ${facility.pincode || ''}`.trim();

  const handleOpenMaps = () => {
    const q = facility.geo?.lat && facility.geo?.lng
      ? `${facility.geo.lat},${facility.geo.lng}`
      : encodeURIComponent(`${facility.name}, ${fullAddress}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  };

  return (
    <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-base text-foreground">Location & How to Reach</h3>
        </div>

        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={handleOpenMaps}>
          <Navigation className="w-3.5 h-3.5 text-primary" /> Open in Google Maps
        </Button>
      </div>

      <div className="space-y-1 text-xs">
        <p className="font-medium text-foreground text-sm">{facility.name}</p>
        <p className="text-muted-foreground leading-relaxed">{fullAddress || 'Detailed street address provided upon booking confirmation.'}</p>
      </div>

      {/* Transit tips */}
      <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs">
        <div className="flex items-start gap-2.5 p-3 rounded-xl border bg-muted/10">
          <Bus className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-foreground block">Public Transit & Bus Stop</span>
            <span className="text-[11px] text-muted-foreground">Nearby central bus stop within 200m walking radius.</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-xl border bg-muted/10">
          <Navigation className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-foreground block">Parking & Drop-off</span>
            <span className="text-[11px] text-muted-foreground">Dedicated patient valet, drop-off bay, and ambulance ramp available.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
