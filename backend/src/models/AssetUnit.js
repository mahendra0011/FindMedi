import mongoose from 'mongoose';
import { moneyRounding } from '../utils/money.js';
import { ASSET_STATUS, ASSET_STATUSES } from '../lib/flowStates.js';

// FLOW-G (10.md 2.10): one physical unit — the serial, not the product.
//
// A rental is against a UNIT, not a catalogue entry: "wheelchair #A-4471" is
// what leaves the warehouse, what comes back damaged and what gets sanitised.
// `productId` (optional) links the unit to the product row when one exists;
// `productName` is denormalized so the public availability list does not need
// the join.
//
// Vendor ownership is a Provider (`vendorId`) — same vocabulary as Service —
// and routes resolve it to Provider.ownerUserId.

const assetUnitSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  productName: { type: String, required: true, trim: true, maxlength: 160 },
  kind: { type: String, trim: true, maxlength: 60, default: 'equipment' },
  serial: { type: String, required: true, trim: true, maxlength: 60, unique: true },

  status: { type: String, enum: ASSET_STATUSES, default: ASSET_STATUS.AVAILABLE, index: true },
  isListed: { type: Boolean, default: true, index: true },

  // Server-owned price. A renter's body never reaches these two.
  ratePerDay: { type: Number, required: true, min: 0, max: 1000000 },
  deposit: { type: Number, min: 0, max: 1000000, default: 0 },

  // 5.md 8: sanitisation record and maintenance schedule.
  sanitisationCycleDays: { type: Number, min: 0, max: 365, default: 0 },
  lastSanitisedAt: { type: Date, default: null },
  maintenance: [{
    at: { type: Date, default: Date.now },
    note: { type: String, maxlength: 500, default: '' },
    cost: { type: Number, min: 0, default: 0 },
  }],

  // When the unit CANNOT be rented (already out, servicing, blackout window).
  blackoutDates: [{ from: { type: Date }, to: { type: Date }, reason: { type: String, maxlength: 200, default: '' } }],

  location: { type: String, maxlength: 300, default: '' },
  condition: { type: String, maxlength: 1000, default: '' },
}, { timestamps: true });

assetUnitSchema.index({ vendorId: 1, status: 1 });
assetUnitSchema.index({ status: 1, isListed: 1 });
assetUnitSchema.index({ productName: 'text' }, { name: 'asset_unit_text_search', weights: { productName: 10, kind: 4 } });

assetUnitSchema.plugin(moneyRounding(['ratePerDay', 'deposit', 'maintenance[].cost']));

export default mongoose.models.AssetUnit || mongoose.model('AssetUnit', assetUnitSchema);
