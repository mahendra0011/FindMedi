import express from 'express';
import Medicine from '../models/Medicine.js';
import Prescription from '../models/Prescription.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const generatePrescriptionId = async () => {
  const count = await Prescription.countDocuments();
  return `RX-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

// ─── Medicine CRUD ─────────────────────────────────────────────────────────
router.get('/medicines', protect, async (req, res) => {
  try {
    const { search, category, lowStock } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
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

router.post('/medicines', protect, async (req, res) => {
  try {
    const medicine = await Medicine.create({ ...req.body, hospitalId: req.user.hospitalId || undefined });
    res.status(201).json(medicine);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/medicines/:id', protect, async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ message: 'Medicine not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && medicine.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    Object.assign(medicine, req.body);
    await medicine.save();
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
    res.json({ message: 'Medicine removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── Stock Management ──────────────────────────────────────────────────────
router.put('/medicines/:id/stock', protect, async (req, res) => {
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
    res.json(medicine);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Prescription CRUD ─────────────────────────────────────────────────────
router.post('/prescriptions', protect, async (req, res) => {
  try {
    const { patientId, patientName, medicines, diagnosis, clinicalNotes, isEmergency } = req.body;
    if (!patientId || !medicines?.length) {
      return res.status(400).json({ message: 'Patient and at least one medicine required' });
    }
    const prescriptionId = await generatePrescriptionId();
    const prescription = await Prescription.create({
      prescriptionId, patientId, patientName,
      doctorId: req.user._id, doctorName: req.user.name,
      hospitalId: req.user.hospitalId || undefined,
      medicines: medicines.map(m => ({
        medicineId: m.medicineId, medicineName: m.medicineName,
        dosage: m.dosage, frequency: m.frequency, duration: m.duration,
        route: m.route || 'Oral', instructions: m.instructions || '',
        quantity: m.quantity, isDispensed: false,
      })),
      diagnosis: diagnosis || '', clinicalNotes: clinicalNotes || '',
      isEmergency: isEmergency || false, createdBy: req.user._id,
    });
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
    if (req.user.role === 'doctor') filter.doctorId = req.user._id;
    if (req.user.role === 'patient') filter.patientId = req.user._id;
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (status && status !== 'All') filter.status = status;
    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;
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
router.put('/prescriptions/:id/dispense', protect, async (req, res) => {
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
    res.json(prescription);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ─── Pharmacy Stats ────────────────────────────────────────────────────────
router.get('/stats', protect, async (req, res) => {
  try {
    const medFilter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') medFilter.hospitalId = req.user.hospitalId;
    const rxFilter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') rxFilter.hospitalId = req.user.hospitalId;
    const totalMedicines = await Medicine.countDocuments({ isActive: true, ...medFilter });
    const lowStock = await Medicine.countDocuments({ 
      isActive: true, ...medFilter,
      $expr: { $lte: ['$currentStock', '$reorderLevel'] } 
    });
    const expiringSoon = await Medicine.countDocuments({ ...medFilter, expiryDate: { $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }, isActive: true });
    const totalPrescriptions = await Prescription.countDocuments(rxFilter);
    const pendingDispense = await Prescription.countDocuments({ ...rxFilter, status: { $in: ['Active', 'Partially Dispensed'] } });
    res.json({ totalMedicines, lowStock, expiringSoon, totalPrescriptions, pendingDispense });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;