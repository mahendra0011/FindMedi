import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Atlas SRV queries ka DNS kuch networks par UDP53 refuse karta hai
// (ECONNREFUSED). Public DNS par retry karte hain taaki connect ho sake.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medicore';

// Completed appointments jo token/queue flow se complete hue unme consultationEndTime
// set nahi hua tha. Is script me wo Token.completedAt se backfill hota hai.
async function backfillCompletionTime() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db;
  const appointments = db.collection('appointments');
  const tokens = db.collection('tokens');

  const missing = await appointments
    .find({ status: 'Completed', $or: [{ consultationEndTime: { $exists: false } }, { consultationEndTime: null }] })
    .toArray();

  console.log(`Found ${missing.length} completed appointments without consultationEndTime.`);

  let updated = 0;
  let noToken = 0;

  for (const apt of missing) {
    let completionTime = null;

    if (apt.consultationStartTime) {
      completionTime = apt.consultationStartTime;
    }

    if (!completionTime) {
      const token = await tokens
        .find({ appointmentId: apt._id, status: 'Completed' })
        .sort({ completedAt: -1 })
        .limit(1)
        .next();
      if (token?.completedAt) {
        completionTime = token.completedAt;
      }
    }

    if (!completionTime) {
      completionTime = apt.createdAt || new Date();
      noToken++;
    }

    await appointments.updateOne(
      { _id: apt._id },
      { $set: { consultationEndTime: completionTime } }
    );
    updated++;
  }

  console.log(`Updated ${updated} appointments.`);
  if (noToken) console.log(`  (${noToken} had no token — used createdAt as fallback)`);

  await mongoose.disconnect();
  console.log('Backfill complete.');
}

backfillCompletionTime().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
