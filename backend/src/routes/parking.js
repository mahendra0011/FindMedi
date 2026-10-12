import express from 'express';
import ParkingTransaction, { VEHICLE_TYPES } from '../models/ParkingTransaction.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { generateTimestampedId } from '../utils/idGenerator.js';
import logger from '../config/logger.js';

const router = express.Router();
router.use(protect);

const actorId = (req) => req.user._id ?? req.user.id;
const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

// ─── List & Active Vehicles ────────────────────────────────────────────────
router.get('/vehicles', authorize('records:read', 'operations:read', 'security:read', 'admin:read'), async (req, res) => {
  try {
    const filter = { ...tenantFilter(req) };
    if (req.query.status) filter.paymentStatus = String(req.query.status);
    if (req.query.vehicleNumber) filter.vehicleNumber = new RegExp(String(req.query.vehicleNumber), 'i');

    const rows = await ParkingTransaction.find(filter).sort({ entryTime: -1 }).limit(200).lean();

    const activeParked = rows.filter((r) => r.paymentStatus === 'ACTIVE_PARKED').length;
    const totalCollected = rows
      .filter((r) => r.paymentStatus === 'PAID_EXITED')
      .reduce((s, r) => s + (r.calculatedFee || 0), 0);

    return res.json({ total: rows.length, activeParked, totalCollected, transactions: rows });
  } catch (err) {
    logger.error(`Parking list error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// ─── Entry Gate (ANPR / RFID Check-In) ──────────────────────────────────────
router.post('/entry', authorize('operations:write', 'security:manage', 'admin:manage'), async (req, res) => {
  try {
    const { vehicleNumber, vehicleType, entryGate, slotCode, driverPhone } = req.body || {};
    if (!vehicleNumber) return res.status(400).json({ message: 'vehicleNumber required' });

    const ticketNumber = generateTimestampedId('PRK');
    const isAmbulance = vehicleType === 'AMBULANCE';

    const row = await ParkingTransaction.create({
      hospitalId: req.user.hospitalId,
      ticketNumber,
      vehicleNumber: vehicleNumber.toUpperCase().replace(/\s+/g, ''),
      vehicleType: vehicleType || 'FOUR_WHEELER',
      entryGate: entryGate || 'GATE-1-MAIN',
      slotCode: slotCode || 'P-01',
      isAmbulanceExempt: isAmbulance,
      driverPhone: driverPhone || '',
      paymentStatus: 'ACTIVE_PARKED',
    });

    await auditLog('parking_vehicle_entered', actorId(req), {
      ticketNumber,
      vehicleNumber: row.vehicleNumber,
      isAmbulance,
      ip: req.ip,
    });

    return res.status(201).json(row);
  } catch (err) {
    logger.error(`Parking entry error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
});

// ─── Exit Gate & Automated Billing Calculation ──────────────────────────────
router.post('/exit/:id', authorize('operations:write', 'security:manage', 'admin:manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { exitGate, paymentMode } = req.body || {};

    const transaction = await ParkingTransaction.findOne({ _id: id, ...tenantFilter(req) });
    if (!transaction) return res.status(404).json({ message: 'Vehicle transaction not found' });
    if (transaction.paymentStatus !== 'ACTIVE_PARKED') {
      return res.status(400).json({ message: 'Vehicle has already exited' });
    }

    const exitTime = new Date();
    const durationMinutes = Math.max(1, Math.round((exitTime.getTime() - new Date(transaction.entryTime).getTime()) / (1000 * 60)));

    let calculatedFee = 0;
    if (transaction.isAmbulanceExempt || transaction.vehicleType === 'STAFF_DOCTOR') {
      calculatedFee = 0;
      transaction.paymentStatus = 'EXEMPT_EXITED';
    } else {
      // Standard hospital parking tariff:
      // First 30 mins free. Then ₹30 for 1st hour, ₹20 per subsequent hour.
      if (durationMinutes > 30) {
        const hours = Math.ceil(durationMinutes / 60);
        calculatedFee = 30 + Math.max(0, hours - 1) * 20;
      }
      transaction.paymentStatus = 'PAID_EXITED';
    }

    transaction.exitTime = exitTime;
    transaction.exitGate = exitGate || 'GATE-2-EXIT';
    transaction.durationMinutes = durationMinutes;
    transaction.calculatedFee = calculatedFee;
    transaction.paymentMode = paymentMode || (transaction.isAmbulanceExempt ? 'EXEMPT' : 'UPI_QR');

    await transaction.save();

    await auditLog('parking_vehicle_exited', actorId(req), {
      ticketNumber: transaction.ticketNumber,
      vehicleNumber: transaction.vehicleNumber,
      durationMinutes,
      fee: calculatedFee,
      ip: req.ip,
    });

    return res.json(transaction);
  } catch (err) {
    logger.error(`Parking exit error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
});

export default router;
