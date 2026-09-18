'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/endpoints';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export interface DeliveryOrder {
  _id: string;
  orderId?: string;
  customerName?: string;
  total?: number;
  status: string;
  createdAt?: string;
  items?: string[];
}

export interface DeliveryOrdersProps {
  onOrderSelect?: (order: DeliveryOrder) => void;
}

export default function DeliveryOrders({ onOrderSelect }: DeliveryOrdersProps) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await api.getDeliveryOrders(user._id);
        setOrders((res.orders as unknown) as DeliveryOrder[]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  if (isLoading && orders.length === 0) {
    return <p className="text-muted-foreground">Loading orders...</p>;
  }

  const statusBadgeClass =
    orders.length > 0 && orders[0]?.status === 'Delivered' ? 'default' : 'secondary';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && orders.length === 0 ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : orders.length === 0 ? (
          <p className="text-muted-foreground">No orders found</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order._id} className="p-4 rounded border">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {order.orderId || 'No Order ID'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt ?? Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">
                      ₹{order.total || 0}
                    </span>
                    <Badge variant={statusBadgeClass}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
                {onOrderSelect && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onOrderSelect?.(order)}
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