import { useState } from 'react';
import { Star, MapPin, BadgeCheck, Heart, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ProviderCardBaseProps {
  imageUrl?: string;
  fallbackInitials?: string;
  title: string;
  verified?: boolean;
  subtitle?: string;
  overlayBadge?: string;
  ratingAvg?: number;
  ratingCount?: number;
  distanceKm?: string | number | null;
  openNow?: boolean | null;
  openLabel?: string;
  chips?: string[];
  priceLine?: string;
  trustBadges?: string[];
  nextSlotLabel?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  sponsored?: boolean;
  saved?: boolean;
  onToggleSave?: () => void;
  compareChecked?: boolean;
  onToggleCompare?: () => void;
  discreet?: boolean;
  unavailable?: boolean;
  unavailableLabel?: string;
  closed?: boolean;
  variant?: 'list' | 'grid' | 'compact';
}

function RatingText({ avg = 0, count = 0, discreet = false }: { avg?: number; count?: number; discreet?: boolean }) {
  if (discreet) return <span className="text-xs text-muted-foreground">Rated</span>;
  if (!count || count < 3) {
    return <span className="text-xs font-medium text-muted-foreground">New</span>;
  }
  return (
    <span className="flex items-center gap-1">
      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
      <span className="text-sm font-bold text-foreground">{avg > 0 ? avg.toFixed(1) : '—'}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </span>
  );
}

/** Base anatomy per rolesmd/3.md §1: media, title+verified, subtitle, rating/distance/open-now,
 *  chips max 4, price, trust row max 3, next-slot, primary/secondary CTA, save/compare, sponsored. */
export default function ProviderCardBase({
  imageUrl,
  fallbackInitials,
  title,
  verified,
  subtitle,
  overlayBadge,
  ratingAvg = 0,
  ratingCount = 0,
  distanceKm,
  openNow = null,
  openLabel,
  chips = [],
  priceLine,
  trustBadges = [],
  nextSlotLabel,
  primaryLabel = 'Book',
  secondaryLabel = 'View',
  onPrimary,
  onSecondary,
  sponsored = false,
  saved = false,
  onToggleSave,
  compareChecked = false,
  onToggleCompare,
  discreet = false,
  unavailable = false,
  unavailableLabel = 'Not accepting bookings',
  closed = false,
  variant = 'list',
}: ProviderCardBaseProps) {
  const [imgError, setImgError] = useState(false);
  const showImg = imageUrl && !imgError;
  const initials = fallbackInitials || (title || '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const visibleChips = (chips || []).slice(0, 4);
  const extraChips = (chips || []).length - visibleChips.length;
  const visibleTrust = (trustBadges || []).slice(0, 3);
  const extraTrust = (trustBadges || []).length - visibleTrust.length;

  return (
    <div
      className={cn(
        'group bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 flex flex-col h-full',
        variant === 'compact' && 'rounded-xl',
        (unavailable || closed) && 'opacity-90'
      )}
    >
      {/* Media + title */}
      <div className="relative">
        <div className={cn('bg-gradient-to-br from-primary/15 via-primary/5 to-primary/10', variant === 'compact' ? 'h-16' : 'h-24')} />
        {overlayBadge && (
          <span className="absolute top-3 left-3 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-violet-500/90 text-white shadow">
            {overlayBadge}
          </span>
        )}
        {sponsored && (
          <span className="absolute bottom-2 left-4 text-[10px] font-medium text-white/80 bg-black/40 px-1.5 py-0.5 rounded">
            Sponsored
          </span>
        )}
        <button
          type="button"
          aria-label={saved ? 'Remove from saved' : 'Save'}
          aria-pressed={saved}
          onClick={onToggleSave}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white"
        >
          <Heart className={cn('w-4 h-4', saved ? 'text-red-500 fill-red-500' : 'text-muted-foreground')} />
        </button>
        <div className="px-4 -mt-8 flex items-end gap-3">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-card bg-muted shadow-md shrink-0">
            {showImg ? (
              <img src={imageUrl} alt={discreet ? 'Provider photo' : title} loading="lazy" onError={() => setImgError(true)} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <span className="text-lg font-bold text-primary">{initials}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-heading font-bold text-base text-foreground leading-tight truncate" title={title}>
                {title}
              </h3>
              {verified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" aria-label="Verified" />}
            </div>
            {subtitle && <p className="text-xs font-medium text-primary truncate">{subtitle}</p>}
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-4 space-y-3 flex-1 flex flex-col">
        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <RatingText avg={ratingAvg} count={ratingCount} discreet={discreet} />
          {distanceKm !== null && distanceKm !== undefined && distanceKm !== '' && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="sr-only">Distance</span>
              {distanceKm} km
            </span>
          )}
          {openNow !== null && (
            <span className={cn(
              'inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-md',
              closed ? 'text-muted-foreground bg-muted/50' : openNow ? 'text-green-600 bg-green-500/10' : 'text-amber-600 bg-amber-500/10'
            )}>
              <Clock className="w-3 h-3" />
              {closed ? 'Closed' : openLabel || (openNow ? 'Open now' : 'Closed')}
            </span>
          )}
        </div>

        {/* Key facts: max 4 */}
        {visibleChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visibleChips.map((c, i) => (
              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium bg-primary/5 text-primary border border-primary/10">
                {c}
              </span>
            ))}
            {extraChips > 0 && <span className="text-[10px] text-muted-foreground">+{extraChips}</span>}
          </div>
        )}

        {priceLine && <p className="text-sm font-semibold text-emerald-600">{priceLine}</p>}

        {/* Trust row: max 3 +n */}
        {visibleTrust.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {visibleTrust.map((t, i) => (
              <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20">
                {t}
              </span>
            ))}
            {extraTrust > 0 && <span className="text-[10px] text-muted-foreground">+{extraTrust}</span>}
          </div>
        )}

        {nextSlotLabel && !unavailable && !closed && (
          <p className="text-xs text-muted-foreground">Next: <span className="font-medium text-foreground">{nextSlotLabel}</span></p>
        )}
        {(unavailable || closed) && (
          <p className="text-xs font-medium text-amber-600">{closed ? 'Temporarily closed' : unavailableLabel}</p>
        )}

        <div className="flex gap-2 pt-1 mt-auto">
          {secondaryLabel && (
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 rounded-xl text-[11px] h-9" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          )}
          {primaryLabel && (
            <Button variant="default" size="sm" className="flex-1 gap-1.5 rounded-xl text-[11px] h-9 shadow-lg shadow-primary/20" onClick={onPrimary} disabled={unavailable || closed}>
              {primaryLabel}
            </Button>
          )}
        </div>
        {onToggleCompare && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={compareChecked} onChange={onToggleCompare} className="w-4 h-4 accent-primary" />
            Compare
          </label>
        )}
      </div>
    </div>
  );
}

export function ProviderCardSkeleton({ variant = 'list' }: { variant?: 'list' | 'grid' | 'compact' }) {
  return (
    <div className={cn('bg-card rounded-2xl border border-border/50 overflow-hidden animate-pulse', variant === 'compact' && 'rounded-xl')}>
      <div className="h-24 bg-muted" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-2/3 bg-muted rounded" />
        <div className="h-3 w-1/2 bg-muted rounded" />
        <div className="flex gap-1.5">
          <div className="h-5 w-16 bg-muted rounded-lg" />
          <div className="h-5 w-16 bg-muted rounded-lg" />
        </div>
        <div className="h-9 w-full bg-muted rounded-xl" />
      </div>
    </div>
  );
}

export function ProviderCardEmpty({ message = 'No providers found' }: { message?: string }) {
  return (
    <div className="bg-card rounded-2xl border border-dashed border-border p-8 text-center">
      <p className="text-sm font-medium text-foreground">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">Try adjusting filters or location.</p>
    </div>
  );
}
