import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Plus, ShieldAlert,
  Siren, ThumbsUp, Trash2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { radApi } from '@/lib/api';
import {
  Modal, Field, StatusBadge, ModalityBadge, PriorityBadge, errMessage, textareaCls,
  patientNameOf, prepChecklistFor, fmtDateTime,
} from '@/components/radiology/radShared';

export default function PreparationQueue() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [holdTarget, setHoldTarget] = useState<any>(null);
  const [holdReason, setHoldReason] = useState('');
  const [escalateTarget, setEscalateTarget] = useState<any>(null);
  const [escalateNote, setEscalateNote] = useState('');
  const [missingDraft, setMissingDraft] = useState<Record<string, string>>({});

  const queueQ = useQuery({ queryKey: ['radiology', 'preparation'], queryFn: () => radApi.getPreparation() });
  const orders: any[] = queueQ.data?.orders || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['radiology'] });

  const prepMut = useMutation({
    mutationFn: ({ id, ...b }: any) => radApi.updatePreparation(id, b),
    onSuccess: () => { invalidate(); },
    onError: (e: any) => toast.error(errMessage(e, 'Failed to update preparation')),
  });

  const mergedChecklist = (o: any): { item: string; done: boolean }[] => {
    const stored: any[] = o.preparation?.checklist || [];
    const defaults = prepChecklistFor(o.modality);
    const items: { item: string; done: boolean }[] = [];
    for (const d of defaults) {
      const hit = stored.find((s: any) => s.item === d);
      items.push({ item: d, done: Boolean(hit?.done) });
    }
    for (const s of stored) {
      if (!items.some((i: string) => i.item === s.item)) items.push({ item: s.item, done: Boolean(s.done) });
    }
    return items;
  };

  const toggleItem = (o: any, item: string, done: boolean) => {
    const list = mergedChecklist(o).map((i: any) => (i.item === item ? { item: i.item, done } : { item: i.item, done: i.done }));
    prepMut.mutate({ id: o._id, checklist: list });
  };

  const addMissing = (o: any, text: string) => {
    const t = text.trim();
    if (!t) return;
    const next = [...(o.preparation?.missingInfo || []), t];
    prepMut.mutate({ id: o._id, missingInfo: next });
    setMissingDraft((d: any) => ({ ...d, [o._id]: '' }));
  };

  const removeMissing = (o: any, idx: number) => {
    const next = (o.preparation?.missingInfo || []).filter((_: any, i: number) => i !== idx);
    prepMut.mutate({ id: o._id, missingInfo: next });
  };

  const setConsent = (o: any, consentTaken: boolean) => prepMut.mutate({ id: o._id, consentTaken });

  const markReady = (o: any) => {
    const list = mergedChecklist(o);
    const allDone = list.every((i: any) => i.done);
    if (!allDone) { toast.error('Complete every checklist item before marking ready'); return; }
    prepMut.mutate({ id: o._id, ready: true, hold: false });
    toast.success(`${o.patientName} marked Ready for Imaging`);
  };

  const stats = {
    total: orders.length,
    hold: orders.filter((o: any) => o.preparation?.hold).length,
    consent: orders.filter((o: any) => o.preparation?.consentTaken).length,
    missing: orders.filter((o: any) => (o.preparation?.missingInfo || []).length > 0).length,
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Preparation & Clearance Queue</h1>
          <p className="page-subtitle">{stats.total} patients awaiting pre-imaging preparation</p>
        </div>
        <Button variant="outline" onClick={() => nav('/radiology/scheduling')}>Scheduling Calendar</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { l: 'In Queue', v: stats.total, c: 'text-foreground' },
          { l: 'On Hold', v: stats.hold, c: 'text-destructive' },
          { l: 'Consent Taken', v: stats.consent, c: 'text-success' },
          { l: 'Missing Info', v: stats.missing, c: 'text-warning' },
        ].map((s: any) => (
          <div key={s.l} className="bg-card rounded-xl border p-4 text-center">
            <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {orders.map((o: any) => {
          const isOpen = expanded === o._id;
          const list = mergedChecklist(o);
          const doneCount = list.filter((i: any) => i.done).length;
          const missing: string[] = o.preparation?.missingInfo || [];
          return (
            <div key={o._id} className="bg-card rounded-xl border shadow-sm">
              <div className="p-4 cursor-pointer flex items-center gap-3" onClick={() => setExpanded(isOpen ? null : o._id)}>
                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <ModalityBadge value={o.modality} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{patientNameOf(o.patientId || o)}</p>
                  <p className="text-xs text-muted-foreground truncate">{o.orderId} · {o.bodyPart} · {fmtDateTime(o.createdAt)}</p>
                </div>
                <PriorityBadge value={o.priority} />
                <span className="text-xs font-semibold text-muted-foreground">{doneCount}/{list.length}</span>
                {o.preparation?.hold && <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-destructive/10 text-destructive">On Hold</span>}
                {o.preparation?.consentTaken && <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600">Consent</span>}
                {String(o.preparation?.holdReason || '').startsWith('Escalated') && (
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 inline-flex items-center"><Siren className="w-3 h-3 mr-0.5" />Escalated</span>
                )}
                <StatusBadge value={o.status} />
              </div>

              {isOpen && (
                <div className="px-4 pb-4 border-t pt-4 space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> {o.modality} checklist</p>
                      <ul className="space-y-2">
                        {list.map((i: any) => (
                          <li key={i.item} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={i.done} disabled={prepMut.isPending}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleItem(o, i.item, e.target.checked)}
                              className="rounded text-emerald-600 w-4 h-4" />
                            <span className={i.done ? 'line-through text-muted-foreground' : ''}>{i.item}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.round((doneCount / (list.length || 1)) * 100)}%` }} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Consent</p>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={Boolean(o.preparation?.consentTaken)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConsent(o, e.target.checked)} className="rounded text-emerald-600 w-4 h-4" />
                          Informed consent taken
                        </label>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Missing information</p>
                        <ul className="space-y-1 mb-2">
                          {missing.map((m: string, i: number) => (
                            <li key={i} className="flex items-center justify-between text-sm bg-amber-500/10 rounded px-2 py-1">
                              <span>{m}</span>
                              <button onClick={() => removeMissing(o, i)} type="button"><X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" /></button>
                            </li>
                          ))}
                        </ul>
                        <div className="flex gap-2">
                          <Input placeholder="Add missing item..." className="h-9" value={missingDraft[o._id] || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMissingDraft((d: any) => ({ ...d, [o._id]: e.target.value }))} />
                          <Button size="sm" variant="outline" className="h-9" onClick={() => addMissing(o, missingDraft[o._id] || '')}><Plus className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                      {o.preparation?.hold && (
                        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                          <p className="text-xs font-semibold text-destructive mb-1">Hold reason</p>
                          <p className="text-sm">{o.preparation.holdReason || 'No reason recorded'}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button size="sm" variant="outline" className="text-amber-600" onClick={() => { setEscalateTarget(o); setEscalateNote(''); }}>
                      <Siren className="w-3.5 h-3.5 mr-1" /> Escalate
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setHoldTarget(o); setHoldReason(''); }}>
                      <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Hold
                    </Button>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => markReady(o)} disabled={prepMut.isPending}>
                      <ThumbsUp className="w-3.5 h-3.5 mr-1" /> Mark Ready for Imaging
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!queueQ.isLoading && orders.length === 0 && (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
            <CheckCircle2 className="w-12 h-12 text-emerald-500/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Preparation queue is clear</p>
          </div>
        )}
        {queueQ.isLoading && <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}
      </div>

      <Modal open={Boolean(holdTarget)} onClose={() => setHoldTarget(null)} title="Put Study On Hold">
        <form onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          prepMut.mutate({ id: holdTarget._id, hold: true, holdReason });
          toast.success('Study placed on hold');
          setHoldTarget(null);
        }} className="space-y-4 text-sm">
          <p className="text-xs text-muted-foreground">{holdTarget?.orderId} · {holdTarget?.patientName}</p>
          <Field label="Reason *">
            <textarea required className={textareaCls} value={holdReason} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setHoldReason(e.target.value)} placeholder="e.g. Patient not fasting, renal report missing..." />
          </Field>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setHoldTarget(null)}>Cancel</Button>
            <Button type="submit" variant="destructive">Place Hold</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(escalateTarget)} onClose={() => setEscalateTarget(null)} title="Escalate to Radiologist">
        <form onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          prepMut.mutate({ id: escalateTarget._id, hold: true, holdReason: `Escalated: ${escalateNote}` });
          toast.success('Escalation noted — study held for radiologist review');
          setEscalateTarget(null);
        }} className="space-y-4 text-sm">
          <p className="text-xs text-muted-foreground">{escalateTarget?.orderId} · {escalateTarget?.patientName} · {escalateTarget?.modality}</p>
          <Field label="Escalation note *">
            <textarea required className={textareaCls} value={escalateNote} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEscalateNote(e.target.value)} placeholder="e.g. eGFR 24 — clarify contrast plan with radiologist" />
          </Field>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setEscalateTarget(null)}>Cancel</Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white"><Siren className="w-4 h-4 mr-1" /> Escalate</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
