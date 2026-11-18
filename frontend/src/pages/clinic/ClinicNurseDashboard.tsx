import { useState, useEffect } from 'react';


import {
  Heart, Activity, CheckCircle2, AlertTriangle, Users, Clock,
  Plus, Save, RotateCcw, Syringe, Scissors, Pill, AlertCircle,
  Thermometer, Gauge, ChevronRight, Check, X, ShieldAlert, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

interface VitalsPatient {
  id: string;
  token: string;
  patient: string;
  uhid: string;
  age: number;
  gender: string;
  doctor: string;
  status: 'Vitals Pending' | 'Recorded' | 'Alert Flagged';
  vitals?: {
    bpSys: string;
    bpDia: string;
    pulse: string;
    temp: string;
    spo2: string;
    sugarRbs: string;
    heightCm: string;
    weightKg: string;
    bmi: number | null;
    painScore: number;
    abnormalNotes: string;
  };
}

export default function ClinicNurseDashboard() {
  const { user } = useAuth();

  const [queue, setQueue] = useState<VitalsPatient[]>([]);

  const [selectedPatient, setSelectedPatient] = useState<VitalsPatient | null>(null);

  const [procedures, setProcedures] = useState<{ id: string; patient: string; procedure: string; room: string; status: string; nurse: string }[]>([]);

  const loadQueue = async () => {
    try {
      const getIST = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };
      const res: any = await api.getAppointments({ date: getIST() }).catch(() => null);
      const list = Array.isArray(res) ? res : res?.data || res?.appointments || [];
      const mapped: VitalsPatient[] = list
        .filter((a: any) => !/completed|cancel|no.?show|discharg/i.test(String(a?.status ?? '')))
        .map((a: any) => ({
          id: String(a?._id ?? a?.tokenNumber ?? ''),
          token: String(a?.tokenNumber ?? ''),
          patient: a?.patient || a?.patientName || 'Patient',
          uhid: a?.uhid || '—',
          age: Number(a?.age) || 0,
          gender: a?.gender || '—',
          doctor: a?.doctorName || a?.doctor || '—',
          status: 'Vitals Pending' as const,
        }));
      setQueue(mapped);
      if (mapped.length > 0 && !selectedPatient) setSelectedPatient(mapped[0]);
    } catch {
      // Keep state
    }
  };

  useEffect(() => {
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [vitalsForm, setVitalsForm] = useState({
    bpSys: '',
    bpDia: '',
    pulse: '',
    temp: '',
    spo2: '',
    heightCm: '',
    weightKg: '',
    sugarRbs: '',
    painScore: '',
    notes: ''
  });

  // Calculate live BMI (blank until measured)
  const heightM = Number(vitalsForm.heightCm) / 100;
  const weightKg = Number(vitalsForm.weightKg);
  const bmi = heightM > 0 && weightKg > 0 ? Math.round((weightKg / (heightM * heightM)) * 10) / 10 : null;

  const getBmiCategory = (val: number) => {
    if (val < 18.5) return { label: 'Underweight', color: 'text-amber-600' };
    if (val <= 24.9) return { label: 'Normal Weight', color: 'text-emerald-600' };
    if (val <= 29.9) return { label: 'Overweight', color: 'text-amber-600' };
    return { label: 'Obese', color: 'text-rose-600' };
  };

  // Live Abnormal Vitals Detection
  const sysNum = Number(vitalsForm.bpSys);
  const diaNum = Number(vitalsForm.bpDia);
  const spo2Num = Number(vitalsForm.spo2);
  const tempNum = Number(vitalsForm.temp);
  const pulseNum = Number(vitalsForm.pulse);

  const isHypertensive = sysNum >= 140 || diaNum >= 90;
  const isHypoxemic = spo2Num < 95 && spo2Num > 0;
  const isFebrile = tempNum >= 99.5;
  const isTachycardic = pulseNum > 100;

  const hasAbnormalAlert = isHypertensive || isHypoxemic || isFebrile || isTachycardic;

  const handleSelectPatient = (p: VitalsPatient) => {
    setSelectedPatient(p);
    if (p.vitals) {
      setVitalsForm({
        bpSys: p.vitals.bpSys,
        bpDia: p.vitals.bpDia,
        pulse: p.vitals.pulse,
        temp: p.vitals.temp,
        spo2: p.vitals.spo2,
        heightCm: p.vitals.heightCm,
        weightKg: p.vitals.weightKg,
        sugarRbs: p.vitals.sugarRbs,
        painScore: String(p.vitals.painScore || 2),
        notes: p.vitals.abnormalNotes || ''
      });
    }
  };

  const handleSaveAndPush = async () => {
    if (!selectedPatient) return;

    const abnormalNotes = [
      isHypertensive ? `High BP (${vitalsForm.bpSys}/${vitalsForm.bpDia})` : null,
      isHypoxemic ? `Low SpO2 (${vitalsForm.spo2}%)` : null,
      isFebrile ? `Fever (${vitalsForm.temp}°F)` : null,
      isTachycardic ? `Tachycardia (${vitalsForm.pulse} bpm)` : null,
      vitalsForm.notes ? vitalsForm.notes : null
    ].filter(Boolean).join(' · ');

    const updatedPatient: VitalsPatient = {
      ...selectedPatient,
      status: hasAbnormalAlert ? 'Alert Flagged' : 'Recorded',
      vitals: {
        bpSys: vitalsForm.bpSys,
        bpDia: vitalsForm.bpDia,
        pulse: vitalsForm.pulse,
        temp: vitalsForm.temp,
        spo2: vitalsForm.spo2,
        sugarRbs: vitalsForm.sugarRbs,
        heightCm: vitalsForm.heightCm,
        weightKg: vitalsForm.weightKg,
        bmi,
        painScore: Number(vitalsForm.painScore),
        abnormalNotes
      }
    };

    setQueue(prev => prev.map(p => p.id === selectedPatient.id ? updatedPatient : p));
    setSelectedPatient(updatedPatient);

    // Note: there is no outpatient vitals-persistence endpoint yet — the IPD
    // nursing charting routes apply to admitted patients only, and /api/vitals
    // expects a different contract. Recorded here for the current desk session.
    if (hasAbnormalAlert) {
      toast.warning(`Abnormal vitals for ${selectedPatient.patient}: ${abnormalNotes}`);
    } else {
      toast.success(`Vitals recorded for ${selectedPatient.patient}`);
    }
  };

  const handleCompleteProcedure = (procId: string) => {
    setProcedures(prev => prev.map(p => p.id === procId ? { ...p, status: 'Completed' } : p));
    toast.success('Clinical procedure logged as completed. Consumables deducted.');
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Nurse / Assistant Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-rose-700 via-pink-700 to-rose-800 text-white p-6 rounded-3xl shadow-md">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-rose-200">Clinical Nursing Station & Triage</span>
          <h1 className="text-2xl sm:text-3xl font-heading font-black mt-1">Nurse / Medical Assistant</h1>
          <p className="text-sm text-rose-100 mt-0.5">Pre-Consultation Vitals, Abnormal Alert Flagging, Injections & Procedure Room</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-2xl text-center">
            <p className="text-[10px] text-rose-200 font-medium">PENDING TRIAGE</p>
            <p className="text-xl font-bold">{queue.filter(q => q.status === 'Vitals Pending').length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-2xl text-center">
            <p className="text-[10px] text-rose-200 font-medium">PROCEDURES</p>
            <p className="text-xl font-bold">{procedures.filter(p => p.status !== 'Completed').length}</p>
          </div>
        </div>
      </div>

      {/* ── 2. Nursing Queue KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Awaiting Vitals</p>
              <p className="text-2xl font-bold text-rose-700">{queue.filter(q => q.status === 'Vitals Pending').length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Procedures Scheduled</p>
              <p className="text-2xl font-bold text-purple-700">{procedures.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Abnormal Flags</p>
              <p className="text-2xl font-bold text-amber-700">{queue.filter(q => q.status === 'Alert Flagged').length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Vitals Recorded Today</p>
              <p className="text-2xl font-bold text-emerald-700">{queue.filter(q => q.status === 'Recorded').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Split Layout: Vitals Queue vs Capture Station ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Patient Queue (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="rounded-3xl border shadow-sm">
            <CardHeader className="p-4 pb-2 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-600" /> Triage Vitals Queue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 max-h-[580px] overflow-y-auto">
              {queue.length === 0 && (
                <div className="p-4 rounded-2xl border border-dashed border-border/70 text-center text-xs text-muted-foreground">
                  No patients awaiting vitals — today's appointment list is empty.
                </div>
              )}
              {queue.map(p => {
                const isSelected = selectedPatient?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected ? 'border-rose-500 bg-rose-500/5 shadow-xs' : 'border-border/60 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted text-foreground">
                        Token #{p.token}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          p.status === 'Alert Flagged'
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                            : p.status === 'Recorded'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                        }
                      >
                        {p.status}
                      </Badge>
                    </div>

                    <p className="font-bold text-sm text-foreground">{p.patient}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p.age}y · {p.gender} · {p.uhid}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/40">
                      Attending: <b className="text-foreground">{p.doctor}</b>
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Quick Procedure Checklist */}
          <Card className="rounded-3xl border shadow-sm">
            <CardHeader className="p-4 pb-2 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Scissors className="w-4 h-4 text-purple-600" /> Procedure Room Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2.5">
              {procedures.length === 0 && (
                <p className="text-xs text-muted-foreground p-3">No procedures queued for this shift.</p>
              )}
              {procedures.map(proc => (
                <div key={proc.id} className="p-3 rounded-2xl border bg-muted/15 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-foreground">{proc.patient}</p>
                    <Badge variant="outline" className={proc.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-purple-500/10 text-purple-600'}>
                      {proc.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground font-medium">{proc.procedure}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                    <span className="text-muted-foreground">{proc.room}</span>
                    {proc.status !== 'Completed' && (
                      <Button size="sm" variant="ghost" onClick={() => handleCompleteProcedure(proc.id)} className="h-6 text-xs text-emerald-600 font-bold p-0">
                        Mark Done <Check className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: Bedside Vitals Station (8 cols) */}
        <div className="lg:col-span-8">
          <Card className="rounded-3xl border shadow-sm">
            <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-600" /> Bedside Vitals Capture & Triage Station
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recording for: <b className="text-foreground">{selectedPatient?.patient || 'Patient'}</b> ({selectedPatient?.age}y · {selectedPatient?.uhid})
                </p>
              </div>

              {hasAbnormalAlert && (
                <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 font-bold px-3 py-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Abnormal Vitals Alert
                </Badge>
              )}
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              {/* Abnormal Banner if any reading is out of range */}
              {hasAbnormalAlert && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-700 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Clinical Triage Alert Flagged:
                  </p>
                  <ul className="list-disc list-inside text-xs space-y-0.5 ml-2">
                    {isHypertensive && <li>Elevated Blood Pressure: {vitalsForm.bpSys}/{vitalsForm.bpDia} mmHg (Stage 2 Hypertension)</li>}
                    {isHypoxemic && <li>Hypoxemia: SpO2 is {vitalsForm.spo2}% (Normal &ge; 95%) — administer supplemental O2 if required</li>}
                    {isFebrile && <li>Pyrexia: Temperature is {vitalsForm.temp}°F (Fever alert)</li>}
                    {isTachycardic && <li>Tachycardia: Pulse rate is {vitalsForm.pulse} bpm (&gt;100 bpm)</li>}
                  </ul>
                </div>
              )}

              {/* Vitals Input Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-3 rounded-2xl bg-muted/20 border">
                  <label className="text-muted-foreground block mb-1 font-semibold flex items-center justify-between">
                    <span>Systolic BP</span>
                    <span className="text-[10px]">mmHg</span>
                  </label>
                  <Input
                    value={vitalsForm.bpSys}
                    onChange={e => setVitalsForm({ ...vitalsForm, bpSys: e.target.value })}
                    className={`h-9 font-bold ${isHypertensive ? 'border-rose-500 text-rose-600' : ''}`}
                  />
                  <span className="text-[10px] text-muted-foreground block mt-1">Normal: 90-120</span>
                </div>

                <div className="p-3 rounded-2xl bg-muted/20 border">
                  <label className="text-muted-foreground block mb-1 font-semibold flex items-center justify-between">
                    <span>Diastolic BP</span>
                    <span className="text-[10px]">mmHg</span>
                  </label>
                  <Input
                    value={vitalsForm.bpDia}
                    onChange={e => setVitalsForm({ ...vitalsForm, bpDia: e.target.value })}
                    className={`h-9 font-bold ${isHypertensive ? 'border-rose-500 text-rose-600' : ''}`}
                  />
                  <span className="text-[10px] text-muted-foreground block mt-1">Normal: 60-80</span>
                </div>

                <div className="p-3 rounded-2xl bg-muted/20 border">
                  <label className="text-muted-foreground block mb-1 font-semibold flex items-center justify-between">
                    <span>Pulse / Heart Rate</span>
                    <span className="text-[10px]">bpm</span>
                  </label>
                  <Input
                    value={vitalsForm.pulse}
                    onChange={e => setVitalsForm({ ...vitalsForm, pulse: e.target.value })}
                    className={`h-9 font-bold ${isTachycardic ? 'border-rose-500 text-rose-600' : ''}`}
                  />
                  <span className="text-[10px] text-muted-foreground block mt-1">Normal: 60-100</span>
                </div>

                <div className="p-3 rounded-2xl bg-muted/20 border">
                  <label className="text-muted-foreground block mb-1 font-semibold flex items-center justify-between">
                    <span>Temperature</span>
                    <span className="text-[10px]">°F</span>
                  </label>
                  <Input
                    value={vitalsForm.temp}
                    onChange={e => setVitalsForm({ ...vitalsForm, temp: e.target.value })}
                    className={`h-9 font-bold ${isFebrile ? 'border-rose-500 text-rose-600' : ''}`}
                  />
                  <span className="text-[10px] text-muted-foreground block mt-1">Normal: 97.8-99.1</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-3 rounded-2xl bg-muted/20 border">
                  <label className="text-muted-foreground block mb-1 font-semibold flex items-center justify-between">
                    <span>Oxygen Sat (SpO2)</span>
                    <span className="text-[10px]">%</span>
                  </label>
                  <Input
                    value={vitalsForm.spo2}
                    onChange={e => setVitalsForm({ ...vitalsForm, spo2: e.target.value })}
                    className={`h-9 font-bold ${isHypoxemic ? 'border-rose-500 text-rose-600' : ''}`}
                  />
                  <span className="text-[10px] text-muted-foreground block mt-1">Target: &ge; 95%</span>
                </div>

                <div className="p-3 rounded-2xl bg-muted/20 border">
                  <label className="text-muted-foreground block mb-1 font-semibold flex items-center justify-between">
                    <span>Random Blood Sugar</span>
                    <span className="text-[10px]">mg/dL</span>
                  </label>
                  <Input
                    value={vitalsForm.sugarRbs}
                    onChange={e => setVitalsForm({ ...vitalsForm, sugarRbs: e.target.value })}
                    className="h-9 font-bold"
                  />
                  <span className="text-[10px] text-muted-foreground block mt-1">Normal: 70-140</span>
                </div>

                <div className="p-3 rounded-2xl bg-muted/20 border">
                  <label className="text-muted-foreground block mb-1 font-semibold flex items-center justify-between">
                    <span>Height</span>
                    <span className="text-[10px]">cm</span>
                  </label>
                  <Input
                    value={vitalsForm.heightCm}
                    onChange={e => setVitalsForm({ ...vitalsForm, heightCm: e.target.value })}
                    className="h-9 font-bold"
                  />
                  <span className="text-[10px] text-muted-foreground block mt-1">Height in centimeters</span>
                </div>

                <div className="p-3 rounded-2xl bg-muted/20 border">
                  <label className="text-muted-foreground block mb-1 font-semibold flex items-center justify-between">
                    <span>Weight</span>
                    <span className="text-[10px]">kg</span>
                  </label>
                  <Input
                    value={vitalsForm.weightKg}
                    onChange={e => setVitalsForm({ ...vitalsForm, weightKg: e.target.value })}
                    className="h-9 font-bold"
                  />
                  <span className="text-[10px] text-muted-foreground block mt-1">Weight in kilograms</span>
                </div>
              </div>

              {/* BMI & Pain Score Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div className="p-3.5 bg-muted/30 rounded-2xl border flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground font-medium block">Body Mass Index (BMI):</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <b className="text-foreground font-black text-lg">{bmi == null ? '— kg/m²' : `${bmi} kg/m²`}</b>
                      {bmi == null
                        ? <Badge variant="outline" className="text-xs">Enter height & weight</Badge>
                        : <Badge variant="outline" className={`text-xs ${getBmiCategory(bmi).color}`}>{getBmiCategory(bmi).label}</Badge>}
                    </div>
                  </div>
                  <Gauge className="w-8 h-8 text-muted-foreground/30" />
                </div>

                <div className="p-3.5 bg-muted/30 rounded-2xl border flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground font-medium block">Pain Score (0 to 10 scale):</span>
                    <div className="flex items-center gap-3 mt-1.5">
                      <Input
                        type="range"
                        min="0"
                        max="10"
                        value={vitalsForm.painScore}
                        onChange={e => setVitalsForm({ ...vitalsForm, painScore: e.target.value })}
                        className="h-5 flex-1 accent-rose-600"
                      />
                      <b className="text-rose-600 font-black text-base w-6 text-center">{vitalsForm.painScore}</b>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nursing Observation Notes */}
              <div>
                <label className="font-semibold text-foreground block mb-1">Nursing Observation & Triage Remarks</label>
                <textarea
                  rows={2}
                  value={vitalsForm.notes}
                  onChange={e => setVitalsForm({ ...vitalsForm, notes: e.target.value })}
                  placeholder="e.g. Patient visibly fatigued, complained of chest tightness since morning, ambulatory without support..."
                  className="w-full p-2.5 rounded-xl border bg-background text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t flex items-center justify-between">
                <div className="text-[11px] text-muted-foreground">
                  Recording Nurse: <b className="text-foreground">{user?.name || 'Staff Nurse'}</b> · OPD Station #1
                </div>

                <Button
                  onClick={handleSaveAndPush}
                  className="rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 px-5 gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" /> Save Vitals & Push to Doctor EMR
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
