import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, Clock, User, CheckCircle, AlertCircle, Star, DollarSign,
  Stethoscope, Activity, Users, FlaskConical, RotateCcw,
  MapPin, Globe, Phone, Video, MessageCircle, ChevronRight, Car, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useAppointmentRealtime } from '@/lib/useAppointmentRealtime';
import LicenseExpiryReminder from '@/components/LicenseExpiryReminder';
import EarningsAnalytics from '@/components/EarningsAnalytics';
import { getISTDateString } from '@/lib/dateUtils';

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
  const [loading, setLoading] = useState(true);
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
      const docName = user?.name?.toLowerCase();
      const appts = a?.data || a || [];
      const myAppointments = appts?.filter(apt => 
        apt.doctor?.toLowerCase() === docName
      ) || [];
      setAppointments(myAppointments);
      setReviews(r?.filter(rv => rv.doctorName === user?.name) || []);
      
      const billsArray = b?.data || b?.bills || b || [];
      const myBills = billsArray?.filter(bill => 
        bill.doctor?.toLowerCase() === docName
      ) || [];
      setBills(myBills);

      const allRecords = records?.data || records?.records || records || [];
      const myLabReports = allRecords
        .filter(rec => rec.type === 'lab_report')
        .slice(-10)
        .reverse();
      setLabReports(myLabReports);

      const refundArray = rf?.payments || rf?.data || rf || [];
      const myRefunds = refundArray.filter(rf =>
        rf.doctor?.toLowerCase() === docName ||
        rf.patient?.toLowerCase().includes(docName)
      ) || [];
      setRefunds(myRefunds);

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
  }, [user?.name]);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => { mounted.current = false; };
  }, [load]);

  // Realtime — naya booking/status change turant dikhein
  useAppointmentRealtime(load);

  const today = getISTDateString();
  const todayAppts = appointments.filter(a => a.date === today);
  const pendingAppts = appointments.filter(a => a.status === 'Pending');
  const completedAppts = appointments.filter(a => a.status === 'Completed');
  const todayInPersonAppts = todayAppts.filter(a => isInPersonAppointment(a) && a.status !== 'Completed' && a.status !== 'Cancelled');
  const todayOnlineAppts = todayAppts.filter(a => !isInPersonAppointment(a) && a.status !== 'Completed' && a.status !== 'Cancelled');
  const uniquePatients = new Set(appointments.map(a => a.patient?.toLowerCase())).size;
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1) : '0.0';
  
  // Earnings
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
        <p className="opacity-90">Here's your practice overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{todayAppts.length}</p>
          <p className="text-sm text-muted-foreground">Today's Appointments</p>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-warning" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{pendingAppts.length}</p>
          <p className="text-sm text-muted-foreground">Pending</p>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{completedAppts.length}</p>
          <p className="text-sm text-muted-foreground">Completed</p>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-warning" />
            </div>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">₹{totalEarned.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Total Earned</p>
        </motion.div>
      </div>

      {/* Consultation & Patient Visits Hub (Home Visits Live Map, Online Queue, Audio/Video Suite, Chat) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-lg text-foreground">
                  Consultation & Live Patient Tracking Hub
                </h3>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                  Hospital Doctor Suite
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage your confirmed home visits with live GPS map tracking, online appointments, and real-time communications.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* 1. Home Visits with Live Map */}
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
              <span>{todayInPersonAppts.length} active today</span>
              <span className="flex items-center gap-0.5">Track Map <ChevronRight className="w-3.5 h-3.5" /></span>
            </div>
          </div>

          {/* 2. Online Appointments */}
          <div
            onClick={() => navigate('/doctor/online-appointments')}
            className="group relative rounded-2xl border border-border/60 bg-card p-4 hover:border-primary hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Globe className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Telehealth
                </span>
              </div>
              <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                Online Visits
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Scheduled chat & video consultations queue with patient intake summaries.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-primary">
              <span>{todayOnlineAppts.length} active today</span>
              <span className="flex items-center gap-0.5">Open Queue <ChevronRight className="w-3.5 h-3.5" /></span>
            </div>
          </div>

          {/* 3. Patient Chat */}
          <div
            onClick={() => navigate('/doctor/chat')}
            className="group relative rounded-2xl border border-border/60 bg-card p-4 hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                  Instant
                </span>
              </div>
              <h4 className="font-heading font-bold text-foreground text-sm group-hover:text-blue-600 transition-colors">
                Patient Chat
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Encrypted text chat, symptom discussions, and medical report sharing.
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-blue-600">
              <span>Direct Messages</span>
              <span className="flex items-center gap-0.5">Chat <ChevronRight className="w-3.5 h-3.5" /></span>
            </div>
          </div>

          {/* 4. Audio Calls */}
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
              <span>Noise Canceling</span>
              <span className="flex items-center gap-0.5">Dial <ChevronRight className="w-3.5 h-3.5" /></span>
            </div>
          </div>

          {/* 5. Video Calls */}
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
              <span>Full HD</span>
              <span className="flex items-center gap-0.5">Start <ChevronRight className="w-3.5 h-3.5" /></span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Earnings Analytics */}
      <EarningsAnalytics bills={bills} title="Earnings Analytics" />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Appointments */}
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Today's Schedule
            </h2>
            <span className="text-xs text-muted-foreground">{today}</span>
          </div>
          
          {todayAppts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No appointments today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppts.slice(0, 5).map(apt => {
                const colors = statusColors[apt.status] || statusColors.Pending;
                return (
                  <motion.div 
                    key={apt._id} 
                    whileHover={{ x: 4 }}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                        <User className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{apt.patient}</p>
                        <p className="text-xs text-muted-foreground">{apt.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />{apt.time}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
                        {apt.status}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
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