import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, User, Calendar, Save, Stethoscope, Pill, FlaskConical, Activity, Clock, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const typeIcons = {
  Prescription: { icon: Pill, color: 'text-success', bg: 'bg-success/10' },
  'Lab Report': { icon: FlaskConical, color: 'text-warning', bg: 'bg-warning/10' },
  Diagnosis: { icon: Activity, color: 'text-primary', bg: 'bg-primary/10' },
};

export default function ClinicConsultations() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [expanded, setExpanded] = useState(null);

  const [patientName, setPatientName] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [recordType, setRecordType] = useState('Diagnosis');
  const [notes, setNotes] = useState('');
  const [chiefComplaints, setChiefComplaints] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUp, setFollowUp] = useState('');

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await api.getRecords();
      const arr = data?.records || data || [];
      setRecords(arr.filter(r => r.doctor?.toLowerCase().includes(user?.name?.toLowerCase())));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadRecords(); }, [user?.name]);

  const filtered = records.filter(r => {
    const m = !search || r.patient?.toLowerCase().includes(search.toLowerCase()) || r.diagnosis?.toLowerCase().includes(search.toLowerCase());
    const t = typeFilter === 'All' || r.type === typeFilter;
    return m && t;
  });

  const handleSave = async () => {
    if (!patientName || !diagnosis) return;
    try {
      await api.createRecord({
        patient: patientName, doctor: user?.name, date: new Date().toISOString().split('T')[0],
        diagnosis, prescription, type: recordType, notes,
        data: { patient: { name: patientName }, chiefComplaints, diagnosis, medications: prescription.split('\n').filter(m => m.trim()), advice, followUp, date: new Date().toISOString().split('T')[0] },
      });
      setShowForm(false);
      setPatientName(''); setDiagnosis(''); setPrescription(''); setNotes('');
      setChiefComplaints(''); setAdvice(''); setFollowUp('');
      loadRecords();
    } catch (e) { console.error(e); }
  };

  const resetForm = () => {
    setPatientName(''); setDiagnosis(''); setPrescription(''); setNotes('');
    setChiefComplaints(''); setAdvice(''); setFollowUp('');
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Consultation Notes</h1>
          <p className="text-muted-foreground">{filtered.length} records</p>
        </div>
        <Button className="gap-2" onClick={() => { resetForm(); setShowForm(true); }}>
          <Stethoscope className="w-4 h-4" /> New Entry
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients or diagnosis..." className="pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['All', 'Prescription', 'Lab Report', 'Diagnosis'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${typeFilter === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-primary">{records.filter(r => r.type === 'Prescription').length}</p>
          <p className="text-xs text-muted-foreground">Prescriptions</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-warning">{records.filter(r => r.type === 'Lab Report').length}</p>
          <p className="text-xs text-muted-foreground">Lab Reports</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-success">{records.filter(r => r.type === 'Diagnosis').length}</p>
          <p className="text-xs text-muted-foreground">Diagnoses</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-info">{new Set(records.map(r => r.patient)).size}</p>
          <p className="text-xs text-muted-foreground">Patients</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No consultation records found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rec, i) => {
            const cfg = typeIcons[rec.type] || typeIcons.Diagnosis;
            const Icon = cfg.icon;
            const isExpanded = expanded === rec._id;
            return (
              <motion.div key={rec._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card rounded-2xl border border-border/60 overflow-hidden">
                <div onClick={() => setExpanded(isExpanded ? null : rec._id)} className="p-5 cursor-pointer hover:bg-muted/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${cfg.color}`} />
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold text-foreground">{rec.patient}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{rec.date}</span>
                          <Badge className={`${cfg.bg} ${cfg.color}`}>{rec.type}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">{rec.diagnosis}</p>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground mt-2" /> : <ChevronDown className="w-5 h-5 text-muted-foreground mt-2" />}
                    </div>
                  </div>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      className="border-t border-border/60 bg-muted/20 p-5 space-y-4">
                      {rec.data?.chiefComplaints && <div><p className="text-xs text-muted-foreground mb-1">Chief Complaints</p><p className="text-sm">{rec.data.chiefComplaints}</p></div>}
                      <div><p className="text-xs text-muted-foreground mb-1">Diagnosis</p><p className="text-sm font-medium">{rec.diagnosis}</p></div>
                      {(rec.prescription || rec.data?.medications) && (
                        <div><p className="text-xs text-muted-foreground mb-2">Medications</p>
                          <div className="bg-success/5 rounded-xl p-4"><pre className="text-sm whitespace-pre-wrap">{rec.prescription || rec.data?.medications?.join('\n')}</pre></div>
                        </div>
                      )}
                      <div className="flex gap-4">
                        {rec.data?.advice && <div className="flex-1 bg-primary/5 rounded-xl p-3"><p className="text-xs text-primary mb-1">Advice</p><p className="text-sm">{rec.data.advice}</p></div>}
                        {rec.data?.followUp && <div className="flex-1 bg-warning/5 rounded-xl p-3"><p className="text-xs text-warning mb-1">Follow-up</p><p className="text-sm">{rec.data.followUp}</p></div>}
                      </div>
                      {rec.notes && <div><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="text-sm bg-muted/30 rounded-lg p-3">{rec.notes}</p></div>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-xl font-bold text-foreground mb-4">New Consultation Note</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Patient Name *</label>
                  <Input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Type</label>
                  <div className="flex gap-2">
                    {['Diagnosis', 'Prescription', 'Lab Report'].map(t => (
                      <button key={t} onClick={() => setRecordType(t)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${recordType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{t}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div><label className="text-sm font-medium mb-1.5 block">Chief Complaints</label>
                <Input value={chiefComplaints} onChange={e => setChiefComplaints(e.target.value)} placeholder="What brings the patient in..." /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Diagnosis *</label>
                <Input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Diagnosis" /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Medications (one per line)</label>
                <textarea value={prescription} onChange={e => setPrescription(e.target.value)} placeholder="Medicine - dosage"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none h-24" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1.5 block">Advice</label>
                  <textarea value={advice} onChange={e => setAdvice(e.target.value)} placeholder="Diet, rest..."
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none h-20" /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Follow-up</label>
                  <Input value={followUp} onChange={e => setFollowUp(e.target.value)} placeholder="e.g. 7 days" /></div>
              </div>
              <div><label className="text-sm font-medium mb-1.5 block">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional observations..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none h-20" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={!patientName || !diagnosis}><Save className="w-4 h-4" /> Save</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
