import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

/** Gym / fitness card — rolesmd/3.md §2.16 */
export default function GymCard({ item, onPrimary, onSecondary }: any) {
  const navigate = useNavigate();
  if (!item) return null;
  const chips = [...(item.facilities || [])].slice(0, 3);
  if (item.trialPass && chips.length < 4) chips.push('Trial pass');
  else if (item.womenOnlyHours && chips.length < 4) chips.push('Women-only hours');
  const trust: string[] = [];
  if (item.verified) trust.push('Verified');
  if (item.certifiedTrainers) trust.push('Certified trainers');
  return (
    <ProviderCardBase
      imageUrl={item.photos?.[0] || item.imageUrl}
      title={item.name}
      verified={item.verified}
      subtitle={`Gym${item.trainersCount ? ` · ${item.trainersCount} trainers` : ''}`}
      ratingAvg={item.rating ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      distanceKm={item.distanceKm}
      openNow={item.openNow ?? null}
      openLabel={item.peakNow ? 'Peak hours' : undefined}
      chips={chips}
      priceLine={item.monthlyPrice ? `₹${item.monthlyPrice}/month` : undefined}
      trustBadges={trust}
      primaryLabel={item.trialPass ? 'Get trial pass' : 'Buy membership'}
      secondaryLabel="View"
      onPrimary={onPrimary || (() => navigate(`/gym/${item._id || item.id}`))}
      onSecondary={onSecondary}
    />
  );
}
