import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

/** Wellness centre / spa card — rolesmd/3.md §2.17 (no disease-cure claims) */
export default function WellnessCard({ item, onPrimary, onSecondary }: any) {
  const navigate = useNavigate();
  if (!item) return null;
  const chips = [...(item.therapies || item.services || [])].slice(0, 4);
  const trust: string[] = [];
  if (item.verified) trust.push('Verified');
  if (item.hygieneCertified) trust.push('Hygiene certified');
  return (
    <ProviderCardBase
      imageUrl={item.photos?.[0] || item.imageUrl}
      title={item.name}
      verified={item.verified}
      subtitle="Wellness centre"
      ratingAvg={item.rating ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      distanceKm={item.distanceKm}
      openNow={item.openNow ?? null}
      chips={chips}
      priceLine={item.priceFrom ? `From ₹${item.priceFrom}` : undefined}
      trustBadges={trust}
      nextSlotLabel={item.nextSlotAt}
      primaryLabel="Book session"
      secondaryLabel="View"
      onPrimary={onPrimary || (() => navigate(`/wellness/${item._id || item.id}`))}
      onSecondary={onSecondary}
    />
  );
}
