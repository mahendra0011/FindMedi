import express from 'express';
import Appointment from '../models/Appointment.js';
import Record from '../models/Record.js';
import FamilyMember from '../models/FamilyMember.js';
import ChronicCarePlan from '../models/ChronicCarePlan.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { getCache, setCache } from '../config/redis.js';
import { getISTDateString } from '../utils/dateUtils.js';
import { resolveProfileAccess } from '../services/profileAccess.js';

const router = express.Router();

const actorId = (req) => req.user._id ?? req.user.id;

// Server-side "cached short" (6.md §8): 60s keyed by session AND profile, so
// one member's cached summary can never be served to another. The HTTP side
// still says no-store — the page may revalidate, the cache is ours.
const SUMMARY_TTL_SECONDS = 60;

// ─── Dashboard summary (6.md §8 `GET /patient/dashboard/summary?profileId=`) ──
// Aggregated counts for the four empty-state axes of 6.md §6: appointments
// ("Find a doctor"), records ("Upload or link ABHA"), family ("Add family
// member"), programs ("recommended programs"). Counts, not content: the
// strings are the UI's to render.
//
// The `familyMemberId: scope` predicate is the forward-compatible half of the
// object-authz rule. `scope` is `null` for self — in Mongo `{ field: null }`
// matches rows where the field is MISSING, which is every appointment,
// record and care-plan row written today, so the self view sees them all and
// the moment bookings start tagging a family profile, self and family views
// separate without this endpoint changing. For a family profile the same
// predicate asks for rows attributed to that member (VaccinationSchedule-style
// linkage); models without the field honestly count 0 for that profile.
// authz: object
router.get('/summary', protect, authorize('profile:read:own'), async (req, res) => {
  try {
    // Object-level decision FIRST: a profile this session does not manage is
    // 404 before any count, cache read or audit row exists (probing must not
    // be able to manufacture audit traffic either).
    const access = await resolveProfileAccess(req, req.query.profileId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });

    const me = actorId(req);
    res.set('Cache-Control', 'no-store');

    const cacheKey = `dashboard_summary:${String(me)}:${access.profile.id}`;
    const cached = await getCache(cacheKey);
    if (cached !== null && cached !== undefined) {
      await auditLog('dashboard_summary_viewed', me, {
        profileId: access.profile.id,
        profileKind: access.profile.kind,
        cached: true,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      return res.set('X-Cache', 'HIT').json(cached);
    }

    const today = getISTDateString();
    const [upcomingAppointments, records, familyMembers, activePrograms] = await Promise.all([
      Appointment.countDocuments({
        patientId: me,
        familyMemberId: access.scope,
        date: { $gte: today },
        status: { $in: ['Pending', 'Confirmed'] },
      }),
      Record.countDocuments({ patientId: me, familyMemberId: access.scope }),
      // Account-level axis: the family widget is about THIS account's roster,
      // so it answers the same for every profile view (the empty state that
      // says "add a family member" is the account's to clear).
      FamilyMember.countDocuments({ patientId: me, isActive: true }),
      ChronicCarePlan.countDocuments({
        userId: me,
        familyMemberId: access.scope,
        status: 'active',
      }),
    ]);

    const body = {
      profile: access.profile,
      counts: { upcomingAppointments, records, familyMembers, activePrograms },
      generatedAt: new Date().toISOString(),
    };
    await setCache(cacheKey, body, SUMMARY_TTL_SECONDS);
    // Audit on record access (6.md §8) — including the cached path: the
    // requester READ the data either way; auditLog is failure-tolerant, so a
    // down Mongo never turns a dashboard poll into a 500.
    await auditLog('dashboard_summary_viewed', me, {
      profileId: access.profile.id,
      profileKind: access.profile.kind,
      cached: false,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    return res.set('X-Cache', 'MISS').json(body);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
