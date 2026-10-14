import React from 'react';
import { MapPin, Building2, Clock, Calendar, ExternalLink, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PractitionerDTO } from './PractitionerHeader';

interface PractitionerLocationsProps {
  practitioner: PractitionerDTO;
  onBookAtLocation?: (location: any) => void;
}

export default function PractitionerLocations({
  practitioner,
  onBookAtLocation,
}: PractitionerLocationsProps) {
  const defaultLocations = [
    {
      id: 'loc-1',
      name: practitioner.clinic || 'City Medical Care Clinic',
      type: 'Clinic / OPD Centre',
      area: practitioner.area || 'South Extension',
      city: practitioner.city || 'New Delhi',
      address: `${practitioner.area || 'South Extension Part II'}, ${practitioner.city || 'New Delhi'}`,
      timings: 'Mon, Wed, Fri • 10:00 AM – 02:00 PM',
      fee: practitioner.fee || practitioner.consultation_fees || 500,
      phone: 'Direct OPD Desk available',
      coordinates: '28.5672,77.2215',
    },
    {
      id: 'loc-2',
      name: 'Apex Super Specialty Hospital',
      type: 'Hospital Affiliation',
      area: 'Sector 62',
      city: practitioner.city || 'New Delhi',
      address: `Tower B, Institutional Area, ${practitioner.city || 'New Delhi'}`,
      timings: 'Tue, Thu, Sat • 04:00 PM – 08:00 PM',
      fee: Math.round((practitioner.fee || 500) * 1.2),
      phone: 'Hospital Reception Desk',
      coordinates: '28.6280,77.3649',
    },
  ];

  const locations = practitioner.locations && practitioner.locations.length > 0
    ? practitioner.locations
    : defaultLocations;

  const openDirections = (loc: any) => {
    const query = encodeURIComponent(`${loc.name}, ${loc.address || loc.area || ''}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h2 className="font-heading text-lg font-bold text-foreground">Where They Practise (Affiliated Locations)</h2>
        </div>
        <span className="text-xs text-muted-foreground font-medium">{locations.length} Clinic / Hospital locations</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {locations.map((loc: any, i: number) => (
          <div
            key={i}
            className="rounded-2xl border border-border/60 bg-muted/20 p-5 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary mt-0.5 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm leading-tight">{loc.name}</h3>
                    <span className="text-[11px] font-semibold text-primary">{loc.type || 'Consultation Facility'}</span>
                  </div>
                </div>

                {loc.fee != null && (
                  <div className="text-right shrink-0">
                    <span className="text-xs text-muted-foreground block">Consult Fee</span>
                    <span className="font-extrabold text-foreground text-base">₹{loc.fee}</span>
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                <p className="line-clamp-2">{loc.address || `${loc.area}, ${loc.city}`}</p>
              </div>

              {/* Schedule Timings */}
              <div className="flex items-center gap-2 text-xs text-foreground bg-card border border-border/40 rounded-xl px-3 py-2 font-medium">
                <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{loc.timings || 'Mon – Sat • 10:00 AM – 06:00 PM'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDirections(loc)}
                className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground gap-1 px-2"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Get Directions
              </Button>

              <Button
                size="sm"
                onClick={() => onBookAtLocation?.(loc)}
                className="h-8 text-xs font-semibold rounded-xl gap-1"
              >
                Book Here <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
