import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import { getISTDateString } from '../utils/dateUtils.js';

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/mediCore';

async function migrate() {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const cursor = Appointment.collection.find({ date: { $type: 'date' } });
  let count = 0;
  let errors = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    try {
      const dateStr = getISTDateString(new Date(doc.date));
      await Appointment.collection.updateOne(
        { _id: doc._id },
        { $set: { date: dateStr } }
      );
      count++;
      console.log(`Migrated _id=${doc._id} date=${dateStr}`);
    } catch (err) {
      errors++;
      console.error(`Error migrating _id=${doc._id}:`, err.message);
    }
  }

  console.log(`Migration complete. Migrated: ${count}, Errors: ${errors}`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
