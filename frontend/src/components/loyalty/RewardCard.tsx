import React from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  item: any;
  unlocked: boolean;
  pointsNeeded: number;
  onRedeem: (id: string) => void;
  redeeming?: boolean;
}

export default function RewardCard({ item, unlocked, pointsNeeded, onRedeem, redeeming }: Props) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={unlocked ? 'border-emerald-500/50 shadow-[0_0_18px_rgba(16,185,129,0.25)]' : 'opacity-80 grayscale-[0.4]'}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-sm">{item.title}</p>
            {!unlocked && <Lock className="w-4 h-4 text-slate-400 shrink-0" />}
          </div>
          {item.description ? <p className="text-xs text-muted-foreground">{item.description}</p> : null}
          <p className="text-xs font-black text-amber-600">{item.pointsRequired} points</p>
          {unlocked ? (
            <Button size="sm" disabled={!!redeeming} onClick={() => onRedeem(item._id)} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              {redeeming ? 'Redeeming…' : 'Redeem'}
            </Button>
          ) : (
            <p className="text-[11px] text-muted-foreground">🔒 {pointsNeeded} more points chahiye</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
