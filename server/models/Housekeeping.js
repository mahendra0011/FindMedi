import mongoose from 'mongoose';

const housekeepingSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true },
  room: { type: String, required: true },
  bedNumber: { type: String },
  ward: { type: String },
  type: { type: String, enum: ['Routine Cleaning', 'Deep Cleaning', 'Discharge Cleaning', 'Terminal Cleaning', 'Fumigation'], required: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed', 'Verified'], default: 'Pending' },
  assignedTo: { type: String },
  notes: { type: String },
  completedAt: { type: Date },
  verifiedBy: { type: String },
  verifiedAt: { type: Date },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Housekeeping', housekeepingSchema);