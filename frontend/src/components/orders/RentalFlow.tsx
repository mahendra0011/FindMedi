import React, { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import PriceBreakup from './PriceBreakup';
import StatusTimeline from './StatusTimeline';
import { neutralText, isSensitiveCategory } from '@/lib/discreet';

const JOURNEY = ['REQUESTED', 'CONFIRMED', 'DELIVERED', 'ACTIVE', 'RETURNED'];

/**
 * FLOW-G thin client: request a unit, track the rental journey, confirm return.
 * Server owns pricing (rate/deposit from the AssetUnit); the body carries dates only.
 */
export default function RentalFlow({ assetUnitId, discreet = false }: { assetUnitId: string; discreet?: boolean }) {
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [rental, setRental] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const request = async () => {
    if (!startAt || !endAt) {
      toast.error('Pick start and end dates');
      return;
    }
    setLoading(true);
    try {
      const res = await api.dispatch(null, '/rentals', {
        method: 'POST',
        body: JSON.stringify({ assetUnitId, startAt, endAt }),
      });
      setRental(res?.rental || res);
      toast.success('Rental requested');
    } catch (e: any) {
      toast.error(e?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const status: string = rental?.status || 'REQUESTED';
  const steps = JOURNEY.map((key) => ({
    key,
    label: discreet || isSensitiveCategory('rental') ? neutralText(key, { discreet: true, kind: 'booking' }) : key,
    done: JOURNEY.indexOf(key) < JOURNEY.indexOf(status),
    current: key === status,
  }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input type="date" aria-label="Start date" className="h-9 px-2 rounded-xl border border-border bg-background text-sm" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        <input type="date" aria-label="End date" className="h-9 px-2 rounded-xl border border-border bg-background text-sm" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
      </div>
      <Button size="sm" className="w-full" disabled={loading} onClick={request}>
        {loading ? 'Requesting…' : 'Request rental'}
      </Button>
      {rental && (
        <>
          <PriceBreakup
            lines={[
              { name: `Rate × ${rental.days ?? 1} day(s)`, price: rental.rentalAmount ?? 0 },
              { name: 'Deposit (refundable)', price: rental.deposit ?? 0 },
            ]}
          />
          <StatusTimeline steps={steps} />
        </>
      )}
    </div>
  );
}
