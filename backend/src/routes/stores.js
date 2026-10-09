import express from 'express';
import Store from '../models/Store.js';
import Indent from '../models/Indent.js';
import GRN from '../models/GRN.js';
import StockLedger from '../models/StockLedger.js';
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

export default router;
