/**
 * Additive demo seed — enriches the existing local dev DB WITHOUT deleting
 * anything. Safe to run multiple times (skips records that already exist).
 * NODE_ENV must not be 'production'.
 * Usage: node scripts/seed/seed-demo-additive.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { configureMongoDns, connectMongooseWithRetry } from '../../src/config/mongoDns.js';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run with NODE_ENV=production.');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
configureMongoDns();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/findmedi';
const readJSON = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'mock-data', file), 'utf8'));

const results = {};
const stat = (k, v) => { results[k] = v; };

await connectMongooseWithRetry(mongoose, MONGO_URI);
const db = mongoose.connection.db;
const col = (name) => db.collection(name);

// ---------- hospitals ----------
const hospitalsData = readJSON('hospitals.json');
const hospitalsMap = {};
for (const h of hospitalsData) {
  const { _id, ...rest } = h;
  if (!rest.location || !rest.location.coordinates) rest.location = { type: 'Point', coordinates: [78.9629, 23.1815] };
  let found = await col('hospitals').findOne({ name: rest.name });
  if (!found) found = await col('hospitals').insertOne({ ...rest, createdAt: new Date() });
  hospitalsMap[_id] = found._id ?? found.insertedId;
  stat('hospitals', (stat('hospitals', 0), Object.keys(hospitalsMap).length));
}
console.log(`hospitals mapped: ${Object.keys(hospitalsMap).length}`);

// ---------- facilities ----------
const facilitiesData = readJSON('facilities.json');
const facilitiesMap = {};
for (const f of facilitiesData) {
  const { _id, ...rest } = f;
  if (!rest.location || !rest.location.coordinates) rest.location = { type: 'Point', coordinates: [78.9629, 23.1815] };
  let found = await col('facilities').findOne({ slug: rest.slug });
  if (!found) found = await col('facilities').insertOne({ ...rest, createdAt: new Date() });
  facilitiesMap[_id] = found._id ?? found.insertedId;
}
console.log(`facilities mapped: ${Object.keys(facilitiesMap).length}`);

// ---------- users (match by email, keep existing) ----------
const usersData = readJSON('users.json');
const usersMap = {};
let usersCreated = 0;
for (const u of usersData) {
  const { _id, password, hospitalId, facilityId, pharmacyId, ...rest } = u;
  const email = String(rest.email || '').toLowerCase();
  let found = await col('users').findOne({ email });
  const userObj = {
    ...rest,
    hospitalId: hospitalId && hospitalsMap[hospitalId] ? hospitalsMap[hospitalId] : undefined,
    facilityId: facilityId && facilitiesMap[facilityId] ? facilitiesMap[facilityId] : undefined,
    isVerified: true,
    status: 'active',
    approvalStatus: 'approved',
  };
  if (rest.facilityType) userObj.facilityType = rest.facilityType;
  if (pharmacyId && facilitiesMap[pharmacyId]) userObj.pharmacyId = facilitiesMap[pharmacyId];
  if (found) {
    usersMap[_id] = found._id;
  } else {
    const ins = await col('users').insertOne({ ...userObj, password, createdAt: new Date() });
    usersMap[_id] = ins.insertedId;
    usersCreated++;
  }
}
console.log(`users: ${usersData.length} mapped (${usersCreated} created, ${usersData.length - usersCreated} reused)`);

// ---------- doctors (match by email) ----------
const doctorsData = readJSON('doctors.json');
const doctorsMap = {};
let doctorsCreated = 0;
for (const d of doctorsData) {
  const { _id, user_id, hospitalId, facilityId, ...rest } = d;
  const email = String(rest.email || '').toLowerCase();
  let found = await col('doctors').findOne({ email });
  const doctorObj = { ...rest };
  if (user_id && usersMap[user_id]) doctorObj.user_id = String(usersMap[user_id]);
  if (hospitalId && hospitalsMap[hospitalId]) doctorObj.hospitalId = hospitalsMap[hospitalId];
  if (facilityId && facilitiesMap[facilityId]) doctorObj.facilityId = facilitiesMap[facilityId];
  if (found) {
    doctorsMap[_id] = found._id;
  } else {
    const ins = await col('doctors').insertOne({ ...doctorObj, createdAt: new Date() });
    doctorsMap[_id] = ins.insertedId;
    doctorsCreated++;
  }
}
console.log(`doctors: ${doctorsData.length} mapped (${doctorsCreated} created)`);

// ---------- clinic profiles (one per doctor) ----------
const clinicsData = readJSON('clinics.json');
let clinicsCreated = 0;
for (const c of clinicsData) {
  const { doctorId, ...rest } = c;
  const mappedDoctorId = doctorsMap[doctorId];
  if (mappedDoctorId && !(await col('clinicprofiles').findOne({ doctorId: mappedDoctorId }))) {
    await col('clinicprofiles').insertOne({ ...rest, doctorId: mappedDoctorId, createdAt: new Date() });
    clinicsCreated++;
  }
}
console.log(`clinic profiles: ${clinicsCreated} created`);

// ---------- patients (match by email) ----------
const doctorsList = await col('doctors').find({}).toArray();
const patientsData = readJSON('patients.json');
const patientsMap = {};
let patientsCreated = 0;
for (const p of patientsData) {
  const { _id, user_id, doctorId, hospitalId, facilityId, ...rest } = p;
  const email = String(rest.email || '').toLowerCase();
  let found = await col('patients').findOne({ email });
  const patientObj = { ...rest };
  if (user_id && usersMap[user_id]) patientObj.userId = usersMap[user_id];
  const matchedDoctor = doctorsList.find((d) => d.name === rest.doctor);
  if (matchedDoctor) patientObj.doctorId = matchedDoctor._id;
  else if (doctorId && doctorsMap[doctorId]) patientObj.doctorId = doctorsMap[doctorId];
  if (hospitalId && hospitalsMap[hospitalId]) patientObj.hospitalId = hospitalsMap[hospitalId];
  if (facilityId && facilitiesMap[facilityId]) patientObj.facilityId = facilitiesMap[facilityId];
  if (found) {
    patientsMap[_id] = found._id;
  } else {
    const ins = await col('patients').insertOne({ ...patientObj, createdAt: new Date() });
    patientsMap[_id] = ins.insertedId;
    patientsCreated++;
  }
}
console.log(`patients: ${patientsData.length} mapped (${patientsCreated} created)`);

// ---------- appointments ----------
const patientsList = await col('patients').find({}).toArray();
const appointmentsData = readJSON('appointments.json');
let appointmentsCreated = 0;
for (const a of appointmentsData) {
  const { patientId, doctorId, hospitalId, ...rest } = a;
  const apptObj = { ...rest };
  const pat = patientsList.find((p) => p.name === a.patient);
  if (pat) apptObj.patientId = pat._id;
  else if (patientId && patientsMap[patientId]) apptObj.patientId = patientsMap[patientId];
  const doc = doctorsList.find((d) => d.name === a.doctor);
  if (doc) apptObj.doctorId = doc._id;
  else if (doctorId && doctorsMap[doctorId]) apptObj.doctorId = doctorsMap[doctorId];
  if (hospitalId && hospitalsMap[hospitalId]) apptObj.hospitalId = hospitalsMap[hospitalId];
  const dup = await col('appointments').findOne({ patientId: apptObj.patientId, doctorId: apptObj.doctorId, date: apptObj.date, time: apptObj.time });
  if (!dup) {
    await col('appointments').insertOne({ ...apptObj, createdAt: new Date() });
    appointmentsCreated++;
  }
}
console.log(`appointments: ${appointmentsCreated} created`);

// ---------- reviews ----------
const doctorsAll = await col('doctors').find({}).toArray();
const reviewsData = readJSON('reviews.json');
let reviewsCreated = 0;
for (const r of reviewsData) {
  const { doctorId, hospitalId, ...rest } = r;
  const matchedDoc = doctorsAll.find((d) => d.name === rest.doctorName) || (doctorId && doctorsMap[doctorId] && { _id: doctorsMap[doctorId] });
  const reviewObj = { ...rest };
  if (matchedDoc) reviewObj.doctorId = matchedDoc._id;
  else continue;
  if (hospitalId && hospitalsMap[hospitalId]) reviewObj.hospitalId = hospitalsMap[hospitalId];
  const dup = await col('reviews').findOne({ doctorId: reviewObj.doctorId, patientName: rest.patientName, hospitalId: reviewObj.hospitalId, rating: rest.rating });
  if (!dup) {
    await col('reviews').insertOne({ ...reviewObj, createdAt: new Date() });
    reviewsCreated++;
  }
}
console.log(`reviews: ${reviewsCreated} created`);

// ---------- tests ----------
const testsData = readJSON('tests.json');
let testsCreated = 0;
for (const t of testsData) {
  const { hospitalId, ...rest } = t;
  const testObj = { ...rest };
  if (hospitalId && hospitalsMap[hospitalId]) testObj.hospitalId = hospitalsMap[hospitalId];
  const dup = await col('tests').findOne({ name: testObj.name, hospitalId: testObj.hospitalId });
  if (!dup) {
    await col('tests').insertOne({ ...testObj, createdAt: new Date() });
    testsCreated++;
  }
}
console.log(`tests: ${testsCreated} created`);

// ---------- medicines ----------
const medicinesData = readJSON('medicines.json');
let medicinesCreated = 0;
for (const m of medicinesData) {
  const { hospitalId, ...rest } = m;
  const medObj = { ...rest };
  if (hospitalId && hospitalsMap[hospitalId]) medObj.hospitalId = hospitalsMap[hospitalId];
  const dup = await col('medicines').findOne({ name: medObj.name, batchNumber: medObj.batchNumber });
  if (!dup) {
    await col('medicines').insertOne({ ...medObj, createdAt: new Date() });
    medicinesCreated++;
  }
}
console.log(`medicines: ${medicinesCreated} created`);

// ---------- beds ----------
const bedsData = readJSON('beds.json');
const patientsNow = await col('patients').find({}).toArray();
let bedsCreated = 0;
for (const b of bedsData) {
  const { hospitalId, currentPatientId, ...rest } = b;
  const bedObj = { ...rest };
  if (hospitalId && hospitalsMap[hospitalId]) bedObj.hospitalId = hospitalsMap[hospitalId];
  if (currentPatientId) {
    const resolved = patientsNow.find((p) => p.name === rest.currentPatientName)
      || (patientsMap[currentPatientId] && { _id: patientsMap[currentPatientId] });
    if (resolved) {
      bedObj.currentPatientId = resolved._id;
      bedObj.admissionId = new mongoose.Types.ObjectId();
    }
  }
  const dup = await col('beds').findOne({ bedNumber: bedObj.bedNumber, hospitalId: bedObj.hospitalId });
  if (!dup) {
    await col('beds').insertOne({ ...bedObj, createdAt: new Date() });
    bedsCreated++;
  }
}
console.log(`beds: ${bedsCreated} created`);

// ---------- departments ----------
const departmentsData = readJSON('departments.json');
let departmentsCreated = 0;
for (const d of departmentsData) {
  const { hospitalId, ...rest } = d;
  const deptObj = { ...rest };
  if (hospitalId && hospitalsMap[hospitalId]) deptObj.hospitalId = hospitalsMap[hospitalId];
  const dup = await col('departments').findOne({ name: deptObj.name, hospitalId: deptObj.hospitalId });
  if (!dup) {
    await col('departments').insertOne({ ...deptObj, createdAt: new Date() });
    departmentsCreated++;
  }
}
console.log(`departments: ${departmentsCreated} created`);

// ---------- staff ----------
const staffData = readJSON('staff.json');
let staffCreated = 0;
for (const s of staffData) {
  const { hospitalId, ...rest } = s;
  const staffObj = { ...rest };
  if (hospitalId && hospitalsMap[hospitalId]) staffObj.hospitalId = hospitalsMap[hospitalId];
  const dup = await col('staffs').findOne({ employeeId: staffObj.employeeId });
  if (!dup) {
    await col('staffs').insertOne({ ...staffObj, createdAt: new Date() });
    staffCreated++;
  }
}
console.log(`staff: ${staffCreated} created`);

// ---------- inventory ----------
const inventoryData = readJSON('inventory.json');
let inventoryCreated = 0;
for (const i of inventoryData) {
  const { hospitalId, ...rest } = i;
  const invObj = { ...rest };
  if (hospitalId && hospitalsMap[hospitalId]) invObj.hospitalId = hospitalsMap[hospitalId];
  const dup = await col('inventories').findOne({ itemCode: invObj.itemCode });
  if (!dup) {
    await col('inventories').insertOne({ ...invObj, createdAt: new Date() });
    inventoryCreated++;
  }
}
console.log(`inventory: ${inventoryCreated} created`);

// ---------- delivery partner (idempotent) ----------
const deliveryUserId = usersMap['delivery-user'];
const pharmacyFacility = facilitiesMap['medistore-pharmacy'] ?? null;
const existingDP = await col('deliverypartners').findOne({ email: 'delivery@findmedi.com' });
if (deliveryUserId && !existingDP) {
  await col('deliverypartners').insertOne({
    userId: deliveryUserId,
    name: 'Delivery Partner',
    phone: '9876543218',
    email: 'delivery@findmedi.com',
    gender: 'Male',
    address: 'MediStore Pharmacy, Vijay Nagar, Jabalpur',
    city: 'Jabalpur',
    pincode: '482003',
    vehicleType: 'bike',
    vehicleNumber: 'MP 04 AB 1234',
    aadharDoc: 'https://via.placeholder.com/150',
    panDoc: 'https://via.placeholder.com/150',
    status: 'approved',
    isOnline: true,
    isAvailable: true,
    assignedPharmacyId: pharmacyFacility,
    rating: 4.5,
    totalDeliveries: 127,
    createdAt: new Date(),
  });
  console.log('delivery partner created');
} else {
  console.log('delivery partner already present or skipped');
}

await mongoose.disconnect();
console.log('\n✅ Additive demo seed complete. Existing data preserved; only missing records added.');
process.exit(0);
