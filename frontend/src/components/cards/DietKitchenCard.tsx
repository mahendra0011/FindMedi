import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

export interface DietKitchenCardProps {
  item: any;
  variant?: 'grid' | 'list' | 'compact' | 'map-pin';
  onPrimary?: () => void;
  onSecondary?: () => void;
}

/** Diet kitchen & clinical meal-plan card — Spec 02 §2.34 */
export default function DietKitchenCard({ item, variant = 'grid', onPrimary, onSecondary }: DietKitchenCardProps) {
  const navigate = useNavigate();
  if (!item) return null;

  const chips: string[] = [];
  const dietTypes: string[] = item.dietTypes || ['Diabetic', 'Renal', 'Keto', 'Cardiac'];
  chips.push(...dietTypes.slice(0, 2));
  if (item.dietaryOptions) chips.push(item.dietaryOptions.slice(0, 2).join(' / ')); // e.g. "Veg / Jain"
  if (item.subscriptionFlexibility || item.pauseSkip) chips.push('Pause/Skip Anytime');
  if (item.deliverySlotsCount) chips.push(`${item.deliverySlotsCount} Delivery slots`);

  const trust: string[] = [];
  if (item.verified || item.status === 'approved') trust.push('Verified Kitchen');
  if (item.fssaiNumber || item.fssaiCertified !== false) trust.push('FSSAI Licensed');
  if (item.nutritionistCurated) trust.push('Dietitian Curated');

  const priceLine = item.pricePerMeal
    ? `₹${item.pricePerMeal} / meal`
    : item.pricePerWeek
    ? `₹${item.pricePerWeek} / week`
    : item.priceFrom
    ? `From ₹${item.priceFrom}`
    : undefined;

  return (
    <ProviderCardBase
      imageUrl={item.photos?.[0] || item.logo || item.imageUrl}
      title={item.name}
      verified={item.verified || item.status === 'approved'}
      subtitle={item.subtitle || 'Health Food & Clinical Meals'}
      overlayBadge={item.overlayBadge}
      ratingAvg={item.rating ?? item.ratingAvg ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      distanceKm={item.distanceKm ?? item.distance}
      openNow={item.openNow ?? item.open ?? null}
      chips={chips.slice(0, 4)}
      priceLine={priceLine}
      trustBadges={trust.slice(0, 3)}
      primaryLabel="View Plans"
      secondaryLabel="Subscribe"
      onPrimary={onPrimary || (() => navigate(`/meals/${item._id || item.id}`))}
      onSecondary={onSecondary || (() => navigate(`/meals/${item._id || item.id}?subscribe=1`))}
      sponsored={item.isSponsored}
      variant={variant}
    />
  );
}
