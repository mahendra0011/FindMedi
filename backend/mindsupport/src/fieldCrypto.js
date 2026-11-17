/**
 * Mindsupport field encryption — single source of truth for session notes,
 * journal entries and prescription diagnosis/notes.
 *
 * v2 = AES-256-GCM (integrity-protected). Legacy rows written by the old
 * hand-rolled AES-256-CBC scheme ("<iv_hex>:<ct_hex>") are still readable —
 * decryptText() falls back to the CBC path so no data is lost and no flag day
 * is required. New writes always produce v2.
 *
 * The key derives from NOTES_ENCRYPTION_KEY (preferred, separate from JWT
 * rotation) falling back to JWT_SECRET with a production warning, as before.
 */
import crypto from "node:crypto";

const KEY_MATERIAL =
  process.env.NOTES_ENCRYPTION_KEY || process.env.JWT_SECRET || "mindsupport-fallback-key-2024";
if (!process.env.NOTES_ENCRYPTION_KEY && process.env.NODE_ENV === "production") {
  console.warn("[encrypt] NOTES_ENCRYPTION_KEY not set — falling back to JWT_SECRET. Set a separate key to avoid data loss on JWT rotation.");
}
export const ENCRYPTION_KEY = crypto.createHash("sha256").update(KEY_MATERIAL).digest();

const V2_PREFIX = "v2:";
const IV_LENGTH = 12;
const HEX_24 = /^[0-9a-f]{24}$/i;   // 12-byte GCM IV
const HEX_32 = /^[0-9a-f]{32}$/i;   // 16-byte tag or legacy CBC IV

export function isEncryptedText(value) {
  if (typeof value !== "string" || value.length < 8) return false;
  if (value.startsWith(V2_PREFIX)) {
    const parts = value.slice(V2_PREFIX.length).split(":");
    return parts.length === 3 && HEX_24.test(parts[0]) && HEX_32.test(parts[1]) && /^[0-9a-f]+$/i.test(parts[2]);
  }
  const parts = value.split(":");
  return parts.length === 2 && HEX_32.test(parts[0]) && /^[0-9a-f]{32,}$/i.test(parts[1]);
}

export function encryptText(text) {
  if (text === undefined || text === null || text === "") return { encrypted: text, encryptedFlag: false };
  const s = String(text);
  if (isEncryptedText(s)) return { encrypted: s, encryptedFlag: true }; // idempotent
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(s, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: `${V2_PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`,
    encryptedFlag: true,
  };
}

export function decryptText(text) {
  if (typeof text !== "string" || !text) return text;
  if (text.startsWith(V2_PREFIX)) {
    const parts = text.slice(V2_PREFIX.length).split(":");
    if (parts.length !== 3) return text;
    try {
      const iv = Buffer.from(parts[0], "hex");
      const tag = Buffer.from(parts[1], "hex");
      const ciphertext = Buffer.from(parts[2], "hex");
      const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    } catch {
      return text; // wrong key or corrupted row — never crash the read path
    }
  }
  // Legacy AES-256-CBC ("<iv_hex(32)>:<ct_hex>") — dual-read for old rows.
  const parts = text.split(":");
  if (parts.length === 2 && HEX_32.test(parts[0])) {
    try {
      const iv = Buffer.from(parts[0], "hex");
      const ciphertext = Buffer.from(parts[1], "hex");
      const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    } catch {
      return text;
    }
  }
  return text;
}
