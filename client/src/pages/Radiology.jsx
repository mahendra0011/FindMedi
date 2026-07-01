import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Clock, X, Camera, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const radApi = {
  getOrders: (p = {}) => api.dispatch(() => Promise.resolve({ orders: [] }), '/radiology/orders?' + new URLSearchParams(p)),
  createOrder: (b) => api.dispatch(() => Promise.resolve({}), '/radiology/orders', { method: 'POST', body: JSON.stringify(b) }),
  schedule: (id, b) => api.dispatch(() => Promise.resolve({}), `/radiology/orders/${id}/schedule`, { method: 'PUT', body: JSON.stringify(b) }),
  startScan: (id) => api.dispatch(() => Promise.resolve({}), `/radiology/orders/${id}/start`, { method: 'PUT' }),
  completeScan: (id, b) => api.dispatch(() => Promise.resolve({}), `/radiology/orders/${id}/complete`, { method: 'PUT', body: JSON.stringify(b) }),
  submitReport: (id, b) => api.dispatch(() => Promise.resolve({}), `/radiology/orders/${id}/report`, { method: 'PUT', body: JSON.stringify(b) }),
  deliver: (id) => api.dispatch(() => Promise.resolve({}), `/radiology/orders/${id}/deliver`, { method: 'PUT' }),
  getStats: () => api.dispatch(() => Promise.resolve({ total: 0, pending: 0, inProgress: 0, completed: 0, reported: 0 }), '/radiology/stats'),
};

const modalityColors = {
  'X-Ray': 'bg-blue-500/10 text-blue-600',
  'MRI': 'bg-purple-500/10 text-purple-600',
  'CT Scan': 'bg-orange-500/10 text-orange-600',
  'Ultrasound': 'bg-green-500/10 text-green-600',
  'Echo': 'bg-red-500/10 text-red-600',
  'ECG': 'bg-yellow-500/10 text-yellow-600',
  'Mammography': 'bg-pink-500/10 text-pink-600',
};

const statusColors = {
  Ordered: 'bg-primary/10 text-primary',
  Scheduled: 'bg-info/10 text-info',
  'In Progress': 'bg-warning/10 text-warning',
  Completed: 'bg-success/10 text-success',
  Reported: 'bg-purple-500/10 text-purple-600',
  Delivered: 'bg-muted text-muted-foreground',
};

export default function Radiology() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalityFilter, setModalityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newOrder, setNewOrder] = useState({ patientName: '', patientId: '', modality: 'X-Ray', bodyPart: '', clinicalHistory: '', priority: 'Routine' });

  const { data } = useQuery({ queryKey: ['radiology', search, modalityFilter, statusFilter], queryFn: () => radApi.getOrders({ search, modality: modalityFilter, status: statusFilter }) });
  const { data: stats } = useQuery({ queryKey: ['radiology-stats'], queryFn: radApi.getStats });
  const orders = data?.orders || [];

  const createMut = useMutation({ mutationFn: radApi.createOrder, onSuccess: () => { qc.invalidateQueries(['radiology']); setShowCreate(false); } });
  const scheduleMut = useMutation({ mutationFn: ({ id, ...b }) => radApi.schedule(id, b), onSuccess: () => qc.invalidateQueries(['radiology']) });
  const startMut = useMutation({ mutationFn: radApi.startScan, onSuccess: () => qc.invalidateQueries(['radiology']) });
  const completeMut = useMutation({ mutationFn: ({ id, ...b }) => radApi.completeScan(id, b), onSuccess: () => qc.invalidateQueries(['radiology']) });
  const reportMut = useMutation({ mutationFn: ({ id, ...b }) => radApi.submitReport(id, b), onSuccess: () => qc.invalidateQueries(['radiology']) });
  const deliverMut = useMutation({ mutationFn: radApi.deliver, onSuccess: () => qc.invalidateQueries(['radiology']) });

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Radiology</h1><p className="page-subtitle">{stats?.total || 0} orders · {stats?.pending || 0} pending</p></div>

      <div className="grid grid-cols-5 gap-4 mb-6">
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

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select value={modalityFilter} onChange={e => setModalityFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
          <option value="All">All Modalities</option>
          {['X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'Echo', 'ECG', 'Mammography'].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
          <option value="All">All Status</option>
          {['Ordered', 'Scheduled', 'In Progress', 'Completed', 'Reported', 'Delivered'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Order</Button>
      </div>

      <div className="space-y-4">
        {orders.map(order => {
          const isExpanded = expandedId === order._id;
          return (
            <div key={order._id} className="bg-card rounded-xl border shadow-sm">
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : order._id)}>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${modalityColors[order.modality] || ''}`}>{order.modality}</span>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{order.patientName}</p>
                    <p className="text-xs text-muted-foreground">{order.bodyPart} · Dr. {order.doctorName}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status] || ''}`}>{order.status}</span>
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 border-t pt-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Order ID</span><p className="font-medium">{order.orderId}</p></div>
                    <div><span className="text-muted-foreground">Body Part</span><p className="font-medium">{order.bodyPart}</p></div>
                    <div><span className="text-muted-foreground">Priority</span><p className={`font-medium ${order.priority === 'STAT' ? 'text-destructive' : order.priority === 'Urgent' ? 'text-warning' : ''}`}>{order.priority}</p></div>
                    {order.scheduledAt && <div><span className="text-muted-foreground">Scheduled</span><p className="font-medium">{new Date(order.scheduledAt).toLocaleString()}</p></div>}
                    {order.performedBy && <div><span className="text-muted-foreground">Performed By</span><p className="font-medium">{order.performedBy}</p></div>}
                  </div>
                  {order.clinicalHistory && <div className="bg-muted/30 rounded-lg p-2"><p className="text-xs text-muted-foreground">History: {order.clinicalHistory}</p></div>}
                  {order.findings && (
                    <div className="bg-purple-500/5 rounded-lg p-3 border border-purple-500/20 space-y-2">
                      {order.findings && <div><p className="text-xs font-semibold text-purple-600">Findings</p><p className="text-sm">{order.findings}</p></div>}
                      {order.impression && <div><p className="text-xs font-semibold text-purple-600">Impression</p><p className="text-sm">{order.impression}</p></div>}
                      <p className="text-xs text-muted-foreground">Reported: {new Date(order.reportedAt).toLocaleString()}</p>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {order.status === 'Ordered' && (
                      <Button size="sm" variant="outline" onClick={() => { const d = prompt('Schedule date (YYYY-MM-DD HH:mm):'); if (d) scheduleMut.mutate({ id: order._id, scheduledAt: new Date(d) }); }}>
                        <Clock className="w-3 h-3 mr-1" /> Schedule
                      </Button>
                    )}
                    {order.status === 'Scheduled' && (
                      <Button size="sm" variant="outline" onClick={() => startMut.mutate(order._id)}>
                        <Camera className="w-3 h-3 mr-1" /> Start Scan
                      </Button>
                    )}
                    {order.status === 'In Progress' && (
                      <Button size="sm" variant="outline" onClick={() => completeMut.mutate({ id: order._id })}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Complete Scan
                      </Button>
                    )}
                    {order.status === 'Completed' && (
                      <Button size="sm" variant="outline" onClick={() => {
                        const f = prompt('Findings:'); const i = prompt('Impression:'); const r = prompt('Recommendation:');
                        if (f) reportMut.mutate({ id: order._id, findings: f, impression: i || '', recommendation: r || '' });
                      }}>
                        <FileText className="w-3 h-3 mr-1" /> Submit Report
                      </Button>
                    )}
                    {order.status === 'Reported' && (
                      <Button size="sm" variant="outline" onClick={() => deliverMut.mutate(order._id)}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Deliver Report
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

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">New Radiology Order</h2><button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1 block">Patient Name</label><Input value={newOrder.patientName} onChange={e => setNewOrder({ ...newOrder, patientName: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1 block">Modality</label><select value={newOrder.modality} onChange={e => setNewOrder({ ...newOrder, modality: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'Echo', 'ECG', 'Mammography'].map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                <div><label className="text-sm font-medium mb-1 block">Priority</label><select value={newOrder.priority} onChange={e => setNewOrder({ ...newOrder, priority: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['Routine', 'Urgent', 'STAT'].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Body Part *</label><Input value={newOrder.bodyPart} onChange={e => setNewOrder({ ...newOrder, bodyPart: e.target.value })} placeholder="e.g. Chest, Brain, Abdomen..." /></div>
              <div><label className="text-sm font-medium mb-1 block">Clinical History</label><textarea value={newOrder.clinicalHistory} onChange={e => setNewOrder({ ...newOrder, clinicalHistory: e.target.value })} className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
              <Button className="w-full" onClick={() => createMut.mutate(newOrder)} disabled={createMut.isPending || !newOrder.patientName || !newOrder.bodyPart}>Create Order</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}