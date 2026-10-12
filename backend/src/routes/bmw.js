import express from 'express';
import BmwBag, { BMW_COLOR_CATEGORIES } from '../models/BmwBag.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { generateTimestampedId } from '../utils/idGenerator.js';
import logger from '../config/logger.js';

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

// ─── BMW Bag Logs & Manifest ───────────────────────────────────────────────
router.get('/bags', authorize('records:read', 'operations:read', 'inventory:read', 'admin:read'), async (req, res) => {
  try {
    const filter = { ...tenantFilter(req) };
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.colorCategory) filter.colorCategory = String(req.query.colorCategory);

    const rows = await BmwBag.find(filter)
      .populate('sealedByStaffId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.json({ total: rows.length, bags: rows });
  } catch (err) {
    logger.error(`BMW bag list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/bags', authorize('records:write', 'operations:write', 'inventory:manage', 'housekeeping:manage', 'nursing:read'), async (req, res) => {
  try {
    const { colorCategory, weightKg, generatingDepartment, notes } = req.body || {};

    if (!colorCategory || !weightKg || !generatingDepartment) {
      return res.status(400).json({ message: 'colorCategory, weightKg, and generatingDepartment required' });
    }
    if (!BMW_COLOR_CATEGORIES.includes(colorCategory)) {
      return res.status(400).json({ message: 'Invalid color category' });
    }

    const bagBarcode = generateTimestampedId(`BMW-${colorCategory.slice(0, 3)}`);

    const row = await BmwBag.create({
      hospitalId: req.user.hospitalId,
      bagBarcode,
      colorCategory,
      weightKg: Number(weightKg),
      generatingDepartment,
      sealedByStaffId: actorId(req),
      status: 'SEALED',
      notes: notes || '',
    });

    await auditLog('bmw_bag_sealed', actorId(req), {
      bagId: row._id,
      bagBarcode,
      color: colorCategory,
      weightKg,
      ip: req.ip,
    });

    return res.status(201).json(row);
  } catch (err) {
    logger.error(`BMW bag create error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
});

// Update state to IN_STORAGE (holding shed) or DISPATCHED_TO_CBWTF (Common Treatment Facility)
router.patch('/bags/:id/dispatch', authorize('records:write', 'operations:write', 'inventory:manage', 'admin:manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { cbwtfVendorName, cbwtfVehicleNumber, cbwtfDriverName } = req.body || {};

    const bag = await BmwBag.findOne({ _id: id, ...tenantFilter(req) });
    if (!bag) return res.status(404).json({ message: 'BMW bag not found' });

    bag.status = 'DISPATCHED_TO_CBWTF';
    bag.dispatchedAt = new Date();
    bag.cbwtfVendorName = cbwtfVendorName || 'State Authorized CBWTF';
    bag.cbwtfVehicleNumber = cbwtfVehicleNumber || '';
    bag.cbwtfDriverName = cbwtfDriverName || '';
    bag.cbwtfManifestNumber = generateTimestampedId('MNF-BMW');

    await bag.save();

    await auditLog('bmw_bag_dispatched', actorId(req), {
      bagId: bag._id,
      manifest: bag.cbwtfManifestNumber,
      ip: req.ip,
    });

    return res.json(bag);
  } catch (err) {
    logger.error(`BMW dispatch error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
});

// Summary Aggregates (CPCB Annual Return Form IV Data)
router.get('/metrics', authorize('records:read', 'operations:read', 'admin:read'), async (req, res) => {
  try {
    const filter = { ...tenantFilter(req) };
    const aggregates = await BmwBag.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$colorCategory',
          totalBags: { $sum: 1 },
          totalWeightKg: { $sum: '$weightKg' },
        },
      },
    ]);

    const activeInShed = await BmwBag.countDocuments({ ...filter, status: { $ne: 'DISPATCHED_TO_CBWTF' } });

    return res.json({ aggregates, activeInShed });
  } catch (err) {
    logger.error(`BMW metrics error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
