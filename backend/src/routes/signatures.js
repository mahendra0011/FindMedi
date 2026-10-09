import express from 'express';
import SignatureEvent from '../models/SignatureEvent.js';
import { protect } from '../middleware/auth.js';
import { requireStepUp } from '../middleware/stepUpAuth.js';
import { auditLog } from '../middleware/audit.js';
import { sealDoc } from '../lib/docSeal.js';
import logger from '../config/logger.js';

// File 14 §14.5: L1 drawn capture (patient/relative/witness) + L2 staff
// e-sign (step-up + intent). Multi-party order patient → witness → doctor.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const ORDER = ['patient', 'relative', 'witness', 'doctor', 'staff'];

// L1: drawn signature capture (no step-up; identity comes from the session
// for patients, name+relation for relatives).
router.post('/l1', async (req, res) => {
  try {
    const { docKind, docId, signerRole, signerName, relation, language, imageRef } = req.body || {};
    if (!['patient', 'relative', 'witness'].includes(signerRole)) {
      return res.status(400).json({ message: 'L1 is for patient/relative/witness' });
    }
    if (!docId) return res.status(400).json({ message: 'docId required' });
    const prior = await SignatureEvent.find({ 'docRef.id': docId }).select('signerRole').lean();
    const have = new Set(prior.map((p) => p.signerRole));
    const need = ORDER.slice(0, ORDER.indexOf(signerRole)).filter((r) => ['patient', 'relative', 'witness'].includes(r));
    // Patient-first ordering: witness needs patient/relative first.
    if (signerRole === 'witness' && !have.has('patient') && !have.has('relative')) {
      return res.status(409).json({ message: 'Patient or relative must sign first' });
    }
    void need;
    const seal = sealDoc(docKind || 'other', String(docId), Buffer.from(`${docId}:${signerRole}:${Date.now()}`));
    const row = await SignatureEvent.create({
      hospitalId: req.user.hospitalId, docRef: { kind: docKind || 'other', id: docId },
      level: 'L1', signerRole, signerId: signerRole === 'patient' ? actorId(req) : null,
      signerName: signerName || req.user.name || '', relation: relation || '',
      language: language || 'en', imageRef: imageRef || '',
      digest: seal.digest, signature: seal.signature, nonceHash: seal.nonceHash,
      ip: req.ip, device: String(req.headers?.['user-agent'] || '').slice(0, 300),
    });
    await auditLog('doc_signed_l1', actorId(req), { eventId: row._id, docId, role: signerRole, ip: req.ip });
    return res.status(201).json({ id: String(row._id), nonce: seal.nonce });
  } catch (err) {
    logger.error(`Sign L1 error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// L2: staff e-sign (step-up + typed intent + stored image already on file).
router.post('/l2', requireStepUp('records:amend'), async (req, res) => {
  try {
    const { docKind, docId, intent, language } = req.body || {};
    if (!['doctor', 'staff'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Clinical staff only' });
    }
    if (!docId || !intent) return res.status(400).json({ message: 'docId + intent required' });
    const seal = sealDoc(docKind || 'other', String(docId), Buffer.from(`${docId}:${req.user._id}:${intent}`));
    const row = await SignatureEvent.create({
      hospitalId: req.user.hospitalId, docRef: { kind: docKind || 'other', id: docId },
      level: 'L2', signerRole: req.user.role === 'doctor' ? 'doctor' : 'staff',
      signerId: actorId(req), signerName: req.user.name || '',
      language: language || 'en', intent: String(intent).slice(0, 1000),
      digest: seal.digest, signature: seal.signature, nonceHash: seal.nonceHash,
      ip: req.ip, device: String(req.headers?.['user-agent'] || '').slice(0, 300),
    });
    await auditLog('doc_signed_l2', actorId(req), { eventId: row._id, docId, ip: req.ip });
    return res.status(201).json({ id: String(row._id), nonce: seal.nonce });
  } catch (err) {
    logger.error(`Sign L2 error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/doc/:kind/:id', async (req, res) => {
  try {
    const rows = await SignatureEvent.find({ 'docRef.kind': req.params.kind, 'docRef.id': req.params.id })
      .select('level signerRole signerName language signedAt').sort({ signedAt: 1 }).lean();
    return res.json({ signatures: rows });
  } catch (err) {
    logger.error(`Signatures error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
