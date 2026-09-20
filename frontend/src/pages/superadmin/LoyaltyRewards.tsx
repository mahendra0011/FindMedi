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

  const [newItem, setNewItem] = useState<any>({
    title: '', description: '', category: 'medicine_discount',
    pointsRequired: 500, rewardType: 'percentage', rewardValue: 10,
    applicableService: 'pharmacy', maxCapAmount: 0, validityDays: 30, stockLimit: 0,
  });

  const load = async () => {
    try {
      const [r, red, cat]: any[] = await Promise.all([
        api.get('/loyalty/admin/earn-rules').catch(() => []),
        api.get('/loyalty/admin/redemptions').catch(() => []),
        api.get('/loyalty/admin/reward-catalog').catch(() => []),
      ]);
      setRules(Array.isArray(r) ? r : []);
      setRedemptions(Array.isArray(red) ? red : []);
      setCatalog(Array.isArray(cat) ? cat : []);
      const s: any = await api.get('/admin/sos-vehicle-settings').catch(() => null);
      if (s) setSos(s);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Load failed');
    }
  };

  const createCatalogItem = async () => {
    try {
      await api.post('/loyalty/admin/reward-catalog', newItem);
      toast.success('Reward added');
      setNewItem({ ...newItem, title: '', description: '' });
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const toggleCatalogItem = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/loyalty/admin/reward-catalog/${id}`, { isActive });
      toast.success(isActive ? 'Activated' : 'Deactivated');
      load();
    } catch (e: any) { toast.error('Failed'); }
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
        <>
          <Card><CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-bold">Naya Reward Add Karein</h3>
            <Input placeholder="Title (e.g. 10% off on Medicines)" value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} />
            <Input placeholder="Description" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} className="h-10 rounded-xl border px-2 text-sm bg-background">
                <option value="medicine_discount">Medicine Discount</option>
                <option value="free_delivery">Free Delivery</option>
                <option value="free_lab_test">Free Lab Test</option>
                <option value="appointment_discount">Appointment Discount</option>
                <option value="custom">Custom</option>
              </select>
              <select value={newItem.rewardType} onChange={(e) => setNewItem({ ...newItem, rewardType: e.target.value })} className="h-10 rounded-xl border px-2 text-sm bg-background">
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
                <option value="free_item">Free Item</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs">Points Required</label><Input type="number" value={newItem.pointsRequired} onChange={(e) => setNewItem({ ...newItem, pointsRequired: Number(e.target.value) })} /></div>
              <div><label className="text-xs">Value</label><Input type="number" value={newItem.rewardValue} onChange={(e) => setNewItem({ ...newItem, rewardValue: Number(e.target.value) })} /></div>
              <div><label className="text-xs">Max Cap (₹)</label><Input type="number" value={newItem.maxCapAmount} onChange={(e) => setNewItem({ ...newItem, maxCapAmount: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={newItem.applicableService} onChange={(e) => setNewItem({ ...newItem, applicableService: e.target.value })} className="h-10 rounded-xl border px-2 text-sm bg-background">
                <option value="pharmacy">Pharmacy</option>
                <option value="lab">Lab</option>
                <option value="delivery">Delivery</option>
                <option value="consultation">Consultation</option>
                <option value="all">All</option>
              </select>
              <div><label className="text-xs">Validity (days)</label><Input type="number" value={newItem.validityDays} onChange={(e) => setNewItem({ ...newItem, validityDays: Number(e.target.value) })} /></div>
            </div>
            <Button onClick={createCatalogItem} className="rounded-xl font-bold w-full">Add Reward</Button>
          </CardContent></Card>

          <Card><CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-bold">Existing Rewards ({catalog.length})</h3>
            {catalog.map((item: any) => (
              <div key={item._id} className="flex items-center justify-between text-xs border-b py-2 gap-2">
                <div>
                  <p className="font-bold">{item.title}</p>
                  <p className="text-muted-foreground">{item.pointsRequired} pts · {item.category} · {item.isActive ? 'Active' : 'Inactive'}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => toggleCatalogItem(item._id, !item.isActive)}>
                  {item.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            ))}
            {!catalog.length && <p className="text-sm text-muted-foreground">Koi reward nahi bana abhi.</p>}
          </CardContent></Card>
        </>
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
