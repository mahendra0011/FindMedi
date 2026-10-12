import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, ThumbsUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export interface FeedbackPromptProps {
  context: 'visit' | 'pharmacy' | 'lab' | 'admission' | 'teleconsult' | 'other';
  refModel?: 'Appointment' | 'Admission' | 'PharmacyOrder' | 'LabOrder' | 'Teleconsult' | 'Other';
  refId?: string;
  department?: string;
  title?: string;
  description?: string;
  onDone?: (submitted: boolean) => void;
  onSkip?: () => void;
  inline?: boolean;
}

export default function FeedbackPrompt({
  context,
  refModel,
  refId,
  department = '',
  title = 'How likely are you to recommend us?',
  description = 'Your feedback directly helps our clinical and support teams improve care.',
  onDone,
  onSkip,
  inline = false,
}: FeedbackPromptProps) {
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [checking, setChecking] = useState(Boolean(refId));

  // Check if user already submitted feedback for this reference
  useEffect(() => {
    if (!refId) {
      setChecking(false);
      return;
    }
    let isMounted = true;
    (async () => {
      try {
        const res: any = await api.get(`/feedback/mine?refId=${encodeURIComponent(refId)}`);
        if (isMounted && res?.hasSubmitted) {
          setHasSubmitted(true);
        }
      } catch {
        // fail-soft: allow submission attempt
      } finally {
        if (isMounted) setChecking(false);
      }
    })();
    return () => { isMounted = false; };
  }, [refId]);

  if (checking) {
    return null;
  }

  if (hasSubmitted) {
    return (
      <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground bg-muted/40 rounded-lg border border-border/50">
        <ThumbsUp className="w-4 h-4 text-primary" />
        <span>You have already submitted feedback for this visit. Thank you!</span>
      </div>
    );
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (npsScore === null && rating === 0) {
      toast.error('Please select an NPS score (0-10) or star rating (1-5)');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        context,
        department: department || undefined,
        comment: comment.trim() || undefined,
        refModel: refModel || undefined,
        refId: refId || undefined,
      };
      if (npsScore !== null) payload.npsScore = npsScore;
      if (rating > 0) payload.rating = rating;

      await api.post('/feedback', payload);
      toast.success('Thank you for sharing your experience!');
      setHasSubmitted(true);
      onDone?.(true);
    } catch (err: any) {
      if (err?.response?.status === 409 || err?.code === 'FEEDBACK_DUPLICATE') {
        toast.info('Feedback for this visit was already recorded.');
        setHasSubmitted(true);
        onDone?.(true);
      } else {
        toast.error(err?.response?.data?.message || err?.message || 'Failed to submit feedback');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getNpsStyle = (score: number) => {
    const isSelected = npsScore === score;
    if (score <= 6) {
      return isSelected
        ? 'bg-red-500 text-white border-red-600 shadow-sm'
        : 'bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-300 dark:border-red-900/50';
    }
    if (score <= 8) {
      return isSelected
        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
        : 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-300 dark:border-amber-900/50';
    }
    return isSelected
      ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
      : 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-300 dark:border-emerald-900/50';
  };

  const containerClasses = inline
    ? 'p-4 rounded-xl border border-border bg-card'
    : 'w-full max-w-xl mx-auto shadow-sm';

  return (
    <Card className={containerClasses} role="region" aria-label="Patient Feedback Prompt">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              {title}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {description}
            </CardDescription>
          </div>
          {onSkip && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={onSkip}
              aria-label="Skip feedback"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* NPS 0-10 Button Scale */}
        <div>
          <div className="flex justify-between items-center text-[11px] text-muted-foreground mb-1.5 px-0.5 font-medium">
            <span>0 = Not likely at all</span>
            <span>10 = Extremely likely</span>
          </div>
          <div
            className="grid grid-cols-11 gap-1"
            role="radiogroup"
            aria-label="Net Promoter Score scale 0 to 10"
          >
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={npsScore === i}
                aria-label={`Score ${i} out of 10`}
                className={`h-9 text-xs font-semibold rounded-md border transition-all flex items-center justify-center ${getNpsStyle(i)}`}
                onClick={() => setNpsScore(i)}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        {/* 1-5 Star Quick Rating */}
        <div className="flex items-center gap-3 pt-1">
          <span className="text-xs text-muted-foreground">Overall rating:</span>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="1 to 5 star rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                className="p-1 rounded hover:bg-muted/60 transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
                onClick={() => setRating(star)}
              >
                <Star
                  className={`w-5 h-5 ${
                    star <= rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/40 hover:text-amber-400/60'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Comment Textarea */}
        <div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 2000))}
            placeholder="Tell us what went well, or what we can do better (optional)..."
            className="text-xs resize-none h-18"
            maxLength={2000}
            aria-label="Additional comments"
          />
          <div className="flex justify-end text-[10px] text-muted-foreground mt-1">
            {comment.length} / 2000
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
          {onSkip && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSkip}
              disabled={submitting}
              className="text-xs"
            >
              Skip for now
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => handleSubmit()}
            disabled={submitting || (npsScore === null && rating === 0)}
            className="text-xs"
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
