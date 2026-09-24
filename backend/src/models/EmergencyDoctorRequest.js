import mongoose from 'mongoose';

const emergencyDoctorRequestSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    patientPhone: {
      type: String,
      required: true,
      trim: true,
    },
    patientAge: {
      type: Number,
    },
    patientGender: {
      type: String,
      enum: ['Male', 'Female', 'Other', ''],
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown', ''],
      default: 'Unknown',
    },
    medicalSummary: {
      knownAllergies: [{ type: String }],
      chronicConditions: [{ type: String }],
      currentMedications: [{ type: String }],
    },

    // Location of Emergency (GeoJSON 2dsphere)
    pickupLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    pickupAddress: {
      type: String,
      required: true,
      trim: true,
    },
    landmark: {
      type: String,
      trim: true,
    },

    // Clinical Triage Category
    emergencyCategory: {
      type: String,
      enum: [
        'Cardiovascular / Chest Pain',
        'Respiratory Distress / Asthma',
        'Severe Trauma / Bleeding',
        'Pediatric High Fever / Seizures',
        'Loss of Consciousness / Stroke',
        'Severe Anaphylaxis / Allergy',
        'Acute Abdominal Crisis',
        'General Medical Emergency',
      ],
      default: 'General Medical Emergency',
      required: true,
    },
    symptomsDescription: {
      type: String,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['Critical', 'Severe', 'Moderate'],
      default: 'Severe',
    },

    // Dispatched Doctor & Clinic Association
    assignedDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      index: true,
    },
    assignedDoctorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Facility',
    },

    // Lifecycle Status
    status: {
      type: String,
      enum: [
        'searching',
        'assigned',
        'en_route',
        'arrived',
        'in_triage',
        'completed',
        'cancelled_by_user',
        'cancelled_by_doctor',
        'escalated_to_ambulance',
        'expired',
      ],
      default: 'searching',
      index: true,
    },

    // Real-Time Transit Telemetry
    doctorLiveLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: [Number], // [lng, lat]
      heading: Number,
      speed: Number,
      updatedAt: Date,
    },
    estimatedArrivalMinutes: {
      type: Number,
    },
    transitDistanceKm: {
      type: Number,
    },

    // Financial & Payment Ledger
    pricing: {
      baseEmergencyFee: { type: Number, default: 800 },
      distanceFee: { type: Number, default: 0 },
      statMedicationsFee: { type: Number, default: 0 },
      taxAmount: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 800 },
      platformCommission: { type: Number, default: 80 },
      netDoctorPayout: { type: Number, default: 720 },
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Authorized', 'Paid', 'Refunded', 'Waived'],
      default: 'Pending',
    },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'Card', 'Cash', 'Wallet', 'Insurance'],
      default: 'UPI',
    },

    // Clinical Treatment & First-Aid Summary
    clinicalReport: {
      vitalsAtArrival: {
        pulseRate: Number,
        bloodPressureSys: Number,
        bloodPressureDia: Number,
        spO2Percentage: Number,
        respiratoryRate: Number,
        temperatureFahrenheit: Number,
      },
      initialAssessment: String,
      immediateInterventions: [String],
      statPrescriptions: [
        {
          drugName: String,
          dosage: String,
          route: { type: String, enum: ['Oral', 'IM', 'IV', 'Inhalation', 'Sublingual'] },
          frequency: String,
          instructions: String,
        },
      ],
      hospitalReferralNeeded: { type: Boolean, default: false },
      referredHospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
      doctorSignatureDate: Date,
    },

    // Audit Trail Timestamps
    timeline: [
      {
        stage: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: String,
        coordinates: [Number],
      },
    ],
    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor', 'system'],
    },
    cancellationReason: String,
  },
  { timestamps: true }
);

// Geospatial 2dsphere index for location searching
emergencyDoctorRequestSchema.index({ pickupLocation: '2dsphere' });
emergencyDoctorRequestSchema.index({ 'doctorLiveLocation.coordinates': '2dsphere' });

export default mongoose.model('EmergencyDoctorRequest', emergencyDoctorRequestSchema);
