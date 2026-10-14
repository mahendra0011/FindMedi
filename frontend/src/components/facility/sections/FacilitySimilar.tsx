import { Link } from 'react-router-dom';
import { Star, MapPin, ChevronRight, Building2 } from 'lucide-react';

export interface SimilarFacility {
  id: string;
  name: string;
  route: string;
  category?: string;
  rating?: number;
  reviewsCount?: number;
  distanceKm?: string;
  priceFrom?: number;
}

export interface FacilitySimilarProps {
  facilities: SimilarFacility[];
  title?: string;
}

export default function FacilitySimilar({ facilities, title = 'Similar Nearby' }: FacilitySimilarProps) {
  if (!facilities?.length) return null;

  return (
    <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
      <h3 className="font-bold text-base text-foreground">{title}</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {facilities.map((f) => (
          <Link
            key={f.id}
            to={f.route}
            className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/30 hover:bg-primary/[0.02] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground truncate">{f.name}</p>
              {f.category && <p className="text-[11px] text-muted-foreground truncate">{f.category}</p>}
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                {typeof f.rating === 'number' && f.rating > 0 && (
                  <span className="inline-flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    {f.rating.toFixed(1)}
                    {typeof f.reviewsCount === 'number' && <span>({f.reviewsCount})</span>}
                  </span>
                )}
                {f.distanceKm && (
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" /> {f.distanceKm} km
                  </span>
                )}
                {typeof f.priceFrom === 'number' && f.priceFrom > 0 && (
                  <span className="font-semibold text-primary">from ₹{f.priceFrom}</span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
