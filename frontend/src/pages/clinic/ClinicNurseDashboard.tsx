import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Heart, Activity, CheckCircle2, AlertTriangle, Users, Clock,
  Plus, Save, RotateCcw, Syringe, Scissors, Pill
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export default function ClinicNurseDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [vitalsQueue, setVitalsQueue] = useState([
    { id: '1', patient: 'Karan Mehra', age: 42, gender: 'Male', doctor: 'Dr. Ramesh Sharma', status: 'Vitals Pending' },
    { id: '2', patient: 'Sunita Rao', age: 31, gender: 'Female', doctor: 'Dr. Priya Patel', status: 'Vitals Pending' },
  ]);

  const [procedureQueue, setProcedureQueue] = useState([
    { id: 'p1', patient: 'Vikram Singh', procedure: 'Wound Dressing & Sutures', room: 'Procedure Room #1', status: 'Ready' },
    { id: 'p2', patient: 'Anil Kumar', procedure: 'Nebulization (Duolin)', room: 'Injection Room', status: 'In Progress' },
  ]);

  const [vitalsForm, setVitalsForm] = useState({
    bpSys: '120',
    bpDia: '80',
    pulse: '74',
    temp: '98.4',
    spo2: '99',
    heightCm: '172',
    weightKg: '68',
    sugarRbs: '105'
  });

  const bmi = Math.round((Number(vitalsForm.weightKg) / Math.pow(Number(vitalsForm.heightCm) / 100, 2)) * 10) / 10 || 23.0;

  const handleSaveVitals = (patientName: string) => {
    toast.success(`Vitals recorded for ${patientName}! Pushed to Doctor's EMR consultation screen.`);
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Nurse / Assistant Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-rose-700 via-pink-700 to-rose-800 text-white p-6 rounded-3xl shadow-md">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-rose-200">Clinical Nursing Station & Triage</span>
          <h1 className="text-2xl sm:text-3xl font-heading font-black mt-1">Nurse / Medical Assistant</h1>
          <p className="text-sm text-rose-100 mt-0.5">Pre-Consultation Vitals, Injections, Wound Dressing & Procedure Room</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-2xl text-center">
          <p className="text-[10px] text-rose-200 font-medium">VITALS PENDING</p>
          <p className="text-xl font-bold">{vitalsQueue.length}</p>
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
              <p className="text-2xl font-bold text-rose-700">{vitalsQueue.length}</p>
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
              <p className="text-2xl font-bold text-purple-700">{procedureQueue.length}</p>
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
              <p className="text-2xl font-bold text-emerald-700">26</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Syringe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Injections / Nebulizer</p>
              <p className="text-2xl font-bold text-blue-700">9</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Vitals Capture & Procedure Schedule ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Vitals Form Station (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="rounded-3xl border shadow-sm">
            <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-600" /> Bedside Vitals Capture Station
              </CardTitle>
              <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-600">
                Patient: Karan Mehra (42y)
              </Badge>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1">Systolic BP</label>
                  <Input value={vitalsForm.bpSys} onChange={e => setVitalsForm({ ...vitalsForm, bpSys: e.target.value })} className="h-9 font-bold" />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Diastolic BP</label>
                  <Input value={vitalsForm.bpDia} onChange={e => setVitalsForm({ ...vitalsForm, bpDia: e.target.value })} className="h-9 font-bold" />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Pulse (bpm)</label>
                  <Input value={vitalsForm.pulse} onChange={e => setVitalsForm({ ...vitalsForm, pulse: e.target.value })} className="h-9 font-bold" />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Temp (°F)</label>
                  <Input value={vitalsForm.temp} onChange={e => setVitalsForm({ ...vitalsForm, temp: e.target.value })} className="h-9 font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-muted-foreground block mb-1">SpO2 (%)</label>
                  <Input value={vitalsForm.spo2} onChange={e => setVitalsForm({ ...vitalsForm, spo2: e.target.value })} className="h-9 font-bold" />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Height (cm)</label>
                  <Input value={vitalsForm.heightCm} onChange={e => setVitalsForm({ ...vitalsForm, heightCm: e.target.value })} className="h-9 font-bold" />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Weight (kg)</label>
                  <Input value={vitalsForm.weightKg} onChange={e => setVitalsForm({ ...vitalsForm, weightKg: e.target.value })} className="h-9 font-bold" />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">Random Sugar (mg/dL)</label>
                  <Input value={vitalsForm.sugarRbs} onChange={e => setVitalsForm({ ...vitalsForm, sugarRbs: e.target.value })} className="h-9 font-bold" />
                </div>
              </div>

              <div className="p-3 bg-muted/20 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground">Calculated Body Mass Index (BMI):</span>
                  <b className="ml-2 text-foreground font-black text-sm">{bmi} kg/m² (Normal)</b>
                </div>
                <Button onClick={() => handleSaveVitals('Karan Mehra')} className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9">
                  <Save className="w-3.5 h-3.5 mr-1" /> Save & Push to EMR
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Procedures Queue (5 cols) */}
        <div className="lg:col-span-5">
          <Card className="rounded-3xl border shadow-sm">
            <CardHeader className="p-5 pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Scissors className="w-4 h-4 text-purple-600" /> Procedure Room Queue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {procedureQueue.map(proc => (
                <div key={proc.id} className="p-3.5 rounded-2xl border bg-muted/20 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-foreground">{proc.patient}</p>
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                      {proc.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground font-semibold">{proc.procedure}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                    <span className="text-muted-foreground">{proc.room}</span>
                    <Button size="sm" variant="ghost" onClick={() => toast.success(`Procedure completed for ${proc.patient}!`)} className="h-6 text-xs text-emerald-600 font-bold p-0">
                      Mark Done
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
