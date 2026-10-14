import mongoose from 'mongoose';

const UnmetDemandSchema = new mongoose.Schema(
  {
    query: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    location: {
      lat: Number,
      lon: Number,
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userContact: {
      type: String,
      trim: true,
      default: '',
    },
    ip: {
      type: String,
      default: '',
    },
    count: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['logged', 'reviewed', 'supply_sourced', 'dismissed'],
      default: 'logged',
      index: true,
    },
    lastRequestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

UnmetDemandSchema.index({ query: 1, city: 1 });

export default mongoose.models.UnmetDemand || mongoose.model('UnmetDemand', UnmetDemandSchema);
