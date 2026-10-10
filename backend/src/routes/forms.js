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

// File 22 P1-20: charted score -> alert doorway. Only RED bands fire (amber
// is a nursing prompt, not an alert), and the same (templateKey, encounter,
// score id) pair never fires twice for one encounter — dedup via a stable
// rule key + entityRef keeps the Action Center free of duplicates.
const raiseScoreAlert = async ({ req, templateKey, scores, patientId, encounterId, responseId }) => {
  try {
    if (!scores || typeof scores !== 'object') return;
    const { raiseAlert } = await import('../lib/alerts.js');
    for (const [scoreId, s] of Object.entries(scores)) {
      if (!s || s.color !== 'red') continue;
      await raiseAlert({
        hospitalId: req.user.hospitalId,
        severity: 'critical',
        message: `${templateKey.toUpperCase()} score ${scoreId} = ${s.value} (${s.band || 'high risk'})`,
        entityRef: { kind: 'form_response', id: String(responseId), patientId, encounterId },
        ruleKey: `score-${templateKey}-${scoreId}`,
        by: actorId(req),
      });
    }
  } catch (err) {
    // Charting must never fail because the alert doorway hiccupped.
    logger.warn(`Score alert failed (${templateKey}): ${err.message}`);
  }
};

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

router.post('/templates', authorize('staff:manage'), async (req, res) => {  try {
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

// File 22 P1-20: NEWS2 / Morse / Braden seed templates (idempotent by key).
// Options are numeric strings so the sandboxed formula engine can sum them.
router.post('/templates/seed-scores', authorize('staff:manage'), async (req, res) => {
  try {
    const sel = (id, label, opts) => ({ id, type: 'select', label, required: true, options: opts });
    const seeds = [
      {
        key: 'news2', title: 'NEWS2 (adult deterioration)', category: 'scores',
        definition: { sections: [{ id: 's1', title: 'Parameters', fields: [
          sel('resp', 'Respiratory rate', ['3 — ≤8', '1 — 9–11', '0 — 12–20', '2 — 21–24', '3 — ≥25']),
          sel('spo2', 'SpO2 scale 1 (%)', ['3 — ≤91', '2 — 92–93', '1 — 94–95', '0 — ≥96']),
          sel('oxygen', 'Supplemental oxygen', ['0 — No', '2 — Yes']),
          sel('temp', 'Temperature (°C)', ['3 — ≤35.0', '1 — 35.1–36.0', '0 — 36.1–38.0', '1 — 38.1–39.0', '3 — ≥39.1']),
          sel('sys', 'Systolic BP', ['3 — ≤90', '2 — 91–100', '1 — 101–110', '0 — 111–219', '3 — ≥220']),
          sel('hr', 'Heart rate', ['3 — ≤40', '1 — 41–50', '0 — 51–90', '1 — 91–110', '2 — 111–130', '3 — ≥131']),
          sel('consc', 'Consciousness', ['0 — Alert', '3 — New confusion/agitation']),
        ] }] },
        scoring: [{ id: 'news2', formula: 'resp + spo2 + oxygen + temp + sys + hr + consc', bands: [
          { from: 0, to: 4, label: 'Low', color: 'green' },
          { from: 5, to: 6, label: 'Medium', color: 'amber' },
          { from: 7, to: 100, label: 'High', color: 'red' },
        ] }],
      },
      {
        key: 'morse-fall', title: 'Morse Fall Scale', category: 'scores',
        definition: { sections: [{ id: 's1', title: 'Risk factors', fields: [
          sel('hist', 'History of falling (25/0)', ['0 — No', '25 — Yes']),
          sel('diag', 'Secondary diagnosis (15/0)', ['0 — No', '15 — Yes']),
          sel('aid', 'Ambulatory aid', ['0 — None/bedrest/nurse', '15 — Crutches/cane/walker', '30 — Furniture']),
          sel('iv', 'IV / heparin lock (20/0)', ['0 — No', '20 — Yes']),
          sel('gait', 'Gait', ['0 — Normal/bedrest/immobile', '10 — Weak', '20 — Impaired']),
          sel('mental', 'Mental status', ['0 — Oriented', '15 — Overestimates/forgets limits']),
        ] }] },
        scoring: [{ id: 'morse', formula: 'hist + diag + aid + iv + gait + mental', bands: [
          { from: 0, to: 24, label: 'No risk', color: 'green' },
          { from: 25, to: 50, label: 'Low risk', color: 'amber' },
          { from: 51, to: 200, label: 'High risk', color: 'red' },
        ] }],
      },
      {
        key: 'braden', title: 'Braden Pressure-Ulcer Risk', category: 'scores',
        definition: { sections: [{ id: 's1', title: 'Subscales (1–4)', fields: [
          sel('sensory', 'Sensory perception', ['1 — Completely limited', '2 — Very limited', '3 — Slightly limited', '4 — No impairment']),
          sel('moist', 'Moisture', ['1 — Constantly moist', '2 — Very moist', '3 — Occasionally moist', '4 — Rarely moist']),
          sel('activity', 'Activity', ['1 — Bedfast', '2 — Chairfast', '3 — Walks occasionally', '4 — Walks frequently']),
          sel('mobility', 'Mobility', ['1 — Completely immobile', '2 — Very limited', '3 — Slightly limited', '4 — No limitation']),
          sel('nutri', 'Nutrition', ['1 — Very poor', '2 — Probably inadequate', '3 — Adequate', '4 — Excellent']),
          sel('friction', 'Friction & shear', ['1 — Problem', '2 — Potential problem', '3 — No apparent problem']),
        ] }] },
        scoring: [{ id: 'braden', formula: 'sensory + moist + activity + mobility + nutri + friction', bands: [
          { from: 0, to: 9, label: 'Very high risk', color: 'red' },
          { from: 10, to: 12, label: 'High risk', color: 'red' },
          { from: 13, to: 14, label: 'Moderate risk', color: 'amber' },
          { from: 15, to: 18, label: 'Mild risk', color: 'amber' },
          { from: 19, to: 30, label: 'No risk', color: 'green' },
        ] }],
      },
    ];
    const created = [];
    for (const s of seeds) {
      const exists = await FormTemplate.findOne({ hospitalId: req.user.hospitalId, key: s.key });
      if (exists) continue;
      // eslint-disable-next-line no-await-in-loop
      await FormTemplate.create({
        hospitalId: req.user.hospitalId, key: s.key, title: s.title,
        category: s.category, version: 1, status: 'Published',
        definition: s.definition, scoring: s.scoring, createdBy: actorId(req),
      });
      created.push(s.key);
    }
    return res.status(201).json({ created });
  } catch (err) {
    logger.error(`Seed scores error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/templates/:id/publish', authorize('staff:manage'), requireObjectId, async (req, res) => {  try {
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
    const { computed, scores } = computeTemplate(template, parsed.data);
    const row = await FormResponse.create({
      hospitalId: req.user.hospitalId, templateKey, templateVersion: template.version,
      encounterId: encounterId || null, patientId,
      values: parsed.data, computed, scores, createdBy: actorId(req),
    });
    // File 22 P1-20: a red-band score (NEWS2 High, Morse High risk, Braden
    // Very/High risk) goes through the same alert doorway as the rule engine,
    // so the Action Center sees it within seconds of charting.
    await raiseScoreAlert({ req, templateKey, scores, patientId, encounterId, responseId: row._id });
    return res.status(201).json({ id: String(row._id), computed, scores });
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
    const recomputed = computeTemplate(template, parsed.data);
    row.computed = recomputed.computed;
    row.scores = recomputed.scores;
    await row.save();
    await raiseScoreAlert({
      req, templateKey: row.templateKey, scores: row.scores,
      patientId: row.patientId, encounterId: row.encounterId, responseId: row._id,
    });
    return res.json({ id: String(row._id), scores: row.scores });
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
    const amended = computeTemplate(template, parsed.data);
    const row = await FormResponse.create({
      hospitalId: prev.hospitalId, templateKey: prev.templateKey, templateVersion: prev.templateVersion,
      encounterId: prev.encounterId, patientId: prev.patientId,
      values: parsed.data, computed: amended.computed, scores: amended.scores,
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
