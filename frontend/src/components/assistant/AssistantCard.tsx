import React from 'react';
import { Star, ShieldCheck, Languages } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface Props {
  assistant: any;
  onSelect: () => void;
  onViewDetails: () => void;
  isSelected?: boolean;
}

export const AssistantCard: React.FC<Props> = ({
  assistant,
  onSelect,
  onViewDetails,
  isSelected = false,
}) => {
  const user = assistant.userId || {};
  const avgRating = assistant.rating?.avg ? assistant.rating.avg.toFixed(1) : '5.0';
  const ratingCount = assistant.rating?.count || 0;
  const isAvailable = assistant.isAvailable;

  return (
    <div
      className={`relative p-5 rounded-2xl border transition-all duration-200 bg-white dark:bg-slate-900 flex flex-col justify-between ${
        isSelected
          ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-lg bg-teal-50/20 dark:bg-teal-950/10'
          : 'border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Top row: Avatar, Name, Rating, Online indicator */}
      <div>
        <div className="flex items-start gap-3.5">
          <div className="relative flex-shrink-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'Assistant'}
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                {(user.name || 'Assistant').charAt(0).toUpperCase()}
              </div>
            )}
            {isAvailable && (
              <span
                title="Available Now"
                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse"
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 truncate">
                {user.name || 'Assistant'}
              </h3>
              {assistant.isDocumentVerified && (
                <span title="Verified Assistant" className="inline-flex">
                  <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center text-amber-500 font-semibold gap-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-500" />
                {avgRating}
              </span>
              <span>({ratingCount} reviews)</span>
              <span>•</span>
              <span>{assistant.experienceYears || 1} yrs exp</span>
            </div>

            {/* Languages */}
            {assistant.languages && assistant.languages.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                <Languages className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{assistant.languages.slice(0, 3).join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Short Bio */}
        {assistant.bio && (
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic">
            "{assistant.bio}"
          </p>
        )}



        {/* Service Categories Tags */}
        {assistant.serviceCategories && assistant.serviceCategories.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {assistant.serviceCategories.slice(0, 3).map((cat: string) => (
              <Badge
                key={cat}
                variant="secondary"
                className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none"
              >
                {cat.replace('_', ' ')}
              </Badge>
            ))}
            {assistant.serviceCategories.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                +{assistant.serviceCategories.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Pricing & CTA */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400">Rate</div>
          <div className="text-base font-extrabold text-teal-700 dark:text-teal-400">
            ₹{assistant.pricePerHour || 150}
            <span className="text-xs font-normal text-slate-500">/hr</span>
          </div>
          {assistant.pricePerFullDay && (
            <div className="text-[10px] text-slate-400">₹{assistant.pricePerFullDay}/full day</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onViewDetails}
            className="text-xs h-8 px-2.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Profile
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onSelect}
            className={`text-xs h-8 px-3 font-semibold ${
              isSelected
                ? 'bg-teal-700 hover:bg-teal-800 text-white'
                : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
            }`}
          >
            {isSelected ? 'Selected' : 'Book Now'}
          </Button>
        </div>
      </div>
    </div>
  );
};
