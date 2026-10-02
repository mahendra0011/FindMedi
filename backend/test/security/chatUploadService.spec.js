/**
 * CHAT-M-02 — chat attachment policy (service layer).
 *
 * The audit found chat uploads content-checked ONLY for the four inline image
 * types, never anti-malware scanned (the ClamAV helper existed but was dead
 * code), had no quarantine concept, and POST /messages trusted the client
 * `attachments` array verbatim. chatUploadService is the single place that now
 * enforces: MIME allow-list → magic bytes for EVERY type → ClamAV scan →
 * quarantine-on-detection (outside public/) → 25MB cap; plus server-side
 * validation of attachment arrays on send.
 *
 * fs and the scanner are mocked: no real file I/O, no clamd.
 */
import { jest } from '@jest/globals';

const fsMock = {
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
};
const scanBufferForMalware = jest.fn();
const auditLog = jest.fn(async () => {});

jest.unstable_mockModule('fs', () => ({ default: fsMock, ...fsMock }));
jest.unstable_mockModule('../../src/middleware/upload.js', () => ({
  scanBufferForMalware,
  // never touched by the service — present only so the mocked module shape
  // matches the real one for any transitive named import.
  validateFileContent: jest.fn(),
  requireValidatedFile: jest.fn(),
}));
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog,
  scrubAuditDetails: (v) => v,
}));

const {
  CHAT_UPLOAD_DIR,
  CHAT_QUARANTINE_DIR,
  MAX_CHAT_UPLOAD_BYTES,
  CHAT_EXT_MAP,
  chatMagicMatches,
  isAllowedChatMime,
  validateChatAttachments,
  storeChatUpload,
} = await import('../../src/services/chatUploadService.js');

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const VALID_UUID_NAME = '123e4567-e89b-42d3-a456-426614174000.png';

beforeEach(() => {
  jest.clearAllMocks();
  fsMock.existsSync.mockReturnValue(true);
  scanBufferForMalware.mockResolvedValue({ clean: true, skipped: true });
});

describe('chatMagicMatches — content sniff for every allowed chat MIME', () => {
  const cases = [
    ['image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ['image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])],
    ['image/gif', Buffer.from('GIF89a..', 'latin1')],
    ['image/webp', Buffer.from('RIFF\x00\x00\x00\x00WEBPVP8 ', 'latin1')],
    ['video/mp4', Buffer.from('\x00\x00\x00\x20ftypisom\x00\x00\x00\x00', 'latin1')],
    ['audio/mp4', Buffer.from('\x00\x00\x00\x20ftypM4A \x00\x00\x00\x00', 'latin1')],
    ['video/webm', Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x02, 0x03, 0x04])],
    ['audio/webm', Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x02, 0x03, 0x04])],
    ['audio/mpeg', Buffer.from('ID3\x04\x00\x00\x00\x00', 'latin1')],
    ['audio/ogg', Buffer.from('OggS\x00\x02\x00\x00', 'latin1')],
    ['application/pdf', Buffer.from('%PDF-1.7\n', 'latin1')],
    ['application/msword', Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])],
    ['application/vnd.ms-excel', Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', Buffer.from('PK\x03\x04\x01\x02\x03\x04', 'latin1')],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', Buffer.from('PK\x03\x04\x01\x02\x03\x04', 'latin1')],
  ];
  it.each(cases)('accepts a genuine %s header', (mime, buf) => {
    expect(chatMagicMatches(buf, mime)).toBe(true);
  });

  it('MPEG frame-sync alternative (0xFFEx) counts as audio/mpeg', () => {
    expect(chatMagicMatches(Buffer.from([0xff, 0xfb, 0x90, 0x00, 0, 0, 0, 0]), 'audio/mpeg')).toBe(true);
  });

  it('fails closed for a MIME outside the allow-list (svg/html never pass)', () => {
    expect(chatMagicMatches(PNG, 'image/svg+xml')).toBe(false);
    expect(chatMagicMatches(PNG, 'text/html')).toBe(false);
    expect(chatMagicMatches(PNG, 'application/octet-stream')).toBe(false);
  });

  it('rejects a polyglot: PNG bytes declared as a PDF', () => {
    expect(chatMagicMatches(PNG, 'application/pdf')).toBe(false);
  });

  it('rejects truncated buffers', () => {
    expect(chatMagicMatches(Buffer.from([0x89, 0x50]), 'image/png')).toBe(false);
    expect(chatMagicMatches(null, 'image/png')).toBe(false);
  });

  it('isAllowedChatMime mirrors CHAT_EXT_MAP exactly', () => {
    expect(isAllowedChatMime('image/png')).toBe(true);
    expect(isAllowedChatMime('image/svg+xml')).toBe(false);
    expect(Object.keys(CHAT_EXT_MAP).every(isAllowedChatMime)).toBe(true);
  });
});

describe('storeChatUpload — size → MIME → magic → scan → quarantine/write', () => {
  it('rejects oversize buffers with 413 before touching disk', async () => {
    const big = Buffer.alloc(MAX_CHAT_UPLOAD_BYTES + 1, 0x41);
    await expect(storeChatUpload({ buffer: big, mimeType: 'image/png', name: 'big.png', userId: 'u1' }))
      .rejects.toMatchObject({ status: 413 });
    expect(fsMock.writeFileSync).not.toHaveBeenCalled();
  });

  it('rejects a MIME outside the allow-list with 415', async () => {
    await expect(storeChatUpload({ buffer: PNG, mimeType: 'image/svg+xml', name: 'x.svg', userId: 'u1' }))
      .rejects.toMatchObject({ status: 415, message: 'Unsupported file type: image/svg+xml' });
    expect(scanBufferForMalware).not.toHaveBeenCalled();
    expect(fsMock.writeFileSync).not.toHaveBeenCalled();
  });

  it('rejects content that does not match its declared type with 415', async () => {
    await expect(storeChatUpload({ buffer: PNG, mimeType: 'application/pdf', name: 'x.pdf', userId: 'u1' }))
      .rejects.toMatchObject({ status: 415, message: 'File content does not match its type' });
    expect(scanBufferForMalware).not.toHaveBeenCalled();
  });

  it('malware detected → quarantines OUTSIDE public/, audits, and never writes the upload dir', async () => {
    scanBufferForMalware.mockResolvedValue({ clean: false, malware: 'Eicar-Test-Signature' });

    await expect(storeChatUpload({ buffer: PNG, mimeType: 'image/png', name: 'evil.png', userId: 'u1' }))
      .rejects.toMatchObject({ status: 422, message: 'File rejected: malware detected' });

    expect(fsMock.writeFileSync).toHaveBeenCalledTimes(1);
    const [quarantinePath] = fsMock.writeFileSync.mock.calls[0];
    expect(quarantinePath.startsWith(CHAT_QUARANTINE_DIR)).toBe(true);
    expect(quarantinePath.startsWith(CHAT_UPLOAD_DIR)).toBe(false);
    expect(quarantinePath).toContain('quarantined');
    expect(auditLog).toHaveBeenCalledWith('chat_upload_quarantined', 'u1', expect.objectContaining({
      mimeType: 'image/png',
      size: PNG.length,
      originalName: 'evil.png',
      reason: 'Eicar-Test-Signature',
    }));
  });

  it('scan required but unavailable (CLAMAV_REQUIRED) → 503 + quarantine attempt + audit', async () => {
    scanBufferForMalware.mockResolvedValue({ clean: false, blocked: true });

    await expect(storeChatUpload({ buffer: PNG, mimeType: 'image/png', name: 'a.png', userId: 'u1' }))
      .rejects.toMatchObject({ status: 503 });
    expect(auditLog).toHaveBeenCalledWith('chat_upload_quarantined', 'u1', expect.objectContaining({
      reason: 'scan_unavailable',
    }));
  });

  it('clean file → written to the upload dir with a MIME-derived extension', async () => {
    const result = await storeChatUpload({ buffer: PNG, mimeType: 'image/png', name: 'photo.png', userId: 'u1' });

    expect(result).toEqual({
      url: expect.stringMatching(/^\/uploads\/chat\/[0-9a-f-]{36}\.png$/),
      name: 'photo.png',
      mimeType: 'image/png',
      size: PNG.length,
    });
    const [writtenPath, writtenBuf] = fsMock.writeFileSync.mock.calls[0];
    expect(writtenPath.startsWith(CHAT_UPLOAD_DIR)).toBe(true);
    expect(writtenBuf.equals(PNG)).toBe(true);
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('scanner error path still goes through the real gate (mock may throw → propagates)', async () => {
    scanBufferForMalware.mockRejectedValue(new Error('scanner exploded'));
    await expect(storeChatUpload({ buffer: PNG, mimeType: 'image/png', name: 'a.png', userId: 'u1' }))
      .rejects.toThrow('scanner exploded');
    expect(fsMock.writeFileSync).not.toHaveBeenCalled();
  });
});

describe('validateChatAttachments — POST /messages no longer trusts the client array', () => {
  const valid = () => ({
    url: `/uploads/chat/${VALID_UUID_NAME}`,
    mimeType: 'image/png',
    size: 2048,
    name: 'photo.png',
  });

  it('accepts null/undefined/empty lists', () => {
    expect(validateChatAttachments(null)).toBeNull();
    expect(validateChatAttachments(undefined)).toBeNull();
    expect(validateChatAttachments([])).toBeNull();
  });

  it('rejects a non-array attachments field with 400', () => {
    expect(validateChatAttachments('nope')).toMatchObject({ status: 400 });
    expect(validateChatAttachments({ url: '/uploads/chat/x' })).toMatchObject({ status: 400 });
  });

  it('caps attachment count at 16', () => {
    const many = Array.from({ length: 17 }, valid);
    expect(validateChatAttachments(many)).toMatchObject({ status: 400, message: expect.stringContaining('Too many') });
  });

  it('rejects external URLs (content injection / off-site fetch)', () => {
    expect(validateChatAttachments([{ ...valid(), url: 'https://evil.example/x.png' }]))
      .toMatchObject({ status: 400 });
  });

  it('rejects path traversal into the chat dir', () => {
    expect(validateChatAttachments([{ ...valid(), url: '/uploads/chat/../../etc/passwd' }]))
      .toMatchObject({ status: 400 });
    expect(validateChatAttachments([{ ...valid(), url: '/uploads/chat/not-a-uuid.png' }]))
      .toMatchObject({ status: 400 });
  });

  it('rejects MIME outside the allow-list with 415', () => {
    expect(validateChatAttachments([{ ...valid(), mimeType: 'image/svg+xml' }]))
      .toMatchObject({ status: 415 });
    expect(validateChatAttachments([{ ...valid(), mimeType: undefined }]))
      .toMatchObject({ status: 415 });
  });

  it('rejects a MIME/extension mismatch (lying mime) with 415', () => {
    expect(validateChatAttachments([{ ...valid(), mimeType: 'application/pdf' }]))
      .toMatchObject({ status: 415, message: expect.stringContaining('does not match') });
  });

  it('rejects missing, non-numeric or oversize sizes with 413', () => {
    const base = valid();
    expect(validateChatAttachments([{ ...base, size: undefined }])).toMatchObject({ status: 413 });
    expect(validateChatAttachments([{ ...base, size: 'big' }])).toMatchObject({ status: 413 });
    expect(validateChatAttachments([{ ...base, size: MAX_CHAT_UPLOAD_BYTES + 1 }])).toMatchObject({ status: 413 });
    expect(validateChatAttachments([{ ...base, size: -5 }])).toMatchObject({ status: 413 });
  });

  it('rejects references to files that no longer exist on disk', () => {
    fsMock.existsSync.mockReturnValue(false);
    expect(validateChatAttachments([valid()])).toMatchObject({ status: 400 });
  });

  it('accepts a policy-passing attachment (legacy lowercase mimetype tolerated on read)', () => {
    expect(validateChatAttachments([valid()])).toBeNull();
    const { mimeType, ...legacy } = valid();
    expect(validateChatAttachments([{ ...legacy, mimetype: mimeType }])).toBeNull();
  });
});
