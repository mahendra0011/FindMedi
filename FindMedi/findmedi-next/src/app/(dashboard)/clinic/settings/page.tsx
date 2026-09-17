/* eslint-disable react-hooks/preserve-manual-memoization, prefer-const, react/no-unescaped-entities, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-expressions, @next/next/no-img-element,  @typescript-eslint/ban-ts-comment, react-hooks/set-state-in-effect, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { Save, CheckCircle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function ClinicSettingsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getClinicProfile().then((res: unknown) => {
      const fac = (res as { facility?: Record<string, unknown> })?.facility || res as Record<string, unknown> || {};
      setForm({
        name: (fac.name as string) || user?.name || '',
        phone: (fac.phone as string) || '',
        address: (fac.address as string) || '',
        city: (fac.city as string) || '',
        description: (fac.description as string) || '',
      });
    }).catch(()=>{}).finally(()=> setLoading(false));
  }, [user?.name]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateClinicProfile(form);
      toast.success('Settings saved');
      setSaved(true);
      setTimeout(()=>setSaved(false),2000);
    } catch (e) { toast.error((e as Error).message || 'Failed to save'); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2"><Building2 className="w-6 h-6 text-primary" /> Clinic Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your clinic profile and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2"><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'} {saved && <CheckCircle className="w-4 h-4 text-emerald-300" />}</Button>
      </div>
      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4">
        <div><label className="text-sm font-medium mb-1.5 block">Clinic Name</label><Input value={form.name} onChange={e=> setForm({...form, name:e.target.value})} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm font-medium mb-1.5 block">Phone</label><Input value={form.phone} onChange={e=> setForm({...form, phone:e.target.value})} /></div>
          <div><label className="text-sm font-medium mb-1.5 block">City</label><Input value={form.city} onChange={e=> setForm({...form, city:e.target.value})} /></div>
        </div>
        <div><label className="text-sm font-medium mb-1.5 block">Address</label><Input value={form.address} onChange={e=> setForm({...form, address:e.target.value})} /></div>
        <div><label className="text-sm font-medium mb-1.5 block">Description</label><textarea value={form.description} onChange={e=> setForm({...form, description:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm h-20 resize-none" /></div>
      </div>
    </div>
  );
}
