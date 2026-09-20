import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoyaltyRewards() {
  const [tab, setTab] = useState<'rules' | 'catalog' | 'redemptions' | 'sos'>('rules');
  const [rules, setRules] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [sos, setSos] = useState<any>({ radiusSteps: [5, 10, 15, 20], windowSeconds: 30, maxRetriesPerRadius: 3, retryPauseSeconds: 3 });

  const load = async () => {
    try {
      const [r, red]: any[] = await Promise.all([
        api.get('/loyalty/admin/earn-rules').catch(() => []),
        api.get('/loyalty/admin/redemptions').catch(() => []),
      ]);
      setRules(Array.isArray(r) ? r : []);
      setRedemptions(Array.isArray(red) ? red : []);
      const s: any = await api.get('/admin/sos-vehicle-settings').catch(() => null);
      if (s) setSos(s);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Load failed');
    }
  };
  useEffect(() => { load(); }, []);

  const saveRule = async (action: string, points: number) => {
    try {
      await api.post('/loyalty/admin/earn-rule', { action, points, isActive: true });
      toast.success('Saved');
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Save failed'); }
  };

  const saveSos = async () => {
    try {
      await api.put('/admin/sos-vehicle-settings', sos);
      toast.success('SOS settings saved');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Save failed'); }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 pb-16">
      <h1 className="text-xl font-black">Loyalty & SOS Settings</h1>
      <div className="flex gap-2 flex-wrap">
        {(['rules', 'catalog', 'redemptions', 'sos'] as const).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)} className="rounded-full capitalize">{t}</Button>
        ))}
      </div>
      {tab === 'rules' && (
        <Card><CardContent className="p-4 space-y-2">
          {['appointment_completed', 'lab_order_completed', 'pharmacy_order_completed', 'review_submitted', 'referral_qualified', 'profile_completed'].map((a) => {
            const cur = rules.find((r) => r.action === a);
            return (
              <div key={a} className="flex items-center gap-2 text-sm">
                <span className="flex-1 font-mono text-xs">{a}</span>
                <Input type="number" defaultValue={cur?.points ?? ''} placeholder="pts" id={`rule-${a}`} className="w-24 h-9" />
                <Button size="sm" onClick={() => { const el = document.getElementById(`rule-${a}`) as HTMLInputElement; saveRule(a, Number(el?.value || 0)); }}>Save</Button>
              </div>
            );
          })}
          <Button size="sm" variant="outline" onClick={async () => { try { await api.post('/loyalty/admin/init-rules', {}); toast.success('Initialized'); load(); } catch (e: any) { toast.error('Failed'); } }}>Init default rules</Button>
        </CardContent></Card>
      )}
      {tab === 'catalog' && (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">
          Reward catalog CRUD — admin API ready at /loyalty/admin/*. Use Promotions page pattern to extend. Active catalog count: {catalog.length}
        </CardContent></Card>
      )}
      {tab === 'redemptions' && (
        <Card><CardContent className="p-4 space-y-1">
          {redemptions.map((r: any) => (
            <div key={r._id} className="flex justify-between text-xs border-b py-1.5">
              <span className="font-mono font-bold">{r.code}</span>
              <span>{r.status} · {r.pointsSpent} pts</span>
            </div>
          ))}
          {!redemptions.length && <p className="text-sm text-muted-foreground">Koi redemption nahi.</p>}
        </CardContent></Card>
      )}
      {tab === 'sos' && (
        <Card><CardContent className="p-4 space-y-3">
          <label className="text-xs font-bold">Radius steps (comma separated)</label>
          <Input value={(sos.radiusSteps || []).join(',')} onChange={(e) => setSos({ ...sos, radiusSteps: e.target.value.split(',').map((x) => Number(x.trim())).filter(Boolean) })} />
          <div className="grid grid-cols-3 gap-2">
            <div><label className="text-xs">Window (s)</label><Input type="number" value={sos.windowSeconds} onChange={(e) => setSos({ ...sos, windowSeconds: Number(e.target.value) })} /></div>
            <div><label className="text-xs">Retries/radius</label><Input type="number" value={sos.maxRetriesPerRadius} onChange={(e) => setSos({ ...sos, maxRetriesPerRadius: Number(e.target.value) })} /></div>
            <div><label className="text-xs">Pause (s)</label><Input type="number" value={sos.retryPauseSeconds} onChange={(e) => setSos({ ...sos, retryPauseSeconds: Number(e.target.value) })} /></div>
          </div>
          <Button onClick={saveSos} className="rounded-xl bg-red-600 text-white font-bold">Save SOS settings</Button>
        </CardContent></Card>
      )}
    </div>
  );
}
