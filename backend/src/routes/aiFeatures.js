import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import AiReview from '../models/AiReview.js';
import AiInvocation from '../models/AiInvocation.js';
import {
  ocrDocument, checkClaim, ragAnswer, labTrendNarrative,
  draftDischargeSummary, redactPhi,
} from '../lib/aiGateway.js';

// File 22 P2-37: AI features as first-class routes. Every output is queued
// for human review (nothing AI-generated is final until a reviewer approves),
// and the global kill switch (SystemSetting ai.enabled=false) is honoured by
// aiGateway itself — this file only exposes the toggle.

const router = express.Router();
router.use(protect);

const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

const enqueue = async (req, feature, input, output, sourceId = '') => {
  try {
    const row = await AiReview.create({
      ...tenantFilter(req), feature, input, output, sourceId, by: req.user._id,
    });
    return row;
  } catch {
    return null; // review queue failure must not fail the AI call itself
  }
};

const handle = (res, err) => {
  if (err.code === 'AI_DISABLED') return res.status(423).json({ message: err.message, code: 'AI_DISABLED' });
  return res.status(500).json({ message: err.message });
};

// OCR: extract structured fields from a document's text.
router.post('/ocr', authorize('records:write'), async (req, res) => {
  try {
    const { docType = '', rawText = '', documentId = '' } = req.body || {};
    if (!rawText) return res.status(400).json({ message: 'rawText is required' });
    const { text } = redactPhi(String(rawText).slice(0, 20000));
    const fields = ocrDocument({ docType, rawText: text });
    const review = await enqueue(req, 'ocr', { docType, documentId }, fields, documentId);
    return res.json({ fields, reviewId: String(review?._id || ''), status: review?.status || 'Pending' });
  } catch (err) { return handle(res, err); }
});

// Claim-document checker: common rejection reasons before submit.
router.post('/claim-check', authorize('records:write'), async (req, res) => {
  try {
    const document = req.body?.document || {};
    const result = checkClaim(document);
    const review = await enqueue(req, 'claim_check', { claimId: req.body?.claimId || '' }, result, req.body?.claimId || '');
    return res.json({ ...result, reviewId: String(review?._id || '') });
  } catch (err) { return handle(res, err); }
});

// FAQ RAG: keyword-retrieval answer over the hospital's own FAQ rows.
router.post('/faq', authorize('staff:view'), async (req, res) => {
  try {
    const question = String(req.body?.question || '').slice(0, 500);
    if (!question) return res.status(400).json({ message: 'question is required' });
    const faq = Array.isArray(req.body?.faq) ? req.body.faq.slice(0, 200) : [];
    const out = ragAnswer(question, faq);
    return res.json(out);
  } catch (err) { return handle(res, err); }
});

// Lab-trend narrative for the EHR header.
router.post('/lab-narrative', authorize('records:read'), async (req, res) => {
  try {
    const results = Array.isArray(req.body?.results) ? req.body.results.slice(0, 200) : [];
    const narrative = labTrendNarrative(results);
    const review = await enqueue(req, 'lab_narrative', { count: results.length }, { narrative }, req.body?.orderId || '');
    return res.json({ narrative, reviewId: String(review?._id || '') });
  } catch (err) { return handle(res, err); }
});

// Discharge draft (same gateway as insights, plus explicit review row).
router.post('/discharge-draft', authorize('staff:manage'), async (req, res) => {
  try {
    const out = await draftDischargeSummary({
      hospitalId: req.user.hospitalId, fields: req.body?.fields || {}, by: req.user._id,
    });
    const review = await enqueue(req, 'discharge_draft', req.body?.fields || {}, { draft: out.draft });
    return res.json({ ...out, reviewId: String(review?._id || '') });
  } catch (err) { return handle(res, err); }
});

// Human-review queue.
router.get('/reviews', authorize('records:read'), async (req, res) => {
  try {
    const f = { ...tenantFilter(req) };
    if (req.query.status) f.status = req.query.status;
    if (req.query.feature) f.feature = req.query.feature;
    const rows = await AiReview.find(f).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ reviews: rows });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

router.patch('/reviews/:id', authorize('records:amend'), async (req, res) => {
  try {
    const { status, reviewerNote, output } = req.body || {};
    if (!['Approved', 'Rejected', 'Edited'].includes(status)) {
      return res.status(400).json({ message: 'status must be Approved|Rejected|Edited' });
    }
    const patch = {
      status, reviewerId: req.user._id, reviewedAt: new Date(),
      reviewerNote: String(reviewerNote || '').slice(0, 500),
    };
    if (output && typeof output === 'object') patch.output = output;
    const row = await AiReview.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) }, { $set: patch }, { new: true },
    );
    if (!row) return res.status(404).json({ message: 'Not found' });
    await auditLog('ai_review_decided', req.user._id, { id: String(row._id), status, feature: row.feature });
    return res.json({ review: row });
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

// Kill switch: superadmin toggles SystemSetting ai.enabled. aiGateway reads
// it on every call, so the effect is immediate (no restart).
router.get('/kill-switch', authorize('staff:manage'), async (req, res) => {
  try {
    const { default: SystemSetting } = await import('../models/SystemSetting.js');
    const row = await SystemSetting.findOne({ key: 'ai.enabled' }).lean();
    const enabled = row ? row.value !== 'false' && row.value !== false : true;
    return res.json({ enabled });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

router.post('/kill-switch', authorize('staff:manage'), async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'hospital_admin') {
      return res.status(403).json({ message: 'Only admins can toggle the AI kill switch' });
    }
    const enabled = req.body?.enabled !== false;
    const { default: SystemSetting } = await import('../models/SystemSetting.js');
    await SystemSetting.findOneAndUpdate(
      { key: 'ai.enabled' },
      { key: 'ai.enabled', value: enabled, description: 'Global AI kill switch', updatedBy: String(req.user._id), updatedAt: new Date() },
      { upsert: true },
    );
    await auditLog('ai_kill_switch', req.user._id, { enabled, ip: req.ip });
    return res.json({ enabled });
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

// Invocation audit trail (already written by aiGateway on every call).
router.get('/invocations', authorize('staff:manage'), async (req, res) => {
  try {
    const rows = await AiInvocation.find(tenantFilter(req)).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ invocations: rows });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

export default router;
