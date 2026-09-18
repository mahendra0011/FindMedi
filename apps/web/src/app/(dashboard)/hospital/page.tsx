'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { request } from '@/lib/api/client';
import { withQuery } from '@/lib/utils';
import { toast } from 'sonner';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export interface HospitalBed {
  _id: string;
  ward: string;
  bedNumber: string;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
  patientName?: string;
  admittedAt?: string;
}

export default function HospitalDashboard() {
  const { user } = useAuth();
  const [beds, setBeds] = useState<HospitalBed[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await request<HospitalBed[] | { beds: HospitalBed[] }>(
          withQuery('/beds', { hospitalId: user._id }),
        );
        setBeds(Array.isArray(res) ? res : (res.beds ?? []));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load beds');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  if (isLoading && beds.length === 0) {
    return <p className="text-muted-foreground">Loading hospital beds...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hospital Bed Management</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && beds.length === 0 ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : beds.length === 0 ? (
          <p className="text-muted-foreground">No beds found</p>
        ) : (
          <div className="space-y-3">
            {beds.map((bed) => (
              <div key={bed._id} className="p-3 rounded border">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full" />
                  <div>
                    <p className="font-medium">{bed.bedNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      Ward: {bed.ward}
                    </p>
                  </div>
                  <span className="mt-1 px-2 rounded text-xs font-medium">
                    {bed.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}