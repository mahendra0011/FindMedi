import express from 'express';
import AssistantBooking from '../models/AssistantBooking.js';
import AssistantProfile from '../models/AssistantProfile.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect, optionalProtect } from '../middleware/auth.js';
import {
  validate,
  bookAssistantSchema,
  customTaskSchema,
  rateAssistantSchema,
} from '../utils/validate.js';
import {
  buildChecklistForBooking,
  calculateBookingCost,
  broadcastAssistantBooking,
  notifyBookingUpdate,
} from '../services/assistantService.js';
import { generateAssistantReceiptPdf } from '../services/assistantReceiptService.js';
import logger from '../config/logger.js';

const router = express.Router();

// ─── POST /api/assistant-booking/book ───────────────────────────────────────
// Book a hospital assistant
router.post('/book', protect, validate(bookAssistantSchema), async (req, res) => {
  try {
    const {
      assistantId,
      hospital,
      serviceCategories,
      isUrgent = false,
      targetAssistantOnly = false,
      intakeSource = 'scheduled_profile_form',
      urgencyWindow = 'asap',
      onBehalfOf = 'self',
      familyMemberId,
      otherPatient,
      taskDescription,
      phone,
      documents = [],
      scheduledDate,
      startTime,
      durationType = '4hr',
      specialInstructions,
    } = req.body;

    // Check if user already has an active or in-progress booking
    const existingActive = await AssistantBooking.findOne({
      patientId: req.user._id,
      status: { $in: ['requested', 'confirmed', 'in_progress'] },
    });

    if (existingActive) {
      return res.status(400).json({
        message: 'You already have an active assistant booking.',
        activeBookingId: existingActive._id,
      });
    }

    let rate = 150;
    let targetAssistantId = assistantId || null;

    if (targetAssistantId) {
      const profile = await AssistantProfile.findOne({
        $or: [{ userId: targetAssistantId }, { _id: targetAssistantId }],
      });
      if (profile) {
        rate = profile.pricePerHour || 150;
        targetAssistantId = profile.userId;
      }
    }

    const cost = calculateBookingCost(rate, durationType);
    const taskChecklist = buildChecklistForBooking(serviceCategories);

    const booking = await AssistantBooking.create({
      patientId: req.user._id,
      assistantId: targetAssistantId,
      hospital,
      serviceCategories,
      isUrgent,
      targetAssistantOnly: Boolean(targetAssistantOnly),
      intakeSource,
      urgencyWindow,
      onBehalfOf,
      familyMemberId: familyMemberId || null,
      otherPatient: otherPatient || {},
      taskDescription: taskDescription || specialInstructions || '',
      phone: phone || req.user.phone || '',
      documents: documents || [],
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      startTime: startTime || 'Now',
      durationType,
      specialInstructions: specialInstructions || taskDescription || '',
      cost,
      status: 'requested',
      taskChecklist,
      statusHistory: [{ status: 'requested', at: new Date(), note: 'Booking created' }],
    });

    // Populate patient info for broadcast & notification
    await booking.populate('patientId', 'name phone avatar');

    if (targetAssistantId) {
      // Direct booking to specific assistant
      await Notification.create({
        userId: String(targetAssistantId),
        title: '🧑‍⚕️ New Assistant Booking Request!',
        message: `${req.user.name || 'A patient'} has booked your assistance at ${hospital} for ${durationType.toUpperCase()}.`,
        type: 'assistant',
        referenceId: String(booking._id),
      }).catch(() => {});
    }

    // Broadcast through socket layer (urgent to all available, or direct to selected assistant)
    broadcastAssistantBooking(booking).catch(err => {
      logger.warn(`Assistant broadcast warning: ${err.message}`);
    });

    res.status(201).json({
      success: true,
      message: isUrgent
        ? 'Broadcasting urgent assistant request to available attendants nearby...'
        : 'Booking request sent to assistant. Awaiting confirmation.',
      booking,
    });
  } catch (err) {
    logger.error(`Book assistant error: ${err.message}`);
    res.status(500).json({ message: 'Failed to create booking', error: err.message });
  }
});

// ─── GET /api/assistant-booking/active ──────────────────────────────────────
// Get current active or upcoming booking for patient or assistant
router.get('/active', optionalProtect, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ activeBooking: null });
    }

    const isAssistant = req.user.role === 'assistant';

    const query = {
      status: { $in: ['requested', 'confirmed', 'in_progress'] },
    };

    if (isAssistant) {
      query.assistantId = req.user._id;
    } else {
      query.patientId = req.user._id;
    }

    const activeBooking = await AssistantBooking.findOne(query)
      .populate('patientId', 'name phone email avatar')
      .populate('assistantId', 'name phone email avatar')
      .sort({ createdAt: -1 })
      .lean();

    if (!activeBooking) {
      return res.json({ activeBooking: null });
    }

    // Attach assistant's profile if available
    let assistantProfile = null;
    if (activeBooking.assistantId) {
      assistantProfile = await AssistantProfile.findOne({
        userId: activeBooking.assistantId._id || activeBooking.assistantId,
      }).select('experienceYears rating pricePerHour bio languages hospitalsCovered isAvailable').lean();
    }

    res.json({
      activeBooking,
      assistantProfile,
    });
  } catch (err) {
    logger.error(`Get active assistant booking error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch active booking', error: err.message });
  }
});

// ─── POST /api/assistant-booking/:id/accept ─────────────────────────────────
// Assistant accepts booking
router.post('/:id/accept', protect, async (req, res) => {
  try {
    const { id } = req.params;

    // In urgent bookings, multiple assistants may respond; first accept wins atomically
    const booking = await AssistantBooking.findOneAndUpdate(
      {
        _id: id,
        status: 'requested',
        $or: [{ assistantId: null }, { assistantId: req.user._id }],
      },
      {
        $set: {
          assistantId: req.user._id,
          status: 'confirmed',
        },
        $push: {
          statusHistory: { status: 'confirmed', at: new Date(), note: 'Accepted by assistant' },
        },
      },
      { new: true }
    )
      .populate('patientId', 'name phone email avatar')
      .populate('assistantId', 'name phone email avatar');

    if (!booking) {
      return res.status(400).json({
        message: 'This booking request is no longer available or was already accepted by another assistant.',
      });
    }

    // Notify patient
    await Notification.create({
      userId: String(booking.patientId?._id || booking.patientId),
      title: '✅ Assistant Booking Confirmed!',
      message: `${req.user.name || 'Your assistant'} has accepted your booking for ${booking.hospital}.`,
      type: 'assistant',
      referenceId: String(booking._id),
    }).catch(() => {});

    notifyBookingUpdate(booking, 'confirmed', {
      assistantId: req.user._id,
      assistantName: req.user.name,
      assistantPhone: req.user.phone,
    });

    res.json({
      success: true,
      message: 'Booking confirmed successfully!',
      booking,
    });
  } catch (err) {
    logger.error(`Accept assistant booking error: ${err.message}`);
    res.status(500).json({ message: 'Failed to accept booking', error: err.message });
  }
});

// ─── POST /api/assistant-booking/:id/decline ────────────────────────────────
// Assistant declines booking
router.post('/:id/decline', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Assistant unavailable' } = req.body;

    const booking = await AssistantBooking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = 'declined_by_assistant';
    booking.statusHistory.push({ status: 'declined_by_assistant', at: new Date(), note: reason });
    await booking.save();

    await Notification.create({
      userId: String(booking.patientId),
      title: '❌ Assistant Booking Declined',
      message: `Your booking was declined by the assistant. Please browse and select another attendant.`,
      type: 'assistant',
      referenceId: String(booking._id),
    }).catch(() => {});

    notifyBookingUpdate(booking, 'declined_by_assistant', { reason });

    res.json({ success: true, message: 'Booking declined', booking });
  } catch (err) {
    logger.error(`Decline assistant booking error: ${err.message}`);
    res.status(500).json({ message: 'Failed to decline booking', error: err.message });
  }
});

// ─── POST /api/assistant-booking/:id/check-in ───────────────────────────────
// Assistant checks in at the hospital
router.post('/:id/check-in', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await AssistantBooking.findOne({
      _id: id,
      assistantId: req.user._id,
      status: 'confirmed',
    });

    if (!booking) {
      return res.status(404).json({ message: 'Confirmed booking not found for this assistant' });
    }

    booking.status = 'in_progress';
    booking.checkInAt = new Date();
    booking.statusHistory.push({
      status: 'in_progress',
      at: new Date(),
      note: 'Assistant checked in at hospital',
    });

    // Mark check-in task item if present
    const checkInTask = booking.taskChecklist.find(t => t.label.toLowerCase().includes('check'));
    if (checkInTask) {
      checkInTask.isDone = true;
      checkInTask.doneAt = new Date();
    }

    await booking.save();

    await Notification.create({
      userId: String(booking.patientId),
      title: '🟢 Assistant Has Arrived!',
      message: `${req.user.name || 'Your assistant'} checked in at ${booking.hospital} and started duty.`,
      type: 'assistant',
      referenceId: String(booking._id),
    }).catch(() => {});

    notifyBookingUpdate(booking, 'in_progress', {
      checkInAt: booking.checkInAt,
      taskChecklist: booking.taskChecklist,
    });

    res.json({ success: true, message: 'Checked in successfully at hospital', booking });
  } catch (err) {
    logger.error(`Assistant check-in error: ${err.message}`);
    res.status(500).json({ message: 'Failed to check in', error: err.message });
  }
});

// ─── PUT /api/assistant-booking/:id/task/:taskId ────────────────────────────
// Toggle or update a task item in checklist
router.put('/:id/task/:taskId', protect, async (req, res) => {
  try {
    const { id, taskId } = req.params;
    const { isDone } = req.body;

    const booking = await AssistantBooking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Both assistant and patient can view, but only assistant can mark
    if (String(booking.assistantId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the assigned assistant can update tasks' });
    }

    const task = booking.taskChecklist.id(taskId);
    if (!task) return res.status(404).json({ message: 'Task item not found' });

    task.isDone = Boolean(isDone);
    task.doneAt = isDone ? new Date() : null;

    await booking.save();

    // Push realtime checklist update
    notifyBookingUpdate(booking, 'task_update', {
      taskChecklist: booking.taskChecklist,
      updatedTaskId: taskId,
      isDone: task.isDone,
      label: task.label,
    });

    res.json({ success: true, message: 'Task updated', task, taskChecklist: booking.taskChecklist });
  } catch (err) {
    logger.error(`Update task error: ${err.message}`);
    res.status(500).json({ message: 'Failed to update task', error: err.message });
  }
});

// ─── POST /api/assistant-booking/:id/task ───────────────────────────────────
// Add a custom task to checklist
router.post('/:id/task', protect, validate(customTaskSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { label, category = 'errand' } = req.body;

    const booking = await AssistantBooking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (String(booking.assistantId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the assigned assistant can add tasks' });
    }

    booking.taskChecklist.push({
      label: label.trim(),
      category,
      isCustom: true,
      isDone: false,
    });

    await booking.save();

    notifyBookingUpdate(booking, 'task_added', {
      taskChecklist: booking.taskChecklist,
      addedTask: label,
    });

    res.json({
      success: true,
      message: 'Custom task added',
      taskChecklist: booking.taskChecklist,
    });
  } catch (err) {
    logger.error(`Add custom task error: ${err.message}`);
    res.status(500).json({ message: 'Failed to add task', error: err.message });
  }
});

// ─── POST /api/assistant-booking/:id/complete ───────────────────────────────
// Assistant completes the booking
router.post('/:id/complete', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { completionSummary } = req.body;

    const booking = await AssistantBooking.findOne({
      _id: id,
      assistantId: req.user._id,
      status: 'in_progress',
    });

    if (!booking) {
      return res.status(404).json({ message: 'In-progress booking not found for this assistant' });
    }

    booking.status = 'completed';
    booking.completedAt = new Date();
    booking.completionSummary = completionSummary || 'All hospital tasks successfully completed.';
    booking.statusHistory.push({
      status: 'completed',
      at: new Date(),
      note: booking.completionSummary,
    });

    await booking.save();

    // Increment assistant's total bookings in profile
    await AssistantProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $inc: { totalBookings: 1 } }
    );

    // Notify patient to complete demo payment and rate
    await Notification.create({
      userId: String(booking.patientId),
      title: '🎉 Assistance Completed!',
      message: `${req.user.name || 'Your assistant'} has finished the session at ${booking.hospital}. Please complete demo payment and leave a review.`,
      type: 'assistant',
      referenceId: String(booking._id),
    }).catch(() => {});

    notifyBookingUpdate(booking, 'completed', {
      completedAt: booking.completedAt,
      completionSummary: booking.completionSummary,
      cost: booking.cost,
    });

    res.json({
      success: true,
      message: 'Assistance marked as completed',
      booking,
    });
  } catch (err) {
    logger.error(`Complete assistant booking error: ${err.message}`);
    res.status(500).json({ message: 'Failed to complete booking', error: err.message });
  }
});

// ─── POST /api/assistant-booking/:id/cancel ─────────────────────────────────
// Patient or assistant cancels booking
router.post('/:id/cancel', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Cancelled by user' } = req.body;

    const booking = await AssistantBooking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (!['requested', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        message: `Cannot cancel a booking that is ${booking.status}.`,
      });
    }

    const isAssistant = String(booking.assistantId) === String(req.user._id);
    const isPatient = String(booking.patientId) === String(req.user._id);

    if (!isAssistant && !isPatient && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    const newStatus = isAssistant ? 'cancelled_by_assistant' : 'cancelled_by_patient';
    booking.status = newStatus;
    booking.statusHistory.push({ status: newStatus, at: new Date(), note: reason });
    await booking.save();

    // Notify the other party
    const targetUserId = isAssistant ? booking.patientId : booking.assistantId;
    if (targetUserId) {
      await Notification.create({
        userId: String(targetUserId),
        title: '⚠️ Assistant Booking Cancelled',
        message: `Booking #${booking.bookingNumber} was cancelled by the ${isAssistant ? 'assistant' : 'patient'}. Reason: ${reason}`,
        type: 'assistant',
        referenceId: String(booking._id),
      }).catch(() => {});
    }

    notifyBookingUpdate(booking, newStatus, { cancelledBy: isAssistant ? 'assistant' : 'patient', reason });

    res.json({ success: true, message: 'Booking cancelled successfully', booking });
  } catch (err) {
    logger.error(`Cancel assistant booking error: ${err.message}`);
    res.status(500).json({ message: 'Failed to cancel booking', error: err.message });
  }
});

// ─── POST /api/assistant-booking/:id/reschedule ─────────────────────────────
// Patient reschedules date or time
router.post('/:id/reschedule', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledDate, startTime } = req.body;

    const booking = await AssistantBooking.findOne({
      _id: id,
      patientId: req.user._id,
      status: { $in: ['requested', 'confirmed'] },
    });

    if (!booking) {
      return res.status(404).json({ message: 'Pending or confirmed booking not found for rescheduling' });
    }

    if (scheduledDate) booking.scheduledDate = new Date(scheduledDate);
    if (startTime) booking.startTime = startTime;

    booking.statusHistory.push({
      status: booking.status,
      at: new Date(),
      note: `Rescheduled to ${booking.scheduledDate.toLocaleDateString()} at ${booking.startTime}`,
    });

    await booking.save();

    if (booking.assistantId) {
      await Notification.create({
        userId: String(booking.assistantId),
        title: '📅 Booking Rescheduled',
        message: `Patient has rescheduled booking #${booking.bookingNumber} to ${booking.scheduledDate.toLocaleDateString()} at ${booking.startTime}.`,
        type: 'assistant',
        referenceId: String(booking._id),
      }).catch(() => {});
    }

    notifyBookingUpdate(booking, 'rescheduled', {
      scheduledDate: booking.scheduledDate,
      startTime: booking.startTime,
    });

    res.json({ success: true, message: 'Booking rescheduled successfully', booking });
  } catch (err) {
    logger.error(`Reschedule booking error: ${err.message}`);
    res.status(500).json({ message: 'Failed to reschedule', error: err.message });
  }
});

// ─── GET /api/assistant-booking/my-bookings ─────────────────────────────────
// Patient's paginated booking history
router.get('/my-bookings', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, hospital, category } = req.query;

    const query = { patientId: req.user._id };

    if (status && status !== 'all') {
      query.status = status;
    }
    if (hospital) {
      query.hospital = new RegExp(hospital, 'i');
    }
    if (category) {
      query.serviceCategories = { $in: [category] };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [bookings, total] = await Promise.all([
      AssistantBooking.find(query)
        .populate('assistantId', 'name phone email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AssistantBooking.countDocuments(query),
    ]);

    res.json({
      bookings,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    logger.error(`Get patient assistant bookings error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch bookings', error: err.message });
  }
});

// ─── GET /api/assistant-booking/assistant-history ───────────────────────────
// Assistant's paginated booking history
router.get('/assistant-history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { assistantId: req.user._id };
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [bookings, total] = await Promise.all([
      AssistantBooking.find(query)
        .populate('patientId', 'name phone email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AssistantBooking.countDocuments(query),
    ]);

    res.json({
      bookings,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    logger.error(`Get assistant booking history error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch history', error: err.message });
  }
});

// ─── GET /api/assistant-booking/favorites ───────────────────────────────────
// Get patient's previously booked assistants
router.get('/favorites', protect, async (req, res) => {
  try {
    const completedBookings = await AssistantBooking.find({
      patientId: req.user._id,
      status: 'completed',
      assistantId: { $ne: null },
    })
      .select('assistantId hospital')
      .lean();

    const assistantCounts = {};
    completedBookings.forEach(b => {
      const aid = String(b.assistantId);
      assistantCounts[aid] = (assistantCounts[aid] || 0) + 1;
    });

    const assistantUserIds = Object.keys(assistantCounts);

    const profiles = await AssistantProfile.find({
      userId: { $in: assistantUserIds },
    })
      .populate('userId', 'name avatar phone')
      .lean();

    const favorites = profiles.map(p => ({
      ...p,
      bookingCountWithPatient: assistantCounts[String(p.userId?._id || p.userId)] || 1,
    }));

    res.json({ favorites });
  } catch (err) {
    logger.error(`Get favorite assistants error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch favorites', error: err.message });
  }
});

// ─── GET /api/assistant-booking/:id ─────────────────────────────────────────
// Get single booking details
router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await AssistantBooking.findById(req.params.id)
      .populate('patientId', 'name phone email avatar')
      .populate('assistantId', 'name phone email avatar')
      .lean();

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    let assistantProfile = null;
    if (booking.assistantId) {
      assistantProfile = await AssistantProfile.findOne({
        userId: booking.assistantId._id || booking.assistantId,
      }).select('experienceYears rating pricePerHour bio languages hospitalsCovered').lean();
    }

    res.json({ booking, assistantProfile });
  } catch (err) {
    logger.error(`Get booking error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch booking', error: err.message });
  }
});

// ─── POST /api/assistant-booking/:id/rate ───────────────────────────────────
// Rate assistant or patient
router.post('/:id/rate', protect, validate(rateAssistantSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { stars, comment } = req.body;

    const booking = await AssistantBooking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isPatient = String(booking.patientId) === String(req.user._id);
    const isAssistant = String(booking.assistantId) === String(req.user._id);

    if (!isPatient && !isAssistant) {
      return res.status(403).json({ message: 'You are not a participant in this booking' });
    }

    if (isPatient) {
      booking.ratingByPatient = { stars: Number(stars), comment: comment || '', ratedAt: new Date() };

      // Recalculate assistant's average rating
      if (booking.assistantId) {
        const assistantProfile = await AssistantProfile.findOne({ userId: booking.assistantId });
        if (assistantProfile) {
          const prevCount = assistantProfile.rating?.count || 0;
          const prevAvg = assistantProfile.rating?.avg || 5.0;
          const newCount = prevCount + 1;
          const newAvg = Number(((prevAvg * prevCount + Number(stars)) / newCount).toFixed(2));

          assistantProfile.rating = { avg: newAvg, count: newCount };
          await assistantProfile.save();
        }
      }
    } else {
      booking.ratingByAssistant = { stars: Number(stars), comment: comment || '', ratedAt: new Date() };
    }

    await booking.save();

    res.json({ success: true, message: 'Thank you for your rating!', booking });
  } catch (err) {
    logger.error(`Rate assistant booking error: ${err.message}`);
    res.status(500).json({ message: 'Failed to submit rating', error: err.message });
  }
});

// ─── GET /api/assistant-booking/:id/receipt ─────────────────────────────────
// Download PDF receipt
router.get('/:id/receipt', protect, async (req, res) => {
  try {
    const booking = await AssistantBooking.findById(req.params.id)
      .populate('patientId', 'name phone email avatar')
      .populate('assistantId', 'name phone email avatar');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const profile = await AssistantProfile.findOne({
      userId: booking.assistantId?._id || booking.assistantId,
    }).lean();

    const pdfBuffer = await generateAssistantReceiptPdf(booking, booking.patientId, booking.assistantId, profile);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Assistant-Care-Receipt-${booking.bookingNumber || booking._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    logger.error(`Assistant receipt generation error: ${err.message}`);
    res.status(500).json({ message: 'Failed to generate PDF receipt', error: err.message });
  }
});

// ─── POST /api/assistant-booking/:id/broadcast-fallback ─────────────────────
// Fallback a targeted urgent request to broadcast to all available assistants at hospital
router.post('/:id/broadcast-fallback', protect, async (req, res) => {
  try {
    const booking = await AssistantBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    booking.targetAssistantOnly = false;
    booking.broadcastFallbackAt = new Date();
    booking.statusHistory.push({
      status: 'requested',
      at: new Date(),
      note: 'Targeted assistant did not respond in time; converted to broadcast fallback',
    });
    await booking.save();
    await booking.populate('patientId', 'name phone avatar');

    // Broadcast through socket layer
    broadcastAssistantBooking(booking).catch(err => {
      logger.warn(`Assistant broadcast fallback warning: ${err.message}`);
    });

    res.json({
      success: true,
      message: 'Request broadcast to other available assistants at the hospital.',
      booking,
    });
  } catch (err) {
    logger.error(`Broadcast fallback error: ${err.message}`);
    res.status(500).json({ message: 'Failed to broadcast request', error: err.message });
  }
});

export default router;
