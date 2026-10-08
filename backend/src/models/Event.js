import mongoose from 'mongoose';
import { moneyRounding } from '../utils/money.js';
import { EVENT_TYPES, EVENT_STATUS } from '../lib/flowStates.js';

// FLOW-E (5.md 6, 10.md 2.12): camps, workshops, drives, retreats.
//
// Ownership runs through the ORGANISER's Provider exactly like Service does:
// `organizerId` -> Provider.ownerUserId. A camp is not created by "a user", it
// is created by an organisation, and the owner check has to be able to say
// which one.
//
// Capacity is a COUNTER, not a flag: `registeredCount` is claimed with the same
// $expr compare-and-set slotCapacity uses (5.md 13 "atomic slot decrement"),
// because `count(events) < capacity` as two statements lets two racing
// registrations both read the last seat.

const eventSchema = new mongoose.Schema({
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  partnerProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null },

  type: { type: String, enum: EVENT_TYPES, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, maxlength: 8000, default: '' },
  slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },

  schedule: {
    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true },
    tz: { type: String, maxlength: 60, default: 'Asia/Kolkata' },
  },

  // 10.md 2.12: venue{address,geo} XOR onlineLink. `mode` makes the choice
  // explicit so a webinar with a stale venue address cannot be listed as
  // happening somewhere.
  venue: {
    mode: { type: String, enum: ['venue', 'online'], default: 'venue' },
    address: { type: String, maxlength: 500, default: '' },
    city: { type: String, maxlength: 100, default: '' },
    pincode: { type: String, maxlength: 10, default: '' },
    geo: {
      type: { type: String, enum: ['Point'], default: undefined },
      coordinates: { type: [Number], default: undefined },
    },
    onlineLink: { type: String, maxlength: 500, default: '' },
  },

  capacity: { type: Number, required: true, min: 1, max: 100000 },
  registeredCount: { type: Number, min: 0, default: 0 },

  fee: {
    amount: { type: Number, min: 0, default: 0 },
    currency: { type: String, maxlength: 3, default: 'INR' },
  },

  eligibility: {
    ageMin: { type: Number, min: 0, max: 120, default: 0 },
    ageMax: { type: Number, min: 0, max: 120, default: 120 },
    gender: { type: String, enum: ['any', 'male', 'female', 'other'], default: 'any' },
  },

  agenda: [{ at: { type: String, maxlength: 12 }, label: { type: String, maxlength: 200 } }],
  speakers: [{ title: { type: String, maxlength: 160 }, affiliation: { type: String, maxlength: 160 }, bio: { type: String, maxlength: 1000 } }],
  languages: [{ type: String, maxlength: 40 }],

  // 5.md 6: consent for data capture in camps — purpose, who sees results,
  // retention. Stored as a snapshot so changing the wording later does not
  // rewrite what an attendee agreed to.
  consentText: { type: String, maxlength: 4000, default: '' },

  status: { type: String, enum: Object.values(EVENT_STATUS), default: EVENT_STATUS.DRAFT, index: true },

  // 5.md 6 / 5.md 13: cancel before the cut-off -> full refund.
  refundCutoffHours: { type: Number, min: 0, max: 720, default: 24 },

  publishedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  cancelReason: { type: String, maxlength: 500, default: '' },

  outcomeReport: {
    summary: { type: String, maxlength: 4000, default: '' },
    attendeeCount: { type: Number, min: 0, default: 0 },
    feedbackAvg: { type: Number, min: 0, max: 5, default: 0 },
  },
}, { timestamps: true });

eventSchema.index({ status: 1, 'schedule.start': 1 });
eventSchema.index({ organizerId: 1, status: 1 });
eventSchema.index({ title: 'text', description: 'text' }, { name: 'event_text_search', weights: { title: 10, description: 4 } });

eventSchema.plugin(moneyRounding(['fee.amount']));

export default mongoose.models.Event || mongoose.model('Event', eventSchema);
