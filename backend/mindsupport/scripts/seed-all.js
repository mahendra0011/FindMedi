import "dotenv/config";
import mongoose from "mongoose";
import { getMongoOptions, MONGODB_DATABASE, MONGODB_URI } from "../src/config/env.js";
import { seedDatabase } from "../src/database/seed.js";

async function main() {
  await mongoose.connect(MONGODB_URI, getMongoOptions({ serverSelectionTimeoutMS: 15000 }));
  const summary = await seedDatabase();
  const counts = Object.entries(summary.collections).sort(([a], [b]) => a.localeCompare(b));

  console.log("MindSupport MongoDB seed complete.");
  console.log(`Database: ${MONGODB_DATABASE}`);
  console.log(`Admin account: ${summary.admin.seeded ? summary.admin.email : summary.admin.reason}`);
  console.log("Collections:");
  for (const [name, count] of counts) {
    console.log(`- ${name}: ${count}`);
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
