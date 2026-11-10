import { randomUUID } from 'node:crypto';
import { connectRealDb, disconnectRealDb } from '../helpers/realDbHarness.js';
import {
  pingClamAv,
  realServicesConfigured,
  requireRealServiceEnvironment,
  scanClamAvBuffer,
  withOpenSearchProbe,
  withRedisProbe,
} from '../helpers/realServicesHarness.js';

requireRealServiceEnvironment();

const suite = realServicesConfigured() ? describe : describe.skip;

suite('disposable real-services harness smoke', () => {
  beforeAll(async () => { await connectRealDb(); });
  afterAll(async () => { await disconnectRealDb(); });

  it('probes Mongo replica set, Redis, ClamAV, and OpenSearch with isolated data', async () => {
    const mongoose = (await import('mongoose')).default;
    const collection = mongoose.connection.db.collection('findmedi_harness_smoke');
    const probeId = randomUUID();
    try {
      const hello = await mongoose.connection.db.admin().command({ hello: 1 });
      expect(hello.setName).toBeTruthy();
      await collection.insertOne({ _id: probeId, status: 'ok' });
      expect((await collection.findOne({ _id: probeId }))?.status).toBe('ok');

      await withRedisProbe(async ({ pong, value }) => {
        expect(pong).toBe('PONG');
        expect(value).toBe('ok');
      });

      expect(await pingClamAv()).toMatch(/PONG/i);
      const cleanScan = await scanClamAvBuffer(Buffer.from('FindMedi disposable harness clean-file probe'));
      expect(cleanScan).toMatch(/OK$/);
      const eicar = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
      expect(await scanClamAvBuffer(eicar)).toMatch(/Eicar-Test-Signature FOUND/i);

      await withOpenSearchProbe(async ({ health, result }) => {
        expect(health.version?.number).toBeTruthy();
        expect(result._source?.probe).toBe('findmedi-harness-ok');
      });
    } finally {
      await collection.deleteOne({ _id: probeId });
    }
  }, 45_000);
});
