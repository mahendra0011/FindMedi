import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Calendar,
  Clock,
  Pill,
  Activity,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Share2,
  TrendingUp,
  Download,
  Pause,
  Play,
  X,
  Stethoscope,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

const CONDITIONS = [
  'Diabetes',
  'Hypertension',
  'Thyroid',
  'Asthma',
  'Heart Disease',
  'Arthritis',
  'COPD',
  'Other',
];

export default function PatientCarePlan() {
  const navigate = useNavigate();
  const [carePlans, setCarePlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [todayChecklist, setTodayChecklist] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [existingReminders, setExistingReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [planName, setPlanName] = useState('');
  const [condition, setCondition] = useState('Diabetes');
  const [customCondition, setCustomCondition] = useState('');
  const [linkedDoctorId, setLinkedDoctorId] = useState('');
  const [selectedReminders, setSelectedReminders] = useState<string[]>([]);
  const [trackedVitals, setTrackedVitals] = useState<string[]>(['blood_sugar', 'weight']);
  const [sugarMin, setSugarMin] = useState('80');
  const [sugarMax, setSugarMax] = useState('130');
  const [bpSysMax, setBpSysMax] = useState('135');
  const [followUpDays, setFollowUpDays] = useState('30');
  const [shareWithDoctor, setShareWithDoctor] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [plansRes, docsRes, remsRes] = await Promise.allSettled([
        api.getCarePlans(),
        api.getDoctors(),
        api.getMedicineReminders(),
      ]);

      if (plansRes.status === 'fulfilled') {
        const plans = plansRes.value.carePlans || [];
        setCarePlans(plans);
        if (plans.length > 0 && !selectedPlan) {
          loadPlanDetails(plans[0]._id);
        }
      }
      if (docsRes.status === 'fulfilled') {
        const dList = docsRes.value.doctors || docsRes.value.data || docsRes.value || [];
        setDoctors(Array.isArray(dList) ? dList : []);
      }
      if (remsRes.status === 'fulfilled') {
        setExistingReminders(remsRes.value.reminders || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load care plans');
    } finally {
      setLoading(false);
    }
  }, [selectedPlan]);

  const loadPlanDetails = async (id: string) => {
    try {
      const [detailRes, todayRes] = await Promise.all([
        api.getCarePlan(id),
        api.getCarePlanToday(id),
      ]);
      setSelectedPlan(detailRes.carePlan);
      setTodayChecklist(todayRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) {
      return toast.error('Please provide a Care Plan name');
    }

    try {
      setSubmitting(true);
      const vitalsArray = trackedVitals.map(v => {
        const item: any = { vitalType: v };
        if (v === 'blood_sugar') {
          item.personalizedTarget = { min: Number(sugarMin) || 70, max: Number(sugarMax) || 140 };
          item.targetDescription = `Target: ${sugarMin}–${sugarMax} mg/dL`;
        } else if (v === 'bp') {
          item.personalizedTarget = { min: 90, max: Number(bpSysMax) || 135 };
          item.targetDescription = `Target Systolic < ${bpSysMax} mmHg`;
        }
        return item;
      });

      const payload = {
        planName,
        condition,
        customCondition,
        linkedDoctorId: linkedDoctorId || null,
        medicineReminderIds: selectedReminders,
        vitalsTracked: vitalsArray,
        followUpIntervalDays: Number(followUpDays) || 30,
        shareWithDoctor,
        notes,
      };

      const res = await api.createCarePlan(payload);
      toast.success('Care Plan created successfully');
      setShowCreateModal(false);
      loadData();
      if (res.carePlan) {
        loadPlanDetails(res.carePlan._id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create care plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (plan: any) => {
    const nextStatus = plan.status === 'active' ? 'paused' : 'active';
    try {
      await api.updateCarePlanStatus(plan._id, nextStatus);
      toast.success(`Plan marked as ${nextStatus}`);
      loadData();
      if (selectedPlan?._id === plan._id) {
        loadPlanDetails(plan._id);
      }
    } catch {
      toast.error('Failed to update plan status');
    }
  };

  const handleToggleConsent = async (plan: any) => {
    const nextConsent = !plan.shareWithDoctor;
    try {
      await api.updateCarePlanConsent(plan._id, nextConsent);
      toast.success(`Doctor sharing ${nextConsent ? 'enabled' : 'disabled'}`);
      loadData();
      if (selectedPlan?._id === plan._id) {
        setSelectedPlan({ ...selectedPlan, shareWithDoctor: nextConsent });
      }
    } catch {
      toast.error('Failed to update consent');
    }
  };

  const handleCheckDose = async (item: any) => {
    try {
      await api.respondMedicineDose(item.reminderId, {
        status: 'taken',
        scheduledAt: item.scheduledAt,
      });
      toast.success(`Recorded dose as taken for ${item.medicineName}`);
      if (selectedPlan) {
        loadPlanDetails(selectedPlan._id);
      }
    } catch {
      toast.error('Failed to record dose');
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Heart className="h-3.5 w-3.5" />
              Chronic Disease Management
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
              Chronic Disease Care Plans
            </h1>
            <p className="max-w-xl text-sm text-white/80">
              Bundle your medicines, home vitals tracking, and regular follow-up visits under a single comprehensive care plan for your condition.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="gap-2 rounded-2xl bg-white text-teal-700 hover:bg-white/90 font-bold shadow-lg shadow-black/10"
            >
              <Plus className="h-4 w-4" />
              Create Care Plan
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-3xl border border-dashed text-muted-foreground">
          Loading care plans...
        </div>
      ) : carePlans.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-muted/20 p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600 mb-4">
            <Heart className="h-8 w-8" />
          </div>
          <h3 className="font-heading font-bold text-lg text-foreground">
            No Care Plans created yet
          </h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Care Plans help you manage chronic conditions like Diabetes or Hypertension with linked medicine reminders, home vitals checks, and doctor visibility — all in one place.
          </p>
          <Button onClick={() => setShowCreateModal(true)} className="mt-5 gap-2 rounded-2xl font-bold">
            <Plus className="h-4 w-4" />
            Create Your First Care Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Plan Selector & Switcher */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-foreground">
                Your Care Plans
              </h2>
              <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-600">
                {carePlans.length} Active
              </span>
            </div>

            <div className="space-y-3">
              {carePlans.map((plan) => {
                const isSelected = selectedPlan?._id === plan._id;
                const isPaused = plan.status === 'paused';
                return (
                  <div
                    key={plan._id}
                    onClick={() => loadPlanDetails(plan._id)}
                    className={`cursor-pointer rounded-3xl border p-5 transition-all shadow-sm ${
                      isSelected
                        ? 'border-teal-500 bg-teal-500/5 ring-2 ring-teal-500/20'
                        : 'border-border/80 bg-card hover:border-teal-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-heading font-bold text-base text-foreground">
                          {plan.planName}
                        </h3>
                        <span className="inline-block mt-0.5 text-xs font-semibold text-teal-600 dark:text-teal-400">
                          {plan.condition}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        isPaused
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-emerald-500/10 text-emerald-600'
                      }`}>
                        {plan.status}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t pt-2.5">
                      <span>{plan.medicineReminderIds?.length || 0} Meds · {plan.vitalsTracked?.length || 0} Vitals</span>
                      <span className="font-medium text-foreground flex items-center gap-1">
                        View Details <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              variant="outline"
              onClick={() => setShowCreateModal(true)}
              className="w-full rounded-2xl gap-2 border-dashed border-border/80"
            >
              <Plus className="h-4 w-4" />
              Create Another Care Plan
            </Button>
          </div>

          {/* Right Column: Selected Plan's "Today" View & Combined Trends */}
          {selectedPlan && (
            <div className="lg:col-span-2 space-y-6">
              {/* Plan Header Card */}
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-heading text-2xl font-bold text-foreground">
                        {selectedPlan.planName}
                      </h2>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-600">
                        {selectedPlan.condition}
                      </span>
                    </div>
                    {selectedPlan.linkedDoctorId && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Stethoscope className="h-3.5 w-3.5 text-primary" />
                        Linked Doctor: <strong className="text-foreground">{selectedPlan.linkedDoctorId.name}</strong> ({selectedPlan.linkedDoctorId.specialization})
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleConsent(selectedPlan)}
                      className={`rounded-xl text-xs font-semibold gap-1.5 ${
                        selectedPlan.shareWithDoctor
                          ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      {selectedPlan.shareWithDoctor ? 'Sharing with Doctor (Consented)' : 'Doctor Sharing Off'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(selectedPlan)}
                      className="rounded-xl text-xs gap-1.5"
                    >
                      {selectedPlan.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      {selectedPlan.status === 'active' ? 'Pause Plan' : 'Resume Plan'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrintReport}
                      className="rounded-xl text-xs gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export Report
                    </Button>
                  </div>
                </div>

                {/* Insight Banner */}
                {selectedPlan.correlationInsight && (
                  <div className="mt-4 rounded-2xl border border-teal-500/30 bg-teal-500/10 p-3.5 text-xs text-teal-800 dark:text-teal-200 flex items-start gap-2.5">
                    <TrendingUp className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold block">Health Insight</strong>
                      {selectedPlan.correlationInsight}
                    </div>
                  </div>
                )}
              </div>

              {/* Combined "Today" Checklist */}
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-heading font-bold text-lg text-foreground">
                      Today's Plan Checklist
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Complete your medicine doses and vitals checks for today in one place.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary" />
                    {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </div>
                </div>

                {/* Medicines Checklist */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Pill className="h-3.5 w-3.5 text-blue-500" />
                    Prescribed Medicines Due Today
                  </h4>
                  {(!todayChecklist?.medicinesDue || todayChecklist.medicinesDue.length === 0) ? (
                    <p className="text-xs text-muted-foreground py-2 italic">
                      No medicines scheduled for today under this plan.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {todayChecklist.medicinesDue.map((item: any, idx: number) => {
                        const isTaken = item.status === 'taken' || item.status === 'snoozed_then_taken';
                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                              isTaken ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/20 border-border/60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => !isTaken && handleCheckDose(item)}
                                disabled={isTaken}
                                className={`h-6 w-6 rounded-lg flex items-center justify-center border transition-colors ${
                                  isTaken
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'border-muted-foreground/40 hover:border-primary'
                                }`}
                              >
                                {isTaken && <CheckCircle2 className="h-4 w-4" />}
                              </button>
                              <div>
                                <p className={`text-sm font-bold ${isTaken ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                  {item.medicineName} ({item.dosage})
                                </p>
                                <span className="text-[11px] text-muted-foreground">
                                  Scheduled for {item.time} · {item.form}
                                </span>
                              </div>
                            </div>

                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                              isTaken
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Vitals Checklist */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-rose-500" />
                    Vitals To Log Today
                  </h4>
                  {(!todayChecklist?.vitalsDue || todayChecklist.vitalsDue.length === 0) ? (
                    <p className="text-xs text-muted-foreground py-2 italic">
                      No vitals configured for this plan.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {todayChecklist.vitalsDue.map((vItem: any, idx: number) => {
                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                              vItem.loggedToday ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-muted/20 border-border/60'
                            }`}
                          >
                            <div>
                              <p className="text-sm font-bold capitalize text-foreground">
                                {vItem.vitalType.replace('_', ' ')}
                              </p>
                              <span className="text-[11px] text-muted-foreground">
                                {vItem.targetDescription || 'Daily monitoring'}
                              </span>
                            </div>

                            {vItem.loggedToday ? (
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Logged Today
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate('/patient/vitals')}
                                className="rounded-xl text-xs gap-1"
                              >
                                Log Now
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Follow-up Countdown */}
                <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-primary" />
                      Next Follow-up Appointment
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {todayChecklist?.followUp?.daysUntilFollowUp != null
                        ? `Due in approximately ${todayChecklist.followUp.daysUntilFollowUp} days`
                        : 'Routine 30-day chronic checkup'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate('/doctors')}
                    className="rounded-xl font-semibold gap-1.5"
                  >
                    Book Appointment
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Care Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-xl font-bold text-foreground">
                Create Chronic Disease Care Plan
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Care Plan Name *
                </label>
                <Input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. My Diabetes Management Plan"
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Primary Condition *
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Linked Doctor (Optional)
                  </label>
                  <select
                    value={linkedDoctorId}
                    onChange={(e) => setLinkedDoctorId(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">-- Select Doctor --</option>
                    {doctors.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.specialization})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Medicines to Link */}
              {existingReminders.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    Link Existing Medicine Reminders
                  </label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto rounded-xl border p-2 bg-muted/20">
                    {existingReminders.map((rem) => {
                      const checked = selectedReminders.includes(rem._id);
                      return (
                        <label key={rem._id} className="flex items-center gap-2 text-xs p-1 rounded hover:bg-muted cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReminders([...selectedReminders, rem._id]);
                              } else {
                                setSelectedReminders(selectedReminders.filter(id => id !== rem._id));
                              }
                            }}
                            className="rounded text-primary"
                          />
                          <span className="font-medium text-foreground">{rem.medicineName}</span>
                          <span className="text-muted-foreground">({rem.dosage})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Vitals to Track */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Vitals To Track Under This Plan
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'blood_sugar', label: 'Blood Sugar' },
                    { id: 'bp', label: 'Blood Pressure' },
                    { id: 'weight', label: 'Weight' },
                    { id: 'temperature', label: 'Temperature' },
                  ].map((v) => {
                    const checked = trackedVitals.includes(v.id);
                    return (
                      <label key={v.id} className="flex items-center gap-2 p-2 rounded-xl border bg-muted/10 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTrackedVitals([...trackedVitals, v.id]);
                            } else {
                              setTrackedVitals(trackedVitals.filter(id => id !== v.id));
                            }
                          }}
                          className="rounded text-primary"
                        />
                        <span className="font-semibold text-foreground">{v.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Follow-up and Consent */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Follow-up Checkup Interval
                  </label>
                  <select
                    value={followUpDays}
                    onChange={(e) => setFollowUpDays(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="15">Every 15 days</option>
                    <option value="30">Every 30 days (1 Month)</option>
                    <option value="60">Every 60 days (2 Months)</option>
                    <option value="90">Every 90 days (3 Months)</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs cursor-pointer text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={shareWithDoctor}
                      onChange={(e) => setShareWithDoctor(e.target.checked)}
                      className="rounded text-primary h-4 w-4"
                    />
                    <span>Share adherence & vitals with my doctor (Opt-in)</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="rounded-xl font-bold bg-primary text-primary-foreground">
                  {submitting ? 'Creating...' : 'Create Care Plan'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
