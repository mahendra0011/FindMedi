import { useState, useEffect } from 'react';
import { Globe, Save, CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function ClinicPlatformSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [maxSlot, setMaxSlot] = useState(1);

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
    api.getMySlotCapacity().then(r => setMaxSlot(r.maxBookingsPerSlot || 1)).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.updateFacilitySettings({ autoConfirmAppointment: autoConfirm });
    await api.updateMyAutoConfirm(autoConfirm).catch(() => {});
    await api.updateMySlotCapacity(maxSlot).catch(() => {});
      setSaved(true);
      toast.success('Settings saved successfully');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
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

          <div className="flex items-center justify-between gap-4 mt-6 pt-6 border-t border-border">
            <div>
              <h3 className="font-semibold text-foreground">Patients Per Time Slot</h3>
              <p className="text-sm text-muted-foreground">Apne consultation time ke hisaab se — ek slot me kitne patients book ho sakte hain.</p>
            </div>
            <Input type="number" min={1} max={20} className="w-20" value={maxSlot} onChange={e => setMaxSlot(Number(e.target.value))} />
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
