import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ReferralSettings() {
  const [settings, setSettings] = useState<any>({ isEnabled: true, qualifyingAction: 'first_appointment', referrerPoints: 200, refereePoints: 100, maxReferralsPerMonth: 20 });
  const [list, setList] = useState<any[]>([]);

  const load = async () => {
    try {
      const s: any = await api.get('/referral/admin/settings').catch(() => null);
      if (s && s._id) setSettings(s);
      const l: any = await api.get('/referral/admin/all').catch(() => []);
      setList(Array.isArray(l) ? l : []);
    } catch (e: any) { toast.error('Load failed'); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await api.put('/referral/admin/settings', settings);
      toast.success('Referral settings saved');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Save failed'); }
  };

  const flag = async (id: string, flagged: boolean) => {
    try {
      await api.put(`/referral/admin/flag/${id}`, { flagged });
      toast.success(flagged ? 'Flagged' : 'Unflagged');
      load();
    } catch (e: any) { toast.error('Failed'); }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 pb-16">
      <h1 className="text-xl font-black">Referral Settings</h1>
      <Card><CardContent className="p-4 grid sm:grid-cols-2 gap-3">
        <div><label className="text-xs font-bold">Qualifying action</label>
          <select value={settings.qualifyingAction} onChange={(e) => setSettings({ ...settings, qualifyingAction: e.target.value })} className="w-full h-10 rounded-xl border px-2 text-sm">
            <option value="signup_only">signup_only</option>
            <option value="first_appointment">first_appointment</option>
            <option value="first_order">first_order</option>
            <option value="first_lab_test">first_lab_test</option>
          </select>
        </div>
        <div><label className="text-xs font-bold">Referrer points</label><Input type="number" value={settings.referrerPoints} onChange={(e) => setSettings({ ...settings, referrerPoints: Number(e.target.value) })} /></div>
        <div><label className="text-xs font-bold">Referee points</label><Input type="number" value={settings.refereePoints} onChange={(e) => setSettings({ ...settings, refereePoints: Number(e.target.value) })} /></div>
        <div><label className="text-xs font-bold">Max/month</label><Input type="number" value={settings.maxReferralsPerMonth} onChange={(e) => setSettings({ ...settings, maxReferralsPerMonth: Number(e.target.value) })} /></div>
        <div className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!settings.isEnabled} onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })} /> Enabled</div>
        <div><Button onClick={save} className="rounded-xl font-bold">Save</Button></div>
      </CardContent></Card>
      <Card><CardContent className="p-4 space-y-1">
        {list.map((r: any) => (
          <div key={r._id} className="flex items-center justify-between text-xs border-b py-1.5 gap-2">
            <span className="font-mono">{r.code} · {r.status}</span>
            <Button size="sm" variant="outline" onClick={() => flag(r._id, r.status !== 'fraud_flagged')}>{r.status === 'fraud_flagged' ? 'Unflag' : 'Flag'}</Button>
          </div>
        ))}
        {!list.length && <p className="text-sm text-muted-foreground">Koi referral nahi.</p>}
      </CardContent></Card>
    </div>
  );
}
