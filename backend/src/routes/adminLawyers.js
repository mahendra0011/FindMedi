import express from 'express';
import LawyerProfile from '../models/LawyerProfile.js';
import LawyerBooking from '../models/LawyerBooking.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect, requireRole } from '../middleware/auth.js';
// ADM-B-01 / DLB-11: on-demand providers are a PLATFORM marketplace, not a tenant.
// Their profiles carry Aadhaar, driving-licence and bank details, and the models
// have no hospitalId to scope by - so dminOnly (which a hospital_admin holds)
// gave every hospital KYC PII, plate numbers, bank details and ride analytics for
// every other hospital. These are platform-level operations: superadmin only -
// except the three verification-queue routes below, which the ops console's
// kyc_reviewer also holds (8.md 2). Both are platform roles; neither is ever
// hospital-scoped.
import { platformAdminOnly } from '../middleware/authorize.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';
import { escapeRegex, capSearch } from '../utils/escapeRegex.js';

const router = express.Router();

// Platform access for all routes in this file; each route keeps its own guard,
// so the kyc_reviewer reaches the queue only, never /suspend, /all, /bookings
// or /analytics.
router.use(protect, requireRole(['superadmin', 'kyc_reviewer']));

// ─── GET /api/admin/lawyers/pending ───────────────────────────────────────
// Get all pending lawyer applications for Bar Council verification
router.get('/pending', requireRole(['superadmin', 'kyc_reviewer']), async (req, res) => {
  try {
    const pending = await LawyerProfile.find({ lawyerStatus: 'pending_approval' })
      .populate('userId', 'name email phone avatar address createdAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: pending.length, pending });
  } catch (err) {
    logger.error(`Error fetching pending lawyers: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch pending applications' });
  }
});

// ─── GET /api/admin/lawyers/all ───────────────────────────────────────────
// Get all registered lawyers with status/category filter
router.get('/all', platformAdminOnly, async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const query = {};

    if (status) query.lawyerStatus = status;
    if (category) query.practiceCategories = category;

    let lawyers = await LawyerProfile.find(query)
      .populate('userId', 'name email phone avatar address createdAt approvalStatus')
      .sort({ createdAt: -1 });

    if (search) {
      const re = new RegExp(escapeRegex(capSearch(search)), 'i');
      lawyers = lawyers.filter(
        (l) =>
          re.test(l.userId?.name || '') ||
          re.test(l.barCouncilNumber || '') ||
          re.test(l.stateBarCouncil || '') ||
          re.test(l.jurisdictionCity || '')
      );
    }

    res.json({ success: true, count: lawyers.length, lawyers });
  } catch (err) {
    logger.error(`Error fetching all lawyers: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch lawyers' });
  }
});

// ─── PUT /api/admin/lawyers/:id/approve ───────────────────────────────────
// Approve lawyer application
router.put('/:id/approve', requireRole(['superadmin', 'kyc_reviewer']), async (req, res) => {
  try {
    const profile = await LawyerProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: 'Lawyer profile not found' });
    }

    // ADM-B-04: only a pending application can be approved (idempotent state machine).
    if (!['pending_approval', 'rejected', 'suspended'].includes(profile.lawyerStatus)) {
      return res.status(409).json({ message: `Lawyer is already ${profile.lawyerStatus}` });
    }
    profile.lawyerStatus = 'active';
    profile.isDocumentVerified = true;
    profile.rejectionReason = '';
    await profile.save();

    await User.findByIdAndUpdate(profile.userId, {
      approvalStatus: 'approved',
    });

    // ADM-M-02: the approval trail - who approved whom, when.
    await auditLog('approve_lawyer', req.user._id, {
      targetUserId: String(profile.userId),
      profileId: String(profile._id),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    await Notification.create({
      userId: String(profile.userId),
      title: '🎉 Bar Council Verification Approved!',
      message: 'Your Lawyer account is now Active. You can go Available and begin accepting consultation requests.',
      type: 'lawyer',
    }).catch(() => {});

    res.json({ success: true, message: 'Lawyer profile approved and activated', profile });
  } catch (err) {
    logger.error(`Error approving lawyer: ${err.message}`);
    res.status(500).json({ message: 'Failed to approve lawyer' });
  }
});

// ─── PUT /api/admin/lawyers/:id/reject ────────────────────────────────────
// Reject lawyer application with reason
router.put('/:id/reject', requireRole(['superadmin', 'kyc_reviewer']), async (req, res) => {
  try {
    const { reason = 'Bar Council verification details could not be verified' } = req.body;
    const profile = await LawyerProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: 'Lawyer profile not found' });
    }

    // ADM-B-04: reject is only valid from a pending application.
    if (profile.lawyerStatus !== 'pending_approval') {
      return res.status(409).json({ message: `Cannot reject a lawyer in state ${profile.lawyerStatus}` });
    }
    profile.lawyerStatus = 'rejected';
    profile.rejectionReason = reason;
    profile.isAvailable = false;
    await profile.save();

    await User.findByIdAndUpdate(profile.userId, {
      approvalStatus: 'rejected',
    });

    // ADM-M-02: the rejection trail - who rejected whom, when, and why.
    await auditLog('reject_lawyer', req.user._id, {
      targetUserId: String(profile.userId),
      profileId: String(profile._id),
      reason,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    await Notification.create({
      userId: String(profile.userId),
      title: '❌ Lawyer Application Not Approved',
      message: `Your Bar Council verification was rejected. Reason: ${reason}`,
      type: 'lawyer',
    }).catch(() => {});

    res.json({ success: true, message: 'Lawyer application rejected', profile });
  } catch (err) {
    logger.error(`Error rejecting lawyer: ${err.message}`);
    res.status(500).json({ message: 'Failed to reject lawyer' });
  }
});

// ─── PUT /api/admin/lawyers/:id/suspend ───────────────────────────────────
// Suspend / Reinstate lawyer
router.put('/:id/suspend', platformAdminOnly, async (req, res) => {
  try {
    const profile = await LawyerProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ message: 'Lawyer profile not found' });
    }

    const nextStatus = profile.lawyerStatus === 'suspended' ? 'active' : 'suspended';
    profile.lawyerStatus = nextStatus;
    if (nextStatus === 'suspended') profile.isAvailable = false;
    await profile.save();

    // ADM-M-02: suspension is an admin decision - record direction, not just state.
    await auditLog(nextStatus === 'suspended' ? 'suspend_lawyer' : 'reactivate_lawyer', req.user._id, {
      targetUserId: String(profile.userId),
      profileId: String(profile._id),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: `Lawyer profile status set to ${nextStatus}`,
      profile,
    });
  } catch (err) {
    logger.error(`Error toggling lawyer suspension: ${err.message}`);
    res.status(500).json({ message: 'Failed to update lawyer status' });
  }
});

// ─── GET /api/admin/lawyers/bookings ──────────────────────────────────────
// All legal bookings oversight
router.get('/bookings', platformAdminOnly, async (req, res) => {
  try {
    const { status, category, fromDate, toDate } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (fromDate || toDate) {
      query.scheduledDate = {};
      if (fromDate) query.scheduledDate.$gte = new Date(fromDate);
      if (toDate) query.scheduledDate.$lte = new Date(toDate);
    }

    const bookings = await LawyerBooking.find(query)
      .populate('userId', 'name email phone avatar')
      .populate('lawyerId', 'name email phone avatar')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    logger.error(`Error fetching lawyer bookings for admin: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// ─── GET /api/admin/lawyers/analytics ────────────────────────────────────
// Legal Services KPI stats
router.get('/analytics', platformAdminOnly, async (req, res) => {
  try {
    const [totalLawyers, activeLawyers, pendingApprovals, allBookings] = await Promise.all([
      LawyerProfile.countDocuments(),
      LawyerProfile.countDocuments({ lawyerStatus: 'active' }),
      LawyerProfile.countDocuments({ lawyerStatus: 'pending_approval' }),
      LawyerBooking.find().select('status fee category payment createdAt isFollowUp'),
    ]);

    const completedBookings = allBookings.filter((b) => b.status === 'completed');
    const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.fee || 0), 0);
    const platformCommission = Math.round(totalRevenue * 0.1); // 10%

    // Category breakdown
    const categoryCounts = {};
    allBookings.forEach((b) => {
      categoryCounts[b.category] = (categoryCounts[b.category] || 0) + 1;
    });

    res.json({
      success: true,
      analytics: {
        totalLawyers,
        activeLawyers,
        pendingApprovals,
        totalBookings: allBookings.length,
        completedBookings: completedBookings.length,
        totalRevenue,
        platformCommission,
        categoryCounts,
      },
    });
  } catch (err) {
    logger.error(`Error fetching lawyer analytics: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

export default router;
