import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { configureMongoDns, connectMongooseWithRetry } from '../../src/config/mongoDns.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Demo accounts for the Doc 07 role verticals. Well-known dev credentials —
// never run this against a production database.
configureMongoDns();
try {
  await connectMongooseWithRetry(mongoose, process.env.MONGO_URI);
} catch (err) {
  // Corporate/sandbox DNS can refuse SRV lookups; resolve straight to the
  // shard hosts instead (same cluster, same database).
  console.warn('SRV connect failed, falling back to direct shard hosts:', err.message);
  const direct = process.env.MONGO_URI.replace(
    /mongodb\+srv:\/\/([^@]+)@[^/]+\/(\w+)\?.*/,
    'mongodb://$1@ac-s20wcft-shard-00-00.5l9k4vd.mongodb.net:27017,ac-s20wcft-shard-00-01.5l9k4vd.mongodb.net:27017,ac-s20wcft-shard-00-02.5l9k4vd.mongodb.net:27017/$2?replicaSet=atlas-11ih9f-shard-0&authSource=admin&tls=true&retryWrites=true&w=majority'
  );
  await mongoose.connect(direct);
}

const { default: User } = await import('../../src/models/User.js');

const HOSPITAL = new mongoose.Types.ObjectId('6aee46d96c17c8754c602402');
const LAB_FACILITY = new mongoose.Types.ObjectId('6aee46d96c17c8754c60240c');
const PHARMACY_FACILITY = new mongoose.Types.ObjectId('6aee46da6c17c8754c60240d');

const accounts = [
  { email: 'optician@findmedi.com', role: 'optician', name: 'Optical Demo Store' },
  { email: 'dietitian@findmedi.com', role: 'dietitian', name: 'Dr. Nisha Dietitian' },
  { email: 'physio@findmedi.com', role: 'physiotherapist', name: 'Dr. Arjun Physio' },
  { email: 'home.nursing@findmedi.com', role: 'home_nursing_admin', name: 'Home Nursing Demo Agency' },
  { email: 'phlebotomist@findmedi.com', role: 'phlebotomist', name: 'Ravi Phlebotomist', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'yoga@findmedi.com', role: 'yoga_instructor', name: 'Yoga Guru Meera' },
  { email: 'gym@findmedi.com', role: 'gym_owner', name: 'FitLife Gym' },
  { email: 'wellness@findmedi.com', role: 'wellness_admin', name: 'Serene Wellness Spa' },
  { email: 'equipment@findmedi.com', role: 'equipment_vendor', name: 'MedEquip Rentals' },
  { email: 'product.vendor@findmedi.com', role: 'product_vendor', name: 'HealthKart Demo', facilityId: PHARMACY_FACILITY, facilityType: 'pharmacy' },
  { email: 'events@findmedi.com', role: 'event_organizer', name: 'Health Camps Org' },
  { email: 'group.host@findmedi.com', role: 'group_host', name: 'Support Circle Host' },
  { email: 'trainer.org@findmedi.com', role: 'trainer_org', name: 'CPR Training Org' },
  { email: 'bloodbank@findmedi.com', role: 'blood_bank_admin', name: 'Red Cross Blood Bank' },
  { email: 'dialysis@findmedi.com', role: 'dialysis_admin', name: 'Kidney Care Dialysis' },
  { email: 'fertility@findmedi.com', role: 'fertility_admin', name: 'Hope IVF Centre' },
  { email: 'rehab@findmedi.com', role: 'rehab_admin', name: 'New Leaf Rehab' },
  { email: 'govt@findmedi.com', role: 'govt_facility_staff', name: 'PHC Staff Demo' },
  { email: 'tpa@findmedi.com', role: 'tpa_agent', name: 'Star Health TPA Desk' },
  // Doc 07 §3.21-3.24 ops consoles. These roles are 2FA-mandatory, so the demo
  // rows ship pre-enrolled with a known dev-only TOTP secret (never prod).
  { email: 'content.editor@findmedi.com', role: 'content_editor', name: 'Content Editor', twoFactorSecret: 'ANTRL5EM6O5LPGFDZXJK5HXXBFSUTW65' },
  { email: 'medical.reviewer@findmedi.com', role: 'medical_reviewer', name: 'Medical Reviewer', twoFactorSecret: 'DAECTNU5J7I3CAXHEAIGWHNJIC3S226K' },
  { email: 'moderator@findmedi.com', role: 'moderator', name: 'Community Moderator', twoFactorSecret: 'BB5MQSHPJZYP6NKQCKVG5HIBJ2Y2L3RW' },
  { email: 'support.agent@findmedi.com', role: 'support_agent', name: 'Support Agent', twoFactorSecret: 'HMFHHPDUNVDEJWPEQQZNGXM6PHMSWQEQ' },
  { email: 'finance@findmedi.com', role: 'finance_admin', name: 'Finance Admin', twoFactorSecret: '4OSJ6SKTX3XTHHZSGXZUSZRIFTXM6VFN' },
  { email: 'kyc@findmedi.com', role: 'kyc_reviewer', name: 'KYC Reviewer', twoFactorSecret: '2SZBTVUET3HFOWEUQD62D6FR3O2OJNRP' },
  { email: 'compliance@findmedi.com', role: 'compliance_officer', name: 'Compliance Officer', twoFactorSecret: 'SOM5XU4QNTIMILIDKOWQ4NSDG3CMYRGJ' },
];

for (const a of accounts) {
  const fields = {
    role: a.role,
    name: a.name,
    hospitalId: HOSPITAL,
    facilityId: a.facilityId || null,
    facilityType: a.facilityType || '',
    password: 'password',
  };
  if (a.twoFactorSecret) {
    fields.twoFactorEnabled = true;
    fields.twoFactorSecret = a.twoFactorSecret;
    fields.twoFactorTempSecret = '';
    fields.twoFactorBackupCodes = [];
  }
  const existing = await User.findOne({ email: a.email }).select('+password');
  if (existing) {
    Object.assign(existing, fields);
    await existing.save();
    console.log(`updated ${a.email} (${a.role})${a.twoFactorSecret ? ' +2FA' : ''}`);
  } else {
    await User.create({
      ...fields,
      email: a.email,
      phone: '+919999900000',
      isVerified: true,
      status: 'active',
      approvalStatus: 'approved',
    });
    console.log(`created ${a.email} (${a.role})${a.twoFactorSecret ? ' +2FA' : ''}`);
  }
}

await mongoose.disconnect();
