import express from 'express';
import { z } from 'zod';
import Provider from '../models/Provider.js';
import Service from '../models/Service.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import { PROVIDER_STATUS, SERVICE_MODES } from '../lib/providerTypes.js';
import ProviderTypeConfig from '../models/ProviderTypeConfig.js';
import { protect, requireRole } from '../middleware/auth.js';
import { authorizeObject } from '../middleware/authorize.js';
import { auditLog } from '../middleware/audit.js';
import { getCache, setCache, getLockedSlotsForDoctor } from '../config/redis.js';
import { getISTDateString } from '../utils/dateUtils.js';
import { validate, createProviderSchema, updateProviderSchema } from '../utils/validate.js';
import { safeSearchRegex } from '../utils/escapeRegex.js';

const router = express.Router();

// Directory card DTO (10.md 4.1): everything a listing needs, and nothing a
// caller must not see. relayPhone, ownerUserId, probation.payoutHold,
// verification.riskScore and commissionConfigId are deliberately absent —
// an anonymous directory must not leak the routing number or the payout state.
const CARD_FIELDS = 'slug kind type group tier name tagline media address.city address.area address.pincode stats verification.status verification.level trusted plan createdAt';
const DETAIL_FIELDS = [
  CARD_FIELDS,
  'description systemOfMedicine ownership accreditations schemesAccepted languages amenities',
  'address.line1 address.state address.geo serviceArea timings categoryCodes',
  'contact.publicPhone verification.verifiedAt verification.scope parentProviderId branches',
].join(' ');

// Fields a provider owner (or superadmin) may edit on their own listing.
// `status`, `trusted`, `plan`, `verification`, `ownerUserId`, `commissionConfigId`
// and `stats` are operator-owned and are changed through their own guarded
// routes — never from a profile PATCH.
const WRITABLE_FIELDS = [
  'name', 'tagline', 'description', 'categoryCodes', 'systemOfMedicine', 'ownership',
  'accreditations', 'schemesAccepted', 'address', 'serviceArea', 'timings',
  'languages', 'amenities', 'contact', 'media',
];

const toPositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

// A non-ObjectId path param must be answered before authorizeObject runs: its
// `await Model.findById(...)` would otherwise reject with a mongoose CastError
// inside an async middleware, which Express 4 never turns into a response.
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id))
    ? next()
    : res.status(404).json({ message: 'Not found' })
);

// authz: public
//
// Public directory listing (10.md 4.1). Live providers only: a row in draft,
// under_review, suspended or rejected must never surface in search, so the
// status filter is part of the query and not something a caller can widen.
router.get('/', async (req, res) => {
  try {
    const { type, group, city, category, q, all } = req.query;
    const filter = { status: 'live' };
    if (type) filter.type = String(type).toLowerCase().slice(0, 60);
    if (group) filter.group = String(group).slice(0, 40);
    if (city) {
      const cityRe = safeSearchRegex(city, { max: 80 });
      if (cityRe) filter['address.city'] = cityRe;
    }
    if (category) filter.categoryCodes = String(category).slice(0, 64);
    const search = safeSearchRegex(q);
    if (search) filter.$or = [{ name: search }, { tagline: search }];

    const limit = all === '1' ? 200 : toPositiveInt(req.query.limit, 20, 100);
    const page = toPositiveInt(req.query.page, 1, 10000);

    const [providers, total] = await Promise.all([
      Provider.find(filter)
        .select(CARD_FIELDS)
        .sort({ 'stats.ratingAvg': -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Provider.countDocuments(filter),
    ]);

    res.set('Cache-Control', 'public, max-age=60');
    res.removeHeader('Pragma');
    res.json({ providers, total, page, pages: Math.ceil(total / limit) || 1, limit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Detail page DTO (10.md 4.1). 404 (not 403) for anything not live, so a slug
// cannot be used to probe which drafts and suspended listings exist. The
// `kind` argument pins the surface for the practitioner spelling
// (/api/practitioners/:slug, its own route file) — a facility slug asked for
// as a practitioner 404s, which is honest: `kind` is public on the cards, so
// there is nothing to hide and nothing to enumerate.
export const providerDetail = (kind) => async (req, res) => {
  try {
    const provider = await Provider.findOne({
      slug: String(req.params.slug).toLowerCase(),
      status: 'live',
      ...(kind ? { kind } : {}),
    }).select(DETAIL_FIELDS).lean();
    if (!provider) return res.status(404).json({ message: 'Provider not found' });
    res.set('Cache-Control', 'public, max-age=120');
    res.removeHeader('Pragma');
    return res.json(provider);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

router.get('/:slug', providerDetail(null));

// ─── Availability slots (10.md §4.1 `GET /providers/:id/slots`) ─────────────
// Public directory surface (no PHI — names, fees and free times only):
// per-doctor free slots for a date, resolved through the provider's ACTIVE
// services (Service.practitionerId is the Provider→Doctor bridge). Two URL
// segments, so this never collides with `/:slug` above. Untagged like its
// neighbours → the manifest classifies it public by heuristic.
//
// A slot is free when it survives every block, in this order:
// weekly off-day → full-day leave → per-date disabled slots (My Schedule) →
// redis booking locks → booked appointments at capacity. Only the FREE times
// leave the server: counts and capacities stay staff-only (the booked-slots
// route's caseload-inference warning applies here too).
//
// Aliases bite in lean(): weekly_schedule, time_slots and consultation_fees
// are read by their RAW paths (userId-style aliases exist only on hydrated
// documents). `leaves` entries start with the date (plain 'YYYY-MM-DD' or
// 'YYYY-MM-DD:reason'), so a prefix match tolerates both forms.
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SLOT_CACHE_TTL_SECONDS = 60;
const SLOT_HORIZON_DAYS = 90;

router.get('/:id/slots', async (req, res) => {
  try {
    const id = String(req.params.id ?? '');
    if (!/^[0-9a-f]{24}$/i.test(id)) return res.status(404).json({ message: 'Provider not found' });
    const provider = await Provider.findById(id).select('name slug status').lean();
    // Same probing discipline as the detail route: non-live is 404, not 403.
    if (!provider || provider.status !== 'live') return res.status(404).json({ message: 'Provider not found' });

    const today = getISTDateString();
    const rawDate = req.query.date == null || req.query.date === '' ? today : String(req.query.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return res.status(400).json({ message: 'date must be YYYY-MM-DD' });
    if (rawDate < today) return res.status(400).json({ message: 'date must not be in the past' });
    const horizon = new Date(`${today}T00:00:00.000Z`).getTime() + SLOT_HORIZON_DAYS * 86400000;
    if (new Date(`${rawDate}T00:00:00.000Z`).getTime() > horizon) {
      return res.status(400).json({ message: `date must be within ${SLOT_HORIZON_DAYS} days` });
    }

    const rawService = req.query.service == null || req.query.service === '' ? null : String(req.query.service);
    if (rawService) {
      if (!/^[0-9a-f]{24}$/i.test(rawService)) return res.status(404).json({ message: 'Service not found' });
      const svc = await Service.findOne({ _id: rawService, providerId: provider._id, isActive: true }).select('_id').lean();
      if (!svc) return res.status(404).json({ message: 'Service not found' });
    }
    const rawMode = req.query.mode == null || req.query.mode === '' ? null : String(req.query.mode);
    if (rawMode && !SERVICE_MODES.includes(rawMode)) return res.status(400).json({ message: 'Unknown mode' });

    const cacheKey = `provider_slots:${id}:${rawDate}:${rawService ?? '-'}:${rawMode ?? '-'}`;
    const cached = await getCache(cacheKey);
    if (cached !== null && cached !== undefined) {
      res.set('Cache-Control', 'public, max-age=60');
      res.removeHeader('Pragma');
      return res.set('X-Cache', 'HIT').json(cached);
    }

    const services = await Service.find({
      providerId: provider._id,
      isActive: true,
      ...(rawService ? { _id: rawService } : {}),
      ...(rawMode ? { 'modes.mode': rawMode } : {}),
    }).select('_id name modes practitionerId').limit(100).lean();
    const doctorIds = [...new Set(
      services.map((s) => (s.practitionerId ? String(s.practitionerId) : null)).filter(Boolean),
    )];
    // $ne:false keeps doctors whose flag predates the field (missing reads as
    // open); an explicit false hides them.
    const doctors = doctorIds.length ? await Doctor.find({ _id: { $in: doctorIds }, available: { $ne: false } })
      .select('name specialization consultation_fees time_slots weekly_schedule leaves dateDisabledSlots maxBookingsPerSlot')
      .limit(25).lean() : [];

    const weekday = WEEKDAYS[new Date(`${rawDate}T00:00:00Z`).getUTCDay()];
    const BLOCKED_STATUSES = ['Cancelled', 'Completed', 'Missed'];
    const doctorsOut = [];
    for (const d of doctors) {
      const schedule = d.weekly_schedule ?? null;
      if (schedule && schedule[weekday] !== true) continue;
      if ((d.leaves ?? []).some((l) => String(l).startsWith(rawDate))) continue;
      const disabled = new Set(d.dateDisabledSlots?.[rawDate] ?? []);
      const locked = new Set(await getLockedSlotsForDoctor(String(d._id), rawDate));
      const booked = await Appointment.find({ doctorId: d._id, date: rawDate, status: { $nin: BLOCKED_STATUSES } }).select('time').lean();
      const counts = {};
      for (const a of booked) counts[a.time] = (counts[a.time] || 0) + 1;
      const capacity = d.maxBookingsPerSlot || 1;
      const template = Array.isArray(d.time_slots) ? d.time_slots : [];
      const freeSlots = template.filter((t) => !disabled.has(t) && !locked.has(t) && (counts[t] || 0) < capacity);
      doctorsOut.push({
        doctorId: String(d._id),
        name: d.name,
        specialization: d.specialization,
        consultationFees: d.consultation_fees ?? null,
        freeSlots,
      });
    }

    const body = {
      provider: { id: String(provider._id), name: provider.name, slug: provider.slug },
      date: rawDate,
      service: rawService,
      mode: rawMode,
      doctors: doctorsOut,
      services: services.map((s) => ({
        id: String(s._id),
        name: s.name,
        modes: (s.modes ?? []).map((m) => m.mode),
        doctorId: s.practitionerId ? String(s.practitionerId) : null,
      })),
    };
    await setCache(cacheKey, body, SLOT_CACHE_TTL_SECONDS);
    res.set('Cache-Control', 'public, max-age=60');
    res.removeHeader('Pragma');
    return res.set('X-Cache', 'MISS').json(body);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: role
//
// kind/group/tier come from the active ProviderTypeConfig row for `type`, so a
// join wizard cannot declare itself clinical or move itself into a higher data
// tier. Everything operator-owned starts locked: status is `draft`, verification
// is `unverified`, trusted stays false.
router.post('/', protect, requireRole(['superadmin', 'hospital_admin']), validate(createProviderSchema), async (req, res) => {
  try {
    const config = await ProviderTypeConfig.findOne({ typeKey: req.body.type, isActive: true });
    if (!config) return res.status(400).json({ message: 'Unknown or inactive provider type' });

    const provider = await Provider.create({
      ...req.body,
      kind: config.kind,
      group: config.group,
      tier: config.tier || 'T3',
      ownerUserId: req.user._id ?? req.user.id,
      status: 'draft',
    });
    await auditLog('create_provider', req.user._id ?? req.user.id, {
      providerId: provider._id, type: provider.type, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.status(201).json(provider);
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'A provider with this slug already exists' });
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
//
// Owner-or-superadmin edit (AUTHZ-B-01). authorizeObject attaches the scoped
// document, so the handler never re-queries an unscoped id; the strict zod body
// rejects unknown keys, and WRITABLE_FIELDS keeps operator-owned columns out of
// the update even if the schema grows.
router.patch('/:id', protect, requireObjectId, authorizeObject({
  model: Provider,
  ownerField: 'ownerUserId',
  actorRoles: [],
  write: true,
}), validate(updateProviderSchema), async (req, res) => {
  try {
    const provider = req.scoped;
    let typeChanged = false;
    if (req.body.type && req.body.type !== provider.type) {
      const config = await ProviderTypeConfig.findOne({ typeKey: req.body.type, isActive: true });
      if (!config) return res.status(400).json({ message: 'Unknown or inactive provider type' });
      provider.kind = config.kind;
      provider.group = config.group;
      provider.tier = config.tier || provider.tier;
      typeChanged = true;
    }
    for (const field of WRITABLE_FIELDS) {
      if (field === 'type') continue;
      if (Object.prototype.hasOwnProperty.call(req.body, field)) provider[field] = req.body[field];
    }
    if (typeChanged) provider.type = req.body.type;
    await provider.save();
    await auditLog('update_provider', req.user._id ?? req.user.id, {
      providerId: provider._id, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.json(provider);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

const statusTransitionSchema = z.object({
  status: z.enum(PROVIDER_STATUS),
  reason: z.string().trim().max(500).optional(),
}).strict();

// authz: role
//
// Operator-only lifecycle gate (10.md 4.4). A listing reaches `live` through a
// superadmin decision, never through its own profile PATCH — which is why
// `status` is absent from updateProviderSchema.
router.post('/:id/status', protect, requireRole(['superadmin']), requireObjectId, validate(statusTransitionSchema), async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id);
    if (!provider) return res.status(404).json({ message: 'Provider not found' });
    const from = provider.status;
    provider.status = req.body.status;
    if (from === provider.status) return res.status(400).json({ message: 'Provider is already in that status' });
    await provider.save();
    await auditLog('provider_status_changed', req.user._id ?? req.user.id, {
      providerId: provider._id, from, to: provider.status, reason: req.body.reason || '', ip: req.ip,
    });
    return res.json({ _id: provider._id, status: provider.status });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

export default router;
