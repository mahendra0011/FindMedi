'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays, AlertCircle, CalendarClock, CheckCircle2, CheckCircle,
  Clock, User, Check, X, ChevronRight, Building2, MapPin, Video, Phone,
  MessageCircle, type LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDisplayDate } from '@/lib/dateUtils';

export interface PreConsultationDetails {
  appointmentMode?: string;
  mode?: string;
  symptoms?: string;
  [key: string]: unknown;
}

export interface AppointmentItem {
  _id: string;
  doctor?: string;
  patient?: string;
  date: string;
  time?: string;
  status: string;
  type?: string;
  appointmentMode?: string;
  fee?: number;
  department?: string;
  preConsultationDetails?: PreConsultationDetails;
  [key: string]: unknown;
}

interface ModeMeta {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

export function getAppointmentModeMeta(appt: AppointmentItem | null | undefined): ModeMeta {
  if (!appt) {
    return { key: 'hospital', label: 'In Hospital', icon: Building2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
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
    return { key: 'chat', label: 'Patient Chat', icon: MessageCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
  }
  return { key: 'hospital', label: 'In Hospital', icon: Building2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
}

const defaultStatusColor = { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' };
const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  Confirmed: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
  Pending: defaultStatusColor,
  Completed: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  Cancelled: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20' },
};

interface DoctorAppointmentsTabSectionProps {
  apptTab: 'pending' | 'upcoming' | 'today' | 'complete';
  setApptTab: (tab: 'pending' | 'upcoming' | 'today' | 'complete') => void;
  pendingAppts: AppointmentItem[];
  upcomingAppts: AppointmentItem[];
  todayAppts: AppointmentItem[];
  completedAppts: AppointmentItem[];
  todayStr: string;
  onQuickStatus: (id: string, status: string, e?: React.MouseEvent) => void;
}

export function DoctorAppointmentsTabSection({
  apptTab,
  setApptTab,
  pendingAppts,
  upcomingAppts,
  todayAppts,
  completedAppts,
  todayStr,
  onQuickStatus,
}: DoctorAppointmentsTabSectionProps) {
  const router = useRouter();

  return (
    <div className="lg:col-span-2">
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Appointments &amp; Patient Visits
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/doctor/appointments')}
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
                        onClick={(e) => onQuickStatus(apt._id, 'Confirmed', e)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 gap-1 rounded-lg shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept Request
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => onQuickStatus(apt._id, 'Cancelled', e)}
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
                const d1 = new Date(todayStr + 'T00:00:00');
                const d2 = new Date(apt.date + 'T00:00:00');
                const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
                const relativeBadge = diffDays === 1 ? 'Tomorrow' : diffDays > 1 && diffDays <= 7 ? `In ${diffDays} days` : formatDisplayDate(apt.date);

                return (
                  <motion.div
                    key={apt._id}
                    whileHover={{ x: 3 }}
                    className="flex items-center justify-between p-3.5 bg-muted/30 rounded-xl hover:bg-muted/50 transition-all border border-border/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-sm shrink-0">
                        <Icon className="w-4 h-4" />
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
                const colors = statusColors[apt.status] || defaultStatusColor;
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
                        <User className={`w-4 h-4 ${colors.text}`} />
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
                        <CheckCircle2 className="w-4 h-4" />
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
  );
}
