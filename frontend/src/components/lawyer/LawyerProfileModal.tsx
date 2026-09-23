import React, { useState } from 'react';
import {
  X,
  Star,
  ShieldCheck,
  Languages,
  Award,
  Clock,
  Calendar,
  IndianRupee,
  MapPin,
  CheckCircle2,
  UserCheck,
  Scale,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
  MessageCircleQuestion,
  Trophy,
  Briefcase,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lawyer: any;
  onBook: () => void;
}

export const LawyerProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lawyer,
  onBook,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  if (!isOpen || !lawyer) return null;

  const user = lawyer.userId || {};
  const avgRating = lawyer.rating?.avg ? lawyer.rating.avg.toFixed(1) : '5.0';
  const ratingCount = lawyer.rating?.count || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header Profile Section */}
        <div className="flex items-start gap-4 sm:gap-5">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name || 'Advocate'}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-md shrink-0"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-black to-slate-800 text-white font-black text-3xl flex items-center justify-center shadow-md shrink-0">
              {(user.name || 'Advocate').charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0 pr-8">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                Adv. {user.name || 'Advocate'}
              </h2>
              {lawyer.isDocumentVerified && (
                <Badge className="bg-emerald-600 text-white font-bold gap-1 text-[11px] px-2 py-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Bar Verified
                </Badge>
              )}
              {lawyer.isPoliceVerified && (
                <Badge className="bg-slate-900 text-white font-bold gap-1 text-[11px] px-2 py-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Police Verified
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
              <span className="font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-white/10 px-2.5 py-0.5 rounded-md">
                Bar Reg: {lawyer.barCouncilNumber || 'Enrolled Advocate'}
              </span>
              <span>•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {lawyer.yearsOfPractice || 3}+ Years Experience
              </span>
              {lawyer.stateBarCouncil && (
                <>
                  <span>•</span>
                  <span>{lawyer.stateBarCouncil}</span>
                </>
              )}
            </div>

            {/* Ratings, Response Time & Session Status */}
            <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
              <span className="flex items-center text-amber-500 font-bold gap-1">
                <Star className="w-4 h-4 fill-amber-500" />
                {avgRating} ({ratingCount} reviews)
              </span>
              {lawyer.jurisdictionCity && (
                <span className="flex items-center gap-1 text-slate-500">
                  <MapPin className="w-3.5 h-3.5" />
                  {lawyer.jurisdictionCity}
                </span>
              )}
              {lawyer.avgResponseMinutes > 0 && (
                <span className="flex items-center gap-1 text-slate-900 dark:text-slate-200 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  ~{lawyer.avgResponseMinutes} min response
                </span>
              )}
              {lawyer.currentSessionStatus === 'in_session' && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold gap-1 text-[10px] px-2 py-0.5 border border-amber-500/30">
                  <Zap className="w-3 h-3" /> Currently In a Session
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {lawyer.bio && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
              About & Legal Practice
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {lawyer.bio}
            </p>
          </div>
        )}

        {/* Practice Categories */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
            Practice Specializations
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {(lawyer.practiceCategories || []).map((cat: string) => (
              <Badge
                key={cat}
                variant="secondary"
                className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-700 capitalize"
              >
                {cat.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </div>

        {/* Success Metrics & Trust Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-center">
            <div className="text-lg font-black text-emerald-700 dark:text-emerald-400">
              {lawyer.favorableOutcomesRate || 0}%
            </div>
            <div className="text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-500/80 mt-0.5 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" /> Success Rate
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-white/10 border border-slate-200 dark:border-slate-700 text-center">
            <div className="text-lg font-black text-slate-900 dark:text-slate-200">
              {lawyer.casesHandled || 0}+
            </div>
            <div className="text-[10px] font-semibold text-slate-900 dark:text-slate-300/80 mt-0.5 flex items-center justify-center gap-1">
              <Scale className="w-3 h-3" /> Cases Handled
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-center">
            <div className="text-lg font-black text-amber-700 dark:text-amber-400">
              ~{lawyer.avgResponseMinutes || 12}m
            </div>
            <div className="text-[10px] font-semibold text-amber-600/80 dark:text-amber-500/80 mt-0.5 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> Avg Response
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-white/10 border border-slate-200 dark:border-slate-700 text-center">
            <div className="text-lg font-black text-slate-900 dark:text-slate-100">
              {lawyer.yearsAtCurrentPractice || lawyer.yearsOfPractice || 1}y
            </div>
            <div className="text-[10px] font-semibold text-slate-900 dark:text-slate-300/80 mt-0.5 flex items-center justify-center gap-1">
              <Briefcase className="w-3 h-3" /> {lawyer.practiceType === 'firm' ? 'At Firm' : 'Independent'}
            </div>
          </div>
        </div>

        {/* Courts & Jurisdictions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              <Award className="w-4 h-4 text-slate-900 dark:text-slate-100" />
              Courts & Tribunals
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {(lawyer.courtsPracticedIn || ['District Court']).join(', ')}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              <Languages className="w-4 h-4 text-slate-900 dark:text-slate-100" />
              Languages Known
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {(lawyer.languages || ['Hindi', 'English']).join(', ')}
            </p>
          </div>
        </div>

        {/* Notable Cases & Track Record */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-slate-900 dark:text-slate-100" />
            Notable Cases & Track Record
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(lawyer.notableCases && lawyer.notableCases.length > 0
              ? lawyer.notableCases
              : [
                  'Handled 18+ Hospital Negligence Claims',
                  'Resolved ₹45L+ Cashless Insurance Rejection Disputes',
                  '25+ Medico-Legal MLC Court Appearances',
                ]
            ).map((c: string, idx: number) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-medium">{c}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Honors & Accreditations */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500" />
            Honors & Accreditations
          </h4>
          <div className="flex flex-wrap gap-2">
            {(lawyer.awards && lawyer.awards.length > 0
              ? lawyer.awards
              : [
                  'Distinguished Medico-Legal Advocate (Bar Association)',
                  'Consumer Rights Defender Award',
                ]
            ).map((award: string, idx: number) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 text-xs font-semibold"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                {award}
              </span>
            ))}
          </div>
        </div>

        {/* Frequently Asked Questions */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <MessageCircleQuestion className="w-4 h-4 text-slate-900 dark:text-slate-100" />
            Frequently Asked Questions
          </h4>
          <div className="space-y-2">
            {(lawyer.faqs && lawyer.faqs.length > 0
              ? lawyer.faqs
              : [
                  {
                    question: 'Do you visit the hospital in person for urgent consultation?',
                    answer:
                      'Yes, within my operating jurisdiction, I visit hospital ICUs, admission desks, or client wards for in-person advisory.',
                  },
                  {
                    question: 'What documents should I prepare before our session?',
                    answer:
                      'Keep hospital admission records, discharge summary, treatment bills, diagnostic test reports, and any written correspondence with the hospital.',
                  },
                  {
                    question: 'Can you assist with immediate police MLC formalities?',
                    answer:
                      'Yes, I guide patients and families on MLC statements, police reporting in trauma cases, and preserving crucial medical evidence.',
                  },
                ]
            ).map((faq: { question: string; answer: string }, idx: number) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Consultation Mode */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
            Consultation Mode
          </h4>
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-100/40 dark:bg-white/10 flex items-center gap-2.5 text-xs">
            <UserCheck className="w-4 h-4 text-slate-900 dark:text-slate-100 shrink-0" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              In-Person Chamber & Hospital Visit
            </span>
          </div>
        </div>

        {/* Fee & Duration Breakdown */}
        <div className="p-4 rounded-2xl bg-slate-100/60 dark:bg-white/10 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Consultation Fee
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
              ₹{lawyer.consultationFee || 500}
              <span className="text-xs font-normal text-slate-500">
                {' '}
                / session ({lawyer.sessionDuration || 30} mins)
              </span>
            </div>
            {lawyer.freeFirstConsultation && (
              <span className="inline-block mt-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                ✓ Free First Consultation Eligible
              </span>
            )}
          </div>

          <Button
            type="button"
            onClick={onBook}
            className="w-full sm:w-auto bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md px-6 py-2.5"
          >
            Book Consultation Now
          </Button>
        </div>
      </div>
    </div>
  );
};
