import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Calendar, MessageSquare, Send, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function DoctorReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getReviews();
        setReviews(data.filter(r => r.doctorName === user?.name));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [user?.name]);

  const handleReply = async (reviewId) => {
    if (!replyText[reviewId]?.trim()) return;
    try {
      const updated = await api.replyToReview(reviewId, { reply: replyText[reviewId] });
      setReviews(prev => prev.map(r => r._id === reviewId ? updated : r));
      setReplyingId(null);
      setReplyText(prev => ({ ...prev, [reviewId]: '' }));
      toast.success('Reply posted');
    } catch (e) {
      toast.error('Failed to post reply');
    }
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0';
  const ratingDist = [5,4,3,2,1].map(r => ({ rating: r, count: reviews.filter(rv => rv.rating === r).length, pct: reviews.length > 0 ? (reviews.filter(rv => rv.rating === r).length / reviews.length * 100) : 0 }));

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My Reviews</h1>
        <p className="text-muted-foreground">See what patients are saying about you</p>
      </div>

      {/* Rating Summary */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="text-center">
            <p className="font-heading text-5xl font-extrabold text-foreground">{avgRating}</p>
            <div className="flex items-center gap-0.5 mt-1">
              {[1,2,3,4,5].map(s => <Star key={s} className={`w-5 h-5 ${s <= Math.round(avgRating) ? 'text-warning fill-warning' : 'text-muted'}`} />)}
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

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No reviews yet</div>
      ) : (
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
                      {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= rv.rating ? 'text-warning fill-warning' : 'text-muted'}`} />)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />{rv.date}
                </div>
              </div>
              {rv.comment && (
                <div className="flex items-start gap-2 mt-3">
                  <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">{rv.comment}</p>
                </div>
              )}
              {/* Doctor Reply */}
              {rv.reply && (
                <div className="mt-3 ml-6 p-3 bg-primary/5 rounded-xl border border-primary/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Reply className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">Your Reply</span>
                    {rv.repliedAt && (
                      <span className="text-xs text-muted-foreground">{new Date(rv.repliedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  <p className="text-sm text-foreground">{rv.reply}</p>
                </div>
              )}
              {/* Reply Button / Form */}
              {!rv.reply && replyingId !== rv._id && (
                <Button variant="ghost" size="sm" className="mt-3 gap-1.5 text-muted-foreground" onClick={() => { setReplyingId(rv._id); setReplyText(prev => ({ ...prev, [rv._id]: '' })); }}>
                  <Reply className="w-3.5 h-3.5" /> Reply
                </Button>
              )}
              {replyingId === rv._id && (
                <div className="mt-3 flex gap-2">
                  <textarea value={replyText[rv._id] || ''} onChange={e => setReplyText(prev => ({ ...prev, [rv._id]: e.target.value }))}
                    placeholder="Write your reply..."
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-20" />
                  <div className="flex flex-col gap-2">
                    <Button size="sm" className="gap-1" onClick={() => handleReply(rv._id)} disabled={!replyText[rv._id]?.trim()}>
                      <Send className="w-3.5 h-3.5" /> Post
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setReplyingId(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
