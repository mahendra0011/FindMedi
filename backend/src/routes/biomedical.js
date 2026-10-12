import express from 'express';
import BiomedicalAsset from '../models/BiomedicalAsset.js';
import BiomedicalWorkOrder from '../models/BiomedicalWorkOrder.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { generateTimestampedId } from '../utils/idGenerator.js';
import logger from '../config/logger.js';

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

// ─── Equipment Master & Uptime SLA ──────────────────────────────────────────
router.get('/assets', authorize('inventory:read', 'inventory:manage', 'operations:read', 'admin:read'), async (req, res) => {
  try {
    const filter = { ...tenantFilter(req) };
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.criticality) filter.criticalityCategory = String(req.query.criticality);
    if (req.query.department) filter.department = String(req.query.department);

    const assets = await BiomedicalAsset.find(filter).sort({ nextPpmDueDate: 1 }).limit(300).lean();
    const stats = {
      total: assets.length,
      operational: assets.filter((a) => a.status === 'OPERATIONAL').length,
      breakdown: assets.filter((a) => a.status === 'BREAKDOWN').length,
      underMaintenance: assets.filter((a) => a.status === 'UNDER_MAINTENANCE').length,
      criticalCatA: assets.filter((a) => a.criticalityCategory === 'A').length,
    };

    return res.json({ stats, assets });
  } catch (err) {
    logger.error(`Biomedical asset list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/assets', authorize('inventory:manage', 'admin:manage'), async (req, res) => {
  try {
    const {
      assetTag,
      equipmentName,
      manufacturer,
      modelNumber,
      serialNumber,
      criticalityCategory,
      department,
      locationRoom,
      purchaseCost,
      contractType,
      contractVendorName,
      contractExpiryDate,
      ppmFrequencyMonths,
      nextPpmDueDate,
    } = req.body || {};

    if (!assetTag || !equipmentName || !serialNumber || !department) {
      return res.status(400).json({ message: 'assetTag, equipmentName, serialNumber, department are required' });
    }

    const calculatedNextPpm = nextPpmDueDate
      ? new Date(nextPpmDueDate)
      : new Date(Date.now() + (Number(ppmFrequencyMonths) || 3) * 30 * 24 * 60 * 60 * 1000);

    const row = await BiomedicalAsset.create({
      hospitalId: req.user.hospitalId,
      assetTag,
      equipmentName,
      manufacturer: manufacturer || 'Standard',
      modelNumber,
      serialNumber,
      criticalityCategory: criticalityCategory || 'B',
      department,
      locationRoom,
      purchaseCost: Number(purchaseCost) || 0,
      contractType: contractType || 'WARRANTY',
      contractVendorName,
      contractExpiryDate: contractExpiryDate ? new Date(contractExpiryDate) : undefined,
      ppmFrequencyMonths: Number(ppmFrequencyMonths) || 3,
      nextPpmDueDate: calculatedNextPpm,
      status: 'OPERATIONAL',
    });

    await auditLog('biomedical_asset_registered', actorId(req), {
      assetId: row._id,
      assetTag: row.assetTag,
      hospitalId: req.user.hospitalId,
      ip: req.ip,
    });

    return res.status(201).json(row);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Asset tag or serial number already exists' });
    logger.error(`Biomedical asset create error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
});

// ─── Work Orders (Breakdown, PPM, Electrical Safety) ────────────────────────
router.get('/work-orders', authorize('inventory:read', 'inventory:manage', 'operations:read', 'admin:read'), async (req, res) => {
  try {
    const filter = { ...tenantFilter(req) };
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.ticketType) filter.ticketType = String(req.query.ticketType);

    const orders = await BiomedicalWorkOrder.find(filter)
      .populate('assetId', 'assetTag equipmentName criticalityCategory department status')
      .populate('reportedBy', 'name email role')
      .populate('assignedEngineerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.json({ total: orders.length, orders });
  } catch (err) {
    logger.error(`Biomedical work order list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/work-orders', authorize('inventory:read', 'inventory:manage', 'operations:read', 'nursing:read', 'admin:manage'), async (req, res) => {
  try {
    const { assetId, ticketType, symptomDescription, priority } = req.body || {};
    if (!assetId || !symptomDescription) {
      return res.status(400).json({ message: 'assetId and symptomDescription are required' });
    }

    const asset = await BiomedicalAsset.findOne({ _id: assetId, ...tenantFilter(req) });
    if (!asset) return res.status(404).json({ message: 'Equipment asset not found' });

    const ticketNumber = generateTimestampedId('BME');
    const orderPriority = priority || (asset.criticalityCategory === 'A' ? 'CRITICAL' : 'HIGH');

    const order = await BiomedicalWorkOrder.create({
      hospitalId: req.user.hospitalId,
      ticketNumber,
      assetId: asset._id,
      ticketType: ticketType || 'BREAKDOWN',
      priority: orderPriority,
      reportedBy: actorId(req),
      symptomDescription,
      status: 'REPORTED',
    });

    // If breakdown, mark asset as BREAKDOWN automatically
    if (order.ticketType === 'BREAKDOWN') {
      asset.status = 'BREAKDOWN';
      asset.breakdownCount = (asset.breakdownCount || 0) + 1;
      await asset.save();
    }

    await auditLog('biomedical_work_order_created', actorId(req), {
      workOrderId: order._id,
      ticketNumber,
      assetTag: asset.assetTag,
      ip: req.ip,
    });

    return res.status(201).json(order);
  } catch (err) {
    logger.error(`Biomedical work order create error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
});

router.patch('/work-orders/:id/status', authorize('inventory:manage', 'operations:read', 'admin:manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rootCauseAnalysis, sparesConsumed, electricalSafetyTestPassed, notes } = req.body || {};

    const order = await BiomedicalWorkOrder.findOne({ _id: id, ...tenantFilter(req) });
    if (!order) return res.status(404).json({ message: 'Work order not found' });

    const asset = await BiomedicalAsset.findById(order.assetId);

    if (status) order.status = status;
    if (rootCauseAnalysis) order.rootCauseAnalysis = rootCauseAnalysis;
    if (Array.isArray(sparesConsumed)) order.sparesConsumed = sparesConsumed;
    if (typeof electricalSafetyTestPassed === 'boolean') {
      order.electricalSafetyTestPassed = electricalSafetyTestPassed;
    }
    if (notes) order.notes = notes;

    if (status === 'IN_PROGRESS' && !order.respondedAt) {
      order.respondedAt = new Date();
      order.assignedEngineerId = actorId(req);
      if (asset && asset.status === 'BREAKDOWN') {
        asset.status = 'UNDER_MAINTENANCE';
        await asset.save();
      }
    }

    if (status === 'RESOLVED' || status === 'CLOSED') {
      order.rectifiedAt = new Date();
      if (order.reportedAt) {
        order.downtimeMinutes = Math.round((order.rectifiedAt.getTime() - new Date(order.reportedAt).getTime()) / (1000 * 60));
      }
      if (asset) {
        asset.status = 'OPERATIONAL';
        if (order.ticketType === 'PPM') {
          asset.lastPpmDate = new Date();
          asset.nextPpmDueDate = new Date(Date.now() + (asset.ppmFrequencyMonths || 3) * 30 * 24 * 60 * 60 * 1000);
        }
        await asset.save();
      }
    }

    await order.save();

    await auditLog('biomedical_work_order_updated', actorId(req), {
      workOrderId: order._id,
      newStatus: order.status,
      ip: req.ip,
    });

    return res.json(order);
  } catch (err) {
    logger.error(`Biomedical work order update error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
});

// ─── Ind-AS 16 / Schedule II Fixed Asset Depreciation Schedule ──────────────
router.get('/depreciation-schedule', authorize('inventory:read', 'admin:read', 'billing:read'), async (req, res) => {
  try {
    const filter = { ...tenantFilter(req) };
    const assets = await BiomedicalAsset.find(filter).lean();

    const schedule = assets.map((a) => {
      const cost = Number(a.purchaseCost) || 500000;
      // Default useful life for electro-medical equipment per Companies Act Schedule II is 15 years (Cat A) / 10 years (Cat B/C)
      const usefulLifeYears = a.criticalityCategory === 'A' ? 15 : 10;
      // Salvage value is typically 5% of cost under Ind-AS 16
      const salvageValue = Math.round(cost * 0.05);
      const depreciableAmount = Math.max(0, cost - salvageValue);

      // Installation date / age computation
      const purchaseDate = a.createdAt ? new Date(a.createdAt) : new Date();
      const ageInYears = Math.max(0.1, (Date.now() - purchaseDate.getTime()) / (365.25 * 24 * 3600 * 1000));

      // Straight-Line Method (SLM):
      const annualSlmDepreciation = Math.round(depreciableAmount / usefulLifeYears);
      const accumulatedSlm = Math.min(depreciableAmount, Math.round(annualSlmDepreciation * ageInYears));
      const netBookValueSlm = Math.max(salvageValue, cost - accumulatedSlm);

      // Written Down Value (WDV) Rate: r = 1 - (s/c)^(1/n)
      const wdvRate = 1 - Math.pow(salvageValue / cost, 1 / usefulLifeYears);
      const netBookValueWdv = Math.max(salvageValue, Math.round(cost * Math.pow(1 - wdvRate, ageInYears)));
      const accumulatedWdv = cost - netBookValueWdv;

      return {
        assetId: String(a._id),
        assetTag: a.assetTag,
        equipmentName: a.equipmentName,
        department: a.department,
        criticalityCategory: a.criticalityCategory,
        originalCost: cost,
        salvageValue,
        usefulLifeYears,
        ageInYears: Math.round(ageInYears * 10) / 10,
        straightLineMethod: {
          annualDepreciation: annualSlmDepreciation,
          accumulatedDepreciation: accumulatedSlm,
          netBookValue: netBookValueSlm,
        },
        writtenDownValueMethod: {
          annualRatePct: Math.round(wdvRate * 1000) / 10,
          accumulatedDepreciation: accumulatedWdv,
          netBookValue: netBookValueWdv,
        },
      };
    });

    const totalAssetCost = schedule.reduce((sum, item) => sum + item.originalCost, 0);
    const totalNetBookValue = schedule.reduce((sum, item) => sum + item.straightLineMethod.netBookValue, 0);

    return res.json({
      summary: {
        totalAssets: schedule.length,
        totalGrossBlock: totalAssetCost,
        totalNetBlockSLM: totalNetBookValue,
        totalDepreciationProvided: totalAssetCost - totalNetBookValue,
      },
      schedule,
    });
  } catch (err) {
    logger.error(`Asset depreciation error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
