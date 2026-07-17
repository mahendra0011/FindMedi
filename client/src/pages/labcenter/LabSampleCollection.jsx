import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, User, ClipboardList, CheckCircle, Truck, Search, FlaskConical, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const statusColors = {
  Requested: 'bg-primary/10 text-primary',
  Assigned: 'bg-warning/10 text-warning',
  Collected: 'bg-info/10 text-info',
  'Received at Lab': 'bg-success/10 text-success',
};

const phlebotomists = ['Rajesh Kumar', 'Priya Sharma', 'Amit Singh', 'Sneha Patel'];

const defaultCollections = [
  { id: 'col_1', patient: 'Arun Nair', address: '42, MG Road, Andheri East, Mumbai', tests: ['CBC', 'Lipid Profile'], status: 'Requested', phlebotomist: '', requestedDate: '2026-07-18', time: '07:30 AM' },
  { id: 'col_2', patient: 'Meera Joshi', address: '15, Lake View Apartments, Koregaon Park, Pune', tests: ['Thyroid Panel', 'Vitamin D'], status: 'Assigned', phlebotomist: 'Rajesh Kumar', requestedDate: '2026-07-17', time: '08:00 AM' },
  { id: 'col_3', patient: 'Vikram Deshmukh', address: '88, Sunrise Colony, Baner, Pune', tests: ['HbA1c', 'FBS', 'Creatinine'], status: 'Collected', phlebotomist: 'Priya Sharma', requestedDate: '2026-07-17', time: '09:15 AM' },
  { id: 'col_4', patient: 'Sunita Rao', address: '7B, Green Park Extension, Delhi', tests: ['Liver Function', 'Complete Urine'], status: 'Received at Lab', phlebotomist: 'Amit Singh', requestedDate: '2026-07-16', time: '06:45 AM' },
];

export default function LabSampleCollection() {
  const [collections, setCollections] = useState([]);
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('medicore_labcenter_collections');
    if (stored) setCollections(JSON.parse(stored));
    else { setCollections(defaultCollections); localStorage.setItem('medicore_labcenter_collections', JSON.stringify(defaultCollections)); }
  }, []);

  const persist = (data) => {
    localStorage.setItem('medicore_labcenter_collections', JSON.stringify(data));
    setCollections(data);
  };

  const assignPhlebotomist = (id, name) => {
    const updated = collections.map(c => c.id === id ? { ...c, phlebotomist: name, status: 'Assigned' } : c);
    persist(updated);
    setAssigning(null);
  };

  const advanceStatus = (id) => {
    const flow = { Requested: 'Assigned', Assigned: 'Collected', Collected: 'Received at Lab' };
    const updated = collections.map(c => c.id === id ? { ...c, status: flow[c.status] || c.status } : c);
    persist(updated);
  };

  const today = new Date().toISOString().split('T')[0];
  const filtered = collections.filter(c =>
    c.patient.toLowerCase().includes(search.toLowerCase()) ||
    c.address.toLowerCase().includes(search.toLowerCase()) ||
    c.tests.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

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
          <p className="font-heading text-2xl font-bold text-foreground">{collections.filter(c => c.status === 'Requested').length}</p>
          <p className="text-sm text-muted-foreground">Pending Collection</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-2">
            <User className="w-5 h-5 text-warning" />
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{collections.filter(c => c.status === 'Assigned').length}</p>
          <p className="text-sm text-muted-foreground">Assigned</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center mb-2">
            <CheckCircle className="w-5 h-5 text-info" />
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{collections.filter(c => c.status === 'Collected').length}</p>
          <p className="text-sm text-muted-foreground">Collected Today</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mb-2">
            <Truck className="w-5 h-5 text-success" />
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{collections.filter(c => c.status === 'Received at Lab').length}</p>
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
                    <MapPin className="w-3 h-3" /> {c.address}
                  </p>
                </div>
                <Badge className={`${statusColors[c.status]} border-0`}>{c.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {c.tests.map(t => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {c.requestedDate}</span>
                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {c.phlebotomist || 'Unassigned'}</span>
              </div>
              <div className="flex gap-2">
                {c.status === 'Requested' && (
                  <div className="flex gap-2 w-full">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setAssigning(assigning === c.id ? null : c.id)}>
                      Assign Phlebotomist
                    </Button>
                  </div>
                )}
                {c.status === 'Assigned' && (
                  <Button size="sm" className="flex-1 gap-1" onClick={() => advanceStatus(c.id)}>
                    <CheckCircle className="w-3.5 h-3.5" /> Mark Collected
                  </Button>
                )}
                {c.status === 'Collected' && (
                  <Button size="sm" className="flex-1 gap-1" onClick={() => advanceStatus(c.id)}>
                    <Truck className="w-3.5 h-3.5" /> Receive at Lab
                  </Button>
                )}
                {c.status === 'Received at Lab' && (
                  <span className="flex-1 text-center text-xs text-success font-medium py-2">Received ✓</span>
                )}
              </div>
              {assigning === c.id && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <p className="text-xs font-medium text-foreground mb-2">Select Phlebotomist</p>
                  <div className="flex flex-wrap gap-2">
                    {phlebotomists.map(p => (
                      <button key={p} onClick={() => assignPhlebotomist(c.id, p)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
