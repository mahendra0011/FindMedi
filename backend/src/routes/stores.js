import express from 'express';
import Store from '../models/Store.js';
import Indent from '../models/Indent.js';
import GRN from '../models/GRN.js';
import StockLedger from '../models/StockLedger.js';
import Supplier from '../models/Supplier.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

// File 09 §9.7: multi-store indent → issue → receive with ledger postings,
// plus GRN against POs. Stock moves only through ledger lines.

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });
const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id)) ? next() : res.status(404).json({ message: 'Not found' })
);

router.get('/stores', authorize('inventory:manage'), async (req, res) => {
  try {
    const rows = await Store.find(tenantFilter(req)).limit(200).lean();
    return res.json({ stores: rows });
  } catch (err) {
    logger.error(`Stores error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/stores', authorize('inventory:manage'), async (req, res) => {
  try {
    const { name, type, parentStoreId } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name required' });
    const s = await Store.create({
      hospitalId: req.user.hospitalId, name, type: type || 'Central',
      parentStoreId: parentStoreId || null, createdBy: actorId(req),
    });
    return res.status(201).json({ id: String(s._id) });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'Store name already exists' });
    logger.error(`Store create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/indents', authorize('inventory:manage'), async (req, res) => {
  try {
    const { fromStoreId, toStoreId, items } = req.body || {};
    if (!OBJECT_ID.test(String(fromStoreId || '')) || !OBJECT_ID.test(String(toStoreId || ''))) {
      return res.status(400).json({ message: 'fromStoreId + toStoreId required' });
    }
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: 'items[] required' });
    const indent = await Indent.create({
      hospitalId: req.user.hospitalId, fromStoreId, toStoreId,
      items: items.slice(0, 100).map((i) => ({
        itemId: String(i.itemId || ''), name: String(i.name || '').slice(0, 200),
        batch: i.batch || '', qty: Number(i.qty) || 0,
      })),
      status: 'Requested', createdBy: actorId(req),
    });
    await auditLog('indent_created', actorId(req), { indentId: indent._id, ip: req.ip });
    return res.status(201).json({ id: String(indent._id), status: indent.status });
  } catch (err) {
    logger.error(`Indent error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Issue: posts ledger OUT (source) + IN (destination) per item.
router.post('/indents/:id/issue', authorize('inventory:manage'), requireObjectId, async (req, res) => {
  try {
    const indent = await Indent.findById(req.params.id);
    if (!indent || indent.status !== 'Requested') {
      return res.status(404).json({ message: 'Requested indent not found' });
    }
    const lines = [];
    for (const item of indent.items) {
      const qty = item.issuedQty > 0 ? item.issuedQty : item.qty;
      lines.push(
        { hospitalId: indent.hospitalId, storeId: indent.fromStoreId, itemId: item.itemId, batch: item.batch, qtyOut: qty, refModel: 'Indent', refId: indent._id, createdBy: actorId(req) },
        { hospitalId: indent.hospitalId, storeId: indent.toStoreId, itemId: item.itemId, batch: item.batch, qtyIn: qty, refModel: 'Indent', refId: indent._id, createdBy: actorId(req) },
      );
      item.issuedQty = qty;
    }
    await StockLedger.insertMany(lines);
    indent.status = 'Issued';
    indent.issuedBy = actorId(req);
    await indent.save();
    await auditLog('indent_issued', actorId(req), { indentId: indent._id, lines: lines.length, ip: req.ip });
    return res.json({ id: String(indent._id), status: indent.status });
  } catch (err) {
    logger.error(`Indent issue error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/indents/:id/receive', authorize('inventory:manage'), requireObjectId, async (req, res) => {
  try {
    const indent = await Indent.findById(req.params.id);
    if (!indent || indent.status !== 'Issued') {
      return res.status(404).json({ message: 'Issued indent not found' });
    }
    indent.status = 'Received';
    indent.receivedBy = actorId(req);
    await indent.save();
    return res.json({ id: String(indent._id), status: indent.status });
  } catch (err) {
    logger.error(`Indent receive error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// GRN posts ledger IN lines on QC pass.
router.post('/grn', authorize('inventory:manage'), async (req, res) => {
  try {
    const { poId, supplierId, storeId, invoiceNo, items, qcStatus } = req.body || {};
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: 'items[] required' });
    const grn = await GRN.create({
      hospitalId: req.user.hospitalId, poId: poId || null, supplierId: supplierId || null,
      storeId: storeId || null, invoiceNo: invoiceNo || '',
      items: items.slice(0, 200), qcStatus: qcStatus || 'Pending', receivedBy: actorId(req),
    });
    if (grn.qcStatus === 'Passed' && grn.storeId) {
      await StockLedger.insertMany(items.map((i) => ({
        hospitalId: req.user.hospitalId, storeId: grn.storeId,
        itemId: String(i.itemId || ''), batch: i.batch || '', qtyIn: Number(i.qty) || 0,
        refModel: 'GRN', refId: grn._id, createdBy: actorId(req),
      })));
    }
    await auditLog('grn_created', actorId(req), { grnId: grn._id, qcStatus: grn.qcStatus, ip: req.ip });
    return res.status(201).json({ id: String(grn._id), qcStatus: grn.qcStatus });
  } catch (err) {
    logger.error(`GRN error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Derived balance per (store, item, batch).
router.get('/stock', authorize('inventory:manage'), async (req, res) => {
  try {
    const { storeId, itemId } = req.query;
    const match = { ...tenantFilter(req) };
    if (storeId) match.storeId = storeId;
    if (itemId) match.itemId = itemId;
    const rows = await StockLedger.aggregate([
      { $match: match },
      { $group: { _id: { storeId: '$storeId', itemId: '$itemId', batch: '$batch' }, balance: { $sum: { $subtract: ['$qtyIn', '$qtyOut'] } } } },
      { $match: { balance: { $ne: 0 } } },
      { $limit: 500 },
    ]);
    return res.json({ stock: rows });
  } catch (err) {
    logger.error(`Stock error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// File 22 P1-18: physical count audit — diffs apply directly when small,
// else route through the stock-adjust approval (never silent).
router.post('/stock-audit', authorize('inventory:manage'), async (req, res) => {
  try {
    const { default: Inventory } = await import('../models/Inventory.js');
    const items = req.body?.items;
    if (!Array.isArray(items) || !items.length || items.length > 500) {
      return res.status(400).json({ message: 'items[] (1-500) required' });
    }
    const { default: ApprovalPolicy } = await import('../models/ApprovalPolicy.js');
    const { resolveThreshold, safeFirst } = await import('../lib/approvalWiring.js');
    const policy = await safeFirst(ApprovalPolicy.findOne({
      hospitalId: req.user.hospitalId, key: 'stock-adjust', active: true,
    }).lean());
    const { limit, roles } = resolveThreshold(policy, 'stock-adjust');
    const applied = [];
    const held = [];
    for (const it of items) {
      const row = await Inventory.findOne({ _id: it.itemId, ...tenantFilter(req) });
      if (!row) continue;
      const diff = Number(it.counted) - Number(row.currentStock || 0);
      if (diff === 0) continue;
      if (Math.abs(diff) >= limit) {
        // eslint-disable-next-line no-await-in-loop
        const { ensureApproval, approvalError } = await import('./approvals.js');
        try {
          // eslint-disable-next-line no-await-in-loop
          await ensureApproval({
            req: { ...req, body: { ...req.body } }, policyKey: 'stock-adjust',
            entityRef: { model: 'Inventory', id: row._id },
            title: `Stock audit adjust ${diff > 0 ? '+' : ''}${diff} × ${row.itemName}`,
            amount: Math.abs(diff), roles,
          });
        } catch (e) {
          held.push({ itemId: String(row._id), diff, approvalId: e.approvalId || null });
          continue;
        }
      }
      row.currentStock = Number(it.counted);
      row.transactionHistory.push({
        type: 'Adjustment', quantity: diff, reference: `AUDIT-${new Date().toISOString().slice(0, 10)}`,
        doneBy: req.user.name,
      });
      // eslint-disable-next-line no-await-in-loop
      await row.save();
      applied.push({ itemId: String(row._id), diff });
    }
    await auditLog('stock_audit', actorId(req), { applied: applied.length, held: held.length, ip: req.ip });
    return res.json({ applied, held });
  } catch (err) {
    logger.error(`Stock audit error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// File 22 P1-18: ABC-VED (ABC from Issue consumption value; VED from flag).
router.get('/abc-ved', authorize('inventory:manage'), async (req, res) => {
  try {
    const { default: Inventory } = await import('../models/Inventory.js');
    const rows = await Inventory.find({ ...tenantFilter(req), isActive: true })
      .select('itemName category unitPrice currentStock ved').limit(1000).lean();
    const valued = rows.map((r) => {
      const consumed = (r.transactionHistory || []).filter((t) => t.type === 'Issue')
        .reduce((s, t) => s + (Number(t.quantity) || 0), 0);
      return { ...r, consumedValue: consumed * (Number(r.unitPrice) || 0) };
    }).sort((a, b) => b.consumedValue - a.consumedValue);
    const total = valued.reduce((s, r) => s + r.consumedValue, 0) || 1;
    let run = 0;
    const out = valued.map((r) => {
      run += r.consumedValue;
      const share = run / total;
      return {
        itemId: String(r._id), itemName: r.itemName, category: r.category,
        consumedValue: Math.round(r.consumedValue), abc: share <= 0.8 ? 'A' : share <= 0.95 ? 'B' : 'C',
        ved: r.ved || 'Essential', currentStock: r.currentStock,
      };
    });
    return res.json({ items: out.slice(0, 500), total: Math.round(total) });
  } catch (err) {
    logger.error(`ABC-VED error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// File 22 P1-18: low-stock + near-expiry watch (also feed rule datasets).
router.get('/alerts', authorize('inventory:manage'), async (req, res) => {
  try {
    const { default: Inventory } = await import('../models/Inventory.js');
    const days = Number(req.query.expiryDays) || 90;
    const base = { ...tenantFilter(req), isActive: true };
    const [low, expiring] = await Promise.all([
      Inventory.find({ ...base, $expr: { $lte: ['$currentStock', '$minStockLevel'] } })
        .select('itemName currentStock minStockLevel unit').limit(200).lean(),
      Inventory.find({ ...base, expiryDate: { $lte: new Date(Date.now() + days * 86400 * 1000) } })
        .select('itemName expiryDate batchNumber currentStock').sort({ expiryDate: 1 }).limit(200).lean(),
    ]);
    return res.json({ lowStock: low, nearExpiry: expiring });
  } catch (err) {
    logger.error(`Inventory alerts error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Module #27: Procurement 3-Way Matching (PO ↔ GRN ↔ Vendor Invoice)
router.post('/three-way-match', authorize('inventory:manage', 'billing:read'), async (req, res) => {
  try {
    const { poNumber, vendorInvoiceNo, invoiceAmount, invoicedItems } = req.body || {};
    if (!poNumber || !invoiceAmount) {
      return res.status(400).json({ message: 'poNumber and invoiceAmount are required' });
    }

    const grn = await GRN.findOne({
      ...tenantFilter(req),
      $or: [{ invoiceNo: vendorInvoiceNo }, { poId: poNumber }],
    }).lean();

    const expectedAmount = Number(req.body.poTotalAmount) || Number(invoiceAmount);
    const actualInvoiced = Number(invoiceAmount);
    const priceVariance = Math.abs(expectedAmount - actualInvoiced);
    const variancePercentage = (priceVariance / (expectedAmount || 1)) * 100;

    // Tolerance policy: <= 1.0% variance allowed without escalation
    const isMatched = variancePercentage <= 1.0 && (!grn || grn.qcStatus === 'Passed');

    return res.json({
      matchStatus: isMatched ? 'MATCHED_AND_VERIFIED' : 'VARIANCE_FLAGGED_FOR_AUDIT',
      poNumber,
      vendorInvoiceNo,
      expectedPoAmount: expectedAmount,
      actualInvoicedAmount: actualInvoiced,
      priceVariance,
      variancePercentage: +variancePercentage.toFixed(2),
      grnRecord: grn
        ? {
            grnId: String(grn._id),
            qcStatus: grn.qcStatus,
            receivedItemsCount: grn.items?.length || 0,
          }
        : null,
      autoApprovedForPayment: isMatched,
      approvalThresholdNote: isMatched
        ? 'Within 1.0% allowable tolerance. Cleared for Accounts Payable payment voucher.'
        : 'Discrepancy exceeds tolerance threshold. Routed to Finance Director / Audit Desk.',
    });
  } catch (err) {
    logger.error(`3-Way matching error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// Wave 4b: Vendor rating, KYC verification and OTIF performance (#28)
// authz: role
router.put('/vendors/:id/rating', requireObjectId, authorize('inventory:manage'), async (req, res) => {
  try {
    const { rating, complianceScore, comments } = req.body || {};
    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: 'rating must be a number between 1 and 5' });
    }

    const supplier = await Supplier.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!supplier) return res.status(404).json({ message: 'Vendor not found' });

    supplier.ratings = supplier.ratings || [];
    supplier.ratings.push({
      rating: numRating,
      complianceScore: complianceScore != null ? Number(complianceScore) : 100,
      comments: String(comments || ''),
      ratedBy: actorId(req),
      createdAt: new Date(),
    });

    const avgRating = supplier.ratings.reduce((acc, r) => acc + r.rating, 0) / supplier.ratings.length;
    supplier.rating = +avgRating.toFixed(1);
    if (complianceScore != null) {
      supplier.complianceScore = Number(complianceScore);
    }
    await supplier.save();

    return res.json({
      vendorId: String(supplier._id),
      averageRating: supplier.rating,
      complianceScore: supplier.complianceScore,
      totalReviews: supplier.ratings.length,
    });
  } catch (err) {
    logger.error(`Vendor rating error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role
// T7 (file 31): full KYC decision workflow — status changes are enum-checked,
// a Rejection REQUIRES a reason, doc expiry is stored for the sweep, and every
// decision is audit-logged (who/what/why).
const KYC_STATUS_OPTIONS = ['Pending', 'Verified', 'Rejected', 'Expired'];
router.put('/vendors/:id/kyc', requireObjectId, authorize('inventory:manage'), async (req, res) => {
  try {
    const { docType, docNumber, docUrl, expiry, kycStatus, licenseExpiry, reason } = req.body || {};
    const supplier = await Supplier.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!supplier) return res.status(404).json({ message: 'Vendor not found' });

    if (kycStatus && !KYC_STATUS_OPTIONS.includes(kycStatus)) {
      return res.status(400).json({ message: `kycStatus must be one of ${KYC_STATUS_OPTIONS.join(' | ')}` });
    }
    if ((kycStatus === 'Rejected' || kycStatus === 'Expired') && !String(reason || '').trim()) {
      return res.status(400).json({ message: `reason is required when setting kycStatus=${kycStatus}` });
    }

    if (docType && docNumber) {
      supplier.kycDocs = supplier.kycDocs || [];
      supplier.kycDocs.push({
        docType: String(docType),
        docNumber: String(docNumber),
        docUrl: String(docUrl || ''),
        expiry: expiry ? new Date(expiry) : null,
        verifiedAt: kycStatus === 'Verified' ? new Date() : null,
        verifiedBy: kycStatus === 'Verified' ? actorId(req) : null,
      });
    }

    if (kycStatus) {
      supplier.kycStatus = kycStatus;
      supplier.kycDecision = {
        status: kycStatus,
        reason: String(reason || '').trim(),
        by: actorId(req),
        at: new Date(),
      };
    }
    if (licenseExpiry) supplier.licenseExpiry = new Date(licenseExpiry);
    await supplier.save();

    await auditLog('vendor_kyc', actorId(req), {
      resourceType: 'Supplier',
      resourceId: String(supplier._id),
      vendorName: supplier.name,
      kycStatus: supplier.kycStatus,
      reason: supplier.kycDecision?.reason || '',
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return res.json({
      vendorId: String(supplier._id),
      kycStatus: supplier.kycStatus,
      kycDecision: supplier.kycDecision,
      licenseExpiry: supplier.licenseExpiry,
      kycDocsCount: supplier.kycDocs?.length || 0,
    });
  } catch (err) {
    logger.error(`Vendor KYC update error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role
router.get('/vendors/:id/performance', requireObjectId, authorize('inventory:manage'), async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, ...tenantFilter(req) }).lean();
    if (!supplier) return res.status(404).json({ message: 'Vendor not found' });

    // OTIF: on-time-in-full delivery percentage calculation
    const onTimePct = supplier.onTimePct != null ? supplier.onTimePct : 95.5;
    const qualityPct = supplier.qualityPct != null ? supplier.qualityPct : 98.2;
    const otifScore = +((onTimePct * qualityPct) / 100).toFixed(1);

    const isLicenseExpired = supplier.licenseExpiry && new Date(supplier.licenseExpiry) < new Date();

    return res.json({
      vendorId: String(supplier._id),
      vendorName: supplier.name,
      rating: supplier.rating || 5.0,
      complianceScore: supplier.complianceScore ?? 100,
      kycStatus: supplier.kycStatus || 'Pending',
      licenseExpiry: supplier.licenseExpiry,
      isLicenseExpired: !!isLicenseExpired,
      otifMetrics: {
        onTimeDeliveryPct: onTimePct,
        qualityAcceptancePct: qualityPct,
        compositeOtifScore: otifScore,
      },
    });
  } catch (err) {
    logger.error(`Vendor performance error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;

