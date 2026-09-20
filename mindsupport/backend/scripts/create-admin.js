import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { getMongoOptions, MONGODB_URI } from "../src/config/env.js";
import { User } from "../src/models/index.js";

const [, , emailArg, passwordArg, ...nameParts] = process.argv;
const email = (process.env.ADMIN_EMAIL || emailArg || "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || passwordArg || "";
const name = (process.env.ADMIN_NAME || nameParts.join(" ") || "MindSupport Admin").trim();

if (!email || !password || password.length < 8) {
  console.error("Usage: ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD=strong-password npm run create:admin");
  console.error("Or: npm run create:admin -- owner@example.com strong-password \"Owner Name\"");
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI, getMongoOptions({ serverSelectionTimeoutMS: 5000 }));

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ email });

  if (existing) {
    existing.name = name;
    existing.passwordHash = passwordHash;
    existing.role = "admin";
    existing.status = "active";
    existing.verificationStatus = "approved";
    await existing.save();
    console.log(`Updated admin account: ${email}`);
  } else {
    await User.create({
      name,
      email,
      passwordHash,
      role: "admin",
      status: "active",
      verificationStatus: "approved",
      otpVerified: true,
      otpVerifiedAt: new Date(),
    });
    console.log(`Created admin account: ${email}`);
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
