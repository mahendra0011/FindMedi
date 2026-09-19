import express from 'express';
import AssistantProfile from '../models/AssistantProfile.js';
import AssistantBooking from '../models/AssistantBooking.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

// Admin protection for all routes in this file
router.use(protect, adminOnly);

// ─── GET /api/admin/assistants/pending ──────────────────────────────────────
// Pending verification queue
router.get('/pending', async (req, res) => {
  try {
    const assistants = await AssistantProfile.find({ assistantStatus: 'pending_approval' })
      .populate('userId', 'name email phone avatar address dateOfBirth gender createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ assistants });
  } catch (err) {
    logger.error(`Get pending assistants error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch pending assistants', error: err.message });
  }
});

// ─── GET /api/admin/assistants/all ──────────────────────────────────────────
// List all assistants with status filter
router.get('/all', async (req, res) => {
  try {
    const { status, hospital, search } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.assistantStatus = status;
    }
    if (hospital) {
      query.hospitalsCovered = { $in: [new RegExp(hospital, 'i')] };
    }

    let assistants = await AssistantProfile.find(query)
      .populate('userId', 'name email phone avatar gender createdAt')
      .sort({ createdAt: -1 })
      .lean();

    if (search) {
      const s = search.toLowerCase();
      assistants = assistants.filter(a =>
        a.userId?.name?.toLowerCase().includes(s) ||
        a.userId?.email?.toLowerCase().includes(s) ||
        a.userId?.phone?.includes(s)
      );
    }

    res.json({ assistants, total: assistants.length });
  } catch (err) {
    logger.error(`Get all assistants error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch assistants', error: err.message });
  }
});

// ─── PUT /api/admin/assistants/:id/approve ──────────────────────────────────
// Approve assistant application
router.put('/:id/approve', async (req, res) => {
  try {
    const assistant = await AssistantProfile.findById(req.params.id);
    if (!assistant) return res.status(404).json({ message: 'Assistant profile not found' });

    assistant.assistantStatus = 'active';
    assistant.isDocumentVerified = true;
    assistant.rejectionReason = '';
    await assistant.save();

    // Update user approvalStatus
    await User.findByIdAndUpdate(assistant.userId, { approvalStatus: 'approved' });

    // Send notification to assistant
    await Notification.create({
      userId: String(assistant.userId),
      title: '🎉 Assistant Profile Approved!',
      message: 'Your hospital assistant application has been verified and approved. You can now log in, toggle Available, and accept bookings.',
      type: 'assistant',
    }).catch(() => {});

    res.json({ success: true, message: 'Assistant approved successfully', assistant });
  } catch (err) {
    logger.error(`Approve assistant error: ${err.message}`);
    res.status(500).json({ message: 'Failed to approve assistant', error: err.message });
  }
});

// ─── PUT /api/admin/assistants/:id/reject ───────────────────────────────────
// Reject assistant application
router.put('/:id/reject', async (req, res) => {
  try {
    const { reason = 'Documents invalid or insufficient background details' } = req.body;
    const assistant = await AssistantProfile.findById(req.params.id);
    if (!assistant) return res.status(404).json({ message: 'Assistant profile not found' });

    assistant.assistantStatus = 'rejected';
    assistant.isDocumentVerified = false;
    assistant.rejectionReason = reason;
    await assistant.save();

    await User.findByIdAndUpdate(assistant.userId, { approvalStatus: 'rejected' });

    await Notification.create({
      userId: String(assistant.userId),
      title: '❌ Assistant Application Not Approved',
      message: `Your application could not be approved at this time. Reason: ${reason}`,
      type: 'assistant',
    }).catch(() => {});

    res.json({ success: true, message: 'Assistant application rejected', assistant });
  } catch (err) {
    logger.error(`Reject assistant error: ${err.message}`);
    res.status(500).json({ message: 'Failed to reject assistant', error: err.message });
  }
});

// ─── PUT /api/admin/assistants/:id/suspend ──────────────────────────────────
// Suspend or reinstate assistant
router.put('/:id/suspend', async (req, res) => {
  try {
    const { suspend = true, reason } = req.body;
    const assistant = await AssistantProfile.findById(req.params.id);
    if (!assistant) return res.status(404).json({ message: 'Assistant profile not found' });

    assistant.assistantStatus = suspend ? 'suspended' : 'active';
    if (suspend) {
      assistant.isAvailable = false;
      assistant.rejectionReason = reason || 'Suspended by platform administrator';
    }
    await assistant.save();

    await Notification.create({
      userId: String(assistant.userId),
      title: suspend ? '⚠️ Account Suspended' : '✅ Account Reinstated',
      message: suspend
        ? `Your assistant account has been suspended. Reason: ${reason || 'Policy violation'}`
        : 'Your assistant account has been reinstated. You can now accept bookings.',
      type: 'assistant',
    }).catch(() => {});

    res.json({
      success: true,
      message: `Assistant ${suspend ? 'suspended' : 'reinstated'} successfully`,
      assistant,
    });
  } catch (err) {
    logger.error(`Suspend assistant error: ${err.message}`);
    res.status(500).json({ message: 'Failed to update assistant status', error: err.message });
  }
});

// ─── GET /api/admin/assistants/bookings ──────────────────────────────────────
// Admin oversight of all assistant bookings
router.get('/bookings', async (req, res) => {
  try {
    const { status, hospital, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }
    if (hospital) {
      query.hospital = new RegExp(hospital, 'i');
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [bookings, total] = await Promise.all([
      AssistantBooking.find(query)
        .populate('patientId', 'name phone email avatar')
        .populate('assistantId', 'name phone email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AssistantBooking.countDocuments(query),
    ]);

    res.json({
      bookings,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    logger.error(`Get admin assistant bookings error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch bookings', error: err.message });
  }
});

// ─── GET /api/admin/assistants/analytics ────────────────────────────────────
// Assistant feature analytics & metrics
router.get('/analytics', async (req, res) => {
  try {
    const [
      totalAssistants,
      activeAssistants,
      pendingApproval,
      suspendedAssistants,
      totalBookings,
      completedBookings,
      cancelledBookings,
      allCompletedList,
    ] = await Promise.all([
      AssistantProfile.countDocuments(),
      AssistantProfile.countDocuments({ assistantStatus: 'active' }),
      AssistantProfile.countDocuments({ assistantStatus: 'pending_approval' }),
      AssistantProfile.countDocuments({ assistantStatus: 'suspended' }),
      AssistantBooking.countDocuments(),
      AssistantBooking.countDocuments({ status: 'completed' }),
      AssistantBooking.countDocuments({ status: { $in: ['cancelled_by_patient', 'cancelled_by_assistant'] } }),
      AssistantBooking.find({ status: 'completed' }).select('cost serviceCategories createdAt').lean(),
    ]);

    const totalRevenue = allCompletedList.reduce((sum, b) => sum + (b.cost?.total || 0), 0);
    const platformRevenue = Math.round(totalRevenue * 0.10);

    // Popular categories count
    const categoryCounts = {};
    allCompletedList.forEach(b => {
      (b.serviceCategories || []).forEach(cat => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
    });

    res.json({
      assistants: {
        total: totalAssistants,
        active: activeAssistants,
        pending: pendingApproval,
        suspended: suspendedAssistants,
      },
      bookings: {
        total: totalBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
        completionRate: totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 100,
      },
      financials: {
        grossBookingsRevenue: totalRevenue,
        platformCommission10Pct: platformRevenue,
        assistantsPayoutNet: totalRevenue - platformRevenue,
      },
      popularCategories: categoryCounts,
    });
  } catch (err) {
    logger.error(`Assistant analytics error: ${err.message}`);
    res.status(500).json({ message: 'Failed to generate analytics', error: err.message });
  }
});

export default router;
