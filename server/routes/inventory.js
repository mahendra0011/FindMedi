import express from 'express';
import { z } from 'zod';
import Inventory from '../models/Inventory.js';
import Supplier from '../models/Supplier.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate, createInventoryItemSchema, updateInventoryItemSchema, createSupplierSchema, createPurchaseOrderSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';

const stockUpdateSchema = z.object({ quantity: z.number(), type: z.enum(['add', 'deduct', 'adjust']), reference: z.string().optional(), notes: z.string().optional() });
const updateSupplierSchema = z.object({}).passthrough();
const poStatusSchema = z.object({ status: z.string().min(1), approvedBy: z.string().optional() });
const poReceiveSchema = z.object({ receivedNotes: z.string().optional() });

const router = express.Router();

// Generate PO Number
const generatePONumber = async () => {
  const count = await PurchaseOrder.countDocuments();
  return `PO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

// Inventory Items
router.post('/items', protect, adminOnly, validate(createInventoryItemSchema), async (req, res) => {
  try {
    const item = await Inventory.create({ ...req.body, hospitalId: req.user.hospitalId || undefined });
    await auditLog('create_inventory_item', req.user._id, { recordId: item._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(item);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/items', protect, async (req, res) => {
  try {
    const { category, lowStock, search } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (category && category !== 'All') filter.category = category;
    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$currentStock', '$minStockLevel'] };
    }
    if (search) {
      filter.$or = [
        { itemName: new RegExp(search, 'i') },
        { itemCode: new RegExp(search, 'i') },
        { category: new RegExp(search, 'i') },
      ];
    }
    const items = await Inventory.find(filter).sort({ itemName: 1 });
    res.json({ items });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/items/:id', protect, validate(updateInventoryItemSchema), async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && item.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    Object.assign(item, req.body);
    await item.save();
    await auditLog('update_inventory_item', req.user._id, { recordId: item._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(item);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/items/:id/stock', protect, adminOnly, validate(stockUpdateSchema), async (req, res) => {
  try {
    const { quantity, type, reference, notes } = req.body;
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && item.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
      
if (type === 'add') item.currentStock += quantity;
    else if (type === 'deduct') item.currentStock = Math.max(0, item.currentStock - quantity);
    else if (type === 'adjust') item.currentStock = quantity;

    item.transactionHistory.push({
      type: type === 'add' ? 'Purchase' : (type === 'deduct' ? 'Issue' : 'Adjustment'),
      quantity,
      reference: reference || '',
      doneBy: req.user.name,
      date: new Date()
    });
    
    await item.save();
    await auditLog('update_inventory_stock', req.user._id, { recordId: item._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(item);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/items/:id', protect, async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && item.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(item);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const hFilter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') hFilter.hospitalId = req.user.hospitalId;
    const total = await Inventory.countDocuments({ isActive: true, ...hFilter });
    const lowStock = await Inventory.countDocuments({
      isActive: true, ...hFilter,
      $expr: { $lte: ['$currentStock', '$minStockLevel'] }
    });
    const totalValue = await Inventory.aggregate([
      { $match: { isActive: true, ...hFilter } },
      { $group: { _id: null, value: { $sum: { $multiply: ['$currentStock', '$unitPrice'] } } } }
    ]);
    res.json({
      total,
      lowStock,
      inventoryValue: totalValue[0]?.value || 0
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Suppliers
router.post('/suppliers', protect, adminOnly, validate(createSupplierSchema), async (req, res) => {
  try {
    const supplier = await Supplier.create({ ...req.body, hospitalId: req.user.hospitalId || undefined });
    await auditLog('create_supplier', req.user._id, { recordId: supplier._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(supplier);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/suppliers', protect, async (req, res) => {
  try {
    const { active, search, category } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (active !== 'false') filter.isActive = true;
    if (category && category !== 'All') filter.category = category;
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { contactPerson: new RegExp(search, 'i') }];
    const suppliers = await Supplier.find(filter).sort({ name: 1 });
    res.json({ suppliers });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/suppliers/:id', protect, validate(updateSupplierSchema), async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && supplier.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    Object.assign(supplier, req.body);
    await supplier.save();
    await auditLog('update_supplier', req.user._id, { recordId: supplier._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(supplier);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/suppliers/:id', protect, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && supplier.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(supplier);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Purchase Orders
router.post('/purchase-orders', protect, adminOnly, validate(createPurchaseOrderSchema), async (req, res) => {
  try {
    const { supplierId, supplierName, items, expectedDelivery, notes, taxRate } = req.body;
    const poNumber = await generatePONumber();

    const subTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discount = items.reduce((sum, item) => sum + (item.discount || 0), 0);
    const taxableAmount = subTotal - discount;
    const taxAmount = (taxableAmount * (taxRate || 0)) / 100;
    const grandTotal = taxableAmount + taxAmount;

    const po = await PurchaseOrder.create({
      poNumber,
      supplierId,
      supplierName,
      hospitalId: req.user.hospitalId || undefined,
      items: items.map(item => ({
        ...item,
        total: item.quantity * item.unitPrice - (item.discount || 0)
      })),
      subTotal,
      discount,
      taxRate: taxRate || 0,
      taxAmount,
      grandTotal,
      expectedDelivery,
      notes: notes || '',
      createdBy: req.user._id,
    });
    await auditLog('create_purchase_order', req.user._id, { recordId: po._id, ip: req.ip, userAgent: req.get('user-agent') });

    res.status(201).json(po);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/purchase-orders', protect, async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (status && status !== 'All') filter.status = status;
    if (search) {
      filter.$or = [
        { poNumber: new RegExp(search, 'i') },
        { supplierName: new RegExp(search, 'i') }
      ];
    }
    const orders = await PurchaseOrder.find(filter)
      .populate('supplierId', 'name contactPerson')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/purchase-orders/:id', protect, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate('supplierId', 'name contactPerson email')
      .populate('createdBy', 'name email');
    if (!po) return res.status(404).json({ message: 'Purchase order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && po.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(po);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/purchase-orders/:id/status', protect, adminOnly, validate(poStatusSchema), async (req, res) => {
  try {
    const { status, approvedBy } = req.body;
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'Purchase order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && po.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    po.status = status;
    if (approvedBy) po.approvedBy = req.user._id;
    await po.save();
    await auditLog('update_purchase_order_status', req.user._id, { recordId: po._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(po);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/purchase-orders/:id/receive', protect, adminOnly, validate(poReceiveSchema), async (req, res) => {
  try {
    const { receivedNotes } = req.body;
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'Purchase order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && po.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
po.status = 'Received';
    po.receivedDate = new Date();

    // Update inventory stocks
    for (const item of po.items) {
      if (item.inventoryItemId) {
        await Inventory.findByIdAndUpdate(item.inventoryItemId, {
          $inc: { currentStock: item.quantity },
          $push: {
            transactionHistory: {
              type: 'Purchase',
              quantity: item.quantity,
              reference: po.poNumber,
              doneBy: req.user.name,
              date: new Date()
            }
          }
        });
      }
    }

    await po.save();
    await auditLog('receive_purchase_order', req.user._id, { recordId: po._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(po);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/purchase-orders/:id', protect, async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'Purchase order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && po.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await PurchaseOrder.findByIdAndDelete(req.params.id);
    await auditLog('delete_purchase_order', req.user._id, { recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Purchase order deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;