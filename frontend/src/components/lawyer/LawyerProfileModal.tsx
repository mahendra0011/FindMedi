import React from 'react';
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
  Video,
  Phone,
  UserCheck,
  MessageSquare,
  Scale,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lawyer: any;
  onBook: () => void;
}

const MODE_MAP: Record<string, { label: string; icon: any }> = {
  video: { label: 'Online Video Call', icon: Video },
  phone: { label: 'Phone Consultation', icon: Phone },
  in_person: { label: 'In-Person Chamber Visit', icon: UserCheck },
  chat: { label: 'In-App Chat Advisory', icon: MessageSquare },
};

export const LawyerProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lawyer,
  onBook,
}) => {
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
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-indigo-100 dark:border-indigo-900 shadow-md shrink-0"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-indigo-700 to-violet-600 text-white font-black text-3xl flex items-center justify-center shadow-md shrink-0">
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
            </div>

            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-md">
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

            {/* Ratings & Chamber Location */}
            <div className="flex items-center gap-3 mt-2 text-xs">
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
                className="px-2.5 py-1 text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 capitalize"
              >
                {cat.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </div>

        {/* Courts & Jurisdictions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              <Award className="w-4 h-4 text-indigo-600" />
              Courts & Tribunals
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {(lawyer.courtsPracticedIn || ['District Court']).join(', ')}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              <Languages className="w-4 h-4 text-indigo-600" />
              Languages Known
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {(lawyer.languages || ['Hindi', 'English']).join(', ')}
            </p>
          </div>
        </div>

        {/* Consultation Modes Offered */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
            Consultation Modes Offered
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(lawyer.consultationModes || ['video', 'phone']).map((m: string) => {
              const item = MODE_MAP[m] || { label: m, icon: Video };
              const Icon = item.icon;
              return (
                <div
                  key={m}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center gap-2 text-xs"
                >
                  <Icon className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fee & Duration Breakdown */}
        <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
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
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md px-6 py-2.5"
          >
            Book Consultation Now
          </Button>
        </div>
      </div>
    </div>
  );
};
