import crypto from 'crypto';
import express from 'express';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { z } from 'zod';
import Record from '../models/Record.js';
import User from '../models/User.js';
import SignatureEvent from '../models/SignatureEvent.js';
import { sealDoc } from '../lib/docSeal.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate, objectIdSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import { paginatedResults } from '../utils/pagination.js';
import { getISTDateString } from '../utils/dateUtils.js';

const router = express.Router();

const CERTIFICATE_TYPES = ['sick_leave', 'fitness', 'referral', 'immunization', 'other'];

const CERTIFICATE_TYPE_LABELS = {
  sick_leave: 'Sick Leave Certificate',
  fitness: 'Fitness Certificate',
  referral: 'Referral Letter',
  immunization: 'Immunization Certificate',
  other: 'Medical Certificate',
};

const createCertificateSchema = z.object({
  patientId: objectIdSchema,
  type: z.enum(CERTIFICATE_TYPES).optional().default('other'),
  title: z.string().trim().min(2, 'Title is required').max(200),
  diagnosis: z.string().trim().max(2000).optional().default(''),
  daysRest: z.number().int().positive().max(365).optional(),
  validFrom: z.string().trim().max(40).optional().default(''),
  validTo: z.string().trim().max(40).optional().default(''),
  notes: z.string().trim().max(4000).optional().default(''),
  encounterId: objectIdSchema.optional(),
});

router.use(protect);

router.post('/', authorize('records:write', 'prescriptions:write'), validate(createCertificateSchema), async (req, res) => {
  try {
    const { patientId, type, title, diagnosis, daysRest, validFrom, validTo, notes, encounterId } = req.body;
    const patientUser = await User.findById(patientId).select('name role');
    if (!patientUser || patientUser.role !== 'patient') {
      return res.status(404).json({ message: 'Patient not found' });
    }
    const record = await Record.create({
      patient: patientUser.name,
      patientId,
      doctor: req.user.name || '',
      doctorId: req.user.doctorProfileId || null,
      hospitalId: req.user.hospitalId || undefined,
      encounterId: encounterId || null,
      date: getISTDateString(),
      type: 'medical_certificate',
      diagnosis: diagnosis || '',
      notes: notes || '',
      data: {
        certificateType: type,
        title,
        daysRest: daysRest ?? null,
        validFrom: validFrom || '',
        validTo: validTo || '',
        verificationCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
        createdBy: String(req.user._id),
      },
    });
    const verifyUrl = `/verify/doc/certificate/${record._id}`;
    record.data.verifyUrl = verifyUrl;
    await record.save();
    await auditLog('create_medical_certificate', req.user._id, {
      recordId: record._id, certificateType: type, patientId, ip: req.ip, userAgent: req.get('user-agent'),
    });
    await record.populate('doctorId', 'name specialization');
    const certJson = record.toObject ? record.toObject() : { ...record };
    certJson.verifyUrl = verifyUrl;
    res.status(201).json({ certificate: certJson, verifyUrl });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/', authorize('records:read', 'records:read:own'), async (req, res) => {
  try {
    const { page, limit, patientId } = req.query;
    const filter = { type: 'medical_certificate', deletedAt: { $exists: false } };
    let scoped = false;

    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
      scoped = true;
    } else if (['doctor', 'counsellor', 'psychiatrist', 'clinic_doctor'].includes(req.user.role)) {
      filter.doctorId = req.user.doctorProfileId;
      if (req.user.hospitalId) filter.hospitalId = req.user.hospitalId;
      scoped = true;
    } else if (req.user.role === 'hospital_admin' && req.user.hospitalId) {
      filter.hospitalId = req.user.hospitalId;
      scoped = true;
    }

    if (!scoped) {
      return res.json({ data: [], total: 0, page: 1, limit: parseInt(limit, 10) || 50, totalPages: 0 });
    }

    if (patientId) {
      if (req.user.role === 'patient' && String(patientId) !== String(req.user._id)) {
        return res.json({ data: [], total: 0, page: 1, limit: parseInt(limit, 10) || 50, totalPages: 0 });
      }
      filter.patientId = patientId;
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
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const canAccessCertificateDoc = (req, record) => {
  if (!record) return false;
  if (req.user.role === 'patient') {
    return Boolean(record.patientId && String(record.patientId._id || record.patientId) === String(req.user._id));
  }
  if (['doctor', 'clinic_doctor', 'counsellor', 'psychiatrist'].includes(req.user.role)) {
    const own = (req.user.doctorProfileId || req.user._id)?.toString();
    if (record.doctorId && String(record.doctorId._id || record.doctorId) === own) return true;
  }
  if (req.user.hospitalId) {
    return Boolean(record.hospitalId && String(record.hospitalId) === String(req.user.hospitalId));
  }
  return false;
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

const drawMedicalCertificatePDF = async (data) => {
  let qrBuffer = null;
  if (data.verifyUrl) {
    try {
      qrBuffer = await QRCode.toBuffer(data.verifyUrl, { width: 56, margin: 1, type: 'png' });
    } catch { /* QR code generation is non-blocking */ }
  }
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try {
      const { left, right } = doc.page.margins;
      const width = doc.page.width - left - right;

      doc.roundedRect(left, 40, width, 66, 8).fill('#0f766e');
      doc.circle(left + 32, 73, 17).fill('#ffffff');
      doc.strokeColor('#0f766e').lineWidth(2.2)
        .moveTo(left + 20, 73).lineTo(left + 27, 73).lineTo(left + 31, 63)
        .lineTo(left + 38, 83).lineTo(left + 42, 73).lineTo(left + 49, 73).stroke();
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16).text(data.hospitalName, left + 58, 54);
      doc.font('Helvetica').fontSize(8.5).text('Official Medical Certificate — FindMedi', left + 58, 78);
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#ffffff').text(data.title, left, 52, { width: width - 24, align: 'right' });
      doc.font('Helvetica').fontSize(8.5).text(`Certificate No: ${data.certificateNo}`, left, 74, { width: width - 24, align: 'right' });
      doc.text(`Issued: ${data.issueDate}`, left, 88, { width: width - 24, align: 'right' });

      doc.y = 128;
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(15).text(data.title, { align: 'center' });
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(10).fillColor('#374151')
        .text('This is to certify the medical particulars of the patient named below.', { align: 'center' });
      doc.moveDown(1.2);

      let y = doc.y;
      const sectionTitle = (title) => {
        doc.fillColor('#134e4a').font('Helvetica-Bold').fontSize(11).text(title.toUpperCase(), left, y);
        doc.strokeColor('#d1d5db').lineWidth(0.6).moveTo(left, y + 16).lineTo(left + width, y + 16).stroke();
        y += 26;
      };
      const row = (label, value) => {
        doc.fillColor('#6b7280').font('Helvetica-Bold').fontSize(9.5).text(`${label}:`, left, y, { width: 140 });
        doc.fillColor('#111827').font('Helvetica').fontSize(10).text(value || '-', left + 145, y, { width: width - 145, lineGap: 2 });
        y = Math.max(doc.y, y + 15) + 5;
        doc.y = y;
      };

      sectionTitle('Patient');
      row('Name', data.patientName);
      row('Patient ID', data.patientUhid);
      row('Certificate Type', data.certificateTypeLabel);

      sectionTitle('Certificate Details');
      row('Diagnosis', data.diagnosis);
      if (data.daysRest) row('Rest Period', `${data.daysRest} day(s)`);
      if (data.validFrom) row('Valid From', data.validFrom);
      if (data.validTo) row('Valid Until', data.validTo);
      row('Additional Notes', data.notes);

      sectionTitle('Certification');
      doc.fillColor('#111827').font('Helvetica').fontSize(10);
      doc.text(
        'I hereby certify that the above-named patient was examined / attended at this clinic and the particulars '
        + 'recorded above are true and correct to the best of my knowledge and belief.',
        left, y, { width, lineGap: 3 }
      );
      y = doc.y + 44;

      doc.strokeColor('#9ca3af').lineWidth(0.7).moveTo(left + width - 220, y).lineTo(left + width, y).stroke();
      doc.fillColor('#6b7280').font('Helvetica').fontSize(8.5)
        .text(`Dr. ${data.doctorName}${data.doctorSpecialization ? ` — ${data.doctorSpecialization}` : ''}`, left + width - 220, y + 6, { width: 220, align: 'center' });
      doc.text('Issuing Clinician / Signature', left + width - 220, y + 20, { width: 220, align: 'center' });

      const footY = doc.page.height - 72;
      doc.strokeColor('#d1d5db').lineWidth(0.5).moveTo(left, footY).lineTo(left + width, footY).stroke();
      if (qrBuffer) {
        doc.image(qrBuffer, left + width - 48, footY + 4, { width: 44, height: 44 });
      }
      doc.fillColor('#6b7280').font('Helvetica').fontSize(8);
      const textWidth = qrBuffer ? width - 56 : width * 0.75;
      doc.text(`Record ID: ${data.recordId}   |   Verification Code: ${data.verificationCode}`, left, footY + 10, { width: textWidth });
      doc.text('Computer-generated certificate. Scan QR or verify online at FindMedi to validate authenticity.', left, footY + 24, { width: textWidth });
      if (!qrBuffer) {
        doc.text('Page 1 of 1', left, footY + 10, { width, align: 'right' });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

router.get('/:id/pdf', authorize('records:read', 'records:read:own'), async (req, res) => {
  try {
    const record = await Record.findById(req.params.id)
      .populate('patientId', 'name uhid email')
      .populate('doctorId', 'name specialization');
    if (!record || record.type !== 'medical_certificate') {
      return res.status(404).json({ message: 'Medical certificate not found' });
    }
    if (!canAccessCertificateDoc(req, record)) {
      await auditLog('access_denied_medical_certificate', req.user._id, {
        resourceType: 'Record', resourceId: record._id, ip: req.ip, userAgent: req.get('user-agent'),
      });
      return res.status(403).json({ message: 'Not authorized' });
    }

    let hospitalName = req.user.hospitalName || '';
    if (!hospitalName && record.hospitalId) {
      try {
        const { default: Hospital } = await import('../models/Hospital.js');
        hospitalName = (await Hospital.findById(record.hospitalId).select('name'))?.name || '';
      } catch { /* cosmetic — PDF still prints with fallback */ }
    }

    const certType = record.data?.certificateType || 'other';
    const verifyBase = `${req.protocol}://${req.get('host') || 'findmedi.local'}`;
    const verifyUrl = `${verifyBase}/verify/doc/certificate/${record._id}`;
    const pdfBuffer = await drawMedicalCertificatePDF({
      hospitalName: hospitalName || 'FindMedi Clinic',
      title: record.data?.title || CERTIFICATE_TYPE_LABELS[certType] || 'Medical Certificate',
      certificateNo: String(record._id).slice(-8).toUpperCase(),
      issueDate: formatDate(record.createdAt || new Date()),
      patientName: record.patientId?.name || record.patient || 'Patient',
      patientUhid: record.patientId?.uhid || String(record.patientId?._id || record.patientId || '-'),
      certificateTypeLabel: CERTIFICATE_TYPE_LABELS[certType] || 'Medical Certificate',
      diagnosis: record.diagnosis,
      daysRest: record.data?.daysRest,
      validFrom: record.data?.validFrom ? formatDate(record.data.validFrom) : '',
      validTo: record.data?.validTo ? formatDate(record.data.validTo) : '',
      notes: record.notes,
      doctorName: record.doctorId?.name || record.doctor || 'Authorised Signatory',
      doctorSpecialization: record.doctorId?.specialization,
      recordId: String(record._id),
      verificationCode: record.data?.verificationCode || '-',
      verifyUrl,
    });

    const seal = sealDoc('certificate', String(record._id), pdfBuffer);
    try {
      await SignatureEvent.create({
        hospitalId: record.hospitalId || req.user.hospitalId,
        docRef: { kind: 'certificate', id: record._id },
        level: 'L2',
        signerRole: ['doctor', 'clinic_doctor'].includes(req.user.role) ? 'doctor' : 'staff',
        signerId: req.user._id,
        signerName: req.user.name || record.doctor || 'Authorised Signatory',
        intent: 'Seal medical certificate',
        digest: seal.digest,
        signature: seal.signature,
        nonceHash: seal.nonceHash,
        ip: req.ip,
        device: req.get('user-agent') || '',
      });
    } catch {
      // Signature recording is non-blocking for PDF download
    }

    await auditLog('download_medical_certificate', req.user._id, {
      resourceType: 'Record', resourceId: record._id, digest: seal.digest, nonce: seal.nonce, ip: req.ip, userAgent: req.get('user-agent'),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('X-Doc-Seal-Nonce', seal.nonce);
    res.setHeader('X-Doc-Seal-Signature', seal.signature);
    res.setHeader('X-Doc-Seal-Digest', seal.digest);
    res.setHeader('X-Doc-Verify-Url', `/verify/doc/certificate/${record._id}?nonce=${seal.nonce}`);
    res.setHeader('Content-Disposition', `attachment; filename="medical-certificate-${record._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
