import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, User, Stethoscope, Pill, Activity, FileText, Clock, AlertCircle, CheckCircle, X, Plus, FlaskConical, Heart, ArrowRight, Bed, Calendar, Phone, Mail, Printer, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const consultationApi = {
  getTokens: async (p) => {
    try {
      return await api.getTokens(p);
    } catch {
      return { tokens: [] };
    }
  },
  getPatients: async (p) => {
    try {
      return await api.getPatients(p);
    } catch {
      return [];
    }
  },
  getRecords: async (p) => {
    try {
      return await api.getRecords(p);
    } catch {
      return { records: [] };
    }
  },
  createRecord: async (b) => {
    try {
      return await api.createRecord(b);
    } catch {
      return {};
    }
  },
  updateToken: async (id, b) => {
    try {
      return await api.startTokenConsultation(id);
    } catch {
      return {};
    }
  },
  completeToken: async (id) => {
    try {
      return await api.completeToken(id);
    } catch {
      return {};
    }
  },
  getStats: async () => {
    try {
      return await api.getTokenStats();
    } catch {
      return { waiting: 0, inConsultation: 0, completed: 0, total: 0 };
    }
  },
};

const statusColors = {
  Waiting: 'bg-warning/10 text-warning',
  Called: 'bg-info/10 text-info',
  'In Consultation': 'bg-primary/10 text-primary',
  Completed: 'bg-success/10 text-success',
  Skipped: 'bg-destructive/10 text-destructive',
};

const triageColors = {
  Emergency: 'bg-destructive text-destructive-foreground',
  Urgent: 'bg-orange-500 text-white',
  Normal: 'bg-primary text-primary-foreground',
  FollowUp: 'bg-info text-info-foreground',
};

const emptyConsultation = {
  patientName: '',
  patientId: '',
  uhid: '',
  age: '',
  gender: 'Male',
  phone: '',
  chiefComplaints: '',
  diagnosis: '',
  prescription: '',
  advice: '',
  followUp: '',
  notes: '',
  vitals: { bp: '', pulse: '', temperature: '', spO2: '', bloodSugar: '', weight: '' },
  investigations: [{ test: '', priority: 'Routine' }],
};

export default function DoctorConsultation() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState('queue');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showConsult, setShowConsult] = useState(false);
  const [consultForm, setConsultForm] = useState(emptyConsultation);
  const [activeConsultTab, setActiveConsultTab] = useState('vitals');
  const [showHistory, setShowHistory] = useState(false);
  const [patientHistory, setPatientHistory] = useState([]);

  const { data: tokensData } = useQuery({
    queryKey: ['consultation-tokens', search, deptFilter],
    queryFn: () => consultationApi.getTokens({ search, department: deptFilter }),
  });
  const { data: patientsData } = useQuery({
    queryKey: ['consultation-patients', search],
    queryFn: () => consultationApi.getPatients({ search }),
  });
  const { data: stats } = useQuery({
    queryKey: ['consultation-stats'],
    queryFn: consultationApi.getStats,
  });

  const tokens = tokensData?.tokens || [];
  const patients = patientsData || [];

  const createRecordMut = useMutation({
    mutationFn: consultationApi.createRecord,
    onSuccess: () => {
      qc.invalidateQueries(['consultation-tokens', 'consultation-stats']);
      setShowConsult(false);
      setConsultForm(emptyConsultation);
    },
  });

  const completeTokenMut = useMutation({
    mutationFn: consultationApi.completeToken,
    onSuccess: () => qc.invalidateQueries(['consultation-tokens', 'consultation-stats']),
  });

  const startConsultation = (token) => {
    setSelectedPatient(token);
    setConsultForm({
      ...emptyConsultation,
      patientName: token.patientName,
      patientId: token.patientId || '',
      uhid: token.uhid || '',
      phone: token.phone || '',
    });
    setShowConsult(true);
    setActiveConsultTab('vitals');
    loadPatientHistory(token.patientName);
  };

  const loadPatientHistory = async (patientName) => {
    try {
      const data = await consultationApi.getRecords({ search: patientName });
      setPatientHistory(data?.records || []);
    } catch (e) {
      setPatientHistory([]);
    }
  };

  const handleSaveConsultation = async () => {
    if (!consultForm.patientName || !consultForm.diagnosis) return;
    try {
      await consultationApi.createRecord({
        patient: consultForm.patientName,
        patientId: consultForm.patientId || undefined,
        diagnosis: consultForm.diagnosis,
        prescription: consultForm.prescription,
        type: 'Consultation',
        notes: consultForm.notes,
        data: {
          patient: {
            name: consultForm.patientName,
            age: consultForm.age,
            gender: consultForm.gender,
            phone: consultForm.phone,
          },
          vitals: consultForm.vitals,
          chiefComplaints: consultForm.chiefComplaints,
          diagnosis: consultForm.diagnosis,
          medications: consultForm.prescription.split('\n').filter(m => m.trim()),
          investigations: consultForm.investigations.filter(i => i.test.trim()),
          advice: consultForm.advice,
          followUp: consultForm.followUp,
          date: new Date().toISOString().split('T')[0],
        },
      });
      if (selectedPatient?._id) {
        await consultationApi.completeToken(selectedPatient._id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdmitToIPD = () => {
    navigate('/ipd');
  };

  const renderVitalsForm = () => (
    <div className="bg-muted/30 rounded-xl p-4 space-y-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Heart className="w-4 h-4 text-destructive" /> Patient Vitals
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Blood Pressure</label>
          <Input
            placeholder="120/80"
            value={consultForm.vitals.bp}
            onChange={e => setConsultForm(f => ({ ...f, vitals: { ...f.vitals, bp: e.target.value } }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Pulse (bpm)</label>
          <Input
            type="number"
            placeholder="72"
            value={consultForm.vitals.pulse}
            onChange={e => setConsultForm(f => ({ ...f, vitals: { ...f.vitals, pulse: e.target.value } }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Temperature (°F)</label>
          <Input
            type="number"
            placeholder="98.6"
            value={consultForm.vitals.temperature}
            onChange={e => setConsultForm(f => ({ ...f, vitals: { ...f.vitals, temperature: e.target.value } }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">SpO2 (%)</label>
          <Input
            type="number"
            placeholder="98"
            value={consultForm.vitals.spO2}
            onChange={e => setConsultForm(f => ({ ...f, vitals: { ...f.vitals, spO2: e.target.value } }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Blood Sugar</label>
          <Input
            type="number"
            placeholder="100"
            value={consultForm.vitals.bloodSugar}
            onChange={e => setConsultForm(f => ({ ...f, vitals: { ...f.vitals, bloodSugar: e.target.value } }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Weight (kg)</label>
          <Input
            type="number"
            placeholder="70"
            value={consultForm.vitals.weight}
            onChange={e => setConsultForm(f => ({ ...f, vitals: { ...f.vitals, weight: e.target.value } }))}
          />
        </div>
      </div>
    </div>
  );

  const renderClinicalForm = () => (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-xl p-4">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-warning" /> Chief Complaints
        </h4>
        <textarea
          value={consultForm.chiefComplaints}
          onChange={e => setConsultForm(f => ({ ...f, chiefComplaints: e.target.value }))}
          placeholder="Describe the patient's chief complaints..."
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-20"
        />
      </div>

      <div className="bg-muted/30 rounded-xl p-4">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Diagnosis
        </h4>
        <Input
          value={consultForm.diagnosis}
          onChange={e => setConsultForm(f => ({ ...f, diagnosis: e.target.value }))}
          placeholder="Enter medical diagnosis..."
          className="mb-2"
        />
        <textarea
          value={consultForm.notes}
          onChange={e => setConsultForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Additional clinical notes..."
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-20"
        />
      </div>

      <div className="bg-muted/30 rounded-xl p-4">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Pill className="w-4 h-4 text-success" /> Prescription / Medications
        </h4>
        <textarea
          value={consultForm.prescription}
          onChange={e => setConsultForm(f => ({ ...f, prescription: e.target.value }))}
          placeholder="Medicine 1 - dosage&#10;Medicine 2 - dosage&#10;Medicine 3 - dosage"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-24"
        />
      </div>

      <div className="bg-muted/30 rounded-xl p-4">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-info" /> Investigations / Lab Orders
        </h4>
        <div className="space-y-2">
          {consultForm.investigations.map((inv, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={inv.test}
                onChange={e => {
                  const newInv = [...consultForm.investigations];
                  newInv[idx] = { ...newInv[idx], test: e.target.value };
                  setConsultForm(f => ({ ...f, investigations: newInv }));
                }}
                placeholder="Test name (e.g., CBC, X-Ray)"
                className="flex-1"
              />
              <select
                value={inv.priority}
                onChange={e => {
                  const newInv = [...consultForm.investigations];
                  newInv[idx] = { ...newInv[idx], priority: e.target.value };
                  setConsultForm(f => ({ ...f, investigations: newInv }));
                }}
                className="h-10 px-2 rounded-lg border border-input bg-background text-sm"
              >
                <option>Routine</option>
                <option>Urgent</option>
                <option>STAT</option>
              </select>
              {consultForm.investigations.length > 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConsultForm(f => ({ ...f, investigations: f.investigations.filter((_, i) => i !== idx) }))}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConsultForm(f => ({ ...f, investigations: [...f.investigations, { test: '', priority: 'Routine' }] }))}
          >
            <Plus className="w-3 h-3 mr-1" /> Add Test
          </Button>
        </div>
      </div>
    </div>
  );

  const renderAdviceForm = () => (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-xl p-4">
        <h4 className="text-sm font-semibold mb-3">Advice & Recommendations</h4>
        <textarea
          value={consultForm.advice}
          onChange={e => setConsultForm(f => ({ ...f, advice: e.target.value }))}
          placeholder="Diet, rest, precautions, lifestyle changes..."
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-24"
        />
      </div>

      <div className="bg-muted/30 rounded-xl p-4">
        <h4 className="text-sm font-semibold mb-3">Follow-up Plan</h4>
        <Input
          value={consultForm.followUp}
          onChange={e => setConsultForm(f => ({ ...f, followUp: e.target.value }))}
          placeholder="e.g., Review after 7 days / Refer to specialist"
        />
      </div>

      <div className="bg-muted/30 rounded-xl p-4">
        <h4 className="text-sm font-semibold mb-3">Actions</h4>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleAdmitToIPD}>
            <Bed className="w-4 h-4 mr-1" /> Admit to IPD
          </Button>
          <Button variant="outline" onClick={() => navigate('/lab')}>
            <FlaskConical className="w-4 h-4 mr-1" /> Send to Lab
          </Button>
          <Button variant="outline" onClick={() => navigate('/pharmacy')}>
            <Pill className="w-4 h-4 mr-1" /> Send to Pharmacy
          </Button>
        </div>
      </div>
    </div>
  );

  const renderPatientHistory = () => (
    <div className="space-y-3 max-h-[300px] overflow-y-auto">
      {patientHistory.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No previous records found</p>
      ) : (
        patientHistory.map((rec, i) => (
          <div key={rec._id || i} className="bg-card rounded-lg border p-3 text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{rec.date}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${rec.type === 'Prescription' ? 'bg-success/10 text-success' : rec.type === 'Lab Report' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}`}>
                {rec.type}
              </span>
            </div>
            <p className="font-medium text-foreground">{rec.diagnosis}</p>
            {rec.prescription && <p className="text-xs text-muted-foreground mt-1">{rec.prescription}</p>}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="page-title">Doctor Consultation</h1>
        <p className="page-subtitle">
          {stats?.inConsultation || 0} in consultation · {stats?.waiting || 0} waiting
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { l: 'Waiting', v: stats?.waiting || 0, c: 'text-warning' },
          { l: 'In Consultation', v: stats?.inConsultation || 0, c: 'text-primary' },
          { l: 'Completed Today', v: stats?.completed || 0, c: 'text-success' },
          { l: 'Total Today', v: stats?.total || 0, c: 'text-foreground' },
        ].map(s => (
          <div key={s.l} className="bg-card rounded-xl border p-3 text-center">
            <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-[10px] text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-3">
        {[
          { id: 'queue', label: 'Consultation Queue', icon: Clock },
          { id: 'patients', label: 'Patient Lookup', icon: Search },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Consultation Queue Tab */}
      {tab === 'queue' && (
        <>
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name or token..."
                className="pl-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
            >
              <option value="All">All Departments</option>
              {['General', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'ENT', 'Ophthalmology', 'Dermatology'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {tokens.filter(t => t.status !== 'Completed' && t.status !== 'Skipped').map(token => (
              <div
                key={token._id}
                className={`bg-card rounded-xl border p-4 transition-all ${
                  token.status === 'In Consultation' ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' :
                  token.status === 'Called' ? 'border-warning/50 bg-warning/5' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[60px]">
                    <p className="text-2xl font-bold text-foreground">
                      {token.tokenNumber?.split('-').pop()}
                    </p>
                    <p className={`text-[10px] font-medium px-1 py-0.5 rounded ${triageColors[token.priority] || 'bg-muted text-muted-foreground'}`}>
                      {token.priority}
                    </p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium text-foreground">{token.patientName}</p>
                      {token.uhid && <span className="text-[10px] text-muted-foreground">{token.uhid}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {token.department} · {token.doctorName || 'Unassigned'} · #{token.queuePosition} in queue
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p><Clock className="w-3 h-3 inline mr-1" />{new Date(token.createdAt).toLocaleTimeString()}</p>
                    {token.estimatedWaitTime && <p>~{token.estimatedWaitTime} min wait</p>}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[token.status] || ''}`}>
                    {token.status}
                  </span>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  {token.status === 'Waiting' && (
                    <Button size="sm" onClick={() => startConsultation(token)}>
                      <Stethoscope className="w-3 h-3 mr-1" /> Start Consultation
                    </Button>
                  )}
                  {token.status === 'Called' && (
                    <Button size="sm" onClick={() => startConsultation(token)}>
                      <Stethoscope className="w-3 h-3 mr-1" /> Start Consultation
                    </Button>
                  )}
                  {token.status === 'In Consultation' && (
                    <Button size="sm" onClick={() => startConsultation(token)}>
                      <FileText className="w-3 h-3 mr-1" /> Continue Consultation
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {tokens.filter(t => t.status !== 'Completed' && t.status !== 'Skipped').length === 0 && (
              <div className="text-center py-20">
                <Stethoscope className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No patients in queue</p>
                <p className="text-sm text-muted-foreground/70">Generate a token from OPD Token System</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/opd-token')}>
                  Go to OPD Token
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Patient Lookup Tab */}
      {tab === 'patients' && (
        <>
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search patients by name or UHID..."
                className="pl-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={() => navigate('/patient-registration')}>
              <Plus className="w-4 h-4 mr-1" /> New Patient
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map(patient => (
              <div key={patient._id} className="bg-card rounded-xl border p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">{patient.uhid || 'No UHID'}</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm mb-3">
                  {patient.age && <p className="text-muted-foreground">Age: {patient.age} · {patient.gender}</p>}
                  {patient.phone && <p className="text-muted-foreground">{patient.phone}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => {
                    setConsultForm({
                      ...emptyConsultation,
                      patientName: patient.name,
                      patientId: patient._id,
                      uhid: patient.uhid || '',
                      age: patient.age || '',
                      gender: patient.gender || 'Male',
                      phone: patient.phone || '',
                    });
                    setShowConsult(true);
                    setActiveConsultTab('vitals');
                    loadPatientHistory(patient.name);
                  }}>
                    <Stethoscope className="w-3 h-3 mr-1" /> Consult
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setSelectedPatient(patient);
                    setShowHistory(true);
                    loadPatientHistory(patient.name);
                  }}>
                    <FileText className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            {patients.length === 0 && (
              <div className="col-span-full text-center py-20">
                <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Search for patients to start consultation</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Consultation Modal */}
      {showConsult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowConsult(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-card border-b z-10 p-6 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-heading text-xl font-bold text-foreground">
                      {consultForm.patientName}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {consultForm.age && `${consultForm.age} yrs`} {consultForm.gender && `· ${consultForm.gender}`} {consultForm.phone && `· ${consultForm.phone}`}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowConsult(false)} className="p-2 hover:bg-muted rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Consultation Tabs */}
              <div className="flex gap-2 border-b pb-2">
                {[
                  { id: 'vitals', label: 'Vitals', icon: Heart },
                  { id: 'clinical', label: 'Clinical', icon: Activity },
                  { id: 'advice', label: 'Plan', icon: FileText },
                  { id: 'history', label: 'History', icon: Clock },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveConsultTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeConsultTab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {activeConsultTab === 'vitals' && renderVitalsForm()}
              {activeConsultTab === 'clinical' && renderClinicalForm()}
              {activeConsultTab === 'advice' && renderAdviceForm()}
              {activeConsultTab === 'history' && renderPatientHistory()}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-card border-t p-4 flex gap-3">
              <Button variant="outline" onClick={() => setShowConsult(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleSaveConsultation}
                disabled={createRecordMut.isPending || !consultForm.diagnosis}
              >
                <Save className="w-4 h-4" />
                {createRecordMut.isPending ? 'Saving...' : 'Complete Consultation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Patient History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-foreground">
                Patient History - {selectedPatient?.name}
              </h3>
              <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-muted rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderPatientHistory()}
          </div>
        </div>
      )}
    </div>
  );
}// 30
