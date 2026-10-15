import express from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AmbulanceTrip, AmbulanceVehicleLog, VEHICLE_LOG_TYPES } from '../models/AmbulanceTrip.js';
import Ambulance from '../models/Ambulance.js';
import { protect, restrictTo, authorize } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import { auditLog } from '../middleware/audit.js';
import { idempotencyGuard } from '../middleware/idempotency.js';

// Checklist §2: ambulance trip sheet + fuel/maintenance running log.
// A driver writes their OWN trips and vehicle logs (they hold the odometer
// reading); admins read across the fleet and close out trips.

const router = express.Router();

const OBJECT_ID = /^[0-9a-f]{24}$/i;

/** The caller's ambulance row, or null. Shared by driver-scoped handlers. */
const callerAmbulance = async (req) => Ambulance.findOne({ userId: req.user._id }).select('_id hospitalId').lean();

const tripSchema = z.object({
  patientId: z.string().regex(OBJECT_ID).optional(),
  emergencyRequestId: z.string().regex(OBJECT_ID).optional(),
  fromLocation: z.string().trim().min(1).max(300),
  toLocation: z.string().trim().min(1).max(300),
  odometerStartKm: z.number().min(0).optional(),
  startedAt: z.coerce.date().optional(),
  notes: z.string().trim().max(1000).optional(),
}).strict();

// authz: role
router.post('/trips', protect, restrictTo('ambulance', 'hospital_admin', 'superadmin'), idempotencyGuard({ prefix: 'amb-trip' }), validate(tripSchema), async (req, res) => {
  try {
    let ambulanceId = req.body.ambulanceId;
    if (!ambulanceId) {
      const amb = await callerAmbulance(req);
      if (!amb) return res.status(404).json({ message: 'No ambulance linked to this account' });
      ambulanceId = amb._id;
    }
    const row = await AmbulanceTrip.create({
      hospitalId: req.user.hospitalId || undefined,
      ambulanceId,
      driverId: req.user._id,
      patientId: req.body.patientId || null,
      emergencyRequestId: req.body.emergencyRequestId || null,
      fromLocation: req.body.fromLocation,
      toLocation: req.body.toLocation,
      odometerStartKm: req.body.odometerStartKm,
      startedAt: req.body.startedAt || new Date(),
      notes: req.body.notes || '',
    });
    await auditLog('ambulance_trip_started', req.user._id, { recordId: row._id, ambulanceId: String(ambulanceId), ip: req.ip });
    return res.status(201).json(row);
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

// authz: role
router.get('/trips', protect, authorize('beds:read', 'audit:read'), async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'ambulance') {
      filter.driverId = req.user._id;
    } else if (req.query.ambulanceId && OBJECT_ID.test(String(req.query.ambulanceId))) {
      filter.ambulanceId = String(req.query.ambulanceId);
    }
    if (req.query.status) filter.status = String(req.query.status);
    const rows = await AmbulanceTrip.find(filter).sort({ startedAt: -1 }).limit(200).lean();
    return res.json({ total: rows.length, trips: rows });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

const endTripSchema = z.object({
  odometerEndKm: z.number().min(0),
  notes: z.string().trim().max(1000).optional(),
}).strict();

// authz: role
router.put('/trips/:id/end', protect, restrictTo('ambulance', 'hospital_admin', 'superadmin'), validate(endTripSchema), async (req, res) => {
  try {
    const row = await AmbulanceTrip.findById(req.params.id);
    if (!row) return res.status(404).json({ message: 'Trip not found' });
    if (req.user.role === 'ambulance' && row.driverId.toString() !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not your trip' });
    }
    if (row.status !== 'ongoing') return res.status(409).json({ message: `Trip already ${row.status}` });
    if (row.odometerStartKm != null && req.body.odometerEndKm < row.odometerStartKm) {
      return res.status(400).json({ message: 'odometerEndKm cannot be less than odometerStartKm' });
    }
    row.odometerEndKm = req.body.odometerEndKm;
    if (req.body.notes) row.notes = req.body.notes;
    row.endedAt = new Date();
    row.status = 'completed';
    await row.save();
    await auditLog('ambulance_trip_completed', req.user._id, { recordId: row._id, ip: req.ip });
    return res.json(row);
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

const logSchema = z.object({
  ambulanceId: z.string().regex(OBJECT_ID).optional(),
  type: z.enum(VEHICLE_LOG_TYPES),
  at: z.coerce.date().optional(),
  odometerKm: z.number().min(0).optional(),
  litres: z.number().min(0).optional(),
  costInr: z.number().min(0).optional(),
  vendor: z.string().trim().max(200).optional(),
  description: z.string().trim().max(1000).optional(),
}).strict();

// authz: role
router.post('/logs', protect, restrictTo('ambulance', 'hospital_admin', 'superadmin'), validate(logSchema), async (req, res) => {
  try {
    let ambulanceId = req.body.ambulanceId;
    if (!ambulanceId) {
      const amb = await callerAmbulance(req);
      if (!amb) return res.status(404).json({ message: 'No ambulance linked to this account' });
      ambulanceId = amb._id;
    }
    const row = await AmbulanceVehicleLog.create({
      hospitalId: req.user.hospitalId || undefined,
      ambulanceId,
      type: req.body.type,
      at: req.body.at || new Date(),
      odometerKm: req.body.odometerKm,
      litres: req.body.litres,
      costInr: req.body.costInr,
      vendor: req.body.vendor || '',
      description: req.body.description || '',
      recordedBy: req.user._id,
    });
    await auditLog('ambulance_log_written', req.user._id, { recordId: row._id, type: req.body.type, ip: req.ip });
    return res.status(201).json(row);
  } catch (err) { return res.status(400).json({ message: err.message }); }
});

// authz: role
router.get('/logs', protect, authorize('beds:read', 'audit:read'), async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'ambulance') {
      const amb = await callerAmbulance(req);
      if (!amb) return res.json({ total: 0, logs: [] });
      filter.ambulanceId = amb._id;
    } else if (req.query.ambulanceId && OBJECT_ID.test(String(req.query.ambulanceId))) {
      filter.ambulanceId = String(req.query.ambulanceId);
    }
    if (req.query.type) filter.type = String(req.query.type);
    const rows = await AmbulanceVehicleLog.find(filter).sort({ at: -1 }).limit(200).lean();
    return res.json({ total: rows.length, logs: rows });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

// Per-vehicle fuel spend + km covered summary (fuel-theft / efficiency view).
// authz: role
router.get('/stats', protect, authorize('beds:read', 'audit:read'), async (req, res) => {
  try {
    if (!req.query.ambulanceId || !OBJECT_ID.test(String(req.query.ambulanceId))) {
      return res.status(400).json({ message: 'ambulanceId is required' });
    }
    const ambObjectId = new mongoose.Types.ObjectId(String(req.query.ambulanceId));
    const [fuel, trips] = await Promise.all([
      AmbulanceVehicleLog.aggregate([
        { $match: { ambulanceId: ambObjectId, type: 'fuel' } },
        { $group: { _id: null, litres: { $sum: '$litres' }, cost: { $sum: '$costInr' }, fills: { $sum: 1 } } },
      ]),
      AmbulanceTrip.aggregate([
        { $match: { ambulanceId: ambObjectId, status: 'completed' } },
        { $group: { _id: null, trips: { $sum: 1 }, km: { $sum: { $subtract: ['$odometerEndKm', '$odometerStartKm'] } } } },
      ]),
    ]);
    const f = fuel[0] || { litres: 0, cost: 0, fills: 0 };
    const t = trips[0] || { trips: 0, km: 0 };
    return res.json({
      ambulanceId: String(ambObjectId),
      fuel: { litres: f.litres, costInr: f.cost, fills: f.fills },
      trips: { completed: t.trips, kmCovered: t.km },
      kmPerLitre: f.litres > 0 && t.km > 0 ? Number((t.km / f.litres).toFixed(2)) : null,
    });
  } catch (err) { return res.status(500).json({ message: err.message }); }
});

export default router;
