import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, FlaskConical, Shield, Star, MapPin, Home, Clock,
  SlidersHorizontal, BadgeCheck, Zap, Tag, DollarSign, X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PathologyClinicCard from '@/components/PathologyClinicCard';
import DiagnosticCenterCard from '@/components/DiagnosticCenterCard';
import ImagingCenterCard from '@/components/ImagingCenterCard';

const allClinics = [
  // Pathology Labs
  { _id: '1', name: 'SRL Diagnostics', type: 'Pathology Lab', providerCategory: 'Pathology Lab', rating: 4.6, reviewsCount: 200, verified: true, open: true, tags: ['24x7', 'Home Collection', 'NABL Accredited', 'Reports Online'], testsAvailable: 250, homeCollection: true, reportTime: 'Within 6 hrs', distance: '1.2 km', phone: '9876543210', startingPrice: 150, hasOffer: true },
  { _id: '3', name: 'Metropolis Healthcare', type: 'Pathology Lab', providerCategory: 'Pathology Lab', rating: 4.4, reviewsCount: 180, verified: true, open: false, tags: ['NABL Accredited', 'Reports Online'], testsAvailable: 300, homeCollection: false, reportTime: 'Within 12 hrs', distance: '0.8 km', phone: '9876543212', startingPrice: 199 },
  { _id: '5', name: 'Dr. Lal PathLabs', type: 'Pathology Lab', providerCategory: 'Pathology Lab', rating: 4.7, reviewsCount: 550, verified: true, open: true, tags: ['Home Collection', 'NABL Accredited', 'Reports Online'], testsAvailable: 450, homeCollection: true, reportTime: 'Within 12 hrs', distance: '4.5 km', phone: '9876543214', startingPrice: 120 },
  // Diagnostic Centers
  { _id: '2', name: 'Thyrocare Technologies', type: 'Diagnostic Center', providerCategory: 'Diagnostic Center', rating: 4.8, reviewsCount: 350, verified: true, open: true, tags: ['NABL Accredited', 'Home Collection', 'Reports Online', 'Imaging Available'], testsAvailable: 500, homeCollection: true, reportTime: 'Within 24 hrs', distance: '2.5 km', phone: '9876543211', startingPrice: 299, imagingFields: 'MRI, CT, X-Ray, Ultrasound', cardiacFields: 'ECG, 2D Echo' },
  { _id: '4', name: 'Apollo Diagnostics', type: 'Diagnostic Center', providerCategory: 'Diagnostic Center', rating: 4.7, reviewsCount: 420, verified: true, open: true, tags: ['NABL Accredited', 'Home Collection', 'Reports Online', '24x7', 'Imaging Available'], testsAvailable: 400, homeCollection: true, reportTime: 'Within 4 hrs', distance: '3.0 km', phone: '9876543213', startingPrice: 350, hasOffer: true, imagingFields: 'MRI, CT Scan, X-Ray, Ultrasound', cardiacFields: 'ECG, 2D Echo, TMT' },
  { _id: '6', name: 'Vijaya Diagnostic Centre', type: 'Diagnostic Center', providerCategory: 'Diagnostic Center', rating: 4.5, reviewsCount: 310, verified: true, open: true, tags: ['NABL Accredited', 'Home Collection', 'Imaging Available'], testsAvailable: 350, homeCollection: true, reportTime: 'Within 6 hrs', distance: '6.0 km', phone: '9876543215', startingPrice: 180, imagingFields: 'X-Ray, Ultrasound', cardiacFields: 'ECG' },
  // Imaging Centers
  { _id: '7', name: 'Siemens Healthineers Imaging', type: 'Imaging Center', providerCategory: 'Imaging Center', rating: 4.9, reviewsCount: 220, verified: true, open: true, tags: ['MRI Available', 'CT Available', 'Reports Online', 'Emergency Imaging'], testsAvailable: 120, homeCollection: false, reportTime: 'Within 4 hrs', distance: '3.5 km', phone: '9876543216', startingPrice: 500, imagingTypes: ['MRI', 'CT', 'X-Ray', 'Ultrasound'], emergencyImaging: true, hasOffer: true },
  { _id: '8', name: 'W Pratiksha Hospital - Radiology', type: 'Imaging Center', providerCategory: 'Imaging Center', rating: 4.3, reviewsCount: 140, verified: true, open: true, tags: ['MRI Available', 'CT Available', 'X-Ray Available', 'Digital X-Ray'], testsAvailable: 80, homeCollection: false, reportTime: 'Within 6 hrs', distance: '5.0 km', phone: '9876543217', startingPrice: 750, imagingTypes: ['MRI', 'CT Scan', 'X-Ray', 'Mammography'], emergencyImaging: false },
  { _id: '9', name: 'Mahajan Imaging Centre', type: 'Imaging Center', providerCategory: 'Imaging Center', rating: 4.7, reviewsCount: 190, verified: true, open: false, tags: ['MRI Available', 'CT Available', 'Reports Online'], testsAvailable: 60, homeCollection: false, reportTime: 'Within 12 hrs', distance: '2.0 km', phone: '9876543218', startingPrice: 600, imagingTypes: ['MRI', 'CT Scan', 'Ultrasound'], emergencyImaging: false },
];

const CATEGORIES = [
  { key: 'All', label: 'All', icon: null },
  { key: 'Pathology Lab', label: 'Pathology Lab', icon: FlaskConical },
  { key: 'Diagnostic Center', label: 'Diagnostic Center', icon: Shield },
  { key: 'Imaging Center', label: 'Imaging Center', icon: Zap },
];

const parseKm = (d) => {
  const m = (d || '').match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 999;
};

const parseHrs = (t) => {
  const m = (t || '').match(/(\d+)/);
  return m ? parseInt(m[1]) : 999;
};

export default function BookTest() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [openNow, setOpenNow] = useState(false);
  const [sortBy, setSortBy] = useState('rating');
  const [homeCollectionOnly, setHomeCollectionOnly] = useState(false);
  const [nablOnly, setNablOnly] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState('any');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [reportTimeFilter, setReportTimeFilter] = useState('any');
  const [minTests, setMinTests] = useState(0);
  const [twentyFourSeven, setTwentyFourSeven] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [reportsOnline, setReportsOnline] = useState(false);
  const [discountOnly, setDiscountOnly] = useState(false);

  const categoryData = activeCategory === 'All' ? allClinics : allClinics.filter(c => c.providerCategory === activeCategory);

  const filtered = categoryData.filter((c) => {
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !c.type.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (openNow && !c.open) return false;
    if (homeCollectionOnly && !c.homeCollection) return false;
    if (nablOnly && !c.verified) return false;
    if (distanceFilter !== 'any') {
      const km = parseKm(c.distance);
      const max = parseInt(distanceFilter);
      if (km > max) return false;
    }
    if (ratingFilter > 0 && c.rating < ratingFilter) return false;
    if (reportTimeFilter !== 'any') {
      const hrs = parseHrs(c.reportTime);
      const max = parseInt(reportTimeFilter);
      if (hrs > max) return false;
    }
    if (minTests > 0 && c.testsAvailable < minTests) return false;
    if (twentyFourSeven && !c.tags.includes('24x7')) return false;
    if (c.startingPrice < priceRange[0] || c.startingPrice > priceRange[1]) return false;
    if (reportsOnline && !c.tags.includes('Reports Online')) return false;
    if (discountOnly && !c.hasOffer) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'distance') return parseKm(a.distance) - parseKm(b.distance);
    if (sortBy === 'price') return a.startingPrice - b.startingPrice;
    return 0;
  });

  const activeFilterCount = [openNow, homeCollectionOnly, nablOnly, distanceFilter !== 'any', ratingFilter > 0, reportTimeFilter !== 'any', minTests > 0, twentyFourSeven, reportsOnline, discountOnly].filter(Boolean).length;

  const clearFilters = () => {
    setOpenNow(false); setHomeCollectionOnly(false); setNablOnly(false);
    setDistanceFilter('any'); setRatingFilter(0); setReportTimeFilter('any');
    setMinTests(0); setTwentyFourSeven(false); setPriceRange([0, 1000]); setReportsOnline(false);
    setDiscountOnly(false);
  };

  const ToggleChip = ({ label, icon: Icon, active, onClick }) => (
    <button onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium border transition-all',
        active ? 'border-primary bg-primary/5 text-primary' : 'border-border/50 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
      )}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );

  const PillBtn = ({ label, active, onClick }) => (
    <button onClick={onClick}
      className={cn(
        'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all',
        active ? 'border-primary bg-primary/5 text-primary' : 'border-border/50 bg-card text-muted-foreground hover:border-primary/30'
      )}>{label}</button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-foreground">Find Diagnostic Centers</h1>
        <p className="text-muted-foreground mt-1">Search for NABL accredited labs, diagnostic centers, and imaging centres near you</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by lab name, centre, or location..."
          className="pl-12 h-12 text-base rounded-2xl" />
      </div>

      {/* ─── Category Tabs ─── */}
      <div className="flex gap-2 mb-6">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <button key={cat.key} onClick={() => { setActiveCategory(cat.key); setSearchQuery(''); clearFilters(); }}
              className={cn(
                'flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold border transition-all',
                activeCategory === cat.key
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground'
              )}>
              {Icon && <Icon className="w-4 h-4" />}
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ─── Filters ─── */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <ToggleChip label="Open Now" active={openNow} onClick={() => setOpenNow(!openNow)} />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="h-8 px-2.5 rounded-lg text-xs bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="rating">Sort: Rating</option>
            <option value="distance">Sort: Nearest</option>
            <option value="price">Sort: Price (Low)</option>
          </select>
          {activeCategory !== 'Imaging Center' && (
            <>
              <ToggleChip label="Home Collection" icon={Home} active={homeCollectionOnly} onClick={() => setHomeCollectionOnly(!homeCollectionOnly)} />
              <ToggleChip label="NABL Accredited" icon={BadgeCheck} active={nablOnly} onClick={() => setNablOnly(!nablOnly)} />
            </>
          )}
          <select value={distanceFilter} onChange={e => setDistanceFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg text-xs bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="any">Distance: Any</option>
            <option value="1">Within 1 km</option>
            <option value="3">Within 3 km</option>
            <option value="5">Within 5 km</option>
            <option value="10">Within 10 km</option>
          </select>
          <button onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium border border-border/50 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            More Filters
            {activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-primary text-white text-[8px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
          </button>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showMoreFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="bg-muted/30 rounded-xl border border-border/40 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground">Advanced Filters</h4>
                  <button onClick={() => setShowMoreFilters(false)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
                </div>

                <div>
                  <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-500" />Rating</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {[{ v: 0, l: 'Any' }, { v: 4.5, l: '4.5+' }, { v: 4, l: '4.0+' }, { v: 3.5, l: '3.5+' }].map(r => (
                      <PillBtn key={r.v} label={r.l} active={ratingFilter === r.v} onClick={() => setRatingFilter(r.v)} />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" />Report Turnaround</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {[{ v: 'any', l: 'Any' }, { v: '4', l: 'Within 4 hrs' }, { v: '6', l: 'Within 6 hrs' }, { v: '12', l: 'Within 12 hrs' }, { v: '24', l: 'Within 24 hrs' }].map(r => (
                      <PillBtn key={r.v} label={r.l} active={reportTimeFilter === r.v} onClick={() => setReportTimeFilter(r.v)} />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5 text-primary" />Tests Available</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {[{ v: 0, l: 'Any' }, { v: 100, l: '100+' }, { v: 250, l: '250+' }, { v: 400, l: '400+' }, { v: 500, l: '500+' }].map(r => (
                      <PillBtn key={r.v} label={r.l} active={minTests === r.v} onClick={() => setMinTests(r.v)} />
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <ToggleChip label="24x7 Available" icon={Zap} active={twentyFourSeven} onClick={() => setTwentyFourSeven(!twentyFourSeven)} />
                  <ToggleChip label="Reports Online" icon={BadgeCheck} active={reportsOnline} onClick={() => setReportsOnline(!reportsOnline)} />
                  <ToggleChip label="Active Discounts" icon={Tag} active={discountOnly} onClick={() => setDiscountOnly(!discountOnly)} />
                </div>

                <div>
                  <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-primary" />Price Range (Starting)</p>
                  <div className="flex items-center gap-3">
                    <input type="range" min="0" max="1000" step="50" value={priceRange[1]}
                      onChange={e => setPriceRange([0, parseInt(e.target.value)])}
                      className="flex-1 accent-primary h-1.5" />
                    <span className="text-xs font-semibold text-foreground min-w-[70px] text-right">₹0 - ₹{priceRange[1]}</span>
                  </div>
                </div>

                <button onClick={clearFilters}
                  className="w-full text-xs font-medium text-primary hover:text-primary/80 py-2 border-t border-border/30 mt-2 pt-3 transition-colors">
                  Clear All Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">{sorted.length} {activeCategory === 'Imaging Center' ? 'centre' : 'provider'}{sorted.length !== 1 ? 's' : ''} found</p>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
          <Search className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No {activeCategory === 'Imaging Center' ? 'centres' : 'providers'} match your filters</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={clearFilters}>
            Clear all filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sorted.map((clinic, i) => {
            if (clinic.providerCategory === 'Imaging Center') return <ImagingCenterCard key={clinic._id} clinic={clinic} index={i} />;
            if (clinic.providerCategory === 'Diagnostic Center') return <DiagnosticCenterCard key={clinic._id} clinic={clinic} index={i} />;
            return <PathologyClinicCard key={clinic._id} clinic={clinic} index={i} />;
          })}
        </div>
      )}
    </div>
  );
}
