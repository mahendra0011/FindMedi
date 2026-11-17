import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search, MapPin, AlertTriangle,
  Phone, HeartPulse, LayoutGrid, Rows3, SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import UnifiedSearch from '@/components/search/UnifiedSearch';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import { RenderEntityCard } from '@/components/cards';

const VERTICALS = [
  { key: '', label: 'All Services' },
  { key: 'doctor', label: 'Doctors' },
  { key: 'hospital', label: 'Hospitals' },
  { key: 'clinic', label: 'Clinics' },
  { key: 'lab', label: 'Diagnostic Labs' },
  { key: 'pharmacy', label: 'Pharmacies' },
  { key: 'transport', label: 'Ambulance / Rides' },
];

// Spec 02 §4 - the sorts the listing offers.
const SORTS = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'nearest', label: 'Nearest' },
  { key: 'rating', label: 'Rating' },
  { key: 'price_low', label: 'Price: low to high' },
  { key: 'earliest_slot', label: 'Earliest slot' },
  { key: 'experience', label: 'Experience' },
  { key: 'most_booked', label: 'Most booked' },
];

// Spec 02 §4 - the quick filter chips shown with the cards. Each one is a
// filter over data the card contract actually carries, so a chip can never
// promise something the listing cannot answer.
const QUICK_CHIPS = [
  { key: 'open_now', label: 'Open now' },
  { key: 'twenty_four_seven', label: '24x7' },
  { key: 'home_visit', label: 'Home visit' },
  { key: 'video', label: 'Video' },
  { key: 'women', label: 'Women provider' },
  { key: 'govt', label: 'Govt' },
  { key: 'insurance', label: 'PM-JAY / Insurance' },
  { key: 'under_500', label: 'Under ₹500' },
  { key: 'accessible', label: 'Parking / Wheelchair' },
  { key: 'language', label: 'Language' },
];

/** Map a legacy search row onto the public card contract (Spec 02 §5). */
function legacyRowToCard(item: any) {
  const vertical = String(item?.vertical || 'facility');
  const type = vertical === 'lab' ? 'diagnostic'
    : vertical === 'transport' ? 'ambulance'
      : vertical;
  return {
    id: item.id,
    type,
    slug: item.slug,
    name: item.fullName || item.name || '',
    tagline: item.subType || item.specialization || '',
    imageUrl: item.image || '',
    gallery: item.image ? [item.image] : [],
    verified: !!item.verified,
    ratingAvg: Number(item.rating || 0),
    ratingCount: Number(item.reviewCount || 0),
    ratingVisible: Number(item.reviewCount || 0) >= 3,
    openNow: !!item.openNow,
    openLabel: item.openNow ? 'Open now' : 'Closed',
    is24x7: !!item.openNow,
    distanceKm: item.distanceKm ?? null,
    priceFrom: item.fee ?? null,
    badges: [],
    trustBadges: item.verified ? ['Verified'] : [],
    schemes: [],
    languages: [],
    amenities: [],
    city: item.city || '',
    area: item.address?.area || '',
    geo: undefined,
    category: { code: vertical, label: item.category || item.specialization || vertical },
    modes: [],
    isSponsored: false,
    isSaved: false,
  };
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get('q') || '';
  const city = searchParams.get('city') || '';

  const [vertical, setVertical] = useState(searchParams.get('vertical') || '');
  const [sortBy, setSortBy] = useState('relevance');
  const [activeChips, setActiveChips] = useState<string[]>([]);
  const [language, setLanguage] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [results, setResults] = useState<any[]>([]);
  const [taxonomy, setTaxonomy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const qParams = new URLSearchParams();
      if (query.trim()) qParams.set('q', query.trim());
      if (city && city !== 'All Cities') qParams.set('city', city);
      if (vertical) qParams.set('category', vertical);
      qParams.set('limit', '50');

      const res: any = await api.get(`/search/unified?${qParams.toString()}`);
      if (res?.success) {
        setResults(res.results || []);
        setTaxonomy(res.taxonomy || null);
      } else {
        setResults([]);
        setTaxonomy(null);
      }
    } catch {
      toast.error('Search request failed. Please check network.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, city, vertical]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  /** The card contract for every row, whatever produced it. */
  const entries = useMemo(
    () => results.map((item) => ({
      item,
      card: item.source === 'provider' && item.card ? item.card : legacyRowToCard(item),
    })),
    [results],
  );

  const toggleChip = (key: string) => {
    setActiveChips((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]));
  };

  const matchesChip = (card: any, key: string) => {
    switch (key) {
      case 'open_now': return !!card.openNow;
      case 'twenty_four_seven': return !!card.is24x7 || (card.badges || []).includes('24x7');
      case 'home_visit': return (card.modes || []).includes('home_visit') || (card.serviceArea?.radiusKm > 0);
      case 'video': return (card.modes || []).includes('video');
      case 'women': return (card.amenities || []).some((a: string) => /women/i.test(a));
      case 'govt': return (card.badges || []).includes('Govt');
      case 'insurance': return (card.schemes || []).length > 0;
      case 'under_500': return typeof card.priceFrom === 'number' && card.priceFrom > 0 && card.priceFrom < 500;
      case 'accessible': return (card.amenities || []).some((a: string) => /parking|wheelchair|wheel chair/i.test(a));
      case 'language': return !!language && (card.languages || []).includes(language);
      default: return true;
    }
  };

  const filteredResults = useMemo(() => {
    const filtered = entries.filter((entry) => activeChips.every((chip) => matchesChip(entry.card, chip)));

    const priceOf = (card: any) => (typeof card.priceFrom === 'number' && card.priceFrom > 0 ? card.priceFrom : Number.MAX_SAFE_INTEGER);
    const distanceOf = (card: any) => (typeof card.distanceKm === 'number' ? card.distanceKm : Number.MAX_SAFE_INTEGER);

    const sorted = [...filtered];
    switch (sortBy) {
      case 'nearest':
        sorted.sort((a, b) => distanceOf(a.card) - distanceOf(b.card));
        break;
      case 'rating':
        sorted.sort((a, b) => (b.card.ratingAvg || 0) - (a.card.ratingAvg || 0) || (b.card.ratingCount || 0) - (a.card.ratingCount || 0));
        break;
      case 'price_low':
        sorted.sort((a, b) => priceOf(a.card) - priceOf(b.card));
        break;
      case 'earliest_slot':
        sorted.sort((a, b) => String(a.card.nextSlotAt || 'zzz').localeCompare(String(b.card.nextSlotAt || 'zzz')));
        break;
      case 'experience':
        sorted.sort((a, b) => (b.card.experience || 0) - (a.card.experience || 0));
        break;
      case 'most_booked':
        sorted.sort((a, b) => (b.card.bookingsCount || 0) - (a.card.bookingsCount || 0));
        break;
      default:
        break;
    }
    return sorted;
  }, [entries, activeChips, sortBy, language]);

  const detailPathFor = (item: any, card: any) => {
    if (item.source === 'provider') return `/facility/${card.slug || card.id}`;
    if (item.vertical === 'doctor') return `/doctor/${item.id}`;
    if (item.vertical === 'medicine') return `/buy-medicine?q=${encodeURIComponent(item.fullName)}`;
    return `/facility/${card.slug || item.id}`;
  };

  const languageOptions = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((entry) => (entry.card.languages || []).forEach((l: string) => set.add(l)));
    return Array.from(set).slice(0, 12);
  }, [entries]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 space-y-6">
        {/* Top Search Hero Strip */}
        <div className="bg-card border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Find Healthcare Providers & Services
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unified discovery across clinics, hospitals, diagnostic centers, and certified doctors
              </p>
            </div>
            {city && city !== 'All Cities' && (
              <Badge variant="outline" className="w-fit text-xs gap-1 py-1 px-2.5">
                <MapPin className="w-3.5 h-3.5 text-primary" /> Location: {city}
              </Badge>
            )}
          </div>

          {/* Unified Search Input bar */}
          <UnifiedSearch
            initialQuery={query}
            initialCity={city}
            compact={true}
            onSearchSubmitted={(q, c) => {
              const nextParams = new URLSearchParams();
              if (q) nextParams.set('q', q);
              if (c) nextParams.set('city', c);
              setSearchParams(nextParams);
            }}
          />
        </div>

        {/* Emergency Alert Prompt if triggered by symptom */}
        {taxonomy?.isEmergency && (
          <div className="p-4 rounded-xl border border-destructive bg-destructive/10 text-destructive flex flex-col sm:flex-row sm:items-center justify-between gap-3" role="alert">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm">Emergency Alert: Immediate Medical Care Needed</h3>
                <p className="text-xs text-foreground/80 mt-0.5">
                  {taxonomy.emergencyMessage || 'Your symptoms may indicate an acute medical emergency. Dial 108 or 112 immediately.'}
                </p>
              </div>
            </div>
            <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => { window.location.href = 'tel:108'; }}>
              <Phone className="w-3.5 h-3.5" /> Call 108 Ambulance
            </Button>
          </div>
        )}

        {/* Filter Strip */}
        <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-border/60">
          {/* Vertical tabs */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
            {VERTICALS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setVertical(v.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  vertical === v.key
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            {/* Sort (Spec 02 §4) */}
            <label className="flex items-center gap-1.5 text-muted-foreground">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="sr-only">Sort results</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </label>

            {/* View variant (Spec 02 §3) */}
            <div className="flex items-center rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setView('grid')}
                aria-label="Grid view"
                aria-pressed={view === 'grid'}
                className={`px-2 py-1 ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                aria-label="List view"
                aria-pressed={view === 'list'}
                className={`px-2 py-1 ${view === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}
              >
                <Rows3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick filter chips (Spec 02 §4) */}
        <div className="flex items-center gap-2 flex-wrap">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => toggleChip(chip.key)}
              aria-pressed={activeChips.includes(chip.key)}
              className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
                activeChips.includes(chip.key)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {chip.label}
            </button>
          ))}
          {languageOptions.length > 0 && (
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                if (e.target.value && !activeChips.includes('language')) {
                  setActiveChips((prev) => [...prev, 'language']);
                }
              }}
              aria-label="Filter by language"
              className="rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Any language</option>
              {languageOptions.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          )}
        </div>

        {/* Results Count & Taxonomy insight */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing <strong>{filteredResults.length}</strong> {filteredResults.length === 1 ? 'provider' : 'providers'}
            {query ? ` for "${query}"` : ''}
          </span>
          {taxonomy?.matchedSpecialty && (
            <span>
              Specialty: <strong className="text-foreground">{taxonomy.matchedSpecialty}</strong>
            </span>
          )}
        </div>

        {/* Results Grid / List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Card key={n} className="animate-pulse">
                <CardContent className="p-5 space-y-3">
                  <div className="h-5 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded w-full mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredResults.length > 0 ? (
          <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-3'}>
            {filteredResults.map(({ item, card }) => {
              const detailPath = detailPathFor(item, card);
              return (
                <RenderEntityCard
                  key={card.id || detailPath}
                  type={card.type}
                  item={card}
                  variant={view === 'grid' ? 'grid' : 'list'}
                  onPrimary={() => navigate(detailPath)}
                  onSecondary={() => navigate(detailPath)}
                />
              );
            })}
          </div>
        ) : (
          /* Zero-Results State */
          <Card className="p-12 text-center border-dashed">
            <HeartPulse className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground">No Verified Providers Found</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-5">
              We couldn't find any live providers matching "{query}" in {city || 'this region'}. Try clearing filters or submit a service request.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setVertical('');
                setActiveChips([]);
                setLanguage('');
              }}
            >
              Reset Filters
            </Button>
          </Card>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
