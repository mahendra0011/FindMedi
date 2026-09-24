import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

// SA-M2: standardized rejection reasons dispatched to applicant SMS/email by the backend.
const REJECT_TEMPLATES = [
  'Blurry certificate — please re-upload a clear scan',
  'Name mismatch with Aadhaar — correct the registered name',
  'Expired registration — renew and re-upload',
  'Missing document — upload the pending certificate',
  'Address proof invalid — upload a valid address document',
];

const QUEUES = [
  { key: 'hospitals', label: 'Hospitals', deepLink: '/superadmin/pending',
    fetch: () => api.getPendingHospitals().then((d) => d?.hospitals || d?.data || d || []),
    approve: (id) => api.approveHospital(id),
    reject: (id, reason) => api.rejectHospital(id, { reason }) },
  { key: 'facilities', label: 'Clinics / Labs / Pharmacies', deepLink: '/superadmin/facilities',
    fetch: () => api.getPendingFacilities().then((d) => d?.facilities || d?.data || []),
    approve: (id) => api.approveFacility(id),
    reject: null },
  { key: 'delivery', label: 'Delivery Partners', deepLink: '/superadmin/delivery-partners',
    fetch: () => api.getPendingDeliveryBoys().then((d) => d?.partners || d?.data || d || []),
    approve: (id) => api.approveDeliveryBoy(id, { action: 'approve' }),
    reject: (id, reason) => api.approveDeliveryBoy(id, { action: 'reject', reason }) },
  { key: 'riders', label: 'Riders', deepLink: '/admin/vehicle-rides',
    fetch: () => api.getPendingRiders().then((d) => d?.riders || []),
    approve: (id) => api.approveRider(id),
    reject: (id, reason) => api.rejectRider(id, reason) },
  { key: 'assistants', label: 'Assistants', deepLink: '/admin/assistants',
    fetch: () => api.getPendingAssistants().then((d) => d?.assistants || []),
    approve: (id) => api.approveAssistant(id),
    reject: (id, reason) => api.rejectAssistant(id, reason) },
  { key: 'lawyers', label: 'Lawyers', deepLink: '/admin/lawyers',
    fetch: () => api.getAdminPendingLawyers().then((d) => d?.lawyers || []),
    approve: (id) => api.approveAdminLawyer(id),
    reject: (id, reason) => api.rejectAdminLawyer(id, reason) },
];

function itemName(item) {
  return item.name || item.hospitalName || item.facilityName || item.userId?.name || item.user?.name || item.email || 'Application';
}
function itemSub(item) {
  return item.email || item.phone || item.city || item.userId?.email || item.user?.email || '';
}

export default function KycCommand() {
  const [active, setActive] = useState('hospitals');
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadQueue = useCallback(async (key, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const q = QUEUES.find((x) => x.key === key);
      const list = await q.fetch();
      setItems(Array.isArray(list) ? list : []);
      setCounts((c) => ({ ...c, [key]: Array.isArray(list) ? list.length : 0 }));
    } catch { if (!silent) toast.error(`Failed to load ${key} queue`); }
    if (!silent) setLoading(false);
  }, []);

  const loadCounts = useCallback(async () => {
    const settled = await Promise.allSettled(QUEUES.map((q) => q.fetch().catch(() => [])));
    const next = {};
    settled.forEach((r, i) => {
      const list = r.status === 'fulfilled' ? r.value : [];
      next[QUEUES[i].key] = Array.isArray(list) ? list.length : 0;
    });
    setCounts(next);
  }, []);

  useEffect(() => { loadQueue(active); loadCounts(); }, [active, loadQueue, loadCounts]);

  const queue = QUEUES.find((q) => q.key === active);

  const approve = async (id) => {
    setActingId(id);
    try {
      await queue.approve(id);
      toast.success('Approved successfully');
      loadQueue(active, true);
      loadCounts();
    } catch { toast.error('Approve failed'); }
    finally { setActingId(null); }
  };

  const reject = async (id) => {
    if (!rejectReason.trim()) { toast.error('Pick a rejection template or type a reason'); return; }
    if (!queue.reject) { toast.error('Reject is not supported for this queue yet'); return; }
    setActingId(id);
    try {
      await queue.reject(id, rejectReason.trim());
      toast.success('Rejected with reason dispatched');
      setRejectingId(null);
      setRejectReason('');
      loadQueue(active, true);
      loadCounts();
    } catch { toast.error('Reject failed'); }
    finally { setActingId(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" /> KYC Command Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Single pan-platform verification queue with standardized rejection reasons</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.open(queue.deepLink, '_self')} className="gap-1.5">
          <ExternalLink className="w-3.5 h-3.5" /> Open {queue.label} workspace
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUEUES.map((q) => (
          <Button key={q.key} size="sm" variant={active === q.key ? 'default' : 'outline'}
            onClick={() => { setActive(q.key); setRejectingId(null); setRejectReason(''); }} className="gap-1.5">
            {q.label}
            <Badge variant="secondary" className="ml-1 text-[11px]">{counts[q.key] ?? '…'}</Badge>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rejection reason master</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">Pick a template before confirming any reject — it is dispatched via SMS/email.</p>
          <div className="flex flex-wrap gap-2">
            {REJECT_TEMPLATES.map((t) => (
              <Button key={t} size="sm" variant={rejectReason === t ? 'default' : 'outline'} onClick={() => setRejectReason(t)} className="text-xs">
                {t}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 text-success" />
          <p className="font-semibold text-foreground">Queue clear</p>
          <p className="text-sm">No pending {queue.label.toLowerCase()} applications.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const id = item._id;
            return (
              <motion.div key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{itemName(item)}</p>
                      {itemSub(item) && <p className="text-xs text-muted-foreground truncate">{itemSub(item)}</p>}
                    </div>
                    {rejectingId === id ? (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason..." className="text-sm" />
                        <Button size="sm" variant="destructive" disabled={actingId === id} onClick={() => reject(id)}>Confirm</Button>
                        <Button size="sm" variant="outline" onClick={() => { setRejectingId(null); setRejectReason(''); }}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="bg-success hover:bg-success/90 gap-1.5" disabled={actingId === id} onClick={() => approve(id)}>
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </Button>
                        {queue.reject && (
                          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5" onClick={() => setRejectingId(id)}>
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
