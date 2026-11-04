import mongoose from 'mongoose';

/** Spec 2.3: recurring medicine refills ("auto-order + reminder").
 *
 * One row per (patient, medicine). A scheduler reads `nextRefillAt` to send a
 * reminder `reminderDaysBefore` ahead; when `autoOrder` is on the same sweep
 * creates the refill event (history entry) for the pharmacy queue. Pause /
 * resume / cancel are asserted through REFILL_TRANSITIONS.
 */
const refillSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', default: null },
  medicineReminderId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicineReminder', default: null },
  medicineName: { type: String, required: true, maxlength: 200 },
  dosage: { type: String, default: '', maxlength: 100 },
  frequency: { type: String, default: '', maxlength: 100 },
  quantityPerRefill: { type: Number, min: 1, max: 100, default: 1 },
  intervalDays: { type: Number, min: 1, max: 180, default: 30 },
  reminderDaysBefore: { type: Number, min: 0, max: 14, default: 2 },
  deliveryAddress: { type: String, default: '', maxlength: 500 },
  autoOrder: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'paused', 'cancelled'], default: 'active', index: true },
  startAt: { type: Date, default: Date.now },
  nextRefillAt: { type: Date, index: true },
  lastRefilledAt: { type: Date, default: null },
  lastReminderAt: { type: Date, default: null },
  refillCount: { type: Number, default: 0 },
  notes: { type: String, default: '', maxlength: 500 },
  history: [{
    action: { type: String, enum: ['created', 'paused', 'resumed', 'cancelled', 'refilled', 'reminded'], default: 'created' },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, default: '', maxlength: 300 },
  }],
}, { timestamps: true });

refillSubscriptionSchema.index({ userId: 1, medicineName: 1, status: 1 });

refillSubscriptionSchema.pre('save', function () {
  if (!this.nextRefillAt) {
    const base = this.startAt ? new Date(this.startAt).getTime() : Date.now();
    this.nextRefillAt = new Date(base + this.intervalDays * 24 * 60 * 60 * 1000);
  }
});

export default mongoose.models.RefillSubscription
  || mongoose.model('RefillSubscription', refillSubscriptionSchema);
