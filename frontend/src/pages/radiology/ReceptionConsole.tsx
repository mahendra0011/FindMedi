import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck, IndianRupee, Plus, UserCheck, Users, FileCheck2, ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { radApi } from '@/lib/api';
import {
  Modal, Field, StatCard, StatusBadge, ModalityBadge, PriorityBadge,
  errMessage, inputCls, selectCls, textareaCls, dayStart, dayEnd,
  patientNameOf, toDateTimeLocal, RAD_MODALITY_TYPES,
} from '@/components/radiology/radShared';

const READY_REPORT_STATUSES = ['Reported', 'Report Finalized', 'Report Released'];

export default function ReceptionConsole() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>({
    patientId: '', patientName: '', modality: 'X-Ray', bodyPart: '', clinicalHistory: '', priority: 'Routine',
  });

  const apptsQ = useQuery({
    queryKey: ['radiology', 'reception', 'appointments'],
    queryFn: () => radApi.getAppointments({ from: dayStart().toISOString(), to: dayEnd().toISOString() }),
  });
  const ordersQ = useQuery({ queryKey: ['radiology', 'reception', 'orders'], queryFn: () => radApi.getOrders({}) });

  const appointments: any[] = apptsQ.data?.appointments || [];
  const orders: any[] = ordersQ.data?.orders || [];

  const waiting = appointments.filter((a: any) => a.status === 'Arrived');
  const payPending = orders.filter((o: any) => o.status === 'Payment Pending');
  const reportsReady = orders.filter((o: any) => READY_REPORT_STATUSES.includes(o.status));
  const todaysAppts = appointments;

  const byModality: Record<string, number> = {};
  for (const a of appointments) byModality[a.modalityType || 'Unknown'] = (byModality[a.modalityType || 'Unknown'] || 0) + 1;
  const modalityCounts = Object.entries(byModality).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['radiology'] });

  const checkinMut = useMutation({
    mutationFn: (id: string) => radApi.checkinAppointment(id),
    onSuccess: () => { toast.success('Patient checked in'); invalidate(); },
    onError: (e: any) => toast.error(errMessage(e, 'Check-in failed')),
  });
  const createMut = useMutation({
    mutationFn: (b: any) => radApi.createOrder(b),
    onSuccess: () => { toast.success('Walk-in order created'); invalidate(); setShowCreate(false); setForm({ patientId: '', patientName: '', modality: 'X-Ray', bodyPart: '', clinicalHistory: '', priority: 'Routine' }); },
    onError: (e: any) => toast.error(errMessage(e, 'Failed to create order')),
  });

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Radiology Reception Console</h1>
          <p className="page-subtitle">{new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => nav('/radiology/scheduling')}>Scheduling</Button>
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> Walk-in Order</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Today's Appointments" value={todaysAppts.length} tone="text-foreground" />
        <StatCard label="Waiting (Arrived)" value={waiting.length} tone="text-cyan-600" />
        <StatCard label="Payment Pending" value={payPending.length} tone="text-amber-600" />
        <StatCard label="Reports Ready" value={reportsReady.length} tone="text-purple-600" onClick={() => nav('/radiology/reports')} />
        <StatCard label="No Show" value={appointments.filter((a: any) => a.status === 'No Show').length} tone="text-destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-semibold">Today's Appointments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="p-3 font-medium">Time</th>
                  <th className="p-3 font-medium">Patient</th>
                  <th className="p-3 font-medium">Modality</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a: any) => (
                  <tr key={a._id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 whitespace-nowrap font-medium">
                      {new Date(a.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <p className="text-[11px] text-muted-foreground">{a.appointmentNo}</p>
                    </td>
                    <td className="p-3">{patientNameOf(a.patientId || a)}</td>
                    <td className="p-3"><ModalityBadge value={a.modalityType} /></td>
                    <td className="p-3"><StatusBadge value={a.status} /></td>
                    <td className="p-3 text-right">
                      {!['Arrived', 'Cancelled', 'No Show', 'Completed'].includes(a.status) && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => checkinMut.mutate(a._id)} disabled={checkinMut.isPending}>
                          <UserCheck className="w-3 h-3 mr-1" /> Check-in
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {appointments.length === 0 && (
                  <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No appointments booked for today</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl border shadow-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <h2 className="font-heading font-semibold">Modality-wise Bookings</h2>
            </div>
            <div className="p-4 space-y-2 text-sm">
              {modalityCounts.map(([m, c]: [string, number]) => (
                <div key={m} className="flex items-center justify-between">
                  <ModalityBadge value={m} />
                  <span className="font-semibold">{c}</span>
                </div>
              ))}
              {modalityCounts.length === 0 && <p className="text-muted-foreground">No bookings yet</p>}
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-500" />
              <h2 className="font-heading font-semibold">Waiting List</h2>
              <span className="ml-auto text-xs text-muted-foreground">{waiting.length} arrived</span>
            </div>
            <div className="p-4 space-y-2 text-sm">
              {waiting.map((a: any) => (
                <div key={a._id} className="rounded-lg border p-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{patientNameOf(a.patientId || a)}</p>
                    <p className="text-[11px] text-muted-foreground">{a.modalityType} · {a.room || a.machineId?.code || '-'}</p>
                  </div>
                  <StatusBadge value={a.status} />
                </div>
              ))}
              {waiting.length === 0 && <p className="text-muted-foreground">Nobody waiting</p>}
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-amber-500" />
              <h2 className="font-heading font-semibold">Payments Pending</h2>
            </div>
            <div className="p-4 space-y-2 text-sm">
              {payPending.map((o: any) => (
                <div key={o._id} className="rounded-lg border p-2.5">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{o.patientName}</p>
                    <PriorityBadge value={o.priority} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{o.orderId} · {o.modality} ({o.bodyPart})</p>
                </div>
              ))}
              {payPending.length === 0 && <p className="text-muted-foreground">No orders waiting on payment</p>}
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-purple-500" />
              <h2 className="font-heading font-semibold">Reports Ready</h2>
            </div>
            <div className="p-4 space-y-2 text-sm">
              {reportsReady.slice(0, 6).map((o: any) => (
                <div key={o._id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{o.patientName}</p>
                    <p className="text-[11px] text-muted-foreground">{o.modality} · {o.reportNumber || o.orderId}</p>
                  </div>
                  <StatusBadge value={o.status} />
                </div>
              ))}
              {reportsReady.length === 0 && <p className="text-muted-foreground">No reports waiting for delivery</p>}
              {reportsReady.length > 0 && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => nav('/radiology/reports')}>
                  <ClipboardList className="w-3.5 h-3.5 mr-1" /> Open Report Center
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Walk-in Radiology Order">
        <form onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          createMut.mutate(form);
        }} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Patient ID *"><Input required value={form.patientId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: any) => ({ ...f, patientId: e.target.value }))} placeholder="Patient user id" /></Field>
            <Field label="Patient Name *"><Input required value={form.patientName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: any) => ({ ...f, patientName: e.target.value }))} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Modality *">
              <select required value={form.modality} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((f: any) => ({ ...f, modality: e.target.value }))} className={selectCls}>
                {RAD_MODALITY_TYPES.map((m: string) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((f: any) => ({ ...f, priority: e.target.value }))} className={selectCls}>
                {['Routine', 'Urgent', 'STAT'].map((p: string) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Body Part *"><Input required value={form.bodyPart} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: any) => ({ ...f, bodyPart: e.target.value }))} placeholder="e.g. Chest, Abdomen, Knee" /></Field>
          <Field label="Clinical History">
            <textarea className={textareaCls} value={form.clinicalHistory} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f: any) => ({ ...f, clinicalHistory: e.target.value }))} />
          </Field>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={createMut.isPending}><Plus className="w-4 h-4 mr-1" /> Create Order</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
