import express from 'express';
import WellnessProfile from '../models/WellnessProfile.js';
import WellnessLog from '../models/WellnessLog.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { getISTDateString } from '../utils/dateUtils.js';
import { validate, wellnessLogSchema, WELLNESS_KINDS, WELLNESS_KIND_DOMAIN, WELLNESS_FITNESS_KINDS } from '../utils/validate.js';
import { computeStreaks } from '../lib/wellnessStreaks.js';
import { resolveProfileAccess } from '../services/profileAccess.js';

const router = express.Router();

const actorId = (req) => req.user._id ?? req.user.id;
const isIsoDay = (raw) => /^\d{4}-\d{2}-\d{2}$/.test(raw);

// ─── Fitness + nutrition (6.md §2.10 opt-in, §2.11) ──────────────────────────
// One kind vocabulary for both domains; the domain derives from the kind, so
// a request cannot smuggle a fitness kind through the open nutrition path.
// Fitness needs the per-profile opt-in (POST /consent); nutrition stays open
// per the spec's silence. Challenges (6.md §2.10's "rewards" half) are NOT
// here: they need a definition/join/progress engine, and inventing one inside
// a logging slice would fake the feature — streaks are the computed half.
// authz: object
router.get('/consent', protect, authorize('profile:read:own'), async (req, res) => {
  try {
    const access = await resolveProfileAccess(req, req.query.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });
    res.set('Cache-Control', 'no-store');
    const profile = await WellnessProfile.findOne({ userId: actorId(req), familyMemberId: access.scope }).lean();
    return res.json({ fitnessConsented: Boolean(profile?.fitnessConsentedAt), fitnessConsentedAt: profile?.fitnessConsentedAt ?? null });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.post('/consent', protect, authorize('profile:write:own'), async (req, res) => {
  try {
    const access = await resolveProfileAccess(req, req.query.personId ?? req.body?.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const profile = await WellnessProfile.findOneAndUpdate(
      { userId: me, familyMemberId: access.scope },
      { $set: { fitnessConsentedAt: new Date() } },
      { new: true, upsert: true },
    ).lean();
    await auditLog('wellness_consented', me, { personId: access.profile.id, personKind: access.profile.kind, domain: 'fitness', ip: req.ip, userAgent: req.get('user-agent') });
    return res.status(201).json({ fitnessConsented: true, fitnessConsentedAt: profile.fitnessConsentedAt });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.delete('/consent', protect, authorize('profile:write:own'), async (req, res) => {
  try {
    const access = await resolveProfileAccess(req, req.query.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    // Revoking the fitness opt-in purges fitness-domain logs only — nutrition
    // was never gated, so it is never collateral.
    const removed = await WellnessLog.deleteMany({ userId: me, familyMemberId: access.scope, kind: { $in: WELLNESS_FITNESS_KINDS } });
    await WellnessProfile.findOneAndDelete({ userId: me, familyMemberId: access.scope });
    await auditLog('wellness_consent_revoked', me, { personId: access.profile.id, personKind: access.profile.kind, domain: 'fitness', logsPurged: removed.deletedCount ?? 0, ip: req.ip, userAgent: req.get('user-agent') });
    return res.json({ fitnessConsented: false, logsPurged: removed.deletedCount ?? 0 });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.get('/logs', protect, authorize('profile:read:own'), async (req, res) => {
  try {
    const access = await resolveProfileAccess(req, req.query.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);

    const kind = req.query.kind == null || req.query.kind === '' ? null : String(req.query.kind);
    if (kind && !WELLNESS_KINDS.includes(kind)) return res.status(400).json({ message: 'Unknown log kind' });
    if (!kind || WELLNESS_FITNESS_KINDS.includes(kind)) {
      const profile = await WellnessProfile.findOne({ userId: me, familyMemberId: access.scope }).lean();
      if (!profile?.fitnessConsentedAt) return res.status(403).json({ message: 'Fitness consent required', code: 'CONSENT_REQUIRED' });
    }
    const from = req.query.from == null || req.query.from === '' ? null : String(req.query.from);
    const to = req.query.to == null || req.query.to === '' ? null : String(req.query.to);
    if ((from && !isIsoDay(from)) || (to && !isIsoDay(to))) return res.status(400).json({ message: 'from/to must be YYYY-MM-DD' });
    if (from && to && to < from) return res.status(400).json({ message: 'to must not precede from' });
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));

    const filter = { userId: me, familyMemberId: access.scope };
    if (kind) filter.kind = kind;
    if (from || to) filter.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
    const rows = await WellnessLog.find(filter).sort({ date: -1, _id: -1 }).limit(limit).lean();

    await auditLog('wellness_viewed', me, { personId: access.profile.id, personKind: access.profile.kind, kind, count: rows.length, ip: req.ip, userAgent: req.get('user-agent') });
    return res.json({
      logs: rows.map((r) => ({ id: String(r._id), kind: r.kind, domain: WELLNESS_KIND_DOMAIN[r.kind], date: r.date, details: r.details ?? {} })),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.post('/logs', protect, authorize('profile:write:own'), validate(wellnessLogSchema), async (req, res) => {
  try {
    const access = await resolveProfileAccess(req, req.query.personId ?? req.body?.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    if (WELLNESS_FITNESS_KINDS.includes(req.body.kind)) {
      const profile = await WellnessProfile.findOne({ userId: me, familyMemberId: access.scope }).lean();
      if (!profile?.fitnessConsentedAt) return res.status(403).json({ message: 'Fitness consent required', code: 'CONSENT_REQUIRED' });
    }
    // Same journaling rule as the women's-health module: routine creates are
    // not audit-logged (volume); reads, consent changes and deletions are.
    const row = await WellnessLog.create({ userId: me, familyMemberId: access.scope, kind: req.body.kind, date: req.body.date, details: req.body.details ?? {} });
    return res.status(201).json({ id: String(row._id), kind: row.kind, domain: WELLNESS_KIND_DOMAIN[row.kind], date: row.date, details: row.details ?? {} });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.delete('/logs/:id', protect, authorize('profile:write:own'), async (req, res) => {
  try {
    const access = await resolveProfileAccess(req, req.query.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const removed = await WellnessLog.findOneAndDelete({ _id: req.params.id, userId: me, familyMemberId: access.scope });
    if (!removed) return res.status(404).json({ message: 'Log not found' });
    await auditLog('wellness_log_deleted', me, { personId: access.profile.id, personKind: access.profile.kind, logId: String(removed._id), ip: req.ip, userAgent: req.get('user-agent') });
    return res.json({ deleted: true });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.get('/streaks', protect, authorize('profile:read:own'), async (req, res) => {
  try {
    const access = await resolveProfileAccess(req, req.query.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const domain = req.query.domain == null || req.query.domain === '' ? 'fitness' : String(req.query.domain);
    if (!['fitness', 'nutrition'].includes(domain)) return res.status(400).json({ message: 'domain must be fitness or nutrition' });
    if (domain === 'fitness') {
      const profile = await WellnessProfile.findOne({ userId: me, familyMemberId: access.scope }).lean();
      if (!profile?.fitnessConsentedAt) return res.status(403).json({ message: 'Fitness consent required', code: 'CONSENT_REQUIRED' });
    }
    const kinds = Object.keys(WELLNESS_KIND_DOMAIN).filter((k) => WELLNESS_KIND_DOMAIN[k] === domain);
    const dates = await WellnessLog.distinct('date', { userId: me, familyMemberId: access.scope, kind: { $in: kinds } });
    const today = getISTDateString();
    const streaks = computeStreaks([...new Set(dates)].sort().reverse(), today);
    return res.json({ domain, asOf: today, ...streaks });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
