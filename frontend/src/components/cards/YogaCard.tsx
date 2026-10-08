import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

/** Yoga card (teacher/studio/camp) — rolesmd/3.md §2.15 */
export default function YogaCard({ item, onPrimary, onSecondary }: any) {
  const navigate = useNavigate();
  if (!item) return null;
  const chips = [...(item.styles || item.focus || [])].slice(0, 3);
  if (item.mode && chips.length < 4) chips.push(item.mode);
  else if (item.trialFree && chips.length < 4) chips.push('1st class free');
  const trust: string[] = [];
  if (item.ycbCertified || item.verified) trust.push(item.ycbCertified ? 'YCB certified' : 'Verified');
  if (item.womenOnlyBatch) trust.push('Women-only batch');
  return (
    <ProviderCardBase
      imageUrl={item.photos?.[0] || item.photo || item.imageUrl}
      title={item.name}
      verified={item.verified}
      subtitle={`Yoga · ${item.level || 'All levels'}`}
      ratingAvg={item.rating ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      distanceKm={item.distanceKm}
      openNow={item.openNow ?? null}
      chips={chips}
      priceLine={item.pricePerMonth ? `₹${item.pricePerMonth}/month` : item.trialFree ? '1st class free' : undefined}
      trustBadges={trust}
      nextSlotLabel={item.nextBatchAt || item.nextSlotAt}
      primaryLabel={item.trialFree ? 'Book trial' : 'Join batch'}
      secondaryLabel="View"
      onPrimary={onPrimary || (() => navigate(`/yoga/${item._id || item.id}`))}
      onSecondary={onSecondary}
    />
  );
}
