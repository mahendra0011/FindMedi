import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Star, Search, Trash2, Shield, AlertTriangle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getReviews();
      setReviews(data);
    } catch { toast.error('Failed to load reviews'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadReviews(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this review permanently?')) return;
    try { await api.deleteReview(id); loadReviews(); } catch { toast.error('Failed to delete review'); }
  };

  const filtered = search
    ? reviews.filter(r => r.doctorName?.toLowerCase().includes(search.toLowerCase()) || r.patientName?.toLowerCase().includes(search.toLowerCase()))
    : reviews;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Manage Reviews</h1>
        <p className="text-muted-foreground">Moderate patient reviews and feedback</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center"><Star className="w-5 h-5 text-warning" /></div>
          <div><p className="text-sm text-muted-foreground">Total Reviews</p><p className="font-heading text-xl font-bold">{reviews.length}</p></div>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><Shield className="w-5 h-5 text-success" /></div>
          <div><p className="text-sm text-muted-foreground">Avg Rating</p><p className="font-heading text-xl font-bold">{reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : 'N/A'}</p></div>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
          <div><p className="text-sm text-muted-foreground">Low Rating (1-2)</p><p className="font-heading text-xl font-bold">{reviews.filter(r => r.rating <= 2).length}</p></div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reviews by doctor or patient name..." className="pl-10" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No reviews found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((rv, i) => (
            <motion.div key={rv._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`bg-card rounded-2xl border p-5 hover:shadow-lg transition-all ${rv.rating <= 2 ? 'border-destructive/30' : 'border-border/60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground">{rv.patientName}</p>
                    <span className="text-xs text-muted-foreground">→</span>
                    <p className="text-sm text-primary font-medium">{rv.doctorName}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-4 h-4 ${s <= rv.rating ? 'text-warning fill-warning' : 'text-muted'}`} />)}
                    {rv.rating <= 2 && <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-destructive/10 text-destructive font-semibold">Flagged</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(rv._id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {rv.comment && (
                <div className="flex items-start gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">{rv.comment}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{rv.date}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
