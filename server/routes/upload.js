import express from 'express';
import multer from 'multer';
import path from 'path';
import Record from '../models/Record.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { uploadFileToCloudinary } from '../services/cloudinaryService.js';

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

    const cloudResult = await uploadFileToCloudinary(
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
      date: new Date().toISOString().split('T')[0],
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
          size: req.file.size,
          format: path.extname(req.file.originalname).replace('.', '') || cloudResult.format,
          mimeType: req.file.mimetype,
          storedIn: 'cloudinary',
        },
        date: new Date().toISOString().split('T')[0],
      },
    });

    await Notification.create({
      title: 'File Uploaded',
      message: `Your file "${req.file.originalname}" has been uploaded successfully`,
      type: 'records',
      read: false,
      userId: req.user._id,
      date: new Date().toISOString().split('T')[0],
    });

    res.json({
      success: true,
      url: cloudResult.url,
      filename: req.file.originalname,
      size: req.file.size,
      format: path.extname(req.file.originalname).replace('.', '') || cloudResult.format,
      fileId: cloudResult.fileId,
      storedIn: 'cloudinary',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
