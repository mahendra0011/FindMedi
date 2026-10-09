/**
 * File 10 testing checklist: realistic demo hospital seed (idempotent).
 * Usage: node scripts/seed-demo-hospital.mjs
 * Creates: demo hospital, 12 beds (General/ICU/Private), consult + lab
 * ServicePrices, room tariffs, 2 insurers, central + pharmacy stores.
 * All rows keyed by demo markers — safe to re-run, never touches prod data
 * (guarded by DEMO_ email/domain).
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { default: Hospital } = await import('../src/models/Hospital.js');
const { default: Bed } = await import('../src/models/Bed.js');
const { default: ServicePrice } = await import('../src/models/ServicePrice.js');
const { default: RoomTariff } = await import('../src/models/RoomTariff.js');
const { default: Insurer } = await import('../src/models/Insurer.js');
const { default: Store } = await import('../src/models/Store.js');

await mongoose.connect(process.env.MONGO_URI);

const hosp = await Hospital.findOneAndUpdate(
  { email: 'demo-hospital@findmedi.test' },
  {
    name: 'Demo General Hospital', email: 'demo-hospital@findmedi.test',
    phone: '9876500002', address: 'Arera Colony, Bhopal', city: 'Bhopal', state: 'MP',
    licenseNumber: 'DEMO-HOSP-001', status: 'approved',
    slug: 'demo-general-hospital-bhopal',
  },
  { upsert: true, new: true, setDefaultsOnInsert: true },
);

const beds = [
  ...['G-01', 'G-02', 'G-03', 'G-04', 'G-05', 'G-06'].map((b) => ({ bedNumber: b, ward: 'General', type: 'General' })),
  ...['ICU-01', 'ICU-02'].map((b) => ({ bedNumber: b, ward: 'ICU', type: 'ICU' })),
  ...['P-01', 'P-02'].map((b) => ({ bedNumber: b, ward: 'Private', type: 'Private' })),
  { bedNumber: 'E-01', ward: 'Emergency', type: 'Emergency' },
  { bedNumber: 'N-01', ward: 'NICU', type: 'NICU' },
];
for (const b of beds) {
  await Bed.findOneAndUpdate(
    { bedNumber: b.bedNumber, hospitalId: hosp._id },
    { ...b, status: 'Available', hospitalId: hosp._id },
    { upsert: true },
  );
}

const prices = [
  { code: 'CONSULT-GP', name: 'General Physician Consult', category: 'consult', amount: 500 },
  { code: 'CONSULT-SPEC', name: 'Specialist Consult', category: 'consult', amount: 800 },
  { code: 'LAB-CBC', name: 'CBC', category: 'investigation', amount: 300 },
  { code: 'LAB-LFT', name: 'LFT', category: 'investigation', amount: 600 },
  { code: 'XRAY-CHEST', name: 'Chest X-Ray', category: 'investigation', amount: 500 },
  { code: 'DRESSING', name: 'Dressing', category: 'procedure', amount: 200 },
];
for (const p of prices) {
  await ServicePrice.findOneAndUpdate(
    { hospitalId: hosp._id, code: p.code },
    {
      hospitalId: hosp._id, code: p.code, name: p.name, category: p.category,
      prices: [{ payerClass: 'cash', amount: p.amount, from: new Date() }], active: true,
    },
    { upsert: true },
  );
}

const tariffs = [
  { roomType: 'General', bedPerDay: 1500, nursingPerDay: 500, rmoPerDay: 300, doctorVisitPerDay: 500 },
  { roomType: 'Private', bedPerDay: 4000, nursingPerDay: 1000, rmoPerDay: 500, doctorVisitPerDay: 1000 },
  { roomType: 'ICU', bedPerDay: 12000, nursingPerDay: 3000, rmoPerDay: 1500, doctorVisitPerDay: 2000 },
];
for (const t of tariffs) {
  await RoomTariff.findOneAndUpdate(
    { hospitalId: hosp._id, roomType: t.roomType, payerClass: 'cash' },
    { hospitalId: hosp._id, ...t, payerClass: 'cash', effectiveFrom: new Date() },
    { upsert: true },
  );
}

for (const name of ['Star Health (demo)', 'PM-JAY (demo)']) {
  await Insurer.findOneAndUpdate(
    { hospitalId: hosp._id, name },
    { hospitalId: hosp._id, name, type: name.includes('PM-JAY') ? 'Govt' : 'Insurer' },
    { upsert: true },
  );
}

for (const s of [{ name: 'Central Store', type: 'Central' }, { name: 'Pharmacy Store', type: 'Pharmacy' }]) {
  await Store.findOneAndUpdate(
    { hospitalId: hosp._id, name: s.name },
    { hospitalId: hosp._id, ...s },
    { upsert: true },
  );
}

console.log(`Demo hospital seeded: ${hosp.slug} (${beds.length} beds, ${prices.length} prices, ${tariffs.length} tariffs)`);
await mongoose.disconnect();
