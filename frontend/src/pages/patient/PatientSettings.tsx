import { useState, useEffect } from 'react';
import { Settings, Bell, Lock, Globe, Moon, Sun, Monitor, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const SettingSection = ({ title, icon: Icon, children }) => (
  <div className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="font-heading font-semibold text-foreground">{title}</h3>
    </div>
    {children}
  </div>
);

const NOTIF_ITEMS = ['Appointment reminders', 'Lab test updates', 'Medicine delivery alerts', 'Payment receipts', 'Promotional offers'];
const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function PatientSettings() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifs, setNotifs] = useState({ 'Appointment reminders': true, 'Lab test updates': true, 'Medicine delivery alerts': true, 'Payment receipts': true, 'Promotional offers': false });
  const [iceName, setIceName] = useState('');
  const [icePhone, setIcePhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [refundDestination, setRefundDestination] = useState('source');
  const [abhaConsent, setAbhaConsent] = useState(false);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [defaultGps, setDefaultGps] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const me = await api.me().catch(() => null);
        const u = me?.user || me || {};
        const p = u.settings?.patient || {};
        if (p.notifs) setNotifs((n) => ({ ...n, ...p.notifs }));
        setIceName(p.iceName || u.emergencyContact?.name || '');
        setIcePhone(p.icePhone || u.emergencyContact?.phone || '');
        setBloodGroup(p.bloodGroup || u.bloodGroup || '');
        setAllergies(p.allergies || (Array.isArray(u.allergies) ? u.allergies.map((a) => a.allergen).join(', ') : ''));
        setRefundDestination(p.refundDestination || 'source');
        setAbhaConsent(Boolean(p.abhaConsent));
        setWhatsappAlerts(p.whatsappAlerts !== false);
        setDefaultGps(p.defaultGps || '');
      } catch { /* defaults stand */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (icePhone && !/^\d{10}$/.test(icePhone.replace(/\D/g, '').slice(-10)) && icePhone.trim().length < 10) {
      toast.error('ICE phone must be a 10-digit mobile number');
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile({
        bloodGroup: bloodGroup || undefined,
        settings: {
          patient: {
            notifs, iceName, icePhone, bloodGroup, allergies, refundDestination,
            abhaConsent, whatsappAlerts, defaultGps,
          },
        },
      });
      toast.success('Settings saved successfully');
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Platform Settings</h1>
        <p className="text-muted-foreground text-sm">Customize your FindMedi experience</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SettingSection title="Notifications" icon={Bell}>
            <p className="text-xs text-muted-foreground">Choose what notifications you receive.</p>
            <div className="mt-3 space-y-2">
              {NOTIF_ITEMS.map(item => (
                <label key={item} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="checkbox" checked={!!notifs[item]} onChange={(e) => setNotifs({ ...notifs, [item]: e.target.checked })} className="rounded border-border" />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </SettingSection>

          <SettingSection title="Privacy & Security" icon={Lock}>
            <p className="text-xs text-muted-foreground">Manage your account security preferences.</p>
            <div className="mt-3 space-y-3">
              <Button variant="outline" className="w-full justify-start rounded-xl">Change Password</Button>
              <Button variant="outline" className="w-full justify-start rounded-xl">Two-Factor Authentication</Button>
              <Button variant="outline" className="w-full justify-start rounded-xl">Active Sessions</Button>
            </div>
          </SettingSection>

          <SettingSection title="Emergency & Medical Passport" icon={Settings}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div><label className="text-xs font-medium">ICE Contact Name</label><input value={iceName} onChange={(e) => setIceName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Family contact" /></div>
              <div><label className="text-xs font-medium">ICE Phone</label><input value={icePhone} onChange={(e) => setIcePhone(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="10-digit mobile" /></div>
              <div><label className="text-xs font-medium">Blood Group</label><select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">{BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g || 'Select'}</option>)}</select></div>
              <div><label className="text-xs font-medium">Drug Allergies</label><input value={allergies} onChange={(e) => setAllergies(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Penicillin" /></div>
              <div><label className="text-xs font-medium">Refund Destination</label><select value={refundDestination} onChange={(e) => setRefundDestination(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="source">Original source (3-5 days)</option><option value="medicoins">MediCoins wallet (+5%)</option></select></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={abhaConsent} onChange={(e) => setAbhaConsent(e.target.checked)} className="rounded" /> ABHA auto-consent</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={whatsappAlerts} onChange={(e) => setWhatsappAlerts(e.target.checked)} className="rounded" /> WhatsApp alerts</label>
              <div className="sm:col-span-2"><label className="text-xs font-medium">Default GPS + delivery instructions</label><input value={defaultGps} onChange={(e) => setDefaultGps(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Lat/Lng, landmark, gate code" /></div>
            </div>
          </SettingSection>

          <SettingSection title="Display Preferences" icon={Monitor}>
            <p className="text-xs text-muted-foreground">Choose how the app looks for you.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[{ label: 'Light', icon: Sun }, { label: 'Dark', icon: Moon }, { label: 'System', icon: Globe }].map(opt => (
                <button key={opt.label} className="px-3.5 py-2 rounded-xl text-xs font-medium bg-muted hover:bg-muted/80 border border-border/40 flex items-center gap-2">
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </SettingSection>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-3xl border border-border/50 p-5 shadow-sm">
            <h3 className="font-heading font-semibold text-foreground mb-2">Platform</h3>
            <p className="text-xs text-muted-foreground">FindMedi v1.0</p>
            <p className="text-xs text-muted-foreground mt-1">Connected to: <span className="text-foreground font-medium">Production</span></p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="rounded-xl">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
