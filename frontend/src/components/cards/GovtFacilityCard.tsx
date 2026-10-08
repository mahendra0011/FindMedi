import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

/** Government facility card — rolesmd/3.md §2.24 */
export default function GovtFacilityCard({ item, onPrimary, onSecondary }: any) {
  const navigate = useNavigate();
  if (!item) return null;
  const chips = [...(item.freeServices || item.services || [])].slice(0, 4);
  return (
    <ProviderCardBase
      imageUrl={item.photos?.[0] || item.imageUrl}
      title={item.name}
      verified={item.verified}
      subtitle={item.facilityType || 'Government facility'}
      overlayBadge="Govt"
      ratingAvg={item.rating ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      distanceKm={item.distanceKm}
      openNow={item.openNow ?? null}
      chips={chips}
      priceLine={item.bookingSupported ? undefined : 'Information only · Free services'}
      trustBadges={['Govt', ...(item.schemes || [])].slice(0, 3)}
      nextSlotLabel={item.opdDays ? `OPD: ${item.opdDays}` : undefined}
      primaryLabel={item.bookingSupported ? 'Get token' : 'Directions'}
      secondaryLabel="Call"
      onPrimary={onPrimary || (() => navigate(`/govt/${item._id || item.id}`))}
      onSecondary={onSecondary}
    />
  );
}
