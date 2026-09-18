import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, User, Calendar, Save, Stethoscope, Pill, FlaskConical, Activity, Clock, Phone, Mail, MapPin, AlertCircle, ChevronDown, ChevronUp, Search, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { api, apiClient, getApiBaseUrl } from '@/lib/api';
import { toast } from 'sonner';
import { getISTDateString } from '@/lib/dateUtils';

const typeIcons = {
  Prescription: { icon: Pill, color: 'text-success', bg: 'bg-success/10' },
  'Lab Report': { icon: FlaskConical, color: 'text-warning', bg: 'bg-warning/10' },
  Diagnosis: { icon: Activity, color: 'text-primary', bg: 'bg-primary/10' },
  'discharge_summary': { icon: FileText, color: 'text-info', bg: 'bg-info/10' },
};

export default function DoctorConsultations() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [expanded, setExpanded] = useState(null);
  
  // Form fields
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [recordType, setRecordType] = useState('Prescription');
  const [notes, setNotes] = useState('');
  const [chiefComplaints, setChiefComplaints] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUp, setFollowUp] = useState('');

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await api.getRecords();
      const recordsArray = data?.data || data?.records || data || [];
      setRecords(recordsArray.filter(r => 
        r.doctor?.toLowerCase().includes(user?.name?.toLowerCase())
      ));
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadRecords(); }, [user?.name]);

  const handleDownloadPdf = async (recordId) => {
    try {
      const res = await apiClient.get(`/records/${recordId}/prescription-pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prescription-${recordId.slice(-8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(e.message); }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = !search || 
      r.patient?.toLowerCase().includes(search.toLowerCase()) ||
      r.diagnosis?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'All' || r.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSave = async () => {
    if (!patientName || !diagnosis) return;
    try {
      await api.createRecord({
        patient: patientName,
        doctor: user?.name,
        date: getISTDateString(),
        diagnosis,
        prescription,
        type: recordType,
        notes,
        data: {
          patient: { name: patientName, age: patientAge, gender: patientGender, phone: patientPhone },
          chiefComplaints,
          diagnosis,
          medications: prescription.split('\n').filter(m => m.trim()),
          advice,
          followUp,
          date: getISTDateString(),
        },
      });
      setShowForm(false); 
      setPatientName(''); setPatientAge(''); setPatientGender(''); setPatientPhone('');
      setDiagnosis(''); setPrescription(''); setNotes('');
      setChiefComplaints(''); setAdvice(''); setFollowUp('');
      loadRecords();
    } catch (e) { toast.error(e.message); }
  };

  const resetForm = () => {
    setPatientName(''); setPatientAge(''); setPatientGender(''); setPatientPhone('');
    setDiagnosis(''); setPrescription(''); setNotes('');
    setChiefComplaints(''); setAdvice(''); setFollowUp('');
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Consultations</h1>
          <p className="text-muted-foreground">{filteredRecords.length} records found</p>
        </div>
        <Button className="gap-2" onClick={() => { resetForm(); setShowForm(true); }}>
          <Stethoscope className="w-4 h-4" /> New Record
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search patients or diagnosis..." 
            className="pl-10" 
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['All', 'Prescription', 'Lab Report', 'Diagnosis'].map(t => (
            <button 
              key={t} 
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${typeFilter === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
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

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No consultation records found</p>
          <p className="text-sm text-muted-foreground/70">Create your first record</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((rec, i) => {
            const cfg = typeIcons[rec.type] || typeIcons.Diagnosis;
            const Icon = cfg.icon;
            const isExpanded = expanded === rec._id;
            
            return (
              <motion.div 
                key={rec._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-2xl border border-border/60 overflow-hidden"
              >
                {/* Card Header */}
                <div 
                  onClick={() => setExpanded(isExpanded ? null : rec._id)}
                  className="p-5 cursor-pointer hover:bg-muted/30 transition-all"
                >
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

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border/60 bg-muted/20"
                    >
                      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Patient Info */}
                        <div>
                          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" /> Patient Details
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div><span className="text-muted-foreground">Name:</span> <span className="text-foreground ml-2">{rec.patient}</span></div>
                            {rec.data?.patient?.age && <div><span className="text-muted-foreground">Age:</span> <span className="text-foreground ml-2">{rec.data.patient.age}</span></div>}
                            {rec.data?.patient?.gender && <div><span className="text-muted-foreground">Gender:</span> <span className="text-foreground ml-2">{rec.data.patient.gender}</span></div>}
                            {rec.data?.patient?.phone && <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground ml-2">{rec.data.patient.phone}</span></div>}
                          </div>
                        </div>

                        {/* Medical Details */}
                        <div>
                          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" /> Medical Details
                          </h4>
                          <div className="space-y-3 text-sm">
                            {rec.data?.chiefComplaints && (
                              <div>
                                <p className="text-muted-foreground mb-1">Chief Complaints</p>
                                <p className="text-foreground">{rec.data.chiefComplaints}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-muted-foreground mb-1">Diagnosis</p>
                              <p className="text-foreground font-medium">{rec.diagnosis}</p>
                            </div>
                          </div>
                        </div>

                        {/* Prescription */}
                        {(rec.prescription || rec.data?.medications) && (
                          <div className="md:col-span-2">
                            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                              <Pill className="w-4 h-4 text-success" /> Prescription
                            </h4>
                            <div className="bg-success/5 rounded-xl p-4">
                              <pre className="text-sm text-foreground whitespace-pre-wrap">{rec.prescription || rec.data?.medications?.join('\n')}</pre>
                            </div>
                          </div>
                        )}

                        {/* Advice & Follow-up */}
                        {(rec.data?.advice || rec.data?.followUp) && (
                          <div className="md:col-span-2">
                            <div className="flex flex-col sm:flex-row gap-4">
                              {rec.data?.advice && (
                                <div className="flex-1 bg-primary/5 rounded-xl p-4">
                                  <p className="text-xs text-primary font-medium mb-1">Advice</p>
                                  <p className="text-sm text-foreground">{rec.data.advice}</p>
                                </div>
                              )}
                              {rec.data?.followUp && (
                                <div className="flex-1 bg-warning/5 rounded-xl p-4">
                                  <p className="text-xs text-warning font-medium mb-1">Follow-up</p>
                                  <p className="text-sm text-foreground">{rec.data.followUp}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {rec.notes && (
                          <div className="md:col-span-2">
                            <p className="text-xs text-muted-foreground mb-1">Notes</p>
                            <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{rec.notes}</p>
                          </div>
                        )}

                        {/* Download PDF */}
                        <div className="md:col-span-2 flex justify-end">
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => handleDownloadPdf(rec._id)}>
                            <Download className="w-4 h-4" /> Download PDF
                          </Button>
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

      {/* New Record Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" 
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-heading text-xl font-bold text-foreground mb-4">New Consultation Record</h3>
            
            <div className="space-y-4">
              {/* Patient Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Patient Name *</label>
                  <Input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Type</label>
                  <div className="flex gap-2">
                    {['Prescription', 'Lab Report', 'Diagnosis'].map(t => (
                      <button 
                        key={t} 
                        onClick={() => setRecordType(t)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${recordType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Patient Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Age</label>
                  <Input value={patientAge} onChange={e => setPatientAge(e.target.value)} placeholder="Years" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Gender</label>
                  <Input value={patientGender} onChange={e => setPatientGender(e.target.value)} placeholder="Male/Female" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                  <Input value={patientPhone} onChange={e => setPatientPhone(e.target.value)} placeholder="+91..." />
                </div>
              </div>

              {/* Chief Complaints */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Chief Complaints</label>
                <Input value={chiefComplaints} onChange={e => setChiefComplaints(e.target.value)} placeholder="What brings the patient in..." />
              </div>

              {/* Diagnosis */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Diagnosis *</label>
                <Input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Medical diagnosis..." />
              </div>

              {/* Medications */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Medications (one per line)</label>
                <textarea 
                  value={prescription} 
                  onChange={e => setPrescription(e.target.value)} 
                  placeholder="Medicine 1 - dosage&#10;Medicine 2 - dosage..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-24" 
                />
              </div>

              {/* Advice & Follow-up */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Advice</label>
                  <textarea 
                    value={advice} 
                    onChange={e => setAdvice(e.target.value)} 
                    placeholder="Diet, rest, precautions..."
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-20" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Follow-up</label>
                  <Input value={followUp} onChange={e => setFollowUp(e.target.value)} placeholder="e.g., After 7 days" />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Additional Notes</label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Any other observations..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-20" 
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={!patientName || !diagnosis}>
                <Save className="w-4 h-4" /> Save Record
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}