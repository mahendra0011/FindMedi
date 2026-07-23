import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Calendar, FileText, Plus, Save, Clock, Phone, Mail, Activity, Heart, Thermometer, AlertCircle, ChevronRight, ChevronDown, Stethoscope, TestTube, Pill, Search, Filter, Clock3, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const statusColors = {
  Confirmed: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
  Pending: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
  Completed: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  Cancelled: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20' },
};

export default function DoctorPatients() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  
  // Record form
  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [recordType, setRecordType] = useState('Prescription');
  const [notes, setNotes] = useState('');
  const [chiefComplaints, setChiefComplaints] = useState('');
  const [advice, setAdvice] = useState('');
  const [followUp, setFollowUp] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [a, r] = await Promise.all([
        api.getAppointments(),
        api.getRecords(),
      ]);
      
      const myAppointments = a?.filter(apt => 
        apt.doctor?.toLowerCase().includes(user?.name?.toLowerCase()) ||
        apt.doctorId?.name?.toLowerCase().includes(user?.name?.toLowerCase())
      ) || [];
      
      setAppointments(myAppointments);
      setRecords(r?.records || r || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user?.name, loadData]);

  // Get unique patients
  const uniquePatients = [...new Map(appointments.map(a => [a.patient, a])).values()];
  
  const filteredPatients = uniquePatients.filter(p => 
    !search || p.patient?.toLowerCase().includes(search.toLowerCase())
  );

  const getPatientAppointments = (patientName) => appointments.filter(a => a.patient === patientName);
  const getPatientRecords = (patientName) => records.filter(r => r.patient === patientName);
  const getPatientRecordCount = (patientName) => getPatientRecords(patientName).length;
  const getVisitCount = (patientName) => getPatientAppointments(patientName).length;

  const handleSaveRecord = async () => {
    if (!selectedPatient || !diagnosis) return;
    try {
      await api.createRecord({
        patient: selectedPatient.patient,
        patientId: selectedPatient.patientId?._id || selectedPatient.patientId,
        doctor: user?.name,
        diagnosis,
        prescription,
        type: recordType,
        notes,
        data: {
          patient: { name: selectedPatient.patient },
          chiefComplaints,
          diagnosis,
          medications: prescription.split('\n').filter(p => p.trim()),
          advice,
          followUp,
          date: new Date().toISOString().split('T')[0],
        },
      });
      setSelectedPatient(null); 
      setDiagnosis(''); setPrescription(''); setNotes('');
      setChiefComplaints(''); setAdvice(''); setFollowUp('');
      loadData();
    } catch (e) { console.error(e); }
  };

  const openPatientDetail = (patient) => {
    setSelectedPatient(patient);
    setViewMode('detail');
  };

  const closeDetail = () => {
    setSelectedPatient(null);
    setViewMode('list');
    setExpanded(null);
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Stats
  const totalPatients = uniquePatients.length;
  const totalVisits = appointments.length;
  const completedVisits = appointments.filter(a => a.status === 'Completed').length;
  const pendingVisits = appointments.filter(a => a.status === 'Pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">My Patients</h1>
          <p className="text-muted-foreground">{filteredPatients.length} patients</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <Users className="w-6 h-6 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{totalPatients}</p>
          <p className="text-xs text-muted-foreground">Total Patients</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <Calendar className="w-6 h-6 mx-auto text-success mb-1" />
          <p className="text-2xl font-bold text-foreground">{totalVisits}</p>
          <p className="text-xs text-muted-foreground">Total Visits</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <TrendingUp className="w-6 h-6 mx-auto text-warning mb-1" />
          <p className="text-2xl font-bold text-foreground">{completedVisits}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <Clock3 className="w-6 h-6 mx-auto text-info mb-1" />
          <p className="text-2xl font-bold text-foreground">{pendingVisits}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Search patients..." 
          className="pl-10" 
        />
      </div>

      {/* Patient List */}
      {filteredPatients.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <Users className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No patients yet</p>
          <p className="text-sm text-muted-foreground/70">Patients who book appointments will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((apt, i) => {
            const patientRecords = getPatientRecordCount(apt.patient);
            const visitCount = getVisitCount(apt.patient);
            const colors = statusColors[apt.status] || statusColors.Pending;
            const isExpanded = expanded === apt.patient;
            
            return (
              <motion.div 
                key={apt._id || apt.patient + i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setExpanded(isExpanded ? null : apt.patient)}
                className="bg-card rounded-2xl border border-border/60 overflow-hidden cursor-pointer hover:shadow-lg transition-all"
              >
                {/* Patient Card Header */}
                <div className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <User className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-semibold text-foreground truncate">{apt.patient}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Last visit: {apt.date}</span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-muted/30 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-foreground">{visitCount}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Visits</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-primary">{patientRecords}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Records</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between mt-3">
                    <Badge className={`${colors.bg} ${colors.text}`}>{apt.status}</Badge>
                    <span className="text-xs text-muted-foreground">{apt.time}</span>
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="border-t border-border/60 bg-muted/20"
                    >
                      <div className="p-4 space-y-4">
                        {/* Visit History */}
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-2">Visit History</h4>
                          <div className="space-y-2">
                            {getPatientAppointments(apt.patient).slice(0, 3).map((visit, j) => (
                              <div key={visit._id || j} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded-lg">
                                <div>
                                  <span className="font-medium text-foreground">{visit.date}</span>
                                  <span className="text-muted-foreground ml-2">{visit.type}</span>
                                </div>
                                <Badge className={`${statusColors[visit.status]?.bg || 'bg-muted'} ${statusColors[visit.status]?.text || 'text-muted-foreground'}`}>
                                  {visit.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={(e) => { e.stopPropagation(); openPatientDetail(apt); }}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add Record
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

      {/* Add Record Modal */}
      {selectedPatient && viewMode === 'detail' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={closeDetail}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-xl font-bold text-foreground">Add Medical Record</h3>
              <Button variant="ghost" size="sm" onClick={closeDetail}>×</Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Patient</label>
                <Input value={selectedPatient.patient} disabled className="bg-muted" />
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

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Chief Complaints</label>
                <Input value={chiefComplaints} onChange={e => setChiefComplaints(e.target.value)} placeholder="What brings the patient in..." />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Diagnosis *</label>
                <Input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Medical diagnosis..." />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Medications (one per line)</label>
                <textarea 
                  value={prescription} 
                  onChange={e => setPrescription(e.target.value)} 
                  placeholder="Medicine 1 - dosage&#10;Medicine 2 - dosage..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-24" 
                />
              </div>

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
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={closeDetail}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleSaveRecord} disabled={!diagnosis}>
                <Save className="w-4 h-4" /> Save Record
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}