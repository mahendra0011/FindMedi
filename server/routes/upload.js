import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Record from '../models/Record.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { uploadFileToCloudinary } from '../services/cloudinaryService.js';
import { uploadFileToDrive, isConfigured as isDriveConfigured } from '../services/driveService.js';
import { getISTDateString } from '../utils/dateUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'documents');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Save file locally (fallback when Cloudinary fails)
const saveFileLocally = (file, baseUrl) => {
  const ext = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '') || '.bin';
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(filepath, file.buffer);
  return {
    url: `${baseUrl}/uploads/documents/${filename}`,
    filename: file.originalname,
    fileId: filename,
    size: file.size,
    format: ext.replace('.', ''),
    mimeType: file.mimetype,
    storedIn: 'local',
  };
};

const router = express.Router();

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Invalid file type. Only images, PDFs, documents, and text files are allowed.'), false);
    }
    cb(null, true);
  },
});

// Proxy download route — redirect to stored file URL (Cloudinary or legacy Drive)
router.get('/download/:fileId', protect, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const record = await Record.findOne({
      'data.uploadedFile.fileId': fileId,
      patientId: req.user._id,
    });

    if (!record) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }

    const fileUrl = record.data.uploadedFile.url;
    if (fileUrl) {
      res.redirect(fileUrl);
    } else {
      res.status(404).json({ error: 'File URL not found' });
    }
  } catch (error) {
    next(error);
  }
});

router.post('/', protect, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const storedIn = req.body?.storedIn || 'cloudinary';
    const clientUploadType = req.body?.uploadType;
    const detectRecordType = (type) => {
      if (type && ['prescription', 'lab_report', 'medical_image', 'xray', 'bill_invoice', 'discharge_summary', 'document'].includes(type)) {
        return type;
      }
      // Fallback by mimetype
      let fallback = 'prescription';
      if (req.file.mimetype.startsWith('image/')) {
        fallback = 'lab_report';
      } else if (req.file.mimetype === 'application/pdf') {
        fallback = 'discharge_summary';
      }
      return fallback;
    };

    // ─── Upload to user's Google Drive ──────────────────────────────────────
    if (storedIn === 'drive') {
      if (!isDriveConfigured()) {
        return res.status(503).json({ error: 'Google Drive is not configured on the server.' });
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

      const recordType = detectRecordType(clientUploadType);

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

      return res.json({
        success: true,
        url: driveResult.url,
        filename: driveResult.filename,
        size: driveResult.size,
        format: driveResult.format,
        fileId: driveResult.fileId,
        storedIn: 'drive',
        uploadType: recordType,
        recordId: record._id,
      });
    }

    // ─── Upload to Cloudinary (default) w/ local fallback ───────────────────
    let cloudResult;
    try {
      cloudResult = await uploadFileToCloudinary(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
    } catch (cloudErr) {
      console.warn('Cloudinary upload failed, using local storage:', cloudErr.message);
      cloudResult = saveFileLocally(req.file, `${req.protocol}://${req.get('host')}`);
    }

    const recordType = detectRecordType(clientUploadType);

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
          filename: req.file.originalname,
          url: cloudResult.url,
          fileId: cloudResult.fileId,
          size: cloudResult.size || req.file.size,
          format: path.extname(req.file.originalname).replace('.', '') || cloudResult.format || '',
          mimeType: req.file.mimetype,
          storedIn: cloudResult.storedIn || 'cloudinary',
        },
        date: getISTDateString(),
      },
    });

    await Notification.create({
      title: 'File Uploaded',
      message: `Your file "${req.file.originalname}" has been uploaded successfully`,
      type: 'records',
      read: false,
      userId: req.user._id,
      date: getISTDateString(),
    });

    res.json({
      success: true,
      url: cloudResult.url,
      filename: req.file.originalname,
      size: cloudResult.size || req.file.size,
      format: path.extname(req.file.originalname).replace('.', '') || cloudResult.format || '',
      fileId: cloudResult.fileId,
      storedIn: cloudResult.storedIn || 'cloudinary',
      uploadType: recordType,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
