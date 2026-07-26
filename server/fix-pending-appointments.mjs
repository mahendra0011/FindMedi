import mongoose from 'mongoose';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medicore';
async function fixPendingAppointments() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    const db = mongoose.connection.db;
    const result = await db.collection('appointments').updateMany(
      { status: 'Pending' },
      { $set: { status: 'Confirmed' } }
    );
    console.log(`✅ Fixed ${result.modifiedCount} appointments`);
    console.log(`✅ Matched ${result.matchedCount} appointments`);
    await mongoose.disconnect();
    console.log('✅ Done!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}
fixPendingAppointments();
