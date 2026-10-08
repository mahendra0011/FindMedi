import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

/** Nurse / home-nursing card — rolesmd/3.md §2.14 */
export default function NurseCard({ item, onPrimary, onSecondary }: any) {
  const navigate = useNavigate();
  if (!item) return null;
  const chips = [...(item.skills || [])].slice(0, 3);
  if (item.shifts?.length && chips.length < 4) chips.push(`${item.shifts.join('/')} shifts`);
  else if (item.shift && chips.length < 4) chips.push(item.shift);
  const trust: string[] = [];
  if (item.policeVerified) trust.push('Police-verified');
  if (item.councilVerified || item.verified) trust.push('Nursing council');
  return (
    <ProviderCardBase
      imageUrl={item.photo || item.imageUrl}
      fallbackInitials={item.name}
      title={item.name}
      verified={item.councilVerified || item.verified}
      subtitle={`Home nurse${item.gender ? ` · ${item.gender}` : ''}${item.area ? ` · ${item.area}` : ''}`}
      ratingAvg={item.rating ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      chips={chips}
      priceLine={item.ratePerHour ? `₹${item.ratePerHour}/hr` : item.ratePerShift ? `₹${item.ratePerShift}/shift` : undefined}
      trustBadges={trust}
      nextSlotLabel={item.availableToday ? 'Available today' : item.nextSlotAt}
      primaryLabel="Book"
      secondaryLabel="View"
      onPrimary={onPrimary || (() => navigate(`/practitioner/${item._id || item.id}`))}
      onSecondary={onSecondary}
    />
  );
}
