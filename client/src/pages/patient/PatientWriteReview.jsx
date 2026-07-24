import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Send, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function PatientWriteReview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getDoctors().then(d => setDoctors(d?.doctors || d?.data || d || [])).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!selectedDoctor || !rating) return;
    const doc = doctors.find(d => d._id === selectedDoctor);
    setSubmitting(true);
    try {
      await api.createReview({
        doctorId: selectedDoctor,
        doctorName: doc?.name || '',
        patientName: user?.name,
        rating,
        comment,
      });
      toast.success('Review submitted');
      navigate('/patient/reviews');
    } catch { toast.error('Failed to submit review'); }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/patient/reviews')} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Write a Review</h1>
          <p className="text-muted-foreground">Share your experience with a doctor</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border/60 p-6 max-w-lg">
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
          <Button variant="outline" className="flex-1" onClick={() => navigate('/patient/reviews')}>Cancel</Button>
          <Button className="flex-1 gap-2" onClick={handleSubmit} disabled={!selectedDoctor || !rating || submitting}>
            <Send className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
