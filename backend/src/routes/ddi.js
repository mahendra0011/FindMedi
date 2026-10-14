import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { checkDrugInteractionsDetailed, getKnowledgeBase } from '../services/ddiEngine.js';
import DdiOverride from '../models/DdiOverride.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// Wave 4d: Drug-drug interaction engine API
const router = express.Router();
router.use(protect);

// authz: role
router.post('/check', authorize('prescriptions:write', 'records:read', 'pharmacy:read', 'records:write'), async (req, res) => {
  try {
    const { drugs } = req.body || {};
    if (!Array.isArray(drugs)) {
      return res.status(400).json({ message: 'drugs must be an array of medicine names or objects' });
    }

    const { interactions, unknownDrugs } = checkDrugInteractionsDetailed(drugs);
    const hasMajor = interactions.some((i) => i.severity === 'major');
    const hasModerate = interactions.some((i) => i.severity === 'moderate');

    // T3: every check carries its knowledge-base provenance + disclaimer so
    // API consumers (and audit logs of a check) can tell WHICH data version
    // was in force and that this is decision support, not a clinical order.
    const knowledgeBase = getKnowledgeBase();

    return res.json({
      checkedCount: drugs.length,
      interactionsCount: interactions.length,
      hasSevereConflict: hasMajor,
      overallRiskLevel: hasMajor ? 'HIGH' : hasModerate ? 'MEDIUM' : interactions.length ? 'LOW' : 'CLEAR',
      // T3: drugs the knowledge base could not cover — UI must show
      // "not checked" rather than implying they are safe.
      unknownDrugs,
      interactions,
      knowledgeBase,
      disclaimer: knowledgeBase.disclaimer,
    });
  } catch (err) {
    logger.error(`DDI check error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

/**
 * T3: record a clinician's decision to proceed DESPITE a flagged interaction.
 * Major interactions block "Sign" in the UI until this succeeds; the row is
 * the audit trail for Quality / Pharmacovigilance reporting.
 */
router.post('/override', authorize('prescriptions:write', 'records:write'), async (req, res) => {
  try {
    const { prescriptionId, prescriptionNo, pair, severity, effect, reason } = req.body || {};
    if (!pair?.drugA || !pair?.drugB || !reason || !String(reason).trim()) {
      return res.status(400).json({ message: 'pair.drugA, pair.drugB and a non-empty reason are required' });
    }
    if (!['major', 'moderate', 'minor'].includes(severity)) {
      return res.status(400).json({ message: 'severity must be major | moderate | minor' });
    }

    const row = await DdiOverride.create({
      hospitalId: req.user.hospitalId || null,
      prescriptionId: prescriptionId || null,
      prescriptionNo: prescriptionNo || '',
      pair: { drugA: String(pair.drugA), drugB: String(pair.drugB) },
      severity,
      effect: effect || '',
      reason: String(reason).trim(),
      by: req.user._id || req.user.id,
      byName: req.user.name || '',
      at: new Date(),
    });

    await auditLog('ddi.override', req.user._id || req.user.id, {
      resourceType: 'DdiOverride',
      resourceId: String(row._id),
      prescriptionId: prescriptionId || null,
      pair: `${pair.drugA} + ${pair.drugB}`,
      severity,
    });

    return res.status(201).json(row);
  } catch (err) {
    logger.error(`DDI override error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
