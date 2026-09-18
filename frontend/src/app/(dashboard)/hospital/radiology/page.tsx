/**
 * Radiology — ported from client/src/pages/Radiology.jsx (Phase 4).
 * Imaging orders, modality workflow, reporting, delivery.
 */
'use client';

import { useState } from 'react';
import { Search, Plus, Clock, X, Camera, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useRadiologyOrders,
  useRadiologyStats,
  useCreateOrder,
  useScheduleScan,
  useStartScan,
  useCompleteScan,
  useSubmitReport,
  useDeliverReport,
} from '@/features/radiology/hooks';
import type { RadiologyOrder, RadiologyStats } from '@/features/radiology/types';

const modalityColors: Record<string, string> = {
  'X-Ray': 'bg-blue-500/10 text-blue-600',
  MRI: 'bg-purple-500/10 text-purple-600',
  'CT Scan': 'bg-orange-500/10 text-orange-600',
  Ultrasound: 'bg-green-500/10 text-green-600',
  Echo: 'bg-red-500/10 text-red-600',
  ECG: 'bg-yellow-500/10 text-yellow-600',
  Mammography: 'bg-pink-500/10 text-pink-600',
};

const statusColors: Record<string, string> = {
  Ordered: 'bg-primary/10 text-primary',
  Scheduled: 'bg-info/10 text-info',
  'In Progress': 'bg-warning/10 text-warning',
  Completed: 'bg-success/10 text-success',
  Reported: 'bg-purple-500/10 text-purple-600',
  Delivered: 'bg-muted text-muted-foreground',
};

const modalities = ['X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'Echo', 'ECG', 'Mammography'];
const statuses = ['Ordered', 'Scheduled', 'In Progress', 'Completed', 'Reported', 'Delivered'];

const emptyStats: RadiologyStats = { total: 0, pending: 0, inProgress: 0, completed: 0, reported: 0 };

export default function RadiologyPage() {
  const [search, setSearch] = useState('');
  const [modalityFilter, setModalityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newOrder, setNewOrder] = useState({
    patientName: '',
    patientId: '',
    modality: 'X-Ray',
    bodyPart: '',
    clinicalHistory: '',
    priority: 'Routine',
  });

  const { data: ordersData, isLoading } = useRadiologyOrders(search, modalityFilter, statusFilter);
  const { data: statsData } = useRadiologyStats();

  const createMut = useCreateOrder();
  const scheduleMut = useScheduleScan();
  const startMut = useStartScan();
  const completeMut = useCompleteScan();
  const reportMut = useSubmitReport();
  const deliverMut = useDeliverReport();

  const orders: RadiologyOrder[] = ordersData?.orders ?? [];
  const stats: RadiologyStats = { ...emptyStats, ...((statsData as Partial<RadiologyStats> | undefined) ?? {}) };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-muted-foreground">Loading radiology data…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Radiology</h1>
        <p className="text-sm text-muted-foreground">
          {stats.total} orders · {stats.pending} pending
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {[
          { l: 'Total', v: stats.total, c: 'text-foreground' },
          { l: 'Pending', v: stats.pending, c: 'text-warning' },
          { l: 'In Progress', v: stats.inProgress, c: 'text-info' },
          { l: 'Completed', v: stats.completed, c: 'text-success' },
          { l: 'Reported', v: stats.reported, c: 'text-purple-500' },
        ].map((s) => (
          <div key={s.l} className="bg-card rounded-xl border p-4 text-center">
            <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          value={modalityFilter}
          onChange={(e) => setModalityFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
        >
          <option value="All">All Modalities</option>
          {modalities.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
        >
          <option value="All">All Status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Order
        </Button>
      </div>

      <div className="space-y-4">
        {orders.map((order) => {
          const isExpanded = expandedId === order._id;
          return (
            <div key={order._id} className="bg-card rounded-xl border shadow-sm">
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : order._id)}>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${modalityColors[order.modality] ?? ''}`}>
                    {order.modality}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{order.patientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.bodyPart} · Dr. {order.doctorName}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status] ?? ''}`}>{order.status}</span>
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 border-t pt-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Order ID</span>
                      <p className="font-medium">{order.orderId}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Body Part</span>
                      <p className="font-medium">{order.bodyPart}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Priority</span>
                      <p className={`font-medium ${order.priority === 'STAT' ? 'text-destructive' : order.priority === 'Urgent' ? 'text-warning' : ''}`}>
                        {order.priority}
                      </p>
                    </div>
                    {order.scheduledAt && (
                      <div>
                        <span className="text-muted-foreground">Scheduled</span>
                        <p className="font-medium">{new Date(order.scheduledAt).toLocaleString()}</p>
                      </div>
                    )}
                    {order.performedBy && (
                      <div>
                        <span className="text-muted-foreground">Performed By</span>
                        <p className="font-medium">{order.performedBy}</p>
                      </div>
                    )}
                  </div>
                  {order.clinicalHistory && (
                    <div className="bg-muted/30 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">History: {order.clinicalHistory}</p>
                    </div>
                  )}
                  {order.findings && (
                    <div className="bg-purple-500/5 rounded-lg p-3 border border-purple-500/20 space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-purple-600">Findings</p>
                        <p className="text-sm">{order.findings}</p>
                      </div>
                      {order.impression && (
                        <div>
                          <p className="text-xs font-semibold text-purple-600">Impression</p>
                          <p className="text-sm">{order.impression}</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Reported: {order.reportedAt ? new Date(order.reportedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {order.status === 'Ordered' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const d = prompt('Schedule date (YYYY-MM-DD HH:mm):');
                          if (d) scheduleMut.mutate({ id: order._id, scheduledAt: new Date(d).toISOString() });
                        }}
                      >
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const f = prompt('Findings:');
                          const i = prompt('Impression:');
                          const r = prompt('Recommendation:');
                          if (f) reportMut.mutate({ id: order._id, findings: f, impression: i ?? '', recommendation: r ?? '' });
                        }}
                      >
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
        {orders.length === 0 && (
          <div className="text-center py-20">
            <Camera className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No radiology orders</p>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">New Radiology Order</h2>
              <button onClick={() => setShowCreate(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Patient Name</label>
                <Input value={newOrder.patientName} onChange={(e) => setNewOrder({ ...newOrder, patientName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Modality</label>
                  <select
                    value={newOrder.modality}
                    onChange={(e) => setNewOrder({ ...newOrder, modality: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  >
                    {modalities.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Priority</label>
                  <select
                    value={newOrder.priority}
                    onChange={(e) => setNewOrder({ ...newOrder, priority: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  >
                    {['Routine', 'Urgent', 'STAT'].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Body Part *</label>
                <Input
                  value={newOrder.bodyPart}
                  onChange={(e) => setNewOrder({ ...newOrder, bodyPart: e.target.value })}
                  placeholder="e.g. Chest, Brain, Abdomen..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Clinical History</label>
                <textarea
                  value={newOrder.clinicalHistory}
                  onChange={(e) => setNewOrder({ ...newOrder, clinicalHistory: e.target.value })}
                  className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createMut.mutate({ ...newOrder }, { onSuccess: () => setShowCreate(false) })}
                disabled={createMut.isPending || !newOrder.patientName || !newOrder.bodyPart}
              >
                Create Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
