import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import mongoose from 'mongoose';
import { configureMongoDns } from './src/config/mongoDns.js';
import User from './src/models/User.js';
import Hospital from './src/models/Hospital.js';
import Ambulance from './src/models/Ambulance.js';

configureMongoDns();

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/findmedi';

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  console.log('DB connected');

  let hospital = await Hospital.findOne({ slug: 'demo-city-hospital-jabalpur' });
  if (!hospital) {
    hospital = await Hospital.create({
      name: 'Demo City Hospital',
      slug: 'demo-city-hospital-jabalpur',
      email: 'demo-hospital@findmedi.com',
      phone: '9876543200',
      address: 'Civil Lines, Jabalpur, MP',
      city: 'Jabalpur',
      state: 'Madhya Pradesh',
      pincode: '482001',
      licenseNumber: 'DEMO-HOSP-001',
      status: 'approved',
      emergencySupport: true,
      emergency24x7: true,
      ambulanceService: true,
      location: { type: 'Point', coordinates: [79.9864, 23.1815] },
    });
    console.log('CREATED hospital: Demo City Hospital');
  } else {
    console.log('FOUND hospital: Demo City Hospital');
  }

  let user = await User.findOne({ email: 'ambulance@findmedi.com' }).select('+password');
  if (!user) {
    user = new User({
      name: 'Ramesh Driver',
      email: 'ambulance@findmedi.com',
      password: 'password',
      role: 'ambulance',
      phone: '9876543299',
      hospitalId: hospital._id,
      isVerified: true,
      status: 'active',
      approvalStatus: 'approved',
    });
    await user.save();
    console.log('CREATED user: ambulance@findmedi.com');
  } else {
    user.password = 'password';
    user.role = 'ambulance';
    user.isVerified = true;
    user.status = 'active';
    user.approvalStatus = 'approved';
    if (!user.hospitalId) user.hospitalId = hospital._id;
    await user.save();
    console.log('RESET user password: ambulance@findmedi.com');
  }

  const check = await User.findOne({ email: 'ambulance@findmedi.com' }).select('+password');
  const ok = await check.comparePassword('password');
  console.log('PASSWORD CHECK:', ok ? 'OK' : 'FAILED');
  console.log('ROLE:', check.role, '| STATUS:', check.status, '| VERIFIED:', check.isVerified);

  let amb = await Ambulance.findOne({ registrationNumber: 'MP20AB1234' });
  if (!amb) {
    await Ambulance.create({
      hospitalId: hospital._id,
      registrationNumber: 'MP20AB1234',
      vehicleModel: 'Force Traveller',
      ambulanceType: 'BLS',
      equipmentLevel: 'Oxygen, Stretcher',
      userId: check._id,
      driverName: 'Ramesh Driver',
      driverPhone: '9876543299',
      loginEmail: 'ambulance@findmedi.com',
      loginStatus: 'active',
      emergencySupport: true,
    });
    console.log('CREATED ambulance: MP20AB1234');
  } else {
    amb.userId = check._id;
    amb.loginStatus = 'active';
    await amb.save();
    console.log('LINKED ambulance: MP20AB1234');
  }

  console.log('DONE — login: ambulance@findmedi.com / password (role: Ambulance Driver)');
} catch (e) {
  console.error('SEED FAILED:', e.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
  process.exit(process.exitCode || 0);
}
