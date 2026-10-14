import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

export interface AlliedTherapistCardProps {
  item: any;
  variant?: 'grid' | 'list' | 'compact' | 'map-pin';
  onPrimary?: () => void;
  onSecondary?: () => void;
}

/** Allied therapist card (Speech · OT · Audiologist · Optometrist) — Spec 02 §2.37 */
export default function AlliedTherapistCard({ item, variant = 'grid', onPrimary, onSecondary }: AlliedTherapistCardProps) {
  const navigate = useNavigate();
  if (!item) return null;

  const chips: string[] = [];
  const focusAreas: string[] = item.focusAreas || item.specialties || [];
  chips.push(...focusAreas.slice(0, 2));
  if (item.targetAge) chips.push(item.targetAge);
  if (item.modes?.length) {
    const modeNames = item.modes.map((m: string) => m === 'home_visit' ? 'Home' : m === 'video' ? 'Video' : 'Clinic');
    chips.push(modeNames.slice(0, 2).join(' · '));
  }

  const trust: string[] = [];
  if (item.verified || item.status === 'approved') trust.push('Verified Practitioner');
  if (item.rciRegistered || item.councilRegistered) trust.push('Council / RCI Registered');
  if (item.experience) trust.push(`${item.experience} yrs exp`);

  const priceLine = item.sessionFee
    ? `₹${item.sessionFee} / session`
    : item.consultFee
    ? `₹${item.consultFee} consult`
    : undefined;

  return (
    <ProviderCardBase
      imageUrl={item.photos?.[0] || item.profilePhoto || item.imageUrl}
      title={item.name}
      verified={item.verified || item.status === 'approved'}
      subtitle={item.role || item.specialization || 'Allied Health Professional'}
      overlayBadge={item.overlayBadge}
      ratingAvg={item.rating ?? item.ratingAvg ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      distanceKm={item.distanceKm ?? item.distance}
      openNow={item.openNow ?? item.open ?? null}
      chips={chips.slice(0, 4)}
      priceLine={priceLine}
      trustBadges={trust.slice(0, 3)}
      nextSlotLabel={item.nextSlotAt || item.nextSlotLabel}
      primaryLabel="Book Session"
      secondaryLabel="View Profile"
      onPrimary={onPrimary || (() => navigate(`/therapists/${item._id || item.id}`))}
      onSecondary={onSecondary || (() => navigate(`/therapists/${item._id || item.id}?profile=1`))}
      sponsored={item.isSponsored}
      variant={variant}
    />
  );
}
