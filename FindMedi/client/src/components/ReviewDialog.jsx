import { useState } from 'react';
import { Star, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';

/**
 * Reusable Review Submission Dialog.
 * 
 * Props:
 * - open: boolean
 * - onOpenChange: (open) => void
 * - entityType: 'doctor' | 'hospital' | 'clinic' | 'lab' | 'pharmacy' | 'technician'
 * - entityId: string (doctorId or hospitalId)
 * - entityName: string (name shown in dialog)
 * - onReviewSubmitted: (review) => void (callback after successful submission)
 */
export default function ReviewDialog({ open, onOpenChange, entityType, entityId, entityName, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [patientName, setPatientName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setRating(0);
    setHoverRating(0);
    setComment('');
    setPatientName('');
  };

  const handleSubmit = async () => {
    if (!rating) { toast.error('Please select a rating'); return; }
    if (!patientName.trim()) { toast.error('Please enter your name'); return; }

    setSubmitting(true);
    try {
      const body = {
        doctorId: entityId,
        doctorName: entityName,
        patientName: patientName.trim(),
        rating,
        comment: comment.trim(),
      };

      // If the entity is a hospital/lab/clinic, also set hospitalId
      if (['hospital', 'clinic', 'lab', 'pharmacy'].includes(entityType)) {
        body.hospitalId = entityId;
      }

      const review = await api.createReview(body);
      toast.success('Review submitted successfully!');
      onReviewSubmitted?.(review);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (isOpen) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] sm:w-full rounded-2xl">
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
          <DialogDescription>
            Share your experience with {entityName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Star Rating */}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground mb-2">How would you rate your experience?</p>
            <div className="flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      'w-8 h-8 transition-colors',
                      s <= (hoverRating || rating)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-muted-foreground/20'
                    )}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
              </p>
            )}
          </div>

          {/* Patient Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Your Name *</label>
            <input
              type="text"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              placeholder="Enter your name"
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Comment */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Your Review</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Share details of your experience..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => handleClose(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting || !rating || !patientName.trim()}>
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            ) : (
              <><Send className="w-4 h-4" /> Submit Review</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
