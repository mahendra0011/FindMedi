import mongoose from 'mongoose';

/**
 * FLOW-D meal subscription (5.md 108, 6.md §2.7: "weekly menu, skip-day,
 * pause, delivery slot, diet type, allergies"). Deliberately NOT DietOrder:
 * DietOrder is an inpatient tray order bound to an admission and ward, while
 * this is a patient-held commercial term with pause/skip semantics — the two
 * share none of their keys or lifecycle.
 *
 * Commerce (T3), not clinical: it rides the tracked-gap baseline until a
 * policy owner assigns its class (docs/privacy/RETENTION.md "Known gaps") —
 * diet data next to allergies is clinical-adjacent, and guessing a class for
 * it would be exactly the invention the retention gate exists to prevent.
 */
const mealSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null },

  dietType: { type: String, enum: ['veg', 'non_veg', 'eggetarian', 'vegan', 'jain', 'custom'], default: 'custom' },
  allergies: [{ type: String, maxlength: 200 }],
  notes: { type: String, maxlength: 2000, default: '' },

  // What the member is eating this week (5.md 108 "weekly menu").
  weeklyMenu: [{
    day: { type: String, enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], required: true },
    items: [{ type: String, maxlength: 300 }],
    skipped: { type: Boolean, default: false },
  }],

  // The delivery window the member chose at signup.
  deliverySlot: { type: String, maxlength: 120, default: '' },
  deliveryAddress: { type: String, maxlength: 500, default: '' },

  status: { type: String, enum: ['active', 'paused', 'cancelled', 'completed'], default: 'active', index: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, index: true },

  pause: {
    from: { type: Date, default: null },
    to: { type: Date, default: null },
    reason: { type: String, maxlength: 300, default: '' },
    pausedDays: { type: Number, min: 0, default: 0 },
  },

  // Explicit skip-days already taken, so a skip is auditable and bounded
  // rather than an edit to history.
  skippedDates: [{ type: Date }],
}, { timestamps: true });

mealSubscriptionSchema.index({ userId: 1, status: 1 });

export default mongoose.models.MealSubscription || mongoose.model('MealSubscription', mealSubscriptionSchema);
