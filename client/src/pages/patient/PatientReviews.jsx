import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Send, Trash2, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function PatientReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [r, d] = await Promise.all([api.getReviews(), api.getDoctors()]);
      setReviews(r.filter(rv => rv.patientName === user?.name));
      setDoctors(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user?.name]);

  const handleSubmit = async () => {
    if (!selectedDoctor || !rating) return;
    const doc = doctors.find(d => d._id === selectedDoctor);
    try {
      await api.createReview({
        doctorId: selectedDoctor,
        doctorName: doc?.name || '',
        patientName: user?.name,
        rating,
        comment,
      });
      setShowForm(false); setSelectedDoctor(''); setRating(0); setComment('');
      loadData();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    try { await api.deleteReview(id); loadData(); } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">My Reviews</h1>
          <p className="text-muted-foreground">Rate and review your doctors</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => setShowForm(true)}><Star className="w-4 h-4" /> Write Review</Button>
      </div>

      {/* Reviews List */}
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

      {/* Write Review Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Write a Review</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Select Doctor</label>
                <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                  <option value="">Choose a doctor...</option>
                  {doctors.map(d => <option key={d._id} value={d._id}>{d.name} - {d.specialization}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Rating</label>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setRating(s)} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)}>
                      <Star className={`w-8 h-8 transition-colors ${s <= (hoverRating || rating) ? 'text-warning fill-warning' : 'text-muted'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Your Review</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Share your experience..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-24" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleSubmit} disabled={!selectedDoctor || !rating}>
                <Send className="w-4 h-4" /> Submit
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
