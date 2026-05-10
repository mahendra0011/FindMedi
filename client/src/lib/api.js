// ─── Mock data for offline / no-backend mode ───────────────────────────────
import { DEFAULT_USER_SETTINGS } from './settings';

const LAB_SERVICES = [
  { id: 'bp_check', name: 'Blood Pressure Check', price: 100, category: 'Basic' },
  { id: 'blood_sugar', name: 'Blood Sugar Test', price: 150, category: 'Lab' },
  { id: 'fbc', name: 'Full Blood Count', price: 300, category: 'Lab' },
  { id: 'xray', name: 'X-Ray Scan', price: 500, category: 'Imaging' },
  { id: 'ecg', name: 'ECG Test', price: 400, category: 'Cardiac' },
  { id: 'urine_test', name: 'Urine Test', price: 150, category: 'Lab' },
  { id: 'lipid_profile', name: 'Lipid Profile', price: 450, category: 'Lab' },
  { id: 'thyroid', name: 'Thyroid Panel', price: 500, category: 'Lab' },
];

let MOCK_USERS = {
  'admin@medicare.com':       { id: '1', name: 'Admin User',      email: 'admin@medicare.com',       role: 'admin',   password: 'password', phone: '', status: 'active', isVerified: true },
  'sarah.smith@medicare.com': { id: '2', name: 'Dr. Sarah Smith', email: 'sarah.smith@medicare.com', role: 'doctor',  password: 'password', phone: '', status: 'active', isVerified: true },
  'patient@medicare.com':     { id: '3', name: 'John Patient',    email: 'patient@medicare.com',     role: 'patient', password: 'password', phone: '', status: 'active', isVerified: true },
};

const MOCK_DOCTORS = [
  { _id:'d1', name:'Dr. Sarah Smith',  specialization:'Cardiology',   experience:'12 years', rating:4.8, patients:1250, available:true,  phone:'+1 234-567-8901', email:'sarah.smith@medicare.com',  initials:'SS', fees:500, consultation_fees:500, location:'New York, NY', qualifications:'MBBS, MD Cardiology', bio:'Expert cardiologist with 12 years of experience in heart diseases.', time_slots:['09:00 AM','10:00 AM','11:00 AM','02:00 PM','03:00 PM','04:00 PM'], weekly_schedule:{monday:true,tuesday:true,wednesday:true,thursday:true,friday:true,saturday:false,sunday:false}, leaves:[], approved:true, user_id:'2', reviews_count:3 },
  { _id:'d2', name:'Dr. Raj Patel',    specialization:'Neurology',    experience:'8 years',  rating:4.9, patients:890,  available:true,  phone:'+1 234-567-8902', email:'raj.patel@medicare.com',    initials:'RP', fees:600, consultation_fees:600, location:'Los Angeles, CA', qualifications:'MBBS, DM Neurology', bio:'Specialized in neurological disorders and brain health.', time_slots:['09:00 AM','10:00 AM','11:00 AM','02:00 PM','03:00 PM','04:00 PM'], weekly_schedule:{monday:true,tuesday:true,wednesday:true,thursday:true,friday:true,saturday:true,sunday:false}, leaves:[], approved:true, user_id:'', reviews_count:2 },
  { _id:'d3', name:'Dr. Emily Lee',    specialization:'Orthopedics',  experience:'15 years', rating:4.7, patients:2100, available:false, phone:'+1 234-567-8903', email:'emily.lee@medicare.com',    initials:'EL', fees:450, consultation_fees:450, location:'Chicago, IL', qualifications:'MBBS, MS Orthopedics', bio:'Bone and joint specialist with extensive surgical experience.', time_slots:['10:00 AM','11:00 AM','02:00 PM','03:00 PM'], weekly_schedule:{monday:true,tuesday:true,wednesday:true,thursday:true,friday:false,saturday:false,sunday:false}, leaves:['2024-04-15'], approved:true, user_id:'', reviews_count:0 },
  { _id:'d4', name:'Dr. Carlos Garcia',specialization:'Pediatrics',   experience:'10 years', rating:4.6, patients:1800, available:true,  phone:'+1 234-567-8904', email:'carlos.garcia@medicare.com',initials:'CG', fees:350, consultation_fees:350, location:'Houston, TX', qualifications:'MBBS, DCH Pediatrics', bio:'Dedicated pediatrician caring for children of all ages.', time_slots:['09:00 AM','10:00 AM','11:00 AM','02:00 PM','03:00 PM','04:00 PM'], weekly_schedule:{monday:true,tuesday:true,wednesday:true,thursday:true,friday:true,saturday:true,sunday:false}, leaves:[], approved:true, user_id:'', reviews_count:1 },
  { _id:'d5', name:'Dr. Min Kim',      specialization:'Dermatology',  experience:'6 years',  rating:4.8, patients:650,  available:true,  phone:'+1 234-567-8905', email:'min.kim@medicare.com',      initials:'MK', fees:400, consultation_fees:400, location:'Phoenix, AZ', qualifications:'MBBS, MD Dermatology', bio:'Skin care expert specializing in cosmetic and medical dermatology.', time_slots:['09:00 AM','10:00 AM','11:00 AM','02:00 PM','03:00 PM'], weekly_schedule:{monday:true,tuesday:true,wednesday:true,thursday:true,friday:true,saturday:false,sunday:false}, leaves:[], approved:true, user_id:'', reviews_count:1 },
  { _id:'d6', name:'Dr. Anna Wilson',  specialization:'Oncology',     experience:'20 years', rating:4.9, patients:3200, available:false, phone:'+1 234-567-8906', email:'anna.wilson@medicare.com',  initials:'AW', fees:800, consultation_fees:800, location:'Philadelphia, PA', qualifications:'MBBS, DM Oncology', bio:'Leading oncologist with 20 years of cancer treatment expertise.', time_slots:['10:00 AM','11:00 AM','02:00 PM','03:00 PM'], weekly_schedule:{monday:true,tuesday:true,wednesday:true,thursday:true,friday:false,saturday:false,sunday:false}, leaves:[], approved:true, user_id:'', reviews_count:0 },
];

const MOCK_PATIENTS = [
  { _id:'p1', name:'Sarah Johnson', age:34, gender:'Female', disease:'Hypertension',    doctor:'Dr. Smith',  phone:'+1 555-0101', bloodGroup:'A+', admitted:'2024-03-15', status:'Active'    },
  { _id:'p2', name:'Mike Chen',     age:45, gender:'Male',   disease:'Diabetes Type 2', doctor:'Dr. Patel',  phone:'+1 555-0102', bloodGroup:'O-', admitted:'2024-03-12', status:'Active'    },
  { _id:'p3', name:'Emma Wilson',   age:28, gender:'Female', disease:'Asthma',          doctor:'Dr. Lee',    phone:'+1 555-0103', bloodGroup:'B+', admitted:'2024-03-10', status:'Discharged'},
  { _id:'p4', name:'James Brown',   age:62, gender:'Male',   disease:'Heart Disease',   doctor:'Dr. Smith',  phone:'+1 555-0104', bloodGroup:'AB+',admitted:'2024-03-08', status:'Active'    },
  { _id:'p5', name:'Lisa Davis',    age:51, gender:'Female', disease:'Arthritis',       doctor:'Dr. Lee',    phone:'+1 555-0105', bloodGroup:'A-', admitted:'2024-03-05', status:'Active'    },
  { _id:'p6', name:'Robert Taylor', age:39, gender:'Male',   disease:'Back Pain',       doctor:'Dr. Garcia', phone:'+1 555-0106', bloodGroup:'O+', admitted:'2024-03-01', status:'Discharged'},
  { _id:'p7', name:'Amy Martinez',  age:23, gender:'Female', disease:'Migraine',        doctor:'Dr. Patel',  phone:'+1 555-0107', bloodGroup:'B-', admitted:'2024-02-28', status:'Active'    },
  { _id:'p8', name:'David Lee',     age:58, gender:'Male',   disease:'COPD',            doctor:'Dr. Wilson', phone:'+1 555-0108', bloodGroup:'AB-',admitted:'2024-02-25', status:'Critical'  },
];

const today = new Date().toISOString().split('T')[0];
const MOCK_APPOINTMENTS = [
  { _id:'a1', patient:'Sarah Johnson', doctor:'Dr. Smith',  department:'Cardiology',   date:today,       time:'10:00 AM', status:'Confirmed', type:'Follow-up'    },
  { _id:'a2', patient:'Mike Chen',     doctor:'Dr. Patel',  department:'Neurology',    date:today,       time:'11:30 AM', status:'Pending',   type:'Consultation' },
  { _id:'a3', patient:'Emma Wilson',   doctor:'Dr. Lee',    department:'Orthopedics',  date:today,       time:'2:00 PM',  status:'Confirmed', type:'Check-up'     },
  { _id:'a4', patient:'James Brown',   doctor:'Dr. Garcia', department:'Pediatrics',   date:'2024-03-21',time:'9:00 AM',  status:'Cancelled', type:'Emergency'    },
  { _id:'a5', patient:'Lisa Davis',    doctor:'Dr. Kim',    department:'Dermatology',  date:'2024-03-21',time:'10:30 AM', status:'Confirmed', type:'Follow-up'    },
  { _id:'a6', patient:'Robert Taylor', doctor:'Dr. Wilson', department:'Oncology',     date:'2024-03-21',time:'1:00 PM',  status:'Completed', type:'Consultation' },
  { _id:'a7', patient:'Amy Martinez',  doctor:'Dr. Patel',  department:'Neurology',    date:'2024-03-22',time:'3:00 PM',  status:'Pending',   type:'Check-up'     },
];

const MOCK_RECORDS = [
  { _id:'r1', patient:'Sarah Johnson', doctor:'Dr. Smith',  date:'2024-03-15', diagnosis:'Hypertension Stage 2',       prescription:'Amlodipine 5mg daily',              type:'Diagnosis'    },
  { _id:'r2', patient:'Mike Chen',     doctor:'Dr. Patel',  date:'2024-03-14', diagnosis:'Migraine with Aura',          prescription:'Sumatriptan 50mg PRN',              type:'Prescription' },
  { _id:'r3', patient:'Emma Wilson',   doctor:'Dr. Lee',    date:'2024-03-13', diagnosis:'Knee Osteoarthritis',         prescription:'Physiotherapy + Ibuprofen 400mg',   type:'Lab Report'   },
  { _id:'r4', patient:'James Brown',   doctor:'Dr. Smith',  date:'2024-03-12', diagnosis:'Coronary Artery Disease',     prescription:'Aspirin 75mg + Atorvastatin 40mg',  type:'Diagnosis'    },
  { _id:'r5', patient:'Lisa Davis',    doctor:'Dr. Lee',    date:'2024-03-11', diagnosis:'Rheumatoid Arthritis',        prescription:'Methotrexate 7.5mg weekly',          type:'Prescription' },
  { _id:'r6', patient:'Amy Martinez',  doctor:'Dr. Patel',  date:'2024-03-10', diagnosis:'Chronic Migraine',            prescription:'Topiramate 25mg + Lifestyle changes',type:'Lab Report'   },
];

const MOCK_BILLS = [
  { _id:'b1', invoiceId:'INV-0001', patient:'Sarah Johnson', doctor:'Dr. Smith',  service:'Cardiology Consultation',      amount:350,  paid:350,  status:'Paid',    date:'2024-03-15', dueDate:'2024-03-30' },
  { _id:'b2', invoiceId:'INV-0002', patient:'Mike Chen',     doctor:'Dr. Patel',  service:'Neurology Follow-up',          amount:280,  paid:0,    status:'Pending', date:'2024-03-14', dueDate:'2024-03-29' },
  { _id:'b3', invoiceId:'INV-0003', patient:'Emma Wilson',   doctor:'Dr. Lee',    service:'Orthopedic Check-up + X-Ray',  amount:520,  paid:260,  status:'Partial', date:'2024-03-13', dueDate:'2024-03-28' },
  { _id:'b4', invoiceId:'INV-0004', patient:'James Brown',   doctor:'Dr. Smith',  service:'Cardiac Stress Test',          amount:890,  paid:890,  status:'Paid',    date:'2024-03-12', dueDate:'2024-03-27' },
  { _id:'b5', invoiceId:'INV-0005', patient:'Lisa Davis',    doctor:'Dr. Lee',    service:'Rheumatology Consultation',    amount:420,  paid:0,    status:'Overdue', date:'2024-02-28', dueDate:'2024-03-14' },
  { _id:'b6', invoiceId:'INV-0006', patient:'Robert Taylor', doctor:'Dr. Garcia', service:'Pediatric Emergency Visit',    amount:1200, paid:1200, status:'Paid',    date:'2024-03-01', dueDate:'2024-03-16' },
  { _id:'b7', invoiceId:'INV-0007', patient:'Amy Martinez',  doctor:'Dr. Patel',  service:'Neurology MRI Scan',           amount:750,  paid:0,    status:'Pending', date:'2024-03-10', dueDate:'2024-03-25' },
];

const MOCK_REVIEWS = [
  { _id:'rv1', doctorId:'d1', doctorName:'Dr. Sarah Smith', patientName:'Sarah Johnson', rating:5, comment:'Excellent cardiologist. Very thorough and caring.', date:'2024-03-15' },
  { _id:'rv2', doctorId:'d2', doctorName:'Dr. Raj Patel', patientName:'Mike Chen', rating:4, comment:'Great neurologist. Explained everything clearly.', date:'2024-03-14' },
  { _id:'rv3', doctorId:'d1', doctorName:'Dr. Sarah Smith', patientName:'James Brown', rating:5, comment:'Saved my life. Highly recommend.', date:'2024-03-12' },
  { _id:'rv4', doctorId:'d4', doctorName:'Dr. Carlos Garcia', patientName:'Robert Taylor', rating:4, comment:'Very good with kids. My child felt comfortable.', date:'2024-03-10' },
  { _id:'rv5', doctorId:'d5', doctorName:'Dr. Min Kim', patientName:'Amy Martinez', rating:5, comment:'Quick diagnosis and effective treatment.', date:'2024-03-08' },
];

const MOCK_NOTIFICATIONS = [
  // Admin notifications (userId '1' or similar)
  { _id:'n1', title:'System Update', message:'New features added to the platform', type:'system', read:false, date:'2024-03-16', userId:'1' },
  { _id:'n2', title:'New User Registered', message:'New patient John Doe has registered', type:'system', read:false, date:'2024-03-17', userId:'1' },
  { _id:'n3', title:'Emergency Case', message:'Critical emergency case reported', type:'system', read:true, date:'2024-03-18', userId:'1' },
  // Doctor notifications (userId '2' or similar)
  { _id:'n4', title:'New Appointment', message:'New appointment scheduled with John Doe', type:'appointment', read:false, date:'2024-03-16', userId:'2' },
  { _id:'n5', title:'Payment Received', message:'Payment of Rs 500 received for consultation', type:'payment', read:false, date:'2024-03-15', userId:'2' },
  { _id:'n6', title:'Emergency Case Assigned', message:'You have been assigned to emergency case: Cardiac Arrest', type:'system', read:false, date:'2024-03-18', userId:'2' },
  // Patient notifications (userId '3' or similar)
  { _id:'n7', title:'Appointment Reminder', message:'Your appointment with Dr. Smith is tomorrow at 10:00 AM', type:'reminder', read:false, date:'2024-03-15', userId:'3' },
  { _id:'n8', title:'Payment Received', message:'Payment of $350 has been received for INV-0001', type:'payment', read:true, date:'2024-03-14', userId:'3' },
  { _id:'n9', title:'Lab Results Ready', message:'Your lab results are now available in Medical Records', type:'records', read:true, date:'2024-03-12', userId:'3' },
];

const MOCK_DEPARTMENTS = [
  { _id:'dept1', name:'Cardiology', description:'Heart and cardiovascular care', head:'Dr. Sarah Smith', active:true, fees_structure:500 },
  { _id:'dept2', name:'Neurology', description:'Brain and nervous system treatment', head:'Dr. Raj Patel', active:true, fees_structure:600 },
  { _id:'dept3', name:'Orthopedics', description:'Bone and joint care', head:'Dr. Emily Lee', active:true, fees_structure:450 },
  { _id:'dept4', name:'Pediatrics', description:'Child healthcare', head:'Dr. Carlos Garcia', active:true, fees_structure:350 },
  { _id:'dept5', name:'Dermatology', description:'Skin care and treatment', head:'Dr. Min Kim', active:true, fees_structure:400 },
  { _id:'dept6', name:'Oncology', description:'Cancer treatment and care', head:'Dr. Anna Wilson', active:true, fees_structure:800 },
];

const MOCK_PAYMENTS = [
  { _id:'pay1', transaction_id:'TXN-001', patient_id:'3', patient_name:'John Patient', amount:350, method:'card', status:'completed', invoice_id:'INV-0001', date:'2024-03-15' },
  { _id:'pay2', transaction_id:'TXN-002', patient_id:'3', patient_name:'John Patient', amount:280, method:'upi', status:'completed', invoice_id:'INV-0002', date:'2024-03-14' },
  { _id:'pay3', transaction_id:'TXN-003', patient_id:'3', patient_name:'John Patient', amount:520, method:'card', status:'pending', invoice_id:'INV-0003', date:'2024-03-13' },
];

const MOCK_DASHBOARD = {
  stats: { totalPatients: 1247, totalDoctors: 48, todayAppointments: 32, revenue: 62400 },
  weeklyAppointments: [
    {day:'Mon',count:24},{day:'Tue',count:18},{day:'Wed',count:32},
    {day:'Thu',count:27},{day:'Fri',count:20},{day:'Sat',count:15},{day:'Sun',count:8},
  ],
  revenueData: [
    {month:'Jan',revenue:42000},{month:'Feb',revenue:38000},{month:'Mar',revenue:51000},
    {month:'Apr',revenue:47000},{month:'May',revenue:55000},{month:'Jun',revenue:62000},
  ],
  departmentData: [
    {name:'Cardiology',value:30},{name:'Neurology',value:22},{name:'Orthopedics',value:18},
    {name:'Pediatrics',value:15},{name:'Other',value:15},
  ],
  recentAppointments: MOCK_APPOINTMENTS.slice(0, 5),
};

// ─── In-memory store (persists for the session) ────────────────────────────
let store = {
  doctors:      [...MOCK_DOCTORS],
  patients:     [...MOCK_PATIENTS],
  appointments: [...MOCK_APPOINTMENTS],
  records:      [...MOCK_RECORDS],
  bills:        [...MOCK_BILLS],
  reviews:      [...MOCK_REVIEWS],
  notifications:[...MOCK_NOTIFICATIONS],
  departments:  [...MOCK_DEPARTMENTS],
  payments:     [...MOCK_PAYMENTS],
};

let nextId = 100;
const uid = () => String(++nextId);
const delay = (ms = 120) => new Promise(r => setTimeout(r, ms));

function filterList(list, { search, fields, status, statusKey = 'status', type, typeKey = 'type' }) {
  return list.filter(item => {
    if (search) {
      const q = search.toLowerCase();
      if (!fields.some(f => (item[f] || '').toLowerCase().includes(q))) return false;
    }
    if (status && status !== 'All' && item[statusKey] !== status) return false;
    if (type   && type   !== 'All' && item[typeKey]   !== type)   return false;
    return true;
  });
}

// ─── Mock API ──────────────────────────────────────────────────────────────
const mock = {
  // Auth
  async login({ email, password, role }) {
    await delay();
    const u = MOCK_USERS[email?.toLowerCase()];
    if (!u || u.password !== password) throw new Error('Invalid email or password');
    if (role && u.role !== role) throw new Error(`This account is not a ${role}. Use ${u.role} credentials.`);
    const token = btoa(JSON.stringify({ id: u.id, role: u.role, exp: Date.now() + 7*24*3600*1000 }));
    return { token, user: { id: u.id, name: u.name, email: u.email, role: u.role, isVerified: u.isVerified } };
  },
  async register({ name, email, password, role }) {
    await delay();
    if (MOCK_USERS[email?.toLowerCase()]) throw new Error('Email already in use');
    const id = uid();
    MOCK_USERS[email.toLowerCase()] = { id, name, email: email.toLowerCase(), role: role || 'patient', password, phone: '', status: 'active', isVerified: false };
    const token = btoa(JSON.stringify({ id, role, exp: Date.now() + 7*24*3600*1000 }));
    return { token, user: { id, name, email: email.toLowerCase(), role: role || 'patient', isVerified: false } };
  },
  async me() {
    await delay();
    const raw = localStorage.getItem('hms_token');
    if (!raw) throw new Error('No token');
    const payload = JSON.parse(atob(raw));
    const u = Object.values(MOCK_USERS).find(x => x.id === payload.id);
    if (!u) throw new Error('User not found');
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone || '',
      address: u.address || '',
      gender: u.gender || '',
      dateOfBirth: u.dateOfBirth || '',
      avatar: u.avatar || '',
      specialization: u.specialization || '',
      experience: u.experience || '',
      qualification: u.qualification || '',
      licenseNumber: u.licenseNumber || '',
      consultationFee: u.consultationFee || 0,
      isVerified: u.isVerified,
      settings: { ...DEFAULT_USER_SETTINGS, ...(u.settings || {}) },
    };
  },
  async updateProfile(body) {
    await delay();
    const raw = localStorage.getItem('hms_token');
    const payload = JSON.parse(atob(raw));
    const u = Object.values(MOCK_USERS).find(x => x.id === payload.id);
    if (!u) throw new Error('User not found');
    Object.assign(u, body, { settings: { ...DEFAULT_USER_SETTINGS, ...(u.settings || {}), ...(body.settings || {}) } });
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone || '',
      address: u.address || '',
      gender: u.gender || '',
      dateOfBirth: u.dateOfBirth || '',
      avatar: u.avatar || '',
      specialization: u.specialization || '',
      experience: u.experience || '',
      qualification: u.qualification || '',
      licenseNumber: u.licenseNumber || '',
      consultationFee: u.consultationFee || 0,
      isVerified: u.isVerified,
      settings: { ...DEFAULT_USER_SETTINGS, ...(u.settings || {}) },
    };
  },
  async changePassword({ currentPassword, newPassword }) {
    await delay();
    const raw = localStorage.getItem('hms_token');
    const payload = JSON.parse(atob(raw));
    const u = Object.values(MOCK_USERS).find(x => x.id === payload.id);
    if (!u || u.password !== currentPassword) throw new Error('Current password is incorrect');
    if (!newPassword || newPassword.length < 6) throw new Error('New password must be at least 6 characters');
    u.password = newPassword;
    return { message: 'Password updated successfully' };
  },

  async verifyOTP({ email, otp }) {
    await delay();
    const u = MOCK_USERS[email?.toLowerCase()];
    if (!u) throw new Error('User not found');
    if (u.isVerified) throw new Error('Email already verified');
    // Mock OTP validation - just set verified
    u.isVerified = true;
    return { message: 'OTP verified successfully' };
  },

  async resendOTP({ email }) {
    await delay();
    const u = MOCK_USERS[email?.toLowerCase()];
    if (!u) throw new Error('User not found');
    if (u.isVerified) throw new Error('Email already verified');
    return { message: 'OTP resent successfully' };
  },

  // Users (admin)
  async getUsers({ search, role } = {}) {
    await delay();
    let users = Object.values(MOCK_USERS).map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, status: u.status }));
    if (search) {
      const q = search.toLowerCase();
      users = users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (role && role !== 'All') users = users.filter(u => u.role === role);
    return users;
  },
  async deleteUser(id) {
    await delay();
    const entry = Object.entries(MOCK_USERS).find(([, u]) => u.id === id);
    if (entry) delete MOCK_USERS[entry[0]];
    return { message: 'Deleted' };
  },
  async blockUser(id) {
    await delay();
    const u = Object.values(MOCK_USERS).find(x => x.id === id);
    if (u) u.status = u.status === 'blocked' ? 'active' : 'blocked';
    return { message: 'Updated' };
  },

  // Dashboard
  async dashboardStats() { await delay(); return MOCK_DASHBOARD; },

  // Doctors
  async getDoctors({ search, available, specialization, location } = {}) {
    await delay();
    let list = store.doctors;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(d => d.name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q));
    }
    if (specialization && specialization !== 'All') list = list.filter(d => d.specialization === specialization);
    if (location && location !== 'All') list = list.filter(d => (d.location || '').toLowerCase().includes(location.toLowerCase()));
    if (available !== undefined) list = list.filter(d => String(d.available) === available);
    return list;
  },
  async createDoctor(body) {
    await delay();
    const doc = { _id: uid(), ...body };
    store.doctors.unshift(doc);
    return doc;
  },
  async updateDoctor(id, body) {
    await delay();
    const i = store.doctors.findIndex(d => d._id === id);
    if (i < 0) throw new Error('Not found');
    store.doctors[i] = { ...store.doctors[i], ...body };
    return store.doctors[i];
  },
  async deleteDoctor(id) {
    await delay();
    store.doctors = store.doctors.filter(d => d._id !== id);
    return { message: 'Deleted' };
  },

  // Patients
  async getPatients({ search, status } = {}) {
    await delay();
    return filterList(store.patients, { search, fields:['name','disease','doctor'], status });
  },
  async createPatient(body) {
    await delay();
    const p = { _id: uid(), ...body };
    store.patients.unshift(p);
    return p;
  },
  async updatePatient(id, body) {
    await delay();
    const i = store.patients.findIndex(p => p._id === id);
    if (i < 0) throw new Error('Not found');
    store.patients[i] = { ...store.patients[i], ...body };
    return store.patients[i];
  },
  async deletePatient(id) {
    await delay();
    store.patients = store.patients.filter(p => p._id !== id);
    return { message: 'Deleted' };
  },

  // Appointments
  async getAppointments({ status, search, patient, doctor } = {}) {
    await delay();
    let list = store.appointments;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.patient.toLowerCase().includes(q) || a.doctor.toLowerCase().includes(q) || a.department.toLowerCase().includes(q));
    }
    if (status && status !== 'All') list = list.filter(a => a.status === status);
    if (patient) list = list.filter(a => a.patient.toLowerCase().includes(patient.toLowerCase()));
    if (doctor) list = list.filter(a => a.doctor.toLowerCase().includes(doctor.toLowerCase()));
    return list;
  },
  async createAppointment(body) {
    await delay();
    const a = { _id: uid(), ...body };
    store.appointments.unshift(a);
    return a;
  },
  async updateAppointment(id, body) {
    await delay();
    const i = store.appointments.findIndex(a => a._id === id);
    if (i < 0) throw new Error('Not found');
    store.appointments[i] = { ...store.appointments[i], ...body };
    return store.appointments[i];
  },
  async deleteAppointment(id) {
    await delay();
    store.appointments = store.appointments.filter(a => a._id !== id);
    return { message: 'Deleted' };
  },

  // Records
  async getRecords({ search, type, patient } = {}) {
    await delay();
    let list = store.records;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.patient.toLowerCase().includes(q) || r.doctor.toLowerCase().includes(q) || r.diagnosis.toLowerCase().includes(q));
    }
    if (type && type !== 'All') list = list.filter(r => r.type === type);
    if (patient) list = list.filter(r => r.patient.toLowerCase().includes(patient.toLowerCase()));
    return list;
  },
  async createRecord(body) {
    await delay();
    const r = { _id: uid(), ...body };
    store.records.unshift(r);
    return r;
  },
  async deleteRecord(id) {
    await delay();
    store.records = store.records.filter(r => r._id !== id);
    return { message: 'Deleted' };
  },

  // Billing
  async getBilling({ search, status, patient } = {}) {
    await delay();
    let bills = store.bills;
    if (search) {
      const q = search.toLowerCase();
      bills = bills.filter(b => b.patient.toLowerCase().includes(q) || b.invoiceId.toLowerCase().includes(q) || b.service.toLowerCase().includes(q));
    }
    if (status && status !== 'All') bills = bills.filter(b => b.status === status);
    if (patient) bills = bills.filter(b => b.patient.toLowerCase().includes(patient.toLowerCase()));
    const total = bills.reduce((s, b) => s + (b.amount || 0), 0);
    const paid  = bills.reduce((s, b) => s + (b.paid || 0), 0);
    return { bills, summary: { total, paid } };
  },
  async getLabServices() {
    await delay();
    return LAB_SERVICES;
  },
  async createBill(body) {
    await delay();
    const invoiceId = `INV-${String(store.bills.length + 1).padStart(4, '0')}`;
    const b = { _id: uid(), invoiceId, ...body };
    store.bills.unshift(b);
    return b;
  },
  async updateBill(id, body) {
    await delay();
    const i = store.bills.findIndex(b => b._id === id);
    if (i < 0) throw new Error('Not found');
    store.bills[i] = { ...store.bills[i], ...body };
    return store.bills[i];
  },
  async deleteBill(id) {
    await delay();
    store.bills = store.bills.filter(b => b._id !== id);
    return { message: 'Deleted' };
  },

  // Reviews
  async getReviews({ doctorId } = {}) {
    await delay();
    if (doctorId) return store.reviews.filter(r => r.doctorId === doctorId);
    return store.reviews;
  },
  async createReview(body) {
    await delay();
    const r = { _id: uid(), ...body, date: new Date().toISOString().split('T')[0] };
    store.reviews.unshift(r);
    return r;
  },
  async deleteReview(id) {
    await delay();
    store.reviews = store.reviews.filter(r => r._id !== id);
    return { message: 'Deleted' };
  },

  // Notifications
  async getNotifications({ userId } = {}) {
    await delay();
    if (userId) return store.notifications.filter(n => n.userId === userId);
    return store.notifications;
  },
  async getUnreadCount() {
    await delay();
    return { count: store.notifications.filter(n => !n.read).length };
  },
  async markAllRead() {
    await delay();
    store.notifications.forEach(n => n.read = true);
    return { message: 'All notifications marked as read' };
  },
  async clearAllNotifications() {
    await delay();
    store.notifications = [];
    return { message: 'All notifications cleared' };
  },
  async markNotificationRead(id) {
    await delay();
    const i = store.notifications.findIndex(n => n._id === id);
    if (i >= 0) store.notifications[i].read = true;
    return { message: 'Updated' };
  },
  async createNotification(body) {
    await delay();
    const n = { _id: uid(), ...body, date: new Date().toISOString().split('T')[0], read: false };
    store.notifications.unshift(n);
    return n;
  },
  async deleteNotification(id) {
    await delay();
    store.notifications = store.notifications.filter(n => n._id !== id);
    return { message: 'Deleted' };
  },
  async broadcastNotification({ title, message, type, target_role }) {
    await delay();
    const users = Object.values(MOCK_USERS).filter(u => u.role === (target_role || 'patient'));
    users.forEach(u => {
      store.notifications.unshift({ _id: uid(), title, message, type: type || 'system', read: false, date: new Date().toISOString().split('T')[0], userId: u.id });
    });
    return { message: `Notification sent to ${users.length} users` };
  },

  // Departments
  async getDepartments() {
    await delay();
    return store.departments;
  },
  async createDepartment(body) {
    await delay();
    const d = { _id: uid(), ...body };
    store.departments.unshift(d);
    return d;
  },
  async updateDepartment(id, body) {
    await delay();
    const i = store.departments.findIndex(d => d._id === id);
    if (i < 0) throw new Error('Not found');
    store.departments[i] = { ...store.departments[i], ...body };
    return store.departments[i];
  },
  async deleteDepartment(id) {
    await delay();
    store.departments = store.departments.filter(d => d._id !== id);
    return { message: 'Deleted' };
  },

  // Emergency
  MOCK_EMERGENCY: [
    { _id: 'em1', patientName: 'John Doe', condition: 'Cardiac Arrest', severity: 'Critical', status: 'Pending', createdAt: new Date() },
    { _id: 'em2', patientName: 'Jane Smith', condition: 'Road Accident', severity: 'Serious', status: 'Assigned', assignedDoctorName: 'Dr. Sharma', createdAt: new Date(Date.now() - 3600000) },
    { _id: 'em3', patientName: 'Mike Johnson', condition: 'Severe Bleeding', severity: 'Critical', status: 'Under Treatment', assignedDoctorName: 'Dr. Patel', createdAt: new Date(Date.now() - 7200000) },
    { _id: 'em4', patientName: 'Sarah Williams', condition: 'Fracture', severity: 'Stable', status: 'Assigned', assignedDoctorName: 'Dr. Kumar', createdAt: new Date(Date.now() - 10800000) },
  ],
  async getEmergencies({ status, severity } = {}) {
    await delay();
    let list = [...this.MOCK_EMERGENCY];
    if (status && status !== 'All') list = list.filter(e => e.status === status);
    if (severity && severity !== 'All') list = list.filter(e => e.severity === severity);
    return list;
  },
  async createEmergency(body) {
    await delay();
    const e = { _id: uid(), ...body, status: 'Pending', createdAt: new Date() };
    this.MOCK_EMERGENCY.unshift(e);
    return e;
  },
  async assignEmergencyDoctor(id, doctorId, doctorName) {
    await delay();
    const e = this.MOCK_EMERGENCY.find(e => e._id === id);
    if (e) { e.assignedDoctor = doctorId; e.assignedDoctorName = doctorName; e.status = 'Assigned'; }
    return e;
  },
  async updateEmergencyStatus(id, status) {
    await delay();
    const e = this.MOCK_EMERGENCY.find(e => e._id === id);
    if (e) e.status = status;
    return e;
  },
  async addEmergencyNote(id, text) {
    await delay();
    const e = this.MOCK_EMERGENCY.find(e => e._id === id);
    if (e) e.notes = e.notes || [];
    e.notes.push({ text, timestamp: new Date(), doctorName: 'Current Doctor' });
    return e;
  },
  async getEmergencyStats() {
    await delay();
    return { total: this.MOCK_EMERGENCY.length, critical: this.MOCK_EMERGENCY.filter(e => e.severity === 'Critical' && !['Discharged','Transferred','Rejected'].includes(e.status)).length };
  },

  // Payments
  async getPayments({ status, patient_id } = {}) {
    await delay();
    let payments = store.payments;
    if (status && status !== 'All') payments = payments.filter(p => p.status === status);
    if (patient_id) payments = payments.filter(p => p.patient_id === patient_id);
    const total_amount = payments.reduce((s, p) => s + (p.amount || 0), 0);
    return { payments, total_amount };
  },
  async createPayment(body) {
    await delay();
    const p = { _id: uid(), transaction_id: `TXN-${Date.now()}`, ...body };
    store.payments.unshift(p);
    return p;
  },
  async updatePayment(id, body) {
    await delay();
    const i = store.payments.findIndex(p => p._id === id);
    if (i < 0) throw new Error('Not found');
    store.payments[i] = { ...store.payments[i], ...body };
    return store.payments[i];
  },

  // Doctor Schedule
  async updateDoctorSchedule(id, { time_slots, weekly_schedule, leaves }) {
    await delay();
    const i = store.doctors.findIndex(d => d._id === id);
    if (i < 0) throw new Error('Not found');
    if (time_slots) store.doctors[i].time_slots = time_slots;
    if (weekly_schedule) store.doctors[i].weekly_schedule = weekly_schedule;
    if (leaves) store.doctors[i].leaves = leaves;
    return store.doctors[i];
  },
  async approveDoctor(id) {
    await delay();
    const i = store.doctors.findIndex(d => d._id === id);
    if (i >= 0) store.doctors[i].approved = true;
    return { message: 'Doctor approved' };
  },
  async rejectDoctor(id) {
    await delay();
    const i = store.doctors.findIndex(d => d._id === id);
    if (i >= 0) store.doctors[i].approved = false;
    return { message: 'Doctor rejected' };
  },
};

// ─── Real API (when backend is running) ───────────────────────────────────
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
let useBackend = false;

/** Same token order as login: prefer `hms_token` (real JWT), not legacy `token`. */
export function getStoredAuthToken() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('hms_token') || localStorage.getItem('token');
}

async function request(path, options = {}) {
  console.log('API Request:', path);
  const token = getStoredAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  console.log('API Headers:', headers);
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  console.log('API Response status:', res.status, path);
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || 'Request failed');
    Object.assign(error, data, { status: res.status });
    throw error;
  }
  return data;
}

// Try backend health on load; fall back silently to mock
fetch(`${BASE}/health`, { signal: AbortSignal.timeout(20000) })
  .then(r => {
    if (r.ok) {
      useBackend = true;
      console.log('Backend is available');
    } else {
      console.log('Backend health check failed:', r.status);
    }
  })
  .catch(e => console.log('Backend not available, using mock:', e.message));

// Smart dispatcher: tries backend first, falls back to mock only for non-critical ops
// Auth operations must use backend - fail if backend is unavailable (don't silently use mock)
const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/me', '/auth/profile', '/auth/change-password', '/auth/verify-otp', '/auth/resend-otp', '/auth/forgot-password', '/auth/reset-password'];
function isAuthPath(path) {
  return AUTH_PATHS.some(p => path.startsWith(p));
}

// Re-check health if previous check failed and this is an auth request
async function checkHealth() {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      useBackend = true;
      console.log('Backend now available');
      return true;
    }
  } catch (e) {
    console.log('Health check retry failed:', e.message);
  }
  return false;
}

async function dispatch(mockFn, realPath, realOpts) {
  console.log('dispatch called for:', realPath, 'useBackend:', useBackend);
  
  // If backend is available, always try it
  if (useBackend) {
    try {
      const res = await request(realPath, realOpts);
      return res;
    } catch (error) {
      console.log('Backend error for', realPath, ':', error.message);
      // For auth operations, retry health check then try once more
      if (isAuthPath(realPath)) {
        console.log('Auth path failed, retrying health check...');
        const recovered = await checkHealth();
        if (recovered) {
          try {
            const res = await request(realPath, realOpts);
            return res;
          } catch (retryError) {
            console.log('Retry failed:', retryError.message);
            throw retryError;
          }
        }
        throw error;
      }
      // For non-auth, fall back to mock
      console.log('Falling back to mock for this request only');
      return mockFn();
    }
  }
  
  // Backend not available - check if it's an auth path
  if (isAuthPath(realPath)) {
    // Try health check first for auth paths
    const recovered = await checkHealth();
    if (recovered) {
      try {
        const res = await request(realPath, realOpts);
        return res;
      } catch (error) {
        console.log('Backend error for', realPath, ':', error.message);
        throw error;
      }
    }
    // Can't reach backend - try anyway and show error
    try {
      const res = await request(realPath, realOpts);
      return res;
    } catch (error) {
      console.log('Backend error for', realPath, ':', error.message);
      throw new Error('Unable to connect to server. If using the deployed app, it may be starting up. Please try again in a few seconds, or run the backend locally.');
    }
  }
  
  // For non-auth paths, use mock when backend unavailable
  console.log('Using mock for:', realPath);
  return mockFn();
}

export async function downloadInvoicePdf(billId, filename = 'invoice.pdf') {
  const token = getStoredAuthToken();
  const res = await fetch(`${BASE}/billing/${billId}/invoice`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    let message = 'Unable to download invoice';
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      // Keep the generic message for non-JSON failures.
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Public API surface ────────────────────────────────────────────────────
export const api = {
  login:         (body)    => dispatch(() => mock.login(body),                         '/auth/login',       { method:'POST', body: JSON.stringify(body) }),
  register:      (body)    => dispatch(() => mock.register(body),                      '/auth/register',    { method:'POST', body: JSON.stringify(body) }),
  verifyOTP:     (body)    => dispatch(() => mock.verifyOTP(body),                     '/auth/verify-otp',  { method:'POST', body: JSON.stringify(body) }),
  resendOTP:     (body)    => dispatch(() => mock.resendOTP(body),                     '/auth/resend-otp',  { method:'POST', body: JSON.stringify(body) }),
  forgotPassword:(body)    => dispatch(() => Promise.resolve({ message: 'Password reset OTP sent to your email.' }), '/auth/forgot-password', { method:'POST', body: JSON.stringify(body) }),
  resetPassword: (body)    => dispatch(() => Promise.resolve({ message: 'Password updated successfully. You can now login.' }), '/auth/reset-password', { method:'POST', body: JSON.stringify(body) }),
  me:            ()        => dispatch(() => mock.me(),                                '/auth/me'),
  updateProfile: (body)    => dispatch(() => mock.updateProfile(body),                 '/auth/profile',     { method:'PUT',  body: JSON.stringify(body) }),
  changePassword:(body)    => dispatch(() => mock.changePassword(body),                '/auth/change-password', { method:'PUT', body: JSON.stringify(body) }),
  dashboardStats:()        => dispatch(() => mock.dashboardStats(),                    '/dashboard/stats'),

  getUsers:      (p={})    => dispatch(() => mock.getUsers(p),                         '/users?'             + new URLSearchParams(p)),
  deleteUser:    (id)      => dispatch(() => mock.deleteUser(id),                      `/users/${id}`,       { method:'DELETE' }),
  blockUser:     (id)      => dispatch(() => mock.blockUser(id),                       `/users/${id}/block`, { method:'PUT' }),

  getDoctors:    (p={})    => dispatch(() => mock.getDoctors(p),                       '/doctors?'           + new URLSearchParams(p)),
  createDoctor:  (body)    => dispatch(() => mock.createDoctor(body),                  '/doctors',           { method:'POST',   body: JSON.stringify(body) }),
  updateDoctor:  (id,body) => dispatch(() => mock.updateDoctor(id,body),               `/doctors/${id}`,     { method:'PUT',    body: JSON.stringify(body) }),
  deleteDoctor:  (id)      => dispatch(() => mock.deleteDoctor(id),                    `/doctors/${id}`,     { method:'DELETE' }),

  getPatients:   (p={})    => dispatch(() => mock.getPatients(p),                      '/patients?'          + new URLSearchParams(p)),
  createPatient: (body)    => dispatch(() => mock.createPatient(body),                 '/patients',          { method:'POST',   body: JSON.stringify(body) }),
  updatePatient: (id,body) => dispatch(() => mock.updatePatient(id,body),              `/patients/${id}`,    { method:'PUT',    body: JSON.stringify(body) }),
  deletePatient: (id)      => dispatch(() => mock.deletePatient(id),                   `/patients/${id}`,    { method:'DELETE' }),

  getAppointments:(p={})   => dispatch(() => mock.getAppointments(p),                  '/appointments?'      + new URLSearchParams(p)),
  getMyAppointments:(p={}) => dispatch(() => mock.getAppointments(p),                  '/appointments/my-appointments?' + new URLSearchParams(p)),
  createAppointment:(body) => dispatch(() => mock.createAppointment(body),             '/appointments',      { method:'POST',   body: JSON.stringify(body) }),
  updateAppointment:(id,b) => dispatch(() => mock.updateAppointment(id,b),             `/appointments/${id}`,{ method:'PUT',    body: JSON.stringify(b) }),
  deleteAppointment:(id)   => dispatch(() => mock.deleteAppointment(id),               `/appointments/${id}`,{ method:'DELETE' }),

  getRecords:    (p={})    => dispatch(() => mock.getRecords(p),                       '/records?'           + new URLSearchParams(p)),
  getPatientRecords:(pid)  => dispatch(() => mock.getRecords({}),                      `/records/patient/${pid}`),
  createRecord:  (body)    => dispatch(() => mock.createRecord(body),                  '/records',           { method:'POST',   body: JSON.stringify(body) }),
  deleteRecord:  (id)      => dispatch(() => mock.deleteRecord(id),                    `/records/${id}`,     { method:'DELETE' }),

  getBilling:    (p={})    => dispatch(() => mock.getBilling(p),                       '/billing?'           + new URLSearchParams(p)),
  createBill:    (body)    => dispatch(() => mock.createBill(body),                    '/billing',           { method:'POST',   body: JSON.stringify(body) }),
  payBill:       (id,body) => dispatch(() => mock.updateBill(id,body),                  `/billing/${id}/pay`,{ method:'POST',   body: JSON.stringify(body) }),
  updateBill:    (id,body) => dispatch(() => mock.updateBill(id,body),                 `/billing/${id}`,    { method:'PUT',    body: JSON.stringify(body) }),
  deleteBill:    (id)      => dispatch(() => mock.deleteBill(id),                      `/billing/${id}`,    { method:'DELETE' }),
  getLabServices: ()     => dispatch(() => Promise.resolve(LAB_SERVICES),      '/billing/services'),

  getReviews:    (p={})    => dispatch(() => mock.getReviews(p),                       '/reviews?'           + new URLSearchParams(p)),
  createReview:  (body)    => dispatch(() => mock.createReview(body),                  '/reviews',           { method:'POST',   body: JSON.stringify(body) }),
  deleteReview:  (id)      => dispatch(() => mock.deleteReview(id),                    `/reviews/${id}`,     { method:'DELETE' }),

  getNotifications:(p={})  => dispatch(() => mock.getNotifications(p),                 '/notifications?'     + new URLSearchParams(p)),
  getUnreadCount:    ()      => dispatch(() => mock.getUnreadCount(),                   '/notifications/unread-count'),
  markAllRead:       ()      => dispatch(() => mock.markAllRead(),                     '/notifications/mark-all-read', { method:'PUT' }),
  clearAllNotifications:()  => dispatch(() => mock.clearAllNotifications(),             '/notifications/clear-all', { method:'DELETE' }),
  markNotificationRead:(id)=> dispatch(() => mock.markNotificationRead(id),            `/notifications/${id}/read`, { method:'PUT' }),
  createNotification:(body)=> dispatch(() => mock.createNotification(body),            '/notifications',     { method:'POST',   body: JSON.stringify(body) }),
  deleteNotification:(id)  => dispatch(() => mock.deleteNotification(id),              `/notifications/${id}`, { method:'DELETE' }),
  broadcastNotification:(body)=> dispatch(() => mock.broadcastNotification(body),      '/notifications/broadcast', { method:'POST', body: JSON.stringify(body) }),

  getDepartments:  ()      => dispatch(() => mock.getDepartments(),                    '/departments'),
  createDepartment:(body)  => dispatch(() => mock.createDepartment(body),              '/departments',       { method:'POST',   body: JSON.stringify(body) }),
  updateDepartment:(id,b)  => dispatch(() => mock.updateDepartment(id,b),              `/departments/${id}`, { method:'PUT',    body: JSON.stringify(b) }),
  deleteDepartment:(id)    => dispatch(() => mock.deleteDepartment(id),                `/departments/${id}`, { method:'DELETE' }),

  getEmergencies:     (p={})  => dispatch(() => mock.getEmergencies(p),                    '/emergency'),
  createEmergency:   (body)  => dispatch(() => mock.createEmergency(body),                 '/emergency',         { method:'POST',   body: JSON.stringify(body) }),
  assignEmergencyDoctor:(id,docId,docName)=> dispatch(() => mock.assignEmergencyDoctor(id,docId,docName), `/emergency/${id}/assign`, { method:'PUT', body: JSON.stringify({ doctorId: docId, doctorName: docName }) }),
  updateEmergencyStatus:(id,status)=> dispatch(() => mock.updateEmergencyStatus(id,status),   `/emergency/${id}/status`, { method:'PUT', body: JSON.stringify({ status }) }),
  addEmergencyNote:  (id,text)=> dispatch(() => mock.addEmergencyNote(id,text),              `/emergency/${id}/notes`, { method:'POST', body: JSON.stringify({ text }) }),
  getEmergencyStats: ()      => dispatch(() => mock.getEmergencyStats(),                   '/emergency/stats'),

  getPayments:     (p={})  => dispatch(() => mock.getPayments(p),                      '/payments?'          + new URLSearchParams(p)),
  createPayment:   (body)  => dispatch(() => mock.createPayment(body),                 '/payments',          { method:'POST',   body: JSON.stringify(body) }),
  updatePayment:   (id,b)  => dispatch(() => mock.updatePayment(id,b),                 `/payments/${id}`,    { method:'PUT',    body: JSON.stringify(b) }),

  updateDoctorSchedule:(id,b)=> dispatch(() => mock.updateDoctorSchedule(id,b),        `/doctors/${id}/schedule`, { method:'PUT', body: JSON.stringify(b) }),
  approveDoctor:   (id)    => dispatch(() => mock.approveDoctor(id),                   `/doctors/${id}/approve`, { method:'PUT' }),
  rejectDoctor:    (id)    => dispatch(() => mock.rejectDoctor(id),                    `/doctors/${id}/reject`,  { method:'PUT' }),
};
