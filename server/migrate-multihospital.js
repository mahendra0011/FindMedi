import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

let MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medicore';

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  const Hospital = (await import('./models/Hospital.js')).default;

  // 1. Create default hospital
  let defaultHospital = await Hospital.findOne({ name: 'MediCore Demo Hospital' });
  if (!defaultHospital) {
    defaultHospital = await Hospital.create({
      name: 'MediCore Demo Hospital',
      slug: 'medicore-demo-hospital',
      email: 'hospital@medicore.com',
      phone: '+1-800-MEDICORE',
      address: '123 Healthcare Avenue, Medical District',
      city: 'New York',
      state: 'NY',
      licenseNumber: 'LIC-MC-2024-001',
      description: 'MediCore multi-specialty hospital providing comprehensive healthcare services.',
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
    { name: 'Doctor', file: './models/Doctor.js' },
    { name: 'Department', file: './models/Department.js' },
    { name: 'Appointment', file: './models/Appointment.js' },
    { name: 'Billing', file: './models/Billing.js' },
    { name: 'Record', file: './models/Record.js' },
    { name: 'Staff', file: './models/Staff.js' },
    { name: 'LabOrder', file: './models/LabOrder.js' },
    { name: 'Medicine', file: './models/Medicine.js' },
    { name: 'Bed', file: './models/Bed.js' },
    { name: 'Admission', file: './models/Admission.js' },
    { name: 'OperationTheatre', file: './models/OperationTheatre.js' },
    { name: 'Physiotherapy', file: './models/Physiotherapy.js' },
    { name: 'DietOrder', file: './models/DietOrder.js' },
    { name: 'NursingChart', file: './models/NursingChart.js' },
    { name: 'Triage', file: './models/Triage.js' },
    { name: 'Housekeeping', file: './models/Housekeeping.js' },
    { name: 'Inventory', file: './models/Inventory.js' },
    { name: 'Insurance', file: './models/Insurance.js' },
    { name: 'Radiology', file: './models/Radiology.js' },
    { name: 'PurchaseOrder', file: './models/PurchaseOrder.js' },
    { name: 'Supplier', file: './models/Supplier.js' },
    { name: 'MentalHealth', file: './models/MentalHealth.js' },
    { name: 'Emergency', file: './models/Emergency.js' },
    { name: 'Prescription', file: './models/Prescription.js' },
    { name: 'Token', file: './models/Token.js' },
    { name: 'Review', file: './models/Review.js' },
    { name: 'Payment', file: './models/Payment.js' },
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
    const { BloodUnit, BloodRequest } = await import('./models/BloodBank.js');
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
    const User = (await import('./models/User.js')).default;
    const result = await User.updateMany(
      { role: 'admin', $or: [{ hospitalId: { $exists: false } }, { hospitalId: null }] },
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
