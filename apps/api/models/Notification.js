import mongoose from 'mongoose';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function getISTDateString() {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const M = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const D = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${M}-${D}`;
}

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['reminder', 'payment', 'appointment', 'records', 'system'], default: 'system' },
  read: { type: Boolean, default: false },
  userId: { type: String, required: true },
  date: { type: String, default: () => getISTDateString() },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Notification', notificationSchema);
