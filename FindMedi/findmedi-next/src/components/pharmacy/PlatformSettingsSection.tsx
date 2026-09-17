'use client';

import React, { useState } from 'react';
import { Globe, Building2, Users, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { toast } from 'sonner';

interface PlatformSettingsSectionProps {
  totalOrders?: number;
  totalMedicines?: number;
}

export default function PlatformSettingsSection({
  totalOrders,
  totalMedicines,
}: PlatformSettingsSectionProps) {
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [selfRegistration, setSelfRegistration] = useState(false);
  const [prescriptionValidation, setPrescriptionValidation] = useState(true);
  const [deliveryIntegration, setDeliveryIntegration] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Platform settings updated successfully');
    }, 400);
  };

  return (
    <div className="bg-card rounded-2xl border p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <Globe className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-semibold text-lg text-card-foreground">Platform Settings</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-500/5 rounded-xl border border-emerald-500/20 p-4">
          <p className="text-2xl font-bold text-emerald-600">Active</p>
          <p className="text-xs text-muted-foreground">Platform Status</p>
        </div>
        <div className="bg-primary/5 rounded-xl border border-primary/20 p-4">
          <p className="text-2xl font-bold text-primary">{totalOrders ?? '—'}</p>
          <p className="text-xs text-muted-foreground">Total Orders</p>
        </div>
        <div className="bg-blue-500/5 rounded-xl border border-blue-500/20 p-4">
          <p className="text-2xl font-bold text-blue-600">{totalMedicines ?? '—'}</p>
          <p className="text-xs text-muted-foreground">Total Medicines</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm text-card-foreground">Auto Confirm Orders</p>
              <p className="text-xs text-muted-foreground">Automatically confirm orders after payment</p>
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
              <p className="font-medium text-sm text-card-foreground">Customer Self-Registration</p>
              <p className="text-xs text-muted-foreground">Allow customers to register without approval</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelfRegistration(!selfRegistration)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              selfRegistration ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                selfRegistration ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm text-card-foreground">Prescription Validation</p>
              <p className="text-xs text-muted-foreground">
                Require prescription verification for controlled medicines
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPrescriptionValidation(!prescriptionValidation)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              prescriptionValidation ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                prescriptionValidation ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm text-card-foreground">Delivery Integration</p>
              <p className="text-xs text-muted-foreground">Enable third-party delivery for medicine orders</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDeliveryIntegration(!deliveryIntegration)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              deliveryIntegration ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                deliveryIntegration ? 'translate-x-6' : 'translate-x-1'
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
