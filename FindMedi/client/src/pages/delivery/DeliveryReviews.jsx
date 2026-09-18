import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, ThumbsUp, Calendar, User, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function DeliveryReviews() {
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prof, allReviews] = await Promise.all([
        api.get('/delivery-partners/profile/me'),
        api.get('/reviews'),
      ]);
      setProfile(prof);
      const data = allReviews?.data || allReviews?.reviews || allReviews || [];
      setReviews(Array.isArray(data) ? data.filter((r) => r.deliveryPartnerId === prof._id || r.targetId === prof._id) : []);
    } catch {
      toast.error('Failed to load reviews');
    }
    setLoading(false);
  };

  const filtered = filter === 'all' ? reviews : reviews.filter((r) => r.rating >= (filter === 'positive' ? 4 : filter === 'negative' ? 1 : 0));

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : '0.0';
  const distribution = [0, 0, 0, 0, 0];
  reviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) distribution[5 - r.rating]++; });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Ratings & Reviews</h1>
        <p className="text-muted-foreground">See what customers say about your deliveries</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border p-6 text-center"
        >
          <p className="text-5xl font-bold text-foreground">{avgRating}</p>
          <div className="flex justify-center gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`w-5 h-5 ${s <= Math.round(Number(avgRating)) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">{reviews.length} reviews</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border p-5 md:col-span-2"
        >
          <h3 className="font-semibold text-foreground mb-3">Rating Distribution</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[5 - star];
              const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-8 text-muted-foreground">{star} ★</span>
                  <div className="flex-1 bg-muted/20 rounded-full h-2.5">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All Reviews' },
          { key: 'positive', label: 'Positive (4-5★)' },
          { key: 'negative', label: 'Needs Improvement (1-3★)' },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No reviews yet</p>
          <p className="text-xs text-muted-foreground mt-1">Reviews from customers will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r, i) => (
            <motion.div key={r._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{r.userName || r.patientName || 'Anonymous'}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3 h-3 ${s <= (r.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              {r.comment && (
                <p className="mt-3 text-sm text-muted-foreground bg-muted/20 rounded-lg p-3">{r.comment}</p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
