'use client';

import React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { CalendarDays, CalendarClock, AlertCircle, CheckCircle, Clock, User, ChevronRight } from 'lucide-react';

export interface LabBookingRecord {
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

export type BookingTabType = 'pending' | 'upcoming' | 'today' | 'completed';

interface BookingsHubProps {
  bookings: LabBookingRecord[];
  bookingTab: BookingTabType;
  setBookingTab: (tab: BookingTabType) => void;
  pendingBookings: LabBookingRecord[];
  upcomingBookings: LabBookingRecord[];
  todayBookings: LabBookingRecord[];
  completedBookings: LabBookingRecord[];
  statusColors: Record<string, { bg: string; text: string }>;
}

export default function BookingsHub({
  bookings,
  bookingTab,
  setBookingTab,
  pendingBookings,
  upcomingBookings,
  todayBookings,
  completedBookings,
  statusColors,
}: BookingsHubProps) {
  const displayedBookings =
    bookingTab === 'pending'
      ? pendingBookings
      : bookingTab === 'upcoming'
      ? upcomingBookings
      : bookingTab === 'today'
      ? todayBookings
      : completedBookings;

  return (
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
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  bookingTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-600'
                }`}
              >
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
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  bookingTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
                }`}
              >
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
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  bookingTab === 'today' ? 'bg-white/20 text-white' : 'bg-emerald-600/20 text-emerald-600'
                }`}
              >
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
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  bookingTab === 'completed' ? 'bg-white/20 text-white' : 'bg-purple-600/20 text-purple-600'
                }`}
              >
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
          {displayedBookings.slice(0, 5).map((b) => {
            const colors = statusColors[b.status] ||
              statusColors.Pending || { bg: 'bg-muted', text: 'text-muted-foreground' };
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
                    <Clock className="w-3.5 h-3.5" />
                    {b.timeSlot || b.time || 'Scheduled'}
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
  );
}
