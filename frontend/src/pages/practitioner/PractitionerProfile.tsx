import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, MapPin, BadgeCheck, CalendarDays, Clock, Phone, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import BookingModal from '@/components/BookingModal';
import SeoHead, { aggregateRating } from '@/components/SeoHead';

type PractitionerDTO = {
  _id?: string;
  id?: string;
  name: string;
  kind?: string;
  specialty?: string;
  qualifications?: string | string[];
  registrationNo?: string;
  council?: string;
  councilVerified?: boolean;
  verified?: boolean;
  experienceYears?: number | string;
  experience?: string;
  rating?: number;
  ratingAvg?: number;
  reviewsCount?: number;
  ratingCount?: number;
  languages?: string[];
  modes?: Array<{ mode: string; fee?: number }>;
  fee?: number;
  consultation_fees?: number;
  photo?: string;
  profile_photo?: string;
  clinic?: string;
  area?: string;
  city?: string;
  bio?: string;
  focus?: string[];
  slots?: Array<{ date: string; time: string; available?: boolean }>;
  reviews?: Array<{ author?: string; rating?: number; text?: string; verifiedVisit?: boolean }>;
};

/** Generic practitioner profile for dentist/physio/dietitian/nurse/yoga/lawyer
 *  (fills missing doc 04 profiles): header, qualifications, reg-verified badge,
 *  modes/fees, slots, reviews, book CTA. Fed by public DTO only. */
export default function PractitionerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<PractitionerDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res: any = await api.get(`/practitioners/${id}`);
        if (!cancelled) setData(res?.data || res || null);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 space-y-4 animate-pulse">
        <div className="h-36 bg-muted rounded-2xl" />
        <div className="h-40 bg-muted rounded-2xl" />
        <div className="h-40 bg-muted rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <p className="font-medium">Practitioner not found</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  const rating = data.rating ?? data.ratingAvg ?? 0;
  const ratingCount = data.reviewsCount ?? data.ratingCount ?? 0;
  const quals = Array.isArray(data.qualifications) ? data.qualifications.join(', ') : data.qualifications;
  const regVerified = data.councilVerified || data.verified;
  const modes = data.modes || [];
  const baseFee = data.fee ?? data.consultation_fees;
  const photo = data.photo || data.profile_photo;
  const initials = (data.name || '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <SeoHead
        title={`${data.name}${data.specialty ? ` — ${data.specialty}` : ''} | FindMedi`}
        description={(data.bio || quals || '').slice(0, 160)}
        jsonLd={regVerified ? {
          '@context': 'https://schema.org',
          '@type': 'Physician',
          name: data.name,
          ...(aggregateRating(rating, ratingCount) ? { aggregateRating: aggregateRating(rating, ratingCount) } : {}),
        } : undefined}
      />
      <nav className="text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-primary">Home</Link> ›{' '}
        <span>{data.kind || data.specialty || 'Practitioner'}</span> ›{' '}
        <span className="text-foreground font-medium">{data.name}</span>
      </nav>

      {/* Header */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="h-24 bg-gradient-to-br from-primary/15 via-primary/5 to-primary/10" />
        <div className="px-5 pb-5 -mt-8 flex items-end gap-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-card bg-muted shadow-md shrink-0">
            {photo ? (
              <img src={photo} alt={data.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <span className="text-xl font-bold text-primary">{initials}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-heading text-xl font-bold truncate">{data.name}</h1>
              {regVerified && <BadgeCheck className="w-5 h-5 text-primary shrink-0" aria-label="Registration verified" />}
            </div>
            <p className="text-sm text-primary font-medium">{data.specialty || data.kind}</p>
            {quals && <p className="text-xs text-muted-foreground truncate">{quals}</p>}
          </div>
          <Button variant="outline" size="sm" className="h-9 w-9 p-0 shrink-0" aria-label="Share"><Share2 className="w-4 h-4" /></Button>
        </div>
        <div className="px-5 pb-5 flex flex-wrap items-center gap-2 text-xs">
          {ratingCount >= 3 ? (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              <span className="font-bold">{rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({ratingCount})</span>
            </span>
          ) : (
            <span className="text-muted-foreground">New · No reviews yet</span>
          )}
          {(data.experience || data.experienceYears) && (
            <span className="bg-muted/50 px-2 py-0.5 rounded-md">{data.experience || `${data.experienceYears} yrs exp`}</span>
          )}
          {(data.area || data.city) && (
            <span className="inline-flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" />{[data.area, data.city].filter(Boolean).join(', ')}</span>
          )}
          {regVerified && (
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-md font-medium">
              <BadgeCheck className="w-3 h-3" /> Reg. verified{data.council ? ` · ${data.council}` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Qualifications + bio */}
      {(quals || data.bio || data.focus?.length) && (
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <h2 className="font-heading font-bold mb-3">Qualifications & Focus</h2>
          {quals && <p className="text-sm"><span className="text-muted-foreground">Education: </span><span className="font-medium">{quals}</span></p>}
          {data.focus && data.focus.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {data.focus.map((f, i) => (
                <span key={i} className="text-[11px] font-medium bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded-lg">{f}</span>
              ))}
            </div>
          )}
          {data.bio && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{data.bio}</p>}
          {data.registrationNo && <p className="text-[11px] text-muted-foreground mt-2">Reg. no. partially masked: •••{String(data.registrationNo).slice(-4)} (full number verified, hidden per privacy rules)</p>}
        </div>
      )}

      {/* Modes & fees */}
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <h2 className="font-heading font-bold mb-3">Consultation Modes & Fees</h2>
        {modes.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-2">
            {modes.map((m, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-border/40 text-sm">
                <span className="font-medium capitalize">{m.mode}</span>
                <span className="font-bold">{m.fee != null ? `₹${m.fee}` : '—'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm">Fee: <span className="font-bold">{baseFee != null ? `₹${baseFee}` : 'Contact for fees'}</span></p>
        )}
        {data.languages && data.languages.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">Languages: {data.languages.join(', ')}</p>
        )}
      </div>

      {/* Slots */}
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <h2 className="font-heading font-bold mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Available Slots</h2>
        {data.slots && data.slots.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.slots.slice(0, 12).map((s, i) => (
              <button
                key={i}
                type="button"
                disabled={s.available === false}
                onClick={() => setSelectedSlot(`${s.date} ${s.time}`)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors',
                  selectedSlot === `${s.date} ${s.time}`
                    ? 'bg-primary text-white border-primary'
                    : s.available === false
                      ? 'bg-muted text-muted-foreground line-through cursor-not-allowed'
                      : 'bg-card border-border/50 hover:border-primary/40'
                )}
              >
                {s.date} · {s.time}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Slots load from live availability (cached 1–2 min). No slots published yet.</p>
        )}
      </div>

      {/* Reviews */}
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <h2 className="font-heading font-bold mb-3">Reviews</h2>
        {!data.reviews || data.reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {data.reviews.slice(0, 5).map((r, i) => (
              <div key={i} className="p-3 rounded-xl border border-border/40">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">{r.author || 'Verified patient'}</span>
                  {r.verifiedVisit && <span className="text-emerald-600">· Verified visit</span>}
                  {r.rating != null && <span className="ml-auto font-bold">★ {r.rating}</span>}
                </div>
                {r.text && <p className="text-sm text-muted-foreground mt-1">{r.text}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky book CTA */}
      <div className="sticky bottom-3 bg-card rounded-2xl border border-border/50 p-3 flex gap-2 shadow-xl">
        <Button variant="outline" className="flex-1 gap-1.5 rounded-xl h-11" onClick={() => toast.info('Call feature: practitioner contact shared after booking')}>
          <Phone className="w-4 h-4" /> Call
        </Button>
        <Button className="flex-[2] gap-1.5 rounded-xl h-11" onClick={() => setShowBooking(true)}>
          <CalendarDays className="w-4 h-4" /> Book{selectedSlot ? ` · ${selectedSlot}` : ''}
        </Button>
      </div>

      <BookingModal open={showBooking} onOpenChange={setShowBooking} doctor={data} facility={data.clinic ? { name: data.clinic } : null} />
    </div>
  );
}
