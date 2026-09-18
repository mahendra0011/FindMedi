/**
 * Schedule Manage — ported from client/src/pages/admin/AdminScheduleManage.jsx
 */
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Search, Clock, CalendarClock, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { doctors as doctorsApi, scheduleChangeRequests } from '@/lib/api';

interface DoctorRow {
  _id: string;
  name: string;
  specialization?: string;
  available?: boolean;
  slotDuration?: number;
  workingHours?: { start: string; end: string };
  time_slots?: unknown[];
  bookingWindow?: { value: number; unit: string };
  experience?: string;
  profile_photo?: string;
  initials?: string;
}

export default function ScheduleManagePage() {
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorRow | null>(null);

  const { data: doctorsData, isLoading: loading } = useQuery({
    queryKey: ['schedule-manage-doctors', search],
    queryFn: async (): Promise<DoctorRow[]> => {
      const res = await doctorsApi.get({ search, includeAll: 'true' } as unknown as Record<string, string>);
      const arr = (res as unknown as { data?: unknown[] })?.data ?? res;
      return (Array.isArray(arr) ? arr : []) as DoctorRow[];
    },
  });

  const { data: pendingData } = useQuery({
    queryKey: ['pending-schedule-requests'],
    queryFn: async (): Promise<Record<string, unknown>[]> => {
      const res = await scheduleChangeRequests.getPending();
      return (Array.isArray(res) ? res : []) as unknown as Record<string, unknown>[];
    },
  });

  const pendingRequests: Record<string, unknown> = {};
  (pendingData ?? []).forEach((r) => {
    const rec = r as { doctorId?: { _id: string } | string; _id: string };
    const docId = typeof rec.doctorId === 'object' && rec.doctorId ? rec.doctorId._id : rec.doctorId;
    if (docId) pendingRequests[String(docId)] = r;
  });

  const doctors = doctorsData ?? [];
  const specs = ['All', ...Array.from(new Set(doctors.map((d) => d.specialization).filter(Boolean) as string[]))];
  const filtered = specialization === 'All' ? doctors : doctors.filter((d) => d.specialization === specialization);

  if (selectedDoctor) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedDoctor(null)} className="text-sm text-primary hover:underline">
          ← Back to doctors
        </button>
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <h2 className="text-lg font-bold">Edit Schedule — {selectedDoctor.name}</h2>
          <p className="text-sm text-muted-foreground mt-2">Schedule editor (reuse ClinicSchedule in admin mode) — doctorId: {selectedDoctor._id}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-muted/30 rounded-xl">Slot Duration: {selectedDoctor.slotDuration ?? 15} min</div>
            <div className="p-3 bg-muted/30 rounded-xl">
              Working Hours: {selectedDoctor.workingHours ? `${selectedDoctor.workingHours.start} — ${selectedDoctor.workingHours.end}` : '9 — 5'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manage Doctor Schedules</h1>
        <p className="text-muted-foreground">Click any doctor to edit their working hours, time slots, breaks & booking rules</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search doctor name or specialization..." className="pl-10" />
        </div>
        <select
          value={specialization}
          onChange={(e) => setSpecialization(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm sm:min-w-[200px]"
        >
          {specs.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarClock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p>No doctors found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc, i) => {
            const hasPending = !!pendingRequests[String(doc._id)];
            return (
              <motion.button
                key={doc._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedDoctor(doc)}
                className={`text-left bg-card rounded-2xl border p-5 hover:shadow-lg transition-all cursor-pointer group ${hasPending ? 'border-amber-400/60 hover:border-amber-400' : 'border-border/60 hover:border-primary/40'}`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0 overflow-hidden">
                    {doc.profile_photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={doc.profile_photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      doc.initials || doc.name?.split(' ').map((n) => n[0]).join('').slice(0, 2)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground truncate">{doc.name}</h3>
                    <p className="text-sm text-primary font-medium">{doc.specialization}</p>
                  </div>
                  <Badge variant={doc.available ? 'default' : 'secondary'} className="text-[10px]">
                    {doc.available ? 'Available' : 'Off'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground text-[10px]">Slot Duration</p>
                    <p className="font-semibold text-foreground">{doc.slotDuration || 15} min</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground text-[10px]">Working Hours</p>
                    <p className="font-semibold text-foreground">{doc.workingHours ? `${doc.workingHours.start} — ${doc.workingHours.end}` : '9 — 5'}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground text-[10px]">Total Slots</p>
                    <p className="font-semibold text-foreground">{doc.time_slots?.length || 0}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground text-[10px]">Booking Window</p>
                    <p className="font-semibold text-foreground">{doc.bookingWindow ? `${doc.bookingWindow.value} ${doc.bookingWindow.unit}` : '2 weeks'}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {doc.experience || 'N/A'}
                  </span>
                  {hasPending ? (
                    <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Review Request
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-primary group-hover:underline flex items-center gap-1">Edit Schedule</span>
                  )}
                </div>

                {hasPending && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 truncate">Request for Change — click to review</span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
