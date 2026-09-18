import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

let MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/findmedi';

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  const Hospital = (await import('../src/models/Hospital.js')).default;

  // 1. Create default hospital
  let defaultHospital = await Hospital.findOne({ name: 'FindMedi Demo Hospital' });
  if (!defaultHospital) {
    defaultHospital = await Hospital.create({
      name: 'FindMedi Demo Hospital',
      slug: 'findmedi-demo-hospital',
      email: 'hospital@findmedi.com',
      phone: '+1-800-FINDMEDI',
      address: '123 Healthcare Avenue, Medical District',
      city: 'New York',
      state: 'NY',
      licenseNumber: 'LIC-FM-2024-001',
      description: 'FindMedi multi-specialty hospital providing comprehensive healthcare services.',
      specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Emergency'],
      status: 'approved',
    });
    console.log('Created default hospital:', defaultHospital._id);
  } else {
    console.log('Default hospital already exists:', defaultHospital._id);
  }

  const defaultHospitalId = defaultHospital._id;

  // 2. Update all hospital-scoped models
  const models = [
    { name: 'Doctor', file: '../src/models/Doctor.js' },
    { name: 'Department', file: '../src/models/Department.js' },
    { name: 'Appointment', file: '../src/models/Appointment.js' },
    { name: 'Billing', file: '../src/models/Billing.js' },
    { name: 'Record', file: '../src/models/Record.js' },
    { name: 'Staff', file: '../src/models/Staff.js' },
    { name: 'LabOrder', file: '../src/models/LabOrder.js' },
    { name: 'Medicine', file: '../src/models/Medicine.js' },
    { name: 'Bed', file: '../src/models/Bed.js' },
    { name: 'Admission', file: '../src/models/Admission.js' },
    { name: 'OperationTheatre', file: '../src/models/OperationTheatre.js' },
    { name: 'Physiotherapy', file: '../src/models/Physiotherapy.js' },
    { name: 'DietOrder', file: '../src/models/DietOrder.js' },
    { name: 'NursingChart', file: '../src/models/NursingChart.js' },
    { name: 'Triage', file: '../src/models/Triage.js' },
    { name: 'Housekeeping', file: '../src/models/Housekeeping.js' },
    { name: 'Inventory', file: '../src/models/Inventory.js' },
    { name: 'Insurance', file: '../src/models/Insurance.js' },
    { name: 'Radiology', file: '../src/models/Radiology.js' },
    { name: 'PurchaseOrder', file: '../src/models/PurchaseOrder.js' },
    { name: 'Supplier', file: '../src/models/Supplier.js' },
    { name: 'MentalHealth', file: '../src/models/MentalHealth.js' },
    { name: 'Emergency', file: '../src/models/Emergency.js' },
    { name: 'Prescription', file: '../src/models/Prescription.js' },
    { name: 'Token', file: '../src/models/Token.js' },
    { name: 'Review', file: '../src/models/Review.js' },
    { name: 'Payment', file: '../src/models/Payment.js' },
  ];

  for (const { name, file } of models) {
    try {
      const Model = (await import(file)).default;
      const result = await Model.updateMany(
        { $or: [{ hospitalId: { $exists: false } }, { hospitalId: null }] },
        { $set: { hospitalId: defaultHospitalId } }
      );
      if (result.modifiedCount > 0) {
        console.log(`Updated ${result.modifiedCount} documents in ${name}`);
      }
    } catch (err) {
      console.log(`Skipping ${name}: ${err.message}`);
    }
  }

  // 3. Update BloodBank models separately
  try {
    const { BloodUnit, BloodRequest } = await import('../src/models/BloodBank.js');
    let r = await BloodUnit.updateMany(
      { $or: [{ hospitalId: { $exists: false } }, { hospitalId: null }] },
      { $set: { hospitalId: defaultHospitalId } }
    );
    if (r.modifiedCount > 0) console.log(`Updated ${r.modifiedCount} documents in BloodUnit`);
    r = await BloodRequest.updateMany(
      { $or: [{ hospitalId: { $exists: false } }, { hospitalId: null }] },
      { $set: { hospitalId: defaultHospitalId } }
    );
    if (r.modifiedCount > 0) console.log(`Updated ${r.modifiedCount} documents in BloodRequest`);
  } catch (err) {
    console.log('Skipping BloodBank:', err.message);
  }

  // 4. Update existing admin users with default hospitalId
  try {
    const User = (await import('../src/models/User.js')).default;
    const result = await User.updateMany(
      { role: 'hospital_admin', $or: [{ hospitalId: { $exists: false } }, { hospitalId: null }] },
      { $set: { hospitalId: defaultHospitalId } }
    );
    if (result.modifiedCount > 0) {
      console.log(`Updated ${result.modifiedCount} admin users with default hospitalId`);
    }
  } catch (err) {
    console.log('Skipping User update:', err.message);
  }

  // 5. Verify
  console.log('\n--- Verification ---');
  for (const { name, file } of models) {
    try {
      const Model = (await import(file)).default;
      const withoutHospital = await Model.countDocuments({
        $or: [{ hospitalId: { $exists: false } }, { hospitalId: null }],
      });
      if (withoutHospital > 0) {
        console.log(`WARNING: ${withoutHospital} ${name} records still missing hospitalId`);
      } else {
        const total = await Model.countDocuments();
        console.log(`OK: ${name} - ${total} total, all have hospitalId`);
      }
    } catch (err) {
      console.log(`Skipping ${name} verification: ${err.message}`);
    }
  }

  console.log('\nMigration complete!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
