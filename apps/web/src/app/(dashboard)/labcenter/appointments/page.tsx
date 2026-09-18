/**
 * Appointment / Visit Management — ported from client/src/pages/labcenter/LabAppointments.jsx (Phase 4).
 * Imaging and visit scheduling with complete/cancel actions.
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { CalendarDays, Clock, CheckCircle, XCircle, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { lab } from '@/lib/api';
import { getISTDateString } from '@/lib/dateUtils';

const statusColors: Record<string, string> = {
  Scheduled: 'bg-info/10 text-info',
  Completed: 'bg-success/10 text-success',
  Cancelled: 'bg-destructive/10 text-destructive',
};

const fallbackStatus = 'bg-info/10 text-info';

interface LabAppointment {
  _id: string;
  patient: string;
  modality?: string;
  date?: string;
  time?: string;
  status: string;
  notes?: string;
}

const defaultAppts: LabAppointment[] = [
  { _id: 'a1', patient: 'Ravi Kumar', modality: 'MRI Brain', date: getISTDateString(), time: '09:00 AM', status: 'Scheduled', notes: 'Contrast required' },
  { _id: 'a2', patient: 'Priya Sharma', modality: 'CT Abdomen', date: getISTDateString(), time: '11:00 AM', status: 'Completed', notes: '' },
  { _id: 'a3', patient: 'Amit Patel', modality: 'X-Ray Chest', date: getISTDateString(), time: '02:00 PM', status: 'Scheduled', notes: '' },
  { _id: 'a4', patient: 'Sneha Reddy', modality: 'Ultrasound Abdomen', date: getISTDateString(), time: '03:30 PM', status: 'Scheduled', notes: 'Fasting 6 hrs' },
  { _id: 'a5', patient: 'Vikram Singh', modality: 'ECG', date: getISTDateString(new Date(Date.now() + 86400000)), time: '10:00 AM', status: 'Scheduled', notes: '' },
];

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const { data: appointmentsData, isLoading: loading } = useQuery({
    queryKey: ['lab-appointments'],
    queryFn: async (): Promise<LabAppointment[]> => {
      try {
        const res = await lab.getBookings({});
        const arr = (Array.isArray(res) ? res : []) as unknown as LabAppointment[];
        return arr.length > 0 ? arr : defaultAppts;
      } catch {
        return defaultAppts;
      }
    },
    staleTime: 15_000,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => lab.updateBooking(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-appointments'] }),
  });

  const appts = appointmentsData ?? [];

  const handleStatus = (id: string, status: string) => {
    statusMut.mutate({ id, status });
  };

  const filtered = appts.filter((a) => {
    const ms = !search || a.patient.toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'All' || a.status === filter;
    return ms && mf;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Appointment / Visit Management</h1>
        <p className="text-muted-foreground">Imaging scan & visit scheduling</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{appts.length}</p>
          <p className="text-xs text-muted-foreground">Total Appointments</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-info">{appts.filter((a) => a.status === 'Scheduled').length}</p>
          <p className="text-xs text-muted-foreground">Scheduled</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-success">{appts.filter((a) => a.status === 'Completed').length}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{new Set(appts.map((a) => a.modality)).size}</p>
          <p className="text-xs text-muted-foreground">Modalities</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          {['All', 'Scheduled', 'Completed', 'Cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <CalendarDays className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No appointments found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((a, i) => (
            <motion.div
              key={a._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{a.patient}</h3>
                  <Badge variant="secondary" className="mt-1">
                    {a.modality}
                  </Badge>
                </div>
                <Badge className={statusColors[a.status] ?? fallbackStatus}>{a.status}</Badge>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>{a.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{a.time}</span>
                </div>
              </div>
              {a.notes && <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2 mb-3">{a.notes}</p>}
              <div className="flex gap-2">
                {a.status === 'Scheduled' && (
                  <>
                    <Button size="sm" className="flex-1 gap-1" onClick={() => handleStatus(a._id, 'Completed')}>
                      <CheckCircle className="w-3.5 h-3.5" /> Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1 text-destructive"
                      onClick={() => handleStatus(a._id, 'Cancelled')}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancel
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
