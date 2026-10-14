import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

// 2.md 9 — the owner's side of staff invitation for a listing. The gates under
// test: the caller must own the listing (foreign id → 404, never 403), the
// client picks a TEMPLATE and never a role, the single-use code exists only in
// the email (never in an API response), and a failed email leaves no dead
// pending invite behind.

const OWNER_ID = '7000000000000000000000a1';
const STRANGER_ID = '7000000000000000000000b2';
const PROVIDER_ID = '7000000000000000000000e5';
const INVITE_ID = '7000000000000000000000d6';
const STAFF_USER_ID = '7000000000000000000000f1';

const owner = { _id: OWNER_ID, role: 'doctor' };

const makeProvider = (overrides = {}) => ({
  _id: PROVIDER_ID,
  name: 'Smile Dental Studio',
  status: 'live',
  ownerUserId: OWNER_ID,
  staff: [],
  ...overrides,
});

const chain = (value) => {
  const q = query(value);
  q.select = () => q;
  q.sort = () => q;
  return q;
};

const providerFindOne = jestApi.fn();
const providerFind = jestApi.fn();
const inviteFind = jestApi.fn();
const inviteExists = jestApi.fn();
const inviteCreate = jestApi.fn();
const inviteFindOne = jestApi.fn();
const inviteDeleteOne = jestApi.fn();
const userFind = jestApi.fn();
const userFindOne = jestApi.fn();
const sendEmail = jestApi.fn();
const auditLog = jestApi.fn();

let lastProviderFilter = null;

const { as } = await mountApp('providerStaff', {
  '../../src/models/Provider.js': () => ({
    __esModule: true,
    default: {
      find: (filter) => { lastProviderFilter = filter; return providerFind(filter); },
      findOne: (filter) => { lastProviderFilter = filter; return providerFindOne(filter); },
    },
  }),
  '../../src/models/ProviderStaffInvite.js': () => ({
    __esModule: true,
    default: {
      find: (...args) => inviteFind(...args),
      exists: (...args) => inviteExists(...args),
      create: (...args) => inviteCreate(...args),
      findOne: (...args) => inviteFindOne(...args),
      deleteOne: (...args) => inviteDeleteOne(...args),
    },
  }),
  '../../src/models/User.js': () => ({
    __esModule: true,
    default: { find: (...args) => userFind(...args), findOne: (...args) => userFindOne(...args) },
    passwordMatchesHash: async () => ({ ok: false, legacy: false }),
  }),
  '../../src/services/notificationService.js': () => ({
    __esModule: true,
    sendEmail: (...args) => sendEmail(...args),
  }),
  '../../src/middleware/audit.js': () => ({
    __esModule: true,
    auditLog: (...args) => auditLog(...args),
  }),
});

beforeEach(() => {
  lastProviderFilter = null;
  providerFind.mockReset().mockImplementation(() => chain([makeProvider()]));
  providerFindOne.mockReset().mockImplementation(async () => makeProvider());
  inviteFind.mockReset().mockImplementation(() => chain([]));
  inviteExists.mockReset().mockResolvedValue(null);
  inviteCreate.mockReset().mockImplementation(async (body) => ({ _id: INVITE_ID, ...body }));
  inviteFindOne.mockReset().mockResolvedValue(null);
  inviteDeleteOne.mockReset().mockResolvedValue({ deletedCount: 1 });
  userFind.mockReset().mockImplementation(() => chain([]));
  userFindOne.mockReset().mockImplementation(() => chain(null));
  sendEmail.mockReset().mockResolvedValue(undefined);
  auditLog.mockReset().mockResolvedValue(undefined);
});

describe('GET /provider-staff', () => {
  it('401s an anonymous caller', async () => {
    const res = await as().get('/');
    expect(res.status).toBe(401);
    expect(providerFind).not.toHaveBeenCalled();
  });

  it('returns the team, the pending invites and the six role templates', async () => {
    providerFindOne.mockImplementation(async () => makeProvider({
      staff: [{ userId: STAFF_USER_ID, role: 'front_desk', invitedBy: OWNER_ID, addedAt: new Date('2026-10-01T10:00:00Z') }],
    }));
    userFind.mockImplementation(() => chain([
      { _id: STAFF_USER_ID, name: 'Priya Nair', email: 'priya@smiledental.in', role: 'front_desk', twoFactorEnabled: false },
    ]));
    inviteFind.mockImplementation(() => chain([
      { _id: INVITE_ID, email: 'newhire@smiledental.in', template: 'billing', role: 'billing_executive', expiresAt: new Date('2026-10-03T10:00:00Z') },
    ]));

    const res = await as(owner).get('/');
    expect(res.status).toBe(200);
    expect(lastProviderFilter).toEqual({ ownerUserId: OWNER_ID });
    expect(res.body.provider).toEqual(expect.objectContaining({ _id: PROVIDER_ID, name: 'Smile Dental Studio' }));
    expect(res.body.staff).toHaveLength(1);
    expect(res.body.staff[0]).toEqual(expect.objectContaining({
      userId: STAFF_USER_ID,
      name: 'Priya Nair',
      role: 'front_desk',
      twoFactorEnabled: false,
    }));
    expect(res.body.invites).toHaveLength(1);
    expect(res.body.invites[0].twoFactorRequired).toBe(false);
    expect(res.body.templates).toHaveLength(6);
    expect(res.body.templates.map((t) => t.key)).toContain('provider_admin');
    expect(res.body.templates.find((t) => t.key === 'front_desk').role).toBe('front_desk');
  });

  it('404s an account with no listing', async () => {
    providerFind.mockImplementation(() => chain([]));
    const res = await as(owner).get('/');
    expect(res.status).toBe(404);
  });

  it('400s an account with several listings until it says which one', async () => {
    providerFind.mockImplementation(() => chain([makeProvider(), makeProvider({ _id: '7000000000000000000000e6' })]));
    const res = await as(owner).get('/');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('providerId');
  });

  it('404s a foreign providerId without revealing it exists', async () => {
    providerFindOne.mockResolvedValue(null);
    const res = await as(owner).get('/').query({ providerId: STRANGER_ID.padStart(24, '0').slice(-24) });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Not found');
  });
});

describe('POST /provider-staff/invite', () => {
  it('resolves the ROLE from the template, never from the body', async () => {
    const res = await as(owner).post('/invite').send({ template: 'front_desk', email: 'priya@smiledental.in', name: 'Priya Nair' });
    expect(res.status).toBe(201);
    expect(inviteCreate).toHaveBeenCalledWith(expect.objectContaining({
      template: 'front_desk',
      role: 'front_desk',
      email: 'priya@smiledental.in',
      providerId: PROVIDER_ID,
      invitedBy: OWNER_ID,
      code: expect.stringMatching(/^[A-Za-z0-9_-]{22}$/),
    }));
    expect(auditLog).toHaveBeenCalledWith('provider_staff_invited', OWNER_ID, expect.objectContaining({ template: 'front_desk' }));
  });

  it('keeps the code out of the response — it exists only inside the email', async () => {
    const res = await as(owner).post('/invite').send({ template: 'billing', email: 'accounts@smiledental.in' });
    expect(res.status).toBe(201);
    const issuedCode = inviteCreate.mock.calls[0][0].code;
    expect(issuedCode).toHaveLength(22);
    expect(JSON.stringify(res.body)).not.toContain(issuedCode);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'accounts@smiledental.in',
      text: expect.stringContaining(`/#/provider-staff-setup?code=${encodeURIComponent(issuedCode)}`),
    }));
    expect(res.body.twoFactorRequired).toBe(false);
  });

  it('rejects a role or template the client makes up', async () => {
    const res = await as(owner).post('/invite').send({ template: 'superadmin', email: 'x@y.in' });
    expect(res.status).toBe(400);
    expect(inviteCreate).not.toHaveBeenCalled();

    const withRole = await as(owner).post('/invite').send({ template: 'front_desk', email: 'x@y.in', role: 'superadmin' });
    expect(withRole.status).toBe(400); // `.strict()` — no role field at all
    expect(inviteCreate).not.toHaveBeenCalled();
  });

  it('409s a second invite while one is still pending for that email', async () => {
    inviteExists.mockResolvedValue({ _id: INVITE_ID });
    const res = await as(owner).post('/invite').send({ template: 'front_desk', email: 'priya@smiledental.in' });
    expect(res.status).toBe(409);
    expect(inviteCreate).not.toHaveBeenCalled();
  });

  it('409s someone already on the team', async () => {
    providerFindOne.mockImplementation(async () => makeProvider({
      staff: [{ userId: STAFF_USER_ID, role: 'front_desk', invitedBy: OWNER_ID, addedAt: new Date() }],
    }));
    userFindOne.mockImplementation(() => chain({ _id: STAFF_USER_ID }));
    const res = await as(owner).post('/invite').send({ template: 'reception', email: 'priya@smiledental.in' });
    expect(res.status).toBe(409);
    expect(inviteCreate).not.toHaveBeenCalled();
  });

  it('deletes the invite when the email never leaves, and says retry', async () => {
    sendEmail.mockRejectedValue(new Error('SMTP down'));
    const res = await as(owner).post('/invite').send({ template: 'front_desk', email: 'priya@smiledental.in' });
    expect(res.status).toBe(502);
    expect(inviteDeleteOne).toHaveBeenCalledWith({ _id: INVITE_ID });
    expect(auditLog).not.toHaveBeenCalledWith('provider_staff_invited', expect.anything(), expect.anything());
  });

  it('404s an invite aimed at a listing the caller does not own', async () => {
    providerFindOne.mockResolvedValue(null);
    const res = await as(owner).post('/invite').send({
      template: 'front_desk',
      email: 'priya@smiledental.in',
      providerId: STRANGER_ID.padStart(24, '0').slice(-24),
    });
    expect(res.status).toBe(404);
    expect(inviteCreate).not.toHaveBeenCalled();
  });
});

describe('DELETE /provider-staff/invites/:id', () => {
  it('revokes a pending invite and audits it', async () => {
    const invite = {
      _id: INVITE_ID, email: 'priya@smiledental.in', usedAt: null, revokedAt: null,
      save: jestApi.fn().mockResolvedValue(undefined),
    };
    inviteFindOne.mockResolvedValue(invite);
    const res = await as(owner).delete(`/invites/${INVITE_ID}`);
    expect(res.status).toBe(200);
    expect(invite.revokedAt).toBeInstanceOf(Date);
    expect(invite.save).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith('provider_staff_invite_revoked', OWNER_ID, expect.objectContaining({ inviteId: INVITE_ID }));
  });

  it('404s a malformed id before loading anything', async () => {
    const res = await as(owner).delete('/invites/not-an-id');
    expect(res.status).toBe(404);
    expect(providerFindOne).not.toHaveBeenCalled();
  });

  it('404s an invite that is not pending on the owned listing', async () => {
    inviteFindOne.mockResolvedValue(null);
    const res = await as(owner).delete(`/invites/${INVITE_ID}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('pending invitation');
  });
});
