import mongoose from 'mongoose';

/**
 * File 09 §9.8/06.1: monthly duty roster (ward/dept), draft → published,
 * with swap requests approved by roster owners.
 */
const rosterSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  month: { type: String, required: true, index: true },
  wardId: { type: String, default: '' },
  deptId: { type: String, default: '' },
  entries: [{
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    date: { type: String },
    shift: { type: String, enum: ['Morning', 'Evening', 'Night', 'Off', 'OnCall'] },
    onCall: { type: Boolean, default: false },
  }],
  status: { type: String, enum: ['Draft', 'Published'], default: 'Draft', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

rosterSchema.index({ hospitalId: 1, month: 1 });

export default mongoose.models.Roster || mongoose.model('Roster', rosterSchema);
