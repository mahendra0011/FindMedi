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
import { applyUserSettings, mergeSettings, t } from '@/lib/settings';

const roleBadge = {
  admin: 'bg-primary/15 text-primary',
  doctor: 'bg-info/15 text-info',
  patient: 'bg-success/15 text-success',
};

const tabs = [
  { key: 'profile', labelKey: 'settings.profile', icon: User },
  { key: 'role', labelKey: 'settings.roleDetails', icon: Stethoscope },
  { key: 'security', labelKey: 'settings.security', icon: Lock },
  { key: 'notifications', labelKey: 'settings.notifications', icon: Bell },
  { key: 'appearance', labelKey: 'settings.appearance', icon: Palette },
  { key: 'privacy', labelKey: 'settings.privacy', icon: Shield },
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
  const [settings, setSettings] = useState(() => mergeSettings(user?.settings));
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [notice, setNotice] = useState(null);
  const language = settings.language || 'en';
  const tr = (key) => t(key, language);

  useEffect(() => {
    setProfile(buildProfile(user));
    setSettings(mergeSettings(user?.settings));
  }, [user]);

  useEffect(() => {
    applyUserSettings(settings);
  }, [settings]);

  const initials = useMemo(() => (user?.name || 'U').split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase(), [user?.name]);

  const saveMut = useMutation({
    mutationFn: (payload) => api.updateProfile(payload),
    onSuccess: (data) => {
      updateUser(data);
      setNotice({ type: 'success', text: t('settings.saved', data.settings?.language || language) });
    },
    onError: (error) => setNotice({ type: 'error', text: error.message || tr('settings.saveError') }),
  });

  const passwordMut = useMutation({
    mutationFn: (payload) => api.changePassword(payload),
    onSuccess: () => {
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setNotice({ type: 'success', text: tr('settings.passwordSaved') });
    },
    onError: (error) => setNotice({ type: 'error', text: error.message || tr('settings.passwordError') }),
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
      setNotice({ type: 'error', text: tr('settings.passwordLength') });
      return;
    }
    if (password.newPassword !== password.confirmPassword) {
      setNotice({ type: 'error', text: tr('settings.passwordMismatch') });
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
        <h1 className="page-title">{tr('settings.title')}</h1>
        <p className="page-subtitle">{tr('settings.subtitle')}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 max-w-6xl">
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-card rounded-xl border shadow-sm p-2 flex lg:flex-col gap-1 overflow-x-auto">
            {tabs.map(({ key, labelKey, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-left whitespace-nowrap ${
                  tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {tr(labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-5">
          <Notice notice={notice} />

          {tab === 'profile' && (
            <>
              <div className="bg-card rounded-xl border shadow-sm p-6">
                <h3 className="font-heading font-semibold text-lg text-card-foreground mb-5">{tr('settings.profilePhoto')}</h3>
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
                      {t(`role.${user?.role}`, language)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl border shadow-sm p-6">
                <h3 className="font-heading font-semibold text-lg text-card-foreground mb-5">{tr('settings.personalInfo')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={tr('settings.fullName')}>
                    <Input value={profile.name} onChange={(event) => updateProfile('name', event.target.value)} placeholder={tr('settings.yourName')} />
                  </Field>
                  <Field label={tr('settings.emailAddress')} note={tr('settings.emailLocked')}>
                    <Input value={user?.email || ''} disabled className="opacity-60 cursor-not-allowed" />
                  </Field>
                  <Field label={tr('settings.phoneNumber')}>
                    <Input value={profile.phone} onChange={(event) => updateProfile('phone', event.target.value)} placeholder="+91 98765 43210" />
                  </Field>
                  <SelectField
                    label={tr('settings.gender')}
                    value={profile.gender}
                    onChange={(value) => updateProfile('gender', value)}
                    options={[
                      { value: '', label: tr('settings.preferNot') },
                      { value: 'Male', label: tr('settings.male') },
                      { value: 'Female', label: tr('settings.female') },
                      { value: 'Other', label: tr('settings.other') },
                    ]}
                  />
                  <Field label={tr('settings.dateOfBirth')}>
                    <Input type="date" value={profile.dateOfBirth} onChange={(event) => updateProfile('dateOfBirth', event.target.value)} />
                  </Field>
                  <Field label={tr('settings.avatarUrl')}>
                    <Input value={profile.avatar} onChange={(event) => updateProfile('avatar', event.target.value)} placeholder="https://..." />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label={tr('settings.address')}>
                      <textarea
                        value={profile.address}
                        onChange={(event) => updateProfile('address', event.target.value)}
                        placeholder={tr('settings.addressPlaceholder')}
                        className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </Field>
                  </div>
                </div>
                <div className="flex justify-end mt-5">
                  <Button onClick={saveAccount} disabled={saveMut.isPending} className="gap-2">
                    <Save className="w-4 h-4" />
                    {saveMut.isPending ? tr('common.saving') : tr('settings.saveProfile')}
                  </Button>
                </div>
              </div>
            </>
          )}

          {tab === 'role' && (
            <div className="bg-card rounded-xl border shadow-sm p-6">
              <h3 className="font-heading font-semibold text-lg text-card-foreground mb-5">{tr('settings.rolePreferences')}</h3>
              {user?.role === 'doctor' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={tr('settings.specialization')}>
                    <Input value={profile.specialization} onChange={(event) => updateProfile('specialization', event.target.value)} placeholder="Cardiology" />
                  </Field>
                  <Field label={tr('settings.experience')}>
                    <Input value={profile.experience} onChange={(event) => updateProfile('experience', event.target.value)} placeholder="8 years" />
                  </Field>
                  <Field label={tr('settings.qualification')}>
                    <Input value={profile.qualification} onChange={(event) => updateProfile('qualification', event.target.value)} placeholder="MBBS, MD" />
                  </Field>
                  <Field label={tr('settings.licenseNumber')}>
                    <Input value={profile.licenseNumber} onChange={(event) => updateProfile('licenseNumber', event.target.value)} placeholder="MED-12345" />
                  </Field>
                  <Field label={tr('settings.consultationFee')}>
                    <Input type="number" value={profile.consultationFee} onChange={(event) => updateProfile('consultationFee', event.target.value)} placeholder="500" />
                  </Field>
                  <SelectField
                    label={tr('settings.defaultDoctorDashboard')}
                    value={settings.defaultDashboard}
                    onChange={(value) => updateSetting('defaultDashboard', value)}
                    options={[
                      { value: 'overview', label: tr('option.overview') },
                      { value: 'appointments', label: tr('option.appointments') },
                      { value: 'patients', label: tr('option.patients') },
                      { value: 'reports', label: tr('option.reports') },
                      { value: 'earnings', label: tr('option.earnings') },
                      { value: 'schedule', label: tr('option.schedule') },
                      { value: 'emergency', label: tr('option.emergency') },
                    ]}
                  />
                  <ToggleRow
                    title={tr('settings.scheduleAlerts')}
                    description={tr('settings.scheduleAlertsDesc')}
                    checked={settings.doctorScheduleAlerts}
                    onChange={(checked) => updateSetting('doctorScheduleAlerts', checked)}
                  />
                </div>
              )}
              {user?.role === 'admin' && (
                <div className="space-y-1">
                  <ToggleRow
                    title={tr('settings.adminDigest')}
                    description={tr('settings.adminDigestDesc')}
                    checked={settings.adminDigest}
                    onChange={(checked) => updateSetting('adminDigest', checked)}
                  />
                  <ToggleRow
                    title={tr('settings.criticalAlerts')}
                    description={tr('settings.criticalAlertsDesc')}
                    checked={settings.criticalAlerts}
                    onChange={(checked) => updateSetting('criticalAlerts', checked)}
                  />
                  <SelectField
                    label={tr('settings.defaultAdminDashboard')}
                    value={settings.defaultDashboard}
                    onChange={(value) => updateSetting('defaultDashboard', value)}
                    options={[
                      { value: 'overview', label: tr('option.overview') },
                      { value: 'reports', label: tr('option.reports') },
                      { value: 'billing', label: tr('option.billing') },
                      { value: 'emergency', label: tr('option.emergency') },
                    ]}
                  />
                </div>
              )}
              {user?.role === 'patient' && (
                <div className="space-y-1">
                  <ToggleRow
                    title={tr('settings.careTeamSharing')}
                    description={tr('settings.careTeamSharingDesc')}
                    checked={settings.patientRecordSharing}
                    onChange={(checked) => updateSetting('patientRecordSharing', checked)}
                  />
                  <ToggleRow
                    title={tr('settings.labResultEmails')}
                    description={tr('settings.labResultEmailsDesc')}
                    checked={settings.labResultEmails}
                    onChange={(checked) => updateSetting('labResultEmails', checked)}
                  />
                  <SelectField
                    label={tr('settings.defaultPatientDashboard')}
                    value={settings.defaultDashboard}
                    onChange={(value) => updateSetting('defaultDashboard', value)}
                    options={[
                      { value: 'overview', label: tr('option.overview') },
                      { value: 'appointments', label: tr('option.appointments') },
                      { value: 'records', label: tr('option.records') },
                      { value: 'billing', label: tr('option.billing') },
                    ]}
                  />
                </div>
              )}
              <div className="flex justify-end mt-5">
                <Button onClick={saveAccount} disabled={saveMut.isPending} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saveMut.isPending ? tr('common.saving') : tr('settings.saveRole')}
                </Button>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="bg-card rounded-xl border shadow-sm p-6">
              <h3 className="font-heading font-semibold text-lg text-card-foreground mb-5">{tr('settings.security')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <Field label={tr('settings.currentPassword')}>
                  <Input type="password" value={password.currentPassword} onChange={(event) => setPassword((current) => ({ ...current, currentPassword: event.target.value }))} />
                </Field>
                <div />
                <Field label={tr('settings.newPassword')}>
                  <Input type="password" value={password.newPassword} onChange={(event) => setPassword((current) => ({ ...current, newPassword: event.target.value }))} />
                </Field>
                <Field label={tr('settings.confirmPassword')}>
                  <Input type="password" value={password.confirmPassword} onChange={(event) => setPassword((current) => ({ ...current, confirmPassword: event.target.value }))} />
                </Field>
              </div>
              <div className="mt-5 space-y-1 max-w-2xl">
                <ToggleRow
                  title={tr('settings.twoFactor')}
                  description={tr('settings.twoFactorDesc')}
                  checked={settings.twoFactorEnabled}
                  onChange={(checked) => updateSetting('twoFactorEnabled', checked)}
                />
              </div>
              <div className="flex flex-wrap gap-3 mt-5">
                <Button onClick={savePassword} disabled={passwordMut.isPending} className="gap-2">
                  <Lock className="w-4 h-4" />
                  {passwordMut.isPending ? tr('common.updating') : tr('settings.updatePassword')}
                </Button>
                <Button variant="outline" onClick={saveAccount} disabled={saveMut.isPending} className="gap-2">
                  <Save className="w-4 h-4" />
                  {tr('settings.saveSecurity')}
                </Button>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="bg-card rounded-xl border shadow-sm p-6">
              <h3 className="font-heading font-semibold text-lg text-card-foreground mb-5">{tr('settings.notificationPrefs')}</h3>
              <div className="space-y-1">
                <ToggleRow title={tr('settings.emailNotifications')} description={tr('settings.emailNotificationsDesc')} checked={settings.emailNotifications} onChange={(checked) => updateSetting('emailNotifications', checked)} />
                <ToggleRow title={tr('settings.smsAlerts')} description={tr('settings.smsAlertsDesc')} checked={settings.smsAlerts} onChange={(checked) => updateSetting('smsAlerts', checked)} />
                <ToggleRow title={tr('settings.systemNotifications')} description={tr('settings.systemNotificationsDesc')} checked={settings.systemNotifications} onChange={(checked) => updateSetting('systemNotifications', checked)} />
                <ToggleRow title={tr('settings.appointmentReminders')} description={tr('settings.appointmentRemindersDesc')} checked={settings.appointmentReminders} onChange={(checked) => updateSetting('appointmentReminders', checked)} />
                <ToggleRow title={tr('settings.weeklyReports')} description={tr('settings.weeklyReportsDesc')} checked={settings.weeklyReports} onChange={(checked) => updateSetting('weeklyReports', checked)} />
                <ToggleRow title={tr('settings.criticalAlerts')} description={tr('settings.criticalAlertsDesc')} checked={settings.criticalAlerts} onChange={(checked) => updateSetting('criticalAlerts', checked)} />
              </div>
              <div className="flex justify-end mt-5">
                <Button onClick={saveAccount} disabled={saveMut.isPending} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saveMut.isPending ? tr('common.saving') : tr('settings.saveNotifications')}
                </Button>
              </div>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="bg-card rounded-xl border shadow-sm p-6">
              <h3 className="font-heading font-semibold text-lg text-card-foreground mb-5">{tr('settings.dashboardAppearance')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField
                  label={tr('settings.theme')}
                  value={settings.theme}
                  onChange={(value) => updateSetting('theme', value)}
                  options={[
                    { value: 'system', label: tr('settings.system') },
                    { value: 'light', label: tr('settings.light') },
                    { value: 'dark', label: tr('settings.dark') },
                    { value: 'calm', label: 'Calm' },
                    { value: 'sage', label: 'Sage' },
                    { value: 'sky', label: 'Sky' },
                    { value: 'blush', label: 'Blush' },
                  ]}
                />
                <SelectField
                  label={tr('settings.density')}
                  value={settings.density}
                  onChange={(value) => updateSetting('density', value)}
                  options={[
                    { value: 'comfortable', label: tr('settings.comfortable') },
                    { value: 'compact', label: tr('settings.compact') },
                    { value: 'spacious', label: tr('settings.spacious') },
                  ]}
                />
                <SelectField
                  label={tr('settings.language')}
                  value={settings.language}
                  onChange={(value) => updateSetting('language', value)}
                  options={[
                    { value: 'en', label: tr('settings.english') },
                    { value: 'hi', label: tr('settings.hindi') },
                    { value: 'mr', label: tr('settings.marathi') },
                  ]}
                />
                <SelectField
                  label={tr('settings.timezone')}
                  value={settings.timezone}
                  onChange={(value) => updateSetting('timezone', value)}
                  options={[
                    { value: 'Asia/Calcutta', label: tr('settings.indiaTime') },
                    { value: 'UTC', label: 'UTC' },
                    { value: 'America/New_York', label: tr('settings.easternTime') },
                    { value: 'Europe/London', label: tr('settings.london') },
                  ]}
                />
              </div>
              <div className="flex justify-end mt-5">
                <Button onClick={saveAccount} disabled={saveMut.isPending} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saveMut.isPending ? tr('common.saving') : tr('settings.saveAppearance')}
                </Button>
              </div>
            </div>
          )}

          {tab === 'privacy' && (
            <div className="bg-card rounded-xl border shadow-sm p-6">
              <h3 className="font-heading font-semibold text-lg text-card-foreground mb-5">{tr('settings.privacyData')}</h3>
              <div className="space-y-1">
                <ToggleRow title={tr('settings.usageAnalytics')} description={tr('settings.usageAnalyticsDesc')} checked={settings.dataSharing} onChange={(checked) => updateSetting('dataSharing', checked)} />
                <SelectField
                  label={tr('settings.profileVisibility')}
                  value={settings.profileVisibility}
                  onChange={(value) => updateSetting('profileVisibility', value)}
                  options={[
                    { value: 'private', label: tr('settings.private') },
                    { value: 'care_team', label: tr('settings.careTeamOnly') },
                    { value: 'hospital', label: tr('settings.hospitalStaff') },
                  ]}
                />
              </div>
              <div className="flex flex-wrap gap-3 mt-5">
                <Button variant="outline" onClick={downloadMyData} className="gap-2">
                  <Download className="w-4 h-4" />
                  {tr('settings.downloadData')}
                </Button>
                <Button onClick={saveAccount} disabled={saveMut.isPending} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saveMut.isPending ? tr('common.saving') : tr('settings.savePrivacy')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
