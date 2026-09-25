/**
 * Spec 20 runbook Step 2 — initialize the single-node MongoDB replica set
 * (required for multi-document ACID transactions + change streams).
 * Usage: docker exec -it findmedi-mongo1 mongosh --eval "..."  (see below)
 *    OR: node backend/scripts/mongo-init-rs.js  (needs MONGO_URI, direct connection)
 *
 * Compose equivalent:
 *   docker exec -it findmedi-mongo1 mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'mongo1:27017'}]})"
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/findmedi?directConnection=true';
await mongoose.connect(uri);

try {
  const admin = mongoose.connection.db.admin();
  const status = await admin.replSetGetStatus().catch(() => null);
  if (status?.ok === 1) {
    console.log('Replica set already initialized:', status.set);
  } else {
    const res = await admin.command({
      replSetInitiate: { _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] },
    });
    console.log('Replica set initiate result:', res.ok === 1 ? 'OK' : res);
  }
  // Smoke-test a multi-document transaction (proves outbox atomicity works here).
  const session = await mongoose.startSession();
  let txnOk = false;
  try {
    await session.withTransaction(async () => {
      await mongoose.connection.db.collection('__txn_probe__').insertOne({ at: new Date() }, { session });
    });
    txnOk = true;
  } finally {
    await session.endSession();
  }
  console.log('Transaction smoke test:', txnOk ? 'PASS' : 'FAIL');
} finally {
  await mongoose.disconnect();
}
