'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays, Clock, CalendarClock, CheckCircle2, User, Building2,
  MapPin, Video, Phone, MessageCircle, X, type LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDisplayDate } from '@/lib/dateUtils';

export interface DisplayAppointment {
  _id: string;
  doctor?: string;
  doctorId?: string | { name?: string; _id?: string };
  doctorName?: string;
  patient?: string;
  patientName?: string;
  date: string;
  time?: string;
  timeSlot?: string;
  status: string;
  appointmentMode?: string;
  type?: string;
  preConsultationDetails?: {
    appointmentMode?: string;
    mode?: string;
  };
}

interface ModeMeta {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

function getAppointmentModeMeta(appt: DisplayAppointment | null | undefined): ModeMeta {
  if (!appt) {
    return { key: 'hospital', label: 'In Clinic / Hospital', icon: Building2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
  }
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
    return { key: 'chat', label: 'Doctor Chat', icon: MessageCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
  }
  return { key: 'hospital', label: 'In Clinic / Hospital', icon: Building2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
}

const colors: Record<string, string> = {
  Confirmed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Cancelled: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[status] || 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
}

interface PatientAppointmentsSectionProps {
  apptTab: 'pending' | 'upcoming' | 'today' | 'complete';
  setApptTab: (tab: 'pending' | 'upcoming' | 'today' | 'complete') => void;
  pendingAppts: DisplayAppointment[];
  upcomingAppts: DisplayAppointment[];
  todayAppts: DisplayAppointment[];
  completedAppts: DisplayAppointment[];
  onCancelTarget: (id: string) => void;
}

export function PatientAppointmentsSection({
  apptTab,
  setApptTab,
  pendingAppts,
  upcomingAppts,
  todayAppts,
  completedAppts,
  onCancelTarget,
}: PatientAppointmentsSectionProps) {
  const router = useRouter();

  const list =
    apptTab === 'pending'
      ? pendingAppts
      : apptTab === 'upcoming'
      ? upcomingAppts
      : apptTab === 'today'
      ? todayAppts
      : completedAppts;

  return (
    <div className="lg:col-span-2 bg-card rounded-3xl border border-border/50 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground">My Appointments</h3>
            <p className="text-xs text-muted-foreground">
              {apptTab === 'pending' && `${pendingAppts.length} pending confirmation`}
              {apptTab === 'upcoming' && `${upcomingAppts.length} upcoming scheduled`}
              {apptTab === 'today' && `${todayAppts.length} booked for today`}
              {apptTab === 'complete' && `${completedAppts.length} completed visits`}
            </p>
          </div>
        </div>

        {/* 4 Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-2xl border border-border/40 overflow-x-auto">
          <button
            onClick={() => setApptTab('pending')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              apptTab === 'pending'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
            {pendingAppts.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${apptTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-600'}`}>
                {pendingAppts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setApptTab('upcoming')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              apptTab === 'upcoming'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Upcoming</span>
            {upcomingAppts.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${apptTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
                {upcomingAppts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setApptTab('today')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              apptTab === 'today'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Today</span>
            {todayAppts.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${apptTab === 'today' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600'}`}>
                {todayAppts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setApptTab('complete')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              apptTab === 'complete'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Complete</span>
            {completedAppts.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${apptTab === 'complete' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-600'}`}>
                {completedAppts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="w-7 h-7 text-muted-foreground/30" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            {apptTab === 'pending' && 'No pending appointments'}
            {apptTab === 'upcoming' && 'No upcoming appointments scheduled'}
            {apptTab === 'today' && 'No appointments scheduled for today'}
            {apptTab === 'complete' && 'No completed appointment history'}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Book an in-clinic, home visit, video or call appointment
          </p>
          <Button size="sm" className="mt-4 rounded-xl shadow-lg shadow-primary/20" onClick={() => router.push('/doctors')}>
            <Building2 className="w-3.5 h-3.5 mr-1.5" /> Book Appointment
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {list.slice(0, 5).map(a => {
            const mode = getAppointmentModeMeta(a);
            const ModeIcon = mode.icon;
            const docName =
              a.doctor ||
              a.doctorName ||
              (typeof a.doctorId === 'object' ? a.doctorId?.name : a.doctorId) ||
              'Doctor';
            return (
              <div
                key={a._id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-muted/20 rounded-2xl border border-border/30 hover:bg-muted/40 hover:border-primary/20 transition-all duration-200 gap-3"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                    <User className="w-5.5 h-5.5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{docName}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${mode.bg} ${mode.color}`}>
                        <ModeIcon className="w-3 h-3" /> {mode.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-1 flex-wrap">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        <span>{formatDisplayDate(a.date)}</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{a.time || a.timeSlot || 'Scheduled'}</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      <StatusBadge status={a.status} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {apptTab === 'pending' && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                        Awaiting Approval
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={() => onCancelTarget(a._id)}
                      >
                        <X className="w-3 h-3 mr-1" /> Cancel
                      </Button>
                    </div>
                  )}
                  {apptTab === 'upcoming' && (
                    <div className="flex items-center gap-2">
                      {mode.key === 'home' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 rounded-xl border-violet-500/30 text-violet-600 hover:bg-violet-500/10"
                          onClick={() => router.push('/patient/home-visit')}
                        >
                          <MapPin className="w-3 h-3 mr-1" /> Track Route
                        </Button>
                      )}
                      {mode.key === 'video' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 rounded-xl border-cyan-500/30 text-cyan-600 hover:bg-cyan-500/10"
                          onClick={() => router.push('/patient/video-calls')}
                        >
                          <Video className="w-3 h-3 mr-1" /> Join Room
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={() => onCancelTarget(a._id)}
                      >
                        <X className="w-3 h-3 mr-1" /> Cancel
                      </Button>
                    </div>
                  )}
                  {apptTab === 'today' && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">
                        Active Today
                      </span>
                      {mode.key === 'video' && (
                        <Button
                          size="sm"
                          className="text-xs h-8 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white"
                          onClick={() => router.push('/patient/video-calls')}
                        >
                          <Video className="w-3 h-3 mr-1" /> Start Video
                        </Button>
                      )}
                      {mode.key === 'home' && (
                        <Button
                          size="sm"
                          className="text-xs h-8 rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
                          onClick={() => router.push('/patient/home-visit')}
                        >
                          <MapPin className="w-3 h-3 mr-1" /> Live Map
                        </Button>
                      )}
                    </div>
                  )}
                  {apptTab === 'complete' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 rounded-xl text-primary border-primary/20 hover:bg-primary/5"
                      onClick={() => router.push('/doctors')}
                    >
                      Book Again
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
