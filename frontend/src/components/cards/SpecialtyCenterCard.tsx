import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

export interface SpecialtyCenterCardProps {
  item: any;
  variant?: 'grid' | 'list' | 'compact' | 'map-pin';
  onPrimary?: () => void;
  onSecondary?: () => void;
}

/** Specialty centre card (Cancer · Cardiac · Ortho · Skin-Hair · Pain · Sleep · Urology) — Spec 02 §2.38 */
export default function SpecialtyCenterCard({ item, variant = 'grid', onPrimary, onSecondary }: SpecialtyCenterCardProps) {
  const navigate = useNavigate();
  if (!item) return null;

  const chips: string[] = [];
  const services: string[] = item.services || item.keyProcedures || [];
  chips.push(...services.slice(0, 2));
  if (item.equipmentList?.length) chips.push(item.equipmentList[0]);
  if (item.specialistsCount) chips.push(`${item.specialistsCount} Specialists`);

  const trust: string[] = [];
  if (item.verified || item.status === 'approved') trust.push('Verified Centre');
  if (item.pmjayAccepted || item.schemes?.includes('pmjay')) trust.push('PM-JAY Empanelled');
  if (item.nabhAccredited || item.accreditations?.includes('nabh_full')) trust.push('NABH Accredited');
  if (item.aerbRegistered) trust.push('AERB Registered');

  const priceLine = item.consultFee
    ? `₹${item.consultFee} consult`
    : item.priceFrom
    ? `From ₹${item.priceFrom}`
    : undefined;

  return (
    <ProviderCardBase
      imageUrl={item.photos?.[0] || item.logo || item.imageUrl}
      title={item.name}
      verified={item.verified || item.status === 'approved'}
      subtitle={item.specialty || item.subtitle || 'Specialty Centre'}
      overlayBadge={item.overlayBadge}
      ratingAvg={item.rating ?? item.ratingAvg ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      distanceKm={item.distanceKm ?? item.distance}
      openNow={item.openNow ?? item.open ?? null}
      chips={chips.slice(0, 4)}
      priceLine={priceLine}
      trustBadges={trust.slice(0, 3)}
      nextSlotLabel={item.nextSlotAt || item.nextSlotLabel}
      primaryLabel="Book Consult"
      secondaryLabel="Call"
      onPrimary={onPrimary || (() => navigate(`/specialty-centre/${item._id || item.id}`))}
      onSecondary={onSecondary || (() => { if (item.phone) window.open(`tel:${item.phone}`); })}
      sponsored={item.isSponsored}
      variant={variant}
    />
  );
}
