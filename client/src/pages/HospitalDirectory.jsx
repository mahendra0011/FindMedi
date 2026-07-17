import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Search, Heart, Brain, Bone, Baby, Eye, Stethoscope, Activity, Users, ChevronDown, ChevronUp, SlidersHorizontal, X, Star, Ambulance, BedDouble, Shield, Calendar, Car, CreditCard, Building, CheckCircle2, Navigation, HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import HospitalCard from '@/components/HospitalCard';

const ALL_SPECIALTIES = [
  { name: 'General Physician/ Internal Medicine', icon: Stethoscope, color: 'from-blue-500/20 to-blue-500/5', textColor: 'text-blue-500' },
  { name: 'Dermatology', icon: Eye, color: 'from-pink-500/20 to-pink-500/5', textColor: 'text-pink-500' },
  { name: 'Obstetrics & Gynaecology', icon: Heart, color: 'from-red-500/20 to-red-500/5', textColor: 'text-red-500' },
  { name: 'Orthopaedics', icon: Bone, color: 'from-blue-500/20 to-blue-500/5', textColor: 'text-blue-500' },
  { name: 'ENT', icon: Users, color: 'from-indigo-500/20 to-indigo-500/5', textColor: 'text-indigo-500' },
  { name: 'Neurology', icon: Brain, color: 'from-purple-500/20 to-purple-500/5', textColor: 'text-purple-500' },
  { name: 'Cardiology', icon: Heart, color: 'from-red-500/20 to-red-500/5', textColor: 'text-red-500' },
  { name: 'Urology', icon: Activity, color: 'from-teal-500/20 to-teal-500/5', textColor: 'text-teal-500' },
  { name: 'Gastroenterology/GI medicine', icon: Activity, color: 'from-amber-500/20 to-amber-500/5', textColor: 'text-amber-500' },
  { name: 'Psychiatry', icon: Brain, color: 'from-violet-500/20 to-violet-500/5', textColor: 'text-violet-500' },
  { name: 'Paediatrics', icon: Baby, color: 'from-green-500/20 to-green-500/5', textColor: 'text-green-500' },
  { name: 'Pulmonology/ Respiratory Medicine', icon: Activity, color: 'from-cyan-500/20 to-cyan-500/5', textColor: 'text-cyan-500' },
  { name: 'Endocrinology', icon: Activity, color: 'from-yellow-500/20 to-yellow-500/5', textColor: 'text-yellow-500' },
  { name: 'Nephrology', icon: Activity, color: 'from-sky-500/20 to-sky-500/5', textColor: 'text-sky-500' },
  { name: 'Neurosurgery', icon: Brain, color: 'from-purple-600/20 to-purple-600/5', textColor: 'text-purple-600' },
  { name: 'Rheumatology', icon: Activity, color: 'from-orange-500/20 to-orange-500/5', textColor: 'text-orange-500' },
  { name: 'Ophthalmology', icon: Eye, color: 'from-lime-500/20 to-lime-500/5', textColor: 'text-lime-500' },
  { name: 'Surgical Gastroenterology', icon: Activity, color: 'from-amber-600/20 to-amber-600/5', textColor: 'text-amber-600' },
  { name: 'Infectious Disease', icon: Activity, color: 'from-rose-500/20 to-rose-500/5', textColor: 'text-rose-500' },
  { name: 'General & Laparoscopic Surgeon', icon: Stethoscope, color: 'from-slate-500/20 to-slate-500/5', textColor: 'text-slate-500' },
  { name: 'Psychology', icon: Brain, color: 'from-fuchsia-500/20 to-fuchsia-500/5', textColor: 'text-fuchsia-500' },
  { name: 'Medical Oncology', icon: Activity, color: 'from-orange-600/20 to-orange-600/5', textColor: 'text-orange-600' },
  { name: 'Diabetology', icon: Activity, color: 'from-amber-400/20 to-amber-400/5', textColor: 'text-amber-400' },
  { name: 'Dentist', icon: Activity, color: 'from-pink-400/20 to-pink-400/5', textColor: 'text-pink-400' },
];

// Show first 14 by default (2 rows of 7)
const INITIAL_VISIBLE = 14;

export default function HospitalDirectory() {
  const [searchParams] = useSearchParams();
  const [hospitals, setHospitals] = useState([]);
  const [allHospitals, setAllHospitals] = useState([]);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState(searchParams.get('city') || '');
  const [specFilter, setSpecFilter] = useState(searchParams.get('specialty') || '');
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('');
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [filterHospitalType, setFilterHospitalType] = useState([]);
  const [filterEmergency, setFilterEmergency] = useState(false);
  const [filterMinRating, setFilterMinRating] = useState(0);
  const [filterInsurance, setFilterInsurance] = useState(false);
  const [filterBedAvailable, setFilterBedAvailable] = useState(false);
  const [filterCategory, setFilterCategory] = useState([]);
  const [filterAccreditation, setFilterAccreditation] = useState([]);
  const [filterBedSize, setFilterBedSize] = useState('');
  const [filterAmbulance, setFilterAmbulance] = useState(false);
  const [filterEstablished, setFilterEstablished] = useState('');
  const [filterFacilities, setFilterFacilities] = useState([]);
  const [filterDoctorsRange, setFilterDoctorsRange] = useState('');
  const [filterPayment, setFilterPayment] = useState([]);
  const [filterInsuranceProvider, setFilterInsuranceProvider] = useState('');

  const getType = (h) => {
    const t = h.hospitalType || h.type || '';
    if (t.toLowerCase().includes('government')) return 'Government';
    if (t.toLowerCase().includes('private')) return 'Private';
    return t;
  };

  const getCategory = (h) => {
    const t = h.hospitalType || h.type || '';
    if (t.toLowerCase().includes('multi')) return 'Multi-Specialty';
    if (t.toLowerCase().includes('single')) return 'Single-Specialty';
    if (t.toLowerCase().includes('super')) return 'Super-Specialty';
    return '';
  };

  const loadHospitals = async () => {
    setLoading(true);
    try {
      const params = { status: 'approved' };
      if (search) params.search = search;
      if (cityFilter && cityFilter !== 'All') params.city = cityFilter;
      if (specFilter && specFilter !== 'All') params.specialty = specFilter;
      const data = await api.getHospitals(params);
      setAllHospitals(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadHospitals(); }, [search, cityFilter, specFilter]);

  // Unified filter + sort effect
  useEffect(() => {
    let filtered = [...allHospitals];

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
      filtered = filtered.filter(h => h.emergency24x7 === true);
    }

    // Rating
    if (filterMinRating > 0) {
      filtered = filtered.filter(h => (h.rating || 0) >= filterMinRating);
    }

    // Insurance/Cashless
    if (filterInsurance) {
      filtered = filtered.filter(h => h.insuranceAccepted === true);
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
      filtered = filtered.filter(h => h.accreditations?.some(a => filterAccreditation.includes(a)));
    }

    // Bed Size
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
      filtered = filtered.filter(h => h.insurance_providers?.includes(filterInsuranceProvider));
    }

    // Sort
    if (sortBy === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'established') {
      filtered.sort((a, b) => (b.establishedYear || 0) - (a.establishedYear || 0));
    }

    setHospitals(filtered);
  }, [selectedDept, allHospitals, filterHospitalType, filterEmergency, filterMinRating, filterInsurance, filterBedAvailable, filterCategory, filterAccreditation, filterBedSize, filterAmbulance, filterEstablished, filterFacilities, filterDoctorsRange, filterPayment, filterInsuranceProvider, sortBy]);

  useEffect(() => {
    if (specFilter && specFilter !== 'All') {
      setSelectedDept(specFilter);
    }
  }, [specFilter]);

  const handleDepartmentClick = (dept) => {
    if (selectedDept === dept) {
      setSelectedDept('');
      setSpecFilter('');
    } else {
      setSelectedDept(dept);
      setSpecFilter(dept);
    }
  };

  const visibleSpecialties = showAllSpecialties ? ALL_SPECIALTIES : ALL_SPECIALTIES.slice(0, INITIAL_VISIBLE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground">Find a Hospital</h1>
        <p className="text-muted-foreground mt-1">Browse specialties or search for hospitals near you</p>
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
              return (
                <motion.button
                  key={dept.name}
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
                  <h3 className="font-semibold text-xs text-foreground leading-tight">{dept.name}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {hospitals.filter(h => h.specialties?.includes(dept.name)).length}
                  </p>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
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
                      {filterInsurance && (
                        <select value={filterInsuranceProvider} onChange={e => setFilterInsuranceProvider(e.target.value)} className="w-full h-8 text-xs rounded-lg border border-border bg-background">
                          <option value="">Any Provider</option>
                          <option value="Star Health">Star Health</option>
                          <option value="ICICI Lombard">ICICI Lombard</option>
                          <option value="HDFC Ergo">HDFC Ergo</option>
                          <option value="Bajaj Allianz">Bajaj Allianz</option>
                          <option value="Cigna">Cigna</option>
                        </select>
                      )}
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
