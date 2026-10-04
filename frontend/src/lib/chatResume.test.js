import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildSyncPayload,
  classifySendError,
  getCursor,
  mergeMessages,
  setCursor,
} from '@/lib/chatResume';

beforeEach(() => localStorage.clear());

describe('CHAT-M-01 reconnect/resume contract', () => {
  it('stores a cursor and builds a sync payload for missed events', () => {
    expect(getCursor('conv-1')).toBeNull();
    setCursor('conv-1', { messageId: 'm-10', at: '2026-10-04T10:00:00.000Z' });
    expect(getCursor('conv-1')).toEqual({ messageId: 'm-10', at: '2026-10-04T10:00:00.000Z' });

    const payload = buildSyncPayload('conv-1');
    expect(payload.conversationId).toBe('conv-1');
    expect(payload.afterId).toBe('m-10');
    expect(payload.since).toBe(new Date('2026-10-04T10:00:00.000Z').getTime());
  });

  it('falls back to a lookback window when no cursor exists', () => {
    const before = Date.now();
    const payload = buildSyncPayload('conv-new');
    expect(payload.afterId).toBeNull();
    expect(payload.since).toBeGreaterThanOrEqual(before - 60000 - 1000);
    expect(payload.since).toBeLessThanOrEqual(Date.now());
  });

  it('offline queue behaviour: network error → queued, server rejection → failed', () => {
    expect(classifySendError({})).toBe('queued'); // no response = network drop
    expect(classifySendError({ response: { status: 403 } })).toBe('failed');
    expect(classifySendError({ response: { status: 500 } })).toBe('failed');
  });

  it('duplicate delivery is safe: same _id twice renders once', () => {
    const existing = [{ _id: 'm1', content: 'Hello' }];
    const merged = mergeMessages(existing, [
      { _id: 'm1', content: 'Hello' }, // socket replay of the same row
      { _id: 'm2', content: 'Hi' },
    ]);
    expect(merged.map((m) => m._id)).toEqual(['m1', 'm2']);
  });

  it('duplicate delivery is safe across transports: same clientGeneratedId merges', () => {
    const optimistic = [{ _id: 'c-1', clientGeneratedId: 'c-1', content: 'draft', status: 'sending' }];
    const merged = mergeMessages(optimistic, [
      { _id: 'srv-1', clientGeneratedId: 'c-1', content: 'draft', status: 'sent' }, // REST ack
      { _id: 'srv-1', clientGeneratedId: 'c-1', content: 'draft', status: 'sent' }, // socket echo
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]._id).toBe('srv-1');
    expect(merged[0].status).toBe('sent');
  });

  it('does not drop distinct messages that share content', () => {
    const merged = mergeMessages([], [
      { _id: 'm1', content: 'ok' },
      { _id: 'm2', content: 'ok' },
    ]);
    expect(merged).toHaveLength(2);
  });
});
