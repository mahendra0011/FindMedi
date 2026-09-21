import mongoose from "mongoose";
import { getMongoOptions, maskMongoUri, MONGODB_DATABASE, MONGODB_URI } from "../config/env.js";
import { seedDatabase } from "./seed.js";

let dbReady = false;

mongoose.set("bufferCommands", false);
mongoose.set("strictQuery", true);

mongoose.connection.on("disconnected", () => {
  dbReady = false;
});

mongoose.connection.on("connected", () => {
  dbReady = true;
});

export function isDatabaseReady() {
  return dbReady;
}

export async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, getMongoOptions({ serverSelectionTimeoutMS: 5000 }));
    dbReady = true;
    await seedDatabase();
    console.log(`MongoDB connected: ${maskMongoUri(MONGODB_URI)} database=${MONGODB_DATABASE}`);
  } catch (error) {
    dbReady = false;
    console.error("MongoDB connection failed:", error.message);
  }
}
