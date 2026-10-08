/**
 * A4 follow-through on P1-5 (routes/patient.js familySchema): the three
 * subdocuments FamilyMember already STORES are now writable - guardian
 * consent (5.md §2.1), the SOS emergency card (6.md §2.5) and the privacy
 * prefs (6.md §2.15) - and this is what pins the rules around that:
 *
 *  - SERVER-STAMPED: grantedBy/grantedAt/sharedAt are written by
 *    applyServerStamps(), never accepted from a body - a client attesting
 *    its own consent is not consent;
 *  - MERGED, not replaced: a PUT sending only `note` must not reset
 *    `granted`, and one sending only `discreetNotifications` must not drop
 *    `hiddenCategories`;
 *  - still stripped: `dependentOf`/`wearableLinks` remain server-managed
 *    (re-parenting / their own flow), as P1-5 strips unknown keys;
 *  - ownership: foreign family id -> 404.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const ROW_ID = '7500000000000000000000a1';
const FOREIGN_ID = '7500000000000000000000d4';
const PATIENT = { _id: 'pat-1', id: 'pat-1', role: 'patient' };

const create = jestApi.fn();
const findOne = jestApi.fn();

let lastFilter = null;

jestApi.unstable_mockModule('../../src/models/FamilyMember.js', () => ({
  default: {
    find: (filter) => { lastFilter = filter; return query([]); },
    findOne: (filter) => { lastFilter = filter; return query(currentRow); },
    create: (...args) => create(...args),
  },
}));

const { as } = await mountApp('patient', {});

let currentRow = null;

const makeMember = (over = {}) => ({
  _id: ROW_ID,
  patientId: 'pat-1',
  name: 'Aarav',
  relation: 'Child',
  isActive: true,
  guardianConsent: { granted: false, grantedBy: null, grantedAt: null, note: '' },
  emergencyCard: {
    allergies: '', conditions: '', bloodGroup: '', contacts: [],
    sharedInSos: false, sharedAt: null,
  },
  privacyPrefs: { hiddenCategories: [], discreetNotifications: false },
  save: jestApi.fn().mockResolvedValue(undefined),
  ...over,
});

beforeEach(() => {
  currentRow = null;
  lastFilter = null;
  create.mockReset();
  findOne.mockReset();
});

describe('POST /patient/family - guardian consent + emergency card stamps', () => {
  beforeEach(() => {
    create.mockImplementation(async (body) => ({ _id: ROW_ID, ...body }));
  });

  it('stamps grantedBy/grantedAt when consent is granted', async () => {
    const res = await as(PATIENT).post('/family').send({
      name: 'Aarav',
      relation: 'Child',
      guardianConsent: { granted: true, note: 'signed at clinic' },
    });
    expect(res.status).toBe(201);
    const [body] = create.mock.calls[0];
    expect(body.patientId).toBe('pat-1');
    expect(body.guardianConsent.granted).toBe(true);
    expect(body.guardianConsent.note).toBe('signed at clinic');
    expect(body.guardianConsent.grantedBy).toBe('pat-1');
    expect(body.guardianConsent.grantedAt).toBeInstanceOf(Date);
  });

  it('does not stamp grantedAt when consent is NOT granted', async () => {
    await as(PATIENT).post('/family').send({
      name: 'Aarav',
      relation: 'Child',
      guardianConsent: { granted: false },
    });
    const [body] = create.mock.calls[0];
    expect(body.guardianConsent.granted).toBe(false);
    expect(body.guardianConsent.grantedBy).toBeUndefined();
    expect(body.guardianConsent.grantedAt).toBeUndefined();
  });

  it('refuses a client-supplied grantedBy (the stamp is server-written)', async () => {
    await as(PATIENT).post('/family').send({
      name: 'Aarav',
      relation: 'Child',
      guardianConsent: { granted: true, grantedBy: 'someone-else' },
    });
    const [body] = create.mock.calls[0];
    expect(body.guardianConsent.grantedBy).toBe('pat-1');
  });

  it('still strips dependentOf and wearableLinks (server-managed fields)', async () => {
    await as(PATIENT).post('/family').send({
      name: 'Aarav',
      relation: 'Child',
      dependentOf: 'someone-else',
      wearableLinks: [{ provider: 'fitbit', externalId: 'x' }],
    });
    const [body] = create.mock.calls[0];
    expect(body.dependentOf).toBeUndefined();
    expect(body.wearableLinks).toBeUndefined();
  });

  it('accepts an emergency card and stamps sharedAt on first share', async () => {
    await as(PATIENT).post('/family').send({
      name: 'Aarav',
      relation: 'Child',
      emergencyCard: { bloodGroup: 'O+', allergies: 'peanut', sharedInSos: true },
    });
    const [body] = create.mock.calls[0];
    expect(body.emergencyCard.bloodGroup).toBe('O+');
    expect(body.emergencyCard.sharedInSos).toBe(true);
    expect(body.emergencyCard.sharedAt).toBeInstanceOf(Date);
  });

  it('accepts privacy prefs', async () => {
    await as(PATIENT).post('/family').send({
      name: 'Aarav',
      relation: 'Child',
      privacyPrefs: { hiddenCategories: ['diabetes'], discreetNotifications: true },
    });
    const [body] = create.mock.calls[0];
    expect(body.privacyPrefs).toEqual({ hiddenCategories: ['diabetes'], discreetNotifications: true });
  });
});

describe('PUT /patient/family/:id - merge, never clobber', () => {
  it('merges a partial guardianConsent onto the stored one', async () => {
    const oldStamp = new Date('2026-01-15T00:00:00.000Z');
    currentRow = makeMember({
      guardianConsent: { granted: true, grantedBy: 'pat-1', grantedAt: oldStamp, note: 'first' },
    });
    const res = await as(PATIENT).put(`/family/${ROW_ID}`).send({ guardianConsent: { note: 'second' } });
    expect(res.status).toBe(200);
    expect(currentRow.guardianConsent.note).toBe('second');
    // `granted` and its ORIGINAL stamps survive a note-only update.
    expect(currentRow.guardianConsent.granted).toBe(true);
    expect(currentRow.guardianConsent.grantedBy).toBe('pat-1');
    expect(currentRow.guardianConsent.grantedAt).toBe(oldStamp);
    expect(currentRow.save).toHaveBeenCalled();
    expect(lastFilter).toEqual({ _id: ROW_ID, patientId: 'pat-1' });
  });

  it('re-stamps on a real re-grant (revoked, then granted again)', async () => {
    currentRow = makeMember({
      guardianConsent: { granted: false, grantedBy: 'pat-1', grantedAt: new Date('2026-01-15T00:00:00.000Z'), note: '' },
    });
    await as(PATIENT).put(`/family/${ROW_ID}`).send({ guardianConsent: { granted: true } });
    expect(currentRow.guardianConsent.granted).toBe(true);
    expect(currentRow.guardianConsent.grantedAt).toBeInstanceOf(Date);
    expect(currentRow.guardianConsent.grantedAt).not.toEqual(new Date('2026-01-15T00:00:00.000Z'));
  });

  it('turning consent OFF keeps who granted it and when (history stays)', async () => {
    const oldStamp = new Date('2026-01-15T00:00:00.000Z');
    currentRow = makeMember({
      guardianConsent: { granted: true, grantedBy: 'pat-1', grantedAt: oldStamp, note: '' },
    });
    await as(PATIENT).put(`/family/${ROW_ID}`).send({ guardianConsent: { granted: false } });
    expect(currentRow.guardianConsent.granted).toBe(false);
    expect(currentRow.guardianConsent.grantedBy).toBe('pat-1');
    expect(currentRow.guardianConsent.grantedAt).toBe(oldStamp);
  });

  it('stamps sharedAt when the card first flips into the SOS share', async () => {
    currentRow = makeMember();
    await as(PATIENT).put(`/family/${ROW_ID}`).send({ emergencyCard: { sharedInSos: true, bloodGroup: 'B+' } });
    expect(currentRow.emergencyCard.sharedInSos).toBe(true);
    expect(currentRow.emergencyCard.sharedAt).toBeInstanceOf(Date);
    expect(currentRow.emergencyCard.bloodGroup).toBe('B+');
  });

  it('does not re-stamp sharedAt when it is already shared', async () => {
    const oldStamp = new Date('2026-02-01T00:00:00.000Z');
    currentRow = makeMember({
      emergencyCard: { allergies: '', conditions: '', bloodGroup: '', contacts: [], sharedInSos: true, sharedAt: oldStamp },
    });
    await as(PATIENT).put(`/family/${ROW_ID}`).send({ emergencyCard: { sharedInSos: true, conditions: 'asthma' } });
    expect(currentRow.emergencyCard.sharedAt).toBe(oldStamp);
    expect(currentRow.emergencyCard.conditions).toBe('asthma');
  });

  it('merges partial privacyPrefs instead of dropping hidden categories', async () => {
    currentRow = makeMember({
      privacyPrefs: { hiddenCategories: ['diabetes'], discreetNotifications: false },
    });
    await as(PATIENT).put(`/family/${ROW_ID}`).send({ privacyPrefs: { discreetNotifications: true } });
    expect(currentRow.privacyPrefs).toEqual({ hiddenCategories: ['diabetes'], discreetNotifications: true });
  });

  it('404s a foreign family id', async () => {
    currentRow = null;
    const res = await as(PATIENT).put(`/family/${FOREIGN_ID}`).send({ name: 'Nope' });
    expect(res.status).toBe(404);
  });

  it('strips unknown top-level keys (isActive/patientId) before any write', async () => {
    currentRow = makeMember();
    const res = await as(PATIENT).put(`/family/${ROW_ID}`).send({ isActive: false, patientId: 'someone-else' });
    // Stripped by the schema (P1-5): nothing to assign, so neither
    // server-owned field moved even though the save ran.
    expect(res.status).toBe(200);
    expect(currentRow.isActive).toBe(true);
    expect(currentRow.patientId).toBe('pat-1');
  });
});

describe('GET /patient/family', () => {
  it('lists only the caller’s active members', async () => {
    const res = await as(PATIENT).get('/family');
    expect(res.status).toBe(200);
    expect(lastFilter).toEqual({ patientId: 'pat-1', isActive: true });
  });

  it('refuses anonymous callers', async () => {
    expect((await as().get('/family')).status).toBe(401);
  });
});
