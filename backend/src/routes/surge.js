import express from 'express';
import { protect } from '../middleware/auth.js';
import { getSurgeForCell } from '../jobs/surgeCalc.job.js';

const router = express.Router();

// ─── GET /api/surge/:cell ───────────────────────────────────────────────────
// Spec 14: current demand surge multiplier for an H3 cell (fare/ETA paths).
router.get('/:cell', protect, async (req, res) => {
  const out = await getSurgeForCell(req.params.cell);
  res.json({ success: true, cell: req.params.cell, ...out });
});

export default router;
