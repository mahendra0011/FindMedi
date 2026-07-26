import { useState } from 'react';
import { motion } from 'framer-motion';
import { HeartHandshake, Pill, Plus, Trash2, X, GripVertical, ArrowUp, ArrowDown, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { usePreferredPharmacies } from '@/context/PreferredPharmacyContext';

export default function PatientPreferred() {
  const { pharmacies, addPharmacy, removePharmacy, reorderPharmacies, autoRetryEnabled, setAutoRetryEnabled } = usePreferredPharmacies();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return toast.error('Enter a pharmacy or lab name');
    addPharmacy({ id: `p${crypto.randomUUID()}`, name: newName.trim() });
    setNewName('');
    setShowAdd(false);
    toast.success('Added to priority list');
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    reorderPharmacies(index, index - 1);
  };

  const handleMoveDown = (index) => {
    if (index === pharmacies.length - 1) return;
    reorderPharmacies(index, index + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Preferred Pharmacies & Labs</h1>
          <p className="text-muted-foreground">Priority list for auto-fallback when prescriptions are rejected</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1" /> Add Provider
        </Button>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-card border border-border/50">
          <h2 className="font-semibold mb-4">Add Pharmacy or Lab</h2>
          <div className="flex gap-3">
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Enter pharmacy or lab name" className="flex-1" />
            <Button onClick={handleAdd} disabled={!newName.trim()}>Add</Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </motion.div>
      )}

      <div className="p-6 rounded-2xl bg-card border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-primary" /> Your Priority List
          </h3>
          <button onClick={() => { setAutoRetryEnabled(!autoRetryEnabled); toast.success(autoRetryEnabled ? 'Auto-retry disabled' : 'Auto-retry enabled'); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${autoRetryEnabled ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
            {autoRetryEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            Auto-Retry
          </button>
        </div>

        {pharmacies.length === 0 ? (
          <div className="text-center py-12">
            <Pill className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No preferred providers added yet.</p>
            <p className="text-xs text-muted-foreground mt-1">When a pharmacy/lab rejects your prescription, it will auto-forward to the next in this list.</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Your First Provider
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {pharmacies.map((p, i) => (
              <motion.div key={p.id || p._id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => handleMoveUp(i)} disabled={i === 0} className={`p-0.5 ${i === 0 ? 'opacity-20' : 'hover:text-primary'}`}>
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleMoveDown(i)} disabled={i === pharmacies.length - 1} className={`p-0.5 ${i === pharmacies.length - 1 ? 'opacity-20' : 'hover:text-primary'}`}>
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {p.priority || i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">Pharmacy</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { removePharmacy(p.id); toast.success('Removed from priority list'); }}>
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-6 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
          When a pharmacy or lab rejects your prescription, it automatically forwards to the next provider in your priority list. Drag or use the arrows to reorder.
        </div>
      </div>
    </div>
  );
}
