import mongoose from 'mongoose';

const pharmacyOfferSchema = new mongoose.Schema({
  title: { type: String, required: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  discount: { type: Number, required: true },
  type: { type: String, enum: ['percentage', 'flat'], default: 'percentage' },
  minPurchase: { type: Number, default: 0 },
  maxDiscount: { type: Number, default: 0 },
  validTill: { type: Date },
  usageLimit: { type: Number, default: 100 },
  used: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('PharmacyOffer', pharmacyOfferSchema);
