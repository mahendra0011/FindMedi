import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Camera, CheckCircle2, FileText, FlaskConical, Play, ShieldAlert,
  Syringe, ArrowRight, Search, Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { radApi } from '@/lib/api';
import RadiologySafetyScreeningModal from '@/components/radiology/RadiologySafetyScreeningModal';
import RadiologyReportingModal from '@/components/radiology/RadiologyReportingModal';
import {
  Modal, Field, StatCard, StatusBadge, ModalityBadge, PriorityBadge,
  errMessage, inputCls, toDateTimeLocal, patientNameOf, doctorNameOf,
} from '@/components/radiology/radShared';

interface Props {
  modalityType: string;
}

const STATUSES_TO_START = ['Scheduled', 'Appointment Confirmed', 'Patient Arrived', 'Ready for Imaging'];

export default function ModalityDashboard({ modalityType }: Props) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [screeningOrder, setScreeningOrder] = useState<any>(null);
  const [reportingOrder, setReportingOrder] = useState<any>(null);
  const [contrastOrder, setContrastOrder] = useState<any>(null);
  const [contrast, setContrast] = useState<any>({ agent: 'Iohexol 350', volumeMl: '100', route: 'IV', givenAt: '', reaction: '' });

  const ordersQ = useQuery({
    queryKey: ['radiology', 'modality-dashboard', modalityType],
    queryFn: () => radApi.getOrders({ modality: modalityType }),
  });
  const modsQ = useQuery({ queryKey: ['radiology', 'modalities'], queryFn: () => radApi.getModalities() });

  const all: any[] = ordersQ.data?.orders || [];
  const machines: any[] = (modsQ.data?.modalities || []).filter((m: any) => m.modalityType === modalityType && m.status !== 'Inactive');
  const prepRules: string[] = machines.flatMap((m: any) => m.prepRules || []);
  const reportTemplates: string[] = machines.flatMap((m: any) => m.reportTemplates || []);
  const supportedStudies: string[] = machines.flatMap((m: any) => m.supportedStudies || []);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['radiology'] });

  const startMut = useMutation({
    mutationFn: (id: string) => radApi.startScan(id),
    onSuccess: () => { toast.success('Study started'); invalidate(); },
    onError: (e: any) => toast.error(errMessage(e, 'Failed to start study')),
  });
  const completeMut = useMutation({
    mutationFn: (id: string) => radApi.completeScan(id, {}),
    onSuccess: () => { toast.success('Study completed'); invalidate(); },
    onError: (e: any) => toast.error(errMessage(e, 'Failed to complete study')),
  });
  const forwardMut = useMutation({
    mutationFn: ({ id, status }: any) => radApi.setOrderStatus(id, { status }),
    onSuccess: () => { toast.success('Forwarded for reporting'); invalidate(); },
    onError: (e: any) => toast.error(errMessage(e, 'Failed to forward')),
  });
  const screeningMut = useMutation({
    mutationFn: ({ id, ...b }: any) => radApi.saveScreening(id, b),
    onSuccess: () => { toast.success('Screening saved'); invalidate(); setScreeningOrder(null); },
    onError: (e: any) => toast.error(errMessage(e, 'Failed to save screening')),
  });
  const reportMut = useMutation({
    mutationFn: ({ id, ...b }: any) => radApi.submitReport(id, b),
    onSuccess: () => { toast.success('Report signed'); invalidate(); setReportingOrder(null); },
    onError: (e: any) => toast.error(errMessage(e, 'Failed to submit report')),
  });
  const contrastMut = useMutation({
    mutationFn: ({ id, ...b }: any) => radApi.setContrast(id, b),
    onSuccess: () => { toast.success('Contrast recorded'); invalidate(); setContrastOrder(null); },
    onError: (e: any) => toast.error(errMessage(e, 'Failed to record contrast')),
  });

  const isMri = modalityType === 'MRI';
  const isCt = modalityType === 'CT Scan';
  const isXray = modalityType === 'X-Ray';

  const worklist = all.filter((o: any) => {
    const okStatus = statusFilter === 'All' || o.status === statusFilter;
    const s = search.toLowerCase();
    const okSearch = !s || [o.patientName, o.orderId, o.bodyPart, o.studyNumber].some((v: any) => String(v || '').toLowerCase().includes(s));
    return okStatus && okSearch && o.status !== 'Cancelled';
  });

  const waiting = all.filter((o: any) => ['Scheduled', 'Appointment Confirmed', 'Patient Arrived'].includes(o.status)).length;
  const prepPending = all.filter((o: any) => ['Preparation Pending', 'On Hold'].includes(o.status)).length;
  const inProgress = all.filter((o: any) => o.status === 'In Progress').length;
  const completed = all.filter((o: any) => ['Completed', 'Study Completed'].includes(o.status)).length;
  const reportsPending = all.filter((o: any) => ['Completed', 'Study Completed', 'Reporting Pending'].includes(o.status)).length;
  const urgent = all.filter((o: any) => ['Urgent', 'STAT'].includes(o.priority) && !['Reported', 'Report Finalized', 'Report Released', 'Delivered'].includes(o.status)).length;
  const screeningPending = all.filter((o: any) => !o.safetyScreening?.isScreened && !['Completed', 'Study Completed', 'Reported', 'Report Finalized', 'Report Released', 'Delivered', 'Cancelled'].includes(o.status)).length;

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">{modalityType} Dashboard</h1>
          <p className="page-subtitle">{machines.length} machine(s) · {worklist.length} studies in worklist</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => nav('/radiology/preparation')}><FlaskConical className="w-4 h-4 mr-1" /> Preparation Queue</Button>
          <Button variant="outline" onClick={() => nav('/radiology/scheduling')}>Scheduling</Button>
          <Button variant="outline" onClick={() => nav('/radiology/modalities')}>Machines</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Waiting" value={waiting} tone="text-cyan-600" />
        <StatCard label="Prep Pending" value={prepPending} tone="text-amber-600" onClick={() => nav('/radiology/preparation')} />
        <StatCard label="In Progress" value={inProgress} tone="text-info" />
        <StatCard label="Completed" value={completed} tone="text-success" />
        <StatCard label="Reports Pending" value={reportsPending} tone="text-purple-600" onClick={() => nav('/radiology/reports')} />
        <StatCard label="Urgent" value={urgent} tone="text-destructive" />
      </div>

      {isMri && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">MRI Safety Screening</p>
            <p className="text-xs text-muted-foreground">{screeningPending} studies still need implant / metal screening and radiologist clearance before scanning.</p>
          </div>
          <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-600" onClick={() => nav('/radiology/preparation')}>
            Open screening prep <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}

      {isCt && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Syringe className="w-5 h-5 text-orange-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Contrast Administration</p>
            <p className="text-xs text-muted-foreground">{all.filter((o: any) => o.contrast?.agent).length} studies with a recorded contrast dose · {screeningPending} awaiting renal / allergy screening.</p>
          </div>
          <Button size="sm" variant="outline" className="border-orange-500/40 text-orange-600" onClick={() => setContrastOrder(worklist.find((o: any) => o.status === 'In Progress') || worklist[0] || null)}>
            Record contrast
          </Button>
        </div>
      )}

      <div className="bg-card rounded-xl border shadow-sm">
        <div className="p-4 border-b flex flex-wrap gap-3 items-center justify-between">
          <h2 className="font-heading font-semibold">{modalityType} Worklist</h2>
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search patient / order..." className="pl-10 w-56" value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} />
            </div>
            <select value={statusFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
              <option value="All">All Status</option>
              {['Patient Arrived', 'Preparation Pending', 'Ready for Imaging', 'In Progress', 'Completed', 'Study Completed', 'Reporting Pending', 'Reported'].map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b">
                <th className="p-3 font-medium">Patient</th>
                <th className="p-3 font-medium">Order</th>
                <th className="p-3 font-medium">{isXray ? 'Body Part / Projection' : 'Study'}</th>
                <th className="p-3 font-medium">Priority</th>
                <th className="p-3 font-medium">Scheduled</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {worklist.map((o: any) => (
                <tr key={o._id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <p className="font-medium">{patientNameOf(o.patientId || o)}</p>
                    <p className="text-[11px] text-muted-foreground">{o.patientId?.phone || ''}</p>
                  </td>
                  <td className="p-3">
                    <p>{o.orderId}</p>
                    <p className="text-[11px] text-muted-foreground">{o.studyNumber || ''}</p>
                  </td>
                  <td className="p-3">
                    <p className="font-medium">{o.bodyPart}</p>
                    {isXray && <p className="text-[11px] text-muted-foreground">Projection: {o.bodyPart}</p>}
                    {isCt && o.contrast?.agent && <p className="text-[11px] text-orange-600">Contrast: {o.contrast.agent} {o.contrast.volumeMl}ml</p>}
                    {isMri && (
                      <p className={`text-[11px] ${o.safetyScreening?.clearedForScan ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {o.safetyScreening?.clearedForScan ? 'Screened & cleared' : 'Screening pending'}
                      </p>
                    )}
                  </td>
                  <td className="p-3"><PriorityBadge value={o.priority} /></td>
                  <td className="p-3 text-xs text-muted-foreground">{toDateTimeLocal(o.scheduledAt) ? new Date(o.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '-'}</td>
                  <td className="p-3"><StatusBadge value={o.status} /></td>
                  <td className="p-3">
                    <div className="flex gap-1 justify-end flex-wrap">
                      {(isMri || isCt) && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setScreeningOrder(o)}>
                          <ShieldAlert className="w-3 h-3 mr-1" /> Safety
                        </Button>
                      )}
                      {isCt && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setContrastOrder(o); setContrast((c: any) => ({ ...c, givenAt: '' })); }}>
                          <Syringe className="w-3 h-3 mr-1" /> Contrast
                        </Button>
                      )}
                      {STATUSES_TO_START.includes(o.status) && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startMut.mutate(o._id)}>
                          <Play className="w-3 h-3 mr-1" /> Start
                        </Button>
                      )}
                      {o.status === 'In Progress' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => completeMut.mutate(o._id)}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                        </Button>
                      )}
                      {['Completed', 'Study Completed'].includes(o.status) && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => forwardMut.mutate({ id: o._id, status: 'Reporting Pending' })}>
                          <ArrowRight className="w-3 h-3 mr-1" /> Forward for Report
                        </Button>
                      )}
                      {o.status === 'Reporting Pending' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setReportingOrder(o)}>
                          <FileText className="w-3 h-3 mr-1" /> Report
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {worklist.length === 0 && (
                <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">
                  <Camera className="w-10 h-10 mx-auto mb-2 opacity-30" />No studies in the {modalityType} worklist
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-semibold">{modalityType} Preparation Rules</h2>
          </div>
          <div className="p-4">
            {prepRules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No prep rules configured for {modalityType} machines. Add them in Modality Master.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {Array.from(new Set(prepRules)).map((r: string, i: number) => (
                  <li key={i} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /><span>{r}</span></li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-semibold">Configured for {modalityType}</h2>
          </div>
          <div className="p-4 space-y-3 text-sm">
            {machines.map((m: any) => (
              <div key={m._id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{m.name} <span className="text-[11px] text-muted-foreground">({m.code})</span></p>
                  <StatusBadge value={m.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{m.roomNumber || '-'} · {m.slotDurationMinutes || 30}m slots · ₹{m.price ?? 0}</p>
              </div>
            ))}
            {supportedStudies.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Supported studies</p>
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set(supportedStudies)).map((s: string, i: number) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-muted"><ModalityBadge value={modalityType} /> {s}</span>
                  ))}
                </div>
              </div>
            )}
            {reportTemplates.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Report templates</p>
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set(reportTemplates)).map((s: string, i: number) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {screeningOrder && (
        <RadiologySafetyScreeningModal
          order={screeningOrder}
          onClose={() => setScreeningOrder(null)}
          onSave={(b: any) => screeningMut.mutate({ id: screeningOrder._id, ...b })}
        />
      )}

      {reportingOrder && (
        <RadiologyReportingModal
          order={reportingOrder}
          onClose={() => setReportingOrder(null)}
          onSubmit={(b: any) => reportMut.mutate({ id: reportingOrder._id, ...b })}
        />
      )}

      <Modal open={Boolean(contrastOrder)} onClose={() => setContrastOrder(null)} title="Record Contrast Administration">
        <form onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          contrastMut.mutate({
            id: contrastOrder._id,
            agent: contrast.agent,
            volumeMl: Number(contrast.volumeMl) || 0,
            route: contrast.route,
            givenAt: contrast.givenAt ? new Date(contrast.givenAt).toISOString() : new Date().toISOString(),
            reaction: contrast.reaction,
          });
        }} className="space-y-4 text-sm">
          <p className="text-xs text-muted-foreground">{contrastOrder?.orderId} · {contrastOrder?.patientName} · {contrastOrder?.bodyPart}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contrast agent"><Input value={contrast.agent} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContrast((c: any) => ({ ...c, agent: e.target.value }))} /></Field>
            <Field label="Volume (mL)"><Input type="number" min={0} value={contrast.volumeMl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContrast((c: any) => ({ ...c, volumeMl: e.target.value }))} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Route">
              <select value={contrast.route} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setContrast((c: any) => ({ ...c, route: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                {['IV', 'Oral', 'Rectal', 'Intrathecal'].map((r: string) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Given at"><Input type="datetime-local" value={contrast.givenAt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContrast((c: any) => ({ ...c, givenAt: e.target.value }))} /></Field>
          </div>
          <Field label="Reaction / notes"><Input value={contrast.reaction} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContrast((c: any) => ({ ...c, reaction: e.target.value }))} placeholder="None observed" /></Field>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setContrastOrder(null)}>Cancel</Button>
            <Button type="submit" disabled={contrastMut.isPending}><Syringe className="w-4 h-4 mr-1" /> Save Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
