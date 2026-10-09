import express from 'express';
import crypto from 'node:crypto';
import PDFDocument from 'pdfkit';
import FormTemplate from '../models/FormTemplate.js';
import FormResponse from '../models/FormResponse.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireStepUp } from '../middleware/stepUpAuth.js';
import { auditLog } from '../middleware/audit.js';
import { schemaFromTemplate, computeTemplate, FIELD_TYPES } from '../lib/formEngine.js';
import logger from '../config/logger.js';

// File 14 §14.1: versioned form templates + pinned responses + sign/amend.
// Signing is step-up gated; signed rows are read-only (addenda only).

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id)) ? next() : res.status(404).json({ message: 'Not found' })
);
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

const validateTemplateShape = (body) => {
  const sections = body?.definition?.sections;
  if (!Array.isArray(sections) || !sections.length || sections.length > 50) {
    return 'definition.sections[] (1-50) required';
  }
  let fields = 0;
  for (const sec of sections) {
    for (const f of (sec.fields || [])) {
      fields += 1;
      if (!f.id || !FIELD_TYPES.includes(f.type)) return `bad field: ${f.id || '?'}`;
    }
  }
  if (fields > 300) return 'too many fields (max 300)';
  return null;
};

// ─── Templates ──────────────────────────────────────────────────────────────
router.get('/templates', authorize('staff:manage', 'records:read'), async (req, res) => {
  try {
    const { status, context } = req.query;
    const filter = { ...tenantFilter(req) };
    if (status) filter.status = status;
    if (context) filter.contexts = context;
    const rows = await FormTemplate.find(filter).sort({ key: 1, version: -1 }).limit(200).lean();
    return res.json({ templates: rows });
  } catch (err) {
    logger.error(`Forms templates error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/templates', authorize('staff:manage'), async (req, res) => {
  try {
    const { key, title, category, definition, scoring, printTemplateId, contexts } = req.body || {};
    if (!key || !title) return res.status(400).json({ message: 'key + title required' });
    const shapeErr = validateTemplateShape(req.body);
    if (shapeErr) return res.status(400).json({ message: shapeErr });
    const latest = await FormTemplate.findOne({ hospitalId: req.user.hospitalId, key }).sort({ version: -1 }).lean();
    const row = await FormTemplate.create({
      hospitalId: req.user.hospitalId, key, title, category: category || '',
      version: (latest?.version || 0) + 1, status: 'Draft',
      definition, scoring: scoring || [], printTemplateId: printTemplateId || null,
      contexts: contexts || [], createdBy: actorId(req),
    });
    await auditLog('form_template_created', actorId(req), { templateId: row._id, key, ip: req.ip });
    return res.status(201).json({ id: String(row._id), version: row.version });
  } catch (err) {
    logger.error(`Form template error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/templates/:id/publish', authorize('staff:manage'), requireObjectId, async (req, res) => {
  try {
    const row = await FormTemplate.findById(req.params.id);
    if (!row || row.status !== 'Draft') return res.status(404).json({ message: 'Draft template not found' });
    const shapeErr = validateTemplateShape({ definition: row.definition });
    if (shapeErr) return res.status(400).json({ message: shapeErr });
    row.status = 'Published';
    await row.save();
    await auditLog('form_template_published', actorId(req), { templateId: row._id, version: row.version, ip: req.ip });
    return res.json({ id: String(row._id), version: row.version, status: row.status });
  } catch (err) {
    logger.error(`Form publish error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/contexts/:context', authorize('staff:manage', 'records:read'), async (req, res) => {
  try {
    const rows = await FormTemplate.find({
      ...tenantFilter(req), status: 'Published', contexts: req.params.context,
    }).sort({ key: 1, version: -1 }).lean();
    // Latest published version per key.
    const seen = new Map();
    for (const r of rows) {
      if (!seen.has(r.key)) seen.set(r.key, r);
    }
    return res.json({ templates: [...seen.values()] });
  } catch (err) {
    logger.error(`Form contexts error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Responses ──────────────────────────────────────────────────────────────
router.post('/responses', authorize('records:write'), async (req, res) => {
  try {
    const { templateKey, encounterId, patientId, values } = req.body || {};
    const template = await FormTemplate.findOne({
      ...tenantFilter(req), key: templateKey, status: 'Published',
    }).sort({ version: -1 });
    if (!template) return res.status(404).json({ message: 'Published template not found' });
    const parsed = schemaFromTemplate(template).safeParse(values || {});
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues.slice(0, 20) });
    const { computed } = computeTemplate(template, parsed.data);
    const row = await FormResponse.create({
      hospitalId: req.user.hospitalId, templateKey, templateVersion: template.version,
      encounterId: encounterId || null, patientId,
      values: parsed.data, computed, createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(row._id), computed });
  } catch (err) {
    logger.error(`Form response error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.put('/responses/:id', authorize('records:write'), requireObjectId, async (req, res) => {
  try {
    const row = await FormResponse.findById(req.params.id);
    if (!row || row.status !== 'Draft') return res.status(404).json({ message: 'Draft response not found' });
    const template = await FormTemplate.findOne({
      hospitalId: row.hospitalId, key: row.templateKey, version: row.templateVersion,
    });
    if (!template) return res.status(410).json({ message: 'Template version retired' });
    const parsed = schemaFromTemplate(template).safeParse(req.body?.values || {});
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues.slice(0, 20) });
    row.values = parsed.data;
    row.computed = computeTemplate(template, parsed.data).computed;
    await row.save();
    return res.json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Form update error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/responses/:id/sign', authorize('records:write'), requireObjectId, requireStepUp('records:amend'), async (req, res) => {
  try {
    const row = await FormResponse.findById(req.params.id);
    if (!row || row.status !== 'Draft') return res.status(404).json({ message: 'Draft response not found' });
    const hash = crypto.createHash('sha256').update(JSON.stringify({ v: row.values, t: row.templateKey, n: row.templateVersion })).digest('hex');
    row.status = 'Signed';
    row.signatures.push({ role: req.user.role, userId: actorId(req), at: new Date(), hash });
    await row.save();
    await auditLog('form_signed', actorId(req), { responseId: row._id, hash, ip: req.ip });
    return res.json({ id: String(row._id), status: row.status, hash });
  } catch (err) {
    logger.error(`Form sign error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/responses/:id/amend', authorize('records:write'), requireObjectId, async (req, res) => {
  try {
    const { values, reason } = req.body || {};
    if (!reason) return res.status(400).json({ message: 'amendment reason required' });
    const prev = await FormResponse.findById(req.params.id);
    if (!prev || prev.status !== 'Signed') return res.status(404).json({ message: 'Signed response not found' });
    const template = await FormTemplate.findOne({
      hospitalId: prev.hospitalId, key: prev.templateKey, version: prev.templateVersion,
    });
    if (!template) return res.status(410).json({ message: 'Template version retired' });
    const parsed = schemaFromTemplate(template).safeParse(values || {});
    if (!parsed.success) return res.status(400).json({ message: 'Validation failed', issues: parsed.error.issues.slice(0, 20) });
    prev.status = 'Amended';
    await prev.save();
    const row = await FormResponse.create({
      hospitalId: prev.hospitalId, templateKey: prev.templateKey, templateVersion: prev.templateVersion,
      encounterId: prev.encounterId, patientId: prev.patientId,
      values: parsed.data, computed: computeTemplate(template, parsed.data).computed,
      status: 'Draft', amendmentOf: prev._id, amendmentReason: String(reason).slice(0, 1000),
      createdBy: actorId(req),
    });
    await auditLog('form_amended', actorId(req), { responseId: row._id, of: prev._id, ip: req.ip });
    return res.status(201).json({ id: String(row._id) });
  } catch (err) {
    logger.error(`Form amend error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/responses/:id/pdf', authorize('records:read', 'records:read:own'), requireObjectId, async (req, res) => {
  try {
    const row = await FormResponse.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ message: 'Not found' });
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="form-${row.templateKey}-v${row.templateVersion}.pdf"`);
    doc.pipe(res);
    doc.fontSize(16).text(`Form: ${row.templateKey} (v${row.templateVersion}) — ${row.status}`);
    doc.moveDown();
    doc.fontSize(10);
    for (const [k, v] of Object.entries(row.values || {})) {
      doc.text(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}`);
    }
    if (row.signatures?.length) {
      doc.moveDown().fontSize(10).text('Signatures:');
      for (const s of row.signatures) doc.text(`- ${s.role} at ${s.at} (hash ${String(s.hash).slice(0, 16)}…)`);
    }
    doc.end();
  } catch (err) {
    logger.error(`Form pdf error: ${err.message}`);
    if (!res.headersSent) return res.status(500).json({ message: err.message });
  }
});

export default router;
