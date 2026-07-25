import express from 'express';
import { z } from 'zod';
import DietOrder from '../models/DietOrder.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Billing from '../models/Billing.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate, createDietOrderSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';

const dietDeliverMealSchema = z.object({ mealType: z.string().optional(), items: z.any().optional() });
const dietConfirmMealSchema = z.object({ mealIndex: z.number().int().nonnegative(), feedback: z.string().optional(), feedbackNote: z.string().optional() });
const dietBillingSchema = z.object({ amount: z.number().optional(), description: z.string().optional(), items: z.array(z.any()).optional(), sessionType: z.string().optional() });

const router = express.Router();

const generateOrderId = () => `DIET-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

router.post('/orders', protect, adminOnly, validate(createDietOrderSchema), async (req, res) => {
  try {
    const { patientId, patientName, admissionId, ward, bedNumber, dietType, mealTimes, instructions, allergies } = req.body;
    if (!patientId || !dietType) return res.status(400).json({ message: 'Patient and diet type required' });
    const orderId = generateOrderId();
const order = await DietOrder.create({
       orderId, patientId, patientName, admissionId, ward, bedNumber,
       doctorId: req.user.doctorProfileId || req.user._id, doctorName: req.user.name,
       hospitalId: req.user.hospitalId || undefined,
       dietType, mealTimes: mealTimes || ['Breakfast', 'Lunch', 'Dinner'],
       instructions: instructions || '', allergies: allergies || '',
       createdBy: req.user._id,
     });
     await auditLog('create_diet_order', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
     // Notify kitchen and dietitian
    const kitchenStaff = await User.find({ role: { $in: ['admin', 'dietitian'] }, status: 'active' }).select('_id');
    await Notification.insertMany(kitchenStaff.map(s => ({
      title: 'New Diet Order', message: `${dietType} diet for ${patientName} (${ward || 'N/A'})`,
      type: 'diet', userId: s._id.toString(),
    })));
    res.status(201).json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/orders', protect, async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (status && status !== 'All') filter.status = status;
    if (search) {
      filter.$or = [
        { orderId: new RegExp(search, 'i') }, { patientName: new RegExp(search, 'i') },
        { dietType: new RegExp(search, 'i') }, { ward: new RegExp(search, 'i') },
      ];
    }
    const orders = await DietOrder.find(filter).populate('patientId', 'name').sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/orders/:id/deliver-meal', protect, validate(dietDeliverMealSchema), async (req, res) => {
  try {
    const order = await DietOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { mealType, items } = req.body;
    
    const mealIndex = order.meals.findIndex(m => m.mealType === mealType);
    const mealData = {
      mealType, date: new Date(), items: items || '',
      deliveredAt: new Date(), deliveredBy: req.user.name,
    };
    
if (mealIndex >= 0) {
       order.meals[mealIndex] = { ...order.meals[mealIndex], ...mealData };
     } else {
       order.meals.push(mealData);
     }
     
     await order.save();
     await auditLog('deliver_meal', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
     res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/orders/:id/confirm-meal', protect, validate(dietConfirmMealSchema), async (req, res) => {
  try {
    const order = await DietOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { mealIndex, feedback, feedbackNote } = req.body;
    if (mealIndex === undefined) return res.status(400).json({ message: 'Meal index required' });
    const meal = order.meals[mealIndex];
    if (!meal) return res.status(404).json({ message: 'Meal not found' });
    meal.confirmedByNurse = true;
    meal.nurseName = req.user.name;
    if (feedback) meal.patientFeedback = feedback;
    if (feedbackNote) meal.feedbackNote = feedbackNote;
    await order.save();
     await auditLog('confirm_meal', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/orders/:id/review', protect, async (req, res) => {
  try {
    const order = await DietOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    order.reviewedByDietitian = true;
    order.dietitianName = req.user.name;
    if (req.body.kitchenNotified) {
      order.kitchenNotifiedAt = new Date();
    }
    if (req.body.patientFeedback) {
      order.patientFeedback = req.body.patientFeedback;
      order.patientFeedbackAt = new Date();
    }
    await order.save();
     await auditLog('review_diet_order', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Notify kitchen
router.put('/orders/:id/notify', protect, async (req, res) => {
  try {
    const order = await DietOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    order.kitchenNotifiedAt = new Date();
    await order.save();
    await auditLog('notify_kitchen', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Add patient feedback
router.put('/orders/:id/feedback', protect, async (req, res) => {
  try {
    const order = await DietOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    order.patientFeedback = req.body.feedback;
    order.patientFeedbackAt = new Date();
    await order.save();
    await auditLog('add_patient_feedback', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Create billing for diet order
router.post('/orders/:id/create-billing', protect, adminOnly, validate(dietBillingSchema), async (req, res) => {
  try {
    const order = await DietOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { amount, description, items } = req.body;
    
    // Check if billing already exists
    const existingBilling = await Billing.findOne({ dietOrderId: order._id });
    if (existingBilling) {
      return res.status(400).json({ message: 'Billing already created for this order' });
    }
    
    const year = new Date().getFullYear();
    const rndBase = `${Date.now()}${Math.floor(Math.random() * 10**9)}`;
    const invoiceId = `INV-DIE-${year}-${rndBase.slice(-16)}`;
    
    const billing = await Billing.create({
      invoiceId,
      patient: order.patientName,
      patientId: order.patientId,
      service: description || 'Diet Services',
      services: items || [{ name: order.dietType, price: amount || 0, category: 'Diet' }],
      amount: amount || 0,
      source: 'diet',
      appointmentId: order.admissionId,
      status: 'Pending',
      date: new Date().toISOString().split('T')[0],
      dietOrderId: order._id,
    });
    await auditLog('create_diet_billing', req.user._id, { recordId: billing._id, ip: req.ip, userAgent: req.get('user-agent') });
    
    res.status(201).json(billing);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const hFilter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') hFilter.hospitalId = req.user.hospitalId;
    const active = await DietOrder.countDocuments({ status: 'Active', ...hFilter });
    const todayMeals = await DietOrder.countDocuments({ ...hFilter, 'meals.date': { $gte: new Date().setHours(0,0,0,0) } });
    const total = await DietOrder.countDocuments(hFilter);
    const reviewed = await DietOrder.countDocuments({ reviewedByDietitian: true, ...hFilter });
    res.json({ active, todayMeals, total, reviewed });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;