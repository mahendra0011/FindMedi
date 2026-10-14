import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

export interface ElderCareCardProps {
  item: any;
  variant?: 'grid' | 'list' | 'compact' | 'map-pin';
  onPrimary?: () => void;
  onSecondary?: () => void;
}

/** Elder-care home / assisted living / hospice card — Spec 02 §2.31 */
export default function ElderCareCard({ item, variant = 'grid', onPrimary, onSecondary }: ElderCareCardProps) {
  const navigate = useNavigate();
  if (!item) return null;

  const chips: string[] = [];
  const careLevels: string[] = item.careLevels || ['Assisted Living', 'Dementia Care', 'Palliative'];
  chips.push(...careLevels.slice(0, 2));
  if (item.bedsAvailable) chips.push(`${item.bedsAvailable} Beds open`);
  if (item.staffRatio) chips.push(`${item.staffRatio} Staff ratio`);
  if (item.mealsIncluded) chips.push('Nutritious meals');

  const trust: string[] = [];
  if (item.verified || item.status === 'approved') trust.push('State Registered');
  if (item.nurse24x7) trust.push('24x7 Nursing');
  if (item.doctorOnCall) trust.push('Doctor on-call');
  if (item.physioSupport) trust.push('In-house Physio');

  const priceLine = item.monthlyPriceRange
    ? item.monthlyPriceRange
    : item.monthlyFrom
    ? `From ₹${item.monthlyFrom.toLocaleString('en-IN')}/mo`
    : undefined;

  return (
    <ProviderCardBase
      imageUrl={item.photos?.[0] || item.logo || item.imageUrl}
      title={item.name}
      verified={item.verified || item.status === 'approved'}
      subtitle={item.subtitle || 'Elder Care & Assisted Living'}
      overlayBadge={item.overlayBadge}
      ratingAvg={item.rating ?? item.ratingAvg ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      distanceKm={item.distanceKm ?? item.distance}
      openNow={item.openNow ?? item.open ?? null}
      openLabel={item.visitingHours ? `Visiting: ${item.visitingHours}` : undefined}
      chips={chips.slice(0, 4)}
      priceLine={priceLine}
      trustBadges={trust.slice(0, 3)}
      primaryLabel="Request Visit"
      secondaryLabel="Get Quote"
      onPrimary={onPrimary || (() => navigate(`/eldercare/${item._id || item.id}`))}
      onSecondary={onSecondary || (() => navigate(`/eldercare/${item._id || item.id}?quote=1`))}
      sponsored={item.isSponsored}
      variant={variant}
    />
  );
}
