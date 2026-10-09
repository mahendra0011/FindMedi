import mongoose from 'mongoose';

/**
 * File 13 §13.6: dry-run first migration for the Bed unique-index change.
 * BEFORE: bedNumber globally unique. AFTER: (hospitalId, bedNumber) unique.
 * Usage: `node backend/scripts/migrate-bed-unique.js [--apply]`.
 * Default is dry-run: prints collisions, touches nothing.
 */
const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
if (!uri) {
  console.error('Set MONGODB_URI first.');
  process.exit(1);
}
await mongoose.connect(uri);

const Bed = (await import('../src/models/Bed.js')).default;

const apply = process.argv.includes('--apply');

const dups = await Bed.aggregate([
  { $group: { _id: '$bedNumber', count: { $sum: 1 }, hospitals: { $addToSet: '$hospitalId' } } },
  { $match: { count: { $gt: 1 } } },
]);

const crossHospital = dups.filter((d) => d.hospitals.length > 1);
console.log(`bedNumber values shared across hospitals: ${crossHospital.length}`);
for (const d of crossHospital.slice(0, 20)) {
  console.log(`  ${d._id}: ${d.count} beds in ${d.hospitals.length} hospitals`);
}

if (!apply) {
  console.log('DRY-RUN complete. Re-run with --apply to rebuild the index.');
  console.log('NOTE: same-hospital duplicate bedNumbers must be renamed manually first.');
  process.exit(0);
}

try {
  await Bed.collection.dropIndex('bedNumber_1');
  console.log('Dropped legacy global bedNumber_1 index.');
} catch (err) {
  console.log(`Legacy index drop skipped: ${err.message}`);
}
await Bed.syncIndexes();
console.log('Compound (hospitalId, bedNumber) unique index ensured.');
process.exit(0);
