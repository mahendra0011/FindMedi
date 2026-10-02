/**
 * ADM-M-02: "no immutable admin-activity view". The view half was read-only
 * UI; the immutability half was a convention (no code path updates an AuditLog)
 * that nothing enforced. These assertions move it into the schema: any future
 * updateOne/set through mongoose silently drops these paths, so history cannot
 * be rewritten from application code even by accident.
 *
 * Retention stays the TTL index - immutable means append-only, not eternal
 * (the 1-year window is the documented retention, see data dictionary).
 */
import { describe, it, expect } from '@jest/globals';
import AuditLog from '../../src/models/AuditLog.js';

describe('ADM-M-02 AuditLog is append-only at the schema level', () => {
  const trailFields = ['userId', 'action', 'details', 'ip', 'userAgent', 'timestamp'];

  it.each(trailFields)('%s cannot be rewritten through mongoose updates', (field) => {
    expect(AuditLog.schema.path(field).options.immutable).toBe(true);
  });

  it('still requires an actor and an action (a row without either is not a trail)', () => {
    expect(AuditLog.schema.path('userId').options.required).toBe(true);
    expect(AuditLog.schema.path('action').options.required).toBe(true);
  });

  it('keeps the 1-year TTL - immutable is append-only, not eternal', () => {
    const ttl = AuditLog.schema.indexes().find(([fields]) => fields.timestamp === 1);
    expect(ttl).toBeDefined();
    expect(ttl[1].expireAfterSeconds).toBe(365 * 24 * 60 * 60);
  });

  it('fails fast when Mongo is down instead of buffering 10s (AUTH-B-05 unchanged)', () => {
    expect(AuditLog.schema.options.bufferCommands).toBe(false);
  });
});
