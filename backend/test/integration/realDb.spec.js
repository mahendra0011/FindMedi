import { beforeAll, afterAll, describe, expect, it } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// SITE-TESTS 1.11: the harness stubs models, which can't see schema mechanics.
// Against a real (in-memory) Mongo we assert the behaviors that only exist
// inside Mongoose + the storage engine: field-encryption at rest, pre-save
// hooks, TTL index wiring, and subdocument validation.

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('findmedi-real'));
}, 240_000);

afterAll(async () => {
  if (mongoose.connection.readyState) await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('SITE-TESTS 1.11: real-DB schema mechanics', () => {
  it('encrypts MentalHealth narrative fields at rest and decrypts on read', async () => {
    process.env.FIELD_ENCRYPTION_KEY = 'c'.repeat(64);
    const { default: MentalHealth } = await import('../../src/models/MentalHealth.js');

    const doc = await MentalHealth.create({
      referralId: `MH-${Date.now()}`,
      patientId: new mongoose.Types.ObjectId(),
      patientName: 'Test Patient',
      clinicianId: new mongoose.Types.ObjectId(),
      assessment: { personalHistory: 'Secret narrative — must not sit in plaintext.' },
    });

    const raw = await mongoose.connection.collection('mentalhealths')
      .findOne({ _id: doc._id });
    expect(raw.assessment.personalHistory).not.toContain('Secret narrative');

    const read = await MentalHealth.findById(doc._id);
    expect(read.assessment.personalHistory).toContain('Secret narrative');
  });

  it('stamps slaDueAt via the ModerationItem pre-save hook when absent', async () => {
    const { default: ModerationItem } = await import('../../src/models/ModerationItem.js');

    const item = await ModerationItem.create({
      targetType: 'review',
      targetId: new mongoose.Types.ObjectId().toString(),
      category: 'spam',
      severity: 'medium',
    });
    expect(item.slaDueAt).toBeInstanceOf(Date);
  });

  it('gives AnalyticsEvent a TTL index inside the retention window', async () => {
    const { default: AnalyticsEvent } = await import('../../src/models/AnalyticsEvent.js');

    await AnalyticsEvent.create({ name: 'search', event_id: 'ev-1', ts: new Date(), props: { q: 'x' } });
    await AnalyticsEvent.init(); // wait for background index builds
    const indexes = await mongoose.connection.collection('analyticsevents').indexes();
    const ttl = indexes.find((i) => i.key && i.key.ts === 1);
    expect(ttl).toBeTruthy();
    expect(ttl.expireAfterSeconds).toBeGreaterThan(360 * 24 * 3600);
    expect(ttl.expireAfterSeconds).toBeLessThan(14 * 31 * 24 * 3600);
  });

  it('enforces the unique referralId on MentalHealth (real duplicate-key error)', async () => {
    const { default: MentalHealth } = await import('../../src/models/MentalHealth.js');

    const patientId = new mongoose.Types.ObjectId();
    await MentalHealth.create({
      referralId: 'MH-DUP-001',
      patientId,
      patientName: 'Dup One',
    });
    await expect(MentalHealth.create({
      referralId: 'MH-DUP-001',
      patientId,
      patientName: 'Dup Two',
    })).rejects.toMatchObject({ code: 11000 });
  });

  // SITE-SEC 1.7: banking + KYC identifiers must not sit in plaintext at rest.
  it('encrypts BankAccount number/IFSC at rest and dedupes via blind index', async () => {
    const { default: BankAccount } = await import('../../src/models/BankAccount.js');
    const phi = await import('../../src/utils/phiFields.js');
    const hospitalId = new mongoose.Types.ObjectId();
    await BankAccount.init();

    const acct = await BankAccount.create({
      hospitalId,
      bankName: 'HDFC',
      accountNo: '123456789012',
      ifsc: 'HDFC0001234',
      accountNoHash: phi.phiBlindIndex('123456789012'),
    });

    const raw = await mongoose.connection.collection('bankaccounts').findOne({ _id: acct._id });
    expect(raw.accountNo).not.toContain('123456789012');
    expect(raw.ifsc).not.toContain('HDFC0001234');
    expect(phi.revealPhi('BankAccount', 'accountNo', raw.accountNo)).toBe('123456789012');

    const read = await BankAccount.findById(acct._id);
    expect(read.accountNo).toBe('123456789012');
    expect(read.ifsc).toBe('HDFC0001234');

    await expect(BankAccount.create({
      hospitalId,
      bankName: 'HDFC',
      accountNo: '123456789012',
      accountNoHash: phi.phiBlindIndex('123456789012'),
    })).rejects.toMatchObject({ code: 11000 });
  });

  it('encrypts Supplier PAN/bank/KYC doc numbers at rest and decrypts on read', async () => {
    const { default: Supplier } = await import('../../src/models/Supplier.js');

    const supplier = await Supplier.create({
      supplierId: `SUP-${Date.now()}`,
      name: 'Acme Medicals',
      phone: '9999999999',
      pan: 'ABCDE1234F',
      bankAccount: '555566667777',
      ifsc: 'HDFC0001234',
      kycDocs: [{ docType: 'PAN', docNumber: 'ABCDE1234F' }],
    });

    const raw = await mongoose.connection.collection('suppliers').findOne({ _id: supplier._id });
    expect(raw.pan).not.toBe('ABCDE1234F');
    expect(raw.bankAccount).not.toBe('555566667777');
    expect(raw.ifsc).not.toBe('HDFC0001234');
    expect(raw.kycDocs[0].docNumber).not.toBe('ABCDE1234F');

    const read = await Supplier.findById(supplier._id);
    expect(read.pan).toBe('ABCDE1234F');
    expect(read.bankAccount).toBe('555566667777');
    expect(read.ifsc).toBe('HDFC0001234');
    expect(read.kycDocs[0].docNumber).toBe('ABCDE1234F');
  });
});
