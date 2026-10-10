/**
 * DOC-M-03: generated data dictionary (fields, PII, indexes, retention).
 *
 * The finding: 100+ mongoose schemas and no generated reference — nobody can
 * answer "which collections hold email addresses?", "what is indexed on
 * appointments?", or "does this model fall under the 7-year audit retention?"
 * without reading every file. This suite pins the generator in four places:
 *
 *   1. PRECISION — the classification guards. A dictionary that calls a drug
 *      catalog's `name` personal data is audit noise; one that misses
 *      `attachments.name` being a FILE name is worse. Substring traps
 *      (`company` vs `pan`, `fileName` vs `name`) are pinned explicitly.
 *   2. RETENTION — every mapped class comes from docs/privacy/RETENTION.md,
 *      and a model with PII but no class must yield null (a gap is reported,
 *      never invented).
 *   3. REAL SCHEMAS — the builder runs against src/models: every file loads,
 *      org records carry zero PII tags, TTL indexes surface, counts add up.
 *   4. FRESHNESS — the committed docs/data-dictionary.md must byte-match a
 *      fresh render, so the dictionary cannot drift from the code (this is
 *      the whole point of generating it).
 */
import { describe, it, expect, beforeAll } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyField,
  isOrgModel,
  retentionFor,
  buildDictionary,
  renderMarkdown,
} from '../../scripts/lib/dataDictionary.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.join(HERE, '..', '..');
const MODELS_DIR = path.join(BACKEND, 'src', 'models');
const OUTPUT = path.join(BACKEND, '..', 'docs', 'data-dictionary.md');

let dict;
let rendered;

beforeAll(async () => {
  dict = await buildDictionary({ modelsDir: MODELS_DIR });
  rendered = renderMarkdown(dict);
}, 60000);

describe('classifyField precision guards', () => {
  it('tags canonical person fields with the right category', () => {
    expect(classifyField('email')).toBe('Contact');
    expect(classifyField('password')).toBe('Credential');
    expect(classifyField('healthIdCard.abhaNumber')).toBe('Government ID');
    expect(classifyField('diagnosis')).toBe('Health');
    expect(classifyField('dateOfBirth')).toBe('Demographic');
    expect(classifyField('currentLocation.lat')).toBe('Location');
    expect(classifyField('patientId')).toBe('Identifier');
    expect(classifyField('name', 'User')).toBe('Identity');
    expect(classifyField('bankDetails.accountNumber')).toBe('Financial');
    expect(classifyField('staffSalary')).toBeNull(); // no substring luck
    expect(classifyField('salary')).toBe('Financial');
  });

  it('does not fall for substring traps', () => {
    expect(classifyField('company')).toBeNull(); // must not match `pan`
    expect(classifyField('ownerPan')).toBeNull(); // not a boundary
    expect(classifyField('panNumber')).toBe('Government ID');
    expect(classifyField('fileName')).toBeNull(); // `name` needs a boundary
    expect(classifyField('mustResetPassword')).not.toBe('Credential'); // a boolean, but document the boundary behaviour
  });

  it('suppresses label contexts but keeps person names', () => {
    expect(classifyField('attachments.name')).toBeNull(); // file name
    expect(classifyField('steps.name')).toBeNull(); // deletion-certificate step
    expect(classifyField('certifications.name')).toBeNull(); // certificate title
    expect(classifyField('messages.attachments.name')).toBeNull();
    expect(classifyField('emergencyContact.name')).toBe('Identity'); // a person
    expect(classifyField('otherPatient.name')).toBe('Identity');
  });

  it('suppresses every field rule for organization/catalog records', () => {
    expect(isOrgModel('Medicine')).toBe(true);
    expect(isOrgModel('Facility')).toBe(true);
    expect(isOrgModel('City')).toBe(true);
    expect(isOrgModel('User')).toBe(false);
    expect(isOrgModel('Appointment')).toBe(false);
    expect(classifyField('name', 'Medicine')).toBeNull(); // drug name
    expect(classifyField('address', 'Hospital')).toBeNull(); // facility address
    expect(classifyField('location', 'Equipment')).toBeNull(); // ward placement
    expect(classifyField('name', 'PreferredPharmacy')).toBeNull(); // pharmacy name
    expect(classifyField('patientId', 'PreferredPharmacy')).toBe('Identifier'); // the person link survives
    expect(classifyField('password', 'User')).toBe('Credential'); // org rule cannot leak
  });
});

describe('retention mapping (RETENTION.md classes only)', () => {
  it('maps the documented classes', () => {
    expect(retentionFor('AuditLog', 5).dataClass).toBe('Audit logs');
    expect(retentionFor('TransactionLedger', 3).dataClass).toBe('Payment and ledger entries');
    expect(retentionFor('MentalHealth', 3).dataClass).toBe('Mental-health records');
    expect(retentionFor('ConsentRecord', 3).dataClass).toBe('ABDM consent records');
    expect(retentionFor('Notification', 3).dataClass).toBe('Notifications');
    expect(retentionFor('Doctor', 3).dataClass).toBe('Provider KYC documents');
    expect(retentionFor('PharmacyOrder', 3).dataClass).toBe('Clinical records');
    expect(retentionFor('RideBooking', 3).dataClass).toBe('Ride and SOS location traces');
    expect(retentionFor('RefreshToken', 1).retention).toMatch(/logout or expiry/);
    expect(retentionFor('OTP', 1).retention).toMatch(/TTL/);
    expect(retentionFor('DeletionRequest', 1).dataClass).toBe('Audit logs');
  });

  it('never invents a class where RETENTION.md has none', () => {
    expect(retentionFor('User', 10)).toBeNull();
    expect(retentionFor('ChatMessage', 4)).toBeNull();
    expect(retentionFor('SomeFutureModel', 1)).toBeNull();
  });

  it('skips retention for org records and zero-PII models', () => {
    expect(retentionFor('Medicine', 0, true).dataClass).toMatch(/organization\/catalog/);
    expect(retentionFor('Anything', 0, false).dataClass).toMatch(/No PII fields/);
    expect(retentionFor('Anything', 0, false).retention).toMatch(/n\/a/);
  });
});

describe('buildDictionary against the real schemas', () => {
  it('loads every model file with nothing skipped', () => {
    expect(dict.counts.skipped).toBe(0);
    expect(dict.counts.models).toBeGreaterThanOrEqual(100);
    // Every file exports at least one model (BloodBank.js, InfectionControl.js
    // and ProcedureSuite.js export several).
    expect(dict.counts.models).toBeGreaterThanOrEqual(dict.counts.files);
    expect(dict.counts.fields).toBeGreaterThan(2500);
    expect(dict.counts.piiFields).toBeGreaterThan(300);
  });

  it('org records carry zero PII tags', () => {
    const orgs = dict.models.filter((d) => d.orgRecord);
    expect(orgs.length).toBeGreaterThanOrEqual(15);
    for (const d of orgs) {
      expect(d.piiFieldCount).toBe(0);
    }
  });

  it('classifies and indexes the User collection correctly', () => {
    const user = dict.models.find((d) => d.modelName === 'User');
    expect(user).toBeDefined();
    const byPath = Object.fromEntries(user.fields.map((f) => [f.path, f.pii]));
    expect(byPath.email).toBe('Contact');
    expect(byPath.password).toBe('Credential');
    expect(byPath.name).toBe('Identity');
    expect(byPath['healthIdCard.abhaNumber']).toBe('Government ID');
    expect(byPath.avatar).toBe('Image/Biometric');
    expect(user.indexes.some((i) => i.keys.includes('email') && i.flags.includes('unique'))).toBe(true);
    expect(user.collection).toBe('users');
  });

  it('surfaces TTL indexes', () => {
    const otp = dict.models.find((d) => d.modelName === 'OTP');
    expect(otp.ttlSeconds).toBeGreaterThan(0);
    expect(dict.counts.ttlCollections).toBeGreaterThanOrEqual(5);
    const withTtl = dict.models.filter((d) => d.ttlSeconds !== null).map((d) => d.modelName);
    expect(withTtl).toContain('RefreshToken');
  });

  it('reports retention gaps instead of guessing, and org records never gap', () => {
    const approvedGapBaseline = JSON.parse(fs.readFileSync(
      path.join(BACKEND, 'scripts', 'retention-gap-baseline.json'), 'utf8'
    ));
    expect(dict.unmappedRetention).toEqual(approvedGapBaseline);
    const orgCollections = dict.models.filter((d) => d.orgRecord).map((d) => d.collection);
    for (const gap of dict.unmappedRetention) {
      expect(orgCollections).not.toContain(gap);
    }
  });

  it('keeps counts internally consistent', () => {
    expect(dict.counts.fields).toBe(dict.models.reduce((n, d) => n + d.fields.length, 0));
    expect(dict.counts.piiFields).toBe(dict.models.reduce((n, d) => n + d.piiFieldCount, 0));
    expect(dict.counts.unmappedRetention).toBe(dict.unmappedRetention.length);
    expect(dict.counts.ttlCollections).toBe(dict.models.filter((d) => d.ttlSeconds !== null).length);
  });
});

describe('freshness of the committed dictionary', () => {
  it('docs/data-dictionary.md byte-matches a fresh render', () => {
    expect(fs.existsSync(OUTPUT)).toBe(true);
    const committed = fs.readFileSync(OUTPUT, 'utf8');
    expect(rendered).toBe(committed);
  });

  it('renders deterministically', () => {
    expect(renderMarkdown(dict)).toBe(rendered);
  });

  it('documents its own regeneration command and provenance', () => {
    expect(rendered).toContain('# Data Dictionary (generated)');
    expect(rendered).toContain('npm run docs:dictionary');
    expect(rendered).toContain('docs/privacy/RETENTION.md');
  });
});
