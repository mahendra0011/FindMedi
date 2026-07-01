import express from 'express';
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
import { protect } from '../middleware/auth.js';

const router = express.Router();

const genId = async () => { const c = await Report.countDocuments(); return `RPT-${new Date().getFullYear()}-${String(c+1).padStart(5,'0')}`; };

// Generate actual report data based on type
const generateReportData = async (reportType, dateFrom, dateTo, department) => {
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

  switch (reportType) {
    case 'Bed Occupancy':
      const totalBeds = await Bed.countDocuments();
      const occupiedBeds = await Bed.countDocuments({ status: 'Occupied' });
      const availableBeds = await Bed.countDocuments({ status: 'Available' });
      const maintenanceBeds = await Bed.countDocuments({ status: 'Maintenance' });
      const wardStats = await Bed.aggregate([
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
      const billFilter = { ...dateFilter };
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
      const labStats = await LabOrder.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      
      const totalLabTests = await LabOrder.countDocuments(dateFilter);
      const completedTests = await LabOrder.countDocuments({ ...dateFilter, status: 'Completed' });

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
      const totalMeds = await Medicine.countDocuments({ isActive: true });
      const lowStockMeds = await Medicine.countDocuments({ isActive: true, $expr: { $lte: ['$currentStock', '$reorderLevel'] } });
      const expiringMeds = await Medicine.countDocuments({ 
        expiryDate: { $lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }, 
        isActive: true 
      });
      
      const totalPrescriptions = await (await import('../models/Prescription.js')).default.countDocuments(dateFilter);
      const pendingDispense = await (await import('../models/Prescription.js')).default.countDocuments({ status: { $in: ['Active', 'Partially Dispensed'] } });

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
      const totalStaff = await Staff.countDocuments({ status: 'Active' });
      const presentCount = await Staff.countDocuments({ 'attendance.status': 'Present' });
      
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
      const totalItems = await Inventory.countDocuments({ isActive: true });
      const lowStockItems = await Inventory.countDocuments({ isActive: true, $expr: { $lte: ['$currentStock', '$minStockLevel'] } });
      const totalInventoryValue = await Inventory.aggregate([
        { $match: { isActive: true } },
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
      const totalSurgeries = await OperationTheatre.countDocuments(dateFilter);
      const otCompleted = await OperationTheatre.countDocuments({ ...dateFilter, status: 'Completed' });
      const otScheduled = await OperationTheatre.countDocuments({ ...dateFilter, status: 'Scheduled' });

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
      const birthFilter = { ...dateFilter };
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
      const deathRecords = await PatientModel.find({ ...birthFilter, deathRecord: { $exists: true } });
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
      const allPatients = await PatientModel.find({ ...birthFilter });
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
      const totalAppointments = await Appointment.countDocuments(dateFilter);
      const completedAppointments = await Appointment.countDocuments({ ...dateFilter, status: 'Completed' });
      const aptByStatus = await Appointment.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      const aptByDepartment = await Appointment.aggregate([
        { $match: dateFilter },
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

router.post('/generate', protect, async (req, res) => {
  try {
    const { reportType, category, dateFrom, dateTo, department } = req.body;
    
    if (!reportType) {
      return res.status(400).json({ message: 'Report type is required' });
    }

    const reportId = await genId();
    const { data, summary } = await generateReportData(reportType, dateFrom, dateTo, department);
    
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

export default router;