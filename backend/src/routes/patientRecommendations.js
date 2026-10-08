import express from 'express';
import Event from '../models/Event.js';
import Facility from '../models/Facility.js';
import HealthPackage from '../models/HealthPackage.js';
import Doctor from '../models/Doctor.js';
import Plan from '../models/Plan.js';
import ChronicCarePlan from '../models/ChronicCarePlan.js';
import PlatformContent from '../models/PlatformContent.js';
import PatientAddress from '../models/PatientAddress.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { getISTDateString } from '../utils/dateUtils.js';
import { carePlanRecommendations } from '../lib/carePlanRecommendations.js';
import { seasonalAlertsForMonth } from '../lib/seasonalAlerts.js';
import { resolveProfileAccess } from '../services/profileAccess.js';

const router = express.Router();

const actorId = (req) => req.user._id ?? req.user.id;

// 6.md §2.11's discover feed: camps/drives near you, government facilities
// (Jan Aushadhi), packages, trending doctors, membership programs, care-plan
// suggestions, seasonal alerts, doctor-reviewed content. Everything runs
// in-house against the session's own data — 6.md §9 forbids raw PHI to third
// parties, so no external call is even made from this handler.
const NEAR_EVENT_TYPES = ['camp', 'vaccination', 'blood_drive'];

// §2.11 opt-out: personalisation (the care-plan section — the only part keyed
// to health data) can be switched off per request with ?personalised=false;
// everything else is generic discovery that carries no health signal. There
// is no stored preference yet, so the client owns the toggle and the flag is
// echoed back and audited.
const wantsPersonalisation = (value) => !['false', '0', 'no', 'off'].includes(String(value ?? '').toLowerCase());

// ─── Discover recommendations (6.md §2.11, route /patient/recommendations) ──
// authz: object
router.get('/', protect, authorize('profile:read:own'), async (req, res) => {
  try {
    const me = actorId(req);

    // §8 object-level authz: ?profileId= may point at a managed family
    // profile (the care-plan section then reads that person's plans through
    // the same familyMemberId scope the summary and timeline use).
    const access = await resolveProfileAccess(req, req.query.profileId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });

    res.set('Cache-Control', 'no-store');
    const personalised = wantsPersonalisation(req.query.personalised);

    const address = await PatientAddress.findOne({ patientId: me, isDefault: true }).lean();
    const city = typeof address?.city === 'string' && address.city.trim() ? address.city.trim() : null;

    const now = new Date();
    const [events, facilities, packages, doctors, programs, activePlans, reviewedContent] = await Promise.all([
      Event.find({
        type: { $in: NEAR_EVENT_TYPES },
        'schedule.start': { $gte: now },
        ...(city ? { 'venue.city': city } : {}),
      }).sort({ 'schedule.start': 1 }).limit(5).lean(),
      Facility.find({ ownership: 'government', ...(city ? { city } : {}) }).limit(5).lean(),
      HealthPackage.find({}).limit(5).lean(),
      Doctor.find({ available: true }).sort({ rating: -1, reviews_count: -1 }).limit(5).lean(),
      Plan.find({ status: 'active' }).sort({ createdAt: -1 }).limit(3).lean(),
      personalised ? ChronicCarePlan.find({ userId: me, familyMemberId: access.scope, status: 'active' }).lean() : [],
      PlatformContent.find({ status: 'published', reviewedAt: { $ne: null } }).sort({ updatedAt: -1 }).limit(3).lean(),
    ]);

    const conditions = [...new Set(activePlans.map((p) => p.condition))];
    const month = Number(getISTDateString().slice(5, 7));

    const body = {
      person: access.profile,
      personalised,
      nearYou: {
        // Without a default address there is no honest "near you" — the
        // sections stay unscoped and cityScoped tells the UI to ask for one.
        city,
        cityScoped: Boolean(city),
        events: events.map((e) => ({
          id: String(e._id), title: e.title, type: e.type,
          start: e.schedule?.start?.toISOString?.() ?? '',
          city: e.venue?.city, mode: e.venue?.mode,
        })),
        facilities: facilities.map((f) => ({
          id: String(f._id), name: f.name, type: f.type, city: f.city, slug: f.slug,
        })),
      },
      // §2.11 packages are marked ✅ as a feature, but HealthPackage carries
      // no age/gender targeting fields — the list ships as-is rather than
      // inventing a filter the model cannot answer.
      packages: packages.map((p) => ({
        id: String(p._id), name: p.name, price: p.packagePrice, discount: p.discount,
      })),
      trending: doctors.map((d) => ({
        id: String(d._id), name: d.name, specialization: d.specialization,
        rating: d.rating, reviewsCount: d.reviews_count,
      })),
      programs: programs.map((p) => ({
        id: String(p._id), name: p.name, price: p.price, duration: p.duration, type: p.type,
      })),
      // null (not []) when personalisation is off: the client can tell
      // "opted out" apart from "no care plan".
      carePlan: personalised ? carePlanRecommendations(conditions) : null,
      seasonal: seasonalAlertsForMonth(month),
      content: reviewedContent.map((c) => ({
        key: c.key, title: c.title, publishedAt: c.publishedAt, reviewedAt: c.reviewedAt,
      })),
      generatedAt: new Date().toISOString(),
    };

    // Audit on record access (§8): this read touches the care plan. The
    // condition names themselves stay OUT of the log — an audit trail is
    // still a place PHI can leak from.
    await auditLog('recommendations_viewed', me, {
      personId: access.profile.id,
      personKind: access.profile.kind,
      personalised,
      conditionsCount: conditions.length,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.json(body);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
