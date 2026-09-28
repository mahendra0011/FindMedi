import AuditLog from '../models/AuditLog.js';
import { indexAuditLog } from '../services/opensearchIndexer.js';

/**
 * Writes an audit entry to MongoDB (system of record) and fans it out to
 * OpenSearch so compliance/security teams can query across the retention
 * window with full-text search.
 *
 * The Mongo write is authoritative and MUST succeed; the OpenSearch document
 * is fire-and-forget and never blocks or fails the request. OpenSearch is
 * unconfigured in dev/test, in which case indexAuditLog() is a no-op.
 */
export const auditLog = async (action, userId, details) => {
  try {
    const entry = await AuditLog.create({
      userId,
      action,
      details,
      ip: details?.ip || null,
      userAgent: details?.userAgent || null,
      timestamp: new Date(),
    });

    // Keep the search document flat — Mongo `details` is Mixed and can be
    // arbitrarily nested, which OpenSearch's text mapping cannot index.
    let flattened = '';
    try {
      flattened = JSON.stringify(details ?? {});
    } catch {
      flattened = '[unserializable details]';
    }

    void indexAuditLog({
      logId: String(entry._id),
      actorId: userId ? String(userId) : '',
      action,
      resourceType: details?.resourceType || '',
      resourceId: details?.resourceId ? String(details.resourceId) : '',
      ip: details?.ip || '',
      details: flattened,
      timestamp: entry.timestamp?.toISOString?.() || new Date().toISOString(),
    }).catch(() => { /* mirror only; Mongo already has the record */ });
  } catch (error) {
    console.error('Audit log failed:', error.message);
  }
};
