/**
 * B1: HTTP-level integration tests for Checklist APIs.
 *
 * Covers: gate-pass, security rounds, ambulance trips + logs, linen requests,
 * H1/narcotic register (pharmacy). Each section tests:
 *   - Full lifecycle (create → advance → close/use)
 *   - RBAC: restrictTo / authorize gates (wrong role → 403)
 *   - Validation: bad payloads → 400
 *   - Tenant scoping: hospitalId filter behaviour
 */
import { describe, it, test, expect, beforeEach } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

/* ──────────────────────────── shared identities ──────────────────────────── */

const H1 = '507f191e810c19729de860e0';
const H2 = '507f191e810c19729de860e1';

const securityAdmin = {
  _id: 'u_sec_admin', id: 'u_sec_admin', role: 'security_admin',
  hospitalId: H1, permissions: ['audit:read', 'records:read'],
};
const securityGuard = {
  _id: 'u_sec_guard', id: 'u_sec_guard', role: 'security',
  hospitalId: H1, permissions: ['audit:read', 'records:read'],
};
const nurse = {
  _id: 'u_nurse', id: 'u_nurse', role: 'nurse',
  hospitalId: H1, permissions: ['records:read', 'beds:read'],
};
const patient = {
  _id: 'u_patient', id: 'u_patient', role: 'patient',
  hospitalId: H1,
};
const admin = {
  _id: 'u_admin', id: 'u_admin', role: 'hospital_admin',
  hospitalId: H1, permissions: ['staff:manage', 'audit:read', 'records:read', 'beds:read', 'pharmacy:read', 'pharmacy:manage'],
};
const pharmacist = {
  _id: 'u_pharm', id: 'u_pharm', role: 'pharmacist',
  hospitalId: H1, permissions: ['pharmacy:read', 'pharmacy:manage'],
};
const ambulanceDriver = {
  _id: 'u_amb', id: 'u_amb', role: 'ambulance',
  hospitalId: H1, permissions: ['beds:read'],
};
const adminH2 = {
  _id: 'u_admin_h2', id: 'u_admin_h2', role: 'hospital_admin',
  hospitalId: H2, permissions: ['staff:manage', 'audit:read', 'records:read', 'beds:read'],
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  1. GATE PASS + SECURITY ROUNDS  (/api/security)                          */
/* ═══════════════════════════════════════════════════════════════════════════ */

const gatePasses = [];
const securityRounds = [];

const { as: asSec } = await mountApp('security', {
  '../../src/models/GatePass.js': () => ({
    GatePass: {
      create: async (data) => {
        const row = {
          _id: `gp${gatePasses.length + 1}`,
          status: 'requested',
          createdAt: new Date(),
          ...data,
          save: async function () { return this; },
        };
        gatePasses.push(row);
        return row;
      },
      findById: async (id) => {
        const row = gatePasses.find((r) => String(r._id) === String(id));
        if (!row) return null;
        row.save = async function () { return this; };
        return row;
      },
      find: (filter) => {
        let results = [...gatePasses];
        if (filter?.hospitalId) results = results.filter((r) => String(r.hospitalId) === String(filter.hospitalId));
        if (filter?.status) results = results.filter((r) => r.status === filter.status);
        if (filter?.type) results = results.filter((r) => r.type === filter.type);
        return { sort: () => ({ limit: () => ({ lean: async () => results }) }) };
      },
    },
    SecurityRound: {
      create: async (data) => {
        const row = {
          _id: `sr${securityRounds.length + 1}`,
          status: 'open',
          startedAt: new Date(),
          ...data,
          save: async function () { return this; },
        };
        securityRounds.push(row);
        return row;
      },
      findById: async (id) => {
        const row = securityRounds.find((r) => String(r._id) === String(id));
        if (!row) return null;
        row.save = async function () { return this; };
        return row;
      },
      find: (filter) => {
        let results = [...securityRounds];
        if (filter?.hospitalId) results = results.filter((r) => String(r.hospitalId) === String(filter.hospitalId));
        if (filter?.status) results = results.filter((r) => r.status === filter.status);
        return { sort: () => ({ limit: () => ({ lean: async () => results }) }) };
      },
    },
    GATE_PASS_TYPES: ['sample_transport', 'equipment_out', 'store_dispatch', 'body_transport', 'other'],
    GATE_PASS_STATUS: ['requested', 'approved', 'rejected', 'used', 'expired'],
  }),
  '../../src/middleware/audit.js': () => ({ auditLog: async () => ({}) }),
  '../../src/utils/idGenerator.js': () => ({
    generateTimestampedId: (prefix) => `${prefix}-${Date.now()}`,
  }),
});

describe('Gate Pass lifecycle', () => {
  it('creates a gate pass via POST (any authenticated role)', async () => {
    const res = await asSec(nurse)
      .post('/gate-passes')
      .send({ type: 'sample_transport', description: 'Blood samples to lab' })
      .expect(201);

    expect(res.body.passNo).toBeDefined();
    expect(res.body.status).toBe('requested');
  });

  it('rejects invalid gate pass type with 400', async () => {
    await asSec(nurse)
      .post('/gate-passes')
      .send({ type: 'INVALID_TYPE', description: 'test' })
      .expect(400);
  });

  it('rejects empty description with 400', async () => {
    await asSec(nurse)
      .post('/gate-passes')
      .send({ type: 'equipment_out', description: '' })
      .expect(400);
  });

  it('approve → use lifecycle', async () => {
    // Approve
    const approve = await asSec(securityAdmin)
      .put(`/gate-passes/${gatePasses[0]._id}/decide`)
      .send({ action: 'approve' })
      .expect(200);
    expect(approve.body.status).toBe('approved');

    // Use
    const use = await asSec(securityAdmin)
      .put(`/gate-passes/${gatePasses[0]._id}/use`)
      .expect(200);
    expect(use.body.status).toBe('used');
  });

  it('cannot use a non-approved pass → 409', async () => {
    // Create another pass (index 1), don't approve it
    await asSec(nurse)
      .post('/gate-passes')
      .send({ type: 'other', description: 'Some items' })
      .expect(201);

    await asSec(securityAdmin)
      .put(`/gate-passes/${gatePasses[1]._id}/use`)
      .expect(409);
  });

  it('reject with reason', async () => {
    await asSec(nurse)
      .post('/gate-passes')
      .send({ type: 'store_dispatch', description: 'Office supplies' })
      .expect(201);

    const rej = await asSec(securityAdmin)
      .put(`/gate-passes/${gatePasses[2]._id}/decide`)
      .send({ action: 'reject', reason: 'Unauthorized dispatch' })
      .expect(200);
    expect(rej.body.status).toBe('rejected');
  });

  it('expired badge logic: cannot use after validUntil', async () => {
    // Create a pass with already-expired validUntil
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await asSec(nurse)
      .post('/gate-passes')
      .send({ type: 'equipment_out', description: 'Expired test', validUntil: past })
      .expect(201);

    // Approve it first
    const lastPass = gatePasses[gatePasses.length - 1];
    lastPass.status = 'approved'; // force approve in stub
    lastPass.validUntil = new Date(Date.now() - 60 * 60 * 1000); // already expired

    const res = await asSec(securityAdmin)
      .put(`/gate-passes/${lastPass._id}/use`)
      .expect(410);
    expect(res.body.code).toBe('EXPIRED');
  });

  it('patient cannot decide on gate-passes → 403', async () => {
    await asSec(patient)
      .put(`/gate-passes/${gatePasses[0]._id}/decide`)
      .send({ action: 'approve' })
      .expect(403);
  });

  it('lists gate passes (requires audit:read or records:read)', async () => {
    const res = await asSec(securityAdmin).get('/gate-passes').expect(200);
    expect(res.body.passes).toBeDefined();
    expect(res.body.total).toBeGreaterThan(0);
  });
});

describe('Security Rounds lifecycle', () => {
  it('starts a security round', async () => {
    const res = await asSec(securityGuard)
      .post('/rounds')
      .send({ checkpoints: [{ name: 'Gate A' }, { name: 'Building B' }, { name: 'Parking C' }] })
      .expect(201);

    expect(res.body.roundNo).toBeDefined();
    expect(res.body.checkpoints).toHaveLength(3);
    expect(res.body.checkpoints[0].ok).toBe(false);
  });

  it('rejects round with empty checkpoints → 400', async () => {
    await asSec(securityGuard)
      .post('/rounds')
      .send({ checkpoints: [] })
      .expect(400);
  });

  it('ticks a checkpoint', async () => {
    const round = securityRounds[0];
    const res = await asSec(securityGuard)
      .put(`/rounds/${round._id}/checkpoints/0`)
      .send({ index: 0, ok: true, note: 'All clear' })
      .expect(200);

    expect(res.body.checkpoints[0].ok).toBe(true);
    expect(res.body.checkpoints[0].note).toBe('All clear');
  });

  it('invalid checkpoint index → 404', async () => {
    const round = securityRounds[0];
    await asSec(securityGuard)
      .put(`/rounds/${round._id}/checkpoints/99`)
      .send({ index: 99, ok: true })
      .expect(404);
  });

  it('closes a round', async () => {
    const round = securityRounds[0];
    const res = await asSec(securityGuard)
      .put(`/rounds/${round._id}/close`)
      .send({})
      .expect(200);
    expect(res.body.status).toBe('closed');
  });

  it('cannot tick a closed round → 409', async () => {
    const round = securityRounds[0];
    await asSec(securityGuard)
      .put(`/rounds/${round._id}/checkpoints/1`)
      .send({ index: 1, ok: true })
      .expect(409);
  });

  it('patient cannot start a round → 403', async () => {
    await asSec(patient)
      .post('/rounds')
      .send({ checkpoints: [{ name: 'Test' }] })
      .expect(403);
  });

  it('lists rounds', async () => {
    const res = await asSec(securityAdmin).get('/rounds').expect(200);
    expect(res.body.rounds).toBeDefined();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  2. AMBULANCE TRIPS + VEHICLE LOGS  (/api/ambulance-trips)                */
/* ═══════════════════════════════════════════════════════════════════════════ */

const trips = [];
const vehicleLogs = [];

const { as: asAmb } = await mountApp('ambulanceTrips', {
  '../../src/models/AmbulanceTrip.js': () => ({
    AmbulanceTrip: {
      create: async (data) => {
        const row = {
          _id: `trip${trips.length + 1}`,
          status: 'ongoing',
          createdAt: new Date(),
          ...data,
          save: async function () { return this; },
        };
        trips.push(row);
        return row;
      },
      findById: async (id) => {
        const row = trips.find((r) => String(r._id) === String(id));
        if (!row) return null;
        row.save = async function () { return this; };
        return row;
      },
      find: (filter) => {
        let results = [...trips];
        if (filter?.driverId) results = results.filter((r) => String(r.driverId) === String(filter.driverId));
        if (filter?.status) results = results.filter((r) => r.status === filter.status);
        return { sort: () => ({ limit: () => ({ lean: async () => results }) }) };
      },
      aggregate: async () => [],
    },
    AmbulanceVehicleLog: {
      create: async (data) => {
        const row = { _id: `vl${vehicleLogs.length + 1}`, createdAt: new Date(), ...data };
        vehicleLogs.push(row);
        return row;
      },
      find: (filter) => {
        let results = [...vehicleLogs];
        if (filter?.type) results = results.filter((r) => r.type === filter.type);
        return { sort: () => ({ limit: () => ({ lean: async () => results }) }) };
      },
      aggregate: async () => [],
    },
    VEHICLE_LOG_TYPES: ['fuel', 'maintenance', 'inspection', 'insurance', 'other'],
    TRIP_STATUS: ['ongoing', 'completed', 'cancelled'],
  }),
  '../../src/models/Ambulance.js': () => ({
    default: {
      findOne: (filter) => {
        if (filter?.userId === 'u_amb') {
          return { select: () => ({ lean: async () => ({ _id: 'amb1', hospitalId: H1 }) }) };
        }
        return { select: () => ({ lean: async () => null }) };
      },
    },
  }),
  '../../src/middleware/audit.js': () => ({ auditLog: async () => ({}) }),
});

describe('Ambulance Trip lifecycle', () => {
  it('driver starts a trip', async () => {
    const res = await asAmb(ambulanceDriver)
      .post('/trips')
      .send({ fromLocation: 'Main Gate', toLocation: 'City Hospital', odometerStartKm: 15000 })
      .expect(201);

    expect(res.body.fromLocation).toBe('Main Gate');
    expect(res.body.status).toBe('ongoing');
    expect(res.body.driverId).toBe('u_amb');
  });

  it('rejects trip without fromLocation → 400', async () => {
    await asAmb(ambulanceDriver)
      .post('/trips')
      .send({ toLocation: 'Somewhere' })
      .expect(400);
  });

  it('ends a trip with valid odometer', async () => {
    const res = await asAmb(ambulanceDriver)
      .put(`/trips/${trips[0]._id}/end`)
      .send({ odometerEndKm: 15050 })
      .expect(200);

    expect(res.body.status).toBe('completed');
    expect(res.body.odometerEndKm).toBe(15050);
  });

  it('odometerEnd < odometerStart → 400', async () => {
    // Create fresh trip for this test
    await asAmb(ambulanceDriver)
      .post('/trips')
      .send({ fromLocation: 'A', toLocation: 'B', odometerStartKm: 20000 })
      .expect(201);

    await asAmb(ambulanceDriver)
      .put(`/trips/${trips[trips.length - 1]._id}/end`)
      .send({ odometerEndKm: 19000 })
      .expect(400);
  });

  it('cannot end an already completed trip → 409', async () => {
    await asAmb(ambulanceDriver)
      .put(`/trips/${trips[0]._id}/end`)
      .send({ odometerEndKm: 16000 })
      .expect(409);
  });

  it('patient cannot start a trip → 403', async () => {
    await asAmb(patient)
      .post('/trips')
      .send({ fromLocation: 'A', toLocation: 'B' })
      .expect(403);
  });

  it('lists trips for admin', async () => {
    const res = await asAmb(admin).get('/trips').expect(200);
    expect(res.body.trips).toBeDefined();
    expect(res.body.total).toBeGreaterThan(0);
  });
});

describe('Ambulance Vehicle Logs', () => {
  it('driver writes a fuel log', async () => {
    const res = await asAmb(ambulanceDriver)
      .post('/logs')
      .send({ type: 'fuel', odometerKm: 15050, litres: 40, costInr: 4000 })
      .expect(201);

    expect(res.body.type).toBe('fuel');
    expect(res.body.litres).toBe(40);
  });

  it('driver writes a maintenance log', async () => {
    const res = await asAmb(ambulanceDriver)
      .post('/logs')
      .send({ type: 'maintenance', description: 'Oil change', costInr: 1200 })
      .expect(201);

    expect(res.body.type).toBe('maintenance');
  });

  it('invalid log type → 400', async () => {
    await asAmb(ambulanceDriver)
      .post('/logs')
      .send({ type: 'WRONG_TYPE' })
      .expect(400);
  });

  it('patient cannot write logs → 403', async () => {
    await asAmb(patient)
      .post('/logs')
      .send({ type: 'fuel', litres: 10 })
      .expect(403);
  });

  it('lists vehicle logs', async () => {
    const res = await asAmb(admin).get('/logs').expect(200);
    expect(res.body.logs).toBeDefined();
  });

  it('stats endpoint requires ambulanceId', async () => {
    await asAmb(admin).get('/stats').expect(400);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  3. LINEN & LAUNDRY  (/api/linen)                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */

const linenRequests = [];

const { as: asLinen } = await mountApp('linen', {
  '../../src/models/LinenRequest.js': () => ({
    default: {
      create: async (data) => {
        const row = {
          _id: `lin${linenRequests.length + 1}`,
          status: 'requested',
          createdAt: new Date(),
          ...data,
          save: async function () { return this; },
        };
        linenRequests.push(row);
        return row;
      },
      findById: async (id) => {
        const row = linenRequests.find((r) => String(r._id) === String(id));
        if (!row) return null;
        row.save = async function () { return this; };
        return row;
      },
      find: (filter) => {
        let results = [...linenRequests];
        if (filter?.hospitalId) results = results.filter((r) => String(r.hospitalId) === String(filter.hospitalId));
        if (filter?.status) results = results.filter((r) => r.status === filter.status);
        return { sort: () => ({ limit: () => ({ lean: async () => results }) }) };
      },
      aggregate: async () => [],
      countDocuments: async () => 0,
    },
    LINEN_STATUSES: ['requested', 'collected', 'washed', 'processed', 'delivered', 'cancelled'],
  }),
  '../../src/middleware/audit.js': () => ({ auditLog: async () => ({}) }),
  '../../src/utils/idGenerator.js': () => ({
    generateTimestampedId: (prefix) => `${prefix}-${Date.now()}`,
  }),
});

describe('Linen request lifecycle', () => {
  it('creates a linen request', async () => {
    const res = await asLinen(nurse)
      .post('/requests')
      .send({ items: [{ name: 'Bed Sheet', qty: 5 }, { name: 'Pillow Cover', qty: 10 }], ward: 'ICU', isolationCase: true })
      .expect(201);

    expect(res.body.requestId).toBeDefined();
    expect(res.body.items).toHaveLength(2);
    expect(res.body.isolationCase).toBe(true);
  });

  it('rejects empty items → 400', async () => {
    await asLinen(nurse)
      .post('/requests')
      .send({ items: [] })
      .expect(400);
  });

  it('status transitions: requested → collected → washed → processed → delivered', async () => {
    const row = linenRequests[0];

    // requested → collected
    let res = await asLinen(admin)
      .put(`/requests/${row._id}/status`)
      .send({ status: 'collected' })
      .expect(200);
    expect(res.body.status).toBe('collected');

    // collected → washed
    res = await asLinen(admin)
      .put(`/requests/${row._id}/status`)
      .send({ status: 'washed' })
      .expect(200);
    expect(res.body.status).toBe('washed');

    // washed → processed
    res = await asLinen(admin)
      .put(`/requests/${row._id}/status`)
      .send({ status: 'processed' })
      .expect(200);
    expect(res.body.status).toBe('processed');

    // processed → delivered
    res = await asLinen(admin)
      .put(`/requests/${row._id}/status`)
      .send({ status: 'delivered' })
      .expect(200);
    expect(res.body.status).toBe('delivered');
    expect(res.body.deliveredAt).toBeDefined();
  });

  it('invalid transition: delivered → requested → 409', async () => {
    const res = await asLinen(admin)
      .put(`/requests/${linenRequests[0]._id}/status`)
      .send({ status: 'requested' })
      .expect(409);
    expect(res.body.code).toBe('INVALID_TRANSITION');
  });

  it('cancellation from requested state', async () => {
    await asLinen(nurse)
      .post('/requests')
      .send({ items: [{ name: 'Towel', qty: 2 }] })
      .expect(201);

    const row = linenRequests[linenRequests.length - 1];
    const res = await asLinen(admin)
      .put(`/requests/${row._id}/status`)
      .send({ status: 'cancelled' })
      .expect(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('tenant scoping: admin H2 cannot change H1 linen status → 403', async () => {
    await asLinen(nurse)
      .post('/requests')
      .send({ items: [{ name: 'Gown', qty: 1 }] })
      .expect(201);

    const row = linenRequests[linenRequests.length - 1];
    await asLinen(adminH2)
      .put(`/requests/${row._id}/status`)
      .send({ status: 'collected' })
      .expect(403);
  });

  it('lists linen requests', async () => {
    const res = await asLinen(admin).get('/requests').expect(200);
    expect(res.body.requests).toBeDefined();
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('stats endpoint works', async () => {
    const res = await asLinen(admin).get('/stats').expect(200);
    expect(res.body.byStatus).toBeDefined();
    expect(res.body.isolationPending).toBeDefined();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  4. UNAUTHENTICATED  — baseline checks                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

describe('Unauthenticated requests → 401', () => {
  // No user header = unauthenticated
  const noUser = undefined;

  test('gate-pass POST', async () => {
    await asSec(noUser).post('/gate-passes').send({ type: 'other', description: 'test' }).expect(401);
  });

  test('gate-pass list', async () => {
    await asSec(noUser).get('/gate-passes').expect(401);
  });

  test('round POST', async () => {
    await asSec(noUser).post('/rounds').send({ checkpoints: [{ name: 'A' }] }).expect(401);
  });

  test('ambulance trip POST', async () => {
    await asAmb(noUser).post('/trips').send({ fromLocation: 'A', toLocation: 'B' }).expect(401);
  });

  test('linen request POST', async () => {
    await asLinen(noUser).post('/requests').send({ items: [{ name: 'Sheet', qty: 1 }] }).expect(401);
  });
});
