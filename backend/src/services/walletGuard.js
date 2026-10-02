/**
 * PAY-M-02: wallet withdrawal limits, KYC state, velocity checks and freeze.
 *
 * Before this existed, `POST /api/transactions/withdraw` enforced exactly one
 * rule — balance ≥ amount + ₹100 reserve — so a single account could drain
 * ₹5 lakh in ₹20k chunks as fast as the rate limiter allowed, with no KYC
 * state and nothing to freeze. The three controls the finding asked for:
 *
 *   LIMITS      per-transaction cap (WALLET_MAX_PER_TXN, default ₹20,000) and
 *               a rolling IST-day cap (WALLET_DAILY_CAP, default ₹50,000),
 *               enforced by ONE atomic update on the guard document — the same
 *               $lte-guard-then-$inc shape PAY-001 used for the balance, so
 *               concurrent requests cannot overshoot the cap either.
 *   VELOCITY    at most WALLET_HOURLY_MAX_COUNT (default 5) withdrawals per
 *               IST hour. The attempt that exceeds it does not go through — it
 *               FREEZES the wallet, because "5 withdrawals in an hour" on a
 *               provider account is an anomaly worth stopping, not throttling.
 *   KYC/FREEZE  `kycStatus` + `frozen` state on the guard document. KYC
 *               enforcement defaults OFF (there is no approval flow yet to
 *               verify anyone); freezing is always live.
 *
 * Budget is claimed BEFORE the balance debit and released if the debit fails,
 * so a rejected withdrawal never consumes a day's quota.
 */
import WalletGuard from '../models/WalletGuard.js';
import { auditLog } from '../middleware/audit.js';
import { getISTDateString, getISTDateTimeParts } from '../utils/dateUtils.js';

const envInt = (name, fallback) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

export const walletLimits = () => ({
  perTxn: envInt('WALLET_MAX_PER_TXN', 20000),
  daily: envInt('WALLET_DAILY_CAP', 50000),
  hourlyMaxCount: envInt('WALLET_HOURLY_MAX_COUNT', 5),
  kycRequired: process.env.WALLET_KYC_REQUIRED === 'true',
});

/** Limits are keyed in IST because the platform's "day" is IST everywhere else. */
export const dayKeyOf = (now = new Date()) => getISTDateString(now);
export const hourKeyOf = (now = new Date()) => `${getISTDateString(now)}-${getISTDateTimeParts(now).h}`;

export async function ensureGuard(userId) {
  // one round trip: the upsert both creates the row and returns it
  const doc = await WalletGuard.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return doc;
}

/**
 * Zero any window whose key has rolled over. Returns the guard as it now
 * stands so callers read counters that match the window they are about to
 * claim against.
 */
export async function resetStaleWindows(guard, now = new Date()) {
  if (!guard) return guard;
  const day = dayKeyOf(now);
  const hour = hourKeyOf(now);
  const $set = {};
  const daily = { ...(guard.daily || {}) };
  if (daily.dayKey !== day) {
    $set['daily.dayKey'] = day;
    $set['daily.amount'] = 0;
    $set['daily.count'] = 0;
    daily.dayKey = day;
    daily.amount = 0;
    daily.count = 0;
  }
  const hourly = { ...(guard.hourly || {}) };
  if (hourly.hourKey !== hour) {
    $set['hourly.hourKey'] = hour;
    $set['hourly.count'] = 0;
    hourly.hourKey = hour;
    hourly.count = 0;
  }
  if (Object.keys($set).length) {
    await WalletGuard.updateOne({ userId: guard.userId }, { $set });
  }
  return { ...guard, daily, hourly };
}

/** Pre-checks that never mutate: frozen > KYC > per-transaction cap. */
export async function checkWithdrawal({ userId, amount, now = new Date() }) {
  const limits = walletLimits();
  let guard = await ensureGuard(userId);
  guard = await resetStaleWindows(guard, now);

  if (guard?.frozen?.active) {
    return { allowed: false, code: 403, reason: 'wallet-frozen', guard, limits };
  }
  if (limits.kycRequired && guard?.kycStatus !== 'verified') {
    return { allowed: false, code: 403, reason: 'kyc-required', guard, limits };
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > limits.perTxn) {
    return { allowed: false, code: 400, reason: 'per-txn-limit', guard, limits };
  }
  return { allowed: true, guard, limits };
}

/**
 * Atomically claim `amount` against the daily cap and one slot against the
 * hourly velocity budget. The single update carries BOTH guards
 * (`daily.amount $lte cap - amount` and `hourly.count $lt max`), so two
 * concurrent requests cannot both slip through the same remaining headroom —
 * the same reasoning as PAY-001's balance guard.
 *
 * On refusal we re-read to tell the two limits apart: a velocity breach
 * freezes the wallet (anomaly), a daily-cap breach merely waits for tomorrow.
 */
export async function claimBudget({ userId, amount, now = new Date() }) {
  const limits = walletLimits();
  const day = dayKeyOf(now);
  const hour = hourKeyOf(now);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    // resetting the window matters; its RETURN value does not — the claim
    // below filters on day/hour keys, not on the object we just read.
    const guard = await ensureGuard(userId);
    await resetStaleWindows(guard, now);

    const res = await WalletGuard.updateOne(
      {
        userId,
        'daily.dayKey': day,
        'daily.amount': { $lte: limits.daily - amount },
        'hourly.hourKey': hour,
        'hourly.count': { $lt: limits.hourlyMaxCount },
      },
      { $inc: { 'daily.amount': amount, 'daily.count': 1, 'hourly.count': 1 } }
    );
    if (res?.modifiedCount === 1) return { allowed: true };

    // Refused. Decide why from a fresh read (the window may also have rolled
    // between the claim and the read — that case loops once and retries).
    const fresh = await WalletGuard.findOne({ userId }).lean();
    if (!fresh) continue;
    if (fresh.hourly?.hourKey === hour && (fresh.hourly.count || 0) >= limits.hourlyMaxCount) {
      await freezeWallet(userId, 'velocity', 'system', { hourlyCount: fresh.hourly.count, window: hour });
      return { allowed: false, reason: 'velocity-freeze', frozen: true, guard: fresh };
    }
    if (fresh.daily?.dayKey === day && (fresh.daily.amount || 0) + amount > limits.daily) {
      return { allowed: false, reason: 'daily-cap', guard: fresh };
    }
    // window rolled under us — retry the claim against the fresh keys
  }
  return { allowed: false, reason: 'daily-cap' };
}

/** Give the quota back when the balance debit below it fails. */
export async function releaseBudget({ userId, amount, now = new Date() }) {
  const day = dayKeyOf(now);
  const hour = hourKeyOf(now);
  await WalletGuard.updateOne(
    { userId, 'daily.dayKey': day, 'daily.amount': { $gte: amount } },
    { $inc: { 'daily.amount': -amount, 'daily.count': -1 } }
  );
  await WalletGuard.updateOne(
    { userId, 'hourly.hourKey': hour, 'hourly.count': { $gte: 1 } },
    { $inc: { 'hourly.count': -1 } }
  );
}

/**
 * Freeze is guarded by `frozen.active $ne true` so repeated anomalies do not
 * rewrite the original reason/at — the first freeze is the one an investigator
 * wants to see.
 */
export async function freezeWallet(userId, reason, by = 'system', details = {}) {
  // ensure the row exists first: an admin freezing a wallet that has never
  // withdrawn would otherwise be a silent no-op (updateOne without upsert).
  await ensureGuard(userId);
  const res = await WalletGuard.updateOne(
    { userId, 'frozen.active': { $ne: true } },
    { $set: { 'frozen.active': true, 'frozen.reason': String(reason), 'frozen.at': new Date(), 'frozen.by': by } }
  );
  if (res.modifiedCount === 1) {
    await auditLog('wallet.freeze', userId, { reason: String(reason), by, ...details });
  }
  return res.modifiedCount === 1;
}

export async function unfreezeWallet(userId, by) {
  await ensureGuard(userId);
  const res = await WalletGuard.updateOne(
    { userId, 'frozen.active': true },
    { $set: { 'frozen.active': false, 'frozen.reason': '', 'frozen.by': by } }
  );
  if (res.modifiedCount === 1) {
    await auditLog('wallet.unfreeze', userId, { by });
  }
  return res.modifiedCount === 1;
}

export async function setKycStatus(userId, status, actor) {
  const guard = await WalletGuard.findOneAndUpdate(
    { userId },
    {
      $set: {
        kycStatus: status,
        ...(status === 'verified' ? { kycVerifiedAt: new Date(), kycVerifiedBy: actor } : {}),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  await auditLog('wallet.kyc', userId, { status, actor });
  return guard;
}
