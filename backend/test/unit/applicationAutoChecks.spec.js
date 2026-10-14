import { jest } from '@jest/globals';
import { gstinChecksum } from '../../src/lib/gstin.js';
import { encryptPhi, joinPhiIndex } from '../../src/utils/phiFields.js';

// 2.md 6 / 2.md 11 — the submit-time automatic screen. Two properties matter
// most and are asserted hardest: a CONFLICT verdict (duplicate tax identity /
// payout-name mismatch) must set forceTwoPerson so one reviewer cannot wave it
// through, and a throwing query must degrade to an `error` check — the screen
// annotates a submission, it never 500s one.

const APPLICANT = '64a0000000000000000000aa';
const OTHER_USER = '64a0000000000000000000bb';

const chain = (value) => {
  const q = {
    select: () => q,
    limit: () => q,
    lean: () => q,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    catch: (fn) => Promise.resolve(value).catch(fn),
  };
  return q;
};

const appFind = jest.fn();
const providerFind = jest.fn();
const userFindById = jest.fn();
let lastAppFilter = null;

jest.unstable_mockModule('../../src/models/ProviderApplication.js', () => ({
  __esModule: true,
  default: { find: (filter) => { lastAppFilter = filter; return appFind(filter); } },
}));
jest.unstable_mockModule('../../src/models/Provider.js', () => ({
  __esModule: true,
  default: { find: (...args) => providerFind(...args) },
}));
jest.unstable_mockModule('../../src/models/User.js', () => ({
  __esModule: true,
  default: { findById: (...args) => userFindById(...args) },
}));

const {
  runAutoChecks, isDisposableEmail, normalizeTaxId, looksVoip, hashIp, findStateName,
  AUTO_CHECK_KEYS, DISPOSABLE_EMAIL_DOMAINS,
} = await import('../../src/lib/applicationAutoChecks.js');

/** A GSTIN whose checksum actually validates: state(2) + PAN(10) + entity + Z + check. */
const buildGstin = (pan, stateCode = '27') => {
  const first14 = `${stateCode}${pan}1Z`;
  return first14 + gstinChecksum(first14);
};

// Penny-drop runs inside the screen; pin the mode so no test depends on the
// environment a previous suite left behind.
const ORIGINAL_MODE = process.env.PENNY_DROP_MODE;
beforeAll(() => { process.env.PENNY_DROP_MODE = 'mock'; });
afterAll(() => {
  if (ORIGINAL_MODE === undefined) delete process.env.PENNY_DROP_MODE;
  else process.env.PENNY_DROP_MODE = ORIGINAL_MODE;
});

const makeApplication = (stepData = {}) => ({
  _id: '64a000000000000000000001',
  applicationId: 'APP-AUTO-TEST-01',
  applicantUserId: APPLICANT,
  status: 'submitted',
  draft: { stepData },
});

const byKey = (checks) => Object.fromEntries(checks.map((c) => [c.key, c]));

beforeEach(() => {
  lastAppFilter = null;
  appFind.mockReset().mockImplementation(() => chain([]));
  providerFind.mockReset().mockImplementation(() => chain([]));
  userFindById.mockReset().mockImplementation(() => chain({ email: 'owner@smiledental.in', phone: '9876543210' }));
});

describe('runAutoChecks (clean submission)', () => {
  it('covers every check key and returns a clear verdict', async () => {
    const result = await runAutoChecks({
      application: makeApplication({ account: { display_name: 'Smile Dental Studio' } }),
    });
    expect(result.verdict).toBe('clear');
    expect(result.forceTwoPerson).toBe(false);
    expect(result.checks).toHaveLength(AUTO_CHECK_KEYS.length);
    expect(result.checks.map((c) => c.key).sort()).toEqual([...AUTO_CHECK_KEYS].sort());
    expect(result.checks.some((c) => c.status === 'flag' || c.status === 'error')).toBe(false);
    expect(result.runAt).toBeInstanceOf(Date);
    // No tax id and no payout supplied: those checks SKIP, they do not fail.
    const checks = byKey(result.checks);
    expect(checks.duplicate_pan.status).toBe('skip');
    expect(checks.payout_name_match.status).toBe('skip');
    expect(checks.duplicate_name.status).toBe('pass');
    // The four newer checks are input-gated too: no reg no / no captured IP /
    // no address → skip, never a flag that would muddy a clean verdict.
    expect(checks.gstin_pan_match.status).toBe('skip');
    expect(checks.duplicate_reg.status).toBe('skip');
    expect(checks.ip_cluster.status).toBe('skip');
    expect(checks.pin_location_match.status).toBe('skip');
  });

  it('queries the duplicate scan with the applicant excluded and only live statuses', async () => {
    await runAutoChecks({
      application: makeApplication({ account: { display_name: 'Smile Dental Studio' } }),
    });
    expect(lastAppFilter).toEqual({
      $and: [
        { _id: { $ne: '64a000000000000000000001' }, status: { $in: ['needs_info', 'submitted', 'resubmitted', 'under_review', 'approved'] } },
        { $or: [{ 'draft.stepData.display_name': expect.any(RegExp) }, { 'draft.stepData.legal_name': expect.any(RegExp) }] },
      ],
    });
  });
});

describe('runAutoChecks (duplicate tax identity)', () => {
  it('flags a PAN another applicant already used as a conflict and forces two-person', async () => {
    appFind.mockImplementation(() => chain([
      {
        applicationId: 'APP-DUP-9',
        applicantUserId: OTHER_USER,
        draft: { stepData: { pan: 'ABCDE1234F' } },
      },
    ]));
    const result = await runAutoChecks({
      application: makeApplication({ account: { pan: 'ABCDE1234F' } }),
    });
    const checks = byKey(result.checks);
    expect(checks.duplicate_pan).toEqual(expect.objectContaining({
      status: 'flag', severity: 'conflict',
    }));
    expect(result.verdict).toBe('conflict');
    expect(result.forceTwoPerson).toBe(true);
  });

  it('treats the same PAN on your own earlier application as a pass', async () => {
    appFind.mockImplementation(() => chain([
      {
        applicationId: 'APP-MINE-1',
        applicantUserId: APPLICANT,
        draft: { stepData: { pan: 'ABCDE1234F' } },
      },
    ]));
    const result = await runAutoChecks({
      application: makeApplication({ account: { pan: 'ABCDE1234F' } }),
    });
    expect(byKey(result.checks).duplicate_pan.status).toBe('pass');
    expect(result.verdict).toBe('clear');
    expect(result.forceTwoPerson).toBe(false);
  });

  it('normalizes the PAN before comparing (case, spacing, punctuation)', async () => {
    appFind.mockImplementation(() => chain([
      {
        applicationId: 'APP-DUP-9',
        applicantUserId: OTHER_USER,
        draft: { stepData: { pan: 'abcde1234f' } },
      },
    ]));
    const result = await runAutoChecks({
      application: makeApplication({ account: { pan: 'ABCDE 1234F' } }),
    });
    expect(byKey(result.checks).duplicate_pan.severity).toBe('conflict');
  });

  it('matches an ENCRYPTED stored PAN through its blind index, never the value (P2-9)', async () => {
    const cipher = encryptPhi('ProviderApplication', 'draft.stepData.pan', 'ABCDE1234F');
    appFind.mockImplementation(() => chain([
      {
        applicationId: 'APP-ENC-1',
        applicantUserId: OTHER_USER,
        draft: { stepData: { pan: cipher } },
        phiIndexes: { pan: joinPhiIndex('pan', 'ABCDE1234F') },
      },
    ]));
    const result = await runAutoChecks({
      application: makeApplication({ account: { pan: 'ABCDE1234F' } }),
    });
    // The query offers BOTH generations: plaintext equality (legacy rows) and
    // the keyed HMAC (encrypted rows).
    expect(lastAppFilter.$and[1].$or).toEqual(expect.arrayContaining([
      { 'draft.stepData.pan': 'ABCDE1234F' },
      { 'phiIndexes.pan': joinPhiIndex('pan', 'ABCDE1234F') },
    ]));
    const checks = byKey(result.checks);
    expect(checks.duplicate_pan).toEqual(expect.objectContaining({ status: 'flag', severity: 'conflict' }));
    expect(result.verdict).toBe('conflict');
    expect(result.forceTwoPerson).toBe(true);
  });

  it('never confirms a duplicate on ciphertext alone — the post-filter needs the index', async () => {
    const cipher = encryptPhi('ProviderApplication', 'draft.stepData.pan', 'ABCDE1234F');
    appFind.mockImplementation(() => chain([
      {
        applicationId: 'APP-ENC-2',
        applicantUserId: OTHER_USER,
        draft: { stepData: { pan: cipher } },
        phiIndexes: { pan: null }, // indexed row without a live index: must not match
      },
    ]));
    const result = await runAutoChecks({
      application: makeApplication({ account: { pan: 'ABCDE1234F' } }),
    });
    expect(byKey(result.checks).duplicate_pan.status).toBe('pass');
    expect(result.forceTwoPerson).toBe(false);
  });

  it('decrypts the encrypted draft in memory before the integrity checks run (P2-9)', async () => {
    // gstin_pan_match validates the VALUE's checksum: only plaintext can pass,
    // so this fails if runAutoChecks ever stopped decrypting the draft.
    const gstin = buildGstin('ABCDE1234F');
    const cipher = encryptPhi('ProviderApplication', 'draft.stepData.gstin', gstin);
    const result = await runAutoChecks({
      application: makeApplication({ account: { gstin: cipher, pan: 'ABCDE1234F' } }),
    });
    const checks = byKey(result.checks);
    expect(checks.gstin_pan_match.status).toBe('pass');
    expect(checks.duplicate_gstin.status).toBe('pass');
    expect(result.verdict).toBe('clear');
  });
});

describe('runAutoChecks (name, contact, payout)', () => {
  it('flags a same-name live listing for a human to decide, not a conflict', async () => {
    providerFind.mockImplementation(() => chain([
      { providerId: 'prov_live_1', ownerUserId: OTHER_USER, name: 'Smile Dental Studio', status: 'live' },
    ]));
    const result = await runAutoChecks({
      application: makeApplication({ account: { display_name: 'Smile Dental Studio' } }),
    });
    const checks = byKey(result.checks);
    expect(checks.duplicate_name).toEqual(expect.objectContaining({ status: 'flag', severity: 'review' }));
    expect(result.verdict).toBe('review');
    expect(result.forceTwoPerson).toBe(false);
  });

  it('flags a disposable inbox and an implausible phone as review, never blocks', async () => {
    userFindById.mockImplementation(() => chain({ email: 'throwaway@yopmail.com', phone: '12345' }));
    const result = await runAutoChecks({ application: makeApplication({}) });
    const checks = byKey(result.checks);
    expect(checks.disposable_email.status).toBe('flag');
    expect(checks.voip_phone.status).toBe('flag');
    expect(result.verdict).toBe('review');
  });

  it('runs the payout penny-drop in mock mode and records the pass', async () => {
    const result = await runAutoChecks({
      application: makeApplication({
        payout: {
          account_holder: 'Ramesh Kumar',
          account_number: '123456789012',
          ifsc: 'HDFC0001234',
        },
      }),
    });
    const checks = byKey(result.checks);
    expect(checks.payout_name_match.status).toBe('pass');
    expect(checks.payout_name_match.note).toContain('mock');
    expect(result.verdict).toBe('clear');
  });
});

describe('runAutoChecks (fail-soft)', () => {
  it('turns a throwing duplicate scan into error checks instead of rejecting', async () => {
    appFind.mockImplementation(() => { throw new Error('mongo down'); });
    userFindById.mockImplementation(() => { throw new Error('mongo down'); });
    const result = await runAutoChecks({
      application: makeApplication({ account: { pan: 'ABCDE1234F', display_name: 'Smile Dental Studio' } }),
    });
    expect(result.verdict).toBe('error');
    expect(result.forceTwoPerson).toBe(false);
    const checks = byKey(result.checks);
    expect(checks.duplicate_pan.status).toBe('error');
    expect(checks.duplicate_name.status).toBe('error');
    // Contact hygiene degrades to a skip when the applicant read fails.
    expect(checks.disposable_email.status).toBe('skip');
  });

  it('still returns every check key when nothing at all is supplied', async () => {
    const result = await runAutoChecks({ application: makeApplication({}) });
    expect(result.checks).toHaveLength(AUTO_CHECK_KEYS.length);
    expect(result.verdict).toBe('clear');
  });

  it('survives an empty call (defensive: never throws)', async () => {
    const result = await runAutoChecks({});
    expect(result.verdict).toBe('clear');
    expect(result.checks).toHaveLength(AUTO_CHECK_KEYS.length);
  });
});

describe('runAutoChecks (reg ↔ identity, network & location)', () => {
  it('passes a checksum-valid GSTIN whose embedded PAN matches the declared one', async () => {
    const gstin = buildGstin('ABCDE1234F');
    const result = await runAutoChecks({
      application: makeApplication({ account: { gstin, pan: 'ABCDE1234F' } }),
    });
    expect(byKey(result.checks).gstin_pan_match).toEqual(expect.objectContaining({ status: 'pass' }));
    expect(result.verdict).toBe('clear');
  });

  it('flags a GSTIN issued against a different PAN as review (not conflict — corporate PANs are real)', async () => {
    const gstin = buildGstin('ABCDE1234F');
    const result = await runAutoChecks({
      application: makeApplication({ account: { gstin, pan: 'AAAAA1111A' } }),
    });
    const c = byKey(result.checks).gstin_pan_match;
    expect(c).toEqual(expect.objectContaining({ status: 'flag', severity: 'review' }));
    // A note is a stored document the queue renders — it must NOT re-print
    // the tax IDs field encryption is hiding on the row (P2-9).
    expect(c.note).toContain('AAAAA****A');
    expect(c.note).not.toContain('AAAAA1111A');
    expect(c.note).not.toContain('ABCDE1234F');
    expect(result.verdict).toBe('review');
    expect(result.forceTwoPerson).toBe(false);
  });

  it('flags a GSTIN that fails its own checksum (single-character typo guard)', async () => {
    const valid = buildGstin('ABCDE1234F');
    const broken = valid.slice(0, 14) + (valid[14] === '0' ? '1' : '0');
    const result = await runAutoChecks({
      application: makeApplication({ account: { gstin: broken } }),
    });
    expect(byKey(result.checks).gstin_pan_match).toEqual(expect.objectContaining({
      status: 'flag', severity: 'review',
    }));
    expect(result.verdict).toBe('review');
  });

  it('flags the same registration number on another applicant, naming the name mismatch', async () => {
    appFind.mockImplementation(() => chain([
      {
        applicationId: 'APP-REG-7',
        applicantUserId: OTHER_USER,
        draft: { stepData: { registration_number: 'A-12345', display_name: 'Other Clinic Pvt Ltd' } },
      },
    ]));
    const result = await runAutoChecks({
      application: makeApplication({
        identity: { registration_number: 'a12345' },
        account: { display_name: 'Smile Dental Studio' },
      }),
    });
    const c = byKey(result.checks).duplicate_reg;
    expect(c).toEqual(expect.objectContaining({ status: 'flag', severity: 'review' }));
    expect(c.note).toContain('APP-REG-7');
    expect(c.note).toContain('different applicant');
    expect(c.note).toContain('under a different name');
    expect(result.verdict).toBe('review');
    expect(result.forceTwoPerson).toBe(false);
  });

  it('treats the same registration number on your own earlier application as a pass', async () => {
    appFind.mockImplementation(() => chain([
      {
        applicationId: 'APP-MINE-REG',
        applicantUserId: APPLICANT,
        draft: { stepData: { registration_number: 'A-12345' } },
      },
    ]));
    const result = await runAutoChecks({
      application: makeApplication({ identity: { registration_number: 'A-12345' } }),
    });
    expect(byKey(result.checks).duplicate_reg.status).toBe('pass');
    expect(result.verdict).toBe('clear');
  });

  it('clusters in-flight applications from the same hashed submit network', async () => {
    appFind.mockImplementation(() => chain([
      { applicationId: 'APP-NET-2', applicantUserId: OTHER_USER },
    ]));
    const result = await runAutoChecks({
      application: { ...makeApplication({}), submitIpHash: 'deadbeef'.repeat(4) },
    });
    const c = byKey(result.checks).ip_cluster;
    expect(c).toEqual(expect.objectContaining({ status: 'flag', severity: 'review' }));
    expect(c.note).toContain('same submit network');
    expect(result.verdict).toBe('review');
    expect(result.forceTwoPerson).toBe(false);
  });

  it('never queries (or flags) without a captured IP hash', async () => {
    const result = await runAutoChecks({ application: makeApplication({}) });
    expect(byKey(result.checks).ip_cluster.status).toBe('skip');
    expect(appFind).not.toHaveBeenCalled();
  });

  it('agrees when the PIN circle matches the state in the address', async () => {
    const result = await runAutoChecks({
      application: makeApplication({ location: { address: 'Shop 4, MG Road, Bengaluru, Karnataka 560001' } }),
    });
    expect(byKey(result.checks).pin_location_match).toEqual(expect.objectContaining({ status: 'pass' }));
    expect(result.verdict).toBe('clear');
  });

  it('flags a PIN whose circle disagrees with the stated state', async () => {
    const result = await runAutoChecks({
      application: makeApplication({ location: { address: 'Shop 4, MG Road, Bengaluru, Karnataka 400001' } }),
    });
    const c = byKey(result.checks).pin_location_match;
    expect(c).toEqual(expect.objectContaining({ status: 'flag', severity: 'review' }));
    expect(c.note).toContain('400001');
    expect(c.note).toContain('Karnataka');
    expect(result.verdict).toBe('review');
    expect(result.forceTwoPerson).toBe(false);
  });
});

describe('pure helpers', () => {
  it('detects disposable domains only (a bad local part is not the check)', () => {
    expect(isDisposableEmail('x@yopmail.com')).toBe(true);
    expect(isDisposableEmail('x@mailinator.com')).toBe(true);
    expect(isDisposableEmail('x@gmail.com')).toBe(false);
    expect(isDisposableEmail('')).toBe(false);
    expect(DISPOSABLE_EMAIL_DOMAINS.has('tempmail.com')).toBe(true);
  });

  it('normalizes tax ids to their exact shape or nothing', () => {
    expect(normalizeTaxId(' abc-de1234f ', 10)).toBe('ABCDE1234F');
    expect(normalizeTaxId('ABCDE1234F', 10)).toBe('ABCDE1234F');
    expect(normalizeTaxId('27AAECA1234F1Z5', 15)).toBe('27AAECA1234F1Z5');
    expect(normalizeTaxId('ABCDE1234', 10)).toBe('');
    expect(normalizeTaxId(null, 10)).toBe('');
  });

  it('flags only phones outside a plausible direct-dial shape', () => {
    expect(looksVoip('9876543210')).toBe(false);
    expect(looksVoip('+91 98765 43210')).toBe(false);
    expect(looksVoip('9999999999')).toBe(true);
    expect(looksVoip('0000000000')).toBe(true);
    expect(looksVoip('123')).toBe(true);
    expect(looksVoip('')).toBe(true);
  });

  it('hashes the submit IP to a stable truncated digest and refuses empties', () => {
    const h = hashIp('203.0.113.7');
    expect(typeof h).toBe('string');
    expect(h).toHaveLength(32);
    expect(h).toBe(hashIp('203.0.113.7'));
    expect(h).not.toContain('.'); // the raw address never survives on the row
    expect(hashIp('')).toBeNull();
    expect(hashIp(undefined)).toBeNull();
  });

  it('finds the canonical state name inside free-text addresses', () => {
    expect(findStateName('Shop 4, MG Road, Bengaluru, Karnataka 560001')).toBe('Karnataka');
    expect(findStateName('Sector 22, Chandigarh 160022')).toBe('Chandigarh');
    expect(findStateName('somewhere with no pin or state')).toBe('');
  });
});
