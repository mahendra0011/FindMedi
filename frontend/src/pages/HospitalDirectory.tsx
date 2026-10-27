import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Search, Heart, Brain, Bone, Baby, Eye, Stethoscope, Activity, Users, ChevronDown, ChevronUp, SlidersHorizontal, X, Star, Ambulance, BedDouble, Shield, Calendar, Car, CreditCard, Building, CheckCircle2, Navigation, HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import HospitalCard from '@/components/HospitalCard';

import { CANONICAL_SPECIALTIES } from '@/data/specialties';
import { getSpecialtyVisual } from '@/data/specialtyVisuals';
import { useSpecialtyTiles } from '@/hooks/useSpecialtyBrowse';
import type { ApiRow, Unmodelled } from '@/lib/apiTypes';

// subcatogary.md Part B — Canonical specialties list derived from taxonomy (Psychology removed)
// Backend tree (/categories/specialties?tree=1) owns the list now; this stays
// as the offline fallback so the page never renders an empty grid.
const FALLBACK_SPECIALTIES = CANONICAL_SPECIALTIES.map((spec) => {
  const visual = getSpecialtyVisual(spec.code);
  return {
    code: spec.code,
    name: spec.name,
    icon: visual.icon,
    color: visual.color,
    textColor: visual.textColor,
    children: [],
  };
});


// Show first 14 by default (2 rows of 7)
const INITIAL_VISIBLE = 14;

export default function HospitalDirectory() {
  const [searchParams] = useSearchParams();
  const [hospitals, setHospitals] = useState<ApiRow[]>([]);
  const [allHospitals, setAllHospitals] = useState<Unmodelled>([]);
  const [search, setSearch] = useState(searchParams.get('q') || searchParams.get('search') || '');
  const [cityFilter, setCityFilter] = useState(
    () => searchParams.get('city') || localStorage.getItem('findmedi_city') || localStorage.getItem('mediCore_city') || ''
  );
  const [specFilter, setSpecFilter] = useState(searchParams.get('specialty') || '');
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('');
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);
  const specialtyTree = useSpecialtyTiles();

  // Synchronize with global navbar city selection
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

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [filterHospitalType, setFilterHospitalType] = useState<string[]>(() => {
    const t = searchParams.get('type');
    if (t === 'government') return ['Government'];
    if (t === 'private') return ['Private'];
    return [];
  });
  const [filterEmergency, setFilterEmergency] = useState(false);
  const [filterMinRating, setFilterMinRating] = useState(0);
  const [filterInsurance, setFilterInsurance] = useState(false);
  const [filterBedAvailable, setFilterBedAvailable] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterAccreditation, setFilterAccreditation] = useState<Unmodelled[]>([]);
  const [filterBedSize, setFilterBedSize] = useState('');
  const [filterAmbulance, setFilterAmbulance] = useState(false);
  const [filterEstablished, setFilterEstablished] = useState('');
  const [filterFacilities, setFilterFacilities] = useState<Unmodelled[]>([]);
  const [filterDoctorsRange, setFilterDoctorsRange] = useState('');
  const [filterPayment, setFilterPayment] = useState<Unmodelled[]>([]);
  const [filterInsuranceProvider, setFilterInsuranceProvider] = useState('');

  // Healthcare catalogue se aaye query params (?type= ?category= ?emergency= ?specialty= ?q=)
  useEffect(() => {
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const emergency = searchParams.get('emergency');
    const q = searchParams.get('q') || searchParams.get('search') || '';
    const specialty = searchParams.get('specialty') || '';
    setFilterHospitalType(type ? [type] : []);
    setFilterCategory(category ? [category] : []);
    setFilterEmergency(Boolean(emergency));
    setSearch(q);
    setSpecFilter(specialty);
  }, [searchParams]);

  const getType = (h: Unmodelled) => {
    const t = h.hospitalType || h.type || '';
    if (t.toLowerCase().includes('government')) return 'Government';
    if (t.toLowerCase().includes('private')) return 'Private';
    return t;
  };

  const getCategory = (h: Unmodelled) => {
    const t = h.hospitalType || h.type || '';
    if (t.toLowerCase().includes('multi')) return 'Multi-Specialty';
    if (t.toLowerCase().includes('single')) return 'Single-Specialty';
    if (t.toLowerCase().includes('super')) return 'Super-Specialty';
    return '';
  };

  const loadHospitals = async () => {
    setLoading(true);
    try {
      const params: Unmodelled = { status: 'approved' };
      if (search) params.search = search;
      if (cityFilter && cityFilter !== 'All') params.city = cityFilter;
      if (specFilter && specFilter !== 'All') params.specialty = specFilter;
      const data = await api.getHospitals(params);
      const list = Array.isArray(data) ? data : (data?.data || data?.hospitals || []);
      setAllHospitals(list);
    } catch (e: any) { console.error(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadHospitals(); }, [search, cityFilter, specFilter]);

  const insuranceProviders = useMemo(() => {
    const providers = new Set();
    const list = Array.isArray(allHospitals) ? allHospitals : (allHospitals?.data || allHospitals?.hospitals || []);
    list.forEach((h: Unmodelled) => (h?.insuranceAccepted || []).forEach((i: Unmodelled) => providers.add(i?.provider || i)));
    return [...providers].sort();
  }, [allHospitals]);

  // Unified filter + sort effect
  useEffect(() => {
    const list = Array.isArray(allHospitals) ? allHospitals : (allHospitals?.data || allHospitals?.hospitals || []);
    let filtered = [...list];

    // Department
    if (selectedDept) {
      filtered = filtered.filter(h => h.specialties?.includes(selectedDept));
    }

    // Hospital Type (Government / Private)
    if (filterHospitalType.length > 0) {
      filtered = filtered.filter(h => filterHospitalType.includes(getType(h)));
    }

    // Emergency 24x7
    if (filterEmergency) {
      filtered = filtered.filter(h => h.emergency24x7);
    }

    // Rating
    if (filterMinRating > 0) {
      filtered = filtered.filter(h => (h.rating || 0) >= filterMinRating);
    }

    // Insurance/Cashless
    if (filterInsurance) {
      filtered = filtered.filter(h => h.insuranceAccepted?.length > 0);
    }

    // Bed Availability
    if (filterBedAvailable) {
      filtered = filtered.filter(h => (h.bedAvailability || 0) > 0);
    }

    // Category (Multi / Single / Super-Specialty)
    if (filterCategory.length > 0) {
      filtered = filtered.filter(h => filterCategory.includes(getCategory(h)));
    }

    // Accreditation
    if (filterAccreditation.length > 0) {
      filtered = filtered.filter(h => h.accreditations?.some((a: Unmodelled) => filterAccreditation.includes(a)));
    }

    // Bed Size (uses bedAvailability / available beds as proxy for total beds)
    if (filterBedSize) {
      if (filterBedSize === 'small') filtered = filtered.filter(h => (h.bedAvailability || 0) < 50);
      else if (filterBedSize === 'medium') filtered = filtered.filter(h => (h.bedAvailability || 0) >= 50 && (h.bedAvailability || 0) <= 200);
      else if (filterBedSize === 'large') filtered = filtered.filter(h => (h.bedAvailability || 0) > 200);
    }

    // Ambulance
    if (filterAmbulance) {
      filtered = filtered.filter(h => h.ambulanceService === true);
    }

    // Established Year
    if (filterEstablished) {
      const currentYear = new Date().getFullYear();
      if (filterEstablished === 'old') filtered = filtered.filter(h => (h.establishedYear || 0) < currentYear - 20);
      else if (filterEstablished === 'new') filtered = filtered.filter(h => (h.establishedYear || 0) >= currentYear - 10);
    }

    // Facilities
    if (filterFacilities.length > 0) {
      filtered = filtered.filter(h => filterFacilities.every(f => h.facilities?.includes(f)));
    }

    // Doctors Range
    if (filterDoctorsRange) {
      if (filterDoctorsRange === '50+') filtered = filtered.filter(h => (h.totalDoctors || 0) >= 50);
      else if (filterDoctorsRange === '100+') filtered = filtered.filter(h => (h.totalDoctors || 0) >= 100);
      else if (filterDoctorsRange === '200+') filtered = filtered.filter(h => (h.totalDoctors || 0) >= 200);
    }

    // Payment Mode
    if (filterPayment.length > 0) {
      filtered = filtered.filter(h => filterPayment.some(p => h.payment_modes?.includes(p)));
    }

    // Insurance Provider
    if (filterInsuranceProvider) {
      filtered = filtered.filter(h => h.insuranceAccepted?.some((i: Unmodelled) => (i.provider || i).toLowerCase().includes(filterInsuranceProvider.toLowerCase())));
    }

    // Sort
    if (sortBy === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'established') {
      filtered.sort((a, b) => (b.establishedYear || 0) - (a.establishedYear || 0));
    } else if (sortBy === 'distance') {
      filtered.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    }

    setHospitals(filtered);
  }, [selectedDept, allHospitals, filterHospitalType, filterEmergency, filterMinRating, filterInsurance, filterBedAvailable, filterCategory, filterAccreditation, filterBedSize, filterAmbulance, filterEstablished, filterFacilities, filterDoctorsRange, filterPayment, filterInsuranceProvider, sortBy]);

  useEffect(() => {
    if (specFilter && specFilter !== 'All') {
      setSelectedDept(specFilter);
    }
  }, [specFilter]);

  const handleDepartmentClick = (dept: Unmodelled) => {
    if (selectedDept === dept) {
      setSelectedDept('');
      setSpecFilter('');
    } else {
      setSelectedDept(dept);
      setSpecFilter(dept);
    }
  };

  const visibleSpecialties = useMemo(() => {
    // Tree tiles carry icons, Hindi names and sub-chips; visuals still come
    // from the local map so gradient styling stays unchanged.
    const fromTree = specialtyTree.tiles.map((t) => {
      const visual = getSpecialtyVisual(t.code);
      return {
        code: t.code,
        name: t.name,
        nameHi: t.meta?.nameHi || '',
        icon: visual.icon,
        color: visual.color,
        textColor: visual.textColor,
        children: t.children || [],
        sensitive: !!t.sensitive,
      };
    });
    const list = specialtyTree.fromApi && fromTree.length ? fromTree : FALLBACK_SPECIALTIES;
    return showAllSpecialties ? list : list.slice(0, INITIAL_VISIBLE);
  }, [specialtyTree.tiles, specialtyTree.fromApi, showAllSpecialties]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Find a Hospital
          {cityFilter && cityFilter !== 'All' && (
            <span className="ml-2.5 text-sm font-semibold text-primary px-3 py-1 rounded-full border border-primary/20 bg-primary/5 inline-flex items-center gap-1 align-middle">
              📍 {cityFilter}
            </span>
          )}
        </h1>
        <p className="text-muted-foreground mt-1">Browse specialties or search for hospitals in {cityFilter && cityFilter !== 'All' ? cityFilter : 'your city'}</p>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by hospital name or city..."
          className="pl-12 h-12 text-base rounded-2xl"
        />
      </div>

      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Browse by Specialties
          </h2>
          {ALL_SPECIALTIES.length > INITIAL_VISIBLE && (
            <Button variant="ghost" size="sm" onClick={() => setShowAllSpecialties(!showAllSpecialties)} className="gap-1">
              {showAllSpecialties ? 'Show Less' : 'More'}
              <ChevronDown className={`w-4 h-4 transition-transform ${showAllSpecialties ? 'rotate-180' : ''}`} />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <AnimatePresence>
            {visibleSpecialties.map((dept) => {
              const Icon = dept.icon;
              const isActive = selectedDept === dept.name;
              const subChips = (dept.children || []).slice(0, 3);
              return (
                <motion.button
                  key={dept.code}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDepartmentClick(dept.name)}
                  className={`rounded-xl p-3 border text-center transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                      : 'border-border/60 bg-card hover:border-primary/30 hover:shadow-sm'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${dept.color} flex items-center justify-center mb-2 mx-auto`}>
                    <Icon className={`w-4 h-4 ${dept.textColor}`} />
                  </div>
                  <h3 className={`font-semibold text-xs leading-tight ${dept.sensitive ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {dept.name}
                    {dept.sensitive && <span title="Available discreetly"> 🔒</span>}
                  </h3>
                  {dept.nameHi && <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{dept.nameHi}</p>}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {hospitals.filter(h => h.specialties?.includes(dept.name)).length}
                  </p>
                  {subChips.length > 0 && (
                    <p className="text-[9px] text-muted-foreground/80 mt-1 truncate" title={subChips.map(c => c.name).join(', ')}>
                      {subChips.map(c => c.name).join(' · ')}
                    </p>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Tap a specialty to filter — or open the full{' '}
          <Link to="/browse-specialties" className="text-primary underline underline-offset-2">specialty browser</Link>
        </p>
      </div>

      {/* ═══════════ FILTERS BAR ═══════════ */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className="gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            {showAdvancedFilters ? 'Hide Filters' : 'More Filters'}
          </Button>

          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="h-9 px-3 rounded-xl border border-border bg-background text-sm">
            <option value="relevance">Sort By: Relevance</option>
            <option value="rating">Rating (High-Low)</option>
            <option value="distance">Distance (Nearest First)</option>
            <option value="established">Established Year</option>
          </select>

          <div className="flex flex-wrap gap-2">
            {['Government', 'Private'].map(type => (
              <Button key={type} variant={filterHospitalType.includes(type) ? 'default' : 'outline'} size="sm" onClick={() => setFilterHospitalType(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}>
                {type}
              </Button>
            ))}
            {['Multi-Specialty', 'Single-Specialty', 'Super-Specialty'].map(cat => (
              <Button key={cat} variant={filterCategory.includes(cat) ? 'default' : 'outline'} size="sm" onClick={() => setFilterCategory(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}>
                {cat === 'Multi-Specialty' ? 'Multi' : cat === 'Single-Specialty' ? 'Single' : 'Super'}
              </Button>
            ))}
            <Button variant={filterEmergency ? 'default' : 'outline'} size="sm" onClick={() => setFilterEmergency(!filterEmergency)}>
              <HeartPulse className="w-3.5 h-3.5 mr-1.5" /> 24/7 Emergency
            </Button>
            {[4, 3].map(r => (
              <Button key={r} variant={filterMinRating === r ? 'default' : 'outline'} size="sm" onClick={() => setFilterMinRating(filterMinRating === r ? 0 : r)}>
                <Star className="w-3.5 h-3.5 mr-1.5" /> {r}★ & above
              </Button>
            ))}
            <Button variant={filterBedAvailable ? 'default' : 'outline'} size="sm" onClick={() => setFilterBedAvailable(!filterBedAvailable)}>
              <BedDouble className="w-3.5 h-3.5 mr-1.5" /> Beds Available
            </Button>
            <Button variant={filterAmbulance ? 'default' : 'outline'} size="sm" onClick={() => setFilterAmbulance(!filterAmbulance)}>
              <Ambulance className="w-3.5 h-3.5 mr-1.5" /> Ambulance
            </Button>
          </div>

          {showAdvancedFilters && (
            <Button variant="ghost" size="sm" onClick={() => {
              setFilterHospitalType([]); setFilterEmergency(false); setFilterMinRating(0); setFilterInsurance(false); setFilterBedAvailable(false);
              setFilterCategory([]); setFilterAccreditation([]); setFilterBedSize(''); setFilterAmbulance(false); setFilterEstablished('');
              setFilterFacilities([]); setFilterDoctorsRange(''); setFilterPayment([]); setFilterInsuranceProvider(''); setSortBy('relevance');
              setSelectedDept(''); setSpecFilter(''); setSearch(''); setShowAdvancedFilters(false);
            }} className="text-red-500 hover:text-red-600">
              <X className="w-3.5 h-3.5 mr-1.5" /> Clear All
            </Button>
          )}
        </div>

        {/* Advanced Filters Drawer */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <Card className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Accreditation */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">Accreditation</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['NABH', 'NABL', 'ISO'].map(acc => (
                        <Button key={acc} variant={filterAccreditation.includes(acc) ? 'default' : 'outline'} size="sm" onClick={() => setFilterAccreditation(prev => prev.includes(acc) ? prev.filter(a => a !== acc) : [...prev, acc])} className="text-[11px] h-7">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> {acc}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Hospital Category */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">Category</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['Multi-Specialty', 'Single-Specialty', 'Super-Specialty'].map(cat => (
                        <Button key={cat} variant={filterCategory.includes(cat) ? 'default' : 'outline'} size="sm" onClick={() => setFilterCategory(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])} className="text-[11px] h-7">
                          {cat}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Bed Size */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">Hospital Size</label>
                    <select value={filterBedSize} onChange={e => setFilterBedSize(e.target.value)} className="w-full h-8 text-xs rounded-lg border border-border bg-background">
                      <option value="">Any Size</option>
                      <option value="small">Small (under 50 beds)</option>
                      <option value="medium">Medium (50 to 200)</option>
                      <option value="large">Large (200+)</option>
                    </select>
                  </div>

                  {/* Established Year */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">Established</label>
                    <select value={filterEstablished} onChange={e => setFilterEstablished(e.target.value)} className="w-full h-8 text-xs rounded-lg border border-border bg-background">
                      <option value="">Any</option>
                      <option value="old">20+ Years Old</option>
                      <option value="new">Less than 10 Years</option>
                    </select>
                  </div>

                  {/* Doctors Count */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">Doctors Count</label>
                    <select value={filterDoctorsRange} onChange={e => setFilterDoctorsRange(e.target.value)} className="w-full h-8 text-xs rounded-lg border border-border bg-background">
                      <option value="">Any</option>
                      <option value="50+">50+ Doctors</option>
                      <option value="100+">100+ Doctors</option>
                      <option value="200+">200+ Doctors</option>
                    </select>
                  </div>

                  {/* Facilities */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">Facilities</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['Parking', 'Blood Bank', 'Pharmacy', 'Lab', 'Wheelchair Access'].map(f => (
                        <Button key={f} variant={filterFacilities.includes(f) ? 'default' : 'outline'} size="sm" onClick={() => setFilterFacilities(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])} className="text-[11px] h-7">
                          {f}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Insurance/Cashless */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">Insurance / Cashless</label>
                    <div className="space-y-2">
                      <Button variant={filterInsurance ? 'default' : 'outline'} size="sm" onClick={() => setFilterInsurance(!filterInsurance)} className="w-full text-[11px] h-7 justify-start">
                        <Shield className="w-3 h-3 mr-1" /> Cashless Accepted
                      </Button>
                      <select value={filterInsuranceProvider} onChange={e => setFilterInsuranceProvider(e.target.value)} className="w-full h-8 text-xs rounded-lg border border-border bg-background">
                        <option value="">Any Insurance Provider</option>
                        {insuranceProviders.map((p: Unmodelled)  => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">Payment Mode</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['Cash', 'UPI', 'Card', 'Cashless'].map(p => (
                        <Button key={p} variant={filterPayment.includes(p) ? 'default' : 'outline'} size="sm" onClick={() => setFilterPayment(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} className="text-[11px] h-7">
                          <CreditCard className="w-3 h-3 mr-1" /> {p}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl font-bold text-foreground">
            {selectedDept ? `${selectedDept} Hospitals` : 'All Hospitals'}
            <span className="text-base font-normal text-muted-foreground ml-2">({hospitals.length})</span>
          </h2>
          {selectedDept && (
            <Button variant="ghost" size="sm" onClick={() => { setSelectedDept(''); setSpecFilter(''); }}>
              Clear filter
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : hospitals.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No hospitals found</h3>
            <p className="text-muted-foreground">Try a different department or search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hospitals.map((h, i) => (
              <HospitalCard key={h._id} hospital={h} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
