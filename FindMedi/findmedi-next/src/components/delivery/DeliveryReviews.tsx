'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/endpoints';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export interface DeliveryReview {
  _id: string;
  rating: number;
  comment?: string;
  patientName?: string;
  createdAt?: string;
}

export interface DeliveryReviewsProps {
  onReviewSelect?: (review: DeliveryReview) => void;
}

export default function DeliveryReviews({ onReviewSelect }: DeliveryReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<DeliveryReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await api.getDeliveryReviews(user._id);
        setReviews((res.reviews as unknown) as DeliveryReview[]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load reviews');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  if (isLoading && reviews.length === 0) {
    return <p className="text-muted-foreground">Loading reviews...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Reviews</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && reviews.length === 0 ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : reviews.length === 0 ? (
          <p className="text-muted-foreground">No reviews found</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review._id} className="p-3 rounded border">
                <div className="flex items-start gap-3">
                  <div>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span
                          key={i}
                          className={`
                            text-yellow-500 text-xs flex items-center gap-1
                            ${i <= review.rating ? 'filled' : 'outlined'}
                          `}
                        >
                          ⭐
                        </span>
                      ))}
                    </div>
                    <p className="font-medium ml-2">{review.patientName || 'Patient'}</p>
                    <p className="text-xs text-muted-foreground">
                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>
                {onReviewSelect && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onReviewSelect?.(review)}
                  >
                    View
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}