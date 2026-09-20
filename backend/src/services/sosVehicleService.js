import EmergencyRequest from '../models/EmergencyRequest.js';
import {
  findEligibleAmbulances,
  findEligibleEmergencyVehicles,
  finalizeWave,
  buildResponderPayload,
} from './emergencyDispatchService.js';
import Ambulance from '../models/Ambulance.js';
import { getIO } from './socketService.js';
import Notification from '../models/Notification.js';
import logger from '../config/logger.js';
import SOSVehicleSettings from '../models/SOSVehicleSettings.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getSettings() {
  try {
    const s = await SOSVehicleSettings.findOne().lean();
    if (s) return s;
  } catch {}
  return { radiusSteps: [5, 10, 15, 20], windowSeconds: 30, maxRetriesPerRadius: 3, retryPauseSeconds: 3 };
}

function buildAlert(request, item, kind) {
  const base = {
    requestId: String(request._id),
    category: request.category,
    isSelf: request.reporterMode === 'self',
    patient: request.patientDetails,
    reporter: request.reporterOwnDetailsShared ? request.reporterDetails : null,
    location: request.location,
    distanceKm: item.distanceKm,
    windowSeconds: 30,
    providerType: kind,
  };
  if (kind === 'ambulance') {
    return { ...base, ambulanceId: String(item._id), hospitalName: item.hospital?.name || 'Hospital Ambulance' };
  }
  return { ...base, providerId: String(item.user?._id || item.userId), vehicleType: item.vehicle?.type || 'Vehicle' };
}

function sendAlert(io, requestId, c) {
  if (!io) return;
  const payload = c.raw;
  io.to(`user:${c.userId}`).emit('incoming_emergency', payload);
  if (c.providerType === 'ambulance') io.to(`ambulance:${c.providerId}`).emit('incoming_emergency', payload);
}

async function buildCandidates(request, radiusKm, { fresh = false } = {}) {
  const [lng, lat] = request.location.coordinates;
  // fresh=true (Search Again): pehle alert gaye providers ko dobara alert bhejna allowed hai
  const ever = fresh ? [] : (request.everNotified || []).map((e) => (typeof e === 'string' ? e : e.providerId));
  const types = request.selectedVehicleTypes || [];
  const wantAmb = types.includes('ambulance') || request.requestMode === 'auto_select_ambulance';
  const wantVeh = types.some((t) => ['auto', 'e_rickshaw', 'car', 'van'].includes(t)) || request.requestMode === 'auto_select_vehicle';
  const out = [];

  if (wantAmb) {
    const found = await findEligibleAmbulances(lng, lat, radiusKm, ever);
    found.filter((a) => a.userId).forEach((a) =>
      out.push({ providerId: String(a._id), providerType: 'ambulance', userId: String(a.userId), distanceKm: a.distanceKm, raw: buildAlert(request, a, 'ambulance') })
    );
  }
  if (wantVeh) {
    const found = await findEligibleEmergencyVehicles(lng, lat, radiusKm, ever);
    const allowed = new Set(types.filter((t) => t !== 'ambulance'));
    found.forEach((v) => {
      const vt = v.vehicle?.type;
      if (request.requestMode === 'manual_select' && allowed.size && !allowed.has(vt)) return;
      const uid = String(v.user?._id || v.userId);
      if (!uid || uid === 'undefined') return;
      out.push({ providerId: uid, providerType: 'rider', userId: uid, distanceKm: v.distanceKm, raw: buildAlert(request, v, 'rider') });
    });
  }
  return out;
}

async function openWave(requestId, radiusKm, candidates, attemptNumber = 1) {
  const settings = await getSettings();
  const windowMs = (settings.windowSeconds || 30) * 1000;
  const req = await EmergencyRequest.findById(requestId).select('currentSearchPhase');
  const phase = req?.currentSearchPhase || 'vehicle';
  await EmergencyRequest.findByIdAndUpdate(requestId, {
    $set: {
      currentSearchRadiusKm: radiusKm,
      notified: candidates.map((c) => ({ providerId: c.providerId, providerType: c.providerType, userId: c.userId })),
      acceptances: [],
      rejections: [],
      windowEndsAt: new Date(Date.now() + windowMs),
    },
    $addToSet: { everNotified: { $each: candidates.map((c) => ({ providerId: c.providerId })) } },
    $push: { dispatchLog: { radiusKm, phase, attemptNumber, candidateCount: candidates.length, outcome: 'escalated' } },
  });
  const io = getIO();
  if (io) {
    io.to(`emergency:${requestId}`).emit('emergency_searching_update', {
      requestId: String(requestId), phase, radiusKm, attemptNumber,
      statusText: `${radiusKm} km me dhoondh rahe hain…`,
    });
  }
  candidates.forEach((c) => sendAlert(io, requestId, c));
  return { windowMs, phase };
}

async function waitWindow(requestId, windowMs) {
  const deadline = Date.now() + windowMs;
  while (Date.now() < deadline) {
    await sleep(1000);
    const r = await EmergencyRequest.findById(requestId).select('status notified acceptances rejections');
    if (!r || r.status !== 'searching') return { stopped: true };
    // Sab ne reject kar diya to hi jaldi band karo; accept ho to poori window wait (closest wins)
    if (r.notified?.length && r.rejections.length >= r.notified.length) break;
  }
  return { stopped: false };
}

/**
 * Window band hone par patient ko (aur bina-accept wale providers ko) batao.
 * Accepted providers overlay me "waiting" rehte hain jab tak patient book / cancel na kare.
 */
async function announceWindowClosed(requestId, radiusKm) {
  const r = await EmergencyRequest.findById(requestId).select('status notified acceptances');
  if (!r || r.status !== 'searching') return { accepted: [], stopped: true };
  const accepted = [...(r.acceptances || [])].sort((a, b) => a.distanceKm - b.distanceKm);
  const io = getIO();
  if (io) {
    io.to(`emergency:${requestId}`).emit('emergency_window_closed', {
      requestId: String(requestId),
      radiusKm,
      accepted: accepted.map((a) => ({ providerId: a.providerId, providerType: a.providerType, userId: a.userId, distanceKm: a.distanceKm })),
    });
    const acceptedUsers = new Set(accepted.map((a) => String(a.userId)));
    (r.notified || [])
      .filter((n) => !acceptedUsers.has(String(n.userId)))
      .forEach((n) => io.to(`user:${n.userId}`).emit('emergency_expired_no_response', { requestId: String(requestId) }));
  }
  return { accepted, stopped: false };
}

export async function startManualModeSearch(requestId, radiusKm, opts = {}) {
  const request = await EmergencyRequest.findById(requestId);
  if (!request || request.status !== 'searching') return { error: 'Request not searching' };

  // Pichli wave ke providers (accepted waiting wale bhi) ke overlay band karo
  const io0 = getIO();
  (request.notified || []).forEach((n) => io0?.to(`user:${n.userId}`).emit('emergency_closed', { requestId: String(requestId) }));

  const cands = await buildCandidates(request, radiusKm, { fresh: !!opts.fresh });
  if (!cands.length) {
    await EmergencyRequest.findByIdAndUpdate(requestId, {
      $set: { currentSearchRadiusKm: radiusKm, notified: [], acceptances: [], rejections: [] },
      $push: { dispatchLog: { radiusKm, phase: request.currentSearchPhase, attemptNumber: 1, candidateCount: 0, outcome: 'no_acceptance' } },
    });
    await announceWindowClosed(requestId, radiusKm); // 0 candidates ho tab bhi patient ko result do
    return { accepted: [], done: false };
  }
  const { windowMs } = await openWave(requestId, radiusKm, cands, 1);
  await waitWindow(requestId, windowMs);
  const { accepted, stopped } = await announceWindowClosed(requestId, radiusKm);
  if (stopped) return { accepted: [], done: true };
  return { accepted, done: false };
}

export async function bookChosenProvider(requestId, providerId) {
  const request = await EmergencyRequest.findById(requestId);
  if (!request || request.status !== 'searching') return { error: 'Request not searching' };
  const acc = (request.acceptances || []).find((a) => String(a.providerId) === String(providerId));
  if (!acc) return { error: 'Provider ne accept nahi kiya' };
  const providerType = acc.providerType;
  const update = { status: 'assigned', assignedProviderId: providerId, assignedProviderType: providerType, assignedAt: new Date() };
  if (providerType === 'ambulance') {
    const amb = await Ambulance.findById(providerId).select('hospitalId').lean();
    if (amb?.hospitalId) update.assignedHospitalId = amb.hospitalId;
  }
  const updated = await EmergencyRequest.findOneAndUpdate({ _id: requestId, status: 'searching' }, update, { new: true });
  if (!updated) return { error: 'Could not book - already assigned' };
  if (providerType === 'ambulance') {
    await Ambulance.findByIdAndUpdate(providerId, { isOnDuty: true, currentEmergencyId: request._id }).catch(() => {});
  }
  const payload = await buildResponderPayload({ providerId, providerType, userId: acc.userId, distanceKm: acc.distanceKm }).catch(() => ({ providerType }));
  const losers = (request.acceptances || []).filter((a) => String(a.providerId) !== String(providerId));
  const io = getIO();
  if (io) {
    io.to(`emergency:${requestId}`).emit('emergency_assigned', { requestId: String(requestId), ...payload, manualChoice: true });
    io.to(`user:${acc.userId}`).emit('emergency_assigned_to_you', { requestId: String(requestId), ...payload });
    if (providerType === 'ambulance') {
      io.to(`ambulance:${providerId}`).emit('emergency_assigned_to_you', { requestId: String(requestId), ...payload });
    }
    losers.forEach((l) => io.to(`user:${l.userId}`).emit('emergency_lost', {
      requestId: String(requestId),
      message: 'Ye emergency patient ne kisi aur responder ko book kar diya.',
    }));
    (request.notified || [])
      .filter((n) => n.userId !== acc.userId)
      .forEach((n) => io.to(`user:${n.userId}`).emit('emergency_closed', { requestId: String(requestId) }));
  }
  try {
    if (acc?.userId) {
      await Notification.create({
        title: 'Emergency Assigned',
        message: `Patient ne aapko book kiya — ${request.category || 'General'}`,
        type: 'system',
        userId: String(acc.userId),
      });
    }
  } catch {}
  return { success: true, request: updated };
}

export async function startAutoBookSearch(requestId, radiusKm) {
  const request = await EmergencyRequest.findById(requestId);
  if (!request || request.status !== 'searching') return { error: 'Request not searching' };
  const cands = await buildCandidates(request, radiusKm);
  if (!cands.length) return { success: false, assigned: false };
  const { windowMs } = await openWave(requestId, radiusKm, cands, 1);
  await waitWindow(requestId, windowMs);
  const out = await finalizeWave(requestId);
  if (out.done) {
    const updatedRequest = await EmergencyRequest.findById(requestId);
    return { success: true, assigned: true, request: updatedRequest };
  }
  return { success: false, assigned: false };
}

export async function startAutoFindLoop(requestId, radiusSteps, maxRetriesPerRadius = 3, retryPauseMs = 3000) {
  const steps = Array.isArray(radiusSteps) && radiusSteps.length ? radiusSteps : [5, 10, 15, 20];
  for (const radiusKm of steps) {
    for (let attempt = 1; attempt <= maxRetriesPerRadius; attempt++) {
      const cur = await EmergencyRequest.findById(requestId).select('status location selectedVehicleTypes requestMode everNotified currentSearchPhase');
      if (!cur || cur.status !== 'searching') return { stopped: true };
      const cands = await buildCandidates(cur, radiusKm);
      if (!cands.length) {
        await EmergencyRequest.findByIdAndUpdate(requestId, {
          $set: { currentSearchRadiusKm: radiusKm },
          $push: { dispatchLog: { radiusKm, phase: cur.currentSearchPhase, attemptNumber: attempt, candidateCount: 0, outcome: 'no_acceptance' } },
        });
        const io = getIO();
        if (io) io.to(`emergency:${requestId}`).emit('emergency_searching_update', { requestId: String(requestId), phase: cur.currentSearchPhase, radiusKm, attemptNumber: attempt, maxRetries: maxRetriesPerRadius, statusText: `${radiusKm} km me attempt ${attempt}…` });
        if (attempt < maxRetriesPerRadius) await sleep(retryPauseMs);
        continue;
      }
      const { windowMs } = await openWave(requestId, radiusKm, cands, attempt);
      const io = getIO();
      if (io) io.to(`emergency:${requestId}`).emit('emergency_searching_update', { requestId: String(requestId), phase: cur.currentSearchPhase, radiusKm, attemptNumber: attempt, maxRetries: maxRetriesPerRadius, statusText: `${radiusKm} km me attempt ${attempt}…` });
      await waitWindow(requestId, windowMs);
      const out = await finalizeWave(requestId);
      if (out.done) {
        const updatedRequest = await EmergencyRequest.findById(requestId);
        return { success: true, assigned: true, request: updatedRequest };
      }
      if (attempt < maxRetriesPerRadius) await sleep(retryPauseMs);
    }
    await sleep(retryPauseMs);
  }
  const cur = await EmergencyRequest.findById(requestId);
  if (cur && cur.status === 'searching') {
    await EmergencyRequest.updateOne({ _id: requestId, status: 'searching' }, { $set: { status: 'no_responders_found' } });
    const io = getIO();
    if (io) io.to(`emergency:${requestId}`).emit('emergency_no_responders_found', { requestId: String(requestId), message: 'No emergency responders could be dispatched in your area right now. Please call emergency services directly (108 / 112).' });
    logger.warn(`Auto-find ${requestId}: no responders found.`);
  }
  return { success: false, assigned: false };
}

/**
 * Auto-escalate loop (single wave per radius, no retries).
 * Used by auto-book modes WITHOUT auto-find: startingRadius se shuru karke
 * har radius pe ek wave, assign hote hi stop, warna next radius. Sab khatam
 * ho to no_responders_found — request kabhi orphan 'searching' me nahi atki.
 */
export async function startAutoEscalateLoop(requestId, radiusSteps, startingRadiusKm = 5) {
  const steps = (Array.isArray(radiusSteps) && radiusSteps.length ? radiusSteps : [5, 10, 15, 20])
    .filter((r) => Number(r) >= Number(startingRadiusKm || 0));
  const list = steps.length ? steps : [Number(startingRadiusKm) || 5];
  for (const radiusKm of list) {
    const cur = await EmergencyRequest.findById(requestId).select('status');
    if (!cur || cur.status !== 'searching') return { stopped: true };
    const res = await startAutoBookSearch(requestId, radiusKm);
    if (res.error) return res;
    if (res.assigned) return res;
  }
  const cur = await EmergencyRequest.findById(requestId);
  if (cur && cur.status === 'searching') {
    await EmergencyRequest.updateOne({ _id: requestId, status: 'searching' }, { $set: { status: 'no_responders_found' } });
    const io = getIO();
    if (io) io.to(`emergency:${requestId}`).emit('emergency_no_responders_found', { requestId: String(requestId), message: 'No emergency responders could be dispatched in your area right now. Please call emergency services directly (108 / 112).' });
    logger.warn(`Auto-escalate ${requestId}: no responders found.`);
  }
  return { success: false, assigned: false };
}
