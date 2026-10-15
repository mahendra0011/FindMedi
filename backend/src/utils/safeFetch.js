import dns from 'node:dns/promises';
import net from 'node:net';

export class SsrfError extends Error {
  constructor(message, target) {
    super(message);
    this.name = 'SsrfError';
    this.status = 403;
    this.code = 'SSRF_BLOCKED';
    this.target = target;
  }
}

/**
 * Checks if an IPv4 address falls within private, loopback, or cloud metadata ranges.
 */
export function isPrivateIpv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // malformed, fail closed
  }

  const [b0, b1] = parts;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;
  // 10.0.0.0/8 (Private)
  if (b0 === 10) return true;
  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;
  // 169.254.0.0/16 (Link-local / AWS / GCP / Azure metadata e.g. 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;
  // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (b0 === 192 && b1 === 168) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (b0 >= 224) return true;

  return false;
}

/**
 * Checks if an IPv6 address falls within private, loopback, or link-local ranges.
 */
export function isPrivateIpv6(ip) {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  // Link-local: fe80::/10
  if (/^fe[89ab]/i.test(normalized)) return true;
  // Unique local: fc00::/7 (fc00:: and fd00::)
  if (/^f[cd]/i.test(normalized)) return true;
  // IPv4-mapped IPv6 (::ffff:192.0.2.1)
  if (normalized.startsWith('::ffff:')) {
    const ipv4Part = normalized.slice(7);
    if (net.isIPv4(ipv4Part)) return isPrivateIpv4(ipv4Part);
  }
  return false;
}

/**
 * Validate that an IP address is public and safe to connect to.
 */
export function isPrivateIp(ip) {
  const family = net.isIP(ip);
  if (family === 4) return isPrivateIpv4(ip);
  if (family === 6) return isPrivateIpv6(ip);
  return true; // Unknown address format, fail closed
}

/**
 * Safe fetch wrapper that guards against SSRF (Server-Side Request Forgery).
 * Resolves DNS hostname and rejects requests to loopback, internal subnets,
 * or cloud metadata endpoints.
 *
 * @param {string|URL} url - Target URL
 * @param {object} [options] - Standard RequestInit options passed to fetch
 * @returns {Promise<Response>}
 */
export async function safeFetch(url, options = {}) {
  const parsed = new URL(url);

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new SsrfError(`Unsupported protocol "${parsed.protocol}"`, parsed.href);
  }

  const hostname = parsed.hostname;

  // Direct IP address check
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new SsrfError(`Blocked request to private IP address: ${hostname}`, parsed.href);
    }
  } else {
    // Domain resolution check
    let addresses;
    try {
      addresses = await dns.lookup(hostname, { all: true });
    } catch (err) {
      throw new SsrfError(`DNS lookup failed for ${hostname}: ${err.message}`, parsed.href);
    }

    if (!addresses || addresses.length === 0) {
      throw new SsrfError(`No DNS records found for ${hostname}`, parsed.href);
    }

    for (const record of addresses) {
      if (isPrivateIp(record.address)) {
        throw new SsrfError(`Blocked request resolving to private IP: ${record.address}`, parsed.href);
      }
    }
  }

  return fetch(parsed.href, options);
}

export default safeFetch;
