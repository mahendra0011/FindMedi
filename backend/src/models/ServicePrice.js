import mongoose from 'mongoose';

/**
 * File 09 §9.5: tariff & price master. One service code, many payer-class /
 * room-type prices, versioned by effective window. Billing resolves the
 * applicable row server-side (client never sends prices).
 */
const servicePriceSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  code: { type: String, required: true, maxlength: 60, index: true },
  name: { type: String, required: true, maxlength: 200 },
  deptId: { type: String, default: '' },
  category: {
    type: String,
    enum: ['consult', 'procedure', 'investigation', 'bed', 'package', 'consumable', 'other'],
    default: 'other', index: true,
  },
  hsn: { type: String, default: '' },
  gstRate: { type: Number, default: 0, min: 0, max: 28 },
  prices: [{
    payerClass: { type: String, enum: ['cash', 'insurance', 'corporate', 'govt'], default: 'cash' },
    roomType: { type: String, default: '' },
    amount: { type: Number, required: true, min: 0 },
    from: { type: Date, default: Date.now },
    to: { type: Date, default: null },
  }],
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

servicePriceSchema.index({ hospitalId: 1, code: 1 });

export default mongoose.models.ServicePrice || mongoose.model('ServicePrice', servicePriceSchema);
