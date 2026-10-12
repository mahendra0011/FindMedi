import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, AlertTriangle, ArrowRight, CalendarClock, CalendarX, Camera, Clock,
  FileWarning, Wrench, Users, Siren, XCircle, BarChart3,
} from 'lucide-react';
import { radApi } from '@/lib/api';
import {
  RAD_LINKS, StatCard, StatusBadge, ModalityBadge, fmtDateTime, isToday,
  dayStart, dayEnd, errMessage,
} from '@/components/radiology/radShared';

const TAT_BREACH_HOURS = 24;

const REPORTED_STATUSES = ['Reported', 'Report Finalized', 'Report Released', 'Delivered'];

export default function RadiologyDashboard() {
  const nav = useNavigate();

  const ordersQ = useQuery({ queryKey: ['radiology', 'dashboard', 'orders'], queryFn: () => radApi.getOrders({}) });
  const apptsQ = useQuery({
    queryKey: ['radiology', 'dashboard', 'appointments'],
    queryFn: () => radApi.getAppointments({ from: dayStart().toISOString(), to: dayEnd().toISOString() }),
  });
  const modsQ = useQuery({ queryKey: ['radiology', 'modalities'], queryFn: () => radApi.getModalities() });
  const critQ = useQuery({ queryKey: ['radiology', 'critical'], queryFn: () => radApi.getCritical(), retry: false });

  const orders: any[] = ordersQ.data?.orders || [];
  const appointments: any[] = apptsQ.data?.appointments || [];
  const modalities: any[] = (modsQ.data?.modalities || []).filter((m: any) => m.status !== 'Inactive');
  const critical: any[] = critQ.data?.critical || [];

  const now = Date.now();
  const todaysStudies = orders.filter((o: any) => isToday(o.createdAt)).length;
  const awaitingScheduling = orders.filter((o: any) => ['Ordered', 'Authorization Pending', 'Payment Pending', 'Scheduling Pending'].includes(o.status)).length;
  const patientsWaiting = orders.filter((o: any) => ['Patient Arrived', 'Preparation Pending'].includes(o.status)).length;
  const inProgress = orders.filter((o: any) => o.status === 'In Progress').length;
  const reportsPending = orders.filter((o: any) => ['Completed', 'Study Completed', 'Reporting Pending'].includes(o.status)).length;
  const urgent = orders.filter((o: any) => ['Urgent', 'STAT'].includes(o.priority) && !REPORTED_STATUSES.includes(o.status) && o.status !== 'Cancelled').length;
  const cancelledToday = orders.filter((o: any) => o.status === 'Cancelled' && isToday(o.updatedAt || o.createdAt)).length;
  const noShowToday = appointments.filter((a: any) => a.status === 'No Show' && isToday(a.scheduledStart)).length;
  const tatBreaches = orders.filter((o: any) => {
    if (REPORTED_STATUSES.includes(o.status) || o.status === 'Cancelled') return false;
    if (!o.createdAt) return false;
    return (now - new Date(o.createdAt).getTime()) / 3600000 > TAT_BREACH_HOURS;
  });

  const byModality: Record<string, number> = {};
  for (const o of orders) {
    if (o.status === 'Cancelled') continue;
    byModality[o.modality || 'Unknown'] = (byModality[o.modality || 'Unknown'] || 0) + 1;
  }
  const modalityRows = Object.entries(byModality).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);

  const equipment = {
    available: modalities.filter((m: any) => m.status === 'Available').length,
    inUse: modalities.filter((m: any) => m.status === 'In Use').length,
    maintenance: modalities.filter((m: any) => m.status === 'Under Maintenance').length,
    outOfService: modalities.filter((m: any) => m.status === 'Out of Service').length,
  };
  const maintenanceMachines = modalities.filter((m: any) => m.status === 'Under Maintenance' || m.status === 'Out of Service');

  const alerts: { level: 'danger' | 'warning' | 'info'; text: string; path?: string }[] = [];
  if (urgent > 0) alerts.push({ level: 'danger', text: `${urgent} urgent / STAT orders still not reported`, path: '/radiology/reports' });
  for (const c of critical.slice(0, 5)) {
    alerts.push({ level: 'danger', text: `Critical finding pending acknowledgement — ${c.patientName} (${c.modality} ${c.bodyPart})`, path: '/radiology/critical' });
  }
  for (const b of tatBreaches.slice(0, 5)) {
    alerts.push({ level: 'warning', text: `TAT breach: ${b.patientName} — ${b.modality} (${b.bodyPart}) ordered ${fmtDateTime(b.createdAt)}`, path: '/radiology/reports' });
  }
  for (const m of maintenanceMachines) {
    alerts.push({ level: 'warning', text: `Equipment ${m.name || m.code} is ${m.status} (service every ${m.maintenanceScheduleDays || '-'} days)`, path: '/radiology/modalities' });
  }
  const payPending = orders.filter((o: any) => o.status === 'Payment Pending').length;
  if (payPending > 0) alerts.push({ level: 'info', text: `${payPending} orders waiting on payment before scheduling`, path: '/radiology/reception' });
  if (awaitingScheduling > 0) alerts.push({ level: 'info', text: `${awaitingScheduling} orders awaiting scheduling`, path: '/radiology/scheduling' });

  const alertTone = (level: string) => (level === 'danger' ? 'border-destructive/40 bg-destructive/5' : level === 'warning' ? 'border-amber-500/40 bg-amber-500/5' : 'border-info/40 bg-info/5');

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Radiology Admin Dashboard</h1>
          <p className="page-subtitle">Operations overview across imaging, scheduling and reporting</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => nav('/radiology/scheduling')} className="inline-flex items-center h-9 px-3 rounded-lg border text-sm font-medium hover:bg-muted">
            <CalendarClock className="w-4 h-4 mr-1.5" /> Scheduling
          </button>
          <button onClick={() => nav('/radiology/reception')} className="inline-flex items-center h-9 px-3 rounded-lg border text-sm font-medium hover:bg-muted">
            <Users className="w-4 h-4 mr-1.5" /> Reception
          </button>
          <button onClick={() => nav('/radiology/pacs')} className="inline-flex items-center h-9 px-3 rounded-lg border text-sm font-medium hover:bg-muted">
            <Camera className="w-4 h-4 mr-1.5" /> PACS
          </button>
        </div>
      </div>

      {ordersQ.isError && <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{errMessage(ordersQ.error, 'Failed to load radiology data')}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Today's Studies" value={todaysStudies} tone="text-foreground" onClick={() => nav('/radiology')} />
        <StatCard label="Awaiting Scheduling" value={awaitingScheduling} tone="text-amber-600" onClick={() => nav('/radiology/scheduling')} />
        <StatCard label="Patients Waiting" value={patientsWaiting} tone="text-cyan-600" onClick={() => nav('/radiology/reception')} />
        <StatCard label="Studies In Progress" value={inProgress} tone="text-info" />
        <StatCard label="Reports Pending" value={reportsPending} tone="text-purple-600" onClick={() => nav('/radiology/reports')} />
        <StatCard label="Urgent / STAT" value={urgent} tone="text-warning" onClick={() => nav('/radiology/critical')} />
        <StatCard label="Cancelled" value={cancelledToday} tone="text-destructive" />
        <StatCard label="No-show (today)" value={noShowToday} tone="text-destructive" />
        <StatCard label={`TAT Breaches (>${TAT_BREACH_HOURS}h)`} value={tatBreaches.length} tone="text-destructive" onClick={() => nav('/radiology/mis')} />
        <StatCard label="Total Orders" value={orders.length} tone="text-foreground" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h2 className="font-heading font-semibold">Modality-wise Studies</h2>
            </div>
            <div className="p-4">
              {modalityRows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No active studies</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="pb-2 font-medium">Modality</th>
                      <th className="pb-2 font-medium text-right">Orders</th>
                      <th className="pb-2 font-medium text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalityRows.map(([m, c]: [string, number]) => {
                      const total = modalityRows.reduce((s: number, r: [string, number]) => s + r[1], 0) || 1;
                      return (
                        <tr key={m} className="border-b last:border-0">
                          <td className="py-2"><ModalityBadge value={m} /></td>
                          <td className="py-2 text-right font-semibold">{c}</td>
                          <td className="py-2 text-right text-muted-foreground">{Math.round((c / total) * 100)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <p className="px-4 pb-4 text-[11px] text-muted-foreground">Revenue figures are available under MIS Reports → Radiology Revenue.</p>
          </div>

          <div className="bg-card rounded-xl border shadow-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              <h2 className="font-heading font-semibold">Equipment Status</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Available" value={equipment.available} tone="text-emerald-600" />
                <StatCard label="In Use" value={equipment.inUse} tone="text-info" />
                <StatCard label="Maintenance" value={equipment.maintenance} tone="text-amber-600" />
                <StatCard label="Out of Service" value={equipment.outOfService} tone="text-destructive" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="pb-2 font-medium">Machine</th>
                      <th className="pb-2 font-medium">Code</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Room</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalities.map((m: any) => (
                      <tr key={m._id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{m.name}</td>
                        <td className="py-2 text-muted-foreground">{m.code}</td>
                        <td className="py-2">{m.modalityType}</td>
                        <td className="py-2">{m.roomNumber || '-'}</td>
                        <td className="py-2"><StatusBadge value={m.status} /></td>
                      </tr>
                    ))}
                    {modalities.length === 0 && (
                      <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No modalities configured</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <button onClick={() => nav('/radiology/modalities')} className="text-xs font-medium text-primary inline-flex items-center">
                Manage Modality Master <ArrowRight className="w-3 h-3 ml-1" />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl border shadow-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="font-heading font-semibold">Alerts</h2>
              <span className="ml-auto text-xs text-muted-foreground">{alerts.length}</span>
            </div>
            <div className="p-4 space-y-2 max-h-[420px] overflow-y-auto">
              {alerts.length === 0 && (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No alerts — everything looks clear</p>
                </div>
              )}
              {alerts.map((a: any, i: number) => (
                <div key={i} className={`rounded-lg border p-3 text-xs flex gap-2 items-start ${alertTone(a.level)}`}>
                  {a.level === 'danger' ? <Siren className="w-3.5 h-3.5 mt-0.5 shrink-0 text-destructive" />
                    : a.level === 'warning' ? <FileWarning className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
                      : <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-info" />}
                  <div className="flex-1">
                    <p className="text-foreground">{a.text}</p>
                    {a.path && (
                      <button onClick={() => nav(a.path!)} className="mt-1 text-[11px] font-medium text-primary inline-flex items-center">
                        Open <ArrowRight className="w-3 h-3 ml-0.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <XCircle className="w-4 h-4 text-primary" />
              <h2 className="font-heading font-semibold">Quick Actions</h2>
            </div>
            <div className="p-4 grid grid-cols-1 gap-2">
              {RAD_LINKS.filter((l: any) => l.path !== '/radiology').map((l: any) => (
                <button key={l.path} onClick={() => nav(l.path)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg border text-sm hover:bg-muted/50 transition-colors">
                  <span>{l.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <CalendarX className="w-4 h-4 text-primary" />
              <h2 className="font-heading font-semibold">Today's Schedule Snapshot</h2>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Appointments</span><span className="font-semibold">{appointments.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Arrived</span><span className="font-semibold">{appointments.filter((a: any) => a.status === 'Arrived').length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">No Show</span><span className="font-semibold text-destructive">{noShowToday}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Emergency slots</span><span className="font-semibold">{appointments.filter((a: any) => a.slotType === 'Emergency').length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Maintenance blocks</span><span className="font-semibold">{appointments.filter((a: any) => a.slotType === 'Maintenance Block').length}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
