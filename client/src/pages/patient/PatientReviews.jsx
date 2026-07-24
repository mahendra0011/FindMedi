import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Trash2, Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function PatientReviews() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await api.getReviews();
      const reviewsList = r?.reviews || r?.data || r || [];
      setReviews(Array.isArray(reviewsList) ? reviewsList.filter(rv => rv.patientName === user?.name) : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [user?.name]);

  const handleDelete = async (id) => {
    try { await api.deleteReview(id); loadData(); toast.success('Review deleted'); } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">My Reviews</h1>
          <p className="text-muted-foreground">Rate and review your doctors</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => navigate('/patient/reviews/write')}><Plus className="w-4 h-4" /> Write Review</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">You haven't written any reviews yet</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((rv, i) => (
            <motion.div key={rv._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-heading font-semibold text-foreground">{rv.doctorName}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= rv.rating ? 'text-warning fill-warning' : 'text-muted'}`} />
                    ))}
                  </div>
                </div>
                <button onClick={() => handleDelete(rv._id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {rv.comment && <p className="text-sm text-muted-foreground mb-3">{rv.comment}</p>}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" /><span>{rv.date}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
