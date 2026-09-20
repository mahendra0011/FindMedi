import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { getMongoOptions, MONGODB_DATABASE, MONGODB_URI } from "../src/config/env.js";
import { seedDatabase } from "../src/database/seed.js";
import { User } from "../src/models/index.js";

const DEMO_ADMIN_EMAIL = "admin@demo.mindsupport.com";
const DEMO_ADMIN_PASSWORD = "Admin@123";
const DEMO_ADMIN_NAME = "Demo Admin";
const DEMO_USER_EMAIL = "user@demo.mindsupport.com";
const DEMO_USER_PASSWORD = "User@123";
const DEMO_USER_NAME = "Demo User";

const DEMO_COUNSELLORS = [
  { email: "aisha.mehra@mindsupport.seed", password: "Counsellor@123", name: "Dr. Aisha Mehra" },
  { email: "rahul.verma@mindsupport.seed", password: "Counsellor@123", name: "Rahul Verma" },
  { email: "neha.iyer@mindsupport.seed", password: "Counsellor@123", name: "Dr. Neha Iyer" },
  { email: "priya.nair@mindsupport.seed", password: "Counsellor@123", name: "Dr. Priya Nair" },
  { email: "arjun.sen@mindsupport.seed", password: "Counsellor@123", name: "Dr. Arjun Sen" },
  { email: "meera.shah@mindsupport.seed", password: "Counsellor@123", name: "Meera Shah" },
];

async function main() {
  process.env.ADMIN_EMAIL = DEMO_ADMIN_EMAIL;
  process.env.ADMIN_PASSWORD = DEMO_ADMIN_PASSWORD;
  process.env.ADMIN_NAME = DEMO_ADMIN_NAME;

  await mongoose.connect(MONGODB_URI, getMongoOptions({ serverSelectionTimeoutMS: 15000 }));

  const summary = await seedDatabase();

  const userHash = await bcrypt.hash(DEMO_USER_PASSWORD, 12);
  await User.updateOne(
    { email: DEMO_USER_EMAIL },
    {
      $set: {
        name: DEMO_USER_NAME,
        email: DEMO_USER_EMAIL,
        username: "demouser",
        passwordHash: userHash,
        role: "user",
        status: "active",
        otpVerified: true,
        otpVerifiedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  const counsellorHashes = await Promise.all(
    DEMO_COUNSELLORS.map(async (cc) => ({
      email: cc.email,
      password: cc.password,
      hash: await bcrypt.hash(cc.password, 12),
    }))
  );

  for (const cc of counsellorHashes) {
    await User.updateOne(
      { email: cc.email },
      {
        $set: {
          passwordHash: cc.hash,
          role: "counsellor",
          status: "approved",
          verificationStatus: "approved",
          otpVerified: true,
          otpVerifiedAt: new Date(),
        },
      }
    );
  }

  const userCount = await User.countDocuments();
  const totalCollections = Object.entries(summary.collections).sort(([a], [b]) => a.localeCompare(b));

  console.log("");
  console.log("=".repeat(58));
  console.log("  MindSupport Demo Data Seeded Successfully!");
  console.log("=".repeat(58));
  console.log(`  Database : ${MONGODB_DATABASE}`);
  console.log(`  Admin    : ${DEMO_ADMIN_EMAIL} / ${DEMO_ADMIN_PASSWORD}`);
  console.log(`  User     : ${DEMO_USER_EMAIL} / ${DEMO_USER_PASSWORD}`);
  console.log(`  Counsellors:`);
  for (const cc of DEMO_COUNSELLORS) {
    console.log(`    - ${cc.email} / ${cc.password}`);
  }
  console.log(`  Users    : ${userCount} total (admin, users, counsellors)`);
  console.log("  Collections:");
  for (const [name, count] of totalCollections) {
    console.log(`    - ${name}: ${count}`);
  }
  console.log("=".repeat(58));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Error:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
