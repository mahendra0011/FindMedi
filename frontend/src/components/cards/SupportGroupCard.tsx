import { Users, Calendar, ShieldCheck, HeartHandshake, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SupportGroupCardProps {
  item: {
    id?: string;
    _id?: string;
    title: string;
    topic?: string;
    hostName: string;
    hostRole?: string;
    schedule: string;
    mode: 'online' | 'in_person';
    isFree?: boolean;
    fee?: number;
    anonymityEnabled?: boolean;
    seatsLeft?: number;
    moderated?: boolean;
  };
  onJoin?: () => void;
}

export default function SupportGroupCard({ item, onJoin }: SupportGroupCardProps) {
  if (!item) return null;

  return (
    <div className="bg-card border rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg hover:border-primary/40 transition-all">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {item.topic || 'Support Circle'}
          </span>
          {item.anonymityEnabled && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <EyeOff className="w-2.5 h-2.5" /> Anonymous Option
            </span>
          )}
        </div>

        <div>
          <h3 className="font-bold text-base text-foreground leading-snug">{item.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hosted by <span className="font-semibold text-foreground">{item.hostName}</span> ({item.hostRole || 'Verified Facilitator'})
          </p>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-foreground font-medium">{item.schedule}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span>Mode: {item.mode === 'online' ? 'Secure Video Circle' : 'In-Person Safe Space'}</span>
            {item.seatsLeft !== undefined && <span className="text-primary font-semibold">({item.seatsLeft} spots open)</span>}
          </div>
        </div>
      </div>

      <div className="pt-4 mt-3 border-t flex items-center justify-between gap-3">
        <div>
          <span className="text-base font-bold text-foreground">
            {item.isFree || !item.fee ? 'Free / Voluntary Contribution' : `₹${item.fee} / session`}
          </span>
        </div>

        <Button size="sm" className="h-9 px-4 text-xs font-semibold shadow-sm" onClick={onJoin}>
          Join Circle
        </Button>
      </div>
    </div>
  );
}
