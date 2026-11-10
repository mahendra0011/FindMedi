import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Lock, Search, TriangleAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getSpecialtyVisual } from '@/data/specialtyVisuals';
import { useSpecialtyCountsByCode, useSpecialtySuggestions, useSpecialtyTiles, type SpecialtySuggestion } from '@/hooks/useSpecialtyBrowse';

// Browse-by-specialties, §2/§5.1: the 13 curated groups, each tile carrying
// its chip preview (§5.2) and honest child count. Sensitive tiles render
// discreetly (muted styling 🔒), claims-restricted ones carry ⚠.
// SITE-I18N 3.2: every label is a registry key and the name itself follows
// the active language — hi renders the Hindi name as primary, en dangles it
// as the secondary line under the English name.
const INITIAL_GROUPS = 3;
const normalizeSearch = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const SYMPTOM_SPECIALTIES: Record<string, string[]> = {
  'chest pain': ['SPEC.CARDIO', 'SPEC.EMERG'], 'seene me dard': ['SPEC.CARDIO', 'SPEC.EMERG'], 'सीने में दर्द': ['SPEC.CARDIO', 'SPEC.EMERG'],
  'stroke': ['SPEC.NEURO', 'SPEC.EMERG'], 'lakwa': ['SPEC.NEURO', 'SPEC.EMERG'], 'चेहरा टेढ़ा': ['SPEC.NEURO', 'SPEC.EMERG'],
  'heavy bleeding': ['SPEC.OBGY', 'SPEC.EMERG'], 'zyada khoon': ['SPEC.OBGY', 'SPEC.EMERG'], 'भारी रक्तस्राव': ['SPEC.OBGY', 'SPEC.EMERG'],
  'self harm': ['SPEC.EMERG'], 'khud ko nuksan': ['SPEC.EMERG'], 'खुद को नुकसान': ['SPEC.EMERG'], 'suicide': ['SPEC.EMERG'], 'khudkushi': ['SPEC.EMERG'], 'आत्महत्या': ['SPEC.EMERG'],
  'pet dard': ['SPEC.GASTRO'], 'acidity': ['SPEC.GASTRO'], 'daant dard': ['SPEC.DENTAL'], 'aankh lal': ['SPEC.OPHTH'],
  'peshab me jalan': ['SPEC.URO'], 'jodon me dard': ['SPEC.ORTHO', 'SPEC.RHEUM'], 'neend nahi aati': ['SPEC.SLEEP', 'SPEC.PSYCH'],
  'baal jhadna': ['SPEC.DERM'], 'bachche ko bukhar': ['SPEC.PAED'], 'period irregular': ['SPEC.OBGY', 'SPEC.ENDO'],
  'saans phoolna': ['SPEC.PULMO', 'SPEC.CARDIO'], 'sugar': ['SPEC.ENDO', 'SPEC.GENMED'],
};

const isRedFlagQuery = (query: string) => [
  'chest pain', 'seene me dard', 'सीने में दर्द', 'stroke', 'lakwa', 'चेहरा टेढ़ा',
  'heavy bleeding', 'zyada khoon', 'भारी रक्तस्राव', 'self harm', 'khud ko nuksan', 'खुद को नुकसान', 'suicide', 'khudkushi', 'आत्महत्या',
].some((phrase) => query.includes(normalizeSearch(phrase)));

export default function SpecialtyGroupsPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isHi = (i18n.language || 'en').toLowerCase().startsWith('hi');
  const { groups, tiles, fromApi, isLoading } = useSpecialtyTiles();
  const [city] = useState(() => {
    try { return localStorage.getItem('findmedi_city') || ''; } catch { return ''; }
  });
  const tileCounts = useSpecialtyCountsByCode(city ? { city } : {});
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [showAZ, setShowAZ] = useState(false);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 180);
    return () => window.clearTimeout(timer);
  }, [search]);
  const suggestions = useSpecialtySuggestions(debouncedSearch);

  const query = normalizeSearch(search);
  const symptomCodes = Object.entries(SYMPTOM_SPECIALTIES)
    .filter(([phrase]) => query.includes(normalizeSearch(phrase)))
    .flatMap(([, codes]) => codes);
  const showEmergencyNotice = isRedFlagQuery(query);
  const matches = (tile: (typeof tiles)[number]) => {
    if (!query) return true;
    if (tile.sensitive) return false;
    if (symptomCodes.includes(tile.code)) return true;
    const children = tile.children || [];
    const terms = [tile.name, ...(tile.aliases || []), ...(tile.meta?.symptoms || []), ...(tile.meta?.conditions || []), ...(tile.meta?.procedures || []),
      ...children.flatMap((child) => [child.name, ...(child.aliases || []), ...(child.meta?.symptoms || []), ...(child.meta?.conditions || []), ...(child.meta?.procedures || [])])];
    return terms.some((term) => normalizeSearch(term).includes(query));
  };
  const counts = tileCounts.data?.counts || {};
  const hasCounts = tileCounts.isSuccess;
  const hasProviders = (tile: (typeof tiles)[number]) => (counts[tile.code]?.doctors ?? 0) > 0;
  const matchingTiles = tiles.filter((tile) => matches(tile) && (!showOnlyAvailable || !hasCounts || hasProviders(tile)));
  const azGroup = { id: 'all-specialties-az', name: isHi ? 'सभी विशेषताएँ A–Z' : 'All specialties A–Z', color: 'slate', tiles: [...matchingTiles].sort((a, b) => a.name.localeCompare(b.name)) };
  const sourceGroups = showAZ ? [azGroup] : (showAllGroups || query ? groups : groups.slice(0, INITIAL_GROUPS));
  const visibleGroups = sourceGroups.map((group) => ({ ...group, tiles: group.tiles.filter((tile) => matches(tile) && (!showOnlyAvailable || !hasCounts || hasProviders(tile))) })).filter((group) => group.tiles.length > 0);
  const tileCount = tiles.length;
  const suggestionLabel = (item: SpecialtySuggestion) => item.label || item.name || item.specialty?.name || '';
  const openSuggestion = (item: SpecialtySuggestion) => {
    if (item.kind === 'specialty' && item.code) {
      navigate(`/browse-specialties/${item.code}`);
      return;
    }
    if (item.kind === 'doctor') {
      navigate(`/clinic-doctors?search=${encodeURIComponent(item.name || '')}`);
      return;
    }
    const label = suggestionLabel(item);
    if (item.specialty?.name && ['symptom', 'condition', 'procedure'].includes(item.kind)) {
      navigate(`/clinic-doctors?specialty=${encodeURIComponent(item.specialty.name)}&${item.kind}=${encodeURIComponent(label)}&fallbackSpecialtyCode=${encodeURIComponent(item.specialty.code)}`);
      return;
    }
    navigate(`/clinic-doctors?search=${encodeURIComponent(label)}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground">{t('specialties.browse_title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('specialties.browse_subtitle', {
            n: tileCount,
            where: fromApi ? t('specialties.browse_subtitle_api') : t('specialties.browse_subtitle_offline'),
          })}
        </p>
        <div className="relative mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative max-w-xl flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isHi ? 'विशेषता, लक्षण, स्थिति या प्रक्रिया खोजें' : 'Search specialties, conditions, procedures, or symptoms'} className="pl-9" aria-label={isHi ? 'विशेषताएँ खोजें' : 'Search specialties'} />
          </div>
          {debouncedSearch.trim().length >= 2 && (suggestions.data?.results?.length ?? 0) > 0 && (
            <div className="absolute z-20 top-12 left-0 right-0 sm:right-auto sm:w-[min(36rem,calc(100%-3rem))] rounded-xl border border-border bg-popover p-2 shadow-lg">
              {(suggestions.data?.results ?? []).slice(0, 6).map((item, index) => (
                <button key={`${item.kind}-${item.code || item.id || item.label}-${index}`} type="button" onClick={() => openSuggestion(item)} className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{suggestionLabel(item)}</span>
                    {(item.specialty?.name || item.specialization || item.parentName) && <span className="block truncate text-xs text-muted-foreground">{item.specialty?.name || item.specialization || item.parentName}</span>}
                  </span>
                  <span className="shrink-0 text-[10px] capitalize text-muted-foreground">{item.kind}</span>
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setShowAZ((value) => !value)} aria-pressed={showAZ} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
            {showAZ ? (isHi ? 'समूह देखें' : 'View by groups') : (isHi ? 'A–Z देखें' : 'View A–Z')}
          </button>
          <button type="button" onClick={() => setShowOnlyAvailable((value) => !value)} aria-pressed={showOnlyAvailable} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">
            {showOnlyAvailable ? (isHi ? 'सभी दिखाएँ' : 'Show all specialties') : (isHi ? 'उपलब्ध ही दिखाएँ' : 'Show only available')}
          </button>
        </div>
        {showEmergencyNotice && (
          <div role="alert" className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
            <span>Search se emergency ho sakti hai. Ye search diagnosis nahi karta. Turant khatra ya medical emergency ho to India emergency number 112 par call karein.{['self harm', 'khud ko nuksan', 'खुद को नुकसान', 'suicide', 'khudkushi', 'आत्महत्या'].some((phrase) => query.includes(normalizeSearch(phrase))) ? ' Mental-health support: Tele-MANAS 14416.' : ''}</span>
            <span className="flex shrink-0 gap-2">
              <a href="tel:112" className="rounded-lg bg-amber-900 px-3 py-2 font-semibold text-white">Call 112</a>
              {['self harm', 'khud ko nuksan', 'खुद को नुकसान', 'suicide', 'khudkushi', 'आत्महत्या'].some((phrase) => query.includes(normalizeSearch(phrase))) && <a href="tel:14416" className="rounded-lg border border-amber-700 px-3 py-2 font-semibold">Call 14416</a>}
            </span>
          </div>
        )}
      </div>

      <section className="mb-8 grid gap-5 rounded-2xl border border-border/60 bg-card/50 p-4 md:grid-cols-2" aria-label={isHi ? 'अन्य स्वास्थ्य श्रेणियाँ' : 'Other ways to browse care'}>
        <BrowseLinkGroup title="Systems of Medicine" links={[
          ['Ayurveda', '/search?q=Ayurveda'], ['Homeopathy', '/search?q=Homeopathy'], ['Unani', '/search?q=Unani'],
          ['Siddha', '/search?q=Siddha'], ['Naturopathy & Yoga', '/search?q=Naturopathy%20Yoga'],
        ]} />
        <BrowseLinkGroup title="Allied & Therapy" links={[
          ['Physiotherapy', '/search?q=Physiotherapist'], ['Dietitian', '/search?q=Dietitian'],
          ['Speech & Occupational Therapy', '/search?q=Therapist'], ['Audiologist', '/search?q=Audiologist'], ['Optometrist', '/search?q=Optometrist'],
        ]} />
        <BrowseLinkGroup title="Mind" links={[
          ['Psychologists', '/mind/counselling'], ['Counsellors', '/mind/counselling'], ['Psychiatrists', '/mind/psychiatrists'],
        ]} />
        <BrowseLinkGroup title="By Age / Gender" links={[
          ['Children', '/browse-specialties/SPEC.PAED'], ['Women', '/browse-specialties/SPEC.OBGY'],
          ['Men', '/browse-specialties/SPEC.URO'], ['Seniors', '/browse-specialties/SPEC.GERI'],
        ]} />
      </section>

      {!isLoading && !fromApi && (
        <p className="mb-6 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          {isHi ? 'विशेषताएँ लोड नहीं हुईं। कनेक्शन जाँचकर फिर कोशिश करें।' : 'Could not load specialties. Check your connection and try again.'}
        </p>
      )}
      {isLoading && !groups.length && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      )}

      <div className="space-y-10">
        {visibleGroups.map((group) => (
          <section key={group.id || group.name}>
            <div className="flex items-center gap-3 mb-4">
              <span className={`w-2.5 h-2.5 rounded-full bg-${group.color}-500`} />
              <h2 className="font-heading text-xl font-bold text-foreground">{group.name}</h2>
              <span className="text-xs text-muted-foreground">{group.tiles.length} specialties</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {group.tiles.map((tile) => {
                const visual = getSpecialtyVisual(tile.code);
                const Icon = visual.icon;
                const chips = (tile.children || []).slice(0, 4);
                return (
                  <Link
                    key={tile.code}
                    to={`/browse-specialties/${tile.code}`}
                    className={`group rounded-xl p-3 border border-border/60 bg-card hover:border-primary/30 hover:shadow-sm transition-all ${
                      tile.sensitive ? 'opacity-90' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${visual.color} flex items-center justify-center mb-2`}>
                      <Icon className={`w-4 h-4 ${visual.textColor}`} />
                    </div>
                    <h3 className={`font-semibold text-xs leading-tight ${tile.sensitive ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {(isHi && tile.meta?.nameHi) ? tile.meta.nameHi : tile.name}
                      {tile.sensitive && <Lock className="inline w-3 h-3 ml-1 -mt-0.5 text-muted-foreground" />}
                      {tile.claimsRestricted && <TriangleAlert className="inline w-3 h-3 ml-1 -mt-0.5 text-amber-500" />}
                    </h3>
                    {!isHi && tile.meta?.nameHi && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{tile.meta.nameHi}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">{t('specialties.n_subspecialties', { n: (tile.children || []).length })}</p>
                    {hasCounts && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {hasProviders(tile)
                          ? `${counts[tile.code].doctors} doctors · ${counts[tile.code].facilities} hospitals / clinics`
                          : 'No doctors yet · Request'}
                      </p>
                    )}
                    {chips.length > 0 && (
                      <p className="text-[9px] text-muted-foreground/80 mt-1 truncate group-hover:text-primary" title={chips.map((c) => c.name).join(', ')}>
                        {chips.map((c) => c.name).join(' · ')}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {!isLoading && fromApi && visibleGroups.length === 0 && (
        <p className="rounded-xl border border-border/60 p-5 text-sm text-muted-foreground">{isHi ? 'इस खोज से कोई विशेषता नहीं मिली।' : 'No specialties match this search.'}</p>
      )}

      {!showAZ && !query && groups.length > INITIAL_GROUPS && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAllGroups(!showAllGroups)}
          className="mt-10 w-full flex items-center justify-center gap-2 text-sm text-primary bg-primary/5 border border-primary/20 rounded-xl py-3"
        >
          {showAllGroups ? t('specialties.show_fewer') : t('specialties.show_all_groups', { n: groups.length })}
          {showAllGroups ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </motion.button>
      )}
    </div>
  );
}

function BrowseLinkGroup({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {links.map(([label, href]) => (
          <Link key={label} to={href} className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs hover:border-primary/50 hover:text-primary">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
