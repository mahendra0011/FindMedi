import React from 'react';
import { motion } from 'framer-motion';
import { Car, Zap, Ambulance } from 'lucide-react';

export type SOSMode = 'manual_select' | 'auto_select_vehicle' | 'auto_select_ambulance';

interface Props {
  selected: SOSMode;
  onSelect: (m: SOSMode) => void;
  onContinue: () => void;
}

const MODES = [
  { id: 'manual_select' as SOSMode, icon: Car, title: 'Select Vehicle', desc: 'Khud vehicle type chuno aur manually book karo' },
  { id: 'auto_select_vehicle' as SOSMode, icon: Zap, title: 'Automatic Select Vehicle', desc: 'Sab nearby vehicles dekho, khud ya auto-book karo' },
  { id: 'auto_select_ambulance' as SOSMode, icon: Ambulance, title: 'Automatic Ambulance', desc: 'Sirf ambulance, sabse fast auto-book' },
];

export default function SOSModeSelect({ selected, onSelect, onContinue }: Props) {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-3xl border border-red-500/30 bg-slate-900 p-5 space-y-3">
        <h2 className="text-white font-black text-lg text-center">Kaise search karein?</h2>
        <div className="space-y-2">
          {MODES.map((m, i) => {
            const Icon = m.icon;
            const active = selected === m.id;
            return (
              <motion.button
                key={m.id}
                type="button"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => onSelect(m.id)}
                className={`w-full text-left rounded-2xl border p-3 flex items-center gap-3 transition-all ${active ? 'border-red-500 bg-red-500/15 shadow-[0_0_18px_rgba(239,68,68,0.35)]' : 'border-slate-700 bg-slate-800/60 hover:border-slate-500'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white text-sm font-bold">{m.title}</p>
                  <p className="text-slate-400 text-xs">{m.desc}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
        <button type="button" onClick={onContinue} className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm">
          Continue
        </button>
      </motion.div>
    </div>
  );
}
