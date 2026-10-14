import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

export interface HomeServiceCardProps {
  item: any;
  variant?: 'grid' | 'list' | 'compact' | 'map-pin';
  onPrimary?: () => void;
  onSecondary?: () => void;
}

/** Home service card (Sample collection / nursing / physio / doctor home visit) — Spec 02 §2.36 */
export default function HomeServiceCard({ item, variant = 'grid', onPrimary, onSecondary }: HomeServiceCardProps) {
  const navigate = useNavigate();
  if (!item) return null;

  const chips: string[] = [];
  if (item.serviceType) chips.push(item.serviceType);
  if (item.visitWindow) chips.push(`Slot: ${item.visitWindow}`);
  if (item.coverageRadiusKm) chips.push(`Within ${item.coverageRadiusKm} km`);
  else if (item.pincodesCount) chips.push(`${item.pincodesCount} Pincodes covered`);
  if (item.womenStaffAvailable) chips.push('Female staff on request');

  const trust: string[] = [];
  if (item.verified || item.status === 'approved') trust.push('Police Verified');
  if (item.otpVerification !== false) trust.push('OTP & ID Verified');
  if (item.coldBagCertified) trust.push('Cold-bag Certified');

  const priceLine = item.visitFee
    ? `₹${item.visitFee} visit fee`
    : item.priceFrom
    ? `From ₹${item.priceFrom}`
    : undefined;

  return (
    <ProviderCardBase
      imageUrl={item.photos?.[0] || item.logo || item.imageUrl}
      title={item.name}
      verified={item.verified || item.status === 'approved'}
      subtitle={item.subtitle || item.category || 'Home Healthcare Service'}
      overlayBadge={item.overlayBadge}
      ratingAvg={item.rating ?? item.ratingAvg ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      distanceKm={item.distanceKm ?? item.distance}
      openNow={item.openNow ?? item.open ?? null}
      chips={chips.slice(0, 4)}
      priceLine={priceLine}
      trustBadges={trust.slice(0, 3)}
      nextSlotLabel={item.nextSlotAt || item.nextSlotLabel}
      primaryLabel="Book Home Visit"
      secondaryLabel="View Profile"
      onPrimary={onPrimary || (() => navigate(`/home-care/${item._id || item.id}`))}
      onSecondary={onSecondary || (() => navigate(`/home-care/${item._id || item.id}?info=1`))}
      sponsored={item.isSponsored}
      variant={variant}
    />
  );
}
