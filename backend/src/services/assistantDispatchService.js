import { startInstantDispatch, handleInstantAccept, handleInstantReject } from './instantDispatchService.js';
import AssistantBooking from '../models/AssistantBooking.js';
import AssistantProfile from '../models/AssistantProfile.js';
import { calculateDistanceKm } from '../lib/geoUtils.js';

const RADII = (process.env.INSTANT_ASSISTANT_RADII || '2,5,10').split(',').map(Number);

const config = {
  type: 'assistant',
  Model: AssistantBooking,
  providerType: 'assistant',
  radiiKm: RADII,
  async findEligibleProvidersFallback(lng, lat, radiusKm, excludeIds) {
    // Pass 1: assistants explicitly online for urgent. Pass 2 (legacy): any
    // available assistant — toggle matters when used, never dead-ends otherwise.
    const base = {
      currentLocation: {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusKm / 6371],
        },
      },
      assistantStatus: 'active',
      isAvailable: true,
      userId: { $nin: excludeIds },
    };
    let assistants = await AssistantProfile.find({ ...base, isOnlineForUrgent: true })
      .select('userId currentLocation hospitalsCovered').lean();
    if (!assistants.length) {
      assistants = await AssistantProfile.find(base)
        .select('userId currentLocation hospitalsCovered').lean();
    }

    return assistants.map((a) => {
      const c = a.currentLocation?.coordinates || [lng, lat];
      return {
        userId: a.userId,
        _id: a.userId,
        lat: c[1],
        lng: c[0],
        distanceKm: Math.round(calculateDistanceKm(lat, lng, c[1], c[0]) * 10) / 10,
      };
    }).filter((a) => a.distanceKm <= radiusKm);
  },
  buildAlertPayload: (request, candidate) => ({
    requestId: String(request._id),
    bookingNumber: request.bookingNumber,
    hospital: request.hospital,
    taskDescription: request.taskDescription || request.serviceCategories?.join(', '),
    specialInstructions: request.specialInstructions || '',
    patientAllergies: request.patientAllergies || [],
    durationType: request.durationType,
    fee: request.cost?.total || 600,
    distanceKm: candidate.distanceKm,
    windowSeconds: 15,
  }),
};

export const startAssistantDispatch = (requestId) => startInstantDispatch(requestId, config);
export const acceptAssistantRequest = (requestId, providerId, user) => handleInstantAccept(requestId, providerId, user, config);
export const rejectAssistantRequest = (requestId, providerId) => handleInstantReject(requestId, providerId, config);
