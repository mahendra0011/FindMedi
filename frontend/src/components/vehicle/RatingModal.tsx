import React, { useState } from 'react';
import { Star, Loader2, HeartHandshake } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rideId: string;
  driverName?: string;
  onSuccess?: () => void;
}

export default function RatingModal({
  open,
  onOpenChange,
  rideId,
  driverName = 'Driver',
  onSuccess,
}: RatingModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rideId) return;
    setSubmitting(true);
    try {
      await api.rateRide(rideId, { stars: rating, comment });
      toast.success('Thank you for your rating!');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6">
        <DialogHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center mb-2">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Rate Your Experience
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            How was your ride with <span className="font-semibold text-foreground">{driverName}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Star selector */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = hoverRating ? hoverRating >= star : rating >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1.5 focus:outline-none transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className={cn(
                      'w-8 h-8 transition-colors',
                      active ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/40'
                    )}
                  />
                </button>
              );
            })}
          </div>

          <div className="text-center">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              {rating === 5 && 'Excellent service!'}
              {rating === 4 && 'Good trip'}
              {rating === 3 && 'Average'}
              {rating === 2 && 'Needs improvement'}
              {rating === 1 && 'Poor experience'}
            </span>
          </div>

          {/* Feedback comment */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Leave a note (optional)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Cleanliness, punctuality, polite driver..."
              rows={3}
              className="resize-none rounded-xl text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl text-xs"
            >
              Skip
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-xl text-xs font-semibold"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Submit Feedback
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
