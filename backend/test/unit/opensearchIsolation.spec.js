/**
 * DP-B-01 + DL-B-01: two-patient OpenSearch isolation.
 *
 * The failure this pins: an empty/short OPENSEARCH_PSEUDONYM_SALT used to
 * collapse every patient into one shared key, so a consented search for
 * patient A could return patient B's EHR documents. The runtime now fails
 * closed (pseudonymizePatientId throws, startup asserts the salt).
 *
 * This spec uses the REAL pseudonymizePatientId (not a mock) and mocks only
 * the transport (global fetch), so it proves:
 *   1. salt present  -> two patients get distinct, deterministic, raw-free keys;
 *   2. salt absent   -> pseudonymization throws instead of a shared fallback;
 *   3. indexEhrDoc writes the pseudonym, never the raw id (both patients).
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

process.env.OPENSEARCH_PSEUDONYM_SALT = 'isolation-test-salt-0123456789abcdef';
process.env.OPENSEARCH_NODE = process.env.OPENSEARCH_NODE || 'http://opensearch-test:9200';

const { pseudonymizePatientId, indexEhrDoc } = await import(
  '../../src/services/opensearchIndexer.js'
);

const SALT = process.env.OPENSEARCH_PSEUDONYM_SALT;
const realFetch = globalThis.fetch;

describe('DP-B-01/DL-B-01 two-patient isolation', () => {
  beforeEach(() => {
    process.env.OPENSEARCH_PSEUDONYM_SALT = SALT;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.OPENSEARCH_PSEUDONYM_SALT = SALT;
    globalThis.fetch = realFetch;
  });

  it('gives two patients distinct, deterministic, raw-free keys when salt is present', () => {
    const a = 'patient-A-000000000001';
    const b = 'patient-B-000000000002';
    const pa = pseudonymizePatientId(a);
    const pb = pseudonymizePatientId(b);

    expect(pa).toMatch(/^[a-f0-9]{32}$/);
    expect(pb).toMatch(/^[a-f0-9]{32}$/);
    expect(pa).not.toBe(pb);
    // Deterministic: correlation without identity.
    expect(pseudonymizePatientId(a)).toBe(pa);
    expect(pseudonymizePatientId(b)).toBe(pb);
    // No raw identifier survives inside the key.
    expect(pa).not.toContain('patient-A');
    expect(pb).not.toContain('patient-B');
  });

  it('throws when the salt is absent or short instead of a shared fallback key', () => {
    const saved = process.env.OPENSEARCH_PSEUDONYM_SALT;
    try {
      process.env.OPENSEARCH_PSEUDONYM_SALT = '';
      expect(() => pseudonymizePatientId('patient-A')).toThrow(
        /OPENSEARCH_PSEUDONYM_SALT/,
      );
      process.env.OPENSEARCH_PSEUDONYM_SALT = 'short';
      expect(() => pseudonymizePatientId('patient-A')).toThrow(
        /at least 32/,
      );
    } finally {
      process.env.OPENSEARCH_PSEUDONYM_SALT = saved;
    }
  });

  it('indexes two patients under non-overlapping pseudonyms, never the raw id', async () => {
    const bodies = [];
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
    }));
    // Capture request bodies: osReq POSTs JSON to /<index>/_doc/<id>.
    globalThis.fetch.mockImplementation(async (url, opts) => {
      try {
        bodies.push({ url: String(url), body: JSON.parse(opts?.body || '{}') });
      } catch {
        bodies.push({ url: String(url), body: {} });
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });

    const pa = pseudonymizePatientId('patient-A-000000000001');
    const pb = pseudonymizePatientId('patient-B-000000000002');

    await indexEhrDoc({
      recordId: 'rec-A1',
      patientId: 'patient-A-000000000001',
      docType: 'note',
      text: 'follow-up, phone 9876543210',
    });
    await indexEhrDoc({
      recordId: 'rec-B1',
      patientId: 'patient-B-000000000002',
      docType: 'note',
      text: 'follow-up, phone 9876543210',
    });

    expect(bodies.length).toBe(2);
    const [docA, docB] = bodies.map((b) => b.body);
    // Both docs carry the keyed pseudonym in BOTH id fields...
    expect(docA.patientId).toBe(pa);
    expect(docA.patientPseudonym).toBe(pa);
    expect(docB.patientId).toBe(pb);
    expect(docB.patientPseudonym).toBe(pb);
    // ...and neither carries a raw subject id anywhere in the indexed body.
    for (const doc of [docA, docB]) {
      expect(JSON.stringify(doc)).not.toContain('patient-A-000000000001');
      expect(JSON.stringify(doc)).not.toContain('patient-B-000000000002');
    }
    // Isolation: a term filter for A's pseudonym cannot match B's doc.
    expect(docA.patientId).not.toBe(docB.patientId);
  });
});
