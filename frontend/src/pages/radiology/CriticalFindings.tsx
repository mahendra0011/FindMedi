import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing, Check, CheckCircle2, Clock, MessageSquare, Phone, Siren, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { radApi } from '@/lib/api';
import {
  Modal, Field, StatCard, StatusBadge, ModalityBadge, PriorityBadge,
  errMessage, textareaCls, fmtDateTime, isToday, patientNameOf, doctorNameOf,
} from '@/components/radiology/radShared';

export default function CriticalFindings() {
  const qc = useQueryClient();
  const [escTarget, setEscTarget] = useState<any>(null);
  const [escForm, setEscForm] = useState({ escalatedTo: '', note: '' });
  const [closeTarget, setCloseTarget] = useState<any>(null);
  const [outcome, setOutcome] = useState('');

  const critQ = useQuery({ queryKey: ['radiology', 'critical'], queryFn: () => radApi.getCritical(), retry: false });
  const closedQ = useQuery({
    queryKey: ['radiology', 'orders', 'critical-closed'],
    queryFn: () => radApi.getOrders({ status: 'Reported' }),
  });

  const queue: any[] = critQ.data?.critical || [];
  const reported: any[] = closedQ.data?.orders || [];
  const closedToday: any[] = reported.filter((o: any) => o.criticalFinding?.isCritical && isToday(o.criticalFinding.closedAt));

  const minsSince = (v: any) => (v ? Math.round((Date.now() - new Date(v).getTime()) / 60000) : null);
  const pendingAck = queue.filter((o: any) => !o.criticalFinding?.acknowledgedByDoctor);
  const unEscalated = queue.filter((o: any) => !o.criticalFinding?.escalatedAt && o.criticalFinding?.communicatedAt && minsSince(o.criticalFinding.communicatedAt) !== null && minsSince(o.criticalFinding.communicatedAt)! > 30);
  const escalated = queue.filter((o: any) => o.criticalFinding?.escalatedAt);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['radiology'] });
  const notify = (title: string, description?: string) => toast.success(title, description ? { description } : undefined);

  const ackMut = useMutation({
    mutationFn: (id: string) => radApi.acknowledgeCritical(id),
    onSuccess: () => { notify('Critical finding acknowledged'); invalidate(); },
    onError: (e: any) => toast.error(errMessage(e, 'Acknowledge failed')),
  });
  const escMut = useMutation({
    mutationFn: ({ id, ...b }: any) => radApi.escalateCritical(id, b),
    onSuccess: () => { notify('Escalation recorded'); invalidate(); setEscTarget(null); setEscForm({ escalatedTo: '', note: '' }); },
    onError: (e: any) => toast.error(errMessage(e, 'Escalation failed')),
  });
  const closeMut = useMutation({
    mutationFn: ({ id, ...b }: any) => radApi.closeCritical(id, b),
    onSuccess: () => { notify('Critical finding closed'); invalidate(); setCloseTarget(null); setOutcome(''); },
    onError: (e: any) => toast.error(errMessage(e, 'Close failed')),
  });

  const Timeline = ({ cf }: { cf: any }) => (
    <ol className="relative border-l ml-2 mt-2 space-y-3 pl-4 text-xs">
      {cf?.communicatedAt && (
        <li className="relative">
          <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-red-500" />
          <p className="font-semibold">Critical flagged & communicated to Dr. {doctorNameOf({ doctorId: cf.doctorId })}</p>
          <p className="text-muted-foreground">{fmtDateTime(cf.communicatedAt)} · {cf.urgencyLevel || 'urgency n/a'}</p>
        </li>
      )}
      {cf?.acknowledgedByDoctor && (
        <li className="relative">
          <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-emerald-500" />
          <p className="font-semibold">Ordering doctor acknowledged</p>
          <p className="text-muted-foreground">{fmtDateTime(cf.acknowledgedAt)}</p>
        </li>
      )}
      {cf?.escalatedAt && (
        <li className="relative">
          <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-amber-500" />
          <p className="font-semibold">Escalated to {cf.escalatedTo}</p>
          <p className="text-muted-foreground">{fmtDateTime(cf.escalatedAt)}</p>
          {cf.escalationNotes && <p className="mt-1 text-muted-foreground whitespace-pre-line">{cf.escalationNotes}</p>}
        </li>
      )}
      {cf?.closedAt && (
        <li className="relative">
          <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-500" />
          <p className="font-semibold">Closed</p>
          <p className="text-muted-foreground">{fmtDateTime(cf.closedAt)}</p>
          {cf.outcome && <p className="mt-1 text-muted-foreground">{cf.outcome}</p>}
        </li>
      )}
      {!cf?.communicatedAt && <li className="text-muted-foreground">No communication events recorded</li>}
    </ol>
  );

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Critical Findings Queue</h1>
          <p className="page-subtitle">Panic values, acknowledgement tracking and escalation audit</p>
        </div>
        <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ['radiology', 'critical'] })}>
          <Clock className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Acknowledgement" value={pendingAck.length} tone="text-destructive" />
        <StatCard label="Un-escalated > 30 min" value={unEscalated.length} tone="text-amber-600" />
        <StatCard label="Escalated (open)" value={escalated.length} tone="text-warning" />
        <StatCard label="Closed Today" value={closedToday.length} tone="text-success" />
      </div>

      <div className="space-y-4">
        {queue.map((o: any) => {
          const cf = o.criticalFinding || {};
          const mins = minsSince(cf.communicatedAt);
          const isOverdue = !cf.acknowledgedByDoctor || (!cf.escalatedAt && mins !== null && mins > 30);
          return (
            <div key={o._id} className={`rounded-xl border shadow-sm bg-card ${isOverdue ? 'border-destructive/40' : ''}`}>
              <div className="p-4 border-b flex flex-wrap items-center gap-3">
                <Siren className={`w-5 h-5 ${isOverdue ? 'text-destructive' : 'text-amber-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{patientNameOf(o.patientId || o)}</p>
                  <p className="text-xs text-muted-foreground">{o.orderId} · {o.bodyPart} · reported by {o.reportedBy?.name || 'radiologist'}</p>
                </div>
                <ModalityBadge value={o.modality} />
                <PriorityBadge value={o.priority} />
                <StatusBadge value={cf.acknowledgedByDoctor ? 'Acknowledged' : 'Pending Ack'} />
              </div>
              <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Finding</p>
                  <p className="text-sm bg-destructive/5 border border-destructive/20 rounded-lg p-3">{cf.findingDetails || o.impression || o.findings || 'Critical finding recorded'}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Urgency: <b>{cf.urgencyLevel || '-'}</b></span>
                    <span>Communicated: {cf.communicatedAt ? `${fmtDateTime(cf.communicatedAt)}${mins !== null ? ` (${mins} min ago)` : ''}` : '-'}</span>
                  </div>
                  <Timeline cf={cf} />
                </div>
                <div className="flex flex-col gap-2 justify-start">
                  {!cf.acknowledgedByDoctor && (
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => ackMut.mutate(o._id)} disabled={ackMut.isPending}>
                      <Check className="w-4 h-4 mr-1" /> Acknowledge (Ordering Doctor)
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => { setEscTarget(o); setEscForm({ escalatedTo: o.doctorName || o.doctorId?.name || '', note: '' }); }}>
                    <Phone className="w-4 h-4 mr-1" /> Notify / Escalate
                  </Button>
                  <Button variant="outline" onClick={() => { setCloseTarget(o); setOutcome(''); }}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Close with Outcome
                  </Button>
                  {cf.outcome && (
                    <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground mb-1">Outcome</p>
                      {cf.outcome}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {!critQ.isLoading && queue.length === 0 && (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
            <BellRing className="w-12 h-12 text-emerald-500/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No open critical findings</p>
          </div>
        )}
        {critQ.isLoading && <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}
        {critQ.isError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{errMessage(critQ.error, 'Failed to load critical queue')}</div>
        )}
      </div>

      <div className="bg-card rounded-xl border shadow-sm">
        <div className="p-4 border-b flex items-center gap-2">
          <XCircle className="w-4 h-4 text-primary" />
          <h2 className="font-heading font-semibold">Closed Today</h2>
        </div>
        <div className="p-4">
          {closedToday.length === 0 ? (
            <p className="text-sm text-muted-foreground">No critical findings closed today</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {closedToday.map((o: any) => (
                <li key={o._id} className="rounded-lg border p-3 flex flex-wrap items-center gap-3">
                  <ModalityBadge value={o.modality} />
                  <div className="flex-1">
                    <p className="font-medium">{o.patientName}</p>
                    <p className="text-xs text-muted-foreground">Closed {fmtDateTime(o.criticalFinding?.closedAt)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-md">{o.criticalFinding?.outcome}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Modal open={Boolean(escTarget)} onClose={() => setEscTarget(null)} title="Escalate Critical Finding">
        <form onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          escMut.mutate({ id: escTarget._id, escalatedTo: escForm.escalatedTo, note: escForm.note });
        }} className="space-y-4 text-sm">
          <p className="text-xs text-muted-foreground">{escTarget?.orderId} · {escTarget?.patientName} · {escTarget?.modality}</p>
          <Field label="Escalate to *">
            <Input required value={escForm.escalatedTo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEscForm((f: any) => ({ ...f, escalatedTo: e.target.value }))} placeholder="e.g. Dr. Sharma (Chief of Radiology)" />
          </Field>
          <Field label="Note">
            <textarea className={textareaCls} value={escForm.note} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEscForm((f: any) => ({ ...f, note: e.target.value }))} placeholder="Called at 10:42, no answer — page sent..." />
          </Field>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setEscTarget(null)}>Cancel</Button>
            <Button type="submit" disabled={escMut.isPending}><MessageSquare className="w-4 h-4 mr-1" /> Record Escalation</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(closeTarget)} onClose={() => setCloseTarget(null)} title="Close Critical Finding">
        <form onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          closeMut.mutate({ id: closeTarget._id, outcome });
        }} className="space-y-4 text-sm">
          <p className="text-xs text-muted-foreground">{closeTarget?.orderId} · {closeTarget?.patientName}</p>
          <Field label="Outcome *">
            <textarea required className={textareaCls} value={outcome} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOutcome(e.target.value)} placeholder="e.g. Clinician informed, patient shifted to ED, plan changed to surgery..." />
          </Field>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setCloseTarget(null)}>Cancel</Button>
            <Button type="submit" disabled={closeMut.isPending}><CheckCircle2 className="w-4 h-4 mr-1" /> Close</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
