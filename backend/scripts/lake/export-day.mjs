/**
 * Spec 16 (cold-path edition): nightly JSONL export of completed operational
 * records into data-lake/<YYYY-MM-DD>/. Parquet/Hudi conversion can consume
 * these files without touching MongoDB.
 * Usage: node backend/scripts/lake/export-day.mjs [YYYY-MM-DD]  (default: yesterday)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const dayArg = process.argv[2];
const day = dayArg || new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
const start = new Date(`${day}T00:00:00.000Z`);
const end = new Date(`${day}T23:59:59.999Z`);

const { default: RideBooking } = await import('../../src/models/RideBooking.js');
const { default: EmergencyDoctorRequest } = await import('../../src/models/EmergencyDoctorRequest.js');
const { default: DemoPayment } = await import('../../src/models/DemoPayment.js');
const { default: TransactionLedger } = await import('../../src/models/TransactionLedger.js');

await mongoose.connect(process.env.MONGO_URI);

const outDir = path.join(__dirname, '..', '..', '..', 'data-lake', day);
fs.mkdirSync(outDir, { recursive: true });

async function dump(name, Model, filter) {
  const docs = await Model.find({ ...filter, createdAt: { $gte: start, $lte: end } }).lean();
  const file = path.join(outDir, `${name}.jsonl`);
  fs.writeFileSync(file, docs.map((d) => JSON.stringify(d)).join('\n'));
  console.log(`${name}: ${docs.length} records -> ${file}`);
}

await dump('rides', RideBooking, { status: 'completed' });
await dump('emergency_doctor', EmergencyDoctorRequest, { status: { $in: ['completed', 'escalated_to_ambulance'] } });
await dump('payments', DemoPayment, {});
await dump('ledger', TransactionLedger, {});

await mongoose.disconnect();
console.log(`Lake export complete for ${day}`);
