import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Pill, Plus, Clock, CheckCircle, AlertTriangle, X, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const pharmApi = {
  getMedicines: (p = {}) => api.dispatch(() => Promise.resolve({ medicines: [] }), '/pharmacy/medicines?' + new URLSearchParams(p)),
  createMedicine: (b) => api.dispatch(() => Promise.resolve({}), '/pharmacy/medicines', { method: 'POST', body: JSON.stringify(b) }),
  updateMedicine: (id, b) => api.dispatch(() => Promise.resolve({}), `/pharmacy/medicines/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteMedicine: (id) => api.dispatch(() => Promise.resolve({}), `/pharmacy/medicines/${id}`, { method: 'DELETE' }),
  stockUpdate: (id, b) => api.dispatch(() => Promise.resolve({}), `/pharmacy/medicines/${id}/stock`, { method: 'PUT', body: JSON.stringify(b) }),
  getPrescriptions: (p = {}) => api.dispatch(() => Promise.resolve({ prescriptions: [] }), '/pharmacy/prescriptions?' + new URLSearchParams(p)),
  createPrescription: (b) => api.dispatch(() => Promise.resolve({}), '/pharmacy/prescriptions', { method: 'POST', body: JSON.stringify(b) }),
  dispense: (id, b) => api.dispatch(() => Promise.resolve({}), `/pharmacy/prescriptions/${id}/dispense`, { method: 'PUT', body: JSON.stringify(b) }),
  getStats: () => api.dispatch(() => Promise.resolve({ totalMedicines: 0, lowStock: 0, expiringSoon: 0, totalPrescriptions: 0, pendingDispense: 0 }), '/pharmacy/stats'),
};

const categoryOptions = ['Antibiotic', 'Analgesic', 'Antihypertensive', 'Antidiabetic', 'Antacid', 'Antihistamine', 'Antiviral', 'Antifungal', 'Vitamin', 'Steroid', 'Anesthetic', 'Diuretic', 'Cardiac', 'Respiratory', 'Other'];
const formOptions = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Drop', 'Cream', 'Inhaler', 'Infusion', 'Other'];
const routeOptions = ['Oral', 'IV', 'IM', 'Topical', 'Sublingual', 'Inhalation', 'Other'];

export default function Pharmacy() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('inventory');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', genericName: '', category: 'Antibiotic', form: 'Tablet', manufacturer: '', batchNumber: '', expiryDate: '', purchasePrice: '', sellingPrice: '', currentStock: '', reorderLevel: '10', rackLocation: '' });
  const [newRx, setNewRx] = useState({ patientName: '', patientId: '', diagnosis: '', medicines: [{ medicineName: '', dosage: '', frequency: '1-0-1', duration: '7 days', quantity: 1 }] });

  const { data: medsData } = useQuery({ queryKey: ['medicines', search], queryFn: () => pharmApi.getMedicines({ search }) });
  const { data: rxData } = useQuery({ queryKey: ['prescriptions', search], queryFn: () => pharmApi.getPrescriptions({ search }) });
  const { data: stats } = useQuery({ queryKey: ['pharm-stats'], queryFn: pharmApi.getStats });

  const medicines = medsData?.medicines || [];
  const prescriptions = rxData?.prescriptions || [];

  const createMedMut = useMutation({ mutationFn: pharmApi.createMedicine, onSuccess: () => { qc.invalidateQueries(['medicines']); setShowAdd(false); } });
  const stockMut = useMutation({ mutationFn: ({ id, ...b }) => pharmApi.stockUpdate(id, b), onSuccess: () => qc.invalidateQueries(['medicines']) });
  const createRxMut = useMutation({ mutationFn: pharmApi.createPrescription, onSuccess: () => { qc.invalidateQueries(['prescriptions']); setShowAdd(false); } });
  const dispenseMut = useMutation({ mutationFn: ({ id, ...b }) => pharmApi.dispense(id, b), onSuccess: () => qc.invalidateQueries(['prescriptions']) });

  const addRxMed = () => setNewRx(r => ({ ...r, medicines: [...r.medicines, { medicineName: '', dosage: '', frequency: '1-0-1', duration: '7 days', quantity: 1 }] }));
  const removeRxMed = (i) => setNewRx(r => ({ ...r, medicines: r.medicines.filter((_, idx) => idx !== i) }));
  const updateRxMed = (i, f, v) => setNewRx(r => ({ ...r, medicines: r.medicines.map((m, idx) => idx === i ? { ...m, [f]: v } : m) }));

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Pharmacy</h1><p className="page-subtitle">{stats?.totalMedicines || 0} medicines · {stats?.pendingDispense || 0} pending</p></div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { l: 'Total Medicines', v: stats?.totalMedicines || 0, c: 'text-foreground' },
          { l: 'Low Stock', v: stats?.lowStock || 0, c: 'text-warning' },
          { l: 'Expiring Soon', v: stats?.expiringSoon || 0, c: 'text-destructive' },
          { l: 'Prescriptions', v: stats?.totalPrescriptions || 0, c: 'text-info' },
          { l: 'Pending', v: stats?.pendingDispense || 0, c: 'text-warning' },
        ].map(s => (
          <div key={s.l} className="bg-card rounded-xl border p-4 text-center">
            <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 border-b pb-3">
        {['inventory', 'prescriptions'].map(t => (
          <button key={t} onClick={() => { setTab(t); setShowAdd(t === 'prescriptions'); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
            {t === 'inventory' ? 'Inventory' : 'Prescriptions'}
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        <>
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search medicines..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Add Medicine</Button>
          </div>
          <div className="space-y-3">
            {medicines.map(med => {
              const expiring = new Date(med.expiryDate) < new Date(Date.now() + 90 * 86400000);
              const low = med.currentStock <= med.reorderLevel;
              return (
                <div key={med._id} className="bg-card rounded-xl border p-4">
                  <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === med._id ? null : med._id)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Pill className="w-5 h-5 text-primary" /></div>
                      <div><p className="font-medium text-foreground">{med.name} <span className="text-muted-foreground text-xs ml-1">{med.form}</span></p>
                        <p className="text-xs text-muted-foreground">{med.genericName} · {med.manufacturer}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${low ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>{med.currentStock} in stock</span>
                      {expiring && <span className="text-xs text-destructive font-medium">Expiring</span>}
                    </div>
                  </div>
                  {expandedId === med._id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><p className="text-muted-foreground">Batch</p><p className="font-medium">{med.batchNumber}</p></div>
                        <div><p className="text-muted-foreground">Expiry</p><p className="font-medium">{new Date(med.expiryDate).toLocaleDateString()}</p></div>
                        <div><p className="text-muted-foreground">Purchase Price</p><p className="font-medium">₹{med.purchasePrice}</p></div>
                        <div><p className="text-muted-foreground">Selling Price</p><p className="font-medium">₹{med.sellingPrice}</p></div>
                        <div><p className="text-muted-foreground">Reorder Level</p><p className="font-medium">{med.reorderLevel}</p></div>
                        <div><p className="text-muted-foreground">Rack</p><p className="font-medium">{med.rackLocation || 'N/A'}</p></div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { const q = prompt('Add stock quantity:'); if (q) stockMut.mutate({ id: med._id, quantity: parseInt(q), type: 'add' }); }}>Add Stock</Button>
                        <Button size="sm" variant="outline" onClick={() => { const q = prompt('Deduct quantity:'); if (q) stockMut.mutate({ id: med._id, quantity: parseInt(q), type: 'deduct' }); }}>Deduct</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'prescriptions' && (
        <div className="space-y-4">
          {prescriptions.map(rx => (
            <div key={rx._id} className="bg-card rounded-xl border p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">{rx.prescriptionId}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rx.status === 'Dispensed' ? 'bg-success/10 text-success' : rx.status === 'Partially Dispensed' ? 'bg-warning/10 text-warning' : 'bg-info/10 text-info'}`}>{rx.status}</span>
                  </div>
                  <p className="text-sm font-medium">{rx.patientName}</p>
                  <p className="text-xs text-muted-foreground">Dr. {rx.doctorName} · {rx.medicines.length} medicine(s)</p>
                </div>
                <span className="text-xs text-muted-foreground"><Clock className="w-3 h-3 inline mr-1" />{new Date(rx.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="space-y-2">
                {rx.medicines.map((m, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.medicineName} {m.dosage}</p>
                      <p className="text-xs text-muted-foreground">{m.frequency} · {m.duration} · Qty: {m.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.isDispensed ? <CheckCircle className="w-4 h-4 text-success" /> : <Button size="sm" variant="outline" onClick={() => dispenseMut.mutate({ id: rx._id, medicineIndex: i })}>Dispense</Button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {prescriptions.length === 0 && <div className="text-center py-20"><Pill className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No prescriptions</p></div>}
        </div>
      )}

      {/* Add Medicine Modal */}
      {showAdd && tab === 'inventory' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">Add Medicine</h2><button onClick={() => setShowAdd(false)}><X className="w-5 h-5" /></button></div>
            <div className="grid grid-cols-2 gap-4">
              {[{ key: 'name', label: 'Medicine Name' }, { key: 'genericName', label: 'Generic Name' }, { key: 'manufacturer', label: 'Manufacturer' }, { key: 'batchNumber', label: 'Batch Number' }, { key: 'expiryDate', label: 'Expiry Date', type: 'date' }, { key: 'purchasePrice', label: 'Purchase Price', type: 'number' }, { key: 'sellingPrice', label: 'Selling Price', type: 'number' }, { key: 'currentStock', label: 'Initial Stock', type: 'number' }, { key: 'reorderLevel', label: 'Reorder Level', type: 'number' }, { key: 'rackLocation', label: 'Rack Location' }].map(f => (
                <div key={f.key}><label className="text-sm font-medium mb-1 block">{f.label}</label><Input type={f.type || 'text'} value={newMed[f.key]} onChange={e => setNewMed({ ...newMed, [f.key]: e.target.value })} /></div>
              ))}
              <div><label className="text-sm font-medium mb-1 block">Category</label><select value={newMed.category} onChange={e => setNewMed({ ...newMed, category: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="text-sm font-medium mb-1 block">Form</label><select value={newMed.form} onChange={e => setNewMed({ ...newMed, form: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{formOptions.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            </div>
            <Button className="w-full mt-6" onClick={() => createMedMut.mutate(newMed)} disabled={createMedMut.isPending || !newMed.name}>Add Medicine</Button>
          </div>
        </div>
      )}

      {/* Create Prescription Modal */}
      {showAdd && tab === 'prescriptions' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">New Prescription</h2><button onClick={() => setShowAdd(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1 block">Patient</label><Input value={newRx.patientName} onChange={e => setNewRx({ ...newRx, patientName: e.target.value })} placeholder="Patient name" /></div>
              <div><label className="text-sm font-medium mb-1 block">Diagnosis</label><Input value={newRx.diagnosis} onChange={e => setNewRx({ ...newRx, diagnosis: e.target.value })} placeholder="Diagnosis" /></div>
              <div>
                <div className="flex items-center justify-between mb-2"><label className="text-sm font-medium">Medicines</label><Button size="sm" variant="outline" onClick={addRxMed}><Plus className="w-3 h-3 mr-1" />Add</Button></div>
                {newRx.medicines.map((m, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 mb-2">
                    <Input className="col-span-2" placeholder="Medicine name" value={m.medicineName} onChange={e => updateRxMed(i, 'medicineName', e.target.value)} />
                    <Input placeholder="Dosage" value={m.dosage} onChange={e => updateRxMed(i, 'dosage', e.target.value)} />
                    <select value={m.frequency} onChange={e => updateRxMed(i, 'frequency', e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">{[1,2,3,4].map(n => <option key={n}>{n}-0-{n}</option>)}</select>
                    <div className="flex gap-1"><Input placeholder="Qty" type="number" value={m.quantity} onChange={e => updateRxMed(i, 'quantity', parseInt(e.target.value))} />{newRx.medicines.length > 1 && <button onClick={() => removeRxMed(i)} className="p-2 text-destructive"><X className="w-4 h-4" /></button>}</div>
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={() => createRxMut.mutate(newRx)} disabled={createRxMut.isPending || !newRx.patientName}>Create Prescription</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}