/**
 * INS-M-02 — cashless vs reimbursement workflow distinction.
 *
 * What this pins:
 *   - `claimId` is server-generated (zod used to strip it and the generator was
 *     never called, so EVERY create failed) and a patient is forced to their own
 *     claim (LAW-006).
 *   - Cashless branches: empanelment is verified against `Hospital.
 *     insuranceAccepted` at create and again at every pre-auth request, and a
 *     cashless claim cannot be filed without an approved/partial pre-auth.
 *   - Reimbursement branches: no empanelment, no pre-auth, files directly.
 *   - The pre-auth is a state machine with append-only attempts: request ->
 *     decision (reason REQUIRED for reject/partial, amount capped by the
 *     request) -> resubmission after denial, each attempt keeping its own
 *     denial reason.
 *   - The split-brain status fix: writes land on `claimStatus` (canonical) and
 *     $unset the schema-less legacy `status`; reads tolerate both.
 *   - Stats buckets count what their labels say (pre-auth pending/approved,
 *     filed/settled, cashless).
 *
 * The Insurance fake is a mini Mongo: it implements the exact operators the
 * router uses ($and/$or/$in/$nin/$ne/$exists, dotted array match, $set with
 * positional `$`, $unset, $push). Anything unsupported throws loudly rather
 * than silently returning a wrong answer.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

// ─── Fakes (closure state, reset per test) ──────────────────────────────────
const db = [];
const hospitals = {
  H1: { _id: 'H1', insuranceAccepted: [{ provider: 'Star Health', planType: 'gold' }] },
  H2: { _id: 'H2', insuranceAccepted: [] },
};
const auditLog = jest.fn(async () => {});
const notificationCreate = jest.fn(async () => ({}));
const mirrorInsurance = jest.fn();

// Mongo dotted paths traverse arrays: `a.b` over `a: [{b:1}]` yields [1].
const getPath = (doc, path) =>
  path.split('.').reduce((v, k) => {
    if (v == null) return undefined;
    if (Array.isArray(v)) return v.map((el) => (el == null ? undefined : el[k]));
    return v[k];
  }, doc);

const eq = (a, b) => {
  if (a === undefined || a === null || b === undefined || b === null) return a === b;
  return String(a) === String(b);
};

function matches(doc, filter) {
  return Object.entries(filter).every(([key, want]) => {
    if (key === '$or') return want.some((sub) => matches(doc, sub));
    if (key === '$and') return want.every((sub) => matches(doc, sub));
    const got = getPath(doc, key);
    // Mongo dotted paths through an array match when ANY element matches.
    if (Array.isArray(got) && (want === null || typeof want !== 'object' || want instanceof RegExp)) {
      return got.some((el) => (want instanceof RegExp ? want.test(String(el)) : eq(el, want)));
    }
    if (want !== null && typeof want === 'object' && !(want instanceof RegExp)) {
      return Object.entries(want).every(([op, arg]) => {
        switch (op) {
          case '$exists': return (got !== undefined) === arg;
          case '$ne': return !eq(got, arg);
          case '$in': return arg.some((x) => eq(got, x));
          case '$nin': return !arg.some((x) => eq(got, x));
          default: throw new Error(`insurance fake: unsupported operator ${op} on ${key}`);
        }
      });
    }
    if (want instanceof RegExp) return typeof got === 'string' && want.test(got);
    return eq(got, want);
  });
}

function applyUpdate(doc, update) {
  const $set = update.$set || {};
  const $unset = update.$unset || {};
  const $push = update.$push || {};
  // Resolve the positional index ONCE: the first positional key flips the
  // attempt's status, so a per-key findIndex would miss it on key two.
  const positionalKeys = Object.keys($set).filter((k) => k.startsWith('preAuthAttempts.$.'));
  let positionalIdx = -1;
  if (positionalKeys.length) {
    positionalIdx = (doc.preAuthAttempts || []).findIndex((a) => a.status === 'Pending');
    if (positionalIdx === -1) throw new Error('insurance fake: positional $ but no Pending attempt');
  }
  for (const [rawKey, value] of Object.entries($set)) {
    const [head, ...rest] = rawKey.split('.');
    if (head === 'preAuthAttempts' && rest[0] === '$') {
      doc.preAuthAttempts[positionalIdx][rest.slice(1).join('.')] = value;
    } else {
      doc[rawKey] = value;
    }
  }
  for (const rawKey of Object.keys($unset)) {
    const [head, ...rest] = rawKey.split('.');
    if (rest.length) delete doc[head]?.[rest.join('.')];
    else delete doc[rawKey];
  }
  for (const [rawKey, value] of Object.entries($push)) {
    doc[rawKey] = [...(doc[rawKey] || []), value];
  }
}

let seq = 0;
const fakeInsurance = {
  create: async (data) => {
    const doc = {
      _id: `clm_${++seq}`,
      coverageType: 'Cashless',
      preAuthStatus: 'Not Required',
      claimStatus: 'Not Filed',
      preAuthAttempts: [],
      createdAt: new Date(Date.now() - seq * 1000).toISOString(),
      ...data,
    };
    db.push(doc);
    return doc;
  },
  find: (filter = {}) => query(db.filter((d) => matches(d, filter)).slice().reverse()),
  findById: (id) => query(db.find((d) => d._id === String(id)) || null),
  findByIdAndUpdate: (id, update, _opts) => fakeInsurance.findOneAndUpdate({ _id: id }, update, _opts),
  findOneAndUpdate: (filter, update, _opts) => {
    const doc = db.find((d) => matches(d, filter));
    if (!doc) return query(null);
    applyUpdate(doc, update);
    return query(doc);
  },
  countDocuments: (filter = {}) => Promise.resolve(db.filter((d) => matches(d, filter)).length),
  aggregate: async (pipeline) => {
    const rows = pipeline
      .filter((stage) => stage.$match)
      .reduce((acc, stage) => acc.filter((d) => matches(d, stage.$match)), db);
    const sum = rows.reduce((acc, d) => acc + (typeof d.approvedAmount === 'number' ? d.approvedAmount : 0), 0);
    return rows.length ? [{ _id: null, total: sum }] : [];
  },
};

const fakeHospital = {
  findById: (id) => query(hospitals[String(id)] || null),
};

// ─── Mount ──────────────────────────────────────────────────────────────────
const { as } = await mountApp('insurance', {
  '../../src/models/Insurance.js': () => ({ default: fakeInsurance }),
  '../../src/models/Hospital.js': () => ({ default: fakeHospital }),
    '../../src/models/Notification.js': () => ({ default: { create: notificationCreate } }),
  '../../src/middleware/audit.js': () => ({ auditLog: (...a) => auditLog(...a) }),
  '../../src/middleware/idempotency.js': () => ({
    idempotencyGuard: () => (_req, _res, next) => next(),
  }),
  // ledgerService (for toPaise) statically imports two names from this module,
  // so the mock must expose the full surface, not just mirrorInsurance.
  '../../src/lib/pgDualWrite.js': () => ({
    toPgEnum: () => null,
    ledgerRow: () => ({}),
    mirrorLedgerEntry: () => {},
    paymentRow: () => ({}),
    mirrorPayment: () => {},
    billingRow: () => ({}),
    mirrorBilling: () => {},
    mirrorInsurance: (...a) => mirrorInsurance(...a),
    mirrorCommissionConfig: () => {},
    payoutRow: () => ({}),
    mirrorPayout: () => {},
    mirrorAtomic: async () => {},
    mirrorPayoutWithLedger: async () => {},
    mirrorPaymentWithLedger: async () => {},
  }),
});

const ADMIN = { id: 'admin1', _id: 'admin1', role: 'hospital_admin', hospitalId: 'H1' };
const ADMIN2 = { id: 'admin2', _id: 'admin2', role: 'hospital_admin', hospitalId: 'H2' };
const PATIENT = { id: 'pat1', _id: 'pat1', role: 'patient' };

const baseBody = {
  patientId: 'pat1',
  patientName: 'Priya Patient',
  insuranceProvider: 'Star Health',
  policyNumber: 'POL-1',
  estimatedCost: 10000,
};

const createClaim = async (over = {}, user = ADMIN) => {
  const res = await as(user).post('/').send({ ...baseBody, ...over });
  return res;
};

beforeEach(() => {
  db.length = 0;
  seq = 0;
  hospitals.H1.insuranceAccepted = [{ provider: 'Star Health', planType: 'gold' }];
  jest.clearAllMocks();
});

describe('INS-M-02 claim creation', () => {
  it('generates claimId server-side and never trusts the body', async () => {
    const res = await createClaim({ patientId: 'pat1', claimId: 'FORGED' });
    expect(res.status).toBe(201);
    expect(res.body.claimId).toMatch(/^CLM-/);
    expect(res.body.claimId).not.toBe('FORGED');
    expect(mirrorInsurance).toHaveBeenCalledTimes(1);
  });

  it('forces a patient to their own claim (LAW-006) and accepts an omitted patientId', async () => {
    const res = await createClaim({ patientId: 'someone-else' }, PATIENT);
    expect(res.status).toBe(201);
    expect(res.body.patientId).toBe('pat1');
  });

  it('rejects a staff create with no patientId', async () => {
    const res = await createClaim({ patientId: undefined, patientName: undefined });
    // patientName is optional in zod; patientId is what the handler needs.
    expect([400]).toContain(res.status);
  });

  it('refuses cashless at a hospital that is not empanelled with the insurer', async () => {
    const res = await createClaim({ insuranceProvider: 'Random Insurer' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('HOSPITAL_NOT_EM_PANELLED');
  });

  it('allows reimbursement at a non-empanelled hospital (no empanelment needed)', async () => {
    const res = await createClaim({ coverageType: 'Reimbursement', insuranceProvider: 'Random Insurer' });
    expect(res.status).toBe(201);
    expect(res.body.coverageType).toBe('Reimbursement');
  });

  it('validates coverageType as a closed enum', async () => {
    const res = await createClaim({ coverageType: 'Whatever' });
    expect(res.status).toBe(400);
  });
});

describe('INS-M-02 pre-auth request', () => {
  it('opens attempt 1 for a cashless claim at an empanelled hospital', async () => {
    const claim = (await createClaim()).body;
    const res = await as(ADMIN).post(`/${claim._id}/pre-auth`).send({ requestedAmount: 8000 });
    expect(res.status).toBe(200);
    expect(res.body.preAuthStatus).toBe('Pending');
    expect(res.body.preAuthAmount).toBe(8000);
    expect(res.body.preAuthAttempts).toHaveLength(1);
    expect(res.body.preAuthAttempts[0]).toMatchObject({ attemptNumber: 1, requestedAmount: 8000, status: 'Pending' });
  });

  it('needs an amount (body or estimated cost) to request', async () => {
    const claim = (await createClaim({ estimatedCost: undefined })).body;
    const res = await as(ADMIN).post(`/${claim._id}/pre-auth`).send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('REQUESTED_AMOUNT_REQUIRED');
  });

  it('is refused for reimbursement claims — no pre-auth applies', async () => {
    const claim = (await createClaim({ coverageType: 'Reimbursement' })).body;
    const res = await as(ADMIN).post(`/${claim._id}/pre-auth`).send({ requestedAmount: 500 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('PRE_AUTH_CASHLESS_ONLY');
  });

  it('verifies empanelment even when the create-time gate was skipped (claim without hospital)', async () => {
    // Patient-created claims carry no hospitalId, so creation cannot check
    // empanelment — the pre-auth request must, using the admin's facility.
    const claim = (await createClaim({ insuranceProvider: 'Random Insurer' }, PATIENT)).body;
    expect(claim.hospitalId).toBeUndefined();
    const res = await as(ADMIN).post(`/${claim._id}/pre-auth`).send({ requestedAmount: 5000 });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('HOSPITAL_NOT_EM_PANELLED');
  });

  it('refuses a second pending attempt', async () => {
    const claim = (await createClaim()).body;
    await as(ADMIN).post(`/${claim._id}/pre-auth`).send({ requestedAmount: 8000 });
    const res = await as(ADMIN).post(`/${claim._id}/pre-auth`).send({ requestedAmount: 9000 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PRE_AUTH_ALREADY_PENDING');
  });

  it('is admin-only', async () => {
    const claim = (await createClaim()).body;
    const res = await as(PATIENT).post(`/${claim._id}/pre-auth`).send({ requestedAmount: 100 });
    expect(res.status).toBe(403);
  });
});

describe('INS-M-02 pre-auth decision', () => {
  const pendingClaim = async () => {
    const claim = (await createClaim()).body;
    const r = await as(ADMIN).post(`/${claim._id}/pre-auth`).send({ requestedAmount: 8000 });
    return r.body;
  };

  it('approves with an amount and a default 30-day expiry, stamping the attempt', async () => {
    const claim = await pendingClaim();
    const res = await as(ADMIN).put(`/${claim._id}/pre-auth`).send({ decision: 'Approved', decisionAmount: 7000 });
    expect(res.status).toBe(200);
    expect(res.body.preAuthStatus).toBe('Approved');
    expect(res.body.preAuthAmount).toBe(7000);
    expect(new Date(res.body.preAuthExpiry).getTime()).toBeGreaterThan(Date.now());
    expect(res.body.preAuthAttempts[0]).toMatchObject({
      status: 'Approved', decisionAmount: 7000, decidedBy: 'admin1',
    });
    expect(res.body.preAuthAttempts[0].decidedAt).toBeTruthy();
    expect(notificationCreate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'billing', userId: 'pat1', title: 'Pre-Authorization Approved',
    }));
  });

  it('caps an approval at the requested amount', async () => {
    const claim = await pendingClaim();
    const res = await as(ADMIN).put(`/${claim._id}/pre-auth`).send({ decision: 'Approved', decisionAmount: 99999 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('AMOUNT_EXCEEDS_REQUEST');
  });

  it('requires a denial reason to reject and records it at both levels', async () => {
    const claim = await pendingClaim();
    const noReason = await as(ADMIN).put(`/${claim._id}/pre-auth`).send({ decision: 'Rejected' });
    expect(noReason.status).toBe(400);

    const res = await as(ADMIN).put(`/${claim._id}/pre-auth`).send({
      decision: 'Rejected',
      denialReason: 'Policy inactive on date of admission',
    });
    expect(res.status).toBe(200);
    expect(res.body.preAuthStatus).toBe('Rejected');
    expect(res.body.preAuthDenialReason).toBe('Policy inactive on date of admission');
    expect(res.body.preAuthAttempts[0].denialReason).toBe('Policy inactive on date of admission');
    expect(res.body.preAuthExpiry).toBeFalsy();
  });

  it('requires a reason for a partial approval and keeps it', async () => {
    const claim = await pendingClaim();
    const noReason = await as(ADMIN).put(`/${claim._id}/pre-auth`).send({
      decision: 'Partially Approved', decisionAmount: 5000,
    });
    expect(noReason.status).toBe(400);

    const res = await as(ADMIN).put(`/${claim._id}/pre-auth`).send({
      decision: 'Partially Approved', decisionAmount: 5000,
      denialReason: 'Room rent sub-limit applies',
    });
    expect(res.status).toBe(200);
    expect(res.body.preAuthStatus).toBe('Partially Approved');
    expect(res.body.preAuthAmount).toBe(5000);
    expect(res.body.preAuthDenialReason).toBe('Room rent sub-limit applies');
  });

  it('refuses a decision when nothing is pending', async () => {
    const claim = (await createClaim()).body;
    const res = await as(ADMIN).put(`/${claim._id}/pre-auth`).send({ decision: 'Approved', decisionAmount: 1 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PRE_AUTH_NOT_PENDING');
  });

  it('cannot decide on a reimbursement claim (its pre-auth is Not Required)', async () => {
    const claim = (await createClaim({ coverageType: 'Reimbursement' })).body;
    const res = await as(ADMIN).put(`/${claim._id}/pre-auth`).send({ decision: 'Approved', decisionAmount: 1 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PRE_AUTH_NOT_PENDING');
  });
});

describe('INS-M-02 resubmission after denial', () => {
  const deniedClaim = async () => {
    const claim = (await createClaim()).body;
    await as(ADMIN).post(`/${claim._id}/pre-auth`).send({ requestedAmount: 8000 });
    await as(ADMIN).put(`/${claim._id}/pre-auth`).send({
      decision: 'Rejected', denialReason: 'Pre-existing condition excluded',
    });
    return claim;
  };

  it('opens attempt 2 and keeps attempt 1 reason in history while clearing the headline', async () => {
    const claim = await deniedClaim();
    const res = await as(ADMIN).post(`/${claim._id}/pre-auth/resubmit`).send({ requestedAmount: 6000 });
    expect(res.status).toBe(200);
    expect(res.body.preAuthStatus).toBe('Pending');
    expect(res.body.preAuthAmount).toBe(6000);
    expect(res.body.preAuthAttempts).toHaveLength(2);
    expect(res.body.preAuthAttempts[1]).toMatchObject({ attemptNumber: 2, status: 'Pending', requestedAmount: 6000 });
    expect(res.body.preAuthAttempts[0].denialReason).toBe('Pre-existing condition excluded');
    expect(res.body.preAuthDenialReason).toBeFalsy();
  });

  it('is refused when the pre-auth was not denied', async () => {
    const claim = (await createClaim()).body;
    const res = await as(ADMIN).post(`/${claim._id}/pre-auth/resubmit`).send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PRE_AUTH_NOT_DENIED');
  });

  it('re-checks empanelment — a lapsed network membership blocks the retry', async () => {
    const claim = await deniedClaim();
    hospitals.H1.insuranceAccepted = [];
    const res = await as(ADMIN).post(`/${claim._id}/pre-auth/resubmit`).send({});
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('HOSPITAL_NOT_EM_PANELLED');
  });

  it('is admin-only', async () => {
    const claim = await deniedClaim();
    const res = await as(PATIENT).post(`/${claim._id}/pre-auth/resubmit`).send({});
    expect(res.status).toBe(403);
  });
});

describe('INS-M-02 filing branches on coverage type', () => {
  it('refuses to file a cashless claim without an approved pre-auth', async () => {
    const claim = (await createClaim()).body;
    const res = await as(ADMIN).put(`/${claim._id}/file-claim`).send({ claimAmount: 9000 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PRE_AUTH_REQUIRED');
  });

  it('files a cashless claim once the pre-auth is approved (and lands on canonical claimStatus)', async () => {
    const claim = (await createClaim()).body;
    await as(ADMIN).post(`/${claim._id}/pre-auth`).send({ requestedAmount: 8000 });
    await as(ADMIN).put(`/${claim._id}/pre-auth`).send({ decision: 'Approved', decisionAmount: 8000 });
    const res = await as(ADMIN).put(`/${claim._id}/file-claim`).send({ claimAmount: 9000 });
    expect(res.status).toBe(200);
    expect(res.body.claimStatus).toBe('Filed');
    expect(res.body.claimDate).toBeTruthy();
    // The legacy schema-less field is migrated away on write.
    expect(Object.prototype.hasOwnProperty.call(res.body, 'status')).toBe(false);
  });

  it('files a reimbursement claim with no pre-auth at all', async () => {
    const claim = (await createClaim({ coverageType: 'Reimbursement' })).body;
    const res = await as(ADMIN).put(`/${claim._id}/file-claim`).send({ claimAmount: 9000 });
    expect(res.status).toBe(200);
    expect(res.body.claimStatus).toBe('Filed');
    expect(res.body.preAuthStatus).toBe('Not Required');
  });

  it('refuses to re-file an already filed claim', async () => {
    const claim = (await createClaim({ coverageType: 'Reimbursement' })).body;
    await as(ADMIN).put(`/${claim._id}/file-claim`).send({ claimAmount: 9000 });
    const res = await as(ADMIN).put(`/${claim._id}/file-claim`).send({ claimAmount: 9000 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CLAIM_ALREADY_FILED');
  });

  it('treats a legacy row (status Filed, claimStatus stale) as already filed', async () => {
    const claim = (await createClaim({ coverageType: 'Reimbursement' })).body;
    db.find((d) => d._id === claim._id).status = 'Filed';
    const res = await as(ADMIN).put(`/${claim._id}/file-claim`).send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CLAIM_ALREADY_FILED');
  });
});

describe('INS-M-02 settlement (INS-B-04 paths still hold after the rewrite)', () => {
  it('settles a filed claim on the canonical field and audits it', async () => {
    const claim = (await createClaim({ coverageType: 'Reimbursement' })).body;
    await as(ADMIN).put(`/${claim._id}/file-claim`).send({ claimAmount: 9000 });
    const res = await as(ADMIN).put(`/${claim._id}/settle`).send({ approvedAmount: 5000 });
    expect(res.status).toBe(200);
    expect(res.body.claimStatus).toBe('Settled');
    expect(res.body.approvedAmount).toBe(5000);
    expect(res.body.settlementDate).toBeTruthy();
    expect(auditLog).toHaveBeenCalledWith('settle_insurance_claim', 'admin1', expect.objectContaining({ approvedAmount: 5000 }));
    expect(notificationCreate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'billing', userId: 'pat1', title: 'Claim Settled',
    }));
  });

  it('still refuses settling above the claim ceiling (logger import fixed — was a 500)', async () => {
    const claim = (await createClaim()).body;
    const res = await as(ADMIN).put(`/${claim._id}/settle`).send({ approvedAmount: 999999 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('AMOUNT_EXCEEDS_CLAIM');
  });

  it('refuses a double settle', async () => {
    const claim = (await createClaim()).body;
    await as(ADMIN).put(`/${claim._id}/settle`).send({ approvedAmount: 1000 });
    const res = await as(ADMIN).put(`/${claim._id}/settle`).send({ approvedAmount: 1000 });
    expect(res.status).toBe(409);
  });
});

describe('INS-M-02 listing and stats', () => {
  const filedReimbursement = async () => {
    const claim = (await createClaim({ coverageType: 'Reimbursement' })).body;
    await as(ADMIN).put(`/${claim._id}/file-claim`).send({ claimAmount: 9000 });
    return claim;
  };

  it('filters on canonical claimStatus and still matches legacy rows', async () => {
    await filedReimbursement();
    db.push({
      _id: 'legacy1', hospitalId: 'H1', status: 'Filed', claimStatus: 'Not Filed',
      coverageType: 'Reimbursement', insuranceProvider: 'Star Health',
      patientName: 'Legacy Person', preAuthAttempts: [],
    });

    const res = await as(ADMIN).get('/?status=Filed');
    expect(res.status).toBe(200);
    expect(res.body.claims.map((c) => c._id).sort()).toEqual(['clm_1', 'legacy1']);
  });

  it('requires status AND search to both match', async () => {
    const claim = await filedReimbursement(); // patientName 'Priya Patient'
    const both = await as(ADMIN).get('/?status=Filed&search=nomatch');
    expect(both.body.claims).toHaveLength(0);
    const hit = await as(ADMIN).get('/?status=Filed&search=Priya');
    expect(hit.body.claims.map((c) => c._id)).toEqual([claim._id]);
    // A Reimbursement-only search must not leak through the status filter.
    const wrongStatus = await as(ADMIN).get('/?status=Settled&search=Priya');
    expect(wrongStatus.body.claims).toHaveLength(0);
  });

  it('counts pre-auth and claim buckets truthfully, including cashless', async () => {
    // 1: cashless pending pre-auth
    const c1 = (await createClaim()).body;
    await as(ADMIN).post(`/${c1._id}/pre-auth`).send({ requestedAmount: 8000 });
    // 2: reimbursement filed
    await filedReimbursement();
    // 3: legacy settled row only on the schema-less field
    db.push({
      _id: 'legacy2', hospitalId: 'H1', status: 'Settled', claimStatus: 'Not Filed',
      coverageType: 'Cashless', insuranceProvider: 'Star Health',
      patientName: 'Legacy Person', approvedAmount: 4000, preAuthAttempts: [],
    });

    const res = await as(ADMIN).get('/stats/main');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.pending).toBe(1);   // pre-auth pending
    expect(res.body.approved).toBe(0);
    expect(res.body.filed).toBe(1);     // canonical claimStatus only
    expect(res.body.settled).toBe(1);   // legacy `status` row counted via $or
    expect(res.body.cashless).toBe(2);
    expect(res.body.totalAmount).toBe(4000);
  });

  it('is tenant-scoped and fails closed for a tenant-less admin', async () => {
    await createClaim(); // H1
    const scoped = await as(ADMIN2).get('/stats/main');
    expect(scoped.status).toBe(200);
    expect(scoped.body.total).toBe(0);

    const tenantless = await as({ id: 'a3', _id: 'a3', role: 'hospital_admin' }).get('/stats/main');
    expect(tenantless.status).toBe(403);
  });
});

describe('INS-M-02 source pins', () => {
  it('keeps exactly two authorizeObject sites (AUTHZ migration state)', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../../src/routes/insurance.js', import.meta.url), 'utf8');
    expect(src.match(/authorizeObject\(/g)).toHaveLength(2);
    expect(src).toContain("router.post('/:id/pre-auth/resubmit'");
    expect(src).toContain('PRE_AUTH_REQUIRED');
    expect(src).toContain('coverageType');
    // coverageType must NOT be in the generic update allowlist (type is fixed
    // at creation) — the allowlist is the pickBody call in PUT /:id.
    expect(src).not.toMatch(/pickBody\(req\.body, \[[^\]]*'coverageType'/);
  });
});
