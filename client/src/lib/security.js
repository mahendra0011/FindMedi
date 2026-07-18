/**
 * Client-side security utilities
 */

// ─── Encryption (AES-like using Web Crypto API) ────────────────────────────
const ENCRYPTION_ALGO = 'AES-GCM';
const KEY_LENGTH = 256;

async function getKey(key) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key.padEnd(32, '0').slice(0, 32)),
    { name: ENCRYPTION_ALGO },
    false,
    ['encrypt', 'decrypt']
  );
  return keyMaterial;
}

/**
 * Encrypt sensitive data before storing in localStorage
 * @param {any} data - Data to encrypt
 * @param {string} secretKey - Encryption key (min 8 chars)
 * @returns {string} - Encrypted string (base64)
 */
export async function encryptData(data, secretKey = 'medicore-default-key') {
  try {
    const key = await getKey(secretKey);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const encrypted = await crypto.subtle.encrypt(
      { name: ENCRYPTION_ALGO, iv },
      key,
      encoded
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  } catch (e) {
    console.error('Encryption failed:', e);
    return null;
  }
}

/**
 * Decrypt data that was encrypted with encryptData
 * @param {string} encryptedStr - Encrypted base64 string
 * @param {string} secretKey - Encryption key
 * @returns {any} - Decrypted data
 */
export async function decryptData(encryptedStr, secretKey = 'medicore-default-key') {
  try {
    const key = await getKey(secretKey);
    const combined = new Uint8Array(atob(encryptedStr).split('').map(c => c.charCodeAt(0)));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGO, iv },
      key,
      data
    );
    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (e) {
    console.error('Decryption failed:', e);
    return null;
  }
}

// ─── Input Sanitization ────────────────────────────────────────────────────
/**
 * Strip HTML tags and scripts from user input
 * @param {string} input - Raw user input
 * @returns {string} - Sanitized string
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove remaining angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitize an entire object's string fields
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = typeof value === 'string' ? sanitizeInput(value) : value;
  }
  return sanitized;
}

// ─── Validation ────────────────────────────────────────────────────────────
/**
 * Validate email address
 * @param {string} email
 * @returns {boolean}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validate phone number (10-15 digits, optional + prefix)
 * @param {string} phone
 * @returns {boolean}
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  return /^\+?[\d\s-]{10,15}$/.test(phone.trim());
}

/**
 * Validate password strength
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain an uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain a lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain a number' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain a special character' };
  }
  return { valid: true, message: 'Strong password' };
}

// ─── Data Masking ──────────────────────────────────────────────────────────
/**
 * Mask sensitive data (credit cards, emails, etc.)
 * @param {string} str - String to mask
 * @param {number} visibleCount - Number of characters to keep visible at end
 * @param {string} maskChar - Character to use for masking
 * @returns {string}
 */
export function maskSensitive(str, visibleCount = 4, maskChar = '*') {
  if (!str || typeof str !== 'string') return str;
  if (str.length <= visibleCount) return str;
  const visible = str.slice(-visibleCount);
  const masked = maskChar.repeat(Math.min(str.length - visibleCount, 12));
  return masked + visible;
}

/**
 * Mask email: j***@example.com
 * @param {string} email
 * @returns {string}
 */
export function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [name, domain] = email.split('@');
  return `${name[0]}${'*'.repeat(Math.min(name.length - 1, 5))}@${domain}`;
}

/**
 * Mask phone: +91 ***** 1234
 * @param {string} phone
 * @returns {string}
 */
export function maskPhone(phone) {
  if (!phone) return phone;
  const cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.length < 6) return phone;
  const visible = cleaned.slice(-4);
  const prefix = cleaned.slice(0, Math.min(cleaned.length - 4, 3));
  return `${prefix} ${'*'.repeat(5)} ${visible}`;
}

// ─── Secure Storage ────────────────────────────────────────────────────────
/**
 * Securely store data in localStorage with encryption
 */
export async function secureSetItem(key, value, secretKey) {
  const encrypted = await encryptData(value, secretKey);
  if (encrypted) {
    localStorage.setItem(`_secure_${key}`, encrypted);
  }
}

/**
 * Retrieve and decrypt data from localStorage
 */
export async function secureGetItem(key, secretKey) {
  const encrypted = localStorage.getItem(`_secure_${key}`);
  if (!encrypted) return null;
  return await decryptData(encrypted, secretKey);
}

/**
 * Remove secure item from localStorage
 */
export function secureRemoveItem(key) {
  localStorage.removeItem(`_secure_${key}`);
}