import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'access-secret-change-me';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-change-me';
const ACCESS_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user._id?.toString() || user.id,
      role: user.role,
      email: user.email,
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(user) {
  return jwt.sign(
    {
      id: user._id?.toString() || user.id,
      type: 'refresh',
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
}

/**
 * Verify access token
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

/**
 * Generate both tokens
 */
export function generateTokens(user) {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
}