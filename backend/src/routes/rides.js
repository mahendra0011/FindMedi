import express from 'express';
import { sendServerError } from '../utils/safeError.js';
import RideBooking from '../models/RideBooking.js';
import RiderProfile from '../models/RiderProfile.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect, optionalProtect, authorize } from '../middleware/auth.js';
import { bookingLimiter } from '../middleware/rateLimit.js';
import { idempotencyGuard } from '../middleware/idempotency.js';
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
import TransactionLedger from '../models/TransactionLedger.js';
import { mirrorLedgerEntry } from '../lib/pgDualWrite.js';
import { recordServiceSettlement } from '../services/ledgerService.js';
import { loyaltyService } from '../services/loyaltyService.js';
import { executeWithOutbox } from '../lib/transactionalOutbox.js';
import { latLngToCell } from 'h3-js';
import { claimProvider, releaseProviderClaim } from '../services/instantDispatchService.js';
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
    sendServerError(res, err, 'Failed to calculate ride estimate');
  }
});

/**
 * RIDE-B-07: is this booking entitled to emergency pricing?
 *
 * @returns {Promise<false | { isEmergency: true, sosId: string } | null>}
 *          `null` means a response has already been written.
 *
 * The rules:
 *   - no `sosId`  -> plain booking (`false`)
 *   - `sosId`     -> the SOS record must exist, still be active, and name the
 *                    caller as its subject. Anything else is refused, because the
 *                    emergency tariff AND the dispatch priority must both be
 *                    earned by a real incident.
 */
async function resolveVerifiedEmergency(req, sosId, res) {
  if (!sosId) return false;
  if (req.user.role === 'superadmin') return { isEmergency: true, sosId: String(sosId) };

  const { default: EmergencyRequest } = await import('../models/EmergencyRequest.js');
  const sos = await EmergencyRequest.findById(sosId).catch(() => null);
  if (!sos) {
    res.status(400).json({ message: 'Emergency booking requires a valid sosId' });
    return null;
  }

  const ACTIVE_STATES = new Set(['pending', 'dispatching', 'dispatched', 'en_route', 'arrived', 'in_progress']);
  if (!ACTIVE_STATES.has(String(sos.status).toLowerCase())) {
    res.status(409).json({ message: `SOS is ${sos.status} and no longer eligible for emergency pricing` });
    return null;
  }

  // The caller must be the person the SOS was raised for. Without this, one
  // patient's SOS unlocked another patient's emergency dispatch.
  const subjects = new Set(
    [sos.userId, sos.patientId, sos.requesterId].filter(Boolean).map((v) => String(
      typeof v === 'object' ? (v._id ?? v.id) : v
    ))
  );
  const me = String(req.user._id ?? req.user.id ?? '');
  if (subjects.size > 0 && !subjects.has(me)) {
    res.status(403).json({ message: 'This SOS does not belong to you' });
    return null;
  }

  return { isEmergency: true, sosId: String(sosId) };
}

// ─── POST /api/ride/book ────────────────────────────────────────────────────
// Book a new vehicle
router.post('/book', protect, authorize('ride:write', 'ride:write:own'), validate(bookRideSchema), bookingLimiter, async (req, res) => {
  try {
    const { pickup, drop, vehicleType, sosId } = req.body;

    // ── RIDE-B-07: `isEmergency` is NOT a client assertion ──
    // It used to be read straight from the body and fed `calculateFare(...,
    // isEmergency)` plus the dispatch priority, so anyone could buy the emergency
    // tariff and jump the queue with no incident behind it. Emergency pricing is
    // now granted only when the caller is the SUBJECT of a real, still-active SOS.
    const emergency = await resolveVerifiedEmergency(req, sosId, res);
    if (emergency === null) return undefined; // response already written
    const isEmergency = emergency === false ? false : emergency.isEmergency;

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

    const ride = await executeWithOutbox(
      async (session) => {
        const [created] = await RideBooking.create([
          {
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
          },
        ], { session });
        return created;
      },
      [
        {
          aggregateType: 'RideBooking',
          aggregateId: (createdRide) => createdRide._id,
          eventType: 'RideBookingCreated.v1',
          destinationTopic: 'findmedi.dispatch.booking-events.v1',
          payload: (createdRide) => ({
            bookingId: String(createdRide._id),
            vertical: 'ride',
            h3_cell: latLngToCell(Number(pickup.lat), Number(pickup.lng), 8),
            event_time: new Date().toISOString(),
            vehicleType,
            isEmergency: !!isEmergency,
            pickup,
            drop,
            distanceKm,
            estimatedFare: fare?.total || 0,
          }),
        },
      ]
    );

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
    sendServerError(res, err, 'Failed to create ride booking');
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
    sendServerError(res, err, 'Failed to fetch active ride');
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
    sendServerError(res, err, 'Failed to fetch ride history');
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
    sendServerError(res, err, 'Failed to fetch rider history');
  }
});

// ─── GET /api/ride/:id ──────────────────────────────────────────────────────
// Get ride details
router.get('/:id', protect, authorize('ride:read', 'ride:read:own'), async (req, res) => {
  try {
    const ride = await RideBooking.findById(req.params.id)
      .populate('userId', 'name phone avatar email')
      .populate('riderId', 'name phone avatar')
      .populate('vehicleId')
      .lean();

    if (!ride) {
      return res.status(404).json({ message: 'Ride booking not found' });
    }

    const isOwner = ride.userId?.toString() === req.user._id.toString() || ride.riderId?.toString() === req.user._id.toString();
    // RIDE-B-09: platform superadmin only. `hospital_admin` was treated as an
    // admin for rides they have no relationship with, exposing another
    // patient's pickup/drop address, phone numbers and fare.
    const isAdmin = req.user.role === 'superadmin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this ride' });
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
    sendServerError(res, err, 'Failed to fetch ride details');
  }
});

// ─── POST /api/ride/:id/accept ──────────────────────────────────────────────
// Rider accepts a ride booking (Atomic update)
router.post('/:id/accept', protect, authorize('ride:write'), idempotencyGuard(), async (req, res) => {
  let providerClaimed = false;
  let acceptedRideId = null;
  try {
    if (req.user.role !== 'rider') {
      return res.status(403).json({ message: 'Only registered riders can accept rides' });
    }

    const riderProfile = await RiderProfile.findOne({ userId: req.user._id });
    if (!riderProfile || riderProfile.riderStatus !== 'active') {
      return res.status(403).json({ message: 'Your rider account is not active or verified' });
    }

    if (!await claimProvider('rider', req.user._id, req.params.id)) {
      return res.status(409).json({ message: 'Your account is already assigned to another active dispatch' });
    }
    providerClaimed = true;

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
      await releaseProviderClaim('rider', req.user._id, req.params.id);
      providerClaimed = false;
      return res.status(400).json({ message: 'This ride has already been accepted or is no longer available' });
    }
    acceptedRideId = ride._id;

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
    if (providerClaimed) {
      const rideWasAssigned = acceptedRideId || await RideBooking.exists({
        _id: req.params.id,
        riderId: req.user._id,
        status: { $in: ['accepted', 'rider_arriving', 'arrived', 'in_progress'] },
      }).catch(() => false);
      if (!rideWasAssigned) {
        await releaseProviderClaim('rider', req.user._id, req.params.id).catch((releaseError) => {
          logger.error(`Ride accept claim release failed: ${releaseError.message}`);
        });
      }
    }
    logger.error(`Ride accept error: ${err.message}`);
    sendServerError(res, err, 'Failed to accept ride');
  }
});

// ─── POST /api/ride/:id/arrived ─────────────────────────────────────────────
// Rider marks arrived at pickup location (with geofence validation)
router.post('/:id/arrived', protect, authorize('ride:write'), idempotencyGuard({ prefix: 'ride-arrived', failClosed: true }), async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const existingRide = await RideBooking.findOne({
      _id: req.params.id,
      riderId: req.user._id,
      status: { $in: ['accepted', 'rider_arriving'] },
    });

    if (!existingRide) {
      return res.status(400).json({ message: 'Unable to update status to arrived or unauthorized' });
    }

    // Spec 05: Strict 150m geofence validation before driver can mark arrived
    if (lat != null && lng != null && existingRide.pickup?.lat != null) {
      const distanceToPickup = calculateDistanceKm(lat, lng, existingRide.pickup.lat, existingRide.pickup.lng);
      if (distanceToPickup > 0.15) { // 150 meters strict limit (Spec 05)
        return res.status(400).json({
          message: `You are too far from the pickup location (${Math.round(distanceToPickup * 1000)}m away). You must be within 150m to mark arrived.`,
        });
      }
    }

    const ride = await RideBooking.findOneAndUpdate(
      { _id: req.params.id, riderId: req.user._id, status: { $in: ['accepted', 'rider_arriving'] } },
      {
        status: 'arrived',
        arrivedAt: new Date(),
        $push: { statusHistory: { status: 'arrived', at: new Date(), note: 'Driver arrived at pickup' } },
      },
      { new: true }
    ).populate('userId', 'name phone avatar');

    notifyRideUpdate(ride, 'ride_status_update');

    await Notification.create({
      userId: String(ride.userId._id || ride.userId),
      title: '📍 Driver Arrived!',
      message: `Your driver has arrived! Share your 4-digit OTP [${ride.pickupOtp || '----'}] with the driver to start the ride.`,
      type: 'ride',
    }).catch(() => {});

    res.json({ success: true, ride });
  } catch (err) {
    sendServerError(res, err, 'Failed to update ride status');
  }
});

// ─── POST /api/ride/:id/start ───────────────────────────────────────────────
// Rider starts the ride (requires 4-digit pickup OTP verification)
router.post('/:id/start', protect, authorize('ride:write'), idempotencyGuard({ prefix: 'ride-start', failClosed: true }), async (req, res) => {
  try {
    const { otp } = req.body;
    const existingRide = await RideBooking.findOne({
      _id: req.params.id,
      riderId: req.user._id,
      status: { $in: ['accepted', 'arrived'] },
    });

    if (!existingRide) {
      return res.status(400).json({ message: 'Ride not found or already started' });
    }

    // Enforce 4-digit pickup OTP verification
    if (existingRide.pickupOtp && String(existingRide.pickupOtp) !== String(otp).trim()) {
      return res.status(400).json({
        message: 'Invalid 4-digit pickup OTP. Please ask the passenger for the correct code displayed on their screen.',
      });
    }

    const ride = await RideBooking.findOneAndUpdate(
      { _id: req.params.id, riderId: req.user._id, status: { $in: ['accepted', 'arrived'] } },
      {
        status: 'in_progress',
        startedAt: new Date(),
        $push: { statusHistory: { status: 'in_progress', at: new Date(), note: 'Trip started after OTP verification' } },
      },
      { new: true }
    );

    notifyRideUpdate(ride, 'ride_status_update');

    res.json({ success: true, ride });
  } catch (err) {
    sendServerError(res, err, 'Failed to start ride');
  }
});

// ─── POST /api/ride/:id/complete ────────────────────────────────────────────
// Rider completes the ride
// RIDE-B-03: completion moves MONEY (ledger settlement, provider wallet, loyalty
// points, receipt). A retry, a socket re-emit or a double tap re-ran the whole
// handler, so the settlement could be written twice. The replay guard makes the
// call exactly-once, and the status predicate below is a compare-and-set: only
// a ride still in_progress can complete, so a second call matches nothing.
router.post('/:id/complete', protect, authorize('ride:write'), idempotencyGuard({ prefix: 'ride-complete', failClosed: true }), async (req, res) => {
  try {
    let settlementResult;
    const rideEventPayload = {};
    const ride = await executeWithOutbox(async (session) => {
      const completedRide = await RideBooking.findOneAndUpdate(
        { _id: req.params.id, riderId: req.user._id, status: 'in_progress' },
        {
          status: 'completed',
          completedAt: new Date(),
          $push: { statusHistory: { status: 'completed', at: new Date(), note: 'Trip completed' } },
        },
        { new: true, session }
      ).populate('userId', 'name phone avatar');

      if (!completedRide) {
        const err = new Error('Unable to complete ride');
        err.statusCode = 409;
        throw err;
      }

      settlementResult = await recordServiceSettlement({
        source: 'ride',
        sourceId: completedRide._id,
        bookingNumber: completedRide.bookingNumber,
        userId: completedRide.userId?._id || completedRide.userId,
        providerId: req.user._id,
        patientName: completedRide.userId?.name || 'Passenger',
        totalAmount: completedRide.fare?.total || 0,
        customCommissionPercent: 10,
        session,
      });
      Object.assign(rideEventPayload, {
        bookingNumber: completedRide.bookingNumber,
        rideId: String(completedRide._id),
        userId: String(completedRide.userId?._id || completedRide.userId),
        riderId: String(req.user._id),
        fare: completedRide.fare?.total || 0,
        completedAt: completedRide.completedAt,
      });
      return completedRide;
    }, [
      {
        aggregateType: 'RideBooking',
        aggregateId: req.params.id,
        eventType: 'RideCompleted.v1',
        destinationTopic: 'findmedi.dispatch.booking-events.v1',
        payload: rideEventPayload,
      },
    ]);

    await releaseProviderClaim('rider', req.user._id, ride._id);

    // PostgreSQL is a separate system and cannot join Mongo's transaction.
    // Mirror only after Mongo has committed; its consumer must be idempotent.
    if (settlementResult?.ledgerId) {
      const ledgerRecord = await TransactionLedger.findById(settlementResult.ledgerId).lean();
      if (ledgerRecord) {
        void mirrorLedgerEntry(ledgerRecord).catch((mirrorErr) => {
          logger.error(`Ride ledger PostgreSQL mirror failed: ${mirrorErr.message}`);
        });
      }
    }

    // Award passenger loyalty points for completed trip
    const passengerId = ride.userId?._id || ride.userId;
    if (passengerId) {
      loyaltyService.earnPoints(passengerId, 'ride_completed', ride._id)
        .catch(e => logger.warn(`Ride loyalty points award warning: ${e.message}`));
    }

    notifyRideUpdate(ride, 'ride_status_update');

    await Notification.create({
      userId: String(ride.userId._id || ride.userId),
      title: '✅ Ride Completed!',
      message: `Your ride is completed. Total fare: ₹${ride.fare?.total || 0}. Please complete payment & rate your driver.`,
      type: 'ride',
    }).catch(() => {});

    res.json({ success: true, ride });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ message: 'Ride cannot be completed in its current state' });
    }
    sendServerError(res, err, 'Failed to complete ride');
  }
});

// ─── POST /api/ride/:id/cancel ──────────────────────────────────────────────
// Cancel a ride (User or Rider)
router.post('/:id/cancel', protect, authorize('ride:write', 'ride:write:own'), idempotencyGuard(), async (req, res) => {
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

    // RIDE-B-10: ownership is mandatory. `authorize('ride:write')` is granted to
    // riders, patients, ambulance staff and more, so without this check ANY
    // holder of the permission could cancel somebody else's ride.
    const isRideOwner = ride.userId?.toString() === req.user._id.toString();
    const isAssignedRider = ride.riderId?.toString() === req.user._id.toString();
    if (!isRideOwner && !isAssignedRider && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to cancel this ride' });
    }

    if (ride.status === 'in_progress' && !isRider) {
      return res.status(400).json({ message: 'Cannot cancel a ride that is already in progress' });
    }

    if (isRider && isAssignedRider) {
      // If rider cancels before start, ride can return to searching once
      ride.status = 'searching';
      ride.riderId = null;
      ride.vehicleId = null;
      ride.cancellationReason = reason;
      ride.cancelledBy = 'rider';
      ride.statusHistory.push({ status: 'cancelled_by_rider', at: new Date(), note: reason });
      await ride.save();
      await releaseProviderClaim('rider', req.user._id, ride._id);

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
      if (ride.riderId) await releaseProviderClaim('rider', ride.riderId, ride._id);

      // LOYAL-M-02: a cancelled booking gives its points back. Fail-soft,
      // idempotent, and a no-op unless this ride actually earned (points are
      // only awarded on completion, and completed rides cannot be cancelled
      // here — this is the safety net for any other earn path).
      const passengerId = ride.userId?._id || ride.userId;
      if (passengerId) {
        void loyaltyService.reversePoints(passengerId, 'ride_completed', ride._id)
          .catch((revErr) => logger.warn(`Ride loyalty reversal warning: ${revErr.message}`));
      }

      notifyRideUpdate(ride, 'ride_status_update');

      return res.json({ success: true, message: 'Ride cancelled successfully', ride });
    }
  } catch (err) {
    logger.error(`Ride cancellation error: ${err.message}`);
    sendServerError(res, err, 'Failed to cancel ride');
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

    // RIDE-B-10 (rate): only the rider can rate the rider, only the passenger can
    // rate the trip — otherwise anyone could poison a rider's average rating.
    const isAssignedRider = ride.riderId?.toString() === req.user._id.toString();
    const isPassenger = ride.userId?.toString() === req.user._id.toString();
    if (isRider && !isAssignedRider) {
      return res.status(403).json({ message: 'Not authorized to rate this ride' });
    }
    if (!isRider && !isPassenger && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to rate this ride' });
    }

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
    sendServerError(res, err, 'Failed to submit rating');
  }
});

// ─── GET /api/ride/:id/receipt ──────────────────────────────────────────────
// Download PDF receipt
router.get('/:id/receipt', protect, authorize('ride:read', 'ride:read:own'), async (req, res) => {
  try {
    const ride = await RideBooking.findById(req.params.id)
      .populate('userId', 'name phone email')
      .populate('riderId', 'name phone')
      .populate('vehicleId');

    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const isOwner = ride.userId?.toString() === req.user._id.toString() || ride.riderId?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'superadmin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this receipt' });
    }

    const pdfBuffer = await generateRideReceiptPdf(ride, ride.userId, ride.riderId, ride.vehicleId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Ride-Receipt-${ride.bookingNumber || ride._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    logger.error(`Receipt generation error: ${err.message}`);
    sendServerError(res, err, 'Failed to generate PDF receipt');
  }
});

// ─── GET /api/ride/:id/thermal-receipt ──────────────────────────────────────
// Stream raw ESC/POS bytes for 80mm Bluetooth mobile thermal printers
router.get('/:id/thermal-receipt', protect, authorize('ride:read', 'ride:read:own'), async (req, res) => {
  try {
    const { generateEscPosReceiptBytes } = await import('../services/rideReceiptService.js');
    const ride = await RideBooking.findById(req.params.id)
      .populate('userId', 'name phone email')
      .populate('riderId', 'name phone')
      .populate('vehicleId');

    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const isOwner = ride.userId?.toString() === req.user._id.toString() || ride.riderId?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'superadmin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this receipt' });
    }

    const rawBytes = generateEscPosReceiptBytes(ride, ride.userId, ride.riderId, ride.vehicleId);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="thermal-receipt-${ride.bookingNumber || ride._id}.bin"`);
    res.send(rawBytes);
  } catch (err) {
    logger.error(`Thermal receipt generation error: ${err.message}`);
    sendServerError(res, err, 'Failed to generate thermal receipt');
  }
});

// ─── GET /api/ride/:id/payout-statement ──────────────────────────────────────
// Driver earnings & payout statement (PAY-R-02)
router.get('/:id/payout-statement', protect, authorize('ride:read', 'ride:read:own'), async (req, res) => {
  try {
    const ride = await RideBooking.findById(req.params.id)
      .populate('userId', 'name phone email')
      .populate('riderId', 'name phone')
      .populate('vehicleId');

    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const isOwner = ride.userId?.toString() === req.user._id.toString() || ride.riderId?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'superadmin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this payout statement' });
    }

    const ledgerEntry = await TransactionLedger.findOne({ source: 'ride', sourceId: String(ride._id), entryType: 'CREDIT', status: 'completed' })
      .select('amount commissionPercent commissionAmount taxAmount netAmount status')
      .lean();
    if (!ledgerEntry && ride.status === 'completed') {
      return res.status(409).json({ message: 'Settlement is being reconciled' });
    }
    const totalAmount = ledgerEntry?.amount ?? ride.fare?.total ?? 0;
    const isAssignedRider = String(ride.riderId?._id || ride.riderId) === String(req.user._id);

    const statement = {
      rideId: ride._id,
      bookingNumber: ride.bookingNumber,
      passengerId: ride.userId?._id,
      riderId: ride.riderId?._id,
      vehicleType: ride.vehicleType,
      isEmergency: ride.isEmergency,
      pickup: ride.pickup,
      drop: ride.drop,
      distanceKm: ride.distanceKm,
      fareBreakdown: ride.fare || {
        base: 0,
        distanceCharge: 0,
        toll: 0,
        parking: 0,
        surge: 0,
        total: totalAmount,
      },
      totalAmount,
      commissionPercent: ledgerEntry?.commissionPercent ?? null,
      commissionAmount: ledgerEntry?.commissionAmount ?? null,
      taxAmount: ledgerEntry?.taxAmount ?? null,
      netAmount: ledgerEntry?.netAmount ?? null,
      platformShare: ledgerEntry?.commissionAmount ?? null,
      driverNet: ledgerEntry?.netAmount ?? null,
      settlementStatus: ledgerEntry?.status ?? 'pending',
      ledgerEntryId: ledgerEntry?._id,
      generatedAt: new Date(),
    };

    const response = {
      success: true,
      payoutStatement: statement,
    };
    if (isAssignedRider) {
      const riderProfile = await RiderProfile.findOne({ userId: ride.riderId?._id || ride.riderId })
        .select('totalEarnings walletBalance commissionEarned')
        .lean();
      response.driverEarningsSummary = riderProfile ? {
        totalEarnings: riderProfile.totalEarnings || 0,
        walletBalance: riderProfile.walletBalance || 0,
        commissionEarned: riderProfile.commissionEarned || 0,
      } : null;
    }
    res.json(response);
  } catch (err) {
    logger.error(`Ride payout statement error: ${err.message}`);
    sendServerError(res, err, 'Failed to generate payout statement');
  }
});

// ─── GET /api/ride/driver/earnings ──────────────────────────────────────────
// Driver daily/weekly earnings summary with adjustments and deductions (PAY-R-04)
router.get('/driver/earnings', protect, authorize('ride:read', 'ride:read:own'), async (req, res) => {
  try {
    if (req.user.role !== 'rider') return res.status(403).json({ message: 'Rider access required' });
    const { period = 'week', startDate, endDate } = req.query;
    if (!['day', 'week', 'month'].includes(period)) {
      return res.status(400).json({ message: 'period must be day, week, or month' });
    }

    // Determine date range
    const end = new Date(endDate || Date.now());
    const start = new Date(startDate || end.getTime() - 7 * 86400000);
    if (!Number.isFinite(end.getTime()) || !Number.isFinite(start.getTime()) || start >= end) {
      return res.status(400).json({ message: 'Invalid earnings date range' });
    }

    // Clamp period
    let queryStart, queryEnd;
    if (period === 'day') {
      queryStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
      queryEnd = new Date(queryStart.getTime() + 86400000);
    } else if (period === 'week') {
      const day = start.getUTCDay();
      const daysSinceMonday = (day + 6) % 7;
      queryStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() - daysSinceMonday));
      queryEnd = new Date(queryStart.getTime() + 7 * 86400000);
    } else if (period === 'month') {
      queryStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
      queryEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    }
    if (queryEnd - queryStart > 366 * 86400000) {
      return res.status(400).json({ message: 'Earnings range cannot exceed 366 days' });
    }

    // Find rides completed in this period for this user
    const entries = await TransactionLedger.find({
      source: 'ride',
      providerId: req.user._id,
      entryType: 'CREDIT',
      status: 'completed',
      createdAt: { $gte: queryStart, $lt: queryEnd },
    })
      .select('amount commissionAmount taxAmount netAmount createdAt')
      .lean();

    // Aggregate earnings
    const dailyTotals = {};
    let totalGross = 0;
    let totalCommission = 0;
    let totalTDS = 0;
    let totalNet = 0;

    entries.forEach((entry) => {
      const gross = entry.amount || 0;
      const commission = entry.commissionAmount || 0;
      const tax = entry.taxAmount || 0;
      const net = entry.netAmount || 0;

      totalGross += gross;
      totalCommission += commission;
      totalTDS += tax;
      totalNet += net;

      // Daily bucket
      const dayKey = entry.createdAt ? entry.createdAt.toISOString().split('T')[0] : 'unknown';
      if (!dailyTotals[dayKey]) dailyTotals[dayKey] = { gross: 0, commission: 0, tax: 0, net: 0 };
      dailyTotals[dayKey].gross += gross;
      dailyTotals[dayKey].commission += commission;
      dailyTotals[dayKey].tax += tax;
      dailyTotals[dayKey].net += net;
    });

    // Sort daily totals by date
    const sortedDaily = Object.entries(dailyTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        gross: values.gross,
        commission: values.commission,
        tax: values.tax,
        net: values.net,
      }));

    const summary = {
      period,
      startDate: queryStart,
      endDate: queryEnd,
      totalGross,
      totalCommission,
      totalTDS,
      totalNet,
      rideCount: entries.length,
      dailyBreakdown: sortedDaily,
      generatedAt: new Date(),
    };

    res.json({
      success: true,
      earningsSummary: summary,
    });
  } catch (err) {
    logger.error(`Driver earnings summary error: ${err.message}`);
    sendServerError(res, err, 'Failed to generate driver earnings summary');
  }
});

// ─── GET /api/ride/:id/emergency-audit-trail ────────────────────────────────
// Emergency post-incident audit trail (RIDE-M-05): records who was dispatched,
// when accepted/rejected, ETA, and status timeline for compliance/insurance.
router.get('/:id/emergency-audit-trail', protect, authorize('ride:read', 'ride:read:own'), async (req, res) => {
  try {
    const ride = await RideBooking.findById(req.params.id)
      .populate('userId', 'name phone email')
      .populate('riderId', 'name phone')
      .populate('vehicleId');

    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const isOwner = ride.userId?.toString() === req.user._id.toString() || ride.riderId?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'superadmin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this emergency audit trail' });
    }

    const auditTrail = {
      rideId: ride._id,
      bookingNumber: ride.bookingNumber,
      isEmergency: ride.isEmergency,
      passenger: {
        name: ride.userId?.name,
        phone: ride.userId?.phone,
      },
      rider: ride.riderId
        ? {
            name: ride.riderId.name,
            phone: ride.riderId.phone,
            rating: ride.riderId.rating?.avg || 4.8,
          }
        : null,
      vehicle: ride.vehicleId ? { code: ride.vehicleId.code, label: ride.vehicleId.label } : null,
      pickup: ride.pickup,
      drop: ride.drop,
      distanceKm: ride.distanceKm,
      status: ride.status,
      startedAt: ride.startedAt,
      completedAt: ride.completedAt,
      cancellationReason: ride.cancellationReason,
      dispatchAttempts: ride.dispatchAttempts?.length || 0,
      statusHistory: ride.statusHistory || [],
      generatedAt: new Date(),
    };

    res.json({
      success: true,
      emergencyAuditTrail: auditTrail,
    });
  } catch (err) {
    logger.error(`Emergency audit trail error: ${err.message}`);
    sendServerError(res, err, 'Failed to generate emergency audit trail');
  }
});

export default router;
