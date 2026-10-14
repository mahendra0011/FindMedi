import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

// 2.md 9 — redemption of the staff invitation link (POST /api/auth/provider-
// staff-setup). Same contract as ambulance-setup: an opaque single-use code,
// one uniform error for invalid/used/expired, and the EMAIL + ROLE come from
// the invite row so the link cannot be aimed at another mailbox or used to
// escalate to a role the owner never picked.

const OWNER_ID = '7000000000000000000000a1';
const PROVIDER_ID = '7000000000000000000000e5';
const NEW_USER_ID = '7000000000000000000000c7';
const EXISTING_USER_ID = '7000000000000000000000f1';

const VALID_CODE = 'a1b2c3d4e5f6g7h8i9j0k1';
const GOOD_PASSWORD = 'Str0ngPass!2024';

const chain = (value) => {
  const q = query(value);
  q.select = () => q;
  return q;
};

const inviteFindOneAndUpdate = jestApi.fn();
const inviteSave = jestApi.fn();
const userFindOne = jestApi.fn();
const userCreate = jestApi.fn();
const providerFindById = jestApi.fn();
const providerSave = jestApi.fn();
const auditLog = jestApi.fn();

const makeInvite = (overrides = {}) => ({
  _id: '7000000000000000000000d6',
  code: VALID_CODE,
  providerId: PROVIDER_ID,
  template: 'front_desk',
  role: 'front_desk',
  email: 'priya@smiledental.in',
  name: 'Priya Nair',
  invitedBy: OWNER_ID,
  expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
  usedAt: null,
  revokedAt: null,
  usedBy: null,
  save: inviteSave,
  ...overrides,
});

const makeProvider = (overrides = {}) => ({
  _id: PROVIDER_ID,
  name: 'Smile Dental Studio',
  staff: [],
  save: providerSave,
  ...overrides,
});

const ORIGINAL_2FA_ENV = process.env.TWO_FACTOR_REQUIRED_ROLES;

const { as } = await mountApp('auth', {
  '../../src/models/User.js': () => ({
    __esModule: true,
    default: {
      findById: () => chain({ _id: EXISTING_USER_ID, twoFactorEnabled: false }),
      findOne: (...args) => userFindOne(...args),
      create: (...args) => userCreate(...args),
    },
    passwordMatchesHash: async () => ({ ok: false, legacy: false }),
  }),
  '../../src/models/ProviderStaffInvite.js': () => ({
    __esModule: true,
    default: { findOneAndUpdate: (...args) => inviteFindOneAndUpdate(...args) },
  }),
  '../../src/models/Provider.js': () => ({
    __esModule: true,
    default: { findById: (...args) => providerFindById(...args) },
  }),
  '../../src/middleware/audit.js': () => ({
    __esModule: true,
    auditLog: (...args) => auditLog(...args),
  }),
});

beforeAll(() => {
  // hospital_admin's 2FA requirement is env-driven (see MANDATORY_TWO_FACTOR_
  // ROLES) — pin it so the response flag is deterministic either way.
  process.env.TWO_FACTOR_REQUIRED_ROLES = 'hospital_admin';
});
afterAll(() => {
  if (ORIGINAL_2FA_ENV === undefined) delete process.env.TWO_FACTOR_REQUIRED_ROLES;
  else process.env.TWO_FACTOR_REQUIRED_ROLES = ORIGINAL_2FA_ENV;
});

beforeEach(() => {
  inviteFindOneAndUpdate.mockReset().mockImplementation(async () => makeInvite());
  inviteSave.mockReset().mockResolvedValue(undefined);
  userFindOne.mockReset().mockImplementation(() => chain(null));
  userCreate.mockReset().mockImplementation(async (body) => ({ _id: NEW_USER_ID, ...body }));
  providerFindById.mockReset().mockImplementation(async () => makeProvider());
  providerSave.mockReset().mockResolvedValue(undefined);
  auditLog.mockReset().mockResolvedValue(undefined);
});

const redeem = (body) => as().post('/provider-staff-setup').send({
  code: VALID_CODE,
  password: GOOD_PASSWORD,
  ...body,
});

describe('POST /auth/provider-staff-setup', () => {
  it('is public (no session) and rate-limited by the auth limiter', async () => {
    const res = await redeem({});
    expect(res.status).toBe(200); // anonymous — authLimiter + validate only
  });

  it('one uniform 400 for an invalid, used or expired code', async () => {
    inviteFindOneAndUpdate.mockResolvedValue(null);
    const res = await redeem({});
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('invalid, already used, or has expired');
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('claims the code with one atomic consume, never a read-then-write', async () => {
    await redeem({});
    expect(inviteFindOneAndUpdate).toHaveBeenCalledTimes(1);
    const [filter, update, options] = inviteFindOneAndUpdate.mock.calls[0];
    expect(filter).toEqual(expect.objectContaining({
      code: VALID_CODE,
      usedAt: null,
      revokedAt: null,
      expiresAt: { $gt: expect.any(Date) },
    }));
    expect(update).toEqual({ $set: { usedAt: expect.any(Date) } });
    expect(options).toEqual({ new: true });
  });

  it('creates the account with the role FROM THE INVITE, not from the body', async () => {
    // The invite says billing; the body offers no role field at all (strict
    // schemas reject one — see the next test), so what the account gets is
    // exactly what the owner's template resolved to.
    inviteFindOneAndUpdate.mockImplementation(async () => makeInvite({ template: 'billing', role: 'billing_executive' }));
    const res = await redeem({});
    expect(res.status).toBe(200);
    expect(userCreate).toHaveBeenCalledWith(expect.objectContaining({
      email: 'priya@smiledental.in',   // from the invite row
      role: 'billing_executive',       // from the template the owner picked
      approvalStatus: 'approved',
      status: 'active',
    }));
    expect(res.body.accountExists).toBe(false);
    expect(res.body.role).toBe('billing_executive');
    expect(res.body.requiresTwoFactor).toBe(false);
    expect(res.body.message).toContain('Account created');
    expect(JSON.stringify(res.body)).not.toContain(GOOD_PASSWORD);
  });

  it('rejects a body with a field it does not know (no role/email smuggling)', async () => {
    const res = await as().post('/provider-staff-setup').send({
      code: VALID_CODE, password: GOOD_PASSWORD, role: 'superadmin',
    });
    expect(res.status).toBe(400);
    expect(inviteFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects a password the account policy refuses', async () => {
    const res = await redeem({ password: 'short1!' });
    expect(res.status).toBe(400);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('adds the new account to the listing team, idempotently', async () => {
    const provider = makeProvider();
    providerFindById.mockResolvedValue(provider);

    const res = await redeem({});
    expect(res.status).toBe(200);
    expect(provider.staff).toHaveLength(1);
    expect(provider.staff[0]).toEqual(expect.objectContaining({
      userId: NEW_USER_ID,
      role: 'front_desk',
      invitedBy: OWNER_ID,
    }));
    expect(providerSave).toHaveBeenCalled();
    expect(inviteSave).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith('provider_staff_joined', NEW_USER_ID, expect.objectContaining({
      providerId: PROVIDER_ID,
      role: 'front_desk',
      accountCreated: true,
    }));
  });

  it('joins an EXISTING account without touching its password', async () => {
    userFindOne.mockImplementation(() => chain({ _id: EXISTING_USER_ID, email: 'priya@smiledental.in', status: 'active' }));
    const provider = makeProvider();
    providerFindById.mockResolvedValue(provider);

    const res = await redeem({});
    expect(res.status).toBe(200);
    expect(res.body.accountExists).toBe(true);
    expect(res.body.message).toContain('existing account');
    expect(userCreate).not.toHaveBeenCalled();
    expect(provider.staff).toHaveLength(1);
    expect(provider.staff[0].userId).toBe(EXISTING_USER_ID);
  });

  it('does not re-add a member already on the team (second redemption race)', async () => {
    userFindOne.mockImplementation(() => chain({ _id: EXISTING_USER_ID, email: 'priya@smiledental.in', status: 'active' }));
    providerFindById.mockImplementation(async () => makeProvider({
      staff: [{ userId: EXISTING_USER_ID, role: 'front_desk', invitedBy: OWNER_ID, addedAt: new Date() }],
    }));
    const res = await redeem({});
    expect(res.status).toBe(200);
    expect(providerSave).not.toHaveBeenCalled();
  });

  it('403s a blocked account at redemption', async () => {
    userFindOne.mockImplementation(() => chain({ _id: EXISTING_USER_ID, status: 'blocked' }));
    const res = await redeem({});
    expect(res.status).toBe(403);
    expect(providerSave).not.toHaveBeenCalled();
  });

  it('410s when the listing the invite points at is gone', async () => {
    providerFindById.mockResolvedValue(null);
    const res = await redeem({});
    expect(res.status).toBe(410);
  });

  it('reports 2FA as required for a role that the env gates, optional otherwise', async () => {
    inviteFindOneAndUpdate.mockImplementation(async () => makeInvite({ template: 'provider_admin', role: 'hospital_admin' }));
    const adminRes = await redeem({});
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.role).toBe('hospital_admin');
    expect(adminRes.body.requiresTwoFactor).toBe(true);
  });
});
