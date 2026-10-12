/**
 * B1 (supplement): HTTP-level integration tests for H1 / Narcotic Register
 * endpoints in the pharmacy router.
 *
 * The pharmacy router has 25+ imports, so this file follows the
 * pharmacyInventoryRoutes.spec.js pattern: mock at top-level with
 * `jest.unstable_mockModule` BEFORE the harness assembles the router.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

/* ── Top-level stubs (registered BEFORE mountApp resolves the router) ──── */

const h1Entries = [];

jestApi.unstable_mockModule('../../src/models/H1RegisterEntry.js', () => ({
  default: {
    create: async (d) => {
      const row = { _id: `h1_${h1Entries.length + 1}`, dispensedAt: new Date(), ...d };
      h1Entries.push(row);
      return row;
    },
    find: (filter) => {
      let results = [...h1Entries];
      if (filter?.hospitalId) results = results.filter((r) => String(r.hospitalId) === String(filter.hospitalId));
      if (filter?.rxSchedule) results = results.filter((r) => r.rxSchedule === filter.rxSchedule);
      if (filter?.dispensedAt?.$gte) results = results.filter((r) => new Date(r.dispensedAt) >= filter.dispensedAt.$gte);
      if (filter?.dispensedAt?.$lte) results = results.filter((r) => new Date(r.dispensedAt) <= filter.dispensedAt.$lte);
      const chain = {
        sort: () => chain,
        limit: () => chain,
        lean: async () => results,
        // T6 export streams via cursor() — async generator over the rows.
        cursor: () => (async function* () { for (const r of results) yield r; })(),
      };
      return chain;
    },
    findOne: () => query(null),
    countDocuments: async () => h1Entries.length,
  },
  REGISTER_SCHEDULES: ['h1', 'x', 'narcotic_ndps'],
  REGISTER_SCHEDULE_ALIASES: { schedule_h1: 'h1', schedule_x: 'x' },
}));

jestApi.unstable_mockModule('../../src/models/Prescription.js', () => ({
  default: {
    create: async (d) => ({ _id: 'rx1', ...d }),
    findById: () => query(null),
    findOne: () => query(null),
    find: (filter) => ({ select: () => ({ limit: () => ({ lean: async () => [] }) }) }),
    countDocuments: async () => 0,
  },
  PRESCRIPTION_STATUS: ['pending', 'dispensed', 'cancelled'],
  RX_SCHEDULES: ['h1', 'x', 'narcotic_ndps'],
}));

jestApi.unstable_mockModule('../../src/models/Medicine.js', () => ({
  default: {
    find: () => ({ select: () => ({ lean: async () => [] }) }),
    findById: () => query(null),
    findOne: () => query(null),
    findOneAndUpdate: async () => null,
    countDocuments: async () => 0,
  },
}));

jestApi.unstable_mockModule('../../src/models/Facility.js', () => ({
  default: { findById: () => query(null), findOne: () => query(null) },
}));

jestApi.unstable_mockModule('../../src/models/PharmacyOrder.js', () => ({
  default: {
    create: async (d) => d,
    findById: () => query(null),
    findOne: () => query(null),
    findOneAndUpdate: async () => null,
  },
}));

jestApi.unstable_mockModule('../../src/models/Payment.js', () => ({
  default: { findById: () => query(null), findOne: () => query(null), find: () => query([]) },
}));

jestApi.unstable_mockModule('../../src/models/PharmacyDelivery.js', () => ({
  default: {
    create: async (d) => d,
    findById: () => query(null),
    findOne: () => query(null),
    find: () => query([]),
    findByIdAndUpdate: async () => null,
  },
}));

jestApi.unstable_mockModule('../../src/models/PharmacyOffer.js', () => ({
  default: { findById: () => query(null), findOne: () => query(null), find: () => query([]) },
}));

jestApi.unstable_mockModule('../../src/models/PharmacyReturn.js', () => ({
  default: {
    create: async (d) => d,
    findById: () => query(null),
    findOne: () => query(null),
    find: () => query([]),
  },
}));

jestApi.unstable_mockModule('../../src/models/PharmacyStaff.js', () => ({
  default: { findById: () => query(null), findOne: () => query(null), find: () => query([]) },
}));

jestApi.unstable_mockModule('../../src/models/Notification.js', () => ({
  default: { create: async () => ({}), find: () => query([]) },
}));

jestApi.unstable_mockModule('../../src/models/Billing.js', () => ({
  default: { findById: () => query(null), findOne: () => query(null), find: () => query([]), create: async (d) => d },
}));

// T6: the audit mock RECORDS calls so specs can assert export auditing.
const auditCalls = [];
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: async (action, userId, details) => {
    auditCalls.push({ action, userId, details });
    return {};
  },
}));

jestApi.unstable_mockModule('../../src/middleware/authorize.js', () => ({
  authorizeObject: () => (_req, _res, next) => next(),
  rolesWithPermission: () => [],
}));

jestApi.unstable_mockModule('../../src/middleware/tenantOwnership.js', () => ({
  callerMayActOnDoc: () => true,
}));

jestApi.unstable_mockModule('../../src/middleware/idempotency.js', () => ({
  idempotencyGuard: () => (_req, _res, next) => next(),
}));

jestApi.unstable_mockModule('../../src/services/pharmacyDispenseService.js', () => ({
  dispensePrescriptionMedicine: async () => ({}),
}));

jestApi.unstable_mockModule('../../src/services/pharmacyInventoryService.js', () => ({
  PHARMACY_RESERVATION_TTL_MS: 900_000,
  reservePharmacyOrderItems: async () => undefined,
  releasePharmacyOrderItems: async () => undefined,
}));

jestApi.unstable_mockModule('../../src/lib/transactionalOutbox.js', () => ({
  executeWithOutbox: async (fn) => fn({ id: 'mock-session' }),
  writeOutboxEvent: async () => ({}),
}));

jestApi.unstable_mockModule('../../src/config/kafka.js', () => ({
  KAFKA_TOPICS: {},
}));

jestApi.unstable_mockModule('../../src/services/pharmacyOrderLifecycle.js', () => ({
  canCollectPharmacyCod: () => true,
  canTransitionPharmacyOrder: () => true,
}));

jestApi.unstable_mockModule('../../src/services/prescriptionIntegrity.js', () => ({
  sealPrescription: async () => ({}),
  issueToken: async () => 'mock-token',
  verifyToken: async () => ({ valid: true }),
}));

jestApi.unstable_mockModule('../../src/utils/escapeRegex.js', () => ({
  escapeRegex: (s) => s,
  capSearch: (s) => new RegExp(s, 'i'),
}));

jestApi.unstable_mockModule('../../src/utils/tenantScope.js', () => ({
  applyTenantScope: (filter, req) => {
    if (req?.user?.hospitalId) filter.hospitalId = req.user.hospitalId;
    return filter;
  },
}));

jestApi.unstable_mockModule('../../src/lib/geoUtils.js', () => ({
  calculateDistanceKm: () => 0,
}));


jestApi.unstable_mockModule('../../src/utils/pagination.js', () => ({
  paginatedResults: (model) => async (req, res, next) => {
    req.paginatedResults = { results: [], totalPages: 0, currentPage: 1 };
    next();
  },
}));

jestApi.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
}));

/* ── Mount the pharmacy router ──────────────────────────────────────────── */

const { as } = await mountApp('pharmacy', {
  '../../src/middleware/auth.js': () => ({
    protect: (req, res, next) => {
      const raw = req.get('x-test-user');
      if (!raw) return res.status(401).json({ message: 'Not authorized' });
      try {
        req.user = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
      } catch {
        return res.status(401).json({ message: 'Not authorized' });
      }
      return next();
    },
    authorize: (...perms) => (req, res, next) => {
      if (!req.user) return res.status(401).json({ message: 'Not authorized' });
      const userPerms = req.user.permissions || [];
      const hasPerm = perms.some((p) => userPerms.includes(p));
      if (!hasPerm) return res.status(403).json({ message: 'Forbidden' });
      return next();
    },
    adminOnly: (req, res, next) => {
      if (req.user?.role !== 'hospital_admin' && req.user?.role !== 'superadmin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      return next();
    },
    optionalProtect: (req, res, next) => next(),
  }),
});

/* ── Identities ──────────────────────────────────────────────────────────── */

const pharmacist = {
  _id: 'u_pharm', id: 'u_pharm', role: 'pharmacist',
  hospitalId: 'h1', permissions: ['pharmacy:read', 'pharmacy:manage'],
};
const admin = {
  _id: 'u_admin', id: 'u_admin', role: 'hospital_admin',
  hospitalId: 'h1', permissions: ['pharmacy:read', 'pharmacy:manage', 'staff:manage'],
};
const patient = {
  _id: 'u_patient', id: 'u_patient', role: 'patient',
  hospitalId: 'h1',
};

/* ── Tests ───────────────────────────────────────────────────────────────── */

describe('H1 / Narcotic Register API', () => {
  it('GET /h1-register → 200 for pharmacist', async () => {
    const res = await as(pharmacist).get('/h1-register').expect(200);
    expect(res.body.rows).toBeDefined();
    expect(res.body.count).toBeDefined();
  });

  it('GET /h1-register → 200 for admin with pharmacy:read', async () => {
    const res = await as(admin).get('/h1-register').expect(200);
    expect(res.body.rows).toBeDefined();
  });

  it('GET /h1-register → patient denied (no pharmacy:read)', async () => {
    const res = await as(patient).get('/h1-register');
    expect([401, 403]).toContain(res.status);
  });

  it('GET /h1-register?rxSchedule=h1 → filters by schedule', async () => {
    const res = await as(pharmacist).get('/h1-register?rxSchedule=h1').expect(200);
    expect(res.body.rows).toBeDefined();
  });

  it('GET /h1-register/gaps → 200 for pharmacy:manage', async () => {
    const res = await as(pharmacist).get('/h1-register/gaps').expect(200);
    expect(res.body.gaps).toBeDefined();
    expect(res.body.checked).toBeDefined();
  });

  it('GET /h1-register/gaps → patient denied', async () => {
    const res = await as(patient).get('/h1-register/gaps');
    expect([401, 403]).toContain(res.status);
  });

  it('GET /h1-register/export → CSV for pharmacist', async () => {
    const res = await as(pharmacist).get('/h1-register/export').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/h1-narcotic-register/);
    // CSV header should be present
    expect(res.text).toContain('DispensedAt');
  });

  // T6 (file 31): CSV/formula-injection hardening — a cell beginning with
  // =, +, - or @ must be neutralised before it reaches Excel/Sheets, inner
  // quotes must be doubled (RFC4180), and the export is streamed (no silent
  // 1000-row truncation).
  it('GET /h1-register/export neutralises formula injection & escapes quotes', async () => {
    // Register rows are written by the dispense flow; seed one directly.
    h1Entries.push({
      _id: 'h1_inject', hospitalId: 'h1',
      patientName: "=cmd|' /C calc'!A0",
      medicineName: 'H1 "Test" Drug',
      prescriberName: '+91 9999999999',
      prescriptionNo: 'RX-INJ-1',
      rxSchedule: 'h1', quantity: 5,
      dispensedAt: new Date(),
      dispensedByName: 'Pharm A',
    });

    const res = await as(pharmacist).get('/h1-register/export').expect(200);
    // Formula guard: leading = / + cells are prefixed with a single quote
    expect(res.text).toContain('\'=cmd');
    expect(res.text).toContain('\'+91 9999999999');
    expect(res.text).not.toMatch(/,=cmd/);
    // RFC4180: inner quotes doubled inside the quoted cell
    expect(res.text).toContain('H1 ""Test"" Drug');
  });

  it('GET /h1-register/export writes an audit row for the export', async () => {
    auditCalls.length = 0;
    await as(pharmacist).get('/h1-register/export?rxSchedule=h1').expect(200);

    const exported = auditCalls.find((c) => c.action === 'h1_register_exported');
    expect(exported).toBeDefined();
    expect(exported.details.filters.rxSchedule).toBe('h1');
    expect(typeof exported.details.rows).toBe('number');
    expect(exported.userId).toBe(pharmacist._id);
  });

  it('GET /h1-register/export → patient denied', async () => {
    const res = await as(patient).get('/h1-register/export');
    expect([401, 403]).toContain(res.status);
  });

  it('unauthenticated → 401 across all endpoints', async () => {
    await as(undefined).get('/h1-register').expect(401);
    await as(undefined).get('/h1-register/gaps').expect(401);
    await as(undefined).get('/h1-register/export').expect(401);
  });
});
