import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { configureMongoDns } from './config/mongoDns.js';

configureMongoDns();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medicore';

import Hospital from './models/Hospital.js';
import Facility from './models/Facility.js';
import User from './models/User.js';
import Doctor from './models/Doctor.js';
import Patient from './models/Patient.js';
import Appointment from './models/Appointment.js';
import Test from './models/Test.js';
import Medicine from './models/Medicine.js';
import Bed from './models/Bed.js';
import Department from './models/Department.js';
import Staff from './models/Staff.js';
import Inventory from './models/Inventory.js';
import ClinicProfile from './models/ClinicProfile.js';

const readJSON = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, 'mock-data', file), 'utf-8'));

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    const db = mongoose.connection.db;

    // ===== CLEAR EXISTING DATA =====
    console.log('Clearing existing data...');
    const collections = ['hospitals', 'facilities', 'users', 'doctors', 'clinicprofiles', 'patients', 'appointments', 'tests', 'medicines', 'beds', 'departments', 'staffs', 'inventories'];
    for (const col of collections) {
      try { await db.collection(col).deleteMany({}); } catch {}
    }
    console.log('Cleared.');

    // ===== SEED HOSPITALS =====
    console.log('Seeding hospitals...');
    const hospitalsData = readJSON('hospitals.json');
    const hospitalsMap = {};
    for (const h of hospitalsData) {
      const { _id, ...rest } = h;
      const inserted = await Hospital.create(rest);
      hospitalsMap[_id] = inserted._id;
    }
    console.log(`  ${hospitalsData.length} hospitals created.`);

    // ===== SEED FACILITIES =====
    console.log('Seeding facilities...');
    const facilitiesData = readJSON('facilities.json');
    const facilitiesMap = {};
    for (const f of facilitiesData) {
      const { _id, ...rest } = f;
      const inserted = await Facility.create(rest);
      facilitiesMap[_id] = inserted._id;
    }
    console.log(`  ${facilitiesData.length} facilities created.`);

    // ===== SEED USERS =====
    console.log('Seeding users...');
    const usersData = readJSON('users.json');
    const usersMap = {};
    for (const u of usersData) {
      const { _id, password, hospitalId, facilityId, ...rest } = u;
      const hashedPassword = await bcrypt.hash(password, 10);
      const userObj = {
        ...rest,
        password: hashedPassword,
        isVerified: true,
        status: 'active',
        approvalStatus: (rest.role === 'doctor' || rest.role === 'clinic_doctor') ? 'approved' : 'not_required',
      };
      if (hospitalId && hospitalsMap[hospitalId]) userObj.hospitalId = hospitalsMap[hospitalId];
      if (facilityId && facilitiesMap[facilityId]) {
        userObj.facilityId = facilitiesMap[facilityId];
        userObj.facilityType = rest.facilityType;
      }
      const inserted = await User.create(userObj);
      usersMap[_id] = inserted._id;
    }
    console.log(`  ${usersData.length} users created.`);

    // ===== SEED DOCTORS =====
    console.log('Seeding doctors...');
    const doctorsData = readJSON('doctors.json');
    const doctorsMap = {};
    for (const d of doctorsData) {
      const { _id, user_id, hospitalId, facilityId, ...rest } = d;
      const doctorObj = { ...rest };
      if (user_id && usersMap[user_id]) doctorObj.user_id = usersMap[user_id].toString();
      if (hospitalId && hospitalsMap[hospitalId]) doctorObj.hospitalId = hospitalsMap[hospitalId];
      if (facilityId && facilitiesMap[facilityId]) doctorObj.facilityId = facilitiesMap[facilityId];
      const inserted = await Doctor.create(doctorObj);
      doctorsMap[_id] = inserted._id;
    }
    console.log(`  ${doctorsData.length} doctors created.`);

    // ===== SEED CLINIC PROFILES =====
    console.log('Seeding clinic profiles...');
    const clinicsData = readJSON('clinics.json');
    for (const c of clinicsData) {
      const { doctorId, ...rest } = c;
      const mappedDoctorId = doctorsMap[doctorId];
      if (mappedDoctorId) {
        await ClinicProfile.create({ ...rest, doctorId: mappedDoctorId });
      }
    }
    console.log(`  ${clinicsData.length} clinic profiles created.`);

    // ===== SEED PATIENTS =====
    console.log('Seeding patients...');
    const doctorsList = await Doctor.find({}).lean();
    const patientsData = readJSON('patients.json');
    for (const p of patientsData) {
      const { _id, user_id, doctorId, hospitalId, facilityId, ...rest } = p;
      const patientObj = { ...rest };
      if (user_id && usersMap[user_id]) patientObj.userId = usersMap[user_id];
      const matchedDoctor = doctorsList.find(d => d.name === p.doctor);
      if (matchedDoctor) patientObj.doctorId = matchedDoctor._id;
      if (hospitalId && hospitalsMap[hospitalId]) patientObj.hospitalId = hospitalsMap[hospitalId];
      if (facilityId && facilitiesMap[facilityId]) patientObj.facilityId = facilitiesMap[facilityId];
      await Patient.create(patientObj);
    }
    console.log(`  ${patientsData.length} patients created.`);

    // ===== SEED APPOINTMENTS =====
    console.log('Seeding appointments...');
    const patientsList = await Patient.find({}).lean();
    const appointmentsData = readJSON('appointments.json');
    for (const a of appointmentsData) {
      const { patientId, doctorId, hospitalId, ...rest } = a;
      const apptObj = { ...rest };
      const pat = patientsList.find(p => p.name === a.patient);
      if (pat) apptObj.patientId = pat._id;
      const doc = doctorsList.find(d => d.name === a.doctor);
      if (doc) apptObj.doctorId = doc._id;
      if (hospitalId && hospitalsMap[hospitalId]) apptObj.hospitalId = hospitalsMap[hospitalId];
      await Appointment.create(apptObj);
    }
    console.log(`  ${appointmentsData.length} appointments created.`);

    // ===== SEED TESTS =====
    console.log('Seeding tests...');
    const testsData = readJSON('tests.json');
    for (const t of testsData) {
      const { hospitalId, ...rest } = t;
      const testObj = { ...rest };
      if (hospitalId && hospitalsMap[hospitalId]) testObj.hospitalId = hospitalsMap[hospitalId];
      await Test.create(testObj);
    }
    console.log(`  ${testsData.length} tests created.`);

    // ===== SEED MEDICINES =====
    console.log('Seeding medicines...');
    const medicinesData = readJSON('medicines.json');
    for (const m of medicinesData) {
      const { hospitalId, ...rest } = m;
      const medObj = { ...rest };
      if (hospitalId && hospitalsMap[hospitalId]) medObj.hospitalId = hospitalsMap[hospitalId];
      await Medicine.create(medObj);
    }
    console.log(`  ${medicinesData.length} medicines created.`);

    // ===== SEED BEDS =====
    console.log('Seeding beds...');
    const bedsData = readJSON('beds.json');
    const patientsList2 = await Patient.find({}).lean();
    for (const b of bedsData) {
      const { hospitalId, currentPatientId, ...rest } = b;
      const bedObj = { ...rest };
      if (hospitalId && hospitalsMap[hospitalId]) bedObj.hospitalId = hospitalsMap[hospitalId];
      if (currentPatientId) {
        const pat = patientsList2.find(p => p.name === b.currentPatientName);
        if (pat) {
          bedObj.currentPatientId = pat._id;
          bedObj.admissionId = new mongoose.Types.ObjectId();
        }
      }
      await Bed.create(bedObj);
    }
    console.log(`  ${bedsData.length} beds created.`);

    // ===== SEED DEPARTMENTS =====
    console.log('Seeding departments...');
    const departmentsData = readJSON('departments.json');
    for (const d of departmentsData) {
      const { hospitalId, ...rest } = d;
      const deptObj = { ...rest };
      if (hospitalId && hospitalsMap[hospitalId]) deptObj.hospitalId = hospitalsMap[hospitalId];
      await Department.create(deptObj);
    }
    console.log(`  ${departmentsData.length} departments created.`);

    // ===== SEED STAFF =====
    console.log('Seeding staff...');
    const staffData = readJSON('staff.json');
    for (const s of staffData) {
      const { hospitalId, ...rest } = s;
      const staffObj = { ...rest };
      if (hospitalId && hospitalsMap[hospitalId]) staffObj.hospitalId = hospitalsMap[hospitalId];
      await Staff.create(staffObj);
    }
    console.log(`  ${staffData.length} staff created.`);

    // ===== SEED INVENTORY =====
    console.log('Seeding inventory...');
    const inventoryData = readJSON('inventory.json');
    for (const i of inventoryData) {
      const { hospitalId, ...rest } = i;
      const invObj = { ...rest };
      if (hospitalId && hospitalsMap[hospitalId]) invObj.hospitalId = hospitalsMap[hospitalId];
      await Inventory.create(invObj);
    }
    console.log(`  ${inventoryData.length} inventory items created.`);

    console.log('\n✅ Seed complete! 13 sections seeded.');
    console.log('   hospitals, facilities, users, doctors, clinicprofiles, patients, appointments, tests, medicines, beds, departments, staff, inventory');
    console.log('\nDemo Accounts:');
    console.log('  superadmin → mahendrapra0077@gmail.com / admin@123');
    console.log('  admin      → admin@medicore.com / password');
    console.log('  hospital   → hospital@medicore.com / password');
    console.log('  doctor     → sarah.smith@medicore.com / password');
    console.log('  clinic     → clinic@medicore.com / password');
    console.log('  diagnostic → diagnostic@medicore.com / password');
    console.log('  pharmacy   → pharmacy@medicore.com / password');
    console.log('  patient    → patient@medicore.com / password');

  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed.');
    process.exit(0);
  }
}

seed();
