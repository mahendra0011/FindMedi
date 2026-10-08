import mongoose from 'mongoose';
import { moneyRounding } from '../utils/money.js';

const healthPackageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  // subcatogary.md C4.3 — original 8 plus the §4.3 additions (executive,
  // organ panels, men/child, pregnancy, pre-marital/employment, screening…).
  // Additive only; `Other` stays last as the catch-all.
  category: {
    type: String,
    enum: [
      'Basic', 'Comprehensive', 'Cardiac', 'Diabetic', 'Women',
      'Senior Citizen', 'Corporate',
      // §4.3 additions
      'Executive', 'Thyroid', 'Liver', 'Kidney', 'Bone & Joint', 'Men',
      'Child', 'Pregnancy', 'Pre-Marital', 'Pre-Employment',
      'Cancer Screening', 'Fever/Seasonal', 'Vitamin/Immunity',
      'Fitness/Athlete', 'Allergy', 'Sexual Health', 'Travel/Visa Medical',
      'Insurance Medical',
      'Other',
    ],
    default: 'Basic',
  },
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
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

healthPackageSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.originalPrice > 0) {
    this.discount = Math.round((1 - this.packagePrice / this.originalPrice) * 100);
  }
  next();
});

// PAY-M-06: list price, sale price and discount must round together or the
// advertised saving stops matching what checkout charges.
healthPackageSchema.plugin(moneyRounding(['originalPrice', 'packagePrice', 'discount']));

export default mongoose.model('HealthPackage', healthPackageSchema);
