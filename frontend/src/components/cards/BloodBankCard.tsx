import ProviderCardBase from './ProviderCardBase';

/** Blood bank / donor card — rolesmd/3.md §2.25 */
export default function BloodBankCard({ item, onPrimary, onSecondary }: any) {
  if (!item) return null;
  const groups: string[] = item.availableGroups || [];
  const chips = groups.slice(0, 4).map((g) => `${g} available`);
  const trust: string[] = [];
  if (item.licenceVerified || item.verified) trust.push('Licensed');
  if (item.open24x7) trust.push('24x7');
  return (
    <ProviderCardBase
      imageUrl={item.imageUrl}
      title={item.name}
      verified={item.licenceVerified || item.verified}
      subtitle={item.isDonor ? `Blood donor · ${item.bloodGroup || ''}` : 'Blood bank'}
      distanceKm={item.distanceKm}
      openNow={item.open24x7 ? true : item.openNow ?? null}
      openLabel={item.open24x7 ? 'Open 24x7' : undefined}
      chips={chips.length ? chips : (item.components || []).slice(0, 4)}
      trustBadges={trust}
      primaryLabel={item.isDonor ? 'Request contact' : 'Request blood'}
      secondaryLabel="Call"
      onPrimary={onPrimary}
      onSecondary={onSecondary}
    />
  );
}
