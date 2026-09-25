import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface RiderVehicleTabProps {
  vehicle: any;
  navigate: (path: string) => void;
}

export const RiderVehicleTab: React.FC<RiderVehicleTabProps> = ({
  vehicle,
  navigate,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/rider/dashboard')}
          className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Button>
        <h3 className="font-bold text-base text-foreground">Registered Vehicle Information</h3>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <p className="text-muted-foreground">Vehicle Type</p>
            <p className="font-bold text-foreground capitalize mt-0.5">
              {vehicle?.type?.replace('_', ' ') || 'Cab'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Brand & Model</p>
            <p className="font-semibold text-foreground mt-0.5">
              {vehicle?.brand} {vehicle?.model}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Registration Number (RC No.)</p>
            <p className="font-mono font-bold text-primary mt-0.5">
              {vehicle?.rcNumber || 'Pending RC'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Fuel Type</p>
            <p className="font-medium text-foreground mt-0.5">{vehicle?.fuelType || 'Petrol'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Passenger Capacity</p>
            <p className="font-medium text-foreground mt-0.5">{vehicle?.capacity || 4} seats</p>
          </div>
          <div>
            <p className="text-muted-foreground">Verification Status</p>
            <Badge variant={vehicle?.isDocumentVerified ? 'default' : 'secondary'} className="mt-1 text-[10px]">
              {vehicle?.isDocumentVerified ? 'Verified by Admin' : 'Pending Verification'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};
