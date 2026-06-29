import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { configureMongoDns } from './config/mongoDns.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
configureMongoDns();

const DATABASE_NAME = 'medicore';

const buildMongoUri = () => {
  let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/medicore';

  try {
    const url = new URL(mongoUri);
    if (!url.pathname || url.pathname === '/') {
      url.pathname = `/${DATABASE_NAME}`;
      mongoUri = url.toString();
    }
  } catch {
    console.warn('Could not parse MONGO_URI, using it as provided.');
  }

  return mongoUri;
};

const main = async () => {
  const mongoUri = buildMongoUri();
  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    family: 4,
    bufferCommands: false,
  });

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map(c => c.name);

  console.log('Collections in medicore database:');
  if (collectionNames.length === 0) {
    console.log('No collections found.');
    process.exit(1);
  }

  let totalDocs = 0;
  for (const name of collectionNames) {
    const count = await db.collection(name).estimatedDocumentCount();
    console.log(`  ${name}: ${count} documents`);
    totalDocs += count;
  }

  console.log(`\nTotal documents across all collections: ${totalDocs}`);

  if (totalDocs === 0) {
    console.log('WARNING: No data found in any collection!');
  } else {
    console.log('SUCCESS: Data is present in the database.');
  }

  await mongoose.disconnect();
};

main()
  .catch(error => {
    console.error('Verification failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });