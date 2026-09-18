import crypto from 'crypto';

const getCookieOptions = () => ({
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  // Refresh token (7d) jitna hi rakho — warna 24h baad har POST fail ho kar session girti thi
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

export const csrfProtection = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (req.path === '/upload') {
    return next();
  }

  const origin = req.headers['origin'];
  const referer = req.headers['referer'];
  if (origin || referer) {
    const source = (origin || referer).trim().replace(/\/$/, '');
    const allowedList = [
      ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : []),
      ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []),
      'https://findmedi.online',
      'https://www.findmedi.online',
      'http://localhost:5173',
      'http://localhost:3000',
    ].map(o => o.trim().replace(/\/$/, '')).filter(Boolean);

    const isAllowed = allowedList.some(allowed => source.startsWith(allowed));
    if (!isAllowed && process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'CSRF validation failed: invalid origin' });
    }
  }

  const tokenFromCookie = req.cookies?.['csrf-token'];
  const tokenFromHeader = req.headers['x-csrf-token'];
  if (tokenFromCookie && tokenFromHeader && tokenFromCookie === tokenFromHeader) {
    return next();
  }

  if (!origin && !referer) {
    if (tokenFromCookie && tokenFromHeader && tokenFromCookie === tokenFromHeader) {
      return next();
    }
    return res.status(403).json({ message: 'CSRF validation failed: missing token' });
  }

  next();
};

export const setCsrfToken = (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie('csrf-token', token, getCookieOptions());
  res.json({ csrfToken: token });
};
