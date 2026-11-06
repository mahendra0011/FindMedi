import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const created = [];
const saved = [];
const auditLogRequired = jest.fn().mockResolvedValue(undefined);
const listQuery = (rows) => query(rows);

jest.unstable_mockModule('../../src/models/VendorDpa.js', () => ({ default: {
  find: jest.fn(() => ({ ...listQuery([]), sort: () => ({ ...listQuery([]), limit: () => ({ ...listQuery([]), lean: () => Promise.resolve([]) }) }) })),
  create: jest.fn(async (row) => { const doc = { ...row, _id: '660000000000000000000021' }; created.push(doc); return doc; }),
  findById: jest.fn(async () => ({
    _id: '660000000000000000000021', dpaStatus: 'not_started', updatedAt: new Date(),
    save: jest.fn(async function save() { saved.push(this.dpaStatus); }),
  })),
} }));
jest.unstable_mockModule('../../src/middleware/audit.js', () => ({ auditLogRequired }));

const { as } = await mountApp('vendorDpa');

beforeEach(() => { created.length = 0; saved.length = 0; auditLogRequired.mockClear().mockResolvedValue(undefined); });

describe('vendor DPA register', () => {
  it('limits reading to privacy and security roles', async () => {
    await as({ id: 'user-a', role: 'analyst' }).get('/').expect(403);
    await as({ id: 'user-b', role: 'dpo' }).get('/').expect(200);
  });

  it('allows DPO creation and audits the record without vendor payload data', async () => {
    await as({ id: '660000000000000000000022', role: 'dpo' }).post('/').send({
      vendorName: 'Cloud Storage Ltd', serviceDescription: 'Stores encrypted patient uploaded files',
      dataCategories: ['patient identifiers'], dpaStatus: 'in_review',
    }).expect(201);
    expect(created).toHaveLength(1);
    expect(auditLogRequired).toHaveBeenCalledWith('vendor_dpa_created', '660000000000000000000022', expect.objectContaining({ dpaStatus: 'in_review' }));
    expect(JSON.stringify(auditLogRequired.mock.calls)).not.toContain('patient identifiers');
  });

  it('denies security-only writes and supports audited DPO status updates', async () => {
    await as({ id: 'user-c', role: 'security_admin' }).post('/').send({}).expect(403);
    await as({ id: '660000000000000000000023', role: 'dpo' }).patch('/660000000000000000000021').send({ dpaStatus: 'signed' }).expect(200);
    expect(saved).toEqual(['signed']);
    expect(auditLogRequired).toHaveBeenCalledWith('vendor_dpa_updated', '660000000000000000000023', expect.objectContaining({ dpaStatus: 'signed' }));
  });
});
