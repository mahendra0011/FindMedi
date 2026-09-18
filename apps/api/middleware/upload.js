import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { validateMagicBytes as napiValidateMagicBytes, NATIVE_AVAILABLE } from '../services/napiImageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALLOWED_ALL_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];

// Max file sizes
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOC_SIZE = 10 * 1024 * 1024;  // 10MB
const MAX_ALL_SIZE = 10 * 1024 * 1024;  // 10MB

// Ensure upload directories exist
const uploadDirs = {
  avatars: path.join(__dirname, '..', 'public', 'uploads', 'avatars'),
  documents: path.join(__dirname, '..', 'public', 'uploads', 'documents'),
  signatures: path.join(__dirname, '..', 'public', 'uploads', 'signatures'),
  reports: path.join(__dirname, '..', 'public', 'uploads', 'reports'),
};

Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir = uploadDirs.documents;

    if (file.fieldname === 'avatar' || file.fieldname === 'profile') {
      uploadDir = uploadDirs.avatars;
    } else if (file.fieldname === 'signature') {
      uploadDir = uploadDirs.signatures;
    } else if (file.fieldname === 'report' || file.fieldname === 'labReport') {
      uploadDir = uploadDirs.reports;
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename: remove special chars, spaces
    const sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\s+/g, '_');
    const uniqueSuffix = uuidv4();
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  },
});

// File filter
function fileFilter(allowedTypes) {
  return (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
  };
}

// Magic byte signatures for content-based file type verification
const MAGIC_BYTES = {
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  'image/gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])],
  'image/webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF....WEBP checked separately
  'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
  'application/msword': [Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x00, 0x00])],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    // ZIP signature (docx is a zip)
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  ],
};

const isZipType = (mimetype) => mimetype.includes('officedocument');

export function validateFileContent(buffer, mimetype) {
  // Use native Rust validation when the napi module is available
  if (NATIVE_AVAILABLE) {
    return napiValidateMagicBytes(buffer, mimetype).valid;
  }

  // Fallback: pure JavaScript magic byte validation
  if (!buffer || buffer.length < 4) return false;

  const signatures = MAGIC_BYTES[mimetype];
  if (!signatures) return true; // Unknown type — allow (MIME filter already checked)

  for (const sig of signatures) {
    if (buffer.slice(0, sig.length).equals(sig)) {
      // For WebP, verify the full RIFF....WEBP pattern
      if (mimetype === 'image/webp' && buffer.length >= 12 &&
          buffer.slice(8, 12).toString('ascii') === 'WEBP') {
        return true;
      }
      if (mimetype !== 'image/webp') return true;
    }
  }
  return false;
}

export function requireValidatedFile(allowedTypes, maxFileSize) {
  return (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: `File type ${req.file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      });
    }
    if (!validateFileContent(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({
        message: `File content does not match its MIME type. The file may be corrupted or malicious.`,
      });
    }
    next();
  };
}

// Multer instances for different use cases
export const uploadAvatar = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: fileFilter(ALLOWED_IMAGE_TYPES),
}).single('avatar');

export const uploadSignature = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: fileFilter(ALLOWED_IMAGE_TYPES),
}).single('signature');

export const uploadDocument = multer({
  storage,
  limits: { fileSize: MAX_DOC_SIZE },
  fileFilter: fileFilter(ALLOWED_DOC_TYPES),
}).single('document');

export const uploadReport = multer({
  storage,
  limits: { fileSize: MAX_ALL_SIZE },
  fileFilter: fileFilter(ALLOWED_ALL_TYPES),
}).single('report');

export const uploadMultiple = multer({
  storage,
  limits: { fileSize: MAX_ALL_SIZE },
  fileFilter: fileFilter(ALLOWED_ALL_TYPES),
}).array('files', 10);

// Generic upload middleware with field name and type
export const upload = (fieldName, options = {}) => {
  const {
    types = ALLOWED_ALL_TYPES,
    maxSize = MAX_ALL_SIZE,
    maxCount = 1,
  } = options;

  return (req, res, next) => {
    const uploader = multer({
      storage,
      limits: { fileSize: maxSize },
      fileFilter: fileFilter(types),
    }).single(fieldName);

    uploader(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            message: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
          });
        }
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  };
};

// Multer error handler middleware
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Unexpected file field' });
    }
    return res.status(400).json({ message: err.message });
  }
  next(err);
};