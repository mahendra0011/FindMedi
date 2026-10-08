import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Star, MapPin, BadgeCheck, Share2, Flag, Phone, Navigation,
  CalendarDays, Clock, ShieldCheck, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import SeoHead, { aggregateRating } from '@/components/SeoHead';
import { sectionsByType, SECTION_LABELS, type SectionKey, type FacilityTypeKey } from './sectionRegistry';

export interface FacilityDetailDTO {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  city?: string;
  categoryLabel?: string;
  verified?: boolean;
  verifiedAt?: string;
  ratingAvg?: number;
  ratingCount?: number;
  distanceKm?: string | number | null;
  openNow?: boolean | null;
  todayHours?: string;
  area?: string;
  address?: string;
  tagline?: string;
  description?: string;
  establishedYear?: number;
  gallery?: string[];
  ownership?: string;
  systemOfMedicine?: string;
  accreditations?: string[];
  schemesAccepted?: string[];
  timings?: Record<string, string> | Array<{ day: string; time: string }>;
  amenities?: string[];
  services?: Array<{ code?: string; name: string; price?: number | string; duration?: string; modes?: string[] }>;
  practitioners?: Array<{ _id?: string; id?: string; name: string; specialty?: string; experience?: string; nextSlot?: string }>;
  packages?: Array<{ name: string; price?: number | string }>;
  faqs?: Array<{ q?: string; question?: string; a?: string; answer?: string }>;
  policies?: Record<string, string>;
  reviews?: Array<{ author?: string; rating?: number; text?: string; verifiedVisit?: boolean }>;
  geo?: { lat?: number; lng?: number };
  phone?: string;
  [key: string]: any;
}

function isEmpty(v: any): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <section className="bg-card rounded-2xl border border-border/50 p-5">
      <h2 className="font-heading text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <ChevronRight className="w-3.5 h-3.5 text-primary" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function HeroSection({ dto }: { dto: FacilityDetailDTO }) {
  const [active, setActive] = useState(0);
  const photos = dto.gallery && dto.gallery.length ? dto.gallery : [];
  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      {photos.length > 0 ? (
        <div className="relative h-56">
          <img src={photos[active]} alt={dto.name} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex gap-1.5">
            {photos.slice(0, 5).map((p, i) => (
              <button key={i} type="button" onClick={() => setActive(i)} className={cn('w-12 h-9 rounded-md overflow-hidden border-2', i === active ? 'border-white' : 'border-transparent opacity-70')}>
                <img src={p} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-28 bg-gradient-to-br from-primary/15 via-primary/5 to-primary/10" />
      )}
      <div className="p-5">
        <nav className="text-xs text-muted-foreground mb-2" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-primary">Home</Link>
          {dto.city && <> › <span>{dto.city}</span></>}
          {dto.categoryLabel && <> › <span>{dto.categoryLabel}</span></>}
          <> › <span className="text-foreground font-medium">{dto.name}</span></>
        </nav>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-heading text-xl font-bold text-foreground leading-tight">{dto.name}</h1>
              {dto.verified && <BadgeCheck className="w-5 h-5 text-primary shrink-0" aria-label="Verified" />}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {dto.categoryLabel && <span className="text-[11px] font-medium bg-primary/5 text-primary border border-primary/10 px-2 py-0.5 rounded-lg">{dto.categoryLabel}</span>}
              {dto.ownership && <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-lg">{dto.ownership}</span>}
              {dto.systemOfMedicine && <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-lg">{dto.systemOfMedicine}</span>}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
              {(dto.ratingCount ?? 0) >= 3 ? (
                <>
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold text-foreground">{(dto.ratingAvg ?? 0).toFixed(1)}</span>
                  <span className="text-muted-foreground">({dto.ratingCount})</span>
                </>
              ) : (
                <span className="text-muted-foreground">New · No reviews yet</span>
              )}
              {dto.distanceKm != null && dto.distanceKm !== '' && (
                <span className="inline-flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" />{dto.distanceKm} km</span>
              )}
              {dto.openNow !== null && dto.openNow !== undefined && (
                <span className={cn('font-medium', dto.openNow ? 'text-green-600' : 'text-amber-600')}>
                  {dto.openNow ? 'Open now' : 'Closed'}{dto.todayHours ? ` · ${dto.todayHours}` : ''}
                </span>
              )}
            </div>
            {dto.verifiedAt && <p className="text-[11px] text-muted-foreground mt-1">Verified on {dto.verifiedAt}</p>}
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0" aria-label="Share"><Share2 className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0" aria-label="Report"><Flag className="w-4 h-4" /></Button>
          </div>
        </div>
        {dto.tagline && <p className="text-sm text-muted-foreground mt-2">{dto.tagline}</p>}
      </div>
    </div>
  );
}

function ActionBar({ dto, onAction }: { dto: FacilityDetailDTO; onAction?: (a: string) => void }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-3 flex flex-wrap gap-2 sticky top-2 z-10">
      <Button size="sm" className="flex-1 min-w-32 gap-1.5 rounded-xl h-10" onClick={() => onAction?.('book')}>
        <CalendarDays className="w-4 h-4" /> Book
      </Button>
      {dto.phone && (
        <Button variant="outline" size="sm" className="flex-1 min-w-28 gap-1.5 rounded-xl h-10" onClick={() => onAction?.('call')}>
          <Phone className="w-4 h-4" /> Call
        </Button>
      )}
      <Button variant="outline" size="sm" className="flex-1 min-w-28 gap-1.5 rounded-xl h-10" onClick={() => onAction?.('directions')}>
        <Navigation className="w-4 h-4" /> Directions
      </Button>
    </div>
  );
}

export interface FacilityDetailLayoutProps {
  typeKey: FacilityTypeKey;
  dto: FacilityDetailDTO | null;
  loading?: boolean;
  sections?: SectionKey[];
  onAction?: (action: 'book' | 'call' | 'directions' | 'save' | 'share' | 'report' | 'claim' | string) => void;
}

/** Generic facility detail layout: type picks sections from registry; empty sections auto-hide. */
export default function FacilityDetailLayout({ typeKey, dto, loading, sections, onAction }: FacilityDetailLayoutProps) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-56 bg-muted rounded-2xl" />
        <div className="h-14 bg-muted rounded-2xl" />
        <div className="h-40 bg-muted rounded-2xl" />
      </div>
    );
  }
  if (!dto) {
    return (
      <div className="bg-card rounded-2xl border border-dashed border-border p-10 text-center">
        <p className="font-medium">Listing unavailable</p>
        <p className="text-xs text-muted-foreground mt-1">This listing may be suspended or under review.</p>
      </div>
    );
  }
  const active: SectionKey[] = sections || sectionsByType[typeKey] || ['hero', 'actionbar', 'overview', 'location'];
  const has = (k: SectionKey) => active.includes(k);

  const ratingCount = dto.ratingCount ?? 0;
  const pageTitle = `${dto.name}${dto.categoryLabel ? ` — ${dto.categoryLabel}` : ''}${dto.city ? ` in ${dto.city}` : ''} | FindMedi`;
  return (
    <div className="space-y-4">
      <SeoHead
        title={pageTitle}
        description={(dto.tagline || dto.description || '').slice(0, 160)}
        canonical={dto.slug && dto.city ? `/${dto.city}/${typeKey}/${dto.slug}` : undefined}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'MedicalOrganization',
          name: dto.name,
          ...(dto.address || dto.area ? { address: [dto.area, dto.city].filter(Boolean).join(', ') } : {}),
          ...(aggregateRating(dto.ratingAvg, ratingCount) ? { aggregateRating: aggregateRating(dto.ratingAvg, ratingCount) } : {}),
        }}
      />
      {has('hero') && <HeroSection dto={dto} />}
      {has('banner') && <HeroSection dto={dto} />}
      {has('actionbar') && <ActionBar dto={dto} onAction={onAction} />}

      {(has('overview') || has('details')) && !isEmpty(dto.description) && (
        <Section title={SECTION_LABELS.overview}>
          <p className="text-sm text-muted-foreground leading-relaxed">{dto.description}</p>
          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            {dto.establishedYear && <span className="bg-muted/50 px-2 py-1 rounded-md">Est. {dto.establishedYear}</span>}
            {dto.area && <span className="bg-muted/50 px-2 py-1 rounded-md">{dto.area}</span>}
          </div>
        </Section>
      )}

      {(has('departments') || has('services') || has('services_prices')) && !isEmpty(dto.services) && (
        <Section title={has('departments') ? SECTION_LABELS.departments : SECTION_LABELS.services_prices}>
          <div className="grid sm:grid-cols-2 gap-2">
            {dto.services!.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/40">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{s.name}</p>
                  {s.duration && <p className="text-[11px] text-muted-foreground">{s.duration}</p>}
                </div>
                {s.price != null && <span className="text-sm font-bold">₹{s.price}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {(has('doctors') || has('dentists') || has('practitioners') || has('trainers') || has('speakers')) && !isEmpty(dto.practitioners) && (
        <Section title={SECTION_LABELS[active.find((s) => ['doctors', 'dentists', 'practitioners', 'trainers', 'speakers'].includes(s)) || 'practitioners']}>
          <div className="grid sm:grid-cols-2 gap-2">
            {dto.practitioners!.map((p, i) => (
              <Link key={i} to={`/practitioner/${p._id || p.id || ''}`} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  {p.specialty && <p className="text-[11px] text-primary">{p.specialty}</p>}
                  {p.nextSlot && <p className="text-[11px] text-muted-foreground">Next: {p.nextSlot}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Section>
      )}

      {has('timings') && !isEmpty(dto.timings) && (
        <Section title={SECTION_LABELS.timings}>
          <div className="space-y-1.5 text-sm">
            {Array.isArray(dto.timings)
              ? dto.timings.map((d: any, i: number) => (
                <div key={i} className="flex justify-between py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground">{d.day}</span><span className="font-medium">{d.time}</span>
                </div>
              ))
              : Object.entries(dto.timings as Record<string, string>).map(([day, time]) => (
                <div key={day} className="flex justify-between py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground">{day}</span><span className="font-medium">{time}</span>
                </div>
              ))}
          </div>
        </Section>
      )}

      {(has('packages') || has('plans') || has('pricing')) && !isEmpty(dto.packages) && (
        <Section title={SECTION_LABELS.packages}>
          <div className="grid sm:grid-cols-2 gap-2">
            {dto.packages!.map((p, i) => (
              <div key={i} className="p-3 rounded-xl border border-border/40 flex justify-between items-center gap-2">
                <p className="text-sm font-medium">{p.name}</p>
                {p.price != null && <span className="text-sm font-bold">₹{p.price}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {has('insurance') && !isEmpty(dto.schemesAccepted) && (
        <Section title={SECTION_LABELS.insurance}>
          <div className="flex flex-wrap gap-1.5">
            {dto.schemesAccepted!.map((s, i) => (
              <span key={i} className="text-[11px] font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded-md">{s}</span>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">Verify with the facility before visiting.</p>
        </Section>
      )}

      {(has('amenities') || has('facilities')) && !isEmpty(dto.amenities) && (
        <Section title={SECTION_LABELS.amenities}>
          <div className="flex flex-wrap gap-1.5">
            {dto.amenities!.map((a, i) => (
              <span key={i} className="text-xs bg-muted/50 px-2.5 py-1 rounded-lg">{a}</span>
            ))}
          </div>
        </Section>
      )}

      {has('accreditations') && !isEmpty(dto.accreditations) && (
        <Section title={SECTION_LABELS.accreditations}>
          <div className="flex flex-wrap gap-1.5">
            {dto.accreditations!.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                <ShieldCheck className="w-3 h-3" />{a}
              </span>
            ))}
          </div>
        </Section>
      )}

      {has('free_services') && !isEmpty(dto.freeServices || dto.services) && (
        <Section title={SECTION_LABELS.free_services}>
          <div className="flex flex-wrap gap-1.5">
            {(dto.freeServices || (dto.services || []).map((s: any) => s.name)).map((s: string, i: number) => (
              <span key={i} className="text-xs bg-emerald-500/10 text-emerald-700 px-2.5 py-1 rounded-lg">{s}</span>
            ))}
          </div>
        </Section>
      )}

      {has('infection_control') && !isEmpty(dto.infectionControl || dto.hygieneNote) && (
        <Section title={SECTION_LABELS.infection_control}>
          <p className="text-sm text-muted-foreground">{dto.infectionControl || dto.hygieneNote}</p>
        </Section>
      )}

      {(has('gallery') || has('gallery_consented')) && !isEmpty(dto.gallery) && (
        <Section title={SECTION_LABELS.gallery}>
          <div className="grid grid-cols-3 gap-2">
            {dto.gallery!.slice(0, 6).map((p, i) => (
              <img key={i} src={p} alt={`${dto.name} photo ${i + 1}`} loading="lazy" className="w-full h-24 object-cover rounded-xl" />
            ))}
          </div>
        </Section>
      )}

      {has('reviews') && (
        <Section title={SECTION_LABELS.reviews}>
          {isEmpty(dto.reviews) ? (
            <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review.</p>
          ) : (
            <div className="space-y-3">
              {dto.reviews!.slice(0, 5).map((r, i) => (
                <div key={i} className="p-3 rounded-xl border border-border/40">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">{r.author || 'Verified patient'}</span>
                    {r.verifiedVisit && <span className="text-emerald-600 font-medium">· Verified visit</span>}
                    {r.rating != null && <span className="ml-auto font-bold">★ {r.rating}</span>}
                  </div>
                  {r.text && <p className="text-sm text-muted-foreground mt-1">{r.text}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {has('location') && !isEmpty(dto.address || dto.area) && (
        <Section title={SECTION_LABELS.location}>
          <p className="text-sm text-muted-foreground flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary/60" />
            {[dto.address, dto.area, dto.city].filter(Boolean).join(', ')}
          </p>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => onAction?.('directions')}>
              <Navigation className="w-3.5 h-3.5" /> Get directions
            </Button>
          </div>
        </Section>
      )}

      {has('faq') && !isEmpty(dto.faqs) && (
        <Section title={SECTION_LABELS.faq}>
          <div className="space-y-2">
            {dto.faqs!.map((f, i) => (
              <details key={i} className="p-3 rounded-xl border border-border/40 text-sm">
                <summary className="font-medium cursor-pointer">{f.q || f.question}</summary>
                <p className="text-muted-foreground mt-1">{f.a || f.answer}</p>
              </details>
            ))}
          </div>
        </Section>
      )}

      {(has('policies') || has('consent')) && !isEmpty(dto.policies) && (
        <Section title={SECTION_LABELS.policies}>
          <div className="space-y-1.5 text-sm">
            {Object.entries(dto.policies!).map(([k, v]) => (
              <div key={k} className="flex gap-2"><span className="font-medium capitalize min-w-24">{k}:</span><span className="text-muted-foreground">{v}</span></div>
            ))}
          </div>
        </Section>
      )}

      {has('source_note') && (
        <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-xl p-3 border border-border/30">
          Information source: government portal, last verified{dto.verifiedAt ? ` ${dto.verifiedAt}` : ''}. Information may be outdated — please call before visiting.
        </div>
      )}

      {(has('report') || has('claim')) && (
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => onAction?.('report')}>
            <Flag className="w-3.5 h-3.5" /> Report incorrect info
          </Button>
          {has('claim') && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => onAction?.('claim')}>
              <ShieldCheck className="w-3.5 h-3.5" /> Claim this listing
            </Button>
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <Clock className="w-3 h-3" /> Information provided by the facility; FindMedi isn&apos;t a medical provider.
      </p>
    </div>
  );
}
