'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays, AlertCircle, CalendarClock, CheckCircle, CheckCircle2,
  Clock, User, X, ChevronRight, Building2, MapPin, Video, Phone,
  MessageCircle, type LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDisplayDate } from '@/lib/dateUtils';

interface ModeMeta {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

function getAppointmentModeMeta(appt: any): ModeMeta {
  if (!appt) return { key: 'clinic', label: 'In Clinic', icon: Building2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
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
  return { key: 'clinic', label: 'In Clinic', icon: Building2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
}

const statusColors: Record<string, string> = {
  Confirmed: 'bg-success/10 text-success',
  Pending: 'bg-warning/10 text-warning',
  Completed: 'bg-success/10 text-success',
  Cancelled: 'bg-destructive/10 text-destructive',
  Shipped: 'bg-info/10 text-info',
  Delivered: 'bg-success/10 text-success',
  Active: 'bg-info/10 text-info',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[status] || 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
}

interface HospitalAppointmentsSectionProps {
  apptTab: string;
  setApptTab: (tab: string) => void;
  pendingAppts: any[];
  upcomingAppts: any[];
  todayAppts: any[];
  completedAppts: any[];
  onAcceptAppt: (id: string) => void;
  onRejectAppt: (id: string) => void;
}

export function HospitalAppointmentsSection({
  apptTab,
  setApptTab,
  pendingAppts,
  upcomingAppts,
  todayAppts,
  completedAppts,
  onAcceptAppt,
  onRejectAppt,
}: HospitalAppointmentsSectionProps) {
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
            <h3 className="font-heading font-semibold text-foreground">Clinic Appointments</h3>
            <p className="text-xs text-muted-foreground">
              {apptTab === 'pending' && `${pendingAppts.length} pending approval`}
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
            <AlertCircle className="w-3.5 h-3.5" />
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
            <CheckCircle className="w-3.5 h-3.5" />
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
            {apptTab === 'pending' && 'No pending appointments to approve'}
            {apptTab === 'upcoming' && 'No upcoming appointments scheduled'}
            {apptTab === 'today' && 'No appointments scheduled for today'}
            {apptTab === 'complete' && 'No completed appointment history'}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Check clinic schedule or view appointment records
          </p>
          <Button size="sm" variant="outline" className="mt-4 rounded-xl" onClick={() => router.push('/clinic/appointments')}>
            View Full Schedule <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {list.slice(0, 5).map(a => {
            const mode = getAppointmentModeMeta(a);
            const ModeIcon = mode.icon;
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
                      <p className="text-sm font-semibold text-foreground">{a.patient}</p>
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
                        <span>{a.time}</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      <StatusBadge status={a.status} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {apptTab === 'pending' && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="text-xs h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        onClick={() => onAcceptAppt(a._id)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-8 text-destructive hover:bg-destructive/10 rounded-xl gap-1"
                        onClick={() => onRejectAppt(a._id)}
                      >
                        <X className="w-3.5 h-3.5" /> Reject
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
                          onClick={() => router.push('/clinic/home-visit')}
                        >
                          <MapPin className="w-3 h-3 mr-1" /> Route Map
                        </Button>
                      )}
                      {mode.key === 'video' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 rounded-xl border-cyan-500/30 text-cyan-600 hover:bg-cyan-500/10"
                          onClick={() => router.push('/clinic/video-calls')}
                        >
                          <Video className="w-3 h-3 mr-1" /> Video Room
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 rounded-xl"
                        onClick={() => router.push('/clinic/appointments')}
                      >
                        Details
                      </Button>
                    </div>
                  )}
                  {apptTab === 'today' && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">
                        Scheduled
                      </span>
                      <Button
                        size="sm"
                        className="text-xs h-8 rounded-xl bg-primary text-primary-foreground"
                        onClick={() => router.push('/clinic/appointments')}
                      >
                        Start Visit
                      </Button>
                    </div>
                  )}
                  {apptTab === 'complete' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 rounded-xl text-primary border-primary/20 hover:bg-primary/5"
                      onClick={() => router.push('/clinic/prescriptions')}
                    >
                      View Rx
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
