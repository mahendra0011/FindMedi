import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { configureMongoDns } from './src/config/mongoDns.js';

configureMongoDns();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/findmedi';
const COUNSELLOR_PASSWORD = 'Counsellor@123';
const PSYCHIATRIST_PASSWORD = 'Psychiatrist@123';

import User from './src/models/User.js';
import Doctor from './src/models/Doctor.js';
import { User as MindUser } from './mindsupport/src/models/index.js';

async function ensureMainUser({ email, name, role, phone, password }) {
  let user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    user = new User({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || '+910000000000',
      role,
      isVerified: true,
      approvalStatus: 'approved',
    });
    await user.save();
    console.log(`- created main User [${role}] ${email}`);
  } else {
    // Purane raw-inserted docs normalize karo (phone/status enum fix)
    let changed = false;
    if (user.role !== role) { user.role = role; changed = true; }
    if (!user.isVerified) { user.isVerified = true; changed = true; }
    if (user.approvalStatus !== 'approved') { user.approvalStatus = 'approved'; changed = true; }
    if (!user.phone) { user.phone = '+910000000000'; changed = true; }
    if (!['active', 'blocked'].includes(user.status)) { user.status = 'active'; changed = true; }
    if (changed) await user.save();
    console.log(`- main User exists [${user.role}] ${email}`);
  }
  return user;
}

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  // ---- 1. Approved mindsupport counsellors -> main Users + Doctor docs ----
  const counsellors = await MindUser.find({ role: 'counsellor', status: 'approved' }).lean();
  console.log(`Found ${counsellors.length} approved counsellors in mind_users.`);
  for (const c of counsellors) {
    const user = await ensureMainUser({
      email: c.email,
      name: c.name,
      role: 'counsellor',
      phone: c.phone,
      password: COUNSELLOR_PASSWORD,
    });
    // Doctor doc taaki doctor-wala booking flow (BookingModal/slots/payment) same-tarke chale
    await Doctor.updateOne(
      { email: c.email.toLowerCase() },
      {
        $set: {
          name: c.name,
          email: c.email.toLowerCase(),
          specialization: 'Counselling',
          qualifications: c.education || c.specialization || 'Certified Counsellor',
          experience: c.experience || c.yearsOfPractice ? `${c.experience || c.yearsOfPractice}` : '5 years',
          bio: c.bio || 'Verified counsellor for confidential online sessions.',
          consultation_fees: Number(c.sessionPricing) || 800,
          languages: c.languages?.length ? c.languages : ['Hindi', 'English'],
          location: c.city || c.address || 'Online',
          phone: c.phone || '+910000000000',
          available: true,
          approved: true,
          doctor_type: 'clinic',
          user_id: user._id,
          appointmentModes: ['video', 'audio', 'chat', 'offline'],
        },
      },
      { upsert: true }
    );
    console.log(`- upserted Doctor [Counselling] ${c.name}`);
  }

  // ---- 2. Psychiatry doctors -> main Users (role psychiatrist) + user_id link ----
  const psychDocs = await Doctor.find({ specialization: 'Psychiatry', approved: true }).lean();
  console.log(`Found ${psychDocs.length} approved psychiatry doctors.`);
  for (const d of psychDocs) {
    const user = await ensureMainUser({
      email: d.email,
      name: d.name,
      role: 'psychiatrist',
      phone: d.phone,
      password: PSYCHIATRIST_PASSWORD,
    });
    if (!d.user_id || String(d.user_id) !== String(user._id)) {
      await Doctor.updateOne({ _id: d._id }, { $set: { user_id: user._id } });
    }
    console.log(`- linked Doctor [Psychiatry] ${d.name}`);
  }

  const cCount = await Doctor.countDocuments({ specialization: 'Counselling', approved: true });
  const pCount = await Doctor.countDocuments({ specialization: 'Psychiatry', approved: true });
  console.log(`Counselling Doctor docs: ${cCount} | Psychiatry Doctor docs: ${pCount}`);
  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
