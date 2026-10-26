import React, { useState, useEffect } from 'react';
import {
  Bell, Shield, MessageSquare, Mail, Phone, Moon, Lock, CheckCircle2,
  AlertTriangle, Save, RefreshCw, Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import type { Unmodelled } from '@/lib/apiTypes';

export default function NotificationPreferences() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Channels
  const [inApp, setInApp] = useState(true);
  const [push, setPush] = useState(true);
  const [sms, setSms] = useState(true);
  const [email, setEmail] = useState(true);
  const [whatsApp, setWhatsApp] = useState(false);

  // Categories
  const [appointments, setAppointments] = useState(true);
  const [labReports, setLabReports] = useState(true);
  const [medicineReminders, setMedicineReminders] = useState(true);
  const [billing, setBilling] = useState(true);
  const [marketing, setMarketing] = useState(false);

  // Privacy & Discreet Mode
  const [discreetMode, setDiscreetMode] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');

  useEffect(() => {
    // Load from local storage or api
    try {
      const stored = localStorage.getItem('findmedi_notification_prefs');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.inApp !== undefined) setInApp(parsed.inApp);
        if (parsed.push !== undefined) setPush(parsed.push);
        if (parsed.sms !== undefined) setSms(parsed.sms);
        if (parsed.email !== undefined) setEmail(parsed.email);
        if (parsed.whatsApp !== undefined) setWhatsApp(parsed.whatsApp);
        if (parsed.discreetMode !== undefined) setDiscreetMode(parsed.discreetMode);
        if (parsed.quietHoursEnabled !== undefined) setQuietHoursEnabled(parsed.quietHoursEnabled);
      }
    } catch {
      // defaults
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const prefs = {
      inApp,
      push,
      sms,
      email,
      whatsApp,
      appointments,
      labReports,
      medicineReminders,
      billing,
      marketing,
      discreetMode,
      quietHoursEnabled,
      quietStart,
      quietEnd,
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem('findmedi_notification_prefs', JSON.stringify(prefs));
      // Save to backend if route exists
      await (api as Unmodelled).updateUserSettings?.({ notificationPrefs: prefs }).catch(() => {});
      toast.success('Notification preferences & Discreet Mode updated successfully');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" /> Notification & Privacy Preferences
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Control delivery channels, quiet hours, and discreet privacy modes for sensitive healthcare alerts
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-1.5 font-semibold">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>

      {/* ── Discreet Mode Privacy Card ── */}
      <Card className="border-purple-500/30 bg-purple-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <Lock className="w-4 h-4 text-purple-600" />
            Discreet Mode for Sensitive Treatments (Spec 09 §3 & §6)
          </CardTitle>
          <CardDescription className="text-xs">
            Hides specific medical diagnoses, doctor specialties, and treatment names from push notifications and SMS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <label htmlFor="discreet-toggle" className="text-sm font-semibold text-foreground cursor-pointer">
                Enable Discreet Neutral Copy
              </label>
              <p className="text-xs text-muted-foreground">
                When enabled, alerts for sensitive categories (e.g. IVF, Psychiatry, De-addiction, Sexual Health, HIV/Oncology) will only display:
                <span className="block font-mono text-[11px] bg-background/80 p-2 rounded mt-1 border">
                  "You have an appointment update in FindMedi." (No doctor specialty or clinical terms shown on lock screen)
                </span>
              </p>
            </div>
            <input
              id="discreet-toggle"
              type="checkbox"
              checked={discreetMode}
              onChange={(e) => setDiscreetMode(e.target.checked)}
              className="w-5 h-5 accent-primary rounded cursor-pointer mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Delivery Channels ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <Smartphone className="w-4 h-4 text-primary" /> Communication Channels
          </CardTitle>
          <CardDescription className="text-xs">
            Select how you want to receive booking confirmations, reports, and reminders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 divide-y divide-border/60">
          <div className="flex items-center justify-between pt-3 first:pt-0">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-foreground">In-App Notification Feed</span>
              <p className="text-xs text-muted-foreground">Notification bell updates inside the FindMedi web & mobile app</p>
            </div>
            <input type="checkbox" checked={inApp} onChange={(e) => setInApp(e.target.checked)} className="w-4 h-4 accent-primary" />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-foreground">Browser & Device Push Notifications</span>
              <p className="text-xs text-muted-foreground">Instant pop-up alerts on your device when a doctor accepts your booking</p>
            </div>
            <input type="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} className="w-4 h-4 accent-primary" />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-foreground">SMS Alerts (DLT Verified)</span>
              <p className="text-xs text-muted-foreground">OTP verifications, emergency notifications, and critical token status</p>
            </div>
            <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} className="w-4 h-4 accent-primary" />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-foreground">Email Summaries & Invoices</span>
              <p className="text-xs text-muted-foreground">PDF payment receipts, lab report downloads, and medical statements</p>
            </div>
            <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="w-4 h-4 accent-primary" />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-foreground">WhatsApp Business Updates</span>
              <p className="text-xs text-muted-foreground">Convenient WhatsApp appointment reminders and direct PDF reports (Opt-in)</p>
            </div>
            <input type="checkbox" checked={whatsApp} onChange={(e) => setWhatsApp(e.target.checked)} className="w-4 h-4 accent-primary" />
          </div>
        </CardContent>
      </Card>

      {/* ── Quiet Hours / DND ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <Moon className="w-4 h-4 text-primary" /> Quiet Hours (Do Not Disturb)
          </CardTitle>
          <CardDescription className="text-xs">
            Non-urgent notifications will be muted during your rest hours. Critical medical emergency alerts are never blocked.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Enable Quiet Hours</span>
            <input
              type="checkbox"
              checked={quietHoursEnabled}
              onChange={(e) => setQuietHoursEnabled(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
          </div>

          {quietHoursEnabled && (
            <div className="flex items-center gap-4 text-xs pt-2">
              <div className="space-y-1">
                <span className="text-muted-foreground block font-medium">Quiet Starts</span>
                <input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm font-semibold"
                />
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground block font-medium">Quiet Ends</span>
                <input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm font-semibold"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
