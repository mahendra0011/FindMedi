import express from 'express';
import RideBooking from '../models/RideBooking.js';
import RiderProfile from '../models/RiderProfile.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect, optionalProtect } from '../middleware/auth.js';
import { validate, estimateRideSchema, bookRideSchema, rateRideSchema } from '../utils/validate.js';
import {
  getEstimatesForRoute,
  calculateFare,
  calculateDistanceKm,
  estimateDurationMin,
  broadcastRideBooking,
  dispatchSequentially,
  notifyRideUpdate,
  VEHICLE_RATES,
} from '../services/rideService.js';
import { generateRideReceiptPdf } from '../services/rideReceiptService.js';
import { getIO } from '../services/socketService.js';
import logger from '../config/logger.js';

const router = express.Router();

// ─── POST /api/ride/estimate ────────────────────────────────────────────────
// Get live fare & ETA estimates for all or specific vehicle types
router.post('/estimate', validate(estimateRideSchema), async (req, res) => {
  try {
    const { pickup, drop, vehicleType, isEmergency } = req.body;
    const { distanceKm, estimates } = getEstimatesForRoute(pickup, drop, isEmergency);

    if (vehicleType && estimates[vehicleType]) {
      return res.json({
        distanceKm,
        estimate: estimates[vehicleType],
      });
    }

    res.json({
      distanceKm,
      estimates,
    });
  } catch (err) {
    logger.error(`Ride estimate error: ${err.message}`);
    res.status(500).json({ message: 'Failed to calculate ride estimate', error: err.message });
  }
});

// ─── POST /api/ride/book ────────────────────────────────────────────────────
// Book a new vehicle
router.post('/book', protect, validate(bookRideSchema), async (req, res) => {
  try {
    const { pickup, drop, vehicleType, isEmergency = false } = req.body;

    // Check if user has an active ride in progress/searching
    const existingActive = await RideBooking.findOne({
      userId: req.user._id,
      status: { $in: ['searching', 'accepted', 'rider_arriving', 'arrived', 'in_progress'] },
    });

    if (existingActive) {
      return res.status(400).json({
        message: 'You already have an active ride request.',
        activeRideId: existingActive._id,
      });
    }

    const distanceKm = calculateDistanceKm(pickup.lat, pickup.lng, drop.lat, drop.lng);
    const fare = calculateFare(vehicleType, distanceKm, isEmergency);
    const durationMin = estimateDurationMin(distanceKm, vehicleType);

    const ride = await RideBooking.create({
      userId: req.user._id,
      vehicleType,
      isEmergency,
      pickup,
      drop,
      distanceKm,
      durationMin,
      fare,
      status: 'searching',
      statusHistory: [{ status: 'searching', at: new Date(), note: 'Booking initiated' }],
    });

    // Dispatch to eligible riders nearest-first with tiered escalation
    dispatchSequentially(ride._id).catch(err => {
      logger.warn(`Ride dispatch warning: ${err.message}`);
    });

    res.status(201).json({
      success: true,
      message: 'Searching for nearby drivers...',
      ride,
    });
  } catch (err) {
    logger.error(`Ride booking error: ${err.message}`);
    res.status(500).json({ message: 'Failed to create ride booking', error: err.message });
  }
});

// ─── GET /api/ride/active ───────────────────────────────────────────────────
// Get active ride for current logged-in user or rider
router.get('/active', optionalProtect, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ ride: null });
    }

    const query = {
      status: { $in: ['searching', 'accepted', 'rider_arriving', 'arrived', 'in_progress'] },
    };

    if (req.user.role === 'rider') {
      query.riderId = req.user._id;
    } else {
      query.userId = req.user._id;
    }

    const ride = await RideBooking.findOne(query)
      .populate('userId', 'name phone avatar')
      .populate('riderId', 'name phone avatar')
      .populate('vehicleId')
      .lean();

    if (!ride) {
      return res.json({ ride: null });
    }

    let riderDetails = null;
    if (ride.riderId?._id) {
      const riderProfile = await RiderProfile.findOne({ userId: ride.riderId._id })
        .populate('vehicleId')
        .lean();
      riderDetails = {
        name: ride.riderId.name,
        phone: ride.riderId.phone,
        avatar: ride.riderId.avatar,
        rating: riderProfile?.rating?.avg || 4.8,
        vehicle: riderProfile?.vehicleId,
        currentLocation: riderProfile?.currentLocation,
      };
    }

    res.json({
      ride: {
        ...ride,
        riderDetails,
      },
    });
  } catch (err) {
    logger.error(`Get active ride error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch active ride', error: err.message });
  }
});

// ─── GET /api/ride/my-rides ─────────────────────────────────────────────────
// User ride history
router.get('/my-rides', protect, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const query = { userId: req.user._id };

    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.vehicleType) {
      query.vehicleType = req.query.vehicleType;
    }

    const [rides, total] = await Promise.all([
      RideBooking.find(query)
        .populate('riderId', 'name phone avatar')
        .populate('vehicleId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RideBooking.countDocuments(query),
    ]);

    res.json({
      rides,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    logger.error(`Get user rides error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch ride history', error: err.message });
  }
});

// ─── GET /api/ride/rider-history ────────────────────────────────────────────
// Rider trip history
router.get('/rider-history', protect, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const query = { riderId: req.user._id };

    const [rides, total] = await Promise.all([
      RideBooking.find(query)
        .populate('userId', 'name phone avatar')
        .populate('vehicleId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RideBooking.countDocuments(query),
    ]);

    res.json({
      rides,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    logger.error(`Get rider history error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch rider history', error: err.message });
  }
});

// ─── GET /api/ride/:id ──────────────────────────────────────────────────────
// Get ride details
router.get('/:id', protect, async (req, res) => {
  try {
    const ride = await RideBooking.findById(req.params.id)
      .populate('userId', 'name phone avatar email')
      .populate('riderId', 'name phone avatar')
      .populate('vehicleId')
      .lean();

    if (!ride) {
      return res.status(404).json({ message: 'Ride booking not found' });
    }

    let riderDetails = null;
    if (ride.riderId?._id) {
      const riderProfile = await RiderProfile.findOne({ userId: ride.riderId._id })
        .populate('vehicleId')
        .lean();
      riderDetails = {
        name: ride.riderId.name,
        phone: ride.riderId.phone,
        avatar: ride.riderId.avatar,
        rating: riderProfile?.rating?.avg || 4.8,
        vehicle: riderProfile?.vehicleId,
        currentLocation: riderProfile?.currentLocation,
      };
    }

    res.json({
      ride: {
        ...ride,
        riderDetails,
      },
    });
  } catch (err) {
    logger.error(`Get ride details error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch ride details', error: err.message });
  }
});

// ─── POST /api/ride/:id/accept ──────────────────────────────────────────────
// Rider accepts a ride booking (Atomic update)
router.post('/:id/accept', protect, async (req, res) => {
  try {
    if (req.user.role !== 'rider') {
      return res.status(403).json({ message: 'Only registered riders can accept rides' });
    }

    const riderProfile = await RiderProfile.findOne({ userId: req.user._id });
    if (!riderProfile || riderProfile.riderStatus !== 'active') {
      return res.status(403).json({ message: 'Your rider account is not active or verified' });
    }

    const ride = await RideBooking.findOneAndUpdate(
      { _id: req.params.id, status: 'searching' },
      {
        status: 'accepted',
        riderId: req.user._id,
        vehicleId: riderProfile.vehicleId,
        acceptedAt: new Date(),
        $push: { statusHistory: { status: 'accepted', at: new Date(), note: 'Accepted by driver' } },
      },
      { new: true }
    )
      .populate('userId', 'name phone avatar')
      .populate('riderId', 'name phone avatar')
      .populate('vehicleId');

    if (!ride) {
      return res.status(400).json({ message: 'This ride has already been accepted or is no longer available' });
    }

    // Broadcast to other riders that ride was taken
    const io = getIO();
    if (io) {
      io.emit('ride_taken', { rideId: String(ride._id) });
      io.of('/ride').emit('ride_taken', { rideId: String(ride._id) });
    }

    // Notify user
    notifyRideUpdate(ride, 'ride_status_update');

    // In-app notification to passenger
    await Notification.create({
      userId: String(ride.userId._id || ride.userId),
      title: '🚗 Ride Accepted!',
      message: `${req.user.name} has accepted your ride request and is arriving soon.`,
      type: 'ride',
    }).catch(() => {});

    res.json({
      success: true,
      message: 'Ride accepted successfully',
      ride,
    });
  } catch (err) {
    logger.error(`Ride accept error: ${err.message}`);
    res.status(500).json({ message: 'Failed to accept ride', error: err.message });
  }
});

// ─── POST /api/ride/:id/arrived ─────────────────────────────────────────────
// Rider marks arrived at pickup location
router.post('/:id/arrived', protect, async (req, res) => {
  try {
    const ride = await RideBooking.findOneAndUpdate(
      { _id: req.params.id, riderId: req.user._id, status: { $in: ['accepted', 'rider_arriving'] } },
      {
        status: 'arrived',
        arrivedAt: new Date(),
        $push: { statusHistory: { status: 'arrived', at: new Date(), note: 'Driver arrived at pickup' } },
      },
      { new: true }
    ).populate('userId', 'name phone avatar');

    if (!ride) {
      return res.status(400).json({ message: 'Unable to update status to arrived' });
    }

    notifyRideUpdate(ride, 'ride_status_update');

    await Notification.create({
      userId: String(ride.userId._id || ride.userId),
      title: '📍 Driver Arrived!',
      message: 'Your driver has arrived at the pickup location.',
      type: 'ride',
    }).catch(() => {});

    res.json({ success: true, ride });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update ride status', error: err.message });
  }
});

// ─── POST /api/ride/:id/start ───────────────────────────────────────────────
// Rider starts the ride
router.post('/:id/start', protect, async (req, res) => {
  try {
    const ride = await RideBooking.findOneAndUpdate(
      { _id: req.params.id, riderId: req.user._id, status: { $in: ['accepted', 'arrived'] } },
      {
        status: 'in_progress',
        startedAt: new Date(),
        $push: { statusHistory: { status: 'in_progress', at: new Date(), note: 'Trip started' } },
      },
      { new: true }
    );

    if (!ride) {
      return res.status(400).json({ message: 'Unable to start ride' });
    }

    notifyRideUpdate(ride, 'ride_status_update');

    res.json({ success: true, ride });
  } catch (err) {
    res.status(500).json({ message: 'Failed to start ride', error: err.message });
  }
});

// ─── POST /api/ride/:id/complete ────────────────────────────────────────────
// Rider completes the ride
router.post('/:id/complete', protect, async (req, res) => {
  try {
    const ride = await RideBooking.findOneAndUpdate(
      { _id: req.params.id, riderId: req.user._id, status: 'in_progress' },
      {
        status: 'completed',
        completedAt: new Date(),
        $push: { statusHistory: { status: 'completed', at: new Date(), note: 'Trip completed' } },
      },
      { new: true }
    ).populate('userId', 'name phone avatar');

    if (!ride) {
      return res.status(400).json({ message: 'Unable to complete ride' });
    }

    // Credit earnings to rider (90% after 10% platform commission)
    const netEarning = Math.round((ride.fare?.total || 0) * 0.9);
    await RiderProfile.findOneAndUpdate(
      { userId: req.user._id },
      {
        $inc: {
          totalEarnings: netEarning,
          walletBalance: netEarning,
        },
      }
    ).catch(e => logger.warn(`Rider earnings credit warning: ${e.message}`));

    notifyRideUpdate(ride, 'ride_status_update');

    await Notification.create({
      userId: String(ride.userId._id || ride.userId),
      title: '✅ Ride Completed!',
      message: `Your ride is completed. Total fare: ₹${ride.fare?.total || 0}. Please complete payment & rate your driver.`,
      type: 'ride',
    }).catch(() => {});

    res.json({ success: true, ride });
  } catch (err) {
    res.status(500).json({ message: 'Failed to complete ride', error: err.message });
  }
});

// ─── POST /api/ride/:id/cancel ──────────────────────────────────────────────
// Cancel a ride (User or Rider)
router.post('/:id/cancel', protect, async (req, res) => {
  try {
    const { reason = '' } = req.body;
    const isRider = req.user.role === 'rider';

    const ride = await RideBooking.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (['completed', 'cancelled_by_user', 'cancelled_by_rider'].includes(ride.status)) {
      return res.status(400).json({ message: 'This ride has already finished or been cancelled' });
    }

    if (ride.status === 'in_progress' && !isRider) {
      return res.status(400).json({ message: 'Cannot cancel a ride that is already in progress' });
    }

    if (isRider && String(ride.riderId) === String(req.user._id)) {
      // If rider cancels before start, ride can return to searching once
      ride.status = 'searching';
      ride.riderId = null;
      ride.vehicleId = null;
      ride.cancellationReason = reason;
      ride.cancelledBy = 'rider';
      ride.statusHistory.push({ status: 'cancelled_by_rider', at: new Date(), note: reason });
      await ride.save();

      await RiderProfile.findOneAndUpdate(
        { userId: req.user._id },
        { $inc: { cancellationStrikes: 1 } }
      );

      // Re-dispatch sequentially nearest-first
      dispatchSequentially(ride._id).catch(() => {});
      notifyRideUpdate(ride, 'ride_status_update');

      return res.json({ success: true, message: 'Ride cancelled and returned to matching', ride });
    } else {
      // User cancellation
      ride.status = 'cancelled_by_user';
      ride.cancellationReason = reason;
      ride.cancelledBy = 'user';
      ride.statusHistory.push({ status: 'cancelled_by_user', at: new Date(), note: reason });
      await ride.save();

      notifyRideUpdate(ride, 'ride_status_update');

      return res.json({ success: true, message: 'Ride cancelled successfully', ride });
    }
  } catch (err) {
    logger.error(`Ride cancellation error: ${err.message}`);
    res.status(500).json({ message: 'Failed to cancel ride', error: err.message });
  }
});

// ─── POST /api/ride/:id/rate ────────────────────────────────────────────────
// Rate ride
router.post('/:id/rate', protect, validate(rateRideSchema), async (req, res) => {
  try {
    const { stars, comment = '' } = req.body;
    const isRider = req.user.role === 'rider';

    const ride = await RideBooking.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    if (isRider) {
      ride.ratingByRider = { stars, comment, createdAt: new Date() };
    } else {
      ride.ratingByUser = { stars, comment, createdAt: new Date() };

      // Update rider average rating
      if (ride.riderId) {
        const riderProfile = await RiderProfile.findOne({ userId: ride.riderId });
        if (riderProfile) {
          const count = (riderProfile.rating?.count || 0) + 1;
          const currentAvg = riderProfile.rating?.avg || 5.0;
          const newAvg = Math.round(((currentAvg * (count - 1) + stars) / count) * 10) / 10;
          riderProfile.rating = { avg: newAvg, count };
          await riderProfile.save();
        }
      }
    }

    await ride.save();

    res.json({ success: true, message: 'Rating submitted successfully', ride });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit rating', error: err.message });
  }
});

// ─── GET /api/ride/:id/receipt ──────────────────────────────────────────────
// Download PDF receipt
router.get('/:id/receipt', protect, async (req, res) => {
  try {
    const ride = await RideBooking.findById(req.params.id)
      .populate('userId', 'name phone email')
      .populate('riderId', 'name phone')
      .populate('vehicleId');

    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const pdfBuffer = await generateRideReceiptPdf(ride, ride.userId, ride.riderId, ride.vehicleId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Ride-Receipt-${ride.bookingNumber || ride._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    logger.error(`Receipt generation error: ${err.message}`);
    res.status(500).json({ message: 'Failed to generate PDF receipt', error: err.message });
  }
});

export default router;
