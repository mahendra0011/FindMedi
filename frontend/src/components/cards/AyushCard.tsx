import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

/** AYUSH clinic / practitioner card — rolesmd/3.md §2.11 */
export default function AyushCard({ item, onPrimary, onSecondary }: any) {
  const navigate = useNavigate();
  if (!item) return null;
  const chips = [item.system, ...(item.specialties || item.focus || [])].filter(Boolean).slice(0, 4);
  if (item.inHouseMedicines && chips.length < 4) chips.push('In-house medicines');
  const trust: string[] = [];
  if (item.councilVerified || item.verified) trust.push('Council-verified');
  if (item.system) trust.push(item.system);
  return (
    <ProviderCardBase
      imageUrl={item.photo || item.photos?.[0] || item.imageUrl}
      fallbackInitials={item.name}
      title={item.name}
      verified={item.councilVerified || item.verified}
      subtitle={item.system ? `${item.system} · ${item.specialty || 'AYUSH'}` : 'AYUSH'}
      ratingAvg={item.rating ?? item.ratingAvg ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      distanceKm={item.distanceKm ?? item.distance}
      openNow={item.openNow ?? null}
      chips={chips}
      priceLine={item.fee ? `₹${item.fee} consult` : undefined}
      trustBadges={trust}
      nextSlotLabel={item.nextSlotAt || item.nextSlotLabel}
      primaryLabel="Book"
      secondaryLabel="View"
      onPrimary={onPrimary || (() => navigate(`/ayush/${item._id || item.id}`))}
      onSecondary={onSecondary}
    />
  );
}
