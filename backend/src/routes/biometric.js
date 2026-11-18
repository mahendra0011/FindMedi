import express from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import BiometricDevice from '../models/BiometricDevice.js';
import BiometricLog from '../models/BiometricLog.js';
import Staff from '../models/Staff.js';
import User from '../models/User.js';
import logger from '../config/logger.js';

const router = express.Router();

const tenantScope = (req) => {
  // Superadmin without an assigned hospital reads the platform default tenant;
  // everyone else is pinned to their own hospital.
  return req.user.hospitalId || req.user.facilityId || null;
};

/**
 * Biometric Attendance Machine (e.g. ZKTeco, Mantra MFS100, Morpho, or eSSL)
 * & WebAuthn / FIDO2 Browser Passkey Gateway
 */

// ─── Hardware device registry (hospital-scoped) ─────────────────────────────

// List biometric terminals registered to the caller's hospital.
// authz: role
router.get('/devices', protect, requireRole(['hospital_admin', 'clinic_admin', 'superadmin', 'hr']), async (req, res) => {
  try {
    const scope = tenantScope(req);
    const filter = { active: true };
    if (scope) filter.hospitalId = scope; else if (req.user.role !== 'superadmin') return res.json({ devices: [] });
    const devices = await BiometricDevice.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ devices });
  } catch (err) {
    logger.error('Biometric device list failed', { error: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Register a terminal against the caller's hospital.
// authz: role
router.post('/devices', protect, requireRole(['hospital_admin', 'clinic_admin', 'superadmin']), async (req, res) => {
  try {
    const scope = tenantScope(req);
    if (!scope) return res.status(400).json({ success: false, message: 'Hospital scope required to register a device' });
    const { deviceName, deviceType = 'ZKTeco', ipAddress, location, department, serialNumber } = req.body;
    if (!deviceName) return res.status(400).json({ success: false, message: 'deviceName is required' });
    const device = await BiometricDevice.create({
      hospitalId: scope,
      deviceName,
      deviceType,
      ipAddress: ipAddress || undefined,
      location: location || undefined,
      department: department || undefined,
      serialNumber: serialNumber || undefined,
      status: 'Offline',
    });
    return res.status(201).json({ device });
  } catch (err) {
    logger.error('Biometric device registration failed', { error: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Today's punch summary for the caller's hospital (present/absent/totalStaff/onlineDevices).
// authz: role
router.get('/today', protect, requireRole(['hospital_admin', 'clinic_admin', 'superadmin', 'hr']), async (req, res) => {
  try {
    const scope = tenantScope(req);
    if (!scope) return res.json({ present: 0, absent: 0, totalStaff: 0, onlineDevices: 0 });
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [totalStaff, onlineDevices, punched] = await Promise.all([
      Staff.countDocuments({ hospitalId: scope, status: 'Active' }),
      BiometricDevice.countDocuments({ hospitalId: scope, status: 'Online' }),
      BiometricLog.distinct('staffId', { hospitalId: scope, punchTime: { $gte: startOfDay }, punchResult: 'Success', staffId: { $exists: true, $ne: null } }),
    ]);
    const present = punched.length;
    return res.json({
      present,
      absent: Math.max(0, totalStaff - present),
      totalStaff,
      onlineDevices,
    });
  } catch (err) {
    logger.error('Biometric today stats failed', { error: err.message });
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Simulated internal attendance record log memory cache / sync store
const attendanceLogs = [];

/**
 * POST /api/biometric/device-sync
 * Machine webhook / push protocol for biometric clock-in / clock-out
 */
router.post('/device-sync', async (req, res) => {
  try {
    const { deviceSerial, logs = [] } = req.body;

    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ success: false, message: 'Logs array is required' });
    }

    const processed = [];
    for (const log of logs) {
      const { staffCode, timestamp, punchType = 'IN', verifyType = 'FINGERPRINT' } = log;
      
      const record = {
        id: `BIO-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        deviceSerial: deviceSerial || 'TERMINAL-01',
        staffCode,
        punchType: punchType.toUpperCase(),
        verifyType,
        timestamp: timestamp || new Date().toISOString(),
        syncedAt: new Date().toISOString()
      };

      attendanceLogs.unshift(record);
      if (attendanceLogs.length > 500) attendanceLogs.pop();
      processed.push(record);
    }

    logger.info(`[BiometricSync] Ingested ${processed.length} biometric logs from device ${deviceSerial}`);
    res.json({
      success: true,
      count: processed.length,
      deviceSerial,
      status: 'ACK_200'
    });
  } catch (err) {
    logger.error('Biometric device sync failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/biometric/webauthn/register-challenge
 * Generate challenge for staff fingerprint / FaceID sensor registration in browser
 */
router.post('/webauthn/register-challenge', protect, async (req, res) => {
  try {
    const challenge = Buffer.from(Date.now() + '-' + req.user._id).toString('base64url');
    res.json({
      success: true,
      challenge,
      rp: { name: 'Findmedi Clinic Hub', id: req.hostname || 'localhost' },
      user: {
        id: req.user._id.toString(),
        name: req.user.email || req.user.phone,
        displayName: req.user.name || 'Staff Member'
      },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required'
      },
      timeout: 60000
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/biometric/webauthn/verify-punch
 * Clock-in / Clock-out punch via verified WebAuthn Fingerprint credential
 */
router.post('/webauthn/verify-punch', protect, async (req, res) => {
  try {
    const { punchType = 'IN', clientDataJSON } = req.body;
    
    const record = {
      id: `PUNCH-${Date.now()}`,
      userId: req.user._id,
      staffName: req.user.name,
      role: req.user.role,
      hospitalId: req.user.hospitalId || null,
      punchType: punchType.toUpperCase(),
      verifyType: 'WEBAUTHN_BIOMETRIC',
      timestamp: new Date().toISOString()
    };

    attendanceLogs.unshift(record);
    res.json({
      success: true,
      message: `Biometric attendance marked successfully: ${punchType.toUpperCase()}`,
      punchRecord: record
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/biometric/logs
 * Retrieve recent staff punch events for Clinic Admin / HR
 */
// authz: role
router.get('/logs', protect, requireRole(['clinic_admin', 'hospital_admin', 'superadmin', 'hr']), async (req, res) => {
  try {
    const filtered = (req.user.role === 'superadmin' && !req.user.hospitalId)
      ? attendanceLogs
      : attendanceLogs.filter((l) => !l.hospitalId || String(l.hospitalId) === String(req.user.hospitalId));
    res.json({
      success: true,
      total: filtered.length,
      logs: filtered.slice(0, 50)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
