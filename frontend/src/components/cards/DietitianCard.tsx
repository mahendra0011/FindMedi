import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

/** Dietitian card — rolesmd/3.md §2.13 */
export default function DietitianCard({ item, onPrimary, onSecondary }: any) {
  const navigate = useNavigate();
  if (!item) return null;
  const chips = [...(item.focus || [])].slice(0, 3);
  if (item.planTypes?.[0] && chips.length < 4) chips.push(`${item.planTypes[0]} plan`);
  const trust: string[] = [];
  if (item.verified) trust.push('Verified');
  if (item.samplePlanAvailable) trust.push('Sample plan');
  return (
    <ProviderCardBase
      imageUrl={item.photo || item.imageUrl}
      fallbackInitials={item.name}
      title={item.name}
      verified={item.verified}
      subtitle={`Dietitian${item.languages?.length ? ` · ${item.languages.slice(0, 2).join(', ')}` : ''}`}
      ratingAvg={item.rating ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      chips={chips}
      priceLine={item.fee ? `₹${item.fee} consult` : item.planFrom ? `Plans from ₹${item.planFrom}` : undefined}
      trustBadges={trust}
      nextSlotLabel={item.nextSlotAt}
      primaryLabel="Book consult"
      secondaryLabel="View plans"
      onPrimary={onPrimary || (() => navigate(`/practitioner/${item._id || item.id}`))}
      onSecondary={onSecondary}
    />
  );
}
