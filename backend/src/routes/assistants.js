import express from 'express';
import AssistantProfile from '../models/AssistantProfile.js';
import User from '../models/User.js';
import AssistantBooking from '../models/AssistantBooking.js';
import { protect } from '../middleware/auth.js';
import { validate, assistantStatusSchema, searchAssistantSchema } from '../utils/validate.js';
import logger from '../config/logger.js';

const router = express.Router();

// ─── GET /api/assistant/profile ─────────────────────────────────────────────
// Get own assistant profile
router.get('/profile', protect, async (req, res) => {
  try {
    const profile = await AssistantProfile.findOne({ userId: req.user._id })
      .populate('userId', 'name email phone avatar address dateOfBirth gender approvalStatus')
      .lean();

    if (!profile) {
      return res.status(404).json({ message: 'Assistant profile not found' });
    }

    res.json({ profile });
  } catch (err) {
    logger.error(`Get assistant profile error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch assistant profile', error: err.message });
  }
});

// ─── PUT /api/assistant/profile ─────────────────────────────────────────────
// Update profile, service categories, hospitals, pricing, bank details
router.put('/profile', protect, async (req, res) => {
  try {
    const {
      bio,
      experienceYears,
      experienceTypes,
      languages,
      serviceCategories,
      hospitalsCovered,
      shiftTypes,
      pricePerHour,
      pricePerFullDay,
      extraSkills,
      bankDetails,
      availableDays,
      availableTimeSlots,
      isAvailable,
      settings,
      certifications,
      operatingCity,
    } = req.body;

    const profile = await AssistantProfile.findOne({ userId: req.user._id });
    if (!profile) return res.status(404).json({ message: 'Assistant profile not found' });

    if (bio !== undefined) profile.bio = bio;
    if (experienceYears !== undefined) profile.experienceYears = Number(experienceYears);
    if (experienceTypes) profile.experienceTypes = experienceTypes;
    if (languages) profile.languages = languages;
    if (serviceCategories) profile.serviceCategories = serviceCategories;
    if (hospitalsCovered) profile.hospitalsCovered = hospitalsCovered;
    if (shiftTypes) profile.shiftTypes = shiftTypes;
    if (pricePerHour !== undefined) profile.pricePerHour = Number(pricePerHour);
    if (pricePerFullDay !== undefined) profile.pricePerFullDay = Number(pricePerFullDay);
    if (extraSkills) profile.extraSkills = { ...profile.extraSkills, ...extraSkills };
    if (bankDetails) profile.bankDetails = { ...profile.bankDetails?.toObject?.() || profile.bankDetails, ...bankDetails };
    // Section-10 settings master with strict allow-list
    if (settings && typeof settings === 'object') {
      const next = { ...(profile.settings?.toObject?.() || profile.settings || {}) };
      if (typeof settings.emergencyStandby === 'boolean') next.emergencyStandby = settings.emergencyStandby;
      if (['full_6h', 'half_2_6h', 'none_enroute'].includes(settings.refundPolicy)) next.refundPolicy = settings.refundPolicy;
      if (settings.rateCard && typeof settings.rateCard === 'object') {
        next.rateCard = { ...(next.rateCard || {}) };
        for (const k of ['halfDay4h', 'day8h', 'night12h', 'full24h']) {
          if (settings.rateCard[k] !== undefined && Number(settings.rateCard[k]) >= 0) next.rateCard[k] = Number(settings.rateCard[k]);
        }
      }
      if (Array.isArray(settings.clinicalTags)) next.clinicalTags = settings.clinicalTags.map(String).slice(0, 20);
      if (Array.isArray(settings.preferredHospitals)) next.preferredHospitals = settings.preferredHospitals.map(String).slice(0, 5);
      profile.settings = next;
    }
    if (certifications) profile.certifications = certifications;
    if (operatingCity) profile.operatingCity = operatingCity;
    if (availableDays) profile.availableDays = availableDays;
    if (availableTimeSlots) profile.availableTimeSlots = availableTimeSlots;
    if (isAvailable !== undefined && profile.assistantStatus === 'active') {
      profile.isAvailable = Boolean(isAvailable);
    }

    await profile.save();

    res.json({ success: true, message: 'Profile updated successfully', profile });
  } catch (err) {
    logger.error(`Update assistant profile error: ${err.message}`);
    res.status(500).json({ message: 'Failed to update assistant profile', error: err.message });
  }
});

// ─── PUT /api/assistant/status ──────────────────────────────────────────────
// Toggle online/available status
router.put('/status', protect, validate(assistantStatusSchema), async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const profile = await AssistantProfile.findOne({ userId: req.user._id });

    if (!profile) return res.status(404).json({ message: 'Assistant profile not found' });

    if (isAvailable && profile.assistantStatus !== 'active') {
      return res.status(403).json({
        message: 'Your assistant account is pending approval and cannot go Available yet.',
        assistantStatus: profile.assistantStatus,
      });
    }

    profile.isAvailable = Boolean(isAvailable);
    await profile.save();

    res.json({
      success: true,
      message: `Assistant is now ${isAvailable ? 'Available' : 'Unavailable'}`,
      isAvailable: profile.isAvailable,
      assistantStatus: profile.assistantStatus,
    });
  } catch (err) {
    logger.error(`Toggle assistant status error: ${err.message}`);
    res.status(500).json({ message: 'Failed to update status', error: err.message });
  }
});

// ─── GET /api/assistant/earnings ────────────────────────────────────────────
// Get assistant earnings breakdown & transaction summary
router.get('/earnings', protect, async (req, res) => {
  try {
    const profile = await AssistantProfile.findOne({ userId: req.user._id }).lean();
    if (!profile) return res.status(404).json({ message: 'Assistant profile not found' });

    // Completed bookings count and net calculation
    const bookings = await AssistantBooking.find({
      assistantId: req.user._id,
      status: 'completed',
    }).select('cost payment createdAt scheduledDate hospital').sort({ completedAt: -1 }).lean();

    const grossEarnings = bookings.reduce((sum, b) => sum + (b.cost?.total || 0), 0);
    const platformCommission = Math.round(grossEarnings * 0.10);
    const netEarnings = grossEarnings - platformCommission;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthBookings = bookings.filter(b => new Date(b.createdAt) >= startOfMonth);
    const thisMonthGross = thisMonthBookings.reduce((sum, b) => sum + (b.cost?.total || 0), 0);
    const thisMonthCommission = Math.round(thisMonthGross * 0.10);
    const thisMonthNet = thisMonthGross - thisMonthCommission;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayBookings = bookings.filter(b => new Date(b.createdAt) >= startOfToday);
    const todayGross = todayBookings.reduce((sum, b) => sum + (b.cost?.total || 0), 0);
    const todayCommission = Math.round(todayGross * 0.10);
    const todayNet = todayGross - todayCommission;

    res.json({
      walletBalance: profile.walletBalance || 0,
      totalGross: grossEarnings,
      platformCommission,
      netEarnings,
      todayNet,
      thisMonthNet,
      totalCompleted: bookings.length,
      rating: profile.rating || { avg: 5.0, count: 0 },
      recentBookings: bookings.slice(0, 10),
    });
  } catch (err) {
    logger.error(`Get assistant earnings error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch earnings', error: err.message });
  }
});

// ─── POST /api/assistant/withdraw-demo ──────────────────────────────────────
// Simulated demo withdrawal
router.post('/withdraw-demo', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    const withdrawAmount = Number(amount);

    if (!withdrawAmount || withdrawAmount <= 0) {
      return res.status(400).json({ message: 'Valid withdrawal amount is required' });
    }

    const profile = await AssistantProfile.findOne({ userId: req.user._id });
    if (!profile) return res.status(404).json({ message: 'Assistant profile not found' });

    if ((profile.walletBalance || 0) < withdrawAmount) {
      return res.status(400).json({
        message: `Insufficient balance. Available balance: Rs. ${profile.walletBalance || 0}`,
      });
    }

    profile.walletBalance -= withdrawAmount;
    await profile.save();

    res.json({
      success: true,
      message: `Demo withdrawal of Rs. ${withdrawAmount} successfully credited to bank account ${profile.bankDetails?.accountNumber || 'Primary Bank'}. (SIMULATED)`,
      remainingBalance: profile.walletBalance,
      reference: `DEMO-WDR-${Date.now().toString().slice(-6)}`,
    });
  } catch (err) {
    logger.error(`Withdraw demo error: ${err.message}`);
    res.status(500).json({ message: 'Withdrawal failed', error: err.message });
  }
});

// ─── POST /api/assistant/search ─────────────────────────────────────────────
// Patient searches for available assistants matching hospital, categories, date/urgent
router.post('/search', validate(searchAssistantSchema), async (req, res) => {
  try {
    const { hospital, serviceCategories = [], isUrgent = false, scheduledDate, startTime } = req.body;

    const query = {
      assistantStatus: 'active',
    };

    if (hospital) {
      query.hospitalsCovered = { $in: [new RegExp(hospital.trim(), 'i')] };
    }

    if (serviceCategories.length > 0) {
      query.serviceCategories = { $in: serviceCategories };
    }

    if (isUrgent) {
      // Urgent requests require assistant to be currently available (online)
      query.isAvailable = true;
    }

    const assistants = await AssistantProfile.find(query)
      .populate('userId', 'name email phone avatar gender')
      .sort({ 'rating.avg': -1, totalBookings: -1, experienceYears: -1 })
      .lean();

    // Filter out assistants who already have an active/conflicting booking on that date if not urgent
    let filtered = assistants;
    if (!isUrgent && scheduledDate) {
      const searchDay = new Date(scheduledDate);
      searchDay.setHours(0, 0, 0, 0);
      const nextDay = new Date(searchDay);
      nextDay.setDate(nextDay.getDate() + 1);

      const busyBookings = await AssistantBooking.find({
        status: { $in: ['confirmed', 'in_progress'] },
        scheduledDate: { $gte: searchDay, $lt: nextDay },
      }).select('assistantId').lean();

      const busyAssistantIds = new Set(busyBookings.map(b => String(b.assistantId)));
      filtered = assistants.filter(a => !busyAssistantIds.has(String(a.userId?._id || a.userId)));
    }

    res.json({
      count: filtered.length,
      assistants: filtered,
    });
  } catch (err) {
    logger.error(`Search assistant error: ${err.message}`);
    res.status(500).json({ message: 'Failed to search assistants', error: err.message });
  }
});

// ─── GET /api/assistant (or /api/assistants) ──────────────────────────────────
// Public endpoint backing AC01's FindAssistant.tsx / BookAssistant.tsx
router.get('/', async (req, res) => {
  try {
    const {
      hospital,
      category,
      search,
      language,
      minExperience,
      feeMin,
      feeMax,
      minRating,
      sortBy = 'relevance',
      city,
    } = req.query;

    const query = {
      assistantStatus: 'active',
    };

    if (hospital && hospital !== 'All') {
      query.hospitalsCovered = { $in: [new RegExp(hospital.trim(), 'i')] };
    }

    if (city && city !== 'All') {
      const cityRegex = new RegExp(city.trim(), 'i');
      query.$or = [
        { operatingCity: cityRegex },
        { hospitalsCovered: { $in: [cityRegex] } },
      ];
    }

    if (category && category !== 'All') {
      query.serviceCategories = { $in: [new RegExp(category.trim(), 'i')] };
    }

    if (language) {
      query.languages = { $in: [new RegExp(language.trim(), 'i')] };
    }

    if (minExperience) {
      query.experienceYears = { $gte: Number(minExperience) };
    }

    if (feeMin || feeMax) {
      query.pricePerHour = {};
      if (feeMin) query.pricePerHour.$gte = Number(feeMin);
      if (feeMax) query.pricePerHour.$lte = Number(feeMax);
    }

    if (minRating) {
      query['rating.avg'] = { $gte: Number(minRating) };
    }

    let sortObj = { isAvailable: -1, 'rating.avg': -1, totalBookings: -1 };
    if (sortBy === 'rating') sortObj = { 'rating.avg': -1 };
    else if (sortBy === 'experience') sortObj = { experienceYears: -1 };
    else if (sortBy === 'price_asc') sortObj = { pricePerHour: 1 };
    else if (sortBy === 'price_desc') sortObj = { pricePerHour: -1 };

    let assistants = await AssistantProfile.find(query)
      .populate('userId', 'name email phone avatar gender')
      .sort(sortObj)
      .lean();

    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      assistants = assistants.filter(a => {
        const name = (a.userId?.name || '').toLowerCase();
        const bio = (a.bio || '').toLowerCase();
        const cats = (a.serviceCategories || []).join(' ').toLowerCase();
        const hosps = (a.hospitalsCovered || []).join(' ').toLowerCase();
        return name.includes(s) || bio.includes(s) || cats.includes(s) || hosps.includes(s);
      });
    }

    // Map into frontend-friendly camelCase projection per AC01 §3 / AC03 §4.1
    const mapped = assistants.map(a => ({
      _id: a._id,
      assistantId: a.userId?._id || a.userId,
      name: a.userId?.name || 'Hospital Assistant',
      profilePhoto: a.userId?.avatar || a.profilePhoto || null,
      serviceCategories: a.serviceCategories || [],
      experienceYears: a.experienceYears || 1,
      pricePerHour: a.pricePerHour || 150,
      pricePerFullDay: a.pricePerFullDay || 1000,
      rating: a.rating?.avg ? Number(a.rating.avg) : 5.0,
      reviewsCount: a.rating?.count || 0,
      bookingsCompleted: a.totalBookings || 0,
      isAvailable: a.isAvailable ?? true,
      operatingCity: a.operatingCity || 'Jabalpur',
      hospitalsCovered: a.hospitalsCovered || [],
      languages: a.languages || ['Hindi', 'English'],
      bio: a.bio || '',
      isDocumentVerified: Boolean(a.isDocumentVerified || a.policeVerificationDocUrl),
      certifications: a.certifications || [],
      experienceTypes: a.experienceTypes || [],
      extraSkills: a.extraSkills || {},
      policeVerificationStatus: a.policeVerificationStatus || 'verified',
      healthCertification: a.healthCertification || { isVaccinated: true, isCertifiedFit: true },
      onTimeRate: a.onTimeRate || 98,
      trainedEmergencyAdmissions: a.trainedEmergencyAdmissions ?? true,
    }));

    res.json({
      assistants: mapped,
      total: mapped.length,
    });
  } catch (err) {
    logger.error(`Get assistants list error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch assistants', error: err.message });
  }
});

// ─── GET /api/assistant/:id ─────────────────────────────────────────────────
// Get public profile of a single assistant with reviews
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Search by assistantId or profile._id
    let profile = await AssistantProfile.findOne({
      $or: [{ userId: id }, { _id: id }],
    })
      .populate('userId', 'name avatar phone gender email')
      .lean();

    if (!profile) {
      return res.status(404).json({ message: 'Assistant not found' });
    }

    // Fetch recent reviews
    const recentReviews = await AssistantBooking.find({
      assistantId: profile.userId?._id || profile.userId,
      status: 'completed',
      'ratingByPatient.stars': { $exists: true, $gt: 0 },
    })
      .select('ratingByPatient hospital scheduledDate createdAt')
      .populate('patientId', 'name avatar')
      .sort({ completedAt: -1 })
      .limit(10)
      .lean();

    const formattedAssistant = {
      _id: profile._id,
      assistantId: profile.userId?._id || profile.userId,
      name: profile.userId?.name || 'Hospital Assistant',
      phone: profile.userId?.phone || '',
      email: profile.userId?.email || '',
      profilePhoto: profile.userId?.avatar || profile.profilePhoto || null,
      serviceCategories: profile.serviceCategories || [],
      experienceYears: profile.experienceYears || 1,
      pricePerHour: profile.pricePerHour || 150,
      pricePerFullDay: profile.pricePerFullDay || 1000,
      rating: profile.rating?.avg ? Number(profile.rating.avg) : 5.0,
      reviewsCount: profile.rating?.count || 0,
      bookingsCompleted: profile.totalBookings || 0,
      isAvailable: profile.isAvailable ?? true,
      operatingCity: profile.operatingCity || 'Jabalpur',
      hospitalsCovered: profile.hospitalsCovered || [],
      languages: profile.languages || ['Hindi', 'English'],
      bio: profile.bio || '',
      isDocumentVerified: Boolean(profile.isDocumentVerified || profile.policeVerificationDocUrl),
      certifications: profile.certifications || [],
      experienceTypes: profile.experienceTypes || [],
      extraSkills: profile.extraSkills || {},
      policeVerificationStatus: profile.policeVerificationStatus || (profile.policeVerificationDocUrl ? 'verified' : 'verified'),
      healthCertification: profile.healthCertification || {
        isVaccinated: true,
        vaccines: ['COVID-19 Booster', 'Hepatitis B'],
        isCertifiedFit: true,
      },
      onTimeRate: profile.onTimeRate || 98,
      completionRate: profile.completionRate || 99,
      repeatClientsCount: profile.repeatClientsCount || 12,
      trainedEmergencyAdmissions: profile.trainedEmergencyAdmissions ?? true,
      badgeIdentifier: profile.badgeIdentifier || 'FindMedi Blue Lanyard & Attendant ID',
      dayInWorkDescription: profile.dayInWorkDescription || '',
      createdAt: profile.createdAt || new Date('2024-01-15'),
      availableDays: profile.availableDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      availableTimeSlots: profile.availableTimeSlots || [{ start: '09:00 AM', end: '06:00 PM' }],
    };

    res.json({
      assistant: formattedAssistant,
      reviews: recentReviews,
    });
  } catch (err) {
    logger.error(`Get assistant by ID error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch assistant details', error: err.message });
  }
});

export default router;
