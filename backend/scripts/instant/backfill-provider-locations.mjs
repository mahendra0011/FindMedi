/**
 * File 07 Step 8 — backfill H3 location defaults for providers that never
 * sent a live GPS ping (currentLocation.h3Index8 == null).
 * Temporary city-center default until the provider opens the app and live
 * GPS (navigator.geolocation.watchPosition → PUT /location) takes over.
 * Usage: node backend/scripts/instant/backfill-provider-locations.mjs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { latLngToCell } from 'h3-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const CITY_CENTERS = {
  Jabalpur: { lat: 23.1815, lng: 79.9864 },
  Bhopal: { lat: 23.2599, lng: 77.4126 },
  Indore: { lat: 22.7196, lng: 75.8577 },
  Gwalior: { lat: 26.2183, lng: 78.1828 },
  Raipur: { lat: 21.2514, lng: 81.6296 },
};

const { default: LawyerProfile } = await import('../../src/models/LawyerProfile.js');
const { default: AssistantProfile } = await import('../../src/models/AssistantProfile.js');
const { default: RiderProfile } = await import('../../src/models/RiderProfile.js');
const { default: Doctor } = await import('../../src/models/Doctor.js');

await mongoose.connect(process.env.MONGO_URI);

const targets = [
  { Model: LawyerProfile, locPath: 'currentLocation', cityField: 'operatingCity' },
  { Model: AssistantProfile, locPath: 'currentLocation', cityField: 'operatingCity' },
  { Model: RiderProfile, locPath: 'currentLocation', cityField: 'operatingCity' },
  { Model: Doctor, locPath: 'emergencyDoctorLocation', cityField: null },
];

for (const { Model, locPath, cityField } of targets) {
  const providers = await Model.find({ [`${locPath}.h3Index8`]: null });
  let done = 0;
  for (const p of providers) {
    const city = (cityField && p[cityField]) || 'Jabalpur';
    const center = CITY_CENTERS[city] || CITY_CENTERS.Jabalpur;
    p[locPath] = {
      ...(p[locPath]?.toObject?.() || p[locPath] || {}),
      type: 'Point',
      coordinates: [center.lng, center.lat],
      lat: center.lat,
      lng: center.lng,
      h3Index8: latLngToCell(center.lat, center.lng, 8),
      h3Index9: latLngToCell(center.lat, center.lng, 9),
      updatedAt: new Date(),
    };
    // Doctors: schema uses lastUpdatedAt inside emergencyDoctorLocation
    if (Model === Doctor) {
      p[locPath].lastUpdatedAt = new Date();
      delete p[locPath].updatedAt;
    }
    await p.save();
    done += 1;
  }
  console.log(`${Model.modelName}: ${done}/${providers.length} backfilled with city-center default`);
}

await mongoose.disconnect();
console.log('Backfill complete. Real accuracy needs live GPS pings from provider apps.');
