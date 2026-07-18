import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Plus, X, CalendarDays, Activity, AlertTriangle, CheckCircle, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

const statusColors = {
  Operational: 'bg-success/10 text-success',
  Maintenance: 'bg-warning/10 text-warning',
  Down: 'bg-destructive/10 text-destructive',
};

const equipmentTypes = ['MRI', 'CT', 'X-Ray', 'Ultrasound', 'ECG', 'Blood Analyzer', 'Centrifuge', 'Spectrophotometer', 'PCR Machine', 'Hematology Analyzer'];

const defaultEquipment = [
  { id: 'eq_1', name: 'Siemens Magnetom MRI', type: 'MRI', status: 'Operational', purchaseDate: '2024-03-15', lastMaintenance: '2026-06-01', nextMaintenance: '2026-09-01' },
  { id: 'eq_2', name: 'GE CT Scanner 128-slice', type: 'CT', status: 'Maintenance', purchaseDate: '2023-11-20', lastMaintenance: '2026-07-10', nextMaintenance: '2026-07-25' },
  { id: 'eq_3', name: 'Philips Digital X-Ray', type: 'X-Ray', status: 'Operational', purchaseDate: '2025-01-10', lastMaintenance: '2026-05-15', nextMaintenance: '2026-08-15' },
  { id: 'eq_4', name: 'Samsung Ultrasound WS80A', type: 'Ultrasound', status: 'Down', purchaseDate: '2022-08-05', lastMaintenance: '2026-04-20', nextMaintenance: '2026-07-20' },
  { id: 'eq_5', name: 'Abbott Blood Analyzer', type: 'Blood Analyzer', status: 'Operational', purchaseDate: '2024-06-01', lastMaintenance: '2026-06-28', nextMaintenance: '2026-09-28' },
];

export default function LabEquipment() {
  const [equipment, setEquipment] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newEq, setNewEq] = useState({ name: '', type: 'MRI', purchaseDate: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLabEquipment({}).then(res => {
      if (res.equipment && res.equipment.length > 0) setEquipment(res.equipment);
      else setEquipment(defaultEquipment);
    }).catch(() => setEquipment(defaultEquipment)).finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!newEq.name || !newEq.purchaseDate) return;
    try {
      const eq = await api.createLabEquipment({
        name: newEq.name,
        type: newEq.type,
        status: 'Operational',
        purchaseDate: newEq.purchaseDate,
        lastMaintenance: new Date().toISOString().split('T')[0],
        nextMaintenance: '',
      });
      setEquipment(prev => [eq, ...prev]);
      setNewEq({ name: '', type: 'MRI', purchaseDate: '' });
      setShowModal(false);
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (id, status) => {
    const updates = { status, lastMaintenance: status === 'Maintenance' ? new Date().toISOString().split('T')[0] : undefined };
    setEquipment(prev => prev.map(eq => eq.id === id ? { ...eq, ...updates } : eq));
    try { await api.updateLabEquipment(id, updates); } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Equipment</h1>
          <p className="text-muted-foreground">{equipment.length} equipment items</p>
        </div>
        <Button className="gap-2" onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Add Equipment</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mb-2">
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{equipment.filter(e => e.status === 'Operational').length}</p>
          <p className="text-sm text-muted-foreground">Operational</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-2">
            <Wrench className="w-5 h-5 text-warning" />
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{equipment.filter(e => e.status === 'Maintenance').length}</p>
          <p className="text-sm text-muted-foreground">Maintenance</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{equipment.filter(e => e.status === 'Down').length}</p>
          <p className="text-sm text-muted-foreground">Down</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{equipment.filter(e => e.status === 'Operational' || e.status === 'Maintenance').length}</p>
          <p className="text-sm text-muted-foreground">In Service</p>
        </motion.div>
      </div>

      {equipment.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <Wrench className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No equipment registered</p>
          <p className="text-sm text-muted-foreground/70">Add your diagnostic and imaging equipment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((eq, i) => (
            <motion.div key={eq.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">{eq.name}</h3>
                    <Badge variant="outline" className="text-xs mt-0.5">{eq.type}</Badge>
                  </div>
                </div>
                <Badge className={`${statusColors[eq.status]} border-0`}>{eq.status}</Badge>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                <div className="flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> Purchased: {eq.purchaseDate}</div>
                <div className="flex items-center gap-1.5"><Wrench className="w-3 h-3" /> Last: {eq.lastMaintenance}</div>
                {eq.nextMaintenance && <div className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> Next: {eq.nextMaintenance}</div>}
              </div>
              <div className="flex gap-2">
                {eq.status === 'Operational' && (
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-warning border-warning/30 hover:bg-warning/10" onClick={() => updateStatus(eq.id, 'Maintenance')}>
                    <Wrench className="w-3.5 h-3.5" /> Mark Maintenance
                  </Button>
                )}
                {eq.status === 'Maintenance' && (
                  <Button size="sm" className="flex-1 gap-1" onClick={() => updateStatus(eq.id, 'Operational')}>
                    <CheckCircle className="w-3.5 h-3.5" /> Mark Operational
                  </Button>
                )}
                {eq.status === 'Down' && (
                  <Button size="sm" className="flex-1 gap-1" onClick={() => updateStatus(eq.id, 'Maintenance')}>
                    <Wrench className="w-3.5 h-3.5" /> Send to Maintenance
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-foreground">Add Equipment</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Equipment Name *</label>
                <Input value={newEq.name} onChange={e => setNewEq(o => ({ ...o, name: e.target.value }))} placeholder="e.g. Siemens MRI 3T" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {equipmentTypes.map(t => (
                    <button key={t} onClick={() => setNewEq(o => ({ ...o, type: t }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${newEq.type === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Purchase Date *</label>
                <input type="date" value={newEq.purchaseDate} onChange={e => setNewEq(o => ({ ...o, purchaseDate: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleAdd} disabled={!newEq.name || !newEq.purchaseDate}>
                <Save className="w-4 h-4" /> Add Equipment
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
