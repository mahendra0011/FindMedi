/**
 * Doc 01 §10.1 — SOS demo seed around Bhopal [77.4126, 23.2599]
 * Usage: node scripts/seed-sos-demo.mjs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { default: Hospital } = await import('../src/models/Hospital.js');
const { default: Ambulance } = await import('../src/models/Ambulance.js');
const { default: User } = await import('../src/models/User.js');
const { default: Vehicle } = await import('../src/models/Vehicle.js');
const { default: RiderProfile } = await import('../src/models/RiderProfile.js');

const BHOPAL = [77.4126, 23.2599];
const kmToDeg = (km) => km / 111.32;
const offset = (lng, lat, dKmEast, dKmNorth) => [lng + kmToDeg(dKmEast), lat + kmToDeg(dKmNorth)];

await mongoose.connect(process.env.MONGO_URI);

const hosp = await Hospital.findOneAndUpdate(
  { email: 'sos-demo-hospital@findmedi.test' },
  {
    name: 'SOS Demo Hospital Bhopal', email: 'sos-demo-hospital@findmedi.test',
    phone: '9876500001', address: 'MP Nagar, Bhopal', city: 'Bhopal', state: 'MP',
    licenseNumber: 'SOS-DEMO-001', status: 'approved', emergencySupport: true,
    emergency24x7: true, ambulanceService: true,
    slug: 'sos-demo-hospital-bhopal',
    location: { type: 'Point', coordinates: BHOPAL },
  },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

const mkDriver = async (suffix, regNo, coords, extra = {}) => {
  const email = `sos-amb-${suffix}@findmedi.test`;
  await User.deleteOne({ email });
  await Ambulance.deleteOne({ registrationNumber: regNo });
  const user = await User.create({
    name: `SOS Driver ${suffix}`, email, password: 'Test@1234', role: 'ambulance',
    phone: `98765${String(suffix).padStart(5, '0')}`, hospitalId: hosp._id,
    isVerified: true, status: 'active', approvalStatus: 'approved',
  });
  await Ambulance.create({
    hospitalId: hosp._id, userId: user._id, registrationNumber: regNo,
    vehicleModel: 'Force Traveller', ambulanceType: 'BLS',
    driverName: user.name, driverPhone: user.phone, loginEmail: email, loginStatus: 'active',
    isOnline: true, isOnDuty: false, emergencySupport: true,
    currentLocation: { type: 'Point', coordinates: coords, updatedAt: new Date() },
    lastPingAt: new Date(), ...extra,
  });
  console.log(`ambulance ${regNo} @ ${coords}`);
};

await mkDriver(1, 'MP-04-SOS-001', offset(...BHOPAL, 1.2, 0));
await mkDriver(2, 'MP-04-SOS-002', offset(...BHOPAL, 3.8, 0));
await mkDriver(3, 'MP-04-SOS-003', offset(...BHOPAL, 8, 0));

const mkRider = async (suffix, vtype, dKm, bike = false) => {
  const email = `sos-rider-${suffix}@findmedi.test`;
  await User.deleteOne({ email });
  const user = await User.create({
    name: `SOS Rider ${suffix}`, email, password: 'Test@1234', role: 'rider',
    phone: `98888${String(suffix).padStart(5, '0')}`,
    isVerified: true, status: 'active', approvalStatus: 'approved',
  });
  const rc = `MP-04-SOS-R${String(suffix).padStart(3, '0')}`;
  await Vehicle.deleteOne({ rcNumber: rc });
  const vehicle = await Vehicle.create({
    riderId: user._id, type: bike ? 'bike' : vtype, brand: 'Demo', model: 'Demo',
    rcNumber: rc, insuranceNumber: 'INS-DEMO',
    insuranceExpiry: new Date(Date.now() + 365 * 864e5),
  });
  await RiderProfile.deleteOne({ userId: user._id });
  const coords = offset(...BHOPAL, dKm, 0);
  await RiderProfile.create({
    userId: user._id, vehicleId: vehicle._id, govtIdType: 'Aadhaar',
    govtIdNumber: `SOS${suffix}`, drivingLicenseNumber: `DL-SOS-${suffix}`,
    drivingLicenseExpiry: new Date(Date.now() + 365 * 864e5),
    riderStatus: 'active', isOnline: true, emergencySupport: true,
    currentLocation: { type: 'Point', coordinates: coords, lat: coords[1], lng: coords[0], updatedAt: new Date() },
  });
  console.log(`rider ${vtype}${bike ? ' (bike)' : ''} @ ${coords}`);
};

await mkRider(1, 'car', 2);
await mkRider(2, 'auto', 6);
await mkRider(3, 'bike', 1, true);

console.log('SOS demo seed done (Bhopal). Bike rider must NEVER get alerts.');
await mongoose.disconnect();
