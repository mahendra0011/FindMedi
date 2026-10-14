import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

export interface DialysisCardProps {
  item: any;
  variant?: 'grid' | 'list' | 'compact' | 'map-pin';
  onPrimary?: () => void;
  onSecondary?: () => void;
}

/** Dialysis centre card — Spec 02 §2.29 */
export default function DialysisCard({ item, variant = 'grid', onPrimary, onSecondary }: DialysisCardProps) {
  const navigate = useNavigate();
  if (!item) return null;

  const chips: string[] = [];
  if (item.machinesCount) chips.push(`${item.machinesCount} Machines`);
  if (item.shiftsCount) chips.push(`${item.shiftsCount} Shifts`);
  if (item.recurringSlotLabel || item.recurringSlotsAvailable) {
    chips.push(item.recurringSlotLabel || `${item.recurringSlotsAvailable} slots/wk open`);
  }
  if (item.transportAssistance) chips.push('Transport help');

  // Fill up to 4 chips
  const extraServices: string[] = item.services || item.specialties || [];
  for (const s of extraServices) {
    if (chips.length >= 4) break;
    chips.push(s);
  }

  const trust: string[] = [];
  if (item.verified || item.status === 'approved') trust.push('Verified');
  if (item.hbvHcvIsolation) trust.push('HBV/HCV Isolation');
  if (item.nephrologistOnCall) trust.push('Nephrologist on-call');
  if (item.pmjayAccepted || item.schemes?.includes('pmjay')) trust.push('PM-JAY Empanelled');
  if (item.waterRoCertified) trust.push('RO Water Tested');

  const priceLine = item.perSessionPrice
    ? `₹${item.perSessionPrice} / session`
    : item.priceFrom
    ? `From ₹${item.priceFrom}`
    : undefined;

  return (
    <ProviderCardBase
      imageUrl={item.photos?.[0] || item.logo || item.imageUrl}
      title={item.name}
      verified={item.verified || item.status === 'approved'}
      subtitle={item.subtitle || 'Dialysis Centre'}
      overlayBadge={item.overlayBadge}
      ratingAvg={item.rating ?? item.ratingAvg ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      distanceKm={item.distanceKm ?? item.distance}
      openNow={item.openNow ?? item.open ?? null}
      chips={chips.slice(0, 4)}
      priceLine={priceLine}
      trustBadges={trust.slice(0, 3)}
      nextSlotLabel={item.nextSlotAt || item.nextSlotLabel}
      primaryLabel="Book Recurring Slots"
      secondaryLabel="Call"
      onPrimary={onPrimary || (() => navigate(`/dialysis/${item._id || item.id}`))}
      onSecondary={onSecondary || (() => { if (item.phone) window.open(`tel:${item.phone}`); })}
      sponsored={item.isSponsored}
      variant={variant}
    />
  );
}
