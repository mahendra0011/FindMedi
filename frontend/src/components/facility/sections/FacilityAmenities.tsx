import {
  Car,
  Wifi,
  CreditCard,
  Pill,
  Coffee,
  Shield,
  Accessibility,
  Droplet,
  HeartHandshake,
  Check,
} from 'lucide-react';

export interface FacilityAmenitiesProps {
  amenities?: Record<string, boolean> | string[];
}

const AMENITY_LABELS: Record<string, { label: string; icon: any }> = {
  parking: { label: 'Dedicated Parking Space', icon: Car },
  acWaitingArea: { label: 'Air-Conditioned Waiting Lounge', icon: HeartHandshake },
  wheelchairAccess: { label: 'Wheelchair / Stretcher Ramp', icon: Accessibility },
  cardPayment: { label: 'UPI / Cards / Net Banking', icon: CreditCard },
  inHousePharmacy: { label: '24x7 In-House Pharmacy', icon: Pill },
  drinkingWater: { label: 'RO Filtered Drinking Water', icon: Droplet },
  wifi: { label: 'High-Speed Patient Wi-Fi', icon: Wifi },
  cafeteria: { label: 'Hygienic Cafeteria', icon: Coffee },
};

export default function FacilityAmenities({ amenities = {} }: FacilityAmenitiesProps) {
  let activeList: string[] = [];

  if (Array.isArray(amenities)) {
    activeList = amenities;
  } else if (typeof amenities === 'object') {
    activeList = Object.keys(amenities).filter((k) => Boolean((amenities as any)[k]));
  }

  if (activeList.length === 0) {
    activeList = ['parking', 'acWaitingArea', 'wheelchairAccess', 'cardPayment', 'drinkingWater', 'inHousePharmacy'];
  }

  return (
    <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
      <div>
        <h3 className="font-bold text-base text-foreground">Facility Amenities & Patient Comforts</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Physical infrastructure designed for safety and ease of access</p>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {activeList.map((k) => {
          const item = AMENITY_LABELS[k] || { label: k.replaceAll('_', ' '), icon: Shield };
          const IconComp = item.icon;
          return (
            <div key={k} className="flex items-center gap-2.5 p-3 rounded-xl border bg-muted/10 text-xs text-foreground">
              <IconComp className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
