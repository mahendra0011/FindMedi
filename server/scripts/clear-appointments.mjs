import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Atlas SRV DNS fix (system DNS UDP53 refuse karta hai)
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medicore';

async function clearAppointments() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 30000, family: 4 });
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db;

  const aptResult = await db.collection('appointments').deleteMany({});
  console.log(`Deleted ${aptResult.deletedCount} appointments.`);

  const tokenResult = await db.collection('tokens').deleteMany({});
  console.log(`Deleted ${tokenResult.deletedCount} tokens (queue).`);

  const payResult = await db.collection('payments').deleteMany({ serviceType: 'appointment' });
  console.log(`Deleted ${payResult.deletedCount} appointment payments.`);

  await mongoose.disconnect();
  console.log('Done.');
}

clearAppointments().catch(err => {
  console.error('Clear failed:', err);
  process.exit(1);
});
