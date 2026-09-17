'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, Clock, CalendarDays, CheckCircle2, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Appointment } from '@/types/models/appointment';

export type ApptTabType = 'pending' | 'upcoming' | 'today' | 'completed';

interface HospitalAppointmentsHubProps {
  appointments: Appointment[];
  apptTab: ApptTabType;
  setApptTab: (tab: ApptTabType) => void;
  pendingAppts: Appointment[];
  upcomingAppts: Appointment[];
  todayAppts: Appointment[];
  completedAppts: Appointment[];
}

export default function HospitalAppointmentsHub({
  appointments,
  apptTab,
  setApptTab,
  pendingAppts,
  upcomingAppts,
  todayAppts,
  completedAppts,
}: HospitalAppointmentsHubProps) {
  const displayedAppts =
    apptTab === 'pending'
      ? pendingAppts
      : apptTab === 'upcoming'
      ? upcomingAppts
      : apptTab === 'today'
      ? todayAppts
      : completedAppts;

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-heading font-semibold text-lg text-foreground">Hospital Appointments Hub</h2>
          <p className="text-xs text-muted-foreground">Cross-departmental schedule & queue</p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-2xl border border-border/50 overflow-x-auto">
          <button
            type="button"
            onClick={() => setApptTab('pending')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              apptTab === 'pending'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Pending</span>
            {pendingAppts.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  apptTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-600'
                }`}
              >
                {pendingAppts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setApptTab('upcoming')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              apptTab === 'upcoming'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Upcoming</span>
            {upcomingAppts.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  apptTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
                }`}
              >
                {upcomingAppts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setApptTab('today')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              apptTab === 'today'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Today</span>
            {todayAppts.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  apptTab === 'today' ? 'bg-white/20 text-white' : 'bg-emerald-600/20 text-emerald-600'
                }`}
              >
                {todayAppts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setApptTab('completed')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              apptTab === 'completed'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
          </button>
        </div>
      </div>

      {displayedAppts.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No {apptTab} appointments found</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayedAppts.slice(0, 5).map((a, idx) => {
            const patientLabel =
              typeof a.patientId === 'object' && a.patientId
                ? a.patientId.name
                : typeof a.patient === 'string'
                ? a.patient
                : 'Patient';
            const doctorLabel =
              typeof a.doctor === 'object' && a.doctor
                ? a.doctor.name
                : typeof a.doctor === 'string'
                ? a.doctor
                : 'Assigned Specialist';
            const timeLabel = a.time || '10:00 AM';
            return (
              <div
                key={a._id || idx}
                className="flex items-center justify-between p-3.5 bg-muted/20 hover:bg-muted/40 rounded-xl transition-colors border border-border/40"
              >
                <div>
                  <p className="font-semibold text-foreground text-sm">{patientLabel}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dr. {doctorLabel} • {a.department || 'General OPD'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {timeLabel}
                  </span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {a.status || 'Confirmed'}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border/50 flex justify-end">
        <Link href="/appointments" className="text-xs text-primary hover:underline flex items-center gap-1">
          Open All Appointments <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
