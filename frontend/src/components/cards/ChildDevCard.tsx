import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

export interface ChildDevCardProps {
  item: any;
  variant?: 'grid' | 'list' | 'compact' | 'map-pin';
  onPrimary?: () => void;
  onSecondary?: () => void;
}

/** Child-development & pediatric rehab centre card — Spec 02 §2.32 */
export default function ChildDevCard({ item, variant = 'grid', onPrimary, onSecondary }: ChildDevCardProps) {
  const navigate = useNavigate();
  if (!item) return null;

  const chips: string[] = [];
  const programs: string[] = item.programs || ['Autism', 'ADHD', 'Speech & OT', 'Learning Support'];
  chips.push(...programs.slice(0, 2));
  if (item.ageGroup) chips.push(`Ages: ${item.ageGroup}`);
  if (item.modes?.includes('home_visit')) chips.push('Centre + Home');
  if (item.therapistsCount) chips.push(`${item.therapistsCount} Specialists`);

  const trust: string[] = [];
  if (item.verified || item.status === 'approved') trust.push('Verified Centre');
  if (item.rciCertified || item.rciRegistered) trust.push('RCI Certified');
  if (item.assessmentAvailable !== false) trust.push('Diagnostic Assessment');

  const priceLine = item.assessmentFee
    ? `Assessment ₹${item.assessmentFee}`
    : item.sessionFee
    ? `₹${item.sessionFee} / session`
    : item.packagePrice
    ? `Packages from ₹${item.packagePrice}`
    : undefined;

  return (
    <ProviderCardBase
      imageUrl={item.photos?.[0] || item.logo || item.imageUrl}
      title={item.name}
      verified={item.verified || item.status === 'approved'}
      subtitle={item.subtitle || 'Child Development & Rehab Centre'}
      overlayBadge={item.overlayBadge}
      ratingAvg={item.rating ?? item.ratingAvg ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      distanceKm={item.distanceKm ?? item.distance}
      openNow={item.openNow ?? item.open ?? null}
      chips={chips.slice(0, 4)}
      priceLine={priceLine}
      trustBadges={trust.slice(0, 3)}
      nextSlotLabel={item.nextSlotAt || item.nextSlotLabel}
      primaryLabel="Book Assessment"
      secondaryLabel="Call"
      onPrimary={onPrimary || (() => navigate(`/child-development/${item._id || item.id}`))}
      onSecondary={onSecondary || (() => { if (item.phone) window.open(`tel:${item.phone}`); })}
      sponsored={item.isSponsored}
      variant={variant}
    />
  );
}
