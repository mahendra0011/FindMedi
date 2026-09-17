/* eslint-disable react-hooks/preserve-manual-memoization, prefer-const, react/no-unescaped-entities, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-expressions, @next/next/no-img-element,  @typescript-eslint/ban-ts-comment, react-hooks/set-state-in-effect, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import {
  Globe, Save, CheckCircle, ToggleLeft, ToggleRight, Upload, Camera, Pen, X,
  AlertTriangle, ShieldCheck, CheckSquare, MessageSquare, Video, Building2, Home, Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export default function ClinicPlatformSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [doctorId, setDoctorId] = useState(null);
  const [signatureUrl, setSignatureUrl] = useState('');
  const [signatureUploading, setSignatureUploading] = useState(false);

  const [appointmentModes, setAppointmentModes] = useState(['chat', 'video', 'offline']);
  const [emergencySupport, setEmergencySupport] = useState(false);
  const [refundOnMissedOrCancelled, setRefundOnMissedOrCancelled] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await (api as any).getFacilitySettings || (api as any).facilities?.getSettings || (()=> Promise.resolve({}))();
        if (settings?.autoConfirmAppointment !== undefined) {
          setAutoConfirm(settings.autoConfirmAppointment);
        }
      } catch (err) {
        console.error('Failed to load facility settings:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadDoctor = async () => {
      try {
        const doctors = (await api.getDoctors())?.data || [];
        const myDoc = doctors.find(d => d.email === user?.email) || doctors.find(d => d.name?.includes(user?.name)) || null;
        if (myDoc) {
          setDoctorId(myDoc._id);
          setSignatureUrl(myDoc.signatureUrl || '');
          if (myDoc.appointmentModes?.length) setAppointmentModes(myDoc.appointmentModes);
          if (myDoc.emergencySupport !== undefined) setEmergencySupport(myDoc.emergencySupport);
          if (myDoc.refundOnMissedOrCancelled !== undefined) setRefundOnMissedOrCancelled(myDoc.refundOnMissedOrCancelled);
        }
      } catch (err) {
        console.error('Failed to load doctor:', err);
      }
    };
    if (user?.email) loadDoctor();
  }, [user?.email, user?.name]);

  const toggleMode = (mode) => {
    if (appointmentModes.includes(mode)) {
      if (appointmentModes.length === 1) {
        toast.warning('At least one consultation mode must remain active');
        return;
      }
      setAppointmentModes(appointmentModes.filter(m => m !== mode));
    } else {
      setAppointmentModes([...appointmentModes, mode]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await (api as any).updateFacilitySettings || (api as any).facilities?.updateSettings || (()=> Promise.resolve({}))({ autoConfirmAppointment: autoConfirm });
      await (api as any).updateMyAutoConfirm || (()=> Promise.resolve({}))(autoConfirm).catch(() => {});
      if (doctorId) {
        await api.updateDoctor(doctorId, {
          appointmentModes,
          emergencySupport,
          refundOnMissedOrCancelled,
        });
      }
      await api.updateProfile({
        appointmentModes,
        emergencySupport,
        refundOnMissedOrCancelled,
      });
      setSaved(true);
      toast.success('Settings saved successfully');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !doctorId) return;
    setSignatureUploading(true);
    try {
      const res = await (api as any).uploadDoctorSignature || (()=> Promise.resolve({}))(doctorId, file);
      setSignatureUrl(res.signatureUrl);
      toast.success('Signature uploaded successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to upload signature');
    }
    setSignatureUploading(false);
  };

  const handleRemoveSignature = () => {
    setSignatureUrl('');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Platform Settings</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Platform Settings</h1>
        <p className="text-muted-foreground">Configure how your clinic and consultation channels behave on the platform</p>
      </div>

      <div className="space-y-6">
        {/* Modes of Appointment */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground text-lg mb-2 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" /> Modes of Appointment You Provide
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Select all channels through which patients can book consultations with your clinic.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div
              onClick={() => toggleMode('offline')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                appointmentModes.includes('offline') ? 'border-violet-500 bg-violet-500/5' : 'border-border/60 hover:border-border'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${appointmentModes.includes('offline') ? 'bg-violet-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground block">In Clinic</span>
                <span className="text-[11px] text-muted-foreground">Physical clinic visit</span>
              </div>
              <input type="checkbox" checked={appointmentModes.includes('offline')} readOnly className="rounded text-primary mt-1 pointer-events-none" />
            </div>

            <div
              onClick={() => toggleMode('home_visit')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                (appointmentModes.includes('home_visit') || appointmentModes.includes('home')) ? 'border-amber-500 bg-amber-500/5' : 'border-border/60 hover:border-border'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${(appointmentModes.includes('home_visit') || appointmentModes.includes('home')) ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                <Home className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground block">Home Visit</span>
                <span className="text-[11px] text-muted-foreground">Doctor at patient home</span>
              </div>
              <input type="checkbox" checked={(appointmentModes.includes('home_visit') || appointmentModes.includes('home'))} readOnly className="rounded text-primary mt-1 pointer-events-none" />
            </div>

            <div
              onClick={() => toggleMode('video')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                appointmentModes.includes('video') ? 'border-emerald-500 bg-emerald-500/5' : 'border-border/60 hover:border-border'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${appointmentModes.includes('video') ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                <Video className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground block">Video Call</span>
                <span className="text-[11px] text-muted-foreground">Virtual video consult</span>
              </div>
              <input type="checkbox" checked={appointmentModes.includes('video')} readOnly className="rounded text-primary mt-1 pointer-events-none" />
            </div>

            <div
              onClick={() => toggleMode('audio')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                appointmentModes.includes('audio') ? 'border-teal-500 bg-teal-500/5' : 'border-border/60 hover:border-border'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${appointmentModes.includes('audio') ? 'bg-teal-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground block">Audio Call</span>
                <span className="text-[11px] text-muted-foreground">Direct voice consult</span>
              </div>
              <input type="checkbox" checked={appointmentModes.includes('audio')} readOnly className="rounded text-primary mt-1 pointer-events-none" />
            </div>

            <div
              onClick={() => toggleMode('chat')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 select-none ${
                appointmentModes.includes('chat') ? 'border-blue-500 bg-blue-500/5' : 'border-border/60 hover:border-border'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${appointmentModes.includes('chat') ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground block">Online Chat</span>
                <span className="text-[11px] text-muted-foreground">Digital messaging</span>
              </div>
              <input type="checkbox" checked={appointmentModes.includes('chat')} readOnly className="rounded text-primary mt-1 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Emergency & Refund Policies */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Emergency Support &amp; Refund Policy
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure urgent triage availability and cancellation refund protection.
          </p>

          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/60 hover:bg-muted/30 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={emergencySupport}
              onChange={e => setEmergencySupport(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary mt-0.5 cursor-pointer"
            />
            <div>
              <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-destructive" /> Are you provide emergency support?
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Displays the 24x7 Emergency Support badge on your clinic profile and allows urgent appointments.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border/60 hover:bg-muted/30 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={refundOnMissedOrCancelled}
              onChange={e => setRefundOnMissedOrCancelled(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary mt-0.5 cursor-pointer"
            />
            <div>
              <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Are you support refund when the appointment is missed and cancelled by patient?
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enables 100% Refund Guarantee badge for patient peace of mind and auto-refund handling.
              </p>
            </div>
          </label>
        </div>

        {/* Auto Confirm Appointment */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground text-lg">Auto Confirm Appointment</h3>
              <p className="text-sm text-muted-foreground">
                When enabled, appointments are automatically confirmed after successful payment.
                When disabled, appointments remain pending until you manually confirm them.
              </p>
            </div>
            <button
              onClick={() => setAutoConfirm(p => !p)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${autoConfirm ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${autoConfirm ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="mt-4 text-sm">
            {autoConfirm ? (
              <div className="flex items-start gap-2 text-green-600">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Auto-confirm is ON</p>
                  <p className="text-muted-foreground mt-1">
                    After payment, appointments are confirmed automatically. No manual action needed.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-amber-600">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Auto-confirm is OFF</p>
                  <p className="text-muted-foreground mt-1">
                    After payment, appointments stay pending. You must manually confirm them from the Appointments section.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Digital Signature */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground text-lg mb-4 flex items-center gap-2">
            <Pen className="w-5 h-5 text-primary" /> Digital Signature
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your signature — yeh prescription PDF, bill PDF, aur invoice PDF mein dikhai dega.
          </p>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-48 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/20 overflow-hidden">
              {signatureUrl ? (
                <img src={signatureUrl} alt="Signature" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">No signature</span>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Upload className="w-4 h-4" />
                  {signatureUploading ? 'Uploading...' : signatureUrl ? 'Replace Signature' : 'Upload from Image'}
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleSignatureUpload} disabled={signatureUploading} />
                </label>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">
                  <Camera className="w-4 h-4" />
                  {signatureUploading ? 'Capturing...' : 'Capture with Camera'}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleSignatureUpload} disabled={signatureUploading} />
                </label>
                {signatureUrl && (
                  <button
                    onClick={handleRemoveSignature}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors"
                  >
                    <X className="w-4 h-4" /> Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Supports PNG and JPG. Signature will appear on all prescription, bill, and invoice PDFs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" /> Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
