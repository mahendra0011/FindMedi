import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, FlaskConical, Plus, Clock, Shield, Microscope, Syringe, FileText, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const labApi = {
  getOrders: (p = {}) => api.dispatch(() => Promise.resolve({ orders: [] }), '/lab/orders?' + new URLSearchParams(p)),
  getTests: () => api.dispatch(() => Promise.resolve({ tests: [] }), '/lab/tests'),
  getStats: () => api.dispatch(() => Promise.resolve({ total: 0, pending: 0, processing: 0, completed: 0, critical: 0 }), '/lab/stats'),
  createOrder: (body) => api.dispatch(() => Promise.resolve({}), '/lab/orders', { method: 'POST', body: JSON.stringify(body) }),
  registerSample: (id, body) => api.dispatch(() => Promise.resolve({}), `/lab/orders/${id}/register-sample`, { method: 'PUT', body: JSON.stringify(body) }),
  collectSample: (id, body) => api.dispatch(() => Promise.resolve({}), `/lab/orders/${id}/collect-sample`, { method: 'PUT', body: JSON.stringify(body) }),
  enterResult: (id, body) => api.dispatch(() => Promise.resolve({}), `/lab/orders/${id}/enter-result`, { method: 'PUT', body: JSON.stringify(body) }),
  verify: (id, body) => api.dispatch(() => Promise.resolve({}), `/lab/orders/${id}/verify`, { method: 'PUT', body: JSON.stringify(body) }),
  deliverReport: (id, body) => api.dispatch(() => Promise.resolve({}), `/lab/orders/${id}/deliver-report`, { method: 'PUT', body: JSON.stringify(body) }),
};

const statusColors = {
  Ordered: 'bg-primary/10 text-primary border-primary/20',
  'Sample Pending': 'bg-warning/10 text-warning border-warning/20',
  Processing: 'bg-info/10 text-info border-info/20',
  'Under Verification': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  Completed: 'bg-success/10 text-success border-success/20',
  Cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

const PRIORITY_COLORS = {
  Routine: 'bg-muted text-muted-foreground',
  Urgent: 'bg-warning/10 text-warning',
  STAT: 'bg-destructive/10 text-destructive',
};

export default function Lab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newOrder, setNewOrder] = useState({ patientName: '', patientId: '', tests: [{ testName: '', category: 'Blood' }], clinicalNotes: '', priority: 'Routine' });

  const { data: ordersData } = useQuery({ queryKey: ['lab-orders', search, statusFilter], queryFn: () => labApi.getOrders({ search, status: statusFilter }) });
  const { data: testsData } = useQuery({ queryKey: ['lab-tests'], queryFn: labApi.getTests });
  const { data: stats } = useQuery({ queryKey: ['lab-stats'], queryFn: labApi.getStats });

  const orders = ordersData?.orders || [];
  const labTests = testsData?.tests || [];

  const createMut = useMutation({ mutationFn: labApi.createOrder, onSuccess: () => { qc.invalidateQueries(['lab-orders']); setShowCreate(false); } });
  const sampleMut = useMutation({ mutationFn: ({ id, ...body }) => labApi.registerSample(id, body), onSuccess: () => qc.invalidateQueries(['lab-orders']) });
  const collectMut = useMutation({ mutationFn: ({ id, ...body }) => labApi.collectSample(id, body), onSuccess: () => qc.invalidateQueries(['lab-orders']) });
  const resultMut = useMutation({ mutationFn: ({ id, ...body }) => labApi.enterResult(id, body), onSuccess: () => qc.invalidateQueries(['lab-orders']) });
  const verifyMut = useMutation({ mutationFn: ({ id, ...body }) => labApi.verify(id, body), onSuccess: () => qc.invalidateQueries(['lab-orders']) });

  const addTest = () => setNewOrder(o => ({ ...o, tests: [...o.tests, { testName: '', category: 'Blood' }] }));
  const removeTest = (i) => setNewOrder(o => ({ ...o, tests: o.tests.filter((_, idx) => idx !== i) }));
  const updateTest = (i, field, value) => setNewOrder(o => ({ ...o, tests: o.tests.map((t, idx) => idx === i ? { ...t, [field]: value } : t) }));

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="page-title">Lab Management</h1>
        <p className="page-subtitle">{stats?.total || 0} orders · {stats?.critical || 0} critical</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total', value: stats?.total || 0, color: 'text-foreground' },
          { label: 'Pending', value: stats?.pending || 0, color: 'text-warning' },
          { label: 'Processing', value: stats?.processing || 0, color: 'text-info' },
          { label: 'Completed', value: stats?.completed || 0, color: 'text-success' },
          { label: 'Critical', value: stats?.critical || 0, color: 'text-destructive' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search orders..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
          <option value="All">All Status</option>
          {['Ordered', 'Sample Pending', 'Processing', 'Under Verification', 'Completed', 'Cancelled'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Order
        </Button>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map(order => {
          const isExpanded = expandedOrder === order._id;
          const activeTests = order.tests?.filter(t => t.status !== 'Cancelled') || [];
          return (
            <div key={order._id} className="bg-card rounded-xl border shadow-sm">
              <div className="p-5 cursor-pointer" onClick={() => setExpandedOrder(isExpanded ? null : order._id)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-heading font-semibold text-foreground">{order.orderId}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[order.priority] || ''}`}>{order.priority}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors[order.status] || ''}`}>{order.status}</span>
                    </div>
                    <p className="text-sm text-foreground font-medium">{order.patientName}</p>
                    <p className="text-xs text-muted-foreground">Dr. {order.doctorName} · {activeTests.length} test(s)</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />{new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-border pt-4">
                  <div className="space-y-3">
                    {order.tests?.map((test, i) => (
                      <div key={i} className="bg-muted/30 rounded-lg p-3 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{test.testName}</span>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[test.priority] || ''}`}>{test.priority}</span>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${test.status === 'Verified' || test.status === 'Report Delivered' ? 'bg-success/10 text-success' : test.status === 'Sample Collected' ? 'bg-info/10 text-info' : 'bg-muted text-muted-foreground'}`}>{test.status}</span>
                        </div>
                        {test.sampleId && <p className="text-xs text-muted-foreground mb-1">Sample: {test.sampleId}</p>}
                        {(test.status === 'Processing' || test.status === 'Completed') && (
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-sm font-semibold text-foreground">{test.resultValue}</span>
                            {test.unit && <span className="text-xs text-muted-foreground">{test.unit}</span>}
                            {test.normalRange && <span className="text-xs text-muted-foreground">Range: {test.normalRange}</span>}
                            {test.isCritical && <AlertCircle className="w-4 h-4 text-destructive" />}
                            {test.isAbnormal && !test.isCritical && <span className="text-xs text-warning">⚠ Abnormal</span>}
                          </div>
                        )}
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {test.status === 'Ordered' && (
                            <Button size="sm" variant="outline" onClick={() => sampleMut.mutate({ id: order._id, testIndex: i, sampleType: 'Blood' })}>Register Sample</Button>
                          )}
                          {test.status === 'Sample Needed' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => collectMut.mutate({ id: order._id, testIndex: i })}><FlaskConical className="w-3 h-3 mr-1" />Collect</Button>
                              <Button size="sm" variant="outline" onClick={() => { const r = prompt('Rejection reason:'); if (r) collectMut.mutate({ id: order._id, testIndex: i, rejectionReason: r }); }}><X className="w-3 h-3 mr-1" />Reject</Button>
                            </>
                          )}
                          {test.status === 'Sample Collected' && (
                            <Button size="sm" variant="outline" onClick={() => { const v = prompt('Result value:'); if (v) resultMut.mutate({ id: order._id, testIndex: i, resultValue: v, normalRange: test.normalRange, unit: test.unit }); }}><Microscope className="w-3 h-3 mr-1" />Enter Result</Button>
                          )}
                          {test.status === 'Completed' && (
                            <Button size="sm" variant="outline" onClick={() => verifyMut.mutate({ id: order._id, testIndex: i, approved: true })}><Shield className="w-3 h-3 mr-1" />Verify</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {orders.length === 0 && (
          <div className="text-center py-20">
            <FlaskConical className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No lab orders found</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-bold text-foreground">New Lab Order</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Patient</label>
                <Input value={newOrder.patientName} onChange={e => setNewOrder(o => ({ ...o, patientName: e.target.value }))} placeholder="Patient name" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Priority</label>
                <select value={newOrder.priority} onChange={e => setNewOrder(o => ({ ...o, priority: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  <option value="Routine">Routine</option>
                  <option value="Urgent">Urgent</option>
                  <option value="STAT">STAT (Immediate)</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Tests</label>
                  <Button size="sm" variant="outline" onClick={addTest}><Plus className="w-3 h-3 mr-1" />Add</Button>
                </div>
                {newOrder.tests.map((test, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select value={test.testName} onChange={e => updateTest(i, 'testName', e.target.value)}
                      className="flex-1 h-10 px-3 rounded-lg border border-input bg-background text-sm">
                      <option value="">Select test...</option>
                      {labTests.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                    </select>
                    <select value={test.category} onChange={e => updateTest(i, 'category', e.target.value)}
                      className="w-28 h-10 px-3 rounded-lg border border-input bg-background text-sm">
                      {['Blood', 'Urine', 'Stool', 'Imaging', 'Cardiac', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {newOrder.tests.length > 1 && (
                      <button onClick={() => removeTest(i)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Clinical Notes</label>
                <textarea value={newOrder.clinicalNotes} onChange={e => setNewOrder(o => ({ ...o, clinicalNotes: e.target.value }))}
                  className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Any clinical notes..." />
              </div>
              <Button className="w-full" onClick={() => createMut.mutate(newOrder)} disabled={createMut.isPending || !newOrder.patientName}>
                {createMut.isPending ? 'Creating...' : 'Create Lab Order'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}// 36
