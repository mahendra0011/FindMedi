'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/endpoints';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export interface EarningRecord {
  _id: string;
  amount: number;
  type: 'tips' | 'delivery' | 'bonus' | 'rating';
  description?: string;
  referenceId?: string;
  createdAt?: string;
}

export interface DeliveryEarningsProps {
  onEarningSelect?: (earning: EarningRecord) => void;
}

export default function DeliveryEarnings({ onEarningSelect }: DeliveryEarningsProps) {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await api.getDeliveryEarnings(user._id);
        setEarnings((res.earnings as unknown) as EarningRecord[]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load earnings');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  if (isLoading && earnings.length === 0) {
    return <p className="text-muted-foreground">Loading earnings...</p>;
  }

  const totalEarnings = earnings.reduce(
    (sum, e) => sum + (e.amount || 0),
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Earnings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <span>Total Earnings</span>
          <span className="font-medium">₹{totalEarnings}</span>
        </div>
        {isLoading && earnings.length === 0 ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : earnings.length === 0 ? (
          <p className="text-muted-foreground">No earnings recorded</p>
        ) : (
          <div className="space-y-3">
            {earnings.map((earning) => (
              <div key={earning._id} className="p-3 rounded border">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full" />
                  <div>
                    <p className="font-medium">{earning.description || 'Earning'}</p>
                    <p className="text-xs text-muted-foreground">
                      {earning.createdAt ? new Date(earning.createdAt).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <span className="font-medium">₹{earning.amount}</span>
                </div>
                {onEarningSelect && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onEarningSelect?.(earning)}
                  >
                    View
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}