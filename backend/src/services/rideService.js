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
 * Estimate rider arrival time (ETA)
 */
export function estimateETA(pickupLat, pickupLng, vehicleType) {
  // Typical dispatch response time between 3 and 7 mins
  return Math.floor(Math.random() * 4) + 3;
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
 * Find nearby online riders eligible for a ride booking
 */
export async function findEligibleRiders(vehicleType, pickupLat, pickupLng, isEmergency = false) {
  try {
    // Look for active & online riders
    const query = {
      isOnline: true,
      riderStatus: 'active',
    };

    // Find riders with vehicles of matching type
    const matchingVehicles = await Vehicle.find({ type: vehicleType }).select('_id');
    const vehicleIds = matchingVehicles.map(v => v._id);

    if (vehicleIds.length > 0) {
      query.vehicleId = { $in: vehicleIds };
    }

    // Emergency ambulance queries all ambulance drivers in wider region
    const riders = await RiderProfile.find(query)
      .populate('userId', 'name phone email avatar')
      .populate('vehicleId')
      .lean();

    return riders;
  } catch (err) {
    logger.error(`findEligibleRiders error: ${err.message}`);
    return [];
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

  const requestPayload = {
    rideId: String(_id),
    bookingNumber,
    vehicleType,
    isEmergency,
    pickup,
    drop,
    distanceKm,
    estimatedFare: fare.total,
    durationMin: ride.durationMin,
    createdAt: ride.createdAt,
  };

  eligibleRiders.forEach(rider => {
    if (rider.userId?._id) {
      io.to(`user:${rider.userId._id}`).emit('new_ride_request', requestPayload);
      io.of('/ride').to(`rider:${rider.userId._id}`).emit('new_ride_request', requestPayload);
    }
  });

  logger.info(`Broadcasted ride ${bookingNumber} to ${eligibleRiders.length} online riders`);
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
