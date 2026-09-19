import React from 'react';
import { motion } from 'framer-motion';
import { Siren, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SOSSearchingScreenProps {
  radiusKm: number;
  phase: 'ambulance' | 'vehicle';
  onCancel: () => void;
  requestDetails?: any;
  noResponders?: boolean;
}

export default function SOSSearchingScreen({
  radiusKm,
  phase,
  onCancel,
  requestDetails,
  noResponders,
}: SOSSearchingScreenProps) {
  if (noResponders) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-white select-none">
        <div className="max-w-md w-full text-center space-y-4 rounded-3xl border border-red-500/40 bg-red-950/30 p-8">
          <p className="text-2xl">🚨</p>
          <h2 className="text-xl font-black">Koi responder nahi mila</h2>
          <p className="text-sm text-slate-300">Turant <strong>108</strong> ya <strong>112</strong> pe call karein.</p>
          <div className="flex gap-3 justify-center pt-2">
            <a href="tel:108" className="px-6 h-12 rounded-2xl bg-red-600 flex items-center font-bold">Call 108</a>
            <a href="tel:112" className="px-6 h-12 rounded-2xl bg-white text-slate-900 flex items-center font-bold">Call 112</a>
          </div>
          <button onClick={onCancel} className="text-xs text-slate-400 underline pt-2">Band karein</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-between py-10 px-4 text-white select-none animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="text-center max-w-md w-full pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold tracking-wide uppercase animate-pulse">
          <Siren className="w-3.5 h-3.5" /> Emergency SOS Active
        </div>
        <h2 className="text-xl sm:text-2xl font-black mt-2 text-white">
          Alerting Nearby Emergency Responders
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Stay calm. Your location has been broadcasted to verified emergency units.
        </p>
      </div>

      {/* Radar Animation Center */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-auto">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border-2 border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
            initial={{ width: 40, height: 40, opacity: 0.9 }}
            animate={{ width: 280, height: 280, opacity: 0 }}
            transition={{
              duration: 2.6,
              repeat: Infinity,
              delay: i * 0.85,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Center Pulse Core */}
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-red-600 via-rose-600 to-red-500 flex items-center justify-center shadow-2xl shadow-red-600/70 border-2 border-red-300/40 z-10 animate-pulse">
          <span className="text-3xl">🚑</span>
        </div>
      </div>

      {/* Dynamic Status & Radius Escalation */}
      <div className="text-center max-w-md w-full space-y-3">
        <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-4 backdrop-blur-md">
          <p className="text-sm sm:text-base font-bold text-red-200">
            {phase === 'ambulance'
              ? 'Searching for nearest hospital ambulance…'
              : 'No ambulance nearby — checking available emergency vehicles…'}
          </p>

          <div className="flex items-center justify-center gap-2 mt-2 text-xs font-semibold text-red-400">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>Search Radius: {radiusKm || 5} km</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          In case of extreme immediate danger, please dial <a href="tel:108" className="underline font-bold">108</a> (Ambulance) or <a href="tel:112" className="underline font-bold">112</a> (National Emergency).
        </p>
        <div className="flex items-center justify-center gap-2 pt-1">
          {[5, 10, 15].map((r) => (
            <span key={r} className={`h-2 w-2 rounded-full ${radiusKm >= r ? 'bg-red-500' : 'bg-slate-700'}`} />
          ))}
        </div>

        {/* Cancel Button */}
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="rounded-full px-6 text-xs h-10 border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="w-3.5 h-3.5 mr-1.5" /> Cancel Emergency Request
          </Button>
        </div>
      </div>
    </div>
  );
}
