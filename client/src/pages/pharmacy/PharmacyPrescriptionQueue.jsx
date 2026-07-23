import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, User, Search, CheckCircle, XCircle, Calendar, Eye, Clock,
  Pill, AlertTriangle, Activity, Timer, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// SLA helpers
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

const statusColors = {
  Active: 'bg-warning/10 text-warning',
  Dispensed: 'bg-success/10 text-success',
  'Partially Dispensed': 'bg-info/10 text-info',
  Cancelled: 'bg-destructive/10 text-destructive',
};

const statusBadge = (status) => {
  const colors = statusColors[status] || statusColors.Active;
  return <Badge className={colors}>{status}</Badge>;
};

const medicineStatusBadge = (isDispensed) => (
  <Badge className={isDispensed ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
    {isDispensed ? 'Dispensed' : 'Pending'}
  </Badge>
);

export default function PharmacyPrescriptionQueue() {
  const [queue, setQueue] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedRx, setSelectedRx] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const load = async () => {
    try {
      const res = await api.getPharmacyPrescriptions({});
      setQueue(res.prescriptions || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const filtered = queue.filter(r => {
    const ms = !search || (r.patientName || '').toLowerCase().includes(search.toLowerCase())
      || (r.prescriptionId || '').toLowerCase().includes(search.toLowerCase())
      || (r.doctorName || '').toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'All' || r.status === filter;
    return ms && mf;
  });

  const handleDispense = async (rxId, medicineIndex) => {
    setError('');
    setSuccessMsg('');
    try {
      const updated = await api.dispensePharmacyMedicine(rxId, { medicineIndex });
      setQueue(prev => prev.map(r => r._id === rxId ? updated : r));
      if (selectedRx?._id === rxId) setSelectedRx(updated);
      setSuccessMsg('Medicine dispensed successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setError(e.message || 'Failed to dispense medicine');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCancel = async (id) => {
    setError('');
    setSuccessMsg('');
    try {
      await api.dispensePharmacyMedicine(id, { cancel: true });
      setQueue(prev => prev.map(r => r._id === id ? { ...r, status: 'Cancelled' } : r));
      setSuccessMsg('Prescription cancelled');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) { console.error(e); }
  };

  const totalActive    = queue.filter(r => r.status === 'Active').length;
  const totalDispensed = queue.filter(r => r.status === 'Dispensed').length;
  const totalCancelled = queue.filter(r => r.status === 'Cancelled').length;
  const totalPartial   = queue.filter(r => r.status === 'Partially Dispensed').length;
  const avgMins = 12; // mock average

  const handleNotifyNextProvider = (rx) => {
    toast.info(`🔄 Notifying next preferred pharmacy for ${rx.patientName}'s prescription...`, { duration: 5000 });
    setTimeout(() => toast.success(`✅ Next provider (HealthFirst Medicals) notified.`, { duration: 4000 }), 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Prescription Queue</h1>
        <p className="text-muted-foreground mt-0.5">
          {totalActive > 0 && <span className="text-warning font-medium">{totalActive} active</span>}
          {totalActive > 0 && totalPartial > 0 && <span>, </span>}
          {totalPartial > 0 && <span className="text-info font-medium">{totalPartial} partially dispensed</span>}
          {totalActive === 0 && totalPartial === 0 && <span>No pending prescriptions</span>}
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active',        value: totalActive,    color: 'text-amber-600',   icon: Clock       },
          { label: 'Dispensed',     value: totalDispensed, color: 'text-emerald-600', icon: CheckCircle },
          { label: 'Cancelled',     value: totalCancelled, color: 'text-red-500',     icon: XCircle     },
          { label: 'Avg Time',      value: `${avgMins}m`,  color: 'text-primary',     icon: Timer       },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-card rounded-xl border border-border/60 p-4 flex items-center gap-3">
            <Icon className={`w-5 h-5 ${color}`} />
            <div>
              <p className={`text-xl font-bold font-heading ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-success text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {successMsg}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {['All', 'Active', 'Partially Dispensed', 'Dispensed', 'Cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {f} ({f === 'All' ? queue.length : queue.filter(r => r.status === f).length})
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by patient name, prescription ID, or doctor..." className="pl-10" />
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
            return (
              <motion.div key={rx._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${rx.isEmergency ? 'bg-destructive/10' : 'bg-warning/10'}`}>
                      {rx.isEmergency
                        ? <AlertTriangle className="w-6 h-6 text-destructive" />
                        : <FileText className="w-6 h-6 text-warning" />
                      }
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
                        {rx.status === 'Active' && rx.createdAt && (() => {
                          const u = urgencyLevel(rx.createdAt);
                          return u === 'critical'
                            ? <Badge className="text-[10px] bg-red-500/10 text-red-600 border-red-200 animate-pulse ml-1"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Overdue {minutesSince(rx.createdAt)}</Badge>
                            : u === 'urgent'
                            ? <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200 ml-1"><Timer className="w-2.5 h-2.5 mr-0.5" />Urgent {minutesSince(rx.createdAt)}</Badge>
                            : null;
                        })()}
                      </div>
                      {rx.diagnosis && (
                        <p className="text-xs text-muted-foreground/70 mt-1 italic">{rx.diagnosis}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Pill className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{dispensed}/{total} medicines dispensed</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {rx.isEmergency && <Badge className="bg-destructive/10 text-destructive">Emergency</Badge>}
                    {statusBadge(rx.status)}
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelectedRx(rx)}>
                      <Eye className="w-3.5 h-3.5" /> View Details
                    </Button>
                  </div>
                </div>
                {(rx.status === 'Active' || rx.status === 'Partially Dispensed') && (
                  <div className="flex gap-2 mt-4 pt-3 border-t border-border/40">
                    <Button size="sm" className="flex-1 gap-1 bg-success hover:bg-success/90"
                      onClick={() => setSelectedRx(rx)}>
                      <Activity className="w-4 h-4" /> Dispense Medicines
                    </Button>
                  </div>
                )}
                {rx.status === 'Cancelled' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/40">
                    <Button size="sm" variant="outline" className="flex-1 gap-2 text-primary text-xs"
                      onClick={() => handleNotifyNextProvider(rx)}>
                      <ArrowRight className="w-3.5 h-3.5" /> Notify Next Preferred Pharmacy
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
            className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg font-bold text-foreground">Prescription Details</h3>
                <div className="flex items-center gap-2">
                  {selectedRx.isEmergency && <Badge className="bg-destructive/10 text-destructive">Emergency</Badge>}
                  {statusBadge(selectedRx.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                  <User className="w-10 h-10 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{selectedRx.patientName}</p>
                    <p className="text-xs text-muted-foreground">Patient</p>
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
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground">Medicines ({selectedRx.medicines?.length || 0})</p>
                  <span className="text-xs text-muted-foreground">
                    #{selectedRx.prescriptionId}
                  </span>
                </div>
                <div className="space-y-2">
                  {selectedRx.medicines?.map((med, idx) => (
                    <div key={idx}
                      className={`p-4 rounded-xl border ${med.isDispensed ? 'bg-success/5 border-success/20' : 'bg-muted/20 border-border/40'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Pill className={`w-4 h-4 ${med.isDispensed ? 'text-success' : 'text-muted-foreground'}`} />
                            <h4 className="font-medium text-foreground text-sm">{med.medicineName}</h4>
                            {medicineStatusBadge(med.isDispensed)}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                            <span>Dosage: <strong>{med.dosage}</strong></span>
                            <span>Frequency: <strong>{med.frequency}</strong></span>
                            <span>Duration: <strong>{med.duration}</strong></span>
                            <span>Route: <strong>{med.route}</strong></span>
                            <span>Qty: <strong>{med.quantity}</strong></span>
                          </div>
                          {med.instructions && (
                            <p className="text-xs text-muted-foreground/70 mt-1 italic">{med.instructions}</p>
                          )}
                          {med.dispensedAt && (
                            <p className="text-xs text-success mt-1">
                              Dispensed by {med.dispensedBy} on {new Date(med.dispensedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                        {!med.isDispensed && selectedRx.status !== 'Cancelled' && (
                          <Button size="sm" className="gap-1 bg-success hover:bg-success/90 ml-3 shrink-0"
                            onClick={() => handleDispense(selectedRx._id, idx)}>
                            <CheckCircle className="w-3.5 h-3.5" /> Dispense
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedRx(null)}>Close</Button>
                {(selectedRx.status === 'Active' || selectedRx.status === 'Partially Dispensed') && (
                  <Button variant="outline" className="flex-1 gap-1 text-destructive"
                    onClick={() => { handleCancel(selectedRx._id); setSelectedRx(null); }}>
                    <XCircle className="w-4 h-4" /> Cancel Prescription
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