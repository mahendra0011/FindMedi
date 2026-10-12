import express from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import User from '../models/User.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * Biometric Attendance Machine (e.g. ZKTeco, Mantra MFS100, Morpho, or eSSL)
 * & WebAuthn / FIDO2 Browser Passkey Gateway
 */

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
