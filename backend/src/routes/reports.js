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
import Radiology from '../models/Radiology.js';
import ImagingModality from '../models/ImagingModality.js';
import ImagingAppointment from '../models/ImagingAppointment.js';
import ChargeItem from '../models/ChargeItem.js';
import { protect, adminOnly, authorize } from '../middleware/auth.js';
import { requireStepUp } from '../middleware/stepUpAuth.js';
import { validate } from '../utils/validate.js';
import { parseExcelFile, parseFile, exportToExcel, exportToCSV, validatePatientData, validateDoctorData, validateBillingData, formatPatientsForExport, formatDoctorsForExport, formatBillingForExport, formatAppointmentsForExport } from '../utils/excelUtils.js';
import { getConfig } from '../utils/configLoader.js';
import { generatePrescriptionPDF, generateLabReportPDF, generateDischargeSummaryPDF } from '../services/pdfService.js';
import { generateReportId, generateInvoiceId } from '../utils/idGenerator.js';
import { attachmentFromPdf } from '../services/notificationService.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const reportGenerateSchema = z.object({
  reportType: z.string().min(1, 'Report type is required'),
  category: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  department: z.string().optional(),
});

const router = express.Router();

export const REPORT_EXPORT_ROW_CAP = 5000;
export function getReportExportScope(user) {
  if (user?.role === 'superadmin') return {};
  if (user?.role !== 'hospital_admin' || !user?.hospitalId) return null;
  return { hospitalId: user.hospitalId };
}

const genId = () => generateReportId();

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

    // ── §34 radiology / imaging MIS ────────────────────────────────────────
    case 'Radiology Study Volume': {
      const radFilter = { ...dateFilter, ...hospFilter, status: { $ne: 'Cancelled' } };
      const totalStudies = await Radiology.countDocuments(radFilter);
      const byModality = await Radiology.aggregate([
        { $match: radFilter },
        { $group: { _id: '$modality', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      const byDay = await Radiology.aggregate([
        { $match: radFilter },
        { $group: { _id: { modality: '$modality', day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } }, count: { $sum: 1 } } },
        { $sort: { '_id.day': 1 } },
      ]);
      return {
        data: {
          totalStudies,
          byModality: byModality.map((m) => ({ modality: m._id, count: m.count })),
          byDay: byDay.map((d) => ({ modality: d._id.modality, day: d._id.day, count: d.count })),
        },
        summary: `Total studies: ${totalStudies}, modalities: ${byModality.length}`,
      };
    }

    case 'Radiology Revenue': {
      const chargeFilter = { ...dateFilter, ...hospFilter, source: 'radiology', status: { $ne: 'Cancelled' } };
      const total = await ChargeItem.aggregate([
        { $match: chargeFilter },
        { $group: { _id: null, amount: { $sum: '$amount' }, lines: { $sum: 1 } } },
      ]);
      const byService = await ChargeItem.aggregate([
        { $match: chargeFilter },
        { $group: { _id: '$serviceCode', amount: { $sum: '$amount' }, lines: { $sum: 1 } } },
        { $sort: { amount: -1 } },
      ]);
      const byStatus = await ChargeItem.aggregate([
        { $match: chargeFilter },
        { $group: { _id: '$status', amount: { $sum: '$amount' }, lines: { $sum: 1 } } },
      ]);
      return {
        data: {
          totalAmount: total[0]?.amount || 0,
          totalLines: total[0]?.lines || 0,
          byService: byService.map((s) => ({ serviceCode: s._id, amount: s.amount, lines: s.lines })),
          byStatus: byStatus.map((s) => ({ status: s._id, amount: s.amount, lines: s.lines })),
        },
        summary: `Radiology revenue: ₹${total[0]?.amount || 0} across ${total[0]?.lines || 0} lines`,
      };
    }

    case 'Radiology TAT': {
      const tatFilter = { ...dateFilter, ...hospFilter, reportedAt: { $ne: null } };
      const reported = await Radiology.find(tatFilter).select('modality createdAt reportedAt').limit(2000).lean();
      const byModality = {};
      let totalHours = 0;
      for (const r of reported) {
        const hrs = (new Date(r.reportedAt) - new Date(r.createdAt)) / 3600000;
        if (!Number.isFinite(hrs) || hrs < 0) continue;
        const k = r.modality || 'unknown';
        byModality[k] = byModality[k] || { count: 0, totalHours: 0 };
        byModality[k].count += 1;
        byModality[k].totalHours += hrs;
        totalHours += hrs;
      }
      const perModality = Object.entries(byModality).map(([modality, v]) => ({
        modality, count: v.count, avgTatHours: Math.round((v.totalHours / v.count) * 100) / 100,
      }));
      const stillPending = await Radiology.countDocuments({
        ...dateFilter, ...hospFilter,
        status: { $in: ['Study Completed', 'Reporting Pending', 'Report Finalized'] },
      });
      return {
        data: {
          reportedCount: reported.length,
          avgTatHours: reported.length ? Math.round((totalHours / reported.length) * 100) / 100 : 0,
          byModality: perModality,
          reportingPending: stillPending,
        },
        summary: `Reported: ${reported.length}, avg TAT: ${reported.length ? (totalHours / reported.length).toFixed(1) : 0}h, pending: ${stillPending}`,
      };
    }

    case 'Radiology Equipment Utilization': {
      const aptFilter = { ...dateFilter, ...hospFilter };
      const perMachine = await ImagingAppointment.aggregate([
        { $match: aptFilter },
        {
          $group: {
            _id: '$machineId',
            appointments: { $sum: 1 },
            bookedMinutes: {
              $sum: { $cond: [{ $in: ['$status', ['Booked', 'Confirmed', 'Arrived', 'Completed']] }, '$slotMinutes', 0] },
            },
            noShows: { $sum: { $cond: [{ $eq: ['$status', 'No Show'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
          },
        },
      ]);
      const machines = await ImagingModality.find(hospitalId ? { hospitalId } : {})
        .select('name code modalityType slotDurationMinutes').lean();
      const nameById = new Map(machines.map((m) => [String(m._id), m]));
      const rows = perMachine.map((p) => {
        const m = nameById.get(String(p._id));
        return {
          machineId: String(p._id || ''), name: m?.name || '', code: m?.code || '',
          modalityType: m?.modalityType || '', appointments: p.appointments,
          bookedMinutes: p.bookedMinutes, noShows: p.noShows, cancelled: p.cancelled,
          slotMinutes: m?.slotDurationMinutes || 30,
        };
      });
      return {
        data: { machines: rows, totalAppointments: perMachine.reduce((s, p) => s + p.appointments, 0) },
        summary: `Machines with activity: ${rows.length}`,
      };
    }

    case 'Radiology Report Pending': {
      const pendFilter = { ...dateFilter, ...hospFilter };
      const byStatus = await Radiology.aggregate([
        { $match: pendFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      const reportingPipeline = await Radiology.aggregate([
        { $match: { ...pendFilter, status: { $in: ['Study Completed', 'Reporting Pending', 'Report Finalized'] } } },
        { $group: { _id: '$modality', count: { $sum: 1 } } },
      ]);
      const reportingPending = reportingPipeline.reduce((s, r) => s + r.count, 0);
      return {
        data: {
          byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
          reportingPending,
          pendingByModality: reportingPipeline.map((r) => ({ modality: r._id, count: r.count })),
        },
        summary: `Reporting pending: ${reportingPending}`,
      };
    }

    case 'Radiology Cancelled/No-show': {
      const cancelled = await Radiology.countDocuments({ ...dateFilter, ...hospFilter, status: 'Cancelled' });
      const noShows = await ImagingAppointment.countDocuments({ ...dateFilter, ...hospFilter, status: 'No Show' });
      const cancelledAppts = await ImagingAppointment.countDocuments({ ...dateFilter, ...hospFilter, status: 'Cancelled' });
      const cancelByModality = await Radiology.aggregate([
        { $match: { ...dateFilter, ...hospFilter, status: 'Cancelled' } },
        { $group: { _id: '$modality', count: { $sum: 1 } } },
      ]);
      return {
        data: {
          cancelledOrders: cancelled,
          noShowAppointments: noShows,
          cancelledAppointments: cancelledAppts,
          byModality: cancelByModality.map((c) => ({ modality: c._id, count: c.count })),
        },
        summary: `Cancelled orders: ${cancelled}, no-shows: ${noShows}, cancelled appointments: ${cancelledAppts}`,
      };
    }

    // ── PATHOLOGY/LAB §11 MIS: turnaround, rejection, outsourcing, workload ──
    case 'Lab Turnaround Time': {
      const tatFilter = { ...dateFilter, ...hospFilter };
      const tatOrders = await LabOrder.find(tatFilter)
        .select('priority createdAt tests.status tests.resultEnteredAt tests.verifiedAt')
        .limit(5000).lean();
      const SLA_H = { STAT: 2, Urgent: 6, Routine: 24 };
      const hours = { STAT: [], Urgent: [], Routine: [] };
      let breached = 0;
      let completedLines = 0;
      for (const o of tatOrders) {
        const prio = SLA_H[o.priority] ? o.priority : 'Routine';
        for (const t of (o.tests || [])) {
          const end = t.verifiedAt || t.resultEnteredAt;
          if (!end) continue;
          const hrs = (new Date(end) - new Date(o.createdAt)) / 3600000;
          hours[prio].push(+hrs.toFixed(2));
          completedLines += 1;
          if (hrs > SLA_H[prio]) breached += 1;
        }
      }
      const avg = (arr) => (arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null);
      const p90 = (arr) => (arr.length ? +[...arr].sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor(arr.length * 0.9))].toFixed(1) : null);
      const out = {
        sampleSize: completedLines,
        avgHours: { STAT: avg(hours.STAT), Urgent: avg(hours.Urgent), Routine: avg(hours.Routine) },
        p90Hours: { STAT: p90(hours.STAT), Urgent: p90(hours.Urgent), Routine: p90(hours.Routine) },
        breached, slaHours: SLA_H,
        breachRate: completedLines > 0 ? +((breached / completedLines) * 100).toFixed(2) : 0,
      };
      return {
        data: out,
        summary: `TAT (h): STAT ${out.avgHours.STAT ?? '–'} · Urgent ${out.avgHours.Urgent ?? '–'} · Routine ${out.avgHours.Routine ?? '–'} · breached ${breached}/${completedLines}`,
      };
    }

    case 'Lab Rejection Rate': {
      const rejMatch = { ...dateFilter, ...hospFilter };
      const [rejByReason, receivedLines] = await Promise.all([
        LabOrder.aggregate([
          { $match: rejMatch },
          { $unwind: '$tests' },
          { $match: { 'tests.status': 'Rejected' } },
          { $group: { _id: '$tests.rejectionReason', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        LabOrder.aggregate([
          { $match: rejMatch },
          { $unwind: '$tests' },
          { $match: { 'tests.receivedAt': { $ne: null } } },
          { $group: { _id: null, n: { $sum: 1 } } },
        ]),
      ]);
      const rejected = rejByReason.reduce((a, r) => a + r.count, 0);
      const received = receivedLines[0]?.n || 0;
      const rate = received > 0 ? +((rejected / received) * 100).toFixed(2) : 0;
      return {
        data: {
          receivedSamples: received,
          rejectedSamples: rejected,
          rejectionRate: rate,
          byReason: rejByReason.map(r => ({ reason: r._id || 'Unspecified', count: r.count })),
        },
        summary: `Rejected ${rejected} of ${received} received (${rate}%)`,
      };
    }

    case 'Lab Outsourcing': {
      const outMatch = { ...dateFilter, ...hospFilter, 'tests.outsourced.lab': { $ne: '' } };
      const byLabStatus = await LabOrder.aggregate([
        { $match: outMatch },
        { $unwind: '$tests' },
        { $match: { 'tests.outsourced.lab': { $ne: '' } } },
        {
          $group: {
            _id: { lab: '$tests.outsourced.lab', status: '$tests.outsourced.status' },
            count: { $sum: 1 },
            cost: { $sum: { $ifNull: ['$tests.outsourced.outsourceCost', 0] } },
          },
        },
        { $sort: { '_id.lab': 1, '_id.status': 1 } },
      ]);
      const labs = new Map();
      let totalTests = 0;
      let totalCost = 0;
      for (const row of byLabStatus) {
        const lab = row._id?.lab || 'Unknown';
        totalTests += row.count;
        totalCost += row.cost || 0;
        if (!labs.has(lab)) labs.set(lab, { lab, tests: 0, cost: 0, byStatus: {} });
        const entry = labs.get(lab);
        entry.tests += row.count;
        entry.cost += row.cost || 0;
        entry.byStatus[row._id?.status || 'Not started'] = row.count;
      }
      return {
        data: { totalTests, totalCost: +totalCost.toFixed(2), byLab: [...labs.values()] },
        summary: `${totalTests} test(s) outsourced to ${labs.size} lab(s), cost ₹${totalCost.toFixed(2)}`,
      };
    }

    case 'Lab Section Workload': {
      const wlMatch = { ...dateFilter, ...hospFilter };
      const bySection = await LabOrder.aggregate([
        { $match: wlMatch },
        { $unwind: '$tests' },
        {
          $group: {
            _id: { section: '$tests.section', status: '$tests.status' },
            count: { $sum: 1 },
          },
        },
      ]);
      const SECTIONS = ['Biochemistry', 'Hematology', 'Clinical Pathology', 'Microbiology', 'Histopathology', 'Cytology', 'Serology', 'Molecular'];
      const buckets = new Map(SECTIONS.map(s => [s, { section: s, tests: 0, pending: 0, verified: 0, rejected: 0 }]));
      for (const row of bySection) {
        const section = row._id?.section && SECTIONS.includes(row._id.section) ? row._id.section : 'Unsectioned';
        if (!buckets.has(section)) buckets.set(section, { section, tests: 0, pending: 0, verified: 0, rejected: 0 });
        const bucket = buckets.get(section);
        bucket.tests += row.count;
        if (['Verified', 'Report Delivered'].includes(row._id?.status)) bucket.verified += row.count;
        else if (row._id?.status === 'Rejected') bucket.rejected += row.count;
        else bucket.pending += row.count;
      }
      const sections = [...buckets.values()].filter(s => s.tests > 0 || s.section !== 'Unsectioned');
      const totalTests = sections.reduce((a, s) => a + s.tests, 0);
      return {
        data: { sections, totalTests },
        summary: `${totalTests} test line(s) across ${sections.filter(s => s.tests).length} section(s)`,
      };
    }
  }
};

// RPT-B-01: report generation aggregates clinical + financial data. It used to
// be `protect`-only and to scope by `req.user.hospitalId` — for every account
// without a hospital (patients, doctors, riders, delivery partners) that filter
// collapsed to `{}`, i.e. a PLATFORM-WIDE report. Tenant scope is now mandatory
// and a user with no tenant is refused.
const requireReportScope = (req, res, next) => {
  if (req.user.role === 'superadmin') return next();
  if (!req.user.hospitalId && !req.user.facilityId) {
    return res.status(403).json({ message: 'Reports are limited to hospital/facility accounts' });
  }
  next();
};

router.post('/generate', protect, authorize('reports:read'), requireReportScope, validate(reportGenerateSchema), async (req, res) => {
  try {
    const { reportType, category, dateFrom, dateTo, department } = req.body;
    
    if (!reportType) {
      return res.status(400).json({ message: 'Report type is required' });
    }

    const reportId = genId();
    const { data, summary } = await generateReportData(reportType, dateFrom, dateTo, department, req.user.hospitalId || req.user.facilityId);
    
    const report = await Report.create({
      reportId,
      reportType,
      category: category || 'General',
      dateFrom,
      dateTo,
      department,
      data,
      summary,
      // RPT-B-01: persist the tenant on the report so list/read can scope it.
      hospitalId: req.user.hospitalId || req.user.facilityId,
      generatedBy: req.user._id,
      status: 'Generated'
    });

    res.status(201).json(report);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ──────────────────────────────────────────────
// Async PDF jobs (BullMQ) — POST returns 202 + jobId, poll GET for result.
// Sync /generate-* routes below stay untouched (backward compatible).
// ──────────────────────────────────────────────
const PDF_JOB_KINDS = ['prescription', 'lab-report', 'discharge-summary', 'invoice', 'template'];

router.post('/jobs', protect, adminOnly, async (req, res) => {
  try {
    const { kind, data } = req.body || {};
    if (!PDF_JOB_KINDS.includes(kind)) {
      return res.status(400).json({ message: `kind must be one of: ${PDF_JOB_KINDS.join(', ')}` });
    }
    const { enqueuePdf } = await import('../lib/queues.js');
    const r = await enqueuePdf({ kind, data: data || {} });
    if (r.queued) return res.status(202).json({ jobId: r.jobId, state: 'queued', kind });
    // Fallback when queues are down: generate inline, return completed payload
    const pdf = await import('../services/pdfService.js');
    if (kind === 'template') {
      const { docType, templateVersion, payload, html, css, duplicate, lang } = data || {};
      const printEngine = await import('../lib/printEngine.js');
      const pdfRender = await import('../lib/pdfRender.js');
      try {
        const rendered = printEngine.renderTemplate(html || '', css || '', payload || {}, { duplicate, lang });
        const buffer = await pdfRender.renderHtmlToPdf({ html: rendered.html, css });
        return res.json({ state: 'completed', inline: true, result: { filename: `${docType || 'document'}-${templateVersion || Date.now()}.pdf`, base64: Buffer.from(buffer).toString('base64') } });
      } catch {
        const buffer = await pdf.generatePrescriptionPDF(payload || data || {});
        return res.json({ state: 'completed', inline: true, result: { filename: `prescription-${Date.now()}.pdf`, base64: Buffer.from(buffer).toString('base64') } });
      }
    }
    const gen = {
      prescription: pdf.generatePrescriptionPDF,
      'lab-report': pdf.generateLabReportPDF,
      'discharge-summary': pdf.generateDischargeSummaryPDF,
      invoice: pdf.generateInvoicePDF,
    }[kind];
    const buffer = await gen(data || {});
    res.json({ state: 'completed', inline: true, result: { filename: `${kind}-${Date.now()}.pdf`, base64: Buffer.from(buffer).toString('base64') } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// NOTE: registered before '/:id' so 'jobs' isn't swallowed as an id.
router.get('/jobs/:id', protect, adminOnly, async (req, res) => {
  try {
    const { getJobState, QUEUE_NAMES } = await import('../lib/queues.js');
    const s = await getJobState(QUEUE_NAMES.pdf, req.params.id);
    if (!s) return res.status(503).json({ message: 'Queue unavailable' });
    res.json(s);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/', protect, authorize('reports:read'), requireReportScope, async (req, res) => {
  try {
    const { reportType, category, dateFrom, dateTo } = req.query;
    const filter = {};
    // RPT-B-02: fail CLOSED. `if (req.user.hospitalId && role !== superadmin)`
    // listed every report on the platform for any account without a hospital.
    if (req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId || req.user.facilityId;
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

router.get('/:id', protect, authorize('reports:read'), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate('generatedBy', 'name');
    if (!report) return res.status(404).json({ message: 'Report not found' });
    // RPT-B-02: fail closed — a report with no tenant (legacy rows) is
    // superadmin-only, and a tenant user must match exactly.
    if (req.user.role !== 'superadmin') {
      const scope = req.user.hospitalId || req.user.facilityId;
      if (!scope || !report.hospitalId || report.hospitalId.toString() !== String(scope)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }
    res.json(report);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// authz: self
router.get('/types/list', protect, async (req, res) => {
  try {
    const reportTypes = await getConfig('reportTypes');
    res.json({ reportTypes });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ──────────────────────────────────────────────
// Import / Export routes
// ──────────────────────────────────────────────

// AUTHZ-M-03 (F7): the whole patient table walks out through this route - a
// fresh 2FA proof is required, not just the session token.
router.get('/export/:type', protect, adminOnly, requireStepUp('export:full'), async (req, res) => {
  try {
    const { type } = req.params;
    const format = req.query.format || 'excel';
    const hospFilter = getReportExportScope(req.user);
    if (!hospFilter) return res.status(403).json({ message: 'No hospital scope for this account' });

    let records;
    switch (type) {
      case 'patients':
        records = await Patient.find(hospFilter).limit(REPORT_EXPORT_ROW_CAP).lean();
        records = formatPatientsForExport(records);
        break;
      case 'doctors':
        records = await Doctor.find(hospFilter).limit(REPORT_EXPORT_ROW_CAP).lean();
        records = formatDoctorsForExport(records);
        break;
      case 'billing':
        records = await Billing.find(hospFilter).limit(REPORT_EXPORT_ROW_CAP).lean();
        records = formatBillingForExport(records);
        break;
      case 'appointments':
        records = await Appointment.find(hospFilter).limit(REPORT_EXPORT_ROW_CAP).lean();
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

    const buffer = await exportToExcel(records);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${type}.xlsx"`);
    res.send(buffer);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/import/:type', protect, adminOnly, upload.single('file'), async (req, res) => {
  try {
    const { type } = req.params;
    const hospFilter = getReportExportScope(req.user);
    if (!hospFilter) return res.status(403).json({ message: 'No hospital scope for this account' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const rows = await parseFile(req.file.buffer, req.file.mimetype);
    if (!rows || rows.length === 0) return res.status(400).json({ message: 'Excel file is empty or has no valid data' });

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
            invoiceId: generateInvoiceId('manual'),
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
          void import('../lib/pgDualWrite.js').then((m) => m.mirrorBilling(bill)).catch(() => {});
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

router.post('/generate-prescription', protect, adminOnly, async (req, res) => {
  try {
    const pdfBuffer = await generatePrescriptionPDF(req.body);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="prescription-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/generate-lab-report', protect, adminOnly, async (req, res) => {
  try {
    const pdfBuffer = await generateLabReportPDF(req.body);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="lab-report-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/generate-discharge-summary', protect, adminOnly, async (req, res) => {
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

router.post('/email/prescription', protect, adminOnly, async (req, res) => {
  try {
    const { patient, prescription: data } = req.body;
    if (!patient?.email) return res.status(400).json({ message: 'Patient email is required' });

    const pdfBuffer = await generatePrescriptionPDF(data || req.body);
    const { queueEmailOrSend } = await import('../lib/queues.js');
    const emailRes = await queueEmailOrSend({
      to: patient.email,
      subject: 'Your Prescription - FindMedi Hospital',
      text: `Dear ${patient.name}, please find your prescription attached.`,
      html: `<p>Dear ${patient.name},</p><p>Please find your prescription attached to this email.</p><p>Thank you,<br>FindMedi Hospital</p>`,
      attachments: [attachmentFromPdf(`prescription-${Date.now()}.pdf`, pdfBuffer)],
    });

    if (!emailRes.success && emailRes.error) throw new Error(emailRes.error);
    res.json({ success: true, message: emailRes.queued ? 'Prescription queued for email' : 'Prescription emailed successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/email/lab-result', protect, adminOnly, async (req, res) => {
  try {
    const { patient, report: data } = req.body;
    if (!patient?.email) return res.status(400).json({ message: 'Patient email is required' });

    const pdfBuffer = await generateLabReportPDF(data || req.body);
    const { queueEmailOrSend } = await import('../lib/queues.js');
    const emailRes = await queueEmailOrSend({
      to: patient.email,
      subject: 'Your Lab Report - FindMedi Hospital',
      text: `Dear ${patient.name}, please find your lab report attached.`,
      html: `<p>Dear ${patient.name},</p><p>Please find your lab report attached to this email.</p><p>Thank you,<br>FindMedi Hospital</p>`,
      attachments: [attachmentFromPdf(`lab-report-${Date.now()}.pdf`, pdfBuffer)],
    });

    if (!emailRes.success && emailRes.error) throw new Error(emailRes.error);
    res.json({ success: true, message: emailRes.queued ? 'Lab report queued for email' : 'Lab report emailed successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/email/discharge-summary', protect, adminOnly, async (req, res) => {
  try {
    const { patient, summary: data } = req.body;
    if (!patient?.email) return res.status(400).json({ message: 'Patient email is required' });

    const pdfBuffer = await generateDischargeSummaryPDF(data || req.body);
    const { queueEmailOrSend } = await import('../lib/queues.js');
    const emailRes = await queueEmailOrSend({
      to: patient.email,
      subject: 'Your Discharge Summary - FindMedi Hospital',
      text: `Dear ${patient.name}, please find your discharge summary attached.`,
      html: `<p>Dear ${patient.name},</p><p>Please find your discharge summary attached to this email.</p><p>Thank you,<br>FindMedi Hospital</p>`,
      attachments: [attachmentFromPdf(`discharge-summary-${Date.now()}.pdf`, pdfBuffer)],
    });

    if (!emailRes.success && emailRes.error) throw new Error(emailRes.error);
    res.json({ success: true, message: 'Discharge summary emailed successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

export default router;
