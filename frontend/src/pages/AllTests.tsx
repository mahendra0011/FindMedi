import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, FlaskConical, Microscope, Building2, Stethoscope,
  Droplets, Beaker, Activity, Heart, Scan, Brain,
  Eye, Ear, Bone, Baby, Wind, ShieldAlert,
  Dna, Syringe, Pill, TestTube, Sparkles, ChevronDown,
  SlidersHorizontal, ArrowUpDown, ArrowRight, Lock, Home, Star, Clock,
  BadgeCheck, X, MapPin, DollarSign, Radio
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import TestCard from '@/components/TestCard';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { api } from '@/lib/api';

// subcatogary.md Part C §4 — Canonical test categories
import {
  FALLBACK_TEST_CATEGORIES,
  FALLBACK_CATEGORY_TESTS,
  getTestCategoryVisual,
} from '@/data/testCategoriesFallback';
import type { ApiRow, Unmodelled } from '@/lib/apiTypes';


const INITIAL_VISIBLE = 11;

export default function AllTests() {
  const navigate = useNavigate();
  const { addItem, updateQty, entries } = useCart();
  const [categories, setCategories] = useState(FALLBACK_TEST_CATEGORIES);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const p = new URLSearchParams(window.location.search).get('category');
    return p || null;
  });
  const [searchQuery, setSearchQuery] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
  const [providerFilter, setProviderFilter] = useState('all');
  const [sortBy, setSortBy] = useState('popularity');
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [rxFilter, setRxFilter] = useState('all');
  const [homeCollectionOnly, setHomeCollectionOnly] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState('any');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [tests, setTests] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const STORE_ID = 'test-booking';

  useEffect(() => {
    let mounted = true;
    api.getPublicCategories({ type: 'test', isActive: 'true' })
      .then(res => {
        if (mounted && res?.categories && res.categories.length > 0) {
          setCategories(res.categories);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.getLabTests();
        setTests(res.tests || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const visibleCategories = showAllCategories ? categories : categories.slice(0, INITIAL_VISIBLE);
  const activeTests = selectedCategory ? (FALLBACK_CATEGORY_TESTS[selectedCategory] || []) : [];

  const filteredTests = tests.filter((test) => {
    if (providerFilter !== 'all' && test.providerType !== providerFilter) return false;
    if (selectedCategory && test.category !== selectedCategory) return false;
    if (rxFilter === 'direct' && test.prescriptionReq) return false;
    if (rxFilter === 'rx' && !test.prescriptionReq) return false;
    if (homeCollectionOnly && !test.homeCollection) return false;
    if (test.price < priceRange[0] || test.price > priceRange[1]) return false;
    if (distanceFilter !== 'any') {
      const km = parseFloat(test.distance);
      const max = parseInt(distanceFilter);
      if (isNaN(km) || km > max) return false;
    }
    if (ratingFilter > 0 && (test.rating || 0) < ratingFilter) return false;
    if (searchQuery && !(test.name || test.testName || '').toLowerCase().includes(searchQuery.toLowerCase()) && !(test.providerName || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const sortedTests = [...filteredTests].sort((a, b) => {
    if (sortBy === 'price-low') return (a.price || 0) - (b.price || 0);
    if (sortBy === 'price-high') return (b.price || 0) - (a.price || 0);
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  const bookingEntries = entries.filter((e: Unmodelled) => e.storeId === STORE_ID);
  const bookingTotal = bookingEntries.reduce((s: Unmodelled, e: Unmodelled) => s + (e.item.price || 0) * e.qty, 0);
  const bookingCount = bookingEntries.reduce((s: Unmodelled, e: Unmodelled) => s + e.qty, 0);

  const testsWithHandlers = sortedTests.map((test) => ({
    ...test,
    onBook: () => { addItem(test, STORE_ID); },
    onUploadRx: () => {
      // Trigger prescription upload file picker
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.pdf';
      input.onchange = (e) => {
        if (e.target.files?.[0]) {
          addItem(test, STORE_ID);
          toast?.success?.('Prescription uploaded, test added to booking');
        }
      };
      input.click();
    },
    onViewProvider: () => {
      if (test.providerType === 'hospital') navigate(`/hospitals/${test.providerId}`);
      else if (test.providerType === 'clinic') navigate(`/clinic/${test.providerId}`);
      else if (test.providerType === 'radiographer' || test.providerType === 'sonographer' || test.providerType === 'imaging_center') navigate(`/imaging/${test.providerId}/details`);
      else if (test.providerType === 'lab_technician' || test.providerType === 'phlebotomist' || test.providerType === 'pathology') navigate(`/lab/${test.providerId}/details`);
      else if (test.providerType === 'diagnostic_center') navigate(`/lab/${test.providerId}/details`);
      else navigate(`/lab/${test.providerId}/details`);
    },
  }));

  const activeFilterCount = [providerFilter !== 'all', rxFilter !== 'all', homeCollectionOnly, distanceFilter !== 'any', ratingFilter > 0].filter(Boolean).length;

  const ProviderChip = ({ value, icon: Icon, label }: Unmodelled) => (
    <button onClick={() => setProviderFilter(value)}
      className={cn(
        'flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold border transition-all shrink-0',
        providerFilter === value
          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
          : 'bg-card text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground'
      )}>
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Book Tests</h1>
          <p className="text-muted-foreground mt-1">Choose from a wide range of tests across hospitals, clinics, and pathology labs</p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tests, hospitals, clinics..."
            className="pl-12 h-12 text-base rounded-2xl" />
        </div>

        {/* Provider Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
          <ProviderChip value="all" label="All" />
          <ProviderChip value="hospital" icon={Building2} label="Hospital" />
          <ProviderChip value="clinic" icon={Stethoscope} label="Clinic" />
          <ProviderChip value="pathology" icon={Microscope} label="Pathology" />
          <ProviderChip value="diagnostic_center" icon={Syringe} label="Diagnostic Center" />
          <ProviderChip value="imaging_center" icon={Radio} label="Imaging Center" />
        </div>

        <div className="space-y-14">

        {/* ─── Browse by Category ─── */}
        <section>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <FlaskConical className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-foreground">Browse by Category</h2>
                <p className="text-xs text-muted-foreground">Select a category to find relevant tests</p>
              </div>
            </div>
            {TEST_CATEGORIES.length > INITIAL_VISIBLE && (
              <Button variant="ghost" size="sm" onClick={() => setShowAllCategories(!showAllCategories)} className="gap-1">
                {showAllCategories ? 'Show Less' : 'More'}
                <ChevronDown className={cn('w-4 h-4 transition-transform', showAllCategories && 'rotate-180')} />
              </Button>
            )}
          </motion.div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-11 gap-2.5">
            {visibleCategories.map((cat, i) => {
              const visual = getTestCategoryVisual(cat.name || cat.code);
              const Icon = cat.icon || visual.icon;
              const color = cat.color || visual.color;
              const textColor = cat.textColor || visual.textColor;
              return (
                <motion.button
                  key={cat.code || cat.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                  className={cn(
                    'rounded-xl p-2.5 border text-center transition-all',
                    selectedCategory === cat.name
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                      : 'border-border/60 bg-card hover:border-primary/30 hover:shadow-sm'
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center mx-auto mb-1.5', color)}>
                    <Icon className={cn('w-4 h-4', textColor)} />
                  </div>
                  <h3 className="font-semibold text-[10px] leading-tight text-foreground">{cat.name}</h3>
                </motion.button>
              );
            })}
          </div>

          {/* Selected Category Tests */}
          {selectedCategory && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-semibold text-sm text-foreground flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-full bg-primary" />
                  {selectedCategory}
                </h3>
                <button onClick={() => setSelectedCategory(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clear</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeTests.map((test) => (
                  <span key={test} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer">
                    <FlaskConical className="w-3 h-3 text-primary" />
                    {test}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </section>
        <section>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-heading text-xl font-bold text-foreground">{selectedCategory || 'All Tests'}</h2>
          </motion.div>
          <p className="text-xs text-muted-foreground mb-6">{selectedCategory ? `Available ${selectedCategory.toLowerCase()} from providers near you` : 'Browse tests from hospitals, clinics & labs near you'}</p>

          {/* ─── Filters Bar ─── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 mb-6">
            {/* Row: Sort + Rx + Home Collection + More Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="h-8 px-2.5 rounded-lg text-xs bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="popularity">Sort: Popularity</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Rating: High to Low</option>
              </select>

              <select value={rxFilter} onChange={e => setRxFilter(e.target.value)}
                className="h-8 px-2.5 rounded-lg text-xs bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="all">All Tests</option>
                <option value="direct">Book Directly 🟢</option>
                <option value="rx">Rx Required 🔒</option>
              </select>

              <button onClick={() => setHomeCollectionOnly(!homeCollectionOnly)}
                className={cn(
                  'flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium border transition-all',
                  homeCollectionOnly
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border/50 bg-card text-muted-foreground hover:border-primary/30'
                )}>
                <Home className="w-3.5 h-3.5" />
                Home Collection
              </button>

              <button onClick={() => setShowMoreFilters(!showMoreFilters)}
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium border border-border/50 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                More Filters
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-white text-[8px] font-bold flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>
            </div>

            {/* Advanced Filters Panel */}
            <AnimatePresence>
              {showMoreFilters && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden">
                  <div className="bg-muted/30 rounded-xl border border-border/40 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground">Advanced Filters</h4>
                      <button onClick={() => setShowMoreFilters(false)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
                    </div>

                    {/* Distance */}
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />Distance</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {['1', '3', '5', '10', 'any'].map(d => (
                          <button key={d} onClick={() => setDistanceFilter(d)}
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all',
                              distanceFilter === d
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border/50 bg-card text-muted-foreground hover:border-primary/30'
                            )}>{d === 'any' ? 'Any' : `Within ${d} km`}</button>
                        ))}
                      </div>
                    </div>

                    {/* Rating */}
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-500" />Rating</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {[{ v: 0, l: 'Any' }, { v: 4.5, l: '4.5+' }, { v: 4, l: '4.0+' }, { v: 3.5, l: '3.5+' }].map(r => (
                          <button key={r.v} onClick={() => setRatingFilter(r.v)}
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all',
                              ratingFilter === r.v
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border/50 bg-card text-muted-foreground hover:border-primary/30'
                            )}>{r.l}</button>
                        ))}
                      </div>
                    </div>

                    {/* Price Range */}
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-primary" />Price Range</p>
                      <div className="flex items-center gap-3">
                        <input type="range" min="0" max="5000" step="100" value={priceRange[1]}
                          onChange={e => setPriceRange([0, parseInt(e.target.value)])}
                          className="flex-1 accent-primary h-1.5" />
                        <span className="text-xs font-semibold text-foreground min-w-[60px] text-right">₹0 - ₹{priceRange[1]}</span>
                      </div>
                    </div>

                    {/* Clear All */}
                    <button onClick={() => { setDistanceFilter('any'); setRatingFilter(0); setPriceRange([0, 5000]); setRxFilter('all'); setHomeCollectionOnly(false); setProviderFilter('all'); }}
                      className="w-full text-xs font-medium text-primary hover:text-primary/80 py-2 border-t border-border/30 mt-2 pt-3 transition-colors">
                      Clear All Filters
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground">{testsWithHandlers.length} test{testsWithHandlers.length !== 1 ? 's' : ''} found</p>
          </div>

          {testsWithHandlers.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
              <Search className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No tests match your filters</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setProviderFilter('all'); setRxFilter('all'); setHomeCollectionOnly(false); setPriceRange([0, 5000]); setDistanceFilter('any'); setRatingFilter(0); setSearchQuery(''); }}>
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {testsWithHandlers.map((test, i) => (
                <TestCard key={i} test={test} index={i} />
              ))}
            </div>
          )}
        </section>

        </div>
      </div>

      {/* ─── Sticky Bottom Bar ─── */}
      {bookingCount > 0 && (
        <motion.div initial={{ y: 80 }} animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/60 shadow-2xl shadow-black/10 backdrop-blur-xl bg-card/95">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <FlaskConical className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{bookingCount} Test{bookingCount !== 1 ? 's' : ''} Selected</p>
                <p className="text-xs text-muted-foreground">Total: ₹{bookingTotal.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-9"
                onClick={() => { bookingEntries.forEach((e: Unmodelled) => updateQty(e.key, 0)); }}>
                Clear
              </Button>
              <Button size="sm" className="gap-2 rounded-xl h-10 px-6 text-sm font-bold shadow-lg shadow-primary/30"
                onClick={() => navigate('/all-tests')}>
                Book Now
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
