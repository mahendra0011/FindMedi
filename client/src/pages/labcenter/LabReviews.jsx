import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Calendar, MessageSquare, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function LabReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const hospitalId = user?.facilityId || user?.hospitalId || user?._id;
        const data = await api.getReviews({ hospitalId });
        setReviews(data?.length > 0 ? data : []);
      } catch (error) {
        console.error(error);
        setReviews([]);
        toast.error('Failed to load reviews');
      }
    };
    fetchReviews();
  }, [user]);

  const handleDelete = async (id) => {
    try {
      await api.deleteReview(id);
      setReviews(prev => prev.filter(r => r._id !== id));
      toast.success('Review deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete review');
    }
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0';
  const ratingDist = [5, 4, 3, 2, 1].map(r => ({
    rating: r,
    count: reviews.filter(rv => rv.rating === r).length,
    pct: reviews.length > 0 ? (reviews.filter(rv => rv.rating === r).length / reviews.length * 100) : 0,
  }));

  if (reviews.length === 0) {
    return (
      <div className="space-y-6">
        <div><h1 className="font-heading text-2xl font-bold text-foreground">Reviews & Ratings</h1><p className="text-muted-foreground">Patient feedback about your lab</p></div>
        <div className="text-center py-20 text-muted-foreground">No reviews yet</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Reviews & Ratings</h1>
        <p className="text-muted-foreground">Patient feedback about your lab services</p>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="text-center">
            <p className="font-heading text-5xl font-extrabold text-foreground">{avgRating}</p>
            <div className="flex items-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={`w-5 h-5 ${s <= Math.round(Number(avgRating)) ? 'text-warning fill-warning' : 'text-muted'}`} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{reviews.length} reviews</p>
          </div>
          <div className="flex-1 w-full space-y-1.5">
            {ratingDist.map(d => (
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
          <motion.div key={rv._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl border border-border/60 p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {rv.patientName?.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-foreground">{rv.patientName}</p>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= rv.rating ? 'text-warning fill-warning' : 'text-muted'}`} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDelete(rv._id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />{rv.date}
                </div>
              </div>
            </div>
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
