import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, MapPin, CalendarDays, IndianRupee, Award, Users, Phone, Mail, Building2, Languages, GraduationCap, BrainCircuit, BadgeCheck, Heart, Video, MessageCircle, Home, Share2, Pill, Quote, FlaskConical, HeartPulse, Car, Accessibility, Wind, Image, ChevronRight, ChevronDown, ChevronUp, FileText, Briefcase, Shield, Trophy, Store, CircleDot, CheckCircle, Plus, Minus, Ambulance, Zap, Sparkles, DoorOpen, Clock, Bookmark, BookMarked, ArrowRight, Stethoscope } from 'lucide-react';
import { Button } from '@/mind/components/ui/button';
import { Textarea } from '@/mind/components/ui/textarea';
import { Badge } from '@/mind/components/ui/badge';
import { Card, CardContent } from '@/mind/components/ui/card';
import { Separator } from '@/mind/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/mind/components/ui/tabs';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import BookingModal from '@/components/BookingModal';
import NavigationBar from '@/mind/components/Navigation';
import Footer from '@/mind/components/Footer';

const MODE_META = [
  { id: 'video', label: 'Video Consultation', icon: Video },
  { id: 'audio', label: 'Audio Consultation', icon: Phone },
  { id: 'chat', label: 'Chat Consultation', icon: MessageCircle },
  { id: 'offline', label: 'In-Person Visit', icon: MapPin },
  { id: 'home_visit', label: 'Home Visit', icon: Home },
];

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
  friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function getInitials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "P";
}

function getClinicName(doc) {
  if (!doc) return '';
  return doc.clinicProfile?.clinic_name || doc.facilityId?.name || doc.location?.split(',')?.[0] || 'Clinic';
}

function getClinicAddress(doc) {
  return doc.clinicProfile?.clinic_address || doc.facilityId?.address || doc.location || doc.address || doc.city || '';
}

function getFacilityId(doc) {
  return doc?.facilityId?._id || doc?.facilityId || null;
}

function getClinicPath(doc) {
  return `/clinic/${getFacilityId(doc) || doc?._id}`;
}

function getFaqQuestion(faq) {
  if (!faq) return '';
  if (typeof faq === 'string') return faq;
  return faq.question || faq.q || '';
}

function getFaqAnswer(faq) {
  if (!faq) return '';
  if (typeof faq === 'string') return '';
  return faq.answer || faq.a || '';
}

function modeFee(doc, modeId) {
  if (!doc) return 0;
  const fees = doc.appointmentFees || {};
  if (fees[modeId] !== undefined && fees[modeId] !== null) return fees[modeId];
  return doc.consultation_fees || doc.fees || 0;
}

function doctor_is_saved(id) {
  try {
    const savedIds = JSON.parse(localStorage.getItem('fav_doctor_ids') || '[]');
    return savedIds.includes(id);
  } catch {
    return false;
  }
}

export default function PsychiatristDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [relatedDoctors, setRelatedDoctors] = useState([]);
  const [departmentDoctors, setDepartmentDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showFullBio, setShowFullBio] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const doc = await api.getDoctor(id);
        if (!doc) { setNotFound(true); return; }
        setDoctor(doc);
        setSaved(doctor_is_saved(id));
        const rv = await api.getReviews({ doctorId: id }).catch(() => []);
        if (Array.isArray(rv) && rv.length > 0) setReviews(rv);
        const allDocs = await api.getDoctors({}).catch(() => ({ data: [] }));
        const allList = Array.isArray(allDocs) ? allDocs : (allDocs?.data || allDocs?.doctors || []);
        const filtered = (Array.isArray(allList) ? allList : []).filter(d => d._id !== id);
        if (getFacilityId(doc) || doc.clinicProfile?.clinic_name) {
          setRelatedDoctors(filtered.filter(d => {
            const sameFacility = getFacilityId(doc) && getFacilityId(d) && String(getFacilityId(d)) === String(getFacilityId(doc));
            const sameClinicName = d.clinicProfile?.clinic_name === doc.clinicProfile?.clinic_name;
            return sameFacility || sameClinicName;
          }).slice(0, 4));
        }
        if (doc.specialization) {
          setDepartmentDoctors(filtered.filter(d => (d.specialization || '').toLowerCase().includes('psychiatr')).slice(0, 4));
        }
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleSaved = async () => {
    if (!doctor) return;
    const nowSaved = !saved;
    setSaved(nowSaved);
    try {
      if (nowSaved) {
        await api.dispatch(() => Promise.resolve({}), '/patient/favorites', { method: 'POST', body: JSON.stringify({ targetId: doctor._id, targetType: 'doctor', name: doctor.name }) });
      } else {
        await api.dispatch(() => Promise.resolve({}), `/patient/favorites/${doctor._id}`, { method: 'DELETE' });
      }
      toast.success(nowSaved ? 'Saved' : 'Removed from Saved');
    } catch {
      setSaved(!nowSaved);
      toast.error('Failed to update favorite');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: doctor?.name || 'Psychiatrist Profile', url }); } catch { /* dismissed */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleReview = async () => {
    if (!reviewComment.trim() || !doctor) return;
    try {
      await api.createReview({
        doctorId: doctor._id,
        doctorName: doctor.name,
        patientName: 'Anonymous',
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviewComment('');
      setShowReviewForm(false);
      const rv = await api.getReviews({ doctorId: id }).catch(() => []);
      if (Array.isArray(rv) && rv.length > 0) setReviews(rv);
      toast.success('Review submitted!');
    } catch {
      toast.error('Failed to submit review');
    }
  };

  const renderStars = (rating, size = 'w-3.5 h-3.5') => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`${size} ${s <= Math.round(rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );

  const ratingBreakdown = () => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    (Array.isArray(reviews) ? reviews : []).forEach(r => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating]++; });
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
      <div className="min-h-screen bg-background text-foreground theme-findmedi">
        <NavigationBar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground animate-pulse">Loading psychiatrist…</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !doctor) {
    return (
      <div className="min-h-screen bg-background text-foreground theme-findmedi">
        <NavigationBar />
        <div className="text-center py-20">
          <h3 className="text-lg font-semibold">Psychiatrist not found</h3>
          <p className="text-muted-foreground mt-1">This profile may have been removed.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/mind/psychiatrists')}>Back to list</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const reviewCount = doctor.reviews_count || reviews.length;
  const avgRating = doctor.rating || 0;

  return (
    <div className="min-h-screen bg-background text-foreground theme-findmedi">
      <NavigationBar />
      <motion.div initial="hidden" animate="visible" className="pt-16">

        {/* ═══════════ BREADCRUMB ═══════════ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-0">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
            <Link to="/mind" className="hover:text-primary transition-colors flex items-center gap-1">
              <Home className="w-3.5 h-3.5" /><span className="hidden sm:inline">Home</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/mind/psychiatrists" className="hover:text-primary transition-colors">Psychiatrists</Link>
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
                      <Badge variant="outline" className="w-fit text-xs bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-800">
                        <BrainCircuit className="w-3 h-3 mr-1" /> Medical Doctor
                      </Badge>
                    </div>

                    <p className="text-primary font-semibold text-lg mb-1">{doctor.specialization}</p>

                    {doctor.qualifications && (
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                        {doctor.qualifications}
                      </p>
                    )}

                    {/* Clinic Name */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-2.5">
                      {getClinicName(doctor) && (
                        <span className="flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-primary font-medium">{getClinicName(doctor)}</span>
                        </span>
                      )}
                      {doctor.department && (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          {doctor.department}
                        </span>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-2.5">
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
                        <span className="flex items-center gap-0.5">{renderStars(avgRating)}</span>
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
                      <Phone className="w-4 h-4 text-primary shrink-0" />
                      {doctor.phone}
                    </a>
                  )}
                  {doctor.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-primary shrink-0" />
                      {doctor.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <IndianRupee className="w-4 h-4 text-success shrink-0" />
                    <span className="text-success font-semibold">₹{doctor.consultation_fees || doctor.fees || 0}</span>
                    <span className="text-xs">/ visit</span>
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button onClick={toggleSaved} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm">
                      <Heart className={cn('w-4 h-4', saved && 'fill-current text-red-500')} />
                      {saved ? 'Saved' : 'Save'}
                    </button>
                    <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm">
                      <Share2 className="w-4 h-4 text-primary" />
                      Share
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
                      <div>
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

              {/* ═══ CONSULTATION OPTIONS ═══ */}
              <motion.div variants={fadeUp}>
                <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                  <CardContent className="p-6 sm:p-8">
                    <h2 className="font-heading text-xl font-bold text-foreground mb-2 flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Video className="w-4 h-4 text-primary" />
                      </span>
                      Consultation Options
                    </h2>
                    <p className="text-sm text-muted-foreground mb-5">Diagnosis, medication & therapy sessions</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {MODE_META.map(m => (
                        <div key={m.id} className="rounded-xl border border-border/60 bg-muted/40 p-4 text-center">
                          <m.icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                          <p className="text-xs font-semibold">{m.label}</p>
                          <p className="text-sm font-bold text-primary mt-1">₹{modeFee(doctor, m.id)}</p>
                        </div>
                      ))}
                    </div>
                    {doctor.supportPlanPrices && Object.values(doctor.supportPlanPrices).some(v => Number(v) > 0) && (
                      <div className="mt-5">
                        <p className="text-sm font-semibold text-foreground mb-3">Support Packages</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {Object.entries(doctor.supportPlanPrices).filter(([, v]) => Number(v) > 0).map(([k, v]) => (
                            <div key={k} className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
                              <p className="text-xs font-medium capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                              <p className="font-bold text-primary">₹{v}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* ═══ 5. CLINIC & LOCATION DETAILS ═══ */}
              <motion.div variants={fadeUp}>
                <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                  <CardContent className="p-6 sm:p-8">
                    <h2 className="font-heading text-xl font-bold text-foreground mb-6 flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-primary" />
                      </span>
                      Clinic & Location Details
                    </h2>

                    {/* Linked Clinic Card */}
                    {getClinicName(doctor) && (
                      <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/0 border border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
                        onClick={() => navigate(getClinicPath(doctor))}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{getClinicName(doctor)}</p>
                              <p className="text-xs text-muted-foreground">{getClinicAddress(doctor)}</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="rounded-xl gap-1.5 shrink-0"
                            onClick={(e) => { e.stopPropagation(); navigate(getClinicPath(doctor)); }}>
                            View Clinic
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Clinic Photos / Gallery */}
                    {doctor.clinicProfile?.clinic_photos?.length > 0 && (
                      <div className="mb-6">
                        <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Image className="w-4 h-4 text-primary" />
                          Clinic Gallery
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {doctor.clinicProfile.clinic_photos.map((photo, i) => (
                            <div key={i} className="aspect-[3/2] rounded-xl overflow-hidden border border-border/40 bg-muted">
                              <img src={photo} alt={`Clinic photo ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Direct Clinic Reception */}
                    {doctor.clinic_reception_phone && (
                      <div className="mb-6 p-4 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Clinic Reception</p>
                          <p className="text-xs text-muted-foreground">Call for appointments & queries</p>
                        </div>
                        <a href={`tel:${doctor.clinic_reception_phone}`}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                          {doctor.clinic_reception_phone}
                        </a>
                      </div>
                    )}

                    {/* In-house Facilities */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      {[
                        { label: 'Pharmacy', available: doctor.in_house_pharmacy, icon: Pill, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800' },
                        { label: 'Lab / Diagnostic', available: doctor.in_house_lab, icon: FlaskConical, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-800' },
                        { label: 'Admission', available: doctor.admission_available, icon: HeartPulse, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-800' },
                        { label: 'Emergency', available: doctor.emergency_consultation, icon: Ambulance, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-800' },
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

                    {/* Clinic Facilities */}
                    {doctor.clinicProfile?.clinic_facilities?.length > 0 && (
                      <div className="mb-6">
                        <p className="text-sm font-semibold text-foreground mb-3">Facilities</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {doctor.clinicProfile.clinic_facilities.map((fac, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/60 text-sm text-muted-foreground">
                              {fac.toLowerCase().includes('parking') && <Car className="w-3.5 h-3.5 text-primary shrink-0" />}
                              {fac.toLowerCase().includes('wheelchair') && <Accessibility className="w-3.5 h-3.5 text-primary shrink-0" />}
                              {fac.toLowerCase().includes('ac') && <Wind className="w-3.5 h-3.5 text-primary shrink-0" />}
                              {!fac.toLowerCase().includes('parking') && !fac.toLowerCase().includes('wheelchair') && !fac.toLowerCase().includes('ac') && <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />}
                              {fac}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Insurance Accepted */}
                    {doctor.clinicProfile?.clinic_insurance?.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-primary" />
                          Insurance / Cashless Accepted
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {doctor.clinicProfile.clinic_insurance.map(ins => (
                            <Badge key={ins} variant="outline" className="text-xs bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800 px-3 py-1">
                              <CheckCircle className="w-3 h-3 mr-1" />{ins}
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
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Clinic</th>
                          </tr>
                        </thead>
                        <tbody>
                          {DAY_ORDER.map(day => {
                            const active = doctor.weekly_schedule ? doctor.weekly_schedule[day] !== false : true;
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
                                      {DAY_LABELS[day]}
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
                                  {active ? (getClinicName(doctor) || '—') : '—'}
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
                      {!showReviewForm && (
                        <Button size="sm" variant="outline" className="rounded-xl gap-2" onClick={() => setShowReviewForm(true)}>
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
                          placeholder={`Tell others about your experience with ${doctor?.name || 'the doctor'}...`}
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

                    {reviews.length === 0 && reviewCount === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Star className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                        <p>No reviews yet. Be the first to share your experience!</p>
                      </div>
                    ) : reviews.length === 0 && reviewCount > 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Star className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                        <p>Reviews summary available, individual reviews loading soon.</p>
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
                              Show All {reviewCount} Reviews <ChevronDown className="w-3 h-3" />
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
                        <span className="text-sm font-semibold text-success">₹{doctor.consultation_fees || doctor.fees || 0}</span>
                      </div>
                      {doctor.payment_modes?.length > 0 && (
                        <div className="px-4 py-3 rounded-xl bg-muted/30 border border-border/60">
                          <span className="text-sm text-muted-foreground block mb-2">Payment Modes Accepted</span>
                          <div className="flex flex-wrap gap-1.5">
                            {doctor.payment_modes.map(mode => (
                              <Badge key={mode} variant="secondary" className="text-xs">{mode}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* FAQs */}
                    {(doctor.clinicProfile?.clinic_faqs || []).length > 0 && (
                      <div className="mt-6">
                        <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                          <Quote className="w-4 h-4 text-primary" />
                          Frequently Asked Questions
                        </p>
                        <div className="space-y-2">
                          {(doctor.clinicProfile?.clinic_faqs || []).map((faq, i) => (
                            <div key={i} className="rounded-xl border border-border/60 overflow-hidden">
                              <button
                                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/20 transition-colors"
                              >
                                <span className="text-sm font-medium text-foreground">{getFaqQuestion(faq)}</span>
                                {expandedFaq === i
                                  ? <Minus className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
                                  : <Plus className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />}
                              </button>
                              {expandedFaq === i && (
                                <div className="px-4 pb-3">
                                  <p className="text-sm text-muted-foreground leading-relaxed">{getFaqAnswer(faq)}</p>
                                </div>
                              )}
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
                        Other Doctors at Same Clinic
                      </h2>

                      <Tabs defaultValue={relatedDoctors.length > 0 ? 'same-hospital' : 'same-department'} className="w-full">
                        <TabsList className="mb-6">
                          {relatedDoctors.length > 0 && (
                            <TabsTrigger value="same-hospital" className="rounded-xl text-xs sm:text-sm">
                              <Building2 className="w-4 h-4 mr-1.5" />
                              Same Clinic
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
                              {relatedDoctors.map((doc) => (
                                <RelatedDoctorCard key={doc._id} doc={doc} onOpen={() => navigate(`/mind/psychiatrists/${doc._id}`)} />
                              ))}
                            </div>
                          </TabsContent>
                        )}

                        {departmentDoctors.length > 0 && (
                          <TabsContent value="same-department">
                            <div className="grid sm:grid-cols-2 gap-4">
                              {departmentDoctors.map((doc) => (
                                <RelatedDoctorCard key={doc._id} doc={doc} onOpen={() => navigate(`/mind/psychiatrists/${doc._id}`)} />
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
                    <span className="text-muted-foreground">Languages</span>
                    <span className="font-semibold text-foreground text-right">{doctor.languages?.join(', ') || '—'}</span>
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
                  {doctor.phone && (
                    <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" asChild>
                      <a href={`tel:${doctor.phone}`}><Phone className="w-4 h-4" /> Call Now</a>
                    </Button>
                  )}
                  {doctor.email && (
                    <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" asChild>
                      <a href={`mailto:${doctor.email}`}><Mail className="w-4 h-4" /> Email Now</a>
                    </Button>
                  )}
                  <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={toggleSaved}>
                    <Heart className={cn('w-4 h-4', saved && 'fill-current text-red-500')} /> {saved ? 'Saved' : 'Save'}
                  </Button>
                  <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={handleShare}>
                    <Share2 className="w-4 h-4" /> Share Profile
                  </Button>
                  <Button variant="outline" className="w-full gap-2.5 rounded-xl h-11" onClick={() => setShowReviewForm(true)}>
                    <Star className="w-4 h-4" /> Write a Review
                  </Button>
                </div>
              </div>

              {/* Booking Card */}
              <div className="bg-card rounded-2xl border border-border/60 p-5 sticky top-24 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    Book Appointment
                  </h2>
                  <button onClick={toggleSaved} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    {saved
                      ? <BookMarked className="w-4 h-4 text-primary" />
                      : <Bookmark className="w-4 h-4 text-muted-foreground" />
                    }
                  </button>
                </div>

                {/* Fee Display */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/60 mb-2">
                  <span className="text-xs text-muted-foreground">Consultation Fee</span>
                  <span className="font-bold text-base text-foreground">₹{doctor.consultation_fees || doctor.fees || 0}</span>
                </div>

                {/* Walk-in Accepted */}
                {doctor.walk_in_accepted !== undefined && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/60 mb-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <DoorOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                      Walk-in Accepted
                    </span>
                    <span className={cn('text-xs font-semibold', doctor.walk_in_accepted ? 'text-success' : 'text-muted-foreground')}>
                      {doctor.walk_in_accepted ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}

                {/* Next Available Slot */}
                {doctor.next_available_slot && (
                  <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-primary/5 border border-primary/20 mb-3 text-xs">
                    <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-muted-foreground">Next available: <span className="font-semibold text-foreground">{doctor.next_available_slot}</span></span>
                  </div>
                )}

                <Button className="w-full rounded-xl h-11 font-semibold shadow-lg shadow-primary/25 mb-3 gap-2" onClick={() => setShowBooking(true)}>
                  <CalendarDays className="w-4 h-4" /> Book Appointment
                </Button>

                {/* Call Clinic / Hospital Reception */}
                {doctor.clinic_reception_phone && (
                  <Button variant="outline" className="w-full rounded-xl h-10 gap-2" asChild>
                    <a href={`tel:${doctor.clinic_reception_phone}`}>
                      <Phone className="w-4 h-4" />
                      Call Clinic
                    </a>
                  </Button>
                )}
              </div>

              <BookingModal
                open={showBooking}
                onOpenChange={setShowBooking}
                doctor={doctor}
                facility={doctor.clinicProfile}
              />
            </motion.div>

          </div>
        </div>
      </motion.div>
      <Footer />
    </div>
  );
}

function RelatedDoctorCard({ doc, onOpen }) {
  return (
    <div onClick={onOpen}
      className="group bg-card rounded-2xl border border-border/60 p-4 cursor-pointer hover:border-primary/30 hover:shadow-lg transition-all">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 font-bold text-primary">
          {doc.profile_photo
            ? <img src={doc.profile_photo} alt={doc.name} className="w-full h-full object-cover" />
            : (doc.name || 'P').replace('Dr. ', '').charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate group-hover:text-primary">{doc.name}</p>
          <p className="text-xs text-primary">{doc.specialization}</p>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-xs font-medium">{doc.rating}</span>
            <span className="text-xs text-muted-foreground">({doc.reviews_count || 0})</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{doc.experience} • ₹{doc.consultation_fees || doc.fees || 0} fee</p>
        </div>
      </div>
      <Button size="sm" variant="outline" className="w-full mt-3 h-8 text-xs"
        onClick={(e) => { e.stopPropagation(); onOpen(); }}>
        View Profile
      </Button>
    </div>
  );
}
