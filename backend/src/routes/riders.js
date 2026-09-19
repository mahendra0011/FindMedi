import express from 'express';
import RiderProfile from '../models/RiderProfile.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import RideBooking from '../models/RideBooking.js';
import { protect } from '../middleware/auth.js';
import { validate, riderStatusSchema, riderLocationSchema } from '../utils/validate.js';
import logger from '../config/logger.js';

const router = express.Router();

// ─── GET /api/rider/profile ─────────────────────────────────────────────────
// Get own rider profile
router.get('/profile', protect, async (req, res) => {
  try {
    const rider = await RiderProfile.findOne({ userId: req.user._id })
      .populate('vehicleId')
      .populate('userId', 'name email phone avatar address dateOfBirth gender')
      .lean();

    if (!rider) {
      return res.status(404).json({ message: 'Rider profile not found' });
    }

    res.json({ rider });
  } catch (err) {
    logger.error(`Get rider profile error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch rider profile', error: err.message });
  }
});

// ─── PUT /api/rider/profile ─────────────────────────────────────────────────
// Update operating area, availability, bank details, or vehicle details
router.put('/profile', protect, async (req, res) => {
  try {
    const {
      operatingArea,
      availableDays,
      availableTimeSlot,
      bankDetails,
      vehicleDetails,
    } = req.body;

    const rider = await RiderProfile.findOne({ userId: req.user._id });
    if (!rider) return res.status(404).json({ message: 'Rider profile not found' });

    if (operatingArea) rider.operatingArea = operatingArea;
    if (availableDays) rider.availableDays = availableDays;
    if (availableTimeSlot) rider.availableTimeSlot = availableTimeSlot;
    if (bankDetails) rider.bankDetails = { ...rider.bankDetails, ...bankDetails };

    await rider.save();

    if (vehicleDetails && rider.vehicleId) {
      await Vehicle.findByIdAndUpdate(rider.vehicleId, vehicleDetails);
    }

    res.json({ success: true, message: 'Profile updated successfully', rider });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update rider profile', error: err.message });
  }
});

// ─── PUT /api/rider/emergency-toggle ────────────────────────────────────────
// Toggle Emergency Support participation for independent riders
router.put('/emergency-toggle', protect, async (req, res) => {
  try {
    const { emergencySupport } = req.body;
    const rider = await RiderProfile.findOneAndUpdate(
      { userId: req.user._id },
      { emergencySupport: Boolean(emergencySupport) },
      { new: true }
    );
    if (!rider) return res.status(404).json({ message: 'Rider profile not found' });
    res.json({ success: true, emergencySupport: rider.emergencySupport });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/rider/status ──────────────────────────────────────────────────
// Toggle online/offline
router.put('/status', protect, validate(riderStatusSchema), async (req, res) => {
  try {
    const { isOnline } = req.body;
    const rider = await RiderProfile.findOne({ userId: req.user._id });

    if (!rider) return res.status(404).json({ message: 'Rider profile not found' });

    if (isOnline && rider.riderStatus !== 'active') {
      return res.status(403).json({
        message: 'Your account is pending verification and cannot go online yet.',
        riderStatus: rider.riderStatus,
      });
    }

    rider.isOnline = isOnline;
    await rider.save();

    res.json({
      success: true,
      message: isOnline ? 'You are now Online and can receive rides' : 'You are now Offline',
      isOnline: rider.isOnline,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update online status', error: err.message });
  }
});

// ─── PUT /api/rider/location ────────────────────────────────────────────────
// Update current location
router.put('/location', protect, validate(riderLocationSchema), async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await RiderProfile.findOneAndUpdate(
      { userId: req.user._id },
      {
        'currentLocation.lat': lat,
        'currentLocation.lng': lng,
        'currentLocation.coordinates': [lng, lat],
        'currentLocation.updatedAt': new Date(),
      }
    );

    res.json({ success: true, lat, lng });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update location', error: err.message });
  }
});

// ─── GET /api/rider/earnings ────────────────────────────────────────────────
// Earnings overview
router.get('/earnings', protect, async (req, res) => {
  try {
    const rider = await RiderProfile.findOne({ userId: req.user._id });
    if (!rider) return res.status(404).json({ message: 'Rider profile not found' });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [todayRides, monthRides, completedRidesCount] = await Promise.all([
      RideBooking.find({
        riderId: req.user._id,
        status: 'completed',
        completedAt: { $gte: todayStart },
      }).lean(),
      RideBooking.find({
        riderId: req.user._id,
        status: 'completed',
        completedAt: { $gte: monthStart },
      }).lean(),
      RideBooking.countDocuments({
        riderId: req.user._id,
        status: 'completed',
      }),
    ]);

    const todayTotal = todayRides.reduce((s, r) => s + (r.fare?.total || 0), 0);
    const monthTotal = monthRides.reduce((s, r) => s + (r.fare?.total || 0), 0);

    const todayNet = Math.round(todayTotal * 0.9);
    const monthNet = Math.round(monthTotal * 0.9);
    const platformCommissionMonth = Math.round(monthTotal * 0.1);

    res.json({
      totalEarnings: rider.totalEarnings || 0,
      walletBalance: rider.walletBalance || rider.totalEarnings || 0,
      todayRides: todayRides.length,
      todayNet,
      monthRides: monthRides.length,
      monthNet,
      platformCommissionMonth,
      totalCompletedRides: completedRidesCount,
      rating: rider.rating || { avg: 5.0, count: 0 },
      bankDetails: rider.bankDetails,
    });
  } catch (err) {
    logger.error(`Get rider earnings error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch earnings', error: err.message });
  }
});

// ─── POST /api/rider/withdraw-demo ──────────────────────────────────────────
// Simulate payout/withdrawal
router.post('/withdraw-demo', protect, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const rider = await RiderProfile.findOne({ userId: req.user._id });

    if (!rider) return res.status(404).json({ message: 'Rider profile not found' });
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Enter a valid withdrawal amount' });

    const balance = rider.walletBalance || rider.totalEarnings || 0;
    if (amount > balance) {
      return res.status(400).json({ message: `Insufficient balance. Available: ₹${balance}` });
    }

    rider.walletBalance = Math.max(0, balance - amount);
    await rider.save();

    res.json({
      success: true,
      message: `Demo withdrawal of ₹${amount} initiated to ${rider.bankDetails?.upiId || rider.bankDetails?.accountNumber || 'Bank'}. Ref: DEMO-PAYOUT-${Math.floor(100000 + Math.random() * 900000)}`,
      newBalance: rider.walletBalance,
    });
  } catch (err) {
    res.status(500).json({ message: 'Withdrawal failed', error: err.message });
  }
});

export default router;
