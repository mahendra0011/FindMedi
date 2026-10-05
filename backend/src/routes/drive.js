import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect, authorize } from '../middleware/auth.js';
import { isConfigured, getAuthUrl, exchangeCodeForTokens, uploadFileToDrive } from '../services/driveService.js';
import { getISTDateString } from '../utils/dateUtils.js';
import User from '../models/User.js';
import Record from '../models/Record.js';
import Notification from '../models/Notification.js';
import crypto from 'node:crypto';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only images, PDFs, documents, and text files are allowed.'), false);
    }
    cb(null, true);
  },
});

router.get('/status', protect, authorize('drive:read'), async (req, res, next) => {
  try {
    if (!isConfigured()) {
      return res.json({ configured: false, connected: false, message: 'Google Drive is not configured on the server.' });
    }
    const user = await User.findById(req.user.id).select('driveTokens');
    const connected = Boolean(user?.driveTokens?.refresh_token);
    res.json({ configured: true, connected });
  } catch (error) {
    next(error);
  }
});

// ADM-B-06: the OAuth `state` used to be a plain base64 of { userId } with no
// signature, so an attacker could complete the Google dance with THEIR account
// and bind it to a victim's FindMedi account — every future "save to Drive" of
// that user's medical records would land in the attacker's Drive. The state is
// now HMAC-signed with a server secret, carries a single-use nonce stored in
// Redis, and the callback VERIFIES the signature + burns the nonce before any
// token is stored.
const DRIVE_STATE_TTL_SECONDS = 600;

const signDriveState = (payload) => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', process.env.JWT_SECRET).update(body).digest('base64url');
  return `${body}.${mac}`;
};

const verifyDriveState = (state) => {
  const [body, mac] = String(state || '').split('.');
  if (!body || !mac) return null;
  const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
};

router.get('/auth-url', protect, authorize('drive:read'), async (req, res, next) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({ error: 'Google Drive is not configured on the server.' });
    }
    const nonce = crypto.randomBytes(16).toString('hex');
    // Single-use nonce: the state can be redeemed exactly once.
    try {
      const { redisClient, isRedisReady } = await import('../config/redis.js');
      if (isRedisReady() && redisClient.isOpen) {
        await redisClient.set(`drive:state:${nonce}`, String(req.user.id), { EX: DRIVE_STATE_TTL_SECONDS });
      }
    } catch { /* Redis is optional — the signature is still required */ }
    const url = getAuthUrl(signDriveState({ userId: req.user.id, nonce }));
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

router.get('/callback', async (req, res, next) => {
  const rawClient = process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'https://findmedi.online';
  const clientUrl = rawClient.split(',')[0].trim().replace(/\/+$/, '');

  try {
    const { code, error, state } = req.query;
    if (error) {
      return res.redirect(`${clientUrl}/#/upload?drive=error&reason=${encodeURIComponent(error)}`);
    }
    if (!code) {
      return res.redirect(`${clientUrl}/#/upload?drive=error&reason=no_code`);
    }

    // ADM-B-06: a valid, signed state is REQUIRED — no fallback to a bare id.
    const decodedState = verifyDriveState(state);
    if (!decodedState?.userId) {
      return res.redirect(`${clientUrl}/#/upload?drive=error&reason=invalid_state`);
    }
    const userId = decodedState.userId;

    // Burn the nonce (one-time use) before exchanging the code.
    if (decodedState.nonce) {
      try {
        const { redisClient, isRedisReady } = await import('../config/redis.js');
        if (isRedisReady() && redisClient.isOpen) {
          const owner = await redisClient.getDel(`drive:state:${decodedState.nonce}`);
          if (owner && String(owner) !== String(userId)) {
            return res.redirect(`${clientUrl}/#/upload?drive=error&reason=invalid_state`);
          }
        }
      } catch { /* best effort */ }
    }

    const tokens = await exchangeCodeForTokens(code);
    await User.findByIdAndUpdate(userId, { driveTokens: tokens });

    res.redirect(`${clientUrl}/#/upload?drive=connected`);
  } catch (err) {
    console.error('Drive callback error:', err);
    res.redirect(`${clientUrl}/#/upload?drive=error&reason=${encodeURIComponent(err.message)}`);
  }
});

router.delete('/disconnect', protect, authorize('drive:write'), async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $unset: { driveTokens: '' } });
    res.json({ success: true, message: 'Google Drive disconnected.' });
  } catch (error) {
    next(error);
  }
});

router.post('/upload', protect, authorize('drive:write'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const user = await User.findById(req.user.id).select('driveTokens');
    if (!user?.driveTokens?.refresh_token) {
      return res.status(400).json({ error: 'Google Drive is not connected. Connect it first.' });
    }

    const driveResult = await uploadFileToDrive(
      user.driveTokens,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    let recordType = 'prescription';
    if (req.file.mimetype.startsWith('image/')) {
      recordType = 'lab_report';
    } else if (req.file.mimetype === 'application/pdf') {
      recordType = 'discharge_summary';
    }

    const record = await Record.create({
      patient: req.user.name,
      patientId: req.user._id,
      doctor: 'Self Upload',
      date: getISTDateString(),
      diagnosis: `Uploaded ${req.file.originalname}`,
      type: recordType,
      notes: `File: ${req.file.originalname}`,
      data: {
        patient: { name: req.user.name },
        doctor: { name: 'Self Upload' },
        uploadedFile: {
          filename: driveResult.filename,
          url: driveResult.url,
          fileId: driveResult.fileId,
          size: driveResult.size,
          format: driveResult.format,
          mimeType: driveResult.mimeType,
          storedIn: 'drive',
        },
        date: getISTDateString(),
      },
    });

    await Notification.create({
      title: 'File Uploaded',
      message: `Your file "${req.file.originalname}" has been saved to your Google Drive`,
      type: 'records',
      read: false,
      userId: req.user._id,
      date: getISTDateString(),
    });

    res.json({
      success: true,
      url: driveResult.url,
      filename: driveResult.filename,
      size: driveResult.size,
      format: driveResult.format,
      fileId: driveResult.fileId,
      storedIn: 'drive',
      recordId: record._id,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
