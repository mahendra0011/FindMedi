import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

/** Equipment rental/sale card — rolesmd/3.md §2.18 */
export default function EquipmentCard({ item, onPrimary, onSecondary }: any) {
  const navigate = useNavigate();
  if (!item) return null;
  const chips = [item.spec, item.availability || (item.stockCount ? `${item.stockCount} in stock` : null)].filter(Boolean).slice(0, 4) as string[];
  if (item.sanitised && chips.length < 4) chips.push('Sanitised');
  const trust: string[] = [];
  if (item.verified) trust.push('Verified');
  if (item.warranty) trust.push('Warranty');
  const price = item.rentPerDay ? `Rent ₹${item.rentPerDay}/day` : item.buyPrice ? `Buy ₹${item.buyPrice}` : undefined;
  return (
    <ProviderCardBase
      imageUrl={item.imageUrl || item.photos?.[0]}
      title={item.name}
      verified={item.verified}
      subtitle={item.spec || 'Medical equipment'}
      ratingAvg={item.rating ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      chips={chips}
      priceLine={price}
      trustBadges={trust}
      nextSlotLabel={item.deliveryEta ? `Delivery ${item.deliveryEta}` : undefined}
      primaryLabel={item.rentPerDay ? 'Rent' : 'Buy'}
      secondaryLabel="Details"
      onPrimary={onPrimary || (() => navigate(`/equipment/${item._id || item.id}`))}
      onSecondary={onSecondary}
    />
  );
}
