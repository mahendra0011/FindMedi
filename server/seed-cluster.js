import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import Doctor from './models/Doctor.js';
import Patient from './models/Patient.js';
import Appointment from './models/Appointment.js';
import Record from './models/Record.js';
import Billing from './models/Billing.js';
import Review from './models/Review.js';
import Notification from './models/Notification.js';
import { configureMongoDns } from './config/mongoDns.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
configureMongoDns();

const DEFAULT_PASSWORD = 'password';
const DATABASE_NAME = 'medicore';

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const buildMongoUri = () => {
  let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/medicore';

  if (mongoUri.includes('<username>') || mongoUri.includes('<password>')) {
    throw new Error('MONGO_URI still contains placeholders. Add the real MongoDB Atlas connection string in server/.env.');
  }

  try {
    const url = new URL(mongoUri);
    if (!url.pathname || url.pathname === '/') {
      url.pathname = `/${DATABASE_NAME}`;
      mongoUri = url.toString();
    }
  } catch {
    console.warn('Could not parse MONGO_URI, using it as provided.');
  }

  return mongoUri;
};

const avatarUrl = (name, background) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${background}&color=fff&size=256&bold=true`;

const doctorSeeds = [
  {
    name: 'Dr. Sarah Smith',
    email: 'sarah.smith@mediCore.com',
    specialization: 'Cardiology',
    department: 'Cardiology',
    experience: '12 years',
    qualification: 'MBBS, MD Cardiology',
    licenseNumber: 'MC-CARD-1001',
    consultationFee: 500,
    rating: 4.8,
    patients: 1250,
    reviews_count: 3,
    phone: '+91 98765 10001',
    location: 'MediCore Main Hospital, Floor 2',
    bio: 'Senior cardiologist focused on preventive heart care, hypertension, and cardiac rehabilitation.',
    time_slots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'],
    profile_photo: avatarUrl('Dr Sarah Smith', '2563eb'),
  },
  {
    name: 'Dr. Raj Patel',
    email: 'raj.patel@mediCore.com',
    specialization: 'Neurology',
    department: 'Neurology',
    experience: '8 years',
    qualification: 'MBBS, DM Neurology',
    licenseNumber: 'MC-NEUR-1002',
    consultationFee: 600,
    rating: 4.9,
    patients: 890,
    reviews_count: 2,
    phone: '+91 98765 10002',
    location: 'MediCore Neuro Care, Floor 3',
    bio: 'Neurologist treating migraine, seizure disorders, nerve pain, and stroke follow-up care.',
    time_slots: ['09:30 AM', '10:30 AM', '12:00 PM', '03:00 PM', '05:00 PM'],
    profile_photo: avatarUrl('Dr Raj Patel', '0f766e'),
  },
  {
    name: 'Dr. Emily Lee',
    email: 'emily.lee@mediCore.com',
    specialization: 'Orthopedics',
    department: 'Orthopedics',
    experience: '15 years',
    qualification: 'MBBS, MS Orthopedics',
    licenseNumber: 'MC-ORTH-1003',
    consultationFee: 450,
    rating: 4.7,
    patients: 2100,
    reviews_count: 2,
    phone: '+91 98765 10003',
    location: 'MediCore Ortho Wing, Floor 1',
    bio: 'Orthopedic surgeon specializing in joint pain, fracture care, and sports injury recovery.',
    time_slots: ['10:00 AM', '11:00 AM', '01:00 PM', '03:00 PM'],
    profile_photo: avatarUrl('Dr Emily Lee', '7c3aed'),
  },
  {
    name: 'Dr. Carlos Garcia',
    email: 'carlos.garcia@mediCore.com',
    specialization: 'Pediatrics',
    department: 'Pediatrics',
    experience: '10 years',
    qualification: 'MBBS, DCH Pediatrics',
    licenseNumber: 'MC-PED-1004',
    consultationFee: 350,
    rating: 4.6,
    patients: 1800,
    reviews_count: 1,
    phone: '+91 98765 10004',
    location: 'MediCore Child Care, Floor 1',
    bio: 'Pediatrician supporting newborn care, vaccination planning, and child wellness visits.',
    time_slots: ['09:00 AM', '10:00 AM', '11:30 AM', '02:30 PM', '04:30 PM'],
    profile_photo: avatarUrl('Dr Carlos Garcia', 'dc2626'),
  },
  {
    name: 'Dr. Min Kim',
    email: 'min.kim@mediCore.com',
    specialization: 'Dermatology',
    department: 'Dermatology',
    experience: '9 years',
    qualification: 'MBBS, MD Dermatology',
    licenseNumber: 'MC-DERM-1005',
    consultationFee: 400,
    rating: 4.8,
    patients: 970,
    reviews_count: 2,
    phone: '+91 98765 10005',
    location: 'MediCore Skin Clinic, Floor 2',
    bio: 'Dermatologist for acne, allergy, skin infection, hair care, and long-term skin health.',
    time_slots: ['09:30 AM', '11:00 AM', '12:30 PM', '03:30 PM'],
    profile_photo: avatarUrl('Dr Min Kim', '0891b2'),
  },
  {
    name: 'Dr. Anna Wilson',
    email: 'anna.wilson@mediCore.com',
    specialization: 'Oncology',
    department: 'Oncology',
    experience: '14 years',
    qualification: 'MBBS, DM Oncology',
    licenseNumber: 'MC-ONCO-1006',
    consultationFee: 700,
    rating: 4.9,
    patients: 760,
    reviews_count: 2,
    phone: '+91 98765 10006',
    location: 'MediCore Oncology Center, Floor 4',
    bio: 'Oncologist focused on treatment planning, chemotherapy monitoring, and survivorship care.',
    time_slots: ['10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM'],
    profile_photo: avatarUrl('Dr Anna Wilson', 'be123c'),
  },
];

const patientSeeds = [
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+91 98765 20001',
    gender: 'Female',
    dateOfBirth: '1990-04-12',
    age: 36,
    disease: 'Hypertension',
    bloodGroup: 'A+',
    address: 'Green Park, New Delhi',
    doctorEmail: 'sarah.smith@mediCore.com',
    status: 'Active',
  },
  {
    name: 'Mike Chen',
    email: 'mike.chen@email.com',
    phone: '+91 98765 20002',
    gender: 'Male',
    dateOfBirth: '1981-09-20',
    age: 44,
    disease: 'Migraine',
    bloodGroup: 'O-',
    address: 'Salt Lake, Kolkata',
    doctorEmail: 'raj.patel@mediCore.com',
    status: 'Active',
  },
  {
    name: 'Emma Wilson',
    email: 'emma.wilson@email.com',
    phone: '+91 98765 20003',
    gender: 'Female',
    dateOfBirth: '1998-01-05',
    age: 28,
    disease: 'Knee Pain',
    bloodGroup: 'B+',
    address: 'Indiranagar, Bengaluru',
    doctorEmail: 'emily.lee@mediCore.com',
    status: 'Discharged',
  },
  {
    name: 'James Brown',
    email: 'james.brown@email.com',
    phone: '+91 98765 20004',
    gender: 'Male',
    dateOfBirth: '1964-07-18',
    age: 61,
    disease: 'Chest Pain',
    bloodGroup: 'AB+',
    address: 'Bandra West, Mumbai',
    doctorEmail: 'sarah.smith@mediCore.com',
    status: 'Critical',
  },
  {
    name: 'John Patient',
    email: 'patient@mediCore.com',
    phone: '+91 98765 20005',
    gender: 'Male',
    dateOfBirth: '1996-06-10',
    age: 29,
    disease: 'General Checkup',
    bloodGroup: 'O+',
    address: 'Civil Lines, Jaipur',
    doctorEmail: 'carlos.garcia@mediCore.com',
    status: 'Active',
  },
];

const labServices = [
  { id: 'fbc', name: 'Full Blood Count', price: 300, category: 'Lab' },
  { id: 'lipid_profile', name: 'Lipid Profile', price: 450, category: 'Lab' },
  { id: 'thyroid', name: 'Thyroid Panel', price: 500, category: 'Lab' },
];

const initialsFor = (name) => name
  .split(' ')
  .filter(Boolean)
  .map(part => part[0])
  .join('')
  .slice(0, 2)
  .toUpperCase();

const upsertUser = async (data) => {
  const email = data.email.toLowerCase();
  const existing = await User.findOne({ email });
  const payload = {
    ...data,
    email,
    status: 'active',
    isVerified: true,
  };

  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return existing;
  }

  return User.create({
    ...payload,
    password: DEFAULT_PASSWORD,
  });
};

const upsertDoctor = async (seed, user) => Doctor.findOneAndUpdate(
  { $or: [{ email: seed.email.toLowerCase() }, { user_id: user._id.toString() }] },
  {
    $set: {
      name: seed.name,
      email: seed.email.toLowerCase(),
      specialization: seed.specialization,
      department: seed.department,
      experience: seed.experience,
      phone: seed.phone,
      initials: initialsFor(seed.name),
      fees: seed.consultationFee,
      consultation_fees: seed.consultationFee,
      rating: seed.rating,
      patients: seed.patients,
      reviews_count: seed.reviews_count,
      available: true,
      approved: true,
      user_id: user._id.toString(),
      location: seed.location,
      profile_photo: seed.profile_photo,
      qualifications: seed.qualification,
      bio: seed.bio,
      time_slots: seed.time_slots,
      weekly_schedule: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: seed.specialization === 'Pediatrics',
        sunday: false,
      },
      leaves: [],
    },
  },
  { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
);

const upsertPatient = async (seed, user, doctor) => Patient.findOneAndUpdate(
  { $or: [{ userId: user._id }, { email: seed.email.toLowerCase() }] },
  {
    $set: {
      name: seed.name,
      age: seed.age,
      gender: seed.gender,
      disease: seed.disease,
      doctor: doctor?.name || '',
      doctorId: doctor?._id,
      userId: user._id,
      phone: seed.phone,
      email: seed.email.toLowerCase(),
      address: seed.address,
      bloodGroup: seed.bloodGroup,
      admitted: new Date(),
      status: seed.status,
    },
  },
  { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
);

const upsertOne = (Model, filter, update) => Model.findOneAndUpdate(
  filter,
  { $set: update },
  { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
);

const dropObsoleteReviewIndexes = async () => {
  const indexes = await Review.collection.indexes();
  const obsoleteIndex = indexes.find(index =>
    index.name === 'appointment_1_student_1'
    || (index.unique && index.key?.appointment === 1 && index.key?.student === 1)
  );

  if (obsoleteIndex) {
    await Review.collection.dropIndex(obsoleteIndex.name);
    console.log(`Dropped obsolete reviews index: ${obsoleteIndex.name}`);
  }
};

const main = async () => {
  const mongoUri = buildMongoUri();
  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    family: 4,
    bufferCommands: false,
  });

  console.log('Connected to MongoDB. Seeding demo data with upserts...');
  await dropObsoleteReviewIndexes();

  const admin = await upsertUser({
    name: 'Admin User',
    email: 'admin@mediCore.com',
    role: 'admin',
    phone: '+91 98765 00001',
    gender: 'Other',
    dateOfBirth: new Date('1990-01-01'),
    approvalStatus: 'not_required',
  });

  const doctorMap = new Map();
  for (const seed of doctorSeeds) {
    const user = await upsertUser({
      name: seed.name,
      email: seed.email,
      role: 'doctor',
      phone: seed.phone,
      specialization: seed.specialization,
      experience: seed.experience,
      qualification: seed.qualification,
      licenseNumber: seed.licenseNumber,
      consultationFee: seed.consultationFee,
      avatar: seed.profile_photo,
      approvalStatus: 'approved',
    });

    const doctor = await upsertDoctor(seed, user);
    doctorMap.set(seed.email.toLowerCase(), { user, doctor });
  }

  const patientMap = new Map();
  for (const seed of patientSeeds) {
    const assignedDoctor = doctorMap.get(seed.doctorEmail.toLowerCase())?.doctor;
    const user = await upsertUser({
      name: seed.name,
      email: seed.email,
      role: 'patient',
      phone: seed.phone,
      gender: seed.gender,
      dateOfBirth: new Date(seed.dateOfBirth),
      address: seed.address,
      approvalStatus: 'not_required',
    });

    const patient = await upsertPatient(seed, user, assignedDoctor);
    patientMap.set(seed.email.toLowerCase(), { user, patient, doctor: assignedDoctor });
  }

  const sarahPatient = patientMap.get('sarah.johnson@email.com');
  const mikePatient = patientMap.get('mike.chen@email.com');
  const emmaPatient = patientMap.get('emma.wilson@email.com');
  const jamesPatient = patientMap.get('james.brown@email.com');
  const johnPatient = patientMap.get('patient@medicore.com');

  const sarahDoctor = doctorMap.get('sarah.smith@medicore.com')?.doctor;
  const rajDoctor = doctorMap.get('raj.patel@medicore.com')?.doctor;
  const emilyDoctor = doctorMap.get('emily.lee@medicore.com')?.doctor;
  const carlosDoctor = doctorMap.get('carlos.garcia@medicore.com')?.doctor;

  const appointmentSeeds = [
    {
      patientRef: sarahPatient,
      doctor: sarahDoctor,
      department: 'Cardiology',
      date: tomorrow,
      time: '10:00 AM',
      status: 'Confirmed',
      type: 'Follow-up',
      symptoms: 'Regular hypertension follow-up',
      notes: 'Bring latest BP readings.',
    },
    {
      patientRef: mikePatient,
      doctor: rajDoctor,
      department: 'Neurology',
      date: tomorrow,
      time: '11:30 AM',
      status: 'Pending',
      type: 'Consultation',
      symptoms: 'Headache and dizziness',
      notes: 'Evaluate migraine pattern.',
    },
    {
      patientRef: emmaPatient,
      doctor: emilyDoctor,
      department: 'Orthopedics',
      date: today,
      time: '02:00 PM',
      status: 'Completed',
      type: 'Check-up',
      symptoms: 'Knee pain follow-up',
      notes: 'Physiotherapy progress review.',
    },
    {
      patientRef: jamesPatient,
      doctor: sarahDoctor,
      department: 'Cardiology',
      date: today,
      time: '09:00 AM',
      status: 'Confirmed',
      type: 'Emergency',
      symptoms: 'Chest pain and breathlessness',
      notes: 'Emergency observation required.',
    },
    {
      patientRef: johnPatient,
      doctor: carlosDoctor,
      department: 'Pediatrics',
      date: inThreeDays,
      time: '03:00 PM',
      status: 'Pending',
      type: 'Consultation',
      symptoms: 'General wellness checkup',
      notes: 'Routine consultation.',
    },
  ];

  for (const item of appointmentSeeds) {
    if (!item.patientRef || !item.doctor) continue;
    await upsertOne(
      Appointment,
      {
        patientId: item.patientRef.user._id,
        doctorId: item.doctor._id,
        type: item.type,
        symptoms: item.symptoms,
      },
      {
        patient: item.patientRef.user.name,
        patientId: item.patientRef.user._id,
        doctor: item.doctor.name,
        doctorId: item.doctor._id,
        department: item.department,
        date: item.date,
        time: item.time,
        status: item.status,
        type: item.type,
        notes: item.notes,
        symptoms: item.symptoms,
      }
    );
  }

  const recordSeeds = [
    {
      patientRef: sarahPatient,
      doctor: sarahDoctor,
      date: today,
      type: 'prescription',
      diagnosis: 'Hypertension Stage 2',
      prescription: 'Amlodipine 5mg once daily after breakfast. Low salt diet. Review in 30 days.',
      notes: 'Monitor blood pressure twice daily and upload readings.',
      data: {
        medicines: [{ name: 'Amlodipine', dose: '5mg', frequency: 'Once daily', duration: '30 days' }],
        advice: 'Low salt diet, brisk walk 30 minutes, avoid smoking.',
      },
    },
    {
      patientRef: mikePatient,
      doctor: rajDoctor,
      date: today,
      type: 'prescription',
      diagnosis: 'Migraine with Aura',
      prescription: 'Sumatriptan 50mg as needed. Avoid triggers. Maintain sleep schedule.',
      notes: 'Neurology review if attacks increase.',
      data: {
        medicines: [{ name: 'Sumatriptan', dose: '50mg', frequency: 'As needed', duration: '7 days' }],
        advice: 'Hydration, regular sleep, reduce screen exposure during aura.',
      },
    },
    {
      patientRef: emmaPatient,
      doctor: emilyDoctor,
      date: today,
      type: 'lab_report',
      diagnosis: 'Mild inflammatory markers',
      prescription: '',
      notes: 'CBC and lipid profile reviewed.',
      data: {
        reportTitle: 'Orthopedic Follow-up Lab Report',
        tests: [
          { name: 'CBC', result: 'Normal', range: 'Within reference range' },
          { name: 'ESR', result: '22 mm/hr', range: '0-20 mm/hr' },
          { name: 'CRP', result: '5 mg/L', range: '< 6 mg/L' },
        ],
      },
    },
    {
      patientRef: emmaPatient,
      doctor: emilyDoctor,
      date: today,
      type: 'discharge_summary',
      diagnosis: 'Knee strain, improved',
      prescription: 'Continue physiotherapy twice weekly for 2 weeks.',
      notes: 'Patient discharged in stable condition with home exercises.',
      data: {
        admissionReason: 'Knee pain observation',
        dischargeCondition: 'Stable',
        followUp: 'Orthopedics OPD after 14 days',
      },
    },
  ];

  for (const item of recordSeeds) {
    if (!item.patientRef || !item.doctor) continue;
    await upsertOne(
      Record,
      {
        patientId: item.patientRef.user._id,
        doctorId: item.doctor._id,
        type: item.type,
        diagnosis: item.diagnosis,
      },
      {
        patient: item.patientRef.user.name,
        patientId: item.patientRef.user._id,
        doctor: item.doctor.name,
        doctorId: item.doctor._id,
        date: item.date,
        diagnosis: item.diagnosis,
        prescription: item.prescription,
        type: item.type,
        notes: item.notes,
        data: item.data,
        attachments: [],
      }
    );
  }

  const billingSeeds = [
    {
      invoiceId: 'INV-DEMO-0001',
      patientRef: sarahPatient,
      doctor: sarahDoctor,
      service: 'Cardiology Consultation',
      services: [],
      source: 'appointment',
      amount: 500,
      paid: 500,
      status: 'Paid',
      paymentMethod: 'card',
      transactionId: 'TXN-DEMO-0001',
    },
    {
      invoiceId: 'INV-DEMO-0002',
      patientRef: mikePatient,
      doctor: rajDoctor,
      service: 'Neurology Consultation',
      services: [],
      source: 'appointment',
      amount: 600,
      paid: 0,
      status: 'Pending',
      paymentMethod: '',
      transactionId: '',
    },
    {
      invoiceId: 'INV-LAB-DEMO-0001',
      patientRef: johnPatient,
      doctor: null,
      service: labServices.map(service => service.name).join(', '),
      services: labServices,
      source: 'lab',
      amount: labServices.reduce((sum, service) => sum + service.price, 0),
      paid: 0,
      status: 'Pending',
      paymentMethod: '',
      transactionId: '',
    },
  ];

  for (const item of billingSeeds) {
    if (!item.patientRef) continue;
    await upsertOne(
      Billing,
      { invoiceId: item.invoiceId },
      {
        invoiceId: item.invoiceId,
        patient: item.patientRef.user.name,
        patientId: item.patientRef.user._id,
        doctor: item.doctor?.name || 'Lab Services',
        doctorId: item.doctor?._id,
        service: item.service,
        services: item.services,
        source: item.source,
        amount: item.amount,
        paid: item.paid,
        status: item.status,
        date: today,
        dueDate: inThreeDays,
        paymentMethod: item.paymentMethod,
        transactionId: item.transactionId,
      }
    );
  }

  const reviewSeeds = [
    { doctor: sarahDoctor, patientName: 'Sarah Johnson', rating: 5, comment: 'Very clear explanation and calm treatment plan.' },
    { doctor: rajDoctor, patientName: 'Mike Chen', rating: 5, comment: 'Helped me understand my migraine triggers.' },
    { doctor: emilyDoctor, patientName: 'Emma Wilson', rating: 4, comment: 'Professional care and useful recovery exercises.' },
    { doctor: carlosDoctor, patientName: 'John Patient', rating: 5, comment: 'Friendly consultation and quick diagnosis.' },
  ];

  for (const item of reviewSeeds) {
    if (!item.doctor) continue;
    await upsertOne(
      Review,
      { doctorId: item.doctor._id.toString(), patientName: item.patientName },
      {
        doctorId: item.doctor._id.toString(),
        doctorName: item.doctor.name,
        patientName: item.patientName,
        rating: item.rating,
        comment: item.comment,
        date: today,
      }
    );
  }

  const notificationSeeds = [
    {
      userId: admin._id.toString(),
      title: 'Demo Data Ready',
      message: 'MediCore demo doctors, patients, records, invoices, and lab bookings are available.',
      type: 'system',
    },
    {
      userId: johnPatient.user._id.toString(),
      title: 'Lab Services Booked',
      message: 'Your Full Blood Count, Lipid Profile, and Thyroid Panel booking is ready in your dashboard.',
      type: 'payment',
    },
    {
      userId: sarahPatient.user._id.toString(),
      title: 'Appointment Reminder',
      message: 'Your cardiology follow-up is scheduled for tomorrow at 10:00 AM.',
      type: 'reminder',
    },
  ];

  for (const item of notificationSeeds) {
    await upsertOne(
      Notification,
      { userId: item.userId, title: item.title },
      {
        ...item,
        read: false,
        date: today,
      }
    );
  }

  const [userCount, doctorCount, patientCount, appointmentCount, recordCount, billCount] = await Promise.all([
    User.countDocuments(),
    Doctor.countDocuments(),
    Patient.countDocuments(),
    Appointment.countDocuments(),
    Record.countDocuments(),
    Billing.countDocuments(),
  ]);

  console.log('Seed complete.');
  console.log(`Users: ${userCount}`);
  console.log(`Doctors: ${doctorCount}`);
  console.log(`Patients: ${patientCount}`);
  console.log(`Appointments: ${appointmentCount}`);
  console.log(`Records: ${recordCount}`);
  console.log(`Billing records: ${billCount}`);
  console.log('');
  console.log('Demo login credentials:');
  console.log('Admin:   admin@mediCore.com / password / secret key medicore2580');
  console.log('Doctor:  sarah.smith@mediCore.com / password');
  console.log('Patient: patient@mediCore.com / password');
};

main()
  .catch((error) => {
    console.error('Cluster seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
