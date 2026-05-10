import express from 'express';
import Billing from '../models/Billing.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import { protect } from '../middleware/auth.js';
import { generateInvoicePDF } from '../services/pdfService.js';

const router = express.Router();

export const LAB_SERVICES = [
  { id: 'bp_check', name: 'Blood Pressure Check', price: 100, category: 'Basic' },
  { id: 'blood_sugar', name: 'Blood Sugar Test', price: 150, category: 'Lab' },
  { id: 'fbc', name: 'Full Blood Count', price: 300, category: 'Lab' },
  { id: 'xray', name: 'X-Ray Scan', price: 500, category: 'Imaging' },
  { id: 'ecg', name: 'ECG Test', price: 400, category: 'Cardiac' },
  { id: 'urine_test', name: 'Urine Test', price: 150, category: 'Lab' },
  { id: 'lipid_profile', name: 'Lipid Profile', price: 450, category: 'Lab' },
  { id: 'thyroid', name: 'Thyroid Panel', price: 500, category: 'Lab' },
];

const createNotification = async (userId, title, message, type = 'payment') => {
  if (!userId) return;
  console.log('Creating notification for userId:', userId, 'title:', title);
  try {
    let finalUserId = userId.toString();
    // If userId is a Doctor._id, convert to User._id
    const doctor = await Doctor.findById(userId);
    if (doctor && doctor.user_id) {
      finalUserId = doctor.user_id;
    }
    await Notification.create({ title, message, type, read: false, userId: finalUserId, date: new Date().toISOString().split('T')[0] });
    console.log('Notification created successfully');
  } catch (err) {
    console.error('Error creating notification:', err);
  }
};

const findPatientByName = async (name) => {
  if (!name) return null;
  const patient = await User.findOne({ name: new RegExp(name, 'i'), role: 'patient' });
  return patient;
};

// Get available lab services
router.get('/services', protect, async (req, res) => {
  res.json(LAB_SERVICES);
});

router.get('/', protect, async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};
    
    // If admin or doctor, show all bills (or filter by their name for doctors)
    if (req.user.role === 'patient') {
      filter.$or = [
        { patientId: req.user._id },
        { patient: new RegExp(req.user.name, 'i') }
      ];
    } else if (req.user.role === 'doctor') {
      // Doctors see bills created by them
      filter.doctor = new RegExp(req.user.name, 'i');
    }
    // Admin sees all bills - no filter needed
    
    if (status && status !== 'All') filter.status = status;
    if (search) {
      if (filter.$or) {
        filter.$or.push(
          { patient: new RegExp(search, 'i') },
          { invoiceId: new RegExp(search, 'i') },
          { service: new RegExp(search, 'i') }
        );
      } else {
        filter.$or = [
          { patient: new RegExp(search, 'i') },
          { invoiceId: new RegExp(search, 'i') },
          { service: new RegExp(search, 'i') },
          { doctor: new RegExp(search, 'i') }
        ];
      }
    }
    
    const bills = await Billing.find(filter)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 });
    
    // Calculate totals
    let totalFilter = {};
    if (req.user.role === 'patient') {
      totalFilter = { $or: [{ patientId: req.user._id }, { patient: new RegExp(req.user.name, 'i') }] };
    } else if (req.user.role === 'doctor') {
      totalFilter = { doctor: new RegExp(req.user.name, 'i') };
    }
    // Admin gets all
    
    const total = await Billing.aggregate([
      { $match: totalFilter },
      { $group: { _id: null, total: { $sum: '$amount' }, paid: { $sum: '$paid' } } }
    ]);
    
    res.json({ bills, summary: total[0] || { total: 0, paid: 0 } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const { doctorId, doctor, service, amount, date, patient, patientId, services, source } = req.body;
    
    const count = await Billing.countDocuments();
    const invoiceId = `INV-${String(count + 1).padStart(4, '0')}`;
    
    let finalPatientId = patientId;
    let finalPatient = patient || req.user.name;
    
    // If patientId not provided, try to find by patient name
    if (!finalPatientId && patient) {
      const patientUser = await findPatientByName(patient);
      if (patientUser) {
        finalPatientId = patientUser._id;
        finalPatient = patientUser.name;
      }
    }
    
    // If still no patientId and user is a patient, use their own ID
    if (!finalPatientId && req.user.role === 'patient') {
      finalPatientId = req.user._id;
    }
    
    // For doctors creating bills, if no patient found, return error
    if (!finalPatientId && req.user.role === 'doctor') {
      return res.status(400).json({ message: 'Patient not found. Please select a valid patient.' });
    }
    
    const selectedServices = Array.isArray(services)
      ? services
        .filter(item => item?.name)
        .map(item => ({
          id: item.id || '',
          name: item.name,
          price: Number(item.price) || 0,
          category: item.category || '',
        }))
      : [];
    const isLabBooking = source === 'lab' || selectedServices.length > 0;

    // Calculate total from services if provided
    let finalAmount = amount;
    let finalService = service;
    if (selectedServices.length > 0) {
      finalAmount = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
      finalService = selectedServices.map(s => s.name).join(', ');
    }

    let finalDoctorId = doctorId;
    let finalDoctor = doctor || (isLabBooking ? 'Lab Services' : req.user?.name || 'Hospital Services');
    if (!finalDoctorId && req.user?.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({
        $or: [
          { user_id: req.user._id.toString() },
          { email: req.user.email },
          { name: new RegExp(req.user.name, 'i') },
        ],
      });
      finalDoctorId = doctorProfile?._id || null;
      finalDoctor = doctorProfile?.name || finalDoctor;
    }
    
    const bill = await Billing.create({
      invoiceId,
      patient: finalPatient,
      patientId: finalPatientId,
      doctor: finalDoctor,
      doctorId: finalDoctorId,
      service: finalService,
      services: selectedServices,
      source: isLabBooking ? 'lab' : source || 'manual',
      amount: finalAmount,
      date: date || new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Pending',
    });
    
    if (finalPatientId) {
      await createNotification(finalPatientId.toString(), 'New Invoice', `Invoice ${invoiceId} of Rs ${finalAmount} for ${finalService}`, 'payment');
    }
    
    res.status(201).json(bill);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/:id/invoice', protect, async (req, res) => {
  try {
    const bill = await Billing.findById(req.params.id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name specialization email user_id');

    if (!bill) return res.status(404).json({ message: 'Invoice not found' });

    const isPatientOwner = req.user.role === 'patient' && (
      String(bill.patientId?._id || bill.patientId || '') === String(req.user._id)
      || bill.patient === req.user.name
    );
    const isDoctorOwner = req.user.role === 'doctor' && (
      bill.doctor === req.user.name
      || String(bill.doctorId?._id || '') === String(req.user._id)
      || String(bill.doctorId?.user_id || '') === String(req.user._id)
    );

    if (req.user.role !== 'admin' && !isPatientOwner && !isDoctorOwner) {
      return res.status(403).json({ message: 'Not authorized to download this invoice' });
    }

    const pdfBuffer = await generateInvoicePDF(bill);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${bill.invoiceId || 'invoice'}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/pay', protect, async (req, res) => {
  try {
    const bill = await Billing.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Invoice not found' });
    
    const { paymentMethod } = req.body;
    const transactionId = `TXN-${Date.now()}`;
    
    bill.paid = bill.amount;
    bill.status = 'Paid';
    bill.paymentMethod = paymentMethod || 'card';
    bill.transactionId = transactionId;
    
    await bill.save();
    
    // Notify patient
    if (bill.patientId) {
      await createNotification(bill.patientId.toString(), 'Payment Successful', `Payment of Rs ${bill.amount} received for ${bill.invoiceId}`, 'payment');
    }
    
    // Notify doctor if assigned
    if (bill.doctorId) {
      await createNotification(bill.doctorId.toString(), 'Payment Received', `Payment of Rs ${bill.amount} received from ${bill.patient} for ${bill.service}`, 'payment');
    }
    
    res.json(bill);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const oldBill = await Billing.findById(req.params.id);
    if (!oldBill) return res.status(404).json({ message: 'Invoice not found' });

    const updatedBill = await Billing.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    // Send notifications if status changed to Paid
    if (req.body.status === 'Paid' && oldBill.status !== 'Paid') {
      // Notify patient
      if (updatedBill.patientId) {
        await createNotification(updatedBill.patientId.toString(), 'Payment Successful', `Payment of Rs ${updatedBill.amount} received for ${updatedBill.invoiceId}`, 'payment');
      }
      // Notify doctor if assigned
      if (updatedBill.doctorId) {
        await createNotification(updatedBill.doctorId.toString(), 'Payment Received', `Payment of Rs ${updatedBill.amount} received from ${updatedBill.patient} for ${updatedBill.service}`, 'payment');
      }
    }

    res.json(updatedBill);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await Billing.findByIdAndDelete(req.params.id);
    res.json({ message: 'Invoice removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
