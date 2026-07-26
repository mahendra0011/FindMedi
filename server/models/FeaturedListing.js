import mongoose from 'mongoose';

const featuredListingSchema = new mongoose.Schema({
  facilityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  facilityType: { type: String, enum: ['hospital', 'clinic', 'lab', 'pharmacy'], required: true },
  facilityName: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  placement: { type: String, enum: ['homepage', 'category', 'search'], default: 'homepage' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('FeaturedListing', featuredListingSchema);
