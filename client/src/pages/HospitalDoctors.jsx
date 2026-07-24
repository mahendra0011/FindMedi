import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, MapPin, CalendarDays, IndianRupee, Award, Users, ArrowLeft, Stethoscope, Heart, Brain, Bone, Baby, Eye, Activity, Building2, Clock, Shield, Syringe, BedDouble, Languages, GraduationCap, CircleDot, ChevronDown, ChevronUp, ChevronRight, Ambulance, SlidersHorizontal, X, BadgeCheck, UserRound, Phone, Mail, AlertCircle, CheckCircle, CreditCard, Smartphone, Landmark, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import BillCheckout from '@/components/BillCheckout';

const DEFAULT_SPECS = ['All', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Dermatology', 'Oncology', 'General Medicine', 'ENT'];

const SPEC_CARD_THEME = {
  Cardiology:        { icon: Heart,     color: 'from-red-500/20 to-red-500/5',     textColor: 'text-red-600' },
  Neurology:         { icon: Brain,     color: 'from-purple-500/20 to-purple-500/5',  textColor: 'text-purple-600' },
  Orthopedics:       { icon: Bone,      color: 'from-blue-500/20 to-blue-500/5',    textColor: 'text-blue-600' },
  Pediatrics:        { icon: Baby,      color: 'from-green-500/20 to-green-500/5',   textColor: 'text-green-600' },
  Dermatology:       { icon: Eye,       color: 'from-pink-500/20 to-pink-500/5',    textColor: 'text-pink-600' },
  Oncology:          { icon: Activity,  color: 'from-orange-500/20 to-orange-500/5',  textColor: 'text-orange-600' },
  'General Medicine':{ icon: Stethoscope, color: 'from-teal-500/20 to-teal-500/5',  textColor: 'text-teal-600' },
  ENT:               { icon: Users,     color: 'from-indigo-500/20 to-indigo-500/5',  textColor: 'text-indigo-600' },
};

function getSpecCard(spec) {
  return SPEC_CARD_THEME[spec] || { icon: Stethoscope, color: 'from-slate-500/20 to-slate-500/5', textColor: 'text-slate-600' };
}

const QUALIFICATIONS = ['MBBS', 'MD', 'MS', 'DM', 'MCh', 'DNB'];
const LANGUAGES = ['Hindi', 'English', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Punjabi'];
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

export default function HospitalDoctors() {
  const { hospitalId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hospital, setHospital] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [search, setSearch] = useState('');
  const [specFilter, setSpecFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('09:00 AM - 10:00 AM');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [bookingStep, setBookingStep] = useState('method');
  const [loadError, setLoadError] = useState(null);

  const handleConfirmBooking = async () => {
    if (!selectedDoctor) { toast.error('No doctor selected'); return; }
    if (!user) { toast.error('Please login to book an appointment'); navigate('/login'); return; }
    setBookingLoading(true);
    try {
      const result = await api.createAppointment({
        doctorId: selectedDoctor._id,
        doctor: selectedDoctor.name,
        doctorName: selectedDoctor.name,
        department: selectedDoctor.specialization || 'General',
        hospitalId: hospitalId || selectedDoctor.hospitalId,
        patient: user.name || 'Patient',
        patientId: user._id,
        email: user.email,
        phone: user.phone || '',
        date: bookingDate,
        time: bookingTime,
        notes: bookingNotes,
      });
      setBookingDetails({ ...(result || {}), doctor: selectedDoctor.name, date: bookingDate, time: bookingTime, fees: selectedDoctor.consultation_fees || selectedDoctor.fees || 0 });
      setBookingSuccess(true);
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Failed to book appointment');
    }
    setBookingLoading(false);
  };

  const handlePayment = async () => {
    const fees = selectedDoctor?.consultation_fees || selectedDoctor?.fees || 0;
    if (fees <= 0) { setPaymentSuccess(true); return; }
    setPaymentLoading(true);
    try {
      const result = await api.payTransaction({
        serviceType: 'appointment',
        referenceId: bookingDetails?._id,
        amount: fees,
        method: paymentMethod,
        description: `Consultation with ${selectedDoctor.name}`,
        provider: selectedDoctor.name,
        lineItems: [{ name: 'Consultation Fee', price: fees, qty: 1 }],
      });
      if (result?.success) {
        setPaymentSuccess(true);
        toast.success('Payment successful! Appointment confirmed.');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Payment failed');
    }
    setPaymentLoading(false);
  };

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

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [hosp, docs] = await Promise.all([
          api.getHospital(hospitalId),
          api.getDoctors({ hospitalId }),
        ]);
        setHospital(hosp);
        setAllDoctors(docs?.doctors || docs?.data || docs || []);
      } catch (e) {
        console.error(e);
        setLoadError('Failed to load doctors. Please try again.');
      }
      setLoading(false);
    })();
  }, [hospitalId]);

  useEffect(() => {
    let filtered = [...allDoctors];

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(d => (d.name || '').toLowerCase().includes(q) || (d.specialization || '').toLowerCase().includes(q));
    }

    if (specFilter !== 'All') filtered = filtered.filter(d => d.specialization === specFilter);
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
  }, [allDoctors, search, specFilter, availabilityFilter, genderFilter, expFilter, feeRange, ratingFilter, consultantType, qualificationFilter, languageFilter, surgeryFilter, admissionFilter, insuranceFilter, emergencyFilter, sortBy]);

  const specializations = hospital?.specialties?.length
    ? ['All', ...hospital.specialties]
    : DEFAULT_SPECS;

  const activeFilterCount = [
    specFilter !== 'All', !!availabilityFilter, !!genderFilter, !!expFilter,
    feeRange[0] > 0 || feeRange[1] < 2000, ratingFilter > 0,
  ].filter(Boolean).length;

  const renderStars = (rating) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={cn('w-3.5 h-3.5', s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30')} />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="gap-2 mb-4">
            <Link to={`/hospitals/${hospitalId}`}>
              <ArrowLeft className="w-4 h-4" />
              Back to Hospital
            </Link>
          </Button>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
            Doctors at {hospital?.name || 'Hospital'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {doctors.length} doctors available
          </p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search doctors by name or specialization..."
            className="pl-12 h-12 text-base rounded-2xl"
          />
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              Browse by Specialties
            </h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {specializations.map(s => {
              const isAll = s === 'All';
              const theme = isAll ? { icon: Stethoscope, color: 'from-primary/20 to-primary/5', textColor: 'text-primary' } : getSpecCard(s);
              const Icon = theme.icon;
              const count = isAll
                ? doctors.length
                : doctors.filter(d => d.specialization === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setSpecFilter(s)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all',
                    specFilter === s
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                      : 'border-border/60 bg-card hover:border-primary/30 hover:shadow-sm'
                  )}
                >
                  <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center', theme.color)}>
                    <Icon className={cn('w-6 h-6', theme.textColor)} />
                  </div>
                  <span className={cn('text-xs font-medium text-center leading-tight', specFilter === s ? 'text-primary' : 'text-foreground')}>
                    {isAll ? 'All Departments' : s}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════ FILTERS BAR ═══════ */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
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

            <div className="flex gap-1">
              {[4, 3].map(r => (
                <Button key={r} variant={ratingFilter === r ? 'default' : 'outline'} size="sm"
                  onClick={() => setRatingFilter(ratingFilter === r ? 0 : r)}
                  className="h-9 text-xs px-3">
                  <Star className="w-3.5 h-3.5 mr-1" /> {r}\u2605 & above
                </Button>
              ))}
            </div>

            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-background text-sm">
              <option value="relevance">Sort: Relevance</option>
              <option value="rating">Rating (High-Low)</option>
              <option value="experience">Experience (High-Low)</option>
              <option value="fee">Fee (Low-High)</option>
            </select>

            <Button variant="outline" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-9 gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              {showAdvanced ? 'Hide Advanced' : 'More Filters'}
            </Button>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => {
                setSpecFilter('All'); setAvailabilityFilter(''); setGenderFilter('');
                setExpFilter(''); setFeeRange([0, 2000]); setRatingFilter(0);
                setSortBy('relevance'); setConsultantType(''); setQualificationFilter([]);
                setLanguageFilter([]); setSurgeryFilter(''); setAdmissionFilter('');
                setInsuranceFilter(''); setEmergencyFilter('');
              }} className="text-red-500 hover:text-red-600 h-9 text-xs">
                <X className="w-3.5 h-3.5 mr-1" /> Clear All
              </Button>
            )}
          </div>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <Card className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      </select>
                    </div>

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

        {loadError ? (
          <div className="text-center py-16">
            <AlertCircle className="w-16 h-16 text-destructive/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Failed to load doctors</h3>
            <p className="text-muted-foreground mb-4">{loadError}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : allDoctors.length === 0 && !loading ? (
          <div className="text-center py-16">
            <Stethoscope className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No doctors found</h3>
            <p className="text-muted-foreground">
              This hospital hasn't added doctor profiles yet.
            </p>
          </div>
        ) : allDoctors.length > 0 && doctors.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No doctors match your filters</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {doctors.map((doc, i) => (
              <motion.div
                key={doc._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group bg-card rounded-2xl border border-border/60 overflow-hidden hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300 cursor-pointer"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center overflow-hidden shrink-0 border-2 border-primary/20 shadow-md shadow-primary/20 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300">
                      {doc.profile_photo
                        ? <img src={doc.profile_photo} alt="" className="w-full h-full object-cover" />
                        : <span className="text-primary-foreground font-heading font-bold text-lg">{doc.initials || doc.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</span>
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-semibold text-foreground truncate group-hover:text-primary transition-colors">{doc.name}</h3>
                        <Badge className="text-[10px] h-5 px-1.5 bg-primary/10 text-primary border-primary/20 shrink-0">
                          <BadgeCheck className="w-3 h-3 mr-0.5" />Verified
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-primary">{doc.specialization}</p>
                      {doc.qualifications && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {doc.qualifications.split(',').map(q => q.trim()).filter(Boolean).map(q => (
                            <Badge key={q} variant="secondary" className="text-[9px] h-4 px-1.5 bg-muted/50">{q}</Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1.5">
                        {renderStars(doc.rating)}
                        <span className="text-xs text-muted-foreground ml-1">{doc.rating} ({doc.reviews_count || 0})</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      <Award className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{doc.experience}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{doc.patients || 0}+ patients</span>
                    </div>
                  </div>

                  {doc.languages && (
                    <div className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground">
                      <span className="font-medium">Speaks:</span>
                      {(Array.isArray(doc.languages) ? doc.languages : doc.languages.split(',')).map(l => l.trim()).filter(Boolean).map(l => (
                        <Badge key={l} variant="secondary" className="text-[9px] h-4 px-1.5 bg-muted/50">{l}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    {doc.phone && (
                      <a href={`tel:${doc.phone}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-lg h-8 text-xs">
                          <Phone className="w-3 h-3" /> Call
                        </Button>
                      </a>
                    )}
                    {doc.email && (
                      <a href={`mailto:${doc.email}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-lg h-8 text-xs">
                          <Mail className="w-3 h-3" /> Email
                        </Button>
                      </a>
                    )}
                  </div>

                  {(() => {
                    let slot = doc.next_available_slot;
                    if (!slot && Array.isArray(doc.time_slots) && doc.time_slots.length > 0) {
                      const mid = Math.floor(doc.time_slots.length / 2);
                      slot = doc.time_slots[mid] || doc.time_slots[0];
                    }
                    if (!slot) slot = '5:00 PM';
                    return (
                      <div className={cn('px-3 py-2 rounded-xl border text-sm mb-4 text-center font-medium transition-all duration-300', doc.available ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20' : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 group-hover:bg-red-100 dark:group-hover:bg-red-500/20')}>
                        {doc.available ? `Available Today at ${slot}` : `Next Available: ${doc.next_available_slot || 'Tomorrow 9 AM'}`}
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/5 to-primary/0 border border-primary/10 mb-4 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-300">
                    <span className="text-sm text-muted-foreground">Consultation Fee</span>
                    <span className="font-bold text-lg text-primary">₹{doc.consultation_fees || doc.fees || 0}</span>
                  </div>

                  <div className="flex gap-2">
                    <Dialog open={showBooking && selectedDoctor?._id === doc._id} onOpenChange={(open) => { if (open) setSelectedDoctor(doc); else { setSelectedDoctor(null); setShowBooking(false); } }}>
                      <DialogTrigger asChild>
                        <Button className="flex-1 gap-2 rounded-xl shadow-lg shadow-primary/20 group/btn" size="sm" disabled={!doc.available}
                          onClick={(e) => { e.stopPropagation(); setShowBooking(true); setSelectedDoctor(doc); }}>
                          <CalendarDays className="w-3.5 h-3.5" /> Book Appointment
                          <ChevronRight className="w-3 h-3 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                        </Button>
                      </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto w-[calc(100%-2rem)] sm:w-full rounded-2xl">
                          {bookingSuccess && bookingDetails ? (
                            paymentSuccess ? (
                              <div className="py-6 text-center space-y-4">
                                <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                                  <CheckCircle className="w-10 h-10 text-success" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-foreground">Booking & Payment Complete!</h3>
                                  <p className="text-sm text-muted-foreground mt-1">Appointment for {bookingDetails.doctor}</p>
                                </div>
                                <div className="text-sm text-muted-foreground space-y-1 bg-muted/30 rounded-xl p-4 text-left">
                                  <p><span className="text-foreground font-medium">Date:</span> {bookingDetails.date}</p>
                                  <p><span className="text-foreground font-medium">Time:</span> {bookingDetails.time}</p>
                                  <p><span className="text-foreground font-medium">Fees:</span> ₹{bookingDetails.fees}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button className="flex-1 rounded-xl" onClick={() => navigate('/patient/appointments')}>View Appointments</Button>
                                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => navigate('/patient/billing')}>View Bill</Button>
                                </div>
                              </div>
                            ) : bookingStep === 'method' ? (
                              <>
                                <DialogHeader>
                                  <DialogTitle>Select Payment Method</DialogTitle>
                                  <DialogDescription>Choose how to pay for {bookingDetails.doctor}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3 py-2">
                                  <div className="text-sm text-muted-foreground space-y-1.5 bg-muted/30 rounded-xl p-4">
                                    <p><span className="text-foreground font-medium">Doctor:</span> {bookingDetails.doctor}</p>
                                    <p><span className="text-foreground font-medium">Date:</span> {bookingDetails.date}</p>
                                    <p><span className="text-foreground font-medium">Time:</span> {bookingDetails.time}</p>
                                    <p><span className="text-foreground font-medium">Fees:</span> <span className="text-foreground font-bold">₹{bookingDetails.fees}</span></p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-foreground mb-2">Choose payment method</p>
                                    <div className="grid grid-cols-2 gap-2">
                                      {[{ value: 'card', label: 'Card', icon: CreditCard }, { value: 'upi', label: 'UPI', icon: Smartphone }, { value: 'netbanking', label: 'Net Banking', icon: Landmark }, { value: 'cash', label: 'Cash', icon: Wallet }].map(m => {
                                        const Icon = m.icon;
                                        const active = paymentMethod === m.value;
                                        return (
                                          <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                                            className={`relative flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/60 bg-card hover:border-primary/40'}`}>
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                              <Icon className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-semibold text-foreground">{m.label}</span>
                                            {active && <CheckCircle className="w-3.5 h-3.5 text-primary absolute top-1.5 right-1.5" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <Button className="w-full rounded-xl h-10 font-semibold" onClick={() => setBookingStep('billing')}>
                                    Next <ChevronRight className="w-4 h-4 ml-1" />
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <DialogHeader>
                                  <DialogTitle>Complete Payment</DialogTitle>
                                  <DialogDescription>Pay to confirm your appointment with {bookingDetails.doctor}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3 py-2">
                                  <BillCheckout
                                    amount={bookingDetails.fees}
                                    serviceType="appointment"
                                    provider={hospital?.name || bookingDetails.doctor}
                                    details={{ doctor: selectedDoctor?.name || bookingDetails.doctor, specialization: selectedDoctor?.specialization || '', date: bookingDetails.date, time: bookingDetails.time, type: 'Consultation' }}
                                    lineItems={[{ name: 'Consultation Fee', price: bookingDetails.fees, qty: 1 }]}
                                    platformFee={0}
                                    gst={0}
                                    discount={0}
                                    compact
                                    method={paymentMethod}
                                    onMethodChange={setPaymentMethod}
                                    onPay={handlePayment}
                                    loading={paymentLoading}
                                  />
                                </div>
                              </>
                            )
                          ) : (
                            <>
                          <DialogHeader>
                            <DialogTitle>Book Appointment</DialogTitle>
                            <DialogDescription>
                              Quick booking for {selectedDoctor?.name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 py-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
                                <span className="text-primary-foreground font-bold text-xs">{selectedDoctor?.name?.split(' ').map(n=>n[0]).join('').slice(0,2)}</span>
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-heading font-semibold text-foreground text-sm truncate">{selectedDoctor?.name}</h3>
                                <p className="text-xs text-primary">{selectedDoctor?.specialization}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-2 rounded-xl bg-primary/5 border border-primary/10 text-center">
                                <p className="text-[11px] text-muted-foreground mb-0.5">Consultation Fee</p>
                                <p className="font-bold text-sm text-primary">₹{selectedDoctor?.consultation_fees || 0}</p>
                              </div>
                              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 text-center">
                                <p className="text-[11px] text-muted-foreground mb-0.5">Available Slot</p>
                                <p className="font-semibold text-xs text-emerald-600">{selectedDoctor?.next_available_slot || 'Today'}</p>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-foreground">Select Date</label>
                              <Input type="date" className="w-full" value={bookingDate} onChange={e => setBookingDate(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-foreground">Select Time Slot</label>
                               <select className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm" value={bookingTime} onChange={e => setBookingTime(e.target.value)}>
                                {(selectedDoctor?.time_slots || ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM']).map(t => (
                                  <option key={t}>{t}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-foreground">Notes (optional)</label>
                              <textarea value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} placeholder="Any specific concerns…" className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none" rows={2} />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" size="sm" onClick={() => setShowBooking(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleConfirmBooking} disabled={bookingLoading}>{bookingLoading ? 'Booking...' : 'Confirm Booking'}</Button>
                          </DialogFooter>
                            </>
                          )}
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" className="gap-2 rounded-xl hover:border-primary/50 hover:text-primary transition-all" size="sm"
                      onClick={(e) => { e.stopPropagation(); navigate(`/hospital-doctors/${doc._id}`); }}>
                      <Eye className="w-3.5 h-3.5" /> View Profile
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
