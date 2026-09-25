import React from 'react';
import { Star } from 'lucide-react';

interface LawyerReviewsTabProps {
  history: any[];
}

export const LawyerReviewsTab: React.FC<LawyerReviewsTabProps> = ({ history }) => {
  const ratedConsultations = history.filter((h) => h.ratingByUser?.stars);
  const avgRating =
    ratedConsultations.length > 0
      ? (
          ratedConsultations.reduce((s, h) => s + (h.ratingByUser.stars || 0), 0) /
          ratedConsultations.length
        ).toFixed(1)
      : null;

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Client Feedback & Testimonials
        </h3>
        {avgRating && (
          <span className="text-xs font-bold text-amber-600">
            ★ {avgRating} avg · {ratedConsultations.length} reviews
          </span>
        )}
      </div>

      {ratedConsultations.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">
          No ratings received yet. Ratings left by clients upon consultation completion will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {ratedConsultations.map((r, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {r.userId?.name || 'Verified Client'}
                </span>
                <div className="flex items-center text-amber-500 font-bold gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                  {r.ratingByUser?.stars} / 5
                </div>
              </div>
              <p className="text-slate-700 dark:text-slate-300 italic">
                "{r.ratingByUser?.comment || 'Helpful and professional guidance.'}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
