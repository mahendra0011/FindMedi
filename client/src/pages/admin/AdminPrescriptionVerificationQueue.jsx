import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, User, Search, CheckCircle, XCircle, Calendar, Eye, Clock,
  Pill, AlertTriangle, Activity, Timer, Shield, ShieldCheck, ShieldX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

const verificationStatusColors = {
  pending: 'bg-warning/10 text-warning',
  verified: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
};

const statusColors = {
  Active: 'bg-warning/10 text-warning',
  Dispensed: 'bg-success/10 text-success',
  'Partially Dispensed': 'bg-info/10 text-info',
  Cancelled: 'bg-destructive/10 text-destructive',
};

function minutesSince(iso) {
  if (!iso) return null;
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
}

function urgencyLevel(iso) {
  if (!iso) return null;
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins > 20) return 'critical';
  if (mins > 10) return 'urgent';
  return null;
}

export default function AdminPrescriptionVerificationQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('pending');
  const [selectedRx, setSelectedRx] = useState(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [actionType, setActionType] = useState('verify');

  const load = async () => {
    try {
      const res = await api.getPharmacyPrescriptions({ verificationStatus: filter });
      setQueue(res.prescriptions || []);
    } catch {
      toast.error('Failed to load prescriptions');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

  const handleVerify = async () => {
    try {
      const updated = await api.verifyPrescription(selectedRx._id, {
        action: actionType,
        notes: verifyNotes,
      });
      setQueue(prev => prev.map(r => r._id === selectedRx._id ? updated : r));
      setSelectedRx(null);
      setVerifyNotes('');
      if (actionType === 'verify') {
        toast.success(`Prescription #${selectedRx.prescriptionId} verified successfully`);
      } else {
        toast.success(`Prescription #${selectedRx.prescriptionId} rejected`);
      }
    } catch (e) {
      toast.error(e.message || 'Failed to process prescription');
    }
  };

  const filtered = queue.filter(r => {
    const ms = !search || (r.patientName || '').toLowerCase().includes(search.toLowerCase())
      || (r.prescriptionId || '').toLowerCase().includes(search.toLowerCase())
      || (r.doctorName || '').toLowerCase().includes(search.toLowerCase());
    return ms;
  });

  const totalPending = queue.filter(r => r.verificationStatus === 'pending').length;
  const totalVerified = queue.filter(r => r.verificationStatus === 'verified').length;
  const totalRejected = queue.filter(r => r.verificationStatus === 'rejected').length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Prescription Verification Queue</h1>
        <p className="text-muted-foreground">
          {totalPending} pending, {totalVerified} verified, {totalRejected} rejected
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border/60 p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-xl font-bold text-amber-600">{totalPending}</p>
            <p className="text-xs text-muted-foreground">Pending Verification</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-xl font-bold text-emerald-600">{totalVerified}</p>
            <p className="text-xs text-muted-foreground">Verified</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-xl font-bold text-red-500">{totalRejected}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 flex items-center gap-3">
          <Timer className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xl font-bold text-primary">12m</p>
            <p className="text-xs text-muted-foreground">Avg Verify Time</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['pending', 'verified', 'rejected'].map(f => {
          const labels = { pending: 'Pending', verified: 'Verified', rejected: 'Rejected' };
          const icons = { pending: Clock, verified: CheckCircle, rejected: XCircle };
          const Icon = icons[f];
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1 ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              <Icon className="w-3.5 h-3.5" />
              {labels[f]} ({f === 'pending' ? totalPending : f === 'verified' ? totalVerified : totalRejected})
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by patient, prescription ID, or doctor..." className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No prescriptions found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rx, i) => {
            const dispensed = rx.medicines?.filter(m => m.isDispensed).length || 0;
            const total = rx.medicines?.length || 0;
            const vStatus = rx.verificationStatus || 'pending';
            const vColors = verificationStatusColors[vStatus] || verificationStatusColors.pending;
            return (
              <motion.div key={rx._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${rx.isEmergency ? 'bg-destructive/10' : 'bg-warning/10'}`}>
                      {rx.isEmergency ? <AlertTriangle className="w-6 h-6 text-destructive" /> : <FileText className="w-6 h-6 text-warning" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-semibold text-foreground">{rx.patientName}</h3>
                        <span className="text-xs text-muted-foreground font-mono">#{rx.prescriptionId}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Dr. {rx.doctorName}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" /> {new Date(rx.createdAt).toLocaleDateString()}
                        <Clock className="w-3 h-3 ml-1" /> {new Date(rx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {rx.verificationStatus === 'pending' && rx.createdAt && (() => {
                          const u = urgencyLevel(rx.createdAt);
                          return u === 'critical'
                            ? <Badge className="text-[10px] bg-red-500/10 text-red-600 border-red-200 animate-pulse ml-1"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Overdue {minutesSince(rx.createdAt)}</Badge>
                            : u === 'urgent'
                            ? <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200 ml-1"><Timer className="w-2.5 h-2.5 mr-0.5" />Urgent {minutesSince(rx.createdAt)}</Badge>
                            : null;
                        })()}
                      </div>
                      {rx.diagnosis && <p className="text-xs text-muted-foreground/70 mt-1 italic">{rx.diagnosis}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <Pill className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{dispensed}/{total} medicines dispensed</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {rx.isEmergency && <Badge className="bg-destructive/10 text-destructive">Emergency</Badge>}
                    <Badge className={vColors}>{rx.verificationStatus || 'pending'}</Badge>
                    <Badge className={statusColors[rx.status] || statusColors.Active}>{rx.status}</Badge>
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setSelectedRx(rx); setVerifyNotes(''); setActionType('verify'); }}>
                      <Eye className="w-3.5 h-3.5" /> View
                    </Button>
                  </div>
                </div>
                {rx.verificationStatus === 'pending' && (
                  <div className="flex gap-2 mt-4 pt-3 border-t border-border/40">
                    <Button size="sm" className="flex-1 gap-1 bg-success hover:bg-success/90"
                      onClick={() => { setSelectedRx(rx); setVerifyNotes(''); setActionType('verify'); }}>
                      <ShieldCheck className="w-4 h-4" /> Verify Prescription
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1 text-destructive hover:bg-destructive/10"
                      onClick={() => { setSelectedRx(rx); setVerifyNotes(''); setActionType('reject'); }}>
                      <ShieldX className="w-4 h-4" /> Reject Prescription
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
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg font-bold text-foreground">Prescription Verification</h3>
                <div className="flex items-center gap-2">
                  {selectedRx.isEmergency && <Badge className="bg-destructive/10 text-destructive">Emergency</Badge>}
                  <Badge className={verificationStatusColors[selectedRx.verificationStatus] || verificationStatusColors.pending}>
                    {selectedRx.verificationStatus || 'pending'}
                  </Badge>
                  <Badge className={statusColors[selectedRx.status] || statusColors.Active}>{selectedRx.status}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                  <User className="w-10 h-10 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{selectedRx.patientName}</p>
                    <p className="text-xs text-muted-foreground">Patient</p>
                    {selectedRx.patientId?.allergies?.length > 0 && (
                      <div className="mt-1">
                        {selectedRx.patientId.allergies.map((a, idx) => (
                          <span key={idx} className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full mr-1">
                            {a.allergen}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                  <User className="w-10 h-10 text-info" />
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

              {selectedRx.clinicalNotes && (
                <div className="mb-6">
                  <p className="text-xs text-muted-foreground mb-1">Clinical Notes</p>
                  <div className="p-3 bg-muted/20 rounded-xl text-sm">{selectedRx.clinicalNotes}</div>
                </div>
              )}

              <div className="mb-6">
                <p className="text-xs text-muted-foreground mb-3">Medicines ({selectedRx.medicines?.length || 0})</p>
                <div className="space-y-2">
                  {selectedRx.medicines?.map((med, idx) => {
                    const isAllergic = selectedRx.patientId?.allergies?.some(a =>
                      a.allergen?.toLowerCase()?.includes(med.medicineName?.toLowerCase()) ||
                      med.medicineName?.toLowerCase()?.includes(a.allergen?.toLowerCase())
                    );
                    return (
                      <div key={idx} className={`p-4 rounded-xl border ${med.isDispensed ? 'bg-success/5 border-success/20' : 'bg-muted/20 border-border/40'} ${isAllergic ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Pill className={`w-4 h-4 ${med.isDispensed ? 'text-success' : isAllergic ? 'text-destructive' : 'text-muted-foreground'}`} />
                              <h4 className="font-medium text-foreground text-sm">{med.medicineName}</h4>
                              {isAllergic && <Badge className="bg-destructive/10 text-destructive text-[10px]">Allergy Alert</Badge>}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                              <span>Dosage: <strong>{med.dosage}</strong></span>
                              <span>Frequency: <strong>{med.frequency}</strong></span>
                              <span>Duration: <strong>{med.duration}</strong></span>
                              <span>Route: <strong>{med.route}</strong></span>
                              <span>Qty: <strong>{med.quantity}</strong></span>
                            </div>
                            {med.instructions && <p className="text-xs text-muted-foreground/70 mt-1 italic">{med.instructions}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedRx.verificationStatus !== 'pending' && selectedRx.verificationNotes && (
                <div className="mb-6">
                  <p className="text-xs text-muted-foreground mb-1">Verification Notes</p>
                  <div className="p-3 bg-muted/20 rounded-xl text-sm">{selectedRx.verificationNotes}</div>
                  {selectedRx.verifiedAt && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      By: {selectedRx.verifiedBy?.name || 'Admin'} on {new Date(selectedRx.verifiedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {selectedRx.verificationStatus === 'pending' && (
                <div className="mb-6">
                  <div className="flex gap-2 mb-3">
                    <Button size="sm" variant={actionType === 'verify' ? 'default' : 'outline'}
                      className={actionType === 'verify' ? 'bg-success hover:bg-success/90' : ''}
                      onClick={() => setActionType('verify')}>
                      <ShieldCheck className="w-4 h-4 mr-1" /> Verify
                    </Button>
                    <Button size="sm" variant={actionType === 'reject' ? 'default' : 'outline'}
                      className={actionType === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''}
                      onClick={() => setActionType('reject')}>
                      <ShieldX className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                  <Textarea
                    value={verifyNotes}
                    onChange={e => setVerifyNotes(e.target.value)}
                    placeholder={actionType === 'verify' ? 'Add verification notes (optional)...' : 'Enter rejection reason...'}
                    className="w-full"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedRx(null)}>Close</Button>
                {selectedRx.verificationStatus === 'pending' && (
                  <Button
                    className={actionType === 'verify' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}
                    onClick={handleVerify}
                  >
                    {actionType === 'verify' ? <><ShieldCheck className="w-4 h-4 mr-1" /> Verify Prescription</> : <><ShieldX className="w-4 h-4 mr-1" /> Reject Prescription</>}
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
