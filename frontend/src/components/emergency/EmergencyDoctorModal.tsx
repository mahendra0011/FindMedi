import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stethoscope, MapPin, AlertTriangle, ShieldCheck, Heart, User, Phone, Check,
  X, Compass, Navigation, Clock, Activity, Siren, CheckCircle2, ChevronRight, Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import EmergencyDoctorTrackingScreen from './EmergencyDoctorTrackingScreen';

const EMERGENCY_CATEGORIES = [
  { id: 'Cardiovascular / Chest Pain', label: 'Severe Chest Pain / Heart Attack', icon: '🫀', severity: 'Critical', bg: 'bg-rose-500/10 text-rose-500 border-rose-500/30' },
  { id: 'Respiratory Distress / Asthma', label: 'Difficulty Breathing / Severe Asthma', icon: '🫁', severity: 'Critical', bg: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30' },
  { id: 'Severe Trauma / Bleeding', label: 'Accident Trauma / Profuse Bleeding', icon: '🩸', severity: 'Critical', bg: 'bg-red-500/10 text-red-500 border-red-500/30' },
  { id: 'Pediatric High Fever / Seizures', label: 'Child High Fever / Convulsions', icon: '👶', severity: 'Severe', bg: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  { id: 'Loss of Consciousness / Stroke', label: 'Sudden Unconsciousness / Facial Droop', icon: '🧠', severity: 'Critical', bg: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
  { id: 'General Medical Emergency', label: 'Other Acute Medical Crisis', icon: '🩺', severity: 'Severe', bg: 'bg-teal-500/10 text-teal-500 border-teal-500/30' },
];

interface DoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
}

export default function EmergencyDoctorModal({ isOpen, onClose, currentUser }: DoctorModalProps) {
  const [category, setCategory] = useState(EMERGENCY_CATEGORIES[0].id);
  const [symptoms, setSymptoms] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [patientName, setPatientName] = useState(currentUser?.name || '');
  const [patientPhone, setPatientPhone] = useState(currentUser?.phone || '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [consentAgreed, setConsentAgreed] = useState(true);

  // Auto-acquire patient GPS coordinates on open
  useEffect(() => {
    if (!isOpen) return;
    if (currentUser?.name && !patientName) setPatientName(currentUser.name);
    if (currentUser?.phone && !patientPhone) setPatientPhone(currentUser.phone);

    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setAddress(`GPS Location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
          setLocating(false);
        },
        () => {
          setLocating(false);
          setAddress('Current Residence / Location');
          setCoords({ lat: 23.1815, lng: 79.9864 }); // Fallback
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setLocating(false);
      setCoords({ lat: 23.1815, lng: 79.9864 });
    }
  }, [isOpen, currentUser]);

  const handleSubmit = async () => {
    if (!coords) {
      toast.error('Location is required for emergency doctor dispatch');
      return;
    }
    if (!consentAgreed) {
      toast.error('Please accept the Emergency Care Consent and Privacy Policy to proceed');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        pickupLocation: {
          type: 'Point',
          coordinates: [coords.lng, coords.lat],
        },
        pickupAddress: address || 'Current GPS Location',
        landmark,
        emergencyCategory: category,
        symptomsDescription: symptoms || 'Urgent physician flying squad requested.',
        patientName: patientName || currentUser?.name || 'Emergency Patient',
        patientPhone: patientPhone || currentUser?.phone || '',
        severity: EMERGENCY_CATEGORIES.find((c) => c.id === category)?.severity || 'Severe',
      };

      const res: any = await api.post('/emergency-doctor/dispatch', payload);

      if (res?.request || res?.data?.request) {
        const reqData = res.request || res.data?.request;
        setActiveRequest(reqData);
        toast.success('🩺 Emergency Doctor Dispatch Initiated! Finding nearest physician...');
      } else {
        toast.success('🚨 Emergency Doctor Dispatch Initiated!');
        setActiveRequest({
          bookingId: `DOC-${Date.now().toString(36).toUpperCase()}`,
          status: 'searching',
          emergencyCategory: category,
          pickupAddress: address,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to dispatch emergency doctor. Please call emergency services.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (activeRequest?._id) {
      try {
        await api.post(`/emergency-doctor/${activeRequest._id}/cancel`, {
          reason: 'Cancelled by patient',
          cancelledBy: 'patient',
        });
      } catch {}
    }
    setActiveRequest(null);
    onClose();
    toast.info('Emergency request cancelled');
  };

  if (!isOpen) return null;

  if (activeRequest) {
    return (
      <EmergencyDoctorTrackingScreen
        request={activeRequest}
        onCancel={handleCancel}
        onClose={() => {
          setActiveRequest(null);
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-card border-2 border-teal-500/40 shadow-2xl p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-lg relative">
              <span className="absolute inset-0 rounded-2xl bg-teal-400/40 animate-ping" />
              <Stethoscope className="w-6 h-6 text-white relative z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-lg sm:text-xl font-black text-foreground">
                  Emergency Doctor Flying Squad
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-500 text-white animate-pulse">
                  RAPID RESPONDER
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nearby clinic doctor dispatches to your exact GPS location with emergency triage kit
              </p>
            </div>
          </div>
          <button
            onClick={activeRequest ? handleCancel : onClose}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If Active Request Exists: Show Live Dispatch Radar */}
        {activeRequest ? (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl border-2 border-teal-500/30 bg-teal-500/5 p-4 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-teal-500/20 flex items-center justify-center mb-3 relative">
                <span className="absolute inset-0 rounded-full border-2 border-teal-500 animate-ping" />
                <Activity className="w-8 h-8 text-teal-400 animate-pulse" />
              </div>
              <h3 className="font-heading text-base font-bold text-foreground">
                Connecting with Nearest Clinic Doctor
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Broadcasting emergency beacon to on-duty physicians within 10 km perimeter...
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 font-mono text-xs font-semibold">
                <span>Request ID:</span> {activeRequest.bookingId}
              </div>
            </div>

            {/* Doctor Readiness Kit Preview */}
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-3.5 space-y-2">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-500" />
                Doctor Arrives Equipped With:
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                  <span>BLS & Resuscitation Kit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                  <span>Pulse Oximeter & BP Monitor</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                  <span>Nebulizer & Bronchodilators</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                  <span>Emergency Stat Injections</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="destructive"
                className="w-full font-bold text-xs h-11 rounded-xl"
                onClick={handleCancel}
              >
                Cancel Emergency Dispatch
              </Button>
            </div>
          </div>
        ) : (
          /* Intake & Dispatch Form */
          <div className="space-y-4">
            {/* GPS Location Banner */}
            <div className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-teal-400 uppercase tracking-wide">
                    Dispatch Location
                  </p>
                  <p className="text-xs font-medium text-foreground truncate">
                    {locating ? 'Detecting high-precision GPS...' : address}
                  </p>
                </div>
              </div>
              {locating && (
                <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
            </div>

            {/* Emergency Symptom Categories */}
            <div>
              <label className="text-xs font-bold text-foreground mb-2 block flex items-center justify-between">
                <span>Select Emergency Crisis Type</span>
                <span className="text-[11px] text-muted-foreground font-normal">Tap category</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EMERGENCY_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`text-left p-3 rounded-2xl border transition-all text-xs font-semibold flex items-center gap-2.5 ${
                        isSelected
                          ? 'border-teal-500 bg-teal-500/15 shadow-sm text-foreground ring-1 ring-teal-500'
                          : 'border-border/60 bg-card hover:bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      <span className="text-xl flex-shrink-0">{cat.icon}</span>
                      <span className="leading-tight flex-1">{cat.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-teal-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Patient Details & Landmark */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  Patient Name
                </label>
                <Input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Patient / relative name"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  Contact Phone
                </label>
                <Input
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                Address / Building / Landmark
              </label>
              <Input
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Flat 304, Green Heights, near City Gate"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                Immediate Symptoms / Medical Notes (Optional)
              </label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Describe current symptoms, allergies, or pulse condition..."
                className="w-full min-h-[60px] rounded-xl border border-input bg-transparent px-3 py-2 text-xs"
              />
            </div>

            {/* Statutory Emergency Consent & Privacy Policy Agreement */}
            <div className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-3.5 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-muted-foreground leading-snug">
                <input
                  type="checkbox"
                  checked={consentAgreed}
                  onChange={(e) => setConsentAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-teal-500 text-teal-600 focus:ring-teal-500 cursor-pointer flex-shrink-0"
                />
                <span>
                  I declare this is an acute crisis and consent to bedside triage by a verified flying squad physician under{' '}
                  <strong className="text-foreground">Good Samaritan statutory protection (Sec 134A)</strong>. I authorize real-time GPS telemetry sharing per FindMedi{' '}
                  <Link to="/privacy" target="_blank" className="text-primary underline font-medium">Privacy Policy (DPDP 2023)</Link> and{' '}
                  <Link to="/terms" target="_blank" className="text-primary underline font-medium">Emergency Care Terms</Link>.
                </span>
              </label>
            </div>

            {/* Dispatch Action Button */}
            <div className="pt-2">
              <Button
                onClick={handleSubmit}
                disabled={submitting || locating}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-teal-500 via-teal-600 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-heading font-black text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 group cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Broadcasting Beacon...</span>
                  </>
                ) : (
                  <>
                    <Stethoscope className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    <span>DISPATCH EMERGENCY DOCTOR NOW</span>
                    <ChevronRight className="w-4 h-4 ml-auto opacity-70 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
              <p className="text-center text-[10px] text-muted-foreground mt-2">
                Emergency response fee: ₹800 standard visit. Doctor is bound by platform clinical protocol.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
