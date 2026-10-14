import { useNavigate } from 'react-router-dom';
import ProviderCardBase from './ProviderCardBase';

export interface CorporateWellnessCardProps {
  item: any;
  variant?: 'grid' | 'list' | 'compact' | 'map-pin';
  onPrimary?: () => void;
  onSecondary?: () => void;
}

/** Corporate wellness program card (B2B) — Spec 02 §2.35 */
export default function CorporateWellnessCard({ item, variant = 'grid', onPrimary, onSecondary }: CorporateWellnessCardProps) {
  const navigate = useNavigate();
  if (!item) return null;

  const chips: string[] = [];
  const modules: string[] = item.modules || ['Health Checkups', 'Webinars', 'CPR Training', 'Mental Health Desk'];
  chips.push(...modules.slice(0, 2));
  if (item.employeeRange) chips.push(`${item.employeeRange} Employees`);
  if (item.duration) chips.push(item.duration);
  if (item.anonymousReporting !== false) chips.push('Aggregate Analytics');

  const trust: string[] = [];
  if (item.verified || item.status === 'approved') trust.push('Corporate Empanelled');
  if (item.dpdpCompliant !== false) trust.push('DPDP & HIPAA Safe');
  if (item.panIndiaNetwork) trust.push('Pan-India Network');

  const priceLine = item.pricePerEmployee
    ? `From ₹${item.pricePerEmployee} / employee / yr`
    : item.priceFrom
    ? `From ₹${item.priceFrom}`
    : 'Custom B2B Tier';

  return (
    <ProviderCardBase
      imageUrl={item.photos?.[0] || item.logo || item.imageUrl}
      title={item.name || item.programName}
      verified={item.verified || item.status === 'approved'}
      subtitle={item.subtitle || 'Corporate Health & Wellness Program'}
      overlayBadge={item.overlayBadge}
      ratingAvg={item.rating ?? item.ratingAvg ?? 0}
      ratingCount={item.reviewsCount ?? item.ratingCount ?? 0}
      distanceKm={item.distanceKm ?? item.distance}
      openNow={item.openNow ?? item.open ?? null}
      chips={chips.slice(0, 4)}
      priceLine={priceLine}
      trustBadges={trust.slice(0, 3)}
      primaryLabel="Request Proposal"
      secondaryLabel="Talk to Us"
      onPrimary={onPrimary || (() => navigate(`/corporate-wellness/${item._id || item.id}`))}
      onSecondary={onSecondary || (() => navigate(`/corporate-wellness/${item._id || item.id}?contact=1`))}
      sponsored={item.isSponsored}
      variant={variant}
    />
  );
}
