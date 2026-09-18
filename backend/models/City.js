import mongoose from 'mongoose';

const citySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  state: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  isOnboarding: { type: Boolean, default: false },
  onboardingDate: { type: Date },
  displayOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

citySchema.index({ isActive: 1, displayOrder: 1 });
export default mongoose.model('City', citySchema);
