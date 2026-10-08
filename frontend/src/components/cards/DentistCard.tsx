import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

/** Dentist / Dental clinic card — rolesmd/3.md §2.9 */
export default function DentistCard({ item, onPrimary, onSecondary }: any) {
  const navigate = useNavigate();
  if (!item) return null;
  const specialties: string[] = item.specialties || item.services || [];
  const priceChips: string[] = item.priceChips || [];
  if (item.cleaningPrice) priceChips.push(`Cleaning ₹${item.cleaningPrice}`);
  if (item.rctFrom) priceChips.push(`RCT from ₹${item.rctFrom}`);
  const chips = [...specialties.slice(0, 2), ...priceChips.slice(0, 2)].slice(0, 4);
  const trust: string[] = [];
  if (item.verified || item.status === 'approved') trust.push('Verified');
  if (item.sterilisation) trust.push('Sterilised');
  if (item.emiAvailable) trust.push('EMI available');
  if (item.emergencyDental) trust.push('Emergency dental');
  return (
    <ProviderCardBase
      imageUrl={item.photos?.[0] || item.logo || item.imageUrl}
      title={item.name}
      verified={item.verified || item.status === 'approved'}
      subtitle={(item.specialties || []).slice(0, 2).join(' · ') || 'Dental clinic'}
      overlayBadge={item.overlayBadge}
      ratingAvg={item.rating ?? item.ratingAvg ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      distanceKm={item.distanceKm ?? item.distance}
      openNow={item.openNow ?? item.open ?? null}
      chips={chips}
      priceLine={item.consultFee ? `₹${item.consultFee} consult` : item.priceFrom ? `From ₹${item.priceFrom}` : undefined}
      trustBadges={trust}
      nextSlotLabel={item.nextSlotAt || item.nextSlotLabel}
      primaryLabel="Book"
      secondaryLabel="Directions"
      onPrimary={onPrimary || (() => navigate(`/dental/${item._id || item.id}`))}
      onSecondary={onSecondary}
      sponsored={item.isSponsored}
    />
  );
}
