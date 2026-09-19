import React from 'react';
import {
  Scale,
  Star,
  ShieldCheck,
  Languages,
  Clock,
  MapPin,
  UserCheck,
  Award,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface Props {
  lawyer: any;
  onSelect: () => void;
  onViewDetails: () => void;
  isSelected?: boolean;
}

export const LawyerCard: React.FC<Props> = ({
  lawyer,
  onSelect,
  onViewDetails,
  isSelected = false,
}) => {
  const user = lawyer.userId || {};
  const avgRating = lawyer.rating?.avg ? lawyer.rating.avg.toFixed(1) : '5.0';
  const ratingCount = lawyer.rating?.count || 0;
  const isAvailable = lawyer.isAvailable;
  const sessionFee = lawyer.consultationFee || 500;
  const duration = lawyer.sessionDuration || 30;

  return (
    <div
      className={`relative p-5 rounded-3xl border transition-all duration-200 bg-white dark:bg-slate-900 flex flex-col justify-between ${
        isSelected
          ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-xl bg-indigo-50/20 dark:bg-indigo-950/10'
          : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm hover:shadow-md'
      }`}
    >
      <div>
        {/* Top Header: Avatar, Name, Bar Registration, Verification Badge */}
        <div className="flex items-start gap-3.5">
          <div className="relative flex-shrink-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'Advocate'}
                className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-700 to-violet-600 flex items-center justify-center text-white font-black text-xl shadow-sm">
                {(user.name || 'Advocate').charAt(0).toUpperCase()}
              </div>
            )}
            {isAvailable && (
              <span
                title="Available for consultation now"
                className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse"
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate">
                Adv. {user.name || 'Legal Advocate'}
              </h3>
              {lawyer.isDocumentVerified && (
                <ShieldCheck
                  className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                  title="Bar Council Verified Advocate"
                />
              )}
              {lawyer.isPoliceVerified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Police Verified
                </span>
              )}
            </div>

            {/* Bar Council Number & Experience */}
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md text-[11px]">
                🎓 Bar Reg: {lawyer.barCouncilNumber || 'Enrolled'}
              </span>
              <span>•</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {lawyer.yearsOfPractice || 3}+ yrs practice
              </span>
            </div>

            {/* Rating & Reviews & Metrics */}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center text-amber-500 font-bold gap-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-500" />
                {avgRating}
              </span>
              <span>({ratingCount} reviews)</span>
              {lawyer.favorableOutcomesRate && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <TrendingUp className="w-3 h-3" />
                    {lawyer.favorableOutcomesRate}% success
                  </span>
                </>
              )}
              {lawyer.avgResponseMinutes && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    <Clock className="w-3 h-3" />
                    ~{lawyer.avgResponseMinutes}m response
                  </span>
                </>
              )}
              {lawyer.jurisdictionCity && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-0.5 text-slate-500">
                    <MapPin className="w-3 h-3" />
                    {lawyer.jurisdictionCity}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bio Snippet */}
        {lawyer.bio && (
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic leading-relaxed">
            "{lawyer.bio}"
          </p>
        )}

        {/* Practice Categories */}
        {lawyer.practiceCategories && lawyer.practiceCategories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {lawyer.practiceCategories.slice(0, 3).map((cat: string) => (
              <Badge
                key={cat}
                variant="secondary"
                className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none capitalize"
              >
                {cat.replace(/_/g, ' ')}
              </Badge>
            ))}
            {lawyer.practiceCategories.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                +{lawyer.practiceCategories.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Courts Practiced In */}
        {lawyer.courtsPracticedIn && lawyer.courtsPracticedIn.length > 0 && (
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
            <Award className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">
              Courts: {lawyer.courtsPracticedIn.join(', ')}
            </span>
          </div>
        )}

        {/* Languages */}
        {lawyer.languages && lawyer.languages.length > 0 && (
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Languages className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{lawyer.languages.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Bottom Footer: Modes, Fees, & Action Buttons */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between mb-3.5">
          {/* Mode */}
          <div className="flex items-center gap-1.5">
            <div
              title="In-Person Chamber & Hospital Visit"
              className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 text-purple-700 dark:text-purple-300 text-xs font-semibold"
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>In-Person Visit</span>
            </div>
          </div>

          {/* Fee */}
          <div className="text-right">
            <div className="text-base font-black text-slate-900 dark:text-slate-100">
              ₹{sessionFee}
            </div>
            <div className="text-[10px] text-slate-500">
              per session ({duration} min)
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="rounded-xl text-xs font-semibold"
          >
            View Profile
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSelect}
            className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            Book Consult
          </Button>
        </div>
      </div>
    </div>
  );
};
