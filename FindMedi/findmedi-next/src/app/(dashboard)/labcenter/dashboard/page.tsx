'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  CalendarDays, Clock, User, AlertCircle, TrendingUp, DollarSign,
  Beaker, FileText, Microscope, RotateCcw, Globe, Save, Building2,
  Users, CheckCircle, CalendarClock, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import LicenseExpiryReminder from '@/components/shared/sections/LicenseExpiryReminder';
import { getISTDateString } from '@/lib/dateUtils';

interface LabStats {
  total?: number;
  pending?: number;
  completed?: number;
}

interface LabBookingRecord {
  _id?: string;
  id?: string;
  patientName?: string;
  patient?: string;
  bookingDate?: string;
  status: string;
  amount?: number;
  tests?: string[];
  timeSlot?: string;
  time?: string;
}

interface RefundRecord {
  _id?: string;
  patientName?: string;
  patient?: string;
  reason?: string;
  description?: string;
  refund_amount?: number;
  amount?: number;
  status: string;
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
  const [bookingTab, setBookingTab] = useState<'pending' | 'upcoming' | 'today' | 'completed'>('pending');
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
        const [s, b, rf] = results.map(res => res.status === 'fulfilled' ? res.value : null);
        setStats(s as LabStats);
        const bookingList = (b as { bookings?: LabBookingRecord[] })?.bookings || (Array.isArray(b) ? b : []);
        setBookings(bookingList as LabBookingRecord[]);
        const rfList = (rf as { payments?: RefundRecord[]; data?: RefundRecord[] })?.payments || (rf as { payments?: RefundRecord[]; data?: RefundRecord[] })?.data || [];
        setRefunds((rfList as RefundRecord[]).slice(0, 5));
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) toast.error(`Failed to load ${failed.length} data source(s)`);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load dashboard data');
      }
      if (mounted.current) setLoading(false);
    };
    load();
    return () => { mounted.current = false; };
  }, []);

  const today = getISTDateString();
  const todayBookings = bookings.filter(b => (b.bookingDate || '').startsWith(today));
  const pendingBookings = bookings.filter(b => b.status === 'Pending');
  const upcomingBookings = bookings.filter(b => b.status === 'Confirmed' || (b.bookingDate && b.bookingDate > today && b.status !== 'Completed' && b.status !== 'Cancelled'));
  const completedBookings = bookings.filter(b => b.status === 'Completed');
  const pendingReports = stats?.pending ?? pendingBookings.length;
  const totalEarned = bookings.filter(b => b.status === 'Completed').reduce((s, b) => s + Number(b.amount || 0), 0);
  const completedTests = bookings.filter(b => b.status === 'Completed').reduce((s, b) => s + (b.tests?.length || 0), 0);
  const totalRefunded = refunds.reduce((s, r) => s + (r.refund_amount || r.amount || 0), 0);
  const pendingRefunds = refunds.filter(r => r.status === 'Pending' || r.status === 'pending').length;

  const displayedBookings = bookingTab === 'pending' ? pendingBookings
    : bookingTab === 'upcoming' ? upcomingBookings
    : bookingTab === 'today' ? todayBookings
    : completedBookings;

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
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border/60 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">Lab Bookings Hub</h2>
                <p className="text-xs text-muted-foreground">Manage sample collection & testing across 4 stages</p>
              </div>
            </div>

            {/* 4 Tabs: Pending, Upcoming, Today, Completed */}
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-2xl border border-border/50 overflow-x-auto">
              <button
                type="button"
                onClick={() => setBookingTab('pending')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  bookingTab === 'pending'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Pending</span>
                {pendingBookings.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${bookingTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-600'}`}>
                    {pendingBookings.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setBookingTab('upcoming')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  bookingTab === 'upcoming'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                <span>Upcoming</span>
                {upcomingBookings.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${bookingTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'}`}>
                    {upcomingBookings.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setBookingTab('today')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  bookingTab === 'today'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Today</span>
                {todayBookings.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${bookingTab === 'today' ? 'bg-white/20 text-white' : 'bg-emerald-600/20 text-emerald-600'}`}>
                    {todayBookings.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setBookingTab('completed')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  bookingTab === 'completed'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Completed</span>
                {completedBookings.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${bookingTab === 'completed' ? 'bg-white/20 text-white' : 'bg-purple-600/20 text-purple-600'}`}>
                    {completedBookings.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {displayedBookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No {bookingTab} bookings found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedBookings.slice(0, 5).map(b => {
                const colors = statusColors[b.status] || statusColors.Pending || { bg: 'bg-muted', text: 'text-muted-foreground' };
                return (
                  <motion.div
                    key={b._id || b.id}
                    whileHover={{ x: 4 }}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                        <User className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{b.patientName || b.patient}</p>
                        <p className="text-xs text-muted-foreground">{(b.tests || []).join(', ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />{b.timeSlot || b.time || 'Scheduled'}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
                        {b.status}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-border flex justify-end">
            <Link href="/labcenter/bookings" className="text-xs text-primary hover:underline flex items-center gap-1">
              View All Bookings <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" /> Pending Reports
            </h2>
          </div>

          {bookings.filter(b => b.status !== 'Completed').length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No pending reports</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.filter(b => b.status !== 'Completed').slice(0, 5).map(b => (
                <div key={b._id || b.id} className="p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground">{b.patientName || b.patient}</p>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">In Progress</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{(b.tests || []).join(', ')}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />{b.timeSlot || b.time || 'Scheduled'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Refund Section */}
      <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-destructive" /> Refunds
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-destructive font-medium">₹{totalRefunded.toLocaleString()} Total</span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">{pendingRefunds} Pending</span>
          </div>
        </div>
        {refunds.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <RotateCcw className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No refunds found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {refunds.map((r, idx) => (
              <div key={r._id || idx} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{r.patientName || r.patient || '—'}</p>
                    <p className="text-xs text-muted-foreground">{r.reason || r.description || 'Refund'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-destructive">₹{(r.refund_amount || r.amount || 0).toLocaleString()}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === 'Refunded' || r.status === 'refunded' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600'}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Platform Settings Section */}
      <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-lg text-foreground">Platform Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-emerald-500/5 rounded-xl border border-emerald-500/20 p-4">
            <p className="text-2xl font-bold text-emerald-600">Active</p>
            <p className="text-xs text-muted-foreground">Platform Status</p>
          </div>
          <div className="bg-primary/5 rounded-xl border border-primary/20 p-4">
            <p className="text-2xl font-bold text-primary">{stats?.total ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Total Bookings</p>
          </div>
          <div className="bg-blue-500/5 rounded-xl border border-blue-500/20 p-4">
            <p className="text-2xl font-bold text-blue-600">{stats?.completed ?? completedTests}</p>
            <p className="text-xs text-muted-foreground">Completed Tests</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-foreground">Auto Confirm Bookings</p>
                <p className="text-xs text-muted-foreground">Automatically confirm bookings after payment</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-foreground">Patient Self-Booking</p>
                <p className="text-xs text-muted-foreground">Allow patients to book tests without approval</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-foreground">Report Auto-Publish</p>
                <p className="text-xs text-muted-foreground">Automatically publish test reports after completion</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-foreground">SMS Notifications</p>
                <p className="text-xs text-muted-foreground">Send SMS alerts for booking confirmations and report availability</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Save className="w-4 h-4" />
            Save Platform Settings
          </button>
          <span className="text-xs text-muted-foreground">Changes apply platform-wide</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/labcenter/tests" className="block">
          <motion.div whileHover={{ scale: 1.03 }} className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4 text-center cursor-pointer shadow-sm">
            <Microscope className="w-6 h-6 mx-auto text-primary mb-1" />
            <p className="font-semibold text-sm text-foreground">Test Catalog</p>
            <p className="text-xs text-muted-foreground">Manage tests</p>
          </motion.div>
        </Link>
        <Link href="/labcenter/appointments" className="block">
          <motion.div whileHover={{ scale: 1.03 }} className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-2xl border border-emerald-500/20 p-4 text-center cursor-pointer shadow-sm">
            <CalendarDays className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
            <p className="font-semibold text-sm text-foreground">Bookings</p>
            <p className="text-xs text-muted-foreground">Manage bookings</p>
          </motion.div>
        </Link>
        <Link href="/labcenter/prescriptions" className="block">
          <motion.div whileHover={{ scale: 1.03 }} className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-2xl border border-amber-500/20 p-4 text-center cursor-pointer shadow-sm">
            <FileText className="w-6 h-6 mx-auto text-amber-500 mb-1" />
            <p className="font-semibold text-sm text-foreground">Rx Queue</p>
            <p className="text-xs text-muted-foreground">Verify prescriptions</p>
          </motion.div>
        </Link>
        <motion.div whileHover={{ scale: 1.03 }} className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 rounded-2xl border border-cyan-500/20 p-4 text-center cursor-pointer shadow-sm">
          <TrendingUp className="w-6 h-6 mx-auto text-cyan-500 mb-1" />
          <p className="font-semibold text-sm text-foreground">₹{totalEarned.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Revenue</p>
        </motion.div>
      </div>
    </div>
  );
}
