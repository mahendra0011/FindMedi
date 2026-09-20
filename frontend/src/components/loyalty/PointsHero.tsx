import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  balance: number;
  lifetime: number;
  tier: string;
}

const TIER_STYLE: Record<string, string> = {
  Bronze: 'from-amber-700 via-amber-600 to-amber-800',
  Silver: 'from-slate-400 via-slate-300 to-slate-500',
  Gold: 'from-yellow-400 via-amber-400 to-yellow-600',
  Platinum: 'from-purple-700 via-fuchsia-600 to-indigo-800',
};

const NEXT_TIER_AT: Record<string, number> = { Bronze: 500, Silver: 1500, Gold: 3000, Platinum: 3000 };

export default function PointsHero({ balance, lifetime, tier }: Props) {
  const nextAt = NEXT_TIER_AT[tier] || 500;
  const pct = Math.min(100, Math.round((lifetime / nextAt) * 100));
  return (
    <Card className={`bg-gradient-to-br ${TIER_STYLE[tier] || TIER_STYLE.Bronze} text-white border-0 shadow-xl`}>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-widest opacity-80">Aapke paas</p>
        <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-4xl font-black tabular-nums">
          {balance.toLocaleString('en-IN')} <span className="text-base font-bold">points</span>
        </motion.p>
        <div className="flex items-center gap-2 mt-2">
          <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-black">{tier}</span>
          <span className="text-xs opacity-80">Lifetime: {lifetime.toLocaleString('en-IN')}</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white/25 overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} className="h-2 bg-white rounded-full" />
        </div>
        <p className="text-[11px] mt-1 opacity-80">Next tier progress: {pct}%</p>
      </CardContent>
    </Card>
  );
}
