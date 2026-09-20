import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartPulse,
  Activity,
  Plus,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Thermometer,
  Scale,
  Droplets,
  Bell,
  HelpCircle,
  X,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  Legend,
} from 'recharts';
import { AlarmOverlayModal, AlarmItem } from '@/components/patient/AlarmOverlayModal';

export default function PatientVitals() {
  const [activeTab, setActiveTab] = useState<'bp' | 'blood_sugar' | 'weight' | 'temperature'>('bp');
  const [timeRangeDays, setTimeRangeDays] = useState(30);
  const [readings, setReadings] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any>(null);
  const [vitalsReminders, setVitalsReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [editingLog, setEditingLog] = useState<any>(null);
  const [activeFiringAlarm, setActiveFiringAlarm] = useState<AlarmItem | null>(null);

  // Form State
  const [formVitalType, setFormVitalType] = useState<'bp' | 'blood_sugar' | 'weight' | 'temperature'>('bp');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [sugarValue, setSugarValue] = useState('');
  const [sugarContext, setSugarContext] = useState('fasting');
  const [weightKg, setWeightKg] = useState('');
  const [tempValue, setTempValue] = useState('');
  const [tempUnit, setTempUnit] = useState('F');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Vitals Reminder Form
  const [reminderVitalType, setReminderVitalType] = useState('bp');
  const [reminderTime, setReminderTime] = useState('08:00');
  const [reminderFrequency, setReminderFrequency] = useState('daily');
  const [reminderAlarmSound, setReminderAlarmSound] = useState('classic_alarm');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [logsRes, trendsRes, remRes] = await Promise.allSettled([
        api.getVitals({ limit: 100 }),
        api.getVitalsTrends({ vitalType: activeTab, days: timeRangeDays }),
        api.getVitalsReminders(),
      ]);

      if (logsRes.status === 'fulfilled') {
        setReadings(logsRes.value.readings || []);
      }
      if (trendsRes.status === 'fulfilled') {
        setTrendData(trendsRes.value);
      }
      if (remRes.status === 'fulfilled') {
        setVitalsReminders(remRes.value.reminders || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load vitals data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, timeRangeDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute live warning for form input
  const getLiveWarning = () => {
    if (formVitalType === 'bp') {
      const sys = Number(systolic);
      const dia = Number(diastolic);
      if (sys && dia) {
        if (sys > 140 || dia > 90) return { type: 'high', text: '⚠️ Reading indicates elevated Blood Pressure (> 140/90 mmHg).' };
        if (sys < 90 || dia < 60) return { type: 'low', text: '⚠️ Reading indicates low Blood Pressure (< 90/60 mmHg).' };
      }
    } else if (formVitalType === 'blood_sugar') {
      const val = Number(sugarValue);
      if (val) {
        if (sugarContext === 'fasting') {
          if (val > 126) return { type: 'high', text: '⚠️ Fasting sugar is high (> 126 mg/dL). Normal target: 70–100 mg/dL.' };
          if (val < 70) return { type: 'low', text: '⚠️ Fasting sugar is low (< 70 mg/dL).' };
        } else {
          if (val > 180) return { type: 'high', text: '⚠️ Post-meal reading is high (> 180 mg/dL).' };
        }
      }
    } else if (formVitalType === 'temperature') {
      const val = Number(tempValue);
      if (val) {
        const valF = tempUnit === 'C' ? (val * 9 / 5) + 32 : val;
        if (valF >= 100.4) return { type: 'fever', text: '🌡️ Reading indicates Fever (≥ 100.4°F / 38°C).' };
      }
    }
    return null;
  };

  const warning = getLiveWarning();

  const resetForm = () => {
    setSystolic('');
    setDiastolic('');
    setSugarValue('');
    setSugarContext('fasting');
    setWeightKg('');
    setTempValue('');
    setTempUnit('F');
    setRecordDate(new Date().toISOString().slice(0, 16));
    setNote('');
    setEditingLog(null);
  };

  const openLogModal = (type = activeTab) => {
    resetForm();
    setFormVitalType(type);
    setShowLogModal(true);
  };

  // Alarm se "Log" dabane par deep link (?log=bp) seedha form kholta hai
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const t = searchParams.get('log');
    if (t) { openLogModal(t as any); setSearchParams({}, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEditModal = (log: any) => {
    setEditingLog(log);
    setFormVitalType(log.vitalType);
    if (log.vitalType === 'bp') {
      setSystolic(log.values?.systolic?.toString() || '');
      setDiastolic(log.values?.diastolic?.toString() || '');
    } else if (log.vitalType === 'blood_sugar') {
      setSugarValue(log.values?.sugarValue?.toString() || '');
      setSugarContext(log.values?.sugarContext || 'fasting');
    } else if (log.vitalType === 'weight') {
      setWeightKg(log.values?.weightKg?.toString() || '');
    } else if (log.vitalType === 'temperature') {
      setTempValue(log.values?.tempValue?.toString() || '');
      setTempUnit(log.values?.tempUnit || 'F');
    }
    setRecordDate(new Date(log.recordedAt).toISOString().slice(0, 16));
    setNote(log.note || '');
    setShowLogModal(true);
  };

  const handleSaveVital = async (e: React.FormEvent) => {
    e.preventDefault();

    const values: any = {};
    if (formVitalType === 'bp') {
      if (!systolic || !diastolic) return toast.error('Please enter both systolic and diastolic numbers');
      values.systolic = Number(systolic);
      values.diastolic = Number(diastolic);
    } else if (formVitalType === 'blood_sugar') {
      if (!sugarValue) return toast.error('Please enter blood sugar value');
      values.sugarValue = Number(sugarValue);
      values.sugarContext = sugarContext;
    } else if (formVitalType === 'weight') {
      if (!weightKg) return toast.error('Please enter weight');
      values.weightKg = Number(weightKg);
    } else if (formVitalType === 'temperature') {
      if (!tempValue) return toast.error('Please enter temperature');
      values.tempValue = Number(tempValue);
      values.tempUnit = tempUnit;
    }

    setSubmitting(true);
    try {
      if (editingLog) {
        await api.updateVital(editingLog._id, {
          values,
          note,
          recordedAt: recordDate,
        });
        toast.success('Vital reading updated');
      } else {
        await api.logVital({
          vitalType: formVitalType,
          values,
          note,
          recordedAt: recordDate,
        });
        toast.success('Vital reading saved');
      }
      setShowLogModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save vital');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reading?')) return;
    try {
      await api.deleteVital(id);
      toast.success('Reading deleted');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete reading');
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createVitalsReminder({
        vitalType: reminderVitalType,
        times: [reminderTime],
        frequency: reminderFrequency,
        alarmSound: { presetId: reminderAlarmSound },
      });
      toast.success('Vitals logging reminder created');
      setShowReminderModal(false);
      loadData();
    } catch {
      toast.error('Failed to create reminder');
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      await api.deleteVitalsReminder(id);
      toast.success('Reminder removed');
      loadData();
    } catch {
      toast.error('Failed to delete reminder');
    }
  };

  // Trigger simulated vitals alarm
  const handleTestVitalsAlarm = (rem: any) => {
    const titles: Record<string, string> = {
      bp: 'Blood Pressure Check',
      blood_sugar: 'Blood Sugar Test',
      weight: 'Weight Check',
      temperature: 'Temperature Check',
    };
    setActiveFiringAlarm({
      id: rem._id,
      type: 'vital',
      title: titles[rem.vitalType] || 'Vitals Logging Check',
      dosageOrContext: 'Scheduled Home Health Measurement',
      time: rem.times?.[0] || '08:00 AM',
      alarmPreset: rem.alarmSound?.presetId || 'classic_alarm',
      vitalType: rem.vitalType,
    });
  };

  // Format chart series
  const chartData = (trendData?.readings || []).map((r: any) => {
    const d = new Date(r.recordedAt);
    const dateStr = `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
    if (activeTab === 'bp') {
      return {
        date: dateStr,
        systolic: r.values.systolic,
        diastolic: r.values.diastolic,
      };
    } else if (activeTab === 'blood_sugar') {
      return {
        date: dateStr,
        sugar: r.values.sugarValue,
        context: r.values.sugarContext,
      };
    } else if (activeTab === 'weight') {
      return {
        date: dateStr,
        weight: r.values.weightKg,
      };
    } else {
      return {
        date: dateStr,
        temp: r.values.tempUnit === 'C'
          ? Math.round(((r.values.tempValue * 9) / 5 + 32) * 10) / 10
          : r.values.tempValue,
      };
    }
  });

  // Latest readings summary
  const latestBP = readings.find(r => r.vitalType === 'bp');
  const latestSugar = readings.find(r => r.vitalType === 'blood_sugar');
  const latestWeight = readings.find(r => r.vitalType === 'weight');
  const latestTemp = readings.find(r => r.vitalType === 'temperature');

  return (
    <div className="space-y-6">
      {/* Full Screen Alarm Modal */}
      <AlarmOverlayModal
        alarm={activeFiringAlarm}
        onTaken={() => setActiveFiringAlarm(null)}
        onSnooze={() => setActiveFiringAlarm(null)}
        onSkip={() => setActiveFiringAlarm(null)}
        onLogVital={(alarm) => {
          setActiveFiringAlarm(null);
          openLogModal((alarm.vitalType as any) || 'bp');
        }}
      />

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-500 via-pink-600 to-purple-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <HeartPulse className="h-3.5 w-3.5" />
              Patient Home Health Self-Tracking
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
              My Vitals Tracker & Health Trends
            </h1>
            <p className="max-w-xl text-sm text-white/80">
              Log BP, blood sugar, weight, and body temperature at home. Track trends over 7 to 90 days with instant normal-range validation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => openLogModal(activeTab)}
              className="gap-2 rounded-2xl bg-white text-rose-600 hover:bg-white/90 font-bold shadow-lg shadow-black/10"
            >
              <Plus className="h-4 w-4" />
              Log Reading
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowReminderModal(true)}
              className="gap-2 rounded-2xl border-white/40 bg-white/10 hover:bg-white/20 text-white font-medium backdrop-blur-sm"
            >
              <Bell className="h-4 w-4" />
              Set Reminder
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats Widget */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => { setActiveTab('bp'); }}
          className={`cursor-pointer rounded-3xl border p-4 sm:p-5 transition-all shadow-sm ${
            activeTab === 'bp' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border/80 bg-card hover:border-primary/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Blood Pressure</span>
            <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {latestBP ? `${latestBP.values.systolic}/${latestBP.values.diastolic}` : '—'}
            <span className="text-xs font-normal text-muted-foreground ml-1">mmHg</span>
          </p>
          <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            latestBP?.flag === 'normal' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
          }`}>
            {latestBP?.flag ? latestBP.flag.toUpperCase() : 'No readings'}
          </span>
        </div>

        <div
          onClick={() => { setActiveTab('blood_sugar'); }}
          className={`cursor-pointer rounded-3xl border p-4 sm:p-5 transition-all shadow-sm ${
            activeTab === 'blood_sugar' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border/80 bg-card hover:border-primary/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Blood Sugar</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Droplets className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {latestSugar ? latestSugar.values.sugarValue : '—'}
            <span className="text-xs font-normal text-muted-foreground ml-1">mg/dL</span>
          </p>
          <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            latestSugar?.flag === 'normal' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
          }`}>
            {latestSugar?.flag ? `${latestSugar.flag.toUpperCase()} (${latestSugar.values.sugarContext || ''})` : 'No readings'}
          </span>
        </div>

        <div
          onClick={() => { setActiveTab('weight'); }}
          className={`cursor-pointer rounded-3xl border p-4 sm:p-5 transition-all shadow-sm ${
            activeTab === 'weight' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border/80 bg-card hover:border-primary/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Weight</span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {latestWeight ? latestWeight.values.weightKg : '—'}
            <span className="text-xs font-normal text-muted-foreground ml-1">kg</span>
          </p>
          <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
            {latestWeight ? 'Logged' : 'No readings'}
          </span>
        </div>

        <div
          onClick={() => { setActiveTab('temperature'); }}
          className={`cursor-pointer rounded-3xl border p-4 sm:p-5 transition-all shadow-sm ${
            activeTab === 'temperature' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border/80 bg-card hover:border-primary/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Temperature</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Thermometer className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {latestTemp ? `${latestTemp.values.tempValue}°${latestTemp.values.tempUnit || 'F'}` : '—'}
          </p>
          <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            latestTemp?.flag === 'fever' ? 'bg-red-500/10 text-red-600 font-bold' : 'bg-emerald-500/10 text-emerald-600'
          }`}>
            {latestTemp?.flag ? latestTemp.flag.toUpperCase() : 'No readings'}
          </span>
        </div>
      </div>

      {/* Trend Graph Section */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground capitalize">
              {activeTab.replace('_', ' ')} Trend Analysis
            </h2>
            <p className="text-xs text-muted-foreground">
              Average: <strong className="text-foreground">{trendData?.stats?.avg || '—'}</strong> ·
              Min: <strong className="text-foreground">{trendData?.stats?.min || '—'}</strong> ·
              Max: <strong className="text-foreground">{trendData?.stats?.max || '—'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-2xl bg-muted/60 p-1 flex">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setTimeRangeDays(days)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    timeRangeDays === days
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => openLogModal(activeTab)} className="rounded-xl gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Log
            </Button>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-72 w-full">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed text-muted-foreground text-sm">
              No vitals logged for this period. Click "Log Reading" above to record your first entry.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(23, 23, 23, 0.95)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                {activeTab === 'bp' ? (
                  <>
                    <Line type="monotone" dataKey="systolic" name="Systolic (mmHg)" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="diastolic" name="Diastolic (mmHg)" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </>
                ) : activeTab === 'blood_sugar' ? (
                  <Line type="monotone" dataKey="sugar" name="Blood Sugar (mg/dL)" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                ) : activeTab === 'weight' ? (
                  <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                ) : (
                  <Line type="monotone" dataKey="temp" name="Temperature (°F)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Raw Logs History Table with 24-Hour Edit Rule */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">
              Vitals Log History
            </h2>
            <p className="text-xs text-muted-foreground">
              Health records can be edited or deleted within 24 hours of recording to preserve clinical accuracy.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/60 text-xs uppercase text-muted-foreground bg-muted/20">
              <tr>
                <th className="py-3 px-4 font-semibold">Date & Time</th>
                <th className="py-3 px-4 font-semibold">Vital Type</th>
                <th className="py-3 px-4 font-semibold">Reading</th>
                <th className="py-3 px-4 font-semibold">Context / Note</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {readings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                    No vitals entries logged yet.
                  </td>
                </tr>
              ) : (
                readings.map((r) => {
                  let readingStr = '';
                  if (r.vitalType === 'bp') readingStr = `${r.values?.systolic}/${r.values?.diastolic} mmHg`;
                  else if (r.vitalType === 'blood_sugar') readingStr = `${r.values?.sugarValue} mg/dL`;
                  else if (r.vitalType === 'weight') readingStr = `${r.values?.weightKg} kg`;
                  else if (r.vitalType === 'temperature') readingStr = `${r.values?.tempValue}°${r.values?.tempUnit || 'F'}`;

                  return (
                    <tr key={r._id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 text-xs font-medium">
                        {new Date(r.recordedAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {r.isBackdated && (
                          <span className="ml-1.5 text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                            Backdated
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs capitalize font-medium text-foreground">
                        {r.vitalType.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 font-bold text-foreground">
                        {readingStr}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {r.values?.sugarContext && (
                          <span className="font-semibold capitalize text-foreground mr-1">
                            [{r.values.sugarContext}]
                          </span>
                        )}
                        {r.note || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          r.flag === 'normal'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : r.flag === 'fever'
                            ? 'bg-red-500/10 text-red-600'
                            : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {r.flag}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.canEdit ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(r)}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                              title="Edit reading (within 24 hours)"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteLog(r._id)}
                              className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                              title="Delete reading"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60 italic" title="Locked after 24h">
                            Finalized
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vitals Reminders Sub-section */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-bold text-lg text-foreground">
              Vitals Logging Alarms
            </h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {vitalsReminders.length}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowReminderModal(true)} className="rounded-xl gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Alarm
          </Button>
        </div>

        {vitalsReminders.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No recurring vitals alarms set. Create a reminder to measure BP or blood sugar at scheduled daily hours.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {vitalsReminders.map((rem) => (
              <div key={rem._id} className="rounded-2xl border border-border/80 p-4 bg-muted/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold capitalize text-sm text-foreground">
                      {rem.vitalType.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {rem.times?.[0] || '08:00'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">
                    {rem.frequency} · Sound: {rem.alarmSound?.presetId?.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t mt-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-red-500 font-bold"
                    onClick={() => handleTestVitalsAlarm(rem)}
                  >
                    Test Alarm
                  </Button>
                  <button
                    onClick={() => handleDeleteReminder(rem._id)}
                    className="text-muted-foreground hover:text-red-500 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Vital Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-xl font-bold text-foreground">
                {editingLog ? 'Edit Vital Reading' : 'Log a Vital Reading'}
              </h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVital} className="space-y-4">
              {/* Type Switcher */}
              {!editingLog && (
                <div className="grid grid-cols-4 gap-1 rounded-2xl bg-muted/50 p-1">
                  {[
                    { id: 'bp', label: 'BP' },
                    { id: 'blood_sugar', label: 'Sugar' },
                    { id: 'weight', label: 'Weight' },
                    { id: 'temperature', label: 'Temp' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormVitalType(t.id as any)}
                      className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                        formVitalType === t.id
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Dynamic Inputs */}
              {formVitalType === 'bp' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Systolic (mmHg) *
                    </label>
                    <Input
                      type="number"
                      value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                      placeholder="e.g. 120"
                      className="rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Diastolic (mmHg) *
                    </label>
                    <Input
                      type="number"
                      value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                      placeholder="e.g. 80"
                      className="rounded-xl"
                      required
                    />
                  </div>
                </div>
              )}

              {formVitalType === 'blood_sugar' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Sugar Value (mg/dL) *
                    </label>
                    <Input
                      type="number"
                      value={sugarValue}
                      onChange={(e) => setSugarValue(e.target.value)}
                      placeholder="e.g. 95"
                      className="rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Measurement Context
                    </label>
                    <select
                      value={sugarContext}
                      onChange={(e) => setSugarContext(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="fasting">Fasting (Morning before meal)</option>
                      <option value="post_meal">Post-Meal (2 hrs after food)</option>
                      <option value="random">Random check</option>
                      <option value="bedtime">Bedtime</option>
                    </select>
                  </div>
                </div>
              )}

              {formVitalType === 'weight' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Weight (kg) *
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="e.g. 68.5"
                    className="rounded-xl"
                    required
                  />
                </div>
              )}

              {formVitalType === 'temperature' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Value *
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      placeholder="e.g. 98.6"
                      className="rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Unit
                    </label>
                    <select
                      value={tempUnit}
                      onChange={(e) => setTempUnit(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="F">°F (Fahrenheit)</option>
                      <option value="C">°C (Celsius)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Warning Alert Banner */}
              {warning && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
                  {warning.text}
                </div>
              )}

              {/* Date Time & Note */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Date & Time
                </label>
                <Input
                  type="datetime-local"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Optional Note
                </label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Felt dizzy, after 30 min walk"
                  className="rounded-xl"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLogModal(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl font-bold bg-primary text-primary-foreground"
                >
                  {submitting ? 'Saving...' : editingLog ? 'Update Reading' : 'Save Reading'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Vitals Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-foreground">
                Set Vitals Logging Reminder
              </h3>
              <button onClick={() => setShowReminderModal(false)} className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Vital To Log</label>
                <select
                  value={reminderVitalType}
                  onChange={(e) => setReminderVitalType(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="bp">Blood Pressure</option>
                  <option value="blood_sugar">Blood Sugar</option>
                  <option value="weight">Weight</option>
                  <option value="temperature">Temperature</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Reminder Time</label>
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Alarm Tone</label>
                <select
                  value={reminderAlarmSound}
                  onChange={(e) => setReminderAlarmSound(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="classic_alarm">Classic Alarm Clock</option>
                  <option value="digital_buzzer">Digital Buzzer</option>
                  <option value="gentle_rise">Gentle Rise Chime</option>
                  <option value="chime_cascade">Chime Cascade</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowReminderModal(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" className="rounded-xl font-bold bg-primary text-primary-foreground">
                  Schedule Alarm
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
