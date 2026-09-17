'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { api, txToEarningsBill } from '@/lib/api';
import { getISTDateString } from '@/lib/dateUtils';
import { useAppointmentRealtime } from '@/hooks/useAppointmentRealtime';
import LicenseExpiryReminder from '@/components/shared/sections/LicenseExpiryReminder';
import EarningsAnalytics from '@/components/shared/sections/EarningsAnalytics';
import type { AppointmentStatus } from '@/types/enums';
import {
  HospitalWelcomeBanner,
  HospitalStatsGrid,
  HospitalConsultationHub,
  HospitalAppointmentsSection,
  HospitalFinancialSummary,
  type AppointmentRecord,
  type HospitalFinancialReview,
  type HospitalFinancialTestRequest,
  type HospitalFinancialRefund,
  type HospitalFinancialPayment,
} from '@/components/hospital';

export default function ClinicDashboardPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [bills, setBills] = useState<Array<ReturnType<typeof txToEarningsBill>>>([]);
  const [payments, setPayments] = useState<HospitalFinancialPayment[]>([]);
  const [reviews, setReviews] = useState<HospitalFinancialReview[]>([]);
  const [refunds, setRefunds] = useState<HospitalFinancialRefund[]>([]);
  const [patients, setPatients] = useState<string[]>([]);
  const [testRequests, setTestRequests] = useState<HospitalFinancialTestRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [apptTab, setApptTab] = useState('pending');
  const mounted = useRef(true);

  const handleAcceptAppt = async (id: string) => {
    try {
      await api.updateAppointment(id, { status: 'Confirmed' as AppointmentStatus });
      toast.success('Appointment confirmed successfully');
      setAppointments(prev => prev.map(a => a._id === id ? { ...a, status: 'Confirmed' } : a));
    } catch {
      toast.error('Failed to confirm appointment');
    }
  };

  const handleRejectAppt = async (id: string) => {
    try {
      await api.updateAppointment(id, { status: 'Cancelled' as AppointmentStatus });
      toast.info('Appointment request rejected');
      setAppointments(prev => prev.map(a => a._id === id ? { ...a, status: 'Cancelled' } : a));
    } catch {
      toast.error('Failed to reject appointment');
    }
  };

  const userName = user?.name;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.getAppointments(),
        api.getTransactions({ limit: 500 }),
        api.getReviews(),
        api.getLabBookings(),
      ]);
      if (!mounted.current) return;
      const [a, tx, r, lb] = results.map(res => res.status === 'fulfilled' ? res.value : []);
      const apptsRaw = a as { data?: AppointmentRecord[] } | AppointmentRecord[] | undefined;
      const appts: AppointmentRecord[] = Array.isArray(apptsRaw) ? apptsRaw : (apptsRaw?.data || []);
      const docName = userName?.toLowerCase() || '';
      const myAppts = appts.filter(apt =>
        typeof apt.doctor === 'string'
          ? apt.doctor.toLowerCase().includes(docName)
          : apt.doctor?.name?.toLowerCase().includes(docName)
      );
      setAppointments(myAppts);

      const txRaw = tx as { data?: Record<string, unknown>[]; payments?: Record<string, unknown>[] } | Record<string, unknown>[] | undefined;
      const txList: Record<string, unknown>[] = Array.isArray(txRaw) ? txRaw : (txRaw?.data || txRaw?.payments || []);
      setBills(txList.filter(t => t.status === 'completed' || t.status === 'pending').map(txToEarningsBill));
      setPayments(txList.filter(t => t.status === 'completed') as unknown as HospitalFinancialPayment[]);
      setRefunds(txList.filter(t => t.status === 'refunded' || t.status === 'pending') as unknown as HospitalFinancialRefund[]);

      const rRaw = r as { data?: HospitalFinancialReview[] } | HospitalFinancialReview[] | undefined;
      const rList: HospitalFinancialReview[] = Array.isArray(rRaw) ? rRaw : (rRaw?.data || []);
      setReviews(rList.filter(rv => rv.doctorName === userName) || []);

      setPatients(Array.from(new Set(myAppts.map(apt => (typeof apt.patient === 'string' ? apt.patient : '')).filter(Boolean))));

      const lbRaw = lb as { bookings?: HospitalFinancialTestRequest[]; data?: HospitalFinancialTestRequest[] } | HospitalFinancialTestRequest[] | undefined;
      const labBookingsArray: HospitalFinancialTestRequest[] = Array.isArray(lbRaw) ? lbRaw : (lbRaw?.bookings || lbRaw?.data || []);
      setTestRequests(labBookingsArray);

      const failed = results.filter(res => res.status === 'rejected');
      if (failed.length > 0) toast.error(`Failed to load ${failed.length} data source(s)`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load dashboard data');
    }
    if (mounted.current) setLoading(false);
  }, [userName]);

  useEffect(() => {
    mounted.current = true;
    const timer = setTimeout(() => {
      load();
    }, 0);
    return () => {
      mounted.current = false;
      clearTimeout(timer);
    };
  }, [load]);

  useAppointmentRealtime(load);

  const today = getISTDateString();
  const todayAppts = appointments.filter(a => a.date === today);
  const upcomingAppts = appointments.filter(a => a.date && a.date >= today && a.status !== 'Completed' && a.status !== 'Cancelled');
  const pendingAppts = appointments.filter(a => a.status === 'Pending');
  const completedAppts = appointments.filter(a => a.status === 'Completed');
  const todayRevenue = bills.filter(b => b.date === today && b.status === 'Paid').reduce((s, b) => s + (b.paid || b.amount || 0), 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0] ?? '';
  const weekRevenue = bills.filter(b => b.date >= weekStartStr && b.date <= today && b.status === 'Paid').reduce((s, b) => s + (b.paid || b.amount || 0), 0);
  const totalRefunded = refunds.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const pendingRefunds = refunds.filter(r => r.status === 'pending' || r.status === 'Pending').length;

  const statValues: Record<string, string | number> = {
    'Pending': pendingAppts.length,
    'Upcoming': upcomingAppts.length,
    "Today's Appts": todayAppts.length,
    'Completed': completedAppts.length,
    "Today's Revenue": `₹${todayRevenue.toLocaleString('en-IN')}`,
    'Week Revenue': `₹${weekRevenue.toLocaleString('en-IN')}`,
    'Total Patients': patients.length,
    'Test Requests': testRequests.length,
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <LicenseExpiryReminder />

      {/* Welcome Banner */}
      <HospitalWelcomeBanner userName={user?.name} />

      {/* Stats Grid */}
      <HospitalStatsGrid
        statValues={statValues}
        apptTab={apptTab}
        setApptTab={setApptTab}
      />

      {/* 5-Mode Live Consultation Hub */}
      <HospitalConsultationHub todayApptsCount={todayAppts.length} />

      {/* Appointments Hub */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <HospitalAppointmentsSection
          apptTab={apptTab}
          setApptTab={setApptTab}
          pendingAppts={pendingAppts}
          upcomingAppts={upcomingAppts}
          todayAppts={todayAppts}
          completedAppts={completedAppts}
          onAcceptAppt={handleAcceptAppt}
          onRejectAppt={handleRejectAppt}
        />
        <div className="lg:col-span-1" />
      </div>

      {/* Earnings Analytics */}
      <EarningsAnalytics bills={bills} title="Earnings Analytics" />

      {/* Financials, Patients, Reviews, Test Requests, Quick Actions, Refunds */}
      <HospitalFinancialSummary
        patients={patients}
        reviews={reviews}
        testRequests={testRequests}
        refunds={refunds}
        totalRefunded={totalRefunded}
        pendingRefunds={pendingRefunds}
        payments={payments}
      />
    </div>
  );
}
