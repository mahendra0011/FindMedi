import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

/** Physiotherapist / Rehab card — rolesmd/3.md §2.12 */
export default function PhysioCard({ item, onPrimary, onSecondary }: any) {
  const navigate = useNavigate();
  if (!item) return null;
  const chips = [...(item.focus || item.specialties || [])].slice(0, 3);
  if (item.homeVisit && chips.length < 4) chips.push(`Home visit ${item.homeRadiusKm ? `· ${item.homeRadiusKm} km` : ''}`.trim());
  const trust: string[] = [];
  if (item.verified) trust.push('Verified');
  if (item.equipmentAvailable) trust.push('Equipment available');
  return (
    <ProviderCardBase
      imageUrl={item.photo || item.imageUrl}
      fallbackInitials={item.name}
      title={item.name}
      verified={item.verified}
      subtitle="Physiotherapist"
      ratingAvg={item.rating ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      distanceKm={item.distanceKm}
      openNow={item.openNow ?? null}
      chips={chips}
      priceLine={item.sessionPrice ? `₹${item.sessionPrice}/session` : item.packagePrice ? `10 sessions ₹${item.packagePrice}` : undefined}
      trustBadges={trust}
      nextSlotLabel={item.nextSlotAt}
      primaryLabel={item.homeVisit ? 'Book home visit' : 'Book session'}
      secondaryLabel="View"
      onPrimary={onPrimary || (() => navigate(`/practitioner/${item._id || item.id}`))}
      onSecondary={onSecondary}
    />
  );
}
