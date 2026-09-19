import mongoose from 'mongoose';
import RideBooking from '../models/RideBooking.js';
import RiderProfile from '../models/RiderProfile.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { getIO } from './socketService.js';
import logger from '../config/logger.js';

export const VEHICLE_RATES = {
  bike: {
    code: 'bike',
    label: 'Bike',
    baseFare: 20,
    perKm: 8,
    capacity: 1,
    emergencySurge: 0,
    desc: 'Fast solo pickup, medicine delivery',
  },
  auto: {
    code: 'auto',
    label: 'Auto (3-wheeler)',
    baseFare: 30,
    perKm: 12,
    capacity: 3,
    emergencySurge: 0,
    desc: 'Short distance, budget',
  },
  e_rickshaw: {
    code: 'e_rickshaw',
    label: 'E-Rickshaw',
    baseFare: 20,
    perKm: 10,
    capacity: 4,
    emergencySurge: 0,
    desc: 'Short distance, eco-friendly',
  },
  car: {
    code: 'car',
    label: 'Car',
    baseFare: 60,
    perKm: 16,
    capacity: 4,
    emergencySurge: 0,
    desc: 'Standard patient transport',
  },
  van: {
    code: 'van',
    label: 'Van',
    baseFare: 100,
    perKm: 22,
    capacity: 7,
    emergencySurge: 0,
    desc: 'Group / luggage / stretcher-friendly',
  },
  ambulance: {
    code: 'ambulance',
    label: 'Ambulance',
    baseFare: 150,
    perKm: 30,
    capacity: 2,
    emergencySurge: 100,
    desc: 'Emergency / medical transport (priority dispatch)',
  },
};

/**
 * Calculate Great Circle distance between two lat/lng coordinates in km.
 * Multiplied by road curvature coefficient ~1.3 to realistically estimate road driving distance.
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 5;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const direct = R * c;
  // Road factor estimate
  const roadDist = direct * 1.32;
  return Math.max(0.5, Math.round(roadDist * 10) / 10);
}

/**
 * Calculate fare breakdown for a vehicle type and distance
 */
export function calculateFare(vehicleType, distanceKm, isEmergency = false) {
  const rate = VEHICLE_RATES[vehicleType] || VEHICLE_RATES.car;
  const base = rate.baseFare;
  const distanceCharge = Math.round(rate.perKm * distanceKm);
  const surge = isEmergency && vehicleType === 'ambulance' ? rate.emergencySurge : 0;
  const total = base + distanceCharge + surge;

  return {
    base,
    distanceCharge,
    surge,
    total,
  };
}

/**
 * Estimate travel time in minutes based on distance
 */
export function estimateDurationMin(distanceKm, vehicleType) {
  const speedKmh = vehicleType === 'bike' ? 35 : vehicleType === 'ambulance' ? 45 : 30;
  const hours = distanceKm / speedKmh;
  const mins = Math.round(hours * 60) + 3; // +3 min buffer
  return Math.max(4, mins);
}

/**
 * Estimate rider arrival time (ETA) in minutes
 * Supports both estimateETA(distanceKm, vehicleType) and legacy estimateETA(pickupLat, pickupLng, vehicleType)
 */
export function estimateETA(arg1, arg2, arg3) {
  let distanceKm;
  let vehicleType;

  if (arg3 !== undefined) {
    // Called as estimateETA(pickupLat, pickupLng, vehicleType)
    // Approximate typical response distance of nearby fleet (~2.5 km)
    distanceKm = 2.5;
    vehicleType = arg3;
  } else {
    // Called as estimateETA(distanceKm, vehicleType)
    distanceKm = typeof arg1 === 'number' && !isNaN(arg1) ? arg1 : 2.5;
    vehicleType = arg2;
  }

  const speedKmh = vehicleType === 'bike' ? 35 : vehicleType === 'ambulance' ? 45 : 30;
  const hours = distanceKm / speedKmh;
  const mins = Math.round(hours * 60) + 1; // +1 min pickup reaction buffer
  return Math.max(2, mins);
}

/**
 * Generate full estimates for all vehicle types for a route
 */
export function getEstimatesForRoute(pickup, drop, isEmergency = false) {
  const distanceKm = calculateDistanceKm(pickup.lat, pickup.lng, drop.lat, drop.lng);
  const results = {};

  for (const [code, info] of Object.entries(VEHICLE_RATES)) {
    const fare = calculateFare(code, distanceKm, isEmergency);
    const durationMin = estimateDurationMin(distanceKm, code);
    const etaMin = estimateETA(pickup.lat, pickup.lng, code);

    results[code] = {
      ...info,
      distanceKm,
      durationMin,
      etaMin,
      fare,
    };
  }

  return { distanceKm, estimates: results };
}

/**
 * Find nearby online riders eligible for a ride booking,
 * sorted nearest-first using MongoDB $geoNear geospatial aggregation.
 *
 * @param {string} vehicleType
 * @param {number} pickupLat
 * @param {number} pickupLng
 * @param {boolean} isEmergency
 * @param {number|null} radiusKm - search radius in km (defaults: 15 for emergency, 5 for normal)
 */
export async function findEligibleRiders(vehicleType, pickupLat, pickupLng, isEmergency = false, radiusKm = null) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return [];
    }

    const searchRadiusKm = radiusKm ?? (isEmergency ? 15 : 5);
    const radiusInMeters = searchRadiusKm * 1000;

    const query = {
      isOnline: true,
      riderStatus: 'active',
    };

    const matchingVehicles = await Vehicle.find({ type: vehicleType }).select('_id');
    const vehicleIds = matchingVehicles.map(v => v._id);

    if (vehicleIds.length > 0) {
      query.vehicleId = { $in: vehicleIds };
    }

    // If coordinates are invalid or missing, fallback to non-geo query
    if (pickupLat == null || pickupLng == null || isNaN(Number(pickupLat)) || isNaN(Number(pickupLng))) {
      logger.warn(`findEligibleRiders: Invalid coordinates (${pickupLat}, ${pickupLng}), falling back to non-geo query`);
      const riders = await RiderProfile.find(query)
        .populate('userId', 'name phone email avatar')
        .populate('vehicleId')
        .lean();
      return riders.map(r => ({ ...r, distanceKm: 0 }));
    }

    // $geoNear must be the first stage in an aggregation pipeline.
    // It automatically sorts results by distance ascending (nearest first).
    const riders = await RiderProfile.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [Number(pickupLng), Number(pickupLat)],
          },
          key: 'currentLocation.coordinates',
          distanceField: 'distanceMeters',
          maxDistance: radiusInMeters,
          spherical: true,
          query,
        },
      },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userId',
        },
      },
      { $unwind: { path: '$userId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicleId',
          foreignField: '_id',
          as: 'vehicleId',
        },
      },
      { $unwind: { path: '$vehicleId', preserveNullAndEmptyArrays: true } },
    ]);

    return riders.map(r => ({
      ...r,
      distanceKm: Math.round(((r.distanceMeters || 0) / 1000) * 10) / 10,
    }));
  } catch (err) {
    logger.error(`findEligibleRiders $geoNear error: ${err.message}`);
    // Resilient fallback if geo index is building or query error occurs
    try {
      const fallbackQuery = { isOnline: true, riderStatus: 'active' };
      const matchingVehicles = await Vehicle.find({ type: vehicleType }).select('_id');
      if (matchingVehicles.length > 0) {
        fallbackQuery.vehicleId = { $in: matchingVehicles.map(v => v._id) };
      }
      const riders = await RiderProfile.find(fallbackQuery)
        .populate('userId', 'name phone email avatar')
        .populate('vehicleId')
        .lean();
      return riders.map(r => ({ ...r, distanceKm: 0 }));
    } catch {
      return [];
    }
  }
}

/**
 * Broadcast ride request to nearby online riders via Socket.IO
 */
export async function broadcastRideBooking(ride) {
  const io = getIO();
  if (!io) return;

  const { vehicleType, pickup, drop, fare, distanceKm, isEmergency, _id, bookingNumber } = ride;
  const eligibleRiders = await findEligibleRiders(vehicleType, pickup.lat, pickup.lng, isEmergency);

  if (!eligibleRiders || eligibleRiders.length === 0) {
    logger.warn(`No eligible riders found within radius for ride ${bookingNumber}`);
    return;
  }

  const requestPayload = {
    rideId: String(_id),
    bookingNumber,
    vehicleType,
    isEmergency,
    pickup,
    drop,
    distanceKm,
    estimatedFare: fare?.total || 0,
    durationMin: ride.durationMin,
    createdAt: ride.createdAt,
  };

  eligibleRiders.forEach((rider, index) => {
    const riderUserId = rider.userId?._id || rider.userId;
    if (riderUserId) {
      const payload = {
        ...requestPayload,
        riderDistanceKm: rider.distanceKm,
        priorityRank: index + 1,
      };
      io.to(`user:${riderUserId}`).emit('new_ride_request', payload);
      io.of('/ride').to(`rider:${riderUserId}`).emit('new_ride_request', payload);
    }
  });

  logger.info(`Broadcasted ride ${bookingNumber} to ${eligibleRiders.length} online riders within radius, nearest first`);
}

const DISPATCH_TIMEOUT_MS = 15000; // 15s per batch for standard rides
const EMERGENCY_TIMEOUT_MS = 10000; // 10s per batch for urgent ambulance rides
const STANDARD_RADIUS_STEPS = [5, 10, 20, 40]; // escalation tiers in km
const EMERGENCY_RADIUS_STEPS = [15, 30, 50]; // escalation tiers for emergency

/**
 * Sequential / tiered dispatch with expanding radius escalation
 */
export async function dispatchSequentially(rideId) {
  try {
    const ride = await RideBooking.findById(rideId);
    if (!ride || ride.status !== 'searching') return;

    const radiusSteps = ride.isEmergency ? EMERGENCY_RADIUS_STEPS : STANDARD_RADIUS_STEPS;
    const batchSize = ride.isEmergency ? 3 : 1;
    const timeoutMs = ride.isEmergency ? EMERGENCY_TIMEOUT_MS : DISPATCH_TIMEOUT_MS;

    for (const radiusKm of radiusSteps) {
      const currentRide = await RideBooking.findById(rideId);
      if (!currentRide || currentRide.status !== 'searching') return;

      const riders = await findEligibleRiders(
        currentRide.vehicleType,
        currentRide.pickup.lat,
        currentRide.pickup.lng,
        currentRide.isEmergency,
        radiusKm
      );

      const alreadyTried = new Set((currentRide.dispatchAttempts || []).map(a => String(a.riderId)));
      const freshRiders = riders.filter(r => {
        const id = String(r.userId?._id || r.userId);
        return !alreadyTried.has(id);
      });

      if (freshRiders.length === 0) {
        continue;
      }

      const batch = freshRiders.slice(0, batchSize);
      await notifyBatchAndWait(currentRide, batch, timeoutMs);

      const checkAfter = await RideBooking.findById(rideId);
      if (!checkAfter || checkAfter.status !== 'searching') return;

      await RideBooking.findByIdAndUpdate(rideId, { currentDispatchRadius: radiusKm });
    }

    // All radius tiers exhausted without acceptance
    const finalCheck = await RideBooking.findById(rideId);
    if (finalCheck && finalCheck.status === 'searching') {
      finalCheck.status = 'no_riders_found';
      finalCheck.statusHistory.push({
        status: 'no_riders_found',
        at: new Date(),
        note: 'No drivers accepted within maximum dispatch radius',
      });
      await finalCheck.save();
      notifyRideUpdate(finalCheck, 'ride_status_update');
      logger.info(`Ride ${finalCheck.bookingNumber} transitioned to no_riders_found`);
    }
  } catch (err) {
    logger.error(`dispatchSequentially error: ${err.message}`);
  }
}

async function notifyBatchAndWait(ride, batch, timeoutMs) {
  const io = getIO();
  const requestPayload = {
    rideId: String(ride._id),
    bookingNumber: ride.bookingNumber,
    vehicleType: ride.vehicleType,
    isEmergency: ride.isEmergency,
    pickup: ride.pickup,
    drop: ride.drop,
    distanceKm: ride.distanceKm,
    estimatedFare: ride.fare?.total || 0,
    durationMin: ride.durationMin,
    createdAt: ride.createdAt,
  };

  if (io) {
    batch.forEach((rider, idx) => {
      const riderUserId = rider.userId?._id || rider.userId;
      if (riderUserId) {
        const payload = {
          ...requestPayload,
          riderDistanceKm: rider.distanceKm,
          priorityRank: idx + 1,
        };
        io.to(`user:${riderUserId}`).emit('new_ride_request', payload);
        io.of('/ride').to(`rider:${riderUserId}`).emit('new_ride_request', payload);
      }
    });
  }

  // Record dispatch attempts
  const attempts = batch.map(r => ({
    riderId: r.userId?._id || r.userId,
    distanceKm: r.distanceKm,
    sentAt: new Date(),
    outcome: 'pending',
  }));

  await RideBooking.findByIdAndUpdate(ride._id, {
    $push: { dispatchAttempts: { $each: attempts } },
  });

  // Short polling check loop so we exit early as soon as ride is accepted
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const current = await RideBooking.findById(ride._id).select('status');
    if (!current || current.status !== 'searching') {
      return;
    }
  }

  // Mark pending attempts in this batch as timed out
  await RideBooking.updateOne(
    { _id: ride._id },
    {
      $set: {
        'dispatchAttempts.$[elem].outcome': 'timeout',
        'dispatchAttempts.$[elem].respondedAt': new Date(),
      },
    },
    {
      arrayFilters: [
        {
          'elem.riderId': { $in: batch.map(r => r.userId?._id || r.userId) },
          'elem.outcome': 'pending',
        },
      ],
    }
  );
}

/**
 * Notify user of ride status update
 */
export async function notifyRideUpdate(ride, event = 'ride_status_update') {
  const io = getIO();
  if (!io || !ride) return;

  const payload = {
    rideId: String(ride._id),
    status: ride.status,
    bookingNumber: ride.bookingNumber,
    pickup: ride.pickup,
    drop: ride.drop,
    fare: ride.fare,
    riderId: ride.riderId,
    vehicleId: ride.vehicleId,
    payment: ride.payment,
    timestamp: Date.now(),
  };

  // Populate rider details if present
  if (ride.riderId) {
    try {
      const riderUser = await User.findById(ride.riderId).select('name phone avatar').lean();
      const riderProfile = await RiderProfile.findOne({ userId: ride.riderId }).populate('vehicleId').lean();
      payload.rider = {
        name: riderUser?.name,
        phone: riderUser?.phone,
        avatar: riderUser?.avatar,
        rating: riderProfile?.rating?.avg || 4.8,
        vehicle: riderProfile?.vehicleId,
        currentLocation: riderProfile?.currentLocation,
      };
    } catch {}
  }

  // Emit to ride room, user room, and ride namespace
  io.to(`ride:${ride._id}`).emit(event, payload);
  io.of('/ride').to(`ride:${ride._id}`).emit(event, payload);
  if (ride.userId) {
    io.to(`user:${ride.userId}`).emit(event, payload);
  }
}
