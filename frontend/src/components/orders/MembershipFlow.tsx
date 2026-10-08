import React, { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import PriceBreakup from './PriceBreakup';
import StatusTimeline from './StatusTimeline';
import { neutralText } from '@/lib/discreet';

const JOURNEY = ['TRIAL', 'ACTIVE', 'FROZEN', 'RENEWED'];

/**
 * FLOW-D thin client: purchase a membership term, show price + term journey.
 * Price comes from the Plan row server-side; the body names plan + payment only.
 */
export default function MembershipFlow({
  planId,
  price = 0,
  discreet = false,
}: {
  planId: string;
  price?: number;
  discreet?: boolean;
}) {
  const [membership, setMembership] = useState<any>(null);
  const [autoRenew, setAutoRenew] = useState(false);
  const [loading, setLoading] = useState(false);

  const purchase = async () => {
    setLoading(true);
    try {
      const res = await api.dispatch(null, '/memberships', {
        method: 'POST',
        body: JSON.stringify({ planId, autoRenew }),
      });
      setMembership(res?.membership || res);
      toast.success('Membership activated');
    } catch (e: any) {
      toast.error(e?.message || 'Purchase failed');
    } finally {
      setLoading(false);
    }
  };

  const status: string = membership?.status || 'TRIAL';
  const steps = JOURNEY.map((key) => ({
    key,
    label: discreet ? neutralText(key, { discreet: true, kind: 'booking' }) : key,
    done: JOURNEY.indexOf(key) < JOURNEY.indexOf(status),
    current: key === status,
  }));

  return (
    <div className="space-y-3">
      <PriceBreakup lines={[{ name: 'Plan price', price }]} />
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} className="mt-0.5" />
        Auto-renew this term (e-mandate / UPI AutoPay reference stored, never the instrument).
      </label>
      <Button size="sm" className="w-full" disabled={loading} onClick={purchase}>
        {loading ? 'Processing…' : price > 0 ? `Pay ₹${price} & activate` : 'Activate (free)'}
      </Button>
      {membership && <StatusTimeline steps={steps} />}
    </div>
  );
}
