/**
 * Hospital Settings â€” ported from client/src/pages/admin/AdminHospitalSettings.jsx
 */
'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Building2, Phone, Mail, MapPin, Clock, Globe, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { facilities } from '@/lib/api';

export default function HospitalSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    licenseNumber: '',
    website: '',
    description: '',
    logo: '',
    image: '',
    establishedYear: '',
    hospitalType: 'Private',
    bedAvailability: 0,
    emergency24x7: false,
  });
  const [facilityId, setFacilityId] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const raw = (await facilities.getMine()) as unknown as Record<string, unknown>;
        if (raw) {
          setForm({
            name: String(raw.name ?? ''),
            email: String(raw.email ?? ''),
            phone: String(raw.phone ?? ''),
            address: String(raw.address ?? ''),
            city: String(raw.city ?? ''),
            state: String(raw.state ?? ''),
            pincode: String(raw.pincode ?? ''),
            licenseNumber: String(raw.licenseNumber ?? ''),
            website: String(raw.website ?? ''),
            description: String(raw.description ?? ''),
            logo: String(raw.logo ?? ''),
            image: String(raw.image ?? ''),
            establishedYear: String(raw.establishedYear ?? ''),
            hospitalType: String(raw.hospitalType ?? 'Private'),
            bedAvailability: Number(raw.bedAvailability ?? 0),
            emergency24x7: Boolean(raw.emergency24x7 ?? (raw as Record<string, unknown>).emergencySupport ?? false),
          });
          if (raw._id) setFacilityId(String(raw._id));
        }
      } catch {
        // ignore
      }
      setLoading(false);
    };
    load();
  }, []);

  const update = (k: string, v: string | number | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const id = facilityId || 'me';
      await facilities.update(id, { ...form, establishedYear: form.establishedYear ? Number(form.establishedYear) : undefined } as unknown as never);
      toast.success('Hospital settings updated successfully');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update hospital');
    }
    setSaving(false);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hospital Settings</h1>
          <p className="text-muted-foreground text-sm">Manage hospital profile and operational settings</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 shrink-0">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" /> Basic Information
          </CardTitle>
          <CardDescription>Update hospital details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hospital Name</Label>
              <Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Enter hospital name" />
            </div>
            <div className="space-y-2">
              <Label>Hospital Type</Label>
              <select value={form.hospitalType} onChange={(e) => update('hospitalType', e.target.value)} className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm">
                <option>Private</option>
                <option>Government</option>
                <option>Trust</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                <Phone className="w-3 h-3 inline mr-1" /> Phone
              </Label>
              <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+91 ..." />
            </div>
            <div className="space-y-2">
              <Label>
                <Mail className="w-3 h-3 inline mr-1" /> Email
              </Label>
              <Input value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="hospital@email.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              <MapPin className="w-3 h-3 inline mr-1" /> Address
            </Label>
            <Input value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Full address" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="City" />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={form.state} onChange={(e) => update('state', e.target.value)} placeholder="State" />
            </div>
            <div className="space-y-2">
              <Label>Pincode</Label>
              <Input value={form.pincode} onChange={(e) => update('pincode', e.target.value)} placeholder="Pincode" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>
                <Shield className="w-3 h-3 inline mr-1" /> License
              </Label>
              <Input value={form.licenseNumber} onChange={(e) => update('licenseNumber', e.target.value)} placeholder="License" />
            </div>
            <div className="space-y-2">
              <Label>
                <Globe className="w-3 h-3 inline mr-1" /> Website
              </Label>
              <Input value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Established Year</Label>
              <Input type="number" value={form.establishedYear} onChange={(e) => update('establishedYear', e.target.value)} placeholder="2015" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bed Availability</Label>
              <Input type="number" value={form.bedAvailability} onChange={(e) => update('bedAvailability', Number(e.target.value))} placeholder="0" />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={form.emergency24x7} onCheckedChange={(v) => update('emergency24x7', v)} />
              <Label>24x7 Emergency</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Brief description..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input value={form.logo} onChange={(e) => update('logo', e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Cover Image URL</Label>
              <Input value={form.image} onChange={(e) => update('image', e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-3 h-3" /> Working Hours
            </Label>
            <Input value="" placeholder="e.g. 9:00 AM - 6:00 PM" disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

