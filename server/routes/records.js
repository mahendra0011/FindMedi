import express from 'express';
import Record from '../models/Record.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import { protect } from '../middleware/auth.js';
import { generatePrescriptionPDF } from '../services/pdfService.js';

const router = express.Router();

const createNotification = async (userId, title, message, type = 'records') => {
  if (!userId) return;
  await Notification.create({ title, message, type, read: false, userId: userId.toString(), date: new Date().toISOString().split('T')[0] });
};

const findPatientByName = async (name) => {
  if (!name) return null;
  const patient = await User.findOne({ name: new RegExp(name, 'i'), role: 'patient' });
  return patient;
};

router.get('/', protect, async (req, res) => {
  try {
    const { search, type, patient } = req.query;
    const filter = {};
    
    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      filter.doctorId = req.user._id;
      if (req.user.hospitalId) filter.hospitalId = req.user.hospitalId;
    } else if (req.user.role === 'admin' && req.user.hospitalId) {
      filter.hospitalId = req.user.hospitalId;
    }
    
    // Hide self-uploads from admin/doctor panels
    if (req.user.role !== 'patient') {
      filter.doctor = { $ne: 'Self Upload' };
    }
    
    if (type && type !== 'All') filter.type = type;
    if (search) filter.$or = [
      { patient: new RegExp(search, 'i') },
      { doctor: new RegExp(search, 'i') },
      { diagnosis: new RegExp(search, 'i') },
    ];
    if (patient) filter.patient = new RegExp(patient, 'i');
    
    const records = await Record.find(filter)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 });
    res.json({ records });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/patient/:patientId', protect, async (req, res) => {
  try {
    const filter = { patientId: req.params.patientId };

    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      filter.doctorId = req.user._id;
      if (req.user.hospitalId) filter.hospitalId = req.user.hospitalId;
    } else if (req.user.role === 'admin' && req.user.hospitalId) {
      filter.hospitalId = req.user.hospitalId;
    }

    const records = await Record.find(filter)
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 });
    res.json({ records });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const { patientId, patient, diagnosis, prescription, type, notes, data, appointmentId, attachments } = req.body;
    
    let doctorName = req.user.name;
    let doctorId = req.user._id;
    let finalPatientId = patientId;
    
    // If patientId not provided, try to find by patient name
    if (!finalPatientId && patient) {
      const patientUser = await findPatientByName(patient);
      if (patientUser) finalPatientId = patientUser._id;
    }
    
    // If still no patientId and user is a patient, use their own ID
    if (!finalPatientId && req.user.role === 'patient') {
      finalPatientId = req.user._id;
    }
    
    // For doctors creating records, if no patient found, return error
    if (!finalPatientId && req.user.role === 'doctor') {
      return res.status(400).json({ message: 'Patient not found. Please select a valid patient.' });
    }
    
    if (req.user.role === 'patient') {
      doctorName = req.body.doctor || '';
      doctorId = req.body.doctorId || null;
    }
    
    const record = await Record.create({
      patient: patient || req.user.name,
      patientId: finalPatientId,
      doctor: doctorName,
      doctorId: doctorId,
      appointmentId: appointmentId || null,
      hospitalId: req.body.hospitalId || req.user.hospitalId || undefined,
      date: new Date().toISOString().split('T')[0],
      diagnosis: diagnosis || '',
      prescription: prescription || '',
      type: type || 'Diagnosis',
      notes: notes || '',
      data: data || {},
      attachments: attachments || []
    });
    
    await record.populate('doctorId', 'name specialization');
    
    if (finalPatientId) {
      await createNotification(finalPatientId.toString(), 'New Medical Record', `Dr. ${doctorName} has generated your ${type || 'record'}`, 'records');
    }
    
    // Notify admins about new record created by doctor
    if (req.user.role === 'doctor') {
      const admins = await User.find({ role: 'admin', status: 'active' }).select('_id');
      await Notification.insertMany(admins.map(admin => ({
        title: 'New Medical Record Generated',
        message: `Dr. ${doctorName} created a ${type || 'record'} for ${patient || 'a patient'}`,
        type: 'records',
        userId: admin._id.toString(),
      })));
    }
    
    res.status(201).json(record);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const existing = await Record.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Record not found' });
    if (req.user.hospitalId && existing.hospitalId && existing.hospitalId.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this record' });
    }
    if (req.user.role === 'patient' && existing.patientId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this record' });
    }
    const r = await Record.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('doctorId', 'name specialization');
    res.json(r);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/:id/prescription-pdf', protect, async (req, res) => {
  try {
    const record = await Record.findById(req.params.id).populate('doctorId', 'name specialization email signatureUrl');
    if (!record) return res.status(404).json({ message: 'Record not found' });
    if (req.user.role === 'patient' && record.patientId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    let docSignatureUrl = '';
    if (record.doctorId?.signatureUrl) {
      docSignatureUrl = record.doctorId.signatureUrl;
    } else {
      const doctorDoc = await Doctor.findOne({ user_id: record.doctorId?._id || record.doctorId });
      if (doctorDoc?.signatureUrl) docSignatureUrl = doctorDoc.signatureUrl;
    }
    const pdfData = {
      prescriptionId: record._id.toString().slice(-8).toUpperCase(),
      date: record.date || new Date(),
      patient: { name: record.patient, age: record.data?.patient?.age, gender: record.data?.patient?.gender, phone: record.data?.patient?.phone },
      doctor: { name: record.doctor, specialization: record.doctorId?.specialization, email: record.doctorId?.email, signatureUrl: docSignatureUrl },
      chiefComplaints: record.data?.chiefComplaints || record.notes || '',
      diagnosis: record.diagnosis || '',
      medications: record.data?.medications?.length ? record.data.medications.map(m => typeof m === 'string' ? { name: m, dosage: '', frequency: '', instructions: '' } : m) : [],
      advice: record.data?.advice || '',
      followUp: record.data?.followUp || '',
    };
    const pdfBuffer = await generatePrescriptionPDF(pdfData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="prescription-${record._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const existing = await Record.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Record not found' });
    if (req.user.hospitalId && existing.hospitalId && existing.hospitalId.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this record' });
    }
    if (req.user.role === 'patient' && existing.patientId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this record' });
    }
    await Record.findByIdAndDelete(req.params.id);
    res.json({ message: 'Record removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
// 25
