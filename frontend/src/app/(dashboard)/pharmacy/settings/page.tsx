/**
 * Pharmacy Settings — store preferences (local-first; persistence follows).
 * No legacy source exists for this route; mirrors the patient settings pattern.
 */
'use client';

import { useState } from 'react';
import { Bell, Clock, Truck, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

function SettingSection({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('21:00');
  const [deliveryRadius, setDeliveryRadius] = useState('5');

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Settings saved!');
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Store Settings</h1>
        <p className="text-muted-foreground text-sm">Configure your pharmacy storefront</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SettingSection title="Store Profile" icon={Clock}>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Store name</label>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="e.g. HealthFirst Medicals" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Opens at</label>
                  <Input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Closes at</label>
                  <Input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
                </div>
              </div>
            </div>
          </SettingSection>

          <SettingSection title="Delivery" icon={Truck}>
            <div>
              <label className="text-sm font-medium mb-1 block">Delivery radius (km)</label>
              <Input
                type="number"
                min={1}
                value={deliveryRadius}
                onChange={(e) => setDeliveryRadius(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </SettingSection>

          <SettingSection title="Notifications" icon={Bell}>
            <p className="text-xs text-muted-foreground">Choose what notifications the store receives.</p>
            <div className="mt-3 space-y-2">
              {['New order alerts', 'Low stock warnings', 'Prescription uploads', 'Payout summaries'].map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" defaultChecked className="rounded border-border" />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </SettingSection>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-3xl border border-border/50 p-5 shadow-sm">
            <h3 className="font-semibold text-foreground mb-2">Platform</h3>
            <p className="text-xs text-muted-foreground">FindMedi v1.0</p>
            <p className="text-xs text-muted-foreground mt-1">
              Connected to: <span className="text-foreground font-medium">Production</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="rounded-xl">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
}
