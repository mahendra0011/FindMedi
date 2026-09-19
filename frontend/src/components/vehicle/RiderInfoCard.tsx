import React from 'react';
import { Phone, Star, ShieldCheck, Car, MessageCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface RiderInfoCardProps {
  rider: {
    name?: string;
    phone?: string;
    avatar?: string;
    rating?: number;
    vehicle?: {
      brand?: string;
      model?: string;
      color?: string;
      rcNumber?: string;
      type?: string;
    };
  };
  statusText?: string;
  onCancel?: () => void;
  canCancel?: boolean;
}

export default function RiderInfoCard({
  rider,
  statusText = 'En Route',
  onCancel,
  canCancel = true,
}: RiderInfoCardProps) {
  const vehicle = rider.vehicle || {};
  const initials = (rider.name || 'Driver')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Verified FindMedi Driver
        </Badge>
        <span className="text-xs font-semibold text-primary">{statusText}</span>
      </div>

      <div className="flex items-center gap-3.5">
        <Avatar className="w-13 h-13 border-2 border-border shadow-sm">
          <AvatarImage src={rider.avatar} alt={rider.name} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-base text-foreground truncate">{rider.name || 'Assigned Driver'}</h4>
            <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-md shrink-0">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              {rider.rating ? Number(rider.rating).toFixed(1) : '4.8'}
            </span>
          </div>

          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {vehicle.color ? `${vehicle.color} ` : ''}
            {vehicle.brand || 'Vehicle'} {vehicle.model || ''}
          </p>

          <div className="mt-1">
            <Badge variant="secondary" className="font-mono text-[11px] font-bold px-2 py-0 tracking-wider">
              {vehicle.rcNumber || 'MP-09-AB-1234'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        {rider.phone ? (
          <Button
            asChild
            variant="outline"
            className="w-full gap-2 rounded-xl h-10 border-border/80 hover:bg-muted font-medium"
          >
            <a href={`tel:${rider.phone}`}>
              <Phone className="w-4 h-4 text-emerald-600" />
              Call Driver
            </a>
          </Button>
        ) : (
          <Button variant="outline" disabled className="w-full gap-2 rounded-xl h-10">
            <Phone className="w-4 h-4" /> Call Driver
          </Button>
        )}

        {canCancel && onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="w-full text-destructive hover:bg-destructive/10 rounded-xl h-10 font-medium text-xs"
          >
            Cancel Ride
          </Button>
        )}
      </div>
    </div>
  );
}
