import { useState, useEffect } from 'react';
import { Globe, Save, CheckCircle, ToggleLeft, ToggleRight, Upload, Camera, Pen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function ClinicPlatformSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [doctorId, setDoctorId] = useState(null);
  const [signatureUrl, setSignatureUrl] = useState('');
  const [signatureUploading, setSignatureUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await api.getFacilitySettings();
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
        }
      } catch (err) {
        console.error('Failed to load doctor:', err);
      }
    };
    if (user?.email) loadDoctor();
  }, [user?.email, user?.name]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.updateFacilitySettings({ autoConfirmAppointment: autoConfirm });
    await api.updateMyAutoConfirm(autoConfirm).catch(() => {});
      setSaved(true);
      toast.success('Settings saved successfully');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !doctorId) return;
    setSignatureUploading(true);
    try {
      const res = await api.uploadDoctorSignature(doctorId, file);
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
    <div className="p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Platform Settings</h1>
        <p className="text-muted-foreground">Configure how your clinic behaves on the platform</p>
      </div>

      <div className="space-y-6">
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
