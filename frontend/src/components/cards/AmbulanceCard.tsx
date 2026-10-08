import ProviderCardBase from './ProviderCardBase';

/** Ambulance operator card — rolesmd/3.md §2.26 */
export default function AmbulanceCard({ item, onPrimary, onSecondary }: any) {
  if (!item) return null;
  const chips = [...(item.fleetTypes || item.types || [])].slice(0, 3);
  if (item.gpsTracked && chips.length < 4) chips.push('GPS-tracked');
  else if (item.oxygenAvailable && chips.length < 4) chips.push('Oxygen onboard');
  const trust: string[] = [];
  if (item.verified) trust.push('Verified');
  if (item.open24x7) trust.push('24x7');
  return (
    <ProviderCardBase
      imageUrl={item.imageUrl}
      title={item.name || item.operatorName || 'Ambulance'}
      verified={item.verified}
      subtitle={item.coverageArea ? `Coverage: ${item.coverageArea}` : 'Ambulance service'}
      overlayBadge="24x7"
      distanceKm={item.distanceKm}
      openNow
      openLabel={item.eta ? `ETA ${item.eta}` : 'Available now'}
      chips={chips}
      priceLine={item.baseFare != null ? `Base ₹${item.baseFare}${item.perKm ? ` + ₹${item.perKm}/km` : ''}` : undefined}
      trustBadges={trust}
      primaryLabel="Call now"
      secondaryLabel="Book"
      onPrimary={onPrimary}
      onSecondary={onSecondary}
    />
  );
}
