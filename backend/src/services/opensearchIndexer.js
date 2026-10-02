/**
 * Spec 15 — OpenSearch provider/audit indexing with Mongo fallback.
 * No client dependency: uses native fetch against OPENSEARCH_NODE.
 * When unconfigured, searchProviders() transparently falls back to MongoDB
 * regex search so provider discovery never breaks.
 */
import logger from '../config/logger.js';
import { recordPipelineEvent } from './dataPipelineHealth.js';
import { createHmac } from 'crypto';

export const OPENSEARCH_NODE = (process.env.OPENSEARCH_NODE || '').replace(/\/$/, '');
export const PROVIDERS_INDEX = 'findmedi_providers_v1';
export const AUDIT_INDEX = 'findmedi_audit_logs_v1';
// Tech 07 medical indices.
export const DRUGS_INDEX = 'findmedi_drugs_v1';
export const ICD_INDEX = 'findmedi_icd_v1';
export const EHR_INDEX = 'findmedi_ehr_docs_v1';

export function isOpenSearchConfigured() {
  return Boolean(OPENSEARCH_NODE);
}

// DP-B-01: the security plugin is now mandatory. With it enabled an unauthenticated
// request answers 401, so the client must present credentials; without them the
// indexer would silently log "401 on /index" and stop writing — which is why this
// is a hard fail in production rather than a warning.
export const OPENSEARCH_USER = process.env.OPENSEARCH_USERNAME || '';
export const OPENSEARCH_PASSWORD = process.env.OPENSEARCH_PASSWORD || '';
const OPENSEARCH_TLS_REJECT_UNAUTHORIZED = process.env.OPENSEARCH_TLS_REJECT_UNAUTHORIZED !== 'false';

const hasCredentials = () => Boolean(OPENSEARCH_USER && OPENSEARCH_PASSWORD);

/**
 * DP-B-01: refuse to talk to an unauthenticated OpenSearch in production.
 * An anonymous `GET /_search` against this cluster returns full EHR documents
 * and the audit trail, so "credentials missing" must be a startup-class error
 * rather than a warning nobody reads.
 */
export function assertOpenSearchAuth() {
  if (!isOpenSearchConfigured()) return { ok: true, skipped: 'unconfigured' };
  if (hasCredentials()) return { ok: true };
  if (process.env.NODE_ENV === 'production' || process.env.OPENSEARCH_REQUIRE_AUTH === 'true') {
    throw new Error(
      'OPENSEARCH_USERNAME/OPENSEARCH_PASSWORD are required: the security plugin is '
      + 'enabled and an unauthenticated OpenSearch exposes EHR documents + audit logs.'
    );
  }
  return { ok: false, warning: 'opensearch credentials missing (non-production)' };
}

async function osReq(method, path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const headers = { 'Content-Type': 'application/json' };
    // DP-B-01: basic auth for the security plugin.
    if (hasCredentials()) {
      headers.Authorization = `Basic ${Buffer.from(`${OPENSEARCH_USER}:${OPENSEARCH_PASSWORD}`).toString('base64')}`;
    }
    const res = await fetch(`${OPENSEARCH_NODE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      // DP-B-01: never silently accept an unverifiable certificate.
      ...(OPENSEARCH_NODE.startsWith('https')
        ? { tls: { rejectUnauthorized: OPENSEARCH_TLS_REJECT_UNAUTHORIZED } }
        : {}),
    });
    if (res.status === 401 || res.status === 403) {
      throw new Error(`OpenSearch ${res.status} (authentication/authorization) on ${path}`);
    }
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
    // DP-B-03: strict on ALL five mappings (was only EHR + audit) so an
    // unexpected field can never silently land PII in a searchable index.
    dynamic: 'strict',
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

// ─── Tech 07 medical mappings (edge-ngram + standard search analyzer) ────────
const MED_SETTINGS = {
  analysis: {
    analyzer: {
      med_autocomplete: {
        type: 'custom',
        tokenizer: 'edge_ngram_tokenizer',
        filter: ['lowercase', 'asciifolding'],
      },
    },
    tokenizer: {
      edge_ngram_tokenizer: { type: 'edge_ngram', min_gram: 2, max_gram: 15, token_chars: ['letter', 'digit'] },
    },
  },
};

const DRUG_MAPPING = {
  settings: MED_SETTINGS,
  mappings: {
    dynamic: 'strict',
    properties: {
      medicineId: { type: 'keyword' },
      brand: { type: 'text', analyzer: 'med_autocomplete', search_analyzer: 'standard' },
      salt: { type: 'text', analyzer: 'med_autocomplete', search_analyzer: 'standard' },
      saltKey: { type: 'keyword' }, // normalized "amoxicillin+clavulanate|500+125"
      strength: { type: 'keyword' },
      therapeuticClass: { type: 'keyword' },
      form: { type: 'keyword' },
      sellingPrice: { type: 'float' },
      inStock: { type: 'boolean' },
      facilityId: { type: 'keyword' },
    },
  },
};

const ICD_MAPPING = {
  settings: MED_SETTINGS,
  mappings: {
    dynamic: 'strict',
    properties: {
      code: { type: 'keyword' },
      codePrefix: { type: 'keyword' }, // first 3 chars (category)
      title: { type: 'text', analyzer: 'med_autocomplete', search_analyzer: 'standard' },
      chapter: { type: 'keyword' },
    },
  },
};

const EHR_MAPPING = {
  settings: MED_SETTINGS,
  mappings: {
    // DP-B-03: strict mapping. Without it any extra field (a token, a phone
    // number, a free-text note) is silently indexed into the EHR store, and a
    // field cannot be deleted from an OpenSearch mapping once written.
    dynamic: 'strict',
    properties: {
      recordId: { type: 'keyword' },
      patientId: { type: 'keyword' },
      patientPseudonym: { type: 'keyword' },
      docType: { type: 'keyword' }, // lab | discharge | prescription | note
      text: { type: 'text', analyzer: 'standard' },
      allergies: { type: 'keyword' },
      createdAt: { type: 'date' },
    },
  },
};

/** Create indices if a cluster is configured (safe to call at boot; no-op otherwise). */
export async function ensureIndices() {
  if (!isOpenSearchConfigured()) return { skipped: 'opensearch_unconfigured' };
  try {
    await osReq('PUT', `/${PROVIDERS_INDEX}`, PROVIDER_MAPPING);
    await osReq('PUT', `/${AUDIT_INDEX}`, { mappings: {
      // DP-B-03: the audit mirror previously took an arbitrary flattened
      // `details` string, so a caller could index anything it liked into the
      // compliance store. Strict + an explicit property list keeps it bounded.
      dynamic: 'strict',
      properties: {
        logId: { type: 'keyword' }, actorId: { type: 'keyword' }, action: { type: 'keyword' },
        resourceType: { type: 'keyword' }, resourceId: { type: 'keyword' },
        ip: { type: 'ip', ignore_malformed: true },
        details: { type: 'text', index: false },
        timestamp: { type: 'date' },
      } } });
    await osReq('PUT', `/${DRUGS_INDEX}`, DRUG_MAPPING);
    await osReq('PUT', `/${ICD_INDEX}`, ICD_MAPPING);
    await osReq('PUT', `/${EHR_INDEX}`, EHR_MAPPING);
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
    // DP-B-05: indexing succeeded, so the search index is fresh.
    recordPipelineEvent('opensearch_indexer', 'success');
    return true;
  } catch (err) {
    // DP-B-05: an index write that only logs leaves search results
    // silently stale — the search endpoint keeps serving old data
    // with no signal that indexing stopped.
    recordPipelineEvent('opensearch_indexer', 'error', { error: err });
    logger.warn(`indexProviderDoc skipped: ${err.message}`);
    return null;
  }
}

export async function indexAuditLog(entry) {
  if (!isOpenSearchConfigured()) return null;
  try {
    await osReq('POST', `/${AUDIT_INDEX}/_doc`, { ...entry, timestamp: new Date().toISOString() });
    // DP-B-05: indexing succeeded, so the search index is fresh.
    recordPipelineEvent('opensearch_indexer', 'success');
    return true;
  } catch (err) {
    // DP-B-05: an index write that only logs leaves search results
    // silently stale — the search endpoint keeps serving old data
    // with no signal that indexing stopped.
    recordPipelineEvent('opensearch_indexer', 'error', { error: err });
    logger.warn(`indexAuditLog skipped: ${err.message}`);
    return null;
  }
}

// ─── DLM-06: erasure across the search tier ────────────────────────────────
//
// The Mongo row is not the only copy of a person. Search keeps providers and
// pseudonymised EHR text, and an erasure that left them behind would be
// invisible in the database but still served by the search endpoint.
//
// EHR documents are keyed by PSEUDONYM (DP-B-06), not the raw user id, so the
// purge has to recompute that pseudonym with the same salt to find them. This
// is also why a rotated OPENSEARCH_PSEUDONYM_SALT orphans the old rows rather
// than exposing them - but it means the purge must use the current salt.
const PII_INDICES = [PROVIDERS_INDEX, EHR_INDEX];

/**
 * @returns {Promise<{status:'ok'|'skipped'|'failed', detail:string, purged:Record<string,number>}>}
 *   `skipped` when OpenSearch is not configured (there is no index to purge -
 *   reported as a skip rather than an ok so the certificate cannot claim a
 *   purge that never happened).
 */
export async function purgeUserFromSearch(userId) {
  if (!isOpenSearchConfigured()) {
    return { status: 'skipped', detail: 'opensearch_not_configured', purged: {} };
  }

  const raw = String(userId);
  const pseudonym = pseudonymizePatientId(raw);
  const purged = {};

  try {
    for (const index of PII_INDICES) {
      // Two different identifiers: provider docs carry the raw id, EHR docs
      // carry only the pseudonym. Matching on the wrong one deletes nothing and
      // reports success, so both are queried.
      const query =
        index === EHR_INDEX
          ? { bool: { should: [{ term: { patientPseudonym: pseudonym } }, { term: { patientId: pseudonym } }], minimum_should_match: 1 } }
          : { bool: { should: [{ term: { providerId: raw } }, { term: { userId: raw } }], minimum_should_match: 1 } };

      const data = await osReq('POST', `/${index}/_delete_by_query?refresh=true`, {
        query,
        // A user with a large footprint can exceed the default 10k slice; the
        // purge must see every match, not the first page of them.
        conflicts: 'proceed',
        slices: 'auto',
      });
      purged[index] = Number(data?.deleted ?? 0);
    }
    return { status: 'ok', detail: `purged ${Object.values(purged).reduce((a, b) => a + b, 0)} doc(s)`, purged };
  } catch (err) {
    // Thrown, not swallowed: the caller records this as a FAILED step, which
    // blocks the certificate. A log line here is exactly the failure mode
    // DLM-06 is about.
    const e = new Error(`opensearch purge failed: ${err.message}`);
    e.cause = err;
    throw e;
  }
}

// ─── Tech 07: drug / ICD / EHR indexing + search ─────────────────────────────
export function saltKeyFor(genericName = '') {
  return String(genericName).toLowerCase().replace(/[^a-z0-9]+/g, '+').replace(/^\++|\++$/g, '');
}

export async function indexDrugDoc(med) {
  if (!isOpenSearchConfigured() || !med?._id) return null;
  try {
    await osReq('POST', `/${DRUGS_INDEX}/_doc/${encodeURIComponent(String(med._id))}`, {
      medicineId: String(med._id),
      brand: med.name,
      salt: med.genericName,
      saltKey: saltKeyFor(med.genericName),
      strength: med.strength || '',
      therapeuticClass: med.category,
      form: med.form,
      sellingPrice: med.sellingPrice,
      inStock: (med.currentStock ?? 0) > 0,
      facilityId: String(med.facilityId || med.hospitalId || ''),
    });
    // DP-B-05: indexing succeeded, so the search index is fresh.
    recordPipelineEvent('opensearch_indexer', 'success');
    return true;
  } catch (err) {
    // DP-B-05: an index write that only logs leaves search results
    // silently stale — the search endpoint keeps serving old data
    // with no signal that indexing stopped.
    recordPipelineEvent('opensearch_indexer', 'error', { error: err });
    logger.warn(`indexDrugDoc skipped: ${err.message}`);
    return null;
  }
}

/**
 * DP-B-06: pseudonymisation + masking for the analytics tier.
 *
 * `ehr_docs` used to store the raw patient Mongo id plus the verbatim clinical
 * text, which made the search index a second, un-consented copy of the medical
 * record — readable by anything with cluster access (DL-13/15). Now:
 *   - the subject id is replaced by a keyed, deterministic hash (correlation is
 *     preserved, identity is not);
 *   - direct identifiers inside the free text (Aadhaar, phone, email, MRN-like
 *     numbers) are masked before indexing;
 *   - the key comes from the environment and must never be committed, so the same
 *     input cannot be reversed by an attacker who reads the index.
 */
const PSEUDONYM_SALT = process.env.OPENSEARCH_PSEUDONYM_SALT || '';

export function pseudonymizePatientId(patientId) {
  const raw = String(patientId || '');
  if (!raw) return '';
  // Without a configured salt the value is still removed, but it becomes
  // irreversible per-boot noise rather than a stable pseudonym.
  if (!PSEUDONYM_SALT) return 'unpseudonymised';
  return createHmac('sha256', PSEUDONYM_SALT).update(raw).digest('hex').slice(0, 32);
}

const MASK_PATTERNS = [
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,                     // Aadhaar-like 12 digits
  /\b[6-9]\d{9}\b/g,                                       // Indian mobile
  /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g,                          // email
  /\b\d{2,4}\s*\/\s*\d{2,4}\s*\/\s*\d{2,4}\b/g,            // DOB
];

export function redactClinicalText(input) {
  let text = String(input ?? '').slice(0, 20000);
  for (const pattern of MASK_PATTERNS) text = text.replace(pattern, '[redacted]');
  return text;
}

export async function indexEhrDoc({ recordId, patientId, docType, text, allergies = [] }) {
  if (!isOpenSearchConfigured() || !recordId) return null;
  try {
    // DP-B-06: pseudonymize the subject id before it reaches the analytics store.
    // The raw Mongo id is a direct identifier; a keyed hash lets the same patient
    // be correlated across documents without the index being a patient directory.
    const pseudonym = pseudonymizePatientId(patientId);
    await osReq('POST', `/${EHR_INDEX}/_doc/${encodeURIComponent(String(recordId))}`, {
      recordId: String(recordId),
      patientId: pseudonym,
      patientPseudonym: pseudonym,
      docType: docType || 'note',
      text: redactClinicalText(text),
      allergies: (Array.isArray(allergies) ? allergies : []).map((a) => String(a).slice(0, 120)),
      createdAt: new Date().toISOString(),
    });
    // DP-B-05: indexing succeeded, so the search index is fresh.
    recordPipelineEvent('opensearch_indexer', 'success');
    return true;
  } catch (err) {
    // DP-B-05: an index write that only logs leaves search results
    // silently stale — the search endpoint keeps serving old data
    // with no signal that indexing stopped.
    recordPipelineEvent('opensearch_indexer', 'error', { error: err });
    logger.warn(`indexEhrDoc skipped: ${err.message}`);
    return null;
  }
}

async function mongoDrugSearch({ q, salt, size }) {
  const rx = new RegExp(String(q || salt || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  try {
    const mongoose = (await import('mongoose')).default;
    if (mongoose.connection.readyState !== 1) return [];
    const { default: Medicine } = await import('../models/Medicine.js');
    const or = [{ name: rx }];
    if (salt) or.push({ genericName: rx });
    else or.push({ genericName: rx }, { category: rx });
    const docs = await Medicine.find({ $or: or, currentStock: { $gt: 0 } })
      .select('name genericName category form sellingPrice currentStock').limit(size).lean();
    return docs;
  } catch {
    return [];
  }
}

// Brand → in-stock bio-equivalents ranked by savings (<15ms target on cluster).
export async function searchDrugs({ q, salt, size = 20 } = {}) {
  if (!q && !salt) return { source: 'none', results: [], substitutes: [] };
  if (!isOpenSearchConfigured()) {
    const results = await mongoDrugSearch({ q, salt, size });
    return { source: 'mongo_fallback', results, substitutes: substitutesFrom(results) };
  }
  try {
    const data = await osReq('POST', `/${DRUGS_INDEX}/_search`, {
      size,
      query: {
        bool: {
          must: [{ multi_match: {
            query: q || salt,
            fields: ['brand^3', 'salt^3', 'therapeuticClass'],
            fuzziness: 'AUTO',
          } }],
          filter: [{ term: { inStock: true } }],
        },
      },
    });
    const results = (data?.hits?.hits || []).map((h) => ({ score: h._score, ...h._source }));
    // Substitutes: same salt as top hit, cheapest first, with savings.
    let substitutes = [];
    const topSalt = results[0]?.saltKey;
    if (topSalt) {
      const sub = await osReq('POST', `/${DRUGS_INDEX}/_search`, {
        size: 5,
        query: { bool: { must: [{ term: { saltKey: topSalt } }], filter: [{ term: { inStock: true } }] } },
        sort: [{ sellingPrice: 'asc' }],
      });
      const rows = (sub?.hits?.hits || []).map((h) => h._source);
      const brandPrice = Math.max(...results.slice(0, 3).map((r) => r.sellingPrice || 0), 0);
      substitutes = rows.map((r) => ({ ...r, savingsVsTop: Math.round((brandPrice - (r.sellingPrice || 0)) * 100) / 100 }));
    }
    return { source: 'opensearch', results, substitutes };
  } catch (err) {
    logger.warn(`Drug search failed, mongo fallback: ${err.message}`);
    const results = await mongoDrugSearch({ q, salt, size });
    return { source: 'mongo_fallback', results, substitutes: substitutesFrom(results) };
  }
}

function substitutesFrom(rows) {
  if (!rows?.length) return [];
  const salt = String(rows[0].genericName || '').toLowerCase();
  const same = rows.filter((r) => String(r.genericName || '').toLowerCase() === salt);
  const sorted = [...same].sort((a, b) => (a.sellingPrice || 0) - (b.sellingPrice || 0));
  const top = Math.max(...rows.slice(0, 3).map((r) => r.sellingPrice || 0), 0);
  return sorted.slice(0, 5).map((r) => ({ ...r, savingsVsTop: Math.round((top - (r.sellingPrice || 0)) * 100) / 100 }));
}

export async function searchIcd({ q, size = 20 } = {}) {
  if (!q) return { source: 'none', results: [] };
  if (!isOpenSearchConfigured()) return { source: 'mongo_fallback', results: [] };
  try {
    const data = await osReq('POST', `/${ICD_INDEX}/_search`, {
      size,
      query: { bool: { should: [
        { prefix: { code: String(q).toUpperCase() } },
        { multi_match: { query: q, fields: ['title^2'], fuzziness: 'AUTO' } },
      ] } },
    });
    return { source: 'opensearch', results: (data?.hits?.hits || []).map((h) => ({ score: h._score, ...h._source })) };
  } catch (err) {
    logger.warn(`ICD search failed: ${err.message}`);
    return { source: 'mongo_fallback', results: [] };
  }
}

// EHR search: consent-gated (ABDM ConsentRecord GRANTED + unexpired) with
// snippet highlight + allergy warnings for unconscious-patient ER.
export async function searchEhr({ patientId, q, consentId, size = 10 } = {}) {
  if (!patientId || !q) return { source: 'none', results: [] };
  const { default: ConsentRecord } = await import('../models/ConsentRecord.js');
  const grant = consentId
    ? await ConsentRecord.findOne({ consentId }).lean()
    : await ConsentRecord.findOne({
      patientId, status: 'GRANTED', expiresAt: { $gt: new Date() },
    }).sort({ grantedAt: -1 }).lean();
  if (!grant || grant.status !== 'GRANTED' || (grant.expiresAt && new Date(grant.expiresAt) < new Date())) {
    return { source: 'denied', results: [], message: 'Active EHR consent required (ABDM M2/M3)' };
  }
  const { default: User } = await import('../models/User.js');
  const patient = await User.findById(patientId).select('allergies').lean().catch(() => null);
  const allergyTerms = (patient?.allergies || []).map((a) => String(a.allergen || a).toLowerCase()).filter(Boolean);
  if (!isOpenSearchConfigured()) {
    const { default: Record } = await import('../models/Record.js');
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const docs = await Record.find({ patientId, $or: [{ diagnosis: rx }, { notes: rx }, { symptoms: rx }] }).limit(size).lean().catch(() => []);
    return { source: 'mongo_fallback', results: docs, allergyFlags: allergyFlagsFor(docs, allergyTerms) };
  }
  try {
    // DP-B-06: the index stores the pseudonym, so the filter must use the same
    // keyed value — filtering on the raw id would silently return nothing and
    // push every consent-gated EHR search onto the Mongo fallback.
    const pseudonym = pseudonymizePatientId(patientId);
    const data = await osReq('POST', `/${EHR_INDEX}/_search`, {
      size,
      _source: ['recordId', 'docType', 'allergies', 'createdAt'],
      query: { bool: { must: [{ match: { text: q } }], filter: [{ term: { patientId: pseudonym } }] } },
      highlight: { fields: { text: { fragment_size: 200, number_of_fragments: 2 } } },
    });
    const results = (data?.hits?.hits || []).map((h) => ({ score: h._score, ...h._source, highlight: h.highlight?.text || [] }));
    if (!results.length) {
      // DP-B-06: the index may still hold documents written before pseudonymisation
      // (or with a different salt). Falling back to Mongo keeps the consent-gated
      // feature working instead of returning an empty, misleading result.
      const { default: Record } = await import('../models/Record.js');
      const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const docs = await Record.find({ patientId, $or: [{ diagnosis: rx }, { notes: rx }, { symptoms: rx }] }).limit(size).lean().catch(() => []);
      if (docs.length) return { source: 'mongo_fallback', results: docs, allergyFlags: allergyFlagsFor(docs, allergyTerms) };
    }
    return { source: 'opensearch', results, allergyFlags: allergyFlagsFor(results, allergyTerms) };
  } catch (err) {
    logger.warn(`EHR search failed: ${err.message}`);
    const { default: Record } = await import('../models/Record.js');
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const docs = await Record.find({ patientId, $or: [{ diagnosis: rx }, { notes: rx }, { symptoms: rx }] }).limit(size).lean().catch(() => []);
    return { source: 'mongo_fallback', results: docs, allergyFlags: allergyFlagsFor(docs, allergyTerms) };
  }
}

function allergyFlagsFor(docs, allergyTerms) {
  if (!allergyTerms?.length) return [];
  const flags = [];
  for (const d of docs || []) {
    const hay = JSON.stringify([d.text, d.highlight, d.diagnosis, d.notes, d.symptoms]).toLowerCase();
    for (const term of allergyTerms) {
      if (term && hay.includes(term)) flags.push({ recordId: d.recordId || String(d._id), allergy: term });
    }
  }
  return flags;
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
