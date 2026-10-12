import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Clock, X, Camera, FileText, CheckCircle, Eye, LayoutDashboard, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { radApi } from '@/lib/api';
import PacsDicomViewer from '@/components/radiology/PacsDicomViewer';
import RadiologySafetyScreeningModal from '@/components/radiology/RadiologySafetyScreeningModal';
import RadiologyReportingModal from '@/components/radiology/RadiologyReportingModal';
import { RAD_LINKS, StatusBadge, ModalityBadge, PriorityBadge, errMessage } from '@/components/radiology/radShared';

const modalityColors: Record<string, string> = {
  'X-Ray': 'bg-blue-500/10 text-blue-600',
  MRI: 'bg-purple-500/10 text-purple-600',
  'CT Scan': 'bg-orange-500/10 text-orange-600',
  Ultrasound: 'bg-green-500/10 text-green-600',
  Doppler: 'bg-teal-500/10 text-teal-600',
  Echo: 'bg-red-500/10 text-red-600',
  ECG: 'bg-yellow-500/10 text-yellow-600',
  Mammography: 'bg-pink-500/10 text-pink-600',
};

const statusColors: Record<string, string> = {
  Draft: 'bg-muted text-muted-foreground',
  Ordered: 'bg-primary/10 text-primary',
  'Authorization Pending': 'bg-amber-500/10 text-amber-600',
  'Payment Pending': 'bg-amber-500/10 text-amber-600',
  'Scheduling Pending': 'bg-amber-500/10 text-amber-600',
  Scheduled: 'bg-info/10 text-info',
  'Appointment Confirmed': 'bg-info/10 text-info',
  'Patient Arrived': 'bg-cyan-500/10 text-cyan-600',
  'Preparation Pending': 'bg-amber-500/10 text-amber-600',
  'Ready for Imaging': 'bg-emerald-500/10 text-emerald-600',
  'In Progress': 'bg-warning/10 text-warning',
  Completed: 'bg-success/10 text-success',
  'Study Completed': 'bg-success/10 text-success',
  'Reporting Pending': 'bg-purple-500/10 text-purple-600',
  Reported: 'bg-purple-500/10 text-purple-600',
  'Report Finalized': 'bg-purple-500/10 text-purple-600',
  'Report Released': 'bg-indigo-500/10 text-indigo-600',
  Delivered: 'bg-muted text-muted-foreground',
  'On Hold': 'bg-slate-500/10 text-slate-600',
  Cancelled: 'bg-destructive/10 text-destructive',
};

const ALL_STATUSES = ['Ordered', 'Authorization Pending', 'Payment Pending', 'Scheduling Pending', 'Scheduled', 'Appointment Confirmed', 'Patient Arrived', 'Preparation Pending', 'Ready for Imaging', 'In Progress', 'Completed', 'Study Completed', 'Reporting Pending', 'Reported', 'Report Finalized', 'Report Released', 'Delivered', 'On Hold', 'Cancelled'];

export default function Radiology() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const [modalityFilter, setModalityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeDicomOrder, setActiveDicomOrder] = useState<any>(null);
  const [screeningOrder, setScreeningOrder] = useState<any>(null);
  const [reportingOrder, setReportingOrder] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newOrder, setNewOrder] = useState({ patientName: '', patientId: '', modality: 'X-Ray', bodyPart: '', clinicalHistory: '', priority: 'Routine' });

  const { data, isError, error } = useQuery({
    queryKey: ['radiology', search, modalityFilter, statusFilter],
    queryFn: () => radApi.getOrders({ search, modality: modalityFilter, status: statusFilter }),
  });
  const { data: stats } = useQuery({ queryKey: ['radiology-stats'], queryFn: () => radApi.getStats() });
  const orders: any[] = data?.orders || [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['radiology'] });

  const createMut = useMutation({
    mutationFn: (b: any) => radApi.createOrder(b),
    onSuccess: () => { toast.success('Radiology order created'); invalidate(); setShowCreate(false); },
    onError: (e: any) => toast.error(errMessage(e, 'Failed to create order')),
  });
  const scheduleMut = useMutation({
    mutationFn: ({ id, ...b }: any) => radApi.schedule(id, b),
    onSuccess: () => { toast.success('Order scheduled'); invalidate(); },
    onError: (e: any) => toast.error(errMessage(e, 'Schedule failed')),
  });
  const startMut = useMutation({
    mutationFn: (id: string) => radApi.startScan(id),
    onSuccess: () => { toast.success('Scan started'); invalidate(); },
    onError: (e: any) => toast.error(errMessage(e, 'Failed to start scan')),
  });
  const completeMut = useMutation({
    mutationFn: ({ id, ...b }: any) => radApi.completeScan(id, b),
    onSuccess: () => { toast.success('Scan completed'); invalidate(); },
    onError: (e: any) => toast.error(errMessage(e, 'Failed to complete scan')),
  });
  const reportMut = useMutation({
    mutationFn: ({ id, ...b }: any) => radApi.submitReport(id, b),
    onSuccess: () => { toast.success('Report signed'); invalidate(); setReportingOrder(null); },
    onError: (e: any) => toast.error(errMessage(e, 'Report failed')),
  });
  const screeningMut = useMutation({
    mutationFn: ({ id, ...b }: any) => radApi.saveScreening(id, b),
    onSuccess: () => { toast.success('Screening saved'); invalidate(); setScreeningOrder(null); },
    onError: (e: any) => toast.error(errMessage(e, 'Screening failed')),
  });
  const deliverMut = useMutation({
    mutationFn: (id: string) => radApi.deliver(id),
    onSuccess: () => { toast.success('Report delivered'); invalidate(); },
    onError: (e: any) => toast.error(errMessage(e, 'Deliver failed')),
  });
  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: any) => radApi.cancelOrder(id, { reason }),
    onSuccess: () => { toast.success('Order cancelled'); invalidate(); },
    onError: (e: any) => toast.error(errMessage(e, 'Cancel failed')),
  });

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="page-title">Radiology</h1>
        <p className="page-subtitle">{stats?.total || 0} orders · {stats?.pending || 0} pending</p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        <button onClick={() => nav('/radiology/dashboard')} className="inline-flex items-center h-8 px-3 rounded-lg border text-xs font-medium hover:bg-muted"><LayoutDashboard className="w-3 h-3 mr-1" /> Admin Dashboard</button>
        {RAD_LINKS.filter((l: any) => !['/radiology', '/radiology/dashboard'].includes(l.path)).map((l: any) => (
          <button key={l.path} onClick={() => nav(l.path)} className="h-8 px-3 rounded-lg border text-xs font-medium hover:bg-muted">{l.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {[
          { l: 'Total', v: stats?.total || 0, c: 'text-foreground' },
          { l: 'Pending', v: stats?.pending || 0, c: 'text-warning' },
          { l: 'In Progress', v: stats?.inProgress || 0, c: 'text-info' },
          { l: 'Completed', v: stats?.completed || 0, c: 'text-success' },
          { l: 'Reported', v: stats?.reported || 0, c: 'text-purple-500' },
        ].map(s => (
          <div key={s.l} className="bg-card rounded-xl border p-4 text-center">
            <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      {isError && <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 mb-4 text-sm text-destructive">{errMessage(error, 'Failed to load orders')}</div>}

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select value={modalityFilter} onChange={e => setModalityFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
          <option value="All">All Modalities</option>
          {['X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'Doppler', 'Echo', 'ECG', 'Mammography'].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
          <option value="All">All Status</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Order</Button>
      </div>

      <div className="space-y-4">
        {orders.map((order: any) => {
          const isExpanded = expandedId === order._id;
          return (
            <div key={order._id} className="bg-card rounded-xl border shadow-sm">
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : order._id)}>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${modalityColors[order.modality] || 'bg-muted'}`}>{order.modality}</span>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{order.patientName}</p>
                    <p className="text-xs text-muted-foreground">{order.bodyPart} · Dr. {order.doctorName}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status] || 'bg-muted text-muted-foreground'}`}>{order.status}</span>
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 border-t pt-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Order ID</span><p className="font-medium">{order.orderId}</p></div>
                    <div><span className="text-muted-foreground">Body Part</span><p className="font-medium">{order.bodyPart}</p></div>
                    <div><span className="text-muted-foreground">Priority</span><p><PriorityBadge value={order.priority} /></p></div>
                    {order.scheduledAt && <div><span className="text-muted-foreground">Scheduled</span><p className="font-medium">{new Date(order.scheduledAt).toLocaleString()}</p></div>}
                    {order.performedBy && <div><span className="text-muted-foreground">Performed By</span><p className="font-medium">{order.performedBy}</p></div>}
                    {order.studyNumber && <div><span className="text-muted-foreground">Study No</span><p className="font-mono text-xs">{order.studyNumber}</p></div>}
                    {order.reportNumber && <div><span className="text-muted-foreground">Report No</span><p className="font-mono text-xs">{order.reportNumber}</p></div>}
                  </div>
                  {order.clinicalHistory && <div className="bg-muted/30 rounded-lg p-2"><p className="text-xs text-muted-foreground">History: {order.clinicalHistory}</p></div>}
                  {order.findings && (
                    <div className="bg-purple-500/5 rounded-lg p-3 border border-purple-500/20 space-y-2">
                      {order.findings && <div><p className="text-xs font-semibold text-purple-600">Findings</p><p className="text-sm">{order.findings}</p></div>}
                      {order.impression && <div><p className="text-xs font-semibold text-purple-600">Impression</p><p className="text-sm">{order.impression}</p></div>}
                      {(order.reportVersions?.length || 0) > 0 && <p className="text-[11px] text-muted-foreground">{order.reportVersions.length} previous version(s) archived</p>}
                      <p className="text-xs text-muted-foreground">Reported: {order.reportedAt ? new Date(order.reportedAt).toLocaleString() : '-'}</p>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setActiveDicomOrder(order)}
                      className="bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20"
                    >
                      <Eye className="w-3 h-3 mr-1" /> Open PACS DICOM Viewer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setScreeningOrder(order)}
                      className="text-xs border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    >
                      {order.safetyScreening?.clearedForScan ? 'Screening Verified' : 'Safety & Consent Checklist'}
                    </Button>
                    {['Ordered', 'Scheduling Pending', 'Payment Pending', 'Authorization Pending'].includes(order.status) && (
                      <Button size="sm" variant="outline" onClick={() => { const d = prompt('Schedule date (YYYY-MM-DD HH:mm):'); if (d) scheduleMut.mutate({ id: order._id, scheduledAt: new Date(d).toISOString() }); }}>
                        <Clock className="w-3 h-3 mr-1" /> Schedule
                      </Button>
                    )}
                    {['Scheduled', 'Appointment Confirmed', 'Patient Arrived', 'Ready for Imaging'].includes(order.status) && (
                      <Button size="sm" variant="outline" onClick={() => startMut.mutate(order._id)}>
                        <Camera className="w-3 h-3 mr-1" /> Start Scan
                      </Button>
                    )}
                    {order.status === 'In Progress' && (
                      <Button size="sm" variant="outline" onClick={() => completeMut.mutate({ id: order._id })}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Complete Scan
                      </Button>
                    )}
                    {['Completed', 'Study Completed'].includes(order.status) && (
                      <Button size="sm" variant="outline" onClick={() => setReportingOrder(order)}>
                        <FileText className="w-3 h-3 mr-1" /> Submit Report
                      </Button>
                    )}
                    {order.status === 'Reporting Pending' && (
                      <Button size="sm" variant="outline" onClick={() => setReportingOrder(order)}>
                        <FileText className="w-3 h-3 mr-1" /> Sign Report
                      </Button>
                    )}
                    {['Reported', 'Report Finalized', 'Report Released'].includes(order.status) && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setReportingOrder(order)}>
                          <FileText className="w-3 h-3 mr-1" /> Amend / Addendum
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deliverMut.mutate(order._id)}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Deliver Report
                        </Button>
                      </>
                    )}
                    {!['Delivered', 'Cancelled'].includes(order.status) && (
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => { const r = prompt('Cancellation reason:'); if (r) cancelMut.mutate({ id: order._id, reason: r }); }}>
                        <Ban className="w-3 h-3 mr-1" /> Cancel
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {orders.length === 0 && <div className="text-center py-20"><Camera className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No radiology orders</p></div>}
      </div>

      {/* Fullscreen PACS DICOM Viewer Modal */}
      {activeDicomOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="max-w-6xl w-full">
            <PacsDicomViewer
              orderId={activeDicomOrder.orderId}
              patientName={activeDicomOrder.patientName}
              modality={activeDicomOrder.modality}
              bodyPart={activeDicomOrder.bodyPart}
              imageUrl={activeDicomOrder.imageUrls?.[0] || undefined}
              onClose={() => setActiveDicomOrder(null)}
            />
          </div>
        </div>
      )}

      {/* Safety & Pre-Scan Screening Modal */}
      {screeningOrder && (
        <RadiologySafetyScreeningModal
          order={screeningOrder}
          onClose={() => setScreeningOrder(null)}
          onSave={(b) => screeningMut.mutate({ id: screeningOrder._id, ...b })}
        />
      )}

      {/* Structured Reporting Modal (Voice & Addendums) */}
      {reportingOrder && (
        <RadiologyReportingModal
          order={reportingOrder}
          onClose={() => setReportingOrder(null)}
          onSubmit={(b) => reportMut.mutate({ id: reportingOrder._id, ...b })}
        />
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">New Radiology Order</h2><button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1 block">Patient ID *</label><Input value={newOrder.patientId} onChange={e => setNewOrder({ ...newOrder, patientId: e.target.value })} placeholder="Patient user id" /></div>
              <div><label className="text-sm font-medium mb-1 block">Patient Name *</label><Input value={newOrder.patientName} onChange={e => setNewOrder({ ...newOrder, patientName: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1 block">Modality</label><select value={newOrder.modality} onChange={e => setNewOrder({ ...newOrder, modality: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'Doppler', 'Echo', 'ECG', 'Mammography'].map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                <div><label className="text-sm font-medium mb-1 block">Priority</label><select value={newOrder.priority} onChange={e => setNewOrder({ ...newOrder, priority: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['Routine', 'Urgent', 'STAT'].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Body Part *</label><Input value={newOrder.bodyPart} onChange={e => setNewOrder({ ...newOrder, bodyPart: e.target.value })} placeholder="e.g. Chest, Brain, Abdomen..." /></div>
              <div><label className="text-sm font-medium mb-1 block">Clinical History</label><textarea value={newOrder.clinicalHistory} onChange={e => setNewOrder({ ...newOrder, clinicalHistory: e.target.value })} className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
              <Button className="w-full" onClick={() => createMut.mutate(newOrder)} disabled={createMut.isPending || !newOrder.patientName || !newOrder.patientId || !newOrder.bodyPart}>Create Order</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
