import { ShieldCheck, Clock, Home, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface HealthPackageCardProps {
  item: {
    id?: string;
    _id?: string;
    title: string;
    category?: string;
    testCount?: number;
    popularTests?: string[];
    fastingHours?: number;
    homeCollection?: boolean;
    tatHours?: number;
    mrp?: number;
    price: number;
    labName?: string;
    nablAccredited?: boolean;
    badge?: string;
  };
  onBook?: () => void;
  onViewDetails?: () => void;
}

export default function HealthPackageCard({ item, onBook, onViewDetails }: HealthPackageCardProps) {
  if (!item) return null;
  const discount = item.mrp && item.mrp > item.price ? Math.round(((item.mrp - item.price) / item.mrp) * 100) : 0;

  return (
    <div className="bg-card border rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg hover:border-primary/40 transition-all">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {item.category && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {item.category}
              </span>
            )}
            {item.nablAccredited && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                <ShieldCheck className="w-2.5 h-2.5" /> NABL Accredited
              </span>
            )}
          </div>
          {item.badge && (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
              {item.badge}
            </span>
          )}
        </div>

        <div>
          <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {item.testCount ? `${item.testCount} parameters covered` : 'Comprehensive Diagnostic Screening'} · By {item.labName || 'Verified Pathology Lab'}
          </p>
        </div>

        {/* Included parameters preview */}
        {item.popularTests && item.popularTests.length > 0 && (
          <div className="space-y-1 bg-muted/30 p-2.5 rounded-xl border border-border/40 text-xs">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">Key Tests Included:</span>
            <div className="flex flex-wrap gap-1.5">
              {item.popularTests.slice(0, 4).map((t, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 text-[11px] text-foreground font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Logistics facts */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
          {item.homeCollection !== false && (
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <Home className="w-3.5 h-3.5" /> Free Sample Collection
            </span>
          )}
          {item.fastingHours ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {item.fastingHours}h Fasting Required
            </span>
          ) : (
            <span>No Fasting</span>
          )}
          {item.tatHours && (
            <span className="inline-flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> Reports in {item.tatHours}h
            </span>
          )}
        </div>
      </div>

      <div className="pt-4 mt-3 border-t flex items-center justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-foreground">₹{item.price}</span>
            {item.mrp && item.mrp > item.price && (
              <span className="text-xs text-muted-foreground line-through">₹{item.mrp}</span>
            )}
            {discount > 0 && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                {discount}% OFF
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {onViewDetails && (
            <Button size="sm" variant="outline" className="h-9 text-xs" onClick={onViewDetails}>
              Details
            </Button>
          )}
          <Button size="sm" className="h-9 px-4 text-xs font-semibold shadow-sm" onClick={onBook}>
            Book Package
          </Button>
        </div>
      </div>
    </div>
  );
}
