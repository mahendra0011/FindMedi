import crypto from 'crypto';

const getCookieOptions = () => ({
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 24 * 60 * 60 * 1000,
});

export const csrfProtection = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.headers['origin'];
  const referer = req.headers['referer'];
  if (origin || referer) {
    const allowed = process.env.CLIENT_URL || 'http://localhost:5173';
    const source = origin || referer;
    if (!source.startsWith(allowed.replace(/\/$/, ''))) {
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
