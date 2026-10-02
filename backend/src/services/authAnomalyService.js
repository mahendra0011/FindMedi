import crypto from 'node:crypto';
import LoginEvent from '../models/LoginEvent.js';
import { createNotification } from './notificationService.js';
import { auditLog } from '../middleware/audit.js';
import logger from '../config/logger.js';
import { redisClient, isRedisReady } from '../config/redis.js';

/**
 * AUTH-M-08: login anomaly alerts.
 *
 * The finding said there was no alerting on impossible-travel / new-device
 * logins. There was not - and there could not have been, because nothing stored
 * login history. `auditLog` said "a login happened"; nothing said "this login
 * looks like a different person than usual".
 *
 * WHAT IS DETECTED, AND WHAT IS NOT
 * Detected without any external service:
 *   new-device        - a User-Agent hash never seen for this account
 *   new-ip            - an IP never seen for this account
 *   rapid-ip-change   - a different /16 within RAPID_WINDOW minutes
 *
 * NOT detected, and deliberately so:
 *   impossible-travel - genuinely requires country-level geolocation, which
 *                       means a GeoIP database or a hosted lookup service. This
 *                       repo has neither, and shipping a fake "impossible
 *                       travel" built from IP prefixes would be a control that
 *                       looks like the real one and is not. `impossible-travel`
 *                       is emitted only when a resolver is actually configured;
 *                       until then it never fires and never gives false comfort.
 *
 * FIRST LOGIN IS NOT AN ALERT. Every new account has an unseen device and an
 * unseen IP. Alerting there trains the user to ignore the alert, which is how
 * the next real one gets missed.
 */

const RAPID_WINDOW_MINUTES = 30;

/** Stable, comparable device fingerprint. */
export const deviceHashFor = (userAgent = '') =>
  crypto.createHash('sha256').update(String(userAgent || 'unknown')).digest('hex').slice(0, 32);

/** First two octets - a coarse network block, not a device or a person. */
const networkBlock = (ip = '') => String(ip).split('.').slice(0, 2).join('.');

const minutesBetween = (a, b) => Math.abs(b.getTime() - a.getTime()) / 60000;

/**
 * Compare a login against this account's recent history.
 * @returns {Promise<string[]>} anomaly codes, empty when nothing looks wrong.
 */
export const detectAnomalies = async (userId, { ip, userAgent } = {}, now = new Date()) => {
  const deviceHash = deviceHashFor(userAgent);
  const history = await LoginEvent.find({ userId, success: true })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  // No history at all: this is a first login, not an anomaly.
  if (history.length === 0) return [];

  const anomalies = [];
  if (!history.some((h) => h.deviceHash === deviceHash)) anomalies.push('new-device');
  if (!history.some((h) => h.ip === ip)) anomalies.push('new-ip');

  const last = history[0];
  if (last && last.ip !== ip) {
    const elapsed = minutesBetween(new Date(last.createdAt), now);
    if (elapsed <= RAPID_WINDOW_MINUTES && networkBlock(last.ip) !== networkBlock(ip)) {
      anomalies.push('rapid-ip-change');
    }
  }

  // Only meaningful with real geolocation. See the header.
  const resolver = globalThis.__findmediGeoResolver;
  if (typeof resolver === 'function') {
    const [here, there] = await Promise.all([
      resolver(ip).catch(() => null),
      resolver(last?.ip).catch(() => null),
    ]);
    if (here?.country && there?.country && here.country !== there.country
        && minutesBetween(new Date(last.createdAt), now) < 24 * 60) {
      anomalies.push('impossible-travel');
    }
  }

  return anomalies;
};

/**
 * Record a login and, if it looks wrong, tell the account owner.
 *
 * Never throws and never blocks the login. A detection failure must not turn a
 * successful authentication into a 500 - that is an availability outage
 * triggered by the security system, and it is also a trivial DoS.
 */
export const recordLoginEvent = async (userId, { ip, userAgent, email } = {}) => {
  try {
    const anomalies = await detectAnomalies(userId, { ip, userAgent });
    await LoginEvent.create({
      userId,
      ip: String(ip || 'unknown'),
      deviceHash: deviceHashFor(userAgent),
      userAgent: String(userAgent || '').slice(0, 256),
      success: true,
      anomalies,
    });

    if (anomalies.length > 0) {
      logger.warn(`[auth] login anomaly for ${userId}: ${anomalies.join(', ')}`);
      await auditLog('login_anomaly_detected', userId, { ip, anomalies, email });
      await createNotification({
        userId,
        type: 'system',
        // Critical, because it bypasses quiet hours and DND: an account takeover
        // in progress should not sit unread until morning.
        priority: 'critical',
        title: 'New sign-in to your account',
        message: `A sign-in was detected from a device or location we do not recognise${anomalies.includes('rapid-ip-change') ? ' shortly after a previous sign-in elsewhere' : ''}. If this was not you, change your password and contact support immediately.`,
        // Identifiers only - NOTIF-M-06 forbids notification bodies in audit
        // metadata, and this alert is created from an account-takeover signal.
        auditMetadata: { anomalies, ip },
      });
    }
    return { anomalies };
  } catch (err) {
    logger.error(`[auth] login anomaly detection failed for ${userId}: ${err.message}`);
    return { anomalies: [] };
  }
};

/**
 * AUTH-M-05: signup-burst anomaly detection (account farming).
 *
 * The Turnstile gate on /register, /google-register, /resend-otp and
 * /forgot-password stops the scripts that cannot solve a challenge. This is
 * the other half of the finding: catch the farms that CAN — one IP minting
 * many accounts inside a window — and put it in the audit trail where an
 * operator sees it.
 *
 * DETECTION, NOT A BLOCK. A hard reject keyed on IP is a shared-NAT grenade:
 * one hostel CGNAT or one office egress would lock out every real signup
 * behind it, and the attacker just rotates IPs anyway. So the counter never
 * rejects a request — it warns and writes `signup_burst_detected` (the CAPTCHA
 * stays the thing that actually slows a farm down).
 *
 * COUNTING: Redis when available (correct across instances); a bounded
 * in-process Map otherwise, because a detection signal that vanishes when Redis
 * is down is still better than no signal. Never throws, never blocks — the
 * route calls it fire-and-forget.
 */
const SIGNUP_BURST_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const SIGNUP_BURST_THRESHOLD = 10;       // signups per IP per window
const MEM_MAX_KEYS = 5000;                      // prune guard against spoofed IPs

const memBurstCounts = new Map();

const memIncr = (key) => {
  const now = Date.now();
  const entry = memBurstCounts.get(key);
  if (!entry || entry.resetAt <= now) {
    memBurstCounts.set(key, { count: 1, resetAt: now + SIGNUP_BURST_WINDOW_MS });
    if (memBurstCounts.size > MEM_MAX_KEYS) {
      for (const [k, v] of memBurstCounts) {
        if (v.resetAt <= now) memBurstCounts.delete(k);
      }
    }
    return 1;
  }
  entry.count += 1;
  return entry.count;
};

export const recordSignupEvent = async ({ ip, userId, email } = {}) => {
  try {
    const key = `auth:signup_burst:${ip || 'unknown'}`;
    let count;
    if (isRedisReady() && redisClient.isOpen) {
      try {
        count = await redisClient.incr(key);
        if (count === 1) await redisClient.pexpire(key, SIGNUP_BURST_WINDOW_MS);
      } catch (redisErr) {
        logger.warn(`[auth] signup-burst redis failed (${redisErr.message}); using process counter`);
        count = memIncr(key);
      }
    } else {
      count = memIncr(key);
    }

    const burst = count >= SIGNUP_BURST_THRESHOLD;
    if (burst) {
      logger.warn(`[auth] signup burst: ${count} signups from ${ip} within ${SIGNUP_BURST_WINDOW_MS / 60000}m`);
      await auditLog('signup_burst_detected', userId, {
        ip,
        count,
        windowMinutes: SIGNUP_BURST_WINDOW_MS / 60000,
        email,
      });
    }
    return { count, burst };
  } catch (err) {
    logger.error(`[auth] signup burst tracking failed: ${err.message}`);
    return { count: null, burst: false };
  }
};