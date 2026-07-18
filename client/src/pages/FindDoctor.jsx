import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, MapPin, Stethoscope, UserRound, CalendarDays, IndianRupee, Award, Users, SlidersHorizontal, X, Building2, Clock, Shield, Syringe, BedDouble, Languages, GraduationCap, CircleDot, ChevronDown, ChevronUp, Ambulance, Eye, Heart, Bone, Baby, Activity, Brain, BadgeCheck, Phone, Mail, ArrowRight, Navigation, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const SPECIALIZATIONS = ['All', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Dermatology', 'Oncology', 'General Medicine', 'ENT'];
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
const QUALIFICATIONS = ['MBBS', 'MD', 'MS', 'DM', 'MCh', 'DNB'];
const LANGUAGES = ['Hindi', 'English', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Punjabi', 'Spanish', 'French', 'Korean', 'Japanese', 'Mandarin', 'German', 'Portuguese'];
const EXPERIENCE_RANGES = [
  { label: '0\u20135 years', min: 0, max: 5 },
  { label: '5\u201310 years', min: 5, max: 10 },
  { label: '10+ years', min: 10, max: 999 },
];

function getExpYears(exp) {
  if (!exp) return 0;
  const m = exp.match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

export default function FindDoctor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [doctors, setDoctors] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [specFilter, setSpecFilter] = useState(searchParams.get('specialization') || 'All');
  const [hospitalFilter, setHospitalFilter] = useState(searchParams.get('hospital') || '');
  const [locationFilter, setLocationFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [expFilter, setExpFilter] = useState('');
  const [feeRange, setFeeRange] = useState([0, 2000]);
  const [ratingFilter, setRatingFilter] = useState(0);

  const [sortBy, setSortBy] = useState('relevance');
  const [consultantType, setConsultantType] = useState('');

  const [qualificationFilter, setQualificationFilter] = useState([]);
  const [languageFilter, setLanguageFilter] = useState([]);
  const [surgeryFilter, setSurgeryFilter] = useState('');
  const [admissionFilter, setAdmissionFilter] = useState('');
  const [insuranceFilter, setInsuranceFilter] = useState('');
  const [emergencyFilter, setEmergencyFilter] = useState('');

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const params = { doctor_type: 'hospital' };
      if (search) params.search = search;
      if (specFilter !== 'All') params.specialization = specFilter;
      const data = await api.getDoctors(params);
      setAllDoctors(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadDoctors(); }, [search, specFilter]);

  useEffect(() => {
    let filtered = [...allDoctors];

    if (specFilter !== 'All') filtered = filtered.filter(d => d.specialization === specFilter);
    if (hospitalFilter) filtered = filtered.filter(d => (d.hospitalId?.name || '') === hospitalFilter);
    if (locationFilter && locationFilter !== 'All') filtered = filtered.filter(d => (d.location || '').toLowerCase().includes(locationFilter.toLowerCase()));
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

    if (consultantType) filtered = filtered.filter(d => d.consultantType === consultantType);
    if (qualificationFilter.length > 0) {
      filtered = filtered.filter(d => qualificationFilter.some(q => (d.qualifications || '').includes(q)));
    }
    if (languageFilter.length > 0) {
      filtered = filtered.filter(d => languageFilter.some(l => d.languages?.includes(l)));
    }
    if (surgeryFilter === 'yes') filtered = filtered.filter(d => d.surgery_available === true);
    else if (surgeryFilter === 'no') filtered = filtered.filter(d => d.surgery_available !== true);
    if (admissionFilter === 'yes') filtered = filtered.filter(d => d.admission_available === true);
    else if (admissionFilter === 'no') filtered = filtered.filter(d => d.admission_available !== true);
    if (insuranceFilter) filtered = filtered.filter(d => d.insurance_accepted?.includes(insuranceFilter));
    if (emergencyFilter === 'yes') filtered = filtered.filter(d => d.emergency_consultation === true);
    else if (emergencyFilter === 'no') filtered = filtered.filter(d => d.emergency_consultation !== true);

    if (sortBy === 'rating') filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortBy === 'experience') filtered.sort((a, b) => getExpYears(b.experience) - getExpYears(a.experience));
    else if (sortBy === 'fee') filtered.sort((a, b) => (a.consultation_fees || a.fees || 0) - (b.consultation_fees || b.fees || 0));

    setDoctors(filtered);
  }, [allDoctors, specFilter, hospitalFilter, locationFilter, availabilityFilter, genderFilter, expFilter, feeRange, ratingFilter, consultantType, qualificationFilter, languageFilter, surgeryFilter, admissionFilter, insuranceFilter, emergencyFilter, sortBy]);

  const renderStars = (rating) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? 'text-warning fill-warning' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );

  const activeFilterCount = [
    specFilter !== 'All', !!hospitalFilter, !!locationFilter, !!availabilityFilter,
    !!genderFilter, !!expFilter, feeRange[0] > 0 || feeRange[1] < 2000, ratingFilter > 0,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Find a Doctor</h1>
          <p className="text-muted-foreground mt-1">Search by name, specialization, or use filters below</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by doctor name or specialization..."
            className="pl-12 h-12 text-base rounded-2xl" />
        </div>

        {/* Specializations - 7 per row cards */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              Browse by Specialties
            </h2>
            {!showAdvanced && ALL_SPECIALTIES.length > 7 && (
              <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(true)} className="gap-1 text-primary">
                More <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            )}
            {showAdvanced && ALL_SPECIALTIES.length > 7 && (
              <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(false)} className="gap-1 text-primary">
                Less <ChevronUp className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {ALL_SPECIALTIES.slice(0, showAdvanced ? undefined : 7).map((spec) => {
              const Icon = spec.icon;
              const isActive = specFilter === spec.name;
              return (
                <button
                  key={spec.name}
                  onClick={() => setSpecFilter(spec.name)}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                      : 'border-border/60 bg-card hover:border-primary/30 hover:shadow-sm'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${spec.color} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${spec.textColor}`} />
                  </div>
                  <span className={`text-xs font-medium text-center leading-tight ${isActive ? 'text-primary' : 'text-foreground'}`}>
                    {spec.name === 'All' ? 'All Departments' : spec.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {doctors.filter(d => spec.name === 'All' || d.specialization === spec.name).length}
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
            <select value={hospitalFilter} onChange={e => setHospitalFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-background text-sm max-w-[180px]">
              <option value="">All Hospitals</option>
              {[...new Set(allDoctors.map(d => d.hospitalId?.name || '').filter(Boolean))].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>

            <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-background text-sm">
              <option value="">All Locations</option>
              <option value="New York">New York</option>
              <option value="Los Angeles">Los Angeles</option>
              <option value="Chicago">Chicago</option>
              <option value="Houston">Houston</option>
              <option value="Phoenix">Phoenix</option>
              <option value="Philadelphia">Philadelphia</option>
              <option value="Mumbai">Mumbai</option>
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
              <input type="range" min={0} max={2000} step={100} value={feeRange[0]}
                onChange={e => setFeeRange([parseInt(e.target.value), feeRange[1]])}
                className="w-16 h-1 accent-primary" />
              <span className="text-xs text-muted-foreground w-12 text-right">{feeRange[0]}</span>
              <span className="text-xs text-muted-foreground">-</span>
              <input type="range" min={0} max={2000} step={100} value={feeRange[1]}
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
                setSpecFilter('All'); setHospitalFilter(''); setLocationFilter('');
                setAvailabilityFilter(''); setGenderFilter(''); setExpFilter('');
                setFeeRange([0, 2000]); setRatingFilter(0); setSortBy('relevance');
                setConsultantType(''); setQualificationFilter([]);
                setLanguageFilter([]); setSurgeryFilter(''); setAdmissionFilter('');
                setInsuranceFilter(''); setEmergencyFilter('');
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
                    {/* Consultant Type */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-2 block">Consultant Type</label>
                      <div className="flex flex-wrap gap-1.5">
                        {[{v:'fulltime',l:'Full-Time'},{v:'visiting',l:'Visiting'}].map(ct => (
                          <Button key={ct.v} variant={consultantType === ct.v ? 'default' : 'outline'} size="sm"
                            onClick={() => setConsultantType(consultantType === ct.v ? '' : ct.v)}
                            className="text-[11px] h-7">
                            <CircleDot className="w-3 h-3 mr-1" /> {ct.l}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Qualification */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-2 block">Qualification / Degree</label>
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

                    {/* Surgery Available */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-2 block">Surgery</label>
                      <div className="flex gap-1.5">
                        {[{v:'yes',l:'Available'},{v:'no',l:'N/A'}].map(s => (
                          <Button key={s.v} variant={surgeryFilter === s.v ? 'default' : 'outline'} size="sm"
                            onClick={() => setSurgeryFilter(surgeryFilter === s.v ? '' : s.v)}
                            className="text-[11px] h-7">
                            <Syringe className="w-3 h-3 mr-1" /> {s.l}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Admission / Inpatient */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-2 block">Inpatient Care</label>
                      <div className="flex gap-1.5">
                        {[{v:'yes',l:'Available'},{v:'no',l:'N/A'}].map(a => (
                          <Button key={a.v} variant={admissionFilter === a.v ? 'default' : 'outline'} size="sm"
                            onClick={() => setAdmissionFilter(admissionFilter === a.v ? '' : a.v)}
                            className="text-[11px] h-7">
                            <BedDouble className="w-3 h-3 mr-1" /> {a.l}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Insurance / Cashless */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-2 block">Insurance / Cashless</label>
                      <select value={insuranceFilter} onChange={e => setInsuranceFilter(e.target.value)}
                        className="w-full h-8 text-xs rounded-lg border border-border bg-background">
                        <option value="">Any Provider</option>
                        <option value="Star Health">Star Health</option>
                        <option value="ICICI Lombard">ICICI Lombard</option>
                        <option value="HDFC Ergo">HDFC Ergo</option>
                        <option value="Bajaj Allianz">Bajaj Allianz</option>
                        <option value="Cigna">Cigna</option>
                        <option value="Kaiser Permanente">Kaiser Permanente</option>
                        <option value="Aetna">Aetna</option>
                        <option value="Blue Cross">Blue Cross</option>
                        <option value="Medicare">Medicare</option>
                      </select>
                    </div>

                    {/* Emergency 24x7 */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-2 block">Emergency</label>
                      <div className="flex gap-1.5">
                        {[{v:'yes',l:'Available'},{v:'no',l:'N/A'}].map(e => (
                          <Button key={e.v} variant={emergencyFilter === e.v ? 'default' : 'outline'} size="sm"
                            onClick={() => setEmergencyFilter(emergencyFilter === e.v ? '' : e.v)}
                            className="text-[11px] h-7">
                            <Ambulance className="w-3 h-3 mr-1" /> {e.l}
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
              {specFilter !== 'All' ? `${specFilter} Specialists` : 'Available Doctors'}
              <span className="text-base font-normal text-muted-foreground ml-2">({doctors.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-16">
              <UserRound className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">No doctors found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {doctors.map((doc, i) => {
                const SpecIcon = ALL_SPECIALTIES.find(s => s.name === doc.specialization)?.icon || Stethoscope;
                const initials = doc.name?.split(' ').map(n=>n?.[0]).join('').slice(0,2) || 'DR';
                const hospitalName = doc.hospitalId?.name || '';
                const area = doc.hospitalId?.address || doc.location || doc.area || doc.address || doc.city || '';
                const dist = doc.distance || ((doc._id?.charCodeAt(doc._id.length - 1) || 5) % 5 + 0.5).toFixed(1);
                return (
                <motion.div key={doc._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="group bg-card rounded-2xl border border-border/60 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all cursor-pointer relative"
                  onClick={() => navigate(`/hospital-doctors/${doc._id}`)}>
                  {/* Corner Badge — Next Available Slot */}
                  <div className={cn('absolute top-0 right-0 z-10 px-3 py-1.5 rounded-bl-2xl text-[11px] font-semibold border-l border-b shadow-sm', doc.available
                    ? 'bg-primary/5 text-primary border-primary/20 dark:bg-primary/10'
                    : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:border-red-500/20')}>
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="w-3 h-3" />
                      {doc.available ? (doc.next_available_slot || 'Today') : 'Unavailable'}
                    </span>
                  </div>
                  <div className="p-5">

                    {/* Top: Photo + Name + Info */}
                    <div className="flex items-start gap-4 mb-3">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 border-2 border-primary/10 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
                        {doc.profile_photo
                          ? <img src={doc.profile_photo} alt="" className="w-full h-full object-cover" />
                          : <span className="text-xl font-bold text-primary">{initials}</span>
                        }
                      </div>
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-semibold text-foreground truncate group-hover:text-primary transition-colors">{hospitalName}</h3>
                          {doc.approved && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                        <p className="text-xs text-primary font-medium">{doc.specialization}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {renderStars(doc.rating)}
                          <span className="text-xs text-muted-foreground ml-1">{doc.rating} ({doc.reviews_count || 0})</span>
                        </div>
                      </div>
                    </div>

                    {/* Locality + Distance */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3 text-xs text-muted-foreground">
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
                        {doc.qualifications.split(',').map(q => q.trim()).filter(Boolean).map(q => (
                          <Badge key={q} variant="secondary" className="text-[10px] bg-muted/50">{q}</Badge>
                        ))}
                      </div>
                    )}

                    <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl border border-border/40 p-3 mb-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-primary" />Experience</span>
                        <span className="font-semibold text-foreground">{doc.experience}</span>
                      </div>
                      <Separator className="bg-border/30 my-2.5" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-primary" />Patients</span>
                        <span className="font-semibold text-foreground">{doc.patients || 0}+</span>
                      </div>
                      <Separator className="bg-border/30 my-2.5" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />Location</span>
                        <span className="font-semibold text-foreground truncate ml-2">{area || '—'}</span>
                      </div>
                      <Separator className="bg-border/30 my-2.5" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-primary" />Phone</span>
                        <span className="font-semibold text-foreground">{doc.phone || 'N/A'}</span>
                      </div>
                      <Separator className="bg-border/30 my-2.5" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-primary" />Email</span>
                        <span className="font-semibold text-foreground truncate">{doc.email || 'N/A'}</span>
                      </div>
                      <Separator className="bg-border/30 my-2.5" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-primary" />Languages</span>
                        <span className="font-semibold text-foreground truncate">{doc.languages?.join(', ') || doc.language || '—'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10 mb-3">
                      <span className="text-sm text-muted-foreground">Consultation Fee</span>
                      <span className="font-bold text-lg text-primary">Rs {doc.consultation_fees || doc.fees || 0}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 gap-1.5 rounded-xl text-[11px] h-9 shadow-lg shadow-primary/20" disabled={!doc.available}
                        onClick={(e) => { e.stopPropagation(); navigate(`/hospital-doctors/${doc._id}`); }}>
                        <CalendarDays className="w-3.5 h-3.5" /> {doc.available ? 'Book Appointment' : 'Unavailable'}
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-1.5 rounded-xl text-[11px] h-9 group/btn"
                        onClick={(e) => { e.stopPropagation(); navigate(`/hospitals/${doc.hospitalId?._id || ''}`); }}>
                        View Hospital
                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
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
    </div>
  );
}
