'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, DollarSign, Beaker, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import LicenseExpiryReminder from '@/components/shared/sections/LicenseExpiryReminder';
import { getISTDateString } from '@/lib/dateUtils';
import {
  BookingsHub,
  PendingReportsSection,
  RefundsSection,
  PlatformSettingsSection,
  QuickActions,
  type LabBookingRecord,
  type RefundRecord,
  type BookingTabType,
} from '@/components/labcenter';

interface LabStats {
  total?: number;
  pending?: number;
  completed?: number;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  Pending: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  Confirmed: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  Completed: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  Cancelled: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
};

export default function LabCenterDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<LabStats | null>(null);
  const [bookings, setBookings] = useState<LabBookingRecord[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingTab, setBookingTab] = useState<BookingTabType>('pending');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const load = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          api.getLabStats(),
          api.getLabBookings({} as Record<string, unknown>),
          api.getRefunds({} as Record<string, unknown>),
        ]);
        if (!mounted.current) return;
        const [s, b, rf] = results.map((res) => (res.status === 'fulfilled' ? res.value : null));
        setStats(s as LabStats);
        const bookingList = (b as { bookings?: LabBookingRecord[] })?.bookings || (Array.isArray(b) ? b : []);
        setBookings(bookingList as LabBookingRecord[]);
        const rfList =
          (rf as { payments?: RefundRecord[]; data?: RefundRecord[] })?.payments ||
          (rf as { payments?: RefundRecord[]; data?: RefundRecord[] })?.data ||
          [];
        setRefunds((rfList as RefundRecord[]).slice(0, 5));
        const failed = results.filter((r) => r.status === 'rejected');
        if (failed.length > 0) toast.error(`Failed to load ${failed.length} data source(s)`);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load dashboard data');
      }
      if (mounted.current) setLoading(false);
    };
    load();
    return () => {
      mounted.current = false;
    };
  }, []);

  const today = getISTDateString();
  const todayBookings = bookings.filter((b) => (b.bookingDate || '').startsWith(today));
  const pendingBookings = bookings.filter((b) => b.status === 'Pending');
  const upcomingBookings = bookings.filter(
    (b) =>
      b.status === 'Confirmed' ||
      (b.bookingDate && b.bookingDate > today && b.status !== 'Completed' && b.status !== 'Cancelled')
  );
  const completedBookings = bookings.filter((b) => b.status === 'Completed');
  const pendingReports = stats?.pending ?? pendingBookings.length;
  const totalEarned = bookings
    .filter((b) => b.status === 'Completed')
    .reduce((s, b) => s + Number(b.amount || 0), 0);
  const completedTests = bookings
    .filter((b) => b.status === 'Completed')
    .reduce((s, b) => s + (b.tests?.length || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LicenseExpiryReminder />
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-6 text-white">
        <h1 className="font-heading text-2xl font-bold">Lab Center Dashboard</h1>
        <p className="opacity-90 mt-0.5">Welcome, {user?.name || 'Lab Admin'}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{stats?.total ?? bookings.length}</p>
          <p className="text-sm text-muted-foreground mt-0.5">Total Bookings</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{pendingReports}</p>
          <p className="text-sm text-muted-foreground mt-0.5">Pending Approvals</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">₹{totalEarned.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-0.5">Revenue</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <Beaker className="w-5 h-5 text-cyan-500" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{completedTests}</p>
          <p className="text-sm text-muted-foreground mt-0.5">Completed Tests</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BookingsHub
          bookings={bookings}
          bookingTab={bookingTab}
          setBookingTab={setBookingTab}
          pendingBookings={pendingBookings}
          upcomingBookings={upcomingBookings}
          todayBookings={todayBookings}
          completedBookings={completedBookings}
          statusColors={statusColors}
        />
        <PendingReportsSection bookings={bookings} />
      </div>

      <RefundsSection refunds={refunds} />

      <PlatformSettingsSection
        totalBookings={stats?.total ?? bookings.length}
        completedTests={stats?.completed ?? completedTests}
      />

      <QuickActions totalEarned={totalEarned} />
    </div>
  );
}
