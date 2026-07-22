import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Star, CalendarDays, MapPin, Phone, Mail, IndianRupee, Award, Users,
  CheckCircle, Clock, Shield, Building2, UserRound, BadgeCheck, Bookmark,
  BookMarked, ChevronRight, GraduationCap, Briefcase, Trophy,
  HeartPulse, Syringe, Plus, Minus, ChevronDown, ChevronUp,
  Home, ExternalLink, Sparkles, FileText, BedDouble,
  CreditCard, Image, FlaskConical, DoorOpen, Store, ArrowRight,
  Search, X, ThumbsUp, Share2, Navigation, Wifi, Microscope, Zap, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

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

const FALLBACK_TECH = {
  'Pathology Lab': {
    name: 'Ramesh Kumar', role: 'Lab Technician',
    bio: 'Experienced lab technician with over 5 years in pathology sample collection and processing. Skilled in venipuncture, urine analysis, and patient handling.',
    expertise: ['Blood Collection', 'Urine Sample', 'Home Visit', 'Fasting Sample', 'Pediatric Collection'],
    specializations: [],
    qualifications: [{ degree: 'DMLT (Diploma in Medical Lab Technology)', institute: 'Gandhi Medical College, Bhopal', year: 2019 }, { degree: 'BMLT (Bachelor in Medical Lab Technology)', institute: 'Barkatullah University, Bhopal', year: 2021 }],
    certifications: ['MLT Certification - Indian Medical Association'],
    experience: '5 years', totalJobs: '2000+ samples collected', regNo: 'MLT-2021-00452',
    fee: 50, paymentModes: ['Cash', 'UPI', 'Card'],
    coverageRadius: 'Within 5 km', localities: ['Napier Town', 'Vijay Nagar', 'Civil Lines', 'Marhatal'],
    schedule: [
      { day: 'Monday', timing: '8:00 AM - 8:00 PM', shift: 'Full-time' },
      { day: 'Tuesday', timing: '8:00 AM - 8:00 PM', shift: 'Full-time' },
      { day: 'Wednesday', timing: '8:00 AM - 8:00 PM', shift: 'Full-time' },
      { day: 'Thursday', timing: '8:00 AM - 8:00 PM', shift: 'Full-time' },
      { day: 'Friday', timing: '8:00 AM - 8:00 PM', shift: 'Full-time' },
      { day: 'Saturday', timing: '8:00 AM - 6:00 PM', shift: 'Morning' },
      { day: 'Sunday', timing: 'Off', shift: 'Off' },
    ],
    equipment: [], status: 'Available Now', rating: 4.5, reviewsCount: 267,
    area: 'Napier Town', distance: '1.2 km', employmentType: 'Full-time',
    labName: 'Metropolis Labs', labLogo: '',
  },
  'Diagnostic Center': {
    name: 'Amit Sharma', role: 'Phlebotomist',
    bio: 'Certified phlebotomist with 4 years of experience in blood and sample collection. Specializes in difficult venous access and pediatric blood draws.',
    expertise: ['Blood Collection', 'Home Visit', 'Pediatric Collection', 'Geriatric Care', 'IV Cannulation'],
    specializations: [],
    qualifications: [{ degree: 'B.Sc MLT', institute: 'Rani Durgavati University, Jabalpur', year: 2020 }, { degree: 'Phlebotomy Certification', institute: 'Indian Red Cross Society', year: 2021 }],
    certifications: ['Phlebotomy Certified - IRCS'],
    experience: '4 years', totalJobs: '1500+ samples collected', regNo: 'DMLT-2020-00321',
    fee: 50, paymentModes: ['Cash', 'UPI'],
    coverageRadius: 'Within 4 km', localities: ['Civil Lines', 'Gol Bazar', 'Sadar Cantt', 'Russell Chowk'],
    schedule: [
      { day: 'Monday', timing: '6:00 AM - 10:00 PM', shift: 'Full-time' },
      { day: 'Tuesday', timing: '6:00 AM - 10:00 PM', shift: 'Full-time' },
      { day: 'Wednesday', timing: '6:00 AM - 10:00 PM', shift: 'Full-time' },
      { day: 'Thursday', timing: '6:00 AM - 10:00 PM', shift: 'Full-time' },
      { day: 'Friday', timing: '6:00 AM - 10:00 PM', shift: 'Full-time' },
      { day: 'Saturday', timing: '6:00 AM - 8:00 PM', shift: 'Full-time' },
      { day: 'Sunday', timing: '7:00 AM - 4:00 PM', shift: 'Morning' },
    ],
    equipment: ['Blood Collection Kit', 'Vacutainer Set', 'Centrifuge Tube Kit'],
    status: 'Available Now', rating: 4.6, reviewsCount: 189,
    area: 'Civil Lines', distance: '0.8 km', employmentType: 'Full-time',
    labName: 'Apollo Diagnostics', labLogo: '',
  },
  'Imaging Center': {
    name: 'Suresh Patel', role: 'Radiographer',
    bio: 'Qualified radiographer specializing in X-Ray, CT, and MRI scans. Trained in patient positioning and radiation safety protocols.',
    expertise: ['X-Ray Imaging', 'CT Scan Assist', 'Patient Positioning', 'Radiation Safety'],
    specializations: ['X-Ray', 'CT Assist', 'MRI Assist'],
    qualifications: [{ degree: 'B.Sc Radiography', institute: 'Christian Medical College, Vellore', year: 2018 }, { degree: 'RDMS', institute: 'ARDMS, USA', year: 2020 }],
    certifications: ['AERB Certified - RT-2022-00317'],
    experience: '6 years', totalJobs: '800+ scans assisted', regNo: 'AERB-RT-2022-00317',
    fee: 100, paymentModes: ['Cash', 'UPI', 'Card'],
    coverageRadius: 'Within 6 km', localities: ['Sadar Cantt', 'Civil Lines', 'Napier Town'],
    schedule: [
      { day: 'Monday', timing: '7:00 AM - 9:00 PM', shift: 'Full-time' },
      { day: 'Tuesday', timing: '7:00 AM - 9:00 PM', shift: 'Full-time' },
      { day: 'Wednesday', timing: '7:00 AM - 9:00 PM', shift: 'Full-time' },
      { day: 'Thursday', timing: '7:00 AM - 9:00 PM', shift: 'Full-time' },
      { day: 'Friday', timing: '7:00 AM - 9:00 PM', shift: 'Full-time' },
      { day: 'Saturday', timing: '7:00 AM - 7:00 PM', shift: 'Full-time' },
      { day: 'Sunday', timing: 'Off', shift: 'Off' },
    ],
    equipment: ['Portable X-Ray Unit', 'CT Contrast Injector', 'Lead Apron'],
    status: 'Available Now', rating: 4.4, reviewsCount: 156,
    area: 'Sadar Cantt', distance: '1.8 km', employmentType: 'Full-time',
    labName: 'SRL Diagnostics', labLogo: '',
  },
};

const REVIEWS_DATA = [
  { id:1, name:'Rajesh Kumar', rating:5, date:'2 days ago', comment:'On time aaya, bahut professional tha. Sample collection mein koi pain nahi hua.' },
  { id:2, name:'Priya Singh', rating:5, date:'1 week ago', comment:'Bahut acche se sample liya. Ghar pe aaya aur 15 min mein kaam khatam.' },
  { id:3, name:'Amit Verma', rating:4, date:'2 weeks ago', comment:'Professional attitude. Time pe aaya aur sampuch kar kaam kiya.' },
  { id:4, name:'Sneha Patel', rating:5, date:'3 weeks ago', comment:'Bachche ka sample lena mushkil tha but patience se kaam kiya.' },
];

const RELATED_TECHS = [
  { id:'t1', name:'Vikram Singh', role:'Lab Technician', rating:4.3, exp:'4 years', distance:'2.3 km', area:'Gol Bazar' },
  { id:'t2', name:'Neha Gupta', role:'Phlebotomist', rating:4.7, exp:'3 years', distance:'1.5 km', area:'Marhatal' },
  { id:'t3', name:'Rahul Jain', role:'Radiographer', rating:4.5, exp:'5 years', distance:'3.1 km', area:'Vijay Nagar' },
];

const DAY_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = { sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday' };

function renderStars(rating, size = 'w-4 h-4') {
  return [1, 2, 3, 4, 5].map(s => (
    <Star key={s} className={cn(size, s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20 fill-muted-foreground/20')} />
  ));
}

function getInitials(name) {
  return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'TC';
}

export default function TechnicianDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tech, setTech] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingAddress, setBookingAddress] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [saved, setSaved] = useState(false);
  const [showFullBio, setShowFullBio] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const result = await api.getFacility(id);
        const fac = result?.facility || result;
        const cat = fac ? deriveFromSpecialties(fac.specialties || []) : deriveFromId(id);
        const fb = FALLBACK_TECH[cat] || FALLBACK_TECH['Diagnostic Center'];
        setTech({
          ...fb,
          name: fac?.technicianName || fb.name,
          role: fac?.technicianRole || fb.role,
          experience: fac?.technicianExperience || fb.experience,
          labName: fac?.name || fb.labName,
          labLogo: fac?.logo || '',
          area: fac?.address?.split(',')[0] || fb.area,
          phone: fac?.phone || '',
          email: fac?.email || '',
        });
      } catch {
        setTech(FALLBACK_TECH[deriveFromId(id)] || FALLBACK_TECH['Diagnostic Center']);
      } finally { setLoading(false); }
    };
    load();
  }, [id]);

  function deriveFromSpecialties(specs) {
    const s = (specs || []).map(x => x.toLowerCase());
    if (s.some(x => x.includes('imaging') || x.includes('radiology')) && !s.some(x => x.includes('pathology'))) return 'Imaging Center';
    if (s.some(x => x.includes('pathology') || x.includes('biochem')) && !s.some(x => x.includes('imaging') || x.includes('radiology'))) return 'Pathology Lab';
    return 'Diagnostic Center';
  }

  function deriveFromId(_id) {
    if (_id?.includes('srl') || _id?.includes('imaging')) return 'Imaging Center';
    if (_id?.includes('metro') || _id?.includes('lal') || _id?.includes('path')) return 'Pathology Lab';
    return 'Diagnostic Center';
  }

  const handleBook = () => {
    if (!bookingDate || !bookingTime || !tech) return;
    setBookingDetails({
      technician: tech.name,
      role: tech.role,
      date: bookingDate,
      time: bookingTime,
      address: bookingAddress,
      fee: tech.fee,
    });
    setBookingSuccess(true);
    setTimeout(() => {
      setBookingSuccess(false);
      setBookingDate('');
      setBookingTime('');
      setBookingAddress('');
      setBookingDetails(null);
    }, 4000);
  };

  const handleReview = () => {
    if (!reviewComment.trim()) return;
    setReviewSubmitted(true);
    setShowReviewForm(false);
    setReviewComment('');
    setTimeout(() => setReviewSubmitted(false), 3000);
  };

  const ratingBreakdown = () => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    REVIEWS_DATA.forEach(r => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating]++; });
    const max = Math.max(...Object.values(counts), 1);
    return Object.entries(counts).reverse().map(([star, count]) => (
      <div key={star} className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground w-6 text-right">{star}</span>
        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
        </div>
        <span className="text-muted-foreground w-6">{count}</span>
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading technician…</p>
        </div>
      </div>
    );
  }

  if (!tech) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <UserRound className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Technician not found</h2>
          <p className="text-sm text-muted-foreground mb-6">The technician profile you are looking for is not available.</p>
          <Button onClick={() => navigate('/lab')}>Back to Labs</Button>
        </div>
      </div>
    );
  }

  const avgRating = tech.rating || 0;
  const reviewCount = tech.reviewsCount || 0;

  return (
    <motion.div initial="hidden" animate="show" className="bg-background min-h-screen">

      {/* ═══════════ BREADCRUMB ═══════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-0">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" /><span className="hidden sm:inline">Home</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/lab" className="hover:text-primary transition-colors">Labs</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{tech.name}</span>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* ═══════════ MAIN CONTENT ═══════════ */}
          <div className="lg:col-span-2 space-y-8">

            {/* ═══ 1. HERO SECTION ═══ */}
            <motion.div variants={fadeUp}
              className="bg-card rounded-2xl border border-border/60 p-6 sm:p-8 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="relative">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-heading font-bold text-4xl overflow-hidden flex-shrink-0 border-2 border-border/40 ring-4 ring-background">
                    {getInitials(tech.name)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-[3px] border-background flex items-center justify-center shadow-md">
                    <BadgeCheck className="w-4 h-4 text-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1.5">
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">{tech.name}</h1>
                    <Badge variant="outline" className="w-fit text-xs bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800">
                      <BadgeCheck className="w-3 h-3 mr-1" /> Verified
                    </Badge>
                  </div>

                  <p className="text-primary font-semibold text-lg mb-1">{tech.role}</p>

                  {tech.qualifications?.[0]?.degree && (
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                      {tech.qualifications[0].degree}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-2.5">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-primary font-medium">{tech.labName}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {tech.area}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-2.5">
                    <Badge variant="secondary" className="text-xs bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-800">
                      <Store className="w-3 h-3 mr-1" />
                      {tech.employmentType}
                    </Badge>
                    {tech.regNo && (
                      <Badge variant="outline" className="text-xs bg-muted/50">
                        <Shield className="w-3 h-3 mr-1" />{tech.regNo}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
                      <Award className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground">{tech.experience}</span>
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-0.5">{renderStars(avgRating)}</div>
                      <span className="font-semibold text-foreground ml-1">{avgRating.toFixed(1)}</span>
                      <span className="text-muted-foreground">({reviewCount})</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      {tech.distance} · {tech.area}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border/60 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {tech.phone && (
                  <a href={`tel:${tech.phone}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <Phone className="w-4 h-4 text-primary shrink-0" />
                    {tech.phone}
                  </a>
                )}
                {tech.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-primary shrink-0" />
                    {tech.email}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4 text-success shrink-0" />
                  <span className="text-success font-semibold">Rs {tech.fee}</span>
                  <span className="text-xs">/ collection</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-primary shrink-0" />
                  <span>{tech.experience} experience</span>
                </span>
              </div>
            </motion.div>

            {/* ═══ 2. ABOUT SECTION ═══ */}
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="font-heading text-xl font-bold text-foreground mb-5 flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </span>
                    About {tech.name}
                  </h2>

                  <div className={cn('text-muted-foreground leading-relaxed mb-6', !showFullBio && 'line-clamp-3')}>
                    {tech.bio}
                  </div>
                  {tech.bio?.length > 150 && (
                    <button onClick={() => setShowFullBio(!showFullBio)}
                      className="mb-5 text-sm text-primary font-semibold hover:underline flex items-center gap-1"
                    >
                      {showFullBio ? 'Show less' : 'Read more'}
                      {showFullBio ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  {tech.expertise?.length > 0 && (
                    <div className="mb-5">
                      <p className="text-sm font-semibold text-foreground mb-3">Areas of Expertise</p>
                      <div className="flex flex-wrap gap-2">
                        {tech.expertise.map(e => (
                          <Badge key={e} variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary font-medium px-3 py-1">
                            {e}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {tech.specializations?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-3">Specializations</p>
                      <div className="flex flex-wrap gap-2">
                        {tech.specializations.map(s => (
                          <Badge key={s} variant="secondary" className="text-xs px-3 py-1">
                            <Plus className="w-3 h-3 mr-1" />{s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* ═══ 3. EDUCATION & CAREER ═══ */}
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="font-heading text-xl font-bold text-foreground mb-6 flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-primary" />
                    </span>
                    Education & Career
                  </h2>

                  <div className="grid sm:grid-cols-2 gap-8">
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-primary" />
                        Education
                      </p>
                      <div className="space-y-4">
                        {tech.qualifications.map((q, i) => (
                          <div key={i} className="relative pl-6 border-l-2 border-primary/20">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            </div>
                            <p className="font-semibold text-foreground text-sm">{q.degree}</p>
                            <p className="text-xs text-muted-foreground">{q.institute}</p>
                            {q.year && <p className="text-xs text-primary font-medium">{q.year}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        Career Stats
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                            <Award className="w-4 h-4 text-primary" />
                          </div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Experience</p>
                          <p className="text-sm font-bold text-foreground">{tech.experience}</p>
                        </div>
                        <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2">
                            <FlaskConical className="w-4 h-4 text-emerald-500" />
                          </div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Jobs Done</p>
                          <p className="text-sm font-bold text-foreground">{tech.totalJobs?.split(' ')[0] || '0'}+</p>
                        </div>
                        <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center mb-2">
                            <Navigation className="w-4 h-4 text-amber-500" />
                          </div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Coverage</p>
                          <p className="text-sm font-bold text-foreground">{tech.coverageRadius}</p>
                        </div>
                        <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl p-4 border border-border/40">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center mb-2">
                            <Star className="w-4 h-4 text-amber-500" />
                          </div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Rating</p>
                          <p className="text-sm font-bold text-foreground">{tech.rating.toFixed(1)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {tech.certifications?.length > 0 && (
                    <div className="mb-6">
                      <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        Certifications
                      </p>
                      <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                        {tech.certifications.map(c => (
                          <div key={c} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-foreground">{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {tech.equipment?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Microscope className="w-4 h-4 text-primary" />
                        Equipment Carried
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {tech.equipment.map(eq => (
                          <Badge key={eq} variant="outline" className="text-xs bg-muted/50 px-3 py-1">{eq}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* ═══ 4. LAB ASSOCIATION + SERVICE AREA ═══ */}
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="font-heading text-xl font-bold text-foreground mb-6 flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-primary" />
                    </span>
                    Lab Association & Coverage
                  </h2>

                  <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/0 border border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
                    onClick={() => navigate(`/lab/${id}/details`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{tech.labName}</p>
                          <p className="text-xs text-muted-foreground">{tech.employmentType} · {tech.role}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-xl gap-1.5 shrink-0"
                        onClick={(e) => { e.stopPropagation(); navigate(`/lab/${id}/details`); }}
                      >
                        View Lab
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <Separator className="mb-6" />

                  <div>
                    <p className="text-sm font-semibold text-foreground mb-3">Service Area</p>
                    <p className="text-xs text-muted-foreground mb-3">Serves <span className="font-medium text-foreground">{tech.coverageRadius}</span></p>
                    <div className="flex flex-wrap gap-2">
                      {tech.localities.map(loc => (
                        <Badge key={loc} variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary font-medium px-3 py-1">
                          <MapPin className="w-3 h-3 mr-1" />{loc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ═══ 5. WEEKLY SCHEDULE ═══ */}
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="font-heading text-xl font-bold text-foreground mb-5 flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CalendarDays className="w-4 h-4 text-primary" />
                    </span>
                    Weekly Schedule
                  </h2>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60">
                          <th className="text-left py-3 px-4 font-semibold text-foreground">Day</th>
                          <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-foreground">Timings</th>
                          <th className="text-left py-3 px-4 font-semibold text-foreground">Shift</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DAY_ORDER.map(day => {
                          const slot = tech.schedule.find(s => s.day.toLowerCase() === day);
                          const active = slot && slot.timing !== 'Off';
                          const label = DAY_LABELS[day];
                          const isToday = new Date().toLocaleDateString('en', { weekday: 'long' }).toLowerCase() === day;
                          return (
                            <tr key={day} className={cn(
                              'border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors',
                              isToday && 'bg-primary/5'
                            )}>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className={cn('w-2 h-2 rounded-full', active ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />
                                  <span className={cn('font-medium', isToday ? 'text-primary' : 'text-foreground')}>
                                    {label}
                                    {isToday && <span className="ml-2 text-xs text-primary font-semibold">(Today)</span>}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={cn(
                                  'text-xs font-semibold px-2.5 py-1 rounded-full',
                                  active
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                    : 'bg-muted text-muted-foreground'
                                )}>
                                  {active ? 'Open' : 'Closed'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">
                                {active ? (slot?.timing || '9:00 AM – 5:00 PM') : '—'}
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">
                                {active ? (slot?.shift || '—') : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ═══ 6. ADDITIONAL INFO ═══ */}
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="font-heading text-xl font-bold text-foreground mb-6 flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary" />
                    </span>
                    Additional Information
                  </h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/60">
                      <span className="text-sm text-muted-foreground">Registration Number</span>
                      <span className="text-sm font-semibold text-foreground">{tech.regNo}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/60">
                      <span className="text-sm text-muted-foreground">Experience</span>
                      <span className="text-sm font-semibold text-foreground">{tech.experience}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/60">
                      <span className="text-sm text-muted-foreground">Collection Fee</span>
                      <span className="text-sm font-semibold text-success">Rs {tech.fee}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/60">
                      <span className="text-sm text-muted-foreground">Employment</span>
                      <span className="text-sm font-semibold text-foreground">{tech.employmentType}</span>
                    </div>
                    {tech.paymentModes?.length > 0 && (
                      <div className="px-4 py-3 rounded-xl bg-muted/30 border border-border/60">
                        <span className="text-sm text-muted-foreground block mb-2 flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-primary" />
                          Payment Modes Accepted
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {tech.paymentModes.map(mode => (
                            <Badge key={mode} variant="secondary" className="text-xs">{mode}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ═══ 7. REVIEWS SECTION ═══ */}
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      </span>
                      Reviews <span className="text-base font-normal text-muted-foreground ml-1">({reviewCount})</span>
                    </h2>
                    {!reviewSubmitted && (
                      <Button size="sm" variant="outline" className="rounded-xl gap-2" onClick={() => setShowReviewForm(!showReviewForm)}>
                        <Star className="w-3.5 h-3.5" /> Write a Review
                      </Button>
                    )}
                  </div>

                  {REVIEWS_DATA.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-6 mb-6 p-4 rounded-xl bg-muted/30 border border-border/60">
                      <div className="flex flex-col items-center justify-center min-w-[120px]">
                        <span className="font-heading text-4xl font-bold text-foreground">{avgRating.toFixed(1)}</span>
                        <div className="flex items-center gap-0.5 mt-1">{renderStars(avgRating, 'w-4 h-4')}</div>
                        <span className="text-xs text-muted-foreground mt-1">{reviewCount} reviews</span>
                      </div>
                      <div className="flex-1 space-y-1">{ratingBreakdown()}</div>
                    </div>
                  )}

                  {reviewSubmitted && (
                    <div className="mb-4 px-4 py-3 rounded-xl bg-success/10 border border-success/20 text-success text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Review submitted successfully!
                    </div>
                  )}

                  {showReviewForm && (
                    <div className="mb-6 p-4 rounded-xl bg-muted/30 border border-border/60 space-y-3">
                      <h3 className="font-semibold text-foreground text-sm">Share your experience</h3>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button key={s} type="button" onClick={() => setReviewRating(s)}>
                            <Star className={cn('w-6 h-6 cursor-pointer transition-colors', s <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30')} />
                          </button>
                        ))}
                      </div>
                      <Textarea
                        placeholder="Tell others about your experience..."
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="rounded-xl" onClick={handleReview} disabled={!reviewComment.trim()}>
                          Submit Review
                        </Button>
                        <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setShowReviewForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {REVIEWS_DATA.length === 0 && reviewCount === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Star className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                      <p>No reviews yet. Be the first to share your experience!</p>
                    </div>
                  ) : REVIEWS_DATA.length === 0 && reviewCount > 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Star className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                      <p>Reviews summary available, individual reviews loading soon.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(showAllReviews ? REVIEWS_DATA : REVIEWS_DATA.slice(0, 2)).map((rv, i) => (
                        <div key={rv.id} className="p-4 rounded-xl border border-border/40 hover:bg-muted/20 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                              {rv.name?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm text-foreground">{rv.name}</p>
                                <span className="text-xs text-muted-foreground">{rv.date}</span>
                              </div>
                              <div className="flex items-center gap-0.5 mt-1 mb-1.5">
                                {renderStars(rv.rating, 'w-3.5 h-3.5')}
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">{rv.comment}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {REVIEWS_DATA.length > 2 && (
                    <Button variant="ghost" className="w-full h-9 text-xs font-semibold mt-4" onClick={() => setShowAllReviews(!showAllReviews)}>
                      {showAllReviews ? 'Show Less' : `View All ${REVIEWS_DATA.length} Reviews`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* ═══ 8. RELATED TECHNICIANS ═══ */}
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="font-heading text-xl font-bold text-foreground mb-6 flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </span>
                    Other Technicians Nearby
                  </h2>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {RELATED_TECHS.map(r => (
                      <div key={r.id} className="p-4 rounded-xl bg-muted/20 border border-border/30 hover:border-primary/30 cursor-pointer transition-all" onClick={() => {}}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {getInitials(r.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                            <p className="text-xs text-muted-foreground">{r.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-0.5">{renderStars(r.rating, 'w-3 h-3')}</div>
                          <span>·</span>
                          <span>{r.exp}</span>
                          <span>·</span>
                          <span>{r.distance} · {r.area}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

          </div>

          {/* ═══════════ SIDEBAR — BOOKING ═══════════ */}
          <motion.div variants={fadeUp} className="space-y-6">
            <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm">
              <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </span>
                Quick Info
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Experience</span>
                  <span className="font-semibold text-foreground">{tech.experience}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Jobs Done</span>
                  <span className="font-semibold text-foreground">{tech.totalJobs?.split(' ')[0] || '0'}+</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Coverage</span>
                  <span className="font-semibold text-foreground">{tech.coverageRadius}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Employment</span>
                  <span className="font-semibold text-foreground">{tech.employmentType}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm">
              <h3 className="font-heading font-semibold text-foreground mb-5 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                </span>
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" asChild>
                  <a href={`tel:${tech.phone || ''}`}><Phone className="w-4 h-4" /> Call Now</a>
                </Button>
                <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" asChild>
                  <a href={`mailto:${tech.email || ''}`}><Mail className="w-4 h-4" /> Email Now</a>
                </Button>
                <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={() => { setSaved(!saved); toast.success(saved ? 'Removed from Saved' : 'Saved'); }}>
                  <Heart className={cn('w-4 h-4', saved && 'fill-current text-red-500')} /> {saved ? 'Saved' : 'Save'}
                </Button>
                <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success('Link copied!'); }}>
                  <Share2 className="w-4 h-4" /> Share Profile
                </Button>
                <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={() => toast.success('Review form coming soon')}>
                  <Star className="w-4 h-4" /> Write a Review
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border/60 p-6 sticky top-24 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  Book Technician
                </h2>
                <button onClick={() => setSaved(!saved)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  {saved
                    ? <BookMarked className="w-5 h-5 text-primary" />
                    : <Bookmark className="w-5 h-5 text-muted-foreground" />
                  }
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60 mb-3">
                <span className="text-sm text-muted-foreground">Collection Fee</span>
                <span className="font-bold text-lg text-foreground">Rs {tech.fee}</span>
              </div>

              {bookingSuccess && bookingDetails ? (
                <div className="space-y-3">
                  <div className="px-4 py-3 rounded-xl bg-success/10 border border-success/20 text-success text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Booking Confirmed!
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1.5 bg-muted/30 rounded-xl p-4">
                    <p><span className="text-foreground font-medium">Technician:</span> {bookingDetails.technician}</p>
                    <p><span className="text-foreground font-medium">Date:</span> {bookingDetails.date}</p>
                    <p><span className="text-foreground font-medium">Time:</span> {bookingDetails.time}</p>
                    <p><span className="text-foreground font-medium">Fee:</span> Rs {bookingDetails.fee}</p>
                  </div>
                  <Button className="w-full rounded-xl" onClick={() => navigate('/patient/appointments')}>
                    View My Bookings
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Select Date</label>
                    <Input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]} className="rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Select Time</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['06:00 AM', '08:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM'].map(t => (
                        <button key={t} type="button" onClick={() => setBookingTime(t)}
                          className={cn(
                            'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                            bookingTime === t
                              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Collection Address</label>
                    <Textarea value={bookingAddress} onChange={e => setBookingAddress(e.target.value)}
                      placeholder="Enter your address for home collection"
                      className="rounded-xl" rows={2} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Collection Fee</span>
                    <span className="font-bold text-lg text-foreground">Rs {tech.fee}</span>
                  </div>
                  <Button className="w-full rounded-xl h-11 font-semibold shadow-lg shadow-primary/25" onClick={handleBook} disabled={!bookingDate || !bookingTime}>
                    <CalendarDays className="w-4 h-4 mr-2" /> Confirm Booking
                  </Button>

                  <Button variant="outline" className="w-full rounded-xl h-11 gap-2" onClick={() => window.open('tel:0761-3456789')}>
                    <Phone className="w-4 h-4" />
                    Call Lab
                  </Button>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <BadgeCheck className="w-3.5 h-3.5 text-primary" />
                      <span>ID Verified</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Background Checked</span>
                    </div>
                  </div>

                  <Separator />

                  <Button variant="outline" className="w-full h-9 gap-1.5 text-xs font-semibold rounded-xl" onClick={() => {}}>
                    <Share2 className="w-3.5 h-3.5" />
                    Share Profile
                  </Button>
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
