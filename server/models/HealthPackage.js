import mongoose from 'mongoose';

const healthPackageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, enum: ['Basic', 'Comprehensive', 'Cardiac', 'Diabetic', 'Women', 'Senior Citizen', 'Corporate', 'Other'], default: 'Basic' },
  tests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Test' }],
  testNames: [{ type: String }],
  originalPrice: { type: Number, required: true },
  packagePrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  popular: { type: Boolean, default: false },
  homeCollectionAvailable: { type: Boolean, default: false },
  reportTime: { type: String, default: '24-48 hrs' },
  isActive: { type: Boolean, default: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

healthPackageSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.originalPrice > 0) {
    this.discount = Math.round((1 - this.packagePrice / this.originalPrice) * 100);
  }
  next();
});

export default mongoose.model('HealthPackage', healthPackageSchema);
