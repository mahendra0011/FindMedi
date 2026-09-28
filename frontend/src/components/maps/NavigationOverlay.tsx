import { useMemo } from 'react';
import {
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  CornerUpLeft,
  CornerUpRight,
  RotateCcw,
  RotateCw,
  Undo2,
  MapPin,
  Flag,
  Merge,
  Split,
  Navigation2,
  Volume2,
  VolumeX,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  formatDistanceMeters,
  formatDuration,
  maneuverIconKey,
  type Maneuver,
  type ManeuverIconKey,
} from '@/lib/navigation';

/**
 * Icon per maneuver key. A lookup rather than a switch inside render, so an
 * unknown key can never crash the banner mid-drive.
 */
const MANEUVER_ICONS: Record<ManeuverIconKey, typeof ArrowUp> = {
  depart: Navigation2,
  destination: Flag,
  continue: ArrowUp,
  'turn-left': ArrowLeft,
  'turn-right': ArrowRight,
  'turn-slight-left': CornerUpLeft,
  'turn-slight-right': CornerUpRight,
  'turn-sharp-left': RotateCcw,
  'turn-sharp-right': RotateCw,
  uturn: Undo2,
  roundabout: RotateCw,
  merge: Merge,
  fork: Split,
  ramp: CornerUpRight,
};

export interface NavigationOverlayProps {
  /** Maneuver the driver is currently heading toward, if known. */
  maneuver?: Maneuver | null;
  /** Distance to that maneuver, in metres. */
  distanceToManeuverMeters?: number;
  /** Distance still to travel on the whole route, in metres. */
  remainingRouteMeters?: number;
  /** Estimated seconds left on the route. */
  remainingSeconds?: number;
  /** Label for the destination, shown in the footer. */
  destinationLabel?: string;
  /** Distance the driver has drifted off the route, in metres. */
  offRouteMeters?: number;
  /** True when we currently consider the user off-route. */
  isOffRoute?: boolean;
  /** Voice guidance mute state, controlled by the parent. */
  muted?: boolean;
  onToggleMute?: () => void;
  onExit?: () => void;
  /** Hide the mute control when the browser has no speechSynthesis. */
  voiceSupported?: boolean;
  className?: string;
}

/**
 * Full-screen turn-by-turn HUD rendered above the map.
 *
 * Presentational only — it renders whatever the parent's navigation loop has
 * already computed, so it stays easy to test and cannot itself drive reroutes.
 * The container is `pointer-events-none` while the controls opt back in with
 * `pointer-events-auto`, so the map underneath stays pannable.
 */
export default function NavigationOverlay({
  maneuver,
  distanceToManeuverMeters = 0,
  remainingRouteMeters = 0,
  remainingSeconds = 0,
  destinationLabel,
  offRouteMeters = 0,
  isOffRoute = false,
  muted = false,
  onToggleMute,
  onExit,
  voiceSupported = true,
  className,
}: NavigationOverlayProps) {
  const iconKey = useMemo(() => maneuverIconKey(maneuver?.instruction), [maneuver?.instruction]);
  const ManeuverIcon = MANEUVER_ICONS[iconKey] ?? ArrowUp;

  const isArriving = iconKey === 'destination';
  // Once the final step is selected the banner switches to the arrival
  // treatment rather than showing a distance to the destination pin.
  const headline = isArriving
    ? (destinationLabel ? `Arriving at ${destinationLabel}` : 'Arriving at destination')
    : (maneuver?.instruction || 'Continue on route');

  const street = !isArriving && maneuver?.streetNames?.length
    ? ` onto ${maneuver.streetNames[0]}`
    : '';

  const eta = useMemo(() => {
    if (!Number.isFinite(remainingSeconds) || remainingSeconds <= 0) return null;
    const at = new Date(Date.now() + remainingSeconds * 1000);
    return at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [remainingSeconds]);

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 z-20 flex flex-col justify-between', className)}
      role="status"
      aria-live="polite"
    >


      {/* ── Turn banner ── */}
      <div className="pointer-events-auto p-3 sm:p-4">
        <div
          className={cn(
            'flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-md',
            isArriving
              ? 'border-emerald-500 bg-emerald-600/95 text-white'
              : 'border-border bg-background/95 text-foreground',
          )}
        >
          <div
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl',
              isArriving ? 'bg-white/20' : 'bg-primary/10 text-primary',
            )}
          >
            <ManeuverIcon className="h-8 w-8" strokeWidth={2.25} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold leading-none tabular-nums">
                {formatDistanceMeters(distanceToManeuverMeters)}
              </span>
              {street && (
                <span className={cn('truncate text-xs', isArriving ? 'text-white/80' : 'text-muted-foreground')}>
                  {street}
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-sm font-medium leading-tight">{headline}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {voiceSupported && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={muted ? 'Unmute voice guidance' : 'Mute voice guidance'}
                onClick={onToggleMute}
                className={cn('h-9 w-9', isArriving && 'text-white hover:bg-white/20')}
              >
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Exit navigation"
              onClick={onExit}
              className={cn('h-9 w-9', isArriving && 'text-white hover:bg-white/20')}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* ── Off-route warning ── */}
        {isOffRoute && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/95 px-3 py-2 text-xs font-semibold text-amber-950 shadow-md">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Off route by {formatDistanceMeters(offRouteMeters)} — recalculating…</span>
          </div>
        )}
      </div>


      {/* ── Bottom stats bar ── */}
      <div className="pointer-events-auto p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Remaining</p>
              <p className="font-semibold tabular-nums">{formatDistanceMeters(remainingRouteMeters)}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">ETA</p>
              <p className="font-semibold tabular-nums">{formatDuration(remainingSeconds)}</p>
            </div>
            {eta && (
              <>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Arrive</p>
                  <p className="font-semibold tabular-nums">{eta}</p>
                </div>
              </>
            )}
          </div>

          {destinationLabel && (
            <Badge variant="secondary" className="max-w-[45%] gap-1 truncate text-[11px]">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{destinationLabel}</span>
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

