import express from 'express';
import SignatureEvent from '../models/SignatureEvent.js';
import { verifySeal } from '../lib/docSeal.js';

// File 14 §14.5: PUBLIC doc verification (no login — a pharmacist checking
// paper). Deliberately minimal: authenticity + non-identifying facts only,
// never patient/medicine/diagnosis content (same oracle rule as Rx verify).

const router = express.Router();

router.get('/doc/:kind/:id', async (req, res) => {
  try {
    const { nonce } = req.query;
    const rows = await SignatureEvent.find({ 'docRef.kind': req.params.kind, 'docRef.id': req.params.id })
      .sort({ signedAt: 1 }).lean();
    if (!rows.length) return res.json({ valid: false });
    const last = rows[rows.length - 1];
    const valid = verifySeal({ digest: last.digest, signature: last.signature, nonce: String(nonce || '') });
    return res.json({
      valid,
      signatures: rows.length,
      lastSignedAt: last.signedAt,
      kind: req.params.kind,
    });
  } catch {
    return res.json({ valid: false });
  }
});

export default router;
