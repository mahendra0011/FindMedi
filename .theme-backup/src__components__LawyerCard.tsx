import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star,
  MapPin,
  Languages,
  GraduationCap,
  Scale,
  BadgeCheck,
  Gavel,
  User,
  IndianRupee,
  Award as Exp,
  Clock,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import LawyerUrgentIntakeModal from './LawyerUrgentIntakeModal';

const renderStars = (rating: number) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        className={cn(
          'w-3.5 h-3.5 transition-colors',
          s <= Math.round(rating)
            ? 'text-yellow-500 fill-yellow-500'
            : 'text-muted-foreground/20 fill-muted-foreground/10'
        )}
      />
    ))}
  </div>
);

interface LawyerCardProps {
  lawyer: any;
  index?: number;
}

export default function LawyerCard({ lawyer, index = 0 }: LawyerCardProps) {
  const navigate = useNavigate();
  const [showUrgentIntake, setShowUrgentIntake] = useState(false);

  if (!lawyer) return null;

  const {
    _id,
    name,
    practiceCategories = [],
    yearsOfPractice,
    consultationFee,
    rating = 0,
    reviewsCount = 0,
    casesHandled = 0,
    isAvailable = true,
    phone,
    jurisdictionCity,
    profilePhoto,
    bio,
    barCouncilNumber,
    languages = [],
    courtsPracticedIn = [],
    favorableOutcomesRate = 0,
    avgResponseMinutes = 0,
    currentSessionStatus = 'available',
    isPoliceVerified = false,
    notableCases = [],
  } = lawyer;

  const initials = (name || '')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const profilePath = `/lawyers/${_id}`;

  const statusConfig =
    currentSessionStatus === 'in_session'
      ? { label: 'In Session', bg: 'bg-amber-500', dot: 'bg-yellow-200 animate-pulse' }
      : isAvailable
        ? { label: 'Available', bg: 'bg-emerald-500', dot: 'bg-white animate-pulse' }
        : { label: 'Offline', bg: 'bg-slate-400', dot: 'bg-slate-200' };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.35, ease: 'easeOut' }}
        className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300 flex flex-col h-full"
      >
        {/* ── Top accent line ── */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />

        {/* ── Header: avatar + name + status ── */}
        <div className="px-5 pt-5 pb-3 flex items-start gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-700 shadow-md">
              {profilePhoto ? (
                <img src={profilePhoto} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600">
                  <span className="text-xl font-bold text-white">{initials}</span>
                </div>
              )}
            </div>
            {/* Online dot */}
            {isAvailable && (
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 animate-pulse" />
            )}
          </div>

          {/* Name + category */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 leading-tight truncate">
                Adv. {name}
              </h3>
              <BadgeCheck className="w-4 h-4 text-indigo-600 shrink-0" title="Bar Council Verified" />
              {isPoliceVerified && (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" title="Police Verified" />
              )}
            </div>

            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 truncate mt-0.5">
              {practiceCategories[0] || 'Legal Advocate'}
              {practiceCategories.length > 1 ? ` +${practiceCategories.length - 1}` : ''}
            </p>

            {/* Location */}
            {(lawyer.operatingCity || jurisdictionCity) && (
              <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <MapPin className="w-3 h-3 text-rose-500/80 shrink-0" />
                <span className="truncate">{lawyer.operatingCity || jurisdictionCity}</span>
              </div>
            )}
          </div>

          {/* Status pill */}
          <span
            className={cn(
              'shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white shadow-sm',
              statusConfig.bg
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', statusConfig.dot)} />
            {statusConfig.label}
          </span>
        </div>

        {/* ── Stats ribbon ── */}
        <div className="mx-4 mb-3 grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden text-center">
          <div className="py-2 px-1">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {rating > 0 ? rating.toFixed(1) : '—'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Rating</div>
          </div>
          <div className="py-2 px-1">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {casesHandled > 0 ? `${casesHandled}+` : yearsOfPractice ? `${yearsOfPractice}y` : '—'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {casesHandled > 0 ? 'Cases' : 'Exp'}
            </div>
          </div>
          <div className="py-2 px-1">
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {favorableOutcomesRate > 0 ? `${favorableOutcomesRate}%` : consultationFee > 0 ? `₹${consultationFee}` : '—'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {favorableOutcomesRate > 0 ? 'Success' : 'Fee'}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-4 pb-4 space-y-3 flex-1 flex flex-col">
          {/* Bio */}
          {bio && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {bio}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            {languages?.length > 0 && (
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Languages className="w-3 h-3 text-indigo-400" />
                <span>{languages.join(', ')}</span>
              </div>
            )}
            {avgResponseMinutes > 0 && (
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>~{avgResponseMinutes} min</span>
              </div>
            )}
            {barCouncilNumber && (
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <GraduationCap className="w-3 h-3 text-indigo-400" />
                <span className="truncate">Bar: {barCouncilNumber}</span>
              </div>
            )}
          </div>

          {/* Practice category tags */}
          {practiceCategories?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {practiceCategories.slice(0, 3).map((c: string, i: number) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800"
                >
                  <Gavel className="w-2.5 h-2.5" />
                  {c}
                </span>
              ))}
              {practiceCategories.length > 3 && (
                <span className="text-[10px] text-slate-400 self-center">
                  +{practiceCategories.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Trust badges */}
          <div className="flex flex-wrap gap-1.5">
            <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-lg border border-rose-100 dark:border-rose-800">
              <MapPin className="w-3 h-3" />
              In-Person Visit
            </div>
            {isPoliceVerified && (
              <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3" />
                Police Verified
              </div>
            )}
            {notableCases.length > 0 && (
              <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-lg border border-violet-100 dark:border-violet-800">
                <Zap className="w-3 h-3" />
                {notableCases.length} Notable
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1 mt-auto">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 rounded-xl text-[11px] h-9 border-slate-200 dark:border-slate-700 hover:border-slate-900 hover:text-slate-900 dark:hover:border-slate-400 dark:hover:text-slate-100"
              onClick={() => navigate(profilePath)}
            >
              <User className="w-3.5 h-3.5" />
              View Profile
            </Button>
            <Button
              size="sm"
              className={cn(
                'flex-1 gap-1.5 rounded-xl text-[11px] h-9 border-0 text-white shadow-md',
                isAvailable
                  ? 'bg-gradient-to-r from-slate-900 to-slate-700 hover:from-black hover:to-slate-800 shadow-slate-900/25'
                  : 'bg-gradient-to-r from-zinc-700 to-zinc-500 hover:from-zinc-800 hover:to-zinc-600 shadow-zinc-700/20'
              )}
              onClick={() => setShowUrgentIntake(true)}
              title={
                isAvailable
                  ? 'Advocate is online — dispatch an urgent request now'
                  : 'Advocate is offline right now — your request will still be sent and queued on their console'
              }
            >
              <Gavel className="w-3.5 h-3.5" />
              {isAvailable ? 'Book Urgent' : 'Send Request'}
            </Button>
          </div>

          {/* Offline note — booking is still allowed, request gets queued */}
          {!isAvailable && (
            <p className="text-[10px] leading-snug text-center text-slate-500 dark:text-slate-400 pt-1">
              Offline right now — request will be queued &amp; the advocate is notified instantly
            </p>
          )}
        </div>
      </motion.div>

      <LawyerUrgentIntakeModal
        open={showUrgentIntake}
        onOpenChange={setShowUrgentIntake}
        lawyer={lawyer}
      />
    </>
  );
}
