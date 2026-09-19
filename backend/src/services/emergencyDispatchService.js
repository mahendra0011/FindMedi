import mongoose from 'mongoose';
import EmergencyRequest from '../models/EmergencyRequest.js';
import Ambulance from '../models/Ambulance.js';
import Hospital from '../models/Hospital.js';
import RiderProfile from '../models/RiderProfile.js';
import Vehicle from '../models/Vehicle.js';
import Staff from '../models/Staff.js';
import User from '../models/User.js';
import { getIO } from './socketService.js';
import { calculateDistanceKm, estimateETA } from './rideService.js';
export { calculateDistanceKm, estimateETA };
import logger from '../config/logger.js';

// Phase 1: Ambulance escalation radii in km
const AMBULANCE_RADII = [5, 10, 20, 35];
// Phase 2: Non-ambulance vehicle escalation radii in km (bikes excluded)
const VEHICLE_RADII = [5, 10, 20];
// Acceptance window per wave
const WINDOW_SECONDS = 30;

/**
 * Sync hospital's ambulanceService flag based on whether ≥1 ambulance is online
 */
export async function syncHospitalAmbulanceFlag(hospitalId) {
  try {
    if (!hospitalId) return;
    const count = await Ambulance.countDocuments({ hospitalId, isOnline: true });
    await Hospital.findByIdAndUpdate(hospitalId, { ambulanceService: count > 0 });
  } catch (err) {
    logger.warn(`syncHospitalAmbulanceFlag error: ${err.message}`);
  }
}

/**
 * Find nearby hospital-owned ambulances eligible for emergency dispatch
 */
export async function findEligibleAmbulances(pickupLng, pickupLat, radiusKm = 10) {
  try {
    if (mongoose.connection.readyState !== 1) return [];
    const radiusMeters = radiusKm * 1000;

    const ambulances = await Ambulance.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [Number(pickupLng), Number(pickupLat)],
          },
          key: 'currentLocation.coordinates',
          distanceField: 'distanceMeters',
          maxDistance: radiusMeters,
          spherical: true,
          query: {
            isOnline: true,
            isOnDuty: false,
            emergencySupport: true,
          },
        },
      },
      {
        $lookup: {
          from: 'hospitals',
          localField: 'hospitalId',
          foreignField: '_id',
          as: 'hospital',
        },
      },
      { $unwind: '$hospital' },
      // Hospital must have master emergencySupport enabled and approved status
      {
        $match: {
          'hospital.emergencySupport': true,
          'hospital.status': 'approved',
        },
      },
      {
        $lookup: {
          from: 'staffs',
          localField: 'currentDriverId',
          foreignField: '_id',
          as: 'driverStaff',
        },
      },
      { $unwind: { path: '$driverStaff', preserveNullAndEmptyArrays: true } },
      { $limit: 10 },
    ]);

    return ambulances.map(a => ({
      ...a,
      distanceKm: Math.round(((a.distanceMeters || 0) / 1000) * 10) / 10,
    }));
  } catch (err) {
    logger.error(`findEligibleAmbulances error: ${err.message}`);
    return [];
  }
}

/**
 * Find nearby independent vehicles (Auto, Car, Van, E-Rickshaw) with Emergency Support
 * Note: Bikes are strictly excluded.
 */
export async function findEligibleEmergencyVehicles(pickupLng, pickupLat, radiusKm = 10) {
  try {
    if (mongoose.connection.readyState !== 1) return [];
    const radiusMeters = radiusKm * 1000;

    // First find vehicles of non-bike types
    const matchingVehicles = await Vehicle.find({
      type: { $in: ['auto', 'car', 'van', 'e_rickshaw'] },
    }).select('_id type brand model rcNumber');
    const vehicleIds = matchingVehicles.map(v => v._id);

    if (vehicleIds.length === 0) return [];

    const riders = await RiderProfile.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [Number(pickupLng), Number(pickupLat)],
          },
          key: 'currentLocation.coordinates',
          distanceField: 'distanceMeters',
          maxDistance: radiusMeters,
          spherical: true,
          query: {
            isOnline: true,
            riderStatus: 'active',
            emergencySupport: true,
            vehicleId: { $in: vehicleIds },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicleId',
          foreignField: '_id',
          as: 'vehicle',
        },
      },
      { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },
      { $limit: 10 },
    ]);

    return riders.map(r => ({
      ...r,
      distanceKm: Math.round(((r.distanceMeters || 0) / 1000) * 10) / 10,
    }));
  } catch (err) {
    logger.error(`findEligibleEmergencyVehicles error: ${err.message}`);
    return [];
  }
}

/**
 * Start the Two-Phase Tiered Emergency SOS Dispatch
 */
export async function startEmergencyDispatch(requestId) {
  try {
    const request = await EmergencyRequest.findById(requestId);
    if (!request || request.status !== 'searching') return;

    const io = getIO();
    const [lng, lat] = request.location.coordinates;

    // ─── PHASE 1: Hospital-Owned Ambulances First ───────────────────────────
    for (const radiusKm of AMBULANCE_RADII) {
      const current = await EmergencyRequest.findById(requestId);
      if (!current || current.status !== 'searching') return;

      current.currentSearchRadiusKm = radiusKm;
      current.currentSearchPhase = 'ambulance';
      await current.save();

      // Notify user of search radius / phase update
      if (io) {
        io.to(`emergency:${requestId}`).emit('emergency_searching_update', {
          requestId: String(requestId),
          phase: 'ambulance',
          radiusKm,
          statusText: `Searching for nearest hospital ambulance within ${radiusKm} km…`,
        });
      }

      const ambulances = await findEligibleAmbulances(lng, lat, radiusKm);

      if (ambulances.length > 0 && io) {
        // Broadcast incoming_emergency to driver & ambulance rooms
        ambulances.forEach(amb => {
          const payload = {
            requestId: String(requestId),
            category: current.category,
            isSelf: current.reporterMode === 'self',
            patient: current.patientDetails,
            reporter: current.reporterOwnDetailsShared ? current.reporterDetails : null,
            location: current.location,
            distanceKm: amb.distanceKm,
            windowSeconds: WINDOW_SECONDS,
            hospitalName: amb.hospital?.name || 'Hospital Ambulance',
            ambulanceId: String(amb._id),
            providerType: 'ambulance',
          };

          // Notify driver user room if linked, and ambulance room
          if (amb.driverStaff?.userId) {
            io.to(`user:${amb.driverStaff.userId}`).emit('incoming_emergency', payload);
          }
          io.to(`ambulance:${amb._id}`).emit('incoming_emergency', payload);
        });

        // Log wave
        await EmergencyRequest.findByIdAndUpdate(requestId, {
          $push: {
            dispatchLog: {
              radiusKm,
              phase: 'ambulance',
              candidateCount: ambulances.length,
              outcome: 'escalated',
              at: new Date(),
            },
          },
        });

        // Wait up to WINDOW_SECONDS, poll every 1s for early accept
        const startWait = Date.now();
        while (Date.now() - startWait < WINDOW_SECONDS * 1000) {
          await new Promise(r => setTimeout(r, 1000));
          const check = await EmergencyRequest.findById(requestId).select('status');
          if (!check || check.status !== 'searching') {
            return; // Accepted by an ambulance!
          }
        }
      }
    }

    // ─── PHASE 2: Non-Ambulance Independent Vehicles (Cars/Autos/Vans) ─────
    const checkBeforePhase2 = await EmergencyRequest.findById(requestId);
    if (!checkBeforePhase2 || checkBeforePhase2.status !== 'searching') return;

    for (const radiusKm of VEHICLE_RADII) {
      const current = await EmergencyRequest.findById(requestId);
      if (!current || current.status !== 'searching') return;

      current.currentSearchRadiusKm = radiusKm;
      current.currentSearchPhase = 'vehicle';
      await current.save();

      if (io) {
        io.to(`emergency:${requestId}`).emit('emergency_searching_update', {
          requestId: String(requestId),
          phase: 'vehicle',
          radiusKm,
          statusText: `No ambulance found nearby — checking available vehicles within ${radiusKm} km…`,
        });
      }

      const vehicles = await findEligibleEmergencyVehicles(lng, lat, radiusKm);

      if (vehicles.length > 0 && io) {
        vehicles.forEach(veh => {
          const payload = {
            requestId: String(requestId),
            category: current.category,
            isSelf: current.reporterMode === 'self',
            patient: current.patientDetails,
            reporter: current.reporterOwnDetailsShared ? current.reporterDetails : null,
            location: current.location,
            distanceKm: veh.distanceKm,
            windowSeconds: WINDOW_SECONDS,
            vehicleType: veh.vehicle?.type || 'Vehicle',
            providerId: String(veh.user?._id),
            providerType: 'rider',
          };

          io.to(`user:${veh.user._id}`).emit('incoming_emergency', payload);
          io.of('/ride').to(`rider:${veh.user._id}`).emit('incoming_emergency', payload);
        });

        // Log wave
        await EmergencyRequest.findByIdAndUpdate(requestId, {
          $push: {
            dispatchLog: {
              radiusKm,
              phase: 'vehicle',
              candidateCount: vehicles.length,
              outcome: 'escalated',
              at: new Date(),
            },
          },
        });

        // Wait up to WINDOW_SECONDS
        const startWait = Date.now();
        while (Date.now() - startWait < WINDOW_SECONDS * 1000) {
          await new Promise(r => setTimeout(r, 1000));
          const check = await EmergencyRequest.findById(requestId).select('status');
          if (!check || check.status !== 'searching') {
            return; // Accepted by a vehicle!
          }
        }
      }
    }

    // ─── PHASE 3: All exhausted, no responders found ────────────────────────
    const finalCheck = await EmergencyRequest.findById(requestId);
    if (finalCheck && finalCheck.status === 'searching') {
      finalCheck.status = 'no_responders_found';
      await finalCheck.save();

      if (io) {
        io.to(`emergency:${requestId}`).emit('emergency_no_responders_found', {
          requestId: String(requestId),
          message: 'No emergency responders could be dispatched in your area right now. Please call emergency services directly (108 / 112).',
        });
      }
      logger.warn(`Emergency SOS ${requestId} timed out: no responders found.`);
    }
  } catch (err) {
    logger.error(`startEmergencyDispatch error: ${err.message}`);
  }
}

/**
 * Handle Provider Accept (Ambulance Driver or Independent Rider)
 */
export async function handleProviderAccept(requestId, providerId, providerType, user) {
  try {
    const request = await EmergencyRequest.findById(requestId);
    if (!request) return { status: 'not_found' };

    if (request.status !== 'searching') {
      return { status: 'too_late', message: 'This emergency was already assigned to another responder.' };
    }

    let assignedHospitalId = null;
    let assignedVehicleType = null;
    let responderPayload = {};
    let distanceKm = 2.5;

    if (providerType === 'ambulance') {
      const ambulance = await Ambulance.findById(providerId).populate('hospitalId');
      if (!ambulance) return { status: 'invalid_provider', message: 'Ambulance not found' };

      // Mark ambulance on duty
      ambulance.isOnDuty = true;
      await ambulance.save();

      assignedHospitalId = ambulance.hospitalId?._id || ambulance.hospitalId;
      const hospitalName = ambulance.hospitalId?.name || 'Hospital';

      const [pLng, pLat] = request.location.coordinates;
      const [aLng, aLat] = ambulance.currentLocation.coordinates;
      distanceKm = calculateDistanceKm(pLat, pLng, aLat, aLng);
      const etaMin = estimateETA(distanceKm, 'ambulance');

      responderPayload = {
        providerType: 'ambulance',
        hospitalName,
        registrationNumber: ambulance.registrationNumber,
        ambulanceType: ambulance.ambulanceType,
        equipmentLevel: ambulance.equipmentLevel,
        driverName: user?.name || ambulance.currentDriverPhone || 'Ambulance Driver',
        driverPhone: user?.phone || ambulance.currentDriverPhone,
        currentLocation: ambulance.currentLocation,
        distanceKm,
        etaMin,
      };
    } else {
      // Independent rider
      const riderProfile = await RiderProfile.findOne({ userId: providerId }).populate('vehicleId');
      assignedVehicleType = riderProfile?.vehicleId?.type || 'car';

      const [pLng, pLat] = request.location.coordinates;
      const [rLng, rLat] = riderProfile?.currentLocation?.coordinates || [79.9864, 23.1815];
      distanceKm = calculateDistanceKm(pLat, pLng, rLat, rLng);
      const etaMin = estimateETA(distanceKm, assignedVehicleType);

      responderPayload = {
        providerType: 'rider',
        vehicleType: assignedVehicleType,
        driverName: user?.name || 'Emergency Driver',
        driverPhone: user?.phone,
        currentLocation: riderProfile?.currentLocation,
        distanceKm,
        etaMin,
      };
    }

    // Atomic assignment lock
    const updated = await EmergencyRequest.findOneAndUpdate(
      { _id: requestId, status: 'searching' },
      {
        status: 'assigned',
        assignedProviderId: providerId,
        assignedProviderType: providerType,
        assignedVehicleType,
        assignedHospitalId,
        assignedAt: new Date(),
      },
      { new: true }
    );

    if (!updated) {
      // Someone beat them by milliseconds
      if (providerType === 'ambulance') {
        await Ambulance.findByIdAndUpdate(providerId, { isOnDuty: false });
      }
      return { status: 'too_late', message: 'This emergency was already assigned to another responder.' };
    }

    const io = getIO();
    if (io) {
      // Notify the winning provider
      if (providerType === 'ambulance') {
        io.to(`ambulance:${providerId}`).emit('emergency_assigned_to_you', {
          requestId: String(requestId),
          ...responderPayload,
        });
      } else {
        io.to(`user:${providerId}`).emit('emergency_assigned_to_you', {
          requestId: String(requestId),
          ...responderPayload,
        });
      }

      // Notify user with full responder details
      io.to(`emergency:${requestId}`).emit('emergency_assigned', {
        requestId: String(requestId),
        ...responderPayload,
      });
    }

    return { status: 'assigned', request: updated, responder: responderPayload };
  } catch (err) {
    logger.error(`handleProviderAccept error: ${err.message}`);
    return { status: 'error', message: err.message };
  }
}

/**
 * Handle Destination Hospital Selection by Responder
 */
export async function selectDestinationHospital(requestId, hospitalId) {
  try {
    const hospital = await Hospital.findById(hospitalId).select('name address phone location');
    if (!hospital) return { status: 'not_found' };

    const updated = await EmergencyRequest.findByIdAndUpdate(
      requestId,
      { selectedHospitalId: hospitalId, status: 'en_route' },
      { new: true }
    );

    const io = getIO();
    if (io) {
      io.to(`emergency:${requestId}`).emit('emergency_hospital_selected', {
        requestId: String(requestId),
        hospital,
      });
    }

    return { status: 'success', request: updated, hospital };
  } catch (err) {
    logger.error(`selectDestinationHospital error: ${err.message}`);
    return { status: 'error', message: err.message };
  }
}
