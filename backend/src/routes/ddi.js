import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { checkDrugInteractions } from '../services/ddiEngine.js';
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

    const interactions = checkDrugInteractions(drugs);
    const hasMajor = interactions.some((i) => i.severity === 'major');
    const hasModerate = interactions.some((i) => i.severity === 'moderate');

    return res.json({
      checkedCount: drugs.length,
      interactionsCount: interactions.length,
      hasSevereConflict: hasMajor,
      overallRiskLevel: hasMajor ? 'HIGH' : hasModerate ? 'MEDIUM' : interactions.length ? 'LOW' : 'CLEAR',
      interactions,
    });
  } catch (err) {
    logger.error(`DDI check error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
