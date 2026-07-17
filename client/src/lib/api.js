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
  'clinic.doc@medicare.com':  { id: '7', name: 'Dr. Clinic Doc',  email: 'clinic.doc@medicare.com',  role: 'clinic_doctor', password: 'password', phone: '', status: 'active', isVerified: true, doctorApproved: true },
  'patient@medicare.com':     { id: '3', name: 'John Patient',    email: 'patient@medicare.com',     role: 'patient', password: 'password', phone: '', status: 'active', isVerified: true },
};

const MOCK_DOCTORS = [
  { _id:'d1', name:'Dr. Sarah Smith',  specialization:'Cardiology',   experience:'12 years', rating:4.8, patients:1250, available:true,  phone:'+1 234-567-8901', email:'sarah.smith@medicare.com',  initials:'SS', fees:500, consultation_fees:500, location:'New York, NY', qualifications:'MBBS, MD Cardiology', bio:'Expert cardiologist with 12 years of experience in heart diseases.', time_slots:['09:00 AM','10:00 AM','11:00 AM','02:00 PM','03:00 PM','04:00 PM'], weekly_schedule:{monday:true,tuesday:true,wednesday:true,thursday:true,friday:true,saturday:false,sunday:false}, leaves:[], approved:true, user_id:'2', reviews_count:3 },
  { _id:'d2', name:'Dr. Raj Patel',    specialization:'Neurology',    experience:'8 years',  rating:4.9, patients:890,  available:true,  phone:'+1 234-567-8902', email:'raj.patel@medicare.com',    initials:'RP', fees:600, consultation_fees:600, location:'Los Angeles, CA', qualifications:'MBBS, DM Neurology', bio:'Specialized in neurological disorders and brain health.', time_slots:['09:00 AM','10:00 AM','11:00 AM','02:00 PM','03:00 PM','04:00 PM'], weekly_schedule:{monday:true,tuesday:true,wednesday:true,thursday:true,friday:true,saturday:true,sunday:false}, leaves:[], approved:true, user_id:'', reviews_count:2 },
  { _id:'d3', name:'Dr. Emily Lee',    specialization:'Orthopedics',  experience:'15 years', rating:4.7, patients:2100, available:false, phone:'+1 234-567-8903', email:'emily.lee@medicare.com',    initials:'EL', fees:450, consultation_fees:450, location:'Chicago, IL', qualifications:'MBBS, MS Orthopedics', bio:'Bone and joint specialist with extensive surgical experience.', time_slots:['10:00 AM','11:00 AM','02:00 PM','03:00 PM'], weekly_schedule:{monday:true,tuesday:true,wednesday:true,thursday:true,friday:false,saturday:false,sunday:false}, leaves:['2024-04-15'], approved:true, user_id:'', reviews_count:0 },
  { _id:'d4', name:'Dr. Carlos Garcia',specialization:'Pediatrics',   experience:'10 years', rating:4.6, patients:1800, available:true,  phone:'+1 234-567-8904', email:'carlos.garcia@medicare.com',initials:'CG', fees:350, consultation_fees:350, location:'Houston, TX', qualifications:'MBBS, DCH Pediatrics', bio:'Dedicated pediatrician caring for children of all ages.', time_slots:['09:00 AM','10:00 AM','11:00 AM','02:00 PM','03:00 PM','04:00 PM'], weekly_schedule:{monday:true,tuesday:true,wednesday:true,thursday:true,friday:true,saturday:true,sunday:false}, leaves:[], approved:true, user_id:'', reviews_count:1 },
  { _id:'d5', name:'Dr. Min Kim',      specialization:'Dermatology',  experience:'6 years',  rating:4.8, patients:650,  available:true,  phone:'+1 234-567-8905', email:'min.kim@medicare.com',      initials:'MK', fees:400, consultation_fees:400, location:'Phoenix, AZ', qualifications:'MBBS, MD Dermatology', bio:'Skin care expert specializing in cosmetic and medical dermatology.', time_slots:['09:00 AM','10:00 AM','11:00 AM','02:00 PM','03:00 PM'], weekly_schedule:{monday:true,tuesday:true,wednesday:true,thursday:true,friday:true,saturday:false,sunday:false}, leaves:[], approved:true, user_id:'', reviews_count:1 },
  { _id:'d6', name:'Dr. Anna Wilson',  specialization:'Oncology',     experience:'20 years', rating:4.9, patients:3200, available:false, phone:'+1 234-567-8906', email:'anna.wilson@medicare.com',  initials:'AW', fees:800, consultation_fees:800, location:'Philadelphia, PA', qualifications:'MBBS, DM Oncology', bio:'Leading oncologist with 20 years of cancer treatment expertise.', time_slots:['10:00 AM','11:00 AM','02:00 PM','03:00 PM'], weekly_schedule:{monday:true,tuesday:true,wednesday:true,thursday:true,friday:false,saturday:false,sunday:false}, leaves:[], approved:true, user_id:'', reviews_count:0 },
  { _id:'d7', name:'Dr. Clinic Doc',   specialization:'General Medicine', experience:'5 years',  rating:4.5, patients:450,  available:true,  phone:'+1 234-567-8907', email:'clinic.doc@medicare.com',   initials:'CD', fees:350, consultation_fees:350, home_visit_fee:700, follow_up_fee:200, video_consult_fee:300, custom_services:[], location:'Austin, TX', qualifications:'MBBS', bio:'Dedicated clinic doctor providing comprehensive primary care.', time_slots:['09:00 AM','10:00 AM','11:00 AM','02:00 PM','03:00 PM','04:00 PM','05:00 PM'], weekly_schedule:{monday:true,tuesday:true,wednesday:true,thursday:true,friday:true,saturday:true,sunday:false}, leaves:[], approved:true, user_id:'7', reviews_count:1 },
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
const MOCK_HOSPITALS = [
  { _id:'h1', name:'City General Hospital', slug:'city-general-hospital', email:'contact@citygeneral.com', phone:'+1 234-567-8001', address:'123 Healthcare Ave', city:'New York', state:'NY', licenseNumber:'LIC-001', logo:'', description:'Leading multispeciality hospital with 24/7 emergency care, modern diagnostic facilities, and experienced medical professionals.', specialties:['Cardiology','Neurology','Orthopedics','Pediatrics','Oncology'], status:'approved', rating:4.5, reviewsCount:128, subscriptionPlan:'premium', createdAt:'2024-01-15' },
  { _id:'h2', name:'Sunrise Medical Center', slug:'sunrise-medical-center', email:'info@sunrisemed.com', phone:'+1 234-567-8002', address:'456 Health Blvd', city:'Los Angeles', state:'CA', licenseNumber:'LIC-002', logo:'', description:'State-of-the-art medical center specializing in cardiac care, neurology, and advanced surgical procedures.', specialties:['Cardiology','Neurology','Orthopedics','General Medicine'], status:'approved', rating:4.2, reviewsCount:89, subscriptionPlan:'basic', createdAt:'2024-02-20' },
  { _id:'h3', name:'Green Valley Hospital', slug:'green-valley-hospital', email:'admin@greenvalley.com', phone:'+1 234-567-8003', address:'789 Wellness Dr', city:'Chicago', state:'IL', licenseNumber:'LIC-003', logo:'', description:'Community-focused hospital providing quality healthcare with compassion and cutting-edge technology.', specialties:['Pediatrics','Dermatology','General Medicine','ENT'], status:'approved', rating:4.7, reviewsCount:215, subscriptionPlan:'basic', createdAt:'2024-03-10' },
  { _id:'h4', name:'Pristine Care Hospital', slug:'pristine-care-hospital', email:'hello@pristinecare.com', phone:'+1 234-567-8004', address:'321 Recovery Ln', city:'Houston', state:'TX', licenseNumber:'LIC-004', logo:'', description:'Premium healthcare facility with world-class infrastructure and internationally trained doctors.', specialties:['Cardiology','Oncology','Neurology','Orthopedics'], status:'approved', rating:4.8, reviewsCount:342, subscriptionPlan:'premium', createdAt:'2024-01-05' },
  { _id:'h5', name:'Lakeside Clinic', slug:'lakeside-clinic', email:'contact@lakeside.com', phone:'+1 234-567-8005', address:'555 Lake View Rd', city:'Phoenix', state:'AZ', licenseNumber:'LIC-005', logo:'', description:'A boutique clinic offering personalized healthcare services in a comfortable, patient-friendly environment.', specialties:['Dermatology','General Medicine','ENT'], status:'pending', rating:0, reviewsCount:0, subscriptionPlan:'free', createdAt:'2024-07-01' },
];

const MOCK_BEDS = [
  { _id:'b1', bedNumber:'G-01', ward:'General', bedType:'General', status:'Available', dailyRate:1500, floor:'1st Floor', isAC:false, hospitalId:'h1' },
  { _id:'b2', bedNumber:'G-02', ward:'General', bedType:'General', status:'Occupied', dailyRate:1500, floor:'1st Floor', isAC:false, hospitalId:'h1', currentPatientName:'Ravi Kumar' },
  { _id:'b3', bedNumber:'G-03', ward:'General', bedType:'General', status:'Available', dailyRate:1500, floor:'1st Floor', isAC:false, hospitalId:'h1' },
  { _id:'b4', bedNumber:'SP-01', ward:'Semi-Private', bedType:'Semi-Private', status:'Available', dailyRate:2500, floor:'2nd Floor', isAC:true, hospitalId:'h1' },
  { _id:'b5', bedNumber:'SP-02', ward:'Semi-Private', bedType:'Semi-Private', status:'Under Cleaning', dailyRate:2500, floor:'2nd Floor', isAC:true, hospitalId:'h1' },
  { _id:'b6', bedNumber:'P-01', ward:'Private', bedType:'Private', status:'Available', dailyRate:4000, floor:'3rd Floor', isAC:true, hospitalId:'h1' },
  { _id:'b7', bedNumber:'ICU-01', ward:'ICU', bedType:'ICU', status:'Occupied', dailyRate:8000, floor:'4th Floor', isAC:true, hospitalId:'h1', currentPatientName:'Sunita Sharma' },
  { _id:'b8', bedNumber:'ICU-02', ward:'ICU', bedType:'ICU', status:'Maintenance', dailyRate:8000, floor:'4th Floor', isAC:true, hospitalId:'h1' },
  { _id:'b9', bedNumber:'ER-01', ward:'Emergency', bedType:'General', status:'Available', dailyRate:2000, floor:'Ground Floor', isAC:false, hospitalId:'h1' },
  { _id:'b10', bedNumber:'NICU-01', ward:'NICU', bedType:'NICU', status:'Available', dailyRate:10000, floor:'5th Floor', isAC:true, hospitalId:'h1' },
];

const MOCK_TESTS = [
  { _id:'t1', name:'Complete Blood Count (CBC)', category:'Blood Test', department:'Pathology', price:299, mrp:499, discount:40, reportTime:'6 hrs', prescriptionReq:false, homeCollection:true, homeCollectionFee:50, popular:true, nablAccredited:true, reportsOnline:true, description:'Measures overall health and detects a wide range of disorders.', preparation:'No special preparation required' },
  { _id:'t2', name:'Lipid Profile', category:'Blood Test', department:'Pathology', price:399, mrp:699, discount:43, reportTime:'12 hrs', prescriptionReq:false, homeCollection:true, homeCollectionFee:50, popular:true, nablAccredited:true, reportsOnline:true, description:'Measures cholesterol levels and helps assess cardiovascular risk.', preparation:'Fasting for 9-12 hours required' },
  { _id:'t3', name:'Thyroid Profile (T3, T4, TSH)', category:'Hormone', department:'Pathology', price:449, mrp:799, discount:44, reportTime:'24 hrs', prescriptionReq:false, homeCollection:true, homeCollectionFee:50, popular:false, nablAccredited:true, reportsOnline:true, description:'Evaluates thyroid gland function.', preparation:'No special preparation required' },
  { _id:'t4', name:'Blood Sugar (Fasting & PP)', category:'Blood Test', department:'Pathology', price:199, mrp:349, discount:43, reportTime:'6 hrs', prescriptionReq:false, homeCollection:true, homeCollectionFee:50, popular:true, nablAccredited:true, reportsOnline:true, description:'Measures blood glucose levels to screen for diabetes.', preparation:'Fasting for 8 hours required' },
  { _id:'t5', name:'Urine Routine & Microscopy', category:'Urine/Stool', department:'Pathology', price:149, mrp:249, discount:40, reportTime:'6 hrs', prescriptionReq:false, homeCollection:true, homeCollectionFee:50, popular:false, nablAccredited:true, reportsOnline:true, description:'Screens for urinary tract infections and kidney disorders.', preparation:'First morning urine sample preferred' },
  { _id:'t6', name:'Liver Function Test (LFT)', category:'Blood Test', department:'Pathology', price:349, mrp:599, discount:42, reportTime:'12 hrs', prescriptionReq:false, homeCollection:true, homeCollectionFee:50, popular:false, nablAccredited:true, reportsOnline:true, description:'Evaluates liver health and function.', preparation:'Fasting for 8 hours recommended' },
  { _id:'t7', name:'ECG / Electrocardiogram', category:'Cardiac Basic', department:'Cardiology', price:299, mrp:499, discount:40, reportTime:'30 mins', prescriptionReq:true, homeCollection:false, homeCollectionFee:0, popular:false, nablAccredited:true, reportsOnline:true, quickTest:true, description:'Records electrical signals of the heart.', preparation:'Avoid caffeine before test' },
  { _id:'t8', name:'Chest X-Ray', category:'Basic Imaging', department:'Radiology', price:399, mrp:699, discount:43, reportTime:'2 hrs', prescriptionReq:true, homeCollection:false, homeCollectionFee:0, popular:false, nablAccredited:true, reportsOnline:true, description:'Creates images of the chest area to diagnose lung conditions.', preparation:'Wear comfortable clothing without metal' },
  { _id:'t9', name:'MRI Brain', category:'Advanced Imaging', department:'Radiology', price:4999, mrp:7999, discount:37, reportTime:'24 hrs', prescriptionReq:true, homeCollection:false, homeCollectionFee:0, popular:false, nablAccredited:true, reportsOnline:true, description:'Detailed brain imaging for neurological evaluation.', preparation:'Remove all metal objects' },
  { _id:'t10', name:'Vitamin D Test', category:'Vitamin', department:'Pathology', price:699, mrp:1199, discount:42, reportTime:'24 hrs', prescriptionReq:false, homeCollection:true, homeCollectionFee:50, popular:true, nablAccredited:true, reportsOnline:true, description:'Measures vitamin D levels in the blood.', preparation:'No special preparation required' },
];

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
  hospitals:    [...MOCK_HOSPITALS],
  beds:         [...MOCK_BEDS],
  tests:        [...MOCK_TESTS],
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
  async googleAuth({ idToken }) {
    await delay();
    const token = btoa(JSON.stringify({ id: 'google_user', role: 'patient', exp: Date.now() + 7*24*3600*1000 }));
    return {
      token,
      user: {
        id: 'google_user',
        name: 'Google User',
        email: 'google.user@example.com',
        role: 'patient',
        isVerified: true,
        settings: { ...DEFAULT_USER_SETTINGS },
      },
      googleUser: {
        name: 'Google User',
        email: 'google.user@example.com',
        avatar: '',
      },
    };
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
  async uploadAvatar(file) {
    await delay();
    const raw = localStorage.getItem('hms_token');
    const payload = JSON.parse(atob(raw));
    const u = Object.values(MOCK_USERS).find(x => x.id === payload.id);
    if (!u) throw new Error('User not found');

    const avatar = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Unable to read image file'));
      reader.readAsDataURL(file);
    });

    u.avatar = avatar;
    return {
      message: 'Profile photo updated successfully',
      avatar,
      user: {
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
      },
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

  // Platform Registration
  async registerPlatform(payload) {
    await delay(300);
    const id = 'plat_' + Date.now();
    store.doctors = [...(payload.doctors || []).map((d, i) => ({
      _id: 'new_doc_' + id + '_' + i, ...d, hospitalId: id, approved: false
    })), ...store.doctors];
    return { id, ...payload, message: 'Registration submitted for review' };
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

  // Hospital mocks
  async getHospitals(p = {}) {
    await delay();
    let list = [...store.hospitals];
    if (p.search) list = list.filter(h => h.name.toLowerCase().includes(p.search.toLowerCase()) || h.city?.toLowerCase().includes(p.search.toLowerCase()));
    if (p.city) list = list.filter(h => h.city?.toLowerCase() === p.city.toLowerCase());
    if (p.specialty) list = list.filter(h => h.specialties?.some(s => s.toLowerCase().includes(p.specialty.toLowerCase())));
    if (p.status) list = list.filter(h => h.status === p.status);
    return list;
  },
  async getHospital(id) {
    await delay();
    return store.hospitals.find(h => h._id === id) || null;
  },
  async registerHospital(body) {
    await delay();
    const h = { _id: 'h' + Date.now(), ...body, slug: body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), status: 'pending', rating: 0, reviewsCount: 0, createdAt: new Date().toISOString() };
    store.hospitals.push(h);
    return { hospital: h, message: 'Registration submitted for approval', tempPassword: 'Welcome@123' };
  },
  async updateHospital(id, body) {
    await delay();
    const i = store.hospitals.findIndex(h => h._id === id);
    if (i >= 0) Object.assign(store.hospitals[i], body);
    return { message: 'Hospital updated' };
  },
  async approveHospital(id) {
    await delay();
    const i = store.hospitals.findIndex(h => h._id === id);
    if (i >= 0) store.hospitals[i].status = 'approved';
    return { message: 'Hospital approved' };
  },
  async rejectHospital(id, body) {
    await delay();
    const i = store.hospitals.findIndex(h => h._id === id);
    if (i >= 0) { store.hospitals[i].status = 'rejected'; store.hospitals[i].rejectionReason = body.reason || ''; }
    return { message: 'Hospital rejected' };
  },
  async suspendHospital(id) {
    await delay();
    const i = store.hospitals.findIndex(h => h._id === id);
    if (i >= 0) store.hospitals[i].status = 'suspended';
    return { message: 'Hospital suspended' };
  },
  async getPendingHospitals() {
    await delay();
    return store.hospitals.filter(h => h.status === 'pending');
  },
  async getMyHospital() {
    await delay();
    return store.hospitals[0] || null;
  },

  // Beds
  async getBeds(p = {}) {
    await delay();
    let list = [...store.beds];
    if (p.ward) list = list.filter(b => b.ward === p.ward);
    if (p.status) list = list.filter(b => b.status === p.status);
    if (p.hospitalId) list = list.filter(b => b.hospitalId === p.hospitalId);
    return list;
  },
  async getBedStats() {
    await delay();
    const beds = store.beds;
    return {
      total: beds.length,
      available: beds.filter(b => b.status === 'Available').length,
      occupied: beds.filter(b => b.status === 'Occupied').length,
      maintenance: beds.filter(b => b.status === 'Under Cleaning' || b.status === 'Maintenance').length,
    };
  },
  async createBed(body) {
    await delay();
    const bed = { _id: 'b' + uid(), ...body, status: 'Available', createdAt: new Date().toISOString() };
    store.beds.unshift(bed);
    return bed;
  },
  async updateBed(id, body) {
    await delay();
    const i = store.beds.findIndex(b => b._id === id);
    if (i >= 0) store.beds[i] = { ...store.beds[i], ...body };
    return store.beds[i] || null;
  },
  async deleteBed(id) {
    await delay();
    store.beds = store.beds.filter(b => b._id !== id);
    return { message: 'Bed removed' };
  },

  // Tests
  async getTests(p = {}) {
    await delay();
    let list = [...store.tests];
    if (p.category) list = list.filter(t => t.category === p.category);
    if (p.department) list = list.filter(t => t.department === p.department);
    if (p.popular === 'true') list = list.filter(t => t.popular);
    if (p.hospitalId) list = list.filter(t => t.hospitalId === p.hospitalId);
    if (p.search) list = list.filter(t => t.name.toLowerCase().includes(p.search.toLowerCase()));
    return list;
  },
  async getTestStats() {
    await delay();
    const tests = store.tests;
    const categories = [...new Set(tests.map(t => t.category))];
    return {
      total: tests.length,
      popular: tests.filter(t => t.popular).length,
      homeCollection: tests.filter(t => t.homeCollection).length,
      prescriptionReq: tests.filter(t => t.prescriptionReq).length,
      categories: categories.length,
    };
  },
  async createTest(body) {
    await delay();
    const test = { _id: 't' + uid(), ...body, createdAt: new Date().toISOString() };
    if (!test.discount && test.mrp && test.price) test.discount = Math.round((1 - test.price / test.mrp) * 100);
    store.tests.unshift(test);
    return test;
  },
  async updateTest(id, body) {
    await delay();
    const i = store.tests.findIndex(t => t._id === id);
    if (i >= 0) {
      const updated = { ...store.tests[i], ...body };
      if (updated.mrp && updated.price) updated.discount = Math.round((1 - updated.price / updated.mrp) * 100);
      store.tests[i] = updated;
    }
    return store.tests[i] || null;
  },
  async deleteTest(id) {
    await delay();
    store.tests = store.tests.filter(t => t._id !== id);
    return { message: 'Test removed' };
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
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/me', '/auth/profile', '/auth/avatar', '/auth/change-password', '/auth/verify-otp', '/auth/resend-otp', '/auth/forgot-password', '/auth/reset-password'];
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
  googleAuth:    (body)    => dispatch(() => mock.googleAuth(body),                    '/auth/google',      { method:'POST', body: JSON.stringify(body) }),
  setDoctorPassword:(body) => dispatch(() => Promise.resolve({ message: 'Password set', step: 'otp' }), '/auth/doctor-setup', { method:'POST', body: JSON.stringify(body) }),
  register:      (body)    => dispatch(() => mock.register(body),                      '/auth/register',    { method:'POST', body: JSON.stringify(body) }),
  verifyOTP:     (body)    => dispatch(() => mock.verifyOTP(body),                     '/auth/verify-otp',  { method:'POST', body: JSON.stringify(body) }),
  resendOTP:     (body)    => dispatch(() => mock.resendOTP(body),                     '/auth/resend-otp',  { method:'POST', body: JSON.stringify(body) }),
  forgotPassword:(body)    => dispatch(() => Promise.resolve({ message: 'Password reset OTP sent to your email.' }), '/auth/forgot-password', { method:'POST', body: JSON.stringify(body) }),
  resetPassword: (body)    => dispatch(() => Promise.resolve({ message: 'Password updated successfully. You can now login.' }), '/auth/reset-password', { method:'POST', body: JSON.stringify(body) }),
  me:            ()        => dispatch(() => mock.me(),                                '/auth/me'),
  updateProfile: (body)    => dispatch(() => mock.updateProfile(body),                 '/auth/profile',     { method:'PUT',  body: JSON.stringify(body) }),
  uploadAvatar:  (file)    => {
    const body = new FormData();
    body.append('file', file);
    return dispatch(() => mock.uploadAvatar(file), '/auth/avatar', { method:'POST', body });
  },
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

  // Hospital endpoints
  getHospitals:        (p={})  => dispatch(() => mock.getHospitals ? mock.getHospitals(p) : Promise.resolve([]),            '/hospitals?' + new URLSearchParams(p)),
  getHospital:         (id)    => dispatch(() => mock.getHospital ? mock.getHospital(id) : Promise.resolve(null),           `/hospitals/${id}`),
  registerHospital:    (body)  => dispatch(() => mock.registerHospital ? mock.registerHospital(body) : Promise.resolve({}), '/hospitals/register', { method:'POST', body: JSON.stringify(body) }),
  updateHospital:      (id,b)  => dispatch(() => mock.updateHospital ? mock.updateHospital(id,b) : Promise.resolve({}),     `/hospitals/${id}`, { method:'PUT', body: JSON.stringify(b) }),
  approveHospital:     (id)    => dispatch(() => mock.approveHospital ? mock.approveHospital(id) : Promise.resolve({}),     `/hospitals/${id}/approve`, { method:'PUT' }),
  rejectHospital:      (id,b)  => dispatch(() => mock.rejectHospital ? mock.rejectHospital(id,b) : Promise.resolve({}),    `/hospitals/${id}/reject`, { method:'PUT', body: JSON.stringify(b) }),
  suspendHospital:     (id)    => dispatch(() => mock.suspendHospital ? mock.suspendHospital(id) : Promise.resolve({}),    `/hospitals/${id}/suspend`, { method:'PUT' }),
  getPendingHospitals: ()      => dispatch(() => mock.getPendingHospitals ? mock.getPendingHospitals() : Promise.resolve([]), '/hospitals/pending'),
  getMyHospital:       ()      => dispatch(() => mock.getMyHospital ? mock.getMyHospital() : Promise.resolve(null),         '/hospitals/admin/mine'),
  registerPlatform:    (body)  => dispatch(() => mock.registerPlatform(body),                                                '/platform/register', { method:'POST', body: JSON.stringify(body) }),

  getBeds:         (p={})  => dispatch(() => mock.getBeds ? mock.getBeds(p) : Promise.resolve([]),                      '/beds?' + new URLSearchParams(p)),
  getBedStats:     ()      => dispatch(() => mock.getBedStats ? mock.getBedStats() : Promise.resolve({ total:0, available:0, occupied:0, maintenance:0 }), '/beds/stats'),
  createBed:       (body)  => dispatch(() => mock.createBed ? mock.createBed(body) : Promise.resolve({}),              '/beds',       { method:'POST',   body: JSON.stringify(body) }),
  updateBed:       (id,b)  => dispatch(() => mock.updateBed ? mock.updateBed(id,b) : Promise.resolve({}),              `/beds/${id}`, { method:'PUT',    body: JSON.stringify(b) }),
  deleteBed:       (id)    => dispatch(() => mock.deleteBed ? mock.deleteBed(id) : Promise.resolve({}),                `/beds/${id}`, { method:'DELETE' }),

  getTests:        (p={})  => dispatch(() => mock.getTests ? mock.getTests(p) : Promise.resolve([]),                  '/tests?' + new URLSearchParams(p)),
  getTestStats:    ()      => dispatch(() => mock.getTestStats ? mock.getTestStats() : Promise.resolve({ total:0, popular:0, homeCollection:0, prescriptionReq:0, categories:0 }), '/tests/stats'),
  createTest:      (body)  => dispatch(() => mock.createTest ? mock.createTest(body) : Promise.resolve({}),          '/tests',      { method:'POST',   body: JSON.stringify(body) }),
  updateTest:      (id,b)  => dispatch(() => mock.updateTest ? mock.updateTest(id,b) : Promise.resolve({}),          `/tests/${id}`, { method:'PUT',    body: JSON.stringify(b) }),
  deleteTest:      (id)    => dispatch(() => mock.deleteTest ? mock.deleteTest(id) : Promise.resolve({}),            `/tests/${id}`, { method:'DELETE' }),
};
// 2
