import React, { useEffect, useState } from 'react';
import {
  X,
  Star,
  MapPin,
  ShieldCheck,
  Languages,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { api } from '../../lib/api';

interface Props {
  assistant: any;
  isOpen: boolean;
  onClose: () => void;
  onBook: () => void;
}

export const AssistantProfileModal: React.FC<Props> = ({
  assistant,
  isOpen,
  onClose,
  onBook,
}) => {
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && assistant?._id) {
      setLoadingReviews(true);
      api
        .getAssistantById(assistant._id)
        .then((res: any) => {
          if (res?.reviews) {
            setReviews(res.reviews);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingReviews(false));
    }
  }, [isOpen, assistant]);

  if (!isOpen || !assistant) return null;

  const user = assistant.userId || {};
  const avgRating = assistant.rating?.avg ? assistant.rating.avg.toFixed(1) : '5.0';
  const ratingCount = assistant.rating?.count || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Profile Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'Assistant'}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-teal-500 shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white font-black text-2xl shadow-md">
                {(user.name || 'Assistant').charAt(0).toUpperCase()}
              </div>
            )}
            {assistant.isAvailable && (
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full shadow-sm">
                ONLINE
              </span>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {user.name || 'Assistant'}
              </h2>
              {assistant.isDocumentVerified && (
                <Badge variant="outline" className="text-xs text-teal-600 border-teal-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Caretaker
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center text-amber-500 font-bold gap-1">
                <Star className="w-4 h-4 fill-amber-500" />
                {avgRating} ({ratingCount} reviews)
              </span>
              <span>•</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {assistant.experienceYears || 1} Years Experience
              </span>
            </div>

            {assistant.languages && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-600 dark:text-slate-400">
                <Languages className="w-3.5 h-3.5 text-teal-600" />
                <span>Languages: <strong>{assistant.languages.join(', ')}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Card */}
        <div className="mt-6 p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
              Service Fee
            </div>
            <div className="text-2xl font-black text-teal-900 dark:text-teal-200">
              ₹{assistant.pricePerHour || 150}
              <span className="text-sm font-normal text-slate-600 dark:text-slate-400"> / hour</span>
            </div>
            {assistant.pricePerFullDay && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Full Day (8 hrs): ₹{assistant.pricePerFullDay}
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={() => {
              onClose();
              onBook();
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md"
          >
            Book This Assistant
          </Button>
        </div>

        {/* Bio */}
        {assistant.bio && (
          <div className="mt-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              About Me
            </h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              {assistant.bio}
            </p>
          </div>
        )}

        {/* Hospitals Covered */}
        {assistant.hospitalsCovered && (
          <div className="mt-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Hospitals Covered
            </h4>
            <div className="flex flex-wrap gap-2">
              {assistant.hospitalsCovered.map((h: string) => (
                <Badge
                  key={h}
                  variant="secondary"
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <MapPin className="w-3 h-3 text-teal-600" />
                  {h}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Services Offered */}
        {assistant.serviceCategories && (
          <div className="mt-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Assistance Services Offered
            </h4>
            <div className="flex flex-wrap gap-2">
              {assistant.serviceCategories.map((cat: string) => (
                <Badge
                  key={cat}
                  className="px-3 py-1 bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  {cat.replace('_', ' ').toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Recent Patient Feedback ({reviews.length})
          </h4>

          {loadingReviews ? (
            <div className="py-6 text-center text-xs text-slate-400">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="py-4 text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl text-center">
              No written reviews yet. High platform satisfaction rating of {avgRating} ⭐.
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {rev.patientId?.name || 'Verified Patient'}
                    </span>
                    <div className="flex items-center text-amber-500">
                      {Array.from({ length: rev.ratingByPatient?.stars || 5 }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-500" />
                      ))}
                    </div>
                  </div>
                  {rev.ratingByPatient?.comment && (
                    <p className="mt-1.5 text-slate-600 dark:text-slate-300 italic">
                      "{rev.ratingByPatient.comment}"
                    </p>
                  )}
                  <div className="mt-2 text-[10px] text-slate-400">
                    Hospital: {rev.hospital || 'Hospital Campus'} •{' '}
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
