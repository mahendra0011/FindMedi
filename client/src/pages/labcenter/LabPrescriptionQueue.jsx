import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, User, Search, CheckCircle, XCircle, Calendar, Eye, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const defaultRxQueue = [
  { _id: 'rx1', patientName: 'Ravi Kumar', doctorName: 'Dr. Sharma', tests: ['Complete Blood Count', 'Lipid Profile'], uploadedAt: new Date().toISOString().split('T')[0], status: 'Pending', notes: '' },
  { _id: 'rx2', patientName: 'Sneha Reddy', doctorName: 'Dr. Patel', tests: ['MRI Brain (Plain)'], uploadedAt: new Date(Date.now() - 86400000).toISOString().split('T')[0], status: 'Pending', notes: '' },
  { _id: 'rx3', patientName: 'Amit Patel', doctorName: 'Dr. Verma', tests: ['X-Ray Chest PA View', 'ECG'], uploadedAt: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], status: 'Verified', notes: 'Rx verified' },
];

const statusColors = { Pending: 'bg-warning/10 text-warning', Verified: 'bg-success/10 text-success', Rejected: 'bg-destructive/10 text-destructive' };

export default function LabPrescriptionQueue() {
  const [queue, setQueue] = useState(() => {
    const stored = localStorage.getItem('medicore_labcenter_rx_queue');
    return stored ? JSON.parse(stored) : defaultRxQueue;
  });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedRx, setSelectedRx] = useState(null);

  useEffect(() => { localStorage.setItem('medicore_labcenter_rx_queue', JSON.stringify(queue)); }, [queue]);

  const filtered = queue.filter(r => {
    const ms = !search || r.patientName.toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'All' || r.status === filter;
    return ms && mf;
  });

  const handleAction = (id, status) => {
    setQueue(prev => prev.map(r => r._id === id ? { ...r, status } : r));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Prescription Verification Queue</h1>
        <p className="text-muted-foreground">{queue.filter(r => r.status === 'Pending').length} pending verifications</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['All', 'Pending', 'Verified', 'Rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {f} ({f === 'All' ? queue.length : queue.filter(r => r.status === f).length})
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by patient name..." className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No prescriptions in queue</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rx, i) => {
            const colors = statusColors[rx.status] || statusColors.Pending;
            return (
              <motion.div key={rx._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-foreground">{rx.patientName}</h3>
                      <p className="text-sm text-muted-foreground">{rx.doctorName}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" /> {rx.uploadedAt}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {rx.tests.map((t, j) => <Badge key={j} variant="secondary" className="text-[10px]">{t}</Badge>)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={colors}>{rx.status}</Badge>
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelectedRx(rx)}>
                      <Eye className="w-3.5 h-3.5" /> View Rx
                    </Button>
                  </div>
                </div>
                {rx.status === 'Pending' && (
                  <div className="flex gap-2 mt-4 pt-3 border-t border-border/40">
                    <Button size="sm" className="flex-1 gap-1 bg-success hover:bg-success/90" onClick={() => handleAction(rx._id, 'Verified')}>
                      <CheckCircle className="w-4 h-4" /> Accept & Verify
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1 text-destructive" onClick={() => handleAction(rx._id, 'Rejected')}>
                      <XCircle className="w-4 h-4" /> Reject
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
            className="bg-card rounded-2xl border border-border w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Prescription Details</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                <User className="w-10 h-10 text-primary" />
                <div>
                  <p className="font-medium text-foreground">{selectedRx.patientName}</p>
                  <p className="text-sm text-muted-foreground">{selectedRx.doctorName}</p>
                </div>
              </div>
              <div className="bg-muted/20 rounded-xl p-6 flex items-center justify-center border border-dashed border-border">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Prescription Image Preview</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">(Uploaded by patient)</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Requested Tests</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRx.tests.map((t, j) => <Badge key={j}>{t}</Badge>)}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedRx(null)}>Close</Button>
              {selectedRx.status === 'Pending' && (
                <>
                  <Button className="flex-1 gap-1 bg-success" onClick={() => { handleAction(selectedRx._id, 'Verified'); setSelectedRx(null); }}>
                    <CheckCircle className="w-4 h-4" /> Verify
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
