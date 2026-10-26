import { useState } from 'react';
import {
  Star,
  MapPin,
  Clock,
  BadgeCheck,
  Heart,
  Share2,
  Flag,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Phone,
  Navigation,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface FacilityHeroProps {
  facility: {
    _id?: string;
    id?: string;
    name: string;
    tagline?: string;
    category?: string;
    subType?: string;
    ownership?: string;
    systemOfMedicine?: string;
    photos?: string[];
    logo?: string;
    rating?: number;
    ratingAvg?: number;
    reviewsCount?: number;
    openNow?: boolean;
    openLabel?: string;
    timingsToday?: string;
    address?: string;
    city?: string;
    distanceKm?: string | number;
    verified?: boolean;
    verifiedAt?: string;
    is24x7?: boolean;
    emergencyAvailable?: boolean;
  };
  isSaved?: boolean;
  onToggleSave?: () => void;
  onReport?: () => void;
}

export default function FacilityHero({ facility, isSaved, onToggleSave, onReport }: FacilityHeroProps) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const photos = facility.photos && facility.photos.length > 0
    ? facility.photos
    : [
        'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1200&q=80',
      ];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: facility.name,
        text: `Find details and book appointments for ${facility.name} on FindMedi.`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const rating = facility.rating ?? facility.ratingAvg ?? 0;
  const reviewsCount = facility.reviewsCount ?? 0;

  return (
    <div className="space-y-4">
      {/* Photo Gallery Grid / Carousel */}
      <div className="relative rounded-3xl overflow-hidden bg-muted border shadow-sm">
        <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden">
          <img
            src={photos[photoIdx]}
            alt={facility.name}
            className="w-full h-full object-cover transition-all duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Top Overlays */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {facility.is24x7 && (
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-600 text-white shadow-md">
                  24x7 Open
                </span>
              )}
              {facility.emergencyAvailable && (
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-600 text-white shadow-md">
                  Emergency Ready
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="w-9 h-9 rounded-full bg-black/50 text-white backdrop-blur-md flex items-center justify-center hover:bg-black/70 transition-colors"
                title="View Photos"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="w-9 h-9 rounded-full bg-black/50 text-white backdrop-blur-md flex items-center justify-center hover:bg-black/70 transition-colors"
                title="Share Listing"
              >
                <Share2 className="w-4 h-4" />
              </button>
              {onToggleSave && (
                <button
                  type="button"
                  onClick={onToggleSave}
                  className="w-9 h-9 rounded-full bg-black/50 text-white backdrop-blur-md flex items-center justify-center hover:bg-black/70 transition-colors"
                  title="Save to Favorites"
                >
                  <Heart className={`w-4 h-4 ${isSaved ? 'text-rose-500 fill-rose-500' : ''}`} />
                </button>
              )}
            </div>
          </div>

          {/* Gallery Navigation Controls */}
          {photos.length > 1 && (
            <div className="absolute inset-y-0 left-2 right-2 flex items-center justify-between pointer-events-none">
              <button
                type="button"
                onClick={() => setPhotoIdx((i) => (i === 0 ? photos.length - 1 : i - 1))}
                className="w-9 h-9 rounded-full bg-black/40 text-white backdrop-blur-sm pointer-events-auto flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setPhotoIdx((i) => (i === photos.length - 1 ? 0 : i + 1))}
                className="w-9 h-9 rounded-full bg-black/40 text-white backdrop-blur-sm pointer-events-auto flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Bottom Title Bar on Image */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {facility.subType && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white">
                  {facility.subType}
                </span>
              )}
              {facility.ownership && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white">
                  {facility.ownership}
                </span>
              )}
              {facility.systemOfMedicine && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/80 backdrop-blur-sm text-white">
                  {facility.systemOfMedicine}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight drop-shadow-md">
                {facility.name}
              </h1>
              {facility.verified && (
                <BadgeCheck className="w-6 h-6 text-primary-foreground fill-primary shrink-0" aria-label="Verified Facility" />
              )}
            </div>

            {facility.tagline && <p className="text-xs sm:text-sm text-white/90 mt-1 drop-shadow">{facility.tagline}</p>}
          </div>
        </div>

        {/* Thumbnail Strip */}
        {photos.length > 1 && (
          <div className="p-3 bg-card border-t flex items-center gap-2 overflow-x-auto">
            {photos.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPhotoIdx(idx)}
                className={`w-16 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                  photoIdx === idx ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={p} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
            <span className="text-xs text-muted-foreground ml-auto pr-2">
              {photoIdx + 1} of {photos.length} photos
            </span>
          </div>
        )}
      </div>

      {/* Meta Bar */}
      <div className="bg-card border rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* Rating */}
          <div className="flex items-center gap-1.5">
            {reviewsCount >= 3 ? (
              <>
                <div className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold px-2 py-0.5 rounded-lg">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>{rating > 0 ? rating.toFixed(1) : '—'}</span>
                </div>
                <span className="text-xs text-muted-foreground">({reviewsCount} verified reviews)</span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                <Sparkles className="w-3.5 h-3.5" /> New on FindMedi
              </span>
            )}
          </div>

          {/* Open Status */}
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 font-semibold text-xs px-2.5 py-1 rounded-full ${
                facility.openNow
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
              }`}
            >
              <Clock className="w-3 h-3" />
              {facility.openLabel || (facility.openNow ? 'Open Now' : 'Closed')}
            </span>
            {facility.timingsToday && <span className="text-xs text-muted-foreground">· Today: {facility.timingsToday}</span>}
          </div>

          {/* Location */}
          {facility.city && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>{facility.city}</span>
              {facility.distanceKm && <span className="font-semibold text-foreground">({facility.distanceKm} km away)</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {facility.verified && (
            <span className="text-[11px] text-muted-foreground hidden lg:inline">
              Verified on {facility.verifiedAt ? new Date(facility.verifiedAt).toLocaleDateString() : 'Active License'}
            </span>
          )}
          {onReport && (
            <button
              type="button"
              onClick={onReport}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors ml-auto"
            >
              <Flag className="w-3 h-3" /> Report Info
            </button>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 right-5 text-white/80 hover:text-white"
          >
            <X className="w-7 h-7" />
          </button>
          <img src={photos[photoIdx]} alt="" className="max-w-4xl max-h-[85vh] object-contain rounded-2xl" />
        </div>
      )}
    </div>
  );
}
