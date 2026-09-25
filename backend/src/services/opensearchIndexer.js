/**
 * Spec 15 — OpenSearch provider/audit indexing with Mongo fallback.
 * No client dependency: uses native fetch against OPENSEARCH_NODE.
 * When unconfigured, searchProviders() transparently falls back to MongoDB
 * regex search so provider discovery never breaks.
 */
import logger from '../config/logger.js';

export const OPENSEARCH_NODE = (process.env.OPENSEARCH_NODE || '').replace(/\/$/, '');
export const PROVIDERS_INDEX = 'findmedi_providers_v1';
export const AUDIT_INDEX = 'findmedi_audit_logs_v1';

export function isOpenSearchConfigured() {
  return Boolean(OPENSEARCH_NODE);
}

async function osReq(method, path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${OPENSEARCH_NODE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`OpenSearch ${res.status} on ${path}`);
    return await res.json().catch(() => ({}));
  } finally {
    clearTimeout(timeout);
  }
}

const PROVIDER_MAPPING = {
  settings: {
    analysis: {
      analyzer: {
        autocomplete_analyzer: {
          type: 'custom',
          tokenizer: 'edge_ngram_tokenizer',
          filter: ['lowercase', 'asciifolding'],
        },
      },
      tokenizer: {
        edge_ngram_tokenizer: { type: 'edge_ngram', min_gram: 2, max_gram: 15, token_chars: ['letter', 'digit'] },
      },
    },
  },
  mappings: {
    properties: {
      providerId: { type: 'keyword' },
      vertical: { type: 'keyword' },
      fullName: { type: 'text', analyzer: 'autocomplete_analyzer', search_analyzer: 'standard' },
      specialization: { type: 'keyword' },
      city: { type: 'keyword' },
      rating: { type: 'float' },
      isVerified: { type: 'boolean' },
      geoPoint: { type: 'geo_point' },
      h3_res7: { type: 'keyword' },
    },
  },
};

/** Create indices if a cluster is configured (safe to call at boot; no-op otherwise). */
export async function ensureIndices() {
  if (!isOpenSearchConfigured()) return { skipped: 'opensearch_unconfigured' };
  try {
    await osReq('PUT', `/${PROVIDERS_INDEX}`, PROVIDER_MAPPING);
    await osReq('PUT', `/${AUDIT_INDEX}`, { mappings: { properties: {
      logId: { type: 'keyword' }, actorId: { type: 'keyword' }, action: { type: 'keyword' },
      resourceType: { type: 'keyword' }, resourceId: { type: 'keyword' },
      details: { type: 'text' }, timestamp: { type: 'date' },
    } } });
    return { ok: true };
  } catch (err) {
    logger.warn(`ensureIndices skipped: ${err.message}`);
    return { skipped: err.message };
  }
}

export async function indexProviderDoc(doc) {
  if (!isOpenSearchConfigured() || !doc?.providerId) return null;
  try {
    const body = { ...doc };
    if (doc.lat != null && doc.lon != null) body.geoPoint = { lat: doc.lat, lon: doc.lon };
    await osReq('POST', `/${PROVIDERS_INDEX}/_doc/${encodeURIComponent(String(doc.providerId))}`, body);
    return true;
  } catch (err) {
    logger.warn(`indexProviderDoc skipped: ${err.message}`);
    return null;
  }
}

export async function indexAuditLog(entry) {
  if (!isOpenSearchConfigured()) return null;
  try {
    await osReq('POST', `/${AUDIT_INDEX}/_doc`, { ...entry, timestamp: new Date().toISOString() });
    return true;
  } catch (err) {
    logger.warn(`indexAuditLog skipped: ${err.message}`);
    return null;
  }
}

async function mongoProviderSearch({ q, vertical, city, size }) {
  // Fallback discovery across provider directories (regex, capped).
  const rx = new RegExp(String(q || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const results = [];
  try {
    const want = (v) => !vertical || vertical === v || vertical === 'all';
    if (want('doctor')) {
      const { default: Doctor } = await import('../models/Doctor.js');
      const docs = await Doctor.find({ $or: [{ name: rx }, { specialization: rx }] })
        .select('name specialization emergencySupport isEmergencyDutyActive').limit(size).lean();
      docs.forEach((d) => results.push({ providerId: String(d._id), vertical: 'doctor', fullName: d.name, specialization: d.specialization }));
    }
    if (want('lawyer') && results.length < size) {
      const { default: LawyerProfile } = await import('../models/LawyerProfile.js');
      const docs = await LawyerProfile.find({ lawyerStatus: 'active' })
        .populate({ path: 'userId', select: 'name', match: { name: rx } }).limit(size).lean();
      docs.filter((d) => d.userId).forEach((d) => results.push({ providerId: String(d.userId._id || d.userId), vertical: 'lawyer', fullName: d.userId.name }));
    }
    if (want('assistant') && results.length < size) {
      const { default: AssistantProfile } = await import('../models/AssistantProfile.js');
      const docs = await AssistantProfile.find({ assistantStatus: 'active', ...(city ? { operatingCity: city } : {}) })
        .populate({ path: 'userId', select: 'name', match: { name: rx } }).limit(size).lean();
      docs.filter((d) => d.userId).forEach((d) => results.push({ providerId: String(d.userId._id || d.userId), vertical: 'assistant', fullName: d.userId.name }));
    }
    if (want('rider') && results.length < size) {
      const { default: RiderProfile } = await import('../models/RiderProfile.js');
      const docs = await RiderProfile.find({ riderStatus: 'active', isOnline: true })
        .populate({ path: 'userId', select: 'name', match: { name: rx } }).limit(size).lean();
      docs.filter((d) => d.userId).forEach((d) => results.push({ providerId: String(d.userId._id || d.userId), vertical: 'rider', fullName: d.userId.name }));
    }
  } catch (err) {
    logger.warn(`mongoProviderSearch error: ${err.message}`);
  }
  return results.slice(0, size);
}

export async function searchProviders({ q, vertical, city, lat, lon, radiusKm = 15, size = 20 } = {}) {
  if (!q) return { source: isOpenSearchConfigured() ? 'opensearch' : 'mongo_fallback', results: [] };
  if (!isOpenSearchConfigured()) {
    return { source: 'mongo_fallback', results: await mongoProviderSearch({ q, vertical, city, size }) };
  }
  try {
    const must = [{
      multi_match: { query: q, fields: ['fullName^2', 'specialization^3'], fuzziness: 'AUTO' },
    }];
    const filter = [];
    if (vertical && vertical !== 'all') filter.push({ term: { vertical } });
    if (city) filter.push({ term: { city } });
    if (lat != null && lon != null) {
      filter.push({ geo_distance: { distance: `${Number(radiusKm) || 15}km`, geoPoint: { lat: Number(lat), lon: Number(lon) } } });
    }
    const data = await osReq('POST', `/${PROVIDERS_INDEX}/_search`, {
      size, query: { bool: { must, filter } },
    });
    const results = (data?.hits?.hits || []).map((h) => ({ score: h._score, ...h._source }));
    return { source: 'opensearch', results };
  } catch (err) {
    logger.warn(`OpenSearch query failed, mongo fallback: ${err.message}`);
    return { source: 'mongo_fallback', results: await mongoProviderSearch({ q, vertical, city, size }) };
  }
}
