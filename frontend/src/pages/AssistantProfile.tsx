import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  BadgeCheck,
  IndianRupee,
  Languages,
  MapPin,
  CalendarDays,
  Clock,
  User,
  AlertCircle,
  Zap,
  CheckCircle2,
  HeartHandshake,
  FileText,
  Pill,
  ClipboardList,
  Bell,
  UserCog,
  Shield,
  Activity,
  Accessibility,
  Car,
  Moon,
  Syringe,
  TrendingUp,
  Award,
  Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import AssistantUrgentIntakeModal from '@/components/AssistantUrgentIntakeModal';
import AssistantScheduleModal from '@/components/AssistantScheduleModal';

// ── helpers ─────────────────────────────────────────────────────────────────
function renderStars(rating: number, size = 'w-4 h-4') {
  return [1, 2, 3, 4, 5].map((s) => (
    <Star
      key={s}
      className={cn(
        size,
        s <= Math.round(rating)
          ? 'text-yellow-400 fill-yellow-400'
          : 'text-slate-300 fill-slate-200 dark:text-slate-600 dark:fill-slate-700'
      )}
    />
  ));
}

const CATEGORY_META: Record<string, { icon: any; color: string; bg: string; desc: string }> = {
  paperwork: {
    icon: FileText,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200/60 dark:border-blue-800/40',
    desc: 'Admission, discharge forms, billing queues & TPA paperwork.',
  },
  medicine: {
    icon: Pill,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40',
    desc: 'Pharmacy runs, prescription collection & bed delivery.',
  },
  reports: {
    icon: ClipboardList,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200/60 dark:border-purple-800/40',
    desc: 'Pathology & radiology test report collection & handover.',
  },
  errand: {
    icon: Bell,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40',
    desc: 'Food, general errands & urgent patient needs.',
  },
  full_attendant: {
    icon: UserCog,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/60 dark:border-indigo-800/40',
    desc: 'Dedicated day or overnight bedside attendant care.',
  },
  elderly_care: {
    icon: HeartHandshake,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/40',
    desc: 'Wheelchair guidance & gentle patient assistance.',
  },
};

const DEFAULT_AVATARS: Record<string, string> = {
  'Sunita Sharma':
    'https://images.unsplash.com/photo-1594824813575-58535a824e4d?w=400&h=400&fit=crop&crop=faces',
  'Manoj Chouhan':
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=faces',
  'Pooja Tiwari':
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=faces',
  'Neha Kulkarni':
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=faces',
  'Rajesh Yadav':
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop&crop=faces',
};

// ── Component ────────────────────────────────────────────────────────────────
export default function AssistantProfile() {
  const { id } = useParams<{ id: string }>();

  const [assistant, setAssistant] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .getAssistantById(id)
      .then((res: any) => {
        if (res?.assistant) {
          setAssistant(res.assistant);
          setReviews(res.reviews || []);
        } else {
          setError('Assistant not found');
        }
      })
      .catch((err: any) => setError(err.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [id]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Loading profile…</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !assistant) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <AlertCircle className="w-14 h-14 text-destructive/60" />
        <h2 className="text-xl font-bold text-foreground">Assistant Not Found</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button size="sm" asChild className="rounded-xl mt-2">
          <Link to="/book-assistant">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Assistants
          </Link>
        </Button>
      </div>
    );
  }

  const {
    name = 'Hospital Assistant',
    serviceCategories = [],
    experienceYears = 1,
    pricePerHour = 150,
    pricePerFullDay = 1000,
    rating = 5.0,
    reviewsCount = 0,
    bookingsCompleted = 0,
    isAvailable = true,
    operatingCity = 'Jabalpur',
    profilePhoto,
    bio,
    languages = ['Hindi', 'English'],
    isDocumentVerified = true,
    extraSkills = {
      mobilityAssistance: true,
      wheelchairComfort: true,
      ownVehicleMedicine: true,
      overnightStays: true,
    },
    policeVerificationStatus = 'verified',
    healthCertification = {
      isVaccinated: true,
      vaccines: ['COVID-19 Booster', 'Hepatitis B'],
      isCertifiedFit: true,
    },
    onTimeRate = 98,
    completionRate = 99,
    repeatClientsCount = 14,
    trainedEmergencyAdmissions = true,
    badgeIdentifier = 'FindMedi Official Blue Lanyard & Attendant ID',
    govtIdType = 'Aadhaar',
    createdAt = '2024-01-15',
  } = assistant;

  const memberSinceYear = new Date(createdAt).getFullYear() || 2024;
  const photoSrc =
    profilePhoto ||
    DEFAULT_AVATARS[name] ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

  const initials = (name || '')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-background dark:from-slate-950/50 dark:to-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── Back nav ─────────────────────────────────── */}
        <Button variant="ghost" size="sm" asChild className="gap-2 rounded-xl text-xs -ml-2 hover:bg-muted/60">
          <Link to="/book-assistant">
            <ArrowLeft className="w-4 h-4" /> Back to Hospital Assistants
          </Link>
        </Button>

        {/* ── HERO CARD ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 overflow-hidden"
        >
          {/* thin accent strip */}
          <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-500" />

          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6 items-start">

              {/* Profile Photo */}
              <div className="relative shrink-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-2xl shadow-teal-500/20">
                  <img
                    src={photoSrc}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={(e: any) => {
                      e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
                    }}
                  />
                </div>
                {/* availability dot */}
                <span
                  className={cn(
                    'absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-800 shadow-md',
                    isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                  )}
                />
              </div>

              {/* Name & badges */}
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  {/* availability pill */}
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold mb-2',
                      isAvailable
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')} />
                    {isAvailable ? 'Available Now for Urgent Help' : 'Currently Unavailable'}
                  </span>

                  <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight tracking-tight">
                    {name}
                  </h1>

                  {/* trust badges */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {isDocumentVerified && (
                      <Badge className="bg-teal-50 text-teal-700 border-teal-200/80 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800/50 text-[10px] gap-1 font-semibold px-2 py-0.5">
                        <BadgeCheck className="w-3 h-3" /> FindMedi Verified
                      </Badge>
                    )}
                    {policeVerificationStatus === 'verified' && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50 text-[10px] gap-1 font-semibold px-2 py-0.5">
                        <Shield className="w-3 h-3" /> Police Cleared
                      </Badge>
                    )}
                    {healthCertification?.isVaccinated && (
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50 text-[10px] gap-1 font-semibold px-2 py-0.5">
                        <Syringe className="w-3 h-3" /> Fully Vaccinated
                      </Badge>
                    )}
                    {trainedEmergencyAdmissions && (
                      <Badge className="bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50 text-[10px] gap-1 font-semibold px-2 py-0.5">
                        <Activity className="w-3 h-3" /> ER Trained
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Location & since */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 text-foreground font-medium">
                    <MapPin className="w-3.5 h-3.5 text-teal-500" />
                    Serving all hospitals in {operatingCity}
                  </span>
                  <span className="text-muted-foreground/40">•</span>
                  <span>Care partner since {memberSinceYear}</span>
                  {bookingsCompleted > 0 && (
                    <>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {bookingsCompleted}+ bookings
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── Stats ribbon ───────────────────────────── */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Rating */}
              <div className="p-4 rounded-2xl bg-yellow-50/80 dark:bg-yellow-900/10 border border-yellow-200/60 dark:border-yellow-800/30 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-500">Rating</p>
                <div className="flex items-center gap-1.5">
                  <div className="flex">{renderStars(rating, 'w-3.5 h-3.5')}</div>
                  <span className="text-sm font-black text-foreground">
                    {rating > 0 ? Number(rating).toFixed(1) : '5.0'}
                  </span>
                </div>
                {reviewsCount > 0 && (
                  <p className="text-[10px] text-muted-foreground">{reviewsCount} reviews</p>
                )}
              </div>

              {/* On-time */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-900/10 border border-emerald-200/60 dark:border-emerald-800/30 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">Reliability</p>
                <p className="text-sm font-black text-foreground flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  {onTimeRate}%
                </p>
                <p className="text-[10px] text-muted-foreground">On-time arrivals</p>
              </div>

              {/* Patient trust */}
              <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-900/10 border border-rose-200/60 dark:border-rose-800/30 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-500">Patient Trust</p>
                <p className="text-sm font-black text-foreground flex items-center gap-1">
                  <HeartHandshake className="w-4 h-4 text-rose-500" />
                  {repeatClientsCount}+
                </p>
                <p className="text-[10px] text-muted-foreground">Rebooked visits</p>
              </div>

              {/* Rate */}
              <div className="p-4 rounded-2xl bg-teal-50/80 dark:bg-teal-900/10 border border-teal-200/60 dark:border-teal-800/30 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-500">Hourly Rate</p>
                <p className="text-sm font-black text-foreground flex items-center gap-0.5">
                  <IndianRupee className="w-3.5 h-3.5 text-teal-600" />
                  {pricePerHour}
                </p>
                <p className="text-[10px] text-muted-foreground">Per hour · pay after</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Two-column layout ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── LEFT CONTENT (8 cols) ───────────────────── */}
          <div className="lg:col-span-8 space-y-5">

            {/* About */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm"
            >
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                </div>
                About {name}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {bio ||
                  `${name} is a verified hospital assistant experienced in navigating admission counters, pharmacy queues, sample submissions, and patient wheeling. Dedicated to providing compassionate bedside care and reducing family stress during hospitalizations.`}
              </p>
            </motion.div>

            {/* Services Offered */}
            {serviceCategories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm"
              >
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                    <HeartHandshake className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Services Offered
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {serviceCategories.map((cat: string, i: number) => {
                    const meta = CATEGORY_META[cat] || CATEGORY_META['errand'];
                    const Icon = meta.icon;
                    return (
                      <div
                        key={i}
                        className={cn(
                          'flex items-start gap-3 p-3.5 rounded-2xl border',
                          meta.bg
                        )}
                      >
                        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-white/60 dark:bg-slate-900/40', meta.color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={cn('text-xs font-bold capitalize', meta.color)}>{cat.replace(/_/g, ' ')}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{meta.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Trust & Verification */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.11 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  Trust & Verification
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200/60 dark:border-emerald-800/40 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> All Cleared
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200/60 dark:border-emerald-800/30 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Police Station Verified</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Criminal background check & local station clearance verified and on file with FindMedi.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200/60 dark:border-blue-800/30 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <p className="text-xs font-bold text-blue-800 dark:text-blue-300">Govt ID & Biometrics</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {govtIdType}/PAN and biometric proof validated for patient safety.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-900/10 border border-teal-200/60 dark:border-teal-800/30 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Syringe className="w-4 h-4 text-teal-600 shrink-0" />
                    <p className="text-xs font-bold text-teal-800 dark:text-teal-300">Health & Vaccination Safe</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {healthCertification?.isVaccinated
                      ? `Vaccinated (${(healthCertification.vaccines || ['COVID-19 Booster', 'Hepatitis B']).join(', ')}) & certified medically fit.`
                      : 'Certified medically fit for clinical environments.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-900/10 border border-purple-200/60 dark:border-purple-800/30 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-600 shrink-0" />
                    <p className="text-xs font-bold text-purple-800 dark:text-purple-300">Emergency Protocol Trained</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Trained to assist during emergency admissions, ER transfers, and casualty paperwork.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Special Capabilities */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm"
            >
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                Special Capabilities & Equipment
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {extraSkills.wheelchairComfort && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                    <Accessibility className="w-4 h-4 text-teal-500 shrink-0" />
                    <span className="text-xs font-medium text-foreground">Wheelchair Navigation & Safe Patient Transfer</span>
                  </div>
                )}
                {extraSkills.mobilityAssistance && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                    <HeartHandshake className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="text-xs font-medium text-foreground">Bedside Mobility & Patient Walking Escort</span>
                  </div>
                )}
                {extraSkills.ownVehicleMedicine && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                    <Car className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-medium text-foreground">Personal Two-Wheeler for Urgent Medicine Runs</span>
                  </div>
                )}
                {extraSkills.overnightStays && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                    <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="text-xs font-medium text-foreground">Overnight Bedside & ICU Vigil Attendant</span>
                  </div>
                )}
              </div>

              {/* Lanyard note */}
              <div className="mt-4 p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-900/10 border border-teal-200/50 dark:border-teal-800/30 flex items-start gap-3">
                <BadgeCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-foreground">On-Site Hospital Recognition</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {badgeIdentifier}. Meets patient & family at hospital main entrance, emergency casualty desk, or OPD counter upon arrival.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Care Routine */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.17 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm"
            >
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <ClipboardList className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                What I Help With — Care Routine
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    icon: FileText,
                    color: 'text-blue-600',
                    bg: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200/60 dark:border-blue-800/30',
                    title: 'Counter & OPD Queues',
                    desc: 'Doctor registration, OPD slips, insurance pre-auth desks, and diagnostic billing queues.',
                  },
                  {
                    icon: Pill,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200/60 dark:border-emerald-800/30',
                    title: 'Medicine & Specimen Runs',
                    desc: '24×7 hospital pharmacy runs and test sample delivery directly to pathology labs.',
                  },
                  {
                    icon: Accessibility,
                    color: 'text-purple-600',
                    bg: 'bg-purple-50 dark:bg-purple-900/10 border-purple-200/60 dark:border-purple-800/30',
                    title: 'Wheelchair & Radiology Escort',
                    desc: 'Safe patient wheeling for X-Rays, Ultrasound, CT Scans, or MRI appointments.',
                  },
                  {
                    icon: HeartHandshake,
                    color: 'text-rose-600',
                    bg: 'bg-rose-50 dark:bg-rose-900/10 border-rose-200/60 dark:border-rose-800/30',
                    title: 'Bedside Vigil & Discharge',
                    desc: 'Patient hydration, nurse calls, packing belongings, and final discharge clearance.',
                  },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className={cn('p-4 rounded-2xl border space-y-1.5', item.bg)}>
                      <p className={cn('text-xs font-bold flex items-center gap-1.5', item.color)}>
                        <Icon className="w-3.5 h-3.5" /> {item.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Patient Reviews */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  </div>
                  Patient Feedback & Reviews
                </h2>
                <span className="text-xs text-muted-foreground font-medium">{reviews.length} Verified</span>
              </div>

              {reviews.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center">
                    <Quote className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    No public reviews yet. Be the first to book and rate <span className="font-semibold text-foreground">{name}</span>!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-[10px] font-bold text-teal-700 dark:text-teal-400">
                            {(rev.patientId?.name || 'P').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-foreground">
                            {rev.patientId?.name || 'Verified Patient'}
                          </span>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30 text-[9px] px-1.5 py-0 gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Verified Booking
                          </Badge>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {renderStars(rev.ratingByPatient?.stars || 5, 'w-3 h-3')}
                        </div>
                      </div>
                      {rev.ratingByPatient?.comment && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          "{rev.ratingByPatient.comment}"
                        </p>
                      )}
                      <span className="text-[10px] text-muted-foreground/60">
                        At {rev.hospital || 'Hospital'} · Completed Visit
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* ── STICKY SIDEBAR (4 cols) ─────────────────── */}
          <div className="lg:col-span-4 sticky top-20 space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden"
            >
              {/* top accent */}
              <div className="h-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-500" />

              <div className="p-6 space-y-5">
                {/* Pricing */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Service Rates</p>
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Hourly Rate</span>
                      <span className="text-2xl font-black text-foreground">₹{pricePerHour}</span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-muted-foreground">Full Day Shift (8 hrs)</span>
                      <span className="font-bold text-foreground">₹{pricePerFullDay}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Languages */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Languages</p>
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-teal-500" />
                    {languages.join(', ')}
                  </p>
                </div>

                <Separator />

                {/* Experience */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Experience</p>
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    {experienceYears}+ Years in Hospital Care
                  </p>
                </div>

                <Separator />

                {/* Trust seal */}
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200/60 dark:border-emerald-800/30 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">FindMedi Safety & Quality Seal</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Identity verified, police background cleared, and trained for hospital environments.
                    </p>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="space-y-2.5 pt-1">
                  <Button
                    onClick={() => setShowUrgentModal(true)}
                    disabled={!isAvailable}
                    className="w-full h-12 rounded-2xl font-bold text-sm shadow-lg shadow-red-500/20 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white border-0 gap-2 transition-all"
                  >
                    <Zap className="w-4 h-4" /> Book Urgent Assistance
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setShowScheduleModal(true)}
                    className="w-full h-11 rounded-2xl font-semibold text-xs border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2"
                  >
                    <CalendarDays className="w-4 h-4" /> Schedule Planned Visit
                  </Button>
                </div>

                <p className="text-[10px] text-center text-muted-foreground">
                  No advance payment needed. Pay after service completion.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AssistantUrgentIntakeModal
        open={showUrgentModal}
        onOpenChange={setShowUrgentModal}
        assistant={assistant}
        onSuccess={() => setShowUrgentModal(false)}
      />
      <AssistantScheduleModal
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
        assistant={assistant}
        onSuccess={() => setShowScheduleModal(false)}
      />
    </div>
  );
}
