import mongoose from 'mongoose';
import { generate16DigitId } from '../utils/idGenerator.js';

const doctorSchema = new mongoose.Schema({
  doctorId: { type: String, unique: true, sparse: true, index: true },
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  experience: { type: String, default: '1 year' },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  patients: { type: Number, default: 0 },
  available: { type: Boolean, default: true },
  phone: { type: String, default: '' },
  email: { type: String, required: true, unique: true },
  initials: { type: String, default: '' },
  department: { type: String, default: '' },
  consultation_fees: { alias: 'consultationFees', type: Number, default: 500 },
  location: { type: String, default: '' },
  profile_photo: { alias: 'profilePhoto', type: String, default: '' },
  qualifications: { type: String, default: '' },
  bio: { type: String, default: '' },
  time_slots: { alias: 'timeSlots', type: [String], default: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'] },
  weekly_schedule: { alias: 'weeklySchedule',
    type: Object,
    default: {
      monday: true, tuesday: true, wednesday: true,
      thursday: true, friday: true, saturday: false, sunday: false
    }
  },
  leaves: { type: [String], default: [] },
  leaveBalance: {
    sick: { type: Number, default: 12 },
    casual: { type: Number, default: 15 },
    earned: { type: Number, default: 20 },
    personal: { type: Number, default: 10 },
    maternity: { type: Number, default: 90 },
  },
  approved: { type: Boolean, default: false },
  user_id: { alias: 'userId', type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  facilityType: { type: String, enum: ['hospital', 'clinic', 'lab', 'pharmacy', ''], default: '' },
  reviews_count: { alias: 'reviewsCount', type: Number, default: 0 },
  signatureUrl: { type: String, default: '' },
  // §8 doctor settings master (persisted from DoctorProfile UI).
  settings: {
    emergencyOnCall: { type: Boolean, default: false },
    refundGuarantee: { type: String, enum: ['auto-refund', 'manual-review', 'no-refund'], default: 'auto-refund' },
    videoFee: { type: Number, default: 0, min: 0 },
    inPersonFee: { type: Number, default: 0, min: 0 },
    emergencyFee: { type: Number, default: 0, min: 0 },
    followUpFee: { type: String, default: '' },
    followUpWindow: { type: String, default: '7 Days' },
    bufferTime: { type: String, default: '5 min' },
    vacationFrom: { type: String, default: '' },
    vacationTo: { type: String, default: '' },
    vacationReason: { type: String, default: '' },
    councilName: { type: String, default: '' },
    councilRegNo: { type: String, default: '' },
    councilYear: { type: String, default: '' },
    payoutUpi: { type: String, default: '' },
    payoutAccount: { type: String, default: '' },
    payoutIfsc: { type: String, default: '' },
  },
  doctor_type: { alias: 'doctorType', type: String, enum: ['hospital', 'clinic'], default: 'hospital' },
  languages: { type: [String], default: [] },
  practice_type: { alias: 'practiceType', type: String, enum: ['private', 'corporate', ''], default: '' },
  areas_of_expertise: { alias: 'areasOfExpertise', type: [String], default: [] },
  services_offered: { alias: 'servicesOffered', type: [String], default: [] },
  surgeries_procedures: { alias: 'surgeriesProcedures', type: [String], default: [] },
  education: { type: [Object], default: [] },
  work_experience: { alias: 'workExperience', type: [Object], default: [] },
  memberships: { type: [String], default: [] },
  awards: { type: [String], default: [] },
  registrations: { type: Object, default: {} },
  clinic_reception_phone: { alias: 'clinicReceptionPhone', type: String, default: '' },
  walk_in_accepted: { alias: 'walkInAccepted', type: Boolean, default: false },
  in_house_pharmacy: { alias: 'inHousePharmacy', type: Boolean, default: false },
  in_house_lab: { alias: 'inHouseLab', type: Boolean, default: false },
  admission_available: { alias: 'admissionAvailable', type: Boolean, default: false },
  emergency_consultation: { alias: 'emergencyConsultation', type: Boolean, default: false },
  emergencySupport: { type: Boolean, default: false },
  isEmergencyDutyActive: { type: Boolean, default: false },
  activeDispatchRequestId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  emergencyRadiusKm: { type: Number, default: 10 },
  emergencyDoctorLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [79.9864, 23.1815] },
    lat: { type: Number, default: 23.1815 },
    lng: { type: Number, default: 79.9864 },
    h3Index8: { type: String, index: true, default: null },
    h3Index9: { type: String, index: true, default: null },
    lastUpdatedAt: { type: Date, default: null },
  },
  emergencyEquipmentKit: {
    type: [String],
    default: ['BLS Kit', 'Pulse Oximeter', 'BP Monitor', 'Nebulizer', 'Glucometer', 'Emergency Injection Kit'],
  },
  refundOnMissedOrCancelled: { type: Boolean, default: true },
  appointmentModes: {
    type: [String],
    enum: ['chat', 'video', 'offline', 'home_visit', 'home', 'audio', 'voice', 'call'],
    default: ['chat', 'video', 'offline', 'home_visit', 'audio'],
  },
  appointmentFees: {
    chat: { type: Number, default: 300 },
    video: { type: Number, default: 500 },
    audio: { type: Number, default: 400 },
    offline: { type: Number, default: 500 },
    home_visit: { alias: 'homeVisit', type: Number, default: 800 },
  },
  supportPlanPrices: {
    oneTime: { type: Number, default: 0 },
    shortTerm: { type: Number, default: 0 },
    mediumTerm: { type: Number, default: 0 },
    longTerm: { type: Number, default: 0 },
  },
  chat_fee: { alias: 'chatFee', type: Number, default: 300 },
  video_fee: { alias: 'videoFee', type: Number, default: 500 },
  audio_fee: { alias: 'audioFee', type: Number, default: 400 },
  offline_fee: { alias: 'offlineFee', type: Number, default: 500 },
  home_visit_fee: { alias: 'homeVisitFee', type: Number, default: 1000 },
  emergency_fee: { alias: 'emergencyFee', type: Number, default: 800 },
  surgery_available: { alias: 'surgeryAvailable', type: Boolean, default: false },
  home_visit: { alias: 'homeVisit', type: Boolean, default: false },
  payment_modes: { alias: 'paymentModes', type: [String], default: ['Cash', 'UPI', 'Card'] },
  opd_timings: { alias: 'opdTimings', type: String, default: '9:00 AM – 5:00 PM' },
  workingHours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' },
  },
  slotDuration: { type: Number, default: 15 },
  bufferPerHour: { type: Number, default: 1 },
  autoConfirmAppointment: { type: Boolean, default: null },
  maxBookingsPerSlot: { type: Number, default: 1, min: 1 },
  disabled_time_slots: { alias: 'disabledTimeSlots', type: [String], default: [] },
  breakTime: {
    start: { type: String, default: '' },
    end: { type: String, default: '' },
  },
  // Per-date disabled slots: { "2026-07-27": ["09:00 AM", "09:15 AM"], ... }
  dateDisabledSlots: { type: Object, default: {} },
  // Booking window: patients can only book within this range from today.
  // unit: 'hours' | 'days' | 'weeks' | 'months', value: number
  bookingWindow: {
    unit: { type: String, enum: ['hours', 'days', 'weeks', 'months'], default: 'weeks' },
    value: { type: Number, default: 2, min: 0 },
  },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

doctorSchema.pre('save', async function (next) {
  if (!this.doctorId) {
    this.doctorId = generate16DigitId();
  }
  next();
});

doctorSchema.index({ facilityId: 1, approved: 1 });
doctorSchema.index({ hospitalId: 1, approved: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ department: 1 });
doctorSchema.index({ emergencyDoctorLocation: '2dsphere' });
doctorSchema.index({ isEmergencyDutyActive: 1, emergencySupport: 1 });
doctorSchema.index({ createdAt: -1 });

export default mongoose.model('Doctor', doctorSchema);
