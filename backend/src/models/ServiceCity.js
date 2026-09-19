import mongoose from 'mongoose';

const serviceCitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    state: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    centerLat: {
      type: Number,
      default: 23.1815,
    },
    centerLng: {
      type: Number,
      default: 79.9864,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('ServiceCity', serviceCitySchema);
