import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medicore';

async function migrateIndex() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db;
  const collection = db.collection('appointments');

  const indexes = await collection.indexes();
  console.log('\nCurrent indexes on appointments collection:');
  indexes.forEach(idx => console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}`));

  const oldIndexName = 'patientId_1_date_1_time_1';
  const oldIndex = indexes.find(idx => idx.name === oldIndexName);

  if (oldIndex) {
    console.log(`\nDropping old index "${oldIndexName}"...`);
    await collection.dropIndex(oldIndexName);
    console.log('Old index dropped successfully.');
  } else {
    console.log(`\nOld index "${oldIndexName}" not found — already removed.`);
  }

  const expectedIndex = indexes.find(idx => idx.name === 'patientId_1_doctorId_1_date_1_time_1');
  if (expectedIndex) {
    console.log('New index patientId_1_doctorId_1_date_1_time_1 already exists. Skipping creation.');
  } else {
    console.log('\nCreating new compound index doctorId_1_patientId_1_date_1_time_1...');
    await collection.createIndex(
      { doctorId: 1, patientId: 1, date: 1, time: 1 },
      { unique: true, partialFilterExpression: { status: { $in: ['Pending', 'Confirmed', 'In Queue', 'Serving'] }, doctorId: { $type: 'objectId' } } }
    );
    console.log('New index created successfully.');
  }

  const finalIndexes = await collection.indexes();
  console.log('\nFinal indexes on appointments collection:');
  finalIndexes.forEach(idx => console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}`));

  await mongoose.disconnect();
  console.log('\nMigration complete.');
}

migrateIndex().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
