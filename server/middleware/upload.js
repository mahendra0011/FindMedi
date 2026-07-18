import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
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