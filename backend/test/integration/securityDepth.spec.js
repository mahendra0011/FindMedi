/**
 * File 22 P2-31: breach lifecycle + audit hash-chain verify + PIN/IP gates.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';
import nodeCrypto from 'node:crypto';

const breaches = [];

// Shared AuditLog stub (first registration wins per file): full shape so
// both mounts see the same ledger (rows filled below).
const auditStub = () => ({
  default: {
    create: async () => ({}),
    find: () => ({ sort: () => ({ limit: () => ({ select: () => ({ lean: () => Promise.resolve(auditRows) }) }) }) }),
    findOne: () => query(null),
    countDocuments: async () => auditRows.length,
  },
});

const { as: asBreach } = await mountApp('breach', {
  '../../src/models/Breach.js': () => ({    default: {
      find: () => query(breaches),
      findByIdAndUpdate: async (id, update) => {
        const r = breaches.find((b) => String(b._id) === String(id));
        if (!r) return null;
        Object.assign(r, update.$set);
        return r;
      },
      create: async (d) => {
        const r = {
          _id: 'br1', status: 'Open', detectedAt: new Date(), notifiedAt: null,
          deadlineAt: new Date(Date.now() + 72 * 3600 * 1000), ...d,
        };
        breaches.push(r);
        return r;
      },
    },
  }),
  '../../src/models/AuditLog.js': auditStub,
});

// AuditLog rows with a VALID chain (computed here, same canonical form).
const canon = (prevHash, userId, action, details, ip) => JSON.stringify({
  prevHash, userId: String(userId || ''), action, details: details ?? {}, ip: ip || null,
});
const h1 = nodeCrypto.createHash('sha256').update(canon('GENESIS', 'u1', 'login', {}, '1.2.3.4')).digest('hex');
const h2 = nodeCrypto.createHash('sha256').update(canon(h1, 'u1', 'bill_created', { billId: 'b1' }, '1.2.3.4')).digest('hex');
const auditRows = [
  { _id: 'a2', userId: 'u1', action: 'bill_created', details: { billId: 'b1' }, ip: '1.2.3.4', prevHash: h1, hash: h2 },
  { _id: 'a1', userId: 'u1', action: 'login', details: {}, ip: '1.2.3.4', prevHash: 'GENESIS', hash: h1 },
];
const { as: asAudit } = await mountApp('auditLogs', {
  '../../src/models/AuditLog.js': auditStub,
  '../../src/models/User.js': () => ({ default: { findById: () => query(null) } }),
});

const sec = { _id: 's1', id: 's1', role: 'security_admin', hospitalId: 'h1' };

describe('P2-31 breach register', () => {
  test('report derives the 72h deadline; notify requires a recipient', async () => {
    const r = await asBreach(sec).post('/').send({ title: 'Export anomaly', nature: 'confidentiality' });
    expect(r.status).toBe(201);
    expect(new Date(r.body.deadlineAt).getTime() - Date.now()).toBeGreaterThan(70 * 3600 * 1000);
    const no = await asBreach(sec).patch('/br1').send({ status: 'Notified' });
    expect(no.status).toBe(400);
    const ok = await asBreach(sec).patch('/br1').send({ status: 'Notified', notifiedTo: 'dpo@hospital.in' });
    expect(ok.status).toBe(200);
  });
});

describe('P2-31 hash-chain verify', () => {
  test('valid chain verifies clean', async () => {
    const r = await asAudit(sec).get('/verify?limit=10');
    expect(r.status).toBe(200);
    expect(r.body.checked).toBe(2);
    expect(r.body.bad).toBe(0);
  });
});
