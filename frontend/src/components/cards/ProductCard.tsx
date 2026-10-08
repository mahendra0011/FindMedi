import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

/** Product card (supplement / health-food / skincare / device) — rolesmd/3.md §2.19 */
export default function ProductCard({ item, onPrimary, onSecondary }: any) {
  const navigate = useNavigate();
  if (!item) return null;
  const chips = [...(item.tags || [])].slice(0, 3);
  if (item.rxRequired && chips.length < 4) chips.push('Rx required');
  const trust: string[] = [];
  if (item.fssai) trust.push('FSSAI');
  if (item.cdsco) trust.push('CDSCO');
  const price = item.price != null ? `₹${item.price}${item.mrp && item.mrp > item.price ? ` (MRP ₹${item.mrp})` : ''}` : undefined;
  return (
    <ProviderCardBase
      imageUrl={item.imageUrl || item.photos?.[0]}
      title={item.name}
      verified={item.verified}
      subtitle={`${item.brand || ''}${item.packSize ? ` · ${item.packSize}` : ''}`.trim() || 'Health product'}
      ratingAvg={item.rating ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      chips={chips}
      priceLine={price}
      trustBadges={trust}
      nextSlotLabel={item.deliveryEta ? `Delivery ${item.deliveryEta}` : undefined}
      primaryLabel="Add to cart"
      secondaryLabel="View"
      onPrimary={onPrimary}
      onSecondary={onSecondary || (() => navigate(`/product/${item._id || item.id}`))}
    />
  );
}
