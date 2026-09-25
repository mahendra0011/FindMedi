import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  acceptLawyerRequest,
  rejectLawyerRequest,
} from '../services/lawyerDispatchService.js';
import {
  acceptAssistantRequest,
  rejectAssistantRequest,
} from '../services/assistantDispatchService.js';
import {
  acceptEmergencyDoctorRequest,
  rejectEmergencyDoctorRequest,
} from '../services/emergencyDoctorDispatchService.js';
import {
  acceptRideRequest,
  rejectRideRequest,
} from '../services/rideDispatchService.js';

const router = express.Router();

/**
 * Universal accept endpoint for instant alert votes
 * POST /api/instant/:type/:id/accept
 */
router.post('/:type/:id/accept', protect, async (req, res) => {
  try {
    const { type, id } = req.params;
    const providerId = req.user._id || req.user.id;

    let result;
    if (type === 'lawyer') {
      result = await acceptLawyerRequest(id, providerId, req.user);
    } else if (type === 'assistant') {
      result = await acceptAssistantRequest(id, providerId, req.user);
    } else if (type === 'emergency_doctor' || type === 'emergency-doctor') {
      result = await acceptEmergencyDoctorRequest(id, providerId, req.user);
    } else if (type === 'ride') {
      result = await acceptRideRequest(id, providerId, req.user);
    } else {
      return res.status(400).json({ success: false, message: `Unsupported instant dispatch type: ${type}` });
    }

    if (!result?.success && result?.status === 'too_late') {
      return res.status(409).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Universal reject endpoint for instant alerts
 * POST /api/instant/:type/:id/reject
 */
router.post('/:type/:id/reject', protect, async (req, res) => {
  try {
    const { type, id } = req.params;
    const providerId = req.user._id || req.user.id;

    let result;
    if (type === 'lawyer') {
      result = await rejectLawyerRequest(id, providerId);
    } else if (type === 'assistant') {
      result = await rejectAssistantRequest(id, providerId);
    } else if (type === 'emergency_doctor' || type === 'emergency-doctor') {
      result = await rejectEmergencyDoctorRequest(id, providerId);
    } else if (type === 'ride') {
      result = await rejectRideRequest(id, providerId);
    } else {
      return res.status(400).json({ success: false, message: `Unsupported instant dispatch type: ${type}` });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
