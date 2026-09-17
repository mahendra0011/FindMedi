/**
 * Reviews & Ratings — ported from client/src/pages/labcenter/LabReviews.jsx (Phase 4).
 * Patient feedback about lab services with delete.
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Star, Calendar, MessageSquare, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { reviews as reviewsApi } from '@/lib/api';

interface LabReview {
  _id: string;
  patientName?: string;
  rating: number;
  date?: string;
  comment?: string;
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const u = user as unknown as { facilityId?: string; hospitalId?: string; id?: string } | null;
  const hospitalId = u?.facilityId ?? u?.hospitalId ?? u?.id ?? '';

  const { data: reviewsData } = useQuery({
    queryKey: ['lab-reviews', hospitalId],
    queryFn: async (): Promise<LabReview[]> => {
      try {
        const res = await reviewsApi.get(hospitalId ? { hospitalId } : {});
        const data = (Array.isArray(res) ? res : []) as unknown as LabReview[];
        return data;
      } catch (e) {
        console.error(e);
        toast.error('Failed to load reviews');
        return [];
      }
    },
    staleTime: 60_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => reviewsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-reviews'] }),
  });

  const reviews = reviewsData ?? [];
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    deleteMut.mutate(id, {
      onSuccess: () => {
        toast.success('Review deleted');
        setConfirmId(null);
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete review'),
    });
  };

  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const avgRating = avg.toFixed(1);
  const ratingDist = [5, 4, 3, 2, 1].map((r) => {
    const count = reviews.filter((rv) => rv.rating === r).length;
    return { rating: r, count, pct: reviews.length > 0 ? (count / reviews.length) * 100 : 0 };
  });

  if (reviews.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reviews & Ratings</h1>
          <p className="text-muted-foreground">Patient feedback about your lab</p>
        </div>
        <div className="text-center py-20 text-muted-foreground">No reviews yet</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reviews & Ratings</h1>
        <p className="text-muted-foreground">Patient feedback about your lab services</p>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="text-center">
            <p className="text-5xl font-extrabold text-foreground">{avgRating}</p>
            <div className="flex items-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`w-5 h-5 ${s <= Math.round(avg) ? 'text-warning fill-warning' : 'text-muted'}`} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{reviews.length} reviews</p>
          </div>
          <div className="flex-1 w-full space-y-1.5">
            {ratingDist.map((d) => (
              <div key={d.rating} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-3">{d.rating}</span>
                <Star className="w-3 h-3 text-warning fill-warning" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-warning rounded-full transition-all" style={{ width: `${d.pct}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-6 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((rv, i) => (
          <motion.div
            key={rv._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl border border-border/60 p-5"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {rv.patientName?.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-foreground">{rv.patientName}</p>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= rv.rating ? 'text-warning fill-warning' : 'text-muted'}`} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => (confirmId === rv._id ? handleDelete(rv._id) : setConfirmId(rv._id))}
                  className="text-muted-foreground hover:text-destructive transition-colors text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  {rv.date}
                </div>
              </div>
            </div>
            {confirmId === rv._id && (
              <p className="text-xs text-destructive mb-2">Click trash again to confirm delete</p>
            )}
            {rv.comment && (
              <div className="flex items-start gap-2 mt-3">
                <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{rv.comment}</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
