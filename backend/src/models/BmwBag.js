import mongoose from 'mongoose';

// Module #91: Biomedical Waste (BMW) Management Rules (2016/2019)
// Yellow: Anatomical/Soiled/Chemical | Red: Contaminated Recyclable Plastic
// White: Puncture-proof Sharps/Needles | Blue: Glassware/Metallic Implants
export const BMW_COLOR_CATEGORIES = ['YELLOW', 'RED', 'WHITE_SHARPS', 'BLUE_GLASS'];

const bmwBagSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
    bagBarcode: { type: String, required: true, unique: true, index: true },
    colorCategory: {
      type: String,
      enum: BMW_COLOR_CATEGORIES,
      required: true,
      index: true,
    },
    weightKg: { type: Number, required: true, min: 0.001, max: 200 },
    generatingDepartment: { type: String, required: true, trim: true },
    sealedByStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sealedAt: { type: Date, default: Date.now },
    storageShedReceivedAt: { type: Date },
    cbwtfVendorName: { type: String, trim: true, default: '' },
    cbwtfVehicleNumber: { type: String, trim: true, default: '' },
    cbwtfManifestNumber: { type: String, trim: true, default: '' },
    cbwtfDriverName: { type: String, trim: true, default: '' },
    dispatchedAt: { type: Date },
    status: {
      type: String,
      enum: ['SEALED', 'IN_STORAGE', 'DISPATCHED_TO_CBWTF'],
      default: 'SEALED',
      index: true,
    },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

bmwBagSchema.index({ hospitalId: 1, status: 1, colorCategory: 1 });

export default mongoose.models.BmwBag || mongoose.model('BmwBag', bmwBagSchema);
