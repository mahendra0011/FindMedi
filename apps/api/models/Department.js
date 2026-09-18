import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  head: { type: String, default: '' },
  active: { type: Boolean, default: true },
  fees_structure: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Department', departmentSchema);
