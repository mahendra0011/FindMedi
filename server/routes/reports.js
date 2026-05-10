import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { generatePrescriptionPDF, generateLabReportPDF, generateDischargeSummaryPDF } from '../services/pdfService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { 
  sendAppointmentReminder, 
  sendPrescriptionEmail, 
  sendLabReportEmail,
  sendDischargeSummaryEmail,
  sendAppointmentReminderSMS
} from '../services/notificationService.js';
import { processMedicalFile, validateFile } from '../utils/imageUtils.js';
import { 
  parseExcelFile, 
  exportToExcel, 
  exportToCSV,
  validatePatientData,
  validateDoctorData,
  validateBillingData,
  formatPatientsForExport,
  formatDoctorsForExport,
  formatBillingForExport,
  formatAppointmentsForExport
} from '../utils/excelUtils.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Billing from '../models/Billing.js';
import Appointment from '../models/Appointment.js';
import Record from '../models/Record.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

// Auth check helper - simple version
const optionalAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const token = auth.split(' ')[1];
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (e) {
      console.log('Auth optional - no valid token');
    }
  }
  next();
};

const findPatientByName = async (name) => {
  if (!name) return null;
  const patient = await User.findOne({ name: new RegExp(name, 'i'), role: 'patient' });
  return patient;
};

const createNotification = async (userId, title, message, type = 'records') => {
  if (userId) {
    await Notification.create({ title, message, type, read: false, userId: userId.toString(), date: new Date().toISOString().split('T')[0] });
  }
};

const buildPrescriptionData = (patient, prescription) => (
  prescription?.patient
    ? prescription
    : {
        patient,
        doctor: {
          name: prescription?.doctorName,
          specialization: prescription?.doctorSpecialization,
        },
        chiefComplaints: prescription?.chiefComplaints,
        diagnosis: prescription?.diagnosis,
        advice: prescription?.advice,
        followUp: prescription?.followUp,
        medications: prescription?.medications || [],
      }
);

const buildLabReportData = (patient, report) => (
  report?.patient
    ? report
    : {
        patient,
        doctor: {
          name: report?.doctorName,
          specialization: report?.doctorSpecialization,
        },
        reportId: report?.reportId,
        testDate: report?.testDate,
        reportDate: report?.reportDate,
        notes: report?.notes,
        tests: report?.tests || [],
      }
);

const buildDischargeData = (patient, summary) => (
  summary?.patient
    ? summary
    : {
        patient,
        doctor: {
          name: summary?.doctorName,
          specialization: summary?.doctorSpecialization,
        },
        admissionId: summary?.admissionId,
        admissionDate: summary?.admissionDate,
        dischargeDate: summary?.dischargeDate,
        chiefComplaints: summary?.chiefComplaints,
        diagnosis: summary?.diagnosis,
        treatment: summary?.treatment,
        surgery: summary?.surgery,
        dischargeAdvice: summary?.dischargeAdvice,
        followUpInstructions: summary?.followUpInstructions,
        medications: summary?.medications || [],
      }
);

router.post('/generate-prescription', async (req, res) => {
  try {
    const pdfBuffer = await generatePrescriptionPDF(req.body);
    
    const patientName = req.body.patient?.name || req.body.patient;
    const doctorName = req.body.doctor?.name || req.body.doctor;
    
    let patientUser = null;
    if (patientName) {
      patientUser = await findPatientByName(patientName);
    }
    
    if (patientName && doctorName) {
      const record = await Record.create({
        patient: patientName,
        patientId: patientUser?._id || null,
        doctor: doctorName,
        date: new Date().toLocaleDateString(),
        diagnosis: req.body.diagnosis || '',
        type: 'prescription',
        data: req.body,
        createdAt: new Date()
      });
      
      if (patientUser?._id) {
        await createNotification(patientUser._id.toString(), 'New Prescription', `Dr. ${doctorName} has generated your prescription`, 'records');
      }
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=prescription.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-lab-report', async (req, res) => {
  try {
    const pdfBuffer = await generateLabReportPDF(req.body);
    
    const patientName = req.body.patient?.name || req.body.patient;
    const doctorName = req.body.doctor?.name || req.body.doctor;
    
    let patientUser = null;
    if (patientName) {
      patientUser = await findPatientByName(patientName);
    }
    
    if (patientName && doctorName) {
      const record = await Record.create({
        patient: patientName,
        patientId: patientUser?._id || null,
        doctor: doctorName,
        date: req.body.testDate || new Date().toLocaleDateString(),
        diagnosis: 'Lab Report',
        type: 'lab_report',
        data: req.body,
        createdAt: new Date()
      });
      
      if (patientUser?._id) {
        await createNotification(patientUser._id.toString(), 'Lab Report Ready', `Dr. ${doctorName} has generated your lab report`, 'records');
      }
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=lab-report.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-discharge-summary', async (req, res) => {
  try {
    const pdfBuffer = await generateDischargeSummaryPDF(req.body);
    
    const patientName = req.body.patient?.name || req.body.patient;
    const doctorName = req.body.doctor?.name || req.body.doctor;
    
    let patientUser = null;
    if (patientName) {
      patientUser = await findPatientByName(patientName);
    }
    
    if (patientName && doctorName) {
      const record = await Record.create({
        patient: patientName,
        patientId: patientUser?._id || null,
        doctor: doctorName,
        date: req.body.dischargeDate || new Date().toLocaleDateString(),
        diagnosis: req.body.diagnosis || 'Discharge Summary',
        type: 'discharge_summary',
        data: req.body,
        createdAt: new Date()
      });
      
      if (patientUser?._id) {
        await createNotification(patientUser._id.toString(), 'Discharge Summary', `Dr. ${doctorName} has generated your discharge summary`, 'records');
      }
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=discharge-summary.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/email/appointment-reminder', async (req, res) => {
  try {
    const result = await sendAppointmentReminder(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/email/prescription', async (req, res) => {
  try {
    const { patient, prescription } = req.body;
    if (!patient?.email) return res.status(400).json({ message: 'Patient email is required' });

    const pdfData = buildPrescriptionData(patient, prescription);
    const pdfBuffer = await generatePrescriptionPDF(pdfData);
    const result = await sendPrescriptionEmail(patient, {
      ...pdfData,
      doctorName: pdfData.doctor?.name || prescription?.doctorName || '',
    }, pdfBuffer);

    const patientUser = await findPatientByName(patient.name);
    if (patientUser?._id) {
      await createNotification(patientUser._id, 'Prescription Emailed', 'Your prescription has been sent to your email.', 'records');
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/email/lab-result', async (req, res) => {
  try {
    const { patient, report } = req.body;
    if (!patient?.email) return res.status(400).json({ message: 'Patient email is required' });

    const pdfData = buildLabReportData(patient, report);
    const pdfBuffer = await generateLabReportPDF(pdfData);
    const result = await sendLabReportEmail(patient, pdfData, pdfBuffer);

    const patientUser = await findPatientByName(patient.name);
    if (patientUser?._id) {
      await createNotification(patientUser._id, 'Lab Report Emailed', 'Your lab report has been sent to your email.', 'records');
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/email/discharge-summary', async (req, res) => {
  try {
    const { patient, summary } = req.body;
    if (!patient?.email) return res.status(400).json({ message: 'Patient email is required' });

    const pdfData = buildDischargeData(patient, summary);
    const pdfBuffer = await generateDischargeSummaryPDF(pdfData);
    const result = await sendDischargeSummaryEmail(patient, pdfData, pdfBuffer);

    const patientUser = await findPatientByName(patient.name);
    if (patientUser?._id) {
      await createNotification(patientUser._id, 'Discharge Summary Emailed', 'Your discharge summary has been sent to your email.', 'records');
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sms/appointment-reminder', async (req, res) => {
  try {
    const { phone, patientName, doctorName, date, time } = req.body;
    const result = await sendAppointmentReminderSMS(phone, patientName, doctorName, date, time);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload/image', optionalAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const ext = path.extname(req.file.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const filepath = `/uploads/images/${filename}`;
    
    const result = {
      filename: req.file.originalname,
      filepath: filepath,
      size: req.file.size,
      type: 'image'
    };
    
    if (req.user.role === 'patient') {
      await Record.create({
        patient: req.user.name,
        patientId: req.user._id,
        doctor: 'Self Upload',
        diagnosis: 'Uploaded medical image',
        type: 'prescription',
        notes: `File: ${result.filename}`,
        data: {
          patient: { name: req.user.name },
          doctor: { name: 'Self Upload' },
          uploadedFile: result,
          date: new Date().toISOString().split('T')[0],
        },
      });
      
      await Notification.create({
        title: 'File Uploaded',
        message: `Your medical image has been uploaded successfully`,
        type: 'records',
        read: false,
        userId: req.user._id,
        date: new Date().toISOString().split('T')[0],
      });
    }
    
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload/xray', optionalAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const ext = path.extname(req.file.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const filepath = `/uploads/xray/${filename}`;
    
    const result = {
      filename: req.file.originalname,
      filepath: filepath,
      size: req.file.size,
      type: 'xray'
    };
    
    if (req.user.role === 'patient') {
      await Record.create({
        patient: req.user.name,
        patientId: req.user._id,
        doctor: 'Self Upload',
        diagnosis: 'Uploaded X-ray',
        type: 'lab_report',
        notes: `File: ${result.filename}`,
        data: {
          patient: { name: req.user.name },
          doctor: { name: 'Self Upload' },
          uploadedFile: result,
          date: new Date().toISOString().split('T')[0],
        },
      });
      
      await Notification.create({
        title: 'X-Ray Uploaded',
        message: `Your X-ray has been uploaded successfully`,
        type: 'records',
        read: false,
        userId: req.user._id,
        date: new Date().toISOString().split('T')[0],
      });
    }
    
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload/document', optionalAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const ext = path.extname(req.file.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const filepath = `/uploads/documents/${filename}`;
    
    const result = {
      filename: req.file.originalname,
      filepath: filepath,
      size: req.file.size,
      type: 'document'
    };
    
    if (req.user.role === 'patient') {
      await Record.create({
        patient: req.user.name,
        patientId: req.user._id,
        doctor: 'Self Upload',
        diagnosis: 'Uploaded document',
        type: 'discharge_summary',
        notes: `File: ${result.filename}`,
        data: {
          patient: { name: req.user.name },
          doctor: { name: 'Self Upload' },
          uploadedFile: result,
          date: new Date().toISOString().split('T')[0],
        },
      });
      
      await Notification.create({
        title: 'Document Uploaded',
        message: `Your document has been uploaded successfully`,
        type: 'records',
        read: false,
        userId: req.user._id,
        date: new Date().toISOString().split('T')[0],
      });
    }
    
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/import/patients', protect, adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const data = parseExcelFile(req.file.buffer);
    const { validPatients, errors } = validatePatientData(data);
    
    if (validPatients.length > 0) {
      const imported = await Patient.insertMany(validPatients);
      res.json({ 
        success: true, 
        imported: imported.length, 
        errors,
        patients: imported 
      });
    } else {
      res.json({ success: false, errors, message: 'No valid patients found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/import/doctors', protect, adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const data = parseExcelFile(req.file.buffer);
    const { validDoctors, errors } = validateDoctorData(data);
    
    if (validDoctors.length > 0) {
      const imported = await Doctor.insertMany(validDoctors);
      res.json({ 
        success: true, 
        imported: imported.length, 
        errors,
        doctors: imported 
      });
    } else {
      res.json({ success: false, errors, message: 'No valid doctors found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/import/billing', protect, adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const data = parseExcelFile(req.file.buffer);
    const { validRecords, errors } = validateBillingData(data);
    
    if (validRecords.length > 0) {
      const count = await Billing.countDocuments();
      const normalizedRecords = validRecords.map((record, index) => {
        const statusMap = {
          paid: 'Paid',
          pending: 'Pending',
          overdue: 'Overdue',
          partial: 'Partial',
        };
        const normalized = {
          ...record,
          status: statusMap[String(record.status || 'Pending').toLowerCase()] || 'Pending',
          invoiceId: record.invoiceId || `IMP-${String(count + index + 1).padStart(4, '0')}`,
        };
        if (normalized.patientId && !/^[a-f\d]{24}$/i.test(String(normalized.patientId))) {
          delete normalized.patientId;
        }
        return normalized;
      });
      const imported = await Billing.insertMany(normalizedRecords);
      res.json({ 
        success: true, 
        imported: imported.length, 
        errors,
        records: imported 
      });
    } else {
      res.json({ success: false, errors, message: 'No valid billing records found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/export/patients', async (req, res) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 });
    const data = formatPatientsForExport(patients);
    
    const format = req.query.format || 'excel';
    
    if (format === 'csv') {
      const csv = exportToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=patients.csv');
      res.send(csv);
    } else {
      const buffer = exportToExcel(data, 'patients');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=patients.xlsx');
      res.send(buffer);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/export/doctors', async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ createdAt: -1 });
    const data = formatDoctorsForExport(doctors);
    
    const format = req.query.format || 'excel';
    
    if (format === 'csv') {
      const csv = exportToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=doctors.csv');
      res.send(csv);
    } else {
      const buffer = exportToExcel(data, 'doctors');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=doctors.xlsx');
      res.send(buffer);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/export/billing', async (req, res) => {
  try {
    const billing = await Billing.find().sort({ date: -1 });
    const data = formatBillingForExport(billing);
    
    const format = req.query.format || 'excel';
    
    if (format === 'csv') {
      const csv = exportToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=billing.csv');
      res.send(csv);
    } else {
      const buffer = exportToExcel(data, 'billing');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=billing.xlsx');
      res.send(buffer);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/export/appointments', async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('patient', 'name email phone')
      .populate('doctor', 'name specialization')
      .sort({ createdAt: -1 });
    
    const data = formatAppointmentsForExport(appointments);
    const format = req.query.format || 'excel';
    
    if (format === 'csv') {
      const csv = exportToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=appointments.csv');
      res.send(csv);
    } else {
      const buffer = exportToExcel(data, 'appointments');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=appointments.xlsx');
      res.send(buffer);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
