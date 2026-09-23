import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,

  Sparkles,
  Zap,
  Filter,
  Clock,
  ArrowRight,
  X,
  RotateCcw,
  SlidersHorizontal,
  ShieldCheck,
  Star,
  Users,
  MapPin,
  HeartHandshake,
  FileText,
  Pill,
  ClipboardList,
  Bell,
  UserCog,
  Loader2,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AssistantCard from '@/components/AssistantCard';
import AssistantUrgentIntakeModal from '@/components/AssistantUrgentIntakeModal';
import { BookingStatusPanel } from '@/components/assistant/BookingStatusPanel';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

// AC01 §2: Category Theme Mapping
export const ASSISTANT_CATEGORY_THEME: Record<
  string,
  { icon: any; color: string; textColor: string; desc: string }
> = {
  'Paperwork & Admission Help': {
    icon: FileText,
    color: 'from-blue-500/20 to-blue-500/5',
    textColor: 'text-blue-600 dark:text-blue-400',
    desc: 'Admissions, discharges, and bill clearance',
  },
  'Medicine Pickup': {
    icon: Pill,
    color: 'from-emerald-500/20 to-emerald-500/5',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    desc: 'Pharmacy queues & timely bed delivery',
  },
  'Report Collection': {
    icon: ClipboardList,
    color: 'from-purple-500/20 to-purple-500/5',
    textColor: 'text-purple-600 dark:text-purple-400',
    desc: 'Pathology & radiology test report handover',
  },
  'Errand & General Needs': {
    icon: Bell,
    color: 'from-amber-500/20 to-amber-500/5',
    textColor: 'text-amber-600 dark:text-amber-400',
    desc: 'Food, attendant rotation & urgent errands',
  },
  'Full-Time Attendant': {
    icon: UserCog,
    color: 'from-indigo-500/20 to-indigo-500/5',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    desc: 'Dedicated day or overnight bedside care',
  },
  'Elderly/Special Care': {
    icon: HeartHandshake,
    color: 'from-pink-500/20 to-pink-500/5',
    textColor: 'text-pink-600 dark:text-pink-400',
    desc: 'Wheelchair guidance & gentle patient assistance',
  },
};

export const DEFAULT_ASSISTANT_CATEGORIES = [
  'All',
  ...Object.keys(ASSISTANT_CATEGORY_THEME),
];



export default function BookAssistant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedBookingId = searchParams.get('bookingId');

  // Active booking tracking
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [loadingActive, setLoadingActive] = useState(true);

  // Search & Filter State
  const [assistants, setAssistants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [categoryFilter, setCategoryFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState<string>(() => {
    return (
      searchParams.get('city') ||
      localStorage.getItem('findmedi_city') ||
      localStorage.getItem('mediCore_city') ||
      'Jabalpur'
    );
  });
  const [serviceCities, setServiceCities] = useState<any[]>([]);
  const [minExpFilter, setMinExpFilter] = useState<number>(0);
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Urgent Broadcast Modal State
  const [showBroadcastUrgent, setShowBroadcastUrgent] = useState(false);

  // Fetch Service Cities for dropdown
  useEffect(() => {
    api.getServiceCities()
      .then((res: any) => {
        const list = res?.cities || (Array.isArray(res) ? res : []);
        setServiceCities(list);
      })
      .catch((err: any) => console.warn('Failed to load service cities:', err));
  }, []);

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

  const handleCityFilterChange = (cityName: string) => {
    setCityFilter(cityName);
    if (cityName !== 'All') {
      localStorage.setItem('findmedi_city', cityName);
      window.dispatchEvent(new CustomEvent('cityChange', { detail: cityName }));
    }
  };

  const allCityOptions = useMemo(() => {
    const list = serviceCities.map((c) => (typeof c === 'string' ? c : c.name)).filter(Boolean);
    const defaults = ['Jabalpur', 'Indore', 'Bhopal', 'Delhi', 'Pune'];
    return Array.from(new Set([...list, ...defaults]));
  }, [serviceCities]);

  // 1. Fetch active booking if any
  const fetchActiveBooking = async () => {
    if (!user) {
      // Guest visitors — no active booking to fetch
      setActiveBooking(null);
      setLoadingActive(false);
      return;
    }

    try {
      if (requestedBookingId) {
        const res = await api.getAssistantBooking(requestedBookingId);
        if (res?.booking) {
          setActiveBooking(res.booking);
          return;
        }
      }
      const res = await api.getActiveAssistantBooking();
      if (res?.activeBooking) {
        setActiveBooking(res.activeBooking);
      } else {
        setActiveBooking(null);
      }
    } catch {
      setActiveBooking(null);
    } finally {
      setLoadingActive(false);
    }
  };

  useEffect(() => {
    fetchActiveBooking();
  }, [requestedBookingId, user]);

  // 2. Fetch assistants list from API
  const fetchAssistants = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};

      if (categoryFilter && categoryFilter !== 'All') {
        params.category = categoryFilter;
      }
      if (cityFilter && cityFilter !== 'All') {
        params.city = cityFilter;
      }
      if (search.trim()) {
        params.search = search.trim();
      }
      if (minExpFilter > 0) {
        params.minExperience = String(minExpFilter);
      }
      if (minRatingFilter > 0) {
        params.minRating = String(minRatingFilter);
      }
      if (sortBy) {
        params.sortBy = sortBy;
      }

      const res = await api.getAssistants(params);
      let list = res?.assistants || (Array.isArray(res) ? res : []);

      // Strict client-side filter: if a specific city is selected, ONLY show assistants for that city/service area
      if (cityFilter && cityFilter !== 'All') {
        const cq = cityFilter.toLowerCase().trim();
        list = list.filter((a: any) => {
          const acity = (a.operatingCity || '').toLowerCase().trim();
          const matchesOperatingCity = acity === cq || acity.includes(cq) || cq.includes(acity);
          const matchesCoveredArea = (a.hospitalsCovered || []).some((h: string) => {
            const hq = (h || '').toLowerCase().trim();
            return hq === cq || hq.includes(cq) || cq.includes(hq);
          });
          return matchesOperatingCity || matchesCoveredArea;
        });
      }

      if (availableOnly) {
        list = list.filter((a: any) => a.isAvailable);
      }

      setAssistants(list);
    } catch (err: any) {
      console.warn('Failed to load assistants:', err.message);
      setAssistants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssistants();
  }, [
    categoryFilter,
    cityFilter,
    search,
    minExpFilter,
    minRatingFilter,
    sortBy,
    availableOnly,
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (categoryFilter !== 'All') count++;
    if (cityFilter !== 'All') count++;
    if (minExpFilter > 0) count++;
    if (minRatingFilter > 0) count++;
    if (availableOnly) count++;
    return count;
  }, [
    categoryFilter,
    cityFilter,
    minExpFilter,
    minRatingFilter,
    availableOnly,
  ]);

  const handleClearFilters = () => {
    setCategoryFilter('All');
    setCityFilter('All');
    setMinExpFilter(0);
    setMinRatingFilter(0);
    setAvailableOnly(false);
    setSearch('');
    setSortBy('relevance');
  };

  // Distinct cities from assistants
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    assistants.forEach((a) => {
      if (a.operatingCity) set.add(a.operatingCity);
    });
    return Array.from(set);
  }, [assistants]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Hospital Attendants & Caretakers</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground tracking-tight">
              Book a Personal Hospital Assistant
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              On-demand bedside care, OPD navigation, admission forms, and medicine runs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/patient/assistants')}
                className="rounded-xl text-xs gap-1.5 h-9"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>My Bookings</span>
              </Button>
            )}
          </div>
        </div>

        {/* ACTIVE BOOKING TRACKING PANEL */}
        {activeBooking && (
          <div className="rounded-3xl border border-primary/30 bg-card p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-sm font-bold text-foreground">
                  Active Assistant Booking ({activeBooking.bookingNumber})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveBooking(null)}
                className="text-xs text-muted-foreground h-7"
              >
                Dismiss
              </Button>
            </div>
            <BookingStatusPanel
              booking={activeBooking}
              currentUser={user}
              onRefresh={fetchActiveBooking}
              onNewBooking={() => setActiveBooking(null)}
            />
          </div>
        )}



        {/* ── URGENT BROADCAST BANNER (Path B) ────────────────────────────────── */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-500/15 via-red-500/5 to-amber-500/10 border border-red-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-500/20">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <span>Need an assistant urgently right now?</span>
                <Badge className="bg-red-600 text-white text-[10px] py-0 px-2 font-semibold">
                  Immediate Dispatch
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get connected to any available verified assistant at{' '}
                <span className="font-bold text-foreground">
                  your hospital
                </span>{' '}
                within minutes. First to accept will report on-site.
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => setShowBroadcastUrgent(true)}
            className="w-full sm:w-auto shrink-0 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 h-10 px-5 gap-2"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Select Services & Broadcast Request →</span>
          </Button>
        </div>

        {/* ── CATEGORY THEME CARDS STRIP (AC01 §2) ───────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Browse by Service Needed
            </span>
            {categoryFilter !== 'All' && (
              <button
                type="button"
                onClick={() => setCategoryFilter('All')}
                className="text-xs text-primary font-semibold hover:underline"
              >
                Clear Category
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(ASSISTANT_CATEGORY_THEME).map(([cat, theme]) => {
              const Icon = theme.icon;
              const isSelected = categoryFilter === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(isSelected ? 'All' : cat)}
                  className={cn(
                    'p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between overflow-hidden relative group',
                    isSelected
                      ? 'border-primary ring-2 ring-primary/30 bg-card shadow-md'
                      : 'border-border/60 bg-card hover:border-primary/40 hover:shadow-sm'
                  )}
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br mb-2',
                      theme.color
                    )}
                  >
                    <Icon className={cn('w-4 h-4', theme.textColor)} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground leading-tight line-clamp-2">
                      {cat}
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                      {theme.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SEARCH & ADVANCED FILTERS BAR ───────────────────────────────────── */}
        <div className="bg-card rounded-2xl border border-border/70 p-4 space-y-3 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
              <Input
                placeholder="Search assistant by name, service, or bio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 text-xs rounded-xl"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>



            {/* Filter Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'rounded-xl text-xs h-10 gap-2 border-border',
                activeFilterCount > 0 && 'border-primary text-primary font-bold bg-primary/5'
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold focus:ring-2 focus:ring-primary/20"
            >
              <option value="relevance">Sort: Recommended</option>
              <option value="rating">Top Rated ⭐</option>
              <option value="experience">Most Experienced 🏆</option>
              <option value="price_asc">Rate: Low to High</option>
              <option value="price_desc">Rate: High to Low</option>
            </select>
          </div>

          {/* Collapsible Advanced Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
              >
                {/* Available Only */}
                <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border/50">
                  <input
                    type="checkbox"
                    id="available-only"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                    className="rounded accent-primary"
                  />
                  <label htmlFor="available-only" className="font-semibold text-foreground cursor-pointer">
                    Online & Available Now
                  </label>
                </div>

                {/* Min Experience */}
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Min Experience
                  </label>
                  <select
                    value={minExpFilter}
                    onChange={(e) => setMinExpFilter(Number(e.target.value))}
                    className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs"
                  >
                    <option value={0}>Any Experience</option>
                    <option value={2}>2+ Years</option>
                    <option value={4}>4+ Years</option>
                    <option value={6}>6+ Years</option>
                  </select>
                </div>

                {/* Min Rating */}
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Minimum Rating
                  </label>
                  <select
                    value={minRatingFilter}
                    onChange={(e) => setMinRatingFilter(Number(e.target.value))}
                    className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs"
                  >
                    <option value={0}>All Ratings</option>
                    <option value={4.5}>4.5+ Stars</option>
                    <option value={4.8}>4.8+ Stars</option>
                  </select>
                </div>

                {/* Clear All */}
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="w-full h-8 rounded-lg text-xs gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── ASSISTANTS GRID ─────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-bold text-foreground">{assistants.length}</span> verified attendant{assistants.length === 1 ? '' : 's'}
              {cityFilter !== 'All' ? (
                <span> in <span className="font-bold text-primary">{cityFilter}</span></span>
              ) : (
                <span> across all cities</span>
              )}
              {categoryFilter !== 'All' && ` for ${categoryFilter}`}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-card rounded-2xl border border-border/50 h-72 animate-pulse p-4 space-y-3"
                >
                  <div className="h-20 bg-muted/60 rounded-xl" />
                  <div className="h-4 bg-muted/50 rounded w-1/2" />
                  <div className="h-3 bg-muted/40 rounded w-3/4" />
                  <div className="h-3 bg-muted/30 rounded w-full" />
                </div>
              ))}
            </div>
          ) : assistants.length === 0 ? (
            <div className="bg-card rounded-3xl border border-border/70 p-12 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 text-muted-foreground mx-auto flex items-center justify-center">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">No Assistants Found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  No assistants currently match your chosen filters. Try clearing filters or broadcasting an urgent request.
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleClearFilters} className="rounded-xl text-xs">
                  Reset All Filters
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowBroadcastUrgent(true)}
                  className="rounded-xl text-xs bg-red-600 hover:bg-red-700 text-white gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" /> Broadcast Urgent Request
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assistants.map((assistant, index) => (
                <AssistantCard
                  key={assistant._id || index}
                  assistant={assistant}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Broadcast Urgent Request Modal */}
      <AssistantUrgentIntakeModal
        open={showBroadcastUrgent}
        onOpenChange={setShowBroadcastUrgent}
        assistant={null}
        hospital={''}
        broadcast={true}
        initialCategory={categoryFilter !== 'All' ? categoryFilter : undefined}
        onSuccess={() => {
          setShowBroadcastUrgent(false);
          fetchActiveBooking();
        }}
      />
    </div>
  );
}
