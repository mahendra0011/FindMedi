import NotificationDelivery from '../models/NotificationDelivery.js';
import logger from '../config/logger.js';

/**
 * NOTIF-M-04: receipts, retry with backoff, and a dead-letter state.
 *
 * WHY RETRY IS NOT JUST A LOOP
 * A transient provider 5xx should not cost the user a prescription email, but a
 * hard failure (invalid address, suppressed recipient) will fail identically
 * forever. So retries are bounded and exponential, and the last failure parks
 * the delivery in `dead-letter` rather than retrying forever - which is also what
 * makes "why did the patient never get this?" answerable.
 *
 * WHY `sent` IS NOT `delivered`
 * A provider 2xx means the message was ACCEPTED, not that it arrived.
 * Collapsing the two is how a platform reports a critical lab alert as
 * delivered when it bounced. `delivered` is only set by a provider webhook.
 */

export const MAX_ATTEMPTS = Number(process.env.NOTIFY_MAX_ATTEMPTS || 4);
const BASE_BACKOFF_MS = Number(process.env.NOTIFY_RETRY_BASE_MS || 60_000);

/** Exponential with a ceiling, plus jitter so an outage is not retried in lockstep. */
export const backoffMs = (attempt, random = Math.random) => {
  const raw = BASE_BACKOFF_MS * 2 ** (attempt - 1);
  const capped = Math.min(raw, 60 * 60 * 1000);
  // ±20% jitter so a provider outage does not retry every message in lockstep.
  return Math.round(capped * (0.8 + 0.4 * random()));
};

/**
 * Is this failure worth retrying?
 *
 * 4xx other than 429 means the request itself is wrong - a malformed address, a
 * rejected template. Retrying just burns quota and delays the dead-letter that
 * tells someone to fix it.
 */
export const isRetryable = (error) => {
  if (error?.permanent) return false;
  const status = error?.status ?? error?.response?.status;
  if (status == null) return true; // network / timeout: unknown, so retry
  if (status === 429) return true;
  return status >= 500;
};

const upsertReceipt = (notificationId, channel, userId, patch, attemptEntry) =>
  NotificationDelivery.findOneAndUpdate(
    { notificationId: String(notificationId), channel },
    {
      $set: { userId: String(userId), updatedAt: new Date(), ...patch },
      $push: { attempts: attemptEntry },
      $inc: { attemptCount: 1 },
      $setOnInsert: { notificationId: String(notificationId), channel, createdAt: new Date() },
    },
    { upsert: true, new: true }
  ).catch((err) => logger.error(`[delivery] receipt write failed: ${err.message}`));

/**
 * Send through `send`, recording every attempt.
 *
 * Never throws. A transport failure must not fail the clinical operation that
 * triggered it - an appointment booked without its confirmation email is still a
 * booked appointment.
 *
 * @param send () => Promise<{messageId?: string}>  must THROW on failure
 */
export const deliver = async ({ notificationId, userId, channel = 'email', send, maxAttempts = MAX_ATTEMPTS, random = Math.random }) => {
  if (!notificationId || !userId) {
    return { status: 'failed', reason: 'no-recipient' };
  }

  let attempt = 0;
  let lastError = null;

  while (attempt < maxAttempts) {
    attempt += 1;
    const at = new Date();
    try {
      const result = await send();

      await upsertReceipt(notificationId, channel, userId, {
        status: 'sent',
        providerMessageId: result?.messageId || null,
        lastError: null,
        nextAttemptAt: null,
        deadLetteredAt: null,
      }, { attempt, at, ok: true });

      return { status: 'sent', messageId: result?.messageId || null, attempts: attempt };
    } catch (err) {
      lastError = err;
      const retryable = isRetryable(err) && attempt < maxAttempts;

      await upsertReceipt(notificationId, channel, userId, {
        status: retryable ? 'failed' : 'dead-letter',
        lastError: String(err.message || err).slice(0, 512),
        nextAttemptAt: retryable ? new Date(at.getTime() + backoffMs(attempt, random)) : null,
        deadLetteredAt: retryable ? null : at,
      }, {
        attempt,
        at,
        ok: false,
        error: String(err.message || err).slice(0, 512),
        errorCode: err?.status ?? null,
      });

      if (!retryable) {
        logger.error(`[delivery] DEAD-LETTER ${channel} notification=${notificationId} after ${attempt} attempt(s): ${err.message}`);
        return { status: 'dead-letter', attempts: attempt, reason: err.message };
      }

      logger.warn(`[delivery] ${channel} notification=${notificationId} attempt ${attempt}/${maxAttempts} failed: ${err.message}`);
    }
  }

  return { status: 'dead-letter', attempts: attempt, reason: lastError?.message };
};

/**
 * Apply a provider webhook (delivered / hard-bounced).
 *
 * Keyed by the provider's own message id, which is the only identifier a webhook
 * carries. Returns false for an unknown id rather than inventing a receipt for a
 * delivery nobody initiated.
 */
export const applyProviderEvent = async ({ messageId, event }) => {
  if (!messageId) return false;
  const row = await NotificationDelivery.findOne({ providerMessageId: String(messageId) });
  if (!row) return false;

  const now = new Date();
  if (event === 'delivered') {
    row.status = 'delivered';
  } else if (event === 'bounced' || event === 'rejected') {
    row.status = 'dead-letter';
    row.deadLetteredAt = now;
    row.lastError = `provider ${event}`;
  } else {
    return false;
  }
  row.updatedAt = now;
  await row.save();
  return true;
};

/** Receipts for one notification, so the sender can see what actually happened. */
export const receiptsFor = async (notificationId) =>
  NotificationDelivery.find({ notificationId: String(notificationId) }).sort({ createdAt: 1 }).lean();