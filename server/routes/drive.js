import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect } from '../middleware/auth.js';
import { isConfigured, getAuthUrl, exchangeCodeForTokens, uploadFileToDrive } from '../services/driveService.js';
import { getISTDateString } from '../utils/dateUtils.js';
import User from '../models/User.js';
import Record from '../models/Record.js';
import Notification from '../models/Notification.js';

import jwt from 'jsonwebtoken';

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

router.get('/status', protect, async (req, res, next) => {
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

router.get('/auth-url', protect, (req, res, next) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({ error: 'Google Drive is not configured on the server.' });
    }
    const state = JSON.stringify({ userId: req.user.id });
    const url = getAuthUrl(Buffer.from(state).toString('base64'));
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

    let userId = null;
    if (state) {
      try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
        userId = decodedState.userId;
      } catch (e) {}
    }

    if (!userId && req.cookies?.token) {
      try {
        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (e) {}
    }

    if (!userId) {
      return res.redirect(`${clientUrl}/#/upload?drive=error&reason=unauthorized`);
    }

    const tokens = await exchangeCodeForTokens(code);
    await User.findByIdAndUpdate(userId, { driveTokens: tokens });

    res.redirect(`${clientUrl}/#/upload?drive=connected`);
  } catch (err) {
    console.error('Drive callback error:', err);
    res.redirect(`${clientUrl}/#/upload?drive=error&reason=${encodeURIComponent(err.message)}`);
  }
});

router.delete('/disconnect', protect, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $unset: { driveTokens: '' } });
    res.json({ success: true, message: 'Google Drive disconnected.' });
  } catch (error) {
    next(error);
  }
});

router.post('/upload', protect, upload.single('file'), async (req, res, next) => {
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
