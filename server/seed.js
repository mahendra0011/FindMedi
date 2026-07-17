import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Doctor from './models/Doctor.js';
import Patient from './models/Patient.js';
import Appointment from './models/Appointment.js';
import Record from './models/Record.js';
import Billing from './models/Billing.js';
import Review from './models/Review.js';
import Notification from './models/Notification.js';
import Medicine from './models/Medicine.js';
import Prescription from './models/Prescription.js';
import Triage from './models/Triage.js';
import Admission from './models/Admission.js';
import Bed from './models/Bed.js';
import LabOrder from './models/LabOrder.js';
import Department from './models/Department.js';
import Staff from './models/Staff.js';
import Hospital from './models/Hospital.js';
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

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected. Clearing old data...');

  await Promise.all([
    User.deleteMany(), Doctor.deleteMany(), Patient.deleteMany(),
    Appointment.deleteMany(), Record.deleteMany(), Billing.deleteMany(),
    Review.deleteMany(), Notification.deleteMany(), Medicine.deleteMany(),
    Prescription.deleteMany(), Triage.deleteMany(), Admission.deleteMany(), 
    Bed.deleteMany(), LabOrder.deleteMany(), Department.deleteMany(),
    Staff.deleteMany(), Hospital.deleteMany(),
  ]);

  // Seed Departments
  const departments = await Department.insertMany([
    { name: 'Cardiology', code: 'CARD', description: 'Heart and cardiovascular care', head: 'Dr. Sarah Smith', location: '2nd Floor', emergency: true, phone: '+1 234-567-8901' },
    { name: 'Neurology', code: 'NEUR', description: 'Brain and nervous system', head: 'Dr. Raj Patel', location: '3rd Floor', emergency: true },
    { name: 'Orthopedics', code: 'ORTH', description: 'Bones, joints, and muscles', head: 'Dr. Emily Lee', location: '4th Floor', emergency: false },
    { name: 'Pediatrics', code: 'PEDS', description: 'Child healthcare', head: 'Dr. Carlos Garcia', location: '5th Floor', emergency: true },
    { name: 'Emergency', code: 'EMER', description: 'Emergency and trauma care', head: 'Dr. James Wilson', location: 'Ground Floor', emergency: true },
    { name: 'Radiology', code: 'RADI', description: 'Imaging and diagnostics', head: 'Dr. Lisa Chen', location: '1st Floor', emergency: false },
    { name: 'Laboratory', code: 'LABS', description: 'Clinical laboratory services', head: 'Dr. Michael Brown', location: '1st Floor', emergency: false },
    { name: 'Pharmacy', code: 'PHAR', description: 'Medicines and prescription', head: 'Mrs. Jennifer Adams', location: 'Ground Floor', emergency: false },
  ]);
  console.log('Created departments...');

  // Create Users first
  const adminUser = await User.create({ name: 'Admin User', email: 'admin@mediCore.com', password: 'password', role: 'admin', isVerified: true, status: 'active', approvalStatus: 'not_required' });
  const doctorUser1 = await User.create({ name: 'Dr. Sarah Smith', email: 'sarah.smith@mediCore.com', password: 'password', role: 'doctor', specialization: 'Cardiology', isVerified: true, status: 'active', approvalStatus: 'approved' });
  const doctorUser2 = await User.create({ name: 'Dr. Raj Patel', email: 'raj.patel@mediCore.com', password: 'password', role: 'doctor', specialization: 'Neurology', isVerified: true, status: 'active', approvalStatus: 'approved' });
  const doctorUser3 = await User.create({ name: 'Dr. Emily Lee', email: 'emily.lee@mediCore.com', password: 'password', role: 'doctor', specialization: 'Orthopedics', isVerified: true, status: 'active', approvalStatus: 'approved' });
  const doctorUser4 = await User.create({ name: 'Dr. Carlos Garcia', email: 'carlos.garcia@mediCore.com', password: 'password', role: 'doctor', specialization: 'Pediatrics', isVerified: true, status: 'active', approvalStatus: 'approved' });
  
  const patientUser1 = await User.create({ name: 'Sarah Johnson', email: 'sarah.johnson@email.com', password: 'password', role: 'patient', phone: '+1 555-0101', isVerified: true, status: 'active', approvalStatus: 'not_required' });
  const patientUser2 = await User.create({ name: 'Mike Chen', email: 'mike.chen@email.com', password: 'password', role: 'patient', phone: '+1 555-0102', isVerified: true, status: 'active', approvalStatus: 'not_required' });
  const patientUser3 = await User.create({ name: 'Emma Wilson', email: 'emma.wilson@email.com', password: 'password', role: 'patient', phone: '+1 555-0103', isVerified: true, status: 'active', approvalStatus: 'not_required' });
  const patientUser4 = await User.create({ name: 'James Brown', email: 'james.brown@email.com', password: 'password', role: 'patient', phone: '+1 555-0104', isVerified: true, status: 'active', approvalStatus: 'not_required' });
  const patientUser5 = await User.create({ name: 'John Patient', email: 'patient@mediCore.com', password: 'password', role: 'patient', phone: '+1 555-0100', isVerified: true, status: 'active', approvalStatus: 'not_required' });

  console.log('Created users...');

  // Seed Hospitals first (so we can link doctors to them)
  const hospitals = await Hospital.insertMany([
    { name: 'City General Hospital', slug: 'city-general-hospital', email: 'contact@citygeneral.com', phone: '+1 234-567-8001', address: '123 Healthcare Ave', city: 'New York', state: 'NY', licenseNumber: 'LIC-001', logo: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=400&h=300&fit=crop', description: 'Leading multispeciality hospital with 24/7 emergency care, modern diagnostic facilities, and experienced medical professionals.', specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Oncology'], status: 'approved', rating: 4.5, reviewsCount: 128, subscriptionPlan: 'premium', createdAt: new Date('2024-01-15'), establishedYear: 1995, totalDoctors: 120, accreditations: ['NABH', 'NABL', 'ISO'], hospitalType: 'Private Multi-Specialty', emergency24x7: true, bedAvailability: 350, ambulanceService: true },
    { name: 'Sunrise Medical Center', slug: 'sunrise-medical-center', email: 'info@sunrisemed.com', phone: '+1 234-567-8002', address: '456 Health Blvd', city: 'Los Angeles', state: 'CA', licenseNumber: 'LIC-002', logo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop', description: 'State-of-the-art medical center specializing in cardiac care, neurology, and advanced surgical procedures.', specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'General Medicine'], status: 'approved', rating: 4.2, reviewsCount: 89, subscriptionPlan: 'basic', createdAt: new Date('2024-02-20'), establishedYear: 2008, totalDoctors: 75, accreditations: ['NABH', 'ISO'], hospitalType: 'Private Multi-Specialty', emergency24x7: true, bedAvailability: 200, ambulanceService: true },
    { name: 'Green Valley Hospital', slug: 'green-valley-hospital', email: 'admin@greenvalley.com', phone: '+1 234-567-8003', address: '789 Wellness Dr', city: 'Chicago', state: 'IL', licenseNumber: 'LIC-003', logo: 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=400&h=300&fit=crop', description: 'Community-focused hospital providing quality healthcare with compassion and cutting-edge technology.', specialties: ['Pediatrics', 'Dermatology', 'General Medicine', 'ENT'], status: 'approved', rating: 4.7, reviewsCount: 215, subscriptionPlan: 'basic', createdAt: new Date('2024-03-10'), establishedYear: 1985, totalDoctors: 95, accreditations: ['NABH', 'NABL'], hospitalType: 'Government Multi-Specialty', emergency24x7: true, bedAvailability: 500, ambulanceService: true },
    { name: 'Pristine Care Hospital', slug: 'pristine-care-hospital', email: 'hello@pristinecare.com', phone: '+1 234-567-8004', address: '321 Recovery Ln', city: 'Houston', state: 'TX', licenseNumber: 'LIC-004', logo: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400&h=300&fit=crop', description: 'Premium healthcare facility with world-class infrastructure and internationally trained doctors.', specialties: ['Cardiology', 'Oncology', 'Neurology', 'Orthopedics'], status: 'approved', rating: 4.8, reviewsCount: 342, subscriptionPlan: 'premium', createdAt: new Date('2024-01-05'), establishedYear: 2000, totalDoctors: 150, accreditations: ['NABH', 'NABL', 'ISO'], hospitalType: 'Private Multi-Specialty', emergency24x7: true, bedAvailability: 450, ambulanceService: true },
    { name: 'Lakeside Clinic', slug: 'lakeside-clinic', email: 'contact@lakeside.com', phone: '+1 234-567-8005', address: '555 Lake View Rd', city: 'Phoenix', state: 'AZ', licenseNumber: 'LIC-005', logo: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop', description: 'A boutique clinic offering personalized healthcare services in a comfortable, patient-friendly environment.', specialties: ['Dermatology', 'General Medicine', 'ENT'], status: 'pending', rating: 0, reviewsCount: 0, subscriptionPlan: 'free', createdAt: new Date('2024-07-01'), establishedYear: 2019, totalDoctors: 12, accreditations: [], hospitalType: 'Private Single-Specialty', emergency24x7: false, bedAvailability: 30, ambulanceService: false },
  ]);
  const [h1, h2, h3, h4, h5] = hospitals;
  console.log('Created hospitals...');

  // Create Doctors with user_id and hospitalId references
  const doctors = await Doctor.insertMany([
    { name: 'Dr. Sarah Smith', specialization: 'Cardiology', experience: '12 years', rating: 4.8, patients: 1250, available: true, phone: '+1 234-567-8901', email: 'sarah.smith@mediCore.com', initials: 'SS', department: 'Cardiology', fees: 500, consultation_fees: 500, location: 'New York, NY', qualifications: 'MBBS, MD Cardiology', bio: 'Expert cardiologist with 12 years of experience.', time_slots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'], weekly_schedule: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false }, leaves: [], approved: true, user_id: doctorUser1._id.toString(), reviews_count: 3, hospitalId: h1._id, languages: ['English', 'Hindi', 'Spanish'] },
    { name: 'Dr. Raj Patel', specialization: 'Neurology', experience: '8 years', rating: 4.9, patients: 890, available: true, phone: '+1 234-567-8902', email: 'raj.patel@mediCore.com', initials: 'RP', department: 'Neurology', fees: 600, consultation_fees: 600, location: 'Los Angeles, CA', qualifications: 'MBBS, DM Neurology', bio: 'Specialized in neurological disorders.', time_slots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'], weekly_schedule: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: false }, leaves: [], approved: true, user_id: doctorUser2._id.toString(), reviews_count: 2, hospitalId: h1._id, languages: ['English', 'Gujarati', 'Hindi'] },
    { name: 'Dr. Emily Lee', specialization: 'Orthopedics', experience: '15 years', rating: 4.7, patients: 2100, available: true, phone: '+1 234-567-8903', email: 'emily.lee@mediCore.com', initials: 'EL', department: 'Orthopedics', fees: 450, consultation_fees: 450, location: 'Chicago, IL', qualifications: 'MBBS, MS Orthopedics', bio: 'Bone and joint specialist.', time_slots: ['10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM'], weekly_schedule: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: false, saturday: false, sunday: false }, leaves: [], approved: true, user_id: doctorUser3._id.toString(), reviews_count: 0, hospitalId: h2._id, languages: ['English', 'Chinese'] },
    { name: 'Dr. Carlos Garcia', specialization: 'Pediatrics', experience: '10 years', rating: 4.6, patients: 1800, available: true, phone: '+1 234-567-8904', email: 'carlos.garcia@mediCore.com', initials: 'CG', department: 'Pediatrics', fees: 350, consultation_fees: 350, location: 'Houston, TX', qualifications: 'MBBS, DCH Pediatrics', bio: 'Dedicated pediatrician.', time_slots: ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'], weekly_schedule: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: false }, leaves: [], approved: true, user_id: doctorUser4._id.toString(), reviews_count: 1, hospitalId: h3._id, languages: ['English', 'Spanish'] },
  ]);

  console.log('Created doctors...');

  // Create Patients with UHID auto-generated
  const patients = await Patient.insertMany([
    { name: 'Sarah Johnson', age: 34, gender: 'Female', disease: 'Hypertension', doctor: 'Dr. Sarah Smith', phone: '+1 555-0101', email: 'sarah.johnson@email.com', bloodGroup: 'A+', admitted: new Date('2024-03-15'), status: 'Active', userId: patientUser1._id, address: '123 Main St, New York', uhid: 'UHID20240001' },
    { name: 'Mike Chen', age: 45, gender: 'Male', disease: 'Diabetes Type 2', doctor: 'Dr. Raj Patel', phone: '+1 555-0102', email: 'mike.chen@email.com', bloodGroup: 'O-', admitted: new Date('2024-03-12'), status: 'Active', userId: patientUser2._id, address: '456 Oak Ave, LA', uhid: 'UHID20240002' },
    { name: 'Emma Wilson', age: 28, gender: 'Female', disease: 'Asthma', doctor: 'Dr. Emily Lee', phone: '+1 555-0103', email: 'emma.wilson@email.com', bloodGroup: 'B+', admitted: new Date('2024-03-10'), status: 'Discharged', userId: patientUser3._id, address: '789 Pine St, Chicago', uhid: 'UHID20240003' },
    { name: 'James Brown', age: 62, gender: 'Male', disease: 'Heart Disease', doctor: 'Dr. Sarah Smith', phone: '+1 555-0104', email: 'james.brown@email.com', bloodGroup: 'AB+', admitted: new Date('2024-03-08'), status: 'Active', userId: patientUser4._id, address: '321 Elm St, NY', uhid: 'UHID20240004' },
    { name: 'John Patient', age: 30, gender: 'Male', disease: 'General Checkup', doctor: 'Dr. Carlos Garcia', phone: '+1 555-0100', email: 'patient@mediCore.com', bloodGroup: 'O+', admitted: new Date(), status: 'Active', userId: patientUser5._id, address: '654 Cedar Ave, Houston', uhid: 'UHID20240005' },
  ]);

  console.log('Created patients...');

  // Create Staff Members
  const staff = await Staff.insertMany([
    { employeeId: 'EMP-2024-00001', name: 'Nurse Alice Johnson', role: 'Nurse', department: 'Cardiology', joinDate: new Date('2022-01-15'), salary: 45000, status: 'Active', shift: 'Morning', userId: adminUser._id },
    { employeeId: 'EMP-2024-00002', name: 'Nurse Bob Smith', role: 'Nurse', department: 'Neurology', joinDate: new Date('2022-03-20'), salary: 45000, status: 'Active', shift: 'Evening' },
    { employeeId: 'EMP-2024-00003', name: 'Lab Tech Carol White', role: 'Lab Technician', department: 'Laboratory', joinDate: new Date('2021-06-10'), salary: 40000, status: 'Active', shift: 'Morning' },
    { employeeId: 'EMP-2024-00004', name: 'Pharmacist David Lee', role: 'Pharmacist', department: 'Pharmacy', joinDate: new Date('2022-09-01'), salary: 50000, status: 'Active', shift: 'Morning' },
  ]);
  console.log('Created staff...');

  // Create Appointments with token numbers
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  await Appointment.insertMany([
    { patient: 'Sarah Johnson', patientId: patientUser1._id, doctor: 'Dr. Sarah Smith', doctorId: doctors[0]._id, department: 'Cardiology', date: tomorrow, time: '10:00 AM', status: 'Confirmed', type: 'Follow-up', symptoms: 'Regular checkup for hypertension', tokenNumber: 'TKN-001', uhid: patients[0].uhid },
    { patient: 'Mike Chen', patientId: patientUser2._id, doctor: 'Dr. Raj Patel', doctorId: doctors[1]._id, department: 'Neurology', date: tomorrow, time: '11:30 AM', status: 'Pending', type: 'Consultation', symptoms: 'Headache and dizziness', tokenNumber: 'TKN-002', uhid: patients[1].uhid },
    { patient: 'Emma Wilson', patientId: patientUser3._id, doctor: 'Dr. Emily Lee', doctorId: doctors[2]._id, department: 'Orthopedics', date: today, time: '2:00 PM', status: 'Completed', type: 'Check-up', symptoms: 'Knee pain follow-up', tokenNumber: 'TKN-003', uhid: patients[2].uhid },
    { patient: 'James Brown', patientId: patientUser4._id, doctor: 'Dr. Sarah Smith', doctorId: doctors[0]._id, department: 'Cardiology', date: today, time: '9:00 AM', status: 'Confirmed', type: 'Emergency', symptoms: 'Chest pain', tokenNumber: 'TKN-004', uhid: patients[3].uhid },
    { patient: 'John Patient', patientId: patientUser5._id, doctor: 'Dr. Carlos Garcia', doctorId: doctors[3]._id, department: 'Pediatrics', date: tomorrow, time: '3:00 PM', status: 'Pending', type: 'Consultation', symptoms: 'Annual checkup', tokenNumber: 'TKN-005', uhid: patients[4].uhid },
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
    { invoiceId: 'INV-0001', patient: 'Sarah Johnson', patientId: patientUser1._id, doctor: 'Dr. Sarah Smith', doctorId: doctors[0]._id, service: 'Cardiology Consultation', amount: 350, paid: 350, status: 'Paid', date: '2024-03-15', dueDate: '2024-03-30', paymentMethod: 'Card', transactionId: 'TXN-001' },
    { invoiceId: 'INV-0002', patient: 'Mike Chen', patientId: patientUser2._id, doctor: 'Dr. Raj Patel', doctorId: doctors[1]._id, service: 'Neurology Follow-up', amount: 280, paid: 0, status: 'Pending', date: '2024-03-14', dueDate: '2024-03-29' },
    { invoiceId: 'INV-0003', patient: 'Emma Wilson', patientId: patientUser3._id, doctor: 'Dr. Emily Lee', doctorId: doctors[2]._id, service: 'Orthopedic Check-up + X-Ray', amount: 520, paid: 260, status: 'Partial', date: '2024-03-13', dueDate: '2024-03-28' },
    { invoiceId: 'INV-0004', patient: 'James Brown', patientId: patientUser4._id, doctor: 'Dr. Sarah Smith', doctorId: doctors[0]._id, service: 'Cardiac Stress Test', amount: 890, paid: 890, status: 'Paid', date: '2024-03-12', dueDate: '2024-03-27', transactionId: 'TXN-002' },
  ]);

  console.log('Created billing...');

  // Create Reviews
  await Review.insertMany([
    { doctorId: doctors[0]._id, doctorName: 'Dr. Sarah Smith', patientName: 'Sarah Johnson', patientId: patientUser1._id, rating: 5, comment: 'Excellent cardiologist. Very thorough and caring.', date: '2024-03-15' },
    { doctorId: doctors[1]._id, doctorName: 'Dr. Raj Patel', patientName: 'Mike Chen', patientId: patientUser2._id, rating: 4, comment: 'Great neurologist. Explained everything clearly.', date: '2024-03-14' },
    { doctorId: doctors[0]._id, doctorName: 'Dr. Sarah Smith', patientName: 'James Brown', patientId: patientUser4._id, rating: 5, comment: 'Saved my life. Highly recommend.', date: '2024-03-12' },
  ]);

  console.log('Created reviews...');

  // Create Medicines
  await Medicine.insertMany([
    { name: 'Paracetamol 500mg', genericName: 'Paracetamol', category: 'Analgesic', form: 'Tablet', manufacturer: 'Cipla', batchNumber: 'PT-2024-001', expiryDate: new Date('2026-03-01'), purchasePrice: 2.5, sellingPrice: 5, currentStock: 500, reorderLevel: 50, rackLocation: 'A-01' },
    { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'Antibiotic', form: 'Capsule', manufacturer: 'Pfizer', batchNumber: 'AM-2024-002', expiryDate: new Date('2025-12-01'), purchasePrice: 8, sellingPrice: 15, currentStock: 300, reorderLevel: 30, rackLocation: 'B-12' },
    { name: 'Metformin 500mg', genericName: 'Metformin', category: 'Antidiabetic', form: 'Tablet', manufacturer: 'Sun Pharma', batchNumber: 'MT-2024-003', expiryDate: new Date('2026-06-01'), purchasePrice: 3, sellingPrice: 8, currentStock: 200, reorderLevel: 25, rackLocation: 'C-05' },
    { name: 'Amlodipine 5mg', genericName: 'Amlodipine', category: 'Antihypertensive', form: 'Tablet', manufacturer: 'Himalaya', batchNumber: 'AM-2024-004', expiryDate: new Date('2025-09-01'), purchasePrice: 5, sellingPrice: 12, currentStock: 150, reorderLevel: 20, rackLocation: 'D-08' },
  ]);
  console.log('Created medicines...');

  // Create Beds
  await Bed.insertMany([
    { bedNumber: 'G-01', ward: 'General', bedType: 'General', status: 'Available', dailyRate: 1500 },
    { bedNumber: 'G-02', ward: 'General', bedType: 'General', status: 'Available', dailyRate: 1500 },
    { bedNumber: 'SP-01', ward: 'Semi-Private', bedType: 'Semi-Private', status: 'Available', dailyRate: 2500 },
    { bedNumber: 'P-01', ward: 'Private', bedType: 'Private', status: 'Available', dailyRate: 4000 },
    { bedNumber: 'ICU-01', ward: 'ICU', bedType: 'ICU', status: 'Available', dailyRate: 8000 },
  ]);
  console.log('Created beds...');

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

seed().catch(err => { console.error(err); process.exit(1); });// 27
