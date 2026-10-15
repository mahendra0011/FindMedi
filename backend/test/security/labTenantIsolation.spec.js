import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Mock dependencies
const mockAuditLog = jest.fn().mockResolvedValue(true);
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: mockAuditLog,
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.unstable_mockModule('../../src/middleware/auth.js', () => ({
  protect: (req, res, next) => {
    if (!req.user && !req.serviceAccount) return res.status(401).json({ message: 'Not authorized' });
    next();
  },
  adminOnly: (req, res, next) => next(),
  authorize: () => (req, res, next) => next(),
  requireRole: () => (req, res, next) => next(),
  optionalAuth: (req, res, next) => next(),
}));

let labOrdersStore = [];
const mockLabOrder = {
  findOne: jest.fn(async (query) => {
    return labOrdersStore.find((o) => {
      // Must match hospitalId if specified in query
      if (query.hospitalId && String(o.hospitalId) !== String(query.hospitalId)) {
        return false;
      }
      if (query.orderId && o.orderId === query.orderId) return true;
      if (query.accessionNo && o.accessionNo === query.accessionNo) return true;
      if (query.$or) {
        return query.$or.some((clause) => {
          if (clause.accessionNo && o.accessionNo === clause.accessionNo) return true;
          if (clause.orderId && o.orderId === clause.orderId) return true;
          return false;
        });
      }
      return false;
    }) || null;
  }),
};

jest.unstable_mockModule('../../src/models/LabOrder.js', () => ({
  default: mockLabOrder,
}));

// Ingest routes use apiKeyAuth or protect
const testApp = express();
testApp.use(express.json());

// Inject user context middleware for test
testApp.use((req, res, next) => {
  const userHeader = req.get('x-test-user');
  if (userHeader) {
    req.user = JSON.parse(Buffer.from(userHeader, 'base64').toString('utf8'));
  }
  next();
});

const { default: labRoutes } = await import('../../src/routes/lab.js');
testApp.use('/api/lab', labRoutes);

describe('PHARM-LAB-BUG-01: Laboratory Analyzer Machine Tenant Isolation', () => {
  const STX = '\x02';
  const ETX = '\x03';
  const CR = '\r';
  const LF = '\n';
  const validAstmFrame = `${STX}1H|\\^&|||ERBA|||||||P|1${CR}P|1|||PAT001|||||||||||||||||||||||||||${CR}O|1|ORD-999|^^^GLU|||||||||||||||||||||F${CR}R|1|^^^GLU|5.4|mmol/L|3.9-5.5|N||F||||20261015120000${CR}L|1|N${ETX}00${CR}${LF}`;

  beforeEach(() => {
    jest.clearAllMocks();
    labOrdersStore = [
      {
        _id: 'lo_hosp_A',
        orderId: 'ORD-999',
        accessionNo: 'ACC-999',
        hospitalId: 'hosp_A',
        tests: [{ testName: 'GLU', status: 'Pending', resultValue: null }],
        save: jest.fn().mockResolvedValue(true),
      },
      {
        _id: 'lo_hosp_B',
        orderId: 'ORD-999',
        accessionNo: 'ACC-999',
        hospitalId: 'hosp_B',
        tests: [{ testName: 'GLU', status: 'Pending', resultValue: null }],
        save: jest.fn().mockResolvedValue(true),
      },
    ];
  });

  const encodeUser = (user) => Buffer.from(JSON.stringify(user)).toString('base64');

  it('rejects ASTM ingestion when tenantId is missing', async () => {
    const res = await request(testApp)
      .post('/api/lab/ingest/astm')
      .set('x-test-user', encodeUser({ _id: 'u1', role: 'lab_technician' }))
      .send({ frame: validAstmFrame });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/tenant ID is required/i);
    expect(labOrdersStore[0].save).not.toHaveBeenCalled();
    expect(labOrdersStore[1].save).not.toHaveBeenCalled();
  });

  it('strictly scopes ASTM result to authenticated hospital without touching foreign hospital order with identical sample ID', async () => {
    const res = await request(testApp)
      .post('/api/lab/ingest/astm')
      .set('x-test-user', encodeUser({ _id: 'u1', role: 'lab_technician', hospitalId: 'hosp_A' }))
      .send({ frame: validAstmFrame });

    expect(res.status).toBe(200);
    expect(res.body.matched).toBe(1);
    expect(labOrdersStore[0].save).toHaveBeenCalled();
    expect(labOrdersStore[0].tests[0].resultValue).toBe('5.4');
    expect(labOrdersStore[0].tests[0].status).toBe('Completed');

    // Hospital B's order must NOT be touched!
    expect(labOrdersStore[1].save).not.toHaveBeenCalled();
    expect(labOrdersStore[1].tests[0].resultValue).toBeNull();
  });

  it('rejects HL7 ingestion when tenantId is missing', async () => {
    const res = await request(testApp)
      .post('/api/lab/ingest/hl7')
      .set('x-test-user', encodeUser({ _id: 'u2', role: 'lab_technician' }))
      .send({ hl7: 'MSH|^~\\&|ANALYZER|LAB|FINDMEDI|HOSP|20261015120000||ORU^R01|MSG001|P|2.5\rPID|1||PAT001||DOE^JOHN\rOBR|1|ORD-999||GLU^Glucose\rOBX|1|NM|GLU^Glucose||5.4|mmol/L|3.9-5.5|N|||F' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/tenant ID is required/i);
    expect(labOrdersStore[0].save).not.toHaveBeenCalled();
  });

  it('scopes HL7 ingestion strictly to authenticated hospital tenant', async () => {
    const res = await request(testApp)
      .post('/api/lab/ingest/hl7')
      .set('x-test-user', encodeUser({ _id: 'u2', role: 'lab_technician', hospitalId: 'hosp_B' }))
      .send({ hl7: 'MSH|^~\\&|ANALYZER|LAB|FINDMEDI|HOSP|20261015120000||ORU^R01|MSG001|P|2.5\rPID|1||PAT001||DOE^JOHN\rOBR|1|ORD-999||GLU^Glucose\rOBX|1|NM|GLU^Glucose||7.2|mmol/L|3.9-5.5|H|||F' });

    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(1);

    // Hospital B was authenticated, so only Hosp B's order is modified
    expect(labOrdersStore[1].save).toHaveBeenCalled();
    expect(labOrdersStore[1].tests[0].resultValue).toBe('7.2');
    expect(labOrdersStore[1].tests[0].isAbnormal).toBe(true);

    // Hospital A's order was NOT modified
    expect(labOrdersStore[0].save).not.toHaveBeenCalled();
    expect(labOrdersStore[0].tests[0].resultValue).toBeNull();
  });
});
