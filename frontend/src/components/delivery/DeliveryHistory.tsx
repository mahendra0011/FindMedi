'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/endpoints';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export interface DeliveryTask {
  _id: string;
  orderId?: string;
  status: string;
  pickupAddress?: string;
  dropAddress?: string;
  deliveryOtp?: string;
  createdAt?: string;
}

export interface DeliveryHistoryProps {
  onTaskClick?: (task: DeliveryTask) => void;
}

export default function DeliveryHistory({ onTaskClick }: DeliveryHistoryProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await api.getDeliveryHistory(user._id);
        setTasks((res.tasks as unknown) as DeliveryTask[]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load delivery history');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  if (isLoading && tasks.length === 0) {
    return <p className="text-muted-foreground">Loading delivery history...</p>;
  }

  const statusBadgeClass =
    tasks.length > 0 && tasks[0]?.status === 'Completed'
      ? 'default'
      : 'secondary';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && tasks.length === 0 ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : tasks.length === 0 ? (
          <p className="text-muted-foreground">No delivery history found</p>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task._id} className="p-4 rounded border">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {task.orderId || 'No Order ID'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(task.createdAt ?? Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={statusBadgeClass}>
                    {task.status}
                  </Badge>
                </div>
                {onTaskClick && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onTaskClick?.(task)}
                  >
                    View Details
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