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
});
