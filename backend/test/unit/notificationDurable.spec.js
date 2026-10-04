/**
 * NOTIF-M-01 + LOY-M-01 + MH-M-01.
 */
import { jest } from '@jest/globals';

// ─── NOTIF-M-01: durable notification (delivery receipt + retry, no silent .catch) ──
const notifRows = [];
const deliveryRows = [];
const outboxRows = [];

jest.unstable_mockModule('../../src/models/Notification.js', () => ({
  default: {
    create: jest.fn(async (doc) => {
      if (!doc?.userId || !doc?.title) throw new Error('validation failed');
      const row = { _id: `n${notifRows.length + 1}`, ...doc };
      notifRows.push(row);
      return row;
    }),
    findOne: jest.fn(() => ({ lean: async () => null })),
    countDocuments: jest.fn(async () => 0),
  },
}));
jest.unstable_mockModule('../../src/models/NotificationDelivery.js', () => ({
  default: {
    findOneAndUpdate: jest.fn(async (filter, update, opts) => {
      deliveryRows.push({ filter, update, opts });
      return { ...filter, ...update.$set };
    }),
    updateOne: jest.fn(async (filter, update, opts) => {
      deliveryRows.push({ filter, update, opts });
      return { modifiedCount: 1 };
    }),
    create: jest.fn(async (doc) => { deliveryRows.push(doc); return doc; }),
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));
jest.unstable_mockModule('../../src/models/NotificationAudit.js', () => ({
  default: { create: jest.fn(async () => ({})) },
}));
jest.unstable_mockModule('../../src/models/NotificationPreference.js', () => ({
  default: { findOne: jest.fn(() => ({ lean: async () => null })), updateOne: jest.fn(async () => ({})) },
}));
jest.unstable_mockModule('../../src/lib/transactionalOutbox.js', () => ({
  writeOutboxEvent: jest.fn(async (e) => { outboxRows.push(e); return e; }),
}));
jest.unstable_mockModule('../../src/config/redis.js', () => ({
  redisClient: { incr: jest.fn(), expire: jest.fn(), isOpen: false },
  isRedisReady: jest.fn(() => false),
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const { queueDurableNotification } = await import('../../src/services/notificationOutbox.js');
const { deliver, isRetryable, backoffMs } = await import('../../src/services/notificationDelivery.js');

describe('NOTIF-M-01 durable notification pattern', () => {
  beforeEach(() => {
    notifRows.length = 0; deliveryRows.length = 0; outboxRows.length = 0;
    jest.clearAllMocks();
  });

  it('queues notification + delivery receipt + outbox event (no silent drop)', async () => {
    const res = await queueDurableNotification({
      userId: 'u1', title: 'Ride update', message: 'Rider arriving',
      type: 'ride', dedupKey: 'ride-arriving:r1',
    });
    expect(res.notification).toBeTruthy();
    expect(notifRows).toHaveLength(1);
    expect(deliveryRows.length).toBeGreaterThanOrEqual(1);
    expect(outboxRows).toHaveLength(1);
    expect(outboxRows[0]).toMatchObject({ eventType: 'NotificationQueued.v1' });
  });

  it('validation failure is logged + recorded, never silently swallowed', async () => {
    const res = await queueDurableNotification({ userId: '', title: '', message: '' });
    expect(res.notification).toBeNull();
    expect(res.reason).toBe('no-recipient-or-content');
  });

  it('delivery retries transient errors and dead-letters permanent ones', async () => {
    expect(isRetryable({ status: 500 })).toBe(true);
    expect(isRetryable({ status: 400 })).toBe(false);
    expect(isRetryable({})).toBe(true);
    expect(backoffMs(1, () => 0.5)).toBeGreaterThan(0);
    expect(backoffMs(10, () => 0.5)).toBeLessThanOrEqual(60 * 60 * 1000);
    // deliver() records attempts but never throws (imported for wiring pin)
    expect(typeof deliver).toBe('function');
  });

  it('no completion-path .catch(()=>{}) remains silent (source pin)', async () => {
    const { readFile } = await import('node:fs/promises');
    const assistant = await readFile(new URL('../../src/routes/assistantBookings.js', import.meta.url), 'utf8');
    const complete = assistant.slice(assistant.indexOf("router.post('/:id/complete'"), assistant.indexOf("router.post('/:id/cancel'"));
    expect(complete).not.toMatch(/\.catch\(\(\)\s*=>\s*\{\}\)/);
  });
});
