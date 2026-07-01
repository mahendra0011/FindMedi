import mongoose from 'mongoose';

const dietOrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  ward: { type: String },
  bedNumber: { type: String },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorName: { type: String, required: true },
  dietType: { type: String, enum: ['Regular', 'Diabetic', 'Low Sodium', 'Liquid', 'Soft', 'High Protein', 'Low Fat', 'Renal', 'NPO', 'Other'], required: true },
  mealTimes: [{ type: String, enum: ['Breakfast', 'Lunch', 'Evening Snack', 'Dinner'] }],
  instructions: { type: String },
  allergies: { type: String },
  status: { type: String, enum: ['Active', 'Completed', 'Cancelled'], default: 'Active' },
  reviewedByDietitian: { type: Boolean, default: false },
  dietitianName: { type: String },
  meals: [{
    mealType: { type: String, enum: ['Breakfast', 'Lunch', 'Evening Snack', 'Dinner'] },
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

dietOrderSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('DietOrder', dietOrderSchema);