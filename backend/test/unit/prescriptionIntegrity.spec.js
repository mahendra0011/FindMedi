import { createHash } from 'node:crypto';
import { jest } from '@jest/globals';

const prescriptionFindOne = jest.fn();
const userFindById = jest.fn();
jest.unstable_mockModule('../../src/models/Prescription.js', () => ({
  default: {
    findOne: (...args) => prescriptionFindOne(...args),
    db: { model: () => ({ findById: (...args) => userFindById(...args) }) },
  },
}));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const {
  canonicalise,
  issueToken,
  parseToken,
  sealPrescription,
  verifyIntegrity,
  verifyToken,
} = await import('../../src/services/prescriptionIntegrity.js');

const makePrescription = () => ({
  prescriptionId: 'RX_TEST_1',
  patientId: 'patient-1',
  doctorId: 'doctor-1',
  createdAt: new Date('2026-01-02T03:04:05.000Z'),
  status: 'Active',
  medicines: [{ name: 'Medicine A', dosage: '1 tablet', frequency: 'daily', duration: '5 days' }],
  diagnosis: 'private diagnosis',
});

beforeEach(() => {
  process.env.PRESCRIPTION_SIGNING_SECRET = 'unit-test-prescription-key';
  prescriptionFindOne.mockReset();
  userFindById.mockReset();
});

describe('tamper-evident pharmacy prescription tokens', () => {
  it('canonicalizes the same clinical content identically', () => {
    const p = makePrescription();
    expect(canonicalise(p)).toBe(canonicalise({ ...p }));
  });

  it('seals content and detects medicine or diagnosis edits', () => {
    const p = makePrescription();
    expect(sealPrescription(p)).toMatchObject({ algorithm: 'HMAC-SHA256' });
    expect(verifyIntegrity(p).valid).toBe(true);
    p.medicines[0].dosage = '2 tablets';
    expect(verifyIntegrity(p)).toMatchObject({ valid: false, reason: 'content-changed' });
  });

  it('issues a token tied to the prescription ID and stored nonce hash', async () => {
    const p = makePrescription();
    const issued = issueToken(p, { nonce: 'a'.repeat(32) });
    sealPrescription(p, { nonce: issued.nonce });
    p.integrity.nonceHash = createHash('sha256').update(issued.nonce).digest('hex');
    expect(parseToken(issued.token)).toMatchObject({ prescriptionId: p.prescriptionId, nonce: issued.nonce });
    await expect(verifyToken(issued.token.replace(p.prescriptionId, 'other-id')))
      .resolves.toMatchObject({ valid: false, reason: 'bad-token-signature' });
  });

  it('returns only non-identifying facts for a valid token', async () => {
    const p = makePrescription();
    const issued = issueToken(p, { nonce: 'b'.repeat(32) });
    sealPrescription(p, { nonce: issued.nonce });
    p.integrity.nonceHash = createHash('sha256').update(issued.nonce).digest('hex');
    prescriptionFindOne.mockReturnValue({ select: () => ({ lean: async () => p }) });
    userFindById.mockReturnValue({ select: () => ({ lean: async () => ({ role: 'doctor', status: 'active' }) }) });

    const result = await verifyToken(issued.token);
    expect(result).toMatchObject({ valid: true, medicineCount: 1, prescriberActive: true, prescriberRoleIsClinical: true });
    expect(JSON.stringify(result)).not.toContain('private diagnosis');
    expect(JSON.stringify(result)).not.toContain('Medicine A');
  });

  it('rejects forged signatures before querying the database', async () => {
    const p = makePrescription();
    const issued = issueToken(p, { nonce: 'c'.repeat(32) });
    const forged = `${issued.token.slice(0, -1)}${issued.token.endsWith('0') ? '1' : '0'}`;
    await expect(verifyToken(forged)).resolves.toMatchObject({ valid: false, reason: 'bad-token-signature' });
    expect(prescriptionFindOne).not.toHaveBeenCalled();
  });
});
