import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity, Camera, Eye, Link2, RefreshCw, Search, Server, Wifi, WifiOff,
  CheckCircle2, AlertTriangle, Unlink, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { radApi } from '@/lib/api';
import PacsDicomViewer from '@/components/radiology/PacsDicomViewer';
import {
  Modal, Field, StatCard, StatusBadge, ModalityBadge, errMessage, patientNameOf, fmtDateTime,
} from '@/components/radiology/radShared';

const STUDY_CANDIDATE_MAX = 25;

export default function PacsDashboard() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [tab, setTab] = useState<'studies' | 'worklist'>('studies');
  const [search, setSearch] = useState('');
  const [linkTarget, setLinkTarget] = useState<any>(null);
  const [studyUid, setStudyUid] = useState('');
  const [viewerOrder, setViewerOrder] = useState<any>(null);

  const pingQ = useQuery({ queryKey: ['radiology', 'dicom', 'ping'], queryFn: () => radApi.dicomPing(), retry: false });
  const ordersQ = useQuery({ queryKey: ['radiology', 'orders', 'pacs'], queryFn: () => radApi.getOrders({}) });
  const worklistQ = useQuery({
    queryKey: ['radiology', 'dicom', 'worklist'],
    queryFn: () => radApi.dicomWorklist({}),
    retry: false,
    enabled: tab === 'worklist',
  });

  const orders: any[] = ordersQ.data?.orders || [];
  const candidates = orders
    .filter((o: any) => o.status !== 'Cancelled')
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, STUDY_CANDIDATE_MAX);

  const studiesQ = useQuery({
    queryKey: ['radiology', 'dicom', 'studies', candidates.map((o: any) => String(o._id)).join(',')],
    queryFn: async () => {
      const results = await Promise.all(candidates.map(async (o: any) => {
        try {
          const r: any = await radApi.dicomStudies(o._id);
          return { order: o, study: r, error: null };
        } catch (e: any) {
          return { order: o, study: null, error: errMessage(e) };
        }
      }));
      return results;
    },
    enabled: candidates.length > 0,
  });

  const rows: any[] = (studiesQ.data || []).map((r: any) => {
    const s = r.study || {};
    const ds = r.order?.dicomStudy || {};
    const studyUidVal = s.studyUid || ds.studyUid || r.order?.studyUid || '';
    const transferStatus = s.transferStatus || ds.transferStatus || '';
    return {
      orderId: String(r.order._id),
      orderNumber: r.order.orderId,
      patientName: r.order.patientName,
      modality: r.order.modality,
      bodyPart: r.order.bodyPart,
      status: r.order.status,
      studyNumber: s.studyNumber || r.order.studyNumber || '',
      studyUid: studyUidVal,
      seriesCount: s.seriesCount ?? ds.seriesCount ?? 0,
      imageCount: s.imageCount ?? (r.order.imageUrls || []).length,
      transferStatus,
      storageStatus: s.storageStatus || ds.storageStatus || '',
      linkedAt: s.linkedAt || ds.linkedAt || null,
      imageUrls: r.order.imageUrls || [],
      order: r.order,
      error: r.error,
    };
  });

  const filtered = rows.filter((r: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return [r.patientName, r.orderNumber, r.studyNumber, r.studyUid, r.modality].some((v: any) => String(v || '').toLowerCase().includes(s));
  });

  const pendingTransfer = filtered.filter((r: any) => ['Pending', 'Transferring'].includes(r.transferStatus)).length;
  const failed = filtered.filter((r: any) => r.transferStatus === 'Failed').length;
  const unlinked = filtered.filter((r: any) => !r.studyUid).length;
  const reachable = Boolean(pingQ.data?.reachable);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['radiology'] });

  const linkMut = useMutation({
    mutationFn: (b: any) => radApi.dicomLink(b),
    onSuccess: () => { toast.success('Study linked to order'); invalidate(); setLinkTarget(null); setStudyUid(''); },
    onError: (e: any) => toast.error(errMessage(e, 'Failed to link study')),
  });
  const retryMut = useMutation({
    mutationFn: (b: any) => radApi.dicomRetry(b),
    onSuccess: () => { toast.success('Transfer retry queued'); invalidate(); },
    onError: (e: any) => toast.error(errMessage(e, 'Retry failed')),
  });
  const viewerMut = useMutation({
    mutationFn: (studyUidVal: string) => radApi.dicomViewerUrl(studyUidVal),
    onSuccess: (res: any) => {
      if (res?.url) window.open(res.url, '_blank');
      else toast.error('No viewer URL returned');
    },
    onError: (e: any) => toast.error(errMessage(e, 'Failed to build viewer URL')),
  });

  const worklist: any[] = worklistQ.data?.studies || [];

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">PACS / DICOM Dashboard</h1>
          <p className="page-subtitle">Study transfer monitoring, PACS worklist mirror and viewer links</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => nav('/radiology/reports')}><Upload className="w-4 h-4 mr-1" /> Report Center</Button>
          <Button variant="outline" onClick={() => { qc.invalidateQueries({ queryKey: ['radiology', 'dicom'] }); toast.success('Refreshed'); }}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Studies" value={filtered.length} tone="text-foreground" />
        <StatCard label="Pending Transfer" value={pendingTransfer} tone="text-amber-600" />
        <StatCard label="Failed" value={failed} tone="text-destructive" />
        <StatCard label="Unlinked" value={unlinked} tone="text-warning" />
        <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
          {reachable ? <Wifi className="w-6 h-6 text-emerald-500" /> : <WifiOff className="w-6 h-6 text-destructive" />}
          <div>
            <p className={`text-sm font-bold ${reachable ? 'text-emerald-600' : 'text-destructive'}`}>{reachable ? 'PACS Online' : 'PACS Offline'}</p>
            <p className="text-[11px] text-muted-foreground">{pingQ.data?.host || 'unknown'}:{pingQ.data?.port || '-'}</p>
          </div>
        </div>
      </div>

      {!reachable && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> PACS (Orthanc) is not reachable — transfers and worklist mirror will fail until connectivity is restored.
        </div>
      )}

      <div className="flex gap-2 border-b pb-2">
        {(['studies', 'worklist'] as const).map((t: string) => (
          <button key={t} onClick={() => setTab(t as any)}
            className={`px-4 h-9 rounded-lg text-sm font-medium capitalize ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
            {t === 'studies' ? 'RIS Studies' : 'PACS Worklist Mirror'}
          </button>
        ))}
      </div>

      {tab === 'studies' && (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search patient / order / UID..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} />
          </div>
          <div className="bg-card rounded-xl border shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  <th className="p-3 font-medium">Study</th>
                  <th className="p-3 font-medium">Patient</th>
                  <th className="p-3 font-medium">Study UID</th>
                  <th className="p-3 font-medium text-right">Series / Images</th>
                  <th className="p-3 font-medium">Transfer</th>
                  <th className="p-3 font-medium">Storage</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any) => (
                  <tr key={r.orderId} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <p className="font-medium">{r.orderNumber}</p>
                      <p className="text-[11px] text-muted-foreground"><ModalityBadge value={r.modality} /> {r.bodyPart}</p>
                      <p className="text-[11px] text-muted-foreground">{r.studyNumber}</p>
                    </td>
                    <td className="p-3">
                      <p>{r.patientName}</p>
                      <p className="text-[11px] text-muted-foreground">{r.status}</p>
                    </td>
                    <td className="p-3">
                      {r.studyUid ? (
                        <p className="font-mono text-[11px] max-w-[200px] truncate" title={r.studyUid}>{r.studyUid}</p>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-semibold inline-flex items-center gap-1"><Unlink className="w-3 h-3" /> Not linked</span>
                      )}
                      {r.linkedAt && <p className="text-[10px] text-muted-foreground">Linked {fmtDateTime(r.linkedAt)}</p>}
                    </td>
                    <td className="p-3 text-right">{r.seriesCount} / {r.imageCount}</td>
                    <td className="p-3">{r.transferStatus ? <StatusBadge value={r.transferStatus} /> : <span className="text-[11px] text-muted-foreground">-</span>}</td>
                    <td className="p-3">{r.storageStatus || '-'}</td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end flex-wrap">
                        {r.transferStatus === 'Failed' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => retryMut.mutate({ orderId: r.orderId })} disabled={retryMut.isPending}>
                            <RefreshCw className="w-3 h-3 mr-1" /> Retry
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setLinkTarget(r.order); setStudyUid(r.studyUid || ''); }}>
                          <Link2 className="w-3 h-3 mr-1" /> {r.studyUid ? 'Re-link' : 'Link'}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!r.studyUid || viewerMut.isPending} onClick={() => viewerMut.mutate(r.studyUid)}>
                          <Eye className="w-3 h-3 mr-1" /> Viewer URL
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs bg-cyan-500/10 text-cyan-600" onClick={() => setViewerOrder(r)}>
                          <Camera className="w-3 h-3 mr-1" /> Open
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-12 text-center text-muted-foreground"><Server className="w-10 h-10 mx-auto mb-2 opacity-30" />No studies found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'worklist' && (
        <div className="bg-card rounded-xl border shadow-sm overflow-x-auto">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-heading font-semibold">C-FIND Worklist (from PACS)</h2>
            <Button size="sm" variant="outline" onClick={() => worklistQ.refetch()}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Query</Button>
          </div>
          {worklistQ.isLoading && <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}
          {worklistQ.isError && (
            <div className="p-6 text-sm text-destructive">{errMessage(worklistQ.error, 'Worklist query failed')} — is the PACS reachable?</div>
          )}
          {worklistQ.data && worklist.length === 0 && <div className="p-10 text-center text-muted-foreground">No studies returned by the PACS worklist</div>}
          {worklist.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b">
                  {Object.keys(worklist[0] || {}).map((k: string) => (
                    <th key={k} className="p-3 font-medium whitespace-nowrap">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {worklist.map((w: any, i: number) => (
                  <tr key={i} className="border-b last:border-0">
                    {Object.keys(worklist[0] || {}).map((k: string) => (
                      <td key={k} className="p-3 whitespace-nowrap">{typeof w[k] === 'object' && w[k] !== null ? JSON.stringify(w[k]) : String(w[k] ?? '-')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Modal open={Boolean(linkTarget)} onClose={() => { setLinkTarget(null); setStudyUid(''); }} title="Link PACS Study to Order">
        <form onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          linkMut.mutate({ orderId: String(linkTarget._id), studyUid: studyUid.trim() });
        }} className="space-y-4 text-sm">
          <p className="text-xs text-muted-foreground">{linkTarget?.orderId} · {linkTarget?.patientName} · {linkTarget?.modality} ({linkTarget?.bodyPart})</p>
          <Field label="Study Instance UID *" hint="Paste the StudyInstanceUID from the PACS / modality console">
            <Input required value={studyUid} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStudyUid(e.target.value)} placeholder="1.2.840.113619.2.55.3..." className="font-mono" />
          </Field>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => { setLinkTarget(null); setStudyUid(''); }}>Cancel</Button>
            <Button type="submit" disabled={linkMut.isPending || !studyUid.trim()}><Link2 className="w-4 h-4 mr-1" /> Link Study</Button>
          </div>
        </form>
      </Modal>

      {viewerOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="max-w-6xl w-full">
            <PacsDicomViewer
              orderId={viewerOrder.orderNumber}
              patientName={viewerOrder.patientName}
              modality={viewerOrder.modality}
              bodyPart={viewerOrder.bodyPart}
              imageUrl={viewerOrder.imageUrls?.[0] || undefined}
              onClose={() => setViewerOrder(null)}
            />
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="bg-card rounded-xl border shadow-sm p-4">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2"><Activity className="w-3.5 h-3.5" /> Transfer log (latest state per study)</p>
          <ul className="space-y-1 text-xs">
            {filtered.slice(0, 8).map((r: any) => (
              <li key={r.orderId} className="flex flex-wrap items-center gap-2 bg-muted/30 rounded px-2 py-1">
                <CheckCircle2 className={`w-3 h-3 ${r.transferStatus === 'Completed' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                <span className="font-medium">{r.orderNumber}</span>
                <span className="text-muted-foreground">→ {r.studyUid ? 'PACS linked' : 'no study'}</span>
                <span className="text-muted-foreground">· {r.transferStatus || 'never transferred'}</span>
                {r.linkedAt && <span className="text-muted-foreground">· {fmtDateTime(r.linkedAt)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
