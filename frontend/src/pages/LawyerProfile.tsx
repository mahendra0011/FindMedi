import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Star,
  Scale,
  Gavel,
  ShieldCheck,
  BadgeCheck,
  Award,
  IndianRupee,
  Languages,
  GraduationCap,
  MapPin,
  CalendarDays,
  Clock,
  Building,
  User,
  AlertCircle,
  Zap,
  CheckCircle2,
  TrendingUp,
  HelpCircle,
  Briefcase,
  FileCheck,
  Phone,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import LawyerUrgentIntakeModal from '@/components/LawyerUrgentIntakeModal';
import LawyerScheduleModal from '@/components/LawyerScheduleModal';

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

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' },
  }),
};

export default function LawyerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lawyer, setLawyer] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showUrgentIntake, setShowUrgentIntake] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await api.getLawyerById(id);
        if (res?.lawyer || res?.profile) {
          setLawyer(res.lawyer || res.profile);
          setReviews(res.reviews || []);
        } else {
          setNotFound(true);
        }
      } catch (e) {
        console.error('Failed to load advocate profile:', e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Loading advocate profile…</span>
        </div>
      </div>
    );
  }

  /* ── Not Found ── */
  if (notFound || !lawyer) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Scale className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-1">Advocate Profile Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">
          The advocate profile you requested could not be located or has been deactivated.
        </p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/find-lawyer">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Find a Lawyer
          </Link>
        </Button>
      </div>
    );
  }

  const {
    name,
    practiceCategories = [],
    yearsOfPractice = 5,
    consultationFee = 800,
    followUpFee = 500,
    rating = 5.0,
    reviewsCount = 0,
    casesHandled = 25,
    isAvailable = true,
    jurisdictionCity,
    profilePhoto,
    bio,
    barCouncilNumber,
    stateBarCouncil,
    yearOfEnrollment,
    languages = [],
    availableDays = [],
    availableTimeSlots = [],
    courtsPracticedIn = [],
    favorableOutcomesRate = 88,
    notableCases = [
      'Handled 18+ Hospital Negligence Claims',
      'Resolved ₹45L+ Cashless Insurance Rejection Disputes',
      '25+ Medico-Legal MLC Court Appearances',
    ],
    practiceType = 'independent',
    yearsAtCurrentPractice = 3,
    avgResponseMinutes = 12,
    currentSessionStatus = 'available',
    faqs = [],
    awards = ['Distinguished Medico-Legal Advocate (Bar Association)', 'Consumer Rights Defender Award'],
    isPoliceVerified = true,
    lawFirmName = '',
  } = lawyer;

  const initials = (name || '')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const nextSlotLabel = availableDays.length > 0 ? 'Today from 10:00 AM' : 'Available by Appointment';

  const statusConfig =
    currentSessionStatus === 'in_session'
      ? { label: 'Currently in a Session', color: 'bg-amber-500 text-white', dot: 'bg-white animate-ping' }
      : isAvailable
        ? { label: 'Available for Urgent Advice', color: 'bg-emerald-500 text-white', dot: 'bg-white animate-pulse' }
        : { label: 'Currently Unavailable', color: 'bg-slate-400 text-white', dot: 'bg-slate-200' };

  // ── Metric cards data ──
  const metrics = [
    {
      icon: Star,
      iconColor: 'text-yellow-500',
      iconBg: 'bg-yellow-50 dark:bg-yellow-950/40',
      label: 'Client Rating',
      value: rating > 0 ? rating.toFixed(1) : '5.0',
      sub: `${reviewsCount} reviews`,
    },
    {
      icon: Award,
      iconColor: 'text-indigo-500',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/40',
      label: 'Experience',
      value: `${yearsOfPractice} Years`,
      sub: 'Active Practice',
    },
    {
      icon: TrendingUp,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      label: 'Favorable Outcomes',
      value: `${favorableOutcomesRate}%`,
      sub: `${casesHandled}+ cases handled`,
    },
    {
      icon: IndianRupee,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50 dark:bg-teal-950/40',
      label: 'Consultation Fee',
      value: `₹${consultationFee}`,
      sub: 'per session',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── Back Navigation ── */}
        <Button variant="ghost" size="sm" asChild className="gap-2 rounded-xl text-xs text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
          <Link to="/find-lawyer">
            <ArrowLeft className="w-4 h-4" /> Back to Find a Lawyer
          </Link>
        </Button>

        {/* ══════════════════════════════════════════════════════════════════
            HERO CARD — Clean avatar-first layout, no big gradient banner
        ══════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
        >
          {/* Thin accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

          <div className="px-6 sm:px-8 py-6">
            {/* Top row: avatar + info + status + action buttons */}
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-slate-100 dark:border-slate-700 shadow-lg">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600">
                      <span className="text-3xl font-bold text-white">{initials}</span>
                    </div>
                  )}
                </div>
                {isAvailable && (
                  <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 border-[3px] border-white dark:border-slate-900 animate-pulse" />
                )}
              </div>

              {/* Info block */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    Adv. {name}
                  </h1>
                  <Badge className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[11px] gap-1 font-semibold">
                    <BadgeCheck className="w-3.5 h-3.5" /> Bar Council Verified
                  </Badge>
                  {isPoliceVerified && (
                    <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[11px] gap-1 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" /> Background Cleared
                    </Badge>
                  )}
                </div>

                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                  {practiceCategories.join(' · ') || 'Legal Advocate'}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {jurisdictionCity && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500/80" /> {jurisdictionCity}
                      {courtsPracticedIn.length > 0 ? ` · ${courtsPracticedIn[0]}` : ''}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                    {practiceType === 'firm' && lawFirmName
                      ? `${lawFirmName} (${yearsAtCurrentPractice} yrs)`
                      : `Independent Practice · ${yearsAtCurrentPractice || yearsOfPractice} yrs`}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <Clock className="w-3.5 h-3.5" /> Responds in ~{avgResponseMinutes} mins
                  </span>
                </div>

                {/* Status badge */}
                <div className="mt-3">
                  <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm', statusConfig.color)}>
                    <span className={cn('w-2 h-2 rounded-full', statusConfig.dot)} />
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex sm:flex-col items-center gap-2 w-full sm:w-auto shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScheduleModal(true)}
                  className="flex-1 sm:flex-none gap-2 rounded-xl text-xs h-10 px-4 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:text-indigo-600"
                >
                  <CalendarDays className="w-4 h-4" /> Schedule Consultation
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowUrgentIntake(true)}
                  disabled={!isAvailable}
                  className="flex-1 sm:flex-none gap-2 rounded-xl text-xs h-10 px-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold shadow-lg shadow-indigo-500/25 border-0"
                >
                  <Gavel className="w-4 h-4" /> Book Urgent
                </Button>
              </div>
            </div>

            {/* ── Metrics Ribbon ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              {metrics.map((m, i) => (
                <motion.div
                  key={m.label}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                >
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', m.iconBg)}>
                    <m.icon className={cn('w-4.5 h-4.5', m.iconColor)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{m.label}</p>
                    <p className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">{m.value}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{m.sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════════
            CONTENT GRID — Main + Sidebar
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Main Column ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* About */}
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-3"
            >
              <h2 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                  <User className="w-4 h-4 text-indigo-500" />
                </div>
                About Adv. {name}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {bio ||
                  `Adv. ${name} is a verified advocate with ${yearsOfPractice} years of practice in ${jurisdictionCity || 'the court system'}. They specialize in ${practiceCategories.join(', ')}, providing advisory, medico-legal documentation, and court representation.`}
              </p>

              {barCouncilNumber && (
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <GraduationCap className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Bar Council Number</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{barCouncilNumber}</p>
                    </div>
                  </div>
                  {stateBarCouncil && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <Building className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">State</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{stateBarCouncil}</p>
                      </div>
                    </div>
                  )}
                  {yearOfEnrollment && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <CalendarDays className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Enrolled</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{yearOfEnrollment}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Legal Areas of Practice */}
            <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible"
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-3"
            >
              <h2 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
                  <Gavel className="w-4 h-4 text-violet-500" />
                </div>
                Legal Areas of Practice
              </h2>
              <div className="flex flex-wrap gap-2">
                {practiceCategories.map((cat: string, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                  >
                    <Scale className="w-3.5 h-3.5" /> {cat}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Courts & Forums */}
            {courtsPracticedIn.length > 0 && (
              <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible"
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-3"
              >
                <h2 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                    <Building className="w-4 h-4 text-amber-500" />
                  </div>
                  Courts & Forums
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {courtsPracticedIn.map((court: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 font-medium hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
                    >
                      <Building className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>{court}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Notable Cases */}
            {notableCases.length > 0 && (
              <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible"
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                      <FileCheck className="w-4 h-4 text-emerald-500" />
                    </div>
                    Notable Medico-Legal Cases & Experience
                  </h2>
                  <Badge className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold">
                    Anonymized Matters
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {notableCases.map((c: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-sm"
                    >
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{c}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Awards */}
            {awards.length > 0 && (
              <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible"
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-3"
              >
                <h2 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-yellow-50 dark:bg-yellow-950/40 flex items-center justify-center">
                    <Award className="w-4 h-4 text-yellow-500" />
                  </div>
                  Honors & Bar Recognition
                </h2>
                <div className="flex flex-wrap gap-2">
                  {awards.map((a: string, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> {a}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* FAQs */}
            {faqs.length > 0 && (
              <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible"
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                      <HelpCircle className="w-4 h-4 text-blue-500" />
                    </div>
                    Frequently Asked Questions
                  </h2>
                  <span className="text-[11px] text-slate-400 font-medium">Direct Legal Guidance</span>
                </div>
                <div className="space-y-2.5">
                  {faqs.map((faq: any, i: number) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2"
                    >
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-start gap-2">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
                          Q
                        </span>
                        {faq.question}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 pl-7 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Client Reviews */}
            <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible"
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-yellow-50 dark:bg-yellow-950/40 flex items-center justify-center">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  </div>
                  Client Reviews
                </h2>
                <span className="text-xs text-slate-400 font-medium">{reviews.length} total reviews</span>
              </div>

              {reviews.length === 0 ? (
                <div className="py-6 text-center">
                  <Star className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 italic">
                    No public reviews available yet for this advocate.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">
                            {r.clientName || 'Anonymous Client'}
                          </span>
                          <Badge className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 border-emerald-200 dark:border-emerald-800 text-[10px] gap-0.5 py-0 px-1.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                          </Badge>
                          {r.category && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                              {r.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5">
                          {renderStars(r.stars || 5, 'w-3 h-3')}
                        </div>
                      </div>
                      {r.comment && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic">
                          "{r.comment}"
                        </p>
                      )}
                      {r.date && (
                        <p className="text-[10px] text-slate-400">
                          {new Date(r.date).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 sticky top-6 shadow-sm"
            >
              {/* Next Available Slot */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-200/60 dark:border-indigo-800/40 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Next Available Slot</span>
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{nextSlotLabel}</p>
                <p className="text-[11px] text-slate-500">
                  Response SLA: Guaranteed connection within ~{avgResponseMinutes} minutes
                </p>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  Consultation Pricing
                </h3>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500">First Consultation</span>
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-100">₹{consultationFee}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500">Follow-Up Consultation</span>
                    <span className="text-base font-bold text-slate-700 dark:text-slate-200">₹{followUpFee}</span>
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-100 dark:bg-slate-800" />

              {/* Consultation Mode */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Consultation Mode</label>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                    <Building className="w-3.5 h-3.5" /> In-Person Hospital & Client Visit
                  </span>
                </div>
              </div>

              {/* Languages */}
              {languages.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Languages</label>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{languages.join(', ')}</p>
                </div>
              )}

              {/* Verification Stamp */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Bar Council & Background Verified
                  </p>
                  <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 leading-relaxed">
                    Client-attorney confidentiality applies. Verified against State Bar rolls and identity clearance.
                  </p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="space-y-2.5 pt-2">
                <Button
                  onClick={() => setShowUrgentIntake(true)}
                  disabled={!isAvailable}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold gap-2 shadow-lg shadow-indigo-500/25 border-0 text-sm"
                >
                  <Gavel className="w-4 h-4" /> Book Urgent Consultation
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleModal(true)}
                  className="w-full h-11 rounded-xl gap-2 text-xs border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:text-indigo-600"
                >
                  <CalendarDays className="w-4 h-4" /> Schedule Future Session
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <LawyerUrgentIntakeModal
        open={showUrgentIntake}
        onOpenChange={setShowUrgentIntake}
        lawyer={lawyer}
      />
      <LawyerScheduleModal
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
        lawyer={lawyer}
      />
    </div>
  );
}
