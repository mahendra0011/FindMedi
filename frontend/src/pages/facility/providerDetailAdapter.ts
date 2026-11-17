// Adapter: the public Provider DTO (backend/src/lib/providerPublicDetail.js)
// -> the shape the facility detail layout and its sections consume.
//
// The layout was written against the legacy `Facility` row, whose field names
// differ from the Provider row (`address` was a string, `photos` was an
// array of urls, `weekSchedule` was a day->"09:00 - 18:00" map). This module
// is the single place where those two dialects are reconciled, so the section
// components keep one vocabulary and the API stays authoritative.

export interface ProviderDetailDto {
  _id?: string;
  slug?: string;
  name?: string;
  tagline?: string;
  description?: string;
  type?: string;
  kind?: string;
  group?: string;
  ownership?: string;
  systemOfMedicine?: string;
  categoryCodes?: string[];
  media?: Array<{ url?: string; type?: string; alt?: string }>;
  photos?: string[];
  address?: {
    line1?: string;
    area?: string;
    city?: string;
    state?: string;
    pincode?: string;
    geo?: { type?: string; coordinates?: number[] };
  };
  contact?: { publicPhone?: string; email?: string };
  verification?: { status?: string; verifiedAt?: string; scope?: string[] };
  stats?: { ratingAvg?: number; ratingCount?: number };
  timings?: {
    is24x7?: boolean;
    weekly?: Array<{ day?: string; open?: string; close?: string; closed?: boolean }>;
    exceptions?: Array<{ date?: string; closed?: boolean; open?: string; close?: string }>;
  };
  languages?: string[];
  amenities?: string[];
  accreditations?: string[];
  schemesAccepted?: string[];
  services?: ProviderServiceDto[];
  practitioners?: ProviderPractitionerDto[];
  doctors?: ProviderPractitionerDto[];
  reviews?: ProviderReviewDto[];
  similar?: ProviderSimilarDto[];
  ratingAvg?: number;
  reviewsCount?: number;
  verified?: boolean;
  openNow?: boolean;
  openLabel?: string;
  timingsToday?: string;
}

export interface ProviderServiceDto {
  id?: string;
  name?: string;
  description?: string;
  categoryCode?: string;
  durationMin?: number;
  modes?: Array<{ mode?: string; fee?: number; durationMin?: number }>;
  price?: { amount?: number; currency?: string; taxInclusive?: boolean; gstRate?: number };
  packages?: Array<{ name?: string; sessions?: number; price?: number }>;
  requiresRx?: boolean;
  prepInstructions?: string;
}

export interface ProviderPractitionerDto {
  id?: string;
  name?: string;
  specialization?: string;
  qualifications?: string;
  experience?: string | number;
  photo?: string;
  rating?: number;
}

export interface ProviderReviewDto {
  id?: string;
  rating?: number;
  comment?: string;
  author?: string;
  doctorName?: string;
  isVerifiedVisit?: boolean;
  createdAt?: string;
}

export interface ProviderSimilarDto {
  id?: string;
  slug?: string;
  name?: string;
  category?: string;
  rating?: number;
  reviewsCount?: number;
  imageUrl?: string;
  route?: string;
}

const WEEKDAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const titleCase = (value: string) =>
  String(value || '')
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/** Provider.timings.weekly (array of rows) -> the day -> "09:00 - 18:00" map. */
export function toWeekSchedule(timings?: ProviderDetailDto['timings']): Record<string, string> | undefined {
  if (!timings?.weekly?.length) return undefined;
  const schedule: Record<string, string> = {};
  for (const row of timings.weekly) {
    if (!row?.day) continue;
    const value = row.closed ? 'Closed' : (row.open && row.close ? `${row.open} - ${row.close}` : (row.open || ''));
    if (value) schedule[row.day] = value;
  }
  return Object.keys(schedule).length ? schedule : undefined;
}

const toGeo = (geo?: { type?: string; coordinates?: number[] }) => {
  const coords = geo?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return undefined;
  // GeoJSON order is [lng, lat]; the map components expect { lat, lng }.
  const [lng, lat] = coords;
  if (typeof lat !== 'number' || typeof lng !== 'number') return undefined;
  return { lat, lng };
};

const adaptServices = (services?: ProviderServiceDto[]) => (services || []).map((service) => {
  const fees = (service.modes || [])
    .map((mode) => Number(mode?.fee || 0))
    .filter((fee) => Number.isFinite(fee) && fee > 0);
  const basePrice = Number(service.price?.amount || 0);
  const lowest = fees.length ? Math.min(...fees) : basePrice;
  return {
    id: service.id,
    code: service.categoryCode,
    name: service.name || 'Service',
    category: service.categoryCode ? titleCase(service.categoryCode) : undefined,
    description: service.description,
    durationMinutes: service.durationMin,
    price: basePrice || undefined,
    priceFrom: fees.length > 1 ? lowest : undefined,
    modes: (service.modes || []).map((mode) => mode.mode).filter(Boolean) as string[],
    instructions: service.prepInstructions,
  };
});

const adaptPractitioners = (doctors?: ProviderPractitionerDto[]) => (doctors || []).map((doctor) => ({
  id: doctor.id,
  name: doctor.name || '',
  specialization: doctor.specialization,
  qualifications: doctor.qualifications,
  experience: doctor.experience,
  rating: doctor.rating,
  avatar: doctor.photo,
  photo: doctor.photo,
}));

const adaptReviews = (reviews?: ProviderReviewDto[]) => (reviews || []).map((review) => ({
  id: review.id,
  userName: review.author || 'Patient',
  rating: Number(review.rating || 0),
  date: review.createdAt,
  comment: review.comment || '',
  serviceUsed: review.doctorName || undefined,
  verifiedVisit: !!review.isVerifiedVisit,
}));

const adaptSimilar = (similar?: ProviderSimilarDto[]) => (similar || []).map((entry) => ({
  id: entry.id || entry.slug || entry.name || '',
  name: entry.name || '',
  route: entry.route || (entry.slug ? `/facility/${entry.slug}` : '#'),
  category: entry.category,
  rating: entry.rating,
  reviewsCount: entry.reviewsCount,
}));

/** Map a public Provider detail DTO onto the facility-detail vocabulary. */
export function adaptProviderToFacility(provider: ProviderDetailDto) {
  const addressLine = [provider.address?.line1, provider.address?.area].filter(Boolean).join(', ');
  const ratingAvg = provider.ratingAvg ?? provider.stats?.ratingAvg ?? 0;

  return {
    _id: provider._id,
    id: provider._id,
    slug: provider.slug,
    name: provider.name || '',
    tagline: provider.tagline,
    description: provider.description,
    category: provider.type,
    subType: provider.type ? titleCase(provider.type) : undefined,
    ownership: provider.ownership,
    systemOfMedicine: provider.systemOfMedicine,
    categoryCodes: provider.categoryCodes,
    photos: provider.photos || (provider.media || []).map((m) => m?.url).filter(Boolean) as string[],
    rating: ratingAvg,
    ratingAvg,
    reviewsCount: provider.reviewsCount ?? provider.stats?.ratingCount ?? 0,
    verified: provider.verified ?? provider.verification?.status === 'verified',
    verifiedAt: provider.verification?.verifiedAt,
    openNow: provider.openNow,
    openLabel: provider.openLabel,
    timingsToday: provider.timingsToday,
    is24x7: provider.timings?.is24x7,
    emergencyAvailable: !!provider.timings?.is24x7,
    address: addressLine,
    landmark: provider.address?.area,
    city: provider.address?.city,
    state: provider.address?.state,
    pincode: provider.address?.pincode,
    geo: toGeo(provider.address?.geo),
    phone: provider.contact?.publicPhone,
    languages: provider.languages,
    amenities: provider.amenities,
    accreditations: provider.accreditations,
    insurance: provider.schemesAccepted,
    timings: provider.timings,
    weekSchedule: toWeekSchedule(provider.timings),
    services: adaptServices(provider.services),
    doctors: adaptPractitioners(provider.practitioners || provider.doctors),
    reviews: adaptReviews(provider.reviews),
    similar: adaptSimilar(provider.similar),
  };
}

export { WEEKDAY_ORDER };
