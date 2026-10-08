import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

/** Eye hospital / Optical card — rolesmd/3.md §2.10 */
export default function EyeCard({ item, onPrimary, onSecondary }: any) {
  const navigate = useNavigate();
  if (!item) return null;
  const services: string[] = item.services || item.specialties || [];
  const chips = services.slice(0, 3);
  if (item.freeEyeTest) chips.push('Free eye test');
  const trust: string[] = [];
  if (item.verified || item.status === 'approved') trust.push('Verified');
  if (item.nabh) trust.push('NABH');
  if (item.campAvailable) trust.push('Eye camps');
  return (
    <ProviderCardBase
      imageUrl={item.photos?.[0] || item.logo || item.imageUrl}
      title={item.name}
      verified={item.verified || item.status === 'approved'}
      subtitle={item.kind === 'optical' ? 'Optical store' : 'Eye hospital'}
      ratingAvg={item.rating ?? item.ratingAvg ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      distanceKm={item.distanceKm ?? item.distance}
      openNow={item.openNow ?? item.open ?? null}
      chips={chips.slice(0, 4)}
      priceLine={item.eyeTestPrice ? `Eye test ₹${item.eyeTestPrice}` : item.priceFrom ? `From ₹${item.priceFrom}` : undefined}
      trustBadges={trust}
      nextSlotLabel={item.nextSlotAt || item.nextSlotLabel}
      primaryLabel="Book eye test"
      secondaryLabel="Directions"
      onPrimary={onPrimary || (() => navigate(`/eye/${item._id || item.id}`))}
      onSecondary={onSecondary}
      sponsored={item.isSponsored}
    />
  );
}
