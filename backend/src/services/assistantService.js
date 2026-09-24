import AssistantProfile from '../models/AssistantProfile.js';
import AssistantBooking from '../models/AssistantBooking.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { getIO } from './socketService.js';
import logger from '../config/logger.js';

export const CATEGORY_CHECKLIST_TEMPLATES = {
  paperwork: [
    { label: 'Admission form filled & submitted to reception', category: 'paperwork' },
    { label: 'Insurance desk documentation & TPA clearance', category: 'paperwork' },
    { label: 'Discharge summary & hospital billing clearance', category: 'paperwork' },
  ],
  medicine: [
    { label: 'Prescription reviewed with attending nurse/doctor', category: 'medicine' },
    { label: 'Medicines purchased & collected from pharmacy', category: 'medicine' },
    { label: 'Medicines delivered and handed to patient/ward', category: 'medicine' },
  ],
  reports: [
    { label: 'Lab & radiology test schedule verified', category: 'reports' },
    { label: 'Diagnostic report collected from lab counter', category: 'reports' },
    { label: 'Reports delivered to consulting doctor/patient', category: 'reports' },
  ],
  errand: [
    { label: 'Patient / family request noted', category: 'errand' },
    { label: 'Errand / food / water / document delivery completed', category: 'errand' },
  ],
  full_attendant: [
    { label: 'Checked in and reported to patient room / ward', category: 'full_attendant' },
    { label: 'Admission & initial paperwork assistance', category: 'full_attendant' },
    { label: 'Pharmacy medicine runs & delivery', category: 'full_attendant' },
    { label: 'Diagnostic reports & test sample coordination', category: 'full_attendant' },
    { label: 'General errand, food & comfort check', category: 'full_attendant' },
    { label: 'Discharge & departure assistance', category: 'full_attendant' },
  ],
  elderly_care: [
    { label: 'Mobility support (wheelchair assistance / walking support)', category: 'elderly_care' },
    { label: 'Comfort check, hydration & meal assistance', category: 'elderly_care' },
    { label: 'Escort to doctor consultation & diagnostic rooms', category: 'elderly_care' },
    { label: 'Attentive companionship and patient safety check', category: 'elderly_care' },
  ],
};

export const DURATION_HOURS = {
  '2hr': 2,
  '4hr': 4,
  'full_day': 8,
  'overnight': 12,
};

export function buildChecklistForBooking(serviceCategories = []) {
  const items = [];
  const added = new Set();

  serviceCategories.forEach((cat) => {
    const templates = CATEGORY_CHECKLIST_TEMPLATES[cat] || [];
    templates.forEach((t) => {
      if (!added.has(t.label)) {
        added.add(t.label);
        items.push({
          label: t.label,
          category: t.category,
          isCustom: false,
          isDone: false,
        });
      }
    });
  });

  if (items.length === 0) {
    items.push({
      label: 'Patient assistance check-in at hospital',
      category: 'general',
      isCustom: false,
      isDone: false,
    });
  }

  return items;
}

export function calculateBookingCost(pricePerHour = 150, pricePerFullDay = 1000, durationType = '4hr') {
  const hours = DURATION_HOURS[durationType] || 4;
  let total = 0;

  if (durationType === 'full_day' && pricePerFullDay) {
    total = pricePerFullDay;
  } else if (durationType === 'overnight' && pricePerFullDay) {
    total = Math.round(pricePerFullDay * 1.4);
  } else {
    total = pricePerHour * hours;
  }

  return {
    ratePerHour: pricePerHour,
    estimatedHours: hours,
    total,
  };
}

export async function broadcastAssistantBooking(booking) {
  const io = getIO();
  const summary = {
    bookingId: String(booking._id),
    bookingNumber: booking.bookingNumber,
    hospital: booking.hospital,
    serviceCategories: booking.serviceCategories,
    isUrgent: booking.isUrgent,
    scheduledDate: booking.scheduledDate,
    startTime: booking.startTime,
    durationType: booking.durationType,
    specialInstructions: booking.specialInstructions,
    cost: booking.cost,
    createdAt: booking.createdAt,
  };

  if (booking.isUrgent) {
    // Broadcast immediately to all online/available assistants covering this hospital
    const assistants = await AssistantProfile.find({
      assistantStatus: 'active',
      isAvailable: true,
      hospitalsCovered: { $regex: new RegExp(booking.hospital.trim(), 'i') },
    }).lean();

    if (io) {
      assistants.forEach((a) => {
        io.to(`user:${a.userId}`).emit('new_booking_request', summary);
        io.of('/assistant').to(`user:${a.userId}`).emit('new_booking_request', summary);
      });
      io.of('/assistant').emit('new_booking_request', summary);
    }
  } else if (booking.assistantId) {
    // Specific assistant requested
    if (io) {
      io.to(`user:${booking.assistantId}`).emit('new_booking_request', summary);
      io.of('/assistant').to(`user:${booking.assistantId}`).emit('new_booking_request', summary);
    }

    await Notification.create({
      userId: String(booking.assistantId),
      title: '🧑‍⚕️ New Assistant Booking Request',
      message: `You have a new booking request for ${booking.hospital} on ${new Date(booking.scheduledDate).toLocaleDateString()} (${booking.startTime}).`,
      type: 'assistant',
    }).catch(() => {});
  } else {
    if (io) {
      io.of('/assistant').emit('new_booking_request', summary);
    }
  }
}

export function notifyBookingUpdate(booking, eventName = 'booking_status_update', extra = {}) {
  const io = getIO();
  const payload = {
    bookingId: String(booking._id),
    status: booking.status,
    checkInAt: booking.checkInAt,
    completedAt: booking.completedAt,
    completionSummary: booking.completionSummary,
    payment: booking.payment,
    taskChecklist: booking.taskChecklist,
    ...extra,
  };

  if (io) {
    io.to(`assistant-booking:${booking._id}`).emit(eventName, payload);
    io.of('/assistant').to(`assistant-booking:${booking._id}`).emit(eventName, payload);

    if (booking.patientId) {
      const pId = String(booking.patientId._id || booking.patientId);
      io.to(`user:${pId}`).emit(eventName, payload);
      io.of('/assistant').to(`user:${pId}`).emit(eventName, payload);
    }

    if (booking.assistantId) {
      const aId = String(booking.assistantId._id || booking.assistantId);
      io.to(`user:${aId}`).emit(eventName, payload);
      io.of('/assistant').to(`user:${aId}`).emit(eventName, payload);
    }
  }
}
