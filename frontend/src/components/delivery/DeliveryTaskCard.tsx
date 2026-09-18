'use client';

import React, { useState } from 'react';
import { Package, MapPin, Phone, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export interface DeliveryTask {
  _id: string;
  orderId?: string;
  status: string;
  pickupAddress?: string;
  dropAddress?: string;
  deliveryOtp?: string;
  orderRef?: {
    phone?: string;
    total?: number;
  };
}

export interface DeliveryTaskCardProps {
  task: DeliveryTask;
  onUpdateStatus?: (taskId: string, status: string) => Promise<void>;
  onVerifyOtp?: (taskId: string, otp: string) => Promise<void>;
}

export default function DeliveryTaskCard({
  task,
  onUpdateStatus,
  onVerifyOtp,
}: DeliveryTaskCardProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'picked_up':
      case 'in_transit':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'assigned':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border/40';
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!onUpdateStatus) return;
    setLoading(true);
    try {
      await onUpdateStatus(task._id, newStatus);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!onVerifyOtp || !otp.trim()) return;
    setLoading(true);
    try {
      await onVerifyOtp(task._id, otp.trim());
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const isDelivered = task.status.toLowerCase() === 'delivered';

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-mono font-medium text-foreground">
              #{task.orderId || task._id.slice(-6)}
            </span>
            {task.orderRef?.total !== undefined && (
              <span className="text-xs font-semibold text-foreground ml-2">
                ₹{task.orderRef.total}
              </span>
            )}
          </div>
        </div>
        <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${getStatusColor(task.status)}`}>
          {task.status}
        </Badge>
      </div>

      <div className="space-y-2 text-xs">
        {task.pickupAddress && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground">Pickup: </span>
              {task.pickupAddress}
            </div>
          </div>
        )}
        {task.dropAddress && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground">Drop: </span>
              {task.dropAddress}
            </div>
          </div>
        )}
      </div>

      {task.orderRef?.phone && (
        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> Customer Phone
          </span>
          <a
            href={`tel:${task.orderRef.phone}`}
            className="font-medium text-primary hover:underline"
          >
            {task.orderRef.phone}
          </a>
        </div>
      )}

      {!isDelivered && (
        <div className="pt-2 border-t border-border/40 space-y-3">
          {task.status.toLowerCase() === 'assigned' && onUpdateStatus && (
            <Button
              size="sm"
              className="w-full text-xs font-semibold h-8"
              disabled={loading}
              onClick={() => handleStatusChange('picked_up')}
            >
              <Clock className="w-3.5 h-3.5 mr-1.5" /> Mark as Picked Up
            </Button>
          )}

          {(task.status.toLowerCase() === 'picked_up' || task.status.toLowerCase() === 'in_transit') && (
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter 4-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="h-8 text-xs font-mono"
              />
              <Button
                size="sm"
                className="text-xs font-semibold h-8 shrink-0"
                disabled={loading || !otp.trim()}
                onClick={handleVerify}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Verify & Complete
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
