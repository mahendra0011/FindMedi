import { useState } from 'react';
import { Star, MapPin, BadgeCheck, Heart, Clock, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ProviderCardBaseProps {
  id?: string;
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
  variant?: 'list' | 'grid' | 'compact' | 'map-pin';
  className?: string;
}

function RatingText({ avg = 0, count = 0, discreet = false }: { avg?: number; count?: number; discreet?: boolean }) {
  if (discreet) {
    return <span className="text-xs text-muted-foreground font-medium">Verified Provider</span>;
  }
  if (!count || count < 3) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
        <Sparkles className="w-3 h-3" /> New
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-foreground">
      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
      <span>{avg > 0 ? avg.toFixed(1) : '—'}</span>
      <span className="text-muted-foreground font-normal">({count})</span>
    </span>
  );
}

/**
 * Universal Base Listing Card System
 * 
 * Consistent anatomy across 28+ health, medical, wellness, and transport provider types:
 * Media + Title + Subtitle + Rating + Key Facts (max 4) + Trust Row (max 3) + Next Slot + Price + CTAs.
 */
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
  variant = 'grid',
  className,
}: ProviderCardBaseProps) {
  const [imgError, setImgError] = useState(false);
  const showImg = imageUrl && !imgError;
  const initials = fallbackInitials || (title || '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const visibleChips = (chips || []).slice(0, 4);
  const extraChips = (chips || []).length - visibleChips.length;
  const visibleTrust = (trustBadges || []).slice(0, 3);
  const extraTrust = (trustBadges || []).length - visibleTrust.length;

  // ── Variant: Map Pin / Mini Popup ──
  if (variant === 'map-pin') {
    return (
      <div className={cn('bg-card border rounded-xl p-3 shadow-lg w-64 space-y-2 text-left', className)}>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
            {showImg ? (
              <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-xs text-primary">{initials}</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold truncate text-foreground">{title}</h4>
            {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <RatingText avg={ratingAvg} count={ratingCount} discreet={discreet} />
          {distanceKm && <span className="text-[11px] text-muted-foreground">{distanceKm} km</span>}
        </div>
        {priceLine && <p className="text-xs font-semibold text-emerald-600">{priceLine}</p>}
        <Button size="sm" className="w-full h-7 text-xs" onClick={onPrimary}>
          {primaryLabel}
        </Button>
      </div>
    );
  }

  // ── Variant: Compact List Row ──
  if (variant === 'compact') {
    return (
      <div className={cn('bg-card border rounded-xl p-3 flex items-center justify-between gap-3 hover:border-primary/30 transition-all', className)}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0">
            {showImg ? (
              <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-sm text-primary bg-primary/10">{initials}</div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h4 className="text-sm font-bold truncate text-foreground">{title}</h4>
              {verified && <BadgeCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            <div className="flex items-center gap-2 text-[11px] mt-0.5">
              <RatingText avg={ratingAvg} count={ratingCount} discreet={discreet} />
              {priceLine && <span className="font-semibold text-emerald-600">{priceLine}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onPrimary && (
            <Button size="sm" className="h-8 text-xs" onClick={onPrimary}>
              {primaryLabel}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Variant: Horizontal List (Desktop Search Results) ──
  if (variant === 'list') {
    return (
      <div
        className={cn(
          'group bg-card rounded-2xl border border-border/60 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300 flex flex-col md:flex-row',
          (unavailable || closed) && 'opacity-90',
          className
        )}
      >
        {/* Left: Media Thumbnail */}
        <div className="relative md:w-56 h-44 md:h-auto shrink-0 bg-muted overflow-hidden">
          {showImg ? (
            <img
              src={imageUrl}
              alt={discreet ? 'Provider photo' : title}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-muted">
              <span className="text-2xl font-bold text-primary">{initials}</span>
            </div>
          )}

          {overlayBadge && (
            <span className="absolute top-3 left-3 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground shadow">
              {overlayBadge}
            </span>
          )}

          {sponsored && (
            <span className="absolute bottom-2 left-2 text-[10px] font-semibold text-white/90 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md">
              Sponsored
            </span>
          )}

          {onToggleSave && (
            <button
              type="button"
              aria-label={saved ? 'Remove from saved' : 'Save'}
              aria-pressed={saved}
              onClick={onToggleSave}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm shadow flex items-center justify-center hover:bg-card transition-colors"
            >
              <Heart className={cn('w-4 h-4', saved ? 'text-rose-500 fill-rose-500' : 'text-muted-foreground')} />
            </button>
          )}
        </div>

        {/* Center: Details */}
        <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors leading-snug">
                    {title}
                  </h3>
                  {verified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
                </div>
                {subtitle && <p className="text-xs font-medium text-primary mt-0.5">{subtitle}</p>}
              </div>

              {priceLine && (
                <div className="text-right hidden sm:block">
                  <span className="text-sm sm:text-base font-bold text-emerald-600 block">{priceLine}</span>
                  <span className="text-[10px] text-muted-foreground">inclusive of taxes</span>
                </div>
              )}
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 flex-wrap text-xs">
              <RatingText avg={ratingAvg} count={ratingCount} discreet={discreet} />
              {distanceKm !== null && distanceKm !== undefined && distanceKm !== '' && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  {distanceKm} km away
                </span>
              )}
              {openNow !== null && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-[11px]',
                    closed
                      ? 'text-muted-foreground bg-muted'
                      : openNow
                      ? 'text-emerald-700 bg-emerald-500/10 dark:text-emerald-400'
                      : 'text-amber-700 bg-amber-500/10 dark:text-amber-400'
                  )}
                >
                  <Clock className="w-3 h-3" />
                  {closed ? 'Closed' : openLabel || (openNow ? 'Open Now' : 'Closed')}
                </span>
              )}
            </div>

            {/* Key fact chips */}
            {visibleChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {visibleChips.map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium bg-muted/60 text-foreground border border-border/50"
                  >
                    {c}
                  </span>
                ))}
                {extraChips > 0 && <span className="text-[10px] text-muted-foreground self-center">+{extraChips}</span>}
              </div>
            )}
          </div>

          {/* Bottom Bar: Trust + CTAs */}
          <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              {visibleTrust.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {visibleTrust.map((t, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                    >
                      <ShieldCheck className="w-2.5 h-2.5" /> {t}
                    </span>
                  ))}
                  {extraTrust > 0 && <span className="text-[10px] text-muted-foreground">+{extraTrust}</span>}
                </div>
              )}
              {nextSlotLabel && !unavailable && !closed && (
                <p className="text-xs text-muted-foreground">
                  Next Available: <span className="font-semibold text-foreground">{nextSlotLabel}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {priceLine && (
                <div className="text-left sm:hidden mr-auto">
                  <span className="text-sm font-bold text-emerald-600 block">{priceLine}</span>
                </div>
              )}
              {secondaryLabel && (
                <Button variant="outline" size="sm" className="h-9 px-3 text-xs" onClick={onSecondary}>
                  {secondaryLabel}
                </Button>
              )}
              {primaryLabel && (
                <Button size="sm" className="h-9 px-4 text-xs font-semibold shadow-sm" onClick={onPrimary} disabled={unavailable || closed}>
                  {primaryLabel}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Variant: Default Grid Card (Vertical) ──
  return (
    <div
      className={cn(
        'group bg-card rounded-2xl border border-border/60 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300 flex flex-col h-full',
        (unavailable || closed) && 'opacity-90',
        className
      )}
    >
      {/* Top Banner Cover */}
      <div className="relative">
        <div className="h-24 bg-gradient-to-br from-primary/20 via-primary/5 to-muted overflow-hidden">
          {overlayBadge && (
            <span className="absolute top-3 left-3 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground shadow">
              {overlayBadge}
            </span>
          )}
          {sponsored && (
            <span className="absolute top-3 left-3 text-[10px] font-semibold text-white/90 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md">
              Sponsored
            </span>
          )}
          {onToggleSave && (
            <button
              type="button"
              aria-label={saved ? 'Remove from saved' : 'Save'}
              aria-pressed={saved}
              onClick={onToggleSave}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm shadow flex items-center justify-center hover:bg-card transition-colors"
            >
              <Heart className={cn('w-4 h-4', saved ? 'text-rose-500 fill-rose-500' : 'text-muted-foreground')} />
            </button>
          )}
        </div>

        {/* Floating Avatar + Title */}
        <div className="px-4 -mt-8 flex items-end gap-3">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-card bg-muted shadow-md shrink-0">
            {showImg ? (
              <img
                src={imageUrl}
                alt={discreet ? 'Provider photo' : title}
                loading="lazy"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <span className="text-lg font-bold text-primary">{initials}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-base text-foreground leading-tight truncate group-hover:text-primary transition-colors" title={title}>
                {title}
              </h3>
              {verified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" aria-label="Verified" />}
            </div>
            {subtitle && <p className="text-xs font-medium text-primary truncate mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div className="px-4 pt-3 pb-4 space-y-3 flex-1 flex flex-col">
        {/* Meta row */}
        <div className="flex items-center gap-2.5 flex-wrap text-xs">
          <RatingText avg={ratingAvg} count={ratingCount} discreet={discreet} />
          {distanceKm !== null && distanceKm !== undefined && distanceKm !== '' && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {distanceKm} km
            </span>
          )}
          {openNow !== null && (
            <span
              className={cn(
                'inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-[11px]',
                closed
                  ? 'text-muted-foreground bg-muted'
                  : openNow
                  ? 'text-emerald-700 bg-emerald-500/10 dark:text-emerald-400'
                  : 'text-amber-700 bg-amber-500/10 dark:text-amber-400'
              )}
            >
              <Clock className="w-3 h-3" />
              {closed ? 'Closed' : openLabel || (openNow ? 'Open Now' : 'Closed')}
            </span>
          )}
        </div>

        {/* Key facts chips: max 4 */}
        {visibleChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visibleChips.map((c, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium bg-muted/60 text-foreground border border-border/50"
              >
                {c}
              </span>
            ))}
            {extraChips > 0 && <span className="text-[10px] text-muted-foreground self-center">+{extraChips}</span>}
          </div>
        )}

        {/* Price Line */}
        {priceLine && <p className="text-sm font-bold text-emerald-600">{priceLine}</p>}

        {/* Trust row: max 3 + n */}
        {visibleTrust.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {visibleTrust.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
              >
                <Check className="w-2.5 h-2.5" /> {t}
              </span>
            ))}
            {extraTrust > 0 && <span className="text-[10px] text-muted-foreground">+{extraTrust}</span>}
          </div>
        )}

        {/* Next slot or unavailable note */}
        {nextSlotLabel && !unavailable && !closed && (
          <p className="text-xs text-muted-foreground mt-auto">
            Next: <span className="font-semibold text-foreground">{nextSlotLabel}</span>
          </p>
        )}
        {(unavailable || closed) && (
          <p className="text-xs font-semibold text-amber-600 mt-auto">
            {closed ? 'Temporarily Closed' : unavailableLabel}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 mt-auto">
          {secondaryLabel && (
            <Button variant="outline" size="sm" className="flex-1 rounded-xl text-xs h-9" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          )}
          {primaryLabel && (
            <Button
              size="sm"
              className="flex-1 rounded-xl text-xs h-9 font-semibold shadow-sm"
              onClick={onPrimary}
              disabled={unavailable || closed}
            >
              {primaryLabel}
            </Button>
          )}
        </div>

        {onToggleCompare && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pt-1">
            <input type="checkbox" checked={compareChecked} onChange={onToggleCompare} className="w-3.5 h-3.5 accent-primary rounded" />
            Compare
          </label>
        )}
      </div>
    </div>
  );
}

export function ProviderCardSkeleton({ variant = 'grid' }: { variant?: 'list' | 'grid' | 'compact' }) {
  if (variant === 'list') {
    return (
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden animate-pulse flex flex-col md:flex-row h-44">
        <div className="w-56 bg-muted shrink-0" />
        <div className="p-5 flex-1 space-y-3">
          <div className="h-5 w-1/3 bg-muted rounded" />
          <div className="h-4 w-1/4 bg-muted rounded" />
          <div className="flex gap-2">
            <div className="h-5 w-20 bg-muted rounded-lg" />
            <div className="h-5 w-20 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-card rounded-2xl border border-border/50 overflow-hidden animate-pulse', variant === 'compact' && 'rounded-xl')}>
      <div className="h-24 bg-muted" />
      <div className="p-4 space-y-2.5">
        <div className="h-4 w-2/3 bg-muted rounded" />
        <div className="h-3 w-1/2 bg-muted rounded" />
        <div className="flex gap-1.5">
          <div className="h-5 w-16 bg-muted rounded-lg" />
          <div className="h-5 w-16 bg-muted rounded-lg" />
        </div>
        <div className="h-9 w-full bg-muted rounded-xl mt-3" />
      </div>
    </div>
  );
}

export function ProviderCardEmpty({ message = 'No providers found' }: { message?: string }) {
  return (
    <div className="bg-card rounded-2xl border border-dashed border-border p-8 text-center space-y-2">
      <p className="text-sm font-semibold text-foreground">{message}</p>
      <p className="text-xs text-muted-foreground">Try clearing filters or checking neighbouring cities.</p>
    </div>
  );
}
