import mongoose from 'mongoose';

/**
 * Campaigns & camps pipeline (file 24 §4.7/§8): Idea → partner → ops →
 * registrations → results → report → follow-up conversions.
 */
const campaignSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['health_camp', 'specialty_camp', 'vaccination_drive', 'blood_drive', 'workshop', 'webinar', 'marketing'],
    default: 'health_camp', index: true,
  },
  title: { type: String, required: true },
  date: { type: Date, default: null },
  venue: { type: String, default: '' },
  city: { type: String, default: '', index: true },
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', default: null },
  budget: { type: Number, default: 0 },
  capacity: { type: Number, default: 0 },
  registrations: { type: Number, default: 0 },
  attendees: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['idea', 'partner_confirmed', 'ops_ready', 'registrations_open', 'completed', 'reported', 'cancelled'],
    default: 'idea', index: true,
  },
  reportRef: { type: String, default: '' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
}, { timestamps: true });

campaignSchema.index({ city: 1, status: 1 });

export default mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);
