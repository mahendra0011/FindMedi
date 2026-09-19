import LawyerProfile from '../models/LawyerProfile.js';
import LawyerBooking from '../models/LawyerBooking.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { getIO } from './socketService.js';
import logger from '../config/logger.js';

export const LEGAL_CATEGORIES_INFO = {
  medical_negligence: {
    label: 'Medical Negligence',
    icon: '🏥',
    desc: 'Hospital & doctor negligence, misdiagnosis, treatment lapse',
  },
  insurance: {
    label: 'Insurance Claim Disputes',
    icon: '📄',
    desc: 'Health/accident insurance claim rejections, delays & TPA disputes',
  },
  accident_mlc: {
    label: 'Accident & MLC Cases',
    icon: '🚑',
    desc: 'Medico-legal documentation, accident compensation & claims',
  },
  consumer_rights: {
    label: 'Consumer Rights',
    icon: '🛒',
    desc: 'Hospital overcharging, billing disputes & service deficiencies',
  },
  family_law: {
    label: 'Family & Personal Matters',
    icon: '👨‍👩‍👧',
    desc: 'Medical consent, guardianship, patient care family disputes',
  },
  criminal_law: {
    label: 'Criminal Law',
    icon: '⚖️',
    desc: 'FIR, assault, medical criminal liability & police liaison',
  },
  civil_property: {
    label: 'Civil & Property',
    icon: '🏠',
    desc: 'Wills, power of attorney, patient property & civil disputes',
  },
  corporate_contract: {
    label: 'Corporate & Contract Law',
    icon: '📃',
    desc: 'Healthcare contracts, supplier disputes & institutional agreements',
  },
  general_consultation: {
    label: 'General Legal Consultation',
    icon: '💬',
    desc: 'First legal opinion, advice & documentation review',
  },
};

export const CATEGORY_MAP_TO_DISPLAY = {
  medical_negligence: 'Medical Negligence',
  insurance: 'Insurance Disputes',
  accident_mlc: 'Accident & MLC',
  consumer_rights: 'Consumer Rights',
  family_law: 'Family & Personal',
  criminal_law: 'Criminal Law',
  civil_property: 'Civil & Property',
  corporate_contract: 'Corporate & Contract',
  general_consultation: 'General Consultation',
};

export const CATEGORY_MAP_TO_SLUG = {
  'Medical Negligence': 'medical_negligence',
  'Insurance Disputes': 'insurance',
  'Accident & MLC': 'accident_mlc',
  'Consumer Rights': 'consumer_rights',
  'Family & Personal': 'family_law',
  'Criminal Law': 'criminal_law',
  'Civil & Property': 'civil_property',
  'Corporate & Contract': 'corporate_contract',
  'General Consultation': 'general_consultation',
};

/**
 * Filter available and active lawyers based on search criteria
 */
export async function searchMatchingLawyers({
  category,
  mode,
  date,
  city,
  isUrgent = false,
  minRating,
  maxFee,
  minExperience,
  language,
  court,
}) {
  const query = {
    lawyerStatus: 'active',
  };

  if (isUrgent) {
    query.isAvailable = true;
    query.acceptsUrgent = true;
  }

  if (category) {
    const slug = CATEGORY_MAP_TO_SLUG[category] || category;
    const display = CATEGORY_MAP_TO_DISPLAY[category] || category;
    query.practiceCategories = { $in: [category, slug, display] };
  }

  if (mode) {
    query.consultationModes = mode;
  }

  if (city) {
    query.jurisdictionCity = new RegExp(city, 'i');
  }

  if (minRating) {
    query['rating.avg'] = { $gte: Number(minRating) };
  }

  if (maxFee) {
    query.consultationFee = { $lte: Number(maxFee) };
  }

  if (minExperience) {
    query.yearsOfPractice = { $gte: Number(minExperience) };
  }

  if (language) {
    query.languages = new RegExp(language, 'i');
  }

  if (court) {
    query.courtsPracticedIn = new RegExp(court, 'i');
  }

  const lawyers = await LawyerProfile.find(query)
    .populate('userId', 'name email phone avatar')
    .sort({ 'rating.avg': -1, yearsOfPractice: -1 })
    .lean();

  return lawyers;
}

/**
 * Broadcast booking request to Lawyer(s)
 */
export async function broadcastLawyerBooking(booking, user) {
  const io = getIO();
  const bookingSummary = {
    _id: booking._id,
    bookingNumber: booking.bookingNumber,
    caseThreadId: booking.caseThreadId,
    category: booking.category,
    categoryInfo: LEGAL_CATEGORIES_INFO[booking.category] || {},
    caseDescription: booking.caseDescription,
    consultationMode: booking.consultationMode,
    urgency: booking.urgency,
    scheduledDate: booking.scheduledDate,
    scheduledTime: booking.scheduledTime,
    fee: booking.fee,
    documentsCount: booking.documents?.length || 0,
    client: {
      id: user._id,
      name: user.name,
      phone: booking.consultationMode === 'phone' || booking.consultationMode === 'in_person' ? user.phone : undefined,
    },
  };

  if (booking.lawyerId) {
    // 1-to-1 dispatch
    if (io) {
      io.to(`user:${booking.lawyerId}`).emit('new_booking_request', bookingSummary);
      io.of('/lawyer').to(`user:${booking.lawyerId}`).emit('new_booking_request', bookingSummary);
    }

    await Notification.create({
      title: booking.urgency === 'urgent' ? '🚨 Urgent Consultation Request' : '⚖️ New Consultation Request',
      message: `${user.name} requested a ${LEAL_CATEGORY_LABEL(booking.category)} consultation (${booking.consultationMode}).`,
      type: 'lawyer',
      userId: String(booking.lawyerId),
    }).catch((e) => logger.error(`Notification error: ${e.message}`));
  } else if (booking.urgency === 'urgent') {
    const catSlug = CATEGORY_MAP_TO_SLUG[booking.category] || booking.category;
    const catDisplay = CATEGORY_MAP_TO_DISPLAY[booking.category] || booking.category;
    const broadcastQuery = {
      lawyerStatus: 'active',
      isAvailable: true,
      acceptsUrgent: true,
      practiceCategories: { $in: [booking.category, catSlug, catDisplay] },
    };

    if (booking.location?.city && booking.location.city.trim()) {
      broadcastQuery.$or = [
        { operatingCity: new RegExp(booking.location.city.trim(), 'i') },
        { jurisdictionCity: new RegExp(booking.location.city.trim(), 'i') },
      ];
    }

    let matchingProfiles = await LawyerProfile.find(broadcastQuery).select('userId');
    if (matchingProfiles.length === 0 && broadcastQuery.$or) {
      delete broadcastQuery.$or;
      matchingProfiles = await LawyerProfile.find(broadcastQuery).select('userId');
    }

    matchingProfiles.forEach(async (p) => {
      if (io) {
        io.to(`user:${p.userId}`).emit('new_booking_request', bookingSummary);
        io.of('/lawyer').to(`user:${p.userId}`).emit('new_booking_request', bookingSummary);
      }
      await Notification.create({
        title: '🚨 Urgent Legal Help Requested!',
        message: `${user.name} needs immediate legal help for ${LEAL_CATEGORY_LABEL(booking.category)}.`,
        type: 'lawyer',
        userId: String(p.userId),
      }).catch(() => {});
    });
  }
}

/**
 * Real-time notification of booking status change
 */
export async function notifyBookingUpdate(booking, eventName = 'booking_status_update') {
  const io = getIO();
  const payload = {
    bookingId: booking._id,
    bookingNumber: booking.bookingNumber,
    caseThreadId: booking.caseThreadId,
    status: booking.status,
    lawyerId: booking.lawyerId,
    scheduledDate: booking.scheduledDate,
    scheduledTime: booking.scheduledTime,
    proposedNewTime: booking.proposedNewTime,
    finalCaseSummary: booking.finalCaseSummary,
    updatedAt: new Date().toISOString(),
  };

  if (io) {
    io.to(`lawyer-booking:${booking._id}`).emit(eventName, payload);
    io.of('/lawyer').to(`lawyer-booking:${booking._id}`).emit(eventName, payload);

    if (booking.userId) {
      io.to(`user:${booking.userId}`).emit(eventName, payload);
    }
    if (booking.lawyerId) {
      io.to(`user:${booking.lawyerId}`).emit(eventName, payload);
    }
  }
}

export function LEAL_CATEGORY_LABEL(cat) {
  return LEGAL_CATEGORIES_INFO[cat]?.label || cat;
}
