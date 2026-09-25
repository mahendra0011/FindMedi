import express from 'express';
import mongoose from 'mongoose';
import DeliveryPartner from '../models/DeliveryPartner.js';
import PharmacyDelivery from '../models/PharmacyDelivery.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Validate userId query presence before auth so callers get a clear 400
// even without a token; authenticated callers still go through `protect`.
const requireUserId = (req, res, next) => {
  const userId = req.query?.userId || req.query?.user_id;
  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }
  next();
};

async function findPartnerByUserId(userId) {
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return null;
    const byUser = await DeliveryPartner.findOne({ userId }).lean();
    if (byUser) return byUser;
    // Fallback: caller may have passed the DeliveryPartner _id directly.
    const byId = await DeliveryPartner.findById(userId).lean();
    return byId || null;
  } catch {
    return null;
  }
}

// GET /delivery/history?userId= -> {tasks:[{_id,orderId,status,pickupAddress,dropAddress,deliveryOtp,createdAt}]}
router.get('/history', requireUserId, protect, async (req, res) => {
  try {
    const { userId } = req.query;
    const partner = await findPartnerByUserId(userId);
    if (!partner) return res.json({ tasks: [] });
    let deliveries = [];
    try {
      deliveries = await PharmacyDelivery.find({ deliveryPartnerId: partner._id })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    } catch {
      return res.json({ tasks: [] });
    }
    const tasks = (deliveries || []).map((d) => ({
      _id: d._id,
      orderId: d.orderId,
      status: d.status,
      serviceType: d.serviceType || 'pharmacy',
      pickupName: d.pickupName,
      pickupAddress: d.pickupAddress,
      dropAddress: d.dropAddress,
      patientName: d.patientName,
      deliveryOtp: d.deliveryOtp,
      deliveryFee: d.deliveryFee || d.orderRef?.deliveryFee || 0,
      createdAt: d.createdAt,
      deliveredAt: d.deliveredAt,
    }));
    return res.json({ tasks });
  } catch {
    return res.json({ tasks: [] });
  }
});

// GET /delivery/orders?userId= -> {orders:[{_id,orderId,customerName,total,status,createdAt,items}]}
router.get('/orders', requireUserId, protect, async (req, res) => {
  try {
    const { userId } = req.query;
    const partner = await findPartnerByUserId(userId);
    if (!partner) return res.json({ orders: [] });
    let deliveries = [];
    try {
      deliveries = await PharmacyDelivery.find({ deliveryPartnerId: partner._id })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('orderRef')
        .populate('labBookingId', 'bookingId patientName tests visitType reportUrl')
        .lean();
    } catch {
      return res.json({ orders: [] });
    }
    const orders = [];
    for (const d of deliveries || []) {
      const o = d.orderRef;
      if (o && typeof o === 'object' && o.orderId) {
        orders.push({
          _id: o._id,
          orderId: o.orderId,
          customerName: o.patientName || o.customerName || '',
          total: o.total ?? 0,
          status: o.status || d.status,
          createdAt: o.orderDate || o.createdAt || d.createdAt,
          items: o.items || [],
          serviceType: 'pharmacy',
          dropAddress: d.dropAddress,
          pickupAddress: d.pickupAddress,
          pickupName: d.pickupName,
        });
        continue;
      }
      // Lab report / sample run — pharmacy order nahi hai, task ke apne fields use karo.
      if (d.serviceType && d.serviceType !== 'pharmacy') {
        const lb = d.labBookingId && typeof d.labBookingId === 'object' ? d.labBookingId : null;
        orders.push({
          _id: d._id,
          orderId: d.orderId,
          customerName: d.patientName || lb?.patientName || '',
          total: d.deliveryFee || 0,
          status: d.status,
          createdAt: d.createdAt,
          items: (lb?.tests || []).map((t) => ({ name: t })),
          serviceType: d.serviceType,
          dropAddress: d.dropAddress,
          pickupAddress: d.pickupAddress,
          pickupName: d.pickupName,
        });
      }
    }
    return res.json({ orders });
  } catch {
    return res.json({ orders: [] });
  }
});

// GET /delivery/zones?userId= -> {zones:[{_id,name,area,pinCode,isActive}]}
router.get('/zones', requireUserId, protect, async (req, res) => {
  try {
    const { userId } = req.query;
    const partner = await findPartnerByUserId(userId);
    let zoneNames = [];
    let baseId = userId;
    if (partner) {
      baseId = String(partner._id);
      if (Array.isArray(partner.workZone)) zoneNames = partner.workZone;
    }
    // Fallback to User.deliveryZone when partner has no workZone.
    if (zoneNames.length === 0) {
      try {
        if (mongoose.Types.ObjectId.isValid(userId)) {
          const user = await User.findById(userId).select('deliveryZone').lean();
          if (user && Array.isArray(user.deliveryZone)) zoneNames = user.deliveryZone;
        }
      } catch {
        // ignore, return empty below
      }
    }
    const isOnline = partner?.isOnline ?? false;
    const zones = (zoneNames || [])
      .filter((z) => typeof z === 'string' && z.trim().length > 0)
      .map((z, i) => ({
        _id: `${baseId}-${i}`,
        name: z,
        area: z,
        pinCode: '',
        isActive: isOnline,
        note: 'Derived from workZone; no separate geofence entity',
      }));
    return res.json({ zones });
  } catch {
    return res.json({ zones: [] });
  }
});

// GET /delivery/earnings?userId= -> {earnings:[{_id,amount,type,description,referenceId,createdAt}]}
router.get('/earnings', requireUserId, protect, async (req, res) => {
  try {
    const { userId } = req.query;
    const partner = await findPartnerByUserId(userId);
    if (!partner) return res.json({ earnings: [] });
    let deliveries = [];
    try {
      deliveries = await PharmacyDelivery.find({
        deliveryPartnerId: partner._id,
        status: 'Delivered',
      })
        .sort({ deliveredAt: -1, createdAt: -1 })
        .limit(100)
        .populate('orderRef')
        .lean();
    } catch {
      return res.json({ earnings: [] });
    }
    const earnings = (deliveries || []).map((d) => {
      const o = d.orderRef && typeof d.orderRef === 'object' ? d.orderRef : null;
      // Lab report/sample tasks me payout task ke apne deliveryFee me hota hai.
      const amount =
        d.deliveryFee > 0 ? d.deliveryFee : (o && typeof o.deliveryFee === 'number' && o.deliveryFee > 0 ? o.deliveryFee : 0);
      const isLab = (d.serviceType || 'pharmacy') !== 'pharmacy';
      return {
        _id: d._id,
        amount,
        type: isLab ? 'lab_report' : 'delivery',
        description: `${isLab ? 'Lab report delivery' : 'Delivery'} ${d.orderId || ''}`.trim(),
        referenceId: d.orderId || String(d._id),
        serviceType: d.serviceType || 'pharmacy',
        createdAt: d.deliveredAt || d.updatedAt || d.createdAt,
      };
    });
    return res.json({ earnings });
  } catch {
    return res.json({ earnings: [] });
  }
});

// GET /delivery/documents?userId= -> {documents:[{_id,name,type,url,status,uploadedAt}]}
router.get('/documents', requireUserId, protect, async (req, res) => {
  try {
    const { userId } = req.query;
    const partner = await findPartnerByUserId(userId);
    if (!partner) return res.json({ documents: [] });
    const fields = [
      'aadharDoc',
      'panDoc',
      'drivingLicenseDoc',
      'vehicleRcDoc',
      'insuranceDoc',
      'photo',
    ];
    const status = partner.status === 'approved' ? 'approved' : 'pending';
    const uploadedAt = partner.updatedAt || partner.createdAt;
    const documents = [];
    for (const field of fields) {
      const url = partner[field];
      if (typeof url === 'string' && url.trim().length > 0) {
        documents.push({
          _id: `${String(partner._id)}-${field}`,
          name: field,
          type: field,
          url,
          status,
          uploadedAt,
        });
      }
    }
    return res.json({ documents });
  } catch {
    return res.json({ documents: [] });
  }
});

// GET /delivery/reviews?userId= -> {reviews:[{_id,rating,comment,patientName,createdAt}]}
router.get('/reviews', requireUserId, protect, async (req, res) => {
  try {
    const { userId } = req.query;
    const partner = await findPartnerByUserId(userId);
    if (!partner) return res.json({ reviews: [] });
    const tasks = await PharmacyDelivery.find({
      deliveryPartnerId: partner._id,
      ratingByUser: { $exists: true, $ne: null },
    }).sort({ deliveredAt: -1 }).limit(50).lean().catch(() => []);
    const reviews = (tasks || []).filter((t) => t.ratingByUser?.stars).map((t) => ({
      _id: t._id,
      rating: t.ratingByUser.stars,
      comment: t.ratingByUser.comment || '',
      patientName: t.patientName || '',
      createdAt: t.deliveredAt || t.updatedAt,
    }));
    return res.json({ reviews });
  } catch {
    return res.json({ reviews: [] });
  }
});

// ─── Tech Exp 02: Multi-Stop Medicine Delivery Optimization (TSP) ───
// Optimizes stops order to minimize cold-chain transit time and fuel
router.post('/optimize-route', protect, async (req, res) => {
  try {
    const { pharmacyLocation, deliveryStops } = req.body;
    if (!pharmacyLocation || !Array.isArray(deliveryStops) || deliveryStops.length === 0) {
      return res.status(400).json({ message: 'pharmacyLocation and deliveryStops array are required' });
    }

    const { getOptimizedRoute } = await import('../lib/valhallaRouting.js');

    // Build locations array: origin pharmacy + delivery drop points
    const locations = [
      { lat: pharmacyLocation.lat, lon: pharmacyLocation.lng },
      ...deliveryStops.map(s => ({ lat: s.lat, lon: s.lng })),
    ];

    const routeResult = await getOptimizedRoute(locations, 'auto');

    res.json({
      success: true,
      optimizationEngine: 'Valhalla TSP',
      totalStops: deliveryStops.length,
      estimatedTotalDurationMinutes: Math.ceil(routeResult.durationSeconds / 60),
      estimatedTotalDistanceKm: Number((routeResult.distanceMeters / 1000).toFixed(2)),
      polyline: routeResult.polyline,
      maneuvers: routeResult.maneuvers,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
