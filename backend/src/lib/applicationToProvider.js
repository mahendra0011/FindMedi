// 10.md 6 step 4 / 2.md 6: the listing an approval turns into.
//
// The wizard payload is deliberately shapeless - `draft.stepData` is whatever
// the steps of THAT ProviderTypeConfig collected (2.md 1: steps and fields are
// data, so a new provider type adds no code). This module is the one place that
// translates it, and it does so without assuming a fixed step layout: step data
// is flattened to its leaf keys, and each Provider field picks from a documented
// alias list in priority order. A step the config never asked for simply never
// matches, so nothing the applicant typed ends up somewhere it was not meant to.

const NAME_KEYS = [
  'display_name', 'business_name', 'facility_name', 'clinic_name', 'studio_name',
  'centre_name', 'center_name', 'legal_name', 'name',
];
const TAGLINE_KEYS = ['tagline', 'tag_line', 'short_description'];
const DESCRIPTION_KEYS = ['description', 'about', 'about_us', 'summary'];
const LINE1_KEYS = ['address_line1', 'address_line', 'address', 'line1', 'street', 'building'];
const AREA_KEYS = ['area', 'locality', 'locality_area', 'landmark'];
const CITY_KEYS = ['city', 'district'];
const STATE_KEYS = ['state', 'province'];
const PINCODE_KEYS = ['pincode', 'pin_code', 'zip', 'postal_code'];
const PHONE_KEYS = ['public_phone', 'contact_phone', 'mobile', 'phone', 'contact_number', 'whatsapp_number'];
const EMAIL_KEYS = ['email', 'contact_email', 'official_email'];
const LAT_KEYS = ['latitude', 'lat'];
const LNG_KEYS = ['longitude', 'lng', 'lon'];
const LANGUAGE_KEYS = ['languages', 'spoken_languages'];
const AMENITY_KEYS = ['amenities', 'facilities'];

const normalizeKey = (key) => String(key).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// Flattened view of the saved draft: leaf key -> value. Objects are walked
// into; arrays of scalars are kept whole (languages/amenities are leaves, not
// something to explode into individual matches).
export function flattenStepData(stepData) {
  const leaves = new Map();
  const put = (key, value) => {
    const normalized = normalizeKey(key);
    if (!normalized || value === null || value === undefined) return;
    // First writer wins: draft steps are saved in order, so the first step that
    // asked for `name` is the one that owns it.
    if (!leaves.has(normalized)) leaves.set(normalized, value);
  };
  const walk = (value) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) walk(item);
      });
      return;
    }
    if (typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
        walk(child);
      } else {
        put(key, child);
      }
    }
  };
  walk(stepData ?? {});
  return leaves;
}

const pick = (leaves, keys) => {
  for (const key of keys) {
    const value = leaves.get(key);
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const pickList = (leaves, keys) => {
  for (const key of keys) {
    const value = leaves.get(key);
    if (Array.isArray(value)) {
      const items = value
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
        .slice(0, 50);
      if (items.length > 0) return items;
    }
  }
  return [];
};

const asNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// GeoJSON order is [longitude, latitude]; accepting either input order of the
// two aliases is why both are read explicitly rather than guessed from position.
const pickGeo = (leaves) => {
  const lat = asNumber(pick(leaves, LAT_KEYS));
  const lng = asNumber(pick(leaves, LNG_KEYS));
  if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { type: 'Point', coordinates: [lng, lat] };
};

const pickEmail = (leaves) => {
  const email = pick(leaves, EMAIL_KEYS).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
};

/**
 * Application + its config -> Provider fields (10.md 2.1).
 *
 * @param {object} application a ProviderApplication (snapshot fields win)
 * @param {object|null} config the ProviderTypeConfig it was filed under
 * @param {{verifiedBy?: string, now?: Date}} [context] who approved, when
 * @returns {object} a Provider create() payload - never status/trusted/probation
 *                   choices, those are policy (2.md 6) and set below.
 */
export function mapApplicationToProvider(application, config, context = {}) {
  const now = context.now ?? new Date();
  const leaves = flattenStepData(application?.draft?.stepData);

  const name = pick(leaves, NAME_KEYS) || String(config?.label || application?.typeKey || 'Provider').trim();
  const geo = pickGeo(leaves);

  return {
    ownerUserId: application?.applicantUserId,
    kind: application?.kind || config?.kind || 'facility',
    type: application?.typeKey || config?.typeKey,
    group: application?.group || config?.group || 'clinical',
    tier: application?.tier || config?.tier || 'T3',

    name,
    tagline: pick(leaves, TAGLINE_KEYS).slice(0, 160),
    description: pick(leaves, DESCRIPTION_KEYS).slice(0, 2000),
    address: {
      line1: pick(leaves, LINE1_KEYS).slice(0, 200),
      area: pick(leaves, AREA_KEYS).slice(0, 120),
      city: pick(leaves, CITY_KEYS).slice(0, 80),
      state: pick(leaves, STATE_KEYS).slice(0, 80),
      pincode: pick(leaves, PINCODE_KEYS).slice(0, 10),
      ...(geo ? { geo } : {}),
    },
    contact: {
      publicPhone: pick(leaves, PHONE_KEYS).slice(0, 20),
      email: pickEmail(leaves).slice(0, 160),
    },
    languages: pickList(leaves, LANGUAGE_KEYS),
    amenities: pickList(leaves, AMENITY_KEYS),

    // Policy, not applicant input (2.md 6): approved = KYC done, but a brand
    // new listing starts on probation with a booking cap and a payout hold,
    // and never inherits a trusted badge from the approval screen.
    status: 'approved',
    trusted: false,
    plan: 'free',
    probation: { active: true, bookingCap: 10, payoutHold: true },
    verification: {
      status: 'verified',
      level: 1,
      verifiedAt: now,
      verifiedBy: context.verifiedBy ?? null,
      scope: ['kyc'],
    },
  };
}
