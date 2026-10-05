import dns from 'node:dns/promises';
import logger from '../config/logger.js';

// P2-13: the ONLY sanctioned way for server code to pull a remote image into
// memory (PDF signature/logos, thumbnails). The old pdfService helper did a
// bare `fetch(url)` then `res.buffer()` - `buffer()` does not exist on undici
// responses (it always threw, so signatures silently vanished), and the URL
// came from stored profile data, i.e. a stored-SSRF primitive if anyone could
// write it.
//
// Constraints enforced here:
//   - https only (no http, no file:, no data:)
//   - host allowlist: env PDF_FETCH_ALLOWLIST (comma) + res.cloudinary.com
//   - DNS resolution checked against private/loopback/link-local ranges
//   - 5s timeout, no redirects, 2MB size cap (checked on header AND body)

const DEFAULT_ALLOWLIST = ['res.cloudinary.com'];
const TIMEOUT_MS = 5000;
const MAX_BYTES = 2 * 1024 * 1024;

const isPrivateIPv4 = (ip) => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local (cloud metadata!)
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
};

const isPrivateIp = (addr) => {
  const ip = String(addr || '').toLowerCase();
  if (!ip) return true;
  if (ip.startsWith('::ffff:')) return isPrivateIPv4(ip.slice(7));
  if (ip === '::1' || ip === '::') return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // unique-local
  if (ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) return true; // link-local v6
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return isPrivateIPv4(ip);
  return false; // public v6
};

const allowlist = () => {
  const fromEnv = String(process.env.PDF_FETCH_ALLOWLIST || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...fromEnv, ...DEFAULT_ALLOWLIST])];
};

/**
 * Fetch an HTTPS resource from an allowlisted host into a Buffer, or null on
 * ANY refusal (never throws) - callers treat null as "render without image",
 * which is the pre-existing fallback shape.
 */
export async function safeFetchBuffer(rawUrl, { timeoutMs = TIMEOUT_MS, maxBytes = MAX_BYTES } = {}) {
  if (!rawUrl) return null;
  let url;
  try {
    url = new URL(String(rawUrl));
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  const host = url.hostname.toLowerCase();
  const allowed = allowlist().some((h) => host === h || host.endsWith(`.${h}`));
  if (!allowed) {
    logger.warn(`safeFetchBuffer refused non-allowlisted host: ${host}`);
    return null;
  }

  try {
    const addrs = await dns.lookup(host, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
      logger.warn(`safeFetchBuffer refused private/loopback target for ${host}`);
      return null;
    }
  } catch {
    return null;
  }

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
      headers: { 'User-Agent': 'findmedi-pdf/1.0' },
    });
    if (!res.ok) return null;
    const declared = Number(res.headers.get('content-length') || 0);
    if (Number.isFinite(declared) && declared > maxBytes) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > maxBytes) return null;
    return buf;
  } catch (err) {
    logger.warn(`safeFetchBuffer fetch failed for ${host}: ${err?.message || err}`);
    return null;
  }
}
