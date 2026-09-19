import React from 'react';
import { motion } from 'framer-motion';
import { Bike, Car, Truck, Ambulance, Zap, Clock, Users, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface VehicleTypeOption {
  code: 'bike' | 'auto' | 'e_rickshaw' | 'car' | 'van' | 'ambulance';
  label: string;
  icon: any;
  capacity: number;
  desc: string;
  badge?: string;
  color: string;
}

export const VEHICLE_TYPES: VehicleTypeOption[] = [
  {
    code: 'bike',
    label: 'Bike',
    icon: Bike,
    capacity: 1,
    desc: 'Fast solo pickup, medicine delivery',
    color: 'from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  {
    code: 'auto',
    label: 'Auto (3-W)',
    icon: Truck,
    capacity: 3,
    desc: 'Short distance, budget friendly',
    color: 'from-yellow-500/20 to-yellow-500/5 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  },
  {
    code: 'e_rickshaw',
    label: 'E-Rickshaw',
    icon: Zap,
    capacity: 4,
    desc: 'Eco-friendly, local commute',
    badge: 'Eco',
    color: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  {
    code: 'car',
    label: 'Car / Cab',
    icon: Car,
    capacity: 4,
    desc: 'Comfortable patient & family transport',
    color: 'from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  {
    code: 'van',
    label: 'Medical Van',
    icon: Truck,
    capacity: 7,
    desc: 'Group / luggage / stretcher-friendly',
    color: 'from-indigo-500/20 to-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  },
  {
    code: 'ambulance',
    label: 'Ambulance',
    icon: Ambulance,
    capacity: 2,
    desc: 'Emergency / medical transport with priority dispatch',
    badge: 'Emergency',
    color: 'from-red-500/20 to-red-500/5 text-red-600 dark:text-red-400 border-red-500/30',
  },
];

interface VehicleTypeSelectorProps {
  selected: string;
  onSelect: (code: string) => void;
  estimates?: Record<string, { fare: { total: number }; etaMin: number }>;
  isEmergency?: boolean;
}

export default function VehicleTypeSelector({
  selected,
  onSelect,
  estimates = {},
  isEmergency = false,
}: VehicleTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {VEHICLE_TYPES.map((v) => {
        const isSelected = selected === v.code;
        const IconComponent = v.icon;
        const estimate = estimates[v.code];
        const isAmbulance = v.code === 'ambulance';

        return (
          <motion.div
            key={v.code}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(v.code)}
            className={cn(
              'relative cursor-pointer rounded-2xl p-3.5 border transition-all duration-200 flex flex-col justify-between overflow-hidden',
              isSelected
                ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-2 ring-primary/30'
                : 'border-border/70 bg-card hover:bg-muted/40 hover:border-border'
            )}
          >
            {/* Top row: Icon + Badges */}
            <div className="flex items-start justify-between mb-2">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br border shadow-sm',
                  v.color
                )}
              >
                <IconComponent className="w-5 h-5" />
              </div>

              <div className="flex flex-col items-end gap-1">
                {v.badge && (
                  <Badge
                    variant={isAmbulance ? 'destructive' : 'secondary'}
                    className="text-[10px] px-1.5 py-0 h-4 font-semibold"
                  >
                    {isAmbulance && isEmergency ? 'Priority' : v.badge}
                  </Badge>
                )}
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{v.capacity}</span>
                </div>
              </div>
            </div>

            {/* Middle: Title & desc */}
            <div>
              <p className="font-semibold text-sm text-foreground leading-tight">{v.label}</p>
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{v.desc}</p>
            </div>

            {/* Bottom: Fare & ETA (if available) */}
            {estimate && (
              <div className="mt-2.5 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">
                  ₹{estimate.fare?.total || 0}
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="w-3 h-3 text-primary" />
                  {estimate.etaMin || 4}m
                </span>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
