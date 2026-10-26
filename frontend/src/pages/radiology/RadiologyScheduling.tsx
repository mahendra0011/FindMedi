import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar, CalendarDays, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock,
  Ban, MapPin, RefreshCw, UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { radApi } from '@/lib/api';
import {
  Modal, Field, StatusBadge, ModalityBadge, errMessage, inputCls, selectCls, textareaCls,
  toDateInput, toDateTimeLocal, dayStart, dayEnd, patientNameOf, RAD_MODALITY_TYPES,
} from '@/components/radiology/radShared';

const ACTIVE_APPT = ['Booked', 'Confirmed', 'Arrived', 'Rescheduled'];

function weekDays(base: Date): Date[] {
  const d = new Date(base);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  const out: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    out.push(x);
  }
  return out;
}

export default function RadiologyScheduling() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [view, setView] = useState<'day' | 'week'>('day');
  const [date, setDate] = useState(toDateInput(new Date()));
  const [typeFilter, setTypeFilter] = useState('All');
  const [machineFilter, setMachineFilter] = useState('');
  const [showBook, setShowBook] = useState(false);
  const [resched, setResched] = useState<any>(null);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [book, setBook] = useState<any>({
    radiologyOrderId: '', patientId: '', modalityType: 'X-Ray', machineId: '',
    scheduledStart: '', slotMinutes: 30, slotType: 'Regular', notes: '',
  });
  const [reschedAt, setReschedAt] = useState('');

  const range = useMemo(() => {
    const d = new Date(date + 'T00:00:00');
    if (view === 'week') {
      const days = weekDays(d);
      return { from: days[0], to: dayEnd(days[6]) };
    }
    return { from: dayStart(d), to: dayEnd(d) };
  }, [date, view]);

  const apptsQ = useQuery({
    queryKey: ['radiology', 'appointments', date, view, typeFilter],
    queryFn: () => radApi.getAppointments({
      from: range.from.toISOString(), to: (range.to as Date).toISOString(),
      ...(typeFilter !== 'All' ? { modalityType: typeFilter } : {}),
    }),
  });
  const ordersQ = useQuery({ queryKey: ['radiology', 'orders', 'schedulable'], queryFn: () => radApi.getOrders({ status: 'Scheduling Pending' }) });
  const allOrdersQ = useQuery({ queryKey: ['radiology', 'orders', 'patients'], queryFn: () => radApi.getOrders({}) });
  const modsQ = useQuery({ queryKey: ['radiology', 'modalities'], queryFn: () => radApi.getModalities() });

  const appointments: any[] = apptsQ.data?.appointments || [];
  const schedulableOrders: any[] = ordersQ.data?.orders || [];
  const allOrders: any[] = allOrdersQ.data?.orders || [];
  const machines: any[] = (modsQ.data?.modalities || []).filter((m: any) => m.status !== 'Inactive');

  const availQueryKey = book.machineId ? `${book.machineId}|${date}` : `${typeFilter}|${date}`;
  const availQ = useQuery({
    queryKey: ['radiology', 'availability', availQueryKey],
    queryFn: () => radApi.getAvailability({
      date,
      ...(typeFilter !== 'All' ? { modalityType: typeFilter } : {}),
      ...(book.machineId ? { machineId: book.machineId } : {}),
    }),
    enabled: Boolean(date),
  });
  const availability: any[] = availQ.data?.machines || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['radiology'] });
  };

  const bookMut = useMutation({
    mutationFn: (b: any) => radApi.createAppointment(b),
    onSuccess: () => { toast.success('Appointment booked'); invalidate(); setShowBook(false); },
    onError: (e: any) => {
      const data = e?.response?.data;
      if (e?.response?.status === 409) {
        const c = data?.conflict;
        toast.error('Double booking blocked', {
          description: `${data?.message || 'Machine already booked'}${c ? ` (${c.appointmentNo || ''} ${toDateTimeLocal(c.scheduledStart)} - ${toDateTimeLocal(c.scheduledEnd)})` : ''}`,
        });
      } else {
        toast.error(errMessage(e, 'Failed to book appointment'));
      }
    },
  });
  const reschedMut = useMutation({
    mutationFn: ({ id, ...b }: any) => radApi.updateAppointment(id, b),
    onSuccess: () => { toast.success('Appointment rescheduled'); invalidate(); setResched(null); },
    onError: (e: any) => {
      if (e?.response?.status === 409) toast.error('Slot conflict', { description: errMessage(e) });
      else toast.error(errMessage(e, 'Reschedule failed'));
    },
  });
  const cancelMut = useMutation({
    mutationFn: ({ id, ...b }: any) => radApi.updateAppointment(id, b),
    onSuccess: () => { toast.success('Appointment cancelled'); invalidate(); setCancelTarget(null); setCancelReason(''); },
    onError: (e: any) => toast.error(errMessage(e, 'Cancel failed')),
  });
  const checkinMut = useMutation({
    mutationFn: (id: string) => radApi.checkinAppointment(id),
    onSuccess: () => { toast.success('Patient checked in'); invalidate(); },
    onError: (e: any) => toast.error(errMessage(e, 'Check-in failed')),
  });

  const onBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      patientId: book.patientId,
      modalityType: book.modalityType,
      scheduledStart: new Date(book.scheduledStart).toISOString(),
      slotMinutes: Number(book.slotMinutes) || 30,
      slotType: book.slotType,
      notes: book.notes,
    };
    if (book.radiologyOrderId) payload.radiologyOrderId = book.radiologyOrderId;
    if (book.machineId) payload.machineId = book.machineId;
    bookMut.mutate(payload);
  };

  const pickOrder = (orderId: string) => {
    const o = allOrders.find((x: any) => String(x._id) === orderId);
    if (!o) { setBook((b: any) => ({ ...b, radiologyOrderId: '', patientId: '' })); return; }
    setBook((b: any) => ({
      ...b,
      radiologyOrderId: String(o._id),
      patientId: o.patientId?._id || o.patientId || '',
      modalityType: o.modality || b.modalityType,
    }));
  };

  const pickMachine = (machineId: string) => {
    const m = machines.find((x: any) => String(x._id) === machineId);
    setBook((b: any) => ({
      ...b,
      machineId,
      slotMinutes: m?.slotDurationMinutes || b.slotMinutes,
      modalityType: m?.modalityType || b.modalityType,
    }));
  };

  const shiftDay = (delta: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setDate(toDateInput(d));
  };

  const filteredAppts = appointments.filter((a: any) => !machineFilter || String(a.machineId?._id || a.machineId) === machineFilter);

  const dayCols = view === 'week' ? weekDays(new Date(date + 'T00:00:00')) : [new Date(date + 'T00:00:00')];

  const apptsForDay = (d: Date) => filteredAppts.filter((a: any) => {
    const s = new Date(a.scheduledStart);
    return s.getFullYear() === d.getFullYear() && s.getMonth() === d.getMonth() && s.getDate() === d.getDate();
  });

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Imaging Scheduling Calendar</h1>
          <p className="page-subtitle">{filteredAppts.length} appointments in view</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => nav('/radiology/preparation')}>Preparation Queue</Button>
          <Button onClick={() => {
            setBook((b: any) => ({ ...b, scheduledStart: `${date}T09:00`, slotType: 'Regular' }));
            setShowBook(true);
          }}>
            <CalendarPlus className="w-4 h-4 mr-1" /> Book Appointment
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border overflow-hidden">
          {(['day', 'week'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 h-9 text-sm font-medium capitalize ${view === v ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}>
              {v === 'day' ? <CalendarDays className="w-3.5 h-3.5 inline mr-1" /> : <Calendar className="w-3.5 h-3.5 inline mr-1" />}{v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => shiftDay(view === 'week' ? -7 : -1)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
          <Input type="date" value={date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)} className="h-9 w-40" />
          <button onClick={() => shiftDay(view === 'week' ? 7 : 1)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border hover:bg-muted"><ChevronRight className="w-4 h-4" /></button>
          <Button variant="ghost" size="sm" onClick={() => setDate(toDateInput(new Date()))}>Today</Button>
        </div>
        <select value={typeFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setTypeFilter(e.target.value); setMachineFilter(''); }} className={selectCls + ' w-auto'}>
          <option value="All">All Modalities</option>
          {RAD_MODALITY_TYPES.map((m: string) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={machineFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMachineFilter(e.target.value)} className={selectCls + ' w-auto'}>
          <option value="">All Machines</option>
          {machines.filter((m: any) => typeFilter === 'All' || m.modalityType === typeFilter).map((m: any) => (
            <option key={m._id} value={m._id}>{m.name} ({m.code})</option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={() => { setBook((b: any) => ({ ...b, slotType: 'Maintenance Block', scheduledStart: `${date}T13:00` })); setShowBook(true); }}>
          <Ban className="w-3.5 h-3.5 mr-1" /> Block Slot
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-heading font-semibold">{view === 'week' ? 'Week View' : 'Day View'} — {new Date(date + 'T00:00:00').toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</h2>
            <span className="text-xs text-muted-foreground">{filteredAppts.length} slots</span>
          </div>
          <div className="p-4 space-y-4">
            {apptsQ.isLoading && <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}
            {!apptsQ.isLoading && filteredAppts.length === 0 && (
              <div className="text-center py-14">
                <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No appointments scheduled</p>
                <Button size="sm" className="mt-3" variant="outline" onClick={() => setShowBook(true)}>Book one now</Button>
              </div>
            )}
            {filteredAppts.length > 0 && dayCols.map((d: Date) => {
              const rows = apptsForDay(d).sort((a: any, b: any) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
              if (rows.length === 0 && view === 'week') return null;
              return (
                <div key={d.toISOString()}>
                  {view === 'week' && (
                    <p className="text-xs font-semibold text-muted-foreground mb-2">{d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })} — {rows.length} appointments</p>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted-foreground border-b">
                          <th className="pb-2 pr-3 font-medium">Time</th>
                          <th className="pb-2 pr-3 font-medium">Patient</th>
                          <th className="pb-2 pr-3 font-medium">Modality</th>
                          <th className="pb-2 pr-3 font-medium">Machine / Room</th>
                          <th className="pb-2 pr-3 font-medium">Slot</th>
                          <th className="pb-2 pr-3 font-medium">Status</th>
                          <th className="pb-2 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((a: any) => (
                          <tr key={a._id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="py-2 pr-3 whitespace-nowrap">
                              <p className="font-semibold">{new Date(a.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              <p className="text-[11px] text-muted-foreground">{a.slotMinutes}m</p>
                            </td>
                            <td className="py-2 pr-3">
                              <p className="font-medium">{patientNameOf(a.patientId || a)}</p>
                              <p className="text-[11px] text-muted-foreground">{a.appointmentNo}</p>
                            </td>
                            <td className="py-2 pr-3"><ModalityBadge value={a.modalityType} /></td>
                            <td className="py-2 pr-3">
                              <p>{a.machineId?.name || '-'}</p>
                              <p className="text-[11px] text-muted-foreground inline-flex items-center"><MapPin className="w-3 h-3 mr-0.5" />{a.room || a.machineId?.roomNumber || '-'}</p>
                            </td>
                            <td className="py-2 pr-3"><StatusBadge value={a.slotType} /></td>
                            <td className="py-2 pr-3"><StatusBadge value={a.status} /></td>
                            <td className="py-2">
                              <div className="flex gap-1 justify-end flex-wrap">
                                {ACTIVE_APPT.includes(a.status) && (
                                  <>
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setResched(a); setReschedAt(toDateTimeLocal(a.scheduledStart)); }}>
                                      <RefreshCw className="w-3 h-3 mr-1" /> Reschedule
                                    </Button>
                                    {a.status !== 'Arrived' && (
                                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => checkinMut.mutate(a._id)}>
                                        <UserCheck className="w-3 h-3 mr-1" /> Check-in
                                      </Button>
                                    )}
                                    <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => setCancelTarget(a)}>
                                      <Ban className="w-3 h-3 mr-1" /> Cancel
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-xl border shadow-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="font-heading font-semibold">Machine Availability</h2>
            </div>
            <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
              {availQ.isLoading && <p className="text-sm text-muted-foreground">Loading availability...</p>}
              {availability.map((m: any) => (
                <div key={m.machineId} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{m.name || m.code || 'Machine'}</p>
                    <StatusBadge value={m.status} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{m.modalityType} · {m.room || '-'} · {m.slotDurationMinutes || 30} min slots</p>
                  {m.busy?.length ? (
                    <ul className="mt-2 space-y-1">
                      {m.busy.map((b: any, i: number) => (
                        <li key={i} className="text-[11px] flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                          <span>{new Date(b.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-muted-foreground">{b.appointmentNo} · {b.slotType}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[11px] text-emerald-600 font-medium">Fully free this day</p>
                  )}
                </div>
              ))}
              {!availQ.isLoading && availability.length === 0 && <p className="text-sm text-muted-foreground">No machines for the selected filters</p>}
            </div>
          </div>
        </div>
      </div>

      <Modal open={showBook} onClose={() => setShowBook(false)} title={book.slotType === 'Maintenance Block' ? 'Block Machine Slot' : 'Book Imaging Appointment'}>
        <form onSubmit={onBookSubmit} className="space-y-4 text-sm">
          <Field label="Link to order (Scheduling Pending)" hint="Selecting an order fills patient + modality automatically">
            <select value={book.radiologyOrderId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => pickOrder(e.target.value)} className={selectCls}>
              <option value="">— No linked order (walk-in) —</option>
              {schedulableOrders.map((o: any) => (
                <option key={o._id} value={o._id}>{o.orderId} · {o.patientName} · {o.modality} ({o.bodyPart})</option>
              ))}
            </select>
          </Field>
          <Field label="Patient ID *">
            <Input required value={book.patientId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBook((b: any) => ({ ...b, patientId: e.target.value }))} placeholder="Patient user id" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Modality Type *">
              <select required value={book.modalityType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBook((b: any) => ({ ...b, modalityType: e.target.value }))} className={selectCls}>
                {RAD_MODALITY_TYPES.map((m: string) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Machine">
              <select value={book.machineId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => pickMachine(e.target.value)} className={selectCls}>
                <option value="">— None —</option>
                {machines.filter((m: any) => m.modalityType === book.modalityType).map((m: any) => (
                  <option key={m._id} value={m._id}>{m.name} ({m.code})</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start *">
              <Input required type="datetime-local" value={book.scheduledStart} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBook((b: any) => ({ ...b, scheduledStart: e.target.value }))} />
            </Field>
            <Field label="Slot minutes (from machine)">
              <Input type="number" min={5} max={480} value={book.slotMinutes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBook((b: any) => ({ ...b, slotMinutes: e.target.value }))} />
            </Field>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input type="checkbox" checked={book.slotType === 'Emergency'} disabled={book.slotType === 'Maintenance Block'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBook((b: any) => ({ ...b, slotType: e.target.checked ? 'Emergency' : 'Regular' }))} className="rounded" />
              Emergency slot
            </label>
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input type="checkbox" checked={book.slotType === 'Maintenance Block'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBook((b: any) => ({ ...b, slotType: e.target.checked ? 'Maintenance Block' : 'Regular' }))} className="rounded" />
              Maintenance block
            </label>
          </div>
          <Field label="Notes">
            <textarea className={textareaCls} value={book.notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBook((b: any) => ({ ...b, notes: e.target.value }))} />
          </Field>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowBook(false)}>Cancel</Button>
            <Button type="submit" disabled={bookMut.isPending}>
              {bookMut.isPending ? 'Booking...' : <><Check className="w-4 h-4 mr-1" /> Confirm Booking</>}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(resched)} onClose={() => setResched(null)} title="Reschedule Appointment">
        <form onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          reschedMut.mutate({ id: resched._id, scheduledStart: new Date(reschedAt).toISOString(), reason: 'Rescheduled from calendar' });
        }} className="space-y-4 text-sm">
          <p className="text-sm text-muted-foreground">{resched?.appointmentNo} · {resched ? patientNameOf(resched.patientId || resched) : ''}</p>
          <Field label="New start *">
            <Input required type="datetime-local" value={reschedAt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReschedAt(e.target.value)} />
          </Field>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setResched(null)}>Cancel</Button>
            <Button type="submit" disabled={reschedMut.isPending}>Reschedule</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(cancelTarget)} onClose={() => { setCancelTarget(null); setCancelReason(''); }} title="Cancel Appointment">
        <form onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          cancelMut.mutate({ id: cancelTarget._id, status: 'Cancelled', reason: cancelReason });
        }} className="space-y-4 text-sm">
          <p className="text-sm text-muted-foreground">{cancelTarget?.appointmentNo} · {cancelTarget ? patientNameOf(cancelTarget.patientId || cancelTarget) : ''}</p>
          <Field label="Reason *">
            <Input required value={cancelReason} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCancelReason(e.target.value)} placeholder="e.g. Patient requested, machine down..." />
          </Field>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => { setCancelTarget(null); setCancelReason(''); }}>Keep</Button>
            <Button type="submit" variant="destructive" disabled={cancelMut.isPending}>Cancel Appointment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
