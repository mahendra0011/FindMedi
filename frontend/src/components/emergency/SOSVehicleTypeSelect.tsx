import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export const VEHICLE_OPTIONS = [
  { id: 'auto', label: 'Auto', icon: '🛺' },
  { id: 'e_rickshaw', label: 'E-Rickshaw', icon: '🛵' },
  { id: 'car', label: 'Car / Cab', icon: '🚗' },
  { id: 'van', label: 'Van', icon: '🚐' },
  { id: 'ambulance', label: 'Ambulance', icon: '🚑' },
];

interface Props {
  selected: string[];
  onToggle: (id: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function SOSVehicleTypeSelect({ selected, onToggle, onContinue, onBack }: Props) {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-5 space-y-4">
        <h2 className="text-white font-black text-lg text-center">Vehicle type chuno</h2>
        <div className="flex flex-wrap gap-2 justify-center">
          {VEHICLE_OPTIONS.map((v) => {
            const active = selected.includes(v.id);
            return (
              <motion.button
                key={v.id}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => onToggle(v.id)}
                className={`px-4 h-11 rounded-full border text-sm font-bold flex items-center gap-2 transition-all ${active ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/40' : 'bg-slate-800 border-slate-700 text-slate-200'}`}
              >
                <span>{v.icon}</span> {v.label}
              </motion.button>
            );
          })}
        </div>
        {selected.length === 0 && <p className="text-center text-xs text-red-400">Kam se kam ek vehicle type chuno</p>}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack} className="rounded-xl">Back</Button>
          <Button type="button" onClick={onContinue} disabled={selected.length === 0} className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold">
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
