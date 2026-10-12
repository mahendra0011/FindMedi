import express from 'express';
import Staff from '../models/Staff.js';
import { protect, authorize } from '../middleware/auth.js';
import logger from '../config/logger.js';

// Wave 4a: HR document verification, exit interview & onboarding
const router = express.Router();
router.use(protect);

const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id)) ? next() : res.status(404).json({ message: 'Not found' })
);

// authz: role
router.get('/documents/verify', authorize('staff:manage'), async (req, res) => {
  try {
    const staffList = await Staff.find({
      ...tenantFilter(req),
      'verifiedDocs.status': 'Pending',
    })
      .select('employeeId name role department verifiedDocs')
      .limit(100)
      .lean();

    const pendingDocs = [];
    staffList.forEach((s) => {
      (s.verifiedDocs || []).forEach((d) => {
        if (d.status === 'Pending') {
          pendingDocs.push({
            staffId: String(s._id),
            employeeId: s.employeeId,
            name: s.name,
            role: s.role,
            docId: String(d._id),
            docType: d.docType,
            docNumber: d.docNumber,
            docUrl: d.docUrl,
          });
        }
      });
    });

    return res.json({ pendingCount: pendingDocs.length, documents: pendingDocs });
  } catch (err) {
    logger.error(`HR documents verify list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role
router.put('/documents/verify/:id', requireObjectId, authorize('staff:manage'), async (req, res) => {
  try {
    const { docId, status, remarks } = req.body || {};
    if (!['Verified', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be Verified or Rejected' });
    }

    const staff = await Staff.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!staff) return res.status(404).json({ message: 'Staff member not found' });

    const doc = (staff.verifiedDocs || []).find((d) => String(d._id) === String(docId));
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    doc.status = status;
    doc.verifiedBy = req.user._id ?? req.user.id;
    doc.verifiedAt = new Date();
    doc.remarks = String(remarks || '');

    await staff.save();
    return res.json({ success: true, docId: String(doc._id), status: doc.status });
  } catch (err) {
    logger.error(`HR document verify decision error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role
router.post('/exit-interview', authorize('staff:manage'), async (req, res) => {
  try {
    const { staffId, reasonForLeaving, feedback, handoverCompleted, eligibleForRehire, noDuesCleared } = req.body || {};
    if (!OBJECT_ID.test(String(staffId || ''))) {
      return res.status(400).json({ message: 'valid staffId is required' });
    }

    const staff = await Staff.findOne({ _id: staffId, ...tenantFilter(req) });
    if (!staff) return res.status(404).json({ message: 'Staff member not found' });

    staff.exitInterview = {
      conductedAt: new Date(),
      conductedBy: req.user._id ?? req.user.id,
      reasonForLeaving: String(reasonForLeaving || ''),
      feedback: String(feedback || ''),
      handoverCompleted: !!handoverCompleted,
      eligibleForRehire: eligibleForRehire !== false,
      noDuesCleared: !!noDuesCleared,
    };
    staff.status = 'Resigned';

    await staff.save();
    return res.status(201).json({
      success: true,
      staffId: String(staff._id),
      employeeId: staff.employeeId,
      status: staff.status,
      exitInterview: staff.exitInterview,
    });
  } catch (err) {
    logger.error(`HR exit interview error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role
router.get('/onboarding/:id', requireObjectId, authorize('staff:manage'), async (req, res) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id, ...tenantFilter(req) }).lean();
    if (!staff) return res.status(404).json({ message: 'Staff member not found' });

    const totalDocs = staff.verifiedDocs?.length || 0;
    const verifiedDocs = (staff.verifiedDocs || []).filter((d) => d.status === 'Verified').length;
    const completionPct = totalDocs > 0 ? Math.round((verifiedDocs / totalDocs) * 100) : 100;

    return res.json({
      staffId: String(staff._id),
      name: staff.name,
      employeeId: staff.employeeId,
      role: staff.role,
      department: staff.department,
      joinDate: staff.joinDate,
      employmentType: staff.employmentType,
      shift: staff.shift,
      onboardingProgress: {
        totalDocs,
        verifiedDocs,
        completionPct,
        isFullyOnboarded: completionPct === 100,
      },
      documents: staff.verifiedDocs || [],
    });
  } catch (err) {
    logger.error(`HR onboarding status error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
