import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, User, Pill, Send, Plus, X, Search, Calendar, Filter, Printer, Download, Eye, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const initialPrescription = {
  patientName: '', age: '', gender: '', phone: '', email: '', address: '',
  chiefComplaints: '', diagnosis: '',
  medications: [{ name: '', dosage: '', frequency: '', instructions: '' }],
  advice: '', followUp: '',
};

export default function DoctorPrescriptions() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState(initialPrescription);
  const [saving, setSaving] = useState(false);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await api.getRecords();
      const arr = data?.records || data || [];
      setRecords(arr.filter(r =>
        r.doctor?.toLowerCase().includes(user?.name?.toLowerCase()) &&
        r.type === 'Prescription'
      ));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadRecords(); }, [user?.name, loadRecords]);

  const filtered = records.filter(r =>
    !search || r.patient?.toLowerCase().includes(search.toLowerCase()) ||
    r.diagnosis?.toLowerCase().includes(search.toLowerCase())
  );

  const addMedication = () => {
    setForm({ ...form, medications: [...form.medications, { name: '', dosage: '', frequency: '', instructions: '' }] });
  };

  const removeMedication = (idx) => {
    setForm({ ...form, medications: form.medications.filter((_, i) => i !== idx) });
  };

  const updateMedication = (idx, field, value) => {
    const meds = [...form.medications];
    meds[idx][field] = value;
    setForm({ ...form, medications: meds });
  };

  const handleGenerate = async () => {
    if (!form.patientName || !form.diagnosis) return;
    setSaving(true);
    try {
      const meds = form.medications.filter(m => m.name.trim());
      await api.createRecord({
        patient: form.patientName,
        doctor: user?.name,
        diagnosis: form.diagnosis,
        prescription: meds.map(m => `${m.name} - ${m.dosage} - ${m.frequency} ${m.instructions ? `(${m.instructions})` : ''}`).join('\n'),
        type: 'Prescription',
        notes: `Chief Complaints: ${form.chiefComplaints}\nAdvice: ${form.advice}\nFollow-up: ${form.followUp}`,
        data: {
          patient: { name: form.patientName, age: form.age, gender: form.gender, phone: form.phone, email: form.email, address: form.address },
          doctor: { name: user?.name, specialization: user?.specialization || '' },
          chiefComplaints: form.chiefComplaints,
          diagnosis: form.diagnosis,
          medications: meds,
          advice: form.advice,
          followUp: form.followUp,
          date: new Date().toISOString().split('T')[0],
        },
      });
      await api.createNotification({
        title: 'New Prescription',
        message: `Dr. ${user?.name} has generated a prescription for ${form.patientName}`,
        type: 'records',
      });
      setShowForm(false);
      setForm(initialPrescription);
      loadRecords();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const resetForm = () => {
    setForm(initialPrescription);
    setShowForm(false);
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">E-Prescriptions</h1>
          <p className="text-muted-foreground">{filtered.length} prescriptions</p>
        </div>
        <Button className="gap-2" onClick={() => { setForm(initialPrescription); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> New Prescription
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <Pill className="w-6 h-6 mx-auto text-success mb-1" />
          <p className="text-2xl font-bold text-foreground">{records.length}</p>
          <p className="text-xs text-muted-foreground">Total Prescriptions</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <User className="w-6 h-6 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{new Set(records.map(r => r.patient)).size}</p>
          <p className="text-xs text-muted-foreground">Patients</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <Calendar className="w-6 h-6 mx-auto text-info mb-1" />
          <p className="text-2xl font-bold text-foreground">{records.filter(r => r.date === new Date().toISOString().split('T')[0]).length}</p>
          <p className="text-xs text-muted-foreground">Today</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <Activity className="w-6 h-6 mx-auto text-warning mb-1" />
          <p className="text-2xl font-bold text-foreground">{records.reduce((s, r) => s + ((r.data?.medications?.length) || 0), 0)}</p>
          <p className="text-xs text-muted-foreground">Medications</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by patient or diagnosis..." className="pl-10" />
      </div>

      {/* Prescription List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No prescriptions found</p>
          <p className="text-sm text-muted-foreground/70">Create your first e-prescription</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rec, i) => {
            const isExpanded = expanded === rec._id;
            return (
              <motion.div key={rec._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card rounded-2xl border border-border/60 overflow-hidden">
                <div onClick={() => setExpanded(isExpanded ? null : rec._id)}
                  className="p-5 cursor-pointer hover:bg-muted/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                        <Pill className="w-6 h-6 text-success" />
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold text-foreground">{rec.patient}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{rec.date}</span>
                          <Badge className="bg-success/10 text-success">Prescription</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">{rec.diagnosis}</p>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border/60 bg-muted/20">
                      <div className="p-5 space-y-4">
                        {rec.data?.patient && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            {rec.data.patient.age && <div><span className="text-muted-foreground">Age:</span> <span className="text-foreground ml-1">{rec.data.patient.age}</span></div>}
                            {rec.data.patient.gender && <div><span className="text-muted-foreground">Gender:</span> <span className="text-foreground ml-1">{rec.data.patient.gender}</span></div>}
                            {rec.data.patient.phone && <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground ml-1">{rec.data.patient.phone}</span></div>}
                            {rec.data.doctor?.name && <div><span className="text-muted-foreground">Doctor:</span> <span className="text-foreground ml-1">{rec.data.doctor.name}</span></div>}
                          </div>
                        )}
                        {rec.data?.chiefComplaints && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Chief Complaints</p>
                            <p className="text-sm text-foreground">{rec.data.chiefComplaints}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Diagnosis</p>
                          <p className="text-sm text-foreground font-medium">{rec.diagnosis}</p>
                        </div>
                        {rec.data?.medications?.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Medications</p>
                            <div className="bg-success/5 rounded-xl p-4 space-y-2">
                              {rec.data.medications.map((m, j) => (
                                <div key={j} className="flex items-center gap-2 text-sm">
                                  <Pill className="w-3.5 h-3.5 text-success" />
                                  <span className="font-medium text-foreground">{m.name}</span>
                                  <span className="text-muted-foreground">{m.dosage}</span>
                                  <span className="text-muted-foreground">{m.frequency}</span>
                                  {m.instructions && <Badge variant="outline" className="text-[10px]">{m.instructions}</Badge>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          {rec.data?.advice && (
                            <div className="flex-1 bg-primary/5 rounded-xl p-3">
                              <p className="text-xs text-primary font-medium mb-1">Advice</p>
                              <p className="text-sm text-foreground">{rec.data.advice}</p>
                            </div>
                          )}
                          {rec.data?.followUp && (
                            <div className="flex-1 bg-warning/5 rounded-xl p-3">
                              <p className="text-xs text-warning font-medium mb-1">Follow-up</p>
                              <p className="text-sm text-foreground">{rec.data.followUp}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* New Prescription Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={resetForm}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-xl font-bold text-foreground mb-4">Create E-Prescription</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Patient Name *</label>
                  <Input value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value })} placeholder="Full name" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Age</label>
                    <Input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="Age" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Gender</label>
                    <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Chief Complaints</label>
                <Input value={form.chiefComplaints} onChange={e => setForm({ ...form, chiefComplaints: e.target.value })} placeholder="Enter chief complaints" />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Diagnosis *</label>
                <Input value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} placeholder="Enter diagnosis" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Medications</label>
                  <Button type="button" size="sm" variant="outline" className="gap-1" onClick={addMedication}>
                    <Plus className="w-3 h-3" /> Add Medication
                  </Button>
                </div>
                {form.medications.map((med, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-start">
                    <Input value={med.name} onChange={e => updateMedication(idx, 'name', e.target.value)} placeholder="Medicine name" className="flex-[2]" />
                    <Input value={med.dosage} onChange={e => updateMedication(idx, 'dosage', e.target.value)} placeholder="Dosage" className="w-20" />
                    <Input value={med.frequency} onChange={e => updateMedication(idx, 'frequency', e.target.value)} placeholder="Frequency" className="w-24" />
                    <Input value={med.instructions} onChange={e => updateMedication(idx, 'instructions', e.target.value)} placeholder="Instructions" className="flex-1" />
                    <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeMedication(idx)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Advice</label>
                  <textarea value={form.advice} onChange={e => setForm({ ...form, advice: e.target.value })}
                    placeholder="Diet, rest, precautions..."
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-20" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Follow-up</label>
                  <Input value={form.followUp} onChange={e => setForm({ ...form, followUp: e.target.value })} placeholder="e.g., After 7 days" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={resetForm}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleGenerate} disabled={!form.patientName || !form.diagnosis || saving}>
                <Send className="w-4 h-4" /> {saving ? 'Generating...' : 'Generate & Send'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
