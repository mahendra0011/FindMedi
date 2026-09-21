import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, MapPin, BrainCircuit, UserRound, CalendarDays, IndianRupee, Award, Users, SlidersHorizontal, X, Building2, Languages, GraduationCap, ChevronDown, ChevronUp, Phone, Mail, ArrowRight, Navigation, AlertCircle, Heart, Brain, Moon, Zap, Activity, ShieldCheck, Shield, Baby, Pill } from 'lucide-react';
import { Button } from '@/mind/components/ui/button';
import { Input } from '@/mind/components/ui/input';
import { Badge } from '@/mind/components/ui/badge';
import { Card, CardContent } from '@/mind/components/ui/card';
import { Separator } from '@/mind/components/ui/separator';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import BookingModal from '@/components/BookingModal';
import NavigationBar from '@/mind/components/Navigation';
import Footer from '@/mind/components/Footer';

const PSYCH_CATEGORIES = [
  { name: 'Depression', icon: Heart, color: 'from-red-500/20 to-red-500/5', textColor: 'text-red-500', keywords: ['depress', 'mood disorder', 'dysthymia'] },
  { name: 'Anxiety Disorders', icon: Zap, color: 'from-amber-500/20 to-amber-500/5', textColor: 'text-amber-500', keywords: ['anxiet', 'panic', 'phobia', 'gad'] },
  { name: 'Bipolar Disorder', icon: Activity, color: 'from-blue-500/20 to-blue-500/5', textColor: 'text-blue-500', keywords: ['bipolar', 'mania', 'manic'] },
  { name: 'Schizophrenia', icon: Brain, color: 'from-violet-500/20 to-violet-500/5', textColor: 'text-violet-500', keywords: ['schizo', 'psychosis', 'psychotic'] },
  { name: 'OCD', icon: ShieldCheck, color: 'from-teal-500/20 to-teal-500/5', textColor: 'text-teal-500', keywords: ['ocd', 'obsess', 'compuls'] },
  { name: 'PTSD & Trauma', icon: Shield, color: 'from-orange-500/20 to-orange-500/5', textColor: 'text-orange-500', keywords: ['ptsd', 'trauma', 'post-traumatic'] },
  { name: 'Sleep Disorders', icon: Moon, color: 'from-indigo-500/20 to-indigo-500/5', textColor: 'text-indigo-500', keywords: ['sleep', 'insomnia', 'narcolepsy'] },
  { name: 'Addiction', icon: Pill, color: 'from-rose-500/20 to-rose-500/5', textColor: 'text-rose-500', keywords: ['addict', 'substance', 'alcohol', 'de-addiction', 'tobacco'] },
  { name: 'Child & Adolescent', icon: Baby, color: 'from-green-500/20 to-green-500/5', textColor: 'text-green-500', keywords: ['child', 'adolescent', 'pediatric', 'paediatric', 'adhd', 'autism'] },
];
const QUALIFICATIONS = ['MBBS', 'MD', 'DNB', 'DM'];
const LANGUAGES = ['Hindi', 'English', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Punjabi'];
const EXPERIENCE_RANGES = [
  { label: '0–5 years', min: 0, max: 5 },
  { label: '5–10 years', min: 5, max: 10 },
  { label: '10+ years', min: 10, max: 999 },
];

function getExpYears(exp) {
  if (!exp) return 0;
  const m = String(exp).match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function getClinicName(doc) {
  if (!doc) return '';
  return doc.clinicProfile?.clinic_name || doc.facilityId?.name || doc.location?.split(',')?.[0] || 'Clinic';
}

function getClinicAddress(doc) {
  return doc.clinicProfile?.clinic_address || doc.facilityId?.address || doc.location || doc.area || doc.address || doc.city || '';
}

function isPsychiatrist(doc) {
  const spec = (doc.specialization || '').toLowerCase();
  return spec.includes('psychiatr');
}

function doctorSearchText(doc) {
  return [doc.specialization, doc.qualifications, doc.bio, doc.department, doc.subSpeciality, (doc.focusAreas || []).join(' ')]
    .filter(Boolean).join(' ').toLowerCase();
}

function matchesCategory(doc, category) {
  if (category === 'All') return true;
  const entry = PSYCH_CATEGORIES.find(c => c.name === category);
  if (!entry) return true;
  const hay = doctorSearchText(doc);
  return entry.keywords.some(k => hay.includes(k));
}

export default function Psychiatrists() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [doctors, setDoctors] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [savedIds, setSavedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fav_doctor_ids') || '[]'); } catch { return []; }
  });
  const toggleSavedDoctor = async (docId, e) => {
    if (e) e.stopPropagation();
    const nowSaved = !savedIds.includes(docId);
    const next = nowSaved ? [...savedIds, docId] : savedIds.filter(id => id !== docId);
    setSavedIds(next);
    try {
      if (nowSaved) {
        await api.dispatch(() => Promise.resolve({}), '/patient/favorites', { method: 'POST', body: JSON.stringify({ targetId: docId, targetType: 'doctor' }) });
      } else {
        await api.dispatch(() => Promise.resolve({}), `/patient/favorites/${docId}`, { method: 'DELETE' });
      }
      toast.success(nowSaved ? 'Saved' : 'Removed from Saved');
    } catch {
      setSavedIds(savedIds);
      toast.error('Failed to update favorite');
    }
  };

  const [catFilter, setCatFilter] = useState('All');
  const [clinicFilter, setClinicFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [expFilter, setExpFilter] = useState('');
  const [feeRange, setFeeRange] = useState([0, 5000]);
  const [ratingFilter, setRatingFilter] = useState(0);

  const [sortBy, setSortBy] = useState('relevance');
  const [loadError, setLoadError] = useState('');

  const [qualificationFilter, setQualificationFilter] = useState([]);
  const [languageFilter, setLanguageFilter] = useState([]);

  const loadDoctors = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = {};
      if (search) params.search = search;
      const data = await api.getDoctors(params).catch(() => { throw new Error('Failed to load psychiatrists'); });
      const docList = Array.isArray(data) ? data : (data?.doctors || data?.data || []);
      setAllDoctors((Array.isArray(docList) ? docList : []).filter(isPsychiatrist));
    } catch (e) { setLoadError(e.message || 'Failed to load psychiatrists'); setAllDoctors([]); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadDoctors(); }, [search]);

  useEffect(() => {
    let filtered = Array.isArray(allDoctors) ? [...allDoctors] : [];

    if (catFilter !== 'All') filtered = filtered.filter(d => matchesCategory(d, catFilter));
    if (clinicFilter) filtered = filtered.filter(d => getClinicName(d) === clinicFilter);
    if (locationFilter && locationFilter !== 'All') filtered = filtered.filter(d => getClinicAddress(d).toLowerCase().includes(locationFilter.toLowerCase()));
    if (availabilityFilter === 'today') filtered = filtered.filter(d => d.available === true && d.next_available_slot?.toLowerCase().includes('today'));
    else if (availabilityFilter === 'tomorrow') filtered = filtered.filter(d => d.available === true && d.next_available_slot?.toLowerCase().includes('tomorrow'));
    else if (availabilityFilter === 'available') filtered = filtered.filter(d => d.available === true);
    if (genderFilter) filtered = filtered.filter(d => d.gender === genderFilter);

    if (expFilter) {
      const r = EXPERIENCE_RANGES.find(e => e.label === expFilter);
      if (r) filtered = filtered.filter(d => { const y = getExpYears(d.experience); return y >= r.min && y < r.max; });
    }

    filtered = filtered.filter(d => {
      const fee = d.consultation_fees || d.fees || 0;
      return fee >= feeRange[0] && fee <= feeRange[1];
    });

    if (ratingFilter > 0) filtered = filtered.filter(d => (d.rating || 0) >= ratingFilter);

    if (qualificationFilter.length > 0) {
      filtered = filtered.filter(d => qualificationFilter.some(q => (d.qualifications || '').includes(q)));
    }
    if (languageFilter.length > 0) {
      filtered = filtered.filter(d => languageFilter.some(l => d.languages?.includes(l)));
    }

    if (sortBy === 'rating') filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortBy === 'experience') filtered.sort((a, b) => getExpYears(b.experience) - getExpYears(a.experience));
    else if (sortBy === 'fee') filtered.sort((a, b) => (a.consultation_fees || a.fees || 0) - (b.consultation_fees || b.fees || 0));

    setDoctors(filtered);
  }, [allDoctors, catFilter, clinicFilter, locationFilter, availabilityFilter, genderFilter, expFilter, feeRange, ratingFilter, qualificationFilter, languageFilter, sortBy]);

  const renderStars = (rating) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? 'text-warning fill-warning' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );

  const activeFilterCount = [
    catFilter !== 'All', !!clinicFilter, !!locationFilter, !!availabilityFilter,
    !!genderFilter, !!expFilter, feeRange[0] > 0 || feeRange[1] < 5000, ratingFilter > 0,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Find a Psychiatrist</h1>
          <p className="text-muted-foreground mt-1">Search psychiatrists by name, condition, or clinic — medical doctors for diagnosis & medication</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by psychiatrist name, condition, or clinic..."
            className="pl-12 h-12 text-base rounded-2xl" />
        </div>

        {/* Categories - psychiatry focus areas */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-primary" />
              Browse by Condition
            </h2>
            {!showAdvanced && PSYCH_CATEGORIES.length > 7 && (
              <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(true)} className="gap-1 text-primary">
                More <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            )}
            {showAdvanced && PSYCH_CATEGORIES.length > 7 && (
              <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(false)} className="gap-1 text-primary">
                Less <ChevronUp className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {PSYCH_CATEGORIES.slice(0, showAdvanced ? undefined : 7).map((cat) => {
              const Icon = cat.icon;
              const isActive = catFilter === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setCatFilter(isActive ? 'All' : cat.name)}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                      : 'border-border/60 bg-card hover:border-primary/30 hover:shadow-sm'
                  }`}>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${cat.textColor}`} />
                  </div>
                  <span className={`text-xs font-medium text-center leading-tight ${isActive ? 'text-primary' : 'text-foreground'}`}>
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {allDoctors.filter(d => matchesCategory(d, cat.name)).length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════ FILTERS BAR ═══════ */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Main Filters */}
            <select value={clinicFilter} onChange={e => setClinicFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-background text-sm max-w-[180px]">
              <option value="">All Clinics</option>
              {[...new Set(allDoctors.map(getClinicName).filter(Boolean))].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>

            <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-background text-sm">
              <option value="">All Locations</option>
              {[...new Set(allDoctors.map(d => {
                const addr = getClinicAddress(d);
                const parts = addr.split(',').map(p => p.trim()).filter(Boolean);
                return parts[parts.length - 1] || parts[0] || '';
              }).filter(Boolean))].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>

            <select value={availabilityFilter} onChange={e => setAvailabilityFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-background text-sm">
              <option value="">Availability</option>
              <option value="available">Available Now</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
            </select>

            <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-background text-sm">
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>

            <select value={expFilter} onChange={e => setExpFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-background text-sm">
              <option value="">Experience</option>
              {EXPERIENCE_RANGES.map(r => (
                <option key={r.label} value={r.label}>{r.label}</option>
              ))}
            </select>

            {/* Fee range */}
            <div className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-background text-sm">
              <IndianRupee className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input type="range" min={0} max={5000} step={100} value={feeRange[0]}
                onChange={e => setFeeRange([parseInt(e.target.value), feeRange[1]])}
                className="w-16 h-1 accent-primary" />
              <span className="text-xs text-muted-foreground w-12 text-right">{feeRange[0]}</span>
              <span className="text-xs text-muted-foreground">-</span>
              <input type="range" min={0} max={5000} step={100} value={feeRange[1]}
                onChange={e => setFeeRange([feeRange[0], parseInt(e.target.value)])}
                className="w-16 h-1 accent-primary" />
              <span className="text-xs text-muted-foreground w-12">{feeRange[1]}</span>
            </div>

            {/* Rating */}
            <div className="flex gap-1">
              {[4, 3].map(r => (
                <Button key={r} variant={ratingFilter === r ? 'default' : 'outline'} size="sm"
                  onClick={() => setRatingFilter(ratingFilter === r ? 0 : r)}
                  className="h-9 text-xs px-3">
                  <Star className="w-3.5 h-3.5 mr-1" /> {r}\u2605 & above
                </Button>
              ))}
            </div>

            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-background text-sm">
              <option value="relevance">Sort: Relevance</option>
              <option value="rating">Rating (High-Low)</option>
              <option value="experience">Experience (High-Low)</option>
              <option value="fee">Fee (Low-High)</option>
            </select>

            {/* More Filters Toggle */}
            <Button variant="outline" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-9 gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              {showAdvanced ? 'Hide Advanced' : 'More Filters'}
            </Button>

            {/* Clear All */}
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => {
                setCatFilter('All'); setClinicFilter(''); setLocationFilter('');
                setAvailabilityFilter(''); setGenderFilter(''); setExpFilter('');
                setFeeRange([0, 5000]); setRatingFilter(0); setSortBy('relevance');
                setQualificationFilter([]); setLanguageFilter([]);
              }} className="text-red-500 hover:text-red-600 h-9 text-xs">
                <X className="w-3.5 h-3.5 mr-1" /> Clear All
              </Button>
            )}
          </div>

          {/* ═══════ ADVANCED FILTERS DRAWER ═══════ */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <Card className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Qualification */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-2 block">Medical Degree</label>
                      <div className="flex flex-wrap gap-1.5">
                        {QUALIFICATIONS.map(q => (
                          <Button key={q} variant={qualificationFilter.includes(q) ? 'default' : 'outline'} size="sm"
                            onClick={() => setQualificationFilter(prev => prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q])}
                            className="text-[11px] h-7">
                            <GraduationCap className="w-3 h-3 mr-1" /> {q}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Language */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-2 block">Language Spoken</label>
                      <div className="flex flex-wrap gap-1.5">
                        {LANGUAGES.slice(0, 8).map(l => (
                          <Button key={l} variant={languageFilter.includes(l) ? 'default' : 'outline'} size="sm"
                            onClick={() => setLanguageFilter(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])}
                            className="text-[11px] h-7">
                            <Languages className="w-3 h-3 mr-1" /> {l}
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

        {/* Results */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl font-bold text-foreground">
              {catFilter !== 'All' ? `${catFilter} Psychiatrists` : 'Available Psychiatrists'}
              <span className="text-base font-normal text-muted-foreground ml-2">({doctors.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : loadError ? (
            <div className="text-center py-16">
              <AlertCircle className="w-16 h-16 text-destructive/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">Failed to load psychiatrists</h3>
              <p className="text-muted-foreground mb-4">{loadError}</p>
              <Button variant="outline" onClick={loadDoctors}>Retry</Button>
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-16">
              <UserRound className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No psychiatrists found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {doctors.map((doc, i) => {
                const clinicName = getClinicName(doc);
                const area = getClinicAddress(doc);
                const dist = doc.distance || '0.8';
                return (
                <motion.div key={doc._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="group bg-card rounded-2xl border border-border/60 overflow-hidden hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300 cursor-pointer relative"
                  onClick={() => {
                    if (showBooking && selectedDoctor?._id === doc._id) return;
                    navigate(`/mind/psychiatrists/${doc._id}`);
                  }}>
                  <div className={cn('absolute top-0 right-0 z-10 px-3 py-1.5 rounded-bl-2xl text-[11px] font-semibold border-l border-b shadow-sm transition-all duration-300', doc.available
                    ? 'bg-primary/5 text-primary border-primary/20 dark:bg-primary/10 group-hover:bg-primary/15 dark:group-hover:bg-primary/20'
                    : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:border-red-500/20 group-hover:bg-red-100 dark:group-hover:bg-red-500/20')}>
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="w-3 h-3" />
                      {doc.available ? (doc.next_available_slot || (Array.isArray(doc.time_slots) && doc.time_slots.length > 0 ? doc.time_slots[Math.floor(doc.time_slots.length / 2)] || doc.time_slots[0] : '5:00 PM')) : 'Unavailable'}
                    </span>
                  </div>
                    <div className="p-5">
                      {/* Top: Photo + Name + Info */}
                      <div className="flex items-start gap-4 mb-3">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 border-2 border-primary/10 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
                          {doc.clinicProfile?.clinic_photos?.[0] || doc.photos?.[0] || doc.photo
                            ? <img src={doc.clinicProfile?.clinic_photos?.[0] || doc.photos?.[0] || doc.photo} alt="" className="w-full h-full object-cover" />
                            : <Building2 className="w-10 h-10 text-primary/40" />
                          }
                        </div>
                        <div className="min-w-0 flex-1 pt-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-heading font-semibold text-foreground truncate group-hover:text-primary transition-colors">{clinicName}</h3>
                          </div>
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary/80 transition-colors">{doc.name}</p>
                          <p className="text-xs text-primary font-medium">{doc.specialization}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {renderStars(doc.rating)}
                            <span className="text-xs text-muted-foreground ml-1">{doc.rating} ({doc.reviews_count || doc.reviews || 0})</span>
                          </div>
                        </div>
                      </div>

                      {/* Locality + Distance */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3 text-xs text-muted-foreground group-hover:text-foreground/80 transition-colors">
                      {area && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary shrink-0" /> {area}
                        </span>
                      )}
                      {dist && (
                        <span className="flex items-center gap-1">
                          <Navigation className="w-3 h-3 text-primary shrink-0" /> {dist} km away
                        </span>
                      )}
                    </div>

                    {doc.qualifications && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {String(doc.qualifications).split(',').map(q => q.trim()).filter(Boolean).map(q => (
                          <Badge key={q} variant="secondary" className="text-[10px] bg-muted/50">{q}</Badge>
                        ))}
                      </div>
                    )}

                    <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl border border-border/40 p-3 mb-3 transition-all duration-300 group-hover:border-primary/20 group-hover:from-primary/5 group-hover:to-transparent">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5 group-hover:text-foreground transition-colors"><Award className="w-3.5 h-3.5 text-primary" />Experience</span>
                        <span className="font-semibold text-foreground">{doc.experience}</span>
                      </div>
                      <Separator className="bg-border/30 my-2.5" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5 group-hover:text-foreground transition-colors"><Users className="w-3.5 h-3.5 text-primary" />Patients</span>
                        <span className="font-semibold text-foreground">{doc.patients || 0}+</span>
                      </div>
                      <Separator className="bg-border/30 my-2.5" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5 group-hover:text-foreground transition-colors"><MapPin className="w-3.5 h-3.5 text-primary" />Location</span>
                        <span className="font-semibold text-foreground truncate ml-2">{area || '—'}</span>
                      </div>
                      <Separator className="bg-border/30 my-2.5" />
                      <div className="flex gap-2">
                        {doc.phone && (
                          <a href={`tel:${doc.phone}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-lg h-8 text-xs hover:bg-primary hover:text-primary-foreground transition-colors">
                              <Phone className="w-3 h-3" /> Call
                            </Button>
                          </a>
                        )}
                        {doc.email && (
                          <a href={`mailto:${doc.email}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-lg h-8 text-xs hover:bg-primary hover:text-primary-foreground transition-colors">
                              <Mail className="w-3 h-3" /> Email
                            </Button>
                          </a>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5 group-hover:text-foreground transition-colors"><Languages className="w-3.5 h-3.5 text-primary" />Languages</span>
                        <span className="font-semibold text-foreground truncate">{doc.languages?.join(', ') || doc.language || '—'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/5 to-primary/0 border border-primary/10 mb-3 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-300">
                      <span className="text-sm text-muted-foreground">Consultation Fee</span>
                      <span className="font-bold text-lg text-primary">₹{doc.consultation_fees || doc.fees || 0}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" className="w-full gap-1.5 rounded-xl text-[11px] h-9 shadow-lg shadow-primary/20 group/btn" disabled={!doc.available}
                        onClick={(e) => { e.stopPropagation(); setShowBooking(true); setSelectedDoctor(doc); }}>
                        <CalendarDays className="w-3.5 h-3.5" /> {doc.available ? 'Book Appointment' : 'Unavailable'}
                        {doc.available && <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover/btn:translate-x-0.5" />}
                      </Button>
                      <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-xl text-[11px] h-9 hover:border-primary/50 hover:text-primary transition-all"
                        onClick={(e) => { e.stopPropagation(); navigate(`/clinic/${doc.facilityId?._id || doc.facilityId || doc._id}`); }}>
                        <Building2 className="w-3.5 h-3.5" /> View Clinic
                      </Button>
                      <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-xl text-[11px] h-9 hover:border-primary/50 hover:text-primary transition-all col-span-2"
                        onClick={(e) => { e.stopPropagation(); navigate(`/mind/psychiatrists/${doc._id}`); }}>
                        View Doctor Profile <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </div>
          )}
        </div>

      </div>
      <BookingModal open={showBooking} onOpenChange={setShowBooking} doctor={selectedDoctor} facility={selectedDoctor?.facilityId} />
      <Footer />
    </div>
  );
}
