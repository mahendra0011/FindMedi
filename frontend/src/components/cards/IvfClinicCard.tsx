import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

export interface IvfClinicCardProps {
  item: any;
  variant?: 'grid' | 'list' | 'compact' | 'map-pin';
  onPrimary?: () => void;
  onSecondary?: () => void;
}

/** Fertility / IVF clinic card — Spec 02 §2.30 (Discreet Mode by default) */
export default function IvfClinicCard({ item, variant = 'grid', onPrimary, onSecondary }: IvfClinicCardProps) {
  const navigate = useNavigate();
  if (!item) return null;

  const chips: string[] = [];
  const services: string[] = item.services || ['IVF', 'IUI', 'ICSI'];
  chips.push(...services.slice(0, 3));
  if (item.counsellingAvailable) chips.push('Counselling Included');

  const trust: string[] = [];
  if (item.artRegistered || item.accreditations?.includes('art_registered')) trust.push('ART Registered');
  if (item.verified || item.status === 'approved') trust.push('Verified Clinic');
  if (item.embryologistFullTime) trust.push('In-house Embryology');

  const priceLine = item.packagePriceFrom
    ? `Packages from ₹${item.packagePriceFrom.toLocaleString('en-IN')}`
    : item.consultFee
    ? `₹${item.consultFee} Consult`
    : undefined;

  return (
    <ProviderCardBase
      imageUrl={item.photos?.[0] || item.logo || item.imageUrl}
      title={item.name}
      verified={item.verified || item.status === 'approved'}
      subtitle={item.subtitle || 'Fertility & Maternity Centre'}
      overlayBadge={item.overlayBadge}
      ratingAvg={item.rating ?? item.ratingAvg ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      distanceKm={item.distanceKm ?? item.distance}
      openNow={item.openNow ?? item.open ?? null}
      chips={chips.slice(0, 4)}
      priceLine={priceLine}
      trustBadges={trust.slice(0, 3)}
      nextSlotLabel={item.nextSlotAt || item.nextSlotLabel}
      primaryLabel="Request Consult"
      secondaryLabel="Call"
      onPrimary={onPrimary || (() => navigate(`/fertility/${item._id || item.id}`))}
      onSecondary={onSecondary || (() => { if (item.phone) window.open(`tel:${item.phone}`); })}
      sponsored={item.isSponsored}
      discreet={true}
      variant={variant}
    />
  );
}
