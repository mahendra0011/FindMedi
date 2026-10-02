import express from 'express';
import RiderProfile from '../models/RiderProfile.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import RideBooking from '../models/RideBooking.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly, superadminOnly } from '../middleware/auth.js';
// ADM-B-01 / DLB-11: on-demand providers are a PLATFORM marketplace, not a tenant.
// Their profiles carry Aadhaar, driving-licence and bank details, and the models
// have no hospitalId to scope by - so dminOnly (which a hospital_admin holds)
// gave every hospital KYC PII, plate numbers, bank details and ride analytics for
// every other hospital. These are platform-level operations: superadmin only.
import { platformAdminOnly } from '../middleware/authorize.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';

const router = express.Router();

// All routes here require admin access
router.use(protect, superadminOnly);

// ─── GET /api/admin/riders/pending ──────────────────────────────────────────
// Pending verification queue
router.get('/pending', platformAdminOnly, async (req, res) => {
  try {
    const riders = await RiderProfile.find({ riderStatus: 'pending_approval' })
      .populate('userId', 'name email phone avatar address dateOfBirth gender createdAt')
      .populate('vehicleId')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ riders });
  } catch (err) {
    logger.error(`Get pending riders error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch pending riders' });
  }
});

// ─── PUT /api/admin/riders/:id/approve ──────────────────────────────────────
// Approve rider application
router.put('/:id/approve', platformAdminOnly, async (req, res) => {
  try {
    const rider = await RiderProfile.findById(req.params.id);
    if (!rider) return res.status(404).json({ message: 'Rider not found' });

    // ADM-B-04: only a pending application can be approved (idempotent state machine).
    if (!['pending_approval', 'rejected', 'suspended'].includes(rider.riderStatus)) {
      return res.status(409).json({ message: `Rider is already ${rider.riderStatus}` });
    }
    rider.riderStatus = 'active';
    rider.rejectionReason = '';
    await rider.save();

    if (rider.vehicleId) {
      await Vehicle.findByIdAndUpdate(rider.vehicleId, {
        isDocumentVerified: true,
        verifiedAt: new Date(),
        verifiedBy: req.user._id,
      });
    }

    // Update base User approvalStatus
    await User.findByIdAndUpdate(rider.userId, { approvalStatus: 'approved' });

    // ADM-M-02: the approval trail - who approved whom, when.
    await auditLog('approve_rider', req.user._id, {
      targetUserId: String(rider.userId),
      profileId: String(rider._id),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Send notification to rider
    await Notification.create({
      userId: String(rider.userId),
      title: '🎉 Rider Application Approved!',
      message: 'Your documents have been verified by FindMedi Admin. You can now log in, go Online, and start accepting rides.',
      type: 'ride',
    }).catch(() => {});

    res.json({ success: true, message: 'Rider approved successfully', rider });
  } catch (err) {
    logger.error(`Approve rider error: ${err.message}`);
    res.status(500).json({ message: 'Failed to approve rider' });
  }
});

// ─── PUT /api/admin/riders/:id/reject ───────────────────────────────────────
// Reject rider application
router.put('/:id/reject', platformAdminOnly, async (req, res) => {
  try {
    const { reason = 'Documents invalid or insufficient' } = req.body;
    const rider = await RiderProfile.findById(req.params.id);
    if (!rider) return res.status(404).json({ message: 'Rider not found' });

    // ADM-B-04: reject is only valid from a pending application.
    if (rider.riderStatus !== 'pending_approval') {
      return res.status(409).json({ message: `Cannot reject a rider in state ${rider.riderStatus}` });
    }
    rider.riderStatus = 'rejected';
    rider.rejectionReason = reason;
    await rider.save();

    await User.findByIdAndUpdate(rider.userId, { approvalStatus: 'rejected' });

    // ADM-M-02: the rejection trail - who rejected whom, when, and why.
    await auditLog('reject_rider', req.user._id, {
      targetUserId: String(rider.userId),
      profileId: String(rider._id),
      reason,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    await Notification.create({
      userId: String(rider.userId),
      title: '⚠️ Rider Application Notice',
      message: `Your rider application could not be approved. Reason: ${reason}. Please update your documents in settings.`,
      type: 'ride',
    }).catch(() => {});

    res.json({ success: true, message: 'Rider rejected', rider });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject rider' });
  }
});

// ─── PUT /api/admin/riders/:id/suspend ──────────────────────────────────────
// Suspend/reactivate rider
router.put('/:id/suspend', platformAdminOnly, async (req, res) => {
  try {
    const { suspend = true } = req.body;
    const rider = await RiderProfile.findById(req.params.id);
    if (!rider) return res.status(404).json({ message: 'Rider not found' });

    rider.riderStatus = suspend ? 'suspended' : 'active';
    if (suspend) rider.isOnline = false;
    await rider.save();

    // ADM-M-02: suspension is an admin decision - record direction, not just state.
    await auditLog(suspend ? 'suspend_rider' : 'reactivate_rider', req.user._id, {
      targetUserId: String(rider.userId),
      profileId: String(rider._id),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true, message: `Rider ${suspend ? 'suspended' : 'reactivated'}`, rider });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update rider status' });
  }
});

// ─── GET /api/admin/riders/all ──────────────────────────────────────────────
// List all riders
router.get('/all', platformAdminOnly, async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.riderStatus = req.query.status;

    const riders = await RiderProfile.find(query)
      .populate('userId', 'name email phone avatar')
      .populate('vehicleId')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ riders });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch riders' });
  }
});

// ─── GET /api/admin/riders/vehicles ─────────────────────────────────────────
// List all registered vehicles
router.get('/vehicles', platformAdminOnly, async (req, res) => {
  try {
    const query = {};
    if (req.query.type) query.type = req.query.type;

    const vehicles = await Vehicle.find(query)
      .populate('riderId', 'name phone email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ vehicles });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch vehicles' });
  }
});

// ─── GET /api/admin/riders/rides ────────────────────────────────────────────
// List all rides for oversight
router.get('/rides', platformAdminOnly, async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.vehicleType) query.vehicleType = req.query.vehicleType;
    if (req.query.isEmergency != null) query.isEmergency = req.query.isEmergency === 'true';

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [rides, total] = await Promise.all([
      RideBooking.find(query)
        .populate('userId', 'name phone email')
        .populate('riderId', 'name phone')
        .populate('vehicleId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RideBooking.countDocuments(query),
    ]);

    res.json({ rides, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch rides' });
  }
});

// ─── GET /api/admin/riders/analytics ────────────────────────────────────────
// Ride analytics
router.get('/analytics', platformAdminOnly, async (req, res) => {
  try {
    const [totalRides, completedRides, cancelledRides, activeRiders, totalVehicles] =
      await Promise.all([
        RideBooking.countDocuments(),
        RideBooking.find({ status: 'completed' }).select('fare distanceKm vehicleType createdAt').lean(),
        RideBooking.countDocuments({ status: { $in: ['cancelled_by_user', 'cancelled_by_rider'] } }),
        RiderProfile.countDocuments({ riderStatus: 'active' }),
        Vehicle.countDocuments(),
      ]);

    const totalRevenue = completedRides.reduce((s, r) => s + (r.fare?.total || 0), 0);
    const platformRevenue = Math.round(totalRevenue * 0.1);
    const cancellationRate = totalRides > 0 ? Math.round((cancelledRides / totalRides) * 100) : 0;

    // Popular vehicle breakdown
    const vehicleCounts = {};
    completedRides.forEach(r => {
      const type = r.vehicleType || 'other';
      vehicleCounts[type] = (vehicleCounts[type] || 0) + 1;
    });

    res.json({
      totalRides,
      completedCount: completedRides.length,
      cancelledCount: cancelledRides,
      cancellationRate,
      activeRiders,
      totalVehicles,
      totalRevenue,
      platformRevenue,
      vehiclePopularity: vehicleCounts,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

export default router;
