/* eslint-disable react-hooks/preserve-manual-memoization, prefer-const, react/no-unescaped-entities, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-expressions, @next/next/no-img-element,  @typescript-eslint/ban-ts-comment, react-hooks/set-state-in-effect, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import {
  Save, Stethoscope, Home, CheckCircle, IndianRupee, MessageSquare, Video,
  Building2, AlertTriangle, ShieldCheck, RefreshCw, CheckSquare, Square, Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

export default function ClinicFees() {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Appointment Modes
  const [appointmentModes, setAppointmentModes] = useState(['chat', 'video', 'offline', 'audio']);

  // Mode Fees
  const [chatFee, setChatFee] = useState('300');
  const [videoFee, setVideoFee] = useState('500');
  const [audioFee, setAudioFee] = useState('400');
  const [offlineFee, setOfflineFee] = useState('500');
  const [homeVisitFee, setHomeVisitFee] = useState('1000');
  const [emergencyFee, setEmergencyFee] = useState('800');

  // Policy Flags
  const [emergencySupport, setEmergencySupport] = useState(false);
  const [refundOnMissedOrCancelled, setRefundOnMissedOrCancelled] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const doctors = (await api.getDoctors())?.data || [];
        const myDoc = doctors.find(d => d.email === user?.email) || doctors.find(d => d.name?.includes(user?.name)) || null;
        if (myDoc) {
          setDoctor(myDoc);
          
          // Modes
          if (Array.isArray(myDoc.appointmentModes) && myDoc.appointmentModes.length > 0) {
            setAppointmentModes(myDoc.appointmentModes);
          }

          // Fees
          const fees = myDoc.appointmentFees || {};
          setChatFee(String(fees.chat ?? myDoc.chat_fee ?? 300));
          setVideoFee(String(fees.video ?? myDoc.video_fee ?? 500));
          setAudioFee(String(fees.audio ?? myDoc.audio_fee ?? 400));
          setOfflineFee(String(fees.offline ?? myDoc.offline_fee ?? myDoc.consultation_fees ?? myDoc.fees ?? 500));
          setHomeVisitFee(String(myDoc.home_visit_fee ?? 1000));
          setEmergencyFee(String(myDoc.emergency_fee ?? 800));

          // Flags
          setEmergencySupport(Boolean(myDoc.emergencySupport || myDoc.emergency_consultation));
          setRefundOnMissedOrCancelled(myDoc.refundOnMissedOrCancelled !== false);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, [user?.email, user?.name]);

  const toggleMode = (mode) => {
    setAppointmentModes(prev => {
      if (prev.includes(mode)) {
        if (prev.length === 1) {
          toast.warning('At least one consultation mode must be enabled');
          return prev;
        }
        return prev.filter(m => m !== mode);
      } else {
        return [...prev, mode];
      }
    });
  };

  const handleSave = async () => {
    if (!doctor) return;
    setSaving(true);
    try {
      const cFee = Number(chatFee) || 0;
      const vFee = Number(videoFee) || 0;
      const aFee = Number(audioFee) || 0;
      const offFee = Number(offlineFee) || 0;
      const hvFee = Number(homeVisitFee) || 0;
      const emFee = Number(emergencyFee) || 0;

      await api.updateDoctor(doctor._id, {
        appointmentModes,
        appointmentFees: {
          chat: cFee,
          video: vFee,
          audio: aFee,
          offline: offFee,
          home_visit: hvFee,
        },
        chat_fee: cFee,
        video_fee: vFee,
        audio_fee: aFee,
        offline_fee: offFee,
        consultation_fees: offFee,
        fees: offFee,
        home_visit_fee: hvFee,
        emergency_fee: emFee,
        emergencySupport,
        emergency_consultation: emergencySupport,
        refundOnMissedOrCancelled,
      });

      setSaved(true);
      toast.success('Fee & pricing settings updated successfully!');
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Failed to save fees');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2.5">
            <IndianRupee className="w-6 h-6 text-primary" />
            Fee &amp; Pricing Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure online (Chat, Video), clinic &amp; home visit consultation fees, emergency support, and refund policies
          </p>
          {doctor?.name && (
            <p className="mt-1 text-xs font-semibold text-primary/80">
              Doctor / Facility: {doctor.name} ({doctor.specialization || 'General'})
            </p>
          )}
        </div>
        <Button className="gap-2 shrink-0 shadow-sm" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save All Fees'}
          {saved && <CheckCircle className="w-4 h-4 text-emerald-300" />}
        </Button>
      </div>

      {/* Live Summary Bar */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20 p-5 shadow-sm">
        <h3 className="font-heading font-semibold text-foreground text-sm mb-3">Current Active Pricing Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
          <div className="bg-card rounded-xl p-3.5 text-center border border-border/60">
            <div className="flex items-center justify-center gap-1 text-violet-600 mb-1">
              <Building2 className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">In Clinic</span>
            </div>
            <p className="text-xl font-bold text-foreground">₹{offlineFee || '0'}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${appointmentModes.includes('offline') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
              {appointmentModes.includes('offline') ? 'Active' : 'Disabled'}
            </span>
          </div>

          <div className="bg-card rounded-xl p-3.5 text-center border border-border/60">
            <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
              <Home className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">Home Visit</span>
            </div>
            <p className="text-xl font-bold text-foreground">₹{homeVisitFee || '0'}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${(appointmentModes.includes('home_visit') || appointmentModes.includes('home')) ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
              {(appointmentModes.includes('home_visit') || appointmentModes.includes('home')) ? 'Active' : 'Disabled'}
            </span>
          </div>

          <div className="bg-card rounded-xl p-3.5 text-center border border-border/60">
            <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
              <Video className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">Video Call</span>
            </div>
            <p className="text-xl font-bold text-foreground">₹{videoFee || '0'}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${appointmentModes.includes('video') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
              {appointmentModes.includes('video') ? 'Active' : 'Disabled'}
            </span>
          </div>

          <div className="bg-card rounded-xl p-3.5 text-center border border-border/60">
            <div className="flex items-center justify-center gap-1 text-teal-600 mb-1">
              <Phone className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">Audio Call</span>
            </div>
            <p className="text-xl font-bold text-foreground">₹{audioFee || '0'}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${appointmentModes.includes('audio') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
              {appointmentModes.includes('audio') ? 'Active' : 'Disabled'}
            </span>
          </div>

          <div className="bg-card rounded-xl p-3.5 text-center border border-border/60">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">Online Chat</span>
            </div>
            <p className="text-xl font-bold text-foreground">₹{chatFee || '0'}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${appointmentModes.includes('chat') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
              {appointmentModes.includes('chat') ? 'Active' : 'Disabled'}
            </span>
          </div>

          <div className="bg-card rounded-xl p-3.5 text-center border border-border/60">
            <div className="flex items-center justify-center gap-1 text-destructive mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">Emergency</span>
            </div>
            <p className="text-xl font-bold text-foreground">₹{emergencyFee || '0'}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${emergencySupport ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
              {emergencySupport ? 'Supported' : 'No 24x7'}
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: Modes of Appointment Provided */}
      <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" /> Modes of Appointment You Provide
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose which consultation channels you offer to patients. Patients can book appointments for enabled modes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Offline Mode Card */}
          <div
            onClick={() => toggleMode('offline')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
              appointmentModes.includes('offline')
                ? 'border-violet-500 bg-violet-500/5'
                : 'border-border/60 hover:border-border'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${appointmentModes.includes('offline') ? 'bg-violet-500 text-white' : 'bg-muted text-muted-foreground'}`}>
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">In Clinic</span>
                <span className={`text-xs font-bold ${appointmentModes.includes('offline') ? 'text-violet-600' : 'text-muted-foreground'}`}>
                  {appointmentModes.includes('offline') ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Physical clinic visit</p>
            </div>
          </div>

          {/* Home Visit Mode Card */}
          <div
            onClick={() => toggleMode('home_visit')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
              (appointmentModes.includes('home_visit') || appointmentModes.includes('home'))
                ? 'border-amber-500 bg-amber-500/5'
                : 'border-border/60 hover:border-border'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${(appointmentModes.includes('home_visit') || appointmentModes.includes('home')) ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}>
              <Home className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">Home Visit</span>
                <span className={`text-xs font-bold ${(appointmentModes.includes('home_visit') || appointmentModes.includes('home')) ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {(appointmentModes.includes('home_visit') || appointmentModes.includes('home')) ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Doctor visits patient at home</p>
            </div>
          </div>

          {/* Video Mode Card */}
          <div
            onClick={() => toggleMode('video')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
              appointmentModes.includes('video')
                ? 'border-emerald-500 bg-emerald-500/5'
                : 'border-border/60 hover:border-border'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${appointmentModes.includes('video') ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
              <Video className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">Video Call</span>
                <span className={`text-xs font-bold ${appointmentModes.includes('video') ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  {appointmentModes.includes('video') ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">HD virtual video consult</p>
            </div>
          </div>

          {/* Audio Mode Card */}
          <div
            onClick={() => toggleMode('audio')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
              appointmentModes.includes('audio')
                ? 'border-teal-500 bg-teal-500/5'
                : 'border-border/60 hover:border-border'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${appointmentModes.includes('audio') ? 'bg-teal-500 text-white' : 'bg-muted text-muted-foreground'}`}>
              <Phone className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">Audio Call</span>
                <span className={`text-xs font-bold ${appointmentModes.includes('audio') ? 'text-teal-600' : 'text-muted-foreground'}`}>
                  {appointmentModes.includes('audio') ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Direct voice call consultation</p>
            </div>
          </div>

          {/* Chat Mode Card */}
          <div
            onClick={() => toggleMode('chat')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
              appointmentModes.includes('chat')
                ? 'border-blue-500 bg-blue-500/5'
                : 'border-border/60 hover:border-border'
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${appointmentModes.includes('chat') ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'}`}>
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">Online Chat</span>
                <span className={`text-xs font-bold ${appointmentModes.includes('chat') ? 'text-blue-600' : 'text-muted-foreground'}`}>
                  {appointmentModes.includes('chat') ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Real-time digital chat</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Consultation Fees Pricing */}
      <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-primary" /> Mode-Wise Consultation Fees
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Set individual pricing for each consultation mode. These prices are displayed during booking and checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <FeeField
            label="In Clinic Fee"
            icon={Building2}
            color="text-violet-600"
            value={offlineFee}
            onChange={setOfflineFee}
            placeholder="500"
            disabled={!appointmentModes.includes('offline')}
          />
          <FeeField
            label="Home Visit Fee"
            icon={Home}
            color="text-amber-600"
            value={homeVisitFee}
            onChange={setHomeVisitFee}
            placeholder="1000"
            disabled={!appointmentModes.includes('home_visit') && !appointmentModes.includes('home')}
          />
          <FeeField
            label="Video Call Fee"
            icon={Video}
            color="text-emerald-600"
            value={videoFee}
            onChange={setVideoFee}
            placeholder="500"
            disabled={!appointmentModes.includes('video')}
          />
          <FeeField
            label="Audio Call Fee"
            icon={Phone}
            color="text-teal-600"
            value={audioFee}
            onChange={setAudioFee}
            placeholder="400"
            disabled={!appointmentModes.includes('audio')}
          />
          <FeeField
            label="Chat Consultation Fee"
            icon={MessageSquare}
            color="text-blue-600"
            value={chatFee}
            onChange={setChatFee}
            placeholder="300"
            disabled={!appointmentModes.includes('chat')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/40">
          <FeeField
            label="Home Visit Consultation Fee"
            icon={Home}
            color="text-amber-600"
            value={homeVisitFee}
            onChange={setHomeVisitFee}
            placeholder="1000"
          />
          <FeeField
            label="Emergency Consultation Fee"
            icon={AlertTriangle}
            color="text-destructive"
            value={emergencyFee}
            onChange={setEmergencyFee}
            placeholder="800"
          />
        </div>
      </div>

      {/* Section 3: Emergency Support & Policies */}
      <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm">
        <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-primary" /> Emergency Support &amp; Refund Policy
        </h2>

        <div className="space-y-4">
          {/* Emergency Support Toggle */}
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/60 hover:bg-muted/30 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={emergencySupport}
              onChange={e => setEmergencySupport(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary mt-0.5 cursor-pointer"
            />
            <div>
              <span className="font-semibold text-sm text-foreground block">
                Do you provide emergency support (24x7 / Priority)?
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enables emergency priority booking badges and lists you under urgent care / emergency services.
              </p>
            </div>
          </label>

          {/* Refund Support Toggle */}
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/60 hover:bg-muted/30 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={refundOnMissedOrCancelled}
              onChange={e => setRefundOnMissedOrCancelled(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary mt-0.5 cursor-pointer"
            />
            <div>
              <span className="font-semibold text-sm text-foreground block">
                Do you support full / partial refund when appointment is missed or cancelled by patient?
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Displays the 100% Refund Guarantee badge on your clinic profile and streamlines automatic patient refunds.
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

function FeeField({ label, icon: Icon, color = 'text-muted-foreground', value, onChange, placeholder, disabled = false }) {
  return (
    <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
      <label className="text-xs font-semibold text-foreground mb-1.5 block flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${color}`} /> {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₹</span>
        <Input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="pl-8 text-sm font-semibold h-9"
          placeholder={placeholder}
          min={0}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
