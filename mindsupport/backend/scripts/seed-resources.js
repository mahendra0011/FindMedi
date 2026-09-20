import "dotenv/config";
import mongoose from "mongoose";
import { getMongoOptions, MONGODB_URI } from "../src/config/env.js";
import { seedDatabase } from "../src/database/seed.js";
import { Resource } from "../src/models/index.js";

async function main() {
  await mongoose.connect(MONGODB_URI, getMongoOptions({ serverSelectionTimeoutMS: 10000 }));
  await seedDatabase();
  const total = await Resource.countDocuments({ type: { $ne: "audio" } });
  const categories = await Resource.distinct("category", { type: { $ne: "audio" } });
  console.log(`Seeded resources: ${total}`);
  console.log(`Categories: ${categories.sort().join(", ")}`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
