/**
 * Prescription Verification Queue — ported from client/src/pages/admin/AdminPrescriptionVerificationQueue.jsx
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { FileText, Search, Pill, Eye, ShieldCheck, ShieldX, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { pharmacy } from '@/lib/api';

const verificationStatusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning',
  verified: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
};

const statusColors: Record<string, string> = {
  Active: 'bg-warning/10 text-warning',
  Dispensed: 'bg-success/10 text-success',
  'Partially Dispensed': 'bg-info/10 text-info',
  Cancelled: 'bg-destructive/10 text-destructive',
};

interface PrescriptionRow {
  _id: string;
  prescriptionId?: string;
  patientName?: string;
  doctorName?: string;
  status?: string;
  verificationStatus?: string;
  medicines?: { medicineName: string; dosage?: string; frequency?: string; duration?: string; quantity?: number; isDispensed?: boolean }[];
  createdAt?: string;
  diagnosis?: string;
  verificationNotes?: string;
  isEmergency?: boolean;
}

export default function PrescriptionVerificationPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('pending');
  const [selectedRx, setSelectedRx] = useState<PrescriptionRow | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [actionType, setActionType] = useState('verify');

  const { data: queueData, isLoading: loading } = useQuery({
    queryKey: ['admin-prescription-verification', filter],
    queryFn: async (): Promise<PrescriptionRow[]> => {
      const res = await pharmacy.getPrescriptions({ verificationStatus: filter } as unknown as Record<string, string>);
      const arr = (res as unknown as { prescriptions?: unknown[] })?.prescriptions ?? res;
      return (Array.isArray(arr) ? arr : []) as PrescriptionRow[];
    },
  });

  const verifyMut = useMutation({
    mutationFn: ({ id, action, notes }: { id: string; action: string; notes: string }) =>
      pharmacy.verifyPrescription(id, { action, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-prescription-verification'] });
      setSelectedRx(null);
      setVerifyNotes('');
      toast.success(actionType === 'verify' ? 'Prescription verified' : 'Prescription rejected');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to process'),
  });

  const queue = queueData ?? [];
  const filtered = queue.filter(
    (r) =>
      !search ||
      (r.patientName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.prescriptionId ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.doctorName ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const handleVerify = () => {
    if (!selectedRx) return;
    verifyMut.mutate({ id: selectedRx._id, action: actionType, notes: verifyNotes });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Prescription Verification Queue</h1>
        <p className="text-muted-foreground">
          {queue.filter((r) => r.verificationStatus === 'pending').length} pending, {queue.filter((r) => r.verificationStatus === 'verified').length} verified
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['pending', 'verified', 'rejected'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by patient, prescription ID, or doctor..." className="pl-10" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No prescriptions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rx, i) => {
            const dispensed = rx.medicines?.filter((m) => m.isDispensed).length || 0;
            const total = rx.medicines?.length || 0;
            const vColors = verificationStatusColors[rx.verificationStatus ?? 'pending'] ?? verificationStatusColors.pending;
            return (
              <motion.div
                key={rx._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{rx.patientName ?? 'Unknown Patient'}</h3>
                        <span className="text-xs text-muted-foreground">#{rx.prescriptionId ?? rx._id.slice(0, 8)}</span>
                        <Badge className={vColors}>{rx.verificationStatus ?? 'pending'}</Badge>
                        <Badge className={statusColors[rx.status ?? 'Active'] ?? statusColors.Active}>{rx.status ?? 'Active'}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Dr. {rx.doctorName ?? '—'} • {rx.medicines?.length ?? 0} medicines</p>
                      {rx.diagnosis && <p className="text-xs text-muted-foreground/70 mt-1 italic">{rx.diagnosis}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <Pill className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {dispensed}/{total} medicines dispensed
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {rx.isEmergency && <Badge className="bg-destructive/10 text-destructive">Emergency</Badge>}
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setSelectedRx(rx); setVerifyNotes(''); setActionType('verify'); }}>
                      <Eye className="w-3.5 h-3.5" /> View
                    </Button>
                  </div>
                </div>
                {rx.verificationStatus === 'pending' && (
                  <div className="flex gap-2 mt-4 pt-3 border-t border-border/40">
                    <Button
                      size="sm"
                      className="flex-1 gap-1 bg-success hover:bg-success/90"
                      onClick={() => { setSelectedRx(rx); setVerifyNotes(''); setActionType('verify'); }}
                    >
                      <ShieldCheck className="w-4 h-4" /> Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1 text-destructive hover:bg-destructive/10"
                      onClick={() => { setSelectedRx(rx); setVerifyNotes(''); setActionType('reject'); }}
                    >
                      <ShieldX className="w-4 h-4" /> Reject
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {selectedRx && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedRx(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Prescription Verification</h3>
                <div className="flex items-center gap-2">
                  <Badge className={verificationStatusColors[selectedRx.verificationStatus ?? 'pending'] ?? verificationStatusColors.pending}>
                    {selectedRx.verificationStatus ?? 'pending'}
                  </Badge>
                  <Badge className={statusColors[selectedRx.status ?? 'Active'] ?? statusColors.Active}>{selectedRx.status}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                  <User className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{selectedRx.patientName}</p>
                    <p className="text-xs text-muted-foreground">Patient</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                  <User className="w-8 h-8 text-info" />
                  <div>
                    <p className="font-medium text-foreground">Dr. {selectedRx.doctorName}</p>
                    <p className="text-xs text-muted-foreground">Prescriber</p>
                  </div>
                </div>
              </div>

              {selectedRx.diagnosis && (
                <div className="mb-6">
                  <p className="text-xs text-muted-foreground mb-1">Diagnosis</p>
                  <div className="p-3 bg-muted/20 rounded-xl text-sm">{selectedRx.diagnosis}</div>
                </div>
              )}

              <div className="mb-6">
                <p className="text-xs text-muted-foreground mb-3">Medicines ({selectedRx.medicines?.length ?? 0})</p>
                <div className="space-y-2">
                  {selectedRx.medicines?.map((med, idx) => (
                    <div key={idx} className="p-4 rounded-xl border bg-muted/20 border-border/40">
                      <div className="flex items-center gap-2">
                        <Pill className="w-4 h-4 text-muted-foreground" />
                        <h4 className="font-medium text-foreground text-sm">{med.medicineName}</h4>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span>Dosage: {med.dosage}</span>
                        <span>Frequency: {med.frequency}</span>
                        <span>Duration: {med.duration}</span>
                        <span>Qty: {med.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedRx.verificationStatus === 'pending' && (
                <div className="mb-6">
                  <div className="flex gap-2 mb-3">
                    <Button size="sm" variant={actionType === 'verify' ? 'default' : 'outline'} className={actionType === 'verify' ? 'bg-success hover:bg-success/90' : ''} onClick={() => setActionType('verify')}>
                      <ShieldCheck className="w-4 h-4 mr-1" /> Verify
                    </Button>
                    <Button size="sm" variant={actionType === 'reject' ? 'default' : 'outline'} className={actionType === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''} onClick={() => setActionType('reject')}>
                      <ShieldX className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                  <Textarea
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    placeholder={actionType === 'verify' ? 'Add verification notes (optional)...' : 'Enter rejection reason...'}
                    rows={3}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedRx(null)}>
                  Close
                </Button>
                {selectedRx.verificationStatus === 'pending' && (
                  <Button className={actionType === 'verify' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'} onClick={handleVerify} disabled={verifyMut.isPending}>
                    <Clock className="w-4 h-4 mr-1" /> {actionType === 'verify' ? 'Verify Prescription' : 'Reject Prescription'}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
