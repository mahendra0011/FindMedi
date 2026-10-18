import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, User, ClipboardList, CheckCircle, Truck, Search, FlaskConical, CalendarDays, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import type { ApiRow, Unmodelled } from '@/lib/apiTypes';

// Statuses must match the LabBooking model enum — earlier this page used a
// private vocabulary (Requested/Assigned/Collected/Received at Lab) that the
// backend dropped, so every assignment silently no-opped.
const statusColors = {
  Pending: 'bg-primary/10 text-primary',
  Confirmed: 'bg-warning/10 text-warning',
  'Sample Collected': 'bg-info/10 text-info',
  Processing: 'bg-success/10 text-success',
  Completed: 'bg-success/10 text-success',
};

const nextStatus = { Pending: 'Confirmed', Confirmed: 'Sample Collected', 'Sample Collected': 'Processing' };

const mapBooking = (b: Unmodelled, i: Unmodelled) => ({
  id: b._id || `col_${i}`,
  patient: b.patientName || b.patient || 'Unknown',
  address: b.homeCollectionAddress || b.address || '',
  tests: b.tests || [],
  status: b.status || 'Pending',
  phlebotomist: b.phlebotomist || '',
  requestedDate: (b.bookingDate ? String(b.bookingDate).split('T')[0] : '') || b.createdAt?.split('T')[0] || '',
  time: b.timeSlot || b.time || '',
});

export default function LabSampleCollection() {
  const [collections, setCollections] = useState<ApiRow[]>([]);
  const [phlebotomists, setPhlebotomists] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getLabBookings({}),
      api.getLabPhlebotomists().catch(() => ({ phlebotomists: [] })),
    ])
      .then(([res, staff]) => {
        setCollections((res.bookings || []).map(mapBooking));
        setPhlebotomists((staff.phlebotomists || []).map((p: Unmodelled) => p.name).filter(Boolean));
      })
      .catch((e) => { console.error(e); toast.error('Failed to load collections'); })
      .finally(() => setLoading(false));
  }, []);

  const assignPhlebotomist = async (id: Unmodelled, name: Unmodelled) => {
    try {
      await api.updateLabBooking(id, { phlebotomist: name, status: 'Confirmed' });
      setCollections(prev => prev.map(c => c.id === id ? { ...c, phlebotomist: name, status: 'Confirmed' } : c));
      toast.success(`Assigned to ${name}`);
    } catch (e) { console.error(e); toast.error('Assignment failed'); }
    setAssigning(null);
  };

  const advanceStatus = async (id: Unmodelled) => {
    try {
      const c = collections.find(c => c.id === id);
      const next = nextStatus[c?.status] || c?.status;
      await api.updateLabBooking(id, { status: next });
      setCollections(prev => prev.map(c => c.id === id ? { ...c, status: next } : c));
      toast.success(`Status updated to ${next}`);
    } catch (e) { console.error(e); toast.error('Status update failed'); }
  };

  const filtered = collections.filter(c =>
    c.patient.toLowerCase().includes(search.toLowerCase()) ||
    c.address.toLowerCase().includes(search.toLowerCase()) ||
    c.tests.some((t: Unmodelled) => t.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Sample Collection</h1>
        <p className="text-muted-foreground">Manage home collection requests</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{collections.filter(c => c.status === 'Pending').length}</p>
          <p className="text-sm text-muted-foreground">Awaiting Assignment</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-2">
            <User className="w-5 h-5 text-warning" />
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{collections.filter(c => c.status === 'Confirmed').length}</p>
          <p className="text-sm text-muted-foreground">Assigned</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center mb-2">
            <CheckCircle className="w-5 h-5 text-info" />
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{collections.filter(c => c.status === 'Sample Collected').length}</p>
          <p className="text-sm text-muted-foreground">Collected Today</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mb-2">
            <Truck className="w-5 h-5 text-success" />
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{collections.filter(c => c.status === 'Processing').length}</p>
          <p className="text-sm text-muted-foreground">Received at Lab</p>
        </motion.div>
      </div>

      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search patient, address, or test..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <FlaskConical className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No collection requests found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-heading font-semibold text-foreground">{c.patient}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {c.address || 'Address not set'}
                  </p>
                </div>
                <Badge className={`${statusColors[c.status]} border-0`}>{c.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {c.tests.map((t: Unmodelled) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {c.requestedDate}</span>
                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {c.phlebotomist || 'Unassigned'}</span>
              </div>
              <div className="flex gap-2">
                {c.status === 'Pending' && (
                  <div className="flex gap-2 w-full">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setAssigning(assigning === c.id ? null : c.id)}>
                      Assign Phlebotomist
                    </Button>
                  </div>
                )}
                {c.status === 'Confirmed' && (
                  <Button size="sm" className="flex-1 gap-1" onClick={() => advanceStatus(c.id)}>
                    <CheckCircle className="w-3.5 h-3.5" /> Mark Collected
                  </Button>
                )}
                {c.status === 'Sample Collected' && (
                  <Button size="sm" className="flex-1 gap-1" onClick={() => advanceStatus(c.id)}>
                    <Truck className="w-3.5 h-3.5" /> Receive at Lab
                  </Button>
                )}
                {c.status === 'Processing' && (
                  <span className="flex-1 text-center text-xs text-success font-medium py-2">Received ✓</span>
                )}
              </div>
              {assigning === c.id && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <p className="text-xs font-medium text-foreground mb-2">Select Phlebotomist</p>
                  {phlebotomists.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active phlebotomists found — invite users with the Phlebotomist role.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {phlebotomists.map(p => (
                        <button key={p} onClick={() => assignPhlebotomist(c.id, p)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
