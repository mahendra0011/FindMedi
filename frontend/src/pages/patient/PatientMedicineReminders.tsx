import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pill,
  Clock,
  Calendar,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Sparkles,
  TrendingUp,
  FileText,
  CalendarDays,
  X,
  HelpCircle,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { previewAlarmSound, stopAlarmSound } from '@/utils/alarmAudio';
import { AlarmOverlayModal, AlarmItem } from '@/components/patient/AlarmOverlayModal';

const ALARM_PRESETS = [
  { id: 'classic_alarm', name: 'Classic Alarm', desc: 'Rhythmic beep-beep alarm clock' },
  { id: 'digital_buzzer', name: 'Digital Buzzer', desc: 'Sharp electronic urgent buzz' },
  { id: 'gentle_rise', name: 'Gentle Rise', desc: 'Ascending harmonic chime sequence' },
  { id: 'chime_cascade', name: 'Chime Cascade', desc: 'Melodic marimba bell sequence' },
];

export default function PatientMedicineReminders() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [carePlans, setCarePlans] = useState<any[]>([]);
  const [adherenceData, setAdherenceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<any>(null);
  const [activeFiringAlarm, setActiveFiringAlarm] = useState<AlarmItem | null>(null);

  // Form state
  const [formSource, setFormSource] = useState<'manual' | 'prescription'>('manual');
  const [selectedRxId, setSelectedRxId] = useState('');
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [formType, setFormType] = useState('Tablet');
  const [frequency, setFrequency] = useState('twice_daily');
  const [times, setTimes] = useState<string[]>(['08:00', '20:00']);
  const [newTimeInput, setNewTimeInput] = useState('12:00');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isOngoing, setIsOngoing] = useState(true);
  const [endDate, setEndDate] = useState('');
  const [alarmPreset, setAlarmPreset] = useState('classic_alarm');
  const [autoMissMinutes, setAutoMissMinutes] = useState(10);
  const [notifyDoctor, setNotifyDoctor] = useState(false);
  const [missThreshold, setMissThreshold] = useState(3);
  const [carePlanId, setCarePlanId] = useState('');
  const [instructions, setInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load reminders, prescriptions, adherence
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [remRes, rxRes, adhRes, cpRes] = await Promise.allSettled([
        api.getMedicineReminders(),
        api.getPrescriptions(),
        api.getMedicineAdherence({ days: 30 }),
        api.getCarePlans(),
      ]);

      if (remRes.status === 'fulfilled') {
        setReminders(remRes.value.reminders || []);
      }
      if (rxRes.status === 'fulfilled') {
        const rList = rxRes.value.prescriptions || rxRes.value.data || rxRes.value || [];
        setPrescriptions(Array.isArray(rList) ? rList : []);
      }
      if (adhRes.status === 'fulfilled') {
        setAdherenceData(adhRes.value);
      }
      if (cpRes.status === 'fulfilled') {
        setCarePlans(cpRes.value.carePlans || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load medicine reminders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Prescription Autoplay
  const handlePrescriptionSelect = (rxId: string) => {
    setSelectedRxId(rxId);
    const rx = prescriptions.find(p => p._id === rxId);
    if (rx) {
      const firstMed = rx.medicines?.[0] || rx.items?.[0];
      if (firstMed) {
        setMedicineName(firstMed.name || firstMed.medicineName || '');
        setDosage(firstMed.dosage || '1 Tablet');
        setInstructions(firstMed.instructions || firstMed.timing || '');
      }
    }
  };

  const handleFrequencyChange = (freq: string) => {
    setFrequency(freq);
    if (freq === 'once_daily') setTimes(['09:00']);
    else if (freq === 'twice_daily') setTimes(['08:00', '20:00']);
    else if (freq === 'thrice_daily') setTimes(['08:00', '14:00', '20:00']);
  };

  const addTimeSlot = () => {
    if (newTimeInput && !times.includes(newTimeInput)) {
      setTimes([...times, newTimeInput].sort());
    }
  };

  const removeTimeSlot = (timeToRemove: string) => {
    if (times.length > 1) {
      setTimes(times.filter(t => t !== timeToRemove));
    } else {
      toast.error('At least one reminder time is required');
    }
  };

  const resetForm = () => {
    setMedicineName('');
    setDosage('');
    setFormType('Tablet');
    setFrequency('twice_daily');
    setTimes(['08:00', '20:00']);
    setIsOngoing(true);
    setEndDate('');
    setAlarmPreset('classic_alarm');
    setAutoMissMinutes(10);
    setNotifyDoctor(false);
    setMissThreshold(3);
    setCarePlanId('');
    setInstructions('');
    setEditingReminder(null);
    setSelectedRxId('');
    setFormSource('manual');
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (rem: any) => {
    setEditingReminder(rem);
    setMedicineName(rem.medicineName);
    setDosage(rem.dosage);
    setFormType(rem.form || 'Tablet');
    setFrequency(rem.frequency || 'twice_daily');
    setTimes(rem.times || ['08:00']);
    setStartDate(rem.startDate ? rem.startDate.split('T')[0] : '');
    setIsOngoing(!rem.endDate);
    setEndDate(rem.endDate ? rem.endDate.split('T')[0] : '');
    setAlarmPreset(rem.alarmSound?.presetId || 'classic_alarm');
    setAutoMissMinutes(rem.autoMissAfterMinutes || 10);
    setNotifyDoctor(!!rem.notifyDoctorOnMissThreshold);
    setMissThreshold(rem.notifyDoctorOnMissThreshold || 3);
    setCarePlanId(rem.carePlanId?._id || rem.carePlanId || '');
    setInstructions(rem.instructions || '');
    setFormSource('manual');
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineName.trim() || !dosage.trim() || times.length === 0) {
      toast.error('Please enter medicine name, dosage, and times');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        medicineName,
        dosage,
        form: formType,
        frequency,
        times,
        startDate,
        endDate: isOngoing ? null : endDate,
        alarmSound: { presetId: alarmPreset },
        autoMissAfterMinutes: autoMissMinutes,
        notifyDoctorOnMissThreshold: notifyDoctor ? missThreshold : null,
        carePlanId: carePlanId || null,
        prescriptionId: formSource === 'prescription' ? selectedRxId : null,
        instructions,
      };

      if (editingReminder) {
        await api.updateMedicineReminder(editingReminder._id, payload);
        toast.success('Reminder updated successfully');
      } else {
        await api.createMedicineReminder(payload);
        toast.success('Medicine reminder scheduled');
      }

      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save reminder');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePause = async (rem: any) => {
    try {
      if (rem.status === 'active') {
        await api.pauseMedicineReminder(rem._id);
        toast.info(`${rem.medicineName} reminder paused`);
      } else {
        await api.resumeMedicineReminder(rem._id);
        toast.success(`${rem.medicineName} reminder resumed`);
      }
      loadData();
    } catch {
      toast.error('Failed to change reminder status');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete reminder for ${name}?`)) return;
    try {
      await api.deleteMedicineReminder(id);
      toast.success('Reminder deleted');
      loadData();
    } catch {
      toast.error('Failed to delete reminder');
    }
  };

  // Trigger test alarm firing to experience phone-like alarm
  const handleTestAlarm = (rem: any) => {
    setActiveFiringAlarm({
      id: rem._id,
      type: 'medicine',
      title: rem.medicineName,
      dosageOrContext: `${rem.dosage} (${rem.form})`,
      time: rem.times?.[0] || '08:00 AM',
      alarmPreset: rem.alarmSound?.presetId || 'classic_alarm',
      carePlanTitle: rem.carePlanId?.planName,
    });
  };

  const handleAlarmTaken = async (alarm: AlarmItem) => {
    try {
      await api.respondMedicineDose(alarm.id, {
        status: 'taken',
        scheduledAt: new Date().toISOString(),
      });
      toast.success(`Dose recorded as taken for ${alarm.title}`);
      setActiveFiringAlarm(null);
      loadData();
    } catch {
      toast.error('Failed to record dose');
    }
  };

  const handleAlarmSnooze = async (alarm: AlarmItem, minutes: number) => {
    try {
      await api.respondMedicineDose(alarm.id, {
        status: 'snoozed',
        scheduledAt: new Date().toISOString(),
        snoozeMinutes: minutes,
      });
      toast.info(`Alarm snoozed for ${minutes} minutes`);
      setActiveFiringAlarm(null);
      loadData();
    } catch {
      toast.error('Failed to snooze');
    }
  };

  const handleAlarmSkip = async (alarm: AlarmItem) => {
    try {
      await api.respondMedicineDose(alarm.id, {
        status: 'skipped',
        scheduledAt: new Date().toISOString(),
      });
      toast.warning(`Dose skipped for ${alarm.title}`);
      setActiveFiringAlarm(null);
      loadData();
    } catch {
      toast.error('Failed to record skipped dose');
    }
  };

  return (
    <div className="space-y-6">
      {/* Real Full Screen Alarm Modal Overlay */}
      <AlarmOverlayModal
        alarm={activeFiringAlarm}
        onTaken={handleAlarmTaken}
        onSnooze={handleAlarmSnooze}
        onSkip={handleAlarmSkip}
      />

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Pill className="h-3.5 w-3.5" />
              Patient Home Health Management
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
              Medicine Reminders & Adherence Tracker
            </h1>
            <p className="max-w-xl text-sm text-white/80">
              Never miss a dose with phone alarm-style looping audio alerts, automated prescription auto-fill, and comprehensive adherence tracking.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={openAddModal}
              className="gap-2 rounded-2xl bg-white text-blue-600 hover:bg-white/90 font-bold shadow-lg shadow-black/10"
            >
              <Plus className="h-4 w-4" />
              Add Reminder
            </Button>
          </div>
        </div>
      </div>

      {/* Adherence Overview & Heatmap Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Adherence Score Card */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              30-Day Adherence Score
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="my-4 flex items-baseline gap-3">
            <span className="text-4xl sm:text-5xl font-extrabold text-foreground">
              {adherenceData?.adherenceScore ?? 100}%
            </span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              (adherenceData?.adherenceScore ?? 100) >= 85
                ? 'bg-emerald-500/10 text-emerald-600'
                : (adherenceData?.adherenceScore ?? 100) >= 70
                ? 'bg-amber-500/10 text-amber-600'
                : 'bg-red-500/10 text-red-600'
            }`}>
              {(adherenceData?.adherenceScore ?? 100) >= 85 ? 'Excellent' : 'Needs Attention'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t pt-3 text-xs text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">{adherenceData?.takenCount ?? 0}</p>
              <p>Taken</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">{adherenceData?.skippedCount ?? 0}</p>
              <p>Skipped</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">{adherenceData?.missedCount ?? 0}</p>
              <p>Missed</p>
            </div>
          </div>
        </div>

        {/* 7-Day Quick Strip & Calendar Heatmap */}
        <div className="md:col-span-2 rounded-3xl border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">
                Recent Adherence Heatmap
              </h3>
              <p className="text-xs text-muted-foreground">
                🟢 All Taken · 🟡 Partially Taken · 🔴 Missed Doses
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <CalendarDays className="h-4 w-4 text-primary" />
              Last 14 Days
            </div>
          </div>

          {/* Daily Strip */}
          <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 py-2">
            {Array.from({ length: 14 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (13 - i));
              const dayStr = d.toISOString().split('T')[0];
              const logEntry = adherenceData?.heatmap?.find((h: any) => h.date === dayStr);
              const status = logEntry?.status || 'none';

              let color = 'bg-muted border-border/40 text-muted-foreground';
              if (status === 'taken') color = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 font-bold';
              else if (status === 'partial') color = 'bg-amber-500/15 border-amber-500/40 text-amber-600 font-bold';
              else if (status === 'missed') color = 'bg-red-500/15 border-red-500/40 text-red-600 font-bold';

              return (
                <div
                  key={dayStr}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center text-xs transition-all hover:scale-105 ${color}`}
                  title={`${dayStr}: ${status}`}
                >
                  <span className="text-[10px] opacity-70">
                    {d.toLocaleDateString('en-US', { weekday: 'narrow' })}
                  </span>
                  <span className="text-xs mt-0.5">{d.getDate()}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t mt-2">
            <span>Server reconciliation detects missed doses automatically</span>
            <span className="font-medium text-primary">Reliable alarms active</span>
          </div>
        </div>
      </div>

      {/* Reminders List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Your Scheduled Reminders
            </h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {reminders.length}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={openAddModal} className="rounded-xl gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add New
          </Button>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center rounded-3xl border border-dashed text-muted-foreground">
            Loading reminders...
          </div>
        ) : reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/20 p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4">
              <Pill className="h-8 w-8" />
            </div>
            <h3 className="font-heading font-bold text-lg text-foreground">
              No medicine reminders configured yet
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Set up your daily medications with looping alarm tones so you never miss a dose.
            </p>
            <Button onClick={openAddModal} className="mt-5 gap-2 rounded-2xl">
              <Plus className="h-4 w-4" />
              Schedule Your First Reminder
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reminders.map((rem) => {
              const isPaused = rem.status === 'paused';
              return (
                <div
                  key={rem._id}
                  className={`relative overflow-hidden rounded-3xl border p-5 transition-all shadow-sm ${
                    isPaused
                      ? 'border-border/60 bg-muted/30 opacity-75'
                      : 'border-border/80 bg-card hover:border-primary/40 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl font-bold shadow-sm ${
                        isPaused
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-gradient-to-tr from-blue-500 to-indigo-500 text-white shadow-blue-500/20'
                      }`}>
                        <Pill className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-bold text-lg text-foreground">
                            {rem.medicineName}
                          </h3>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isPaused
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-emerald-500/10 text-emerald-600'
                          }`}>
                            {isPaused ? 'Paused' : 'Active'}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground mt-0.5">
                          {rem.dosage} · {rem.form || 'Tablet'}
                        </p>
                        {rem.carePlanId && (
                          <span className="inline-block mt-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                            ❤️ {rem.carePlanId.planName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePause(rem)}
                        title={isPaused ? 'Resume Reminder' : 'Pause Reminder'}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => openEditModal(rem)}
                        title="Edit Reminder"
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rem._id, rem.medicineName)}
                        title="Delete Reminder"
                        className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Scheduled Times Badges */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1">
                      <Clock className="h-3.5 w-3.5" /> Times:
                    </span>
                    {rem.times?.map((t: string) => (
                      <span
                        key={t}
                        className="rounded-xl bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-bold text-primary"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Alarm Tone & Test Action */}
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Volume2 className="h-3.5 w-3.5 text-primary" />
                      <span>Sound: <strong className="text-foreground capitalize">{rem.alarmSound?.presetId?.replace('_', ' ') || 'Classic'}</strong></span>
                      <button
                        type="button"
                        onClick={() => previewAlarmSound(rem.alarmSound?.presetId || 'classic_alarm')}
                        className="text-primary hover:underline text-[11px] ml-1 font-semibold"
                      >
                        ▶ Test Tone
                      </button>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10"
                      onClick={() => handleTestAlarm(rem)}
                    >
                      <Bell className="h-3.5 w-3.5" />
                      Test Alarm Screen
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Reminder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-xl font-bold text-foreground">
                {editingReminder ? 'Edit Reminder' : 'Set Up Medicine Reminder'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Source Switcher */}
              {!editingReminder && (
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/50 p-1">
                  <button
                    type="button"
                    onClick={() => setFormSource('manual')}
                    className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                      formSource === 'manual'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Manual Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormSource('prescription')}
                    className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                      formSource === 'prescription'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    From Prescription
                  </button>
                </div>
              )}

              {/* Prescription Selector */}
              {formSource === 'prescription' && !editingReminder && (
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">
                    Select Issued Prescription
                  </label>
                  <select
                    value={selectedRxId}
                    onChange={(e) => handlePrescriptionSelect(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">-- Choose Prescription --</option>
                    {prescriptions.map((rx) => (
                      <option key={rx._id} value={rx._id}>
                        {rx.doctorName || rx.doctor || 'Doctor'} · {new Date(rx.date || rx.createdAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Medicine Name & Dosage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">
                    Medicine Name *
                  </label>
                  <Input
                    value={medicineName}
                    onChange={(e) => setMedicineName(e.target.value)}
                    placeholder="e.g. Metformin"
                    className="rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">
                    Dosage *
                  </label>
                  <Input
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 500mg"
                    className="rounded-xl"
                    required
                  />
                </div>
              </div>

              {/* Form & Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">
                    Medicine Form
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Inhaler">Inhaler</option>
                    <option value="Drops">Drops</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => handleFrequencyChange(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="once_daily">Once daily</option>
                    <option value="twice_daily">Twice daily</option>
                    <option value="thrice_daily">Thrice daily</option>
                    <option value="custom">Custom times</option>
                  </select>
                </div>
              </div>

              {/* Reminder Times */}
              <div>
                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">
                  Reminder Times (24-hr clock)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {times.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-xl bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary"
                    >
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTimeSlot(t)}
                        className="hover:text-red-500 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={newTimeInput}
                    onChange={(e) => setNewTimeInput(e.target.value)}
                    className="w-36 rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTimeSlot}
                    className="rounded-xl"
                  >
                    + Add Time
                  </Button>
                </div>
              </div>

              {/* Alarm Sound Spec */}
              <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <Volume2 className="h-4 w-4 text-primary" />
                    Alarm Tone (Looping Sound)
                  </label>
                  <button
                    type="button"
                    onClick={() => previewAlarmSound(alarmPreset)}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    ▶ Preview Tone
                  </button>
                </div>
                <select
                  value={alarmPreset}
                  onChange={(e) => setAlarmPreset(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                >
                  {ALARM_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.desc}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Rings continuously like a phone alarm clock until you tap Taken, Snooze, or Skip.
                </p>
              </div>

              {/* Auto-Miss Timeout & Doctor Alert */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">
                    Auto-mark Missed After
                  </label>
                  <select
                    value={autoMissMinutes}
                    onChange={(e) => setAutoMissMinutes(Number(e.target.value))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>

                {carePlans.length > 0 && (
                  <div>
                    <label className="text-xs font-medium mb-1 block text-muted-foreground">
                      Link to Care Plan (Optional)
                    </label>
                    <select
                      value={carePlanId}
                      onChange={(e) => setCarePlanId(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">-- Standalone (No Plan) --</option>
                      {carePlans.map((cp) => (
                        <option key={cp._id} value={cp._id}>
                          {cp.planName} ({cp.condition})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Notify Doctor Checkbox */}
              <div className="rounded-2xl border border-border/80 p-3 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="notifyDoctorCheckbox"
                  checked={notifyDoctor}
                  onChange={(e) => setNotifyDoctor(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary"
                />
                <label htmlFor="notifyDoctorCheckbox" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                  <strong className="text-foreground block">Notify my Doctor on multiple missed doses</strong>
                  Send an email alert to my linked doctor if I miss 3 or more doses within a week.
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl font-bold bg-primary text-primary-foreground"
                >
                  {submitting ? 'Saving...' : editingReminder ? 'Update Reminder' : 'Save Reminder'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
