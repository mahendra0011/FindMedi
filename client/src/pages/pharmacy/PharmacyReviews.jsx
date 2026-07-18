import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, User, Search, Calendar, Trash2, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function PharmacyReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const hospitalId = user?.hospitalId;
        const res = await api.getReviews({ hospitalId });
        const data = res.reviews || res || [];
        setReviews(Array.isArray(data) ? data : []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = reviews.filter(r => {
    const ms = !search || r.patientName?.toLowerCase().includes(search.toLowerCase()) || r.doctorName?.toLowerCase().includes(search.toLowerCase());
    const mr = !ratingFilter || r.rating === ratingFilter;
    return ms && mr;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Customer Reviews</h1>
        <p className="text-muted-foreground">{reviews.length} total reviews</p>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {[0, 5, 4, 3, 2, 1].map(r => (
          <button key={r} onClick={() => setRatingFilter(r === ratingFilter ? 0 : r)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${ratingFilter === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {r === 0 ? 'All' : <><Star className="w-3 h-3 fill-current" /> {r}</>}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by patient or doctor name..." className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No reviews found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r, i) => (
            <motion.div key={r._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-semibold text-foreground">{r.patientName}</h3>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground/20'}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">For Dr. {r.doctorName}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" /> {r.date || new Date(r.createdAt).toLocaleDateString()}
                    </div>
                    {r.comment && <p className="text-sm text-foreground mt-2 bg-muted/20 rounded-xl p-3">{r.comment}</p>}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}