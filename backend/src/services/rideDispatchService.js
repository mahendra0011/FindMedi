import { startInstantDispatch, handleInstantAccept, handleInstantReject } from './instantDispatchService.js';
import RideBooking from '../models/RideBooking.js';
import { findEligibleRiders } from './rideService.js';

// File 06 §8 — env-configurable instant ride radii (generic wave engine).
const RADII = (process.env.INSTANT_RIDE_RADII || '3,6,10').split(',').map(Number);

const config = {
  type: 'ride',
  Model: RideBooking,
  providerType: 'rider',
  radiiKm: RADII,
  async findEligibleProvidersFallback(lng, lat, radiusKm, excludeIds, request) {
    const vehicleType = request?.vehicleType || 'car';
    const isEmergency = Boolean(request?.isEmergency);
    const riders = await findEligibleRiders(vehicleType, lat, lng, isEmergency, radiusKm);
    const excludeSet = new Set((excludeIds || []).map(String));
    return riders
      .filter((r) => !excludeSet.has(String(r.userId?._id || r.userId)))
      .map((r) => ({
        userId: r.userId?._id || r.userId,
        _id: r.userId?._id || r.userId,
        distanceKm: r.distanceKm ?? 0,
      }));
  },
  buildAlertPayload: (request, candidate) => ({
    requestId: String(request._id),
    bookingNumber: request.bookingNumber,
    vehicleType: request.vehicleType,
    isEmergency: request.isEmergency,
    pickup: request.pickup,
    drop: request.drop,
    distanceKm: request.distanceKm,
    estimatedFare: request.fare?.total || 0,
    riderDistanceKm: candidate.distanceKm,
    windowSeconds: 15,
  }),
};

export const startRideDispatch = (requestId) => startInstantDispatch(requestId, config);
export const acceptRideRequest = (requestId, providerId, user) => handleInstantAccept(requestId, providerId, user, config);
export const rejectRideRequest = (requestId, providerId) => handleInstantReject(requestId, providerId, config);
