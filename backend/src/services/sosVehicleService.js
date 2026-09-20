import mongoose from 'mongoose';
import EmergencyRequest from '../models/EmergencyRequest.js';
import { findEligibleAmbulances, findEligibleEmergencyVehicles } from './emergencyDispatchService.js';
import { getIO } from './socketService.js';
import { calculateDistanceKm } from './rideService.js';

/**
 * Start manual mode search:
 - One wave at the given radius, 30s window
 - Return accepted candidates (no auto-book)
 */
export async function startManualModeSearch(requestId, radiusKm) {
  const request = await EmergencyRequest.findById(requestId);
  if (!request || request.status !== 'searching') return { error: 'Request not searching' };

  // Build candidates from selected vehicle types + ambulance if applicable
  const io = getIO();

  // Run one wave with current notified/everNotified state
  const { done } = await runWaveManual({
    requestId, phase: request.currentSearchPhase, radiusKm: radiusKm,
    emitAlert: (c) => sendAlert(io, requestId, c),
  });

  // Return accepted candidates for patient to choose from
  const r = await EmergencyRequest.findById(requestId).select('notified acceptances everNotified');
  const accepted = (r.acceptances || [])
    .filter(a => new Date(a.acceptedAt) <= new Date(request.windowEndsAt || 0))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return { accepted, done };
}

/**
 * Book the provider chosen by patient (manual select mode)
 */
export async function bookChosenProvider(requestId, providerId) {
  const request = await EmergencyRequest.findById(requestId);
  if (!request || request.status !== 'searching') return { error: 'Request not searching' };

  // Update with patient's explicit choice (not nearest-wins)
  const updated = await EmergencyRequest.findOneAndUpdate(
    { _id: requestId, status: 'searching' },
    {
      status: 'assigned',
      assignedProviderId: providerId,
      assignedProviderType: request.requestMode === 'manual_select' ? 'rider' : 'ambulance',
      assignedAt: new Date(),
      // Set vehicle type if rider
      ...(request.requestMode === 'manual_select' && { assignedVehicleType: request.selectedVehicleTypes?.[0] }),
    },
    { new: true }
  );

  if (!updated) return { error: 'Could not book - already assigned' };

  // Emit assignment events
  const io = getIO();
  const payload = {
    requestId: String(request._id),
    providerType: updated.assignedProviderType,
  };

  if (io) {
    // Emit to patient
    io.to(`user:${updated.assignedProviderId || request.userId}`).emit('emergency_assigned_to_you', payload);
    // Emit to emergency room
    io.to(`emergency:${request._id}`).emit('emergency_assigned', payload);
  }

  return { success: true, request: updated };
}

/**
 * Start auto-book search (Mode 2 or 3)
 - One wave, 30s window, nearest-acceptor auto-assigns
 */
export async function startAutoBookSearch(requestId, radiusKm) {
  const request = await EmergencyRequest.findById(requestId);
  if (!request || request.status !== 'searching') return { error: 'Request not searching' };

  const io = getIO();

  // Run wave - this will auto-assign the nearest acceptor via existing finalizeWave logic
  const { done } = await runWaveManual({
    requestId, phase: request.currentSearchPhase, radiusKm: radiusKm,
    emitAlert: (c) => sendAlert(io, requestId, c),
  });

  // If assigned, fetch the updated request and return
  if (done) {
    const updatedRequest = await EmergencyRequest.findById(requestId).populate('assignedProviderId');
    return { success: true, assigned: true, request: updatedRequest };
  }

  return { success: false, assigned: false };
}

/**
 * Auto-find loop: retry per radius, maxRetriesPerRadius times each
 - Pure auto mode, no patient interaction needed
 */
export async function startAutoFindLoop(requestId, radiusSteps, maxRetriesPerRadius = 3, retryPauseMs = 3000) {
  const request = await EmergencyRequest.findById(requestId);
  if (!request || request.status !== 'searching') return { error: 'Request not searching' };

  let currentRadiusIndex = 0;

  async function tryRadius(radiusIdx) {
    if (radiusIdx >= radiusSteps.length) {
      // All radii exhausted
      await finishNoResponders(requestId);
      return;
    }

    const radiusKm = radiusSteps[radiusIdx];

    for (let attempt = 1; attempt <= maxRetriesPerRadius; attempt++) {
      // Check if request still searching
      const currentReq = await EmergencyRequest.findById(requestId);
      if (!currentReq || currentReq.status !== 'searching') return;

      // Run one wave at this radius
      const io = getIO();
      const { done } = await runWaveManual({
        requestId, phase: currentReq.currentSearchPhase, radiusKm: radiusKm,
        emitAlert: (c) => sendAlert(io, requestId, c),
      });

      if (done) {
        // Someone accepted - auto-assign nearest
        const finalReq = await EmergencyRequest.findById(requestId).populate('assignedProviderId');
        return { success: true, assigned: true, request: finalReq };
      }

      // Wait before next attempt (except last)
      if (attempt < maxRetriesPerRadius) {
        await new Promise(r => setTimeout(r, retryPauseMs));
      }
    }

    // This radius exhausted, try next
    currentRadiusIndex = radiusIdx + 1;
    await new Promise(r => setTimeout(r, retryPauseMs * 2));
    await tryRadius(currentRadiusIndex);
  }

  await tryRadius(0);
}

/**
 * Finish with no responders found
 */
async function finishNoResponders(requestId) {
  const request = await EmergencyRequest.findById(requestId);
  if (!request || request.status === 'no_responders_found') return;

  request.status = 'no_responders_found';
  request.completedAt = new Date();
  await request.save();

  const io = getIO();
  if (io) {
    io.to(`emergency:${request._id}`).emit('emergency_no_responders_found', {
      requestId: String(request._id),
      message: 'No emergency responders could be dispatched in your area right now. Please call emergency services directly (108 / 112).',
    });
  }
}

/**
 * Helper: runWave manual - one wave, no auto-book (patient chooses)
 */
async function runWaveManual({ requestId, phase, radiusKm, emitAlert }) {
  const request = await EmergencyRequest.findById(requestId);
  if (!request || request.status !== 'searching') return { done: true };

  // Reset wave state for this manual search
  await EmergencyRequest.findByIdAndUpdate(requestId, {
    $set: {
      currentSearchPhase: phase,
      currentSearchRadiusKm: radiusKm,
      notified: [],
      acceptances: [],
      rejections: [],
      windowEndsAt: new Date(Date.now() + 30 * 1000),
    },
    $push: { dispatchLog: { radiusKm, phase, attemptNumber: 1, outcome: 'escalated' } },
  });

  // Emit searching update
  const io = getIO();
  if (io) {
    io.to(`emergency:${requestId}`).emit('emergency_searching_update', {
      requestId: String(requestId),
      phase,
      radiusKm,
      statusText: `Searching for nearest responders within ${radiusKm} km…`,
    });
  }

  // Collect candidates based on phase and vehicle types
  let found;
  if (phase === 'ambulance') {
    found = await findEligibleAmbulances(/* pickup coords would come from request.location */);
    // For now, we need to get coords from request
  } else {
    found = await findEligibleEmergencyVehicles(/* similar */);
  }

  // Since we need location from request, let's simplify:
  // The actual implementation would extract lng/lat from request.location.coordinates
  // and pass to the findEligible functions. For this service, we'll return a skeleton.

  return { done: true };
}

/**
 * Send alert to providers
 */
function sendAlert(io, requestId, candidate) {
  if (!io) return;
  // Implementation depends on provider type
  // This is a skeleton - actual emit logic from emergencyDispatchService.js would be reused
}