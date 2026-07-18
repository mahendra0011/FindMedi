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
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [suggestedHospitals, setSuggestedHospitals] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
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
      const tabParam = searchParams.get('tab');
      if (tabParam === 'tests') setActiveTab('tests');
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

  const filteredDepartments = DEPARTMENTS.map(dept => {
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
    return true;
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
                  <span>{hospital.address}, {hospital.city}{hospital.state ? `, ${hospital.state}` : ''}</span>
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
                {doctorSectionTab === 'doctors' && (
                  <Button variant="ghost" size="sm" className="gap-1 text-primary font-semibold" onClick={() => navigate(`/hospitals/${id}/doctors`)}>
                    View More <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className={doctorSectionTab !== 'doctors' ? 'hidden' : ''}>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={docSearch} onChange={e => setDocSearch(e.target.value)}
                  placeholder="Search doctors by name or specialization…"
                  className="pl-10 rounded-xl h-10 text-sm"
                />
              </div>

              {/* Browse by Specialties */}
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2 mb-5">
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setDocSpecFilter('All')}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border transition-all',
                    docSpecFilter === 'All'
                      ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                      : 'border-border/60 bg-card hover:border-primary/30 hover:shadow-sm'
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Stethoscope className="w-4 h-4 text-primary" />
                  </div>
                  <span className={cn('text-[9px] font-semibold text-center leading-tight', docSpecFilter === 'All' ? 'text-primary' : 'text-foreground')}>All</span>
                  <span className="text-[8px] text-muted-foreground -mt-0.5">{doctors.length}</span>
                </motion.button>
                {(hospital?.specialties || []).map(s => {
                  const spec = SPEC_CARD_THEME[s];
                  const Icon = spec?.icon || Stethoscope;
                  const count = doctors.filter(d => d.specialization === s).length;
                  return (
                    <motion.button key={s}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setDocSpecFilter(s)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border transition-all',
                        docSpecFilter === s
                          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                          : 'border-border/60 bg-card hover:border-primary/30 hover:shadow-sm'
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center', spec?.color || 'from-primary/20 to-primary/5')}>
                        <Icon className={cn('w-4 h-4', spec?.textColor || 'text-primary')} />
                      </div>
                      <span className={cn('text-[9px] font-semibold text-center leading-tight', docSpecFilter === s ? 'text-primary' : 'text-foreground')}>{s}</span>
                      <span className="text-[8px] text-muted-foreground -mt-0.5">{count}</span>
                    </motion.button>
                  );
                })}
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
                        {doc.available ? 'Available Today' : 'Next Available: Tomorrow 9 AM'}
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10 mb-4">
                        <span className="text-sm text-muted-foreground">Consultation Fee</span>
                        <span className="font-bold text-lg text-primary">₹{doc.consultation_fees || doc.fees || 0}</span>
                      </div>

                      <div className="flex gap-2">
                        <Button className="flex-1 gap-2 rounded-xl shadow-lg shadow-primary/20" size="sm" disabled={!doc.available}
                          onClick={(e) => { e.stopPropagation(); navigate(`/doctors/${doc._id}`); }}>
                          <CalendarDays className="w-3.5 h-3.5" /> Book Appointment
                        </Button>
                        <Button variant="outline" className="gap-2 rounded-xl" size="sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/doctors/${doc._id}`); }}>
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
                  <div className="flex flex-wrap gap-2">
                    <select value={testDeptFilter} onChange={e => setTestDeptFilter(e.target.value)}
                      className="h-8 px-2.5 rounded-lg text-[11px] bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="All">All Departments</option>
                      {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      {filteredDepartments.length === 0 ? (
                        <div className="text-center py-10 bg-card rounded-xl border border-border/50">
                          <Search className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">No tests match your filters</p>
                          <Button variant="ghost" size="sm" className="mt-1.5 text-xs" onClick={() => { setTestSearch(''); setTestDeptFilter('All'); setTestRxFilter('all'); setTestHomeFilter('all'); setPriceRange([0, 10000]); }}>
                            Clear all filters
                          </Button>
                        </div>
                      ) : (
                        <Accordion type="multiple" className="space-y-2">
                          {filteredDepartments.map(dept => {
                            const Icon = dept.icon;
                            return (
                              <AccordionItem key={dept.id} value={dept.id} className="border border-border/50 rounded-xl overflow-hidden bg-card">
                                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                      <Icon className="w-4 h-4 text-primary" />
                                    </div>
                                    <span className="text-sm font-semibold">{dept.name}</span>
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">{dept.tests.length}</Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-3">
                                  <div className="space-y-1.5">
                                    {dept.tests.slice(0, 4).map(test => (
                                      <div key={test.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-foreground truncate">{test.name}</p>
                                          <p className="text-[10px] text-muted-foreground">₹{test.price} <span className="line-through">₹{test.mrp}</span></p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                          {testCart[test.id] ? (
                                            <div className="flex items-center gap-1">
                                              <button onClick={() => removeTestFromCart(test.id)} className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"><Minus className="w-3 h-3 text-primary" /></button>
                                              <span className="text-xs font-semibold w-5 text-center">{testCart[test.id]}</span>
                                              <button onClick={() => addTestToCart(test.id)} className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"><Plus className="w-3 h-3 text-primary" /></button>
                                            </div>
                                          ) : (
                                            <button onClick={() => addTestToCart(test.id)} className="w-7 h-7 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center hover:bg-primary/90 transition-colors">Add</button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                    {dept.tests.length > 4 && (
                                      <button onClick={() => setActiveTab('tests')} className="w-full text-center text-[10px] text-primary font-semibold py-1.5 hover:underline">+{dept.tests.length - 4} more</button>
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      )}
                    </div>

                    {/* Selected Tests Summary */}
                    <div className="bg-card rounded-xl border border-border/50 p-4 h-fit lg:sticky lg:top-24">
                      <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                        <ShoppingCart className="w-3.5 h-3.5 text-primary" /> Selected Tests
                      </h4>
                      {Object.keys(testCart).length === 0 ? (
                        <div className="text-center py-8">
                          <ShoppingCart className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground">No tests selected</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Browse and add tests above</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {Object.entries(testCart).map(([testId, qty]) => {
                            const test = DEPARTMENTS.flatMap(d => d.tests).find(t => t.id === testId);
                            if (!test) return null;
                            return (
                              <div key={testId} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-muted/30">
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-medium text-foreground truncate">{test.name}</p>
                                  <p className="text-[10px] text-muted-foreground">₹{test.price} x {qty}</p>
                                </div>
                                <button onClick={() => removeTestFromCart(testId)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-muted transition-colors shrink-0 ml-1"><X className="w-3 h-3 text-muted-foreground" /></button>
                              </div>
                            );
                          })}
                          <Separator />
                          <div className="flex items-center justify-between text-xs font-semibold px-2.5">
                            <span>Total</span>
                            <span>₹{Object.entries(testCart).reduce((sum, [testId, qty]) => { const t = DEPARTMENTS.flatMap(d => d.tests).find(t => t.id === testId); return sum + (t?.price || 0) * qty; }, 0)}</span>
                          </div>
                          <Button size="sm" className="w-full gap-1.5 rounded-lg text-xs h-8">
                            <Lock className="w-3 h-3" /> Proceed to Booking
                          </Button>
                        </div>
                      )}
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


      {/* ═══════════ TABS SECTION ═══════════ */}
      <div>

        {/* Tab Navigation */}
        <motion.div variants={fadeUp} className="flex gap-1 mb-8 bg-muted/50 p-1 rounded-2xl border border-border/40 w-fit">
          {[
            { key:'overview', label:'Overview', icon:Building2 },
            { key:'tests', label:'Tests', icon:FlaskConical },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                activeTab === tab.key
                  ? 'bg-card text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              )}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </motion.div>

        {activeTab === 'overview' ? (
        <div className="space-y-8">

            {/* ─── Specialties / Departments Showcase ─── */}
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

            {/* ─── REVIEWS SECTION ─── */}
            {reviews.length > 0 && (
              <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                  <CardContent className="p-6 sm:p-8">
                    <h2 className="font-heading text-xl font-bold text-foreground mb-5 flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Star className="w-4 h-4 text-primary fill-primary" /></span>
                      Patient Reviews <span className="text-base font-normal text-muted-foreground ml-1">({reviews.length})</span>
                    </h2>
                    <div className="space-y-5">
                      {reviews.map((review, i) => (
                        <motion.div key={review._id || i} variants={fadeUp}
                          className="border-b border-border/40 last:border-0 pb-5 last:pb-0"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                              {review.patientName?.split(' ').map(n=>n[0]).join('').slice(0,2) || 'U'}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-foreground text-sm">{review.patientName}</p>
                                <span className="text-xs text-muted-foreground">{review.date ? new Date(review.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</span>
                              </div>
                              <div className="flex items-center gap-0.5 mt-1 mb-1.5">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} className={cn('w-3.5 h-3.5', s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />
                                ))}
                              </div>
                              {review.comment && (
                                <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

        </div>
        ) : (
        /* ═══ TESTS TAB ═══ */
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

            {/* Filters Row */}
            <motion.div {...fadeUp} className="flex flex-wrap gap-2">
              <select value={testDeptFilter} onChange={e => setTestDeptFilter(e.target.value)}
                className="h-9 px-3 rounded-lg text-xs bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select value={testRxFilter} onChange={e => setTestRxFilter(e.target.value)}
                className="h-9 px-3 rounded-lg text-xs bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="all">All Tests</option>
                <option value="direct">Direct Only</option>
                <option value="rx">Prescription Required</option>
              </select>
              <select value={testHomeFilter} onChange={e => setTestHomeFilter(e.target.value)}
                className="h-9 px-3 rounded-lg text-xs bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="all">Any Collection</option>
                <option value="home">Home Collection</option>
                <option value="lab">Lab Visit Only</option>
              </select>
              <select value={testSort} onChange={e => setTestSort(e.target.value)}
                className="h-9 px-3 rounded-lg text-xs bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="popularity">Sort: Popularity</option>
                <option value="price-low">Sort: Price (Low)</option>
                <option value="price-high">Sort: Price (High)</option>
              </select>
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

          {/* Tests Sidebar */}
          <div className="space-y-6">
            <motion.div variants={fadeUp} className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm lg:sticky lg:top-24">
              <div className="px-5 py-3.5 border-b border-border/30 bg-gradient-to-r from-primary/[0.04] to-transparent">
                <h4 className="font-heading font-semibold text-foreground flex items-center gap-2 text-sm">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                  </div>
                  Selected Tests
                </h4>
              </div>
              <div className="p-5">
                {Object.keys(testCart).length === 0 ? (
                  <div className="text-center py-6">
                    <FlaskConical className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No tests selected</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(testCart).map(([tid, qty]) => {
                      const test = allTests.find(t => t.id === tid);
                      if (!test) return null;
                      return (
                        <div key={tid} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground truncate">{test.name}</p>
                            <p className="text-[10px] text-muted-foreground">₹{test.price} x {qty}</p>
                          </div>
                          <span className="text-xs font-bold text-foreground shrink-0 ml-2">₹{test.price * qty}</span>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between pt-2 border-t border-border/30">
                      <span className="text-xs font-semibold text-foreground">Total</span>
                      <span className="text-sm font-bold text-primary">
                        ₹{Object.entries(testCart).reduce((s, [tid, qty]) => {
                          const test = allTests.find(t => t.id === tid);
                          return s + (test ? test.price * qty : 0);
                        }, 0)}
                      </span>
                    </div>
                    <Button className="w-full gap-1.5 rounded-xl h-10 text-xs font-semibold mt-2 shadow-lg shadow-primary/20" onClick={() => navigate('/book-test')}>
                      Book Now <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
        )}

        {/* Bottom Sticky Bar — Tests Tab */}
        {activeTab === 'tests' && Object.keys(testCart).length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-2xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">
                    {Object.keys(testCart).reduce((s, k) => s + testCart[k], 0)} test{Object.keys(testCart).reduce((s, k) => s + testCart[k], 0) > 1 ? 's' : ''} selected
                  </span>
                  <span className="text-lg font-bold text-foreground block leading-tight">
                    ₹{Object.entries(testCart).reduce((s, [tid, qty]) => {
                      const test = allTests.find(t => t.id === tid);
                      return s + (test ? test.price * qty : 0);
                    }, 0)}
                  </span>
                </div>
              </div>
              <Button className="gap-2 rounded-xl shadow-lg shadow-primary/30 px-6 h-11" onClick={() => navigate('/book-test')}>
                Book Now <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}
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
                <Card
                  key={h._id}
                  onClick={() => navigate(`/hospitals/${h._id}`)}
                  className="min-w-[260px] md:min-w-[280px] snap-start cursor-pointer hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all"
                >
                  <div className="h-32 w-full overflow-hidden rounded-b-none">
                    <img
                      src={h.image || h.logo}
                      alt={h.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-heading font-semibold text-sm text-foreground truncate">{h.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{h.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant="secondary" className="text-[11px] rounded-lg">{h.hospitalType}</Badge>
                      <span className="text-[11px] text-muted-foreground">{h.city}, {h.state}</span>
                    </div>
                  </CardContent>
                </Card>
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
