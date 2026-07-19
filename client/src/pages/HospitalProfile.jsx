import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, MapPin, Star, Phone, Stethoscope, CalendarDays,
  IndianRupee, ArrowLeft, Search, Shield, Award, Clock, Users,
  BedDouble, Ambulance, Share2, ChevronRight, Home, BadgeCheck, Bookmark,
  Navigation, AlertCircle, HeartPulse, CheckCircle2,
  ChevronDown, ChevronUp, FlaskRound, Quote, Mail,
  Circle, Heart, Eye, Sparkles, TrendingUp, Brain, Bone, Baby, Activity,
  FlaskConical,   ShoppingCart, Lock, Plus, Minus, Zap, X, UserRound
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import HospitalCard from '@/components/HospitalCard';

// Carousel icons
import { ChevronLeft } from 'lucide-react';
const ChevronRightIcon = ChevronRight;
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Animation Variants ────────────────────────────────────────────────────
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } }
};
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } }
};
const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5 } }
};
const slideUp = {
  hidden: { opacity: 0, y: 50 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 180, damping: 20 } }
};

const EXPERIENCE_RANGES = [
  { label: '0\u20135 years', min: 0, max: 5 },
  { label: '5\u201310 years', min: 5, max: 10 },
  { label: '10+ years', min: 10, max: 999 },
];

// ─── Specialty Theme Colors ────────────────────────────────────────────────
const SPEC_THEME = {
  Cardiology:        { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600',     border: 'border-red-200 dark:border-red-800', icon: Heart },
  Neurology:         { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600',  border: 'border-purple-200 dark:border-purple-800', icon: Brain },
  Orthopedics:       { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600',     border: 'border-blue-200 dark:border-blue-800', icon: Bone },
  Pediatrics:        { bg: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-600',   border: 'border-green-200 dark:border-green-800', icon: Baby },
  Dermatology:       { bg: 'bg-pink-50 dark:bg-pink-500/10', text: 'text-pink-600',    border: 'border-pink-200 dark:border-pink-800', icon: Eye },
  Oncology:          { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600',  border: 'border-orange-200 dark:border-orange-800', icon: Activity },
  'General Medicine':{ bg: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-600',    border: 'border-teal-200 dark:border-teal-800', icon: Stethoscope },
  ENT:               { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600',  border: 'border-indigo-200 dark:border-indigo-800', icon: Users },
};
function getSpecTheme(spec) {
  return SPEC_THEME[spec] || { bg: 'bg-slate-50 dark:bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-200', icon: Stethoscope };
}

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

export default function HospitalProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [hospital, setHospital] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [docSearch, setDocSearch] = useState('');
  const [docSpecFilter, setDocSpecFilter] = useState('All');
  const [doctorSectionTab, setDoctorSectionTab] = useState('doctors');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [expFilter, setExpFilter] = useState('');
  const [feeRange, setFeeRange] = useState([0, 2000]);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [sortBy, setSortBy] = useState('relevance');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [suggestedHospitals, setSuggestedHospitals] = useState([]);
  const [testSearch, setTestSearch] = useState('');
  const [testDeptFilter, setTestDeptFilter] = useState('All');
  const [testRxFilter, setTestRxFilter] = useState('all');
  const [testHomeFilter, setTestHomeFilter] = useState('all');
  const [testSort, setTestSort] = useState('popularity');
  const [priceRange, setPriceRange] = useState([0, 10000]);

  const carouselRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollCarousel = (dir) => {
    const el = carouselRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };
  const handleCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [hospData, docs, revs] = await Promise.all([
          api.getHospital(id),
          api.getDoctors({ hospitalId: id }).catch(() => []),
          api.getReviews({ hospitalId: id }).catch(() => []),
        ]);
        const hosp = hospData?.hospital || hospData;
        if (!hosp) { setNotFound(true); return; }
        setHospital(hosp);
      setDoctors(docs || []);
      setReviews(revs || []);
      // Fetch suggested hospitals
      try {
        const allHospitals = await api.getHospitals({});
        const currentCity = hosp.city?.toLowerCase();
        const currentSpecs = new Set((hosp.specialties || []).map(s => s.toLowerCase()));
        const scored = allHospitals
          .filter(h => h._id !== hosp._id)
          .map(h => {
            let score = 0;
            if (h.city?.toLowerCase() === currentCity) score += 2;
            const commonSpecs = (h.specialties || []).filter(s => currentSpecs.has(s.toLowerCase()));
            score += commonSpecs.length;
            if (h.rating > hosp.rating) score += 1;
            return { h, score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map(item => item.h);
        setSuggestedHospitals(scored);
      } catch (e) { console.log('Could not load suggested hospitals', e); }
    
    } catch { setNotFound(true); }
    setLoading(false);
    })();
  }, [id]);

  // ─── Derived Data ──────────────────────────────────────────────────────────
  const establishedYear = hospital?.establishedYear ||
    (hospital?.createdAt ? new Date(hospital.createdAt).getFullYear() : null);
  const expYears = establishedYear ? new Date().getFullYear() - establishedYear : null;
  const tagline = hospital?.hospitalType
    ? `${hospital.hospitalType}${establishedYear ? `  •  Est. ${establishedYear}` : ''}`
    : '';
  const totalDepts = hospital?.specialties?.length || 0;

  const getOpenStatus = () => {
    if (hospital?.emergency24x7) return { isOpen: true, label: 'Open 24/7', dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800' };
    const h = new Date().getHours();
    if (h >= 7 && h < 22) return { isOpen: true, label: `Open • Closes 10 PM`, dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800' };
    return { isOpen: false, label: 'Closed', dot: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-500/10 text-red-600 border-red-200 dark:border-red-800' };
  };
  const openStatus = getOpenStatus();
  const hospitalPhotos = [hospital?.image, hospital?.logo].filter(Boolean);

  const initials = (n) => n?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'H';

  const renderStars = (r) => [1,2,3,4,5].map(s => (
    <Star key={s} className={cn('w-4 h-4', s <= Math.round(r) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20 fill-muted-foreground/20')} />
  ));

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ title: hospital?.name, url }); } catch {} }
    else { await navigator.clipboard.writeText(url); toast.success('Link copied!'); }
  };
  const handleBookDoctor = () => navigate(`/hospitals/${id}/doctors`);

  const [testCart, setTestCart] = useState({});
  const addTestToCart = (testId) => setTestCart(p => ({ ...p, [testId]: (p[testId] || 0) + 1 }));
  const removeTestFromCart = (testId) => setTestCart(p => {
    const next = { ...p };
    if (next[testId] <= 1) delete next[testId];
    else next[testId]--;
    return next;
  });

  const DEPARTMENTS = [
    {
      id:'pathology', name:'Pathology', icon:FlaskConical, count:45,
      doctor:'Dr. Rajesh Verma',
      tests:[
        { id:'ht1', name:'Complete Blood Count (CBC)', price:249, mrp:399, reportTime:'6 hrs', homeCollection:true, rx:false, popular:true },
        { id:'ht2', name:'Lipid Profile', price:349, mrp:599, reportTime:'8 hrs', homeCollection:true, rx:false, popular:true },
        { id:'ht3', name:'Blood Glucose (Fasting)', price:99, mrp:150, reportTime:'4 hrs', homeCollection:true, rx:false, popular:false },
        { id:'ht4', name:'Liver Function Test', price:499, mrp:799, reportTime:'10 hrs', homeCollection:true, rx:false, popular:false },
        { id:'ht5', name:'Kidney Function Test', price:449, mrp:699, reportTime:'10 hrs', homeCollection:true, rx:false, popular:false },
        { id:'ht6', name:'HbA1c', price:299, mrp:499, reportTime:'8 hrs', homeCollection:true, rx:false, popular:false },
        { id:'ht15', name:'Thyroid Profile (T3,T4,TSH)', price:449, mrp:699, reportTime:'12 hrs', homeCollection:true, rx:false, popular:false },
        { id:'ht16', name:'Vitamin D Total', price:799, mrp:1299, reportTime:'24 hrs', homeCollection:true, rx:false, popular:true },
        { id:'ht17', name:'Urine Routine', price:129, mrp:199, reportTime:'6 hrs', homeCollection:true, rx:false, popular:false },
        { id:'ht18', name:'Stool Examination', price:199, mrp:299, reportTime:'8 hrs', homeCollection:true, rx:false, popular:false },
        { id:'ht19', name:'Iron Studies', price:399, mrp:599, reportTime:'12 hrs', homeCollection:true, rx:false, popular:false },
        { id:'ht20', name:'Hb Electrophoresis', price:899, mrp:1299, reportTime:'24 hrs', homeCollection:true, rx:false, popular:false },
      ]
    },
    {
      id:'radiology', name:'Radiology', icon:Activity, count:20,
      doctor:'Dr. Priya Sharma',
      tests:[
        { id:'ht14', name:'Chest X-Ray', price:499, mrp:899, reportTime:'2 hrs', homeCollection:false, rx:true, popular:false },
        { id:'ht21', name:'MRI Brain', price:4999, mrp:8999, reportTime:'4 hrs', homeCollection:false, rx:true, popular:false },
        { id:'ht22', name:'CT Abdomen', price:3999, mrp:6999, reportTime:'6 hrs', homeCollection:false, rx:true, popular:false },
        { id:'ht23', name:'Ultrasound Abdomen', price:1499, mrp:2499, reportTime:'1 hr', homeCollection:false, rx:true, popular:false },
        { id:'ht24', name:'Mammography', price:2499, mrp:3999, reportTime:'2 hrs', homeCollection:false, rx:true, popular:false },
        { id:'ht25', name:'Bone Density Scan', price:1999, mrp:2999, reportTime:'1 hr', homeCollection:false, rx:true, popular:false },
      ]
    },
    {
      id:'cardiology', name:'Cardiology', icon:Heart, count:12,
      doctor:'Dr. Amit Patel',
      tests:[
        { id:'ht11', name:'ECG', price:249, mrp:399, reportTime:'30 mins', homeCollection:false, rx:true, popular:false },
        { id:'ht12', name:'2D Echo', price:1799, mrp:2499, reportTime:'1 hr', homeCollection:false, rx:true, popular:false },
        { id:'ht26', name:'TMT (Stress Test)', price:2499, mrp:3999, reportTime:'2 hrs', homeCollection:false, rx:true, popular:false },
        { id:'ht27', name:'Holter Monitoring', price:3499, mrp:4999, reportTime:'48 hrs', homeCollection:false, rx:true, popular:false },
      ]
    },
    {
      id:'packages', name:'Health Packages', icon:Sparkles, count:8,
      doctor:null,
      tests:[
        { id:'hp1', name:'Full Body Checkup (70 parameters)', price:1499, mrp:2999, reportTime:'24 hrs', homeCollection:true, rx:false, popular:true, package:true, includes:['CBC','Blood Sugar','Lipid Profile','Liver Function','Kidney Function','Thyroid','Vitamin D','Urine Routine'] },
        { id:'hp2', name:'Diabetes Screening Package', price:699, mrp:1299, reportTime:'12 hrs', homeCollection:true, rx:false, popular:false, package:true, includes:['Fasting Blood Sugar','HbA1c','Urine Routine','Lipid Profile'] },
        { id:'hp3', name:'Senior Citizen Package', price:1999, mrp:3999, reportTime:'24 hrs', homeCollection:true, rx:false, popular:false, package:true, includes:['CBC','Lipid Profile','Kidney Function','Liver Function','Thyroid','Vitamin B12','ECG'] },
        { id:'hp4', name:'Cardiac Risk Assessment', price:2499, mrp:4999, reportTime:'24 hrs', homeCollection:true, rx:false, popular:true, package:true, includes:['Lipid Profile','ECG','Troponin I','CRP','Homocysteine'] },
      ]
    },
  ];

  const allTests = DEPARTMENTS.flatMap(d => d.tests);
  const totalTestCount = allTests.length;

  const filteredDepartments = DEPARTMENTS.filter(dept => testDeptFilter === 'All' || dept.id === testDeptFilter).map(dept => {
    const filtered = dept.tests.filter(t => {
      if (testSearch && !t.name.toLowerCase().includes(testSearch.toLowerCase())) return false;
      if (testRxFilter === 'rx' && !t.rx) return false;
      if (testRxFilter === 'direct' && t.rx) return false;
      if (testHomeFilter === 'home' && !t.homeCollection) return false;
      if (testHomeFilter === 'lab' && t.homeCollection) return false;
      if (t.price < priceRange[0] || t.price > priceRange[1]) return false;
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      if (testSort === 'price-low') return a.price - b.price;
      if (testSort === 'price-high') return b.price - a.price;
      return (b.popular ? 1 : 0) - (a.popular ? 1 : 0);
    });
    return { ...dept, tests: sorted };
  }).filter(d => d.tests.length > 0);


  const filteredDoctors = (doctors || []).filter(d => {
    const q = docSearch.toLowerCase();
    if (q && !d.name?.toLowerCase().includes(q) && !d.specialization?.toLowerCase().includes(q)) return false;
    if (docSpecFilter !== 'All' && d.specialization !== docSpecFilter) return false;
    if (availabilityFilter === 'available' && !d.available) return false;
    if (availabilityFilter === 'today' && !(d.available && d.next_available_slot?.toLowerCase().includes('today'))) return false;
    if (availabilityFilter === 'tomorrow' && !(d.available && d.next_available_slot?.toLowerCase().includes('tomorrow'))) return false;
    if (genderFilter && d.gender !== genderFilter) return false;
    if (expFilter) {
      const r = EXPERIENCE_RANGES.find(e => e.label === expFilter);
      if (r) {
        const y = parseInt(d.experience) || 0;
        if (y < r.min || y >= r.max) return false;
      }
    }
    const fee = d.consultation_fees || d.fees || 0;
    if (fee < feeRange[0] || fee > feeRange[1]) return false;
    if (ratingFilter > 0 && (d.rating || 0) < ratingFilter) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'experience') return (parseInt(b.experience) || 0) - (parseInt(a.experience) || 0);
    if (sortBy === 'fee') return (a.consultation_fees || a.fees || 0) - (b.consultation_fees || b.fees || 0);
    return 0;
  });

  // ─── Loading / 404 ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading hospital…</p>
      </div>
    </div>
  );
  if (notFound || !hospital) {
    return <Navigate to="/hospitals" replace />;
  }

  return (
    <motion.div initial="hidden" animate="show" className="bg-background min-h-screen">

      {/* ═══════════ BREADCRUMB ═══════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-0">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1"><Home className="w-3.5 h-3.5" /><span className="hidden sm:inline">Home</span></Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/hospitals" className="hover:text-primary transition-colors">Hospitals</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          {hospital.city && <><Link to={`/hospitals?city=${encodeURIComponent(hospital.city)}`} className="hover:text-primary transition-colors">{hospital.city}</Link><ChevronRight className="w-3.5 h-3.5" /></>}
          <span className="text-foreground font-medium truncate max-w-[200px]">{hospital.name}</span>
        </nav>
      </div>

      {/* ════════ 1. HERO SECTION ════════ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Gallery */}
            <div className="lg:col-span-2 relative rounded-2xl overflow-hidden bg-card border border-border/50 h-[300px] sm:h-[420px] group">
              {hospitalPhotos?.map((p, i) => (
                <div key={i} className={cn('absolute inset-0 transition-all duration-700', i === activePhoto ? 'opacity-100 scale-100' : 'opacity-0 scale-105')}>
                  <img src={p} alt={`${hospital.name} photo ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {hospitalPhotos?.map((_, i) => (
                  <button key={i} onClick={() => setActivePhoto(i)}
                    className={cn('h-1.5 rounded-full transition-all duration-300', i === activePhoto ? 'bg-white w-8' : 'bg-white/40 w-1.5 hover:bg-white/70')} />
                ))}
              </div>
              <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-9 h-9 rounded-xl bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-all hover:scale-105" onClick={() => toast.success('Bookmarked')}>
                  <Bookmark className="w-4 h-4" />
                </button>
                <button className="w-9 h-9 rounded-xl bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-all hover:scale-105" onClick={handleShare}>
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute top-4 left-4 z-10">
                <Badge className="bg-primary/90 text-white border-0 text-xs px-3 py-1.5 rounded-full shadow-lg">{hospital.hospitalType || 'Hospital'}</Badge>
              </div>
              {hospitalPhotos?.length > 1 && (
                <div className="absolute bottom-4 left-4 z-10 hidden sm:block">
                  <Badge variant="secondary" className="bg-black/40 text-white border-0 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                    {activePhoto + 1} / {hospitalPhotos.length} Photos
                  </Badge>
                </div>
              )}
            </div>

            {/* Info Card */}
            <div className="lg:col-span-1 bg-card rounded-2xl border border-border/50 p-6 flex flex-col shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border-2 border-primary/10">
                  <Building2 className="w-7 h-7 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-heading font-bold text-xl text-foreground leading-tight">{hospital.name}</h1>
                    {hospital.status === 'approved' && <BadgeCheck className="w-5 h-5 text-primary shrink-0" />}
                  </div>
                  <p className="text-sm font-medium text-primary/80">{hospital.hospitalType || 'Hospital'}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} className={cn('w-3.5 h-3.5', i <= Math.round(hospital.rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />)}
                    </div>
                    <span className="text-sm font-bold text-foreground">{hospital.rating}</span>
                    <span className="text-xs text-muted-foreground">({hospital.reviewsCount || 0} reviews)</span>
                  </div>
                </div>
              </div>

              <Separator className="my-3" />

              <div className="space-y-2.5 text-sm">
                <div className="flex items-start gap-2.5 text-muted-foreground">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <div>
                    <span>{hospital.address}, {hospital.city}{hospital.state ? `, ${hospital.state}` : ''}</span>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground/70">
                      <Navigation className="w-3 h-3" />
                      <span>{((hospital._id?.charCodeAt(hospital._id?.length - 1) || 5) % 5 + 0.5).toFixed(1)} km away</span>
                    </div>
                  </div>
                </div>
                <a href={`tel:${hospital.phone}`} className="flex items-center gap-2.5 text-primary font-medium hover:underline group">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                  </div>
                  {hospital.phone}
                </a>
                {hospital.email && (
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    {hospital.email}
                  </div>
                )}
              </div>

              <Separator className="my-3" />

              <div className={cn('px-4 py-2.5 rounded-xl border text-sm text-center font-semibold flex items-center justify-center gap-2', openStatus.isOpen ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10' : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10')}>
                <span className={cn('w-2 h-2 rounded-full animate-pulse', openStatus.isOpen ? 'bg-emerald-500' : 'bg-red-500')} />
                {openStatus.label}
              </div>

              <div className="flex gap-2 mt-auto pt-3">
                <Button className="flex-1 gap-2 rounded-xl shadow-lg shadow-primary/20 h-11 hover:shadow-xl hover:shadow-primary/30 transition-all" onClick={handleBookDoctor}>
                  <CalendarDays className="w-4 h-4" /> Book Appointment
                </Button>
                <Button variant="outline" className="rounded-xl h-11 px-3 hover:bg-primary/5 hover:border-primary/30 transition-all" onClick={() => navigate(`/hospitals/${id}/doctors`)}>
                  <Navigation className="w-4 h-4" />
                </Button>
                <a href={`tel:${hospital.phone}`}>
                  <Button variant="outline" className="rounded-xl h-11 px-3 hover:bg-primary/5 hover:border-primary/30 transition-all">
                    <Phone className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ════════ 2. QUICK STATS STRIP ════════ */}
      <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { icon: Building2, label: 'Established', value: establishedYear || '—', color: 'text-primary', desc: establishedYear ? `Since ${establishedYear}` : '—' },
          { icon: Stethoscope, label: 'Total Doctors', value: hospital.totalDoctors || doctors.length || 0, color: 'text-blue-500', desc: 'Qualified professionals' },
          { icon: Sparkles, label: 'Departments', value: totalDepts, color: 'text-purple-500', desc: 'Specialties available' },
          { icon: BedDouble, label: 'Total Beds', value: hospital.bedAvailability || 0, color: 'text-emerald-500', desc: 'Available beds' },
        ].map(stat => (
          <motion.div key={stat.label} variants={fadeUp}
            className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm', stat.color.replace('text-', 'from-').replace('-500', '-500/20') + ' to-transparent')}>
              <stat.icon className={cn('w-6 h-6', stat.color)} />
            </div>
            <div>
              <p className="font-heading text-2xl font-bold text-foreground leading-none mb-0.5">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ═══════════ MAIN CONTENT + SIDEBAR ═══════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ──── LEFT COLUMN ──── */}
          <div className="lg:col-span-2 space-y-8">

      {/* ═══════════ DOCTOR / TESTS SECTION ═══════════ */}
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
        className=""
      >
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
          <CardContent className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
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
                {doctorSectionTab === 'doctors' ? (
                  <Button variant="ghost" size="sm" className="gap-1 text-primary font-semibold shrink-0" onClick={() => navigate(`/hospitals/${id}/doctors`)}>
                    View More <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" className="gap-1 text-primary font-semibold shrink-0" onClick={() => navigate(`/book-test/${id}`)}>
                    View All Tests <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className={doctorSectionTab !== 'doctors' ? 'hidden' : ''}>
              {/* Browse by Specialties */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => setDocSpecFilter('All')}
                  className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all', docSpecFilter === 'All' ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground')}>
                  All ({doctors.length})
                </button>
                {(hospital?.specialties || []).map(s => {
                  const count = doctors.filter(d => d.specialization === s).length;
                  return (
                    <button key={s} onClick={() => setDocSpecFilter(s)}
                      className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all', docSpecFilter === s ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground')}>
                      {s} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={docSearch} onChange={e => setDocSearch(e.target.value)}
                  placeholder="Search doctors by name or specialization…"
                  className="pl-10 rounded-xl h-10 text-sm"
                />
              </div>

              {/* Filters Bar */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <select value={availabilityFilter} onChange={e => setAvailabilityFilter(e.target.value)}
                  className="h-8 px-2.5 rounded-lg text-[11px] bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">Availability</option>
                  <option value="available">Available Now</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                </select>
                <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)}
                  className="h-8 px-2.5 rounded-lg text-[11px] bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <select value={expFilter} onChange={e => setExpFilter(e.target.value)}
                  className="h-8 px-2.5 rounded-lg text-[11px] bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">Experience</option>
                  {EXPERIENCE_RANGES.map(r => (
                    <option key={r.label} value={r.label}>{r.label}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border/50 bg-background text-[11px]">
                  <IndianRupee className="w-3 h-3 text-muted-foreground shrink-0" />
                  <input type="range" min={0} max={2000} step={100} value={feeRange[0]}
                    onChange={e => setFeeRange([parseInt(e.target.value), feeRange[1]])}
                    className="w-14 h-1 accent-primary" />
                  <span className="text-[10px] text-muted-foreground w-10 text-right">{feeRange[0]}</span>
                  <span className="text-[10px] text-muted-foreground">-</span>
                  <input type="range" min={0} max={2000} step={100} value={feeRange[1]}
                    onChange={e => setFeeRange([feeRange[0], parseInt(e.target.value)])}
                    className="w-14 h-1 accent-primary" />
                  <span className="text-[10px] text-muted-foreground w-10">{feeRange[1]}</span>
                </div>
                <div className="flex gap-1">
                  {[4, 3].map(r => (
                    <Button key={r} variant={ratingFilter === r ? 'default' : 'outline'} size="sm"
                      onClick={() => setRatingFilter(ratingFilter === r ? 0 : r)}
                      className="h-8 text-[11px] px-2 rounded-lg">
                      <Star className="w-3 h-3 mr-0.5" /> {r}★ & above
                    </Button>
                  ))}
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="h-8 px-2.5 rounded-lg text-[11px] bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="relevance">Sort: Relevance</option>
                  <option value="rating">Rating</option>
                  <option value="experience">Experience</option>
                  <option value="fee">Fee (Low)</option>
                </select>
              </div>

              {filteredDoctors.length === 0 ? (
                <div className="text-center py-10">
                  <Search className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No doctors found</p>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredDoctors.slice(0, 2).map((doc) => (
                  <motion.div key={doc._id} variants={fadeUp}
                    className="bg-card rounded-2xl border border-border/60 overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all cursor-pointer h-full"
                  >
                    <div className="p-5 h-full flex flex-col">
                      <div className="flex items-start gap-4 mb-3">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 border-2 border-primary/10">
                          {doc.profile_photo
                            ? <img src={doc.profile_photo} alt="" className="w-full h-full object-cover" />
                            : <UserRound className="w-7 h-7 text-primary" />
                          }
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-heading font-semibold text-foreground truncate">{doc.name}</h3>
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
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-xs text-muted-foreground ml-1">{doc.rating} ({doc.reviews_count || 0})</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Award className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{doc.experience}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
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

                      <div className="bg-muted/30 rounded-xl border border-border/40 p-3 mb-3 space-y-2">
                        {doc.phone && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1.5"><Phone className="w-3 h-3 text-primary" />Phone</span>
                            <span className="font-medium text-foreground">{doc.phone}</span>
                          </div>
                        )}
                        {doc.email && (
                          <>
                            <div className="h-px bg-border/20" />
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground flex items-center gap-1.5"><Mail className="w-3 h-3 text-primary" />Email</span>
                              <span className="font-medium text-foreground truncate ml-2">{doc.email}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className={cn('px-3 py-2 rounded-xl border text-sm mb-4 text-center font-medium', doc.available ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10' : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10')}>
                        {doc.available ? `Available Today${doc.next_available_slot ? `, ${doc.next_available_slot}` : ''}` : `Next Available: ${doc.next_available_slot || 'Tomorrow 9 AM'}`}
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10 mb-4">
                        <span className="text-sm text-muted-foreground">Consultation Fee</span>
                        <span className="font-bold text-lg text-primary">₹{doc.consultation_fees || doc.fees || 0}</span>
                      </div>

                      <div className="flex gap-2">
                          <Button className="flex-1 gap-2 rounded-xl shadow-lg shadow-primary/20" size="sm" disabled={!doc.available}
                            onClick={(e) => { e.stopPropagation(); navigate(`/hospital-doctors/${doc._id}`); }}>
                            <CalendarDays className="w-3.5 h-3.5" /> Book Appointment
                          </Button>
                          <Button variant="outline" className="gap-2 rounded-xl" size="sm"
                            onClick={(e) => { e.stopPropagation(); navigate(`/hospital-doctors/${doc._id}`); }}>
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
                )}
              </div>
              <div className={doctorSectionTab !== 'tests' ? 'hidden' : ''}>
                <div className="flex flex-wrap gap-2 mb-4">
                  <button onClick={() => setTestDeptFilter('All')}
                    className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all', testDeptFilter === 'All' ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground')}>
                    All ({allTests.length})
                  </button>
                  {DEPARTMENTS.map(d => (
                    <button key={d.id} onClick={() => setTestDeptFilter(d.id)}
                      className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all', testDeptFilter === d.id ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground')}>
                      {d.name} ({d.tests.length})
                    </button>
                  ))}
                </div>
                <div className="relative mb-4">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={testSearch} onChange={e => setTestSearch(e.target.value)}
                    placeholder="Search tests..." className="pl-10 h-9 text-xs rounded-xl bg-background border-border/50" />
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <select value={priceRange} onChange={e => setPriceRange(e.target.value)}
                    className="h-8 px-2.5 rounded-lg text-[11px] bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="all">Price: All</option>
                    <option value="0-500">Under ₹500</option>
                    <option value="500-2000">₹500 - ₹2000</option>
                    <option value="2000+">₹2000+</option>
                  </select>
                  <select value={testRxFilter} onChange={e => setTestRxFilter(e.target.value)}
                    className="h-8 px-2.5 rounded-lg text-[11px] bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="all">All Tests</option>
                    <option value="direct">Direct Only</option>
                    <option value="rx">Prescription Required</option>
                  </select>
                  <select value={testHomeFilter} onChange={e => setTestHomeFilter(e.target.value)}
                    className="h-8 px-2.5 rounded-lg text-[11px] bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="all">Any Collection</option>
                    <option value="home">Home Collection</option>
                    <option value="lab">Lab Visit Only</option>
                  </select>
                  <select value={testSort} onChange={e => setTestSort(e.target.value)}
                    className="h-8 px-2.5 rounded-lg text-[11px] bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="popularity">Sort: Popularity</option>
                    <option value="price-low">Sort: Price (Low)</option>
                    <option value="price-high">Sort: Price (High)</option>
                  </select>
                </div>
                <div className="max-h-[420px] overflow-y-auto pr-1 -mr-1 scrollbar-thin"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredDepartments.flatMap(dept => dept.tests).map((test, i) => {
                    const dept = DEPARTMENTS.find(d => d.tests.includes(test));
                    if (!dept) return null;
                    return (
                      <motion.div key={test.id}
                        variants={fadeUp}
                        className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all group flex flex-col"
                      >
                        <div className="p-3 pb-2.5 flex-1 flex flex-col">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-heading font-semibold text-xs text-foreground leading-tight">{test.name}</h4>
                            {test.rx ? (
                              <span className="inline-flex items-center gap-0.5 text-[7px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0"><Lock className="w-2 h-2" /> Rx</span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[7px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">Direct</span>
                            )}
                          </div>
                          <p className="text-[9px] text-muted-foreground mb-1">{dept.name}</p>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground">
                              <Clock className="w-2 h-2" /> {test.reportTime}
                            </span>
                            {test.homeCollection && (
                              <span className="inline-flex items-center gap-0.5 text-[8px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                <Home className="w-1.5 h-1.5" /> Home
                              </span>
                            )}
                          </div>
                          <div className="mt-auto flex items-center justify-between pt-2 border-t border-border/30">
                            <div>
                              <span className="text-sm font-bold text-foreground">₹{test.price}</span>
                              {test.mrp > test.price && <span className="text-[9px] text-muted-foreground line-through ml-1">₹{test.mrp}</span>}
                            </div>
                            <Button size="sm" className="rounded-lg text-[9px] h-7 px-2.5" onClick={() => navigate(`/book-test/${id}`)}>
                              Book
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      {/* ═══════════ ABOUT SECTION (Stats ke neeche) ═══════════ */}
      {hospital.description && (
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8"
        >
          <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <h2 className="font-heading text-xl font-bold text-foreground mb-4 flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Quote className="w-4 h-4 text-primary" /></span>
                About {hospital.name}
              </h2>
              <div className={cn('text-muted-foreground leading-relaxed', !showFullDesc && 'line-clamp-3')}>
                {hospital.description}
              </div>
              {hospital.description.length > 200 && (
                <button onClick={() => setShowFullDesc(!showFullDesc)}
                  className="mt-2 text-sm text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  {showFullDesc ? 'Show less' : 'Read more'}
                  {showFullDesc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Specialties & Departments ─── */}
      {hospital.specialties?.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <h2 className="font-heading text-xl font-bold text-foreground mb-5 flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="w-4 h-4 text-primary" /></span>
                Specialties & Departments
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {hospital.specialties.map(spec => {
                  const theme = getSpecTheme(spec);
                  const Icon = theme.icon;
                  return (
                    <div key={spec} className={cn('flex items-center gap-1.5 px-2.5 py-2 rounded-lg border', theme.bg, theme.border)}>
                      <Icon className={cn('w-3.5 h-3.5 shrink-0', theme.text)} />
                      <span className={cn('text-[11px] font-medium', theme.text)}>{spec}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Location & Contact ─── */}
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <h2 className="font-heading text-xl font-bold text-foreground mb-6 flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><MapPin className="w-4 h-4 text-primary" /></span>
              Location & Contact
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><MapPin className="w-4 h-4 text-primary" /></div>
                  <div>
                    <p className="font-semibold text-foreground text-sm mb-0.5">Address</p>
                    <p className="text-sm text-muted-foreground">{hospital.address}, {hospital.city}{hospital.state ? `, ${hospital.state}` : ''}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      {((hospital._id?.charCodeAt(hospital._id?.length - 1) || 5) % 5 + 0.5).toFixed(1)} km away
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl gap-2" asChild>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(`${hospital.address}, ${hospital.city}, ${hospital.state}`)}`} target="_blank" rel="noopener noreferrer">
                    <Navigation className="w-4 h-4" /> Get Directions
                  </a>
                </Button>
              </div>
              <div className="space-y-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><Phone className="w-4 h-4 text-primary" /></div>
                  <div>
                    <p className="font-semibold text-foreground text-sm mb-0.5">Phone</p>
                    <a href={`tel:${hospital.phone}`} className="text-sm text-primary font-semibold hover:underline">{hospital.phone}</a>
                  </div>
                </div>
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5"><AlertCircle className="w-4 h-4 text-red-600" /></div>
                  <div>
                    <p className="font-semibold text-red-600 flex items-center gap-1.5 text-sm mb-0.5"><HeartPulse className="w-3.5 h-3.5" /> Emergency</p>
                    <a href={`tel:${hospital.emergencyNumber || hospital.phone}`} className="text-sm font-bold text-red-600 hover:underline">{hospital.emergencyNumber || hospital.phone}</a>
                    <p className="text-xs text-muted-foreground mt-0.5">Available 24/7</p>
                  </div>
                </div>
                {hospital.email && (
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><Mail className="w-4 h-4 text-primary" /></div>
                    <div>
                      <p className="font-semibold text-foreground text-sm mb-0.5">Email</p>
                      <p className="text-sm text-muted-foreground">{hospital.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Patient Reviews ─── */}
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Star className="w-4 h-4 text-primary fill-primary" /></span>
                Patient Reviews <span className="text-base font-normal text-muted-foreground ml-1">({hospital.reviewsCount || reviews.length})</span>
              </h2>
              <Button variant="outline" size="sm" className="rounded-lg text-xs gap-1.5" onClick={() => toast.success('Review submitted successfully!')}>
                <Star className="w-3.5 h-3.5" /> Write a Review
              </Button>
            </div>

            {reviews.length > 0 && (
              <>
                <div className="flex flex-col sm:flex-row items-start gap-6 mb-6 p-5 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border/40">
                  <div className="text-center min-w-[100px]">
                    <div className="text-4xl font-bold text-foreground">{hospital.rating || 0}</div>
                    <div className="flex items-center gap-0.5 mt-1 justify-center">
                      {[1,2,3,4,5].map(i => <Star key={i} className={cn('w-4 h-4', i <= Math.round(hospital.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />)}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{hospital.reviewsCount || reviews.length} total reviews</p>
                  </div>
                  <div className="flex-1 w-full space-y-1.5">
                    {[5,4,3,2,1].map(r => {
                      const count = reviews.filter(rev => rev.rating === r).length;
                      const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={r} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-muted-foreground font-medium">{r}</span>
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  {reviews.map((review, i) => (
                    <motion.div key={review._id || i} variants={fadeUp}
                      className="group p-4 rounded-xl border border-border/30 hover:border-border/60 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-bold text-primary shrink-0 border-2 border-primary/10">
                          {(review.patientName || '?')[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{review.patientName || 'Anonymous'}</span>
                            <div className="flex items-center gap-0.5">
                              {[1,2,3,4,5].map(s => <Star key={s} className={cn('w-3 h-3', s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20')} />)}
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{review.date ? new Date(review.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</p>
                          <p className="text-xs text-foreground mt-2 leading-relaxed">{review.comment || review.text || ''}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {reviews.length === 0 && !hospital.reviewsCount && (
              <div className="text-center py-12">
                <Star className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
              </div>
            )}
            {reviews.length === 0 && hospital.reviewsCount > 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Reviews are loading or unavailable. {hospital.reviewsCount} reviews recorded.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════ TESTS SECTION ═══════════ */}
      <div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            {/* Header */}
            <motion.div {...fadeUp}>
              <div className="flex items-center justify-between gap-3 mb-1">
                <h2 className="font-heading text-xl font-bold text-foreground">
                  {totalTestCount}+ Tests Available at {hospital.name}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Browse tests by department</p>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={testSearch} onChange={e => setTestSearch(e.target.value)}
                  placeholder="Search tests in this hospital..." className="pl-10 h-11 text-sm rounded-xl bg-background border-border/50" />
              </div>
            </motion.div>

            {/* Accordion */}
            <motion.div {...fadeUp}>
              {filteredDepartments.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
                  <Search className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No tests match your filters</p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setTestSearch(''); setTestDeptFilter('All'); setTestRxFilter('all'); setTestHomeFilter('all'); setPriceRange([0, 10000]); }}>
                    Clear all filters
                  </Button>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-3">
                  {filteredDepartments.map(dept => (
                    <AccordionItem key={dept.id} value={dept.id}
                      className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm border-b-0 data-[state=open]:shadow-md transition-shadow">
                      <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                            <dept.icon className="w-4.5 h-4.5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-heading font-semibold text-sm text-foreground">{dept.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">({dept.tests.length} tests)</span>
                            {testSearch && (
                              <span className="text-xs text-primary ml-2">{dept.tests.filter(t => t.name.toLowerCase().includes(testSearch.toLowerCase())).length} matching</span>
                            )}
                            {dept.doctor && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">Head: {dept.doctor}</p>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="px-5 pb-5 space-y-3">
                          {dept.tests.map(test => (
                            <div key={test.id} className="bg-background rounded-xl border border-border/50 p-4 hover:shadow-md hover:border-primary/20 transition-all">
                              {test.package ? (
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                                    <Sparkles className="w-5 h-5 text-primary" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <h4 className="font-heading font-semibold text-sm text-foreground">{test.name}</h4>
                                      {test.popular && <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Best Value</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                      {test.includes?.map((inc, i) => (
                                        <span key={i} className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/30">{inc}</span>
                                      ))}
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="flex items-baseline gap-1.5">
                                          <span className="text-lg font-bold text-foreground">₹{test.price}</span>
                                          {test.mrp > test.price && <span className="text-xs text-muted-foreground line-through">₹{test.mrp}</span>}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">Report in {test.reportTime}</p>
                                      </div>
                                      <div className="flex gap-1.5">
                                        <Button variant="outline" size="sm" className="rounded-lg text-xs h-8">View Details</Button>
                                        <Button size="sm" className="rounded-lg text-xs h-8 gap-1"
                                          onClick={() => { addTestToCart(test.id); toast.success(`${test.name} added`); }}>
                                          <ShoppingCart className="w-3 h-3" /> Book
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <FlaskConical className="w-5 h-5 text-primary" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <h4 className="font-heading font-semibold text-sm text-foreground">{test.name}</h4>
                                          {test.rx ? (
                                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded"><Lock className="w-2.5 h-2.5" /> Rx</span>
                                          ) : (
                                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">Direct</span>
                                          )}
                                          {test.popular && <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Popular</span>}
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <div className="flex items-baseline gap-1.5">
                                          <span className="text-sm font-bold text-foreground">₹{test.price}</span>
                                          {test.mrp > test.price && <span className="text-[10px] text-muted-foreground line-through">₹{test.mrp}</span>}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                        <Clock className="w-2.5 h-2.5" /> {test.reportTime}
                                      </span>
                                      {test.homeCollection && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                          <Home className="w-2.5 h-2.5" /> Home Collection
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-3">
                                      {test.rx ? (
                                        <Button size="sm" className="gap-1.5 rounded-lg h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                                          onClick={() => toast.info('Upload prescription to book this test')}>
                                          <Lock className="w-3 h-3" /> Upload Prescription
                                        </Button>
                                      ) : testCart[test.id] ? (
                                        <div className="flex items-center gap-1">
                                          <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => removeTestFromCart(test.id)} disabled={testCart[test.id] <= 1}>
                                            <Minus className="w-3 h-3" />
                                          </Button>
                                          <span className="w-6 text-center text-xs font-bold">{testCart[test.id]}</span>
                                          <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => addTestToCart(test.id)}>
                                            <Plus className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <Button size="sm" className="gap-1.5 rounded-lg h-8 text-xs" onClick={() => { addTestToCart(test.id); toast.success(`${test.name} added`); }}>
                                          <ShoppingCart className="w-3 h-3" /> Book Now
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </motion.div>

          </div>
        </div>
      </div>

        </div>

        {/* ──── RIGHT SIDEBAR ──── */}
        <div className="space-y-6 lg:sticky lg:top-24 self-start">
          {/* Trust & Accreditation */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <h3 className="font-heading font-semibold text-foreground mb-5 flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-primary" /></span>
                  Trust & Info
                </h3>
                <div className="space-y-4">
                  {hospital.accreditations?.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Accreditations</p>
                      <div className="flex flex-wrap gap-2">
                        {hospital.accreditations.map(acc => (
                          <Badge key={acc} variant="outline" className={cn('text-xs font-semibold px-3 py-1 gap-1.5', acc === 'NABH' && 'border-emerald-400 text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10', acc === 'NABL' && 'border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-500/10', acc === 'ISO' && 'border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-500/10')}>
                            <CheckCircle2 className="w-3 h-3" /> {acc}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <Separator />
                  <div className="space-y-3">
                    {[['Established', establishedYear || '—'], ['Hospital Type', hospital.hospitalType || '—'], ['License', hospital.licenseNumber || '—'], ['Working Hours', hospital.workingHours?.weekdays || '9:00 AM - 6:00 PM'], ['Saturday', hospital.workingHours?.saturday || '9:00 AM - 2:00 PM'], ['Sunday', hospital.workingHours?.sunday || 'Closed']].map(([label, val]) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold text-foreground">{val}</span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {hospital.ambulanceService && (
                      <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10">
                        <Ambulance className="w-3 h-3 mr-1" /> Ambulance
                      </Badge>
                    )}
                    {hospital.bedAvailability > 0 && (
                      <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10">
                        <BedDouble className="w-3 h-3 mr-1" /> {hospital.bedAvailability} Beds
                      </Badge>
                    )}
                  </div>
                  {hospital.insuranceAccepted?.length > 0 && (
                    <div className="pt-3 border-t border-border/40">
                      <p className="text-xs text-muted-foreground mb-2 font-semibold">Insurance Accepted</p>
                      <div className="flex flex-wrap gap-1.5">
                        {hospital.insuranceAccepted.map((ins, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10">
                            <Shield className="w-2.5 h-2.5 mr-1" /> {ins.provider || ins}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Amenities */}
          {(hospital.emergency24x7 || hospital.ambulanceService || hospital.bedAvailability > 0) && (
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-primary" /></span>
                    Amenities
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {hospital.emergency24x7 && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10">
                        <HeartPulse className="w-3.5 h-3.5" /> 24/7 Emergency
                      </span>
                    )}
                    {hospital.ambulanceService && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10">
                        <Ambulance className="w-3.5 h-3.5" /> Ambulance
                      </span>
                    )}
                    {hospital.bedAvailability > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/10">
                        <BedDouble className="w-3.5 h-3.5" /> {hospital.bedAvailability} Beds
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Quick Actions Sticky Card */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="lg:sticky lg:top-24">
            <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent">
              <CardContent className="p-6">
                <h3 className="font-heading font-semibold text-foreground mb-5 flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><TrendingUp className="w-3.5 h-3.5 text-primary" /></span>
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Button className="w-full gap-2.5 rounded-xl h-11 font-semibold shadow-md" onClick={handleBookDoctor}>
                    <CalendarDays className="w-4 h-4" /> Book Appointment
                  </Button>
                  <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" asChild>
                    <a href={`tel:${hospital.phone}`}><Phone className="w-4 h-4" /> Call Now</a>
                  </Button>
                  <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" asChild>
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(`${hospital.address}, ${hospital.city}, ${hospital.state}`)}`} target="_blank" rel="noopener noreferrer">
                      <Navigation className="w-4 h-4" /> Get Directions
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={handleShare}>
                    <Share2 className="w-4 h-4" /> Share Hospital
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

      </div>
    </div>

      {/* ═══════════ SUGGESTED HOSPITALS CAROUSEL ═══════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 mb-20">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <div className="flex items-center gap-3 mb-5">
            <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><MapPin className="w-4 h-4 text-primary" /></span>
            <h2 className="font-heading text-xl font-bold text-foreground">Suggested Hospitals</h2>
          </div>

          <div className="relative">
            <div
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              className="flex gap-4 overflow-x-auto scroll-smooth pb-4 snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {(suggestedHospitals || []).map((h) => (
                <div key={h._id} className="min-w-[260px] md:min-w-[280px] snap-start shrink-0">
                  <HospitalCard hospital={h} index={0} />
                </div>
              ))}
            </div>

            {canScrollLeft && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full shadow-md z-10"
                onClick={() => scrollCarousel('left')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            {canScrollRight && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full shadow-md z-10"
                onClick={() => scrollCarousel('right')}
              >
                <ChevronRightIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
