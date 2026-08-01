import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medicore';

async function fixPaymentIndex() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 30000, family: 4 });
  const db = mongoose.connection.db;
  const payments = db.collection('payments');

  const indexes = await payments.indexes();
  const old = indexes.find(idx => idx.name === 'referenceId_1_status_1');

  if (old) {
    if (old.partialFilterExpression && JSON.stringify(old.partialFilterExpression).includes('$ne')) {
      console.log('Old index with $ne found — dropping so mongoose can recreate it with $gt:');
      await payments.dropIndex('referenceId_1_status_1');
      console.log('Dropped.');
    } else {
      console.log('Index exists with compatible spec — keeping it.');
      console.log(JSON.stringify(old));
    }
  } else {
    console.log('Index not present in DB — mongoose will create it on next startup.');
  }

  await mongoose.disconnect();
  console.log('Done.');
}

fixPaymentIndex().catch(err => { console.error('Failed:', err); process.exit(1); });
