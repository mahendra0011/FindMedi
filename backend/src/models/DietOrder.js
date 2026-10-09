import mongoose from 'mongoose';

// subcatogary.md C13 — meal types: the 4 originals plus early-morning,
// mid-morning, bedtime and supplement. Used by `mealTimes` and `meals[]`
// below, so the two never drift apart.
const MEAL_TYPES = [
  'Breakfast', 'Lunch', 'Evening Snack', 'Dinner',
  'Early Morning', 'Mid Morning', 'Bedtime', 'Supplement',
];

const dietOrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  ward: { type: String },
  bedNumber: { type: String },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorName: { type: String, required: true },
  // catogary.md L231-233 + subcatogary.md C13 — the 10 originals plus the
  // §13 diet types (cardiac, keto, weight-loss, clear/full liquid, tube…).
  // Additive only.
  dietType: {
    type: String,
    enum: [
      'Regular', 'Diabetic', 'Low Sodium', 'Liquid', 'Soft', 'High Protein',
      'Low Fat', 'Renal', 'NPO', 'Other',
      // §13 additions
      'Cardiac', 'Bland', 'Low Residue', 'Clear Liquid', 'Full Liquid',
      'Pureed/Dysphagia', 'Tube/Enteral', 'Gluten Free', 'Neutropenic',
      'Paediatric', 'Weight Loss', 'Keto', 'Post Surgery',
      'Pregnancy/Lactation', 'Geriatric',
    ],
    required: true,
  },
  mealTimes: [{ type: String, enum: MEAL_TYPES }],
  instructions: { type: String },
  allergies: { type: String },
  status: { type: String, enum: ['Active', 'Completed', 'Cancelled'], default: 'Active' },
  reviewedByDietitian: { type: Boolean, default: false },
  dietitianName: { type: String },
  meals: [{
    mealType: { type: String, enum: MEAL_TYPES },
    date: { type: Date },
    items: { type: String },
    deliveredAt: { type: Date },
    deliveredBy: { type: String },
    confirmedByNurse: { type: Boolean, default: false },
    nurseName: { type: String },
    patientFeedback: { type: String, enum: ['Good', 'Average', 'Poor', 'Not Eaten'] },
    feedbackNote: { type: String },
  }],
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  encounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Encounter', default: null, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

dietOrderSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('DietOrder', dietOrderSchema);