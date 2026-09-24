import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Building2, CheckCircle, XCircle, Mail, MapPin, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/sonner';

const statusColors = {
  approved: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  rejected: 'bg-destructive/10 text-destructive',
  suspended: 'bg-muted-foreground/10 text-muted-foreground',
};

const QUEUE_TABS = [
  { key: 'hospitals', label: 'Hospitals' },
  { key: 'facilities', label: 'Facilities' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'riders', label: 'Riders' },
  { key: 'assistants', label: 'Assistants' },
  { key: 'lawyers', label: 'Lawyers' },
];

// SA-3: per-queue approve/reject wiring for the unified KYC queue.
const QUEUE_ACTIONS = {
  hospitals: { approve: (id) => api.approveHospital(id), reject: (id, reason) => api.rejectHospital(id, { reason }) },
  facilities: { approve: (id) => api.approveFacility(id), reject: null },
  delivery: { approve: (id) => api.approveDeliveryBoy(id, { action: 'approve' }), reject: (id, reason) => api.approveDeliveryBoy(id, { action: 'reject', reason }) },
  riders: { approve: (id) => api.approveRider(id), reject: (id, reason) => api.rejectRider(id, reason) },
  assistants: { approve: (id) => api.approveAssistant(id), reject: (id, reason) => api.rejectAssistant(id, reason) },
  lawyers: { approve: (id) => api.approveAdminLawyer(id), reject: (id, reason) => api.rejectAdminLawyer(id, reason) },
};

function queueItemName(item) {
  return item.name || item.hospitalName || item.facilityName || item.userId?.name || item.user?.name || item.email || 'Application';
}

function queueItemSub(item) {
  return item.email || item.phone || item.city || item.userId?.email || item.user?.email || '';
}

export default function PendingApprovals() {
  const [pendingHospitals, setPendingHospitals] = useState([]);
  const [aggregated, setAggregated] = useState({ facilities: [], delivery: [], riders: [], assistants: [], lawyers: [] });
  const [activeQueue, setActiveQueue] = useState('hospitals');
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPending();
  }, []);

  async function fetchAllPendingApprovals() {
    try {
      const [facilities, deliveryBoys, riders, assistants, lawyers] = await Promise.allSettled([
        api.get('/facilities/pending').catch(() => null),
        api.get('/delivery-partners/pending').catch(() => null),
        api.get('/admin/riders/pending').catch(() => null),
        api.get('/admin/assistants/pending').catch(() => null),
        api.get('/admin/lawyers/pending').catch(() => null),
      ]);
      setAggregated({
        facilities: facilities.status === 'fulfilled' ? facilities.value?.facilities || facilities.value?.data || [] : [],
        delivery: deliveryBoys.status === 'fulfilled' ? deliveryBoys.value?.partners || deliveryBoys.value?.data || deliveryBoys.value || [] : [],
        riders: riders.status === 'fulfilled' ? riders.value?.riders || [] : [],
        assistants: assistants.status === 'fulfilled' ? assistants.value?.assistants || [] : [],
        lawyers: lawyers.status === 'fulfilled' ? lawyers.value?.lawyers || [] : [],
      });
    } catch {
      toast.error('Failed to load full pending approvals queue');
    }
  }

  async function fetchPending() {
    setLoading(true);
    try {
      const data = await api.getPendingHospitals();
      setPendingHospitals(data?.hospitals || data?.data || data || []);
      fetchAllPendingApprovals();
    } catch {
      toast.error('Failed to load pending hospitals');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(queue, id) {
    setActingId(id);
    try {
      await QUEUE_ACTIONS[queue].approve(id);
      toast.success('Approved successfully');
      fetchPending();
    } catch {
      toast.error('Failed to approve');
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(queue, id) {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    const action = QUEUE_ACTIONS[queue]?.reject;
    if (!action) {
      toast.error('Reject is not supported for this queue yet');
      return;
    }
    setActingId(id);
    try {
      await action(id, rejectReason.trim());
      toast.success('Rejected');
      setRejectingId(null);
      setRejectReason('');
      fetchPending();
    } catch {
      toast.error('Failed to reject');
    } finally {
      setActingId(null);
    }
  }

  const queueItems = activeQueue === 'hospitals' ? pendingHospitals : (aggregated[activeQueue] || []);
  const queueCounts = {
    hospitals: pendingHospitals.length,
    facilities: aggregated.facilities.length,
    delivery: aggregated.delivery.length,
    riders: aggregated.riders.length,
    assistants: aggregated.assistants.length,
    lawyers: aggregated.lawyers.length,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* SA-3: unified multi-provider KYC queue tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {QUEUE_TABS.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={activeQueue === t.key ? 'default' : 'outline'}
            onClick={() => { setActiveQueue(t.key); setRejectingId(null); setRejectReason(''); }}
            className="gap-1.5"
          >
            {t.label}
            <Badge variant="secondary" className="ml-1 text-[11px]">{queueCounts[t.key] ?? 0}</Badge>
          </Button>
        ))}
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse mb-3" />
                <div className="h-3 w-1/2 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : queueItems.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h3 className="font-heading font-semibold text-lg text-foreground mb-1">All Caught Up</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            No pending {QUEUE_TABS.find((t) => t.key === activeQueue)?.label.toLowerCase()} registrations. New registrations will appear here for review.
          </p>
        </div>
      ) : activeQueue !== 'hospitals' ? (
        <div className="space-y-3">
          {queueItems.map((item) => {
            const id = item._id;
            const canReject = Boolean(QUEUE_ACTIONS[activeQueue]?.reject);
            return (
              <Card key={id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{queueItemName(item)}</p>
                    {queueItemSub(item) && <p className="text-xs text-muted-foreground truncate">{queueItemSub(item)}</p>}
                  </div>
                  {rejectingId === id ? (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Input
                        placeholder="Reason for rejection..."
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        className="text-sm"
                      />
                      <Button size="sm" variant="destructive" disabled={actingId === id} onClick={() => handleReject(activeQueue, id)}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setRejectingId(null); setRejectReason(''); }}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" className="bg-success hover:bg-success/90 gap-1.5" disabled={actingId === id} onClick={() => handleApprove(activeQueue, id)}>
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </Button>
                      {canReject && (
                        <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5" onClick={() => setRejectingId(id)}>
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {pendingHospitals.map((hospital, i) => (
            <motion.div
              key={hospital._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <Badge className="bg-warning/10 text-warning border-0">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  </div>

                  <h3 className="font-heading font-semibold text-lg text-foreground mb-3">
                    {hospital.name}
                  </h3>

                  <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{hospital.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{hospital.city}{hospital.state ? `, ${hospital.state}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span>License: {hospital.licenseNumber}</span>
                    </div>
                  </div>

                  {hospital.description && (
                    <p className="text-sm text-muted-foreground mb-5 line-clamp-2">
                      {hospital.description}
                    </p>
                  )}

                  {rejectingId === hospital._id ? (
                    <div className="space-y-3">
                      <Input
                        placeholder="Reason for rejection..."
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actingId === hospital._id}
                          onClick={() => handleReject('hospitals', hospital._id)}
                          className="gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Confirm Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setRejectingId(null); setRejectReason(''); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-success hover:bg-success/90 gap-1.5"
                        disabled={actingId === hospital._id}
                        onClick={() => handleApprove('hospitals', hospital._id)}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                        onClick={() => setRejectingId(hospital._id)}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
