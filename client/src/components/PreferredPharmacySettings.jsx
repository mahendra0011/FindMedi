import { useState } from 'react';
import { Pill, Plus, Trash2, GripVertical, ArrowUp, ArrowDown, SwitchCamera, AlertCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePreferredPharmacies } from '@/context/PreferredPharmacyContext';

const ALL_AVAILABLE_STORES = [
  { id: 's1', name: 'MedPlus Pharmacy' },
  { id: 's2', name: 'HealthFirst Medicals' },
  { id: 's3', name: 'City Drug House' },
  { id: 's4', name: 'Apollo Pharmacy' },
  { id: 's5', name: 'Wellness Mart' },
  { id: 's6', name: 'Generic Medicos' },
];

export default function PreferredPharmacySettings({ onSave }) {
  const { pharmacies, autoRetryEnabled, addPharmacy, removePharmacy, reorderPharmacies, setAutoRetry, setPharmacies } = usePreferredPharmacies();
  const [showAdd, setShowAdd] = useState(false);

  const availableToAdd = ALL_AVAILABLE_STORES.filter(
    s => !pharmacies.find(p => p.id === s.id)
  );

  const handleAdd = (store) => {
    addPharmacy(store);
    setShowAdd(false);
  };

  const handleReorder = (index, direction) => {
    const toIndex = direction === 'up' ? index - 1 : index + 1;
    if (toIndex < 0 || toIndex >= pharmacies.length) return;
    reorderPharmacies(index, toIndex);
  };

  return (
    <div className="bg-card rounded-xl border shadow-sm p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-heading font-semibold text-lg text-card-foreground flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary" /> Preferred Pharmacies
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Set your preferred pharmacy priority. When an Rx is rejected, the next store in line is automatically tried.
          </p>
        </div>
      </div>

      {/* Auto-Retry Toggle */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/10 mb-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Auto-retry with next preferred pharmacy if rejected</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              When ON, your prescription will be automatically forwarded to the next preferred pharmacy if rejected. This is an opt-in feature — your consent is required before auto-switching.
            </p>
          </div>
        </div>
        <Switch checked={autoRetryEnabled} onCheckedChange={setAutoRetry} className="shrink-0" />
      </div>

      {/* Priority List */}
      {pharmacies.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-border/60 rounded-xl">
          <Pill className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">No preferred pharmacies added yet</p>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Pharmacy
          </Button>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {pharmacies.map((p, i) => (
            <div key={p.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border transition-all',
                i === 0 ? 'border-primary/30 bg-primary/5' : 'border-border/60 bg-card'
              )}>
              <div className="flex flex-col gap-0.5">
                <button onClick={() => handleReorder(i, 'up')} disabled={i === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed">
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button onClick={() => handleReorder(i, 'down')} disabled={i === pharmacies.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed">
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>

              <Badge className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                i === 0 ? 'bg-primary text-primary-foreground' :
                i === 1 ? 'bg-primary/70 text-primary-foreground' :
                'bg-muted-foreground/20 text-muted-foreground'
              )}>
                {i + 1}
              </Badge>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  Priority {i + 1}
                  {i === 0 && <span className="text-primary ml-1">(First try)</span>}
                </p>
              </div>

              <button onClick={() => removePharmacy(p.id)}
                className="text-muted-foreground hover:text-red-500 transition-colors p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Pharmacy */}
      {showAdd && (
        <div className="mb-4 p-4 rounded-xl border border-border/60 bg-muted/20">
          <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Select a pharmacy to add
          </p>
          {availableToAdd.length === 0 ? (
            <p className="text-xs text-muted-foreground">All available pharmacies are already in your list.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableToAdd.map(s => (
                <button key={s.id} onClick={() => handleAdd(s)}
                  className="w-full text-left p-2.5 rounded-lg border border-border/60 hover:border-primary/30 hover:bg-primary/5 transition-all text-sm text-foreground">
                  {s.name}
                </button>
              ))}
            </div>
          )}
          <Button variant="ghost" size="sm" className="mt-2 text-xs rounded-lg" onClick={() => setShowAdd(false)}>
            Cancel
          </Button>
        </div>
      )}

      {pharmacies.length > 0 && (
        <Button variant="outline" size="sm" className="gap-1.5 rounded-lg text-xs" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Pharmacy
        </Button>
      )}

      {/* Info box */}
      <div className="mt-6 p-3 rounded-xl bg-muted/30 border border-border/40">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Note:</strong> These preferences are account-level defaults. You can override them at checkout for individual orders.
          {autoRetryEnabled && ' Auto-retry is ON — rejected prescriptions will be forwarded automatically with your consent.'}
        </p>
      </div>
    </div>
  );
}
