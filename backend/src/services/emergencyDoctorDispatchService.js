import { startInstantDispatch, handleInstantAccept, handleInstantReject } from './instantDispatchService.js';
import EmergencyDoctorRequest from '../models/EmergencyDoctorRequest.js';
import Doctor from '../models/Doctor.js';
import { calculateDistanceKm } from '../lib/geoUtils.js';

const RADII = (process.env.INSTANT_DOCTOR_RADII || '10,25,50').split(',').map(Number);

const config = {
  type: 'emergency_doctor',
  Model: EmergencyDoctorRequest,
  providerType: 'doctor',
  radiiKm: RADII,
  async findEligibleProvidersFallback(lng, lat, radiusKm, excludeIds) {
    const doctors = await Doctor.find({
      emergencySupport: true,
      isEmergencyDutyActive: true,
      emergencyDoctorLocation: {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusKm / 6371],
        },
      },
      user_id: { $nin: excludeIds },
    }).select('user_id name specialization emergencyDoctorLocation emergency_fee').lean();

    return doctors.map((d) => {
      const c = d.emergencyDoctorLocation?.coordinates || [lng, lat];
      return {
        userId: d.user_id,
        _id: d.user_id,
        lat: c[1],
        lng: c[0],
        distanceKm: Math.round(calculateDistanceKm(lat, lng, c[1], c[0]) * 10) / 10,
      };
    }).filter((d) => d.distanceKm <= radiusKm);
  },
  buildAlertPayload: (request, candidate) => ({
    requestId: String(request._id),
    bookingId: request.bookingId,
    patientName: request.patientName || request.patientDetails?.name || 'Emergency Patient',
    symptomCategory: request.symptomCategory || request.emergencyCategory,
    consultationMode: request.consultationMode,
    severity: request.severity || 'Severe',
    fee: request.fee || request.pricing?.total || 800,
    distanceKm: candidate.distanceKm,
    windowSeconds: 15,
  }),
};

export const startEmergencyDoctorDispatch = (requestId) => startInstantDispatch(requestId, config);
export const acceptEmergencyDoctorRequest = (requestId, providerId, user) => handleInstantAccept(requestId, providerId, user, config);
export const rejectEmergencyDoctorRequest = (requestId, providerId) => handleInstantReject(requestId, providerId, config);
