import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import Report from '../models/Report.js';
import Bed from '../models/Bed.js';
import Admission from '../models/Admission.js';
import Appointment from '../models/Appointment.js';
import Billing from '../models/Billing.js';
import LabOrder from '../models/LabOrder.js';
import Medicine from '../models/Medicine.js';
import Inventory from '../models/Inventory.js';
import OperationTheatre from '../models/OperationTheatre.js';
import Staff from '../models/Staff.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import { parseExcelFile, exportToExcel, exportToCSV, validatePatientData, validateDoctorData, validateBillingData, formatPatientsForExport, formatDoctorsForExport, formatBillingForExport, formatAppointmentsForExport } from '../utils/excelUtils.js';
import { generatePrescriptionPDF, generateLabReportPDF, generateDischargeSummaryPDF } from '../services/pdfService.js';
import { sendEmail, attachmentFromPdf } from '../services/notificationService.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const reportGenerateSchema = z.object({
  reportType: z.string().min(1, 'Report type is required'),
  category: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  department: z.string().optional(),
});

const router = express.Router();

const genId = async () => { const c = await Report.countDocuments(); return `RPT-${new Date().getFullYear()}-${String(c+1).padStart(5,'0')}`; };

// Generate actual report data based on type
const generateReportData = async (reportType, dateFrom, dateTo, department, hospitalId) => {
  const dateFilter = {};
  if (dateFrom || dateTo) {
    dateFilter.createdAt = {};
    if (dateFrom) dateFilter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59);
      dateFilter.createdAt.$lte = endDate;
    }
  }

  const deptFilter = department && department !== 'All' ? { department } : {};
  const hospFilter = hospitalId ? { hospitalId } : {};

  switch (reportType) {
    case 'Bed Occupancy':
      const totalBeds = await Bed.countDocuments(hospFilter);
      const occupiedBeds = await Bed.countDocuments({ status: 'Occupied', ...hospFilter });
      const availableBeds = await Bed.countDocuments({ status: 'Available', ...hospFilter });
      const maintenanceBeds = await Bed.countDocuments({ status: 'Maintenance', ...hospFilter });
      const wardStats = await Bed.aggregate([
        { $match: hospFilter },
        { $group: { _id: '$ward', total: { $sum: 1 }, occupied: { $sum: { $cond: [{ $eq: ['$status', 'Occupied'] }, 1, 0] } } } }
      ]);
      
      return {
        data: {
          totalBeds,
          occupiedBeds,
          availableBeds,
          maintenanceBeds,
          occupancyRate: totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(2) : 0,
          wardStats: wardStats.map(w => ({ ward: w._id, total: w.total, occupied: w.occupied, rate: w.total > 0 ? ((w.occupied / w.total) * 100).toFixed(2) : 0 }))
        },
        summary: `Total: ${totalBeds}, Occupied: ${occupiedBeds}, Available: ${availableBeds}`
      };

    case 'Financial Summary':
      const billFilter = { ...dateFilter, ...hospFilter };
      if (department) billFilter.source = department.toLowerCase();
      
      const totalBilling = await Billing.aggregate([
        { $match: billFilter },
        { $group: { _id: null, totalAmount: { $sum: '$amount' }, totalPaid: { $sum: '$paid' }, totalPending: { $sum: '$balance' } } }
      ]);
      
      const byStatus = await Billing.aggregate([
        { $match: billFilter },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
      ]);

      return {
        data: {
          totalAmount: totalBilling[0]?.totalAmount || 0,
          totalPaid: totalBilling[0]?.totalPaid || 0,
          totalPending: totalBilling[0]?.totalPending || 0,
          collectionRate: totalBilling[0]?.totalAmount > 0 ? ((totalBilling[0]?.totalPaid / totalBilling[0]?.totalAmount) * 100).toFixed(2) : 0,
          byStatus: byStatus.map(s => ({ status: s._id, count: s.count, amount: s.amount }))
        },
        summary: `Total: ₹${totalBilling[0]?.totalAmount || 0}, Paid: ₹${totalBilling[0]?.totalPaid || 0}`
      };

    case 'Lab Statistics':
      const labFilter = { ...dateFilter, ...hospFilter };
      const labStats = await LabOrder.aggregate([
        { $match: labFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      
      const totalLabTests = await LabOrder.countDocuments(labFilter);
      const completedTests = await LabOrder.countDocuments({ ...labFilter, status: 'Completed' });

      return {
        data: {
          totalOrders: totalLabTests,
          completedTests,
          pendingTests: totalLabTests - completedTests,
          completionRate: totalLabTests > 0 ? ((completedTests / totalLabTests) * 100).toFixed(2) : 0,
          byStatus: labStats.map(s => ({ status: s._id, count: s.count }))
        },
        summary: `Total: ${totalLabTests}, Completed: ${completedTests}`
      };

    case 'Pharmacy':
      const medFilter = { isActive: true, ...hospFilter };
      const totalMeds = await Medicine.countDocuments(medFilter);
      const lowStockMeds = await Medicine.countDocuments({ ...medFilter, $expr: { $lte: ['$currentStock', '$reorderLevel'] } });
      const expiringMeds = await Medicine.countDocuments({ 
        ...medFilter,
        expiryDate: { $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }, 
      });
      
      const totalPrescriptions = await (await import('../models/Prescription.js')).default.countDocuments({ ...dateFilter, ...hospFilter });
      const pendingDispense = await (await import('../models/Prescription.js')).default.countDocuments({ status: { $in: ['Active', 'Partially Dispensed'] }, ...hospFilter });

      return {
        data: {
          totalMedicines: totalMeds,
          lowStock: lowStockMeds,
          expiringSoon: expiringMeds,
          totalPrescriptions,
          pendingDispense
        },
        summary: `Medicines: ${totalMeds}, Low Stock: ${lowStockMeds}`
      };

    case 'Staff Attendance':
      const staffFilter = { status: 'Active', ...hospFilter };
      const totalStaff = await Staff.countDocuments(staffFilter);
      const presentCount = await Staff.countDocuments({ ...staffFilter, 'attendance.status': 'Present' });
      
      return {
        data: {
          totalStaff,
          presentCount,
          absentCount: totalStaff - presentCount,
          attendanceRate: totalStaff > 0 ? ((presentCount / totalStaff) * 100).toFixed(2) : 0
        },
        summary: `Total Staff: ${totalStaff}, Present: ${presentCount}`
      };

    case 'Inventory':
      const invFilter = { isActive: true, ...hospFilter };
      const totalItems = await Inventory.countDocuments(invFilter);
      const lowStockItems = await Inventory.countDocuments({ ...invFilter, $expr: { $lte: ['$currentStock', '$minStockLevel'] } });
      const totalInventoryValue = await Inventory.aggregate([
        { $match: invFilter },
        { $group: { _id: null, value: { $sum: { $multiply: ['$currentStock', '$unitPrice'] } } } }
      ]);

      return {
        data: {
          totalItems,
          lowStockItems,
          inventoryValue: totalInventoryValue[0]?.value || 0,
          lowStockPercentage: totalItems > 0 ? ((lowStockItems / totalItems) * 100).toFixed(2) : 0
        },
        summary: `Items: ${totalItems}, Low Stock: ${lowStockItems}`
      };

case 'OT Statistics':
      const otFilter = { ...dateFilter, ...hospFilter };
      const totalSurgeries = await OperationTheatre.countDocuments(otFilter);
      const otCompleted = await OperationTheatre.countDocuments({ ...otFilter, status: 'Completed' });
      const otScheduled = await OperationTheatre.countDocuments({ ...otFilter, status: 'Scheduled' });

      return {
        data: {
          total: totalSurgeries,
          completed: otCompleted,
          scheduled: otScheduled,
          completionRate: totalSurgeries > 0 ? ((otCompleted / totalSurgeries) * 100).toFixed(2) : 0
        },
        summary: `Total: ${totalSurgeries}, Completed: ${otCompleted}`
      };

    case 'Birth Certificate':
      const birthFilter = { ...dateFilter, ...hospFilter };
      const PatientModel = (await import('../models/Patient.js')).default;
      const birthRecords = await PatientModel.find({ ...birthFilter, birthRecord: { $exists: true } });
      return {
        data: {
          births: birthRecords.length,
          records: birthRecords.map(r => ({
            babyName: r.name,
            dateOfBirth: r.dateOfBirth,
            parentName: r.parentName,
            placeOfBirth: r.birthPlace || 'Hospital',
            attendingDoctor: r.attendingDoctor,
            certificateGenerated: r.birthRecord?.certificateGenerated || false
          }))
        },
        summary: `Total births: ${birthRecords.length}`
      };

    case 'Death Certificate':
      const deathRecords = await PatientModel.find({ ...birthFilter, ...hospFilter, deathRecord: { $exists: true } });
      return {
        data: {
          deaths: deathRecords.length,
          records: deathRecords.map(r => ({
            patientName: r.name,
            dateOfDeath: r.deathDate,
            causeOfDeath: r.deathRecord?.causeOfDeath,
            attendingDoctor: r.deathRecord?.attendingDoctor,
            certificateGenerated: r.deathRecord?.certificateGenerated || false
          }))
        },
        summary: `Total deaths: ${deathRecords.length}`
      };

    case 'Notifiable Disease':
      const allPatients = await PatientModel.find({ ...birthFilter, ...hospFilter });
      const infectionPatients = allPatients.filter(p => p.infectiousDisease?.length > 0);
      const diseaseStats = {};
      infectionPatients.forEach(p => {
        p.infectiousDisease.forEach(d => {
          diseaseStats[d.disease] = (diseaseStats[d.disease] || 0) + 1;
        });
      });
      return {
        data: {
          totalCases: infectionPatients.length,
          byDisease: Object.entries(diseaseStats).map(([disease, count]) => ({ disease, count })),
          notifiedTo: 'Public Health Department'
        },
        summary: `Total notifiable disease cases: ${infectionPatients.length}`
      };

    case 'Appointment':
      const aptFilter = { ...dateFilter, ...hospFilter };
      const totalAppointments = await Appointment.countDocuments(aptFilter);
      const completedAppointments = await Appointment.countDocuments({ ...aptFilter, status: 'Completed' });
      const aptByStatus = await Appointment.aggregate([
        { $match: aptFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      const aptByDepartment = await Appointment.aggregate([
        { $match: aptFilter },
        { $group: { _id: '$department', count: { $sum: 1 } } }
      ]);
      return {
        data: {
          totalAppointments,
          completedAppointments,
          pendingAppointments: totalAppointments - completedAppointments,
          completionRate: totalAppointments > 0 ? ((completedAppointments / totalAppointments) * 100).toFixed(2) : 0,
          byStatus: aptByStatus.map(s => ({ status: s._id, count: s.count })),
          byDepartment: aptByDepartment.map(d => ({ department: d._id, count: d.count }))
        },
        summary: `Total: ${totalAppointments}, Completed: ${completedAppointments}`
      };
  }
};

router.post('/generate', protect, validate(reportGenerateSchema), async (req, res) => {
  try {
    const { reportType, category, dateFrom, dateTo, department } = req.body;
    
    if (!reportType) {
      return res.status(400).json({ message: 'Report type is required' });
    }

    const reportId = await genId();
    const { data, summary } = await generateReportData(reportType, dateFrom, dateTo, department, req.user.hospitalId);
    
    const report = await Report.create({
      reportId,
      reportType,
      category: category || 'General',
      dateFrom,
      dateTo,
      department,
      data,
      summary,
      generatedBy: req.user._id,
      status: 'Generated'
    });

    res.status(201).json(report);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/', protect, async (req, res) => {
  try {
    const { reportType, category, dateFrom, dateTo } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (reportType && reportType !== 'All') filter.reportType = reportType;
    if (category && category !== 'All') filter.category = category;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59);
        filter.createdAt.$lte = endDate;
      }
    }
    const reports = await Report.find(filter).populate('generatedBy', 'name').sort({ generatedAt: -1 });
    res.json({ reports });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate('generatedBy', 'name');
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (req.user.role !== 'superadmin' && req.user.hospitalId && report.hospitalId && report.hospitalId.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(report);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/types/list', protect, async (req, res) => {
  try {
    const reportTypes = [
      { id: 'Bed Occupancy', name: 'Bed Occupancy Report', category: 'Administrative' },
      { id: 'Financial Summary', name: 'Financial Summary', category: 'Financial' },
      { id: 'Lab Statistics', name: 'Laboratory Statistics', category: 'Clinical' },
      { id: 'Pharmacy', name: 'Pharmacy Report', category: 'Clinical' },
      { id: 'Staff Attendance', name: 'Staff Attendance Report', category: 'HR' },
      { id: 'Inventory', name: 'Inventory Status Report', category: 'Administrative' },
      { id: 'OT Statistics', name: 'Operation Theatre Statistics', category: 'Clinical' },
      { id: 'Appointment', name: 'Appointment Statistics', category: 'Administrative' },
      { id: 'Patient', name: 'Patient Statistics', category: 'Clinical' },
      { id: 'Birth Certificate', name: 'Birth Certificate Report', category: 'Administrative' },
      { id: 'Death Certificate', name: 'Death Certificate Report', category: 'Administrative' },
      { id: 'Notifiable Disease', name: 'Notifiable Disease Report', category: 'Administrative' },
    ];
    res.json({ reportTypes });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ──────────────────────────────────────────────
// Import / Export routes
// ──────────────────────────────────────────────

router.get('/export/:type', protect, async (req, res) => {
  try {
    const { type } = req.params;
    const format = req.query.format || 'excel';
    const hospFilter = req.user.hospitalId ? { hospitalId: req.user.hospitalId } : {};

    let records;
    switch (type) {
      case 'patients':
        records = await Patient.find(hospFilter).lean();
        records = formatPatientsForExport(records);
        break;
      case 'doctors':
        records = await Doctor.find(hospFilter).lean();
        records = formatDoctorsForExport(records);
        break;
      case 'billing':
        records = await Billing.find(hospFilter).lean();
        records = formatBillingForExport(records);
        break;
      case 'appointments':
        records = await Appointment.find(hospFilter).lean();
        records = formatAppointmentsForExport(records);
        break;
      default:
        return res.status(400).json({ message: 'Invalid export type. Use: patients, doctors, billing, appointments' });
    }

    if (format === 'csv') {
      const csv = exportToCSV(records, Object.keys(records[0] || {}));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}.csv"`);
      return res.send(csv);
    }

    const buffer = exportToExcel(records);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${type}.xlsx"`);
    res.send(buffer);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/import/:type', protect, upload.single('file'), async (req, res) => {
  try {
    const { type } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const rows = parseExcelFile(req.file.buffer);
    if (!rows || rows.length === 0) return res.status(400).json({ message: 'Excel file is empty or has no valid data' });

    const hospFilter = req.user.hospitalId ? { hospitalId: req.user.hospitalId } : {};
    let result;

    switch (type) {
      case 'patients': {
        const { validPatients, errors } = validatePatientData(rows);
        if (validPatients.length === 0) return res.status(400).json({ message: 'No valid patient records found', errors });
        const imported = await Patient.insertMany(validPatients.map(p => ({ ...p, ...hospFilter })));
        result = { success: true, imported: imported.length, errors };
        break;
      }
      case 'doctors': {
        const { validDoctors, errors } = validateDoctorData(rows);
        if (validDoctors.length === 0) return res.status(400).json({ message: 'No valid doctor records found', errors });
        const imported = await Doctor.insertMany(validDoctors.map(d => ({ ...d, ...hospFilter })));
        result = { success: true, imported: imported.length, errors };
        break;
      }
      case 'billing': {
        const { validRecords, errors } = validateBillingData(rows);
        if (validRecords.length === 0) return res.status(400).json({ message: 'No valid billing records found', errors });
        const imported = [];
        for (const record of validRecords) {
          const bill = await Billing.create({
            invoiceId: `IMP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
            patient: record.patient,
            doctor: record.doctor,
            service: record.service,
            amount: record.amount,
            description: record.description,
            status: record.status,
            date: record.date,
            dueDate: record.dueDate,
            paid: record.status === 'Paid' ? record.amount : 0,
            balance: record.status === 'Paid' ? 0 : record.amount,
            ...hospFilter,
          });
          imported.push(bill);
        }
        result = { success: true, imported: imported.length, errors };
        break;
      }
      default:
        return res.status(400).json({ message: 'Invalid import type. Use: patients, doctors, billing' });
    }

    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ──────────────────────────────────────────────
// PDF Generation routes
// ──────────────────────────────────────────────

router.post('/generate-prescription', protect, async (req, res) => {
  try {
    const pdfBuffer = await generatePrescriptionPDF(req.body);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="prescription-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/generate-lab-report', protect, async (req, res) => {
  try {
    const pdfBuffer = await generateLabReportPDF(req.body);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="lab-report-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/generate-discharge-summary', protect, async (req, res) => {
  try {
    const pdfBuffer = await generateDischargeSummaryPDF(req.body);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="discharge-summary-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ──────────────────────────────────────────────
// Email routes
// ──────────────────────────────────────────────

router.post('/email/prescription', protect, async (req, res) => {
  try {
    const { patient, prescription: data } = req.body;
    if (!patient?.email) return res.status(400).json({ message: 'Patient email is required' });

    const pdfBuffer = await generatePrescriptionPDF(data || req.body);
    const emailRes = await sendEmail({
      to: patient.email,
      subject: 'Your Prescription - MediCore Hospital',
      text: `Dear ${patient.name}, please find your prescription attached.`,
      html: `<p>Dear ${patient.name},</p><p>Please find your prescription attached to this email.</p><p>Thank you,<br>MediCore Hospital</p>`,
      attachments: [attachmentFromPdf(`prescription-${Date.now()}.pdf`, pdfBuffer)],
    });

    if (!emailRes.success && emailRes.error) throw new Error(emailRes.error);
    res.json({ success: true, message: 'Prescription emailed successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/email/lab-result', protect, async (req, res) => {
  try {
    const { patient, report: data } = req.body;
    if (!patient?.email) return res.status(400).json({ message: 'Patient email is required' });

    const pdfBuffer = await generateLabReportPDF(data || req.body);
    const emailRes = await sendEmail({
      to: patient.email,
      subject: 'Your Lab Report - MediCore Hospital',
      text: `Dear ${patient.name}, please find your lab report attached.`,
      html: `<p>Dear ${patient.name},</p><p>Please find your lab report attached to this email.</p><p>Thank you,<br>MediCore Hospital</p>`,
      attachments: [attachmentFromPdf(`lab-report-${Date.now()}.pdf`, pdfBuffer)],
    });

    if (!emailRes.success && emailRes.error) throw new Error(emailRes.error);
    res.json({ success: true, message: 'Lab report emailed successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/email/discharge-summary', protect, async (req, res) => {
  try {
    const { patient, summary: data } = req.body;
    if (!patient?.email) return res.status(400).json({ message: 'Patient email is required' });

    const pdfBuffer = await generateDischargeSummaryPDF(data || req.body);
    const emailRes = await sendEmail({
      to: patient.email,
      subject: 'Your Discharge Summary - MediCore Hospital',
      text: `Dear ${patient.name}, please find your discharge summary attached.`,
      html: `<p>Dear ${patient.name},</p><p>Please find your discharge summary attached to this email.</p><p>Thank you,<br>MediCore Hospital</p>`,
      attachments: [attachmentFromPdf(`discharge-summary-${Date.now()}.pdf`, pdfBuffer)],
    });

    if (!emailRes.success && emailRes.error) throw new Error(emailRes.error);
    res.json({ success: true, message: 'Discharge summary emailed successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

export default router;
