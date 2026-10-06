import express from 'express';
import RiderProfile from '../models/RiderProfile.js';
import User from '../models/User.js';
import RideBooking from '../models/RideBooking.js';
import TransactionLedger from '../models/TransactionLedger.js';
import { protect, requireRole } from '../middleware/auth.js';
import { validate, riderStatusSchema, riderLocationSchema } from '../utils/validate.js';
import { upsertProviderLocationCache, removeProviderFromCache } from '../lib/h3Cache.js';
import { calculateDistanceKm } from '../lib/geoUtils.js';
import { revealPhi, mergeBankDetails } from '../utils/phiFields.js';
import logger from '../config/logger.js';

const router = express.Router();

// ─── GET /api/rider/profile ─────────────────────────────────────────────────
// Get own rider profile
router.get('/profile', protect, requireRole(['rider']), async (req, res) => {
  try {
    const rider = await RiderProfile.findOne({ userId: req.user._id })
      .select('userId operatingArea operatingCity availableDays availableTimeSlot riderStatus isOnline emergencySupport currentLocation rating settings vehicleId bankDetails govtIdType govtIdNumber drivingLicenseNumber')
      .populate('vehicleId', 'type brand model year color rcNumber insuranceNumber insuranceExpiry isDocumentVerified')
      .populate('userId', 'name email phone avatar address dateOfBirth gender')
      .lean();

    if (!rider) {
      return res.status(404).json({ message: 'Rider profile not found' });
    }

    // P2-9: IDs/bank fields are ciphertext at rest — decrypt, then mask.
    const _gid = revealPhi('RiderProfile', 'govtIdNumber', rider.govtIdNumber);
    const _bd = rider.bankDetails || {};
    const _acc = revealPhi('RiderProfile', 'bankDetails.accountNumber', _bd.accountNumber);
    const _ifsc = revealPhi('RiderProfile', 'bankDetails.ifsc', _bd.ifsc);
    const _upi = revealPhi('RiderProfile', 'bankDetails.upiId', _bd.upiId);
    const safeRider = {
      _id: rider._id,
      userId: rider.userId,
      operatingArea: rider.operatingArea,
      operatingCity: rider.operatingCity,
      availableDays: rider.availableDays,
      availableTimeSlot: rider.availableTimeSlot,
      riderStatus: rider.riderStatus,
      isOnline: rider.isOnline,
      emergencySupport: rider.emergencySupport,
      currentLocation: rider.currentLocation,
      rating: rider.rating,
      settings: rider.settings,
      vehicleId: rider.vehicleId,
      govtIdType: rider.govtIdType,
      govtIdNumber: _gid ? `****${String(_gid).slice(-4)}` : '',
      drivingLicenseNumber: rider.drivingLicenseNumber ? `****${String(rider.drivingLicenseNumber).slice(-4)}` : '',
      bankDetails: rider.bankDetails ? {
        accountHolder: _bd.accountHolder,
        accountNumber: _acc ? `****${String(_acc).slice(-4)}` : '',
        ifsc: _ifsc ? `${String(_ifsc).slice(0, 4)}****` : '',
        upiId: _upi ? `${String(_upi).slice(0, 2)}****` : '',
      } : undefined,
      docs: rider.docs ? Object.fromEntries(Object.entries(rider.docs).map(([key, value]) => [key, { status: value.status, uploadedAt: value.uploadedAt }])) : undefined,
    };
    res.json({ rider: safeRider });
  } catch (err) {
    logger.error(`Get rider profile error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch rider profile', error: err.message });
  }
});

// ─── PUT /api/rider/profile ─────────────────────────────────────────────────
// Update operating area, availability, bank details, or vehicle details
router.put('/profile', protect, requireRole(['rider']), async (req, res) => {
  try {
    const {
      operatingArea,
      availableDays,
      availableTimeSlot,
      bankDetails,
      settings,
      emergencySupport,
    } = req.body;

    const rider = await RiderProfile.findOne({ userId: req.user._id });
    if (!rider) return res.status(404).json({ message: 'Rider profile not found' });

    if (operatingArea) rider.operatingArea = operatingArea;
    if (availableDays) rider.availableDays = availableDays;
    if (availableTimeSlot) rider.availableTimeSlot = availableTimeSlot;
    // P2-9: encrypt genuinely-new bank fields; masked echoes keep stored values.
    if (bankDetails) rider.bankDetails = mergeBankDetails('RiderProfile', rider.bankDetails, bankDetails);
    if (emergencySupport !== undefined) rider.emergencySupport = Boolean(emergencySupport);
    if (settings && typeof settings === 'object') {
      const next = { ...(rider.settings?.toObject?.() || rider.settings || {}) };
      if (settings.waitMinutes !== undefined) next.waitMinutes = Math.max(0, Number(settings.waitMinutes) || 0);
      if (settings.noShowFee !== undefined) next.noShowFee = Math.max(0, Number(settings.noShowFee) || 0);
      if (typeof settings.lateRefund === 'boolean') next.lateRefund = settings.lateRefund;
      if (typeof settings.acAvailable === 'boolean') next.acAvailable = settings.acAvailable;
      if (typeof settings.wheelchairFit === 'boolean') next.wheelchairFit = settings.wheelchairFit;
      if (['local', 'regional', 'intercity'].includes(settings.transferScope)) next.transferScope = settings.transferScope;
      if (typeof settings.payoutUpi === 'string') next.payoutUpi = settings.payoutUpi.trim();
      rider.settings = next;
    }

    await rider.save();

    const safeRider = await RiderProfile.findById(rider._id)
      .select('operatingArea availableDays availableTimeSlot emergencySupport settings riderStatus isOnline currentLocation rating vehicleId userId')
      .populate('vehicleId', 'type brand model year color rcNumber insuranceNumber insuranceExpiry isDocumentVerified')
      .lean();
    res.json({ success: true, message: 'Profile updated successfully', rider: safeRider });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update rider profile', error: err.message });
  }
});

// ─── PUT /api/rider/emergency-toggle ────────────────────────────────────────
// Toggle Emergency Support (Doc 01 §9.3: active rider + non-bike only)
router.put('/emergency-toggle', protect, requireRole(['rider']), async (req, res) => {
  try {
    const { emergencySupport } = req.body;
    const rider = await RiderProfile.findOne({ userId: req.user._id }).populate('vehicleId');
    if (!rider) return res.status(404).json({ message: 'Rider profile not found' });
    if (emergencySupport) {
      if (rider.riderStatus !== 'active') {
        return res.status(403).json({ message: 'Account active hone par hi Emergency Support ON kar sakte ho.' });
      }
      if (rider.vehicleId?.type === 'bike') {
        return res.status(403).json({ message: 'Bike se emergency support nahi milta.' });
      }
    }
    rider.emergencySupport = Boolean(emergencySupport);
    await rider.save();
    res.json({ success: true, emergencySupport: rider.emergencySupport });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/rider/status ──────────────────────────────────────────────────
// Toggle online/offline
router.put('/status', protect, requireRole(['rider']), validate(riderStatusSchema), async (req, res) => {
  try {
    const { isOnline } = req.body;
    const rider = await RiderProfile.findOne({ userId: req.user._id });

    if (!rider) return res.status(404).json({ message: 'Rider profile not found' });

    if (isOnline && rider.riderStatus !== 'active') {
      return res.status(403).json({
        message: 'Your account is pending verification and cannot go online yet.',
        riderStatus: rider.riderStatus,
      });
    }

    rider.isOnline = isOnline;
    if (isOnline) rider.lastLocationAt = new Date();
    await rider.save();

    if (isOnline && rider.currentLocation?.lat && rider.currentLocation?.lng) {
      upsertProviderLocationCache({
        providerId: req.user._id,
        providerType: 'rider',
        lat: rider.currentLocation.lat,
        lng: rider.currentLocation.lng,
      }).catch(() => {});
    } else if (!isOnline) {
      removeProviderFromCache({
        providerId: req.user._id,
        providerType: 'rider',
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: isOnline ? 'You are now Online and can receive rides' : 'You are now Offline',
      isOnline: rider.isOnline,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update online status', error: err.message });
  }
});

// ─── PUT /api/rider/location ────────────────────────────────────────────────
// Update current location
router.put('/location', protect, requireRole(['rider']), validate(riderLocationSchema), async (req, res) => {
  try {
    const { lat, lng, accuracy } = req.body;
    const rider = await RiderProfile.findOne({ userId: req.user._id }).select('_id currentLocation').lean();
    if (!rider) return res.status(404).json({ message: 'Rider profile not found' });
    if (accuracy != null && accuracy > 250) return res.status(422).json({ message: 'Location accuracy is too low to update rider position' });
    const previous = rider.currentLocation?.coordinates;
    const previousAt = rider.currentLocation?.updatedAt ? new Date(rider.currentLocation.updatedAt).getTime() : 0;
    if (Array.isArray(previous) && previous.length === 2 && previousAt > 0) {
      const elapsedSeconds = Math.max((Date.now() - previousAt) / 1000, 1);
      const distanceMeters = calculateDistanceKm(Number(previous[1]), Number(previous[0]), Number(lat), Number(lng)) * 1000;
      const speedKmh = (distanceMeters / elapsedSeconds) * 3.6;
      if (speedKmh > 180) return res.status(422).json({ message: 'Location update exceeds plausible travel speed' });
    }
    const h3Result = await upsertProviderLocationCache({
      providerId: req.user._id,
      providerType: 'rider',
      lat: Number(lat),
      lng: Number(lng),
    });

    const locUpdate = {
      'currentLocation.lat': Number(lat),
      'currentLocation.lng': Number(lng),
      'currentLocation.coordinates': [Number(lng), Number(lat)],
      'currentLocation.h3Index8': h3Result?.h3Index8 || null,
      'currentLocation.h3Index9': h3Result?.h3Index9 || null,
      'currentLocation.updatedAt': new Date(),
      lastLocationAt: new Date(),
    };
    if (accuracy != null) locUpdate['currentLocation.accuracy'] = Number(accuracy);
    await RiderProfile.findOneAndUpdate(
      { _id: rider._id, userId: req.user._id },
      locUpdate
    );

    res.json({ success: true, lat, lng });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update location', error: err.message });
  }
});

// ─── GET /api/rider/earnings ────────────────────────────────────────────────
// Earnings overview
router.get('/earnings', protect, requireRole(['rider']), async (req, res) => {
  try {
    const rider = await RiderProfile.findOne({ userId: req.user._id }).select('_id walletBalance rating');
    if (!rider) return res.status(404).json({ message: 'Rider profile not found' });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [todayEntries, monthEntries, allEntries, completedRidesCount] = await Promise.all([
      TransactionLedger.find({ providerId: req.user._id, source: 'ride', entryType: 'CREDIT', status: 'completed', createdAt: { $gte: todayStart } }).select('netAmount').lean(),
      TransactionLedger.find({ providerId: req.user._id, source: 'ride', entryType: 'CREDIT', status: 'completed', createdAt: { $gte: monthStart } }).select('netAmount commissionAmount').lean(),
      TransactionLedger.find({ providerId: req.user._id, source: 'ride', entryType: 'CREDIT', status: 'completed' }).select('netAmount').lean(),
      TransactionLedger.countDocuments({ providerId: req.user._id, source: 'ride', entryType: 'CREDIT', status: 'completed' }),
    ]);
    const todayNet = todayEntries.reduce((sum, entry) => sum + (entry.netAmount || 0), 0);
    const monthNet = monthEntries.reduce((sum, entry) => sum + (entry.netAmount || 0), 0);
    const platformCommissionMonth = monthEntries.reduce((sum, entry) => sum + (entry.commissionAmount || 0), 0);

    res.json({
      totalEarnings: allEntries.reduce((sum, entry) => sum + (entry.netAmount || 0), 0),
      walletBalance: rider.walletBalance || 0,
      todayRides: todayEntries.length,
      todayNet,
      monthRides: monthEntries.length,
      monthNet,
      platformCommissionMonth,
      totalCompletedRides: completedRidesCount,
      rating: rider.rating || { avg: 5.0, count: 0 },
    });
  } catch (err) {
    logger.error(`Get rider earnings error: ${err.message}`);
    res.status(500).json({ message: 'Failed to fetch earnings', error: err.message });
  }
});

// ─── POST /api/rider/withdraw-demo ──────────────────────────────────────────
// Simulate payout/withdrawal
router.post('/withdraw-demo', protect, requireRole(['rider']), async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const rider = await RiderProfile.findOne({ userId: req.user._id });

    if (!rider) return res.status(404).json({ message: 'Rider profile not found' });
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Enter a valid withdrawal amount' });
    if (!Number.isFinite(amount)) return res.status(400).json({ message: 'Enter a valid withdrawal amount' });

    const balance = rider.walletBalance || 0;
    if (amount > balance) {
      return res.status(400).json({ message: `Insufficient balance. Available: ₹${balance}` });
    }
    const debited = await RiderProfile.findOneAndUpdate(
      { _id: rider._id, walletBalance: { $gte: amount } },
      { $inc: { walletBalance: -amount } },
      { new: true },
    );
    if (!debited) return res.status(409).json({ message: 'Wallet balance changed; refresh and retry' });

    res.json({
      success: true,
      message: `Demo withdrawal of ₹${amount} initiated. Ref: DEMO-PAYOUT-${Math.floor(100000 + Math.random() * 900000)}`,
      newBalance: debited.walletBalance,
    });
  } catch (err) {
    res.status(500).json({ message: 'Withdrawal failed', error: err.message });
  }
});

// ─── POST /api/rider/documents — R-9: re-upload a rejected KYC document ──
router.post('/documents', protect, requireRole(['rider']), async (req, res) => {
  try {
    const { docType, docUrl } = req.body;
    if (!docType || !docUrl) return res.status(400).json({ message: 'docType and docUrl are required' });
    if (!['drivingLicense', 'govtId', 'rc', 'insurance'].includes(docType)) {
      return res.status(400).json({ message: 'Unsupported document type' });
    }
    if (typeof docUrl !== 'string' || docUrl.length > 2048 || !/^https:\/\//i.test(docUrl)) {
      return res.status(400).json({ message: 'A valid secure document URL is required' });
    }
    const rider = await RiderProfile.findOne({ userId: req.user._id });
    if (!rider) return res.status(404).json({ message: 'Rider profile not found' });
    const docs = { ...(rider.docs?.toObject?.() || rider.docs || {}) };
    docs[docType] = { url: docUrl, status: 'pending', uploadedAt: new Date() };
    rider.docs = docs;
    // Re-upload re-opens verification if it was rejected.
    if (rider.riderStatus === 'rejected') rider.riderStatus = 'pending_approval';
    await rider.save();
    const publicDocs = Object.fromEntries(Object.entries(docs).map(([key, value]) => [key, { status: value.status, uploadedAt: value.uploadedAt }]));
    res.json({ success: true, message: 'Document uploaded for verification', docs: publicDocs });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});

export default router;
