import React from 'react';
import { Star, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RiderHistoryTabProps {
  historyRides: any[];
  earnings: any;
  navigate: (path: string) => void;
}

export const RiderHistoryTab: React.FC<RiderHistoryTabProps> = ({
  historyRides,
  earnings,
  navigate,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/rider/dashboard')}
            className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Button>
          <h3 className="font-bold text-base text-foreground">Completed Rides History</h3>
        </div>
        <span className="text-xs text-muted-foreground">Total: {historyRides.length} rides</span>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
        {historyRides.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No completed trips in history yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Booking #</th>
                  <th className="py-3 px-4">Passenger</th>
                  <th className="py-3 px-4">Distance</th>
                  <th className="py-3 px-4">Gross Fare</th>
                  <th className="py-3 px-4">Your Earning ({earnings?.commissionPct != null ? `${100 - earnings.commissionPct}%` : '90%'})</th>
                  <th className="py-3 px-4">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {historyRides.map((ride) => (
                  <tr key={ride._id} className="hover:bg-muted/30">
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      {new Date(ride.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                      {ride.bookingNumber}
                    </td>
                    <td className="py-3.5 px-4 text-foreground font-medium">
                      {ride.userId?.name || 'Passenger'}
                    </td>
                    <td className="py-3.5 px-4">{ride.distanceKm || 0} km</td>
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      ₹{ride.fare?.total || 0}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-success">
                      ₹{Math.round((ride.fare?.total || 0) * 0.9)}
                    </td>
                    <td className="py-3.5 px-4">
                      {ride.ratingByUser?.stars ? (
                        <span className="flex items-center gap-1 text-amber-600 font-semibold">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          {ride.ratingByUser.stars}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
