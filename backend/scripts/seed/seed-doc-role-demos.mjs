import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { configureMongoDns, connectMongooseWithRetry } from '../../src/config/mongoDns.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Demo accounts for the Doc 07 role verticals. Well-known dev credentials —
// never run this against a production database.
configureMongoDns();
try {
  await connectMongooseWithRetry(mongoose, process.env.MONGO_URI);
} catch (err) {
  // Corporate/sandbox DNS can refuse SRV lookups; resolve straight to the
  // shard hosts instead (same cluster, same database).
  console.warn('SRV connect failed, falling back to direct shard hosts:', err.message);
  const direct = process.env.MONGO_URI.replace(
    /mongodb\+srv:\/\/([^@]+)@[^/]+\/(\w+)\?.*/,
    'mongodb://$1@ac-s20wcft-shard-00-00.5l9k4vd.mongodb.net:27017,ac-s20wcft-shard-00-01.5l9k4vd.mongodb.net:27017,ac-s20wcft-shard-00-02.5l9k4vd.mongodb.net:27017/$2?replicaSet=atlas-11ih9f-shard-0&authSource=admin&tls=true&retryWrites=true&w=majority'
  );
  await mongoose.connect(direct);
}

const { default: User } = await import('../../src/models/User.js');

const HOSPITAL = new mongoose.Types.ObjectId('6aee46d96c17c8754c602402');
const LAB_FACILITY = new mongoose.Types.ObjectId('6aee46d96c17c8754c60240c');
const PHARMACY_FACILITY = new mongoose.Types.ObjectId('6aee46da6c17c8754c60240d');
const CLINIC_FACILITY = new mongoose.Types.ObjectId('6aee46d96c17c8754c60240b');

const accounts = [
  // Doc 07 provider-vertical dashboards (verified)
  { email: 'optician@findmedi.com', role: 'optician', name: 'Optical Demo Store' },
  { email: 'dietitian@findmedi.com', role: 'dietitian', name: 'Dr. Nisha Dietitian' },
  { email: 'physio@findmedi.com', role: 'physiotherapist', name: 'Dr. Arjun Physio' },
  { email: 'home.nursing@findmedi.com', role: 'home_nursing_admin', name: 'Home Nursing Demo Agency' },
  { email: 'phlebotomist@findmedi.com', role: 'phlebotomist', name: 'Ravi Phlebotomist', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'yoga@findmedi.com', role: 'yoga_instructor', name: 'Yoga Guru Meera' },
  { email: 'gym@findmedi.com', role: 'gym_owner', name: 'FitLife Gym' },
  { email: 'wellness@findmedi.com', role: 'wellness_admin', name: 'Serene Wellness Spa' },
  { email: 'equipment@findmedi.com', role: 'equipment_vendor', name: 'MedEquip Rentals' },
  { email: 'product.vendor@findmedi.com', role: 'product_vendor', name: 'HealthKart Demo', facilityId: PHARMACY_FACILITY, facilityType: 'pharmacy' },
  { email: 'events@findmedi.com', role: 'event_organizer', name: 'Health Camps Org' },
  { email: 'group.host@findmedi.com', role: 'group_host', name: 'Support Circle Host' },
  { email: 'trainer.org@findmedi.com', role: 'trainer_org', name: 'CPR Training Org' },
  { email: 'bloodbank@findmedi.com', role: 'blood_bank_admin', name: 'Red Cross Blood Bank' },
  { email: 'dialysis@findmedi.com', role: 'dialysis_admin', name: 'Kidney Care Dialysis' },
  { email: 'fertility@findmedi.com', role: 'fertility_admin', name: 'Hope IVF Centre' },
  { email: 'rehab@findmedi.com', role: 'rehab_admin', name: 'New Leaf Rehab' },
  { email: 'govt@findmedi.com', role: 'govt_facility_staff', name: 'PHC Staff Demo' },
  { email: 'tpa@findmedi.com', role: 'tpa_agent', name: 'Star Health TPA Desk' },
  // Doc 07 §3.21-3.24 ops consoles — 2FA-mandatory, pre-enrolled dev-only TOTP secrets
  { email: 'content.editor@findmedi.com', role: 'content_editor', name: 'Content Editor', twoFactorSecret: 'ANTRL5EM6O5LPGFDZXJK5HXXBFSUTW65' },
  { email: 'medical.reviewer@findmedi.com', role: 'medical_reviewer', name: 'Medical Reviewer', twoFactorSecret: 'DAECTNU5J7I3CAXHEAIGWHNJIC3S226K' },
  { email: 'moderator@findmedi.com', role: 'moderator', name: 'Community Moderator', twoFactorSecret: 'BB5MQSHPJZYP6NKQCKVG5HIBJ2Y2L3RW' },
  { email: 'support.agent@findmedi.com', role: 'support_agent', name: 'Support Agent', twoFactorSecret: 'HMFHHPDUNVDEJWPEQQZNGXM6PHMSWQEQ' },
  { email: 'finance@findmedi.com', role: 'finance_admin', name: 'Finance Admin', twoFactorSecret: '4OSJ6SKTX3XTHHZSGXZUSZRIFTXM6VFN' },
  { email: 'kyc@findmedi.com', role: 'kyc_reviewer', name: 'KYC Reviewer', twoFactorSecret: '2SZBTVUET3HFOWEUQD62D6FR3O2OJNRP' },
  { email: 'compliance@findmedi.com', role: 'compliance_officer', name: 'Compliance Officer', twoFactorSecret: 'SOM5XU4QNTIMILIDKOWQ4NSDG3CMYRGJ' },
  // Lab (LIS) staff — linked to the DiagnoLab demo facility
  { email: 'lab.receptionist@findmedi.com', role: 'lab_receptionist', name: 'Lab Receptionist Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'lab.technician@findmedi.com', role: 'lab_technician', name: 'Lab Technician Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'lab.supervisor@findmedi.com', role: 'lab_supervisor', name: 'Lab Supervisor Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'lab.receiving@findmedi.com', role: 'lab_receiving', name: 'Lab Receiving Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'biochem.tech@findmedi.com', role: 'biochem_tech', name: 'Biochem Tech Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'hematology.tech@findmedi.com', role: 'hematology_tech', name: 'Hematology Tech Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'clinical.pathology.tech@findmedi.com', role: 'clinical_pathology_tech', name: 'Clinical Pathology Tech Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'microbiology.tech@findmedi.com', role: 'microbiology_tech', name: 'Microbiology Tech Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'histopathology.tech@findmedi.com', role: 'histopathology_tech', name: 'Histopathology Tech Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'cytology.tech@findmedi.com', role: 'cytology_tech', name: 'Cytology Tech Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'serology.tech@findmedi.com', role: 'serology_tech', name: 'Serology Tech Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'molecular.tech@findmedi.com', role: 'molecular_tech', name: 'Molecular Tech Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'report.coordinator@findmedi.com', role: 'report_coordinator', name: 'Report Coordinator Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'home.collection.staff@findmedi.com', role: 'home_collection_staff', name: 'Home Collection Staff Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'lab.admin@findmedi.com', role: 'lab_admin', name: 'Lab Admin Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'lab.manager@findmedi.com', role: 'lab_manager', name: 'Lab Manager Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'lab.quality.mgr@findmedi.com', role: 'lab_quality_mgr', name: 'Lab Quality Manager Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'analyzer.staff@findmedi.com', role: 'analyzer_staff', name: 'Analyzer Staff Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  { email: 'lab.inventory.mgr@findmedi.com', role: 'lab_inventory_mgr', name: 'Lab Inventory Manager Demo', facilityId: LAB_FACILITY, facilityType: 'lab' },
  // Radiology (RIS) staff
  { email: 'radiology.manager@findmedi.com', role: 'radiology_manager', name: 'Radiology Manager Demo' },
  { email: 'radiology.scheduler@findmedi.com', role: 'radiology_scheduler', name: 'Radiology Scheduler Demo' },
  { email: 'radiology.prep.staff@findmedi.com', role: 'radiology_prep_staff', name: 'Radiology Prep Staff Demo' },
  { email: 'mri.technician@findmedi.com', role: 'mri_technician', name: 'MRI Technician Demo' },
  { email: 'xray.technician@findmedi.com', role: 'xray_technician', name: 'X-Ray Technician Demo' },
  { email: 'ct.technician@findmedi.com', role: 'ct_technician', name: 'CT Technician Demo' },
  { email: 'us.technician@findmedi.com', role: 'us_technician', name: 'Ultrasound Technician Demo' },
  { email: 'mammo.technician@findmedi.com', role: 'mammo_technician', name: 'Mammography Technician Demo' },
  { email: 'reporting.assistant@findmedi.com', role: 'reporting_assistant', name: 'Reporting Assistant Demo' },
  { email: 'pacs.admin@findmedi.com', role: 'pacs_admin', name: 'PACS Admin Demo' },
  { email: 'radiology.admin@findmedi.com', role: 'radiology_admin', name: 'Radiology Admin Demo' },
  { email: 'radiology.receptionist@findmedi.com', role: 'radiology_receptionist', name: 'Radiology Receptionist Demo' },
  { email: 'radiology.billing.executive@findmedi.com', role: 'radiology_billing_executive', name: 'Radiology Billing Executive Demo' },
  { email: 'equipment.manager@findmedi.com', role: 'equipment_manager', name: 'Equipment Manager Demo' },
  { email: 'radiology.technician@findmedi.com', role: 'radiology_technician', name: 'Radiology Technician Demo' },
  // Hospital (HMS) operational staff
  { email: 'front.desk@findmedi.com', role: 'front_desk', name: 'Front Desk Demo' },
  { email: 'cashier@findmedi.com', role: 'cashier', name: 'Cashier Demo' },
  { email: 'insurance.desk@findmedi.com', role: 'insurance_desk', name: 'Insurance Desk Demo' },
  { email: 'medical.director@findmedi.com', role: 'medical_director', name: 'Medical Director Demo' },
  { email: 'cmo@findmedi.com', role: 'cmo', name: 'CMO Demo' },
  { email: 'nursing.supervisor@findmedi.com', role: 'nursing_supervisor', name: 'Nursing Supervisor Demo' },
  { email: 'matron@findmedi.com', role: 'matron', name: 'Matron Demo' },
  { email: 'ward.nurse@findmedi.com', role: 'ward_nurse', name: 'Ward Nurse Demo' },
  { email: 'icu.nurse@findmedi.com', role: 'icu_nurse', name: 'ICU Nurse Demo' },
  { email: 'ot.nurse@findmedi.com', role: 'ot_nurse', name: 'OT Nurse Demo' },
  { email: 'infection.control.nurse@findmedi.com', role: 'infection_control_nurse', name: 'Infection Control Nurse Demo' },
  { email: 'surgeon@findmedi.com', role: 'surgeon', name: 'Surgeon Demo' },
  { email: 'anaesthetist@findmedi.com', role: 'anaesthetist', name: 'Anaesthetist Demo' },
  { email: 'ot.technician@findmedi.com', role: 'ot_technician', name: 'OT Technician Demo' },
  { email: 'cssd.technician@findmedi.com', role: 'cssd_technician', name: 'CSSD Technician Demo' },
  { email: 'store.keeper@findmedi.com', role: 'store_keeper', name: 'Store Keeper Demo' },
  { email: 'purchase.officer@findmedi.com', role: 'purchase_officer', name: 'Purchase Officer Demo' },
  { email: 'hr.manager@findmedi.com', role: 'hr_manager', name: 'HR Manager Demo' },
  { email: 'biomedical.engineer@findmedi.com', role: 'biomedical_engineer', name: 'Biomedical Engineer Demo' },
  { email: 'maintenance@findmedi.com', role: 'maintenance', name: 'Maintenance Demo' },
  { email: 'housekeeping.supervisor@findmedi.com', role: 'housekeeping_supervisor', name: 'Housekeeping Supervisor Demo' },
  { email: 'ward.boy@findmedi.com', role: 'ward_boy', name: 'Ward Boy Demo' },
  { email: 'dietician.head@findmedi.com', role: 'dietician_head', name: 'Dietician Head Demo' },
  { email: 'kitchen.staff@findmedi.com', role: 'kitchen_staff', name: 'Kitchen Staff Demo' },
  { email: 'mortuary.attendant@findmedi.com', role: 'mortuary_attendant', name: 'Mortuary Attendant Demo' },
  { email: 'medical.records.officer@findmedi.com', role: 'medical_records_officer', name: 'Medical Records Officer Demo' },
  { email: 'quality.officer@findmedi.com', role: 'quality_officer', name: 'Quality Officer Demo' },
  { email: 'pharmacovigilance.officer@findmedi.com', role: 'pharmacovigilance_officer', name: 'Pharmacovigilance Officer Demo' },
  { email: 'call.center.agent@findmedi.com', role: 'call_center_agent', name: 'Call Center Agent Demo' },
  { email: 'hospital.owner@findmedi.com', role: 'hospital_owner', name: 'Hospital Owner Demo' },
  { email: 'medical.superintendent@findmedi.com', role: 'medical_superintendent', name: 'Medical Superintendent Demo' },
  { email: 'hod@findmedi.com', role: 'hod', name: 'HOD Demo' },
  { email: 'resident.doctor@findmedi.com', role: 'resident_doctor', name: 'Resident Doctor Demo' },
  { email: 'emergency@findmedi.com', role: 'emergency', name: 'Emergency Demo' },
  { email: 'icu.doctor@findmedi.com', role: 'icu_doctor', name: 'ICU Doctor Demo' },
  { email: 'ot.coordinator@findmedi.com', role: 'ot_coordinator', name: 'OT Coordinator Demo' },
  { email: 'opd.coordinator@findmedi.com', role: 'opd_coordinator', name: 'OPD Coordinator Demo' },
  { email: 'admission.coordinator@findmedi.com', role: 'admission_coordinator', name: 'Admission Coordinator Demo' },
  { email: 'bed.manager@findmedi.com', role: 'bed_manager', name: 'Bed Manager Demo' },
  { email: 'facility.manager@findmedi.com', role: 'facility_manager', name: 'Facility Manager Demo' },
  { email: 'discharge.coordinator@findmedi.com', role: 'discharge_coordinator', name: 'Discharge Coordinator Demo' },
  { email: 'mis.reporting@findmedi.com', role: 'mis_reporting', name: 'MIS Reporting Demo' },
  { email: 'doctor.portal@findmedi.com', role: 'doctor_portal', name: 'Doctor Portal Demo' },
  { email: 'patient.relations@findmedi.com', role: 'patient_relations', name: 'Patient Relations Demo' },
  { email: 'it.admin@findmedi.com', role: 'it_admin', name: 'IT Admin Demo' },
  { email: 'pharmacist@findmedi.com', role: 'pharmacist', name: 'Pharmacist Demo' },
  { email: 'accountant@findmedi.com', role: 'accountant', name: 'Accountant Demo' },
  { email: 'security@findmedi.com', role: 'security', name: 'Security Demo' },
  // Clinic (CMS) ops roles — land on the shared /clinic/admin console
  { email: 'clinic.receptionist@findmedi.com', role: 'clinic_receptionist', name: 'Clinic Receptionist Demo', facilityId: CLINIC_FACILITY, facilityType: 'clinic' },
  { email: 'clinic.nurse@findmedi.com', role: 'clinic_nurse', name: 'Clinic Nurse Demo', facilityId: CLINIC_FACILITY, facilityType: 'clinic' },
  { email: 'clinic.accountant@findmedi.com', role: 'clinic_accountant', name: 'Clinic Accountant Demo', facilityId: CLINIC_FACILITY, facilityType: 'clinic' },
  { email: 'clinic.pharmacist@findmedi.com', role: 'clinic_pharmacist', name: 'Clinic Pharmacist Demo', facilityId: CLINIC_FACILITY, facilityType: 'clinic' },
  { email: 'clinic.cashier@findmedi.com', role: 'clinic_cashier', name: 'Clinic Cashier Demo', facilityId: CLINIC_FACILITY, facilityType: 'clinic' },
  { email: 'clinic.branch.manager@findmedi.com', role: 'clinic_branch_manager', name: 'Clinic Branch Manager Demo', facilityId: CLINIC_FACILITY, facilityType: 'clinic' },
  { email: 'clinic.telemed.coordinator@findmedi.com', role: 'clinic_telemed_coordinator', name: 'Clinic Telemed Coordinator Demo', facilityId: CLINIC_FACILITY, facilityType: 'clinic' },
  // Clinic (CMS) non-ops roles — blueprint consoles
  { email: 'clinic.lab.tech@findmedi.com', role: 'clinic_lab_tech', name: 'Clinic Lab Tech Demo', facilityId: CLINIC_FACILITY, facilityType: 'clinic' },
  { email: 'clinic.radiology.tech@findmedi.com', role: 'clinic_radiology_tech', name: 'Clinic Radiology Tech Demo', facilityId: CLINIC_FACILITY, facilityType: 'clinic' },
  { email: 'clinic.inventory.mgr@findmedi.com', role: 'clinic_inventory_mgr', name: 'Clinic Inventory Mgr Demo', facilityId: CLINIC_FACILITY, facilityType: 'clinic' },
  { email: 'clinic.purchase.officer@findmedi.com', role: 'clinic_purchase_officer', name: 'Clinic Purchase Officer Demo', facilityId: CLINIC_FACILITY, facilityType: 'clinic' },
  { email: 'clinic.hr.admin@findmedi.com', role: 'clinic_hr_admin', name: 'Clinic HR Admin Demo', facilityId: CLINIC_FACILITY, facilityType: 'clinic' },
  { email: 'clinic.home.collection@findmedi.com', role: 'clinic_home_collection', name: 'Clinic Home Collection Demo', facilityId: CLINIC_FACILITY, facilityType: 'clinic' },
  { email: 'clinic.telemed.coord@findmedi.com', role: 'clinic_telemed_coord', name: 'Clinic Telemed Coord Demo', facilityId: CLINIC_FACILITY, facilityType: 'clinic' },
  { email: 'clinic.crm.staff@findmedi.com', role: 'clinic_crm_staff', name: 'Clinic CRM Staff Demo', facilityId: CLINIC_FACILITY, facilityType: 'clinic' },
  { email: 'clinic.quality.mgr@findmedi.com', role: 'clinic_quality_mgr', name: 'Clinic Quality Mgr Demo', facilityId: CLINIC_FACILITY, facilityType: 'clinic' },
  { email: 'clinic.patient.portal@findmedi.com', role: 'clinic_patient_portal', name: 'Clinic Patient Portal Demo', facilityId: CLINIC_FACILITY, facilityType: 'clinic' },
  { email: 'clinic.owner.analytics@findmedi.com', role: 'clinic_owner_analytics', name: 'Clinic Owner Analytics Demo', facilityId: CLINIC_FACILITY, facilityType: 'clinic' },
  // Vertical aliases (land on their shared dedicated dashboards)
  { email: 'dental.clinic.admin@findmedi.com', role: 'dental_clinic_admin', name: 'Dental Clinic Admin Demo' },
  { email: 'optical.shop.owner@findmedi.com', role: 'optical_shop_owner', name: 'Optical Shop Owner Demo' },
  { email: 'yoga.studio.admin@findmedi.com', role: 'yoga_studio_admin', name: 'Yoga Studio Admin Demo' },
  { email: 'trainer@findmedi.com', role: 'trainer', name: 'Fitness Trainer Demo' },
  { email: 'therapist@findmedi.com', role: 'therapist', name: 'Wellness Therapist Demo' },
  { email: 'maternity.admin@findmedi.com', role: 'maternity_admin', name: 'Maternity Admin Demo' },
  { email: 'ngo.admin@findmedi.com', role: 'ngo_admin', name: 'NGO Admin Demo' },
  // Generic staff
  { email: 'technician@findmedi.com', role: 'technician', name: 'Technician Demo' },
  { email: 'helper@findmedi.com', role: 'helper', name: 'Helper Demo' },
  // Platform / ops roles — 2FA-mandatory, pre-enrolled with dev-only TOTP secrets
  { email: 'platform.admin@findmedi.com', role: 'platform_admin', name: 'Platform Admin Demo', twoFactorSecret: 'KUFFKA24TPJNOVNNBYZFOFWKEUPGH356' },
  { email: 'support.l1@findmedi.com', role: 'support_l1', name: 'Support L1 Demo', twoFactorSecret: '7XD4UGPJOLVTQG4NUNMF4NMKVE3RO4PK' },
  { email: 'support.l2@findmedi.com', role: 'support_l2', name: 'Support L2 Demo', twoFactorSecret: 'EKMCRL6N6KSRLB4YWNJYEWCR2DEQ65OR' },
  { email: 'dpo@findmedi.com', role: 'dpo', name: 'DPO Demo', twoFactorSecret: 'IY4WWR5GYKEZLDU2CJA7DEFIJEMCAKUR' },
  { email: 'security.admin@findmedi.com', role: 'security_admin', name: 'Security Admin Demo', twoFactorSecret: '6GVTVORXTCGXK455YG5B2J7EHBLEXO7X' },
  { email: 'clinical.safety@findmedi.com', role: 'clinical_safety', name: 'Clinical Safety Demo', twoFactorSecret: 'ZKAMOXYNM7DXFMNNXQTIXLHHLEYWNZ7S' },
  { email: 'analyst@findmedi.com', role: 'analyst', name: 'Analyst Demo', twoFactorSecret: 'IK3AIGQOCJZKOWCTWYRNTM6T3PGXDYE6' },
  { email: 'auditor@findmedi.com', role: 'auditor', name: 'Auditor Demo', twoFactorSecret: 'BSWY2LKL4X56MQN36WIWWPXJ7NB6DZSA' },
  { email: 'catalog.manager@findmedi.com', role: 'catalog_manager', name: 'Catalog Manager Demo', twoFactorSecret: '6D4YT4WTU5BWE5MGWUYYDX74ID3RIBOQ' },
  { email: 'city.manager@findmedi.com', role: 'city_manager', name: 'City Manager Demo', twoFactorSecret: '6UQBMJJ2ZZFZHZICW22O2IJJFRGJTWRA' },
  { email: 'super.admin@findmedi.com', role: 'super_admin', name: 'Super Admin Demo', twoFactorSecret: 'GNTPNMWZJRU2I4YP4IIG4VMLVQXJ3TPG' },
];
for (const a of accounts) {
  const fields = {
    role: a.role,
    name: a.name,
    hospitalId: HOSPITAL,
    facilityId: a.facilityId || null,
    facilityType: a.facilityType || '',
    password: 'password',
  };
  if (a.twoFactorSecret) {
    fields.twoFactorEnabled = true;
    fields.twoFactorSecret = a.twoFactorSecret;
    fields.twoFactorTempSecret = '';
    fields.twoFactorBackupCodes = [];
  }
  const existing = await User.findOne({ email: a.email }).select('+password');
  if (existing) {
    Object.assign(existing, fields);
    await existing.save();
    console.log(`updated ${a.email} (${a.role})${a.twoFactorSecret ? ' +2FA' : ''}`);
  } else {
    await User.create({
      ...fields,
      email: a.email,
      phone: '+919999900000',
      isVerified: true,
      status: 'active',
      approvalStatus: 'approved',
    });
    console.log(`created ${a.email} (${a.role})${a.twoFactorSecret ? ' +2FA' : ''}`);
  }
}

// The legacy clinic_admin demo account (referenced by the login quick-demo
// grid as clinicadmin@findmedi.com) was created before the clinic tenant
// model and linked to the shared demo Hospital — every clinic-scoped API
// (/facilities/mine, /clinics/profile) then 404'd. Relink it to the demo
// clinic Facility.
const legacy = await User.findOne({ email: 'clinicadmin@findmedi.com' });
if (legacy) {
  legacy.hospitalId = CLINIC_FACILITY;
  legacy.facilityId = CLINIC_FACILITY;
  legacy.facilityType = 'clinic';
  await legacy.save();
  console.log('relinked clinicadmin@findmedi.com -> clinic Facility', CLINIC_FACILITY);
}

// Same treatment for the clinic DEMO DOCTOR (clinic@findmedi.com): it was
// created before the clinic tenant model and never linked to any Facility —
// the console then counted platform-wide data. Link it to the demo clinic.
const clinicDoctor = await User.findOne({ email: 'clinic@findmedi.com' });
if (clinicDoctor) {
  clinicDoctor.facilityId = CLINIC_FACILITY;
  clinicDoctor.hospitalId = CLINIC_FACILITY;
  clinicDoctor.facilityType = 'clinic';
  await clinicDoctor.save();
  console.log('relinked clinic@findmedi.com -> clinic Facility', CLINIC_FACILITY);
}

await mongoose.disconnect();
