import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, Clock, User, CheckCircle, CheckCircle2, AlertCircle, Star, DollarSign,
  Stethoscope, Activity, Users, FlaskConical, RotateCcw,
  MapPin, Phone, Video, MessageCircle, ChevronRight, Car, Sparkles,
  Building2, Check, X, CalendarClock, Heart, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useAppointmentRealtime } from '@/lib/useAppointmentRealtime';
import LicenseExpiryReminder from '@/components/LicenseExpiryReminder';
import EarningsAnalytics from '@/components/EarningsAnalytics';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';

function isInPersonAppointment(appt) {
  if (!appt) return false;
  const mode = (appt.appointmentMode || '').toLowerCase();
  const type = (appt.type || '').toLowerCase();
  const intakeMode = (appt.preConsultationDetails?.appointmentMode || appt.preConsultationDetails?.mode || '').toLowerCase();
  if (mode === 'offline' || mode === 'in_person' || mode === 'in-person' || mode === 'home_visit' || mode === 'home' || intakeMode === 'in_person' || intakeMode === 'offline' || intakeMode === 'home_visit' || intakeMode === 'home') {
    return true;
  }
  const isOnline = mode === 'chat' || mode === 'video' || mode === 'voice' || mode === 'audio' ||
    type.includes('chat') || type.includes('video') || type.includes('voice') || type.includes('audio');
  return !isOnline;
}

function getAppointmentModeMeta(appt) {
  if (!appt) return { key: 'hospital', label: 'In Hospital', icon: Building2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
  const mode = (appt.appointmentMode || appt.type || '').toLowerCase();
  const intakeMode = (appt.preConsultationDetails?.appointmentMode || appt.preConsultationDetails?.mode || '').toLowerCase();
  
  if (mode === 'home_visit' || mode === 'home' || intakeMode === 'home_visit' || intakeMode === 'home') {
    return { key: 'home', label: 'Home Visit', icon: MapPin, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' };
  }
  if (mode.includes('video')) {
    return { key: 'video', label: 'Video Consult', icon: Video, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' };
  }
  if (mode.includes('voice') || mode.includes('audio') || mode.includes('call')) {
    return { key: 'voice', label: 'Voice Call', icon: Phone, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
  }
  if (mode.includes('chat') || mode.includes('message')) {
    return { key: 'chat', label: 'Patient Chat', icon: MessageCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
  }
  return { key: 'hospital', label: 'In Hospital', icon: Building2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
}

const statusColors = {
  Confirmed: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
  Pending: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
  Completed: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  Cancelled: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20' },
};

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [bills, setBills] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [patientCarePlans, setPatientCarePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const appointmentsSectionRef = useRef(null);
  const handleStatClick = (tab) => {
    setApptTab(tab);
    appointmentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.getAppointments({ limit: 200, page: 1 }),
        api.getReviews(user?.doctorProfileId ? { doctorId: user.doctorProfileId } : {}),
        api.getBilling({ limit: 200, page: 1 }),
        api.getRecords({ limit: 200, page: 1 }),
        api.getRefunds({ limit: 200, page: 1 }),
        api.getDoctorCarePlans(),
      ]);
      if (!mounted.current) return;
      const [a, r, b, records, rf, cp] = results.map(res => res.status === 'fulfilled' ? res.value : []);
      if (cp?.carePlans) setPatientCarePlans(cp.carePlans);
      const appts = a?.data || a || [];
      setAppointments(Array.isArray(appts) ? appts : []);
      const reviewsList = r?.reviews || r?.data || r || [];
      setReviews(Array.isArray(reviewsList) ? reviewsList : []);

      const billsArray = b?.data || b?.bills || b || [];
      setBills(Array.isArray(billsArray) ? billsArray : []);

      const allRecords = records?.data || records?.records || records || [];
      const myLabReports = allRecords
        .filter(rec => rec.type === 'lab_report')
        .slice(-10)
        .reverse();
      setLabReports(myLabReports);

      const refundArray = rf?.payments || rf?.data || rf || [];
      setRefunds(Array.isArray(refundArray) ? refundArray : []);

      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        // Transient errors (503/network) par "Failed to load" toast mat dikhao —
        // axios interceptor already retry karta hai, aur dashboard baar baar
        // load hota hai (realtime hook + 30s interval). Sirf genuine errors par.
        const hasGenuineError = failed.some(r => {
          const err = r.reason;
          const status = err?.status || err?.response?.status;
          return status && status !== 503;
        });
        if (hasGenuineError) {
          toast.error(`Failed to load ${failed.length} data source(s)`);
        }
      }
    } catch (e) { console.error(e); toast.error('Failed to load dashboard data'); }
    if (mounted.current) setLoading(false);
  }, [user?.name, user?._id, user?.doctorProfileId]);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => { mounted.current = false; };
  }, [load]);

  // Realtime — naya booking/status change turant dikhein (silent, no flicker)
  useAppointmentRealtime(() => load(true));

  const today = getISTDateString();
  const todayAppts = appointments.filter(a => a.date === today && (a.status || '').toLowerCase() !== 'cancelled');
  const pendingAppts = appointments.filter(a => (a.status || '').toLowerCase() === 'pending');
  const upcomingAppts = appointments
    .filter(a => a.date > today && ((a.status || '').toLowerCase() === 'confirmed' || (a.status || '').toLowerCase() === 'approved'))
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  const completedAppts = appointments.filter(a => (a.status || '').toLowerCase() === 'completed');

  // Breakdown by consultation mode for the 5-card hub
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

  const todayChatAppts = todayAppts.filter(a => {
    const mode = (a.appointmentMode || a.type || '').toLowerCase();
    return (mode.includes('chat') || mode.includes('message')) && (a.status || '').toLowerCase() !== 'cancelled';
  });

  const [apptTab, setApptTab] = useState('today');

  const handleQuickStatus = async (id, status, e) => {
    if (e) e.stopPropagation();
    try {
      await api.updateAppointment(id, { status });
      toast.success(`Appointment marked as ${status}`);
      load(true);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to update status: ${err.message || 'Error'}`);
    }
  };

  const uniquePatients = new Set(appointments.map(a => a.patient?.toLowerCase())).size;
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1) : '0.0';
  
  // Earnings
  const totalEarned = bills.reduce((s, b) => s + (b.paid || 0), 0);
  const pendingPayment = bills.filter(b => b.status === 'Pending').reduce((s, b) => s + (b.amount || 0), 0);
  const totalRefunded = refunds.reduce((s, r) => s + (r.refund_amount || r.amount || 0), 0);
  const pendingRefunds = refunds.filter(r => r.status === 'Pending' || r.status === 'pending').length;

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[0,1,2,3].map((i) => (
        <div key={i} className="rounded-2xl border p-5 animate-pulse">
          <div className="h-4 w-24 bg-muted rounded mb-3" />
          <div className="h-8 w-16 bg-muted rounded" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <LicenseExpiryReminder />
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-6 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Welcome, Dr. {user?.name}</h1>
            <p className="opacity-90">Here's your practice overview</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => load(true)} className="gap-1.5 rounded-xl">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid - Clickable to switch Appointments Tab */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => handleStatClick('today')}
          className={`bg-card rounded-2xl border p-5 cursor-pointer transition-all ${apptTab === 'today' ? 'border-primary ring-2 ring-primary/20 shadow-md' : 'border-border/60'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{todayAppts.length}</p>
          <p className="text-sm text-muted-foreground">Today's Appointments</p>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => handleStatClick('pending')}
          className={`bg-card rounded-2xl border p-5 cursor-pointer transition-all ${apptTab === 'pending' ? 'border-warning ring-2 ring-warning/20 shadow-md' : 'border-border/60'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-warning" />
            </div>
            {pendingAppts.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                Action Req.
              </span>
            )}
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{pendingAppts.length}</p>
          <p className="text-sm text-muted-foreground">Pending Approvals</p>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => handleStatClick('upcoming')}
          className={`bg-card rounded-2xl border p-5 cursor-pointer transition-all ${apptTab === 'upcoming' ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-md' : 'border-border/60'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{upcomingAppts.length}</p>
          <p className="text-sm text-muted-foreground">Upcoming Confirmed</p>
        </motion.div>
        
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => handleStatClick('complete')}
          className={`bg-card rounded-2xl border p-5 cursor-pointer transition-all ${apptTab === 'complete' ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' : 'border-border/60'}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{completedAppts.length}</p>
          <p className="text-sm text-muted-foreground">Completed Visits</p>
        </motion.div>
      </div>

      {/* Consultation & Patient Visits Hub (Sequence: In Hospital -> Home Visits -> Video Consult -> Voice Calls -> Patient Chat) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-lg text-foreground">
                  Consultation & Live Patient Tracking Hub
                </h3>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Hospital Doctor Suite
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage your in-hospital OPD, confirmed home visits with live GPS map tracking, video consultations, voice calls, and encrypted chat.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* 1. In Hospital Consultations */}
          <div
            onClick={() => navigate('/doctor/appointments')}
            className="group relative rounded-2xl border-2 border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 p-4 hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white flex items-center gap-1">
                  Hospital OPD
                </span>
              </div>
              <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-blue-600 transition-colors">
                In Hospital
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                In-person hospital OPD patient consultations, token queue, prescription & vitals.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-blue-500/20 flex items-center justify-between text-xs font-semibold text-blue-600">
              <span>{todayInHospitalAppts.length} active today</span>
              <span className="flex items-center gap-0.5">Open OPD <ChevronRight className="w-3.5 h-3.5" /></span>
            </div>
          </div>

          {/* 2. Home Visits with Live GPS Map */}
          <div
            onClick={() => navigate('/doctor/home-visit')}
            className="group relative rounded-2xl border-2 border-violet-500/30 bg-violet-500/5 dark:bg-violet-950/20 p-4 hover:border-violet-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500 text-white flex items-center gap-1">
                  <Car className="w-3 h-3" /> Live GPS
                </span>
              </div>
              <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-violet-600 transition-colors">
                Home Visits
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Live patient route tracking map, Haversine distance, urban ETA, and arrival waiting room check-in.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-violet-500/20 flex items-center justify-between text-xs font-semibold text-violet-600">
              <span>{todayHomeVisits.length} active today</span>
              <span className="flex items-center gap-0.5">Track Map <ChevronRight className="w-3.5 h-3.5" /></span>
            </div>
          </div>

          {/* 3. Video Calls */}
          <div
            onClick={() => navigate('/doctor/video-calls')}
            className="group relative rounded-2xl border border-border/60 bg-card p-4 hover:border-cyan-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Video className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600">
                  1080p HD
                </span>
              </div>
              <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-cyan-600 transition-colors">
                Video Consult
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Full HD 1080p video consultation room with screen sharing, PiP, and camera controls.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-cyan-600">
              <span>{todayVideoAppts.length} active today</span>
              <span className="flex items-center gap-0.5">Start <ChevronRight className="w-3.5 h-3.5" /></span>
            </div>
          </div>

          {/* 4. Voice Calls */}
          <div
            onClick={() => navigate('/doctor/calls')}
            className="group relative rounded-2xl border border-border/60 bg-card p-4 hover:border-emerald-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Phone className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                  WebRTC
                </span>
              </div>
              <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-emerald-600 transition-colors">
                Voice Calls
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                1-to-1 crystal-clear audio consultations with active call duration & log history.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-emerald-600">
              <span>{todayVoiceAppts.length} active today</span>
              <span className="flex items-center gap-0.5">Dial <ChevronRight className="w-3.5 h-3.5" /></span>
            </div>
          </div>

          {/* 5. Patient Chat */}
          <div
            onClick={() => navigate('/doctor/chat')}
            className="group relative rounded-2xl border border-border/60 bg-card p-4 hover:border-amber-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                  Instant
                </span>
              </div>
              <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-amber-600 transition-colors">
                Patient Chat
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Encrypted text chat, symptom discussions, and medical report sharing.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-amber-500/20 flex items-center justify-between text-xs font-semibold text-amber-600">
              <span>{todayChatAppts.length} active today</span>
              <span className="flex items-center gap-0.5">Chat <ChevronRight className="w-3.5 h-3.5" /></span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Earnings Analytics */}
      <EarningsAnalytics bills={bills} title="Earnings Analytics" />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4-Tab Appointments Management Hub (Pending, Upcoming, Today, Complete) */}
        <div ref={appointmentsSectionRef} className="bg-card rounded-2xl border border-border/60 p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <h2 className="font-heading text-lg font-semibold text-foreground">Appointments</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/doctor/appointments')}
                className="text-xs text-primary hover:text-primary gap-1 h-7 px-2.5 -mr-2"
              >
                View Full List <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* 4 Tabs: Pending, Upcoming, Today, Complete */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-2xl border border-border/50 mb-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => setApptTab('pending')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 shrink-0 ${
                  apptTab === 'pending'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Pending
                {pendingAppts.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${apptTab === 'pending' ? 'bg-white/25 text-white' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                    {pendingAppts.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setApptTab('upcoming')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 shrink-0 ${
                  apptTab === 'upcoming'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                Upcoming
                {upcomingAppts.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${apptTab === 'upcoming' ? 'bg-white/25 text-white' : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'}`}>
                    {upcomingAppts.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setApptTab('today')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 shrink-0 ${
                  apptTab === 'today'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Today
                {todayAppts.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${apptTab === 'today' ? 'bg-white/25 text-white' : 'bg-primary/20 text-primary'}`}>
                    {todayAppts.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setApptTab('complete')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 shrink-0 ${
                  apptTab === 'complete'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Complete
                {completedAppts.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${apptTab === 'complete' ? 'bg-white/25 text-white' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                    {completedAppts.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB CONTENT */}
            {apptTab === 'pending' && (
              pendingAppts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/40" />
                  <p className="text-sm font-medium">All caught up!</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">No pending appointment requests awaiting approval.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {pendingAppts.map(apt => {
                    const meta = getAppointmentModeMeta(apt);
                    const Icon = meta.icon;
                    return (
                      <motion.div
                        key={apt._id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3.5 bg-amber-500/5 dark:bg-amber-950/20 rounded-xl border border-amber-500/20 hover:border-amber-500/40 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">
                              {apt.patient?.[0]?.toUpperCase() || 'P'}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground text-sm leading-tight">{apt.patient || 'Patient'}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
                                  <Icon className="w-3 h-3" /> {meta.label}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {apt.date} · {apt.time}
                                </span>
                              </div>
                            </div>
                          </div>
                          {apt.fee && (
                            <span className="text-xs font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                              ₹{apt.fee}
                            </span>
                          )}
                        </div>

                        {apt.department && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
                            <span className="font-medium text-foreground/80">Dept:</span> {apt.department}
                            {apt.preConsultationDetails?.symptoms && ` · Symptoms: ${apt.preConsultationDetails.symptoms}`}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-2 border-t border-amber-500/15">
                          <Button
                            size="sm"
                            onClick={(e) => handleQuickStatus(apt._id, 'Confirmed', e)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 gap-1 rounded-lg shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" /> Accept Request
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleQuickStatus(apt._id, 'Cancelled', e)}
                            className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs h-7 gap-1 rounded-lg"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )
            )}

            {apptTab === 'upcoming' && (
              upcomingAppts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarClock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No upcoming bookings</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">Confirmed future appointments will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {upcomingAppts.slice(0, 6).map(apt => {
                    const meta = getAppointmentModeMeta(apt);
                    const Icon = meta.icon;
                    const d1 = new Date(today + 'T00:00:00');
                    const d2 = new Date(apt.date + 'T00:00:00');
                    const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
                    const relativeBadge = diffDays === 1 ? 'Tomorrow' : diffDays > 1 && diffDays <= 7 ? `In ${diffDays} days` : formatDisplayDate(apt.date);

                    return (
                      <motion.div
                        key={apt._id}
                        whileHover={{ x: 3 }}
                        className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-all border border-border/40"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-sm shrink-0">
                            <Icon className="w-4.5 h-4.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate">{apt.patient || 'Patient'}</p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <span className="font-medium text-foreground/80">{apt.date}</span>
                              <span>·</span>
                              <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{apt.time}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400">
                            {relativeBadge}
                          </span>
                          <span className={`text-[10px] font-medium px-2 py-0.2 rounded-full border ${meta.bg} ${meta.color}`}>
                            {meta.label}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )
            )}

            {apptTab === 'today' && (
              todayAppts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No appointments today</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">Check upcoming tab or approve pending requests.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {todayAppts.slice(0, 6).map(apt => {
                    const colors = statusColors[apt.status] || statusColors.Pending;
                    const meta = getAppointmentModeMeta(apt);
                    const Icon = meta.icon;
                    return (
                      <motion.div 
                        key={apt._id} 
                        whileHover={{ x: 3 }}
                        className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-all border border-border/40"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
                            <User className={`w-4.5 h-4.5 ${colors.text}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate">{apt.patient || 'Patient'}</p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded ${meta.bg} ${meta.color}`}>
                                <Icon className="w-2.5 h-2.5" /> {meta.label}
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{apt.time}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${colors.bg} ${colors.text}`}>
                            {apt.status}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )
            )}

            {apptTab === 'complete' && (
              completedAppts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No completed visits yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">Completed consultations will appear in this history.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {completedAppts.slice(0, 6).map(apt => {
                    const meta = getAppointmentModeMeta(apt);
                    const Icon = meta.icon;
                    return (
                      <motion.div 
                        key={apt._id} 
                        whileHover={{ x: 3 }}
                        className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-all border border-border/40"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4.5 h-4.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate">{apt.patient || 'Patient'}</p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded ${meta.bg} ${meta.color}`}>
                                <Icon className="w-2.5 h-2.5" /> {meta.label}
                              </span>
                              <span>·</span>
                              <span>{apt.date}</span>
                            </div>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600">
                          Completed
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <Star className="w-5 h-5 text-warning" /> Recent Reviews
            </h2>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`w-4 h-4 ${s <= Math.round(Number(avgRating)) ? 'text-warning fill-warning' : 'text-muted'}`} />
              ))}
              <span className="text-sm font-medium ml-1">{avgRating}</span>
            </div>
          </div>
          
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No reviews yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.slice(0, 4).map(rv => (
                <div key={rv._id} className="p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground">{rv.patientName}</p>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= rv.rating ? 'text-warning fill-warning' : 'text-muted'}`} />
                      ))}
                    </div>
                  </div>
                  {rv.comment && <p className="text-sm text-muted-foreground line-clamp-2">{rv.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Lab Reports */}
      {labReports.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" /> Recent Lab Reports
            </h2>
            <span className="text-xs text-muted-foreground">{labReports.length} total</span>
          </div>
          <div className="space-y-2">
            {labReports.slice(0, 5).map((report, idx) => (
              <div key={report._id || idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                    <FlaskConical className="w-4 h-4 text-violet-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{report.patient || 'Unknown Patient'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {report.data?.tests?.length || 0} tests
                      {report.data?.reportId && ` · ${report.data.reportId}`}
                      {report.createdAt && ` · ${new Date(report.createdAt).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                {report.data?.tests && report.data.tests.length > 0 && (
                  <span className="shrink-0 text-xs font-medium text-success">
                    {report.data.tests.filter(t => t.result !== undefined && t.result !== null).length}/{report.data.tests.length} done
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-2xl border border-success/20 p-4 text-center">
          <DollarSign className="w-6 h-6 mx-auto text-success mb-1" />
          <p className="font-bold text-lg text-success">₹{totalEarned.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Earned</p>
        </div>
        <div className="bg-gradient-to-br from-warning/10 to-warning/5 rounded-2xl border border-warning/20 p-4 text-center">
          <AlertCircle className="w-6 h-6 mx-auto text-warning mb-1" />
          <p className="font-bold text-lg text-warning">₹{pendingPayment.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Pending Payment</p>
        </div>
        <div className="bg-gradient-to-br from-info/10 to-info/5 rounded-2xl border border-info/20 p-4 text-center">
          <Users className="w-6 h-6 mx-auto text-info mb-1" />
          <p className="font-bold text-lg text-info">{uniquePatients}</p>
          <p className="text-xs text-muted-foreground">Unique Patients</p>
        </div>
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4 text-center">
          <Activity className="w-6 h-6 mx-auto text-primary mb-1" />
          <p className="font-bold text-lg text-primary">{reviews.length}</p>
          <p className="text-xs text-muted-foreground">Reviews</p>
        </div>
      </div>

      {/* ── My Patients' Chronic Care Plans (Opt-in Doctor Visibility) ── */}
      <div className="bg-card rounded-2xl border border-teal-500/20 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <Heart className="w-5 h-5 text-teal-600" /> My Patients' Chronic Care Plans
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Consented home health records, 30-day medicine adherence scores, and recent home vitals readings.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-600 w-fit">
            {patientCarePlans.length} Consented Plans
          </span>
        </div>

        {patientCarePlans.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs">
            No consented patient care plans linked at this time. When your patients create a care plan and enable doctor sharing, their home health trends will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patientCarePlans.map((plan: any) => (
              <div key={plan._id} className="rounded-xl border border-border/70 p-4 bg-muted/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-sm text-foreground">
                        {plan.userId?.name || 'Patient'}
                      </p>
                      <p className="text-xs text-teal-600 font-semibold mt-0.5">
                        {plan.planName} ({plan.condition})
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      plan.adherenceScore == null
                        ? 'bg-muted text-muted-foreground'
                        : plan.adherenceScore >= 80 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {plan.adherenceScore == null ? 'No dose data' : `${plan.adherenceScore}% Adherence`}
                    </span>
                  </div>

                  {/* Latest vitals */}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {plan.latestVitals?.map((v: any, idx: number) => {
                      if (!v.reading) return null;
                      let str = '';
                      if (v.vitalType === 'bp') str = `BP: ${v.reading.values?.systolic}/${v.reading.values?.diastolic} mmHg`;
                      else if (v.vitalType === 'blood_sugar') str = `Sugar: ${v.reading.values?.sugarValue} mg/dL (${v.reading.values?.sugarContext || ''})`;
                      else if (v.vitalType === 'weight') str = `Weight: ${v.reading.values?.weightKg} kg`;
                      else if (v.vitalType === 'temperature') str = `Temp: ${v.reading.values?.tempValue}°${v.reading.values?.tempUnit || 'F'}`;
                      return (
                        <span key={idx} className="rounded-lg bg-card border px-2 py-1 font-medium text-foreground">
                          {str}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refund Section */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-destructive" /> Refunds
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-destructive font-medium">₹{totalRefunded.toLocaleString()} Total</span>
            <span className="text-warning font-medium">{pendingRefunds} Pending</span>
          </div>
        </div>
        {refunds.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <RotateCcw className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No refunds found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {refunds.slice(0, 5).map(rf => (
              <div key={rf._id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{rf.patient || rf.patientName || '—'}</p>
                    <p className="text-xs text-muted-foreground">{rf.reason || rf.description || 'Refund'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-destructive">₹{(rf.refund_amount || rf.amount || 0).toLocaleString()}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rf.status === 'Refunded' || rf.status === 'refunded' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                    {rf.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}