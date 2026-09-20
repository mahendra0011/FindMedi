import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import ReferralCodeCard from '@/components/referral/ReferralCodeCard';
import ReferralHistoryList from '@/components/referral/ReferralHistoryList';

export default function PatientReferral() {
  const [code, setCode] = useState('');
  const [stats, setStats] = useState<any>({ totalReferred: 0, qualified: 0, pending: 0 });
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const c: any = await api.get('/referral/my-code').catch(() => ({}));
        setCode(c?.code || c?.referral?.code || '');
        const s: any = await api.get('/referral/stats').catch(() => ({}));
        setStats(s || {});
        const h: any = await api.get('/referral/my-history').catch(() => []);
        setHistory(Array.isArray(h) ? h : []);
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Referral load failed');
      }
    })();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-16">
      <ReferralCodeCard code={code} />
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total Referred', value: stats.totalReferred || 0 },
          { label: 'Qualified', value: stats.qualified || stats.rewarded || 0 },
          { label: 'Pending', value: stats.pending || 0 },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-black tabular-nums">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4 space-y-1 text-sm">
          <p className="font-bold">How it works</p>
          <p className="text-xs text-muted-foreground">1. Share code → 2. Friend signs up → 3. Dono ko reward (first qualifying action ke baad)</p>
        </CardContent>
      </Card>
      <ReferralHistoryList items={history} />
    </div>
  );
}
