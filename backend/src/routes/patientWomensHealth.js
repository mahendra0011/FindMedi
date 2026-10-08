import express from 'express';
import WomensHealthProfile from '../models/WomensHealthProfile.js';
import WomensHealthLog from '../models/WomensHealthLog.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validate, womensHealthLogSchema, womensHealthProfileSchema, WOMENS_HEALTH_LOG_KINDS } from '../utils/validate.js';
import { resolveProfileAccess } from '../services/profileAccess.js';

const router = express.Router();

const actorId = (req) => req.user._id ?? req.user.id;
const isIsoDay = (raw) => /^\d{4}-\d{2}-\d{2}$/.test(raw);

// Reserved settings.hiddenCategories string for this module's UI hide-switch.
// Lives HERE (not in the model): specs mock the model with a default-only
// factory, and a named model export would fail every such mock at link time.
const WOMENS_HEALTH_CATEGORY = 'womens_health';

// Next-period prediction from the last logged period start + the profile's
// cycle length. Pure date arithmetic on the YYYY-MM-DD calendar (UTC midnight
// + N days) — no library, no storage, recomputed on every read.
const predictNextPeriod = (lastPeriodDate, cycleLengthDays) => {
  if (!lastPeriodDate) return null;
  const base = new Date(`${lastPeriodDate}T00:00:00.000Z`);
  if (Number.isNaN(base.getTime())) return null;
  return new Date(base.getTime() + cycleLengthDays * 86400000).toISOString().slice(0, 10);
};

// ─── Women's health (6.md §2.9, opt-in) ─────────────────────────────────────
// Separate consent: nothing here reads or writes until POST /consent sets
// consentedAt for that person-profile, and DELETE /consent revokes it by
// purging the profile AND its logs (the module keeps no tombstones). The
// UI's hide-switch is the reserved settings.hiddenCategories string
// WOMENS_HEALTH_CATEGORY — user-managed, never mutated by these routes.
// authz: object
router.get('/consent', protect, authorize('profile:read:own'), async (req, res) => {
  try {
    const access = await resolveProfileAccess(req, req.query.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });
    res.set('Cache-Control', 'no-store');
    const profile = await WomensHealthProfile.findOne({ userId: actorId(req), familyMemberId: access.scope }).lean();
    return res.json({ consented: Boolean(profile?.consentedAt), consentedAt: profile?.consentedAt ?? null, category: WOMENS_HEALTH_CATEGORY });
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
    // For a family profile this opt-in is the managing account's guardian
    // consent (FamilyMember.guardianConsent covers the member; this row
    // covers the MODULE) — either way it is explicit, per profile, and
    // audited, never inherited from anyone else's consent.
    const profile = await WomensHealthProfile.findOneAndUpdate(
      { userId: me, familyMemberId: access.scope },
      { $set: { consentedAt: new Date() } },
      { new: true, upsert: true },
    ).lean();
    await auditLog('womens_health_consented', me, { personId: access.profile.id, personKind: access.profile.kind, ip: req.ip, userAgent: req.get('user-agent') });
    return res.status(201).json({ consented: true, consentedAt: profile.consentedAt });
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
    const removed = await WomensHealthLog.deleteMany({ userId: me, familyMemberId: access.scope });
    await WomensHealthProfile.findOneAndDelete({ userId: me, familyMemberId: access.scope });
    await auditLog('womens_health_consent_revoked', me, { personId: access.profile.id, personKind: access.profile.kind, logsPurged: removed.deletedCount ?? 0, ip: req.ip, userAgent: req.get('user-agent') });
    return res.json({ consented: false, logsPurged: removed.deletedCount ?? 0 });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.get('/', protect, authorize('profile:read:own'), async (req, res) => {
  try {
    const access = await resolveProfileAccess(req, req.query.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const profile = await WomensHealthProfile.findOne({ userId: me, familyMemberId: access.scope }).lean();
    if (!profile?.consentedAt) return res.status(403).json({ message: 'WomensHealth consent required', code: 'CONSENT_REQUIRED' });

    const kind = req.query.kind == null || req.query.kind === '' ? null : String(req.query.kind);
    if (kind && !WOMENS_HEALTH_LOG_KINDS.includes(kind)) return res.status(400).json({ message: 'Unknown log kind' });
    const from = req.query.from == null || req.query.from === '' ? null : String(req.query.from);
    const to = req.query.to == null || req.query.to === '' ? null : String(req.query.to);
    if ((from && !isIsoDay(from)) || (to && !isIsoDay(to))) return res.status(400).json({ message: 'from/to must be YYYY-MM-DD' });
    if (from && to && to < from) return res.status(400).json({ message: 'to must not precede from' });
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));

    const filter = { userId: me, familyMemberId: access.scope };
    if (kind) filter.kind = kind;
    if (from || to) filter.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
    const rows = await WomensHealthLog.find(filter).sort({ date: -1, _id: -1 }).limit(limit).lean();
    const lastPeriod = await WomensHealthLog.findOne({ userId: me, familyMemberId: access.scope, kind: 'period' }).sort({ date: -1 }).lean();

    await auditLog('womens_health_viewed', me, { personId: access.profile.id, personKind: access.profile.kind, count: rows.length, ip: req.ip, userAgent: req.get('user-agent') });
    return res.json({
      profile: { consentedAt: profile.consentedAt, cycleLengthDays: profile.cycleLengthDays },
      predictedNextPeriod: predictNextPeriod(lastPeriod?.date, profile.cycleLengthDays),
      logs: rows.map((r) => ({ id: String(r._id), kind: r.kind, date: r.date, details: r.details ?? {} })),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.post('/logs', protect, authorize('profile:write:own'), validate(womensHealthLogSchema), async (req, res) => {
  try {
    const access = await resolveProfileAccess(req, req.query.personId ?? req.body?.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const profile = await WomensHealthProfile.findOne({ userId: me, familyMemberId: access.scope }).lean();
    if (!profile?.consentedAt) return res.status(403).json({ message: 'WomensHealth consent required', code: 'CONSENT_REQUIRED' });
    // Routine journaling is deliberately NOT audit-logged (volume): the
    // access trail records reads (womens_health_viewed), consent changes and
    // deletions — the events the "who viewed my record" surface is about.
    const row = await WomensHealthLog.create({ userId: me, familyMemberId: access.scope, kind: req.body.kind, date: req.body.date, details: req.body.details ?? {} });
    return res.status(201).json({ id: String(row._id), kind: row.kind, date: row.date, details: row.details ?? {} });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.put('/profile', protect, authorize('profile:write:own'), validate(womensHealthProfileSchema), async (req, res) => {
  try {
    const access = await resolveProfileAccess(req, req.query.personId ?? req.body?.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });
    res.set('Cache-Control', 'no-store');
    const profile = await WomensHealthProfile.findOne({ userId: actorId(req), familyMemberId: access.scope }).lean();
    if (!profile?.consentedAt) return res.status(403).json({ message: 'WomensHealth consent required', code: 'CONSENT_REQUIRED' });
    const updated = await WomensHealthProfile.findOneAndUpdate(
      { userId: actorId(req), familyMemberId: access.scope },
      { $set: { cycleLengthDays: req.body.cycleLengthDays } },
      { new: true },
    ).lean();
    return res.json({ consentedAt: updated.consentedAt, cycleLengthDays: updated.cycleLengthDays });
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
    const removed = await WomensHealthLog.findOneAndDelete({ _id: req.params.id, userId: me, familyMemberId: access.scope });
    if (!removed) return res.status(404).json({ message: 'Log not found' });
    await auditLog('womens_health_log_deleted', me, { personId: access.profile.id, personKind: access.profile.kind, logId: String(removed._id), ip: req.ip, userAgent: req.get('user-agent') });
    return res.json({ deleted: true });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
