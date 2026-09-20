import mongoose from 'mongoose';

const rewardCatalogItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    enum: ['medicine_discount', 'free_delivery', 'free_lab_test', 'appointment_discount', 'custom'],
    required: true,
  },
  pointsRequired: {
    type: Number,
    required: true,
  },
  rewardType: {
    type: String,
    enum: ['percentage', 'fixed', 'free_item'],
    required: true,
  },
  rewardValue: {
    type: Number,
    default: 0,
  },
  applicableService: {
    type: String,
    enum: ['pharmacy', 'lab', 'delivery', 'consultation', 'all'],
    default: 'all',
  },
  maxCapAmount: {
    type: Number,
    default: 0,
  },
  validityDays: {
    type: Number,
    default: 30,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  stockLimit: {
    type: Number,
    default: 0,
  },
  redeemedCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

rewardCatalogItemSchema.index({ isActive: 1, category: 1 });
rewardCatalogItemSchema.index({ pointsRequired: 1 });

export default mongoose.model('RewardCatalogItem', rewardCatalogItemSchema);