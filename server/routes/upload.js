import express from 'express';
import multer from 'multer';
import path from 'path';
import Record from '../models/Record.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { uploadFileToCloudinary } from '../services/cloudinaryService.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Proxy download route — redirect to stored file URL (Cloudinary or legacy Drive)
router.get('/download/:fileId', protect, async (req, res) => {
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
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', protect, upload.single('file'), async (req, res) => {
  console.log('Upload request received:', {
    user: req.user?.name,
    userRole: req.user?.role,
    fileName: req.file?.originalname,
    fileSize: req.file?.size,
    mimeType: req.file?.mimetype,
  });

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
    console.error('Upload error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

export default router;
