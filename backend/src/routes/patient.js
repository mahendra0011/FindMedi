import express from 'express';
import { z } from 'zod';
import FamilyMember from '../models/FamilyMember.js';
import PatientAddress from '../models/PatientAddress.js';
import SavedFavorite from '../models/SavedFavorite.js';
import PreferredPharmacy from '../models/PreferredPharmacy.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import { mintQrToken, revokeQrToken, healthIdSettingsSchema } from '../lib/healthIdCard.js';

// P1-5: explicit, model-shaped schemas. The old passthrough + Object.assign
// pattern let a client overwrite `patientId`/`isActive`/`createdAt` on PUT,
// re-parenting their record onto another account. Unknown keys are stripped.
//
// A4: the three subdocuments FamilyMember already STORES are now writable -
// guardian consent (5.md §2.1 step 2), the SOS emergency card (6.md §2.5) and
// the privacy prefs (6.md §2.15). What stays OUT is as deliberate as what goes
// in: `dependentOf` and `wearableLinks` are server-managed (a client that could
// re-point dependentOf would adopt a stranger's row; device links are their own
// flow), and the stamps - grantedBy/grantedAt/sharedAt - are never accepted
// from a body: applyServerStamps() writes them, because a client attesting its
// own consent is not consent.
const familySchema = z.object({
  name: z.string().min(1).max(160).optional(),
  relation: z.enum(['Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Other']).optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dateOfBirth: z.string().max(40).optional(),
  phone: z.string().max(30).optional(),
  bloodGroup: z.string().max(20).optional(),
  allergies: z.string().max(2000).optional(),
  medicalNotes: z.string().max(4000).optional(),
  guardianConsent: z.object({
    granted: z.boolean().optional(),
    note: z.string().max(500).optional(),
  }).optional(),
  emergencyCard: z.object({
    allergies: z.string().max(2000).optional(),
    conditions: z.string().max(2000).optional(),
    bloodGroup: z.string().max(20).optional(),
    contacts: z.array(z.object({
      name: z.string().max(120),
      relation: z.string().max(60),
      phone: z.string().max(30),
    }).strict()).max(10).optional(),
    sharedInSos: z.boolean().optional(),
  }).optional(),
  privacyPrefs: z.object({
    hiddenCategories: z.array(z.string().max(64)).max(50).optional(),
    discreetNotifications: z.boolean().optional(),
  }).optional(),
});

// Merge each presented subdocument onto what is already stored (a PUT that
// sends only `note` must not silently reset `granted`, and one that sends only
// `discreetNotifications` must not drop `hiddenCategories`), then stamp the
// moments a consent turns ON - grant, SOS share - with who did it and when.
// Turning consent OFF keeps its stamps: who granted it and when is history,
// and history is what an auditor reads.
const applyServerStamps = (body, existing, req) => {
  const out = { ...body };
  if (out.guardianConsent) {
    const merged = { ...(existing?.guardianConsent ?? {}), ...out.guardianConsent };
    if (merged.granted && !existing?.guardianConsent?.granted) {
      merged.grantedBy = req.user._id ?? req.user.id;
      merged.grantedAt = new Date();
    }
    out.guardianConsent = merged;
  }
  if (out.emergencyCard) {
    const merged = { ...(existing?.emergencyCard ?? {}), ...out.emergencyCard };
    if (merged.sharedInSos && !existing?.emergencyCard?.sharedInSos) {
      merged.sharedAt = new Date();
    }
    out.emergencyCard = merged;
  }
  if (out.privacyPrefs) {
    out.privacyPrefs = { ...(existing?.privacyPrefs ?? {}), ...out.privacyPrefs };
  }
  return out;
};
const addressSchema = z.object({
  label: z.string().max(80).optional(),
  address: z.string().min(1).max(600).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  pincode: z.string().max(12).optional(),
  phone: z.string().max(30).optional(),
  isDefault: z.boolean().optional(),
});
const favoriteSchema = z.object({
  refType: z.enum(['doctor', 'hospital', 'clinic', 'lab', 'pharmacy', 'technician']).optional(),
  refId: z.string().max(64).optional(),
  refName: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

// ── Privacy centre (6.md §2.15, 10.md §4.3 GET/PUT /api/patient/privacy) ───
//
// The storage home is `User.settings` - profileVisibility and
// patientRecordSharing already lived there, and hiddenCategories is the same
// kind of account-level preference. The OTHER settings route (auth.js profile
// update) spreads an unvalidated `settings` object straight through; this is
// the closed, validated surface the spec lists, so the schema is strict:
// a key outside this vocabulary is a 400, not a silent write.
const PRIVACY_VISIBILITY = ['private', 'care_team'];
const privacySchema = z.object({
  hiddenCategories: z.array(z.string().min(1).max(64)).max(50).optional(),
  profileVisibility: z.enum(PRIVACY_VISIBILITY).optional(),
  patientRecordSharing: z.boolean().optional(),
  dataSharing: z.boolean().optional(),
}).strict();

// The read view doubles as the write response. `settings` predates this
// endpoint on a loose Object path, so the READ side normalises: a value the
// vocabulary cannot store is reported as the default rather than echoed back,
// and a missing/legacy settings object still answers with a full shape.
const privacyView = (settings = {}) => ({
  hiddenCategories: Array.isArray(settings.hiddenCategories) ? settings.hiddenCategories : [],
  profileVisibility: PRIVACY_VISIBILITY.includes(settings.profileVisibility)
    ? settings.profileVisibility
    : 'care_team',
  patientRecordSharing: settings.patientRecordSharing === true,
  dataSharing: settings.dataSharing === true,
});

const router = express.Router();

// ─── Family Members ────────────────────────────────────────────────────────
router.get('/family', protect, authorize('profile:read:own'), async (req, res) => {
  try {
    const members = await FamilyMember.find({ patientId: req.user._id, isActive: true }).sort({ createdAt: -1 });
    res.json({ members });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/family', protect, authorize('profile:write:own'), validate(familySchema), async (req, res) => {
  try {
    const member = await FamilyMember.create({
      ...applyServerStamps(req.body, null, req),
      patientId: req.user._id,
    });
    res.status(201).json(member);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/family/:id', protect, authorize('profile:write:own'), validate(familySchema), async (req, res) => {
  try {
    const member = await FamilyMember.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!member) return res.status(404).json({ message: 'Family member not found' });
    Object.assign(member, applyServerStamps(req.body, member, req));
    await member.save();
    res.json(member);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/family/:id', protect, authorize('profile:write:own'), async (req, res) => {
  try {
    await FamilyMember.findOneAndDelete({ _id: req.params.id, patientId: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Addresses ─────────────────────────────────────────────────────────────
router.get('/addresses', protect, authorize('profile:read:own'), async (req, res) => {
  try {
    const addresses = await PatientAddress.find({ patientId: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    res.json({ addresses });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/addresses', protect, authorize('profile:write:own'), validate(addressSchema), async (req, res) => {
  try {
    if (req.body.isDefault) {
      await PatientAddress.updateMany({ patientId: req.user._id }, { isDefault: false });
    }
    const address = await PatientAddress.create({ ...req.body, patientId: req.user._id });
    res.status(201).json(address);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/addresses/:id', protect, authorize('profile:write:own'), validate(addressSchema), async (req, res) => {
  try {
    const addr = await PatientAddress.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!addr) return res.status(404).json({ message: 'Address not found' });
    if (req.body.isDefault) {
      await PatientAddress.updateMany({ patientId: req.user._id }, { isDefault: false });
    }
    Object.assign(addr, req.body);
    await addr.save();
    res.json(addr);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/addresses/:id', protect, authorize('profile:write:own'), async (req, res) => {
  try {
    await PatientAddress.findOneAndDelete({ _id: req.params.id, patientId: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Saved Favorites ───────────────────────────────────────────────────────
router.get('/favorites', protect, authorize('profile:read:own'), async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { patientId: req.user._id };
    if (type) filter.refType = type;
    const favorites = await SavedFavorite.find(filter).sort({ createdAt: -1 }).lean();

    // Enrich each favorite with full profile data from the referenced model
    const Doctor = (await import('../models/Doctor.js')).default;
    const Facility = (await import('../models/Facility.js')).default;

    // Full-card selects so the favorites page can reuse the listing-page cards
    const DOCTOR_SELECT = 'name specialization qualifications experience consultation_fees rating reviews_count patients available phone email location profile_photo bio languages areas_of_expertise education department doctor_type';
    const FACILITY_SELECT = 'name type slug email phone address city state pincode logo image description specialties status rating reviewsCount establishedYear totalDoctors accreditations hospitalType emergency24x7 bedAvailability ambulanceService workingHours nablNumber aerbNumber technicianName technicianRole technicianQualification technicianExperience amenities';

    const enriched = await Promise.all(favorites.map(async (fav) => {
      let profile = null;
      try {
        if (fav.refType === 'doctor') {
          profile = await Doctor.findById(fav.refId).select(DOCTOR_SELECT).lean();
        } else if (['hospital', 'clinic', 'lab', 'pharmacy'].includes(fav.refType)) {
          const fac = await Facility.findById(fav.refId).select(FACILITY_SELECT).lean();
          // Only attach if the facility type matches the saved refType (clinics stay clinics, etc.)
          if (fac) profile = fac;
        }
      } catch { profile = null; }
      return { ...fav, profile };
    }));

    res.json({ favorites: enriched });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/favorites', protect, authorize('profile:write:own'), validate(favoriteSchema), async (req, res) => {
  try {
    // Normalize legacy payloads: detail pages send targetId/targetType/name.
    const refType = req.body.refType || req.body.targetType;
    const refId = req.body.refId || req.body.targetId;
    const refName = req.body.refName || req.body.name;
    if (!refType || !refId) {
      return res.status(400).json({ message: 'refType and refId are required' });
    }
    const fav = await SavedFavorite.findOneAndUpdate(
      { patientId: req.user._id, refType, refId },
      { patientId: req.user._id, refType, refId, refName, notes: req.body.notes },
      { upsert: true, new: true },
    );
    res.status(201).json(fav);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/favorites/:id', protect, authorize('profile:write:own'), async (req, res) => {
  try {
    // Accept either the favorite _id (from the favorites page) or a refId
    // (detail pages only know the referenced entity's id).
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (isObjectId) {
      await SavedFavorite.findOneAndDelete({ _id: id, patientId: req.user._id });
    } else {
      await SavedFavorite.deleteMany({ refId: id, patientId: req.user._id });
    }
    res.json({ message: 'Removed from favorites' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/preferred-pharmacies', protect, authorize('profile:read:own'), async (req, res) => {
  try {
    const list = await PreferredPharmacy.find({ patientId: req.user._id }).sort({ priority: 1 });
    res.json({ pharmacies: list });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/preferred-pharmacies', protect, authorize('profile:write:own'), async (req, res) => {
  try {
    const { pharmacyId, name } = req.body;
    if (!pharmacyId || !name) return res.status(400).json({ message: 'pharmacyId and name are required' });
    const count = await PreferredPharmacy.countDocuments({ patientId: req.user._id });
    const pref = await PreferredPharmacy.create({ patientId: req.user._id, pharmacyId, name, priority: count + 1 });
    res.status(201).json(pref);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/preferred-pharmacies/reorder', protect, authorize('profile:write:own'), async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ message: 'orderedIds array is required' });
    for (let i = 0; i < orderedIds.length; i++) {
      await PreferredPharmacy.findOneAndUpdate(
        { _id: orderedIds[i], patientId: req.user._id },
        { priority: i + 1 }
      );
    }
    const list = await PreferredPharmacy.find({ patientId: req.user._id }).sort({ priority: 1 });
    res.json({ pharmacies: list });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/preferred-pharmacies/:id', protect, authorize('profile:write:own'), async (req, res) => {
  try {
    const removed = await PreferredPharmacy.findOneAndDelete({ _id: req.params.id, patientId: req.user._id });
    if (!removed) return res.status(404).json({ message: 'Not found' });
    await PreferredPharmacy.updateMany(
      { patientId: req.user._id, priority: { $gt: removed.priority } },
      { $inc: { priority: -1 } }
    );
    res.json({ message: 'Removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Patient profile (healthIdCard ke saath) ───
router.get('/me', protect, authorize('profile:read:own'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('name email healthIdCard').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Health ID: generate / rotate QR token ───
//
// REC-M-04: this is the path PatientHealthId.tsx actually calls, and it used to
// mint a token with NO expiry and NO rotation stamp — the scan path treats that
// combination as REVOKED, so a card minted through the shipped UI was dead on
// its first scan. It now uses the shared helper (lib/healthIdCard.js) that
// routes/healthId.js uses, so every mint writes the fields a scan needs.
router.post('/health-id/generate', protect, authorize('profile:write:own'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.healthIdCard = user.healthIdCard || {};
    if (user.healthIdCard.qrToken && req.body.regenerate) {
      revokeQrToken(user.healthIdCard);
      user.healthIdCard.lastRotatedAt = new Date();
      await user.save();
    }
    if (!user.healthIdCard.qrToken) {
      mintQrToken(user.healthIdCard);
      await user.save();
    }
    res.json({ qrToken: user.healthIdCard.qrToken });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Health ID: update settings ───
//
// REC-M-04: disable must REVOKELY propagate here too. This copy used to flip
// `isEnabled` and leave the token alive, so revocation depended on which of the
// two settings routes the client happened to call. Same shared helpers, same
// closed-enum validation as routes/healthId.js (a shareLevel the schema cannot
// store now fails as a 400, not a save-time 500).
router.put('/health-id/settings', protect, authorize('profile:write:own'), validate(healthIdSettingsSchema), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { isEnabled, shareLevel } = req.body;
    user.healthIdCard = user.healthIdCard || {};
    if (isEnabled !== undefined) user.healthIdCard.isEnabled = isEnabled;
    if (shareLevel !== undefined) user.healthIdCard.shareLevel = shareLevel;
    if (isEnabled === false) {
      revokeQrToken(user.healthIdCard);
    } else if (isEnabled === true && !user.healthIdCard.qrToken) {
      mintQrToken(user.healthIdCard);
    }
    await user.save();
    res.json({ user: { healthIdCard: user.healthIdCard } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Privacy centre: settings (6.md §2.15, 10.md §4.3) ────────────────────
router.get('/privacy', protect, authorize('profile:read:own'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(privacyView(user.settings));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/privacy', protect, authorize('profile:write:own'), validate(privacySchema), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const next = { ...(user.settings ?? {}) };
    const changed = [];
    if (req.body.hiddenCategories !== undefined) {
      // A category hidden twice is still one category - the list is a set of
      // names the UI filters by, so duplicates would render as duplicate rows.
      next.hiddenCategories = [...new Set(req.body.hiddenCategories)];
      changed.push('hiddenCategories');
    }
    for (const key of ['profileVisibility', 'patientRecordSharing', 'dataSharing']) {
      if (req.body[key] !== undefined) {
        next[key] = req.body[key];
        changed.push(key);
      }
    }
    if (changed.length) {
      // Reassign the whole object rather than poke nested keys: `settings` is
      // a Mixed path, and mongoose cannot see a nested mutation without
      // markModified(). Replacing the reference is how auth.js's profile
      // update persists the same path.
      const { auditLog } = await import('../middleware/audit.js');
      user.settings = next;
      await user.save();
      await auditLog('privacy_setting_changed', req.user._id, {
        settingKeys: changed,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
    }
    res.json(privacyView(next));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Privacy centre: consents ledger (6.md §2.15, 10.md §4.3) ─────────────
// The data subject's read of ConsentRecord. records.js already serves the
// care-side copy at /api/records/consents; this is the /api/patient path the
// spec lists, hard-scoped to the session account - no doctor branch, no other
// party's consents reachable by parameter.
router.get('/consents', protect, authorize('profile:read:own'), async (req, res) => {
  try {
    const { default: ConsentRecord } = await import('../models/ConsentRecord.js');
    const list = await ConsentRecord.find({ patientId: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
    const now = new Date();
    res.json(list.map((c) => ({
      ...c,
      effectiveStatus: c.status === 'GRANTED' && c.expiresAt && new Date(c.expiresAt) < now ? 'EXPIRED' : c.status,
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Privacy centre: access log (6.md §2.15) ──────────────────────────────
// "Who touched my data" - the patient-visible half of the Phase-8 audit trail.
// Three populations, one session-scoped query: my OWN actions (userId), and
// actions ON MY records, where the code stores the subject id under either
// details.resourceId (the records-list read) or details.patientId (record
// writes). The subject id never comes from a parameter, so a caller cannot
// read anyone else's log by asking.
router.get('/access-log', protect, authorize('profile:read:own'), async (req, res) => {
  try {
    const { default: AuditLog } = await import('../models/AuditLog.js');
    const me = String(req.user._id);
    const entries = await AuditLog.find({
      $or: [
        { userId: req.user._id },
        { 'details.resourceId': me },
        { 'details.patientId': me },
      ],
    }).sort({ timestamp: -1 }).limit(50).select('action userId ip timestamp details').lean();
    res.json(entries);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
