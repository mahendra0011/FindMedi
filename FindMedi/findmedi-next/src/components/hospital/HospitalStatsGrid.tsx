'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle, CalendarClock, CalendarDays, CheckCircle,
  IndianRupee, TrendingUp, Users, TestTube
} from 'lucide-react';

const statCards = [
  { icon: AlertCircle, label: 'Pending', color: 'text-amber-500', bg: 'bg-amber-500/10', tabKey: 'pending' },
  { icon: CalendarClock, label: 'Upcoming', color: 'text-cyan-500', bg: 'bg-cyan-500/10', tabKey: 'upcoming' },
  { icon: CalendarDays, label: "Today's Appts", color: 'text-emerald-500', bg: 'bg-emerald-500/10', tabKey: 'today' },
  { icon: CheckCircle, label: 'Completed', color: 'text-blue-500', bg: 'bg-blue-500/10', tabKey: 'complete' },
  { icon: IndianRupee, label: "Today's Revenue", color: 'text-orange-500', bg: 'bg-orange-500/10', link: '/clinic/billing' },
  { icon: TrendingUp, label: 'Week Revenue', color: 'text-purple-500', bg: 'bg-purple-500/10', link: '/clinic/billing' },
  { icon: Users, label: 'Total Patients', color: 'text-indigo-500', bg: 'bg-indigo-500/10', link: '/clinic/patients' },
  { icon: TestTube, label: 'Test Requests', color: 'text-rose-500', bg: 'bg-rose-500/10', link: '/clinic/test-requests' },
];

interface HospitalStatsGridProps {
  statValues: Record<string, unknown>;
  apptTab: string;
  setApptTab: (tab: string) => void;
}

export function HospitalStatsGrid({
  statValues,
  apptTab,
  setApptTab,
}: HospitalStatsGridProps) {
  const router = useRouter();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {statCards.map((s, i) => {
          const val = statValues[s.label] as string | number;
          const isTabActive = s.tabKey && apptTab === s.tabKey;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => {
                if (s.tabKey) setApptTab(s.tabKey);
                else if (s.link) router.push(s.link);
              }}
              className={`bg-card rounded-2xl border p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group ${
                isTabActive ? 'border-primary ring-2 ring-primary/30 shadow-md' : 'border-border/60'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform`}>
                <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
              </div>
              <p className={`text-xl font-bold ${s.color}`}>{val}</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{s.label}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
