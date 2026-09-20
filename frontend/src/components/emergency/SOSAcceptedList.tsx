import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface Candidate {
  providerId: string;
  providerType: string;
  distanceKm: number;
  userId?: string;
  driverName?: string;
  vehicleNo?: string;
  etaMin?: number;
}

interface Props {
  candidates: Candidate[];
  onBook: (providerId: string) => void;
  onSearchAgain: () => void;
  onSearchWider: (km: number) => void;
  currentRadius: number;
  booking?: boolean;
}

const NEXT_RADIUS = (r: number) => (r < 5 ? 5 : r < 10 ? 10 : r < 15 ? 15 : 20);

export default function SOSAcceptedList({ candidates, onBook, onSearchAgain, onSearchWider, currentRadius, booking }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  if (!candidates.length) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-5 space-y-3 text-center">
          <p className="text-white font-bold">Koi accept nahi mila</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onSearchAgain} className="flex-1 rounded-xl">🔁 Search Again</Button>
            <Button type="button" onClick={() => onSearchWider(NEXT_RADIUS(currentRadius))} className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold">📡 Search in {NEXT_RADIUS(currentRadius)}km</Button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-emerald-500/30 bg-slate-900 p-5 space-y-3 max-h-[85vh] overflow-y-auto">
        <h2 className="text-white font-black text-center">{candidates.length} responders mile — choose karein</h2>
        {candidates.map((c, i) => (
          <motion.div key={c.providerId} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-2xl border border-slate-700 bg-slate-800/70 p-3">
            <div className="flex items-center justify-between">
              <p className="text-white text-sm font-bold">{c.providerType === 'ambulance' ? '🚑 Ambulance' : `🚗 ${c.driverName || 'Vehicle'}`}</p>
              <p className="text-emerald-400 text-sm font-black">{c.distanceKm} km away{c.etaMin ? ` · ETA ${c.etaMin} min` : ''}</p>
            </div>
            {confirmId === c.providerId ? (
              <div className="flex gap-2 mt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirmId(null)} className="rounded-xl">Cancel</Button>
                <Button type="button" size="sm" disabled={!!booking} onClick={() => onBook(c.providerId)} className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  {booking ? 'Booking…' : 'Confirm Book This'}
                </Button>
              </div>
            ) : (
              <Button type="button" size="sm" onClick={() => setConfirmId(c.providerId)} className="w-full mt-2 rounded-xl bg-white text-slate-900 font-bold">Book This</Button>
            )}
          </motion.div>
        ))}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onSearchAgain} className="flex-1 rounded-xl text-xs">🔁 Search Again</Button>
          <Button type="button" variant="outline" onClick={() => onSearchWider(NEXT_RADIUS(currentRadius))} className="flex-1 rounded-xl text-xs">📡 Search in {NEXT_RADIUS(currentRadius)}km</Button>
        </div>
      </div>
    </div>
  );
}
