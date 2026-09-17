import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import CallLog from '../models/CallLog.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import { protect } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RECORDINGS_DIR = path.join(__dirname, '..', 'public', 'uploads', 'call-recordings');

if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

// Storage engine for call recordings
const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, RECORDINGS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    const cleanExt = ext.replace(/[^a-zA-Z0-9.]/g, '') || '.webm';
    const name = `call-rec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${cleanExt}`;
    cb(null, name);
  },
});

const uploadRecording = multer({
  storage: diskStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB audio limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype.includes('octet-stream') || file.mimetype.includes('webm')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio recordings are permitted'), false);
    }
  },
});

/**
 * GET /api/calls
 * List call history for the authenticated user
 */
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { tab = 'all', search = '', callType, limit = 50, page = 1 } = req.query;

    const query = {
      $or: [{ caller: userId }, { receiver: userId }],
      deletedFor: { $ne: userId },
    };

    if (callType && (callType === 'audio' || callType === 'video')) {
      query.callType = callType;
    }

    if (tab === 'missed') {
      query.status = 'missed';
    } else if (tab === 'incoming') {
      query.receiver = userId;
    } else if (tab === 'outgoing') {
      query.caller = userId;
    } else if (tab === 'recorded') {
      query.recordingUrl = { $ne: null, $exists: true };
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10));
    const pageSize = Math.min(100, parseInt(limit, 10));

    let calls = await CallLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate('caller', 'name email phone avatar role specialization')
      .populate('receiver', 'name email phone avatar role specialization')
      .populate('appointmentId', 'date time serviceType reason')
      .lean();

    // Client-side or regex search filtering by caller/receiver name or phone
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      calls = calls.filter((c) => {
        const callerName = c.caller?.name?.toLowerCase() || '';
        const receiverName = c.receiver?.name?.toLowerCase() || '';
        const callerPhone = c.caller?.phone?.toLowerCase() || '';
        const receiverPhone = c.receiver?.phone?.toLowerCase() || '';
        return (
          callerName.includes(q) ||
          receiverName.includes(q) ||
          callerPhone.includes(q) ||
          receiverPhone.includes(q)
        );
      });
    }

    const total = await CallLog.countDocuments(query);

    return res.json({
      success: true,
      data: calls,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    logger.error(`Failed to fetch call logs: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to retrieve call history' });
  }
});

/**
 * GET /api/calls/stats
 * Aggregate call counts & talk time duration for the user
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { callType } = req.query;
    const baseQuery = {
      $or: [{ caller: userId }, { receiver: userId }],
      deletedFor: { $ne: userId },
    };

    if (callType && (callType === 'audio' || callType === 'video')) {
      baseQuery.callType = callType;
    }

    const [totalCalls, missedCalls, incomingCalls, outgoingCalls, recordedCalls, durationResult] = await Promise.all([
      CallLog.countDocuments(baseQuery),
      CallLog.countDocuments({ ...baseQuery, status: 'missed' }),
      CallLog.countDocuments({ ...baseQuery, receiver: userId }),
      CallLog.countDocuments({ ...baseQuery, caller: userId }),
      CallLog.countDocuments({ ...baseQuery, recordingUrl: { $ne: null, $exists: true } }),
      CallLog.aggregate([
        { $match: baseQuery },
        { $group: { _id: null, totalSeconds: { $sum: '$duration' } } },
      ]),
    ]);

    const totalSeconds = durationResult[0]?.totalSeconds || 0;

    return res.json({
      success: true,
      stats: {
        totalCalls,
        missedCalls,
        incomingCalls,
        outgoingCalls,
        recordedCalls,
        totalSeconds,
      },
    });
  } catch (err) {
    logger.error(`Failed to fetch call stats: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch call stats' });
  }
});

/**
 * GET /api/calls/contacts
 * Returns list of recent patients / doctors that the user can call directly
 */
router.get('/contacts', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    if (userRole === 'doctor' || userRole === 'clinic_doctor') {
      // Find doctor record
      const doctor = await Doctor.findOne({ user_id: userId }).lean();
      let patientIds = new Set();

      if (doctor) {
        const appointments = await Appointment.find({ doctorId: doctor._id })
          .select('patientId')
          .limit(100)
          .sort({ createdAt: -1 })
          .lean();

        appointments.forEach((a) => {
          if (a.patientId) patientIds.add(String(a.patientId));
        });
      }

      // Also get patients from past call logs
      const pastCalls = await CallLog.find({
        $or: [{ caller: userId }, { receiver: userId }],
      })
        .select('caller receiver')
        .limit(50)
        .lean();

      pastCalls.forEach((c) => {
        const otherId = String(c.caller) === String(userId) ? String(c.receiver) : String(c.caller);
        patientIds.add(otherId);
      });

      // Query User accounts of these patients
      let patients = [];
      if (patientIds.size > 0) {
        patients = await User.find({
          $or: [
            { _id: { $in: Array.from(patientIds).filter((id) => mongoose.Types.ObjectId.isValid(id)) } },
            { role: 'patient' },
          ],
        })
          .select('name email phone avatar role isOnline lastActive')
          .limit(30)
          .lean();
      } else {
        patients = await User.find({ role: 'patient' })
          .select('name email phone avatar role isOnline lastActive')
          .limit(30)
          .lean();
      }

      return res.json({ success: true, contacts: patients });
    } else {
      // Patient querying available doctors
      let doctorUserIds = new Set();

      const patientAppointments = await Appointment.find({ patientId: userId })
        .populate('doctorId', 'user_id specialization')
        .select('doctorId')
        .limit(50)
        .sort({ createdAt: -1 })
        .lean();

      patientAppointments.forEach((a) => {
        if (a.doctorId?.user_id) {
          doctorUserIds.add(String(a.doctorId.user_id));
        }
      });

      const pastCalls = await CallLog.find({
        $or: [{ caller: userId }, { receiver: userId }],
      })
        .select('caller receiver')
        .limit(50)
        .lean();

      pastCalls.forEach((c) => {
        const otherId = String(c.caller) === String(userId) ? String(c.receiver) : String(c.caller);
        doctorUserIds.add(otherId);
      });

      let doctors = [];
      if (doctorUserIds.size > 0) {
        doctors = await User.find({
          $or: [
            { _id: { $in: Array.from(doctorUserIds).filter((id) => mongoose.Types.ObjectId.isValid(id)) } },
            { role: { $in: ['doctor', 'clinic_doctor'] } },
          ],
        })
          .select('name email phone avatar role isOnline lastActive specialization')
          .limit(40)
          .lean();
      } else {
        doctors = await User.find({ role: { $in: ['doctor', 'clinic_doctor'] } })
          .select('name email phone avatar role isOnline lastActive specialization')
          .limit(40)
          .lean();
      }

      return res.json({ success: true, contacts: doctors });
    }
  } catch (err) {
    logger.error(`Failed to fetch contacts: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch contacts directory' });
  }
});

/**
 * POST /api/calls/initiate
 * Initializes a new call log
 */
router.post('/initiate', protect, async (req, res) => {
  try {
    const callerId = req.user._id;
    const { receiverId, appointmentId = null, callType = 'audio' } = req.body;

    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'Receiver ID is required' });
    }

    const receiver = await User.findById(receiverId).select('name avatar role isOnline').lean();
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Receiver not found' });
    }

    const validCallType = callType === 'video' ? 'video' : 'audio';

    const call = await CallLog.create({
      caller: callerId,
      receiver: receiverId,
      callType: validCallType,
      status: 'missed', // default to missed until answered
      startedAt: new Date(),
      appointmentId: appointmentId || null,
    });

    const populated = await CallLog.findById(call._id)
      .populate('caller', 'name avatar role phone email')
      .populate('receiver', 'name avatar role phone email')
      .lean();

    return res.status(201).json({ success: true, call: populated });
  } catch (err) {
    logger.error(`Failed to initiate call log: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to record call initiation' });
  }
});

/**
 * PUT /api/calls/:id/status
 * Updates call status (completed, rejected, busy, missed, cancelled, failed)
 */
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, duration = 0, answeredAt = null, notes = '' } = req.body;

    const call = await CallLog.findById(id);
    if (!call) {
      return res.status(404).json({ success: false, message: 'Call record not found' });
    }

    if (status) call.status = status;
    if (duration !== undefined) call.duration = Number(duration) || 0;
    if (answeredAt) call.answeredAt = new Date(answeredAt);
    if (notes) call.notes = notes;
    call.endedAt = new Date();

    await call.save();

    return res.json({ success: true, call });
  } catch (err) {
    logger.error(`Failed to update call status: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to update call status' });
  }
});

/**
 * POST /api/calls/:id/recording
 * Upload audio recording for a call
 */
router.post('/:id/recording', protect, uploadRecording.single('audio'), async (req, res) => {
  try {
    const { id } = req.params;
    const { duration = 0 } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No audio recording file provided' });
    }

    const call = await CallLog.findById(id);
    if (!call) {
      return res.status(404).json({ success: false, message: 'Call log not found' });
    }

    const relativeUrl = `/uploads/call-recordings/${req.file.filename}`;
    call.recordingUrl = relativeUrl;
    call.recordingDuration = Number(duration) || call.duration || 0;
    await call.save();

    return res.json({
      success: true,
      message: 'Call recording saved successfully',
      recordingUrl: relativeUrl,
      duration: call.recordingDuration,
    });
  } catch (err) {
    logger.error(`Failed to save call recording: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to save call recording' });
  }
});

/**
 * DELETE /api/calls/:id
 * Delete call log for current user (soft-delete via deletedFor)
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const call = await CallLog.findById(id);
    if (!call) {
      return res.status(404).json({ success: false, message: 'Call record not found' });
    }

    if (!call.deletedFor.includes(userId)) {
      call.deletedFor.push(userId);
      await call.save();
    }

    return res.json({ success: true, message: 'Call log deleted successfully' });
  } catch (err) {
    logger.error(`Failed to delete call record: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to delete call record' });
  }
});

/**
 * DELETE /api/calls/clear/all
 * Clear all call logs for the requesting user
 */
router.delete('/clear/all', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    await CallLog.updateMany(
      {
        $or: [{ caller: userId }, { receiver: userId }],
        deletedFor: { $ne: userId },
      },
      { $addToSet: { deletedFor: userId } }
    );

    return res.json({ success: true, message: 'All call history cleared successfully' });
  } catch (err) {
    logger.error(`Failed to clear call history: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to clear call history' });
  }
});

export default router;
