import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

/** Event / camp / workshop card — rolesmd/3.md §2.22 */
export default function EventCard({ item, onPrimary, onSecondary }: any) {
  const navigate = useNavigate();
  if (!item) return null;
  const chips = [item.eventType, item.mode || (item.isOnline ? 'Online' : 'In-person')].filter(Boolean).slice(0, 4) as string[];
  if (item.seatsLeft != null && chips.length < 4 && item.seatsLeft <= 30) chips.push(`${item.seatsLeft} seats left`);
  else if (item.language && chips.length < 4) chips.push(item.language);
  const trust: string[] = [];
  if (item.organiserVerified) trust.push('Verified organiser');
  if (item.free) trust.push('Free');
  const closed = item.status === 'ended' || item.status === 'full';
  return (
    <ProviderCardBase
      imageUrl={item.bannerUrl || item.imageUrl}
      title={item.title || item.name}
      verified={item.organiserVerified}
      subtitle={`${item.eventType || 'Event'}${item.dateTime ? ` · ${item.dateTime}` : ''}`}
      overlayBadge={item.status === 'filling_fast' ? 'Filling fast' : item.free ? 'Free' : undefined}
      chips={chips}
      priceLine={item.free ? 'Free entry' : item.fee != null ? `₹${item.fee}` : undefined}
      trustBadges={trust}
      nextSlotLabel={item.registrationDeadline ? `Register by ${item.registrationDeadline}` : undefined}
      primaryLabel={item.status === 'full' ? 'Join waitlist' : 'Register'}
      secondaryLabel="Details"
      closed={item.status === 'ended'}
      unavailable={item.status === 'full' ? false : closed}
      unavailableLabel="Registrations closed"
      onPrimary={onPrimary || (() => navigate(`/events/${item._id || item.id}`))}
      onSecondary={onSecondary}
    />
  );
}
