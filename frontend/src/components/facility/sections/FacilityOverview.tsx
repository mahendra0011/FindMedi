import { useState } from 'react';
import {
  Calendar,
  Building2,
  Languages,
  Shield,
  HeartPulse,
  Wheelchair,
  CheckCircle2,
  Award,
  Sparkles,
  BedDouble,
  Stethoscope,
} from 'lucide-react';

export interface FacilityOverviewProps {
  facility: {
    description?: string;
    establishedYear?: number;
    size?: {
      beds?: number;
      icuBeds?: number;
      operationTheatres?: number;
      consultationRooms?: number;
      trainersCount?: number;
      chairsCount?: number;
    };
    languages?: string[];
    highlights?: string[];
  };
}

export default function FacilityOverview({ facility }: FacilityOverviewProps) {
  const [showFull, setShowFull] = useState(false);

  const desc = facility.description || 'Welcome to our verified healthcare facility. We provide patient-first medical and diagnostic care with high clinical standards, transparent billing, and dedicated specialists.';
  const isLong = desc.length > 350;
  const displayDesc = isLong && !showFull ? `${desc.slice(0, 350)}…` : desc;

  const highlights = facility.highlights && facility.highlights.length > 0
    ? facility.highlights
    : [
        '24x7 Emergency & Critical Care',
        'Empanelled Cashless TPA & Insurance',
        'Certified Infection Control & Sterilisation',
        'Wheelchair & Stretcher Accessible',
        'In-house Diagnostic & Pharmacy Support',
      ];

  const size = facility.size || {};

  return (
    <div className="bg-card border rounded-2xl p-6 space-y-6 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-foreground">About the Facility</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Verified credentials, clinical scale, and patient commitments</p>
      </div>

      {/* Description text */}
      <div className="text-sm text-foreground/90 leading-relaxed space-y-2">
        <p>{displayDesc}</p>
        {isLong && (
          <button
            type="button"
            onClick={() => setShowFull(!showFull)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {showFull ? 'Show less' : 'Read full overview →'}
          </button>
        )}
      </div>

      {/* Stats & Scale Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {facility.establishedYear && (
          <div className="p-3.5 rounded-xl border bg-muted/20">
            <span className="text-[11px] text-muted-foreground block">Established</span>
            <span className="text-base font-bold text-foreground">{facility.establishedYear}</span>
          </div>
        )}
        {size.beds ? (
          <div className="p-3.5 rounded-xl border bg-muted/20">
            <span className="text-[11px] text-muted-foreground block">Total Beds</span>
            <span className="text-base font-bold text-foreground">{size.beds}+ Inpatient</span>
          </div>
        ) : null}
        {size.icuBeds ? (
          <div className="p-3.5 rounded-xl border bg-muted/20">
            <span className="text-[11px] text-muted-foreground block">ICU / CCU Beds</span>
            <span className="text-base font-bold text-foreground">{size.icuBeds} Critical</span>
          </div>
        ) : null}
        {size.chairsCount ? (
          <div className="p-3.5 rounded-xl border bg-muted/20">
            <span className="text-[11px] text-muted-foreground block">Operatory Chairs</span>
            <span className="text-base font-bold text-foreground">{size.chairsCount} Chairs</span>
          </div>
        ) : null}
        {size.trainersCount ? (
          <div className="p-3.5 rounded-xl border bg-muted/20">
            <span className="text-[11px] text-muted-foreground block">Certified Trainers</span>
            <span className="text-base font-bold text-foreground">{size.trainersCount} Coaches</span>
          </div>
        ) : null}
        {facility.languages && facility.languages.length > 0 && (
          <div className="p-3.5 rounded-xl border bg-muted/20">
            <span className="text-[11px] text-muted-foreground block">Languages</span>
            <span className="text-xs font-bold text-foreground truncate block">{facility.languages.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Key Highlights */}
      <div className="pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Facility Highlights</h4>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {highlights.map((h, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-xs text-foreground p-2 rounded-xl bg-muted/10 border border-border/40">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{h}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
