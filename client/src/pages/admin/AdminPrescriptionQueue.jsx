import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, User, Search, CheckCircle, XCircle, Calendar, Eye, Clock, Pill, AlertTriangle, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

const statusColors = {
  Active: 'bg-warning/10 text-warning',
  Dispensed: 'bg-success/10 text-success',
  'Partially Dispensed': 'bg-info/10 text-info',
  Cancelled: 'bg-destructive/10 text-destructive',
};

export default function AdminPrescriptionQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedRx, setSelectedRx] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getPharmacyPrescriptions({});
        setQueue(res.prescriptions || []);
      } catch { toast.error('Failed to load prescriptions'); }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = queue.filter(r => {
    const ms = !search || (r.patientName || '').toLowerCase().includes(search.toLowerCase())
      || (r.prescriptionId || '').toLowerCase().includes(search.toLowerCase())
      || (r.doctorName || '').toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'All' || r.status === filter;
    return ms && mf;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Prescription Queue</h1>
        <p className="text-muted-foreground">{queue.filter(r => r.status === 'Active').length} active, {queue.filter(r => r.status === 'Partially Dispensed').length} partially dispensed</p>
      </div>

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
            const colors = statusColors[rx.status] || statusColors.Active;
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
                    <Badge className={colors}>{rx.status}</Badge>
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelectedRx(rx)}>
                      <Eye className="w-3.5 h-3.5" /> View
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {selectedRx && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedRx(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg font-bold text-foreground">Prescription Details</h3>
                <div className="flex items-center gap-2">
                  {selectedRx.isEmergency && <Badge className="bg-destructive/10 text-destructive">Emergency</Badge>}
                  <Badge className={statusColors[selectedRx.status] || statusColors.Active}>{selectedRx.status}</Badge>
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
              <div className="mb-6">
                <p className="text-xs text-muted-foreground mb-3">Medicines ({selectedRx.medicines?.length || 0})</p>
                <div className="space-y-2">
                  {selectedRx.medicines?.map((med, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border ${med.isDispensed ? 'bg-success/5 border-success/20' : 'bg-muted/20 border-border/40'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Pill className={`w-4 h-4 ${med.isDispensed ? 'text-success' : 'text-muted-foreground'}`} />
                        <h4 className="font-medium text-foreground text-sm">{med.medicineName}</h4>
                        <Badge className={med.isDispensed ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>{med.isDispensed ? 'Dispensed' : 'Pending'}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground ml-6">
                        <span>Dosage: <strong>{med.dosage}</strong></span>
                        <span>Frequency: <strong>{med.frequency}</strong></span>
                        <span>Duration: <strong>{med.duration}</strong></span>
                        <span>Route: <strong>{med.route}</strong></span>
                        <span>Qty: <strong>{med.quantity}</strong></span>
                      </div>
                      {med.instructions && <p className="text-xs text-muted-foreground/70 mt-1 ml-6 italic">{med.instructions}</p>}
                      {med.dispensedAt && <p className="text-xs text-success mt-1 ml-6">Dispensed by {med.dispensedBy} on {new Date(med.dispensedAt).toLocaleString()}</p>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedRx(null)}>Close</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}