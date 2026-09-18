'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/endpoints';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export interface DeliveryZone {
  _id: string;
  name: string;
  area: string;
  pinCode: string;
  isActive: boolean;
}

export interface DeliveryZoneProps {
  onZoneSelect?: (zone: DeliveryZone) => void;
}

export default function DeliveryZone({ onZoneSelect }: DeliveryZoneProps) {
  const { user } = useAuth();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await api.getDeliveryZones(user._id);
        setZones((res.zones as unknown) as DeliveryZone[]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load zones');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  if (isLoading && zones.length === 0) {
    return <p className="text-muted-foreground">Loading zones...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Zones</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && zones.length === 0 ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : zones.length === 0 ? (
          <p className="text-muted-foreground">No zones configured</p>
        ) : (
          <>
            {zones.map((zone) => (
              <div
                key={zone._id}
                className="p-3 rounded border flex flex-col"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">{zone.name}</span>
                  <Badge
                    variant={zone.isActive ? 'default' : 'destructive'}
                  >
                    {zone.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {zone.area} • {zone.pinCode}
                </p>
                {onZoneSelect && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onZoneSelect?.(zone)}
                  >
                    View
                  </Button>
                )}
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}