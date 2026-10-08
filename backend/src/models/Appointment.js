import mongoose from 'mongoose';
// A5: the status enum and its transition table live in ONE pure module
// (lib/appointmentLifecycle.js). The model takes its enum from it, the route
// asserts moves against the same table, and the zod schema mirrors it — so the
// three copies that used to drift (the `Rescheduled` value that was valid in
// zod but rejected by this enum is the standing example) cannot diverge again.
import { APPOINTMENT_STATUSES, APPOINTMENT_STATUS } from '../lib/appointmentLifecycle.js';

// LAB_SERVICES removed — use Test catalog / LabOrder model instead

// NOTIF-M-03: durable per-milestone reminder state (T-24h / T-2h). Lives on the
// document rather than in process memory so a missed cron tick is recovered by
// the next scan and a crash mid-send is retried once the `sending` lease
// expires. `attempts`/`nextAttemptAt` drive the bounded backoff; `lastReason`
// records WHY a milestone ended up terminal (opted-out vs window-passed), so
// "was this patient reminded" has one auditable answer.
const reminderMilestoneSchema = new mongoose.Schema({
  status: { type: String, enum: ['pending', 'sending', 'sent', 'failed', 'skipped'] },
  claimedAt: { type: Date },
  sentAt: { type: Date },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date },
  lastReason: { type: String },
}, { _id: false });

const appointmentSchema = new mongoose.Schema({
  tokenNumber: { type: String, unique: true, sparse: true, index: true },
  uhid: { type: String, index: true },
  patient: { type: String, required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctor: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  department: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  status: { type: String, enum: APPOINTMENT_STATUSES, default: APPOINTMENT_STATUS.PENDING },
  // APPT-B-08: `patientId` is canonically the USER id on every write path.
  // `patientRecordId` is the linked Patient document, which for a genuine
  // walk-in with no account is the ONLY identifier that exists — keeping it in a
  // separately-named field stops a Patient._id from ever being compared against
  // a User id (the bug that made walk-in appointments invisible to their own
  // patient and un-cancellable by them).
  patientRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', index: true },
  // PAY-B-08: explicit checkout hold expiry. The stale-cleanup job used to infer
  // "abandoned" from `createdAt` alone, which raced an in-flight payment webhook
  // and could delete an appointment whose payment was about to settle.
  checkoutExpiresAt: { type: Date, default: null, index: true },
  cancellationReason: { type: String, default: '' },
  cancelledAt: { type: Date },
  // A5 (5.md §2.4): the cancellation decision, recorded on the row so the
  // refund and the fee can be reconstructed without replaying the request.
  //   cancelledBy       — who triggered it (patient tier table vs provider
  //                       always-full-refund are different rules);
  //   cancellationTier  — which band of the tier table the start time fell in;
  //   cancellationFee   — what the provider KEPT (policy amount);
  //   refundAmount      — what the policy says the patient gets back; the
  //                       payment's own refund_amount records what was actually
  //                       issued, so a gateway refusal leaves both auditable.
  cancelledBy: { type: String, enum: ['patient', 'provider', 'system'] },
  cancellationTier: { type: String, enum: ['early', 'mid', 'late', 'no_show'] },
  cancellationFee: { type: Number, default: 0 },
  refundAmount: { type: Number, default: 0 },
  priority: { type: String, enum: ['Normal', 'Urgent', 'Emergency'], default: 'Normal' },
  type: { type: String, enum: ['Consultation', 'Follow-up', 'Check-up', 'Emergency', 'Chat Consultation', 'Video Consultation', 'Audio Call Consultation', 'Audio Consultation', 'Home Visit Consultation'], default: 'Consultation' },
  appointmentMode: { type: String, enum: ['chat', 'video', 'audio', 'voice', 'call', 'offline', 'in_person', 'home_visit', 'home'], default: 'offline' },
  patientLocation: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String, default: '' },
    updatedAt: { type: Date },
    transitStatus: { 
      type: String, 
      enum: ['pending_departure', 'on_the_way', 'nearby', 'arrived', 'completed'], 
      default: 'pending_departure' 
    },
    etaMinutes: { type: Number },
    distanceKm: { type: Number },
  },
  notes: { type: String, default: '' },
  symptoms: { type: String, default: '' },
  // Mind package booking (counsellor/psychiatrist BookingModal se)
  packageId: { type: String, default: '' },
  packageName: { type: String, default: '' },
  packageSessions: { type: Number, default: 0 },
  preConsultationDetails: {
    chiefComplaint: { type: String, default: '' },
    chiefComplaintOther: { type: String, default: '' },
    symptomsDuration: { type: String, default: '' },
    pastMedicalHistory: {
      hasHistory: { type: Boolean, default: false },
      details: { type: String, default: '' }
    },
    currentTreatment: {
      hasPastTreatment: { type: Boolean, default: false },
      doctorName: { type: String, default: '' },
      cityState: { type: String, default: '' },
      when: { type: String, default: '' },
      prescriptionFile: { type: String, default: '' },
      takingMedicines: { type: Boolean, default: false }
    },
    testReports: {
      hasReports: { type: Boolean, default: false },
      reportFile: { type: String, default: '' }
    },
    currentMedications: {
      hasMedications: { type: Boolean, default: false },
      details: { type: String, default: '' }
    },
    allergies: {
      hasAllergies: { type: Boolean, default: false },
      details: { type: String, default: '' }
    },
    familyHistory: {
      hasHistory: { type: Boolean, default: false },
      details: { type: String, default: '' }
    },
    filledAt: { type: Date }
  },
  services: [{ type: String }],
  fees: { type: Number, default: 0 },
  queuePosition: { type: Number, default: 0 },
  estimatedWaitTime: { type: Number, default: 0 }, // minutes
  checkedInAt: { type: Date },
  consultationStartTime: { type: Date },
  consultationEndTime: { type: Date },
  followUpDate: { type: Date },
  reminderSent: { type: Boolean, default: false },
  // NOTIF-M-03: T-24h/T-2h reminder state (see reminderMilestoneSchema above).
  reminderState: {
    t24: { type: reminderMilestoneSchema },
    t2: { type: reminderMilestoneSchema },
  },
  // APPT-M-02: an occurrence of a recurring series. The series is a container
  // for bookkeeping only - every occurrence is a real Appointment, so queueing,
  // reminders, billing, cancellation and waitlist fan-out all keep working
  // unchanged on each child.
  seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppointmentSeries', index: true },
  seriesIndex: { type: Number },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  // A3-part-2: what the patient actually bought. Optional so the decade of
  // walk-in/desk rows without a catalog stays valid — when present, POST
  // guarantees the service is active and its practitioner matches the booked
  // doctor (or is unassigned, e.g. lab panels).
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

appointmentSchema.index({ doctorId: 1, patientId: 1, date: 1, time: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['Pending', 'Confirmed', 'In Queue', 'Serving'] }, doctorId: { $type: 'objectId' } } });

// Query performance indexes — terminal me 3-8 second slow queries aa rahe
// the kyunki doctorId, date, status, patientId individually indexed nahi the.
// Atlas free-tier + bina index ke collection scan = har appointment list slow.
appointmentSchema.index({ doctorId: 1, date: -1 });     // doctor/clinic appointment list
appointmentSchema.index({ patientId: 1, date: -1 });     // patient my-appointments
appointmentSchema.index({ hospitalId: 1, date: -1 });    // hospital admin dashboard
appointmentSchema.index({ providerId: 1, date: -1 });    // provider booking lists (7.md dashboards)
appointmentSchema.index({ status: 1, createdAt: -1 });   // stale pending cleanup + status filters
appointmentSchema.index({ date: -1 });                    // date-based queries

// createdAt/updatedAt auto-maintained (updatedAt fallback for completion time)
appointmentSchema.set('timestamps', true);

export default mongoose.model('Appointment', appointmentSchema);
