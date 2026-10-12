import express from 'express';
import AntenatalRecord from '../models/AntenatalRecord.js';
import LabourRecord from '../models/LabourRecord.js';
import BirthRecord from '../models/BirthRecord.js';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 09 §04.7: antenatal cards, visits, labour/partogram, delivery close-out
// (creates the BirthRecord for CRS data).

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const CLINICAL = ['doctor', 'clinic_doctor', 'nurse', 'hospital_admin', 'superadmin'];
const clinicalOnly = (req, res, next) => (
  CLINICAL.includes(req.user?.role) ? next() : res.status(403).json({ message: 'Clinical access required' })
);
const OBJECT_ID = /^[0-9a-f]{24}$/i;

router.post('/antenatal', clinicalOnly, async (req, res) => {
  try {
    const { patientId, lmp, edd, gravida, para, riskFlags } = req.body || {};
    if (!OBJECT_ID.test(String(patientId || ''))) return res.status(400).json({ message: 'patientId required' });
    const row = await AntenatalRecord.create({
      patientId, hospitalId: req.user.hospitalId,
      lmp: lmp || null, edd: edd || null,
      gravida: Number(gravida) || 0, para: Number(para) || 0,
      riskFlags: riskFlags || [], createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`ANC error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/antenatal/:id/visits', clinicalOnly, async (req, res) => {
  try {
    const row = await AntenatalRecord.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    row.visits.push({ ...req.body, by: actorId(req) });
    await row.save();
    return res.json({ id: String(row._id), visits: row.visits.length });
  } catch (err) {
    logger.error(`ANC visit error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/antenatal', clinicalOnly, async (req, res) => {
  try {
    const { patientId, status } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (patientId) filter.patientId = patientId;
    if (status) filter.status = status;
    const rows = await AntenatalRecord.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
    return res.json({ records: rows });
  } catch (err) {
    logger.error(`ANC list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/labour', clinicalOnly, async (req, res) => {
  try {
    const { antenatalId, admissionId, patientId, onsetAt } = req.body || {};
    if (!OBJECT_ID.test(String(patientId || ''))) return res.status(400).json({ message: 'patientId required' });
    const row = await LabourRecord.create({
      antenatalId: antenatalId || null, admissionId: admissionId || null,
      patientId, hospitalId: req.user.hospitalId,
      onsetAt: onsetAt || null, createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Labour error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/labour/:id/deliver', clinicalOnly, async (req, res) => {
  try {
    const row = await LabourRecord.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    const { deliveryType, babyWeightKg, babySex, notes } = req.body || {};
    row.deliveryAt = new Date();
    row.deliveryType = deliveryType || '';
    row.babyWeightKg = Number(babyWeightKg) || 0;
    row.babySex = babySex || '';
    row.notes = String(notes || '').slice(0, 2000);
    await row.save();
    const birth = await BirthRecord.create({
      hospitalId: row.hospitalId, motherId: row.patientId,
      admissionId: row.admissionId, weightKg: row.babyWeightKg, sex: row.babySex,
      timeOfBirth: row.deliveryAt, deliveryType: row.deliveryType,
    });
    await AntenatalRecord.updateOne({ _id: row.antenatalId }, { $set: { status: 'Delivered' } }).catch(() => {});
    await auditLog('delivery_recorded', actorId(req), { labourId: row._id, birthId: birth._id, ip: req.ip });
    return res.json({ id: String(row._id), birthId: String(birth._id) });
  } catch (err) {
    logger.error(`Deliver error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Checklist L9: birth certificate PDF — CRS data lives on the BirthRecord the
// delivery close-out created; server-rendered like every other statutory PDF.
router.get('/births/:id/certificate', clinicalOnly, async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const row = await BirthRecord.findOne(filter);
    if (!row) return res.status(404).json({ message: 'Birth record not found' });
    let motherName = '';
    if (row.motherId) {
      try {
        const { default: User } = await import('../models/User.js');
        motherName = (await User.findById(row.motherId).select('name'))?.name || '';
      } catch { /* mother lookup is cosmetic — PDF still prints */ }
    }
    let hospitalName = '';
    if (row.hospitalId) {
      try {
        const { default: Hospital } = await import('../models/Hospital.js');
        hospitalName = (await Hospital.findById(row.hospitalId).select('name'))?.name || '';
      } catch { /* cosmetic */ }
    }
    const { generateBirthCertificatePDF } = await import('../services/pdfService.js');
    const { sealDoc } = await import('../lib/docSeal.js');
    const { default: SignatureEvent } = await import('../models/SignatureEvent.js');

    const buffer = await generateBirthCertificatePDF({
      ...(row.toObject?.() ?? row), birthId: String(row._id), motherName, hospitalName,
    });

    const seal = sealDoc('birth', String(row._id), buffer);
    try {
      await SignatureEvent.create({
        hospitalId: row.hospitalId,
        docRef: { kind: 'birth', id: row._id },
        level: 'L2',
        signerRole: 'staff',
        signerId: req.user._id,
        signerName: req.user.name || 'Clinical Staff',
        intent: 'Seal statutory birth certificate',
        digest: seal.digest,
        signature: seal.signature,
        nonceHash: seal.nonceHash,
        ip: req.ip,
        device: req.get('user-agent') || '',
      });
    } catch (sigErr) {
      logger.warn(`SignatureEvent recording failed for birth certificate: ${sigErr.message}`);
    }

    await auditLog('birth_certificate_printed', actorId(req), {
      birthId: row._id,
      digest: seal.digest,
      nonce: seal.nonce,
      ip: req.ip,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('X-Doc-Seal-Nonce', seal.nonce);
    res.setHeader('X-Doc-Seal-Signature', seal.signature);
    res.setHeader('Content-Disposition', `attachment; filename="birth-certificate-${row.certificateNo || String(row._id)}.pdf"`);
    return res.send(buffer);
  } catch (err) {
    logger.error(`Birth certificate error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Statutory Civil Registration System (CRS) data export for births (CSV)
router.get('/crs-export', clinicalOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (req.query.from || req.query.to) {
      filter.timeOfBirth = {};
      if (req.query.from) filter.timeOfBirth.$gte = new Date(req.query.from);
      if (req.query.to) filter.timeOfBirth.$lte = new Date(req.query.to);
    }
    const rows = await BirthRecord.find(filter).lean();
    const csvHeader = 'BirthRecordId,CertificateNo,Sex,WeightKg,TimeOfBirth,DeliveryType,MotherId,HospitalId\n';
    const csvRows = rows.map((r) => [
      String(r._id),
      r.certificateNo || '',
      r.sex || '',
      r.weightKg || '',
      r.timeOfBirth ? new Date(r.timeOfBirth).toISOString() : '',
      r.deliveryType || '',
      String(r.motherId || ''),
      String(r.hospitalId || ''),
    ].join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="crs-birth-records.csv"');
    return res.send(csvHeader + csvRows);
  } catch (err) {
    logger.error(`CRS export error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
