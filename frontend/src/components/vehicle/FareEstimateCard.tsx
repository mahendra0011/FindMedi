import React from 'react';
import { IndianRupee, Clock, Route, ShieldAlert, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface FareEstimateCardProps {
  vehicleType: string;
  distanceKm: number;
  durationMin: number;
  etaMin: number;
  fare?: {
    base: number;
    distanceCharge: number;
    surge: number;
    total: number;
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
  const safeFare = fare || { base: 0, distanceCharge: 0, surge: 0, total: 0 };

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Estimated Fare
          </span>
          {isEmergency && vehicleType === 'ambulance' && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-semibold">
              Priority
            </Badge>
          )}
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-foreground">₹{safeFare.total}</span>
        </div>
      </div>

      <Separator />

      {/* Breakdown */}
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Base Fare</span>
          <span className="font-medium text-foreground">₹{safeFare.base}</span>
        </div>
        <div className="flex justify-between">
          <span>Distance Charge ({distanceKm} km)</span>
          <span className="font-medium text-foreground">₹{safeFare.distanceCharge}</span>
        </div>
        {safeFare.surge > 0 && (
          <div className="flex justify-between text-red-600 dark:text-red-400 font-medium">
            <span>Emergency Priority Dispatch Surge</span>
            <span>+₹{safeFare.surge}</span>
          </div>
        )}
      </div>

      <Separator />

      {/* ETA & Duration */}
      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border/50">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Driver Arrival</p>
            <p className="font-semibold text-foreground">{etaMin} mins</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border/50">
          <Route className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Trip Duration</p>
            <p className="font-semibold text-foreground">~{durationMin} mins</p>
          </div>
        </div>
      </div>
    </div>
  );
}
