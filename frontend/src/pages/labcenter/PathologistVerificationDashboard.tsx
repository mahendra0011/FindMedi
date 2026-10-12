import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Microscope, CheckCircle2, AlertTriangle, Search,
  FileCheck, ShieldCheck, RotateCcw, Printer, ChevronRight, AlertCircle, History, XCircle, PhoneCall, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const VERIFICATION_PENDING = ['Verification Pending', 'Under Verification', 'Result Pending'];

const modalClass = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4';

const fmt = (v?: string | null) => (v === undefined || v === null || v === '' ? '—' : String(v));
const timeAgo = (iso?: string | null) => {
  if (!iso) return '—';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return new Date(iso).toLocaleDateString();
};

export const PathologistVerificationDashboard: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [queueFilter, setQueueFilter] = useState<'All' | 'Critical' | 'Corrected'>('All');
  const [selectedId, setSelectedId] = useState<string>('');
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [correctDlg, setCorrectDlg] = useState<any | null>(null);
  const [correctForm, setCorrectForm] = useState<any>({ reason: '', testIndex: '', resultValue: '', notes: '' });
  const [versionsOrder, setVersionsOrder] = useState<any | null>(null);
  const [callbackDlg, setCallbackDlg] = useState<any | null>(null);
  const [callbackForm, setCallbackForm] = useState<any>({ testName: '', calledTo: '', notes: '' });
  const [returnDlg, setReturnDlg] = useState<any | null>(null);
  const [returnForm, setReturnForm] = useState<any>({ testIndex: '', notes: '' });

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['lab-orders', 'verification'],
    queryFn: () => api.getLabOrders({}),
  });
  const { data: versionsData, isFetching: versionsLoading } = useQuery({
    queryKey: ['lab-versions', versionsOrder?._id],
    queryFn: () => api.getReportVersions(versionsOrder._id),
    enabled: Boolean(versionsOrder?._id),
  });

  const allOrders: any[] = useMemo(() => ordersData?.orders || [], [ordersData]);

  const pending = allOrders.filter((o: any) =>
    VERIFICATION_PENDING.includes(o.status) ||
    (o.status !== 'Cancelled' && o.status !== 'Finalized' && o.status !== 'Report Delivered' &&
      (o.tests || []).some((t: any) => t.status === 'Completed')))
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const criticalOrders = allOrders.filter((o: any) =>
    (o.tests || []).some((t: any) => t.isCritical && !['Verified', 'Report Delivered'].includes(t.status)));
  const correctedOrders = allOrders.filter((o: any) => Number(o.reportVersion || 1) > 1 || (o.reportVersions || []).length > 0);

  const depts = useMemo(() => {
    const set = new Set<string>();
    pending.forEach((o: any) => (o.tests || []).forEach((t: any) => { if (t.section) set.add(t.section); }));
    return ['All', ...Array.from(set)];
  }, [pending]);

  const filtered = pending.filter(r => {
    const hay = `${r.patientName} ${r.orderId} ${(r.tests || []).map((t: any) => t.testName).join(' ')}`.toLowerCase();
    const matchSearch = hay.includes(search.toLowerCase());
    const matchDept = selectedDept === 'All' || (r.tests || []).some((t: any) => t.section === selectedDept);
    const matchFilter = queueFilter === 'All'
      || (queueFilter === 'Critical' && criticalOrders.some(c => c._id === r._id))
      || (queueFilter === 'Corrected' && correctedOrders.some(c => c._id === r._id));
    return matchSearch && matchDept && matchFilter;
  });

  const activeResult = filtered.find(r => r._id === selectedId) || filtered[0] || null;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['lab-orders'] });
    qc.invalidateQueries({ queryKey: ['lab-stats'] });
    qc.invalidateQueries({ queryKey: ['lab-versions'] });
  };

  const verifyMut = useMutation({
    mutationFn: ({ id, body }: any) => api.verifyLabResult(id, body),
    onSuccess: () => { invalidate(); },
    onError: (e: any) => toast.error(e?.message || 'Verification failed (separation of duties may apply)'),
  });
  const finalizeMut = useMutation({
    mutationFn: (id: string) => api.finalizeLabOrder(id),
    onSuccess: () => { toast.success('Report finalized & released'); invalidate(); },
    onError: (e: any) => toast.error(e?.message || 'Finalize failed'),
  });
  const correctMut = useMutation({
    mutationFn: ({ id, body }: any) => api.correctLabReport(id, body),
    onSuccess: () => { toast.success('Correction recorded — report version incremented'); setCorrectDlg(null); invalidate(); },
    onError: (e: any) => toast.error(e?.message || 'Correction failed'),
  });
  const callbackMut = useMutation({
    mutationFn: ({ id, body }: any) => api.labCallback(id, body),
    onSuccess: () => { toast.success('Critical callback logged'); setCallbackDlg(null); invalidate(); },
    onError: (e: any) => toast.error(e?.message || 'Callback log failed'),
  });

  const signOffAll = async (order: any) => {
    const notes = notesMap[order._id] || '';
    const targets = (order.tests || []).map((t: any, i: number) => ({ t, i })).filter((r: any) => r.t.status === 'Completed');
    if (!targets.length) { toast.error('No results awaiting verification on this order'); return; }
    for (const r of targets) {
      await verifyMut.mutateAsync({ id: order._id, body: { testIndex: r.i, approved: true, notes } });
    }
    toast.success(`Signed off ${targets.length} result(s) for ${order.orderId}`);
    setSelectedId('');
  };

  const returnForCorrection = async () => {
    const idx = returnForm.testIndex === '' ? null : Number(returnForm.testIndex);
    const targets = idx === null
      ? (returnDlg.tests || []).map((t: any, i: number) => ({ t, i })).filter((r: any) => r.t.status === 'Completed')
      : [{ i: idx }];
    for (const r of targets) {
      await verifyMut.mutateAsync({ id: returnDlg._id, body: { testIndex: r.i, approved: false, notes: returnForm.notes } });
    }
    toast.error(`Returned ${targets.length} result(s) to the workbench for correction`);
    setReturnDlg(null);
    setSelectedId('');
    invalidate();
  };

  const openCorrect = (order: any) => {
    setCorrectForm({ reason: '', testIndex: '', resultValue: (order.tests || [])[0]?.resultValue || '', notes: '' });
    setCorrectDlg(order);
  };

  const signedToday = allOrders.reduce((n, o: any) =>
    n + (o.tests || []).filter((t: any) => t.verifiedAt && new Date(t.verifiedAt).toDateString() === new Date().toDateString()).length, 0);

  const tatSamples = allOrders.flatMap((o: any) => (o.tests || [])
    .filter((t: any) => t.verifiedAt && t.resultEnteredAt)
    .map((t: any) => (new Date(t.verifiedAt).getTime() - new Date(t.resultEnteredAt).getTime()) / 60000));
  const avgTat = tatSamples.length
    ? `${Math.round(tatSamples.reduce((a, b) => a + b, 0) / tatSamples.length)} mins`
    : '—';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-2xl">
            <Microscope className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pathologist Verification & Sign-Off Desk</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">LIMS Medical Desk</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Review, delta checks, panic escalation & authorized digital signatures
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            {criticalOrders.length} Critical {criticalOrders.length === 1 ? 'Result' : 'Results'} Pending
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Awaiting Sign-Off</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{pending.length}</p>
          <span className="text-xs text-slate-400">Orders in queue</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Panic / Critical Flags</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{criticalOrders.length}</p>
          <span className="text-xs text-rose-500 font-medium">Immediate call required</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Signed Today</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{signedToday}</p>
          <span className="text-xs text-slate-400">Results released</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">Avg Verification TAT</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{avgTat}</p>
          <span className="text-xs text-emerald-600 font-medium">Entry → sign-off</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <Input placeholder="Search patient, order..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl" />
            </div>
            <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
              className="text-xs font-medium px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              {depts.map(d => <option key={d} value={d}>{d === 'All' ? 'All Depts' : d}</option>)}
            </select>
          </div>

          <div className="flex gap-1.5">
            {(['All', 'Critical', 'Corrected'] as const).map(f => (
              <button key={f} onClick={() => setQueueFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${queueFilter === f ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'}`}>
                {f}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filtered.map(r => {
              const isCritical = criticalOrders.some(c => c._id === r._id);
              const isCorrected = correctedOrders.some(c => c._id === r._id);
              return (
                <div key={r._id} onClick={() => setSelectedId(r._id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    activeResult?._id === r._id
                      ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500">{(r.tests || []).map((t: any) => t.section).filter(Boolean)[0] || r.status}</span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{r.patientName}</h3>
                      <p className="text-xs text-slate-500">{r.orderId} · {(r.tests || []).length} test(s)</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isCritical && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 animate-pulse">PANIC</span>
                      )}
                      {isCorrected && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-700">v{r.reportVersion || 1}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-10">No pending reports in this department</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {activeResult ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{(activeResult.tests || []).map((t: any) => t.testName).join(', ')}</h2>
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{activeResult.orderId}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Patient: <strong className="text-slate-800 dark:text-slate-200">{activeResult.patientName}</strong> ·
                    Ref: {activeResult.doctorName || '—'} · Placed: {timeAgo(activeResult.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => { setReturnForm({ testIndex: '', notes: '' }); setReturnDlg(activeResult); }}
                    className="text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs">
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Return for Correction
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openCorrect(activeResult)} className="text-xs">
                    <FileCheck className="w-3.5 h-3.5 mr-1" /> Correct Report
                  </Button>
                  <Button size="sm" onClick={() => signOffAll(activeResult)} disabled={verifyMut.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verify & Sign
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => finalizeMut.mutate(activeResult._id)} disabled={finalizeMut.isPending}
                    className="text-xs">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Finalize
                  </Button>
                </div>
              </div>

              <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Parameter</th>
                      <th className="py-3 px-4">Result Value</th>
                      <th className="py-3 px-4">Unit</th>
                      <th className="py-3 px-4">Biological Reference Range</th>
                      <th className="py-3 px-4 text-center">Status Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(activeResult.tests || []).map((p: any, i: number) => {
                      const range = p.normalRange || (p.refLow !== null && p.refLow !== undefined ? `${p.refLow} - ${p.refHigh}` : '—');
                      const flagLabel = p.isCritical ? 'PANIC' : p.flag === 'H' || p.flag === 'HH' ? 'HIGH' : p.flag === 'L' || p.flag === 'LL' ? 'LOW' : p.resultValue ? 'NORMAL' : '';
                      return (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{p.testName}</td>
                          <td className="py-3 px-4 font-black text-slate-900 dark:text-white text-base">{fmt(p.resultValue)}</td>
                          <td className="py-3 px-4 text-slate-500 text-xs">{fmt(p.unit)}</td>
                          <td className="py-3 px-4 text-slate-500 text-xs">{range}</td>
                          <td className="py-3 px-4 text-center">
                            {flagLabel === 'PANIC' && <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700">PANIC</span>}
                            {flagLabel === 'HIGH' && <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">HIGH ↑</span>}
                            {flagLabel === 'LOW' && <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">LOW ↓</span>}
                            {flagLabel === 'NORMAL' && <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">Normal</span>}
                            {flagLabel === '' && <span className="text-xs text-slate-400">Pending</span>}
                            {p.isCritical && (
                              <button onClick={() => { setCallbackForm({ testName: p.testName, calledTo: '', notes: '' }); setCallbackDlg(activeResult); }}
                                className="block mx-auto mt-1 text-[10px] font-bold text-rose-600 underline">
                                Log callback
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                  Pathologist Interpretation & Microscopic Notes
                </label>
                <textarea rows={3} value={notesMap[activeResult._id] || ''}
                  onChange={e => setNotesMap(m => ({ ...m, [activeResult._id]: e.target.value }))}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Add microscopic findings, correlation advice or follow-up recommendation..." />
              </div>

              <div className="flex items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-500 flex-wrap">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>NABL ISO 15189:2022 Quality Assured Laboratory Protocol</span>
                </div>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-1 text-slate-600 hover:text-emerald-600" onClick={() => setVersionsOrder(activeResult)}>
                    <History className="w-4 h-4" /> Version history (v{activeResult.reportVersion || 1})
                  </button>
                  <button className="flex items-center gap-1 text-slate-600 hover:text-emerald-600" onClick={() => window.print()}>
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <span>Authorized Signatory: <strong>{activeResult.verifiedByRole || 'Pathologist on call'}</strong></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="text-slate-400 text-sm">Select a test from the queue to review results</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <h2 className="font-bold text-slate-900 dark:text-white">Critical results</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">{criticalOrders.length}</span>
          </div>
          {criticalOrders.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No critical results pending</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {criticalOrders.map(o => (
                <div key={o._id} className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{o.patientName}</p>
                    <p className="text-xs text-slate-500">
                      {o.orderId} · {(o.tests || []).filter((t: any) => t.isCritical).map((t: any) => `${t.testName}=${fmt(t.resultValue)}${t.unit ? ' ' + t.unit : ''}`).join(', ')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => { setCallbackForm({ testName: (o.tests || []).find((t: any) => t.isCritical)?.testName || '', calledTo: '', notes: '' }); setCallbackDlg(o); }}>
                      <PhoneCall className="w-3.5 h-3.5 mr-1" /> Log call
                    </Button>
                    <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => setSelectedId(o._id)}>
                      Review <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-slate-900 dark:text-white">Corrected reports awaiting review</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">{correctedOrders.length}</span>
          </div>
          {correctedOrders.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No amended reports</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {correctedOrders.map(o => (
                <div key={o._id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{o.patientName}</p>
                    <p className="text-xs text-slate-500">{o.orderId} · v{o.reportVersion || 1} · {(o.reportVersions || []).length} snapshot(s)</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setVersionsOrder(o)}>
                      <History className="w-3.5 h-3.5 mr-1" /> Versions
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => openCorrect(o)}>
                      <FileCheck className="w-3.5 h-3.5 mr-1" /> Correct
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {returnDlg && (
        <div className={modalClass} onClick={() => setReturnDlg(null)}>
          <div className="bg-card rounded-2xl border p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><RotateCcw className="w-5 h-5 text-amber-600" /></div>
              <div>
                <h3 className="font-semibold text-foreground">Return for correction</h3>
                <p className="text-xs text-muted-foreground font-mono">{returnDlg.orderId}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Result line</label>
                <select value={returnForm.testIndex} onChange={e => setReturnForm((f: any) => ({ ...f, testIndex: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  <option value="">All pending lines</option>
                  {(returnDlg.tests || []).map((t: any, i: number) => (
                    <option key={i} value={String(i)}>{t.testName} ({t.status})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Reason for the technician</label>
                <textarea rows={3} value={returnForm.notes} onChange={e => setReturnForm((f: any) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Re-run, dilution, repeat smear..." />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setReturnDlg(null)}>Cancel</Button>
                <Button className="flex-1" disabled={verifyMut.isPending} onClick={returnForCorrection}>Return</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {correctDlg && (
        <div className={modalClass} onClick={() => setCorrectDlg(null)}>
          <div className="bg-card rounded-2xl border p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><FileCheck className="w-5 h-5 text-primary" /></div>
              <div>
                <h3 className="font-semibold text-foreground">Correct report</h3>
                <p className="text-xs text-muted-foreground font-mono">{correctDlg.orderId} · v{correctDlg.reportVersion || 1}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Correction reason *</label>
                <input value={correctForm.reason} onChange={e => setCorrectForm((f: any) => ({ ...f, reason: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" placeholder="Transcription error in report..." />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Test line (optional)</label>
                <select value={correctForm.testIndex} onChange={e => {
                  const i = e.target.value;
                  setCorrectForm((f: any) => ({ ...f, testIndex: i, resultValue: i === '' ? '' : (correctDlg.tests || [])[Number(i)]?.resultValue || '' }));
                }} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  <option value="">Report text only</option>
                  {(correctDlg.tests || []).map((t: any, i: number) => <option key={i} value={String(i)}>{t.testName}</option>)}
                </select>
              </div>
              {correctForm.testIndex !== '' && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Corrected value</label>
                  <input value={correctForm.resultValue} onChange={e => setCorrectForm((f: any) => ({ ...f, resultValue: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm font-mono" />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Notes</label>
                <textarea rows={2} value={correctForm.notes} onChange={e => setCorrectForm((f: any) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <p className="text-xs text-muted-foreground">A new report version is stored and the corrected line goes back to verification.</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setCorrectDlg(null)}>Cancel</Button>
                <Button className="flex-1" disabled={correctMut.isPending || correctForm.reason.trim().length < 3}
                  onClick={() => {
                    const body: any = { reason: correctForm.reason, notes: correctForm.notes };
                    if (correctForm.testIndex !== '') { body.testIndex = Number(correctForm.testIndex); body.resultValue = correctForm.resultValue; }
                    correctMut.mutate({ id: correctDlg._id, body });
                  }}>
                  {correctMut.isPending ? 'Saving...' : 'Apply correction'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {callbackDlg && (
        <div className={modalClass} onClick={() => setCallbackDlg(null)}>
          <div className="bg-card rounded-2xl border p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center"><PhoneCall className="w-5 h-5 text-rose-600" /></div>
              <div>
                <h3 className="font-semibold text-foreground">Log critical callback</h3>
                <p className="text-xs text-muted-foreground font-mono">{callbackDlg.orderId}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Test</label>
                <select value={callbackForm.testName} onChange={e => setCallbackForm((f: any) => ({ ...f, testName: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  <option value="">Select test...</option>
                  {(callbackDlg.tests || []).map((t: any, i: number) => <option key={i} value={t.testName}>{t.testName}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Called to *</label>
                <input value={callbackForm.calledTo} onChange={e => setCallbackForm((f: any) => ({ ...f, calledTo: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" placeholder="Dr. ... / ICU / phone" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Notes</label>
                <textarea rows={2} value={callbackForm.notes} onChange={e => setCallbackForm((f: any) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setCallbackDlg(null)}>Cancel</Button>
                <Button className="flex-1" disabled={callbackMut.isPending || !callbackForm.testName || !callbackForm.calledTo}
                  onClick={() => callbackMut.mutate({ id: callbackDlg._id, body: callbackForm })}>
                  Log callback
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {versionsOrder && (
        <div className={modalClass} onClick={() => setVersionsOrder(null)}>
          <div className="bg-card rounded-2xl border p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><History className="w-5 h-5 text-primary" /></div>
                <div>
                  <h3 className="font-semibold text-foreground">Report version history</h3>
                  <p className="text-xs text-muted-foreground font-mono">{versionsOrder.orderId}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setVersionsOrder(null)}><XCircle className="w-4 h-4" /></Button>
            </div>
            {versionsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-3">
                {((versionsData as any)?.versions || []).length === 0 && (
                  <p className="text-sm text-muted-foreground py-6 text-center">No version snapshots yet — finalize the report to create one.</p>
                )}
                {((versionsData as any)?.versions || []).map((v: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl border border-border/60 bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-foreground">Version {v.version} · {v.status || '—'}</span>
                      <span className="text-xs text-muted-foreground">{v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2"><b>Reason:</b> {v.reason || '—'}</p>
                    <div className="space-y-1">
                      {(Array.isArray(v.content) ? v.content : []).map((c: any, j: number) => (
                        <div key={j} className="flex flex-wrap gap-2 text-xs bg-background rounded-lg px-3 py-2 border border-border/50">
                          <span className="font-semibold text-foreground">{c.testName}</span>
                          <span className="font-mono">{fmt(c.resultValue)} {c.unit || ''}</span>
                          <span className="text-muted-foreground">{fmt(c.normalRange)}</span>
                          {c.flag && <span className="font-bold text-amber-600">{c.flag}</span>}
                          <span className="text-muted-foreground ml-auto">{c.verifiedAt ? new Date(c.verifiedAt).toLocaleString() : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PathologistVerificationDashboard;
