import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

export interface VaccinationCardProps {
  item: any;
  variant?: 'grid' | 'list' | 'compact' | 'map-pin';
  onPrimary?: () => void;
  onSecondary?: () => void;
}

/** Vaccination centre card — Spec 02 §2.33 */
export default function VaccinationCard({ item, variant = 'grid', onPrimary, onSecondary }: VaccinationCardProps) {
  const navigate = useNavigate();
  if (!item) return null;

  const chips: string[] = [];
  const vaccines: string[] = item.vaccinesOffered || item.services || ['UIP Free Vaccines', 'Flu', 'HPV', 'Travel Shots'];
  chips.push(...vaccines.slice(0, 2));
  if (item.targetAge) chips.push(item.targetAge);
  if (item.walkInAllowed) chips.push('Walk-in Welcome');
  if (item.digitalCertificate) chips.push('Instant Certificate');

  const trust: string[] = [];
  if (item.verified || item.status === 'approved') trust.push('Authorized Centre');
  if (item.coldChainVerified !== false) trust.push('Cold-chain Verified');
  if (item.uipFree) trust.push('Govt UIP Free');

  const priceLine = item.isGovt || item.freeUip
    ? 'Free Govt Vaccines · Private from ₹450'
    : item.priceFrom
    ? `From ₹${item.priceFrom}`
    : 'UIP Schedule Free';

  return (
    <ProviderCardBase
      imageUrl={item.photos?.[0] || item.logo || item.imageUrl}
      title={item.name}
      verified={item.verified || item.status === 'approved'}
      subtitle={item.subtitle || 'Vaccination & Immunization Centre'}
      overlayBadge={item.overlayBadge}
      ratingAvg={item.rating ?? item.ratingAvg ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      distanceKm={item.distanceKm ?? item.distance}
      openNow={item.openNow ?? item.open ?? null}
      chips={chips.slice(0, 4)}
      priceLine={priceLine}
      trustBadges={trust.slice(0, 3)}
      nextSlotLabel={item.nextSlotAt || item.nextSlotLabel}
      primaryLabel="Book Slot"
      secondaryLabel="Directions"
      onPrimary={onPrimary || (() => navigate(`/vaccinations/${item._id || item.id}`))}
      onSecondary={onSecondary || (() => { if (item.address) window.open(`https://maps.google.com/?q=${encodeURIComponent(item.name + ' ' + item.address)}`); })}
      sponsored={item.isSponsored}
      variant={variant}
    />
  );
}
