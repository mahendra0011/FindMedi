import mongoose from 'mongoose';

/**
 * Elder-care home resident with an embedded Medication Administration
 * Record (MAR). File 12 inventory gap: elder homes had rosters but no
 * med-chart — doses, due times and given/missed administrations now live
 * on the resident row.
 *
 * administrations is BOUNDED (latest 500 via $slice on push): a multi-year
 * resident would otherwise grow one document without limit. Older entries
 * age out to the audit trail, not to nowhere.
 */
const medicationSchema = new mongoose.Schema({
  medicationId: { type: String, required: true, maxlength: 80 },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  dose: { type: String, required: true, trim: true, maxlength: 120 },
  frequency: { type: String, trim: true, maxlength: 120, default: '' },
  times: [{ type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ }],
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  active: { type: Boolean, default: true },
}, { _id: true });

const administrationSchema = new mongoose.Schema({
  medicationId: { type: String, required: true, maxlength: 80 },
  scheduledFor: { type: Date, required: true },
  givenAt: { type: Date, default: null },
  status: { type: String, enum: ['given', 'missed'], required: true, index: true },
  givenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  note: { type: String, maxlength: 500, default: '' },
}, { _id: false });

const elderResidentSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  age: { type: Number, min: 0, max: 130, default: null },
  gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
  room: { type: String, trim: true, maxlength: 60, default: '' },
  bed: { type: String, trim: true, maxlength: 60, default: '' },
  doctor: { type: String, trim: true, maxlength: 200, default: '' },
  allergies: [{ type: String, trim: true, maxlength: 200 }],
  conditions: [{ type: String, trim: true, maxlength: 200 }],
  status: { type: String, enum: ['active', 'discharged'], default: 'active', index: true },
  medications: [medicationSchema],
  administrations: [administrationSchema],
}, { timestamps: true });

elderResidentSchema.index({ hospitalId: 1, status: 1 });
elderResidentSchema.index({ hospitalId: 1, room: 1, bed: 1 });

export default mongoose.models.ElderResident || mongoose.model('ElderResident', elderResidentSchema);
