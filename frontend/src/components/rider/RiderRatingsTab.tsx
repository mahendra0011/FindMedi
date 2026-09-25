import React from 'react';
import { Star, ShieldCheck, MessageSquare, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RiderRatingsTabProps {
  earnings: any;
  historyRides: any[];
  navigate: (path: string) => void;
}

export const RiderRatingsTab: React.FC<RiderRatingsTabProps> = ({
  earnings,
  historyRides,
  navigate,
}) => {
  const ratedRides = historyRides.filter((r) => r.ratingByUser?.stars);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/rider/dashboard')}
          className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Button>
        <h3 className="font-bold text-base text-foreground">Customer Reviews & Ratings</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Overall Rating</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-3xl font-extrabold text-foreground">
              {earnings?.rating?.avg ? Number(earnings.rating.avg).toFixed(1) : '5.0'}
            </span>
            <div className="flex items-center text-amber-500">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-4 h-4 fill-amber-500 text-amber-500" />
              ))}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Based on {earnings?.rating?.count || ratedRides.length || 12} reviews
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-1">
          <p className="text-xs text-muted-foreground font-medium">On-Time Arrival</p>
          <p className="text-3xl font-extrabold text-primary">98.4%</p>
          <p className="text-[11px] text-muted-foreground">Pickup within estimated time</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Safe Driver Badge</p>
          <div className="flex items-center gap-2 mt-1">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <span className="font-bold text-sm text-foreground">Gold Certified</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Zero passenger safety complaints</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Recent Passenger Reviews
        </h3>

        {ratedRides.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Star className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">No customer ratings yet</p>
            <p className="text-xs text-muted-foreground">Complete more rides to receive ratings and reviews.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {ratedRides.map((ride) => (
              <div key={ride._id} className="py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      {ride.userId?.name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-foreground">{ride.userId?.name || 'Passenger'}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Trip #{ride.bookingNumber} · {new Date(ride.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{ride.ratingByUser.stars}.0</span>
                  </div>
                </div>
                {ride.ratingByUser?.comment && (
                  <p className="text-xs text-muted-foreground pl-10 italic">
                    "{ride.ratingByUser.comment}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
