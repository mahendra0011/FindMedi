'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays, ClipboardList, ShoppingCart, FileText, Bell, TestTube, Star
} from 'lucide-react';

const statCards = [
  { icon: CalendarDays, label: 'Upcoming Appts', color: 'text-emerald-500', bg: 'bg-emerald-500/10', link: '/patient/appointments' },
  { icon: ClipboardList, label: 'Active Prescriptions', color: 'text-blue-500', bg: 'bg-blue-500/10', link: '/patient/prescriptions' },
  { icon: ShoppingCart, label: 'Active Orders', color: 'text-amber-500', bg: 'bg-amber-500/10', link: '/patient/medicine-orders' },
  { icon: FileText, label: 'Reports Ready', color: 'text-violet-500', bg: 'bg-violet-500/10', link: '/patient/reports' },
  { icon: Bell, label: 'Notifications', color: 'text-orange-500', bg: 'bg-orange-500/10', link: '/notifications' },
  { icon: TestTube, label: 'Test Bookings', color: 'text-cyan-500', bg: 'bg-cyan-500/10', link: '/patient/bookings' },
  { icon: Star, label: 'My Reviews', color: 'text-yellow-500', bg: 'bg-yellow-500/10', link: '/patient/reviews' },
];

interface PatientStatsGridProps {
  statValues: Record<string, number>;
}

export function PatientStatsGrid({ statValues }: PatientStatsGridProps) {
  const router = useRouter();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {statCards.map((s, i) => {
          const val = statValues[s.label] ?? 0;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => router.push(s.link)}
              className="bg-card rounded-2xl border border-border/60 p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group"
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
