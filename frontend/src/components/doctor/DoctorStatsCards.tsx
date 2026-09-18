'use client';

import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle, AlertCircle, CalendarClock, Stethoscope } from 'lucide-react';

interface DoctorStatsCardsProps {
  apptTab: 'pending' | 'upcoming' | 'today' | 'complete';
  setApptTab: (tab: 'pending' | 'upcoming' | 'today' | 'complete') => void;
  todayCount: number;
  pendingCount: number;
  upcomingCount: number;
  completedCount: number;
}

export function DoctorStatsCards({
  apptTab,
  setApptTab,
  todayCount,
  pendingCount,
  upcomingCount,
  completedCount,
}: DoctorStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <motion.div
        whileHover={{ scale: 1.02 }}
        onClick={() => setApptTab('today')}
        className={`bg-card rounded-2xl border p-5 cursor-pointer transition-all ${
          apptTab === 'today'
            ? 'border-primary ring-2 ring-primary/20 shadow-md'
            : 'border-border/60'
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
        </div>
        <p className="font-heading text-2xl font-bold text-foreground">{todayCount}</p>
        <p className="text-sm text-muted-foreground">Today&apos;s Appointments</p>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.02 }}
        onClick={() => setApptTab('pending')}
        className={`bg-card rounded-2xl border p-5 cursor-pointer transition-all ${
          apptTab === 'pending'
            ? 'border-warning ring-2 ring-warning/20 shadow-md'
            : 'border-border/60'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-warning" />
          </div>
          {pendingCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
              Action Req.
            </span>
          )}
        </div>
        <p className="font-heading text-2xl font-bold text-foreground">{pendingCount}</p>
        <p className="text-sm text-muted-foreground">Pending Approvals</p>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.02 }}
        onClick={() => setApptTab('upcoming')}
        className={`bg-card rounded-2xl border p-5 cursor-pointer transition-all ${
          apptTab === 'upcoming'
            ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-md'
            : 'border-border/60'
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <CalendarClock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <p className="font-heading text-2xl font-bold text-foreground">{upcomingCount}</p>
        <p className="text-sm text-muted-foreground">Upcoming Confirmed</p>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.02 }}
        onClick={() => setApptTab('complete')}
        className={`bg-card rounded-2xl border p-5 cursor-pointer transition-all ${
          apptTab === 'complete'
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
            : 'border-border/60'
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-primary" />
          </div>
        </div>
        <p className="font-heading text-2xl font-bold text-foreground">{completedCount}</p>
        <p className="text-sm text-muted-foreground">Completed Visits</p>
      </motion.div>
    </div>
  );
}
