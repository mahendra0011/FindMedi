// P2-12: single source of truth for the auth cookies' name and attributes.
//
// Defaults reproduce today's behaviour exactly - production: SameSite=None +
// Secure (cross-site frontend), dev: Lax - so deploying this file flips
// nothing. The env overrides exist for tighter postures:
//
//   COOKIE_SAMESITE=strict|lax|none   (default: none in prod, lax elsewhere)
//   COOKIE_SECURE=true|false           (default: true in prod)
//   COOKIE_PREFIX=__Host-              hardened name; applied only when the
//                                      cookie is Secure (browsers reject a
//                                      __Host- cookie that is not), which is
//                                      also why it silently stays off in dev.
//
// all readers/writers MUST take the name from here - a hard-coded 'token'
// next to a prefixed setter is a silent logout.

const truthy = (v) => /^(1|true|yes)$/i.test(String(v || ''));

const COOKIE_SECURE = (() => {
  const v = process.env.COOKIE_SECURE;
  if (v === undefined || v === '') return process.env.NODE_ENV === 'production';
  return truthy(v);
})();

const SAMESITE = (() => {
  const v = String(process.env.COOKIE_SAMESITE || '').toLowerCase();
  if (['strict', 'lax', 'none'].includes(v)) {
    // Browsers REQUIRE Secure whenever SameSite=None; enforce it here instead
    // of letting the browser reject every cookie.
    if (v === 'none') return { sameSite: 'none', secure: true };
    return { sameSite: v, secure: COOKIE_SECURE };
  }
  return { sameSite: COOKIE_SECURE ? 'none' : 'lax', secure: COOKIE_SECURE };
})();

export const AUTH_COOKIE_SECURE = SAMESITE.secure;
export const AUTH_COOKIE_SAMESITE = SAMESITE.sameSite;
export const AUTH_COOKIE_PREFIX =
  process.env.COOKIE_PREFIX === '__Host-' && AUTH_COOKIE_SECURE ? '__Host-' : '';

export const authCookieName = (base) => `${AUTH_COOKIE_PREFIX}${base}`;

export const authCookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: AUTH_COOKIE_SECURE,
  sameSite: AUTH_COOKIE_SAMESITE,
  path: '/',
  ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
});

/** Read one of the auth cookies, tolerating an enabled __Host- prefix. */
export const readAuthCookie = (cookies, base) =>
  cookies?.[authCookieName(base)] ?? cookies?.[base];
