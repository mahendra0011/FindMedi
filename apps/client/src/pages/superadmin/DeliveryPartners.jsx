import { useState, useEffect } from 'react';
import {
  Truck, CheckCircle, XCircle, Search, Users, Package,
  TrendingUp, Clock, MapPin, Star, Filter, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const statusColors = {
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  suspended: 'bg-muted text-muted-foreground',
};

export default function SuperAdminDelivery() {
  const [pending, setPending] = useState([]);
  const [allPartners, setAllPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingData, allData] = await Promise.all([
        api.get('/delivery-partners/pending'),
        api.get('/delivery-partners/all'),
      ]);
      setPending(pendingData || []);
      setAllPartners(allData || []);
    } catch {
      toast.error('Failed to load delivery partners');
    }
    setLoading(false);
  };

  const handleApprove = async (id) => {
    try {
      await api.put(`/delivery-partners/${id}/verify`, { action: 'approve' });
      toast.success('Delivery partner approved');
      fetchData();
    } catch {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await api.put(`/delivery-partners/${id}/verify`, { action: 'reject', reason: rejectReason });
      toast.success('Delivery partner rejected');
      setRejectingId(null);
      setRejectReason('');
      fetchData();
    } catch {
      toast.error('Failed to reject');
    }
  };

  const handleSuspend = async (id) => {
    try {
      await api.put(`/delivery-partners/${id}/verify`, { action: 'reject', reason: 'Suspended by admin' });
      toast.success('Delivery partner suspended');
      fetchData();
    } catch {
      toast.error('Failed to suspend');
    }
  };

  const filteredAll = allPartners.filter((p) =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Delivery Partners</h1>
          <p className="page-subtitle">Manage delivery partner approvals and oversight</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm hover:bg-muted/80">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-2xl font-bold text-warning">{pending.length}</p>
          <p className="text-xs text-muted-foreground">Pending Approval</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-2xl font-bold text-success">{allPartners.filter(p => p.status === 'approved').length}</p>
          <p className="text-xs text-muted-foreground">Approved</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-2xl font-bold text-primary">{allPartners.length}</p>
          <p className="text-xs text-muted-foreground">Total Partners</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-2xl font-bold text-info">{allPartners.reduce((s, p) => s + (p.totalDeliveries || 0), 0)}</p>
          <p className="text-xs text-muted-foreground">Total Deliveries</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/20 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'pending' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Pending Approvals ({pending.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All Partners ({allPartners.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'analytics' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Pending Approvals Tab */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pending.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No pending delivery partner approvals</p>
            </div>
          ) : (
            pending.map((partner) => (
              <div key={partner._id} className="bg-card rounded-xl border p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Truck className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{partner.name}</h3>
                      <p className="text-sm text-muted-foreground">{partner.phone}</p>
                      {partner.email && <p className="text-sm text-muted-foreground">{partner.email}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Vehicle: {partner.vehicleType} {partner.vehicleNumber}</span>
                        <span>Zone: {partner.workZone?.join(', ') || '—'}</span>
                        <span>Joined: {new Date(partner.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleApprove(partner._id)} className="gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectingId(partner._id)}
                      className="gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </Button>
                  </div>
                </div>

                {rejectingId === partner._id && (
                  <div className="mt-4 p-4 bg-muted/20 rounded-lg">
                    <Input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Rejection reason..."
                      className="mb-2"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleReject(partner._id)}>Confirm Reject</Button>
                      <Button size="sm" variant="outline" onClick={() => { setRejectingId(null); setRejectReason(''); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* All Partners Tab */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or phone..."
              className="pl-10"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Partner</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Vehicle</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">Deliveries</th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">Rating</th>
                  <th className="text-center py-3 px-2 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAll.map((p) => (
                  <tr key={p._id} className="border-b border-border last:border-0">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                          {p.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">{p.vehicleType} {p.vehicleNumber}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[p.status] || 'bg-muted text-muted-foreground'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-card-foreground">{p.totalDeliveries || 0}</td>
                    <td className="py-3 px-2 text-right text-card-foreground">{p.rating || '—'}</td>
                    <td className="py-3 px-2 text-center">
                      {p.status === 'approved' ? (
                        <Button size="sm" variant="outline" onClick={() => handleSuspend(p._id)} className="text-xs">
                          Suspend
                        </Button>
                      ) : p.status === 'suspended' ? (
                        <Button size="sm" onClick={() => handleApprove(p._id)} className="text-xs">
                          Reactivate
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => handleApprove(p._id)} className="text-xs">
                          Approve
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl border p-4">
              <p className="text-2xl font-bold text-success">{allPartners.filter(p => p.status === 'approved').length}</p>
              <p className="text-xs text-muted-foreground">Active Partners</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-2xl font-bold text-warning">{allPartners.filter(p => p.status === 'pending').length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-2xl font-bold text-primary">{allPartners.reduce((s, p) => s + (p.totalDeliveries || 0), 0)}</p>
              <p className="text-xs text-muted-foreground">Total Deliveries</p>
            </div>
            <div className="bg-card rounded-xl border p-4">
              <p className="text-2xl font-bold text-info">
                {allPartners.length ? (allPartners.reduce((s, p) => s + (p.rating || 0), 0) / allPartners.filter(p => p.rating).length).toFixed(1) : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </div>
          </div>

          <div className="bg-card rounded-xl border p-6">
            <h3 className="font-heading font-semibold text-lg text-card-foreground mb-4">Delivery Volume by Vehicle Type</h3>
            <div className="space-y-3">
              {['bike', 'scooter', 'bicycle', 'foot'].map((type) => {
                const count = allPartners.filter((p) => p.vehicleType === type).length;
                const deliveries = allPartners.filter((p) => p.vehicleType === type).reduce((s, p) => s + (p.totalDeliveries || 0), 0);
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className="w-20 text-xs font-medium text-muted-foreground capitalize">{type}</div>
                    <div className="flex-1 bg-muted/20 rounded-full h-6 relative">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${allPartners.length ? (count / allPartners.length) * 100 : 0}%` }}
                      />
                      <span className="absolute inset-0 flex items-center text-xs font-medium justify-center">
                        {count} partners • {deliveries} deliveries
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card rounded-xl border p-6">
            <h3 className="font-heading font-semibold text-lg text-card-foreground mb-4">Recent Activity</h3>
            <div className="space-y-2 text-sm">
              {allPartners.slice(0, 5).map((p) => (
                <div key={p._id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Truck className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.status} • {p.totalDeliveries || 0} deliveries</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
