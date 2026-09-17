/**
 * Booking Management — ported from client/src/pages/labcenter/LabBookingManagement.jsx (Phase 4).
 * Accept/reject bookings and assign collection slots.
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Search,
  ChevronDown,
  ChevronRight,
  Phone,
  Mail,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { lab } from '@/lib/api';

const statusColors: Record<string, string> = {
  Pending: 'bg-warning/10 text-warning',
  Confirmed: 'bg-success/10 text-success',
  Completed: 'bg-primary/10 text-primary',
  Cancelled: 'bg-destructive/10 text-destructive',
};

const filters = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];

const timeSlots = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM',
];

interface LabBooking {
  _id: string;
  patient?: string;
  date?: string;
  time?: string;
  type?: string;
  status?: string;
  phone?: string;
  email?: string;
  tests?: string[];
}

const onError = () => toast.error('Failed to update booking');

export default function BookingsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: bookingsData, isLoading: loading } = useQuery({
    queryKey: ['labcenter-bookings'],
    queryFn: async (): Promise<LabBooking[]> => {
      const res = await lab.getBookings({});
      const arr = (Array.isArray(res) ? res : []) as unknown as LabBooking[];
      return arr;
    },
    staleTime: 15_000,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status, slot }: { id: string; status: string; slot?: string }) =>
      lab.updateBooking(id, { status, ...(slot ? { timeSlot: slot } : {}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labcenter-bookings'] }),
    onError,
  });

  const bookings = bookingsData ?? [];
  const filtered = bookings.filter((b) => {
    const ms = !search || (b.patient ?? '').toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'All' || b.status === filter;
    return ms && mf;
  });

  const handleStatus = (id: string, status: string, slot?: string) => {
    statusMut.mutate(
      { id, status, ...(slot ? { slot } : {}) },
      { onSuccess: () => toast.success(`Booking ${status}`) },
    );
  };

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
        <h1 className="text-2xl font-bold text-foreground">Booking Management</h1>
        <p className="text-muted-foreground">{filtered.length} bookings</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {filters.map((f) => (
          <div
            key={f}
            className="bg-card rounded-xl border border-border/60 p-3 text-center cursor-pointer"
            onClick={() => setFilter(f)}
          >
            <p className={`text-2xl font-bold ${filter === f ? 'text-primary' : 'text-foreground'}`}>
              {f === 'All' ? bookings.length : bookings.filter((b) => b.status === f).length}
            </p>
            <p className="text-xs text-muted-foreground">{f}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by patient name..." className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <CalendarDays className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No bookings found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b, i) => {
            const colors = statusColors[b.status ?? ''] ?? statusColors.Pending ?? '';
            const isExpanded = expanded === b._id;
            return (
              <motion.div
                key={b._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-2xl border border-border/60 overflow-hidden"
              >
                <div onClick={() => setExpanded(isExpanded ? null : b._id)} className="p-5 cursor-pointer hover:bg-muted/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{b.patient}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {b.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {b.time}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {b.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={colors}>{b.status}</Badge>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="border-t border-border/60 bg-muted/20 p-5 space-y-4 overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" /> {b.phone}
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground" /> {b.email}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Selected Tests ({b.tests?.length ?? 0})</p>
                        <div className="flex flex-wrap gap-1.5">
                          {b.tests?.map((t, j) => (
                            <Badge key={j} variant="secondary">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {b.status === 'Pending' && (
                        <div className="flex gap-2 pt-2 border-t border-border/40">
                          <Button size="sm" className="flex-1 gap-1" onClick={() => handleStatus(b._id, 'Confirmed')}>
                            <CheckCircle className="w-4 h-4" /> Accept
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 gap-1 text-destructive" onClick={() => handleStatus(b._id, 'Cancelled')}>
                            <XCircle className="w-4 h-4" /> Reject
                          </Button>
                        </div>
                      )}
                      {b.status === 'Confirmed' && (
                        <div className="pt-2 border-t border-border/40">
                          <p className="text-xs text-muted-foreground mb-2">Assign Time Slot</p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                            {timeSlots.map((s) => (
                              <button
                                key={s}
                                onClick={() => handleStatus(b._id, 'Completed', s)}
                                className="px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
