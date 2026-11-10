/**
 * Real-DB integration test harness (doc 18): wraps a Mongo replica-set URI
 * (MONGO_REPLICA_TEST_URI) with connect/disconnect + collection cleanup so
 * integration specs can run against a real database instead of MongoMemory.
 * Usage:
 *   const { connect, disconnect, cleanup } = await import('./helpers/realDbHarness.js');
 *   const suite = process.env.MONGO_REPLICA_TEST_URI ? describe : describe.skip;
 */
import mongoose from 'mongoose';

export async function connectRealDb() {
  const uri = process.env.MONGO_REPLICA_TEST_URI;
  if (!uri) throw new Error('MONGO_REPLICA_TEST_URI not set');
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  }
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName) throw new Error('MONGO_REPLICA_TEST_URI must point to a replica set');
  return mongoose;
}

export async function disconnectRealDb() {
  if (mongoose.connection.readyState) await mongoose.disconnect();
}

export async function cleanupCollections(names = []) {
  const db = mongoose.connection.db;
  if (!db) return;
  await Promise.all(names.map(async (n) => {
    try { await db.collection(n).deleteMany({}); } catch { /* ignore */ }
  }));
}

export const realDbSuite = (process.env.MONGO_REPLICA_TEST_URI ? describe : describe.skip);
