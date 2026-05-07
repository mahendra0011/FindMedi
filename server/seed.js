import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Doctor from './models/Doctor.js';
import Patient from './models/Patient.js';
import Appointment from './models/Appointment.js';
import Record from './models/Record.js';
import Billing from './models/Billing.js';
import Review from './models/Review.js';
import Notification from './models/Notification.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Build proper MongoDB URI with database name
let MONGO_URI = process.env.MONGO_URI;

// Check if URI contains placeholders and warn
if (MONGO_URI && (MONGO_URI.includes('<username>') || MONGO_URI.includes('<password>'))) {
  console.warn('⚠️  MONGO_URI appears to contain placeholders. Please set your actual MongoDB Atlas connection string in the environment variables.');
  console.warn('   Get your connection string from MongoDB Atlas -> Clusters -> Connect -> Driver');
}

// Parse URI to ensure database name is present
if (MONGO_URI) {
  try {
    const url = new URL(MONGO_URI);
    // If pathname is empty or just '/', add '/medicore'
    if (!url.pathname || url.pathname === '/') {
      url.pathname = '/medicore';
      MONGO_URI = url.toString();
    }
  } catch (e) {
    console.warn('⚠️ Could not parse MONGO_URI, using as-is');
  }
} else {
  MONGO_URI = 'mongodb://localhost:27017/medicore';
}

const hash = (p) => bcrypt.hash(p, 10);

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected. Clearing old data...');

  await Promise.all([
    User.deleteMany(), Doctor.deleteMany(), Patient.deleteMany(),
    Appointment.deleteMany(), Record.deleteMany(), Billing.deleteMany(),
    Review.deleteMany(), Notification.deleteMany(),
  ]);

  // Create Users first
  const adminUser = await User.create({ name: 'Admin User', email: 'admin@mediCore.com', password: await hash('password'), role: 'admin' });
  const doctorUser1 = await User.create({ name: 'Dr. Sarah Smith', email: 'sarah.smith@mediCore.com', password: await hash('password'), role: 'doctor', specialization: 'Cardiology' });
  const doctorUser2 = await User.create({ name: 'Dr. Raj Patel', email: 'raj.patel@mediCore.com', password: await hash('password'), role: 'doctor', specialization: 'Neurology' });
  const doctorUser3 = await User.create({ name: 'Dr. Emily Lee', email: 'emily.lee@mediCore.com', password: await hash('password'), role: 'doctor', specialization: 'Orthopedics' });
  const doctorUser4 = await User.create({ name: 'Dr. Carlos Garcia', email: 'carlos.garcia@mediCore.com', password: await hash('password'), role: 'doctor', specialization: 'Pediatrics' });
  
  const patientUser1 = await User.create({ name: 'Sarah Johnson', email: 'sarah.johnson@email.com', password: await hash('password'), role: 'patient', phone: '+1 555-0101' });
  const patientUser2 = await User.create({ name: 'Mike Chen', email: 'mike.chen@email.com', password: await hash('password'), role: 'patient', phone: '+1 555-0102' });
  const patientUser3 = await User.create({ name: 'Emma Wilson', email: 'emma.wilson@email.com', password: await hash('password'), role: 'patient', phone: '+1 555-0103' });
  const patientUser4 = await User.create({ name: 'James Brown', email: 'james.brown@email.com', password: await hash('password'), role: 'patient', phone: '+1 555-0104' });
  const patientUser5 = await User.create({ name: 'John Patient', email: 'patient@mediCore.com', password: await hash('password'), role: 'patient', phone: '+1 555-0100' });

  console.log('Created users...');

  // Create Doctors with user_id references
  const doctors = await Doctor.insertMany([
    { name: 'Dr. Sarah Smith', specialization: 'Cardiology', experience: '12 years', rating: 4.8, patients: 1250, available: true, phone: '+1 234-567-8901', email: 'sarah.smith@mediCore.com', initials: 'SS', department: 'Cardiology', fees: 500, consultation_fees: 500, location: 'New York, NY', qualifications: 'MBBS, MD Cardiology', bio: 'Expert cardiologist with 12 years of experience.', time_slots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'], weekly_schedule: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false }, leaves: [], approved: true, user_id: doctorUser1._id.toString(), reviews_count: 3 },
    { name: 'Dr. Raj Patel', specialization: 'Neurology', experience: '8 years', rating: 4.9, patients: 890, available: true, phone: '+1 234-567-8902', email: 'raj.patel@mediCore.com', initials: 'RP', department: 'Neurology', fees: 600, consultation_fees: 600, location: 'Los Angeles, CA', qualifications: 'MBBS, DM Neurology', bio: 'Specialized in neurological disorders.', time_slots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'], weekly_schedule: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: false }, leaves: [], approved: true, user_id: doctorUser2._id.toString(), reviews_count: 2 },
    { name: 'Dr. Emily Lee', specialization: 'Orthopedics', experience: '15 years', rating: 4.7, patients: 2100, available: true, phone: '+1 234-567-8903', email: 'emily.lee@mediCore.com', initials: 'EL', department: 'Orthopedics', fees: 450, consultation_fees: 450, location: 'Chicago, IL', qualifications: 'MBBS, MS Orthopedics', bio: 'Bone and joint specialist.', time_slots: ['10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM'], weekly_schedule: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: false, saturday: false, sunday: false }, leaves: [], approved: true, user_id: doctorUser3._id.toString(), reviews_count: 0 },
    { name: 'Dr. Carlos Garcia', specialization: 'Pediatrics', experience: '10 years', rating: 4.6, patients: 1800, available: true, phone: '+1 234-567-8904', email: 'carlos.garcia@mediCore.com', initials: 'CG', department: 'Pediatrics', fees: 350, consultation_fees: 350, location: 'Houston, TX', qualifications: 'MBBS, DCH Pediatrics', bio: 'Dedicated pediatrician.', time_slots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'], weekly_schedule: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: false }, leaves: [], approved: true, user_id: doctorUser4._id.toString(), reviews_count: 1 },
  ]);

  console.log('Created doctors...');

  // Create Patients
  const patients = await Patient.insertMany([
    { name: 'Sarah Johnson', age: 34, gender: 'Female', disease: 'Hypertension', doctor: 'Dr. Sarah Smith', phone: '+1 555-0101', email: 'sarah.johnson@email.com', bloodGroup: 'A+', admitted: new Date('2024-03-15'), status: 'Active', userId: patientUser1._id },
    { name: 'Mike Chen', age: 45, gender: 'Male', disease: 'Diabetes Type 2', doctor: 'Dr. Raj Patel', phone: '+1 555-0102', email: 'mike.chen@email.com', bloodGroup: 'O-', admitted: new Date('2024-03-12'), status: 'Active', userId: patientUser2._id },
    { name: 'Emma Wilson', age: 28, gender: 'Female', disease: 'Asthma', doctor: 'Dr. Emily Lee', phone: '+1 555-0103', email: 'emma.wilson@email.com', bloodGroup: 'B+', admitted: new Date('2024-03-10'), status: 'Discharged', userId: patientUser3._id },
    { name: 'James Brown', age: 62, gender: 'Male', disease: 'Heart Disease', doctor: 'Dr. Sarah Smith', phone: '+1 555-0104', email: 'james.brown@email.com', bloodGroup: 'AB+', admitted: new Date('2024-03-08'), status: 'Active', userId: patientUser4._id },
    { name: 'John Patient', age: 30, gender: 'Male', disease: 'General Checkup', doctor: 'Dr. Carlos Garcia', phone: '+1 555-0100', email: 'patient@mediCore.com', bloodGroup: 'O+', admitted: new Date(), status: 'Active', userId: patientUser5._id },
  ]);

  console.log('Created patients...');

  // Create Appointments with user references
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  await Appointment.insertMany([
    { patient: 'Sarah Johnson', patientId: patientUser1._id, doctor: 'Dr. Sarah Smith', doctorId: doctors[0]._id, department: 'Cardiology', date: tomorrow, time: '10:00 AM', status: 'Confirmed', type: 'Follow-up', symptoms: 'Regular checkup for hypertension' },
    { patient: 'Mike Chen', patientId: patientUser2._id, doctor: 'Dr. Raj Patel', doctorId: doctors[1]._id, department: 'Neurology', date: tomorrow, time: '11:30 AM', status: 'Pending', type: 'Consultation', symptoms: 'Headache and dizziness' },
    { patient: 'Emma Wilson', patientId: patientUser3._id, doctor: 'Dr. Emily Lee', doctorId: doctors[2]._id, department: 'Orthopedics', date: today, time: '2:00 PM', status: 'Completed', type: 'Check-up', symptoms: 'Knee pain follow-up' },
    { patient: 'James Brown', patientId: patientUser4._id, doctor: 'Dr. Sarah Smith', doctorId: doctors[0]._id, department: 'Cardiology', date: today, time: '9:00 AM', status: 'Confirmed', type: 'Emergency', symptoms: 'Chest pain' },
    { patient: 'John Patient', patientId: patientUser5._id, doctor: 'Dr. Carlos Garcia', doctorId: doctors[3]._id, department: 'Pediatrics', date: tomorrow, time: '3:00 PM', status: 'Pending', type: 'Consultation', symptoms: 'Annual checkup' },
  ]);

  console.log('Created appointments...');

  // Create Medical Records
  await Record.insertMany([
    { patient: 'Sarah Johnson', patientId: patientUser1._id, doctor: 'Dr. Sarah Smith', doctorId: doctors[0]._id, date: '2024-03-15', diagnosis: 'Hypertension Stage 2', prescription: 'Amlodipine 5mg daily\nLifestyle modifications\nLow salt diet', type: 'Diagnosis' },
    { patient: 'Mike Chen', patientId: patientUser2._id, doctor: 'Dr. Raj Patel', doctorId: doctors[1]._id, date: '2024-03-14', diagnosis: 'Migraine with Aura', prescription: 'Sumatriptan 50mg PRN\nAvoid triggers\nRegular sleep schedule', type: 'Prescription' },
    { patient: 'Emma Wilson', patientId: patientUser3._id, doctor: 'Dr. Emily Lee', doctorId: doctors[2]._id, date: '2024-03-13', diagnosis: 'Knee Osteoarthritis', prescription: 'Physiotherapy twice a week\nIbuprofen 400mg as needed\nWeight management', type: 'Lab Report' },
    { patient: 'James Brown', patientId: patientUser4._id, doctor: 'Dr. Sarah Smith', doctorId: doctors[0]._id, date: '2024-03-12', diagnosis: 'Coronary Artery Disease', prescription: 'Aspirin 75mg daily\nAtorvastatin 40mg daily\nBeta blocker\nCardiac rehab', type: 'Diagnosis' },
  ]);

  console.log('Created records...');

  // Create Billing
  await Billing.insertMany([
    { invoiceId: 'INV-0001', patient: 'Sarah Johnson', patientId: patientUser1._id, doctor: 'Dr. Sarah Smith', doctorId: doctors[0]._id, service: 'Cardiology Consultation', amount: 350, paid: 350, status: 'Paid', date: '2024-03-15', dueDate: '2024-03-30', paymentMethod: 'card', transactionId: 'TXN-001' },
    { invoiceId: 'INV-0002', patient: 'Mike Chen', patientId: patientUser2._id, doctor: 'Dr. Raj Patel', doctorId: doctors[1]._id, service: 'Neurology Follow-up', amount: 280, paid: 0, status: 'Pending', date: '2024-03-14', dueDate: '2024-03-29' },
    { invoiceId: 'INV-0003', patient: 'Emma Wilson', patientId: patientUser3._id, doctor: 'Dr. Emily Lee', doctorId: doctors[2]._id, service: 'Orthopedic Check-up + X-Ray', amount: 520, paid: 260, status: 'Partial', date: '2024-03-13', dueDate: '2024-03-28' },
    { invoiceId: 'INV-0004', patient: 'James Brown', patientId: patientUser4._id, doctor: 'Dr. Sarah Smith', doctorId: doctors[0]._id, service: 'Cardiac Stress Test', amount: 890, paid: 890, status: 'Paid', date: '2024-03-12', dueDate: '2024-03-27', paymentMethod: 'card', transactionId: 'TXN-002' },
  ]);

  console.log('Created billing...');

  // Create Reviews
  await Review.insertMany([
    { doctorId: doctors[0]._id, doctorName: 'Dr. Sarah Smith', patientName: 'Sarah Johnson', patientId: patientUser1._id, rating: 5, comment: 'Excellent cardiologist. Very thorough and caring.', date: '2024-03-15' },
    { doctorId: doctors[1]._id, doctorName: 'Dr. Raj Patel', patientName: 'Mike Chen', patientId: patientUser2._id, rating: 4, comment: 'Great neurologist. Explained everything clearly.', date: '2024-03-14' },
    { doctorId: doctors[0]._id, doctorName: 'Dr. Sarah Smith', patientName: 'James Brown', patientId: patientUser4._id, rating: 5, comment: 'Saved my life. Highly recommend.', date: '2024-03-12' },
  ]);

  console.log('Created reviews...');

  // Create Notifications
  await Notification.insertMany([
    { title: 'Appointment Reminder', message: 'Your appointment with Dr. Sarah Smith is tomorrow at 10:00 AM', type: 'reminder', read: false, userId: patientUser1._id, date: today },
    { title: 'Payment Received', message: 'Payment of $350 has been received for INV-0001', type: 'payment', read: false, userId: patientUser1._id, date: today },
    { title: 'New Appointment', message: 'Dr. Raj Patel has confirmed your appointment', type: 'appointment', read: false, userId: patientUser2._id, date: today },
    { title: 'Lab Results Ready', message: 'Your lab results are now available in Medical Records', type: 'records', read: false, userId: patientUser3._id, date: today },
  ]);

  console.log('Created notifications...');

  console.log('\n✅ Seed complete!');
  console.log('\n📋 Login Credentials:');
  console.log('  Admin:    admin@mediCore.com    / password');
  console.log('  Doctor:   sarah.smith@mediCore.com / password');
  console.log('  Doctor:   raj.patel@mediCore.com   / password');
  console.log('  Patient:  sarah.johnson@email.com   / password');
  console.log('  Patient:  mike.chen@email.com      / password');
  console.log('  Patient:  patient@mediCore.com     / password');
  
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
