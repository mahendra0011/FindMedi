import mongoose from 'mongoose';

/**
 * File 13 §13.6: physical location tree (Campus→Block→Floor→Wing→Room).
 * Rooms link to Bed.locationId; movement events can cite rooms.
 */
const locationSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  kind: { type: String, enum: ['campus', 'block', 'floor', 'wing', 'room'], required: true },
  name: { type: String, required: true, maxlength: 120 },
  code: { type: String, default: '', maxlength: 40 },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null, index: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

locationSchema.index({ hospitalId: 1, parentId: 1 });

export default mongoose.models.Location || mongoose.model('Location', locationSchema);
