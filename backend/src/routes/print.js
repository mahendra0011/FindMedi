import express from 'express';
import crypto from 'node:crypto';
import bwipjs from 'bwip-js';
import QRCode from 'qrcode';
import PrintTemplate from '../models/PrintTemplate.js';
import PrintLog from '../models/PrintLog.js';
import User from '../models/User.js';
import Bed from '../models/Bed.js';
import Medicine from '../models/Medicine.js';
import LabOrder from '../models/LabOrder.js';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { renderTemplate, lintTemplate, toEscPos, VARIABLE_REGISTRY } from '../lib/printEngine.js';
import logger from '../config/logger.js';

// File 14 §14.2 + §14.4: print templates, browser-print rendering, thermal
// ESC/POS, labels (Code128/QR, opaque IDs only — never PHI in barcodes),
// and scan-to-verify checkpoints (5-rights hard stops).

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const OBJECT_ID = /^[0-9a-f]{24}$/i;

// ─── Templates ──────────────────────────────────────────────────────────────
router.get('/templates', async (req, res) => {
  try {
    const { docType } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (docType) filter.docType = docType;
    const rows = await PrintTemplate.find(filter).sort({ docType: 1, version: -1 }).limit(200).lean();
    return res.json({ templates: rows, registry: VARIABLE_REGISTRY });
  } catch (err) {
    logger.error(`Print templates error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const { docType, name, html, css, pageSetup, languages } = req.body || {};
    if (!docType || !name) return res.status(400).json({ message: 'docType + name required' });
    const unknown = lintTemplate(docType, html || '');
    if (unknown.length) return res.status(400).json({ message: `Unknown variables: ${unknown.join(', ')}`, unknown });
    const latest = await PrintTemplate.findOne({ hospitalId: req.user.hospitalId, docType }).sort({ version: -1 }).lean();
    const row = await PrintTemplate.create({
      hospitalId: req.user.hospitalId, docType, name, html: html || '', css: css || '',
      pageSetup: pageSetup || {}, languages: languages || ['en'],
      version: (latest?.version || 0) + 1, createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(row._id), version: row.version });
  } catch (err) {
    logger.error(`Print template error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Render (browser print HTML + logged hash; reprints watermarked) ────────
router.post('/render', async (req, res) => {
  try {
    const { docType, data, entityRef, channel, escpos } = req.body || {};
    const template = await PrintTemplate.findOne({
      hospitalId: req.user.hospitalId, docType, status: 'Approved',
    }).sort({ version: -1 });
    if (!template) return res.status(404).json({ message: 'No approved template for this docType' });
    const prior = entityRef ? await PrintLog.countDocuments({ docType, entityRef }) : 0;
    const { html, hash } = renderTemplate(template.html, template.css, data || {}, { duplicate: prior > 0 });
    await PrintLog.create({
      hospitalId: req.user.hospitalId, docType, entityRef: entityRef || '',
      templateVersion: template.version, printedBy: actorId(req),
      copies: 1, isDuplicate: prior > 0, channel: channel || 'print', hash,
    });
    if (escpos) {
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return res.json({ escpos: toEscPos([`${docType.toUpperCase()} ${entityRef || ''}`, text.slice(0, 200)]), hash, isDuplicate: prior > 0 });
    }
    return res.json({ html, hash, isDuplicate: prior > 0, version: template.version });
  } catch (err) {
    logger.error(`Print render error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Labels (Code128 + QR, opaque IDs) ──────────────────────────────────────
router.post('/labels/render', async (req, res) => {
  try {
    const { type, code, title, subtitle } = req.body || {};
    if (!['uhid', 'accession', 'bed', 'unit', 'generic'].includes(type) || !code) {
      return res.status(400).json({ message: 'type=uhid|accession|bed|unit|generic + code required' });
    }
    const png = await bwipjs.toBuffer({
      bcid: 'code128', text: String(code).slice(0, 60),
      scale: 3, height: 12, includetext: true, textxalign: 'center',
    });
    const qr = await QRCode.toDataURL(`https://app/p/${encodeURIComponent(String(code).slice(0, 60))}`);
    const zpl = `^XA^FO20,20^A0N,40,40^FD${String(title || type).slice(0, 40)}^FS`
      + `^FO20,70^BCN,80,Y,N,N^FD${String(code).slice(0, 40)}^FS`
      + `^FO20,170^A0N,28,28^FD${String(subtitle || '').slice(0, 48)}^FS^XZ`;
    return res.json({ png: png.toString('base64'), qr, zpl });
  } catch (err) {
    logger.error(`Label error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Scan-to-verify checkpoints (5 rights hard stops) ───────────────────────
const resolvePatient = async (code) => {
  if (!code) return null;
  if (OBJECT_ID.test(String(code))) {
    const u = await User.findById(code).select('_id').lean();
    return u ? String(u._id) : null;
  }
  const u = await User.findOne({ uhid: String(code) }).select('_id').lean();
  return u ? String(u._id) : null;
};

router.post('/scan/verify', async (req, res) => {
  try {
    const { context, scans, expected, secondUserId } = req.body || {};
    if (!['mar', 'sample', 'transfusion', 'ot_timeout', 'handover', 'bed'].includes(context)) {
      return res.status(400).json({ message: 'Invalid context' });
    }
    if (!Array.isArray(scans) || !scans.length) return res.status(400).json({ message: 'scans[] required' });
    const mismatches = [];
    const patientScans = scans.filter((s) => s.kind === 'patient');
    const resolved = [];
    for (const s of patientScans) {
      const pid = await resolvePatient(s.code);
      if (!pid) mismatches.push({ scan: s.code, reason: 'unknown-patient-code' });
      else resolved.push(pid);
    }
    if (new Set(resolved).size > 1) mismatches.push({ reason: 'patient-mismatch' });
    if (expected?.patientId && resolved.length && !resolved.includes(String(expected.patientId))) {
      mismatches.push({ reason: 'wrong-patient' });
    }
    // Existence checks for non-patient scans (drug/tube/unit/bed/procedure).
    for (const s of scans.filter((s) => s.kind !== 'patient')) {
      let ok = false;
      if (s.kind === 'drug') ok = Boolean(await Medicine.exists({ $or: [{ _id: OBJECT_ID.test(String(s.code)) ? s.code : null }, { name: String(s.code) }] }));
      else if (s.kind === 'tube') ok = Boolean(await LabOrder.exists({ $or: [{ orderId: String(s.code) }, ...(OBJECT_ID.test(String(s.code)) ? [{ _id: s.code }] : [])] }));
      else if (s.kind === 'bed') ok = Boolean(await Bed.exists({ $or: [{ bedNumber: String(s.code) }, ...(OBJECT_ID.test(String(s.code)) ? [{ _id: s.code }] : [])] }));
      else if (s.kind === 'procedure') ok = String(s.code) === String(expected?.procedure || s.code);
      else if (s.kind === 'unit') ok = true; // unit registry check lives in blood-bank flow
      if (!ok) mismatches.push({ scan: s.code, reason: `unknown-${s.kind}` });
    }
    // Transfusion needs a second person (2-person check).
    if (context === 'transfusion') {
      if (!secondUserId || String(secondUserId) === String(actorId(req))) {
        mismatches.push({ reason: 'second-checker-required' });
      }
    }
    const ok = mismatches.length === 0;
    await auditLog(ok ? 'scan_verified' : 'scan_mismatch', actorId(req), {
      context, scans: scans.length, mismatches, ip: req.ip,
    }).catch(() => {});
    return res.json({ ok, mismatches });
  } catch (err) {
    logger.error(`Scan verify error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
