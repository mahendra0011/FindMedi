import express from 'express';
import { z } from 'zod';
import CanteenItem from '../models/CanteenItem.js';
import CanteenOrder from '../models/CanteenOrder.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { generateTimestampedId } from '../utils/idGenerator.js';
import { validate } from '../utils/validate.js';
import logger from '../config/logger.js';

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

const createItemSchema = z.object({
  name: z.string().min(2).max(200),
  category: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Beverages', 'Special Diet', 'Supplements']).optional(),
  description: z.string().max(1000).optional(),
  price: z.number().min(0),
  costPrice: z.number().min(0).optional(),
  isVeg: z.boolean().optional(),
  nutritionalInfo: z.object({
    calories: z.number().min(0).optional(),
    protein: z.number().min(0).optional(),
    carbs: z.number().min(0).optional(),
    fat: z.number().min(0).optional(),
  }).optional(),
  allergens: z.array(z.string().max(50)).optional(),
  preparationTime: z.number().min(0).optional(),
  stockDailyLimit: z.number().min(0).optional(),
});

const createOrderSchema = z.object({
  items: z.array(z.object({
    itemId: z.string().min(1),
    quantity: z.number().min(1),
  })).min(1),
  mealTime: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snacks']),
  paymentMethod: z.enum(['Staff Wallet', 'Cash', 'Card', 'UPI', 'Salary Deduction', 'Patient Billing']).optional(),
  deliveryLocation: z.string().max(200).optional(),
  specialInstructions: z.string().max(500).optional(),
});

// ─── Menu Items CRUD ────────────────────────────────────────────────────────
router.get('/items', authorize('billing:read', 'admin:read', 'operations:read'), async (req, res) => {
  try {
    const filter = { ...tenantFilter(req), active: true };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.veg === 'true') filter.isVeg = true;
    if (req.query.veg === 'false') filter.isVeg = false;
    const items = await CanteenItem.find(filter).sort({ category: 1, name: 1 }).limit(200).lean();
    return res.json({ total: items.length, items });
  } catch (err) {
    logger.error(`Canteen items list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/items', authorize('billing:write', 'admin:manage'), validate(createItemSchema), async (req, res) => {
  try {
    const item = await CanteenItem.create({
      ...req.body,
      hospitalId: req.user.hospitalId,
    });
    await auditLog(req, 'canteen.item.create', { itemId: item._id, name: item.name });
    return res.status(201).json(item);
  } catch (err) {
    logger.error(`Canteen item create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.put('/items/:id', authorize('billing:write', 'admin:manage'), async (req, res) => {
  try {
    const item = await CanteenItem.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) },
      req.body,
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });
    await auditLog(req, 'canteen.item.update', { itemId: item._id });
    return res.json(item);
  } catch (err) {
    logger.error(`Canteen item update error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Orders ─────────────────────────────────────────────────────────────────
router.get('/orders', authorize('billing:read', 'admin:read', 'operations:read'), async (req, res) => {
  try {
    const filter = { ...tenantFilter(req) };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.mealTime) filter.mealTime = req.query.mealTime;
    if (req.query.staffId) filter.staffId = req.query.staffId;
    const orders = await CanteenOrder.find(filter)
      .populate('staffId', 'name employeeId department')
      .sort({ placedAt: -1 })
      .limit(200)
      .lean();
    return res.json({ total: orders.length, orders });
  } catch (err) {
    logger.error(`Canteen orders list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.post('/orders', authorize('billing:write', 'operations:write'), validate(createOrderSchema), async (req, res) => {
  try {
    const { items, mealTime, paymentMethod, deliveryLocation, specialInstructions } = req.body;

    // Fetch item prices and calculate total
    const itemIds = items.map((i) => i.itemId);
    const canteenItems = await CanteenItem.find({ _id: { $in: itemIds }, ...tenantFilter(req) }).lean();
    const itemMap = new Map(canteenItems.map((i) => [String(i._id), i]));

    let totalAmount = 0;
    const orderItems = items.map((i) => {
      const item = itemMap.get(i.itemId);
      if (!item) throw new Error(`Item ${i.itemId} not found`);
      const subtotal = item.price * i.quantity;
      totalAmount += subtotal;
      return {
        itemId: item._id,
        name: item.name,
        quantity: i.quantity,
        unitPrice: item.price,
        subtotal,
      };
    });

    const order = await CanteenOrder.create({
      hospitalId: req.user.hospitalId,
      orderNumber: generateTimestampedId('CNT'),
      staffId: actorId(req),
      items: orderItems,
      totalAmount,
      paymentMethod: paymentMethod || 'Staff Wallet',
      mealTime,
      deliveryLocation,
      specialInstructions,
    });

    // Update sold counts
    for (const i of items) {
      await CanteenItem.findByIdAndUpdate(i.itemId, { $inc: { soldToday: i.quantity } });
    }

    await auditLog(req, 'canteen.order.create', { orderId: order._id, total: totalAmount });
    return res.status(201).json(order);
  } catch (err) {
    logger.error(`Canteen order create error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

router.patch('/orders/:id/status', authorize('billing:write', 'operations:write', 'admin:manage'), async (req, res) => {
  try {
    const { status } = req.body || {};
    const validStatuses = ['Placed', 'Preparing', 'Ready', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const update = { status };
    if (status === 'Ready') update.readyAt = new Date();
    if (status === 'Delivered') update.deliveredAt = new Date();
    if (status === 'Preparing') update.preparedBy = actorId(req);

    const order = await CanteenOrder.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) },
      update,
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    await auditLog(req, 'canteen.order.status', { orderId: order._id, status });
    return res.json(order);
  } catch (err) {
    logger.error(`Canteen order status error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Kitchen Dashboard Stats ────────────────────────────────────────────────
router.get('/stats', authorize('billing:read', 'admin:read', 'operations:read'), async (req, res) => {
  try {
    const filter = { ...tenantFilter(req) };
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [pending, preparing, ready, deliveredToday, revenueToday, totalItems] = await Promise.all([
      CanteenOrder.countDocuments({ ...filter, status: 'Placed' }),
      CanteenOrder.countDocuments({ ...filter, status: 'Preparing' }),
      CanteenOrder.countDocuments({ ...filter, status: 'Ready' }),
      CanteenOrder.countDocuments({ ...filter, status: 'Delivered', deliveredAt: { $gte: todayStart } }),
      CanteenOrder.aggregate([
        { $match: { ...filter, paymentStatus: 'Paid', placedAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      CanteenItem.countDocuments({ ...filter, active: true }),
    ]);

    return res.json({
      pending,
      preparing,
      ready,
      deliveredToday,
      revenueToday: revenueToday[0]?.total || 0,
      totalItems,
    });
  } catch (err) {
    logger.error(`Canteen stats error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
