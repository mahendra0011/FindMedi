import { startInstantDispatch, handleInstantAccept, handleInstantReject } from './instantDispatchService.js';
import LawyerBooking from '../models/LawyerBooking.js';
import LawyerProfile from '../models/LawyerProfile.js';
import { calculateDistanceKm } from '../lib/geoUtils.js';

const RADII = (process.env.INSTANT_LAWYER_RADII || '5,10,20').split(',').map(Number);

const config = {
  type: 'lawyer',
  Model: LawyerBooking,
  providerType: 'lawyer',
  radiiKm: RADII,
  async findEligibleProvidersFallback(lng, lat, radiusKm, excludeIds) {
    // Pass 1: lawyers explicitly online for urgent. Pass 2 (legacy): any
    // available urgent-accepting lawyer — so the toggle matters when used
    // but dispatch never dead-ends while nobody toggled it on yet.
    const base = {
      currentLocation: {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusKm / 6371],
        },
      },
      lawyerStatus: 'active',
      acceptsUrgent: true,
      isAvailable: true,
      userId: { $nin: excludeIds },
    };
    let lawyers = await LawyerProfile.find({ ...base, isOnlineForUrgent: true })
      .select('userId currentLocation').lean();
    if (!lawyers.length) {
      lawyers = await LawyerProfile.find(base).select('userId currentLocation').lean();
    }

    return lawyers.map((l) => {
      const c = l.currentLocation?.coordinates || [lng, lat];
      return {
        userId: l.userId,
        _id: l.userId,
        lat: c[1],
        lng: c[0],
        distanceKm: Math.round(calculateDistanceKm(lat, lng, c[1], c[0]) * 10) / 10,
      };
    }).filter((l) => l.distanceKm <= radiusKm);
  },
  buildAlertPayload: (request, candidate) => ({
    requestId: String(request._id),
    category: request.category,
    caseDescription: request.caseDescription,
    consultationMode: request.consultationMode,
    fee: request.fee || request.budgetRange?.max || 1000,
    distanceKm: candidate.distanceKm,
    windowSeconds: 15,
  }),
};

export const startLawyerDispatch = (requestId) => startInstantDispatch(requestId, config);
export const acceptLawyerRequest = (requestId, providerId, user) => handleInstantAccept(requestId, providerId, user, config);
export const rejectLawyerRequest = (requestId, providerId) => handleInstantReject(requestId, providerId, config);
