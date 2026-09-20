import "dotenv/config";
import mongoose from "mongoose";
import { getMongoOptions, MONGODB_URI } from "../src/config/env.js";
import { seedDatabase } from "../src/database/seed.js";
import { User } from "../src/models/index.js";

async function main() {
  await mongoose.connect(MONGODB_URI, getMongoOptions({ serverSelectionTimeoutMS: 10000 }));
  await seedDatabase();
  const counsellors = await User.find({ role: "counsellor", status: { $in: ["active", "approved"] } })
    .sort({ name: 1 })
    .select("name email specialization counsellorType categories rating reviews");
  console.log(`Approved counsellors: ${counsellors.length}`);
  for (const counsellor of counsellors) {
    console.log(`- ${counsellor.name} | ${counsellor.specialization} | ${counsellor.email}`);
  }
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
