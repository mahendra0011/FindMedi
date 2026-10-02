import express from 'express';
import { protect } from '../middleware/auth.js';
import { searchProviders, searchDrugs, searchEhr, isOpenSearchConfigured } from '../services/opensearchIndexer.js';
import logger from '../config/logger.js';
import mongoose from 'mongoose';
import { assertEhrSearchAccess } from '../services/ehrSearchAccess.js';
import { sendServerError } from '../utils/safeError.js';

const router = express.Router();

// ─── GET /api/search/providers?q=&vertical=&city=&lat=&lon=&radiusKm= ───────
// Spec 15: typo-tolerant provider discovery (OpenSearch when configured,
// transparent Mongo fallback otherwise).
// authz: self
router.get('/providers', protect, async (req, res) => {
  try {
    const { q, vertical, city, lat, lon, radiusKm, size } = req.query;
    const out = await searchProviders({
      q, vertical, city,
      lat: lat != null ? Number(lat) : undefined,
      lon: lon != null ? Number(lon) : undefined,
      radiusKm: radiusKm != null ? Number(radiusKm) : 15,
      size: Math.min(Number(size) || 20, 50),
    });
    res.json({ success: true, engine: isOpenSearchConfigured() ? 'opensearch' : 'mongo', ...out });
  } catch (err) {
    logger.error(`Provider search error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/search/drugs?q=&salt= — brand → in-stock substitutes by savings
// authz: self
router.get('/drugs', protect, async (req, res) => {
  try {
    const out = await searchDrugs({ q: req.query.q, salt: req.query.salt, size: Math.min(Number(req.query.size) || 20, 50) });
    if (out.source === 'denied') return res.status(403).json({ success: false, ...out });
    res.json({ success: true, engine: isOpenSearchConfigured() ? 'opensearch' : out.source, ...out });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/search/icd?q= — ICD-10 code/title search
// authz: self
router.get('/icd', protect, async (req, res) => {
  try {
    const { searchIcd } = await import('../services/opensearchIndexer.js');
    const out = await searchIcd({ q: req.query.q, size: Math.min(Number(req.query.size) || 20, 50) });
    res.json({ success: true, engine: isOpenSearchConfigured() ? 'opensearch' : out.source, ...out });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/search/ehr?patientId=&q=&consentId= — consent-gated EHR search
router.get('/ehr', protect, async (req, res) => {
  try {
    // AUTHZ: `patientId` arrives from the request and was passed straight into
    // searchEhr. The consent check inside that function answers "does a GRANTED
    // consent exist for THIS patient" — it never asks "is the CALLER allowed to
    // read THIS patient". Those are different questions, and only the second one
    // is an authorization decision.
    //
    // The consequence: any authenticated account could read any patient's
    // diagnosis history, notes and symptoms by passing that patient's id and a
    // query term, as long as that patient had granted consent to their own
    // treating doctor. The consent is the PATIENT's grant to a clinician, and it
    // was being used as proof about a completely different principal.
    //
    // It is worse via `consentId`: that branch does `findOne({ consentId })` with
    // no patient binding at all, so a single known consent id returns records for
    // any patient.
    //
    // So: resolve the caller/patient relationship here, before the search.
    const patientId = req.query.patientId;
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(String(patientId))) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const decision = await assertEhrSearchAccess(req, patientId, req.query.consentId);
    if (!decision.ok) {
      // 404, not 403: a 403 confirms the patient id exists, which is exactly the
      // oracle an attacker needs to enumerate the patient population.
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const out = await searchEhr({ patientId, q: req.query.q, consentId: req.query.consentId });
    if (out.source === 'denied') return res.status(403).json({ success: false, ...out });
    res.json({ success: true, engine: isOpenSearchConfigured() ? 'opensearch' : out.source, ...out });
  } catch (err) {
    logger.error(`EHR search error: ${err.message}`);
    sendServerError(res, err, 'Search is temporarily unavailable');
  }
});

export default router;
