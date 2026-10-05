import { escapeRegex, capSearch } from '../utils/escapeRegex.js';
import crypto from 'crypto';
import { sendServerError } from '../utils/safeError.js';
import express from 'express';
import Record from '../models/Record.js';
import ConsentRecord from '../models/ConsentRecord.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import { protect, authorize } from '../middleware/auth.js';
// AUTHZ-M-03 (F7): amending a medico-legal record re-proves the operator is
// still there - the session token alone must not suffice.
import { requireStepUp } from '../middleware/stepUpAuth.js';
import { validate, createRecordSchema } from '../utils/validate.js';
import { generatePrescriptionPDF } from '../services/pdfService.js';
import { auditLog } from '../middleware/audit.js';
import { paginatedResults } from '../utils/pagination.js';
import { getISTDateString } from '../utils/dateUtils.js';
import logger from '../config/logger.js';

const router = express.Router();


// F2: consent enforcement — a caller may read a patient's records only if
// (a) they are the patient, (b) they have an active GRANTED consent grant, or
// (c) they are a staff member with an explicit tenant scope (doctor/hospital_admin).
async function canReadRecords(req, patientId) {
  // Owner always has access
  if (req.user.role === 'patient' && patientId.toString() === req.user._id.toString()) return true;
  // Staff with tenant scope already enforced by the outer filter — trust it.
  if (['doctor', 'counsellor', 'psychiatrist', 'hospital_admin'].includes(req.user.role)) return true;
  // Others must have an active consent grant
  const now = new Date();
  const consent = await ConsentRecord.findOne({
    patientId,
    doctorId: req.user._id,
    status: 'GRANTED',
    expiresAt: { $gt: now },
  });
  return !!consent;
}

const createNotification = async (userId, title, message, type = 'records') => {
  if (!userId) return;
  await Notification.create({ title, message, type, read: false, userId: userId.toString(), date: getISTDateString() });
};

const findPatientByName = async (name) => {
  if (!name) return null;
  const patient = await User.findOne({ name, role: 'patient' });
  return patient;
};

router.get('/', protect, authorize('records:read', 'records:read:own'), async (req, res) => {
  try {
    const { page, limit, search, type, patient } = req.query;
    const filter = { deletedAt: { $exists: false } };
    let scoped = false;

    // Build the tenant/ownership predicate FIRST.
    if (req.user.role === 'patient') {
      filter.$or = [
        { patientId: req.user._id },
        { patientId: { $exists: false }, patient: req.user.name },
      ];
      scoped = true;
    } else if (req.user.role === 'doctor' || req.user.role === 'counsellor' || req.user.role === 'psychiatrist') {
      filter.doctorId = req.user.doctorProfileId;
      if (req.user.hospitalId) filter.hospitalId = req.user.hospitalId;
      scoped = true;
    } else if (req.user.role === 'hospital_admin' && req.user.hospitalId) {
      filter.hospitalId = req.user.hospitalId;
      scoped = true;
    }

    // Default-deny: if the role didn't set a tenant scope, return empty (no data leak).
    if (!scoped) {
      return res.json({ data: [], total: 0, page: 1, limit: parseInt(limit, 10) || 50, totalPages: 0 });
    }

    // Hide self-uploads from admin/doctor panels
    if (req.user.role !== 'patient') {
      filter.doctor = { $ne: 'Self Upload' };
    }

    if (type && type !== 'All') filter.type = type;

    // REC-003: search ADDS to the existing filter, it does NOT overwrite it.
    if (search) {
      const safe = escapeRegex(capSearch(search));
      const searchOr = [
        { patient: new RegExp(safe, 'i') },
        { doctor: new RegExp(safe, 'i') },
        { diagnosis: new RegExp(safe, 'i') },
      ];
      filter.$and = filter.$and ? [...filter.$and, { $or: searchOr }] : [{ $or: searchOr }];
    }
    if (patient) {
      const safe = escapeRegex(capSearch(patient));
      const patientEq = { patient: new RegExp(safe, 'i') };
      filter.$and = filter.$and ? [...filter.$and, patientEq] : [patientEq];
    }

    // F2: if the query is for a specific patient (not the caller's own), enforce consent
    if (!scoped || req.user.role !== 'patient') {
      // Extract the patientId from the filter for consent check
      // (When scoped=false we already returned empty; when scoped=true but role!=patient,
      // the staff filter applies — consent is only needed for non-staff.)
      if (req.user.role !== 'patient' && req.user.role !== 'doctor' && req.user.role !== 'counsellor' && req.user.role !== 'psychiatrist' && req.user.role !== 'hospital_admin') {
        const patientId = filter.patientId || (filter.$or ? filter.$or.find(f => f.patientId)?.patientId : null);
        if (patientId && !(await canReadRecords(req, patientId))) {
          return res.json({ data: [], total: 0, page: 1, limit: parseInt(limit, 10) || 50, totalPages: 0 });
        }
      }
    }

    const result = await paginatedResults(Record, filter, {
      page, limit,
      sort: { createdAt: -1 },
      populate: [
        { path: 'patientId', select: 'name email' },
        { path: 'doctorId', select: 'name specialization' },
      ],
    });
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/patient/:patientId', protect, authorize('records:read', 'records:read:own'), async (req, res) => {
  try {
    const filter = { patientId: req.params.patientId };
    let scoped = false;

    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
      scoped = true;
    } else if (req.user.role === 'doctor' || req.user.role === 'counsellor' || req.user.role === 'psychiatrist') {
      filter.doctorId = req.user.doctorProfileId;
      if (req.user.hospitalId) filter.hospitalId = req.user.hospitalId;
      scoped = true;
    } else if (req.user.role === 'hospital_admin' && req.user.hospitalId) {
      filter.hospitalId = req.user.hospitalId;
      scoped = true;
    }

    // Default-deny for any other role.
    if (!scoped) {
      return res.json({ records: [] });
    }

    // F2: consent enforcement for non-staff
    if (req.user.role !== 'patient' && req.user.role !== 'doctor' && req.user.role !== 'counsellor' && req.user.role !== 'psychiatrist' && req.user.role !== 'hospital_admin') {
      if (!(await canReadRecords(req, req.params.patientId))) {
        return res.json({ records: [] });
      }
    }

    const records = await Record.find(filter)
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 });

    // Compliance (Phase 8): every medical-record READ is audited — "who
    // accessed which record, when". auditLog() writes Mongo (system of
    // record) and mirrors to OpenSearch, so legal/Bar-Council style lookbacks
    // can query by actor/patient/time.
    await auditLog('view_patient_records', req.user._id, {
      resourceType: 'Record',
      resourceId: req.params.patientId,
      count: records.length,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ records });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, validate(createRecordSchema), async (req, res) => {
  try {
    const { patientId, patient, diagnosis, prescription, type, notes, data, appointmentId, attachments } = req.body;
    
    let doctorName = req.user.name;
    let doctorId = req.user.doctorProfileId;
    let finalPatientId;
    
    if (req.user.role === 'patient') {
      finalPatientId = req.user._id;
      doctorName = req.body.doctor || '';
      doctorId = req.body.doctorId || null;
    } else {
      finalPatientId = patientId;
      
      // If patientId not provided, try to find by patient name
      if (!finalPatientId && patient) {
        const patientUser = await findPatientByName(patient);
        if (patientUser) finalPatientId = patientUser._id;
      }
      
      // For doctors creating records, if no patient found, return error
      if (!finalPatientId && (req.user.role === 'doctor' || req.user.role === 'counsellor' || req.user.role === 'psychiatrist')) {
        return res.status(400).json({ message: 'Patient not found. Please select a valid patient.' });
      }
    }
    
// F2: allergy check — if the patient has known allergies and the prescription
      // contains a matching substance, warn (do not block; clinical decision stays with doctor).
      let allergyWarning = null;
      if (finalPatientId) {
        const patientUser = await User.findById(finalPatientId).select('data.allergies').lean();
        const allergies = patientUser?.data?.allergies || [];
        if (allergies.length && (diagnosis || prescription)) {
          const medsText = [diagnosis, prescription, JSON.stringify(data || {})].filter(Boolean).join(' ').toLowerCase();
          for (const a of allergies) {
            if (medsText.includes(String(a).toLowerCase())) {
              allergyWarning = `Allergy alert: patient has known allergy to "${a}" — please verify.`;
              break;
            }
          }
        }
      }

      const record = await Record.create({
       patient: patient || req.user.name,
       patientId: finalPatientId,
       doctor: doctorName,
       doctorId: doctorId,
       appointmentId: appointmentId || null,
       hospitalId: req.body.hospitalId || req.user.hospitalId || undefined,
date: getISTDateString(),
        diagnosis: diagnosis || '',
        prescription: prescription || '',
       type: type || 'Diagnosis',
       notes: notes || '',
       data: data || {},
       attachments: attachments || []
     });
     
      await auditLog('create_record', req.user._id, { recordId: record._id, ip: req.ip, userAgent: req.get('user-agent') });

      // Tech 07: OCR/EHR search index (OCR text arrives via attachments pipeline;
      // index the structured text now so ER search works without re-crawl).
      try {
        const { indexEhrDoc } = await import('../services/opensearchIndexer.js');
        await indexEhrDoc({
          recordId: String(record._id),
          patientId: String(finalPatientId || ''),
          docType: String(type || 'Diagnosis').toLowerCase(),
          text: [diagnosis, prescription, notes, JSON.stringify(data || {})].filter(Boolean).join('\n'),
        });
      } catch {}
      
      await record.populate('doctorId', 'name specialization');
    
    if (finalPatientId) {
      await createNotification(finalPatientId.toString(), 'New Medical Record', `Dr. ${doctorName} has generated your ${type || 'record'}`, 'records');
    }
    
    // Notify admins about new record created by doctor
    if (req.user.role === 'doctor' || req.user.role === 'counsellor' || req.user.role === 'psychiatrist') {
      const admins = await User.find({ role: 'hospital_admin', status: 'active' }).select('_id');
      await Notification.insertMany(admins.map(admin => ({
        title: 'New Medical Record Generated',
        message: `Dr. ${doctorName} created a ${type || 'record'} for ${patient || 'a patient'}`,
        type: 'records',
        userId: admin._id.toString(),
      })));
    }
    
    res.status(201).json({ ...record.toObject(), allergyWarning });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, authorize('records:write', 'records:write:own'), requireStepUp('records:amend'), async (req, res) => {
  try {
    const existing = await Record.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Record not found' });
    // REC-B-02: fail closed. The old guard (user.hospitalId && record.hospitalId
    // && mismatch) let a tenant-less staff account - or a record with no
    // hospitalId - soft-delete another tenant's medico-legal history.
    if (!canAccessRecordDoc(req, existing)) {
      await auditLog('access_denied_delete_record', req.user._id, {
        resourceType: 'Record', resourceId: existing._id, ip: req.ip, userAgent: req.get('user-agent'),
      });
      return res.status(403).json({ message: 'Not authorized to delete this record' });
    }
    // REC-M-02: append the PREVIOUS state to an immutable chain.
    //
    // What was here before was a half-finished attempt with three defects, and
    // all three failed SILENTLY because the whole block sat in a catch that
    // shrugged with "model not available, still increment local counter":
    //   1. It called RecordVersion.create with modifiedBy/modifiedAt, which are
    //      not the model fields, so the insert never matched the schema.
    //   2. It ran existing.save() BEFORE the real findByIdAndUpdate, incrementing
    //      a counter on a document the edit never touched.
    //   3. Every failure was swallowed, so a MISSING audit trail was
    //      indistinguishable from a successful edit. On a medico-legal record
    //      that is the worst failure mode there is: it cannot be detected.
    //
    // A failure to record the version now ABORTS the edit. A clinical record that
    // cannot be versioned must not be modified: a user can redo an edit, nobody
    // can un-lose a medico-legal one.
    const ALLOWED = ['diagnosis', 'prescription', 'notes', 'type', 'vitals', 'icdCodes', 'examination', 'data', 'attachments'];
    const { pickBody } = await import('../utils/pick.js');
    const patch = pickBody(req.body, ALLOWED);

    const { default: RecordVersion } = await import('../models/RecordVersion.js');
    const updated = await Record.findByIdAndUpdate(req.params.id, patch, { new: true })
      .populate('doctorId', 'name specialization');
    if (!updated) return res.status(404).json({ message: 'Record not found' });

    // Snapshot the PRIOR state, so version N holds what the record looked like
    // before edit N. Taken from `existing`, which was read before the write.
    await RecordVersion.appendVersion({
      recordId: existing._id,
      before: existing.toObject(),
      after: updated.toObject(),
      editedBy: req.user._id,
      editedByRole: req.user.role,
      editedByName: req.user.name || '',
      editReason: req.body?.editReason || '',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    await auditLog('update_record', req.user._id, {
      recordId: req.params.id,
      version: updated.version,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json(updated);
  } catch (err) {
    logger.error(`Record update failed: ${err.message}`);
    res.status(400).json({ message: err.message });
  }
});

// GET /:id/versions - the medico-legal edit trail for one record.
//
// REC-M-02. Read-only, and deliberately so: there is no PUT or DELETE on a
// version. `verifyChain` re-hashes the whole chain, so tampering with or
// removing an entry is reported as an incident rather than going unnoticed.
router.get('/:id/versions', protect, authorize('records:read', 'records:read:own'), async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    if (!canAccessRecordDoc(req, record)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const { default: RecordVersion } = await import('../models/RecordVersion.js');
    const versions = await RecordVersion.find({ recordId: record._id })
      .select('version changed editedByRole editedByName editReason ip createdAt hash prevHash')
      .sort({ version: -1 })
      .limit(200)
      .lean();
    const integrity = await RecordVersion.verifyChain(record._id);
    res.json({
      recordId: record._id,
      currentVersion: record.version || 0,
      versions,
      integrity,
    });
  } catch (err) {
    logger.error(`Record version history error: ${err.message}`);
    res.status(500).json({ message: 'Could not load version history' });
  }
});

// REC-B-01/02: shared record-ownership predicate (default-deny). The PDF route
// used to check ownership ONLY for patients, so any staff role holding
// `records:read` (including a doctor of another hospital) could download any
// patient's prescription PDF, and DELETE failed open when either side had no
// hospitalId.
const recordAuthorBelongsToCaller = (req, record) => {
  const ownProfile = (req.user.doctorProfileId || req.user._id)?.toString();
  return Boolean(record.doctorId && record.doctorId.toString() === ownProfile);
};

const canAccessRecordDoc = (req, record) => {
  if (!record) return false;
  if (req.user.role === 'superadmin') return true;

  if (req.user.role === 'patient') {
    return Boolean(record.patientId && record.patientId.toString() === String(req.user._id || req.user.id));
  }

  // Authoring doctor / counsellor / psychiatrist.
  if (['doctor', 'clinic_doctor', 'counsellor', 'psychiatrist'].includes(req.user.role)) {
    return recordAuthorBelongsToCaller(req, record);
  }

  // Tenant staff: BOTH sides must have a tenant and they must match.
  if (req.user.hospitalId) {
    return Boolean(record.hospitalId && record.hospitalId.toString() === req.user.hospitalId.toString());
  }

  // REC-B-02: no tenant to prove ownership with -> deny (fail closed).
  return false;
};

router.get('/:id/prescription-pdf', protect, authorize('records:read', 'records:read:own'), async (req, res) => {
  try {
    const record = await Record.findById(req.params.id).populate('doctorId', 'name specialization email signatureUrl');
    if (!record) return res.status(404).json({ message: 'Record not found' });
    if (!canAccessRecordDoc(req, record)) {
      await auditLog('access_denied_prescription_download', req.user._id, {
        resourceType: 'Record', resourceId: record._id, ip: req.ip, userAgent: req.get('user-agent'),
      });
      return res.status(403).json({ message: 'Not authorized' });
    }
    let docSignatureUrl = '';
    if (record.doctorId?.signatureUrl) {
      docSignatureUrl = record.doctorId.signatureUrl;
    } else {
      const doctorDoc = await Doctor.findOne({ user_id: record.doctorId?._id || record.doctorId });
      if (doctorDoc?.signatureUrl) docSignatureUrl = doctorDoc.signatureUrl;
    }
    const pdfData = {
      prescriptionId: record._id.toString().slice(-8).toUpperCase(),
      date: record.date || new Date(),
      patient: { name: record.patient, age: record.data?.patient?.age, gender: record.data?.patient?.gender, phone: record.data?.patient?.phone },
      doctor: { name: record.doctor, specialization: record.doctorId?.specialization, email: record.doctorId?.email, signatureUrl: docSignatureUrl },
      chiefComplaints: record.data?.chiefComplaints || record.notes || '',
      diagnosis: record.diagnosis || '',
      medications: record.data?.medications?.length ? record.data.medications.map(m => typeof m === 'string' ? { name: m, dosage: '', frequency: '', instructions: '' } : m) : [],
      advice: record.data?.advice || '',
      followUp: record.data?.followUp || '',
    };
    const pdfBuffer = await generatePrescriptionPDF(pdfData);

    // Compliance (Phase 8): downloading a prescription is a record access —
    // audit it alongside the in-app views.
    await auditLog('download_prescription', req.user._id, {
      resourceType: 'Record',
      resourceId: record._id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="prescription-${record._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, authorize('records:write', 'records:write:own'), async (req, res) => {
  try {
    const existing = await Record.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Record not found' });
    // REC-B-02: fail closed. The old guard (user.hospitalId && record.hospitalId
    // && mismatch) let a tenant-less staff account - or a record with no
    // hospitalId - soft-delete another tenant's medico-legal history.
    if (!canAccessRecordDoc(req, existing)) {
      await auditLog('access_denied_delete_record', req.user._id, {
        resourceType: 'Record', resourceId: existing._id, ip: req.ip, userAgent: req.get('user-agent'),
      });
      return res.status(403).json({ message: 'Not authorized to delete this record' });
    }
    // F2: soft delete
    existing.deletedAt = new Date();
    existing.deletedBy = req.user._id;
    await existing.save();
    // REC-B-04: the duplicated auditLog('delete_record') call is gone.
    await auditLog('delete_record', req.user._id, { recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent'), soft: true });
    res.json({ message: 'Record removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── ABDM M2/M3: EHR Consent Management Endpoints ───
// Doctor/Hospital requests access to patient records
router.post('/consent-request', protect, async (req, res) => {
  try {
    const { patientId, purposeOfCare, requestedDurationHours = 24, dataTypes = ['labs:6mo'] } = req.body;
    if (!patientId) {
      return res.status(400).json({ message: 'patientId is required' });
    }

    const patient = await User.findById(patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const { default: ConsentRecord } = await import('../models/ConsentRecord.js');

    // DLB-19: the consent id was `AR-${Date.now().toString(36).toUpperCase()}` — a
    // base-36 MILLISECOND timestamp. That is a handful of bits of entropy per
    // request and the ids are issued in time order, so an attacker can enumerate
    // every pending consent id inside the window around "now" and then answer it.
    // 128 bits of CSPRNG entropy makes brute force impossible, which is what makes
    // the ownership filter on /consent-response sufficient on its own.
    const consentId = `AR-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;

    // DLB-19: `requestedDurationHours` came from the body unvalidated, so a doctor
    // could request a multi-year access grant. ABDM grants are bounded, and the
    // ceiling is also what stops a consent from becoming a permanent EHR read key.
    const MAX_CONSENT_HOURS = 24 * 30; // 30 days
    const requested = Number(requestedDurationHours);
    const validityHours = Number.isFinite(requested) && requested > 0
      ? Math.min(Math.round(requested), MAX_CONSENT_HOURS)
      : 24;

    await ConsentRecord.create({
      consentId,
      patientId,
      doctorId: req.user._id,
      purposeOfCare: purposeOfCare || 'General Clinical Evaluation',
      dataTypes,
      status: 'REQUESTED',
      validityHours,
    });

    await createNotification(
      patientId.toString(),
      '🔐 ABDM Health Records Consent Request',
      `Dr. ${req.user.name} has requested access to your medical history for "${purposeOfCare || 'General Clinical Evaluation'}". The grant lasts up to ${validityHours} hour(s). Please review and approve.`,
      'records'
    );

    res.json({
      success: true,
      consentId,
      status: 'REQUESTED',
      validityHours,
      message: 'ABDM Electronic Consent request dispatched to patient device',
    });
  } catch (err) {
    sendServerError(res, err, 'Could not dispatch the consent request');
  }
});

// Patient grants or denies cryptographic EHR consent
//
// REC-B-03: the lookup was `ConsentRecord.findOne({ consentId })` with NO
// patient filter, so ANY authenticated user holding a consentId (it travels in
// notifications and links) could grant a doctor access to somebody else's
// medical records — defeating the very consent gate that guards EHR reads.
router.post('/consent-response', protect, async (req, res) => {
  try {
    const { consentId, doctorId, isGranted } = req.body;
    if (!consentId) return res.status(400).json({ message: 'consentId required' });

    const { default: ConsentRecord } = await import('../models/ConsentRecord.js');
    // Only the patient NAMED in the consent request may answer it.
    const record = await ConsentRecord.findOne({ consentId, patientId: req.user._id });
    if (!record) {
      await auditLog('consent_response_denied', req.user._id, { consentId, doctorId, ip: req.ip, userAgent: req.get('user-agent') });
      return res.status(404).json({ message: 'Consent request not found' });
    }
    // A single-use response: an already answered request cannot be re-granted.
    if (['GRANTED', 'DENIED', 'REVOKED'].includes(record.status)) {
      return res.status(409).json({ message: `Consent already ${record.status.toLowerCase()}` });
    }
    // The doctor must be the one the request was addressed to.
    if (doctorId && record.doctorId && String(record.doctorId) !== String(doctorId)) {
      return res.status(400).json({ message: 'doctorId does not match this consent request' });
    }
    // Stateless fallback: still notify/audit even if the request row expired.
    const hours = record?.validityHours ?? 24;

    if (isGranted) {
      if (record) {
        record.status = 'GRANTED';
        record.grantedAt = new Date();
        record.expiresAt = new Date(Date.now() + hours * 3600 * 1000);
        await record.save();
      }
      await auditLog('consent_granted', req.user._id, { consentId, doctorId, ip: req.ip, userAgent: req.get('user-agent') });
      if (doctorId) {
        await createNotification(
          doctorId.toString(),
          '✅ Health Record Consent Approved',
          `Patient ${req.user.name} has granted you 24-hour electronic access to medical records.`,
          'records'
        );
      }
    } else {
      if (record) {
        record.status = 'DENIED';
        await record.save();
      }
      await auditLog('consent_revoked', req.user._id, { consentId, doctorId, ip: req.ip, userAgent: req.get('user-agent') });
    }

    res.json({
      success: true,
      consentId,
      isGranted: !!isGranted,
      expiresAt: isGranted ? new Date(Date.now() + hours * 3600 * 1000) : null,
      message: isGranted ? 'Consent granted successfully' : 'Consent declined/revoked',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Patient revokes an active grant (Privacy Settings path); listing for review.
router.post('/consent-revoke', protect, async (req, res) => {
  try {
    const { consentId } = req.body;
    if (!consentId) return res.status(400).json({ message: 'consentId required' });
    const { default: ConsentRecord } = await import('../models/ConsentRecord.js');
    const record = await ConsentRecord.findOne({ consentId, patientId: req.user._id });
    if (!record) return res.status(404).json({ message: 'Consent not found' });
    record.status = 'REVOKED';
    record.revokedAt = new Date();
    await record.save();
    await auditLog('consent_revoked', req.user._id, { consentId, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ success: true, consentId, status: 'REVOKED' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/consents', protect, async (req, res) => {
  try {
    const { default: ConsentRecord } = await import('../models/ConsentRecord.js');
    const filter = req.user.role === 'patient'
      ? { patientId: req.user._id }
      : { doctorId: req.user._id };
    const list = await ConsentRecord.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    const now = new Date();
    res.json(list.map((c) => ({
      ...c,
      effectiveStatus: c.status === 'GRANTED' && c.expiresAt && new Date(c.expiresAt) < now ? 'EXPIRED' : c.status,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

