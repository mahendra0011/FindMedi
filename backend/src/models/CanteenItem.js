import mongoose from 'mongoose';

const canteenItemSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  name: { type: String, required: true, maxlength: 200 },
  category: {
    type: String,
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Beverages', 'Special Diet', 'Supplements'],
    default: 'Snacks',
    index: true,
  },
  description: { type: String, maxlength: 1000 },
  price: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, min: 0, default: 0 },
  isVeg: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  nutritionalInfo: {
    calories: { type: Number, min: 0 },
    protein: { type: Number, min: 0 },
    carbs: { type: Number, min: 0 },
    fat: { type: Number, min: 0 },
  },
  allergens: [{ type: String, maxlength: 50 }],
  image: { type: String, maxlength: 500 },
  preparationTime: { type: Number, min: 0, default: 15 },
  stockDailyLimit: { type: Number, min: 0 },
  soldToday: { type: Number, min: 0, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

canteenItemSchema.index({ hospitalId: 1, category: 1, active: 1 });

export default mongoose.models.CanteenItem || mongoose.model('CanteenItem', canteenItemSchema);
