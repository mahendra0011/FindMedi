import express from 'express';
import { z } from 'zod';
import DietOrder from '../models/DietOrder.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Billing from '../models/Billing.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate, createDietOrderSchema, boundedScalar, boundedShallow } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import { generateOrderId, generateInvoiceId } from '../utils/idGenerator.js';
import { getISTDateString } from '../utils/dateUtils.js';
import { escapeRegex, capSearch } from '../utils/escapeRegex.js';

const mealItemShape = z.union([
  z.string().trim().max(300),
  z.object({ name: z.string().trim().max(300), quantity: z.string().trim().max(100).optional() }).catchall(boundedScalar),
]);
const dietDeliverMealSchema = z.object({ mealType: z.string().trim().max(100).optional(), items: z.array(mealItemShape).max(200).optional() });
const dietConfirmMealSchema = z.object({ mealIndex: z.number().int().nonnegative(), feedback: z.string().trim().max(1000).optional(), feedbackNote: z.string().trim().max(2000).optional() });
const dietBillingSchema = z.object({ amount: z.number().finite().optional(), description: z.string().trim().max(1000).optional(), items: z.array(boundedShallow).max(200).optional(), sessionType: z.string().trim().max(100).optional() });

const router = express.Router();

// File 09 §06.6: kitchen production sheet — today's active orders grouped
// by ward × diet type (census → production quantities).
router.get('/kitchen/sheet', protect, async (req, res) => {
  try {
    const filter = { status: 'Active' };
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const rows = await DietOrder.aggregate([
      { $match: filter },
      { $group: { _id: { ward: '$ward', dietType: '$dietType' }, count: { $sum: 1 } } },
      { $sort: { '_id.ward': 1, '_id.dietType': 1 } },
    ]);
    return res.json({ sheet: rows, total: rows.reduce((s, r) => s + r.count, 0) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/orders', protect, adminOnly, validate(createDietOrderSchema), async (req, res) => {
  try {
    const { patientId, patientName, admissionId, ward, bedNumber, dietType, mealTimes, instructions, allergies } = req.body;
    if (!patientId || !dietType) return res.status(400).json({ message: 'Patient and diet type required' });
    const orderId = generateOrderId('DIET');
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
    const kitchenStaff = await User.find({ role: { $in: ['hospital_admin', 'dietitian'] }, status: 'active' }).select('_id');
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
        { orderId: new RegExp(escapeRegex(capSearch(search)), 'i') }, { patientName: new RegExp(escapeRegex(capSearch(search)), 'i') },
        { dietType: new RegExp(escapeRegex(capSearch(search)), 'i') }, { ward: new RegExp(escapeRegex(capSearch(search)), 'i') },
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
    
    const invoiceId = generateInvoiceId('diet');
    
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
      date: getISTDateString(),
      dietOrderId: order._id,
    });
    await auditLog('create_diet_billing', req.user._id, { recordId: billing._id, ip: req.ip, userAgent: req.get('user-agent') });
    void import('../lib/pgDualWrite.js').then((m) => m.mirrorBilling(billing)).catch(() => {});
    
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

// ─── Clinical Nutrition, BMR & Macro Calculation Engine ──────────────────────
router.post('/calculate-nutrition', protect, async (req, res) => {
  try {
    const {
      weightKg,
      heightCm,
      ageYears,
      gender = 'male', // 'male' | 'female'
      activityLevel = 'bedridden', // 'bedridden' | 'sedentary' | 'lightly_active' | 'moderately_active'
      clinicalStressFactor = 'normal', // 'normal' | 'postop' | 'sepsis' | 'burns_major' | 'trauma'
      formula = 'harris_benedict', // 'harris_benedict' | 'mifflin'
      proteinMultiplierGPerKg // optional override e.g. 1.2 or 1.5 g/kg
    } = req.body || {};

    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm);
    const a = parseFloat(ageYears);

    if (isNaN(w) || isNaN(h) || isNaN(a) || w <= 0 || h <= 0 || a <= 0) {
      return res.status(400).json({ message: 'Valid weightKg, heightCm, and ageYears required' });
    }

    // Basal Metabolic Rate (BMR)
    let bmr = 0;
    if (formula === 'mifflin') {
      // Mifflin-St Jeor: 10*W + 6.25*H - 5*A + (male ? +5 : -161)
      bmr = (10 * w) + (6.25 * h) - (5 * a) + (gender.toLowerCase() === 'female' ? -161 : 5);
    } else {
      // Harris-Benedict (revised)
      if (gender.toLowerCase() === 'female') {
        bmr = 447.593 + (9.247 * w) + (3.098 * h) - (4.330 * a);
      } else {
        bmr = 88.362 + (13.397 * w) + (4.799 * h) - (5.677 * a);
      }
    }

    // Activity Multiplier
    const activityMap = {
      bedridden: 1.15,
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55
    };
    const actMult = activityMap[activityLevel] || 1.15;

    // Clinical Stress Multiplier
    const stressMap = {
      normal: 1.0,
      postop: 1.15,
      trauma: 1.3,
      sepsis: 1.4,
      burns_major: 1.7
    };
    const stressMult = stressMap[clinicalStressFactor] || 1.0;

    // Total Daily Energy Expenditure (TDEE / Target Calories)
    const targetCalories = Math.round(bmr * actMult * stressMult);

    // Protein Prescription (g/day)
    // Healthy adult: 0.8-1.0 g/kg, Post-op / Hospitalized: 1.2-1.5 g/kg, Sepsis/Burns: 1.5-2.0 g/kg
    let protPerKg = parseFloat(proteinMultiplierGPerKg);
    if (isNaN(protPerKg) || protPerKg <= 0) {
      if (clinicalStressFactor === 'burns_major' || clinicalStressFactor === 'sepsis') protPerKg = 1.8;
      else if (clinicalStressFactor === 'postop' || clinicalStressFactor === 'trauma') protPerKg = 1.3;
      else protPerKg = 1.0;
    }
    const proteinGrams = Math.round(w * protPerKg);
    const proteinCalories = proteinGrams * 4;

    // Fat: ~25-30% of total calories (9 kcal/g)
    const fatCalories = Math.round(targetCalories * 0.28);
    const fatGrams = Math.round(fatCalories / 9);

    // Carbohydrate: Remaining calories (4 kcal/g)
    const remainingCalories = Math.max(0, targetCalories - proteinCalories - fatCalories);
    const carbGrams = Math.round(remainingCalories / 4);

    // Maintenance Fluid Requirement: Holliday-Segar formula
    // 100 mL/kg for first 10 kg + 50 mL/kg for next 10 kg + 20 mL/kg for remaining
    let fluidMl = 0;
    if (w <= 10) fluidMl = w * 100;
    else if (w <= 20) fluidMl = 1000 + ((w - 10) * 50);
    else fluidMl = 1500 + ((w - 20) * 20);

    return res.json({
      bmrKcal: Math.round(bmr),
      targetCaloriesKcal: targetCalories,
      macronutrients: {
        proteinGrams,
        proteinKcal: proteinCalories,
        proteinPct: Math.round((proteinCalories / targetCalories) * 100),
        carbohydrateGrams: carbGrams,
        carbohydrateKcal: remainingCalories,
        carbohydratePct: Math.round((remainingCalories / targetCalories) * 100),
        fatGrams,
        fatKcal: fatCalories,
        fatPct: Math.round((fatCalories / targetCalories) * 100)
      },
      recommendedFluidMl: Math.round(fluidMl),
      stressFactorUsed: stressMult,
      activityFactorUsed: actMult
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;