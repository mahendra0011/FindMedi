import express from 'express';
import crypto from 'crypto';
import SecondOpinionRequest from '../models/SecondOpinionRequest.js';
import Doctor from '../models/Doctor.js';
import Record from '../models/Record.js';
import ConsentRecord from '../models/ConsentRecord.js';
import Notification from '../models/Notification.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { validate, secondOpinionCreateSchema, secondOpinionAnswerSchema, SECOND_OPINION_STATUSES } from '../utils/validate.js';
import { resolveProfileAccess } from '../services/profileAccess.js';

const router = express.Router();

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id))
    ? next()
    : res.status(404).json({ message: 'Not found' })
);

const actorId = (req) => req.user._id ?? req.user.id;
// records.js DLB-19: ABDM grants are capped at 30 days so a consent can never
// become a permanent EHR read key. A second-opinion share is narrower than a
// care grant (one doctor, referenced records) but the ceiling still applies.
const SHARE_VALIDITY_HOURS = 24 * 30;

// The share ends with the conversation: answering, declining or cancelling
// revokes the minted grant. Best-effort by design — a missing row (already
// revoked/expired) is not an error, the request transition is.
const revokeShare = async (consentId) => {
  if (!consentId) return;
  await ConsentRecord.findOneAndUpdate(
    { consentId, status: 'GRANTED' },
    { $set: { status: 'REVOKED', revokedAt: new Date() } },
  );
};

// Notification bodies stay PHI-free (no question, no record detail): the
// inbox behind auth carries the detail, the ping only says there is one.
const notifyUser = async (userId, title, message) => {
  if (!userId) return;
  await Notification.create({ title, message, type: 'records', read: false, userId: String(userId), date: new Date().toISOString().slice(0, 10) });
};

// ─── Second opinions (7.md:39 doctor inbox) ─────────────────────────────────
// Patient side is session+profile scoped (self or authorised family — the same
// helper as the dashboard slices); doctor side is profile-ownership scoped
// (the request must target a Doctor row whose user_id is the caller).
// authz: object
router.post('/', protect, authorize('records:write:own'), validate(secondOpinionCreateSchema), async (req, res) => {
  try {
    const access = await resolveProfileAccess(req, req.body.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);

    const doctor = await Doctor.findById(req.body.doctorId).lean();
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
    // lean() returns raw paths — the login link is `user_id`, NOT the
    // `userId` alias (aliases only exist on hydrated documents).
    if (!doctor.user_id) return res.status(409).json({ message: 'Doctor is not reachable for second opinions', code: 'DOCTOR_UNREACHABLE' });

    const recordIds = [...new Set(req.body.recordIds)];
    // Every referenced record must belong to THIS profile — a request can
    // never launder another patient's records into a share.
    const owned = await Record.countDocuments({ _id: { $in: recordIds }, patientId: me, familyMemberId: access.scope });
    if (owned !== recordIds.length) return res.status(400).json({ message: 'Records must belong to this profile' });

    const open = await SecondOpinionRequest.findOne({ patientId: me, familyMemberId: access.scope, doctorId: doctor._id, status: 'REQUESTED' }).lean();
    if (open) return res.status(409).json({ message: 'An open request to this doctor already exists', code: 'ALREADY_REQUESTED' });

    const consentId = `SO-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
    const now = new Date();
    await ConsentRecord.create({
      consentId,
      patientId: me,
      doctorId: doctor.user_id,
      purposeOfCare: 'Second opinion',
      dataTypes: ['second_opinion'],
      status: 'GRANTED',
      grantedAt: now,
      expiresAt: new Date(now.getTime() + SHARE_VALIDITY_HOURS * 3600000),
      validityHours: SHARE_VALIDITY_HOURS,
    });

    const request = await SecondOpinionRequest.create({
      patientId: me,
      familyMemberId: access.scope,
      patientName: req.user.name || '',
      doctorId: doctor._id,
      doctorUserId: doctor.user_id,
      recordIds,
      question: req.body.question,
      consentId,
    });
    await notifyUser(doctor.user_id, 'New second-opinion request', 'A patient has requested a second opinion.');
    await auditLog('second_opinion_requested', me, { personId: access.profile.id, personKind: access.profile.kind, recordsCount: recordIds.length, ip: req.ip, userAgent: req.get('user-agent') });
    return res.status(201).json({ id: String(request._id), status: request.status, recordsCount: recordIds.length });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.get('/mine', protect, authorize('records:read:own'), async (req, res) => {
  try {
    const access = await resolveProfileAccess(req, req.query.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const status = req.query.status == null || req.query.status === '' ? null : String(req.query.status);
    if (status && !SECOND_OPINION_STATUSES.includes(status)) return res.status(400).json({ message: 'Unknown status filter' });
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);

    const filter = { patientId: me, familyMemberId: access.scope };
    if (status) filter.status = status;
    const total = await SecondOpinionRequest.countDocuments(filter);
    const rows = await SecondOpinionRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    const doctors = await Doctor.find({ _id: { $in: rows.map((r) => r.doctorId) } }).select('name specialization').lean();
    const doctorById = new Map(doctors.map((d) => [String(d._id), d]));

    await auditLog('second_opinion_list_viewed', me, { personId: access.profile.id, personKind: access.profile.kind, count: rows.length, ip: req.ip, userAgent: req.get('user-agent') });
    return res.json({
      total, page, limit,
      requests: rows.map((r) => ({
        id: String(r._id),
        doctor: { id: String(r.doctorId), name: doctorById.get(String(r.doctorId))?.name, specialization: doctorById.get(String(r.doctorId))?.specialization },
        recordIds: (r.recordIds ?? []).map(String),
        question: r.question,
        status: r.status,
        answer: r.status === 'ANSWERED' ? { text: r.answer?.text ?? '', answeredAt: r.answer?.answeredAt ?? null } : null,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.patch('/:id/cancel', protect, requireObjectId, authorize('records:write:own'), async (req, res) => {
  try {
    const access = await resolveProfileAccess(req, req.query.personId ?? req.body?.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const request = await SecondOpinionRequest.findOne({ _id: req.params.id, patientId: me, familyMemberId: access.scope });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'REQUESTED') return res.status(409).json({ message: 'Only an open request can be cancelled', code: 'ALREADY_DECIDED' });
    request.status = 'CANCELLED';
    await request.save();
    await revokeShare(request.consentId);
    await auditLog('second_opinion_cancelled', me, { requestId: String(request._id), ip: req.ip, userAgent: req.get('user-agent') });
    return res.json({ id: String(request._id), status: request.status });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.get('/inbox', protect, authorize('records:read'), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    // The inbox is keyed by DOCTOR PROFILES I own, never by a parameter —
    // asking for another doctor's inbox is not expressible in this query.
    const profiles = await Doctor.find({ user_id: me }).select('_id').lean();
    const status = req.query.status == null || req.query.status === '' ? 'REQUESTED' : String(req.query.status);
    // Contract validation before the data-dependent early return: a bad
    // filter is 400 even when the inbox would be empty anyway.
    if (!SECOND_OPINION_STATUSES.includes(status)) return res.status(400).json({ message: 'Unknown status filter' });
    if (!profiles.length) return res.json({ total: 0, page: 1, limit: 20, requests: [] });
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);

    const filter = { doctorId: { $in: profiles.map((p) => p._id) }, status };
    const total = await SecondOpinionRequest.countDocuments(filter);
    const rows = await SecondOpinionRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    // Context for triage: the request-time patient name + record headers.
    // Bodies stay behind the existing record routes (F2 rules).
    const records = await Record.find({ _id: { $in: rows.flatMap((r) => r.recordIds ?? []) } }).select('type date diagnosis').lean();
    const recordById = new Map(records.map((r) => [String(r._id), r]));

    await auditLog('second_opinion_inbox_viewed', me, { count: rows.length, ip: req.ip, userAgent: req.get('user-agent') });
    return res.json({
      total, page, limit,
      requests: rows.map((r) => ({
        id: String(r._id),
        patient: { id: String(r.patientId), name: r.patientName || null },
        records: (r.recordIds ?? []).map((id) => {
          const rec = recordById.get(String(id));
          return rec ? { id: String(rec._id), type: rec.type, date: rec.date, title: rec.diagnosis || rec.type } : { id: String(id) };
        }),
        question: r.question,
        status: r.status,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.patch('/:id/answer', protect, requireObjectId, authorize('records:read'), validate(secondOpinionAnswerSchema), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const request = await SecondOpinionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    const mine = await Doctor.countDocuments({ _id: request.doctorId, user_id: me });
    if (!mine) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'REQUESTED') return res.status(409).json({ message: 'Only an open request can be answered', code: 'ALREADY_DECIDED' });
    request.status = 'ANSWERED';
    request.answer = { text: req.body.answer, answeredAt: new Date() };
    await request.save();
    await revokeShare(request.consentId);
    await notifyUser(request.patientId, 'Your second opinion is ready.', 'The doctor has answered your request.');
    await auditLog('second_opinion_answered', me, { requestId: String(request._id), ip: req.ip, userAgent: req.get('user-agent') });
    return res.json({ id: String(request._id), status: request.status, answeredAt: request.answer.answeredAt });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// authz: object
router.patch('/:id/decline', protect, requireObjectId, authorize('records:read'), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const me = actorId(req);
    const request = await SecondOpinionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    const mine = await Doctor.countDocuments({ _id: request.doctorId, user_id: me });
    if (!mine) return res.status(404).json({ message: 'Request not found' });
    if (request.status !== 'REQUESTED') return res.status(409).json({ message: 'Only an open request can be declined', code: 'ALREADY_DECIDED' });
    request.status = 'DECLINED';
    await request.save();
    await revokeShare(request.consentId);
    await auditLog('second_opinion_declined', me, { requestId: String(request._id), ip: req.ip, userAgent: req.get('user-agent') });
    return res.json({ id: String(request._id), status: request.status });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
