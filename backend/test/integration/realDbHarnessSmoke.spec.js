import { realDbSuite, connectRealDb, disconnectRealDb, cleanupCollections } from '../helpers/realDbHarness.js';

realDbSuite('real-db harness smoke', () => {
  beforeAll(async () => { await connectRealDb(); });
  afterAll(async () => { await disconnectRealDb(); });

  it('connects to a replica set and runs a trivial query', async () => {
    const mongoose = (await import('mongoose')).default;
    const coll = mongoose.connection.db.collection('harness_smoke');
    await coll.insertOne({ ok: true, t: Date.now() });
    const found = await coll.findOne({ ok: true });
    expect(found).toBeTruthy();
    await cleanupCollections(['harness_smoke']);
  });
});
