import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import mongoose from 'mongoose';

const OLD_URI = 'mongodb+srv://mahendrapi0053_db_user:w546hI2x3pqv6AwU@cluster0.avvnhcg.mongodb.net/medicore?retryWrites=true&w=majority';
const NEW_URI = 'mongodb+srv://mahendrapra0077:3Bkvlwlj1aZqi8VP@cluster0.5l9k4vd.mongodb.net/medicore?retryWrites=true&w=majority';

const COLLECTIONS_TO_SKIP = ['system.views', 'system.keys', 'system.buckets'];

async function transfer() {
  // Connect to OLD database
  console.log('🔌 Connecting to OLD MongoDB...');
  const oldConn = await mongoose.createConnection(OLD_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 120000,
    family: 4,
  }).asPromise();
  console.log('✅ Connected to OLD');

  // Connect to NEW database
  console.log('🔌 Connecting to NEW MongoDB...');
  const newConn = await mongoose.createConnection(NEW_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 120000,
    family: 4,
  }).asPromise();
  console.log('✅ Connected to NEW');

  // Get all collection names from old DB
  const oldDb = oldConn.db;
  const collections = await oldDb.listCollections().toArray();
  const collectionNames = collections
    .map(c => c.name)
    .filter(name => !name.startsWith('system.') && !COLLECTIONS_TO_SKIP.includes(name));

  console.log(`\n📦 Found ${collectionNames.length} collections to transfer:\n`);

  let totalDocs = 0;

  for (const name of collectionNames) {
    const docs = await oldDb.collection(name).find({}).toArray();
    console.log(`  ${name.padEnd(30)} ${String(docs.length).padStart(5)} documents`);

    if (docs.length === 0) continue;

    // Drop existing collection in new DB & re-insert
    const newCol = newConn.db.collection(name);
    await newCol.deleteMany({});

    // Insert in batches of 500
    for (let i = 0; i < docs.length; i += 500) {
      const batch = docs.slice(i, i + 500);
      await newCol.insertMany(batch, { ordered: false });
    }

    totalDocs += docs.length;
  }

  // Rebuild indexes by fetching them from old and creating in new
  console.log('\n🔧 Transferring indexes...');
  for (const name of collectionNames) {
    const indexes = await oldDb.collection(name).indexes();
    const newCol = newConn.db.collection(name);
    for (const idx of indexes) {
      if (idx.name === '_id_') continue; // _id index is automatic
      try {
        await newCol.createIndex(idx.key, {
          unique: idx.unique || false,
          sparse: idx.sparse || false,
          name: idx.name,
          background: true,
        });
      } catch (e) {
        console.log(`  ⚠️  Index ${idx.name} on ${name}: ${e.message}`);
      }
    }
  }

  console.log(`\n✅ Transfer complete! ${totalDocs} total documents moved.`);

  await oldConn.close();
  await newConn.close();
}

transfer().catch(err => {
  console.error('❌ Transfer failed:', err);
  process.exit(1);
});
