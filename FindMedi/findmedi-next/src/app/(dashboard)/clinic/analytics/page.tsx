/* eslint-disable react-hooks/preserve-manual-memoization, prefer-const, react/no-unescaped-entities, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-expressions, @next/next/no-img-element,  @typescript-eslint/ban-ts-comment, react-hooks/set-state-in-effect, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
// // DoctorAnalyticsView replaced from '@/components/shared/sections/EarningsAnalytics';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function ClinicAnalytics() {
  const { user } = useAuth();
  const [data, setData] = useState({ appointments: [], patients: [], bills: [], labBookings: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getDoctorAnalytics();
        if (res?.success) {
          setData({
            appointments: res.appointments || [],
            patients: res.patients || [],
            bills: res.bills || [],
            labBookings: res.labBookings || [],
          });
        }
      } catch (e) {
        toast.error(e.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    if (user?.name) {
      load();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="p-1"
    >
      <div className='bg-card rounded-2xl border p-6'><p className='text-muted-foreground'>Analytics: {data.appointments.length} appointments, {data.patients.length} patients, {data.bills.length} bills, {data.labBookings.length} lab bookings</p></div>
    </motion.div>
  );
}
