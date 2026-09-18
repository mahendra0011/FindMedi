'use client';

import React, { useState } from 'react';
import { Globe, Building2, Users, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { toast } from 'sonner';

interface PlatformSettingsSectionProps {
  totalBookings?: number;
  completedTests?: number;
}

export default function PlatformSettingsSection({
  totalBookings,
  completedTests,
}: PlatformSettingsSectionProps) {
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [selfBooking, setSelfBooking] = useState(false);
  const [autoPublish, setAutoPublish] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Lab platform settings saved successfully');
    }, 400);
  };

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Globe className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-semibold text-lg text-foreground">Platform Settings</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-500/5 rounded-xl border border-emerald-500/20 p-4">
          <p className="text-2xl font-bold text-emerald-600">Active</p>
          <p className="text-xs text-muted-foreground">Platform Status</p>
        </div>
        <div className="bg-primary/5 rounded-xl border border-primary/20 p-4">
          <p className="text-2xl font-bold text-primary">{totalBookings ?? '—'}</p>
          <p className="text-xs text-muted-foreground">Total Bookings</p>
        </div>
        <div className="bg-blue-500/5 rounded-xl border border-blue-500/20 p-4">
          <p className="text-2xl font-bold text-blue-600">{completedTests ?? '—'}</p>
          <p className="text-xs text-muted-foreground">Completed Tests</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm text-foreground">Auto Confirm Bookings</p>
              <p className="text-xs text-muted-foreground">Automatically confirm bookings after payment</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAutoConfirm(!autoConfirm)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoConfirm ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoConfirm ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm text-foreground">Patient Self-Booking</p>
              <p className="text-xs text-muted-foreground">Allow patients to book tests without approval</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelfBooking(!selfBooking)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              selfBooking ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                selfBooking ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm text-foreground">Report Auto-Publish</p>
              <p className="text-xs text-muted-foreground">
                Automatically publish test reports after completion
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAutoPublish(!autoPublish)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoPublish ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoPublish ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm text-foreground">SMS Notifications</p>
              <p className="text-xs text-muted-foreground">
                Send SMS alerts for booking confirmations and report availability
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSmsNotifications(!smsNotifications)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              smsNotifications ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                smsNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Platform Settings'}
        </button>
        <span className="text-xs text-muted-foreground">Changes apply platform-wide</span>
      </div>
    </div>
  );
}
