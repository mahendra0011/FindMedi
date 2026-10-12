import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, Clock, Stethoscope, CheckCircle2, AlertCircle, FileText,
  CalendarDays, Pill, FlaskConical, Activity, Sparkles, ChevronRight,
  User, Search, Plus, Save, RotateCcw, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';
import DdiCheckBanner from '@/components/clinical/DdiCheckBanner';

export default function ClinicDoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'waiting' | 'in_consultation' | 'completed'>('waiting');
  const [search, setSearch] = useState('');
  
  // Selected Patient for Active Consultation Workspace
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  // T3: major DDI un-overridden → "Complete Consultation" (sign) blocked.
  const [ddiBlocked, setDdiBlocked] = useState(false);
  const [clinicalForm, setClinicalForm] = useState({
    chiefComplaint: '',
    bp: '120/80',
    pulse: '76',
    temp: '98.6',
    spo2: '99',
    diagnosis: '',
    medicines: [{ name: '', dosage: '1 tab', frequency: 'TDS (3 times)', duration: '5 days', instructions: 'After food' }],
    investigations: '',
    advice: '',
    followUpDate: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res: any = await api.getAppointments({ date: getISTDateString() }).catch(() => null);
      const list = Array.isArray(res) ? res : res?.data || res?.appointments || [];
      // Filter for this doctor or all today clinic appointments
      setAppointments(list);
      if (list.length > 0 && !selectedPatient) {
        setSelectedPatient(list[0]);
      }
    } catch {
      toast.error('Failed to load clinic queue');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const waitingList = appointments.filter(a => a.status === 'Pending' || a.status === 'Confirmed');
  const inConsultationList = appointments.filter(a => a.status === 'In Consultation' || a.status === 'Active');
  const completedList = appointments.filter(a => a.status === 'Completed');

  const addMedicineRow = () => {
    setClinicalForm(prev => ({
      ...prev,
      medicines: [...prev.medicines, { name: '', dosage: '1 tab', frequency: 'BD (2 times)', duration: '3 days', instructions: 'After food' }]
    }));
  };

  const updateMedRow = (index: number, key: string, val: string) => {
    const updated = [...clinicalForm.medicines];
    (updated[index] as any)[key] = val;
    setClinicalForm({ ...clinicalForm, medicines: updated });
  };

  const handleStartConsultation = (patient: any) => {
    setSelectedPatient(patient);
    setActiveTab('in_consultation');
    toast.info(`Started consultation for ${patient.patient || 'Patient'}`);
  };

  const handleCompleteConsultation = async () => {
    if (!selectedPatient) return;
    if (ddiBlocked) {
      toast.error('Major drug interaction — record an override reason before signing');
      return;
    }
    try {
      await api.createRecord({
        patient: selectedPatient.patient,
        patientId: selectedPatient.patientId,
        doctor: user?.name,
        date: getISTDateString(),
        diagnosis: clinicalForm.diagnosis || 'General OPD Consultation',
        type: 'Prescription',
        notes: clinicalForm.advice,
        data: {
          chiefComplaints: clinicalForm.chiefComplaint,
          vitals: { bp: clinicalForm.bp, pulse: clinicalForm.pulse, temp: clinicalForm.temp, spo2: clinicalForm.spo2 },
          medications: clinicalForm.medicines.map(m => `${m.name} - ${m.dosage} ${m.frequency} for ${m.duration} (${m.instructions})`),
          investigations: clinicalForm.investigations,
          followUp: clinicalForm.followUpDate,
        }
      }).catch(() => null);

      toast.success(`Consultation completed for ${selectedPatient.patient}. E-Prescription signed!`);
      loadData();
    } catch {
      toast.error('Failed to save encounter');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Top Clinical Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white p-6 rounded-3xl shadow-md">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-blue-200">Clinical Consultation Workstation</span>
          <h1 className="text-2xl sm:text-3xl font-heading font-black mt-1">Dr. {user?.name || 'Practitioner'}</h1>
          <p className="text-sm text-blue-100/90 mt-0.5">OPD Room #1 · Live Patient Queue & Electronic Health Record</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={loadData} className="gap-1.5 rounded-xl text-xs font-semibold">
            <RotateCcw className="w-3.5 h-3.5" /> Refresh Queue
          </Button>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-2xl text-center">
            <p className="text-[10px] text-blue-200 font-medium">TODAY'S PATIENTS</p>
            <p className="text-xl font-bold">{appointments.length}</p>
          </div>
        </div>
      </div>

      {/* ── 2. Clinical Overview KPI Cards (No financial clutter) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Waiting Patients</p>
              <p className="text-2xl font-bold text-amber-600">{waitingList.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">In Consultation</p>
              <p className="text-2xl font-bold text-blue-600">{inConsultationList.length || (selectedPatient ? 1 : 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Completed Today</p>
              <p className="text-2xl font-bold text-emerald-600">{completedList.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Follow-ups Due</p>
              <p className="text-2xl font-bold text-purple-600">4</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Split Layout: Left Queue Rail vs Right Consultation Workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Patient Queue (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="rounded-3xl border shadow-sm">
            <CardHeader className="p-4 pb-2 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> OPD Patient Queue
                </CardTitle>
                <Badge variant="outline" className="text-xs">{waitingList.length} waiting</Badge>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 pt-3">
                <button
                  onClick={() => setActiveTab('waiting')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'waiting' ? 'bg-amber-500 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Waiting ({waitingList.length})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    activeTab === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Completed ({completedList.length})
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-3 space-y-2 max-h-[620px] overflow-y-auto">
              {(activeTab === 'waiting' ? waitingList : completedList).map((apt, idx) => {
                const isSelected = selectedPatient?._id === apt._id;
                return (
                  <div
                    key={apt._id || idx}
                    onClick={() => handleStartConsultation(apt)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border/60 hover:border-primary/40 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted text-foreground">
                        Token #{idx + 1}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" /> {apt.time || '10:00 AM'}
                      </span>
                    </div>

                    <p className="font-bold text-sm text-foreground">{apt.patient || 'Patient Name'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {apt.age || '32'} yrs · {apt.gender || 'Male'} · UHID: {apt.uhid || `UH-${1000 + idx}`}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground text-[11px]">{apt.type || 'General Consultation'}</span>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-primary font-semibold p-0">
                        Select <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {waitingList.length === 0 && activeTab === 'waiting' && (
                <div className="text-center py-12 text-muted-foreground text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                  No patients waiting in queue
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Consultation Workspace (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedPatient ? (
            <Card className="rounded-3xl border-2 border-primary/20 shadow-sm overflow-hidden">
              {/* Patient Banner */}
              <div className="bg-muted/40 p-5 border-b flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm">
                    {selectedPatient.patient?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-foreground">{selectedPatient.patient}</h2>
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        In Room
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Age: {selectedPatient.age || '34'} | Sex: {selectedPatient.gender || 'Male'} | Blood: {selectedPatient.bloodGroup || 'B+'} | Mobile: {selectedPatient.phone || '+91 9876543210'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5" onClick={() => navigate('/clinic/patients')}>
                    <FileText className="w-3.5 h-3.5" /> Past Records
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                    onClick={handleCompleteConsultation}
                    disabled={ddiBlocked}
                    title={ddiBlocked ? 'Major drug interaction — record an override reason first' : undefined}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> {ddiBlocked ? 'Resolve DDI to sign' : 'Complete & Sign Rx'}
                  </Button>
                </div>
              </div>

              <CardContent className="p-5 space-y-5">
                {/* 1. Bedside Vitals Bar */}
                <div className="p-3.5 rounded-2xl bg-card border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-muted-foreground block mb-1">Blood Pressure (mmHg)</label>
                    <Input value={clinicalForm.bp} onChange={e => setClinicalForm({ ...clinicalForm, bp: e.target.value })} className="h-8 font-bold" />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Heart Rate (bpm)</label>
                    <Input value={clinicalForm.pulse} onChange={e => setClinicalForm({ ...clinicalForm, pulse: e.target.value })} className="h-8 font-bold" />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">Temp (°F)</label>
                    <Input value={clinicalForm.temp} onChange={e => setClinicalForm({ ...clinicalForm, temp: e.target.value })} className="h-8 font-bold" />
                  </div>
                  <div>
                    <label className="text-muted-foreground block mb-1">SpO2 (%)</label>
                    <Input value={clinicalForm.spo2} onChange={e => setClinicalForm({ ...clinicalForm, spo2: e.target.value })} className="h-8 font-bold" />
                  </div>
                </div>

                {/* 2. Chief Complaint & Clinical Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Chief Complaint & History of Illness</label>
                    <textarea
                      rows={3}
                      className="w-full p-2.5 rounded-xl border bg-background text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      placeholder="e.g. Fever, body ache for 3 days with dry cough..."
                      value={clinicalForm.chiefComplaint}
                      onChange={e => setClinicalForm({ ...clinicalForm, chiefComplaint: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Diagnosis (ICD-10)</label>
                    <textarea
                      rows={3}
                      className="w-full p-2.5 rounded-xl border bg-background text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      placeholder="e.g. Acute Viral Upper Respiratory Tract Infection (J06.9)"
                      value={clinicalForm.diagnosis}
                      onChange={e => setClinicalForm({ ...clinicalForm, diagnosis: e.target.value })}
                    />
                  </div>
                </div>

                {/* 3. Prescription Studio */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <Pill className="w-4 h-4 text-primary" /> E-Prescription (Medications)
                    </h3>
                    <Button size="sm" variant="outline" onClick={addMedicineRow} className="rounded-xl text-xs h-7 gap-1">
                      <Plus className="w-3.5 h-3.5" /> Add Drug
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {clinicalForm.medicines.map((m, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 p-2.5 rounded-xl bg-muted/20 border text-xs items-center">
                        <Input
                          placeholder="Medicine Name (e.g. Paracetamol 650mg)"
                          value={m.name}
                          onChange={e => updateMedRow(idx, 'name', e.target.value)}
                          className="sm:col-span-2 h-8 text-xs font-semibold"
                        />
                        <Input
                          placeholder="Dose (1 tab)"
                          value={m.dosage}
                          onChange={e => updateMedRow(idx, 'dosage', e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Input
                          placeholder="Freq (TDS / BD)"
                          value={m.frequency}
                          onChange={e => updateMedRow(idx, 'frequency', e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Input
                          placeholder="Duration (5 days)"
                          value={m.duration}
                          onChange={e => updateMedRow(idx, 'duration', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    ))}
                  </div>

                  {/* T3: live DDI check — major blocks "Complete & Sign Rx" until override */}
                  <DdiCheckBanner
                    drugs={clinicalForm.medicines.map(m => m.name)}
                    onMajorStateChange={setDdiBlocked}
                  />
                </div>

                {/* 4. Investigation Orders & Follow-up */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground flex items-center gap-1.5">
                      <FlaskConical className="w-3.5 h-3.5 text-rose-500" /> Lab & Radiology Tests Order
                    </label>
                    <Input
                      placeholder="e.g. CBC, Dengue NS1 Antigen, Chest X-Ray PA View"
                      value={clinicalForm.investigations}
                      onChange={e => setClinicalForm({ ...clinicalForm, investigations: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-purple-500" /> Follow-up Date
                    </label>
                    <Input
                      type="date"
                      value={clinicalForm.followUpDate}
                      onChange={e => setClinicalForm({ ...clinicalForm, followUpDate: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Bottom Signature Bar */}
                <div className="pt-4 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>NMC Registered Digital Prescriber: Dr. {user?.name}</span>
                  </div>
                  <Button className="rounded-xl bg-primary text-primary-foreground text-xs h-9 gap-1.5 font-bold" onClick={handleCompleteConsultation}>
                    <Save className="w-3.5 h-3.5" /> Save Encounter & Sign
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="p-12 text-center rounded-3xl border border-dashed text-muted-foreground">
              <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-base text-foreground">Select a patient from the queue</p>
              <p className="text-xs mt-1">Select a patient on the left to start clinical examination and prescription.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
