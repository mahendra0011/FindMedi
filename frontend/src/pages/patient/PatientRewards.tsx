import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import PointsHero from '@/components/loyalty/PointsHero';
import RewardCard from '@/components/loyalty/RewardCard';
import MyRedemptionsList from '@/components/loyalty/MyRedemptionsList';
import LoyaltyLedgerList from '@/components/loyalty/LoyaltyLedgerList';

export default function PatientRewards() {
  const [summary, setSummary] = useState<any>({ pointsBalance: 0, lifetimePoints: 0, tier: 'Bronze' });
  const [catalog, setCatalog] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [tab, setTab] = useState<'catalog' | 'codes' | 'history'>('catalog');
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const load = async () => {
    try {
      const [s, c, r, l]: any[] = await Promise.all([
        api.get('/loyalty/summary').catch(() => ({ pointsBalance: 0, lifetimePoints: 0, tier: 'Bronze' })),
        api.get('/loyalty/catalog').catch(() => []),
        api.get('/loyalty/my-redemptions').catch(() => []),
        api.get('/loyalty/ledger').catch(() => []),
      ]);
      setSummary(s || { pointsBalance: 0, lifetimePoints: 0, tier: 'Bronze' });
      setCatalog(Array.isArray(c) ? c : c?.items || []);
      setRedemptions(Array.isArray(r) ? r : r?.items || []);
      setLedger(Array.isArray(l) ? l : l?.items || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Rewards load failed');
    }
  };

  useEffect(() => { load(); }, []);

  const redeem = async (id: string) => {
    if (!confirm('Points kharch honge, confirm?')) return;
    setRedeeming(id);
    try {
      const res: any = await api.post(`/loyalty/redeem/${id}`, {});
      toast.success(`Congratulations! Code: ${res.code}`);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Redeem failed');
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4 pb-16">
      <PointsHero balance={summary.pointsBalance || 0} lifetime={summary.lifetimePoints || 0} tier={summary.tier || 'Bronze'} />
      <div className="flex gap-2">
        {(['catalog', 'codes', 'history'] as const).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)} className="rounded-full capitalize">
            {t === 'catalog' ? 'Rewards' : t === 'codes' ? 'My Codes' : 'History'}
          </Button>
        ))}
      </div>
      {tab === 'catalog' && (
        <div className="grid sm:grid-cols-2 gap-3">
          {catalog.map((item: any) => {
            const unlocked = (summary.pointsBalance || 0) >= (item.pointsRequired || 0);
            return <RewardCard key={item._id} item={item} unlocked={unlocked} pointsNeeded={Math.max(0, (item.pointsRequired || 0) - (summary.pointsBalance || 0))} onRedeem={redeem} redeeming={redeeming === item._id} />;
          })}
          {!catalog.length && <p className="text-sm text-muted-foreground">Koi reward active nahi hai.</p>}
        </div>
      )}
      {tab === 'codes' && <MyRedemptionsList items={redemptions} />}
      {tab === 'history' && <LoyaltyLedgerList items={ledger} />}
    </div>
  );
}
