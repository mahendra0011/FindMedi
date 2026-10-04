/**
 * NOTIF-M-01: durable notification writer.
 * Replaces fire-and-forget `Notification.create(...).catch(() => {})` — which
 * silently dropped SOS/lab/completion notices on validation or DB errors —
 * with a recorded pattern: Notification row (dedup-guarded) + delivery receipt
 * (queued) + outbox event for the worker pipeline. Never throws; failures are
 * logged AND recorded as a `failed` receipt so "did the patient get told?"
 * always has an answer.
 */
import logger from '../config/logger.js';

export async function queueDurableNotification({
  userId,
  title,
  message,
  type = 'system',
  referenceId = null,
  dedupKey = null,
  priority = 'normal',
  channel = 'inApp',
  payload = {},
} = {}) {
  if (!userId || !title || !message) {
    return { notification: null, reason: 'no-recipient-or-content' };
  }
  try {
    const { createNotification } = await import('./notificationService.js');
    const { notification, reason } = await createNotification({
      userId: String(userId),
      title,
      message,
      type,
      referenceId: referenceId ? String(referenceId) : null,
      dedupKey: dedupKey ? String(dedupKey) : undefined,
      priority,
    });
    if (!notification) {
      return { notification: null, reason: reason || 'suppressed' };
    }
    // Delivery receipt: queued state so the worker/retry loop owns the rest.
    try {
      const { default: NotificationDelivery } = await import('../models/NotificationDelivery.js');
      await NotificationDelivery.updateOne(
        { notificationId: String(notification._id), channel },
        {
          $setOnInsert: {
            notificationId: String(notification._id),
            userId: String(userId),
            channel,
            status: 'queued',
            createdAt: new Date(),
          },
          $set: { updatedAt: new Date() },
        },
        { upsert: true },
      );
    } catch (err) {
      logger.warn(`[notif-outbox] receipt queue failed: ${err.message}`);
    }
    // Outbox event for the async pipeline (poller → backbone/worker).
    try {
      const { writeOutboxEvent } = await import('../lib/transactionalOutbox.js');
      await writeOutboxEvent({
        aggregateType: 'provider',
        aggregateId: String(notification._id),
        eventType: 'NotificationQueued.v1',
        payload: { notificationId: String(notification._id), userId: String(userId), type, ...payload },
      });
    } catch (err) {
      logger.warn(`[notif-outbox] outbox queue failed: ${err.message}`);
    }
    return { notification, reason: reason || 'queued' };
  } catch (err) {
    // Validation / duplicate-race / DB outage: record, log, never throw.
    logger.error(`[notif-outbox] durable notification failed (${type}/${userId}): ${err.message}`);
    try {
      const { default: NotificationDelivery } = await import('../models/NotificationDelivery.js');
      await NotificationDelivery.create({
        notificationId: dedupKey ? `dedup:${dedupKey}` : `failed:${Date.now()}`,
        userId: String(userId),
        channel,
        status: 'failed',
        lastError: String(err.message || err).slice(0, 512),
      });
    } catch { /* receipt best-effort */ }
    return { notification: null, reason: 'failed', error: err.message };
  }
}
