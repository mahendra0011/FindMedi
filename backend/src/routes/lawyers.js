import express from 'express';
import LawyerProfile from '../models/LawyerProfile.js';
import LawyerBooking from '../models/LawyerBooking.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { validate, searchLawyerSchema, lawyerStatusSchema } from '../utils/validate.js';
import {
  searchMatchingLawyers,
  CATEGORY_MAP_TO_DISPLAY,
  CATEGORY_MAP_TO_SLUG,
} from '../services/lawyerService.js';
import logger from '../config/logger.js';

const router = express.Router();

function formatLawyerResponse(profile) {
  const user = profile.userId || {};
  return {
    _id: user._id ? String(user._id) : String(profile._id),
    profileId: String(profile._id),
    name: user.name || 'Advocate',
    profilePhoto: user.avatar || '',
    practiceCategories: (profile.practiceCategories || []).map((c) => CATEGORY_MAP_TO_DISPLAY[c] || c),
    yearsOfPractice: profile.yearsOfPractice || 1,
    barCouncilNumber: profile.barCouncilNumber || '',
    consultationFee: profile.consultationFee || 800,
    followUpFee: profile.followUpFee || 500,
    consultationModes: profile.consultationModes || ['video', 'phone', 'chat'],
    rating: profile.rating?.avg || 5.0,
    reviewsCount: profile.rating?.count || 0,
    casesHandled: profile.casesHandled || Math.max(25, (profile.yearsOfPractice || 1) * 20),
    isAvailable: Boolean(profile.isAvailable),
    jurisdictionCity: profile.jurisdictionCity || 'Delhi',
    operatingCity: profile.operatingCity || profile.jurisdictionCity || 'Jabalpur',
    courtsPracticedIn: profile.courtsPracticedIn || [],
    languages: profile.languages || ['Hindi', 'English'],
    bio: profile.bio || '',
    phone: user.phone || '',
    email: user.email || '',
    stateBarCouncil: profile.stateBarCouncil || '',
    yearOfEnrollment: profile.yearOfEnrollment || '',
    availableDays: profile.availableDays || [],
    availableTimeSlots: profile.availableTimeSlots || [],
    favorableOutcomesRate: profile.favorableOutcomesRate || 88,
    notableCases: profile.notableCases || [],
    practiceType: profile.practiceType || 'independent',
    yearsAtCurrentPractice: profile.yearsAtCurrentPractice || 3,
    avgResponseMinutes: profile.avgResponseMinutes || 12,
    currentSessionStatus: profile.currentSessionStatus || (profile.isAvailable ? 'available' : 'offline'),
    faqs: profile.faqs || [],
    awards: profile.awards || [],
    isPoliceVerified: Boolean(profile.isPoliceVerified),
    lawFirmName: profile.lawFirmName || '',
  };
}

// ─── GET /api/lawyers (Public list backing FindLawyer.tsx) ────────────────
router.get('/', async (req, res) => {
  try {
    const {
      category,
      city,
      search,
      mode,
      language,
      minExperience,
      feeMin,
      feeMax,
      minRating,
      sortBy = 'relevance',
    } = req.query;

    const query = {
      lawyerStatus: 'active',
    };

    if (city && city !== 'All' && city.trim()) {
      const cityRegex = new RegExp(city.trim(), 'i');
      query.$or = [{ operatingCity: cityRegex }, { jurisdictionCity: cityRegex }];
    }

    if (category && category !== 'All') {
      const slug = CATEGORY_MAP_TO_SLUG[category] || category;
      const display = CATEGORY_MAP_TO_DISPLAY[category] || category;
      query.practiceCategories = { $in: [category, slug, display] };
    }

    if (mode) {
      query.consultationModes = mode;
    }

    if (minExperience) {
      query.yearsOfPractice = { $gte: Number(minExperience) };
    }

    if (feeMin !== undefined || feeMax !== undefined) {
      query.consultationFee = {};
      if (feeMin !== undefined && feeMin !== '') query.consultationFee.$gte = Number(feeMin);
      if (feeMax !== undefined && feeMax !== '') query.consultationFee.$lte = Number(feeMax);
    }

    if (minRating) {
      query['rating.avg'] = { $gte: Number(minRating) };
    }

    if (language) {
      query.languages = new RegExp(language, 'i');
    }

    let profiles = await LawyerProfile.find(query)
      .populate('userId', 'name email phone avatar address')
      .lean();

    // In-memory text search on name or bio
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      profiles = profiles.filter((p) => {
        const name = (p.userId?.name || '').toLowerCase();
        const bio = (p.bio || '').toLowerCase();
        const city = (p.jurisdictionCity || '').toLowerCase();
        const cats = (p.practiceCategories || []).join(' ').toLowerCase();
        return name.includes(q) || bio.includes(q) || city.includes(q) || cats.includes(q);
      });
    }

    // Sort
    if (sortBy === 'rating') {
      profiles.sort((a, b) => (b.rating?.avg || 0) - (a.rating?.avg || 0));
    } else if (sortBy === 'experience') {
      profiles.sort((a, b) => (b.yearsOfPractice || 0) - (a.yearsOfPractice || 0));
    } else if (sortBy === 'fee' || sortBy === 'fee_low') {
      profiles.sort((a, b) => (a.consultationFee || 0) - (b.consultationFee || 0));
    } else if (sortBy === 'fee_high') {
      profiles.sort((a, b) => (b.consultationFee || 0) - (a.consultationFee || 0));
    }

    const lawyers = profiles.map(formatLawyerResponse);

    res.json({
      success: true,
      total: lawyers.length,
      lawyers,
    });
  } catch (err) {
    logger.error(`Error listing lawyers: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch lawyers' });
  }
});

// ─── GET /api/lawyer/profile ──────────────────────────────────────────────
// Get logged-in lawyer's profile
router.get('/profile', protect, async (req, res) => {
  try {
    const profile = await LawyerProfile.findOne({ userId: req.user._id }).populate(
      'userId',
      'name email phone avatar address'
    );
    if (!profile) {
      return res.status(404).json({ message: 'Lawyer profile not found' });
    }
    res.json({ success: true, profile });
  } catch (err) {
    logger.error(`Error fetching lawyer profile: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch lawyer profile' });
  }
});

// ─── PUT /api/lawyer/profile ──────────────────────────────────────────────
// Update lawyer profile (practice, fees, bio, availability)
router.put('/profile', protect, async (req, res) => {
  try {
    const profile = await LawyerProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: 'Lawyer profile not found' });
    }

    const {
      bio,
      practiceCategories,
      courtsPracticedIn,
      languages,
      consultationModes,
      consultationFee,
      followUpFee,
      freeFirstConsultation,
      sessionDuration,
      availableDays,
      availableTimeSlots,
      acceptsUrgent,
      bankDetails,
      jurisdictionCity,
      lawFirmName,
    } = req.body;

    if (bio !== undefined) profile.bio = bio;
    if (practiceCategories) profile.practiceCategories = practiceCategories;
    if (courtsPracticedIn) profile.courtsPracticedIn = courtsPracticedIn;
    if (languages) profile.languages = languages;
    if (consultationModes) profile.consultationModes = consultationModes;
    if (consultationFee !== undefined) profile.consultationFee = Number(consultationFee);
    if (followUpFee !== undefined) profile.followUpFee = Number(followUpFee);
    if (freeFirstConsultation !== undefined) profile.freeFirstConsultation = Boolean(freeFirstConsultation);
    if (sessionDuration !== undefined) profile.sessionDuration = Number(sessionDuration);
    if (availableDays) profile.availableDays = availableDays;
    if (availableTimeSlots) profile.availableTimeSlots = availableTimeSlots;
    if (acceptsUrgent !== undefined) profile.acceptsUrgent = Boolean(acceptsUrgent);
    if (jurisdictionCity) profile.jurisdictionCity = jurisdictionCity;
    if (lawFirmName !== undefined) profile.lawFirmName = lawFirmName;
    if (bankDetails) {
      profile.bankDetails = {
        ...profile.bankDetails,
        ...bankDetails,
      };
    }

    await profile.save();
    res.json({ success: true, message: 'Profile updated successfully', profile });
  } catch (err) {
    logger.error(`Error updating lawyer profile: ${err.message}`);
    res.status(500).json({ message: 'Failed to update lawyer profile' });
  }
});

// ─── PUT /api/lawyer/status ───────────────────────────────────────────────
// Toggle Available/Unavailable
router.put('/status', protect, validate(lawyerStatusSchema), async (req, res) => {
  try {
    const profile = await LawyerProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: 'Lawyer profile not found' });
    }

    if (profile.lawyerStatus !== 'active') {
      return res.status(403).json({
        message: 'Cannot toggle availability. Your Bar Council profile is pending verification or not active.',
      });
    }

    profile.isAvailable = req.body.isAvailable;
    await profile.save();

    res.json({
      success: true,
      message: `Status set to ${profile.isAvailable ? 'Available' : 'Unavailable'}`,
      isAvailable: profile.isAvailable,
    });
  } catch (err) {
    logger.error(`Error updating lawyer status: ${err.message}`);
    res.status(500).json({ message: 'Failed to update availability' });
  }
});

// ─── GET /api/lawyer/earnings ─────────────────────────────────────────────
// Get lawyer earnings & wallet summary
router.get('/earnings', protect, async (req, res) => {
  try {
    const profile = await LawyerProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: 'Lawyer profile not found' });
    }

    const completedBookings = await LawyerBooking.find({
      lawyerId: req.user._id,
      status: 'completed',
    }).sort({ completedAt: -1 });

    const totalGross = completedBookings.reduce((sum, b) => sum + (b.fee || 0), 0);
    const platformCommission = Math.round(totalGross * 0.1); // 10%
    const netPayable = totalGross - platformCommission;

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const thisMonthBookings = completedBookings.filter((b) => b.completedAt && new Date(b.completedAt) >= startOfMonth);
    const thisMonthGross = thisMonthBookings.reduce((sum, b) => sum + (b.fee || 0), 0);

    res.json({
      success: true,
      totalEarnings: profile.totalEarnings || totalGross,
      walletBalance: profile.walletBalance || netPayable,
      platformCommission,
      netPayable,
      thisMonthEarnings: thisMonthGross,
      completedConsultationsCount: completedBookings.length,
      history: completedBookings.slice(0, 30).map((b) => ({
        bookingId: b._id,
        bookingNumber: b.bookingNumber,
        category: b.category,
        consultationMode: b.consultationMode,
        completedAt: b.completedAt,
        fee: b.fee,
        net: Math.round((b.fee || 0) * 0.9),
      })),
    });
  } catch (err) {
    logger.error(`Error fetching lawyer earnings: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch earnings' });
  }
});

// ─── POST /api/lawyer/withdraw-demo ───────────────────────────────────────
// Simulate withdrawal (demo payout)
router.post('/withdraw-demo', protect, async (req, res) => {
  try {
    const profile = await LawyerProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: 'Lawyer profile not found' });
    }

    const balance = profile.walletBalance || 0;
    if (balance <= 0) {
      return res.status(400).json({ message: 'No withdrawable balance available' });
    }

    // Amount optional hai — na bhejne par pura balance withdraw hota hai (backwards compatible)
    const requested =
      req.body?.amount !== undefined && req.body?.amount !== null && req.body?.amount !== ''
        ? Number(req.body.amount)
        : balance;

    if (!Number.isFinite(requested) || requested <= 0) {
      return res.status(400).json({ message: 'Enter a valid withdrawal amount' });
    }
    if (requested > balance) {
      return res.status(400).json({
        message: `Insufficient balance. Available: Rs. ${balance.toLocaleString('en-IN')}`,
      });
    }

    profile.walletBalance = balance - requested;
    await profile.save();

    const reference = `DEMO-WDR-${Date.now().toString().slice(-6)}`;

    res.json({
      success: true,
      message: `Demo withdrawal of Rs. ${requested.toLocaleString('en-IN')} requested to bank account ending in ${(profile.bankDetails?.accountNumber || 'XXXX').slice(-4)}`,
      withdrawnAmount: requested,
      newBalance: profile.walletBalance,
      reference,
      transactionRef: reference,
    });
  } catch (err) {
    logger.error(`Error processing lawyer demo payout: ${err.message}`);
    res.status(500).json({ message: 'Failed to process demo payout' });
  }
});

// ─── POST /api/lawyer/search ──────────────────────────────────────────────
// Search matching lawyers (public / authenticated)
router.post('/search', validate(searchLawyerSchema), async (req, res) => {
  try {
    const lawyers = await searchMatchingLawyers(req.body);
    res.json({
      success: true,
      count: lawyers.length,
      lawyers,
    });
  } catch (err) {
    logger.error(`Error searching lawyers: ${err.message}`);
    res.status(500).json({ message: 'Failed to search lawyers' });
  }
});

// ─── GET /api/lawyer/:id ──────────────────────────────────────────────────
// Public lawyer profile with ratings and reviews
router.get('/:id', async (req, res) => {
  try {
    let profile = await LawyerProfile.findById(req.params.id).populate(
      'userId',
      'name avatar email phone'
    );

    if (!profile) {
      profile = await LawyerProfile.findOne({ userId: req.params.id }).populate(
        'userId',
        'name avatar email phone'
      );
    }

    if (!profile) {
      return res.status(404).json({ message: 'Lawyer profile not found' });
    }

    // Fetch public reviews
    const reviews = await LawyerBooking.find({
      lawyerId: profile.userId._id,
      'ratingByUser.stars': { $exists: true, $gt: 0 },
    })
      .populate('userId', 'name avatar')
      .sort({ 'ratingByUser.ratedAt': -1 })
      .limit(20)
      .select('ratingByUser scheduledDate category consultationMode userId');

    res.json({
      success: true,
      lawyer: formatLawyerResponse(profile),
      profile,
      reviews: reviews.map((r) => ({
        stars: r.ratingByUser?.stars,
        comment: r.ratingByUser?.comment,
        date: r.ratingByUser?.ratedAt || r.scheduledDate,
        clientName: r.userId?.name ? `${r.userId.name.charAt(0)}***` : 'Anonymous Client',
        category: r.category,
        consultationMode: r.consultationMode,
        isVerifiedBooking: true,
      })),
    });
  } catch (err) {
    logger.error(`Error fetching lawyer public profile: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch lawyer profile' });
  }
});

export default router;
