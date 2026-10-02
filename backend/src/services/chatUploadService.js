// CHAT-M-02: single source of truth for the chat attachment policy.
//
// Findings this closes (audit-reports/chat-realtime-missing.md):
//   * The /api/chat/upload endpoint accepted any MIME in its map but content-
//     sniffed ONLY the four inline image types — pdf/office/video/audio bytes
//     were written to disk unverified (polyglot/renamed-payload bypass).
//   * No anti-malware scan ran on chat uploads even though the ClamAV scanner
//     (`scanBufferForMalware`) already existed for medical-record uploads.
//   * There was no quarantine concept: a detected payload was either not
//     scanned at all or (in the dead middleware path) only rejected in-memory.
//   * POST /api/chat/messages trusted the client `attachments` array verbatim —
//     any external URL / mime / size could be persisted and later rendered to
//     other conversation members (stored content injection + dead links).
//
// Policy enforced here:
//   MIME allow-list  → exactly the ext map below (extension derived from MIME,
//                      never from the client filename — CHAT-B-06).
//   Content sniff     → magic-byte check for EVERY allowed MIME (not just
//                      images); unknown/unsupported MIME fails closed.
//   Malware scan      → ClamAV via scanBufferForMalware() (env-gated:
//                      CLAMAV_HOST unset = skip in dev/test, CLAMAV_REQUIRED
//                      = block unscanned files in prod).
//   Quarantine        → a detected payload is written to backend/quarantine/chat
//                      (OUTSIDE public/, so it can never be served) for forensic
//                      review, audited, and never reaches the upload dir.
//   Size              → MAX_CHAT_UPLOAD_BYTES (25MB), checked before decode I/O.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { scanBufferForMalware } from '../middleware/upload.js';
import { auditLog } from '../middleware/audit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CHAT_UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads', 'chat');
// Deliberately NOT under public/ — the /uploads gate serves from public/uploads,
// so quarantined bytes must live elsewhere to be unreachable over HTTP.
export const CHAT_QUARANTINE_DIR = path.join(__dirname, '..', '..', 'quarantine', 'chat');

export const MAX_CHAT_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB

// MIME → extension. The stored extension comes from THIS map only (CHAT-B-06:
// client-supplied extensions are ignored so svg/html payloads can never be
// served from our origin). Keep in sync with ChatDashboard.tsx `accept`.
export const CHAT_EXT_MAP = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/webm': 'webm',
  'audio/webm': 'webm', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a',
  'application/pdf': 'pdf',
  // Office/legacy formats are stored but always served as an attachment by
  // the browser (never rendered inline on our origin).
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

export const CHAT_ACCEPT_ATTR = 'image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx';

const ascii = (buf, offset, length) => buf.slice(offset, offset + length).toString('latin1');

// Magic-byte signatures for EVERY allowed chat MIME (previously images only).
// Returns false for short/unknown buffers — fail closed.
export function chatMagicMatches(buffer, mimeType) {
  if (!buffer || buffer.length < 8) return false;
  switch (mimeType) {
    case 'image/png':
      return buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/jpeg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case 'image/gif':
      return ascii(buffer, 0, 4) === 'GIF8';
    case 'image/webp':
      return ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 4) === 'WEBP';
    case 'video/mp4':
    case 'audio/mp4':
      return ascii(buffer, 4, 4) === 'ftyp';
    case 'video/webm':
    case 'audio/webm':
      return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
    case 'audio/mpeg':
      // "ID3" tag or an MPEG frame sync (11 set bits).
      return ascii(buffer, 0, 3) === 'ID3'
        || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
    case 'audio/ogg':
      return ascii(buffer, 0, 4) === 'OggS';
    case 'application/pdf':
      return ascii(buffer, 0, 4) === '%PDF';
    case 'application/msword':
    case 'application/vnd.ms-excel':
      // OLE2 compound file (D0 CF 11 E0 A1 B1 1A E1)
      return buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      // docx/xlsx are ZIP containers (PK\x03\x04)
      return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
    default:
      return false; // unknown MIME → fail closed
  }
}

export function isAllowedChatMime(mimeType) {
  return Object.prototype.hasOwnProperty.call(CHAT_EXT_MAP, mimeType);
}

// Returns null when the attachment list is acceptable, otherwise an
// Express-ready { status, message }. Used by POST /api/chat/messages so the
// client-supplied attachments array can no longer smuggle external URLs,
// lying mimes, oversize values, or references to files that do not exist.
export function validateChatAttachments(attachments) {
  if (attachments == null) return null;
  if (!Array.isArray(attachments)) {
    return { status: 400, message: 'attachments must be an array' };
  }
  if (attachments.length > 16) {
    return { status: 400, message: 'Too many attachments (max 16)' };
  }
  for (const att of attachments) {
    if (!att || typeof att !== 'object') {
      return { status: 400, message: 'Invalid attachment entry' };
    }
    const { url, size } = att;
    const mimeType = att.mimeType ?? att.mimetype; // legacy lowercase tolerated on READ, never written
    if (typeof url !== 'string' || !url.startsWith('/uploads/chat/')) {
      return { status: 400, message: 'Attachment must be an uploaded chat file' };
    }
    // basename only — rejects traversal ("..") and absolute/external URLs.
    const fileName = path.posix.basename(url);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,5}$/.test(fileName)) {
      return { status: 400, message: 'Attachment filename is not valid' };
    }
    if (!isAllowedChatMime(mimeType)) {
      return { status: 415, message: `Unsupported file type: ${mimeType || 'unknown'}` };
    }
    const ext = CHAT_EXT_MAP[mimeType];
    if (fileName.endsWith(`.${ext}`) === false) {
      return { status: 415, message: 'Attachment type does not match its stored file' };
    }
    if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0 || size > MAX_CHAT_UPLOAD_BYTES) {
      return { status: 413, message: 'File too large (max 25MB)' };
    }
    if (!fs.existsSync(path.join(CHAT_UPLOAD_DIR, fileName))) {
      return { status: 400, message: 'Attachment file is no longer available' };
    }
  }
  return null;
}

// Full gate for one decoded upload buffer: size → MIME allow-list → magic bytes
// → malware scan (quarantining on detection) → write to the upload dir.
// Returns { url, name, mimeType, size } or throws { status, message }.
export async function storeChatUpload({ buffer, mimeType, name, userId }) {
  if (buffer.length > MAX_CHAT_UPLOAD_BYTES) {
    throw { status: 413, message: 'File too large (max 25MB)' };
  }
  const ext = CHAT_EXT_MAP[mimeType];
  if (!ext) {
    throw { status: 415, message: `Unsupported file type: ${mimeType}` };
  }
  if (!chatMagicMatches(buffer, mimeType)) {
    throw { status: 415, message: 'File content does not match its type' };
  }

  const { clean, malware, blocked } = await scanBufferForMalware(buffer);
  if (!clean) {
    // Quarantine the bytes (outside public/) so the sample is available for
    // review, and record who/what was rejected. Never written to UPLOAD_DIR.
    const quarantinedName = `${uuidv4()}.${ext}.quarantined`;
    try {
      if (!fs.existsSync(CHAT_QUARANTINE_DIR)) fs.mkdirSync(CHAT_QUARANTINE_DIR, { recursive: true });
      fs.writeFileSync(path.join(CHAT_QUARANTINE_DIR, quarantinedName), buffer);
    } catch { /* quarantine must not mask the rejection */ }
    // AuditLog.userId is required (ADM-M-02) — the route always passes the
    // authenticated uploader; a missing id is swallowed by auditLog's catch.
    await auditLog('chat_upload_quarantined', userId ?? null, {
      quarantineName: quarantinedName,
      originalName: typeof name === 'string' ? name.slice(0, 200) : 'file',
      mimeType,
      size: buffer.length,
      reason: blocked ? 'scan_unavailable' : (malware || 'malware'),
    });
    throw blocked
      ? { status: 503, message: 'File scanning is unavailable, upload rejected. Try again later.' }
      : { status: 422, message: 'File rejected: malware detected' };
  }

  if (!fs.existsSync(CHAT_UPLOAD_DIR)) fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
  const filename = `${uuidv4()}.${ext}`;
  fs.writeFileSync(path.join(CHAT_UPLOAD_DIR, filename), buffer);
  return { url: `/uploads/chat/${filename}`, name, mimeType, size: buffer.length };
}
