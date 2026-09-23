import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Star,
  IndianRupee,
  Award,
  Users,
  Scale,
  Gavel,
  SlidersHorizontal,
  X,
  Zap,
  BadgeCheck,
  Languages,
  GraduationCap,
  HeartPulse,
  ShieldAlert,
  Ambulance,
  ShoppingCart,
  Home as HomeIcon,
  Briefcase,
  MessagesSquare,
  AlertCircle,
  Video,
  Phone,
  MessageSquare,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import LawyerCard from '@/components/LawyerCard';
import LawyerUrgentIntakeModal from '@/components/LawyerUrgentIntakeModal';

export const LAWYER_CATEGORY_THEME: Record<
  string,
  { icon: any; color: string; textColor: string }
> = {
  'Medical Negligence': {
    icon: HeartPulse,
    color: 'from-red-500/20 to-red-500/5',
    textColor: 'text-red-600',
  },
  'Insurance Disputes': {
    icon: ShieldAlert,
    color: 'from-amber-500/20 to-amber-500/5',
    textColor: 'text-amber-600',
  },
  'Accident & MLC': {
    icon: Ambulance,
    color: 'from-orange-500/20 to-orange-500/5',
    textColor: 'text-orange-600',
  },
  'Consumer Rights': {
    icon: ShoppingCart,
    color: 'from-emerald-500/20 to-emerald-500/5',
    textColor: 'text-emerald-600',
  },
  'Family & Personal': {
    icon: Users,
    color: 'from-pink-500/20 to-pink-500/5',
    textColor: 'text-pink-600',
  },
  'Criminal Law': {
    icon: Gavel,
    color: 'from-slate-500/20 to-slate-500/5',
    textColor: 'text-slate-700',
  },
  'Civil & Property': {
    icon: HomeIcon,
    color: 'from-blue-500/20 to-blue-500/5',
    textColor: 'text-blue-600',
  },
  'Corporate & Contract': {
    icon: Briefcase,
    color: 'from-indigo-500/20 to-indigo-500/5',
    textColor: 'text-indigo-600',
  },
  'General Consultation': {
    icon: MessagesSquare,
    color: 'from-teal-500/20 to-teal-500/5',
    textColor: 'text-teal-600',
  },
};

export function getLawyerCategoryCard(category: string) {
  return (
    LAWYER_CATEGORY_THEME[category] || {
      icon: Gavel,
      color: 'from-slate-500/20 to-slate-500/5',
      textColor: 'text-slate-600',
    }
  );
}

export const DEFAULT_LAWYER_CATEGORIES = ['All', ...Object.keys(LAWYER_CATEGORY_THEME)];

const EXPERIENCE_RANGES = [
  { label: '0–5 years', min: 0, max: 5 },
  { label: '5–10 years', min: 5, max: 10 },
  { label: '10+ years', min: 10, max: 999 },
];

const LANGUAGES = ['Hindi', 'English', 'Marathi', 'Gujarati', 'Bengali', 'Tamil', 'Telugu', 'Kannada', 'Punjabi'];

export default function FindLawyer() {
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [allLawyers, setAllLawyers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState<string>(() => {
    return (
      new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '').get('city') ||
      localStorage.getItem('findmedi_city') ||
      localStorage.getItem('mediCore_city') ||
      'Jabalpur'
    );
  });
  const [serviceCities, setServiceCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBroadcastUrgent, setShowBroadcastUrgent] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Synchronize with global city selection (from Navbar or other pages)
  useEffect(() => {
    const onCityChange = (e: any) => {
      const newCity = e.detail || localStorage.getItem('findmedi_city') || localStorage.getItem('mediCore_city');
      if (newCity && newCity !== cityFilter) {
        setCityFilter(newCity);
      }
    };
    window.addEventListener('cityChange', onCityChange);
    window.addEventListener('storage', onCityChange);
    return () => {
      window.removeEventListener('cityChange', onCityChange);
      window.removeEventListener('storage', onCityChange);
    };
  }, [cityFilter]);

  // Advanced filters state — mirrors HospitalDoctors.tsx
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [expFilter, setExpFilter] = useState('');
  const [feeRange, setFeeRange] = useState<[number, number]>([0, 5000]);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortBy, setSortBy] = useState('relevance');
  const [languageFilter, setLanguageFilter] = useState<string[]>([]);
  const [courtSearch, setCourtSearch] = useState('');

  // Fetch Service Cities for dropdown
  useEffect(() => {
    api.getServiceCities()
      .then((res: any) => {
        const list = res?.cities || (Array.isArray(res) ? res : []);
        setServiceCities(list);
      })
      .catch((err) => console.warn('Failed to load service cities:', err));
  }, []);

  // Fetch lawyers from backend
  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await api.getLawyers({
          category: categoryFilter !== 'All' ? categoryFilter : undefined,
          city: cityFilter !== 'All' ? cityFilter : undefined,
          search: search.trim() || undefined,
        });
        const list = Array.isArray(data) ? data : data?.lawyers || data?.data || [];
        setAllLawyers(Array.isArray(list) ? list : []);
      } catch (err: any) {
        console.error('Failed to load lawyers:', err);
        setLoadError('Failed to load advocates. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [categoryFilter, cityFilter, search]);

  // Client-side filtering & sorting on loaded dataset
  useEffect(() => {
    let filtered = Array.isArray(allLawyers) ? [...allLawyers] : [];

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          (l.name || '').toLowerCase().includes(q) ||
          (l.bio || '').toLowerCase().includes(q) ||
          (l.jurisdictionCity || '').toLowerCase().includes(q) ||
          (l.practiceCategories || []).some((c: string) => c.toLowerCase().includes(q))
      );
    }

    if (categoryFilter !== 'All') {
      filtered = filtered.filter((l) =>
        (l.practiceCategories || []).some(
          (c: string) => c.toLowerCase() === categoryFilter.toLowerCase()
        )
      );
    }

    if (cityFilter !== 'All') {
      const cq = cityFilter.toLowerCase();
      filtered = filtered.filter((l) => {
        const city = (l.operatingCity || l.jurisdictionCity || '').toLowerCase();
        return city.includes(cq);
      });
    }

    if (availabilityFilter === 'available') {
      filtered = filtered.filter((l) => l.isAvailable === true);
    }

    if (expFilter) {
      const r = EXPERIENCE_RANGES.find((e) => e.label === expFilter);
      if (r) {
        filtered = filtered.filter((l) => {
          const y = Number(l.yearsOfPractice || 0);
          return y >= r.min && y < r.max;
        });
      }
    }

    filtered = filtered.filter((l) => {
      const fee = l.consultationFee || 0;
      return fee >= feeRange[0] && fee <= feeRange[1];
    });

    if (ratingFilter > 0) {
      filtered = filtered.filter((l) => (l.rating || 0) >= ratingFilter);
    }

    if (languageFilter.length > 0) {
      filtered = filtered.filter((l) =>
        languageFilter.some((lang) => (l.languages || []).includes(lang))
      );
    }

    if (courtSearch.trim()) {
      const cq = courtSearch.toLowerCase();
      filtered = filtered.filter((l) =>
        (l.courtsPracticedIn || []).some((court: string) => court.toLowerCase().includes(cq))
      );
    }

    // Sort
    if (sortBy === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'experience') {
      filtered.sort((a, b) => (b.yearsOfPractice || 0) - (a.yearsOfPractice || 0));
    } else if (sortBy === 'fee') {
      filtered.sort((a, b) => (a.consultationFee || 0) - (b.consultationFee || 0));
    } else if (sortBy === 'fee_high') {
      filtered.sort((a, b) => (b.consultationFee || 0) - (a.consultationFee || 0));
    }

    setLawyers(filtered);
  }, [
    allLawyers,
    search,
    categoryFilter,
    availabilityFilter,
    expFilter,
    feeRange,
    ratingFilter,
    languageFilter,
    courtSearch,
    sortBy,
  ]);

  const activeFilterCount = [
    categoryFilter !== 'All',
    cityFilter !== 'All',
    !!availabilityFilter,
    !!expFilter,
    feeRange[0] > 0 || feeRange[1] < 5000,
    ratingFilter > 0,
    languageFilter.length > 0,
    !!courtSearch.trim(),
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    setCategoryFilter('All');
    setCityFilter('All');
    setSearch('');
    setAvailabilityFilter('');
    setExpFilter('');
    setFeeRange([0, 5000]);
    setRatingFilter(0);
    setLanguageFilter([]);
    setCourtSearch('');
    setSortBy('relevance');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header — same pattern as Doctor list */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
              <Scale className="w-3.5 h-3.5" />
              Verified In-App Advocates & Hospital Legal Help
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Find a Lawyer
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {lawyers.length} verified advocates available {cityFilter !== 'All' ? `in ${cityFilter}` : 'across all service cities'}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search advocates by name, practice area, or court..."
              className="pl-12 h-12 text-sm sm:text-base rounded-2xl bg-card border-border/60 shadow-sm"
            />
          </div>
        </div>

        {/* Path B Banner: Need Urgent Help — Any Lawyer (LC03 §3) */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-5 sm:p-6 shadow-lg shadow-red-500/10">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-yellow-300 text-[11px] font-bold uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 fill-yellow-300" /> Need Urgent Legal Help Right Now?
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Get connected to any available lawyer in your category within minutes.
              </h2>
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                Hospital discharge issues, medical negligence notices, insurance rejections, or accident MLC documentation. Fast single-step intake.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => setShowBroadcastUrgent(true)}
              className="bg-white hover:bg-white/95 text-red-600 hover:text-red-700 font-bold text-xs sm:text-sm h-11 px-5 rounded-xl shadow-lg shrink-0 gap-2 self-start md:self-auto"
            >
              <Zap className="w-4 h-4 fill-red-600" /> Select Category & Broadcast Request →
            </Button>
          </div>
          <Gavel className="w-48 h-48 absolute -right-6 -bottom-10 text-white/10 pointer-events-none hidden sm:block" />
        </div>

        {/* Category Theme Cards Strip — LC01 §2.2 & §2.3 (mirrors SPEC_CARD_THEME) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              Browse by Legal Specialization
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2.5">
            {DEFAULT_LAWYER_CATEGORIES.map((cat) => {
              const isAll = cat === 'All';
              const theme = isAll
                ? { icon: Scale, color: 'from-primary/20 to-primary/5', textColor: 'text-primary' }
                : getLawyerCategoryCard(cat);
              const Icon = theme.icon;
              const count = isAll
                ? allLawyers.length
                : allLawyers.filter((l) =>
                    (l.practiceCategories || []).some(
                      (c: string) => c.toLowerCase() === cat.toLowerCase()
                    )
                  ).length;

              const isSelected = categoryFilter === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all text-center group',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-md shadow-primary/10 ring-1 ring-primary'
                      : 'border-border/60 bg-card hover:border-primary/40 hover:shadow-sm'
                  )}
                >
                  <div
                    className={cn(
                      'w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center transition-transform group-hover:scale-105',
                      theme.color
                    )}
                  >
                    <Icon className={cn('w-5 h-5', theme.textColor)} />
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-semibold leading-tight line-clamp-2',
                      isSelected ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {isAll ? 'All Categories' : cat}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters Bar — mirrors HospitalDoctors.tsx */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Availability */}
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-medium"
            >
              <option value="">All Advocates</option>
              <option value="available">🟢 Available Now</option>
            </select>

            {/* Experience */}
            <select
              value={expFilter}
              onChange={(e) => setExpFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-medium"
            >
              <option value="">Experience</option>
              {EXPERIENCE_RANGES.map((r) => (
                <option key={r.label} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>

            {/* Fee Range Slider */}
            <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-background text-xs">
              <IndianRupee className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="range"
                min={0}
                max={5000}
                step={100}
                value={feeRange[0]}
                onChange={(e) => setFeeRange([parseInt(e.target.value), feeRange[1]])}
                className="w-16 h-1 accent-primary"
              />
              <span className="text-[11px] text-muted-foreground w-10 text-right">
                ₹{feeRange[0]}
              </span>
              <span className="text-[11px] text-muted-foreground">-</span>
              <input
                type="range"
                min={0}
                max={5000}
                step={100}
                value={feeRange[1]}
                onChange={(e) => setFeeRange([feeRange[0], parseInt(e.target.value)])}
                className="w-16 h-1 accent-primary"
              />
              <span className="text-[11px] text-muted-foreground w-10">₹{feeRange[1]}</span>
            </div>

            {/* Rating Filter */}
            <div className="flex gap-1">
              {[4, 3].map((r) => (
                <Button
                  key={r}
                  variant={ratingFilter === r ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRatingFilter(ratingFilter === r ? 0 : r)}
                  className="h-9 text-xs px-2.5 rounded-xl"
                >
                  <Star className="w-3.5 h-3.5 mr-1 text-yellow-500 fill-yellow-500" /> {r}★ & above
                </Button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-medium"
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="rating">Rating (High-Low)</option>
              <option value="experience">Experience (High-Low)</option>
              <option value="fee">Fee (Low-High)</option>
              <option value="fee_high">Fee (High-Low)</option>
            </select>

            {/* More Filters Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-9 gap-1.5 rounded-xl text-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {showAdvanced ? 'Hide Advanced' : 'More Filters'}
            </Button>

            {/* Clear All */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-red-500 hover:text-red-600 h-9 text-xs gap-1"
              >
                <X className="w-3.5 h-3.5" /> Clear All ({activeFilterCount})
              </Button>
            )}
          </div>

          {/* Expandable Advanced Filters Drawer */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="p-4 rounded-2xl bg-card border-border/60">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Language Spoken */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-2 block flex items-center gap-1">
                        <Languages className="w-3.5 h-3.5 text-primary" /> Languages Spoken
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {LANGUAGES.map((l) => (
                          <Button
                            key={l}
                            variant={languageFilter.includes(l) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() =>
                              setLanguageFilter((prev) =>
                                prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
                              )
                            }
                            className="text-[11px] h-7 rounded-lg"
                          >
                            {l}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Court Search */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-2 block flex items-center gap-1">
                        <Scale className="w-3.5 h-3.5 text-primary" /> Court Practiced In
                      </label>
                      <Input
                        placeholder="e.g. High Court, District Court, Consumer Forum"
                        value={courtSearch}
                        onChange={(e) => setCourtSearch(e.target.value)}
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>

                    {/* Bar Council Verification Info */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-2 block flex items-center gap-1">
                        <BadgeCheck className="w-3.5 h-3.5 text-primary" /> Verification Standard
                      </label>
                      <div className="p-2.5 rounded-xl bg-muted/30 border border-border/40 text-xs text-muted-foreground">
                        <p className="flex items-center gap-1.5 font-medium text-foreground mb-0.5">
                          <BadgeCheck className="w-4 h-4 text-primary" /> 100% Bar Council Verified
                        </p>
                        <p className="text-[11px]">
                          All advocates are verified against State Bar Council enrollment numbers before consultation enablement.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3-Column Card Grid (matches HospitalDoctors.tsx structure exactly) */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-2xl border border-border/50 p-6 animate-pulse h-72 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-muted" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
                <div className="h-9 bg-muted rounded-xl" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-16 space-y-3">
            <AlertCircle className="w-16 h-16 text-destructive/50 mx-auto" />
            <h3 className="text-lg font-semibold text-foreground">Failed to load advocates</h3>
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="rounded-xl">
              Retry
            </Button>
          </div>
        ) : lawyers.length === 0 ? (
          <div className="text-center py-16 space-y-4 bg-card rounded-3xl border border-dashed border-border/60 p-8">
            <Scale className="w-14 h-14 text-muted-foreground/30 mx-auto" />
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-foreground">No advocates match your filters</h3>
              <p className="text-xs text-muted-foreground">
                Try clearing selected filters or post a broadcast urgent request to notify all online advocates in your legal category.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="rounded-xl text-xs">
                Clear Filters
              </Button>
              <Button
                size="sm"
                onClick={() => setShowBroadcastUrgent(true)}
                className="rounded-xl text-xs bg-red-600 hover:bg-red-700 text-white gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-white" /> Broadcast Urgent Request
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lawyers.map((lawyer, i) => (
              <LawyerCard key={lawyer._id} lawyer={lawyer} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Path B Broadcast Urgent Modal */}
      <LawyerUrgentIntakeModal
        open={showBroadcastUrgent}
        onOpenChange={setShowBroadcastUrgent}
        lawyer={null}
        broadcast={true}
      />
    </div>
  );
}
