/**
 * Native Rust-backed image service (Phase 7 migration).
 *
 * Provides magic-byte validation, image resize/compression, and metadata
 * extraction via the napi-core native module. Falls back to no-op or
 * throws if the native module is unavailable — callers should handle
 * the NATIVE_NOT_AVAILABLE error and fall back to JavaScript/Sharp.
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let _napi = null;
let _loadError = null;

const NATIVE_NOT_AVAILABLE = 'NATIVE_NOT_AVAILABLE';

function getNapi() {
  if (_napi !== null) return _napi;
  if (_loadError !== null) throw Object.assign(new Error(_loadError.message), { code: NATIVE_NOT_AVAILABLE });

  try {
    _napi = require('../../rust-helper/index.js');
  } catch (e) {
    _loadError = e;
  }
  return _napi;
}

/**
 * Validate file magic bytes against claimed MIME type.
 * Returns { valid: bool, error?: string }.
 */
export function validateMagicBytes(buffer, mimetype) {
  try {
    const napi = getNapi();
    const valid = napi.validateMagicBytes(buffer, mimetype);
    return { valid, error: valid ? undefined : 'File content does not match its claimed type (magic bytes)' };
  } catch (e) {
    // Fallback: basic magic byte check (mirrors upload.js MAGIC_BYTES)
    return fallbackValidateMagicBytes(buffer, mimetype);
  }
}

export const MIN_IMAGE_DIMENSION = 1;
export const MAX_IMAGE_DIMENSION = 4096;

/**
 * Resize an image buffer to exact dimensions and re-encode as JPEG.
 * `quality` is 1-100. Clamps dimensions between 1 and 4096 for DoS protection.
 */
export function resizeImage(inputBuffer, width, height, quality = 75) {
  const w = Math.max(MIN_IMAGE_DIMENSION, Math.min(Math.round(width || 1), MAX_IMAGE_DIMENSION));
  const h = Math.max(MIN_IMAGE_DIMENSION, Math.min(Math.round(height || 1), MAX_IMAGE_DIMENSION));
  const q = Math.max(1, Math.min(Math.round(quality || 75), 100));
  const napi = getNapi();
  return Buffer.from(napi.resizeImage(inputBuffer, w, h, q));
}

/**
 * Get image format and dimensions (returns parsed object).
 */
export function getImageInfo(inputBuffer) {
  const napi = getNapi();
  const raw = napi.getImageInfo(inputBuffer);
  return JSON.parse(raw);
}

/**
 * Resize to fit inside maxW × maxH while maintaining aspect ratio.
 * Does not enlarge if the source is smaller than the target.
 * Clamps bounds to MAX_IMAGE_DIMENSION (4096).
 */
export function resizeToFit(inputBuffer, maxWidth, maxHeight, quality = 80) {
  const napi = getNapi();
  const info = JSON.parse(napi.getImageInfo(inputBuffer));
  let { width, height } = info;

  const maxW = Math.min(maxWidth || 4096, MAX_IMAGE_DIMENSION);
  const maxH = Math.min(maxHeight || 4096, MAX_IMAGE_DIMENSION);
  const q = Math.max(1, Math.min(Math.round(quality || 80), 100));

  // Don't enlarge
  if (width <= maxW && height <= maxH) {
    // Still re-encode to ensure consistent quality
    return Buffer.from(napi.resizeImage(inputBuffer, width, height, q));
  }

  const ratio = Math.min(maxW / width, maxH / height, 1);
  const targetW = Math.max(1, Math.round(width * ratio));
  const targetH = Math.max(1, Math.round(height * ratio));

  return Buffer.from(napi.resizeImage(inputBuffer, targetW, targetH, q));
}

export const NATIVE_AVAILABLE = (() => {
  try {
    getNapi();
    return true;
  } catch {
    return false;
  }
})();

// ── Fallback implementation (when Rust module unavailable) ─────────────────
const MAGIC_BYTES = {
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  'image/gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])],
  'image/webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])],
};

function fallbackValidateMagicBytes(buffer, mimetype) {
  if (!buffer || buffer.length < 4) return { valid: false, error: 'Empty or too-small file' };
  const sigs = MAGIC_BYTES[mimetype];
  if (!sigs) return { valid: true, error: undefined };
  for (const sig of sigs) {
    if (buffer.slice(0, sig.length).equals(sig)) {
      if (mimetype === 'image/webp' && buffer.length >= 12 &&
          buffer.slice(8, 12).toString('ascii') === 'WEBP') {
        return { valid: true, error: undefined };
      }
      if (mimetype !== 'image/webp') return { valid: true, error: undefined };
    }
  }
  return { valid: false, error: 'File content does not match its claimed type (magic bytes)' };
}
