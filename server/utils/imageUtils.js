import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024;

const getUploadDir = (subDir = '') => {
  const baseDir = path.join(__dirname, '..', 'public', 'uploads', subDir);
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return baseDir;
};

export const validateFile = (file, type = 'image') => {
  const allowedTypes = type === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_DOCUMENT_TYPES;
  const maxSize = type === 'image' ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;
  
  if (!allowedTypes.includes(file.mimetype)) {
    return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: `File too large. Max size: ${maxSize / 1024 / 1024}MB` };
  }
  
  return { valid: true };
};

export const processAndSaveImage = async (file, options = {}) => {
  const {
    width = 800,
    height = 800,
    quality = 80,
    format = 'jpeg',
    outputDir = 'images',
  } = options;

  const uploadDir = getUploadDir(outputDir);
  const filename = `${uuidv4()}.${format}`;
  const filepath = path.join(uploadDir, filename);

  let pipeline = sharp(file.buffer)
    .resize(width, height, { fit: 'inside', withoutEnlargement: true });

  if (format === 'jpeg' || format === 'jpg') {
    pipeline = pipeline.jpeg({ quality });
  } else if (format === 'png') {
    pipeline = pipeline.png({ quality: Math.min(quality, 100) });
  } else if (format === 'webp') {
    pipeline = pipeline.webp({ quality });
  }

  await pipeline.toFile(filepath);

  return {
    filename,
    filepath: `/uploads/${outputDir}/${filename}`,
    originalName: file.originalname,
    size: fs.statSync(filepath).size,
    width,
    height,
    format,
  };
};

export const compressImage = async (file, options = {}) => {
  const { quality = 70, format = 'jpeg' } = options;
  
  const uploadDir = getUploadDir('compressed');
  const filename = `compressed-${uuidv4()}.${format}`;
  const filepath = path.join(uploadDir, filename);

  let pipeline = sharp(file.buffer);
  
  if (format === 'jpeg' || format === 'jpg') {
    pipeline = pipeline.jpeg({ quality });
  } else if (format === 'png') {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else if (format === 'webp') {
    pipeline = pipeline.webp({ quality });
  }

  await pipeline.toFile(filepath);

  return {
    filename,
    filepath: `/uploads/compressed/${filename}`,
    size: fs.statSync(filepath).size,
  };
};

export const generateThumbnail = async (file, size = 150) => {
  const uploadDir = getUploadDir('thumbnails');
  const filename = `thumb-${uuidv4()}.jpg`;
  const filepath = path.join(uploadDir, filename);

  await sharp(file.buffer)
    .resize(size, size, { fit: 'cover' })
    .jpeg({ quality: 60 })
    .toFile(filepath);

  return {
    filename,
    filepath: `/uploads/thumbnails/${filename}`,
    size: fs.statSync(filepath).size,
  };
};

export const getImageMetadata = async (file) => {
  const metadata = await sharp(file.buffer).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: file.size,
    hasAlpha: metadata.hasAlpha,
  };
};

export const convertToJPEG = async (file) => {
  const uploadDir = getUploadDir('converted');
  const filename = `converted-${uuidv4()}.jpeg`;
  const filepath = path.join(uploadDir, filename);

  await sharp(file.buffer)
    .jpeg({ quality: 90 })
    .toFile(filepath);

  return {
    filename,
    filepath: `/uploads/converted/${filename}`,
    size: fs.statSync(filepath).size,
  };
};

export const deleteFile = async (filepath) => {
  const fullPath = path.join(process.cwd(), 'public', filepath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    return true;
  }
  return false;
};

export const processMedicalFile = async (file, type = 'image') => {
  const validation = validateFile(file, type);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  if (type === 'image') {
    return processAndSaveImage(file, { width: 1200, height: 1200, quality: 85 });
  } else if (type === 'xray') {
    return processAndSaveImage(file, { width: 1920, height: 1920, quality: 90, format: 'png' });
  } else if (type === 'document') {
    const uploadDir = getUploadDir('documents');
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const filepath = path.join(uploadDir, filename);
    
    fs.writeFileSync(filepath, file.buffer);
    
    return {
      filename,
      filepath: `/uploads/documents/${filename}`,
      originalName: file.originalname,
      size: file.size,
    };
  }
};
