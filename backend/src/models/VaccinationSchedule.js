import mongoose from 'mongoose';

/**
 * `/patient/vaccinations` (6.md 2.5: "Child schedule (UIP+optional), adult
 * boosters, due/overdue, certificate download"). A Record with type
 * `vaccination_record` is ONE administered dose's document; this is the
 * SCHEDULE the doses are checked off against — due/overdue is a date
 * comparison against this row, so it is derived at read time like Event's
 * `full` rather than stored as a flag that goes stale overnight.
 *
 * Clinical records class: it is a patient's immunisation schedule, the same
 * statutory clock as the certificates it links to.
 */
const vaccinationScheduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Child schedules belong to a family member, not the account holder.
  familyMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember', default: null, index: true },

  vaccineName: { type: String, required: true, trim: true, maxlength: 200 },
  // UIP child schedule vs adult booster vs travel/covid — 6.md 2.5's split.
  scheduleType: { type: String, enum: ['child_uip', 'adult_booster', 'travel', 'covid', 'other'], default: 'child_uip' },

  doses: [{
    number: { type: Number, required: true, min: 1 },
    dueAt: { type: Date, required: true },
    givenAt: { type: Date, default: null },
    // The certificate for a given dose is a Record (`vaccination_record`);
    // linking it keeps "download certificate" one join away.
    recordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Record', default: null },
    centre: { type: String, maxlength: 300, default: '' },
    batchNo: { type: String, maxlength: 80, default: '' },
  }],

  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled', index: true },
  completedAt: { type: Date, default: null },
  // Where the schedule came from (UIP vs provider-entered) so a bad import can
  // be distinguished from a clinic's plan.
  source: { type: String, enum: ['uip', 'provider', 'manual', 'import'], default: 'manual' },
}, { timestamps: true });

vaccinationScheduleSchema.index({ userId: 1, status: 1 });
// "What is due next" is the page's only query (6.md 2.5 due/overdue).
vaccinationScheduleSchema.index({ userId: 1, 'doses.dueAt': 1 });

export default mongoose.models.VaccinationSchedule || mongoose.model('VaccinationSchedule', vaccinationScheduleSchema);
