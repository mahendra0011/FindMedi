import crypto from 'crypto';
import User from '../models/User.js';
import Hospital from '../models/Hospital.js';
import AuditLog from '../models/AuditLog.js';
import bcrypt from 'bcryptjs';

const IDLE_LOCK_WINDOW_MS = Number(process.env.IDLE_LOCK_WINDOW_MS || 15 * 60 * 1000);
const SHIFT_BOUND_WINDOW_MS = Number(process.env.SHIFT_BOUND_WINDOW_MS || 30 * 60 * 1000);
const MAX_FAILED_PIN_ATTEMPTS = Number(process.env.MAX_FAILED_PIN_ATTEMPTS || 5);

const DEVICE_ALLOWLIST_TTL_MS = Number(process.env.DEVICE_ALLOWLIST_TTL_MS || 30 * 24 * 60 * 60 * 1000);

export function hashChain(previousHash, payload) {
  const input = `${previousHash || 'genesis'}|${JSON.stringify(payload)}|${Date.now()}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function logAuditHashChain(action, userId, payload, ip, userAgent) {
  const lastLog = await AuditLog.findOne({ action: 'hash_chain' }).sort({ createdAt: -1 }).lean();
  const chainHash = hashChain(lastLog?.payload?.chainHash, payload);
  await AuditLog.create({
    action: 'hash_chain',
    actor: userId,
    payload: { ...payload, chainHash, prevHash: lastLog?.payload?.chainHash },
    ip,
    userAgent,
    severity: 'info',
  });
  return chainHash;
}

export function checkIdleLock(user) {
  if (!user.lastActivityAt) return { locked: false };
  const idleMs = Date.now() - new Date(user.lastActivityAt).getTime();
  if (idleMs > IDLE_LOCK_WINDOW_MS) {
    return { locked: true, idleMinutes: Math.floor(idleMs / 60000) };
  }
  return { locked: false };
}

export function checkShiftBound(user, shiftStart) {
  if (!shiftStart) return { allowed: true };
  const now = Date.now();
  const shiftStartMs = new Date(shiftStart).getTime();
  const windowStart = shiftStartMs - SHIFT_BOUND_WINDOW_MS;
  const windowEnd = shiftStartMs + SHIFT_BOUND_WINDOW_MS;
  if (now < windowStart || now > windowEnd) {
    return { allowed: false, reason: 'Outside shift window' };
  }
  return { allowed: true };
}

export async function checkDeviceAllowList(userId, deviceFingerprint, ip) {
  const user = await User.findById(userId).select('allowedDevices').lean();
  if (!user?.allowedDevices?.length) return { allowed: true, reason: 'No allowlist configured' };
  const now = Date.now();
  const device = user.allowedDevices.find((d) => d.fingerprint === deviceFingerprint && (now - d.createdAt < DEVICE_ALLOWLIST_TTL_MS));
  if (!device) return { allowed: false, reason: 'Device not in allowlist' };
  return { allowed: true, deviceId: device._id };
}

export async function checkIpAllowList(userId, ip) {
  const user = await User.findById(userId).select('allowedIps').lean();
  if (!user?.allowedIps?.length) return { allowed: true, reason: 'No IP allowlist configured' };
  const allowed = user.allowedIps.some((allowedIp) => {
    if (allowedIp.includes('/')) {
      const [base, bits] = allowedIp.split('/');
      const mask = ~0 << (32 - parseInt(bits, 10));
      const ipNum = ipToNumber(ip);
      const baseNum = ipToNumber(base);
      return (ipNum & mask) === (baseNum & mask);
    }
    return allowedIp === ip;
  });
  return { allowed };
}

function ipToNumber(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

export function requireIdleLock(req, res, next) {
  const lock = checkIdleLock(req.authUser);
  if (lock.locked) {
    return res.status(403).json({
      message: `Session idle for ${lock.idleMinutes} minutes. Please enter your PIN to continue.`,
      code: 'IDLE_LOCK',
      idleMinutes: lock.idleMinutes,
    });
  }
  next();
}

export function requireShiftBound(req, res, next) {
  const shiftStart = req.authUser?.shiftStart || req.body?.shiftStart || req.query?.shiftStart;
  const check = checkShiftBound(req.authUser, shiftStart);
  if (!check.allowed) {
    return res.status(403).json({ message: check.reason, code: 'SHIFT_VIOLATION' });
  }
  next();
}

export function requireDeviceAllowList(req, res, next) {
  const fingerprint = req.headers['x-device-fingerprint'] || req.body?.deviceFingerprint;
  const ip = req.ip;
  checkDeviceAllowList(req.user.id, fingerprint, ip).then((result) => {
    if (!result.allowed) return res.status(403).json({ message: result.reason, code: 'DEVICE_NOT_ALLOWED' });
    next();
  }).catch((err) => res.status(500).json({ message: err.message }));
}

export function requireIpAllowList(req, res, next) {
  checkIpAllowList(req.user.id, req.ip).then((result) => {
    if (!result.allowed) return res.status(403).json({ message: 'IP not in allowlist', code: 'IP_NOT_ALLOWED' });
    next();
  }).catch((err) => res.status(500).json({ message: err.message }));
}

export const downtimeMode = async (req, res, next) => {
  const hospital = await Hospital.findById(req.user?.hospitalId).select('downtimeMode').lean();
  if (hospital?.downtimeMode) {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (!safeMethods.includes(req.method)) {
      return res.status(503).json({ message: 'System in downtime mode. Write operations suspended.', code: 'DOWNTIME_MODE' });
    }
  }
  next();
};

export const breachRegister = {
  async log(breach) {
    const entry = {
      detectedAt: new Date(),
      breachId: crypto.randomUUID(),
      severity: breach.severity || 'medium',
      description: breach.description,
      affectedUsers: breach.affectedUsers || [],
      affectedRecords: breach.affectedRecords || [],
      reportedTo: breach.reportedTo || [],
      status: 'open',
      containmentSteps: [],
      notificationSent: false,
      deadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
    };
    return AuditLog.create({ action: 'breach_logged', actor: breach.reporterId, payload: entry, severity: 'critical' });
  },
  async update(breachId, update) {
    return AuditLog.findOneAndUpdate({ 'payload.breachId': breachId }, { $set: { 'payload.$': { ...update } } }, { new: true });
  },
  async get(breachId) {
    return AuditLog.findOne({ 'payload.breachId': breachId });
  },
  async list(filter = {}) {
    return AuditLog.find({ action: 'breach_logged', ...filter }).sort({ createdAt: -1 }).limit(100);
  },
};

export async function verifyPin(req, res, next) {
  const { pin } = req.body || {};
  const user = req.authUser;
  if (!user?.pinHash) {
    return res.status(403).json({ message: 'PIN not set. Contact administrator.', code: 'PIN_NOT_SET' });
  }
  if (!pin) {
    return res.status(400).json({ message: 'PIN required', code: 'PIN_REQUIRED' });
  }
  const match = await bcrypt.compare(pin, user.pinHash);
  if (!match) {
    user.failedPinAttempts = (user.failedPinAttempts || 0) + 1;
    if (user.failedPinAttempts >= MAX_FAILED_PIN_ATTEMPTS) {
      user.lockedAt = new Date();
      await user.save();
      return res.status(403).json({ message: 'Too many failed attempts. Account locked.', code: 'PIN_LOCKED' });
    }
    await user.save();
    return res.status(401).json({ message: 'Invalid PIN', code: 'PIN_INVALID' });
  }
  user.failedPinAttempts = 0;
  user.lockedAt = null;
  user.lastActivityAt = new Date();
  await user.save();
  next();
}

export async function initPin(req, res, next) {
  const { pin } = req.body || {};
  if (!pin || pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
    return res.status(400).json({ message: 'PIN must be 4-8 digits', code: 'INVALID_PIN_FORMAT' });
  }
  const pinHash = await bcrypt.hash(pin, 12);
  req.user.pinHash = pinHash;
  req.user.failedPinAttempts = 0;
  await req.user.save();
  res.json({ message: 'PIN set successfully' });
}

export function updateActivity(req, _res, next) {
  // Throttled: one write per user per minute at most, so protect() never
  // becomes a write-per-request load. The in-memory value on req.authUser is
  // refreshed too so a burst of parallel requests collapses to a single write.
  //
  // Fail-soft by design: this is activity bookkeeping, not the request's
  // purpose. A synchronous throw here (partial User mock in tests, model
  // registration issue in prod) must not take down an otherwise-authenticated
  // request — same contract as the .catch(() => {}) below it.
  try {
    if (req.authUser && typeof User.updateOne === 'function') {
      const last = new Date(req.authUser.lastActivityAt || 0).getTime();
      if (Date.now() - last > 60_000) {
        req.authUser.lastActivityAt = new Date();
        User.updateOne({ _id: req.authUser._id }, { $set: { lastActivityAt: req.authUser.lastActivityAt } })
          .exec()
          .catch(() => {});
      }
    }
  } catch {
    /* best-effort: never fail the request over activity tracking */
  }
  if (typeof next === 'function') next();
}