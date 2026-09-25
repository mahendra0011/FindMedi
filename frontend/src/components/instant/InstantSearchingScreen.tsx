import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Siren,
  Loader2,
  X,
  Scale,
  Stethoscope,
  HeartHandshake,
  Car,
  ShieldCheck,
  Radio,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface InstantSearchingScreenProps {
  type: 'lawyer' | 'assistant' | 'emergency_doctor' | 'ride' | 'ambulance';
  radiusKm: number;
  onCancel: () => void;
  requestDetails?: any;
  cancelling?: boolean;
}

const TYPE_CONFIG = {
  lawyer: {
    icon: Scale,
    title: 'Finding Verified Legal Advocates',
    subtitle: 'Broadcasting urgent consultation request to accredited bar council advocates in your city.',
    themeColor: 'from-amber-600 via-amber-500 to-yellow-500',
    pulseBorder: 'border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.35)]',
    badgeClass: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
    coreIcon: '⚖️',
  },
  assistant: {
    icon: HeartHandshake,
    title: 'Alerting Bedside Care Attendants',
    subtitle: 'Notifying background-checked, verified hospital care attendants on duty at your selected location.',
    themeColor: 'from-teal-600 via-teal-500 to-cyan-500',
    pulseBorder: 'border-teal-500/60 shadow-[0_0_25px_rgba(20,184,166,0.35)]',
    badgeClass: 'bg-teal-500/20 border-teal-500/40 text-teal-400',
    coreIcon: '🩺',
  },
  emergency_doctor: {
    icon: Stethoscope,
    title: 'Alerting Emergency Flying Squad Doctors',
    subtitle: 'Broadcasting rapid response beacon to registered clinic physicians equipped for emergency transit.',
    themeColor: 'from-rose-600 via-red-500 to-orange-500',
    pulseBorder: 'border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.4)]',
    badgeClass: 'bg-rose-500/20 border-rose-500/40 text-rose-400',
    coreIcon: '👨‍⚕️',
  },
  ride: {
    icon: Car,
    title: 'Matching Nearby Drivers',
    subtitle: 'Pinging nearest online verified drivers within your pickup radius.',
    themeColor: 'from-blue-600 via-indigo-500 to-cyan-500',
    pulseBorder: 'border-blue-500/60 shadow-[0_0_25px_rgba(59,130,246,0.35)]',
    badgeClass: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
    coreIcon: '🚗',
  },
  ambulance: {
    icon: Siren,
    title: 'Alerting Emergency Ambulances',
    subtitle: 'Connecting directly with nearest ICU and ALS ambulances on priority emergency wave.',
    themeColor: 'from-red-600 via-rose-600 to-red-500',
    pulseBorder: 'border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.4)]',
    badgeClass: 'bg-red-500/20 border-red-500/40 text-red-400',
    coreIcon: '🚑',
  },
};

export default function InstantSearchingScreen({
  type,
  radiusKm,
  onCancel,
  requestDetails,
  cancelling,
}: InstantSearchingScreenProps) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.ride;
  const reqNum = requestDetails?.bookingNumber || requestDetails?._id?.slice(-6) || 'LIVE-SEARCH';

  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-between py-10 px-4 text-white select-none animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="text-center max-w-md w-full pt-4 space-y-2">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold tracking-wide uppercase animate-pulse ${config.badgeClass}`}
        >
          <Radio className="w-3.5 h-3.5 animate-spin" />
          <span>Instant Dispatch Wave Active</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white">{config.title}</h2>
        <p className="text-xs text-slate-400 leading-relaxed px-2">{config.subtitle}</p>

        {/* Current Search Perimeter Chip */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <Badge variant="outline" className="text-xs border-white/20 bg-white/5 font-mono text-slate-200">
            Current Perimeter: <span className="font-bold text-white ml-1">{radiusKm} km</span>
          </Badge>
          <Badge variant="outline" className="text-xs border-white/20 bg-white/5 font-mono text-slate-300">
            ID: #{reqNum}
          </Badge>
        </div>
      </div>

      {/* Radar Animation Center */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center my-auto">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`absolute rounded-full border-2 ${config.pulseBorder}`}
            initial={{ width: 40, height: 40, opacity: 0.9 }}
            animate={{ width: 300, height: 300, opacity: 0 }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              delay: i * 0.9,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Center Glowing Core */}
        <div
          className={`relative w-24 h-24 rounded-full bg-gradient-to-tr ${config.themeColor} flex items-center justify-center shadow-2xl border-2 border-white/30 z-10 animate-pulse`}
        >
          <span className="text-4xl">{config.coreIcon}</span>
        </div>

        {/* Outer Orbiting Ping */}
        <div className="absolute inset-0 rounded-full border border-white/10 animate-[spin_10s_linear_infinite] pointer-events-none" />
      </div>

      {/* Bottom Actions & Policy notice */}
      <div className="max-w-md w-full space-y-4 pb-4">
        {requestDetails?.pickup?.address || requestDetails?.location?.address || requestDetails?.hospital ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-center gap-2 text-xs text-slate-300">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">
              Target Location:{' '}
              <strong className="text-white">
                {requestDetails?.pickup?.address || requestDetails?.location?.address || requestDetails?.hospital}
              </strong>
            </span>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-2" />
            Connecting to responder pool{dots}
          </div>

          <Button
            variant="outline"
            onClick={onCancel}
            disabled={cancelling}
            className="rounded-2xl border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs font-bold h-11 px-5"
          >
            {cancelling ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <X className="w-4 h-4 mr-1.5" />}
            {cancelling ? 'Cancelling...' : 'Cancel Search'}
          </Button>
        </div>
      </div>
    </div>
  );
}
