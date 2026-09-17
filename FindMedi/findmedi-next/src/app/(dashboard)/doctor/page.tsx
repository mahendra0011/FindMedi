'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { useAppointmentRealtime } from '@/hooks/useAppointmentRealtime';
import LicenseExpiryReminder from '@/components/shared/sections/LicenseExpiryReminder';
import { getISTDateString } from '@/lib/dateUtils';
import type { AppointmentStatus } from '@/types/enums';
import {
  DoctorStatsCards,
  DoctorConsultationHub,
  DoctorAppointmentsTabSection,
  DoctorPracticeOverview,
  type AppointmentItem,
  type ReviewItem,
  type LabReportItem,
  type RefundItem,
} from '@/components/doctor';

interface BillItem {
  _id: string;
  doctor?: string;
  patient?: string;
  amount?: number;
  paid?: number;
  status?: string;
  date?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export default function DoctorDashboardPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [bills, setBills] = useState<BillItem[]>([]);
  const [labReports, setLabReports] = useState<LabReportItem[]>([]);
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apptTab, setApptTab] = useState<'pending' | 'upcoming' | 'today' | 'complete'>('today');
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.getAppointments(),
        api.getReviews(),
        api.getBilling(),
        api.getRecords(),
        api.getRefunds(),
      ]);
      if (!mounted.current) return;
      const [a, r, b, records, rf] = results.map(res => res.status === 'fulfilled' ? res.value : []);

      const apptRaw: unknown = a;
      const apptList: AppointmentItem[] = Array.isArray(apptRaw)
        ? (apptRaw as AppointmentItem[])
        : (apptRaw as { appointments?: AppointmentItem[]; data?: AppointmentItem[] })?.appointments ||
          (apptRaw as { data?: AppointmentItem[] })?.data || [];
      const docName = user?.name?.toLowerCase();
      const myAppts = apptList.filter(apt =>
        apt.doctor?.toLowerCase() === docName ||
        apt.doctor?.toLowerCase().includes(docName || '')
      ) || [];
      setAppointments(myAppts);

      const revRaw: unknown = r;
      const revList: ReviewItem[] = Array.isArray(revRaw)
        ? (revRaw as ReviewItem[])
        : (revRaw as { reviews?: ReviewItem[]; data?: ReviewItem[] })?.reviews ||
          (revRaw as { data?: ReviewItem[] })?.data || [];
      const myReviews = revList.filter(rev => rev.doctorName?.toLowerCase() === docName) || [];
      setReviews(myReviews);

      const billRaw: unknown = b;
      const billList: BillItem[] = Array.isArray(billRaw)
        ? (billRaw as BillItem[])
        : (billRaw as { bills?: BillItem[]; data?: BillItem[] })?.bills ||
          (billRaw as { data?: BillItem[] })?.data || [];
      const myBills = billList.filter(billItem => billItem.doctor?.toLowerCase() === docName) || [];
      setBills(myBills);

      const recRaw: unknown = records;
      const recList: LabReportItem[] = Array.isArray(recRaw)
        ? (recRaw as LabReportItem[])
        : (recRaw as { records?: LabReportItem[]; data?: LabReportItem[] })?.records ||
          (recRaw as { data?: LabReportItem[] })?.data || [];
      const labReportsList = recList.filter(recItem => recItem.type === 'Lab Report' || recItem.type === 'lab_report');
      setLabReports(labReportsList);

      const refundRaw: unknown = rf;
      const refundArray: RefundItem[] = Array.isArray(refundRaw)
        ? (refundRaw as RefundItem[])
        : (refundRaw as { payments?: RefundItem[]; data?: RefundItem[] })?.payments ||
          (refundRaw as { data?: RefundItem[] })?.data || [];
      const myRefunds = refundArray.filter(refItem =>
        refItem.doctor?.toLowerCase() === docName ||
        refItem.patient?.toLowerCase().includes(docName || '')
      ) || [];
      setRefunds(myRefunds);

      const failed = results.filter(res => res.status === 'rejected');
      if (failed.length > 0) {
        const hasGenuineError = failed.some(item => {
          const reason = (item as PromiseRejectedResult).reason as { status?: number; response?: { status?: number } };
          const status = reason?.status || reason?.response?.status;
          return status && status !== 503;
        });
        if (hasGenuineError) {
          toast.error(`Failed to load ${failed.length} data source(s)`);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load dashboard data');
    }
    if (mounted.current) setLoading(false);
  }, [user?.name]);

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
  const pendingAppts = appointments.filter(a => (a.status || '').toLowerCase() === 'pending');
  const upcomingAppts = appointments
    .filter(a => a.date > today && ((a.status || '').toLowerCase() === 'confirmed' || (a.status || '').toLowerCase() === 'approved'))
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const completedAppts = appointments.filter(a => (a.status || '').toLowerCase() === 'completed');

  const todayInHospitalAppts = todayAppts.filter(a => {
    const mode = (a.appointmentMode || a.type || '').toLowerCase();
    const intakeMode = (a.preConsultationDetails?.appointmentMode || a.preConsultationDetails?.mode || '').toLowerCase();
    const isHome = mode === 'home_visit' || mode === 'home' || intakeMode === 'home_visit' || intakeMode === 'home';
    const isOnline = mode === 'chat' || mode === 'video' || mode === 'voice' || mode === 'audio';
    return !isHome && !isOnline && (a.status || '').toLowerCase() !== 'cancelled';
  });

  const todayHomeVisits = todayAppts.filter(a => {
    const mode = (a.appointmentMode || a.type || '').toLowerCase();
    const intakeMode = (a.preConsultationDetails?.appointmentMode || a.preConsultationDetails?.mode || '').toLowerCase();
    return (mode === 'home_visit' || mode === 'home' || intakeMode === 'home_visit' || intakeMode === 'home') && (a.status || '').toLowerCase() !== 'cancelled';
  });

  const todayVideoAppts = todayAppts.filter(a => {
    const mode = (a.appointmentMode || a.type || '').toLowerCase();
    return mode.includes('video') && (a.status || '').toLowerCase() !== 'cancelled';
  });

  const todayVoiceAppts = todayAppts.filter(a => {
    const mode = (a.appointmentMode || a.type || '').toLowerCase();
    return (mode.includes('voice') || mode.includes('audio') || mode.includes('call')) && !mode.includes('video') && (a.status || '').toLowerCase() !== 'cancelled';
  });

  const handleQuickStatus = async (id: string, status: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.updateAppointment(id, { status: status as AppointmentStatus });
      toast.success(`Appointment marked as ${status}`);
      load();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(`Failed to update status: ${msg}`);
    }
  };

  const uniquePatients = new Set(appointments.map(a => a.patient?.toLowerCase())).size;
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1) : '0.0';
  const totalEarned = bills.reduce((s, b) => s + (b.paid || 0), 0);
  const pendingPayment = bills.filter(b => b.status === 'Pending').reduce((s, b) => s + (b.amount || 0), 0);
  const totalRefunded = refunds.reduce((s, r) => s + (r.refund_amount || r.amount || 0), 0);
  const pendingRefunds = refunds.filter(r => r.status === 'Pending' || r.status === 'pending').length;

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <LicenseExpiryReminder />

      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-6 text-white">
        <h1 className="font-heading text-2xl font-bold">Welcome, Dr. {user?.name}</h1>
        <p className="opacity-90">Here&apos;s your practice overview</p>
      </div>

      {/* Stats Cards */}
      <DoctorStatsCards
        apptTab={apptTab}
        setApptTab={setApptTab}
        todayCount={todayAppts.length}
        pendingCount={pendingAppts.length}
        upcomingCount={upcomingAppts.length}
        completedCount={completedAppts.length}
      />

      {/* 5-Channel Consultation Hub */}
      <DoctorConsultationHub
        inHospitalCount={todayInHospitalAppts.length}
        homeVisitsCount={todayHomeVisits.length}
        videoCount={todayVideoAppts.length}
        voiceCount={todayVoiceAppts.length}
      />

      {/* Tab Section: Appointments & Reviews */}
      <div className="grid lg:grid-cols-3 gap-6">
        <DoctorAppointmentsTabSection
          apptTab={apptTab}
          setApptTab={setApptTab}
          pendingAppts={pendingAppts}
          upcomingAppts={upcomingAppts}
          todayAppts={todayAppts}
          completedAppts={completedAppts}
          todayStr={today}
          onQuickStatus={handleQuickStatus}
        />
        <div className="lg:col-span-1" />
      </div>

      {/* Practice Overview (Reviews, Lab Reports, Financials, Refunds) */}
      <DoctorPracticeOverview
        reviews={reviews}
        avgRating={avgRating}
        labReports={labReports}
        totalEarned={totalEarned}
        pendingPayment={pendingPayment}
        uniquePatients={uniquePatients}
        refunds={refunds}
        totalRefunded={totalRefunded}
        pendingRefunds={pendingRefunds}
      />
    </div>
  );
}
