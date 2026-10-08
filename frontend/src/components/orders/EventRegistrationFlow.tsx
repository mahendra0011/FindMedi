import React, { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import PriceBreakup from './PriceBreakup';
import StatusTimeline from './StatusTimeline';
import { neutralText } from '@/lib/discreet';

const JOURNEY = ['REGISTERED', 'CHECKED_IN', 'ATTENDED'];

/**
 * FLOW-E thin client: register for an event, show fee + registration journey.
 * Seat claim is atomic server-side; duplicate registration is a 409.
 */
export default function EventRegistrationFlow({
  eventId,
  fee = 0,
  discreet = false,
}: {
  eventId: string;
  fee?: number;
  discreet?: boolean;
}) {
  const [registration, setRegistration] = useState<any>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const register = async () => {
    setLoading(true);
    try {
      const res = await api.dispatch(null, `/events/${eventId}/register`, {
        method: 'POST',
        body: JSON.stringify({ consentGiven: consent }),
      });
      setRegistration(res?.registration || res);
      toast.success('Registered');
    } catch (e: any) {
      toast.error(e?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const status: string = registration?.status || 'REGISTERED';
  const steps = JOURNEY.map((key) => ({
    key,
    label: discreet ? neutralText(key, { discreet: true, kind: 'booking' }) : key,
    done: JOURNEY.indexOf(key) < JOURNEY.indexOf(status),
    current: key === status,
  }));

  return (
    <div className="space-y-3">
      <PriceBreakup lines={[{ name: 'Event fee', price: fee }]} />
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
        I consent to event data capture as described by the organiser.
      </label>
      <Button size="sm" className="w-full" disabled={loading} onClick={register}>
        {loading ? 'Registering…' : fee > 0 ? `Pay ₹${fee} & register` : 'Register (free)'}
      </Button>
      {registration && <StatusTimeline steps={steps} />}
    </div>
  );
}
