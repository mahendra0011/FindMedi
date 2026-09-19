import React from 'react';
import { Clock, Route, ShieldAlert, Sparkles, MapPin, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface FareEstimateCardProps {
  vehicleType: string;
  distanceKm: number;
  durationMin: number;
  etaMin: number;
  fare?: {
    base?: number;
    distanceCharge?: number;
    surge?: number;
    total?: number;
  };
  isEmergency?: boolean;
}

export default function FareEstimateCard({
  vehicleType,
  distanceKm,
  durationMin,
  etaMin,
  fare,
  isEmergency = false,
}: FareEstimateCardProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Trip & Arrival Estimate
          </span>
          {isEmergency && vehicleType === 'ambulance' && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-semibold">
              Priority Dispatch
            </Badge>
          )}
        </div>
        <div>
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[11px] font-semibold">
            Pay After Ride
          </Badge>
        </div>
      </div>

      <Separator />

      {/* ETA & Duration */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/50">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Driver Arrival</p>
            <p className="font-bold text-foreground">{etaMin} mins</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/50">
          <Route className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Trip Distance & Time</p>
            <p className="font-bold text-foreground">{distanceKm} km (~{durationMin}m)</p>
          </div>
        </div>
      </div>

      {/* Direct Payment Note */}
      <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 text-[11px] text-muted-foreground flex items-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>No upfront payment. Fare is decided and paid directly after reaching destination.</span>
      </div>
    </div>
  );
}
