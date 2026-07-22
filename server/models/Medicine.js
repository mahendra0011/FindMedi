import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  genericName: { type: String, required: true },
  category: { type: String, enum: ['Antibiotic', 'Analgesic', 'Antihypertensive', 'Antidiabetic', 'Antacid', 'Antihistamine', 'Antiviral', 'Antifungal', 'Vitamin', 'Steroid', 'Anesthetic', 'Diuretic', 'Cardiac', 'Respiratory', 'Prescription', 'OTC', 'Generic', 'Baby Care', 'Ayurvedic', 'Devices', 'Vitamins', 'Supplements', 'Personal Care', 'Other'], required: true },
  form: { type: String, enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Drop', 'Cream', 'Inhaler', 'Infusion', 'Other'], required: true },
  manufacturer: { type: String, required: true },
  batchNumber: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  purchasePrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  currentStock: { type: Number, required: true, default: 0 },
  reorderLevel: { type: Number, default: 10 },
  prescriptionReq: { type: Boolean, default: false },
  rackLocation: { type: String, default: '' },
  interactions: [{ type: String }], // Drug interactions with other medicines
  contraindications: [{ type: String }], // Conditions where medicine should not be used
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// Auto update isActive based on stock level
medicineSchema.pre('save', function (next) {
  if (this.currentStock === 0) this.isActive = false;
  else if (this.currentStock > 0 && !this.isActive) this.isActive = true; // Re-enable when restocked
  next();
});

export default mongoose.model('Medicine', medicineSchema);