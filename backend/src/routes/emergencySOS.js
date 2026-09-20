import express from 'express';
import EmergencyRequest from '../models/EmergencyRequest.js';
import { startManualModeSearch, bookChosenProvider, startAutoBookSearch, startAutoFindLoop } from '../services/sosVehicleService.js';
import { getIO } from '../services/socketService.js';
import logger from '../config/logger.js';

const router = express.Router();

// ─── POST /api/emergency-sos/start ───
// Body: { requestMode, selectedVehicleTypes[], autoBookEnabled, autoFindEnabled, startingRadiusKm, category, location, ... }
router.post('/start', async (req, res) => {
  try {
    const {
      requestMode,
      selectedVehicleTypes = [],
      autoBookEnabled = false,
      autoFindEnabled = false,
      startingRadiusKm = 5,
      category,
      ...rest
    } = req.body;

    const request = await EmergencyRequest.create({
      ...rest,
      requestMode,
      selectedVehicleTypes,
      autoBookEnabled,
      autoFindEnabled,
      startingRadiusKm,
    });

    // Start the appropriate search mode
    let searchResult;

    if (requestMode === 'auto_select_ambulance') {
      // Mode 3: always auto-book ambulance
      searchResult = await startAutoBookSearch(requestId, startingRadiusKm);
    } else if (autoFindEnabled) {
      // Mode 2+3 auto-find loop
      const radiusSteps = [5, 10, 15, 20]; // configurable later
      searchResult = await startAutoFindLoop(requestId, radiusSteps, 3, 3000);
    } else if (autoBookEnabled) {
      // Mode 2 with auto-book ON
      searchResult = await startAutoBookSearch(requestId, startingRadiusKm);
    } else {
      // Mode 1: manual select - one wave, patient chooses
      searchResult = await startManualModeSearch(requestId, startingRadiusKm);
    }

    if (searchResult.error) {
      return res.status(400).json({ message: searchResult.error });
    }

    // Return initial state to client
    const response = {
      requestId: String(request._id),
      requestMode: request.requestMode,
      status: request.status,
      mode: requestMode,
    };

    // Add mode-specific data
    if (requestMode === 'manual_select' && searchResult.accepted) {
      response.acceptedCandidates = searchResult.accepted.map(a => ({
        providerId: a.providerId,
        providerType: a.providerType,
        distanceKm: a.distanceKm,
      }));
    } else if (searchResult.assigned) {
      response.assigned = true;
      response.provider = searchResult.provider;
    }

    res.json(response);
  } catch (err) {
    logger.error(`SOS start error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/emergency-sos/:id/book/:providerId ───
// Patient explicitly books the chosen provider
router.post('/:id/book/:providerId', async (req, res) => {
  try {
    const result = await bookChosenProvider(req.params.id, req.params.providerId);
    if (result.error) {
      return res.status(400).json({ message: result.error });
    }
    res.json({ success: true, request: result.request });
  } catch (err) {
    logger.error(`SOS book error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/emergency-sos/:id/search-again ───
// Manual mode: retry same radius
router.post('/:id/search-again', async (req, res) => {
  try {
    const result = await startManualModeSearch(req.params.id, /* same radius */);
    if (result.error) return res.status(400).json({ message: result.error });
    res.json({ accepted: result.accepted, done: result.done });
  } catch (err) {
    logger.error(`SOS search-again error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/emergency-sos/:id/search-radius/:km ───
// Manual mode: try next radius
router.post('/:id/search-radius/:km', async (req, res) => {
  try {
    const km = parseInt(req.params.km);
    const result = await startManualModeSearch(req.params.id, km);
    if (result.error) return res.status(400).json({ message: result.error });
    res.json({ accepted: result.accepted, done: result.done });
  } catch (err) {
    logger.error(`SOS search-radius error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/emergency-sos/:id/accepted-candidates ───
// Return accepted candidates with distance (for manual choose screen)
router.get('/:id/accepted-candidates', async (req, res) => {
  try {
    const r = await EmergencyRequest.findById(req.params.id).select('notified acceptances everNotified');
    const accepted = (r.acceptances || [])
      .filter(a => new Date(a.acceptedAt) <= new Date(r.windowEndsAt || 0))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({ accepted: accepted.map(a => ({
      providerId: a.providerId,
      providerType: a.providerType,
      distanceKm: a.distanceKm,
      userId: a.userId,
    })) });
  } catch (err) {
    logger.error(`SOS accepted-candidates error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/emergency-sos/:id/status ───
// Live status for patient dashboard
router.get('/:id/status', async (req, res) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id).select('status requestMode selectedVehicleTypes autoBookEnabled autoFindEnabled startingRadiusKm currentSearchRadiusKm currentSearchPhase dispatchLog notified acceptances windowEndsAt assignedProviderId assignedProviderType assignedVehicleType assignedHospitalId assignedAt selectedHospitalId');
    if (!request) return res.status(404).json({ message: 'Request not found' });

    res.json({
      status: request.status,
      requestMode: request.requestMode,
      selectedVehicleTypes: request.selectedVehicleTypes,
      autoBookEnabled: request.autoBookEnabled,
      autoFindEnabled: request.autoFindEnabled,
      startingRadiusKm: request.startingRadiusKm,
      currentSearchRadiusKm: request.currentSearchRadiusKm,
      currentSearchPhase: request.currentSearchPhase,
      dispatchLog: request.dispatchLog,
      notifiedCount: (request.notified || []).length,
      acceptancesCount: (request.acceptances || []).length,
      assigned: !!request.assignedProviderId,
      providerType: request.assignedProviderType,
      vehicleType: request.assignedVehicleType,
      hospital: request.assignedHospitalId ? String(request.assignedHospitalId) : null,
      assignedAt: request.assignedAt,
    });
  } catch (err) {
    logger.error(`SOS status error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

export default router;