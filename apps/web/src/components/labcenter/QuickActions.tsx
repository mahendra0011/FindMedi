'use client';

import React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { Microscope, CalendarDays, FileText, TrendingUp } from 'lucide-react';

interface QuickActionsProps {
  totalEarned: number;
}

export default function QuickActions({ totalEarned }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Link href="/labcenter/tests" className="block">
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4 text-center cursor-pointer shadow-sm"
        >
          <Microscope className="w-6 h-6 mx-auto text-primary mb-1" />
          <p className="font-semibold text-sm text-foreground">Test Catalog</p>
          <p className="text-xs text-muted-foreground">Manage tests</p>
        </motion.div>
      </Link>
      <Link href="/labcenter/appointments" className="block">
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-2xl border border-emerald-500/20 p-4 text-center cursor-pointer shadow-sm"
        >
          <CalendarDays className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
          <p className="font-semibold text-sm text-foreground">Bookings</p>
          <p className="text-xs text-muted-foreground">Manage bookings</p>
        </motion.div>
      </Link>
      <Link href="/labcenter/prescriptions" className="block">
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-2xl border border-amber-500/20 p-4 text-center cursor-pointer shadow-sm"
        >
          <FileText className="w-6 h-6 mx-auto text-amber-500 mb-1" />
          <p className="font-semibold text-sm text-foreground">Rx Queue</p>
          <p className="text-xs text-muted-foreground">Verify prescriptions</p>
        </motion.div>
      </Link>
      <motion.div
        whileHover={{ scale: 1.03 }}
        className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 rounded-2xl border border-cyan-500/20 p-4 text-center cursor-pointer shadow-sm"
      >
        <TrendingUp className="w-6 h-6 mx-auto text-cyan-500 mb-1" />
        <p className="font-semibold text-sm text-foreground">₹{totalEarned.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">Total Revenue</p>
      </motion.div>
    </div>
  );
}
