import mongoose from 'mongoose';

const housekeepingSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true },
  room: { type: String, required: true },
  bedNumber: { type: String },
  ward: { type: String },
  // subcatogary.md C24 — original 5 plus the §24 additions (BMW pickup,
  // linen change, pest control, water-tank cleaning).
  type: {
    type: String,
    enum: [
      'Routine Cleaning', 'Deep Cleaning', 'Discharge Cleaning',
      'Terminal Cleaning', 'Fumigation',
      // §24 additions
      'Biomedical Waste Pickup', 'Linen Change', 'Pest Control',
      'Water Tank Cleaning',
    ],
    required: true,
  },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed', 'Verified'], default: 'Pending' },
  assignedTo: { type: String },
  notes: { type: String },
  completedAt: { type: Date },
  verifiedBy: { type: String },
  verifiedAt: { type: Date },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Housekeeping', housekeepingSchema);