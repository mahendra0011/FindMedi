import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { remapSubSpecialtyCode, remapSubSpecialtyCodes } from '../src/lib/taxonomy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dns.setServers(['8.8.8.8', '1.1.1.1']);

// Dry-run is the default. Explicit --apply is required before any persisted
// doctor row changes; this makes a mistaken invocation read-only.
const apply = process.argv.includes('--apply');
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/findmedi';

function safeTarget(uri) {
  try {
    const parsed = new URL(uri);
    return `${parsed.hostname}/${parsed.pathname.replace(/^\//, '').split('?')[0] || '(default database)'}`;
  } catch { return '(unparseable MongoDB target)'; }
}

async function migrateDoctorSubSpecialties() {
  await mongoose.connect(mongoUri);
  console.log(`Connected to ${safeTarget(mongoUri)} (${apply ? 'APPLY' : 'DRY RUN'}).`);

  const doctors = mongoose.connection.db.collection('doctors');
  const cursor = doctors.find({
    $or: [
      { subSpecialtyCodes: { $exists: true, $ne: [] } },
      { specialtyCode: { $exists: true, $type: 'string', $ne: '' } },
    ],
  }).project({ _id: 1, subSpecialtyCodes: 1, specialtyCode: 1 });

  let scanned = 0;
  let wouldChange = 0;
  let listsChanged = 0;
  let specialtiesChanged = 0;
  for await (const doc of cursor) {
    scanned += 1;
    const original = Array.isArray(doc.subSpecialtyCodes) ? doc.subSpecialtyCodes : [];
    const cleaned = remapSubSpecialtyCodes(original);
    const set = {};
    if (JSON.stringify(original) !== JSON.stringify(cleaned)) {
      set.subSpecialtyCodes = cleaned;
      listsChanged += 1;
    }

    const canonicalSpecialty = remapSubSpecialtyCode(doc.specialtyCode || '');
    if (canonicalSpecialty && canonicalSpecialty !== doc.specialtyCode) {
      set.specialtyCode = canonicalSpecialty;
      specialtiesChanged += 1;
    }

    if (!Object.keys(set).length) continue;
    wouldChange += 1;
    if (apply) await doctors.updateOne({ _id: doc._id }, { $set: set });
  }

  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', scanned, doctorsChanged: wouldChange, listsChanged, specialtiesChanged }, null, 2));
  if (!apply && wouldChange) console.log('No rows were changed. Re-run with --apply only after reviewing the target and counts.');
  await mongoose.disconnect();
}

migrateDoctorSubSpecialties().catch(async (err) => {
  console.error('migrate-doctor-subspecialties failed:', err.message);
  try { await mongoose.disconnect(); } catch { /* already closed */ }
  process.exitCode = 1;
});
