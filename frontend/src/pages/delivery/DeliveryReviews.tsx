import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Star, Award, CheckCircle2, MessageSquare, ThumbsUp, 
  Sparkles, ShieldCheck, HeartHandshake, Filter
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const sampleReviews = [
  {
    id: 1,
    patientName: 'Dr. Ramesh Sharma',
    rating: 5,
    date: '22/9/2026',
    comment: 'Very fast medicine delivery! Arrived in under 20 minutes with sealed medicines and intact cold pack.',
    tag: 'Speedy Dispatch',
  },
  {
    id: 2,
    patientName: 'Priya Saxena',
    rating: 5,
    date: '21/8/2026',
    comment: 'Very polite rider. Verified the OTP carefully and delivered right to our 3rd floor apartment.',
    tag: 'Courteous Rider',
  },
  {
    id: 3,
    patientName: 'Aman Verma',
    rating: 4,
    date: '19/8/2026',
    comment: 'Good service, on-time delivery from Jabalpur Medical Store.',
    tag: 'Verified Delivery',
  },
];

export default function DeliveryReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all');

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      const [prof, dels] = await Promise.all([
        api.get('/delivery-partners/profile/me').catch(() => null),
        api.get('/delivery-partners/my-deliveries').catch(() => ({ history: [] })),
      ]);
      const fromProfile = prof?.reviews && Array.isArray(prof.reviews) ? prof.reviews : [];
      const fromHistory = (dels?.history || []).filter((d) => d.ratingByUser?.stars).map((d) => ({
        id: d._id,
        patientName: d.patientName || 'Customer',
        rating: d.ratingByUser.stars,
        date: d.deliveredAt,
        comment: d.ratingByUser.comment || '',
        tag: 'Verified Delivery',
      }));
      setReviews([...fromProfile, ...fromHistory]);
    } catch {
      // fallback
    }
    setLoading(false);
  };

  const reviewList = reviews;
  const filtered = filter === 'all'
    ? reviewList
    : reviewList.filter((r) => r.rating >= (filter === 'positive' ? 4 : 1) && (filter === 'negative' ? r.rating < 4 : true));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Loading rider reviews...</p>
      </div>
    );
  }

  const avgRating = reviewList.length > 0
    ? (reviewList.reduce((s, r) => s + (r.rating || 0), 0) / reviewList.length).toFixed(1)
    : 'New';

  return (
    <div className="space-y-6 w-full pb-12">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">
              Customer Ratings & Reviews
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Authentic feedback from patients and clinics across your medicine runs
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-success border-success/30 bg-success/10 text-xs px-3 py-1 rounded-full flex items-center gap-1.5 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4" /> 99.4% Fulfillment Score
        </Badge>
      </div>

      {/* ── Score & Distribution Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rating Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/80 bg-card p-6 text-center shadow-sm flex flex-col justify-center"
        >
          <div className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-warning bg-warning/10 px-3 py-1 rounded-full mb-3 mx-auto">
            <Award className="w-3.5 h-3.5" /> Express Rider Score
          </div>
          <p className="text-5xl font-black text-foreground">{avgRating}</p>
          <div className="flex justify-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-5 h-5 ${s <= Math.round(Number(avgRating)) ? 'text-amber-400 fill-amber-400' : 'text-muted/40'}`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 font-medium">
            Based on {reviewList.length} verified ratings
          </p>
        </motion.div>

        {/* Rating Distribution Progress */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border/80 bg-card p-6 md:col-span-2 shadow-sm space-y-3"
        >
          <h3 className="font-bold text-sm text-foreground">Star Rating Breakdown</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviewList.filter((r) => Math.round(r.rating) === star).length;
              const pct = reviewList.length > 0 ? (count / reviewList.length) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <span className="w-8 font-bold text-muted-foreground flex items-center gap-1">
                    {star} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right font-bold text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ── Filter Tabs ────────────────────────────────────────── */}
      <div className="flex gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/60 max-w-sm">
        {(['all', 'positive', 'negative'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
              filter === tab
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'all' ? 'All Reviews' : tab === 'positive' ? 'Positive (4-5★)' : 'Needs Attention'}
          </button>
        ))}
      </div>

      {/* ── Review Cards List ────────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.map((r, i) => (
          <motion.div
            key={r.id || i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {r.patientName?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground text-sm">{r.patientName || 'Verified Patient'}</p>
                    {r.tag && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                        {r.tag}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-muted/40'}`}
                      />
                    ))}
                    <span className="text-[11px] text-muted-foreground ml-2">{r.date || 'Recent'}</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic pl-1 leading-relaxed border-l-2 border-primary/40 ml-2">
              "{r.comment}"
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
