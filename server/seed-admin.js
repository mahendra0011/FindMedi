import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import { configureMongoDns } from './config/mongoDns.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
configureMongoDns();

const DATABASE_NAME = 'medicore';

const buildMongoUri = () => {
  let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/medicore';

  if (mongoUri.includes('<username>') || mongoUri.includes('<password>')) {
    console.warn('⚠️  MONGO_URI contains placeholders. Set your actual MongoDB Atlas connection string in .env');
    process.exit(1);
  }

  try {
    const url = new URL(mongoUri);
    if (!url.pathname || url.pathname === '/') {
      url.pathname = `/${DATABASE_NAME}`;
      mongoUri = url.toString();
    }
  } catch {
    console.warn('Could not parse MONGO_URI, using it as provided.');
  }

  return mongoUri;
};

const main = async () => {
  const email = process.env.ADMIN_EMAIL || 'admin@mediCore.com';
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin User';

  if (!password) {
    console.error('❌ ADMIN_PASSWORD is not set in .env file.');
    console.error('   Add this to your server/.env:');
    console.error('   ADMIN_PASSWORD=your_secure_password');
    process.exit(1);
  }

  const mongoUri = buildMongoUri();
  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    family: 4,
    bufferCommands: false,
  });

  console.log('✅ Connected to MongoDB');
  console.log(`   Creating/updating admin: ${email}`);

  const existing = await User.findOne({ email: email.toLowerCase() });

  if (existing) {
    existing.name = name;
    existing.password = password;
    existing.role = 'admin';
    existing.status = 'active';
    existing.isVerified = true;
    existing.approvalStatus = 'not_required';
    if (!existing.phone) existing.phone = '0000000000';
    await existing.save();
    console.log('✅ Admin user updated successfully.');
  } else {
    await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'admin',
      phone: '0000000000',
      status: 'active',
      isVerified: true,
      approvalStatus: 'not_required',
    });
    console.log('✅ Admin user created successfully.');
  }

  console.log(`\n📋 Admin Login:`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: (as set in ADMIN_PASSWORD)`);

  await mongoose.disconnect();
};

main()
  .catch(error => {
    console.error('❌ Admin seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });