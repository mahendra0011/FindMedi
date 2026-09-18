import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Flag, Star, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

function ContentModerationTab() {
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter === 'flagged' ? { flagged: 'true' } : {};
      const data = await api.getFlaggedReviews(params);
      setReviews(data?.reviews || data?.data || data || []);
    } catch { toast.error('Failed to load reviews'); }
    setLoading(false);
  }, [filter]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchReviews(); }, [filter]);

  const handleFlag = async (id, reason = '') => {
    try { await api.flagReview(id, { reason }); fetchReviews(); } catch { toast.error('Failed to flag review'); }
  };

  const handleUnflag = async (id) => {
    try { await api.unflagReview(id); fetchReviews(); } catch { toast.error('Failed to unflag review'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this review permanently?')) return;
    try { await api.deleteReview(id); fetchReviews(); } catch { toast.error('Failed to delete review'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {['all', 'flagged'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {f === 'all' ? 'All Reviews' : 'Flagged'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Flag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{filter === 'flagged' ? 'No flagged reviews' : 'No reviews found'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r._id} className="bg-card rounded-xl border p-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-foreground">{r.patientName}</p>
                  <span className="text-xs text-muted-foreground">→</span>
                  <p className="font-medium text-foreground">{r.doctorName}</p>
                  {r.flagged && (
                    <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Flagged</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-warning fill-warning' : 'text-muted'}`} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">({r.date})</span>
                </div>
                {r.comment && <p className="text-sm text-muted-foreground line-clamp-2">{r.comment}</p>}
                {r.flagReason && <p className="text-xs text-destructive mt-1">Reason: {r.flagReason}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.flagged ? (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => handleUnflag(r._id)}>
                    <Eye className="w-3.5 h-3.5" /> Unflag
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => handleFlag(r._id, 'Moderator review')}>
                    <Flag className="w-3.5 h-3.5" /> Flag
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => handleDelete(r._id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ContentModerationTab;
