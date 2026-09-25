import express from 'express';
import LawyerBooking from '../models/LawyerBooking.js';
import LawyerProfile from '../models/LawyerProfile.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import {
  validate,
  bookLawyerSchema,
  proposeTimeSchema,
  caseNoteSchema,
  rateLawyerSchema,
} from '../utils/validate.js';
import {
  broadcastLawyerBooking,
  notifyBookingUpdate,
  LEGAL_CATEGORIES_INFO,
  CATEGORY_MAP_TO_SLUG,
  CATEGORY_MAP_TO_DISPLAY,
} from '../services/lawyerService.js';
import { generateLawyerReceiptPdf } from '../services/lawyerReceiptService.js';
import { startLawyerDispatch, acceptLawyerRequest, rejectLawyerRequest } from '../services/lawyerDispatchService.js';
import { getIO } from '../services/socketService.js';
import logger from '../config/logger.js';

const router = express.Router();

// ─── POST /api/lawyer-booking/book ─────────────────────────────────────────
// Create a new legal consultation booking (Paths A, B, and C)
router.post('/book', protect, validate(bookLawyerSchema), async (req, res) => {
  try {
    const {
      lawyerId,
      category,
      caseDescription,
      urgency = 'normal',
      isUrgent,
      consultationMode,
      contactMode,
      scheduledDate,
      scheduledTime,
      budgetRange,
      documents = [],
      fee: customFee,
      isFollowUp = false,
      caseThreadId,
      targetLawyerOnly,
      intakeSource = 'scheduled_profile_form',
      bookingFor = 'self',
      familyMemberId,
      otherPatient,
      phone,
      acknowledgeUrgent = false,
    } = req.body;

    const resolvedUrgency = isUrgent || urgency === 'urgent' ? 'urgent' : 'normal';
    const resolvedMode = contactMode || consultationMode || 'video';
    const isTargeted = Boolean(targetLawyerOnly || (lawyerId && resolvedUrgency !== 'urgent'));

    let targetLawyerId = isTargeted && lawyerId ? lawyerId : null;
    let fee = customFee || 800;

    if (targetLawyerId) {
      const profile = await LawyerProfile.findOne({
        $or: [{ userId: targetLawyerId }, { _id: targetLawyerId }],
      });
      if (profile) {
        fee = isFollowUp ? profile.followUpFee || profile.consultationFee : profile.consultationFee;
        targetLawyerId = profile.userId;
      }
    }

    const booking = await LawyerBooking.create({
      userId: req.user._id,
      lawyerId: targetLawyerId,
      caseThreadId: caseThreadId || undefined,
      category,
      caseDescription,
      urgency: resolvedUrgency,
      consultationMode: resolvedMode,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      scheduledTime: scheduledTime || (resolvedUrgency === 'urgent' ? 'Immediate' : '10:00 AM'),
      budgetRange: budgetRange || { min: 0, max: 5000 },
      documents,
      fee,
      isFollowUp: Boolean(isFollowUp),
      targetLawyerOnly: Boolean(targetLawyerOnly),
      intakeSource: intakeSource || (resolvedUrgency === 'urgent' ? 'quick_urgent_card' : 'scheduled_profile_form'),
      bookingFor,
      familyMemberId: familyMemberId || null,
      otherPatient: otherPatient || undefined,
      phone: phone || req.user.phone || '',
      acknowledgeUrgent: Boolean(acknowledgeUrgent),
      location: req.body.location ? {
        address: req.body.location.address || '',
        lat: req.body.location.lat,
        lng: req.body.location.lng,
        landmarkName: req.body.location.landmarkName || '',
        city: req.body.location.city || '',
      } : undefined,
      status: resolvedUrgency === 'urgent' && !isTargeted ? 'searching' : 'requested',
      statusHistory: [{ status: resolvedUrgency === 'urgent' && !isTargeted ? 'searching' : 'requested', at: new Date(), note: 'Booking requested by client' }],
    });

    if (resolvedUrgency === 'urgent' && !isTargeted) {
      startLawyerDispatch(booking._id).catch((err) => logger.error(`Lawyer wave dispatch error: ${err.message}`));
    } else {
      await broadcastLawyerBooking(booking, req.user);
    }

    res.status(201).json({
      success: true,
      message: resolvedUrgency === 'urgent'
        ? (targetLawyerOnly ? 'Urgent request sent to advocate' : 'Urgent request dispatched via wave alert engine')
        : 'Consultation request sent successfully',
      booking,
    });
  } catch (err) {
    logger.error(`Error creating lawyer booking: ${err.message}`);
    res.status(500).json({ message: 'Failed to book lawyer' });
  }
});

// ─── POST /api/lawyer-booking/:id/broadcast-fallback ───────────────────────
// Convert targeted urgent request to broadcast after timeout or advocate offline (LC03 §4.3)
router.post('/:id/broadcast-fallback', protect, async (req, res) => {
  try {
    const booking = await LawyerBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const isClient = String(booking.userId) === String(req.user._id);
    if (!isClient && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to convert this booking' });
    }

    if (['confirmed', 'in_progress', 'completed', 'cancelled_by_user', 'cancelled_by_lawyer'].includes(booking.status)) {
      return res.status(400).json({ message: `Cannot broadcast a consultation in ${booking.status} status` });
    }

    booking.targetLawyerOnly = false;
    booking.lawyerId = null;
    booking.urgency = 'urgent';
    booking.broadcastFallbackAt = new Date();
    booking.statusHistory.push({
      status: 'requested',
      at: new Date(),
      note: 'Converted from targeted request to broadcast to all available advocates in category',
    });
    await booking.save();

    await broadcastLawyerBooking(booking, req.user);
    await notifyBookingUpdate(booking, 'booking_status_update');

    res.json({
      success: true,
      message: 'Request broadcasted to all available advocates in your category',
      booking,
    });
  } catch (err) {
    logger.error(`Error in lawyer broadcast fallback: ${err.message}`);
    res.status(500).json({ message: 'Failed to broadcast request' });
  }
});

// ─── GET /api/lawyer-booking/active ────────────────────────────────────────
// Get current active/upcoming consultation for user or lawyer
router.get('/active', protect, async (req, res) => {
  try {
    const isLawyer = req.user.role === 'lawyer';
    const query = isLawyer
      ? { lawyerId: req.user._id, status: { $in: ['requested', 'confirmed', 'in_progress', 'reschedule_proposed'] } }
      : { userId: req.user._id, status: { $in: ['requested', 'confirmed', 'in_progress', 'reschedule_proposed'] } };

    const booking = await LawyerBooking.findOne(query)
      .populate('userId', 'name email phone avatar')
      .populate('lawyerId', 'name email phone avatar')
      .sort({ createdAt: -1 });

    if (!booking) {
      return res.json({ success: true, booking: null });
    }

    let lawyerProfile = null;
    if (booking.lawyerId) {
      lawyerProfile = await LawyerProfile.findOne({ userId: booking.lawyerId._id || booking.lawyerId });
    }

    res.json({
      success: true,
      booking,
      lawyerProfile,
    });
  } catch (err) {
    logger.error(`Error fetching active lawyer booking: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch active booking' });
  }
});

// ─── POST /api/lawyer-booking/:id/accept ───────────────────────────────────
// Lawyer accepts booking
router.post('/:id/accept', protect, async (req, res) => {
  try {
    const booking = await LawyerBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'requested') {
      return res.status(400).json({ message: `Cannot accept booking in ${booking.status} status` });
    }

    // Atomic assignment if urgent
    if (!booking.lawyerId) {
      booking.lawyerId = req.user._id;
    } else if (String(booking.lawyerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'This booking was assigned to another advocate' });
    }

    booking.status = 'confirmed';
    booking.statusHistory.push({ status: 'confirmed', at: new Date(), note: `Accepted by Adv. ${req.user.name}` });
    await booking.save();

    await notifyBookingUpdate(booking, 'booking_status_update');

    // Notify client
    await Notification.create({
      title: '✅ Lawyer Consultation Confirmed',
      message: `Adv. ${req.user.name} accepted your consultation request for ${new Date(booking.scheduledDate).toLocaleDateString()} at ${booking.scheduledTime}.`,
      type: 'lawyer',
      userId: String(booking.userId),
    }).catch(() => {});

    // For urgent broadcast: notify other lawyers that booking is taken
    const io = getIO();
    if (io) {
      io.of('/lawyer').emit('booking_taken', { bookingId: booking._id, lawyerId: req.user._id });
      io.emit('booking_taken', { bookingId: booking._id, lawyerId: req.user._id });
    }

    res.json({ success: true, message: 'Consultation confirmed', booking });
  } catch (err) {
    logger.error(`Error accepting lawyer booking: ${err.message}`);
    res.status(500).json({ message: 'Failed to accept booking' });
  }
});

// ─── POST /api/lawyer-booking/:id/propose-time ─────────────────────────────
// Lawyer proposes an alternate time slot
router.post('/:id/propose-time', protect, validate(proposeTimeSchema), async (req, res) => {
  try {
    const booking = await LawyerBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = 'reschedule_proposed';
    booking.proposedNewTime = {
      date: new Date(req.body.date),
      time: req.body.time,
      reason: req.body.reason || 'Advocate proposed alternate slot',
    };
    booking.statusHistory.push({
      status: 'reschedule_proposed',
      at: new Date(),
      note: `Advocate proposed new slot: ${req.body.date} ${req.body.time}`,
    });
    await booking.save();

    await notifyBookingUpdate(booking, 'reschedule_proposed');

    await Notification.create({
      title: '📅 Alternate Slot Proposed',
      message: `Adv. ${req.user.name} proposed an alternate consultation time: ${req.body.date} at ${req.body.time}.`,
      type: 'lawyer',
      userId: String(booking.userId),
    }).catch(() => {});

    res.json({ success: true, message: 'Alternate slot proposed to client', booking });
  } catch (err) {
    logger.error(`Error proposing lawyer time: ${err.message}`);
    res.status(500).json({ message: 'Failed to propose time' });
  }
});

// ─── POST /api/lawyer-booking/:id/decline ──────────────────────────────────
// Lawyer declines booking
router.post('/:id/decline', protect, async (req, res) => {
  try {
    const booking = await LawyerBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = 'declined_by_lawyer';
    booking.statusHistory.push({
      status: 'declined_by_lawyer',
      at: new Date(),
      note: req.body.reason || 'Declined by advocate',
    });
    await booking.save();

    await notifyBookingUpdate(booking, 'booking_status_update');

    await Notification.create({
      title: '❌ Consultation Request Declined',
      message: `Adv. ${req.user.name} was unable to accept your request. Please select another advocate.`,
      type: 'lawyer',
      userId: String(booking.userId),
    }).catch(() => {});

    res.json({ success: true, message: 'Consultation declined', booking });
  } catch (err) {
    logger.error(`Error declining lawyer booking: ${err.message}`);
    res.status(500).json({ message: 'Failed to decline booking' });
  }
});

// ─── POST /api/lawyer-booking/:id/start ────────────────────────────────────
// Lawyer starts consultation -> status: 'in_progress'
router.post('/:id/start', protect, async (req, res) => {
  try {
    const booking = await LawyerBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (String(booking.lawyerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the assigned advocate can start consultation' });
    }

    booking.status = 'in_progress';
    booking.startedAt = new Date();
    booking.statusHistory.push({ status: 'in_progress', at: new Date(), note: 'Consultation session started' });
    await booking.save();

    await notifyBookingUpdate(booking, 'booking_status_update');

    await Notification.create({
      title: '🟢 Consultation Started',
      message: `Your legal consultation with Adv. ${req.user.name} is now in progress.`,
      type: 'lawyer',
      userId: String(booking.userId),
    }).catch(() => {});

    res.json({ success: true, message: 'Consultation started', booking });
  } catch (err) {
    logger.error(`Error starting lawyer consultation: ${err.message}`);
    res.status(500).json({ message: 'Failed to start consultation' });
  }
});

// ─── POST /api/lawyer-booking/:id/note ─────────────────────────────────────
// Lawyer adds or edits live case note
router.post('/:id/note', protect, validate(caseNoteSchema), async (req, res) => {
  try {
    const booking = await LawyerBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (String(booking.lawyerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the assigned advocate can write case notes' });
    }

    const newNote = {
      note: req.body.note,
      sessionNumber: req.body.sessionNumber || 1,
      authorRole: 'lawyer',
      createdAt: new Date(),
    };

    booking.caseNotes.push(newNote);
    await booking.save();

    const io = getIO();
    if (io) {
      const payload = {
        bookingId: booking._id,
        note: req.body.note,
        sessionNumber: newNote.sessionNumber,
        createdAt: newNote.createdAt,
      };
      io.to(`lawyer-booking:${booking._id}`).emit('case_note_update', payload);
      io.of('/lawyer').to(`lawyer-booking:${booking._id}`).emit('case_note_update', payload);
      io.to(`user:${booking.userId}`).emit('case_note_update', payload);
    }

    res.json({ success: true, message: 'Case note saved', note: newNote, caseNotes: booking.caseNotes });
  } catch (err) {
    logger.error(`Error saving case note: ${err.message}`);
    res.status(500).json({ message: 'Failed to save case note' });
  }
});

// ─── POST /api/lawyer-booking/:id/complete ─────────────────────────────────
// Lawyer marks consultation as completed + final summary note
router.post('/:id/complete', protect, async (req, res) => {
  try {
    const booking = await LawyerBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (String(booking.lawyerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the assigned advocate can complete consultation' });
    }

    booking.status = 'completed';
    booking.completedAt = new Date();
    booking.finalCaseSummary = req.body.finalCaseSummary || 'Consultation session completed.';
    booking.statusHistory.push({ status: 'completed', at: new Date(), note: 'Consultation concluded' });
    // L-11: settle net payout into the advocate's wallet exactly once, so
    // wallet can never silently diverge from completed revenue.
    let settledAmount = 0;
    if (!booking.settledAt) {
      const gross = Number(booking.fee) || 0;
      settledAmount = Math.round(gross * 0.9);
      booking.settledAt = new Date();
      booking.settlementAmount = settledAmount;
      if (settledAmount > 0) {
        await LawyerProfile.findOneAndUpdate(
          { userId: booking.lawyerId },
          { $inc: { walletBalance: settledAmount, totalEarnings: gross } }
        ).catch((e) => logger.error(`Lawyer wallet settlement failed: ${e.message}`));
      }
    }
    await booking.save();

    await notifyBookingUpdate(booking, 'booking_status_update');

    await Notification.create({
      title: '✅ Consultation Completed',
      message: `Your consultation with Adv. ${req.user.name} has concluded. Please review case summary and complete payment.`,
      type: 'lawyer',
      userId: String(booking.userId),
    }).catch(() => {});

    res.json({ success: true, message: settledAmount > 0 ? `Consultation marked completed — ₹${settledAmount} settled to wallet` : 'Consultation marked completed', booking, settledAmount });
  } catch (err) {
    logger.error(`Error completing lawyer consultation: ${err.message}`);
    res.status(500).json({ message: 'Failed to complete consultation' });
  }
});

// ─── POST /api/lawyer-booking/:id/cancel ───────────────────────────────────
// Cancel booking by client or lawyer
router.post('/:id/cancel', protect, async (req, res) => {
  try {
    const booking = await LawyerBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const isClient = String(booking.userId) === String(req.user._id);
    const isLawyer = String(booking.lawyerId) === String(req.user._id);

    if (!isClient && !isLawyer && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    const status = isClient ? 'cancelled_by_user' : 'cancelled_by_lawyer';
    booking.status = status;
    booking.statusHistory.push({
      status,
      at: new Date(),
      note: req.body.reason || `Cancelled by ${isClient ? 'client' : 'advocate'}`,
    });
    await booking.save();

    await notifyBookingUpdate(booking, 'booking_status_update');

    const recipientId = isClient ? booking.lawyerId : booking.userId;
    if (recipientId) {
      await Notification.create({
        title: '⚠️ Consultation Cancelled',
        message: `Consultation #${booking.bookingNumber} was cancelled by the other party.`,
        type: 'lawyer',
        userId: String(recipientId),
      }).catch(() => {});
    }

    res.json({ success: true, message: 'Consultation cancelled', booking });
  } catch (err) {
    logger.error(`Error cancelling lawyer booking: ${err.message}`);
    res.status(500).json({ message: 'Failed to cancel booking' });
  }
});

// ─── POST /api/lawyer-booking/:id/reschedule ───────────────────────────────
// Reschedule or accept lawyer's proposed slot
router.post('/:id/reschedule', protect, async (req, res) => {
  try {
    const booking = await LawyerBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (req.body.acceptProposed && booking.proposedNewTime?.date) {
      booking.scheduledDate = booking.proposedNewTime.date;
      booking.scheduledTime = booking.proposedNewTime.time;
      booking.status = 'confirmed';
      booking.statusHistory.push({
        status: 'confirmed',
        at: new Date(),
        note: 'Client accepted advocate proposed slot',
      });
      booking.proposedNewTime = undefined;
    } else {
      if (req.body.scheduledDate) booking.scheduledDate = new Date(req.body.scheduledDate);
      if (req.body.scheduledTime) booking.scheduledTime = req.body.scheduledTime;
      booking.status = 'confirmed';
      booking.statusHistory.push({
        status: 'confirmed',
        at: new Date(),
        note: `Rescheduled to ${booking.scheduledDate} ${booking.scheduledTime}`,
      });
    }

    await booking.save();
    await notifyBookingUpdate(booking, 'booking_status_update');

    res.json({ success: true, message: 'Consultation rescheduled', booking });
  } catch (err) {
    logger.error(`Error rescheduling lawyer booking: ${err.message}`);
    res.status(500).json({ message: 'Failed to reschedule' });
  }
});

// ─── POST /api/lawyer-booking/:id/follow-up ────────────────────────────────
// Book follow-up consultation on the same caseThreadId
router.post('/:id/follow-up', protect, async (req, res) => {
  try {
    const previousBooking = await LawyerBooking.findById(req.params.id);
    if (!previousBooking) {
      return res.status(404).json({ message: 'Previous consultation not found' });
    }

    const threadId = previousBooking.caseThreadId || previousBooking._id;

    // Get advocate profile for follow-up fee
    const profile = await LawyerProfile.findOne({ userId: previousBooking.lawyerId });
    const fee = profile?.followUpFee || previousBooking.fee;

    const followUpBooking = await LawyerBooking.create({
      caseThreadId: threadId,
      userId: req.user._id,
      lawyerId: previousBooking.lawyerId,
      category: previousBooking.category,
      caseDescription: req.body.caseDescription || `Follow-up on case #${previousBooking.bookingNumber}`,
      urgency: req.body.urgency || 'normal',
      consultationMode: req.body.consultationMode || previousBooking.consultationMode,
      scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : new Date(),
      scheduledTime: req.body.scheduledTime || '10:00 AM',
      documents: req.body.documents || [],
      fee,
      isFollowUp: true,
      status: 'requested',
      caseNotes: previousBooking.caseNotes || [], // carry over past notes for context
      statusHistory: [{ status: 'requested', at: new Date(), note: 'Follow-up consultation requested' }],
    });

    await broadcastLawyerBooking(followUpBooking, req.user);

    res.status(201).json({
      success: true,
      message: 'Follow-up consultation booked',
      booking: followUpBooking,
    });
  } catch (err) {
    logger.error(`Error booking lawyer follow-up: ${err.message}`);
    res.status(500).json({ message: 'Failed to book follow-up' });
  }
});

// ─── GET /api/lawyer-booking/my-bookings ───────────────────────────────────
// Flat list of client's bookings
router.get('/my-bookings', protect, async (req, res) => {
  try {
    const bookings = await LawyerBooking.find({ userId: req.user._id })
      .populate('lawyerId', 'name email phone avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    logger.error(`Error fetching client lawyer bookings: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// ─── GET /api/lawyer-booking/my-cases ──────────────────────────────────────
// Grouped by caseThreadId for client
router.get('/my-cases', protect, async (req, res) => {
  try {
    const bookings = await LawyerBooking.find({ userId: req.user._id })
      .populate('lawyerId', 'name email phone avatar')
      .sort({ createdAt: 1 });

    const groups = {};
    bookings.forEach((b) => {
      const thread = String(b.caseThreadId || b._id);
      if (!groups[thread]) {
        groups[thread] = {
          caseThreadId: thread,
          category: b.category,
          categoryInfo: LEGAL_CATEGORIES_INFO[b.category] || {},
          lawyer: b.lawyerId,
          isCaseClosed: b.isCaseClosed,
          sessionsCount: 0,
          totalSpent: 0,
          lastUpdated: b.createdAt,
          sessions: [],
        };
      }
      groups[thread].sessions.push(b);
      groups[thread].sessionsCount += 1;
      if (b.payment?.status === 'paid') {
        groups[thread].totalSpent += b.fee || 0;
      }
      if (new Date(b.createdAt) > new Date(groups[thread].lastUpdated)) {
        groups[thread].lastUpdated = b.createdAt;
      }
      if (b.isCaseClosed) {
        groups[thread].isCaseClosed = true;
      }
    });

    const cases = Object.values(groups).sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

    res.json({ success: true, count: cases.length, cases });
  } catch (err) {
    logger.error(`Error fetching client cases: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch grouped cases' });
  }
});

// ─── PUT /api/lawyer-booking/case/:caseThreadId/close ──────────────────────
// User marks a case thread as closed
router.put('/case/:caseThreadId/close', protect, async (req, res) => {
  try {
    const { caseThreadId } = req.params;
    await LawyerBooking.updateMany(
      { userId: req.user._id, caseThreadId },
      { $set: { isCaseClosed: true } }
    );
    res.json({ success: true, message: 'Case thread marked as closed' });
  } catch (err) {
    logger.error(`Error closing case: ${err.message}`);
    res.status(500).json({ message: 'Failed to close case' });
  }
});

// ─── GET /api/lawyer-booking/lawyer-history ────────────────────────────────
// Lawyer's case/booking history
router.get('/lawyer-history', protect, async (req, res) => {
  try {
    const bookings = await LawyerBooking.find({ lawyerId: req.user._id })
      .populate('userId', 'name email phone avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    logger.error(`Error fetching lawyer history: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch history' });
  }
});

// ─── GET /api/lawyer-booking/lawyer-requests ───────────────────────────────
// Pending consultation requests for the logged-in advocate.
// Covers both targeted (1-to-1) and urgent broadcast (unassigned) requests so
// that requests received while the advocate was offline are never lost.
router.get('/lawyer-requests', protect, async (req, res) => {
  try {
    const profile = await LawyerProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: 'Lawyer profile not found' });
    }

    const pendingStatuses = ['requested', 'reschedule_proposed'];

    // 1. Direct / targeted requests addressed to this advocate
    const targeted = await LawyerBooking.find({
      lawyerId: req.user._id,
      status: { $in: pendingStatuses },
    })
      .populate('userId', 'name email phone avatar')
      .sort({ createdAt: -1 });

    // 2. Unassigned urgent broadcasts matching this advocate's practice areas
    const catSlugs = (profile.practiceCategories || []).flatMap((c) => {
      const slug = CATEGORY_MAP_TO_SLUG[c] || c;
      const display = CATEGORY_MAP_TO_DISPLAY[c] || c;
      return [c, slug, display];
    });

    const broadcastFilter = {
      lawyerId: null,
      status: { $in: pendingStatuses },
      urgency: 'urgent',
      targetLawyerOnly: { $ne: true },
      ...(catSlugs.length ? { category: { $in: catSlugs } } : {}),
    };

    // Only surface broadcasts this advocate is actually eligible to handle
    if (profile.acceptsUrgent === false) {
      return res.json({ success: true, count: targeted.length, requests: targeted });
    }

    let broadcasts = await LawyerBooking.find(broadcastFilter)
      .populate('userId', 'name email phone avatar')
      .sort({ createdAt: -1 })
      .limit(25);

    // Prefer same-city broadcasts; fall back to all matching broadcast requests
    const city = profile.operatingCity || profile.jurisdictionCity;
    if (city) {
      const sameCity = broadcasts.filter(
        (b) =>
          !b.location?.city ||
          String(b.location.city).toLowerCase().includes(String(city).toLowerCase())
      );
      if (sameCity.length > 0) broadcasts = sameCity;
    }

    const targetedIds = new Set(targeted.map((b) => String(b._id)));
    const merged = [...targeted, ...broadcasts.filter((b) => !targetedIds.has(String(b._id)))];

    res.json({ success: true, count: merged.length, requests: merged });
  } catch (err) {
    logger.error(`Error fetching lawyer pending requests: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch pending requests' });
  }
});

// ─── GET /api/lawyer-booking/documents ─────────────────────────────────────
// Consolidated legal document vault across all cases
router.get('/documents', protect, async (req, res) => {
  try {
    const bookings = await LawyerBooking.find({
      userId: req.user._id,
      'documents.0': { $exists: true },
    }).select('bookingNumber category documents createdAt scheduledDate');

    const vault = [];
    bookings.forEach((b) => {
      (b.documents || []).forEach((docUrl) => {
        const name = docUrl.split('/').pop() || 'Case Document';
        vault.push({
          url: docUrl,
          name,
          bookingNumber: b.bookingNumber,
          category: b.category,
          date: b.createdAt,
        });
      });
    });

    res.json({ success: true, count: vault.length, documents: vault });
  } catch (err) {
    logger.error(`Error fetching legal documents: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

// ─── GET /api/lawyer-booking/favorites ─────────────────────────────────────
// Previously booked lawyers for client
router.get('/favorites', protect, async (req, res) => {
  try {
    const bookings = await LawyerBooking.find({
      userId: req.user._id,
      status: 'completed',
      lawyerId: { $ne: null },
    })
      .populate('lawyerId', 'name avatar email phone')
      .sort({ completedAt: -1 });

    const seen = new Set();
    const favorites = [];

    for (const b of bookings) {
      const lid = String(b.lawyerId?._id || b.lawyerId);
      if (lid && !seen.has(lid)) {
        seen.add(lid);
        const profile = await LawyerProfile.findOne({ userId: lid });
        favorites.push({
          user: b.lawyerId,
          profile,
          lastBookedAt: b.completedAt,
        });
      }
    }

    res.json({ success: true, count: favorites.length, favorites });
  } catch (err) {
    logger.error(`Error fetching favorite lawyers: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch favorites' });
  }
});

// ─── POST /api/lawyer-booking/:id/rate ─────────────────────────────────────
// Rate lawyer
router.post('/:id/rate', protect, validate(rateLawyerSchema), async (req, res) => {
  try {
    const booking = await LawyerBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (String(booking.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the booking client can rate this consultation' });
    }

    const { stars, comment } = req.body;
    booking.ratingByUser = {
      stars,
      comment: comment || '',
      ratedAt: new Date(),
    };
    await booking.save();

    // Recalculate lawyer average rating
    if (booking.lawyerId) {
      const allRated = await LawyerBooking.find({
        lawyerId: booking.lawyerId,
        'ratingByUser.stars': { $exists: true, $gt: 0 },
      });

      const count = allRated.length;
      const sum = allRated.reduce((acc, b) => acc + (b.ratingByUser?.stars || 5), 0);
      const avg = count > 0 ? Number((sum / count).toFixed(1)) : 5.0;

      await LawyerProfile.findOneAndUpdate(
        { userId: booking.lawyerId },
        { 'rating.avg': avg, 'rating.count': count }
      );
    }

    res.json({ success: true, message: 'Rating submitted successfully', rating: booking.ratingByUser });
  } catch (err) {
    logger.error(`Error rating lawyer: ${err.message}`);
    res.status(500).json({ message: 'Failed to submit rating' });
  }
});

// ─── GET /api/lawyer-booking/:id/receipt ───────────────────────────────────
// Download PDF consultation receipt
router.get('/:id/receipt', protect, async (req, res) => {
  try {
    const booking = await LawyerBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const isClient = String(booking.userId) === String(req.user._id);
    const isLawyer = String(booking.lawyerId) === String(req.user._id);
    const isAdmin = ['superadmin', 'hospital_admin'].includes(req.user.role);

    if (!isClient && !isLawyer && !isAdmin) {
      return res.status(403).json({ message: 'Confidential: You cannot access this legal receipt' });
    }

    const [client, lawyer, profile] = await Promise.all([
      User.findById(booking.userId),
      booking.lawyerId ? User.findById(booking.lawyerId) : null,
      booking.lawyerId ? LawyerProfile.findOne({ userId: booking.lawyerId }) : null,
    ]);

    const pdfBuffer = await generateLawyerReceiptPdf(booking, client, lawyer, profile);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="FindMedi_Legal_Receipt_${booking.bookingNumber}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err) {
    logger.error(`Error generating legal receipt: ${err.message}`);
    res.status(500).json({ message: 'Failed to generate receipt' });
  }
});

// ─── GET /api/lawyer-booking/:id ───────────────────────────────────────────
// Get single booking details (with confidentiality guard)
router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await LawyerBooking.findById(req.params.id)
      .populate('userId', 'name email phone avatar')
      .populate('lawyerId', 'name email phone avatar');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const isClient = String(booking.userId?._id || booking.userId) === String(req.user._id);
    const isLawyer = String(booking.lawyerId?._id || booking.lawyerId) === String(req.user._id);
    const isAdmin = ['superadmin', 'hospital_admin'].includes(req.user.role);

    if (!isClient && !isLawyer && !isAdmin) {
      return res.status(403).json({ message: 'Confidential: You do not have access to this case record' });
    }

    let lawyerProfile = null;
    if (booking.lawyerId) {
      lawyerProfile = await LawyerProfile.findOne({ userId: booking.lawyerId._id || booking.lawyerId });
    }

    res.json({ success: true, booking, lawyerProfile });
  } catch (err) {
    logger.error(`Error fetching lawyer booking detail: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch booking details' });
  }
});

export default router;
