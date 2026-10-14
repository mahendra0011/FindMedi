import React from 'react';
import { Star, ShieldCheck, BadgeCheck, Share2, Heart, Flag, Clock, Languages, MapPin, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface PractitionerDTO {
  id?: string;
  _id?: string;
  slug?: string;
  name: string;
  title?: string;
  photoUrl?: string;
  photo?: string;
  profile_photo?: string;
  roleType?: string;
  kind?: string;
  specialty?: string | { code?: string; label?: string };
  subSpecialties?: string[];
  qualifications?: string | string[];
  experienceYears?: number | string;
  experience?: string;
  languages?: string[];
  gender?: string;
  registration?: {
    council?: string;
    numberMasked?: string;
    verifiedAt?: string;
    scope?: string[];
  };
  registrationNo?: string;
  council?: string;
  councilVerified?: boolean;
  verified?: boolean;
  backgroundChecked?: boolean;
  badges?: string[];
  rating?: number;
  ratingAvg?: number;
  reviewsCount?: number;
  ratingCount?: number;
  stats?: {
    ratingAvg?: number;
    ratingCount?: number;
  };
  responseTime?: string;
  onTimePercent?: number;
  cancellationRate?: string;
  isDiscreet?: boolean;
  area?: string;
  city?: string;
  address?: {
    area?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  tagline?: string;
  [key: string]: any;
}

interface PractitionerHeaderProps {
  practitioner: PractitionerDTO;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onReport?: () => void;
}

export default function PractitionerHeader({
  practitioner,
  isSaved = false,
  onToggleSave,
  onReport,
}: PractitionerHeaderProps) {
  const photo = practitioner.photoUrl || practitioner.photo || practitioner.profile_photo;
  const name = practitioner.name || 'Practitioner';
  const title = practitioner.title || (name.toLowerCase().startsWith('dr') ? '' : 'Dr.');
  const fullName = practitioner.title ? `${practitioner.title} ${name}` : name;

  const specialtyLabel =
    typeof practitioner.specialty === 'object' && practitioner.specialty?.label
      ? practitioner.specialty.label
      : typeof practitioner.specialty === 'string'
      ? practitioner.specialty
      : practitioner.roleType || practitioner.kind || 'Medical Specialist';

  const subSpecialties = practitioner.subSpecialties || [];
  const quals = Array.isArray(practitioner.qualifications)
    ? practitioner.qualifications.join(', ')
    : practitioner.qualifications;

  const rating = practitioner.rating ?? practitioner.ratingAvg ?? practitioner.stats?.ratingAvg ?? 0;
  const ratingCount = practitioner.reviewsCount ?? practitioner.ratingCount ?? practitioner.stats?.ratingCount ?? 0;

  const isVerified = practitioner.verified || practitioner.councilVerified || practitioner.registration?.verifiedAt;
  const council = practitioner.registration?.council || practitioner.council;
  const maskedReg = practitioner.registration?.numberMasked ||
    (practitioner.registrationNo ? `•••${String(practitioner.registrationNo).slice(-4)}` : null);

  const city = practitioner.city || practitioner.address?.city;
  const area = practitioner.area || practitioner.address?.area;
  const locationStr = [area, city].filter(Boolean).join(', ');

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${fullName} — ${specialtyLabel}`,
          text: `Consult with ${fullName} on FindMedi`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Profile link copied to clipboard!');
    }
  };

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'MD';

  return (
    <div className="bg-card rounded-3xl border border-border/60 overflow-hidden shadow-sm">
      {/* Decorative Top Accent Banner */}
      <div className="h-28 sm:h-36 bg-gradient-to-r from-primary/20 via-sky-500/10 to-teal-500/15 relative">
        {practitioner.isDiscreet && (
          <div className="absolute top-3 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-background/90 text-foreground backdrop-blur-sm border border-border/50">
            <EyeOff className="w-3.5 h-3.5 text-primary" /> Discreet Consultation Available
          </div>
        )}
        <div className="absolute top-3 right-4 flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleSave}
            aria-label={isSaved ? 'Remove from saved' : 'Save profile'}
            className="h-8 px-2.5 rounded-full bg-background/90 hover:bg-background backdrop-blur-sm border-border/60 shadow-xs"
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'}`} />
            <span className="text-xs ml-1 font-medium hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            aria-label="Share practitioner profile"
            className="h-8 px-2.5 rounded-full bg-background/90 hover:bg-background backdrop-blur-sm border-border/60 shadow-xs"
          >
            <Share2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs ml-1 font-medium hidden sm:inline">Share</span>
          </Button>

          {onReport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReport}
              aria-label="Report incorrect info"
              className="h-8 px-2.5 rounded-full bg-background/90 hover:bg-background backdrop-blur-sm border-border/60 shadow-xs text-muted-foreground hover:text-destructive"
            >
              <Flag className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Main Profile Info Row */}
      <div className="px-5 sm:px-8 pb-6 -mt-12 sm:-mt-16 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
          {/* Avatar / Photo */}
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-4 border-card bg-muted shadow-md shrink-0">
            {photo ? (
              <img src={photo} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/25 to-primary/5 text-primary">
                <span className="text-2xl sm:text-3xl font-bold font-heading">{initials}</span>
              </div>
            )}
            {isVerified && (
              <div
                className="absolute bottom-1 right-1 p-1 bg-emerald-600 text-white rounded-full shadow-md"
                title="Registration & credentials verified by FindMedi"
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Titles & Names */}
          <div className="space-y-1.5 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {fullName}
              </h1>
              {isVerified && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-primary">{specialtyLabel}</span>
              {quals && (
                <>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="text-muted-foreground font-medium">{quals}</span>
                </>
              )}
            </div>

            {/* Sub-specialties chips */}
            {subSpecialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {subSpecialties.map((sub, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium border border-border/40"
                  >
                    {sub}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Verification & Trust Callout */}
        {isVerified && (
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/40 text-xs text-muted-foreground max-w-sm space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Medical Council Verified</span>
            </div>
            <p className="line-clamp-2 text-[11px]">
              {council ? `${council}` : 'State Medical Council'}
              {maskedReg ? ` • Reg. ${maskedReg}` : ''}
              {practitioner.registration?.verifiedAt ? ` • Verified on ${new Date(practitioner.registration.verifiedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : ''}
            </p>
          </div>
        )}
      </div>

      {/* Quick Summary Highlights Footer */}
      <div className="border-t border-border/60 bg-muted/20 px-5 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          {/* Rating */}
          <div className="flex items-center gap-1.5 font-medium">
            {ratingCount >= 3 ? (
              <>
                <div className="flex items-center gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold px-2 py-0.5 rounded-md">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{rating.toFixed(1)}</span>
                </div>
                <span className="text-muted-foreground">({ratingCount} verified reviews)</span>
              </>
            ) : (
              <span className="text-muted-foreground">New practitioner • Verified profile</span>
            )}
          </div>

          {/* Experience */}
          {(practitioner.experience || practitioner.experienceYears) && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-foreground">
                {practitioner.experience || `${practitioner.experienceYears}+ years`}
              </span>{' '}
              experience
            </div>
          )}

          {/* Languages */}
          {practitioner.languages && practitioner.languages.length > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground hidden sm:flex">
              <Languages className="w-3.5 h-3.5 text-primary" />
              <span>Speaks: {practitioner.languages.join(', ')}</span>
            </div>
          )}

          {/* Location */}
          {locationStr && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>{locationStr}</span>
            </div>
          )}
        </div>

        {/* Reliability band */}
        {practitioner.responseTime && (
          <div className="text-[11px] text-muted-foreground bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10">
            Responds in <strong className="text-primary">{practitioner.responseTime}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
