// Public detail DTO for a Provider listing (Spec 03 §4 / 10.md 4.1).
//
// The Provider row alone is not a detail page: the spec's public DTO also
// carries the things a patient actually books with - the live services, the
// practitioners behind them, the published reviews and the neighbouring
// listings. Every one of those is read from its own collection and projected
// down to public fields, so nothing a provider owns privately (payout state,
// owner id, risk score, relay phone) can leak through this surface.
//
// Nothing here is invented: a missing collection yields an empty list and the
// page renders its empty state instead of a placeholder.

import Provider from '../models/Provider.js';
import Service from '../models/Service.js';
import Review from '../models/Review.js';
import Doctor from '../models/Doctor.js';
import { toISTShifted } from '../utils/dateUtils.js';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const toMinutes = (value) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? '').trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

/**
 * Open / closed state of a provider, derived from its own weekly schedule
 * (plus any date exception) in IST. A provider with no schedule at all is
 * "Closed", never "Open" - the safe direction for a healthcare listing.
 */
export function computeOpenState(timings) {
  if (!timings) return { openNow: false, openLabel: 'Closed', timingsToday: '' };
  if (timings.is24x7) {
    return { openNow: true, openLabel: 'Open 24x7', timingsToday: 'Open 24x7' };
  }

  const ist = toISTShifted(new Date());
  const dayKey = DAY_KEYS[ist.getUTCDay()];
  const nowMinutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();

  const isoDate = `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`;
  const exception = (timings.exceptions || []).find((entry) => entry && entry.date === isoDate);
  if (exception) {
    if (exception.closed) {
      return { openNow: false, openLabel: 'Closed today', timingsToday: 'Closed today (exception)' };
    }
    const open = toMinutes(exception.open);
    const close = toMinutes(exception.close);
    const timingsToday = exception.open && exception.close ? `${exception.open} - ${exception.close}` : '';
    if (open == null || close == null) return { openNow: false, openLabel: 'Closed', timingsToday };
    const openNow = nowMinutes >= open && nowMinutes <= close;
    return {
      openNow,
      openLabel: openNow ? `Open · closes ${exception.close}` : (nowMinutes < open ? `Opens ${exception.open}` : 'Closed'),
      timingsToday,
    };
  }

  const today = (timings.weekly || []).find((entry) => entry && entry.day === dayKey);
  if (!today) return { openNow: false, openLabel: 'Closed', timingsToday: '' };
  if (today.closed) return { openNow: false, openLabel: 'Closed today', timingsToday: '' };

  const open = toMinutes(today.open);
  const close = toMinutes(today.close);
  const timingsToday = today.open && today.close ? `${today.open} - ${today.close}` : '';
  if (open == null || close == null) return { openNow: false, openLabel: 'Closed', timingsToday };

  const openNow = nowMinutes >= open && nowMinutes <= close;
  return {
    openNow,
    openLabel: openNow ? `Open · closes ${today.close}` : (nowMinutes < open ? `Opens ${today.open}` : 'Closed'),
    timingsToday,
  };
}

const mediaUrls = (provider) => (provider.media || [])
  .filter((entry) => entry && entry.type === 'image' && entry.url)
  .map((entry) => entry.url);

const publicService = (service) => ({
  id: String(service._id),
  name: service.name,
  description: service.description || '',
  categoryCode: service.categoryCode || '',
  durationMin: service.durationMin || 0,
  modes: (service.modes || []).map((mode) => ({
    mode: mode.mode,
    fee: mode.fee || 0,
    durationMin: mode.durationMin || 0,
  })),
  price: service.price ? { ...service.price } : undefined,
  packages: service.packages || [],
  requiresRx: !!service.requiresRx,
  prepInstructions: service.prepInstructions || '',
});

const publicPractitioner = (doctor) => ({
  id: String(doctor._id),
  name: doctor.name || doctor.doctorName || '',
  specialization: doctor.specialization || '',
  qualifications: doctor.qualifications || '',
  experience: doctor.experience || '',
  photo: doctor.profilePhoto || doctor.profile_photo || '',
  rating: doctor.rating || 0,
  registration: doctor.registrations?.number || doctor.registrationNumber || '',
});

const publicReview = (review) => ({
  id: String(review._id),
  rating: review.rating,
  comment: review.comment || '',
  author: review.isPrivate ? 'Anonymous Patient' : (review.patientName || 'Patient'),
  doctorName: review.doctorName || '',
  isVerifiedVisit: !!review.isVerifiedVisit,
  createdAt: review.createdAt,
});

/** Great-circle distance in km between two WGS84 points. */
export function haversineKm(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every((value) => typeof value === 'number' && Number.isFinite(value))) return null;
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
}

/**
 * The public CARD contract for a provider listing (Spec 02 §5).
 *
 * `id, type, slug, name, imageUrl, verified, ratingAvg, ratingCount,
 *  distanceKm, openNow, nextSlotAt, priceFrom/fee, badges[], schemes[],
 *  languages[], city/area, geo{lat,lng}, category{code,label}, modes[],
 *  isSponsored, isSaved`
 *
 * Public-safe by construction: no owner id, no relay phone, no licence
 * numbers, no payout state. `isSaved` is always false here - the saved state
 * is personal and comes from the user's own favourites call, never from the
 * shared directory cache.
 */
export function buildProviderCard(provider, rollup = {}) {
  const openState = computeOpenState(provider.timings);
  const ratingAvg = provider.stats?.ratingAvg || 0;
  const ratingCount = provider.stats?.ratingCount || 0;
  const verified = provider.verification?.status === 'verified';
  const isSponsored = !!provider.plan && provider.plan !== 'free';

  const media = (provider.media || []).filter((entry) => entry && entry.url);
  const images = media.filter((entry) => entry.type === 'image').map((entry) => entry.url);

  const badges = [];
  if (isSponsored) badges.push('Sponsored');
  if (provider.timings?.is24x7) badges.push('24x7');
  if (provider.group === 'clinical' && /govt|phc|chc|uphc|sub_centre|arogya/i.test(provider.type || '')) badges.push('Govt');
  if (provider.type === 'hospital' || provider.type === 'clinic' || provider.type === 'diagnostic_centre') {
    badges.push('New');
  }

  const trustBadges = [];
  if (verified) trustBadges.push('Verified');
  for (const accreditation of provider.accreditations || []) {
    if (/nabh|nabl|iso/i.test(accreditation)) trustBadges.push(accreditation);
    if (trustBadges.length >= 3) break;
  }
  if (!verified && (provider.schemesAccepted || []).length) trustBadges.push('Insurance accepted');

  const coordinates = provider.address?.geo?.coordinates;
  const geo = Array.isArray(coordinates) && coordinates.length >= 2
    ? { lat: coordinates[1], lng: coordinates[0] }
    : undefined;

  return {
    id: String(provider._id),
    type: provider.type,
    kind: provider.kind,
    group: provider.group,
    tier: provider.tier,
    slug: provider.slug,
    name: provider.name,
    tagline: provider.tagline || '',
    imageUrl: images[0] || '',
    gallery: images,
    verified,
    verifiedAt: provider.verification?.verifiedAt || null,
    ratingAvg,
    ratingCount,
    // Spec 02 §1 - a rating is only shown as a number once it is backed by at
    // least 3 reviews; below that the card shows "New".
    ratingVisible: ratingCount >= 3,
    distanceKm: rollup.distanceKm ?? null,
    openNow: openState.openNow,
    openLabel: openState.openLabel,
    is24x7: !!provider.timings?.is24x7,
    amenities: provider.amenities || [],
    serviceArea: provider.serviceArea || {},
    nextSlotAt: rollup.nextSlotAt || null,
    priceFrom: rollup.priceFrom ?? null,
    badges,
    trustBadges,
    accreditations: provider.accreditations || [],
    schemes: provider.schemesAccepted || [],
    languages: provider.languages || [],
    city: provider.address?.city || '',
    area: provider.address?.area || '',
    pincode: provider.address?.pincode || '',
    geo,
    category: { code: provider.categoryCodes?.[0] || provider.type, label: provider.type },
    modes: rollup.modes || [],
    isSponsored,
    isSaved: false,
  };
}

/**
 * Roll the bookable offering of a set of providers into one query: the
 * cheapest price and the delivery modes available. Cards show "from ₹X" and
 * the mode icons, so both come from the provider's ACTIVE services.
 */
export async function rollupProviderServices(providerIds) {
  if (!providerIds.length) return new Map();
  const rows = await Service.aggregate([
    { $match: { providerId: { $in: providerIds }, isActive: true } },
    { $unwind: { path: '$modes', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$providerId',
        priceFrom: { $min: { $ifNull: ['$modes.fee', '$price.amount'] } },
        modes: { $addToSet: '$modes.mode' },
      },
    },
  ]);
  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), {
      priceFrom: Number.isFinite(row.priceFrom) ? row.priceFrom : null,
      modes: (row.modes || []).filter(Boolean),
    });
  }
  return map;
}

/**
 * Compose the public detail payload for one live provider.
 *
 * `provider` is the lean Provider row already restricted to DETAIL_FIELDS.
 * The returned object keeps the provider's own public fields and ADDS the
 * derived/public collections the detail page renders.
 */
export async function buildPublicProviderDetail(provider, { similarLimit = 6, serviceLimit = 60 } = {}) {
  const providerId = provider._id;

  const services = await Service.find({ providerId, isActive: true })
    .select('name description categoryCode modes durationMin price packages isActive requiresRx prepInstructions')
    .sort({ name: 1 })
    .limit(serviceLimit)
    .lean();

  const practitionerIds = [...new Set(
    services.map((service) => service.practitionerId).filter(Boolean).map(String),
  )];

  // The detail page is a single surface: one collection that is empty (or
  // unavailable) must not turn the whole page into a 500. A missing service
  // list is rendered as an empty section, not as a broken page.
  const safe = async (promise, fallback) => {
    try {
      return await promise;
    } catch {
      return fallback;
    }
  };

  const [practitioners, reviews, similar] = await Promise.all([
    practitionerIds.length
      ? safe(
        Doctor.find({ _id: { $in: practitionerIds } })
          .select('name specialization qualifications experience profile_photo rating registrations registrationNumber')
          .limit(40)
          .lean(),
        [],
      )
      : Promise.resolve([]),
    safe(
      Review.find({
        providerId,
        moderationStatus: { $nin: ['hidden', 'removed', 'shadow_hidden'] },
      })
        .select('rating comment patientName doctorName isVerifiedVisit createdAt')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      [],
    ),
    safe(
      Provider.find({
        _id: { $ne: providerId },
        status: 'live',
        type: provider.type,
        ...(provider.address?.city ? { 'address.city': provider.address.city } : {}),
      })
        .select('slug name tagline type kind media address.city address.area stats verification.status')
        .limit(similarLimit)
        .lean(),
      [],
    ),
  ]);

  const openState = computeOpenState(provider.timings);
  const ratingAvg = provider.stats?.ratingAvg || 0;
  const reviewsCount = provider.stats?.ratingCount || reviews.length;

  return {
    ...provider,
    photos: mediaUrls(provider),
    verified: provider.verification?.status === 'verified',
    ratingAvg,
    reviewsCount,
    openNow: openState.openNow,
    openLabel: openState.openLabel,
    timingsToday: openState.timingsToday,
    services: services.map(publicService),
    practitioners: practitioners.map(publicPractitioner),
    doctors: practitioners.map(publicPractitioner),
    reviews: reviews.map(publicReview),
    similar: similar.map((entry) => ({
      id: String(entry._id),
      slug: entry.slug,
      name: entry.name,
      category: entry.tagline || entry.type || '',
      rating: entry.stats?.ratingAvg || 0,
      reviewsCount: entry.stats?.ratingCount || 0,
      imageUrl: mediaUrls(entry)[0] || '',
      route: `/facility/${entry.slug}`,
    })),
  };
}
