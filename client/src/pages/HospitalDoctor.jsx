import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Star, CalendarDays, MapPin, Phone, Mail, IndianRupee, Award, Users,
  CheckCircle, Clock, Stethoscope, Building2, UserRound, BadgeCheck, Bookmark,
  BookMarked, ChevronRight, GraduationCap, Briefcase, Shield, Trophy,
  HeartPulse, Syringe, Ambulance, Plus, Minus, ChevronDown, ChevronUp,
  Quote, Home, ExternalLink, Sparkles, Languages, CircleDot, FileText, BedDouble,
  CreditCard, Image, Pill, Car, Accessibility, Wind, FlaskConical, DoorOpen, ArrowRight, Share2
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
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

function renderStars(rating, size = 'w-4 h-4') {
  return [1, 2, 3, 4, 5].map(s => (
    <Star key={s} className={cn(size, s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20 fill-muted-foreground/20')} />
  ));
}

function getInitials(name) {
  return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';
}

function getExpYears(exp) {
  if (!exp) return 0;
  const match = exp.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

const DAY_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = { sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday' };

export default function HospitalDoctor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [relatedDoctors, setRelatedDoctors] = useState([]);
  const [departmentDoctors, setDepartmentDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reviews, setReviews] = useState([
    { _id: 'demo-1', patientName: 'Rahul Sharma', rating: 5, comment: 'Excellent doctor. Very thorough in examination and explains everything clearly.', date: '2026-06-15' },
    { _id: 'demo-2', patientName: 'Priya Patel', rating: 4, comment: 'Good experience. The waiting time was a bit long but the consultation was worth it.', date: '2026-06-10' },
    { _id: 'demo-3', patientName: 'Amit Verma', rating: 5, comment: 'Best specialist in the city. He saved my father\'s life. Forever grateful.', date: '2026-06-05' },
    { _id: 'demo-4', patientName: 'Sunita Gupta', rating: 4, comment: 'Very caring doctor. The clinic is well-maintained and staff is polite.', date: '2026-05-28' },
    { _id: 'demo-5', patientName: 'Vikram Singh', rating: 3, comment: 'Decent consultation but the billing process was slow. Needed to visit multiple counters.', date: '2026-05-20' },
  ]);

  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingType, setBookingType] = useState('Consultation');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const [saved, setSaved] = useState(false);
  const [showFullBio, setShowFullBio] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const doc = await api.getDoctor(id);
        if (!doc) { setNotFound(true); return; }
        setDoctor(doc);

        const rv = await api.getReviews({ doctorId: id }).catch(() => []);
        if (Array.isArray(rv) && rv.length > 0) setReviews(rv);

        const allDocs = await api.getDoctors({}).catch(() => []);
        const filtered = (allDocs || []).filter(d => d._id !== id);
        if (doc.hospitalId?._id || doc.hospitalId) {
          const hospitalId = doc.hospitalId._id || doc.hospitalId;
          setRelatedDoctors(filtered.filter(d => (d.hospitalId?._id || d.hospitalId)?.toString() === hospitalId.toString()).slice(0, 4));
        }
        if (doc.specialization) {
          setDepartmentDoctors(filtered.filter(d => d.specialization === doc.specialization).slice(0, 4));
        }
      } catch (e) {
        setNotFound(true);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleBook = async () => {
    if (!bookingDate || !bookingTime || !doctor) return;
    try {
      const details = {
        patient: user?.name || 'Guest User',
        patientId: user?._id || 'guest',
        doctor: doctor.name,
        doctorId: doctor._id,
        department: doctor.specialization,
        date: bookingDate,
        time: bookingTime,
        status: 'Pending',
        type: bookingType,
        notes: bookingNotes,
        fees: doctor.consultation_fees || doctor.fees || 0,
      };
      const result = await api.createAppointment(details);
      setBookingDetails(result || details);
      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setBookingDate('');
        setBookingTime('');
        setBookingNotes('');
        setBookingDetails(null);
      }, 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReview = async () => {
    if (!reviewComment.trim() || !doctor) return;
    try {
      await api.createReview({
        doctorId: doctor._id,
        doctorName: doctor.name,
        patientName: user?.name || 'Anonymous',
        rating: reviewRating,
        comment: reviewComment,
        date: new Date().toISOString().split('T')[0],
      });
      setReviewSubmitted(true);
      setShowReviewForm(false);
      setReviewComment('');
      const rv = await api.getReviews({ doctorId: id }).catch(() => []);
      if (Array.isArray(rv) && rv.length > 0) setReviews(rv);
      setTimeout(() => setReviewSubmitted(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: doctor?.name, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  };

  const ratingBreakdown = () => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating]++; });
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
          <p className="text-sm text-muted-foreground animate-pulse">Loading doctor…</p>
        </div>
      </div>
    );
  }

  if (notFound || !doctor) {
    return <Navigate to="/clinic-doctors" replace />;
  }

  const expYears = getExpYears(doctor.experience);
  const reviewCount = doctor.reviews_count || reviews.length;
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : (doctor.rating || 0);

  return (
    <motion.div initial="hidden" animate="show" className="bg-background min-h-screen">

      {/* ═══════════ BREADCRUMB ═══════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-0">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" /><span className="hidden sm:inline">Home</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/clinic-doctors" className="hover:text-primary transition-colors">Doctors</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{doctor.name}</span>
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
                {/* Photo */}
                <div className="relative">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-heading font-bold text-4xl overflow-hidden flex-shrink-0 border-2 border-border/40 ring-4 ring-background">
                    {doctor.profile_photo
                      ? <img src={doctor.profile_photo} alt="" className="w-full h-full object-cover" />
                      : getInitials(doctor.name)
                    }
                  </div>
                  {doctor.approved !== false && (
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-[3px] border-background flex items-center justify-center shadow-md">
                      <BadgeCheck className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1.5">
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">{doctor.name}</h1>
                    {doctor.approved !== false && (
                      <Badge variant="outline" className="w-fit text-xs bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800">
                        <BadgeCheck className="w-3 h-3 mr-1" /> Verified
                      </Badge>
                    )}
                  </div>

                  <p className="text-primary font-semibold text-lg mb-1">{doctor.specialization}</p>

                  {doctor.qualifications && (
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                      {doctor.qualifications}
                    </p>
                  )}

                  {/* Department */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-2.5">
                    {doctor.department && (
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {doctor.department}
                      </span>
                    )}
                  </div>

                  {/* Hospital Name */}
                  {doctor.hospitalId?.name && (
                    <div className="mb-2.5">
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors cursor-pointer w-fit max-w-full"
                        onClick={(e) => { e.stopPropagation(); navigate(`/hospitals/${doctor.hospitalId._id}`); }}>
                        <Building2 className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium text-primary truncate">{doctor.hospitalId.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 opacity-60" />
                      </div>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-2.5">
                    {doctor.practice_type === 'private' && (
                      <Badge variant="secondary" className="text-xs bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-800">
                        <Building2 className="w-3 h-3 mr-1" />
                        Private Practice / Own Clinic
                      </Badge>
                    )}
                    {doctor.consultantType && (
                      <Badge variant="secondary" className={cn(
                        'text-xs',
                        doctor.consultantType === 'fulltime'
                          ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-800'
                          : 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-800'
                      )}>
                        <CircleDot className="w-3 h-3 mr-1" />
                        {doctor.consultantType === 'fulltime' ? 'Full-Time Consultant' : 'Visiting Consultant'}
                      </Badge>
                    )}
                    {doctor.languages?.map(lang => (
                      <Badge key={lang} variant="outline" className="text-xs bg-muted/50">
                        <Languages className="w-3 h-3 mr-1" />{lang}
                      </Badge>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
                      <Award className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground">{doctor.experience}</span>
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-0.5">{renderStars(avgRating)}</div>
                      <span className="font-semibold text-foreground ml-1">{avgRating.toFixed(1)}</span>
                      <span className="text-muted-foreground">({reviewCount})</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-primary shrink-0" />
                      {doctor.patients || 0}+ patients
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact row */}
              <div className="mt-6 pt-6 border-t border-border/60 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {doctor.phone && (
                  <a href={`tel:${doctor.phone}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="hidden sm:inline text-muted-foreground">Call</span>
                  </a>
                )}
                {doctor.email && (
                  <a href={`mailto:${doctor.email}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="hidden sm:inline text-muted-foreground">Email</span>
                  </a>
                )}
                <span className="flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4 text-success shrink-0" />
                  <span className="text-success font-semibold">Rs {doctor.consultation_fees || doctor.fees || 0}</span>
                  <span className="text-xs">/ visit</span>
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <button onClick={() => { setSaved(!saved); toast.success(saved ? 'Removed from Saved' : 'Saved'); }}
                    className={cn('w-8 h-8 rounded-lg border transition-all flex items-center justify-center shrink-0', saved ? 'bg-red-500/10 text-red-500 border-red-200' : 'border-border/60 text-muted-foreground hover:text-red-500 hover:border-red-200')}>
                    <Bookmark className={cn('w-4 h-4', saved && 'fill-current')} />
                  </button>
                  <button onClick={handleShare}
                    className="w-8 h-8 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all shrink-0">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* ═══ 3. ABOUT SECTION ═══ */}
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="font-heading text-xl font-bold text-foreground mb-5 flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </span>
                    About {doctor.name}
                  </h2>

                  {doctor.bio && (
                    <div className={cn('text-muted-foreground leading-relaxed mb-6', !showFullBio && 'line-clamp-3')}>
                      {doctor.bio}
                    </div>
                  )}
                  {doctor.bio && doctor.bio.length > 150 && (
                    <button onClick={() => setShowFullBio(!showFullBio)}
                      className="mb-5 text-sm text-primary font-semibold hover:underline flex items-center gap-1"
                    >
                      {showFullBio ? 'Show less' : 'Read more'}
                      {showFullBio ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  {/* Areas of Expertise */}
                  {doctor.areas_of_expertise?.length > 0 && (
                    <div className="mb-5">
                      <p className="text-sm font-semibold text-foreground mb-3">Areas of Expertise</p>
                      <div className="flex flex-wrap gap-2">
                        {doctor.areas_of_expertise.map(area => (
                          <Badge key={area} variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary font-medium px-3 py-1">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Services Offered */}
                  {doctor.services_offered?.length > 0 && (
                    <div className="mb-5">
                      <p className="text-sm font-semibold text-foreground mb-3">Services Offered</p>
                      <div className="flex flex-wrap gap-2">
                        {doctor.services_offered.map(service => (
                          <Badge key={service} variant="secondary" className="text-xs px-3 py-1">
                            <Plus className="w-3 h-3 mr-1" />{service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Surgeries / Procedures */}
                  {doctor.surgeries_procedures?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-3">Surgeries & Procedures</p>
                      <div className="flex flex-wrap gap-2">
                        {doctor.surgeries_procedures.map(surgery => (
                          <Badge key={surgery} variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-800 px-3 py-1">
                            <Syringe className="w-3 h-3 mr-1" />{surgery}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* ═══ 4. EDUCATION & CAREER ═══ */}
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
                    {/* Education Timeline */}
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-primary" />
                        Education
                      </p>
                      {doctor.education?.length > 0 ? (
                        <div className="space-y-4">
                          {doctor.education.map((edu, i) => (
                            <div key={i} className="relative pl-6 border-l-2 border-primary/20">
                              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                              </div>
                              <p className="font-semibold text-foreground text-sm">{edu.degree}</p>
                              <p className="text-xs text-muted-foreground">{edu.college}</p>
                              {edu.year && <p className="text-xs text-primary font-medium">{edu.year}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{doctor.qualifications}</p>
                      )}
                    </div>

                    {/* Work Experience */}
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-primary" />
                        Work Experience
                      </p>
                      {doctor.work_experience?.length > 0 ? (
                        <div className="space-y-4">
                          {doctor.work_experience.map((exp, i) => (
                            <div key={i} className="relative pl-6 border-l-2 border-muted-foreground/20">
                              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-muted border-2 border-muted-foreground/40 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                              </div>
                              <p className="font-semibold text-foreground text-sm">{exp.hospital}</p>
                              <p className="text-xs text-muted-foreground">{exp.role}</p>
                              {exp.period && <p className="text-xs text-muted-foreground">{exp.period}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{doctor.experience} of experience</p>
                      )}
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Registrations & Memberships */}
                  <div className="grid sm:grid-cols-2 gap-6 mb-6">
                    {doctor.registrations && (
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-primary" />
                          Medical Registration
                        </p>
                        <div className="bg-muted/30 rounded-xl p-4 space-y-1.5 text-sm">
                          <p className="text-foreground font-medium">{doctor.registrations.council}</p>
                          <p className="text-muted-foreground">Reg. No: {doctor.registrations.number}</p>
                        </div>
                      </div>
                    )}
                    {doctor.memberships?.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-3">Memberships</p>
                        <div className="flex flex-wrap gap-2">
                          {doctor.memberships.map(m => (
                            <Badge key={m} variant="outline" className="text-xs bg-muted/50 px-3 py-1">
                              {m}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Awards */}
                  {doctor.awards?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        Awards & Achievements
                      </p>
                      <div className="space-y-2">
                        {doctor.awards.map((award, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-800/50">
                            <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="text-sm text-foreground font-medium">{award}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* ═══ 5. HOSPITAL & PRACTICE DETAILS ═══ */}
            <motion.div variants={fadeUp}>
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-6 sm:p-8">
                  <h2 className="font-heading text-xl font-bold text-foreground mb-6 flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-primary" />
                    </span>
                    Hospital & Practice Details
                  </h2>

                  {/* Mini Hospital Card */}
                  {doctor.hospitalId?.name && (
                    <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/0 border border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
                      onClick={() => navigate(`/hospitals/${doctor.hospitalId._id || doctor.hospitalId}`)}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{doctor.hospitalId.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{doctor.hospitalId.address || doctor.hospitalId.city || ''}</p>
                            {doctor.hospitalId.rating && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span className="text-xs text-muted-foreground">{doctor.hospitalId.rating?.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-xl gap-1.5 shrink-0"
                          onClick={(e) => { e.stopPropagation(); navigate(`/hospitals/${doctor.hospitalId._id || doctor.hospitalId}`); }}>
                          View Profile
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Availability Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {[
                      { label: 'Admission', available: doctor.admission_available, icon: HeartPulse, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-800' },
                      { label: 'Surgery', available: doctor.surgery_available, icon: Syringe, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-800' },
                      { label: 'Emergency', available: doctor.emergency_consultation, icon: Ambulance, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-800' },
                      { label: 'Inpatient', available: doctor.admission_available, icon: BedDouble, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800' },
                    ].filter(item => item.available).map(item => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className={cn('flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border', item.bg)}>
                          <Icon className={cn('w-5 h-5', item.color)} />
                          <span className={cn('text-xs font-semibold', item.color)}>{item.label}</span>
                          <span className="text-xs font-bold text-emerald-600">Available</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Insurance Accepted */}
                  {(doctor.hospitalId?.insuranceAccepted?.length > 0) && (
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        Insurance / Cashless Accepted
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {doctor.hospitalId.insuranceAccepted.map((ins, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800 px-3 py-1">
                            <CheckCircle className="w-3 h-3 mr-1" />{typeof ins === 'string' ? ins : ins.provider || ins}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* ═══ 6. WEEKLY SCHEDULE ═══ */}
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
                          <th className="text-left py-3 px-4 font-semibold text-foreground">OPD Timings</th>
                          <th className="text-left py-3 px-4 font-semibold text-foreground">{(doctor.clinicProfile?.clinic_name || '') ? 'Clinic' : 'Hospital'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DAY_ORDER.map(day => {
                          const active = doctor.weekly_schedule?.[day];
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
                                {active ? (doctor.opd_timings?.split('|')[0]?.trim() || '9:00 AM – 5:00 PM') : '—'}
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">
                                {active ? (doctor.clinicProfile?.clinic_name || doctor.hospitalId?.name || '—') : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {doctor.opd_timings && (
                    <div className="mt-4 px-4 py-3 rounded-xl bg-muted/30 border border-border/60 flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 text-primary shrink-0" />
                      <span>OPD Hours: <span className="font-medium text-foreground">{doctor.opd_timings}</span></span>
                    </div>
                  )}
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
                      Patient Reviews <span className="text-base font-normal text-muted-foreground ml-1">({reviewCount})</span>
                    </h2>
                    {user && !reviewSubmitted && (
                      <Button size="sm" variant="outline" className="rounded-xl gap-2" onClick={() => setShowReviewForm(!showReviewForm)}>
                        <Star className="w-3.5 h-3.5" /> Write a Review
                      </Button>
                    )}
                  </div>

                  {/* Rating Breakdown */}
                  {reviews.length > 0 && (
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
                        placeholder="Tell others about your experience with Dr. {doctor.name}..."
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

                  {reviews.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Star className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                      <p>{reviewCount > 0 ? 'Reviews summary available, individual reviews loading soon.' : 'No reviews yet. Be the first to share your experience!'}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.slice(0, showAllReviews ? reviews.length : 3).map((rv, i) => (
                        <div key={rv._id || i} className="p-4 rounded-xl border border-border/40 hover:bg-muted/20 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                              {rv.patientName?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm text-foreground">{rv.patientName}</p>
                                {rv.date && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(rv.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 mt-1 mb-1.5">
                                {renderStars(rv.rating, 'w-3.5 h-3.5')}
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">{rv.comment}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {reviews.length > 3 && !showAllReviews && (
                        <div className="text-center pt-2">
                          <Button variant="outline" size="sm" className="gap-1.5 rounded-lg text-xs" onClick={() => setShowAllReviews(true)}>
                            Show All {reviews.length} Reviews <ChevronDown className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* ═══ 8. ADDITIONAL INFO ═══ */}
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
                    {doctor.registrations?.number && (
                      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/60">
                        <span className="text-sm text-muted-foreground">Registration Number</span>
                        <span className="text-sm font-semibold text-foreground">{doctor.registrations.number}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/60">
                      <span className="text-sm text-muted-foreground">Experience</span>
                      <span className="text-sm font-semibold text-foreground">{doctor.experience}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/60">
                      <span className="text-sm text-muted-foreground">Consultation Fee</span>
                      <span className="text-sm font-semibold text-success">Rs {doctor.consultation_fees || doctor.fees || 0}</span>
                    </div>
                    {doctor.hospitalId?.insuranceAccepted?.length > 0 && (
                      <div className="px-4 py-3 rounded-xl bg-muted/30 border border-border/60">
                        <span className="text-sm text-muted-foreground block mb-2">Insurance Accepted</span>
                        <div className="flex flex-wrap gap-1.5">
                          {doctor.hospitalId.insuranceAccepted.map((ins, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{typeof ins === 'string' ? ins : ins.provider || ins}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {doctor.payment_modes?.length > 0 && (
                      <div className="px-4 py-3 rounded-xl bg-muted/30 border border-border/60">
                        <span className="text-sm text-muted-foreground block mb-2 flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-primary" />
                          Payment Modes Accepted
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {doctor.payment_modes.map(mode => (
                            <Badge key={mode} variant="secondary" className="text-xs">{mode}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* FAQs */}
                  {doctor.faqs?.length > 0 && (
                    <div className="mt-6">
                      <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Frequently Asked Questions
                      </p>
                      <div className="space-y-2">
                        {doctor.faqs.map((faq, i) => (
                          <div key={i} className="rounded-xl border border-border/40 overflow-hidden">
                            <button
                              onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/20 transition-colors"
                            >
                              <span className="text-sm font-medium text-foreground pr-4">{faq.q || faq.question}</span>
                              <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200', expandedFaq === i && 'rotate-180')} />
                            </button>
                            <AnimatePresence>
                              {expandedFaq === i && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                                    {faq.a || faq.answer}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* ═══ 9. RELATED SECTION ═══ */}
            {(relatedDoctors.length > 0 || departmentDoctors.length > 0) && (
              <motion.div variants={fadeUp}>
                <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                  <CardContent className="p-6 sm:p-8">
                    <h2 className="font-heading text-xl font-bold text-foreground mb-6 flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </span>
                      Related Doctors
                    </h2>

                    <Tabs defaultValue={relatedDoctors.length > 0 ? 'same-hospital' : 'same-department'} className="w-full">
                      <TabsList className="mb-6">
                        {relatedDoctors.length > 0 && (
                          <TabsTrigger value="same-hospital" className="rounded-xl text-xs sm:text-sm">
                            <Building2 className="w-4 h-4 mr-1.5" />
                            Same Hospital
                          </TabsTrigger>
                        )}
                        {departmentDoctors.length > 0 && (
                          <TabsTrigger value="same-department" className="rounded-xl text-xs sm:text-sm">
                            <Stethoscope className="w-4 h-4 mr-1.5" />
                            Same {doctor.specialization}
                          </TabsTrigger>
                        )}
                      </TabsList>

                      {relatedDoctors.length > 0 && (
                        <TabsContent value="same-hospital">
                          <div className="grid sm:grid-cols-2 gap-4">
                            {relatedDoctors.map((doc, i) => (
                              <motion.div key={doc._id} variants={fadeUp}
                                className="bg-card rounded-xl border border-border/50 p-4 hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group"
                                onClick={() => navigate(`/hospital-doctors/${doc._id}`)}
                              >
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-base overflow-hidden shrink-0 border border-border/40 group-hover:border-primary/30">
                                    {doc.profile_photo
                                      ? <img src={doc.profile_photo} alt="" className="w-full h-full object-cover" />
                                      : getInitials(doc.name)
                                    }
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-foreground text-sm truncate group-hover:text-primary">{doc.name}</h3>
                                    <p className="text-xs text-primary font-medium">{doc.specialization}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                      <span className="text-xs text-muted-foreground">{doc.rating || 0}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1"><Award className="w-3 h-3 text-primary" />{doc.experience}</span>
                                  <Button size="sm" variant="ghost" className="h-7 px-3 rounded-lg gap-1"
                                    onClick={(e) => { e.stopPropagation(); navigate(`/hospital-doctors/${doc._id}`); }}
                                  >
                                    View <ChevronRight className="w-3 h-3" />
                                  </Button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </TabsContent>
                      )}

                      {departmentDoctors.length > 0 && (
                        <TabsContent value="same-department">
                          <div className="grid sm:grid-cols-2 gap-4">
                            {departmentDoctors.map((doc, i) => (
                              <motion.div key={doc._id} variants={fadeUp}
                                className="bg-card rounded-xl border border-border/50 p-4 hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group"
                                onClick={() => navigate(`/hospital-doctors/${doc._id}`)}
                              >
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-base overflow-hidden shrink-0 border border-border/40 group-hover:border-primary/30">
                                    {doc.profile_photo
                                      ? <img src={doc.profile_photo} alt="" className="w-full h-full object-cover" />
                                      : getInitials(doc.name)
                                    }
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-foreground text-sm truncate group-hover:text-primary">{doc.name}</h3>
                                    <p className="text-xs text-primary font-medium">{doc.specialization}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                      <span className="text-xs text-muted-foreground">{doc.rating || 0}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1"><Award className="w-3 h-3 text-primary" />{doc.experience}</span>
                                  <Button size="sm" variant="ghost" className="h-7 px-3 rounded-lg gap-1"
                                    onClick={(e) => { e.stopPropagation(); navigate(`/hospital-doctors/${doc._id}`); }}
                                  >
                                    View <ChevronRight className="w-3 h-3" />
                                  </Button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </TabsContent>
                      )}
                    </Tabs>
                  </CardContent>
                </Card>
              </motion.div>
            )}

          </div>

          {/* ═══════════ SIDEBAR — BOOKING ═══════════ */}
          <motion.div variants={fadeUp} className="space-y-6">
            {/* Quick Info Sidebar Card */}
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
                  <span className="font-semibold text-foreground">{doctor.experience}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Patients</span>
                  <span className="font-semibold text-foreground">{doctor.patients || 0}+</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-semibold text-foreground">{doctor.department || doctor.specialization}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Consultant Type</span>
                  <span className="font-semibold text-foreground">
                    {doctor.consultantType === 'fulltime' ? 'Full-Time' : 'Visiting'}
                  </span>
                </div>
              </div>
            </div>

            {/* Booking Card */}
            <div className="bg-card rounded-2xl border border-border/60 p-6 sticky top-24 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  Book Appointment
                </h2>
                <button onClick={() => setSaved(!saved)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  {saved
                    ? <BookMarked className="w-5 h-5 text-primary" />
                    : <Bookmark className="w-5 h-5 text-muted-foreground" />
                  }
                </button>
              </div>

              {/* Fee Display */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60 mb-3">
                <span className="text-sm text-muted-foreground">Consultation Fee</span>
                <span className="font-bold text-lg text-foreground">Rs {doctor.consultation_fees || doctor.fees || 0}</span>
              </div>

              {/* Walk-in Accepted */}
              {doctor.walk_in_accepted !== undefined && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60 mb-3">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <DoorOpen className="w-4 h-4 text-primary shrink-0" />
                    Walk-in Accepted
                  </span>
                  <span className={cn('text-sm font-semibold', doctor.walk_in_accepted ? 'text-success' : 'text-muted-foreground')}>
                    {doctor.walk_in_accepted ? 'Yes' : 'No'}
                  </span>
                </div>
              )}

              {/* Next Available Slot */}
              {doctor.next_available_slot && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/20 mb-4 text-sm">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">Next available: <span className="font-semibold text-foreground">{doctor.next_available_slot}</span></span>
                </div>
              )}

              {/* OPD Timing */}
              {doctor.opd_timings && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/60 mb-4 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>OPD: <span className="font-medium text-foreground">{doctor.opd_timings}</span></span>
                </div>
              )}

              {bookingSuccess && bookingDetails ? (
                <div className="space-y-3">
                  <div className="px-4 py-3 rounded-xl bg-success/10 border border-success/20 text-success text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Appointment Booked!
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1.5 bg-muted/30 rounded-xl p-4">
                    <p><span className="text-foreground font-medium">Doctor:</span> {bookingDetails.doctor}</p>
                    <p><span className="text-foreground font-medium">Date:</span> {bookingDetails.date}</p>
                    <p><span className="text-foreground font-medium">Time:</span> {bookingDetails.time}</p>
                    <p><span className="text-foreground font-medium">Type:</span> {bookingDetails.type}</p>
                    <p><span className="text-foreground font-medium">Fees:</span> Rs {bookingDetails.fees}</p>
                  </div>
                  <Button className="w-full rounded-xl" onClick={() => navigate(user ? '/patient/appointments' : '/login')}>
                    View My Appointments
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
                      {(doctor.time_slots || ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM']).map(t => {
                        const now = new Date();
                        const [time, period] = t.split(' ');
                        let [h, m] = time.split(':').map(Number);
                        if (period === 'PM' && h !== 12) h += 12;
                        if (period === 'AM' && h === 12) h = 0;
                        const slotDate = new Date(bookingDate || now.toISOString().split('T')[0]);
                        const slotTime = new Date(slotDate);
                        slotTime.setHours(h, m, 0, 0);
                        const isPast = slotDate.toDateString() === now.toDateString() && slotTime < now;
                        return (
                          <button key={t} type="button"
                            disabled={isPast}
                            onClick={() => !isPast && setBookingTime(t)}
                            className={cn(
                              'px-3 py-2 rounded-lg text-sm font-medium transition-colors relative',
                              isPast
                                ? 'bg-muted/30 text-muted-foreground/40 cursor-not-allowed line-through'
                                : bookingTime === t
                                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            )}
                          >
                            {t}
                            {isPast && <span className="absolute -top-1 -right-1 text-[8px] font-bold text-muted-foreground/50 bg-background px-1 rounded">Past</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Appointment Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Consultation', 'Follow-up', 'Check-up'].map(t => (
                        <button key={t} type="button" onClick={() => setBookingType(t)}
                          className={cn(
                            'px-3 py-2 rounded-lg text-sm font-medium transition-colors text-center',
                            bookingType === t
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
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Notes (optional)</label>
                    <Input placeholder="Any specific concerns…" value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} className="rounded-xl" />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Consultation Fee</span>
                    <span className="font-bold text-lg text-foreground">Rs {doctor.consultation_fees || doctor.fees || 0}</span>
                  </div>
                  <Button className="w-full rounded-xl h-11 font-semibold shadow-lg shadow-primary/25" onClick={handleBook} disabled={!bookingDate || !bookingTime}>
                    <CalendarDays className="w-4 h-4 mr-2" /> Confirm Booking
                  </Button>

                  {/* Call Hospital Reception */}
                  {(doctor.clinic_reception_phone || doctor.hospitalId?.phone) && (
                    <Button variant="outline" className="w-full rounded-xl h-11 gap-2" asChild>
                      <a href={`tel:${doctor.clinic_reception_phone || doctor.hospitalId?.phone}`}>
                        <Phone className="w-4 h-4" />
                        Call Hospital Reception
                      </a>
                    </Button>
                  )}

                  {!user && (
                    <p className="text-xs text-muted-foreground text-center">
                      You need to <Link to="/login" className="text-primary underline">sign in</Link> to manage your appointments
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}
