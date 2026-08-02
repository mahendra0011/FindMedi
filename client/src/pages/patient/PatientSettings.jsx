import { useState } from 'react';
import { Settings, Bell, Lock, Globe, Moon, Sun, Monitor, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export default function PatientSettings() {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Placeholder — settings persistence will be added later
    setTimeout(() => {
      setSaving(false);
      alert('Settings saved! (placeholder — persistence will be added later)');
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Platform Settings</h1>
        <p className="text-muted-foreground text-sm">Customize your FindMedi experience</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Settings */}
        <div className="lg:col-span-2 space-y-4">
          <SettingSection title="Notifications" icon={Bell}>
            <p className="text-xs text-muted-foreground">Choose what notifications you receive.</p>
            <div className="mt-3 space-y-2">
              {['Appointment reminders', 'Lab test updates', 'Medicine delivery alerts', 'Payment receipts', 'Promotional offers'].map(item => (
                <label key={item} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" defaultChecked className="rounded border-border" />
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

        {/* Right: Quick info */}
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