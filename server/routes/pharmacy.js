import express from 'express';
import { z } from 'zod';
import Medicine from '../models/Medicine.js';
import Billing from '../models/Billing.js';
import Prescription from '../models/Prescription.js';
import PharmacyOrder from '../models/PharmacyOrder.js';
import PharmacyDelivery from '../models/PharmacyDelivery.js';
import PharmacyOffer from '../models/PharmacyOffer.js';
import PharmacyReturn from '../models/PharmacyReturn.js';
import PharmacyStaff from '../models/PharmacyStaff.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { validate, createMedicineSchema } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import { generatePrescriptionId, generateTimestampedId } from '../utils/idGenerator.js';

import { getConfig } from '../utils/configLoader.js';

async function getRejectionReasons() {
  return await getConfig('pharmacyRejectionReasons');
}
const medicineUpdateSchema = z.object({}).passthrough();
const pharmacyStockSchema = z.object({ quantity: z.number(), type: z.enum(['add', 'deduct']) });
const prescriptionSchema = z.object({}).passthrough();
const pharmacyOrderSchema = z.object({}).passthrough();
const pharmacyDeliverySchema = z.object({}).passthrough();
const pharmacyOfferSchema = z.object({}).passthrough();
const pharmacyReturnSchema = z.object({}).passthrough();
const pharmacyStaffSchema = z.object({}).passthrough();
const pharmacyDispenseSchema = z.object({ medicineIndex: z.number().int().nonnegative() });

const router = express.Router();

// ─── Public Store Medicines (no auth required) ─────────────────────────────
router.get('/medicines/store/:storeId', async (req, res) => {
  try {
    const { search, category } = req.query;
    const filter = { facilityId: req.params.storeId, isActive: true };
    if (search) filter.$or = [
      { name: new RegExp(search, 'i') },
      { genericName: new RegExp(search, 'i') },
    ];
    if (category && category !== 'All') filter.category = category;
    const medicines = await Medicine.find(filter).sort({ name: 1 });
    res.json({ medicines });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Medicine CRUD ─────────────────────────────────────────────────────────
router.get('/medicines', protect, async (req, res) => {
  try {
    const { search, category, lowStock } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if ((req.user.facilityId || req.user.hospitalId) && req.user.role !== 'superadmin') filter.facilityId = req.user.facilityId || req.user.hospitalId;
    if (search) filter.$or = [
      { name: new RegExp(search, 'i') },
      { genericName: new RegExp(search, 'i') },
      { manufacturer: new RegExp(search, 'i') },
    ];
    if (category && category !== 'All') filter.category = category;
    if (lowStock === 'true') {
      const medicines = await Medicine.find(filter).sort({ name: 1 });

      const lowStockMedicines = medicines.filter(m => m.currentStock <= m.reorderLevel);
      return res.json({ medicines: lowStockMedicines });
    }
    const medicines = await Medicine.find(filter).sort({ name: 1 });
    res.json({ medicines });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Export medicine alerts (low stock / expiring)
router.get('/medicines/export-alerts', protect, async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.user.hospitalId && req.user.role !== 'superadmin') {
      filter.hospitalId = req.user.hospitalId;
      filter.facilityId = req.user.facilityId || req.user.hospitalId;
    }
    const medicines = await Medicine.find({
      ...filter,
      $or: [
        { $expr: { $lte: ['$currentStock', '$reorderLevel'] } },
        { expiryDate: { $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) } }
      ]
    }).sort({ name: 1 });
    res.json({ medicines });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/medicines', protect, validate(createMedicineSchema), async (req, res) => {
  try {
    const medicine = await Medicine.create({ ...req.body, hospitalId: req.user.hospitalId, facilityId: req.user.facilityId || req.user.hospitalId || undefined });
    await auditLog('create_medicine', req.user._id, { recordId: medicine._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(medicine);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/medicines/:id', protect, validate(medicineUpdateSchema), async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && medicine.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    Object.assign(medicine, req.body);
    await medicine.save();
    await auditLog('update_medicine', req.user._id, { recordId: medicine._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(medicine);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/medicines/:id', protect, async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && medicine.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await Medicine.findByIdAndDelete(req.params.id);
    await auditLog('delete_medicine', req.user._id, { recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Medicine removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Stock Management ──────────────────────────────────────────────────────
router.put('/medicines/:id/stock', protect, validate(pharmacyStockSchema), async (req, res) => {
  try {
    const { quantity, type } = req.body; // type: 'add' | 'deduct'
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && medicine.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (type === 'add') medicine.currentStock += quantity;
    else if (type === 'deduct') medicine.currentStock = Math.max(0, medicine.currentStock - quantity);
    await medicine.save();
    await auditLog('update_medicine_stock', req.user._id, { recordId: medicine._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(medicine);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Prescription CRUD ─────────────────────────────────────────────────────
router.post('/prescriptions', protect, validate(prescriptionSchema), async (req, res) => {
  try {
    const { patientId, patientName, medicines, diagnosis, clinicalNotes, isEmergency } = req.body;
    if (!patientId || !medicines?.length) {
      return res.status(400).json({ message: 'Patient and at least one medicine required' });
    }
const prescriptionId = generatePrescriptionId();
    const prescription = await Prescription.create({
      prescriptionId, patientId, patientName,
      doctorId: req.user.doctorProfileId || req.user._id, doctorName: req.user.name,
      hospitalId: req.user.hospitalId, facilityId: req.user.facilityId || req.user.hospitalId || undefined,
      medicines: medicines.map(m => ({
        medicineId: m.medicineId, medicineName: m.medicineName,
        dosage: m.dosage, frequency: m.frequency, duration: m.duration,
        route: m.route || 'Oral', instructions: m.instructions || '',
        quantity: m.quantity, isDispensed: false,
      })),
      diagnosis: diagnosis || '', clinicalNotes: clinicalNotes || '',
      isEmergency: isEmergency || false, createdBy: req.user._id,
    });
    await auditLog('create_prescription', req.user._id, { recordId: prescription._id, ip: req.ip, userAgent: req.get('user-agent') });
    // Notify pharmacy
    const pharmacists = await User.find({ role: { $in: ['pharmacist', 'admin'] }, status: 'active' }).select('_id');
    await Notification.insertMany(pharmacists.map(p => ({
      title: 'New Prescription', message: `Dr. ${req.user.name} prescribed ${medicines.length} medicine(s) for ${patientName}`,
      type: 'pharmacy', userId: p._id.toString(),
    })));
    res.status(201).json(prescription);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/prescriptions', protect, async (req, res) => {
  try {
    const { status, patientId, doctorId, search } = req.query;
    const filter = {};
    if (req.user.role === 'patient') {
      filter.$or = [
        { patientId: req.user._id },
        { patientId: { $exists: false }, patientName: req.user.name },
      ];
    } else if (patientId) {
      filter.patientId = patientId;
    }
    if (req.user.role === 'doctor') {
      filter.doctorId = req.user.doctorProfileId;
    } else if (doctorId) {
      filter.doctorId = doctorId;
    }
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if ((req.user.facilityId || req.user.hospitalId) && req.user.role !== 'superadmin') filter.facilityId = req.user.facilityId || req.user.hospitalId;
    if (status && status !== 'All') filter.status = status;
    if (search) {
      filter.$or = [
        { prescriptionId: new RegExp(search, 'i') },
        { patientName: new RegExp(search, 'i') },
        { doctorName: new RegExp(search, 'i') },
      ];
    }
    const prescriptions = await Prescription.find(filter)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ prescriptions });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/prescriptions/:id', protect, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name email');
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && prescription.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(prescription);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Pharmacist: Dispense Medicine ─────────────────────────────────────────
router.put('/prescriptions/:id/dispense', protect, validate(pharmacyDispenseSchema), async (req, res) => {
  try {
    const { medicineIndex } = req.body;
    if (medicineIndex === undefined) return res.status(400).json({ message: 'Medicine index required' });
    const prescription = await Prescription.findById(req.params.id).populate('patientId', 'allergies');
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && prescription.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const med = prescription.medicines[medicineIndex];
    if (!med) return res.status(404).json({ message: 'Medicine not found in prescription' });
    if (med.isDispensed) return res.status(400).json({ message: 'Already dispensed' });

    // Check allergies
    if (prescription.patientId?.allergies?.length > 0) {
      const allergicMatch = prescription.patientId.allergies.find(a => 
        a.allergen?.toLowerCase()?.includes(med.medicineName?.toLowerCase()) ||
        med.medicineName?.toLowerCase()?.includes(a.allergen?.toLowerCase())
      );
      if (allergicMatch) {
        return res.status(400).json({ 
          message: `Patient is allergic to ${med.medicineName}. Reaction: ${allergicMatch.reaction || 'Unknown'}` 
        });
      }
    }

    // Check for drug interactions with already dispensed medicines in this prescription
    const dispensedMedicines = prescription.medicines
      .filter(m => m.isDispensed && m.medicineId)
      .map(m => m.medicineName?.toLowerCase());

    const medicineDoc = await Medicine.findById(med.medicineId);
    if (medicineDoc?.interactions && dispensedMedicines.length > 0) {
      for (const interaction of medicineDoc.interactions) {
        if (dispensedMedicines.includes(interaction?.toLowerCase())) {
          return res.status(400).json({ 
            message: `Drug interaction warning: ${med.medicineName} interacts with ${interaction}` 
          });
        }
      }
    }

    // Deduct stock
    if (med.medicineId) {
      const medicine = await Medicine.findById(med.medicineId);
      if (medicine) {
        if (medicine.currentStock < med.quantity) {
          return res.status(400).json({ message: `Insufficient stock for ${med.medicineName}. Available: ${medicine.currentStock}` });
        }
        medicine.currentStock -= med.quantity;
        await medicine.save();
      }
    }
    med.isDispensed = true;
    med.dispensedAt = new Date();
    med.dispensedBy = req.user.name;
    await prescription.save();
    await auditLog('dispense_prescription', req.user._id, { recordId: prescription._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(prescription);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Pharmacy Stats ────────────────────────────────────────────────────────
router.get('/stats', protect, async (req, res) => {
  try {
    const medFilter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') { medFilter.hospitalId = req.user.hospitalId; medFilter.facilityId = req.user.facilityId || req.user.hospitalId; }
    const rxFilter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') { rxFilter.hospitalId = req.user.hospitalId; rxFilter.facilityId = req.user.facilityId || req.user.hospitalId; }
    const totalMedicines = await Medicine.countDocuments({ isActive: true, ...medFilter });
    const lowStock = await Medicine.countDocuments({ 
      isActive: true, ...medFilter,
      $expr: { $lte: ['$currentStock', '$reorderLevel'] } 
    });
    const expiringSoon = await Medicine.countDocuments({ ...medFilter, expiryDate: { $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }, isActive: true });
    const totalPrescriptions = await Prescription.countDocuments(rxFilter);
    const pendingDispense = await Prescription.countDocuments({ ...rxFilter, status: { $in: ['Active', 'Partially Dispensed'] } });
    const totalOrders = await PharmacyOrder.countDocuments(medFilter);
    const pendingReturns = await PharmacyReturn.countDocuments({ ...medFilter, status: 'Pending' });
    const revenue = await PharmacyOrder.aggregate([
      { $match: { paymentStatus: 'Paid', ...(medFilter.hospitalId ? { hospitalId: medFilter.hospitalId } : {}) } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    res.json({ totalMedicines, lowStock, expiringSoon, totalPrescriptions, pendingDispense, totalOrders, pendingReturns, revenue: revenue[0]?.total || 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Export pharmacy billing
router.get('/billing/export', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    const bills = await Billing.find({ ...filter, source: 'pharmacy' }).sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Orders ────────────────────────────────────────────────────────────────
router.get('/orders', protect, async (req, res) => {
  try {
    const { status, search, orderId } = req.query;
    const filter = {};
    if (req.user.role === 'patient') {
      filter.$or = [
        { patientId: req.user._id },
        { patientId: { $exists: false }, patientName: req.user.name },
      ];
    }
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if ((req.user.facilityId || req.user.hospitalId) && req.user.role !== 'superadmin') filter.facilityId = req.user.facilityId || req.user.hospitalId;
    if (status && status !== 'All') filter.status = status;
    if (orderId) filter.orderId = orderId;
    if (search) filter.$or = [{ orderId: new RegExp(search, 'i') }, { patientName: new RegExp(search, 'i') }];
    let query = PharmacyOrder.find(filter).sort({ orderDate: -1 });
    if (orderId) query = query.populate('items.medicineId', 'name form');
    const orders = await query;
    res.json({ orders });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/orders', protect, validate(pharmacyOrderSchema), async (req, res) => {
  try {
    const orderId = generateTimestampedId('ORD');
    // Use facilityId from body for patient orders, fallback to user's facility for staff
    const facilityId = req.body.facilityId || req.user.facilityId || req.user.hospitalId || undefined;
    const order = await PharmacyOrder.create({ ...req.body, orderId, hospitalId: req.user.hospitalId, facilityId, createdBy: req.user._id });
    await auditLog('create_pharmacy_order', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/orders/:id', protect, validate(pharmacyOrderSchema), async (req, res) => {
  try {
    const order = await PharmacyOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    Object.assign(order, req.body);
    await order.save();
    await auditLog('update_pharmacy_order', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/orders/:id', protect, async (req, res) => {
  try {
    await PharmacyOrder.findByIdAndDelete(req.params.id);
    await auditLog('delete_pharmacy_order', req.user._id, { recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/orders/:id/forward', protect, async (req, res) => {
  try {
    const original = await PharmacyOrder.findById(req.params.id);
    if (!original) return res.status(404).json({ message: 'Order not found' });
    const { facilityId } = req.body;
    if (!facilityId) return res.status(400).json({ message: 'facilityId (new pharmacy) is required' });
    const newOrderId = generateTimestampedId('ORD');
    const newOrder = await PharmacyOrder.create({
      patientId: original.patientId,
      patientName: original.patientName,
      phone: original.phone,
      deliveryAddress: original.deliveryAddress,
      items: original.items,
      total: original.total,
      note: original.note,
      orderId: newOrderId,
      hospitalId: original.hospitalId,
      facilityId,
      createdBy: req.user._id,
      prescriptionUrl: original.prescriptionUrl,
      deliveryFee: original.deliveryFee,
      deliveryMode: original.deliveryMode,
      deliverySlot: original.deliverySlot,
      paymentMethod: original.paymentMethod,
      discount: original.discount,
    });
    await auditLog('forward_pharmacy_order', req.user._id, { recordId: newOrder._id, ip: req.ip, userAgent: req.get('user-agent') });
    original.status = 'Cancelled';
    await original.save();
    res.status(201).json({ newOrder, cancelledOrder: original });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/orders/:id/reject', protect, async (req, res) => {
  try {
    const order = await PharmacyOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const { reason } = req.body;
    order.prescriptionStatus = 'rejected';
    if (reason) order.rejectionReason = reason;
    order.note = order.note + (order.note ? ' | ' : '') + `Rejected: ${reason || 'No reason given'}`;
    await order.save();
    await auditLog('reject_pharmacy_prescription', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(order);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Deliveries ────────────────────────────────────────────────────────────
router.get('/deliveries', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if ((req.user.facilityId || req.user.hospitalId) && req.user.role !== 'superadmin') filter.facilityId = req.user.facilityId || req.user.hospitalId;
    const deliveries = await PharmacyDelivery.find(filter).sort({ assignedAt: -1 });
    res.json({ deliveries });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/deliveries', protect, validate(pharmacyDeliverySchema), async (req, res) => {
  try {
    const delivery = await PharmacyDelivery.create({ ...req.body, hospitalId: req.user.hospitalId, facilityId: req.user.facilityId || req.user.hospitalId || undefined });
    await auditLog('create_pharmacy_delivery', req.user._id, { recordId: delivery._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(delivery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/deliveries/:id', protect, validate(pharmacyDeliverySchema), async (req, res) => {
  try {
    const delivery = await PharmacyDelivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });
    if (req.body.tracking) delivery.tracking.push({ location: req.body.tracking, time: new Date() });
    Object.assign(delivery, req.body);
    await delivery.save();
    res.json(delivery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Offers ────────────────────────────────────────────────────────────────
router.get('/offers', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if ((req.user.facilityId || req.user.hospitalId) && req.user.role !== 'superadmin') filter.facilityId = req.user.facilityId || req.user.hospitalId;
    const offers = await PharmacyOffer.find(filter).sort({ createdAt: -1 });
    res.json({ offers });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/offers', protect, validate(pharmacyOfferSchema), async (req, res) => {
  try {
    const offer = await PharmacyOffer.create({ ...req.body, hospitalId: req.user.hospitalId, facilityId: req.user.facilityId || req.user.hospitalId || undefined });
    await auditLog('create_pharmacy_offer', req.user._id, { recordId: offer._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(offer);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/offers/:id', protect, validate(pharmacyOfferSchema), async (req, res) => {
  try {
    const offer = await PharmacyOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    Object.assign(offer, req.body);
    await offer.save();
    await auditLog('update_pharmacy_offer', req.user._id, { recordId: offer._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(offer);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/offers/:id', protect, async (req, res) => {
   try { await PharmacyOffer.findByIdAndDelete(req.params.id); await auditLog('delete_pharmacy_offer', req.user._id, { recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') }); res.json({ message: 'Deleted' }); }
   catch (err) { res.status(500).json({ message: err.message }); }
 });

// ─── Returns ───────────────────────────────────────────────────────────────
router.get('/returns', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if ((req.user.facilityId || req.user.hospitalId) && req.user.role !== 'superadmin') filter.facilityId = req.user.facilityId || req.user.hospitalId;
    const returns = await PharmacyReturn.find(filter).sort({ initiatedAt: -1 });
    res.json({ returns });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/returns', protect, validate(pharmacyReturnSchema), async (req, res) => {
  try {
    const returnId = generateTimestampedId('RET');
    const ret = await PharmacyReturn.create({ ...req.body, returnId, hospitalId: req.user.hospitalId, facilityId: req.user.facilityId || req.user.hospitalId || undefined });
    await auditLog('create_pharmacy_return', req.user._id, { recordId: ret._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(ret);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/returns/:id', protect, validate(pharmacyReturnSchema), async (req, res) => {
  try {
    const ret = await PharmacyReturn.findById(req.params.id);
    if (!ret) return res.status(404).json({ message: 'Return not found' });
    if (req.body.status === 'Approved' || req.body.status === 'Refunded') ret.completedAt = new Date();
    Object.assign(ret, req.body);
    await ret.save();
    await auditLog('update_pharmacy_return', req.user._id, { recordId: ret._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(ret);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Staff ─────────────────────────────────────────────────────────────────
router.get('/staff', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if ((req.user.facilityId || req.user.hospitalId) && req.user.role !== 'superadmin') filter.facilityId = req.user.facilityId || req.user.hospitalId;
    const staff = await PharmacyStaff.find(filter).sort({ joinedAt: -1 });
    res.json({ staff });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/staff', protect, validate(pharmacyStaffSchema), async (req, res) => {
  try {
    const member = await PharmacyStaff.create({ ...req.body, hospitalId: req.user.hospitalId, facilityId: req.user.facilityId || req.user.hospitalId || undefined });
    await auditLog('create_pharmacy_staff', req.user._id, { recordId: member._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.status(201).json(member);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/staff/:id', protect, validate(pharmacyStaffSchema), async (req, res) => {
  try {
    const member = await PharmacyStaff.findById(req.params.id);
    if (!member) return res.status(404).json({ message: 'Staff not found' });
    Object.assign(member, req.body);
    await member.save();
    await auditLog('update_pharmacy_staff', req.user._id, { recordId: member._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(member);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/staff/:id', protect, async (req, res) => {
  try {
    await PharmacyStaff.findByIdAndDelete(req.params.id);
    await auditLog('delete_pharmacy_staff', req.user._id, { recordId: req.params.id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Coupon Validation ─────────────────────────────────────────────────────
router.post('/coupons/validate', protect, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Coupon code required' });
    const offer = await PharmacyOffer.findOne({ code: code.toUpperCase(), isActive: true });
    if (!offer) return res.status(404).json({ valid: false, message: 'Coupon not found or expired' });
    res.json({ valid: true, code: offer.code, discount: offer.discount, title: offer.title });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Prescription Verification ───────────────────────────────────────────────
router.post('/orders/verify-prescriptions', protect, async (req, res) => {
  try {
    const { entries, file } = req.body;
    // For demo purposes, simulate 40% approval rate
    if (Math.random() < 0.4) {
      res.json({ verified: true });
    } else {
      const reasons = await getRejectionReasons(); res.json({ verified: false, reason: reasons[Math.floor(Math.random() * reasons.length)] });
    }
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Refund Endpoint ───────────────────────────────────────────────────────
router.post('/orders/:id/refund', protect, async (req, res) => {
  try {
    const order = await PharmacyOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && order.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { amount, reason, items } = req.body;
    order.refunded = true;
    order.refundAmount = amount || 0;
    order.refundReason = reason || '';
    order.refundDate = new Date();
    await order.save();
    await auditLog('process_pharmacy_refund', req.user._id, { recordId: order._id, ip: req.ip, userAgent: req.get('user-agent') });
    res.json({ message: 'Refund processed', order });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

export default router;

