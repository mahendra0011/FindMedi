import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, MapPin, Star, Phone, Stethoscope, CalendarDays,
  IndianRupee, ArrowLeft, Search, Shield, Award, Clock, Users,
  BedDouble, Ambulance, Share2, ChevronRight, Home, BadgeCheck,
  Navigation, AlertCircle, HeartPulse, CheckCircle2,
  ChevronDown, ChevronUp, FlaskRound, Quote, Mail,
  Circle, Heart, Eye, Sparkles, TrendingUp, Brain, Bone, Baby, Activity,
  FlaskConical, ShoppingCart, Lock, Plus, Minus, Zap,
  ChevronLeft, Scissors, Syringe, Droplets, Pill, Microscope,
  Car, Wind, CreditCard, Bookmark,
  Globe, Printer, Info, HelpCircle, Accessibility, Loader2,
  Ambulance as AmbulanceIcon, Percent, Handshake, ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } } };

const SectionTitle = ({ icon:Icon, label }) => (
  <h2 className="font-heading text-lg font-bold text-foreground mb-5 flex items-center gap-2">
    <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
      <Icon className="w-3.5 h-3.5 text-primary" />
    </span>
    {label}
  </h2>
);

const ServiceItem = ({ name, price, index }) => {
  const icons = [Sparkles, Syringe, Droplets, Zap, Scissors, Pill, Microscope, FlaskConical];
  const colors = ['text-blue-500','text-purple-500','text-emerald-500','text-rose-500','text-amber-500','text-cyan-500','text-indigo-500','text-pink-500'];
  const Icon = icons[index % icons.length];
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card hover:border-primary/30 hover:shadow-sm transition-all group cursor-pointer">
      <div className={cn('w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0', colors[index % colors.length].replace('text-','from-').replace('-500','-500/20').replace('from', '') + ' to-transparent')}>
        <Icon className={cn('w-4 h-4', colors[index % colors.length])} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{name}</p>
        <p className="text-[10px] text-muted-foreground">Starting from</p>
      </div>
      <span className="text-sm font-bold text-foreground whitespace-nowrap">₹{price}</span>
    </div>
  );
};

const FacilityItem = ({ label, icon:Icon, color, bg }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card hover:border-primary/30 hover:shadow-sm transition-all group cursor-default">
    <div className={cn('w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0', bg)}>
      <Icon className={cn('w-4 h-4', color)} />
    </div>
    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{label}</span>
  </div>
);

const DayRow = ({ day, time }) => {
  const isToday = new Date().toLocaleDateString('en', { weekday:'long' }).toLowerCase().slice(0,3) === day;
  return (
    <div className={cn('flex items-center justify-between py-2.5 border-b border-border/20 last:border-0 px-3 rounded-xl transition-colors', isToday && 'bg-primary/5 -mx-3 px-6')}>
      <div className="flex items-center gap-2">
        <span className={cn('w-2 h-2 rounded-full', time === 'Closed' ? 'bg-red-500' : isToday ? 'bg-primary' : 'bg-muted-foreground/30')} />
        <span className={cn('text-sm capitalize font-medium', day === 'sun' ? 'text-red-500' : isToday ? 'text-primary font-semibold' : 'text-foreground')}>{day}</span>
        {isToday && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Today</span>}
      </div>
      <span className={cn('text-sm', time === 'Closed' ? 'text-red-500 font-medium' : 'text-muted-foreground')}>{time}</span>
    </div>
  );
};



const DEFAULT_CLINIC_PHOTO = 'https://placehold.co/800x400/2563eb/ffffff?text=Clinic+Photo';

function normalizeFaqs(faqs = []) {
  return faqs.map(faq => ({
    q: faq.q || faq.question || '',
    a: faq.a || faq.answer || '',
  })).filter(faq => faq.q || faq.a);
}

export default function ClinicDetail() {
  const { clinicId } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [facility, setFacility] = useState(null);
  const [clinicDoctors, setClinicDoctors] = useState([]);
  const [reviews, setReviews] = useState([
    { _id: 'demo-1', patientName: 'Rahul Sharma', rating: 5, comment: 'Excellent clinic. Very thorough examination and clean facilities.', date: '2026-06-15' },
    { _id: 'demo-2', patientName: 'Priya Patel', rating: 4, comment: 'Good experience. The waiting time was a bit long but the consultation was worth it.', date: '2026-06-10' },
    { _id: 'demo-3', patientName: 'Amit Verma', rating: 5, comment: 'Best clinic in the city. The staff is very cooperative.', date: '2026-06-05' },
    { _id: 'demo-4', patientName: 'Sunita Gupta', rating: 4, comment: 'Very caring doctor. Well-maintained clinic and polite staff.', date: '2026-05-28' },
    { _id: 'demo-5', patientName: 'Vikram Singh', rating: 3, comment: 'Decent consultation but the billing process was slow.', date: '2026-05-20' },
  ]);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [doctorSectionTab, setDoctorSectionTab] = useState('doctors');
  const [tests, setTests] = useState([]);
  const [testDeptFilter, setTestDeptFilter] = useState('All');
  const [testSearch, setTestSearch] = useState('');
  const [priceRange, setPriceRange] = useState('all');
  const [testRxFilter, setTestRxFilter] = useState('all');
  const [testHomeFilter, setTestHomeFilter] = useState('all');
  const [testSort, setTestSort] = useState('popularity');
  const [testCart, setTestCart] = useState({});

  const cp = doctor?.clinicProfile || {};
  const details = facility?.details || {};
  const doctors = clinicDoctors.length ? clinicDoctors : (doctor ? [doctor] : []);
  const totalPatients = doctors.reduce((sum, doc) => sum + (Number(doc.patients) || 0), 0);
  const clinic = facility ? {
    _id: facility._id,
    name: facility.name,
    category: facility.specialties?.[0] ? `${facility.specialties[0]} Clinic` : 'Clinic',
    type: 'Clinic',
    rating: facility.rating || 4.5,
    reviewsCount: facility.reviewsCount || 0,
    verified: facility.status === 'approved',
    address: facility.address || '',
    city: facility.city || '',
    state: facility.state || '',
    phone: facility.phone || '',
    email: facility.email || '',
    open: true,
    closingTime: details.closingTime || '8:00 PM',
    established: facility.establishedYear || null,
    totalDoctors: facility.totalDoctors || doctors.length,
    totalSpecialties: facility.specialties?.length || 0,
    totalPatients,
    description: facility.description || '',
    specialties: facility.specialties || [],
    treatments: details.treatments || details.services || [],
    facilities: details.facilities || details.amenities || [],
    timing: details.timing || details.clinic_timing || {},
    branches: details.branches || [],
    license: facility.licenseNumber || '',
    insurance: details.insurance || [],
    paymentModes: details.paymentModes || ['Cash', 'UPI', 'Card'],
    faqs: normalizeFaqs(details.faqs || []),
    photos: details.photos?.length ? details.photos : [facility.image || facility.logo || DEFAULT_CLINIC_PHOTO],
    social: details.social || {},
    distance: facility.distance || null,
  } : doctor ? {
    _id: doctor._id,
    name: cp.clinic_name || (doctor.name?.replace('Dr. ','') + ' Clinic'),
    category: `${doctor.specialization} Clinic`,
    type: 'Clinic',
    rating: doctor.rating || 4.5,
    reviewsCount: doctor.reviews_count || 0,
    verified: doctor.approved || false,
    address: cp.clinic_address || doctor.location || '',
    city: (cp.clinic_address || doctor.location || '')?.split(',').pop()?.trim() || '',
    state: '',
    phone: doctor.phone || '',
    email: doctor.email || '',
    open: doctor.available,
    closingTime: doctor.time_slots?.slice(-1)?.[0] || '',
    established: cp.established_year || null,
    totalDoctors: 1,
    totalSpecialties: 1,
    totalPatients: doctor.patients || 0,
    description: doctor.bio || '',
    specialties: doctor.specialization ? [doctor.specialization] : [],
    treatments: cp.clinic_treatments || [],
    facilities: cp.clinic_facilities || [],
    timing: cp.clinic_timing || {},
    branches: [],
    license: cp.clinic_license || '',
    insurance: cp.clinic_insurance || [],
    paymentModes: ['Cash', 'UPI', 'Card'],
    faqs: normalizeFaqs(cp.clinic_faqs || []),
    photos: cp.clinic_photos?.length ? cp.clinic_photos : [doctor.profile_photo || DEFAULT_CLINIC_PHOTO],
    social: cp.social || {},
    distance: null,
  } : null;

  const clinicWorkingHours = clinic?.timing ? (() => {
    const values = Object.values(clinic.timing || {}).filter(v => v && v !== 'Closed');
    const unique = [...new Set(values)];
    return unique.length === 1 ? unique[0] : unique.length > 1 ? 'See Schedule' : '—';
  })() : '—';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const facilityResult = await api.getFacility(clinicId);
        const loadedFacility = facilityResult?.facility || facilityResult;
        if (!loadedFacility || loadedFacility.type !== 'clinic') throw new Error('Clinic facility not found');
        const loadedDoctors = Array.isArray(facilityResult?.doctors) ? facilityResult.doctors : [];
        setFacility(loadedFacility);
          setClinicDoctors(loadedDoctors);
        setDoctor(loadedDoctors[0] || null);
        try {
          const t = await api.getTests({});
          const mapped = (Array.isArray(t) ? t : t?.tests || []).map(t => ({
            id: t._id,
            _id: t._id,
            name: t.name,
            dept: t.category || t.department || 'Pathology',
            category: t.category,
            department: t.department,
            price: t.price,
            mrp: t.mrp || t.price,
            reportTime: t.reportTime || '24 hrs',
            homeCollection: t.homeCollection || false,
            rx: t.prescriptionReq || false,
            prescriptionReq: t.prescriptionReq || false,
            popular: t.popular || false,
          }));
          setTests(mapped);
        } catch { setTests([]); }
        if (loadedDoctors.length > 0) {
          try {
            const r = await api.getReviews({ doctorId: loadedDoctors[0]._id });
            const revs = Array.isArray(r) ? r : r?.reviews || [];
            if (revs.length > 0) setReviews(revs);
          } catch {} {
          }
        } else {
          setReviews([]);
        }
      } catch (facilityError) {
        try {
          const doc = await api.getDoctor(clinicId);
          setDoctor(doc);
          setFacility(null);
          setClinicDoctors(doc ? [doc] : []);
          const r = await api.getReviews({ doctorId: clinicId });
          const revs = Array.isArray(r) ? r : r?.reviews || [];
          if (revs.length > 0) setReviews(revs);
        } catch (doctorError) {
          console.error(facilityError);
          console.error(doctorError);
          setDoctor(null);
          setFacility(null);
          setClinicDoctors([]);
        }
      }
      setLoading(false);
    };
    load();
  }, [clinicId]);

  useEffect(() => { window.scrollTo(0, 0); }, [clinicId]);
  useEffect(() => {
    if (clinic?.photos?.length > 0) {
      const timer = setInterval(() => setActivePhoto(p => (p + 1) % clinic.photos.length), 4000);
      return () => clearInterval(timer);
    }
  }, [clinic?.photos?.length]);

  const testDepts = [...new Set(tests.map(t => t.dept))];
  const filteredTests = tests.filter(t => {
    if (testDeptFilter !== 'All' && t.dept !== testDeptFilter) return false;
    if (testSearch && !t.name.toLowerCase().includes(testSearch.toLowerCase())) return false;
    if (testRxFilter === 'rx' && !t.rx) return false;
    if (testRxFilter === 'direct' && t.rx) return false;
    if (testHomeFilter === 'yes' && !t.homeCollection) return false;
    if (testHomeFilter === 'no' && t.homeCollection) return false;
    return true;
  });
  const sortedTests = [...filteredTests].sort((a, b) => {
    if (testSort === 'price-low') return a.price - b.price;
    if (testSort === 'price-high') return b.price - a.price;
    if (testSort === 'name') return a.name.localeCompare(b.name);
    return (b.popular ? 1 : 0) - (a.popular ? 1 : 0);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading clinic details...</p>
        </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Clinic not found</h3>
          <Button variant="outline" onClick={() => navigate('/clinic')}>Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Breadcrumb */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-5">
          <button onClick={() => navigate('/clinic')} className="hover:text-foreground transition-colors flex items-center gap-1.5 group">
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" /> Find Clinic
          </button>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-foreground font-medium truncate">{clinic.name}</span>
        </motion.div>

        {/* ════════ 1. HERO SECTION ════════ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* Gallery */}
            <div className="lg:col-span-3 relative rounded-2xl overflow-hidden bg-card border border-border/50 h-[300px] sm:h-[420px] group">
              {clinic.photos?.map((p, i) => (
                <div key={i} className={cn('absolute inset-0 transition-all duration-700', i === activePhoto ? 'opacity-100 scale-100' : 'opacity-0 scale-105')}>
                  <img src={p} alt={`${clinic.name} photo ${i+1}`} className="w-full h-full object-cover" />
                </div>
              ))}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {clinic.photos?.map((_, i) => (
                  <button key={i} onClick={() => setActivePhoto(i)}
                    className={cn('h-1.5 rounded-full transition-all duration-300', i === activePhoto ? 'bg-white w-8' : 'bg-white/40 w-1.5 hover:bg-white/70')} />
                ))}
              </div>
              <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-9 h-9 rounded-xl bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-all hover:scale-105" onClick={() => toast.success('Bookmarked')}>
                  <Bookmark className="w-4 h-4" />
                </button>
                <button className="w-9 h-9 rounded-xl bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-all hover:scale-105" onClick={() => toast.success('Link copied!')}>
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute top-4 left-4 z-10">
                <Badge className="bg-primary/90 text-white border-0 text-xs px-3 py-1.5 rounded-full shadow-lg">{clinic.category}</Badge>
              </div>
              <div className="absolute bottom-4 left-4 z-10 hidden sm:block">
                <Badge variant="secondary" className="bg-black/40 text-white border-0 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                  {activePhoto + 1} / {clinic.photos?.length} Photos
                </Badge>
              </div>
            </div>

            {/* Info Card */}
            <div className="lg:col-span-2 bg-card rounded-2xl border border-border/50 p-6 flex flex-col shadow-sm w-full">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border-2 border-primary/10">
                  <Building2 className="w-7 h-7 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-heading font-bold text-xl text-foreground leading-tight">{clinic.name}</h1>
                    {clinic.verified && <BadgeCheck className="w-5 h-5 text-primary shrink-0" />}
                  </div>
                  <p className="text-sm font-medium text-primary/80">{clinic.type}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} className={cn('w-3.5 h-3.5', i <= Math.round(clinic.rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />)}
                    </div>
                    <span className="text-sm font-bold text-foreground">{clinic.rating}</span>
                    <span className="text-xs text-muted-foreground">({clinic.reviewsCount} reviews)</span>
                  </div>
                </div>
              </div>

              <Separator className="my-3" />

              <div className="space-y-2.5 text-sm">
                <div className="flex items-start gap-2.5 text-muted-foreground">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <span>{clinic.address}</span>
                </div>
                <a href={`tel:${clinic.phone}`} className="flex items-center gap-2.5 text-primary font-medium hover:underline group">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                  </div>
                  {clinic.phone}
                </a>
                {clinic.email && (
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    {clinic.email}
                  </div>
                )}
              </div>

              <Separator className="my-3" />

              <div className={cn('px-4 py-2.5 rounded-xl border text-sm text-center font-semibold flex items-center justify-center gap-2', clinic.open ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10' : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10')}>
                <span className={cn('w-2 h-2 rounded-full animate-pulse', clinic.open ? 'bg-emerald-500' : 'bg-red-500')} />
                {clinic.open ? `Open Now — Closes at ${clinic.closingTime}` : 'Closed'}
              </div>

              <div className="flex gap-2 mt-auto pt-3">
                <Button className="flex-1 gap-2 rounded-xl shadow-lg shadow-primary/20 h-11 hover:shadow-xl hover:shadow-primary/30 transition-all" onClick={() => toast.success('Booking coming soon')}>
                  <CalendarDays className="w-4 h-4" /> Book Appointment
                </Button>
                <Button variant="outline" className="rounded-xl h-11 px-3 hover:bg-primary/5 hover:border-primary/30 transition-all" onClick={() => toast.success('Opening directions...')}>
                  <Navigation className="w-4 h-4" />
                </Button>
                <a href={`tel:${clinic.phone}`}>
                  <Button variant="outline" className="rounded-xl h-11 px-3 hover:bg-primary/5 hover:border-primary/30 transition-all">
                    <Phone className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ════════ 2. QUICK STATS STRIP ════════ */}
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { icon:Building2, label:'Established', value:clinic.established, color:'text-primary', desc:`Since ${clinic.established}` },
            { icon:Stethoscope, label:'Total Doctors', value:clinic.totalDoctors, color:'text-blue-500', desc:'Qualified professionals' },
            { icon:Sparkles, label:'Specialties', value:clinic.totalSpecialties, color:'text-purple-500', desc:'Treatment areas' },
            { icon:Users, label:'Patients Treated', value:`${(clinic.totalPatients/1000).toFixed(0)}K+`, color:'text-emerald-500', desc:'Happy patients' },
          ].map(stat => (
            <motion.div key={stat.label} variants={fadeUp}
              className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm', stat.color.replace('text-','from-').replace('-500','-500/20') + ' to-transparent')}>
                <stat.icon className={cn('w-6 h-6', stat.color)} />
              </div>
              <div>
                <p className="font-heading text-2xl font-bold text-foreground leading-none mb-0.5">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ════════ 3. MAIN CONTENT + STICKY SIDEBAR ════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Left Column — About → Additional Info */}
          <div className="lg:col-span-2 space-y-6">

            {/* About */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={Info} label={`About ${clinic.name}`} />
                  <div className={cn('text-sm text-muted-foreground leading-relaxed', !showFullDesc && 'line-clamp-4')}>
                    {clinic.description}
                  </div>
                  {clinic.description?.length > 150 && (
                    <Button variant="ghost" size="sm" className="mt-1 text-primary h-8 px-2" onClick={() => setShowFullDesc(!showFullDesc)}>
                      {showFullDesc ? 'Show less' : 'Read more'}
                      <ChevronDown className={cn('w-3.5 h-3.5 ml-1 transition-transform', showFullDesc && 'rotate-180')} />
                    </Button>
                  )}
                  <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-border/30">
                    {clinic.specialties?.map(s => (
                      <Badge key={s} variant="secondary" className="text-[11px] px-3 py-1 rounded-full bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 transition-colors">{s}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Doctors / Tests */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-transparent px-6 pt-6 pb-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted/50 p-0.5 rounded-lg border border-border/40 flex">
                        <button onClick={() => setDoctorSectionTab('doctors')}
                          className={cn('px-3 py-1.5 rounded-md text-xs font-semibold transition-all', doctorSectionTab === 'doctors' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                          Doctors
                        </button>
                        <button onClick={() => setDoctorSectionTab('tests')}
                          className={cn('px-3 py-1.5 rounded-md text-xs font-semibold transition-all', doctorSectionTab === 'tests' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                          Tests
                        </button>
                      </div>
                      <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Stethoscope className="w-4 h-4 text-primary" /></span>
                        {doctorSectionTab === 'doctors' ? <>Doctors <span className="text-base font-normal text-muted-foreground">({doctors.length})</span></> : 'Tests'}
                      </h2>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1 text-primary font-semibold shrink-0" onClick={() => toast.success('View more coming soon')}>
                      {doctorSectionTab === 'doctors' ? 'View More' : 'View All Tests'} <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-6 pt-4">
                  <div className={doctorSectionTab !== 'doctors' ? 'hidden' : ''}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {doctors.map((doc, idx) => {
                        const initials = doc.name.split(' ').map(n=>n[0]).join('').slice(0,2);
                        const gradColors = ['from-primary/20','from-blue-500/20','from-purple-500/20','from-emerald-500/20'];
                        return (
                          <div key={doc._id} className="group bg-card rounded-xl border border-border/40 p-4 hover:shadow-md hover:border-primary/30 transition-all duration-300">
                            <div className="flex items-start gap-3 mb-3">
                              <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-sm font-bold text-primary shrink-0 shadow-sm', gradColors[idx % gradColors.length], 'to-primary/5')}>
                                {initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-heading font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{doc.name}</h4>
                                  <span className={cn('w-2 h-2 rounded-full', doc.available ? 'bg-emerald-500' : 'bg-red-400')} title={doc.available ? 'Available' : 'Unavailable'} />
                                </div>
                                <p className="text-xs text-primary font-medium">{doc.specialization}</p>
                                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{doc.rating}</span>
                                  <span className="flex items-center gap-1"><Award className="w-3 h-3 text-primary" />{doc.experience}</span>
                                </div>
                              </div>
                            </div>
                            {doc.qualifications && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {doc.qualifications.split(',').map(q => q.trim()).map(q => (
                                  <span key={q} className="text-[9px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/30">{q}</span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/20">
                              <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3 text-primary" />{doc.timing}</span>
                              <Badge className={cn('text-[9px] h-5 px-2 rounded-full', doc.available ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-red-500/10 text-red-600 border-red-200')}>
                                {doc.available ? `Available Today${doc.next_available_slot ? `, ${doc.next_available_slot}` : ''}` : `Next: ${doc.next_available_slot || 'Unavailable'}`}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                    <div className={doctorSectionTab !== 'tests' ? 'hidden' : ''}>
                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={testSearch} onChange={e => setTestSearch(e.target.value)}
                        placeholder="Search tests..." className="pl-10 h-10 text-sm rounded-xl bg-background border-border/50" />
                    </div>
                    {/* Dept & Filter Chips */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <button onClick={() => setTestDeptFilter('All')}
                        className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all', testDeptFilter === 'All' ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground')}>
                        All ({tests.length})
                      </button>
                      {testDepts.slice(0, 6).map(d => (
                        <button key={d} onClick={() => setTestDeptFilter(d)}
                          className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all', testDeptFilter === d ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground')}>
                          {d}
                        </button>
                      ))}
                      <select value={testSort} onChange={e => setTestSort(e.target.value)}
                        className="h-8 px-2.5 rounded-lg text-[11px] bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="popularity">Popular</option>
                        <option value="price-low">Price: Low</option>
                        <option value="price-high">Price: High</option>
                        <option value="name">Name</option>
                      </select>
                      <button onClick={() => setTestRxFilter(testRxFilter === 'rx' ? 'all' : 'rx')}
                        className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1', testRxFilter === 'rx' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground')}>
                        <Lock className="w-3 h-3" /> Rx
                      </button>
                      <button onClick={() => setTestHomeFilter(testHomeFilter === 'yes' ? 'all' : 'yes')}
                        className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex items-center gap-1', testHomeFilter === 'yes' ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground')}>
                        <Home className="w-3 h-3" /> Home Collection
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">{sortedTests.length} test{sortedTests.length !== 1 ? 's' : ''} found</p>
                    {sortedTests.length === 0 ? (
                      <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
                        <Search className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No tests match your filters</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedTests.map(test => (
                          <div key={test.id} className="group bg-card rounded-xl border border-border/40 p-4 hover:shadow-md hover:border-primary/30 transition-all duration-300 flex flex-col">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 shadow-sm">
                                <FlaskConical className="w-5 h-5 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-heading text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">{test.name}</h4>
                                <div className="flex items-center gap-1.5 mt-1">
                                  {test.popular && <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Popular</span>}
                                  {test.rx ? (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded"><Lock className="w-2.5 h-2.5" /> Rx</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">Direct</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mb-3 text-[11px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {test.reportTime}</span>
                              {test.homeCollection && <span className="inline-flex items-center gap-1"><Home className="w-3 h-3 text-primary" /> Home</span>}
                            </div>
                            <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/20">
                              <div>
                                <span className="text-lg font-bold text-foreground">₹{test.price}</span>
                                {test.mrp > test.price && <span className="text-xs text-muted-foreground line-through ml-1.5">₹{test.mrp}</span>}
                              </div>
                              {testCart[test.id] ? (
                                <div className="flex items-center gap-1">
                                  <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setTestCart(p => { const n = { ...p }; if (n[test.id] <= 1) delete n[test.id]; else n[test.id]--; return n; })}>
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="w-5 text-center text-xs font-bold">{testCart[test.id]}</span>
                                  <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setTestCart(p => ({ ...p, [test.id]: (p[test.id] || 0) + 1 }))}>
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Button size="sm" className="rounded-lg h-8 text-xs gap-1" onClick={() => { setTestCart(p => ({ ...p, [test.id]: 1 })); toast.success(`${test.name} added`); }}>
                                  <ShoppingCart className="w-3 h-3" /> Book
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Services */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <SectionTitle icon={Scissors} label="Services & Treatments" />
                    <Badge variant="secondary" className="text-[10px] px-2.5 py-1 rounded-full">{clinic.treatments?.length} Treatments</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {clinic.treatments?.map((t, i) => (
                      <ServiceItem key={t} name={t} price={500 + i * 300} index={i} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Facilities */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={Shield} label="Facilities & Amenities" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label:'In-house Pharmacy', icon:Pill, color:'text-blue-500', bg:'from-blue-500/20 to-blue-500/5' },
                      { label:'In-house Lab', icon:Microscope, color:'text-purple-500', bg:'from-purple-500/20 to-purple-500/5' },
                      { label:'Parking', icon:Car, color:'text-emerald-500', bg:'from-emerald-500/20 to-emerald-500/5' },
                      { label:'Wheelchair Access', icon:Accessibility, color:'text-amber-500', bg:'from-amber-500/20 to-amber-500/5' },
                      { label:'Home Visit', icon:Home, color:'text-green-500', bg:'from-green-500/20 to-green-500/5' },
                      { label:'AC Waiting Area', icon:Wind, color:'text-cyan-500', bg:'from-cyan-500/20 to-cyan-500/5' },
                      { label:'Card/UPI Accepted', icon:CreditCard, color:'text-rose-500', bg:'from-rose-500/20 to-rose-500/5' },
                    ].map(f => <FacilityItem key={f.label} {...f} />)}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Timing */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <SectionTitle icon={Clock} label="Timing & Schedule" />
                    <Badge variant="secondary" className="text-[10px] px-2.5 py-1 rounded-full">
                      {Object.values(clinic.timing || {}).filter(t => t !== 'Closed').length} Days Open
                    </Badge>
                  </div>
                  <div className="max-w-md">
                    {Object.entries(clinic.timing || {}).map(([day, time]) => (
                      <DayRow key={day} day={day} time={time} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Location */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={MapPin} label="Location & Contact" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl h-52 flex items-center justify-center border border-border/40 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
                      <div className="text-center relative z-10">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                          <MapPin className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-2">Get Directions</p>
                        <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1.5" onClick={() => toast.success('Opening directions...')}>
                          <Navigation className="w-3.5 h-3.5" /> Open in Maps
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/40">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Address</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{clinic.address}{clinic.city ? `, ${clinic.city}` : ''}{clinic.state ? `, ${clinic.state}` : ''}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Navigation className="w-3 h-3" />{clinic.distance || ((clinic._id?.charCodeAt(clinic._id?.length - 1) || 5) % 5 + 1).toFixed(1)} km away</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/40">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Phone</p>
                          <a href={`tel:${clinic.phone}`} className="text-xs text-primary hover:underline mt-0.5 block">{clinic.phone}</a>
                        </div>
                      </div>
                      {clinic.email && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/40">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Mail className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Email</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{clinic.email}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground mr-1">Follow us:</span>
                        <a href={clinic.social?.facebook} className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors"><Globe className="w-4 h-4 text-blue-600" /></a>
                        <a href={clinic.social?.instagram} className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-500/15 flex items-center justify-center hover:bg-pink-200 dark:hover:bg-pink-500/30 transition-colors"><Globe className="w-4 h-4 text-pink-600" /></a>
                        <a href={clinic.social?.youtube} className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/15 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"><Globe className="w-4 h-4 text-red-600" /></a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Reviews */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <SectionTitle icon={Star} label={`Patient Reviews (${clinic.reviewsCount})`} />
                    <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1.5" onClick={() => toast.success('Review form coming soon')}>
                      <Star className="w-3.5 h-3.5" /> Write a Review
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start gap-6 mb-6 p-5 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border/40">
                    <div className="text-center min-w-[100px]">
                      <div className="text-4xl font-bold text-foreground">{clinic.rating}</div>
                      <div className="flex items-center gap-0.5 mt-1 justify-center">
                        {[1,2,3,4,5].map(i => <Star key={i} className={cn('w-4 h-4', i <= Math.round(clinic.rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />)}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{clinic.reviewsCount} total reviews</p>
                    </div>
                    <div className="flex-1 w-full space-y-1.5">
                      {[5,4,3,2,1].map(r => (
                        <div key={r} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-muted-foreground font-medium">{r}</span>
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className={cn('h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500', r === 5 ? 'w-3/5' : r === 4 ? 'w-1/4' : r === 3 ? 'w-1/10' : 'w-[5%]')} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(reviews.length > 0 ? reviews : []).map((rev, i) => (
                      <div key={i} className="group p-4 rounded-xl border border-border/30 hover:border-border/60 hover:shadow-sm transition-all">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-bold text-primary shrink-0 border-2 border-primary/10">
                            {(rev.patientName || '?')[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">{rev.patientName || 'Anonymous'}</span>
                              <div className="flex items-center gap-0.5">
                                {[1,2,3,4,5].map(s => <Star key={s} className={cn('w-3 h-3', s <= rev.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20')} />)}
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{rev.date || ''}</p>
                            <p className="text-xs text-foreground mt-2 leading-relaxed">{rev.comment || rev.text || ''}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Additional Info */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <SectionTitle icon={Info} label="Additional Information" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/40">
                      <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1"><Award className="w-3 h-3" /> License Number</p>
                      <p className="text-sm font-semibold text-foreground">{clinic.license}</p>
                    </div>
                    <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border/40">
                      <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Payment Modes</p>
                      <p className="text-sm font-semibold text-foreground">{clinic.paymentModes?.join(' | ')}</p>
                    </div>
                  </div>
                  {clinic.insurance?.length > 0 && (
                    <div className="mb-5 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20">
                      <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-primary" /> Insurance Accepted</p>
                      <div className="flex flex-wrap gap-2">
                        {clinic.insurance.map(i => (
                          <Badge key={i} variant="secondary" className="text-[10px] px-2.5 py-1 rounded-lg border border-border/40 bg-white dark:bg-background">{i}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {(clinic.faqs?.length > 0) && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5"><HelpCircle className="w-4 h-4 text-primary" /> Frequently Asked Questions</p>
                        <div className="space-y-2">
                          {clinic.faqs.map((faq, i) => (
                            <div key={i} className="border border-border/40 rounded-xl overflow-hidden transition-all">
                              <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                                className="w-full flex items-center justify-between p-3.5 text-left text-sm font-medium text-foreground hover:bg-muted/30 transition-colors">
                                <span className="pr-4">{faq.q}</span>
                                <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-300', expandedFaq === i && 'rotate-180')} />
                              </button>
                              {expandedFaq === i && (
                                <div className="px-3.5 pb-3.5 text-xs text-muted-foreground leading-relaxed animate-in slide-in-from-top-1 duration-200">
                                  {faq.a}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

          </div>

          {/* ──── RIGHT SIDEBAR ──── */}
          <div className="space-y-6 lg:sticky lg:top-24 self-start">
            {/* Trust & Info */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="w-full">
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden w-full">
                <CardContent className="p-6">
                  <h3 className="font-heading font-semibold text-foreground mb-5 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><ClipboardList className="w-3.5 h-3.5 text-primary" /></span>
                    Trust & Info
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {[
                        ['Established', clinic.established || '—'],
                        ['Qualified Doctors', clinic.totalDoctors || '—'],
                        ['Specialties', clinic.totalSpecialties || '—'],
                        ['Patients Treated', clinic.totalPatients ? `${(clinic.totalPatients/1000).toFixed(0)}K+` : '—'],
                        ['Working Hours', clinicWorkingHours],
                        ['Distance', `${clinic.distance || ((clinic._id?.charCodeAt(clinic._id?.length - 1) || 5) % 5 + 1).toFixed(1)} km`],
                      ].map(([label, val]) => (
                        <div key={label} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-semibold text-foreground">{val}</span>
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-semibold text-foreground">Verified Clinic</span>
                      </div>
                      {clinic.license && (
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-blue-500" />
                          <span className="text-xs font-semibold text-foreground">License: {clinic.license}</span>
                        </div>
                      )}
                    </div>
                    {clinic.insurance?.length > 0 && (
                      <div className="pt-3 border-t border-border/40">
                        <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-primary" /> Insurance Accepted
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {clinic.insurance.map(i => (
                            <span key={i} className="text-[10px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/20">{i}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Trust Badges */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="w-full">
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden w-full">
                <CardContent className="p-6">
                  <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><Heart className="w-3.5 h-3.5 text-primary" /></span>
                    Community Trust
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10">
                      <BadgeCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                    {clinic.totalPatients > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-500/10">
                        <Users className="w-3.5 h-3.5" /> {(clinic.totalPatients/100).toFixed(0)}K+ Patients
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="w-full">
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent w-full">
                <CardContent className="p-6">
                  <h3 className="font-heading font-semibold text-foreground mb-5 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-primary" /></span>
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    <Button className="w-full gap-2.5 rounded-xl h-11 font-semibold shadow-md" onClick={() => toast.success('Booking coming soon')}>
                      <CalendarDays className="w-4 h-4" /> Book Appointment
                    </Button>
                    <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={() => toast.success('Removed from Saved')}>
                      <Heart className="w-4 h-4" /> Save
                    </Button>
                    <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" asChild>
                      <a href={`tel:${clinic.phone}`}><Phone className="w-4 h-4" /> Call Now</a>
                    </Button>
                    <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={() => toast.success('Opening directions...')}>
                      <Navigation className="w-4 h-4" /> Get Directions
                    </Button>
                    <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied!'); }}>
                      <Share2 className="w-4 h-4" /> Share Profile
                    </Button>
                    <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={() => toast.success('Review form coming soon')}>
                      <Star className="w-4 h-4" /> Write a Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

          </div>
        </div>

        {/* ════════ 4. OTHER BRANCHES (full width after grid) ════════ */}
        {clinic.branches?.length > 0 && (
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="mb-8">
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <SectionTitle icon={Building2} label="Other Branches" />
                  <Badge variant="secondary" className="text-[10px] px-2.5 py-1 rounded-full">{clinic.branches.length} Branches</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {clinic.branches?.slice(0, 3).map((b, idx) => {
                    const colors = ['from-primary/10 border-primary/20','from-blue-500/10 border-blue-500/20','from-purple-500/10 border-purple-500/20'];
                    return (
                      <div key={b.name} className={cn('bg-gradient-to-br rounded-xl p-4 border cursor-pointer hover:shadow-md transition-all group', colors[idx % colors.length])}>
                        <div className="flex items-start gap-3">
                          <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0', colors[idx % colors.length])}>
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{b.name}</p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{b.address}</p>
                            <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{b.timing}</span>
                              {b.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{b.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

      </div>
    </div>
  );
}
