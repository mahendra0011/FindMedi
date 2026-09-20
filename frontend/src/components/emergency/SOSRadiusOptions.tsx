import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface Props {
  mode: 'manual_select' | 'auto_select_vehicle' | 'auto_select_ambulance';
  radiusKm: number;
  onRadius: (km: number) => void;
  autoBook: boolean;
  onAutoBook: (v: boolean) => void;
  autoFind: boolean;
  onAutoFind: (v: boolean) => void;
  onStart: () => void;
  onBack: () => void;
  starting?: boolean;
}

const RADII = [3, 5, 7, 10];

export default function SOSRadiusOptions({ mode, radiusKm, onRadius, autoBook, onAutoBook, autoFind, onAutoFind, onStart, onBack, starting }: Props) {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-5 space-y-4">
        <h2 className="text-white font-black text-lg text-center">Search options</h2>
        <div>
          <p className="text-slate-300 text-xs font-bold mb-2">Search Radius: [{radiusKm} km]</p>
          <div className="flex gap-2">
            {RADII.map((r) => (
              <button key={r} type="button" onClick={() => onRadius(r)} className={`flex-1 h-10 rounded-xl border text-sm font-bold ${radiusKm === r ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-200'}`}>
                {r} km
              </button>
            ))}
          </div>
        </div>
        {mode === 'auto_select_vehicle' && (
          <div className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-800/60 p-3">
            <div>
              <p className="text-white text-sm font-bold">Auto-Book Nearest</p>
              <p className="text-slate-400 text-xs">{autoBook ? 'Sabse pass wala jisne accept kiya wo turant book ho jaayega' : 'Accept-list dikhegi, khud book karo'}</p>
            </div>
            <Switch checked={autoBook} onCheckedChange={onAutoBook} />
          </div>
        )}
        {mode !== 'manual_select' && (
          <div className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-800/60 p-3">
            <div>
              <p className="text-white text-sm font-bold">Auto-Find Mode</p>
              <p className="text-slate-400 text-xs">System khud retry aur radius badhayega, tumhe kuch nahi karna</p>
            </div>
            <Switch checked={autoFind} onCheckedChange={onAutoFind} />
          </div>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack} className="rounded-xl">Back</Button>
          <Button type="button" onClick={onStart} disabled={!!starting} className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold">
            {starting ? 'Starting…' : 'Start Search'}
          </Button>
        </div>
      </div>
    </div>
  );
}
