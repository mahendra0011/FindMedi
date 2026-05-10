import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  Bell,
  Camera,
  CheckCircle,
  Download,
  Lock,
  Palette,
  Save,
  Shield,
  Stethoscope,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const DEFAULT_SETTINGS = {
  emailNotifications: true,
  smsAlerts: true,
  systemNotifications: true,
  weeklyReports: false,
  appointmentReminders: true,
  labResultEmails: true,
  criticalAlerts: true,
  adminDigest: true,
  doctorScheduleAlerts: true,
  patientRecordSharing: false,
  theme: 'system',
  density: 'comfortable',
  language: 'en',
  timezone: 'Asia/Calcutta',
  defaultDashboard: 'overview',
  twoFactorEnabled: false,
  dataSharing: false,
  profileVisibility: 'care_team',
};

const roleBadge = {
  admin: 'bg-primary/15 text-primary',
  doctor: 'bg-info/15 text-info',
  patient: 'bg-success/15 text-success',
};

const tabs = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'role', label: 'Role Details', icon: Stethoscope },
  { key: 'security', label: 'Security', icon: Lock },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'privacy', label: 'Privacy', icon: Shield },
];

const toInputDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toISOString().slice(0, 10);
};

const buildProfile = (user) => ({
  name: user?.name || '',
  phone: user?.phone || '',
  address: user?.address || '',
  gender: user?.gender || '',
  dateOfBirth: toInputDate(user?.dateOfBirth),
  avatar: user?.avatar || '',
  specialization: user?.specialization || '',
  experience: user?.experience || '',
  qualification: user?.qualification || '',
  licenseNumber: user?.licenseNumber || '',
  consultationFee: user?.consultationFee || '',
});

function Field({ label, children, note }) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>
      {children}
      {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </Field>
  );
}

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={Boolean(checked)} onCheckedChange={onChange} />
    </div>
  );
}

function Notice({ notice }) {
  if (!notice) return null;
  const Icon = notice.type === 'error' ? AlertCircle : CheckCircle;
  const cls = notice.type === 'error'
    ? 'border-destructive/30 bg-destructive/10 text-destructive'
    : 'border-success/30 bg-success/10 text-success';

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${cls}`}>
      <Icon className="w-4 h-4" />
      {notice.text}
    </div>
  );
}

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(() => buildProfile(user));
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...(user?.settings || {}) }));
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    setProfile(buildProfile(user));
    setSettings({ ...DEFAULT_SETTINGS, ...(user?.settings || {}) });
  }, [user]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', settings.theme === 'dark' || (settings.theme === 'system' && prefersDark));
    root.dataset.density = settings.density;
    localStorage.setItem('medicore_settings', JSON.stringify(settings));
  }, [settings]);

  const initials = useMemo(() => (user?.name || 'U').split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase(), [user?.name]);

  const saveMut = useMutation({
    mutationFn: (payload) => api.updateProfile(payload),
    onSuccess: (data) => {
      updateUser(data);
      setNotice({ type: 'success', text: 'Settings saved successfully.' });
    },
    onError: (error) => setNotice({ type: 'error', text: error.message || 'Unable to save settings.' }),
  });

  const passwordMut = useMutation({
    mutationFn: (payload) => api.changePassword(payload),
    onSuccess: () => {
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setNotice({ type: 'success', text: 'Password updated successfully.' });
    },
    onError: (error) => setNotice({ type: 'error', text: error.message || 'Unable to update password.' }),
  });

  const updateProfile = (key, value) => setProfile((current) => ({ ...current, [key]: value }));
  const updateSetting = (key, value) => setSettings((current) => ({ ...current, [key]: value }));

  const saveAccount = () => {
    setNotice(null);
    saveMut.mutate({ ...profile, settings });
  };

  const savePassword = () => {
    setNotice(null);
    if (password.newPassword.length < 6) {
      setNotice({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (password.newPassword !== password.confirmPassword) {
      setNotice({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    passwordMut.mutate({
      currentPassword: password.currentPassword,
      newPassword: password.newPassword,
    });
  };

  const downloadMyData = () => {
    const blob = new Blob([JSON.stringify({ account: user, profile, settings }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medicore-account-data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage account, security, notifications, and dashboard preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 max-w-6xl">
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-card rounded-xl border shadow-sm p-2 flex lg:flex-col gap-1 overflow-x-auto">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-left whitespace-nowrap ${
                  tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-5">
          <Notice notice={notice} />

          {tab === 'profile' && (
            <>
              <div className="bg-card rounded-xl border shadow-sm p-6">
                <h3 className="font-heading font-semibold text-lg text-card-foreground mb-5">Profile Photo</h3>
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-heading font-bold text-2xl shadow-lg shadow-primary/20 overflow-hidden">
                      {profile.avatar ? <img src={profile.avatar} alt="" className="w-full h-full object-cover" /> : initials}
                    </div>
                    <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-card border-2 border-background rounded-full flex items-center justify-center">
                      <Camera className="w-3.5 h-3.5 text-foreground" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-card-foreground">{user?.name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block capitalize ${roleBadge[user?.role] || 'bg-muted text-muted-foreground'}`}>
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl border shadow-sm p-6">
                <h3 className="font-heading font-semibold text-lg text-card-foreground mb-5">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Full Name">
                    <Input value={profile.name} onChange={(event) => updateProfile('name', event.target.value)} placeholder="Your name" />
                  </Field>
                  <Field label="Email Address" note="Email cannot be changed after registration.">
                    <Input value={user?.email || ''} disabled className="opacity-60 cursor-not-allowed" />
                  </Field>
                  <Field label="Phone Number">
                    <Input value={profile.phone} onChange={(event) => updateProfile('phone', event.target.value)} placeholder="+91 98765 43210" />
                  </Field>
                  <SelectField
                    label="Gender"
                    value={profile.gender}
                    onChange={(value) => updateProfile('gender', value)}
                    options={[
                      { value: '', label: 'Prefer not to say' },
                      { value: 'Male', label: 'Male' },
                      { value: 'Female', label: 'Female' },
                      { value: 'Other', label: 'Other' },
                    ]}
                  />
                  <Field label="Date of Birth">
                    <Input type="date" value={profile.dateOfBirth} onChange={(event) => updateProfile('dateOfBirth', event.target.value)} />
                  </Field>
                  <Field label="Avatar URL">
                    <Input value={profile.avatar} onChange={(event) => updateProfile('avatar', event.target.value)} placeholder="https://..." />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Address">
                      <textarea
                        value={profile.address}
                        onChange={(event) => updateProfile('address', event.target.value)}
                        placeholder="Residential address"
                        className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </Field>
                  </div>
                </div>
                <div className="flex justify-end mt-5">
                  <Button onClick={saveAccount} disabled={saveMut.isPending} className="gap-2">
                    <Save className="w-4 h-4" />
                    {saveMut.isPending ? 'Saving...' : 'Save Profile'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {tab === 'role' && (
            <div className="bg-card rounded-xl border shadow-sm p-6">
              <h3 className="font-heading font-semibold text-lg text-card-foreground mb-5">Role Preferences</h3>
              {user?.role === 'doctor' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Specialization">
                    <Input value={profile.specialization} onChange={(event) => updateProfile('specialization', event.target.value)} placeholder="Cardiology" />
                  </Field>
                  <Field label="Experience">
                    <Input value={profile.experience} onChange={(event) => updateProfile('experience', event.target.value)} placeholder="8 years" />
                  </Field>
                  <Field label="Qualification">
                    <Input value={profile.qualification} onChange={(event) => updateProfile('qualification', event.target.value)} placeholder="MBBS, MD" />
                  </Field>
                  <Field label="License Number">
                    <Input value={profile.licenseNumber} onChange={(event) => updateProfile('licenseNumber', event.target.value)} placeholder="MED-12345" />
                  </Field>
                  <Field label="Consultation Fee (Rs)">
                    <Input type="number" value={profile.consultationFee} onChange={(event) => updateProfile('consultationFee', event.target.value)} placeholder="500" />
                  </Field>
                  <ToggleRow
                    title="Schedule alerts"
                    description="Notify me when appointments change or urgent cases are assigned."
                    checked={settings.doctorScheduleAlerts}
                    onChange={(checked) => updateSetting('doctorScheduleAlerts', checked)}
                  />
                </div>
              )}
              {user?.role === 'admin' && (
                <div className="space-y-1">
                  <ToggleRow
                    title="Admin daily digest"
                    description="Receive a summary of registrations, billing, and emergency activity."
                    checked={settings.adminDigest}
                    onChange={(checked) => updateSetting('adminDigest', checked)}
                  />
                  <ToggleRow
                    title="Critical alerts"
                    description="Highlight emergency and blocked-account events immediately."
                    checked={settings.criticalAlerts}
                    onChange={(checked) => updateSetting('criticalAlerts', checked)}
                  />
                  <SelectField
                    label="Default admin dashboard"
                    value={settings.defaultDashboard}
                    onChange={(value) => updateSetting('defaultDashboard', value)}
                    options={[
                      { value: 'overview', label: 'Overview' },
                      { value: 'reports', label: 'Reports' },
                      { value: 'billing', label: 'Billing' },
                      { value: 'emergency', label: 'Emergency' },
                    ]}
                  />
                </div>
              )}
              {user?.role === 'patient' && (
                <div className="space-y-1">
                  <ToggleRow
                    title="Care team record sharing"
                    description="Allow assigned doctors to see emergency, lab, and visit records."
                    checked={settings.patientRecordSharing}
                    onChange={(checked) => updateSetting('patientRecordSharing', checked)}
                  />
                  <ToggleRow
                    title="Lab result emails"
                    description="Send lab report availability and attachments to my email."
                    checked={settings.labResultEmails}
                    onChange={(checked) => updateSetting('labResultEmails', checked)}
                  />
                  <SelectField
                    label="Patient dashboard start page"
                    value={settings.defaultDashboard}
                    onChange={(value) => updateSetting('defaultDashboard', value)}
                    options={[
                      { value: 'overview', label: 'Overview' },
                      { value: 'appointments', label: 'Appointments' },
                      { value: 'records', label: 'Medical Records' },
                      { value: 'billing', label: 'Billing' },
                    ]}
                  />
                </div>
              )}
              <div className="flex justify-end mt-5">
                <Button onClick={saveAccount} disabled={saveMut.isPending} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saveMut.isPending ? 'Saving...' : 'Save Role Settings'}
                </Button>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="bg-card rounded-xl border shadow-sm p-6">
              <h3 className="font-heading font-semibold text-lg text-card-foreground mb-5">Security</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <Field label="Current Password">
                  <Input type="password" value={password.currentPassword} onChange={(event) => setPassword((current) => ({ ...current, currentPassword: event.target.value }))} />
                </Field>
                <div />
                <Field label="New Password">
                  <Input type="password" value={password.newPassword} onChange={(event) => setPassword((current) => ({ ...current, newPassword: event.target.value }))} />
                </Field>
                <Field label="Confirm New Password">
                  <Input type="password" value={password.confirmPassword} onChange={(event) => setPassword((current) => ({ ...current, confirmPassword: event.target.value }))} />
                </Field>
              </div>
              <div className="mt-5 space-y-1 max-w-2xl">
                <ToggleRow
                  title="Two-factor verification"
                  description="Require OTP verification for sensitive account changes."
                  checked={settings.twoFactorEnabled}
                  onChange={(checked) => updateSetting('twoFactorEnabled', checked)}
                />
              </div>
              <div className="flex flex-wrap gap-3 mt-5">
                <Button onClick={savePassword} disabled={passwordMut.isPending} className="gap-2">
                  <Lock className="w-4 h-4" />
                  {passwordMut.isPending ? 'Updating...' : 'Update Password'}
                </Button>
                <Button variant="outline" onClick={saveAccount} disabled={saveMut.isPending} className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Security Settings
                </Button>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="bg-card rounded-xl border shadow-sm p-6">
              <h3 className="font-heading font-semibold text-lg text-card-foreground mb-5">Notification Preferences</h3>
              <div className="space-y-1">
                <ToggleRow title="Email notifications" description="Receive account, appointment, report, and billing emails." checked={settings.emailNotifications} onChange={(checked) => updateSetting('emailNotifications', checked)} />
                <ToggleRow title="SMS alerts" description="Get urgent appointment and emergency updates by phone." checked={settings.smsAlerts} onChange={(checked) => updateSetting('smsAlerts', checked)} />
                <ToggleRow title="System notifications" description="Show in-app notifications across your dashboard." checked={settings.systemNotifications} onChange={(checked) => updateSetting('systemNotifications', checked)} />
                <ToggleRow title="Appointment reminders" description="Send reminders before upcoming consultations." checked={settings.appointmentReminders} onChange={(checked) => updateSetting('appointmentReminders', checked)} />
                <ToggleRow title="Weekly reports" description="Receive a weekly summary of activity and important records." checked={settings.weeklyReports} onChange={(checked) => updateSetting('weeklyReports', checked)} />
                <ToggleRow title="Critical alerts" description="Always notify me for emergency or account-blocking events." checked={settings.criticalAlerts} onChange={(checked) => updateSetting('criticalAlerts', checked)} />
              </div>
              <div className="flex justify-end mt-5">
                <Button onClick={saveAccount} disabled={saveMut.isPending} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saveMut.isPending ? 'Saving...' : 'Save Notifications'}
                </Button>
              </div>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="bg-card rounded-xl border shadow-sm p-6">
              <h3 className="font-heading font-semibold text-lg text-card-foreground mb-5">Dashboard Appearance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField
                  label="Theme"
                  value={settings.theme}
                  onChange={(value) => updateSetting('theme', value)}
                  options={[
                    { value: 'system', label: 'System' },
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                />
                <SelectField
                  label="Density"
                  value={settings.density}
                  onChange={(value) => updateSetting('density', value)}
                  options={[
                    { value: 'comfortable', label: 'Comfortable' },
                    { value: 'compact', label: 'Compact' },
                    { value: 'spacious', label: 'Spacious' },
                  ]}
                />
                <SelectField
                  label="Language"
                  value={settings.language}
                  onChange={(value) => updateSetting('language', value)}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'hi', label: 'Hindi' },
                    { value: 'mr', label: 'Marathi' },
                  ]}
                />
                <SelectField
                  label="Timezone"
                  value={settings.timezone}
                  onChange={(value) => updateSetting('timezone', value)}
                  options={[
                    { value: 'Asia/Calcutta', label: 'India Standard Time' },
                    { value: 'UTC', label: 'UTC' },
                    { value: 'America/New_York', label: 'Eastern Time' },
                    { value: 'Europe/London', label: 'London' },
                  ]}
                />
              </div>
              <div className="flex justify-end mt-5">
                <Button onClick={saveAccount} disabled={saveMut.isPending} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saveMut.isPending ? 'Saving...' : 'Save Appearance'}
                </Button>
              </div>
            </div>
          )}

          {tab === 'privacy' && (
            <div className="bg-card rounded-xl border shadow-sm p-6">
              <h3 className="font-heading font-semibold text-lg text-card-foreground mb-5">Privacy and Data</h3>
              <div className="space-y-1">
                <ToggleRow title="Usage analytics" description="Share non-medical usage data to improve dashboard reliability." checked={settings.dataSharing} onChange={(checked) => updateSetting('dataSharing', checked)} />
                <SelectField
                  label="Profile visibility"
                  value={settings.profileVisibility}
                  onChange={(value) => updateSetting('profileVisibility', value)}
                  options={[
                    { value: 'private', label: 'Private' },
                    { value: 'care_team', label: 'Care team only' },
                    { value: 'hospital', label: 'Hospital staff' },
                  ]}
                />
              </div>
              <div className="flex flex-wrap gap-3 mt-5">
                <Button variant="outline" onClick={downloadMyData} className="gap-2">
                  <Download className="w-4 h-4" />
                  Download My Data
                </Button>
                <Button onClick={saveAccount} disabled={saveMut.isPending} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saveMut.isPending ? 'Saving...' : 'Save Privacy'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
