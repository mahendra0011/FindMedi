import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { remapSubSpecialtyCodes } from '../src/lib/taxonomy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Atlas SRV queries ka DNS kuch networks par UDP53 refuse karta hai
// (ECONNREFUSED). Public DNS par retry karte hain taaki connect ho sake.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/findmedi';

// Idempotent doctor migration for the Browse-by-Specialties de-dup: legacy
// duplicate codes (SPEC.PAED.NEONATO, SPEC.PSURG.*, ...) in
// Doctor.subSpecialtyCodes / specialtyCode get remapped to their canonical
// codes and de-duplicated. Unknown codes are left as-is so nothing is silently
// invented; re-running changes nothing further.
async function migrateDoctorSubSpecialties() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db;
  const doctors = db.collection('doctors');

  const cursor = doctors
    .find({ subSpecialtyCodes: { $exists: true, $ne: [] } })
    .project({ _id: 1, subSpecialtyCodes: 1, specialtyCode: 1 });

  let touched = 0;
  let remappedLists = 0;
  let specialtyFixes = 0;

  for await (const doc of cursor) {
    const original = Array.isArray(doc.subSpecialtyCodes) ? [...doc.subSpecialtyCodes] : [];
    const cleaned = remapSubSpecialtyCodes(original);
    const changed = JSON.stringify(original) !== JSON.stringify(cleaned);
    if (!changed) continue;

    const set = { subSpecialtyCodes: cleaned };
    if (typeof doc.specialtyCode === 'string' && doc.specialtyCode) {
      const own = remapSubSpecialtyCodes([doc.specialtyCode]).find(Boolean) || '';
      if (own && own !== doc.specialtyCode) {
        set.specialtyCode = own;
        specialtyFixes += 1;
      }
    }

    await doctors.updateOne({ _id: doc._id }, { $set: set });
    touched += 1;
    remappedLists += 1;
  }

  console.log(
    `done. doctors touched: ${touched}, sub lists rewritten: ${remappedLists}, specialtyCode fixes: ${specialtyFixes}`,
  );
  await mongoose.disconnect();
}

migrateDoctorSubSpecialties().catch(async (err) => {
  console.error('migrate-doctor-subspecialties failed:', err.message);
  try { await mongoose.disconnect(); } catch { /* already closed */ }
  process.exitCode = 1;
});
