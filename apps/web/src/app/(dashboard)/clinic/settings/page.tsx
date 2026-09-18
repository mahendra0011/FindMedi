'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Save,
  CheckCircle,
  Building2,
  MapPin,
  Phone,
  FileText,
  Bell,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ClinicProfileForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  registrationNumber: string;
  description: string;
}

interface ClinicPreferences {
  emailNotifications: boolean;
  smsAlerts: boolean;
  autoConfirmAppointments: boolean;
  publicListing: boolean;
}

const EMPTY_FORM: ClinicProfileForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  registrationNumber: '',
  description: '',
};

const DEFAULT_PREFS: ClinicPreferences = {
  emailNotifications: true,
  smsAlerts: false,
  autoConfirmAppointments: false,
  publicListing: true,
};

const PREFS_KEY = 'clinic-settings-prefs';

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function loadPrefs(): ClinicPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<ClinicPreferences>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-52 bg-muted/60 rounded-lg" />
          <div className="h-3 w-64 bg-muted/40 rounded-md mt-2" />
        </div>
        <div className="h-10 w-24 bg-muted/50 rounded-xl" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-border/40 p-6 space-y-3">
          <div className="h-5 w-40 bg-muted/60 rounded-md" />
          <div className="h-10 w-full bg-muted/40 rounded-lg" />
          <div className="h-10 w-full bg-muted/40 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default function ClinicSettingsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<ClinicProfileForm>(EMPTY_FORM);
  const [initial, setInitial] = useState<ClinicProfileForm>(EMPTY_FORM);
  const [prefs, setPrefs] = useState<ClinicPreferences>(DEFAULT_PREFS);
  const [initialPrefs, setInitialPrefs] = useState<ClinicPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = loadPrefs();
    setPrefs(stored);
    setInitialPrefs(stored);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchProfile = async () => {
      try {
        const res = await api.getClinicProfile();
        const record = res as unknown as Record<string, unknown>;
        const fac = (record?.facility as Record<string, unknown> | undefined) ?? record ?? {};
        const next: ClinicProfileForm = {
          name: str(fac.name, user?.name ?? ''),
          phone: str(fac.phone),
          email: str(fac.email),
          address: str(fac.address),
          city: str(fac.city),
          state: str(fac.state),
          pincode: str(fac.pincode),
          registrationNumber: str(fac.registrationNumber),
          description: str(fac.description),
        };
        if (!cancelled) {
          setForm(next);
          setInitial(next);
        }
      } catch {
        if (!cancelled) {
          setForm((f) => ({ ...f, name: user?.name ?? '' }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.name]);

  const set = useCallback(
    (key: keyof ClinicProfileForm, value: string) => setForm((f) => ({ ...f, [key]: value })),
    [],
  );

  const togglePref = useCallback((key: keyof ClinicPreferences, value: boolean) => {
    setPrefs((p) => {
      const next = { ...p, [key]: value };
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable — prefs still apply for this session
      }
      return next;
    });
  }, []);

  const isDirty =
    JSON.stringify(form) !== JSON.stringify(initial) ||
    JSON.stringify(prefs) !== JSON.stringify(initialPrefs);

  const handleReset = () => {
    setForm(initial);
    setPrefs(initialPrefs);
    toast.info('Changes discarded');
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Clinic name is required');
      return;
    }
    setSaving(true);
    try {
      await api.updateClinicProfile({ ...form });
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      } catch {
        // ignore storage failures
      }
      setInitial(form);
      setInitialPrefs(prefs);
      toast.success('Settings saved');
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SettingsSkeleton />;

  const prefRows: { key: keyof ClinicPreferences; title: string; desc: string }[] = [
    {
      key: 'emailNotifications',
      title: 'Email notifications',
      desc: 'Appointment updates and daily summaries by email',
    },
    {
      key: 'smsAlerts',
      title: 'SMS alerts',
      desc: 'Urgent booking and cancellation alerts by SMS',
    },
    {
      key: 'autoConfirmAppointments',
      title: 'Auto-confirm appointments',
      desc: 'Automatically confirm new booking requests',
    },
    {
      key: 'publicListing',
      title: 'Public listing',
      desc: 'Show this clinic in patient search results',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-3xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" /> Clinic Settings
          </h1>
          <p className="text-muted-foreground text-sm">Manage your clinic profile and preferences</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saving} className="gap-2">
            <RotateCcw className="w-4 h-4" /> Reset
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save'}
            {saved && <CheckCircle className="w-4 h-4 text-emerald-300" />}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Clinic Profile
          </CardTitle>
          <CardDescription>Basic identity details shown to patients</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="clinic-name" className="mb-1.5 block">
              Clinic Name *
            </Label>
            <Input
              id="clinic-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Sunrise Multispeciality Clinic"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clinic-phone" className="mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Phone
              </Label>
              <Input
                id="clinic-phone"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <Label htmlFor="clinic-email" className="mb-1.5 block">
                Email
              </Label>
              <Input
                id="clinic-email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="care@exampleclinic.com"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="clinic-reg" className="mb-1.5 block">
              Registration Number
            </Label>
            <Input
              id="clinic-reg"
              value={form.registrationNumber}
              onChange={(e) => set('registrationNumber', e.target.value)}
              placeholder="Clinical establishment reg. no."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Location
          </CardTitle>
          <CardDescription>Where patients can find you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="clinic-address" className="mb-1.5 block">
              Address
            </Label>
            <Input
              id="clinic-address"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Street, area, landmark"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="clinic-city" className="mb-1.5 block">
                City
              </Label>
              <Input
                id="clinic-city"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="City"
              />
            </div>
            <div>
              <Label htmlFor="clinic-state" className="mb-1.5 block">
                State
              </Label>
              <Input
                id="clinic-state"
                value={form.state}
                onChange={(e) => set('state', e.target.value)}
                placeholder="State"
              />
            </div>
            <div>
              <Label htmlFor="clinic-pincode" className="mb-1.5 block">
                Pincode
              </Label>
              <Input
                id="clinic-pincode"
                value={form.pincode}
                onChange={(e) => set('pincode', e.target.value)}
                placeholder="411001"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> About
          </CardTitle>
          <CardDescription>Specialities, facilities and timings summary</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="clinic-desc" className="mb-1.5 block">
            Description
          </Label>
          <Textarea
            id="clinic-desc"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Tell patients about your clinic…"
            className="min-h-24 resize-none"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" /> Preferences
          </CardTitle>
          <CardDescription>Saved on this device, applied immediately</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/50">
          {prefRows.map((row, i) => (
            <div key={row.key}>
              {i > 0 && <Separator className="opacity-0" />}
              <div className="flex items-center justify-between py-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{row.title}</p>
                  <p className="text-xs text-muted-foreground">{row.desc}</p>
                </div>
                <Switch
                  checked={prefs[row.key]}
                  onCheckedChange={(v) => togglePref(row.key, v)}
                  aria-label={row.title}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {isDirty && (
        <p className="text-xs text-warning text-center">You have unsaved changes</p>
      )}
    </motion.div>
  );
}
