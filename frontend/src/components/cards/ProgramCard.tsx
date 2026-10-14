import { Award, Clock, Users, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ProgramCardProps {
  item: {
    id?: string;
    _id?: string;
    title: string;
    category?: string;
    duration?: string;
    includes?: string[];
    outcomes?: string;
    trialAvailable?: boolean;
    monthlyPrice?: number;
    totalPrice?: number;
    enrolledCount?: number;
  };
  onEnroll?: () => void;
  onTalkAdvisor?: () => void;
}

export default function ProgramCard({ item, onEnroll, onTalkAdvisor }: ProgramCardProps) {
  if (!item) return null;

  return (
    <div className="bg-card border rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg hover:border-primary/40 transition-all">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {item.category || 'Care Program'}
          </span>
          {item.duration && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
              <Clock className="w-3.5 h-3.5" /> {item.duration}
            </span>
          )}
        </div>

        <div>
          <h3 className="font-bold text-base text-foreground leading-snug">{item.title}</h3>
          {item.outcomes && (
            <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 shrink-0" /> {item.outcomes}
            </p>
          )}
        </div>

        {item.includes && item.includes.length > 0 && (
          <div className="space-y-1.5 pt-1 text-xs">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">Program Includes:</span>
            {item.includes.slice(0, 3).map((inc, idx) => (
              <div key={idx} className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{inc}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 mt-4 border-t flex items-center justify-between gap-3">
        <div>
          <span className="text-base font-bold text-foreground">
            ₹{item.monthlyPrice ? `${item.monthlyPrice}/mo` : item.totalPrice}
          </span>
          {item.trialAvailable && <p className="text-[10px] text-primary font-medium">7-Day Trial Available</p>}
        </div>

        <div className="flex gap-2">
          {onTalkAdvisor && (
            <Button size="sm" variant="outline" className="h-9 text-xs" onClick={onTalkAdvisor}>
              Advisor
            </Button>
          )}
          <Button size="sm" className="h-9 px-4 text-xs font-semibold shadow-sm" onClick={onEnroll}>
            Enroll
          </Button>
        </div>
      </div>
    </div>
  );
}
