import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Shield,
  Stethoscope,
  UserRound,
  Building2,
  Microscope,
  FlaskConical,
  Pill,
  Heart,
  HeartPulse,
  ScanLine,
  Receipt,
  Smile,
  Headset,
  Eye,
  EyeOff,
  Truck,
  Car,
  Users,
  Scale,
  Ambulance,
  Brain,
  BrainCircuit,
  Syringe,
  Salad,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { setAuthTokens } from '@/lib/axios';
import canonicalLoginRoles from '@/data/canonicalLoginRoles.json';

declare global {
  interface Window {
    google?: any;
  }
}

interface RoleItem {
  key: string;
  label: string;
  desc: string;
  icon: any;
  color: string;
  bg: string;
}

interface DemoAccountItem {
  key: string;
  category: 'core' | 'hospital' | 'lab' | 'clinic' | 'vertical' | 'platform' | 'others';
  name: string;
  label: string;
  desc: string;
  icon: any;
  color: string;
  bg: string;
  email: string;
  pass: string;
}

// AUTH-UI: metadata per role key. The tile LIST itself comes from
// GET /auth/login-roles (every role that actually has an active account), so
// the grid can never drift from the seed. Previously the list was hardcoded to
// 14 entries while the seed created 21 - and because the form always POSTs
// `role`, the 7 roles with no tile were unloginable (the server 403s when
// `user.role !== role`). Unknown keys fall back to a humanised label so a new
// seeded role is never invisible.
const ROLE_META: Record<string, { label: string; desc: string; icon: any; color: string; bg: string }> = {
  superadmin:         { label: 'SuperAdmin',       desc: 'Manage full platform',   icon: Shield,       color: 'text-purple-600', bg: 'bg-purple-500/10' },
  hospital_admin:     { label: 'Hospital Admin',   desc: 'Manage hospital',        icon: Shield,       color: 'text-primary',    bg: 'bg-primary/10' },
  doctor:             { label: 'Hosp Doctor',      desc: 'Patient & schedule',     icon: Stethoscope,  color: 'text-info',       bg: 'bg-info/10' },
  clinic_doctor:      { label: 'Clinic',           desc: 'Clinic management',      icon: Heart,        color: 'text-rose-600',   bg: 'bg-rose-500/10' },
  lab_owner:          { label: 'Diagnostic',       desc: 'Lab test mgmt',          icon: Microscope,   color: 'text-emerald-600',bg: 'bg-emerald-500/10' },
  pathologist:        { label: 'Pathologist',      desc: 'Reports & slides',       icon: FlaskConical, color: 'text-violet-600', bg: 'bg-violet-500/10' },
  pharmacy_owner:     { label: 'Pharmacy',         desc: 'Medicine store',         icon: Pill,         color: 'text-amber-600',  bg: 'bg-amber-500/10' },
  nurse:              { label: 'Nurse',            desc: 'Ward & patient care',    icon: HeartPulse,   color: 'text-pink-600',   bg: 'bg-pink-500/10' },
  radiologist:        { label: 'Radiology',        desc: 'Imaging & scans',        icon: ScanLine,     color: 'text-sky-600',    bg: 'bg-sky-500/10' },
  counsellor:         { label: 'Counsellor',       desc: 'Therapy & counselling',  icon: Brain,        color: 'text-teal-600',   bg: 'bg-teal-500/10' },
  psychiatrist:       { label: 'Psychiatrist',     desc: 'Diagnosis & medication', icon: BrainCircuit, color: 'text-cyan-600',   bg: 'bg-cyan-500/10' },
  delivery_boy:       { label: 'Delivery',         desc: 'Medicine delivery',      icon: Truck,        color: 'text-blue-600',   bg: 'bg-blue-500/10' },
  rider:              { label: 'Rider',            desc: 'Vehicle rides',          icon: Car,          color: 'text-teal-600',   bg: 'bg-teal-500/10' },
  ambulance:          { label: 'Ambulance Driver', desc: 'Emergency ambulance',    icon: Ambulance,    color: 'text-red-600',    bg: 'bg-red-500/10' },
  assistant:          { label: 'Assistant',        desc: 'Patient care & help',    icon: Users,        color: 'text-cyan-600',   bg: 'bg-cyan-500/10' },
  lawyer:             { label: 'Lawyer',           desc: 'Legal consultation',     icon: Scale,        color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
  patient:            { label: 'Patient',          desc: 'Appointments & records', icon: UserRound,    color: 'text-success',    bg: 'bg-success/10' },
  receptionist:       { label: 'Receptionist',     desc: 'Front desk & OPD queue', icon: Headset,      color: 'text-orange-600', bg: 'bg-orange-500/10' },
  clinic_admin:       { label: 'Clinic Admin',     desc: 'Clinic operations',      icon: Building2,    color: 'text-emerald-700',bg: 'bg-emerald-500/10' },
  billing_executive:  { label: 'Billing',          desc: 'Bills & payments',       icon: Receipt,      color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
  dentist:            { label: 'Dentist',          desc: 'Dental care',            icon: Smile,     color: 'text-cyan-700',   bg: 'bg-cyan-500/10' },
  // File 07 §3.25-§3.30 specialty-vertical owners. Each has its own dashboard
  // route (App.tsx /dashboard/elder-care and friends) and a seeded account, so
  // they need a real tile rather than the humanised fallback.
  elder_care_admin:   { label: 'Elder Care',        desc: 'Residents & MAR records', icon: HeartPulse, color: 'text-amber-700', bg: 'bg-amber-500/10' },
  vaccination_admin:  { label: 'Vaccination Centre', desc: 'Doses & certificates',   icon: Syringe,   color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  diet_kitchen_admin: { label: 'Diet Kitchen',      desc: 'Therapeutic meal plans',  icon: Salad,     color: 'text-lime-700',  bg: 'bg-lime-500/10' },
  corporate_admin:    { label: 'Corporate Wellness', desc: 'Enrolments & contracts',  icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
  child_dev_admin:    { label: 'Child Development', desc: 'Therapy & IEP tracking',  icon: Users,     color: 'text-rose-600',  bg: 'bg-rose-500/10' },
  specialty_centre_admin: { label: 'Specialty Centre', desc: 'Daycare & consultants', icon: Stethoscope, color: 'text-violet-600', bg: 'bg-violet-500/10' },
};

// Used as the pre-fetch list (so the grid is never empty) and as the fallback
// if /auth/login-roles is unreachable.
// Show the complete demo role catalogue even when the server endpoint only
// returns roles with active accounts. Active/legacy role keys are merged below.
const FALLBACK_ROLE_KEYS = Array.from(new Set([
  ...Object.keys(ROLE_META),
  ...(canonicalLoginRoles as string[]),
]));

const humanise = (key: string) =>
  key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function buildRoles(keys: string[]): RoleItem[] {
  return keys.map((key) => {
    const meta = ROLE_META[key];
    if (meta) return { key, ...meta };
    return {
      key,
      label: humanise(key),
      desc: 'Sign in as this role',
      icon: Users,
      color: 'text-foreground',
      bg: 'bg-muted',
    };
  });
}

const demoAccounts: DemoAccountItem[] = [
  // Core System Roles (Exact 14 Accounts requested)
  { key: 'superadmin', category: 'core', name: 'Super Admin', label: 'SuperAdmin', desc: 'Manage full platform', icon: Shield, color: 'text-purple-600', bg: 'bg-purple-500/10', email: 'mahendrapra0077@gmail.com', pass: 'admin@123' },
  { key: 'hospital_admin', category: 'core', name: 'Hospital Admin', label: 'Hospital Admin', desc: 'Manage hospital', icon: Shield, color: 'text-primary', bg: 'bg-primary/10', email: 'admin@findmedi.com', pass: 'password' },
  { key: 'doctor', category: 'core', name: 'Dr. Sarah Smith', label: 'Hosp Doctor', desc: 'Patient & schedule', icon: Stethoscope, color: 'text-info', bg: 'bg-info/10', email: 'sarah.smith@findmedi.com', pass: 'password' },
  { key: 'clinic_doctor', category: 'core', name: 'Dr. Rajesh Clinic', label: 'Clinic', desc: 'Clinic management', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-500/10', email: 'clinic@findmedi.com', pass: 'password' },
  { key: 'lab_owner', category: 'core', name: 'Metro Diagnostic', label: 'Diagnostic', desc: 'Lab test mgmt', icon: Microscope, color: 'text-emerald-600', bg: 'bg-emerald-500/10', email: 'diagnostic@findmedi.com', pass: 'password' },
  { key: 'pharmacy_owner', category: 'core', name: 'MediCare Pharmacy', label: 'Pharmacy', desc: 'Medicine store', icon: Pill, color: 'text-amber-600', bg: 'bg-amber-500/10', email: 'pharmacy@findmedi.com', pass: 'password' },
  { key: 'delivery_boy', category: 'core', name: 'Rahul Delivery', label: 'Delivery', desc: 'Medicine delivery', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-500/10', email: 'delivery@findmedi.com', pass: 'password' },
  { key: 'rider', category: 'core', name: 'Vikram Singh', label: 'Rider', desc: 'Vehicle rides', icon: Car, color: 'text-teal-600', bg: 'bg-teal-500/10', email: 'rider@findmedi.com', pass: 'password' },
  { key: 'ambulance', category: 'core', name: 'Ramesh Driver', label: 'Ambulance Driver', desc: 'Emergency ambulance', icon: Ambulance, color: 'text-red-600', bg: 'bg-red-500/10', email: 'ambulance@findmedi.com', pass: 'password' },
  { key: 'assistant', category: 'core', name: 'Sunita Sharma', label: 'Assistant', desc: 'Patient care & help', icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-500/10', email: 'assistant@findmedi.com', pass: 'password' },
  { key: 'lawyer', category: 'core', name: 'Adv. Rajesh Verma', label: 'Lawyer', desc: 'Legal consultation', icon: Scale, color: 'text-indigo-600', bg: 'bg-indigo-500/10', email: 'lawyer@findmedi.com', pass: 'password' },
  { key: 'counsellor', category: 'core', name: 'Ananya Verma', label: 'Counsellor', desc: 'Therapy & counselling', icon: Brain, color: 'text-teal-600', bg: 'bg-teal-500/10', email: 'counsellor@findmedi.com', pass: 'password' },
  { key: 'psychiatrist', category: 'core', name: 'Dr. Rohan Deshmukh', label: 'Psychiatrist', desc: 'Diagnosis & medication', icon: BrainCircuit, color: 'text-cyan-600', bg: 'bg-cyan-500/10', email: 'psychiatrist@findmedi.com', pass: 'password' },
  { key: 'patient', category: 'core', name: 'Patient Test', label: 'Patient', desc: 'Appointments & records', icon: UserRound, color: 'text-success', bg: 'bg-success/10', email: 'patient@findmedi.com', pass: 'password' },

  // The 7 roles that previously had NO tile, so their accounts were unloginable
  // from this page (the server 403s when a posted role mismatches the account).
  { key: 'pathologist', category: 'core', name: 'Dr. Amit Pathologist', label: 'Pathologist', desc: 'Reports & slides', icon: FlaskConical, color: 'text-violet-600', bg: 'bg-violet-500/10', email: 'pathologist@findmedi.com', pass: 'password' },
  { key: 'nurse', category: 'core', name: 'Sister Mary Nurse', label: 'Nurse', desc: 'Ward & patient care', icon: HeartPulse, color: 'text-pink-600', bg: 'bg-pink-500/10', email: 'nurse@findmedi.com', pass: 'password' },
  { key: 'radiologist', category: 'core', name: 'Dr. Meena Radiologist', label: 'Radiology', desc: 'Imaging & scans', icon: ScanLine, color: 'text-sky-600', bg: 'bg-sky-500/10', email: 'radiologist@findmedi.com', pass: 'password' },
  { key: 'receptionist', category: 'core', name: 'Pooja Front Desk', label: 'Receptionist', desc: 'Front desk & OPD queue', icon: Headset, color: 'text-orange-600', bg: 'bg-orange-500/10', email: 'receptionist@findmedi.com', pass: 'password' },
  { key: 'clinic_admin', category: 'core', name: 'Dr. Rajesh Admin', label: 'Clinic Admin', desc: 'Clinic operations', icon: Building2, color: 'text-emerald-700', bg: 'bg-emerald-500/10', email: 'clinicadmin@findmedi.com', pass: 'password' },
  { key: 'billing_executive', category: 'core', name: 'Suresh Billing', label: 'Billing', desc: 'Bills & payments', icon: Receipt, color: 'text-yellow-600', bg: 'bg-yellow-500/10', email: 'billing@findmedi.com', pass: 'password' },
  { key: 'dentist', category: 'core', name: 'Dr. Alok Dental', label: 'Dentist', desc: 'Dental care', icon: Smile, color: 'text-cyan-700', bg: 'bg-cyan-500/10', email: 'dentist@findmedi.com', pass: 'password' },

  // File 07 §3.25-§3.30 specialty dashboards — one seeded account per owner role
  // so every dashboard route is reachable by the role it was built for.
  { key: 'elder_care_admin', category: 'core', name: 'Elder Care Admin', label: 'Elder Care', desc: 'Residents & MAR records', icon: HeartPulse, color: 'text-amber-700', bg: 'bg-amber-500/10', email: 'elder.care.admin@findmedi.com', pass: 'password' },
  { key: 'vaccination_admin', category: 'core', name: 'Vaccination Admin', label: 'Vaccination Centre', desc: 'Doses & certificates', icon: Syringe, color: 'text-emerald-600', bg: 'bg-emerald-500/10', email: 'vaccination.admin@findmedi.com', pass: 'password' },
  { key: 'diet_kitchen_admin', category: 'core', name: 'Diet Kitchen Admin', label: 'Diet Kitchen', desc: 'Therapeutic meal plans', icon: Salad, color: 'text-lime-700', bg: 'bg-lime-500/10', email: 'diet.kitchen.admin@findmedi.com', pass: 'password' },
  { key: 'corporate_admin', category: 'core', name: 'Corporate Wellness Admin', label: 'Corporate Wellness', desc: 'Enrolments & contracts', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-500/10', email: 'corporate.admin@findmedi.com', pass: 'password' },
  { key: 'child_dev_admin', category: 'core', name: 'Child Development Admin', label: 'Child Development', desc: 'Therapy & IEP tracking', icon: Users, color: 'text-rose-600', bg: 'bg-rose-500/10', email: 'child.dev.admin@findmedi.com', pass: 'password' },
  { key: 'specialty_centre_admin', category: 'core', name: 'Specialty Centre Admin', label: 'Specialty Centre', desc: 'Daycare & consultants', icon: Stethoscope, color: 'text-violet-600', bg: 'bg-violet-500/10', email: 'specialty.centre.admin@findmedi.com', pass: 'password' },
  // File 07 §3.1-§3.24 provider-vertical dashboards — one seeded account per owner role
  { key: 'optician', category: 'vertical', name: 'Optical Demo Store', label: 'Optical Shop', desc: 'Eyewear & job cards', icon: ScanLine, color: 'text-sky-600', bg: 'bg-sky-500/10', email: 'optician@findmedi.com', pass: 'password' },
  { key: 'dietitian', category: 'vertical', name: 'Dr. Nisha Dietitian', label: 'Dietitian', desc: 'Meal plans & follow-ups', icon: Salad, color: 'text-lime-700', bg: 'bg-lime-500/10', email: 'dietitian@findmedi.com', pass: 'password' },
  { key: 'physiotherapist', category: 'vertical', name: 'Dr. Arjun Physio', label: 'Physiotherapy', desc: 'Rehab & home visits', icon: HeartPulse, color: 'text-pink-600', bg: 'bg-pink-500/10', email: 'physio@findmedi.com', pass: 'password' },
  { key: 'home_nursing_admin', category: 'vertical', name: 'Home Nursing Demo Agency', label: 'Home Nursing', desc: 'Agency & visit schedule', icon: Stethoscope, color: 'text-teal-600', bg: 'bg-teal-500/10', email: 'home.nursing@findmedi.com', pass: 'password' },
  { key: 'phlebotomist', category: 'vertical', name: 'Ravi Phlebotomist', label: 'Phlebotomist', desc: 'Home collections & cold chain', icon: FlaskConical, color: 'text-violet-600', bg: 'bg-violet-500/10', email: 'phlebotomist@findmedi.com', pass: 'password' },
  { key: 'yoga_instructor', category: 'vertical', name: 'Yoga Guru Meera', label: 'Yoga', desc: 'Studio classes & camps', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-500/10', email: 'yoga@findmedi.com', pass: 'password' },
  { key: 'gym_owner', category: 'vertical', name: 'FitLife Gym', label: 'Gym', desc: 'Memberships & plans', icon: Building2, color: 'text-slate-600', bg: 'bg-slate-500/10', email: 'gym@findmedi.com', pass: 'password' },
  { key: 'wellness_admin', category: 'vertical', name: 'Serene Wellness Spa', label: 'Wellness', desc: 'Therapies & packages', icon: Heart, color: 'text-emerald-600', bg: 'bg-emerald-500/10', email: 'wellness@findmedi.com', pass: 'password' },
  { key: 'equipment_vendor', category: 'vertical', name: 'MedEquip Rentals', label: 'Equipment', desc: 'Rentals, sale & CPAP', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-500/10', email: 'equipment@findmedi.com', pass: 'password' },
  { key: 'product_vendor', category: 'vertical', name: 'HealthKart Demo', label: 'Product Vendor', desc: 'Supplements & essentials', icon: Pill, color: 'text-amber-600', bg: 'bg-amber-500/10', email: 'product.vendor@findmedi.com', pass: 'password' },
  { key: 'event_organizer', category: 'vertical', name: 'Health Camps Org', label: 'Event Organizer', desc: 'Camps & NGO programs', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-500/10', email: 'events@findmedi.com', pass: 'password' },
  { key: 'group_host', category: 'vertical', name: 'Support Circle Host', label: 'Group Host', desc: 'Support groups & meetups', icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-500/10', email: 'group.host@findmedi.com', pass: 'password' },
  { key: 'trainer_org', category: 'vertical', name: 'CPR Training Org', label: 'Training Org', desc: 'CPR & first aid', icon: Users, color: 'text-red-600', bg: 'bg-red-500/10', email: 'trainer.org@findmedi.com', pass: 'password' },
  { key: 'blood_bank_admin', category: 'vertical', name: 'Red Cross Blood Bank', label: 'Blood Bank', desc: 'Donations & inventory', icon: HeartPulse, color: 'text-red-600', bg: 'bg-red-500/10', email: 'bloodbank@findmedi.com', pass: 'password' },
  { key: 'dialysis_admin', category: 'vertical', name: 'Kidney Care Dialysis', label: 'Dialysis', desc: 'Sessions & water quality', icon: Microscope, color: 'text-violet-600', bg: 'bg-violet-500/10', email: 'dialysis@findmedi.com', pass: 'password' },
  { key: 'fertility_admin', category: 'vertical', name: 'Hope IVF Centre', label: 'Fertility', desc: 'IVF & maternity', icon: Heart, color: 'text-pink-600', bg: 'bg-pink-500/10', email: 'fertility@findmedi.com', pass: 'password' },
  { key: 'rehab_admin', category: 'vertical', name: 'New Leaf Rehab', label: 'Rehab', desc: 'De-addiction & rehab', icon: Shield, color: 'text-amber-700', bg: 'bg-amber-500/10', email: 'rehab@findmedi.com', pass: 'password' },
  { key: 'govt_facility_staff', category: 'vertical', name: 'PHC Staff Demo', label: 'Govt Facility', desc: 'Government health centre', icon: Building2, color: 'text-emerald-700', bg: 'bg-emerald-500/10', email: 'govt@findmedi.com', pass: 'password' },
  { key: 'tpa_agent', category: 'vertical', name: 'Star Health TPA Desk', label: 'TPA Desk', desc: 'Cashless & pre-auth', icon: Receipt, color: 'text-yellow-600', bg: 'bg-yellow-500/10', email: 'tpa@findmedi.com', pass: 'password' },
  // Hospital (HMS) staff — universal console + dedicated HMS routes
  { key: 'front_desk', category: 'hospital', name: 'Front Desk Demo', label: 'Front Desk', desc: 'OPD registration & tokens', icon: Headset, color: 'text-orange-600', bg: 'bg-orange-500/10', email: 'front.desk@findmedi.com', pass: 'password' },
  { key: 'cashier', category: 'hospital', name: 'Cashier Demo', label: 'Cashier', desc: 'Counter billing & tills', icon: Receipt, color: 'text-yellow-600', bg: 'bg-yellow-500/10', email: 'cashier@findmedi.com', pass: 'password' },
  { key: 'insurance_desk', category: 'hospital', name: 'Insurance Desk Demo', label: 'Insurance Desk', desc: 'Cashless & pre-auth', icon: Shield, color: 'text-blue-600', bg: 'bg-blue-500/10', email: 'insurance.desk@findmedi.com', pass: 'password' },
  { key: 'medical_director', category: 'hospital', name: 'Medical Director Demo', label: 'Medical Director', desc: 'Hospital leadership', icon: Stethoscope, color: 'text-primary', bg: 'bg-primary/10', email: 'medical.director@findmedi.com', pass: 'password' },
  { key: 'cmo', category: 'hospital', name: 'CMO Demo', label: 'CMO', desc: 'Clinical governance', icon: Stethoscope, color: 'text-primary', bg: 'bg-primary/10', email: 'cmo@findmedi.com', pass: 'password' },
  { key: 'nursing_supervisor', category: 'hospital', name: 'Nursing Supervisor Demo', label: 'Nursing Supervisor', desc: 'Ward & shift oversight', icon: HeartPulse, color: 'text-pink-600', bg: 'bg-pink-500/10', email: 'nursing.supervisor@findmedi.com', pass: 'password' },
  { key: 'matron', category: 'hospital', name: 'Matron Demo', label: 'Matron', desc: 'Nursing administration', icon: HeartPulse, color: 'text-pink-600', bg: 'bg-pink-500/10', email: 'matron@findmedi.com', pass: 'password' },
  { key: 'ward_nurse', category: 'hospital', name: 'Ward Nurse Demo', label: 'Ward Nurse', desc: 'Bedside care & MAR', icon: HeartPulse, color: 'text-pink-600', bg: 'bg-pink-500/10', email: 'ward.nurse@findmedi.com', pass: 'password' },
  { key: 'icu_nurse', category: 'hospital', name: 'ICU Nurse Demo', label: 'ICU Nurse', desc: 'Critical care nursing', icon: HeartPulse, color: 'text-pink-600', bg: 'bg-pink-500/10', email: 'icu.nurse@findmedi.com', pass: 'password' },
  { key: 'ot_nurse', category: 'hospital', name: 'OT Nurse Demo', label: 'OT Nurse', desc: 'Theatres & scrub nursing', icon: HeartPulse, color: 'text-pink-600', bg: 'bg-pink-500/10', email: 'ot.nurse@findmedi.com', pass: 'password' },
  { key: 'infection_control_nurse', category: 'hospital', name: 'Infection Control Nurse Demo', label: 'Infection Control', desc: 'Surveillance & audits', icon: HeartPulse, color: 'text-pink-600', bg: 'bg-pink-500/10', email: 'infection.control.nurse@findmedi.com', pass: 'password' },
  { key: 'surgeon', category: 'hospital', name: 'Surgeon Demo', label: 'Surgeon', desc: 'OT cases & lists', icon: Stethoscope, color: 'text-info', bg: 'bg-info/10', email: 'surgeon@findmedi.com', pass: 'password' },
  { key: 'anaesthetist', category: 'hospital', name: 'Anaesthetist Demo', label: 'Anaesthetist', desc: 'Anaesthesia & PAC', icon: Stethoscope, color: 'text-info', bg: 'bg-info/10', email: 'anaesthetist@findmedi.com', pass: 'password' },
  { key: 'ot_technician', category: 'hospital', name: 'OT Technician Demo', label: 'OT Technician', desc: 'Theatres & equipment', icon: Shield, color: 'text-slate-600', bg: 'bg-slate-500/10', email: 'ot.technician@findmedi.com', pass: 'password' },
  { key: 'cssd_technician', category: 'hospital', name: 'CSSD Technician Demo', label: 'CSSD Technician', desc: 'Sterilisation & packs', icon: Shield, color: 'text-slate-600', bg: 'bg-slate-500/10', email: 'cssd.technician@findmedi.com', pass: 'password' },
  { key: 'store_keeper', category: 'hospital', name: 'Store Keeper Demo', label: 'Store Keeper', desc: 'Stores & inventory', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-500/10', email: 'store.keeper@findmedi.com', pass: 'password' },
  { key: 'purchase_officer', category: 'hospital', name: 'Purchase Officer Demo', label: 'Purchase Officer', desc: 'Procurement & POs', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-500/10', email: 'purchase.officer@findmedi.com', pass: 'password' },
  { key: 'hr_manager', category: 'hospital', name: 'HR Manager Demo', label: 'HR Manager', desc: 'Staff & rosters', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-500/10', email: 'hr.manager@findmedi.com', pass: 'password' },
  { key: 'biomedical_engineer', category: 'hospital', name: 'Biomedical Engineer Demo', label: 'Biomedical Engineer', desc: 'Equipment & AMC', icon: Microscope, color: 'text-violet-600', bg: 'bg-violet-500/10', email: 'biomedical.engineer@findmedi.com', pass: 'password' },
  { key: 'maintenance', category: 'hospital', name: 'Maintenance Demo', label: 'Maintenance', desc: 'Facilities & repairs', icon: Shield, color: 'text-amber-700', bg: 'bg-amber-500/10', email: 'maintenance@findmedi.com', pass: 'password' },
  { key: 'housekeeping_supervisor', category: 'hospital', name: 'Housekeeping Supervisor Demo', label: 'Housekeeping', desc: 'Cleaning & sanitation', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-500/10', email: 'housekeeping.supervisor@findmedi.com', pass: 'password' },
  { key: 'ward_boy', category: 'hospital', name: 'Ward Boy Demo', label: 'Ward Boy', desc: 'Porter & ward support', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-500/10', email: 'ward.boy@findmedi.com', pass: 'password' },
  { key: 'dietician_head', category: 'hospital', name: 'Dietician Head Demo', label: 'Dietician Head', desc: 'Therapeutic nutrition', icon: Salad, color: 'text-lime-700', bg: 'bg-lime-500/10', email: 'dietician.head@findmedi.com', pass: 'password' },
  { key: 'kitchen_staff', category: 'hospital', name: 'Kitchen Staff Demo', label: 'Kitchen Staff', desc: 'Therapeutic meals', icon: Salad, color: 'text-lime-700', bg: 'bg-lime-500/10', email: 'kitchen.staff@findmedi.com', pass: 'password' },
  { key: 'mortuary_attendant', category: 'hospital', name: 'Mortuary Attendant Demo', label: 'Mortuary', desc: 'Death registration', icon: Shield, color: 'text-red-600', bg: 'bg-red-500/10', email: 'mortuary.attendant@findmedi.com', pass: 'password' },
  { key: 'medical_records_officer', category: 'hospital', name: 'Medical Records Demo', label: 'Medical Records', desc: 'MRD & MIS reporting', icon: Scale, color: 'text-slate-600', bg: 'bg-slate-500/10', email: 'medical.records.officer@findmedi.com', pass: 'password' },
  { key: 'quality_officer', category: 'hospital', name: 'Quality Officer Demo', label: 'Quality Officer', desc: 'Quality & safety', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-500/10', email: 'quality.officer@findmedi.com', pass: 'password' },
  { key: 'pharmacovigilance_officer', category: 'hospital', name: 'Pharmacovigilance Demo', label: 'Pharmacovigilance', desc: 'ADR & drug safety', icon: Pill, color: 'text-amber-600', bg: 'bg-amber-500/10', email: 'pharmacovigilance.officer@findmedi.com', pass: 'password' },
  { key: 'call_center_agent', category: 'hospital', name: 'Call Center Demo', label: 'Call Center', desc: 'Appointments & support', icon: Headset, color: 'text-cyan-600', bg: 'bg-cyan-500/10', email: 'call.center.agent@findmedi.com', pass: 'password' },
  { key: 'hospital_owner', category: 'hospital', name: 'Hospital Owner Demo', label: 'Hospital Owner', desc: 'Facility owner view', icon: Building2, color: 'text-primary', bg: 'bg-primary/10', email: 'hospital.owner@findmedi.com', pass: 'password' },
  { key: 'medical_superintendent', category: 'hospital', name: 'Medical Superintendent Demo', label: 'Medical Superintendent', desc: 'Hospital operations', icon: Stethoscope, color: 'text-primary', bg: 'bg-primary/10', email: 'medical.superintendent@findmedi.com', pass: 'password' },
  { key: 'hod', category: 'hospital', name: 'HOD Demo', label: 'HOD', desc: 'Department head console', icon: Stethoscope, color: 'text-primary', bg: 'bg-primary/10', email: 'hod@findmedi.com', pass: 'password' },
  { key: 'resident_doctor', category: 'hospital', name: 'Resident Doctor Demo', label: 'Resident Doctor', desc: 'Duty doctor console', icon: Stethoscope, color: 'text-info', bg: 'bg-info/10', email: 'resident.doctor@findmedi.com', pass: 'password' },
  { key: 'emergency', category: 'hospital', name: 'Emergency Demo', label: 'Emergency', desc: 'Casualty & triage', icon: Stethoscope, color: 'text-red-600', bg: 'bg-red-500/10', email: 'emergency@findmedi.com', pass: 'password' },
  { key: 'icu_doctor', category: 'hospital', name: 'ICU Doctor Demo', label: 'ICU Doctor', desc: 'Intensivist console', icon: Stethoscope, color: 'text-info', bg: 'bg-info/10', email: 'icu.doctor@findmedi.com', pass: 'password' },
  { key: 'ot_coordinator', category: 'hospital', name: 'OT Coordinator Demo', label: 'OT Coordinator', desc: 'Theatre scheduling', icon: Shield, color: 'text-slate-600', bg: 'bg-slate-500/10', email: 'ot.coordinator@findmedi.com', pass: 'password' },
  { key: 'opd_coordinator', category: 'hospital', name: 'OPD Coordinator Demo', label: 'OPD Coordinator', desc: 'OPD tokens & queue', icon: Headset, color: 'text-orange-600', bg: 'bg-orange-500/10', email: 'opd.coordinator@findmedi.com', pass: 'password' },
  { key: 'admission_coordinator', category: 'hospital', name: 'Admission Coordinator Demo', label: 'Admissions', desc: 'Admission & TPA flow', icon: Headset, color: 'text-cyan-600', bg: 'bg-cyan-500/10', email: 'admission.coordinator@findmedi.com', pass: 'password' },
  { key: 'bed_manager', category: 'hospital', name: 'Bed Manager Demo', label: 'Bed Manager', desc: 'Bed board & allocation', icon: Building2, color: 'text-slate-600', bg: 'bg-slate-500/10', email: 'bed.manager@findmedi.com', pass: 'password' },
  { key: 'facility_manager', category: 'hospital', name: 'Facility Manager Demo', label: 'Facility Manager', desc: 'Facilities & helpdesk', icon: Building2, color: 'text-slate-600', bg: 'bg-slate-500/10', email: 'facility.manager@findmedi.com', pass: 'password' },
  { key: 'discharge_coordinator', category: 'hospital', name: 'Discharge Coordinator Demo', label: 'Discharge Desk', desc: 'Discharge clearance', icon: Receipt, color: 'text-yellow-600', bg: 'bg-yellow-500/10', email: 'discharge.coordinator@findmedi.com', pass: 'password' },
  { key: 'mis_reporting', category: 'hospital', name: 'MIS Reporting Demo', label: 'MIS Reporting', desc: 'Management information', icon: Scale, color: 'text-slate-600', bg: 'bg-slate-500/10', email: 'mis.reporting@findmedi.com', pass: 'password' },
  { key: 'doctor_portal', category: 'hospital', name: 'Doctor Portal Demo', label: 'Doctor Portal', desc: 'Doctor remote portal', icon: Stethoscope, color: 'text-info', bg: 'bg-info/10', email: 'doctor.portal@findmedi.com', pass: 'password' },
  { key: 'patient_relations', category: 'hospital', name: 'Patient Relations Demo', label: 'Patient Relations', desc: 'Feedback & escalation', icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-500/10', email: 'patient.relations@findmedi.com', pass: 'password' },
  { key: 'it_admin', category: 'hospital', name: 'IT Admin Demo', label: 'IT Admin', desc: 'Systems & integrations', icon: Shield, color: 'text-slate-600', bg: 'bg-slate-500/10', email: 'it.admin@findmedi.com', pass: 'password' },
  { key: 'pharmacist', category: 'hospital', name: 'Pharmacist Demo', label: 'Pharmacist', desc: 'Dispensing counter', icon: Pill, color: 'text-amber-600', bg: 'bg-amber-500/10', email: 'pharmacist@findmedi.com', pass: 'password' },
  { key: 'accountant', category: 'hospital', name: 'Accountant Demo', label: 'Accountant', desc: 'Accounts & billing', icon: Receipt, color: 'text-yellow-600', bg: 'bg-yellow-500/10', email: 'accountant@findmedi.com', pass: 'password' },
  { key: 'security', category: 'hospital', name: 'Security Demo', label: 'Security', desc: 'Gate passes & incidents', icon: Shield, color: 'text-slate-600', bg: 'bg-slate-500/10', email: 'security@findmedi.com', pass: 'password' },
  // Lab (LIS) + Radiology (RIS) staff
  { key: 'lab_receptionist', category: 'lab', name: 'Lab Receptionist Demo', label: 'Lab Reception', desc: 'Samples & registration', icon: Microscope, color: 'text-emerald-600', bg: 'bg-emerald-500/10', email: 'lab.receptionist@findmedi.com', pass: 'password' },
  { key: 'lab_technician', category: 'lab', name: 'Lab Technician Demo', label: 'Lab Technician', desc: 'Bench & results entry', icon: Microscope, color: 'text-emerald-600', bg: 'bg-emerald-500/10', email: 'lab.technician@findmedi.com', pass: 'password' },
  { key: 'lab_supervisor', category: 'lab', name: 'Lab Supervisor Demo', label: 'Lab Supervisor', desc: 'QC & sign-off', icon: Microscope, color: 'text-emerald-600', bg: 'bg-emerald-500/10', email: 'lab.supervisor@findmedi.com', pass: 'password' },
  { key: 'lab_receiving', category: 'lab', name: 'Lab Receiving Demo', label: 'Lab Receiving', desc: 'Accession & barcode', icon: Microscope, color: 'text-emerald-600', bg: 'bg-emerald-500/10', email: 'lab.receiving@findmedi.com', pass: 'password' },
  { key: 'biochem_tech', category: 'lab', name: 'Biochem Tech Demo', label: 'Biochemistry', desc: 'Biochemistry bench', icon: Microscope, color: 'text-violet-600', bg: 'bg-violet-500/10', email: 'biochem.tech@findmedi.com', pass: 'password' },
  { key: 'hematology_tech', category: 'lab', name: 'Hematology Tech Demo', label: 'Hematology', desc: 'Hematology bench', icon: Microscope, color: 'text-violet-600', bg: 'bg-violet-500/10', email: 'hematology.tech@findmedi.com', pass: 'password' },
  { key: 'clinical_pathology_tech', category: 'lab', name: 'Clinical Pathology Tech Demo', label: 'Clinical Path', desc: 'Clinical pathology', icon: Microscope, color: 'text-violet-600', bg: 'bg-violet-500/10', email: 'clinical.pathology.tech@findmedi.com', pass: 'password' },
  { key: 'microbiology_tech', category: 'lab', name: 'Microbiology Tech Demo', label: 'Microbiology', desc: 'Microbiology bench', icon: Microscope, color: 'text-violet-600', bg: 'bg-violet-500/10', email: 'microbiology.tech@findmedi.com', pass: 'password' },
  { key: 'histopathology_tech', category: 'lab', name: 'Histopath Tech Demo', label: 'Histopathology', desc: 'Biopsy & sections', icon: Microscope, color: 'text-violet-600', bg: 'bg-violet-500/10', email: 'histopathology.tech@findmedi.com', pass: 'password' },
  { key: 'cytology_tech', category: 'lab', name: 'Cytology Tech Demo', label: 'Cytology', desc: 'Cytology smears', icon: Microscope, color: 'text-violet-600', bg: 'bg-violet-500/10', email: 'cytology.tech@findmedi.com', pass: 'password' },
  { key: 'serology_tech', category: 'lab', name: 'Serology Tech Demo', label: 'Serology', desc: 'Serology & immunology', icon: Microscope, color: 'text-violet-600', bg: 'bg-violet-500/10', email: 'serology.tech@findmedi.com', pass: 'password' },
  { key: 'molecular_tech', category: 'lab', name: 'Molecular Tech Demo', label: 'Molecular', desc: 'Molecular diagnostics', icon: Microscope, color: 'text-violet-600', bg: 'bg-violet-500/10', email: 'molecular.tech@findmedi.com', pass: 'password' },
  { key: 'report_coordinator', category: 'lab', name: 'Report Coordinator Demo', label: 'Report Coordinator', desc: 'Reports dispatch', icon: Microscope, color: 'text-violet-600', bg: 'bg-violet-500/10', email: 'report.coordinator@findmedi.com', pass: 'password' },
  { key: 'home_collection_staff', category: 'lab', name: 'Home Collection Demo', label: 'Home Collection', desc: 'Field sample collection', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-500/10', email: 'home.collection.staff@findmedi.com', pass: 'password' },
  { key: 'lab_admin', category: 'lab', name: 'Lab Admin Demo', label: 'Lab Admin', desc: 'Lab administration', icon: Microscope, color: 'text-emerald-600', bg: 'bg-emerald-500/10', email: 'lab.admin@findmedi.com', pass: 'password' },
  { key: 'lab_manager', category: 'lab', name: 'Lab Manager Demo', label: 'Lab Manager', desc: 'Lab operations', icon: Microscope, color: 'text-emerald-600', bg: 'bg-emerald-500/10', email: 'lab.manager@findmedi.com', pass: 'password' },
  { key: 'lab_quality_mgr', category: 'lab', name: 'Lab QC Manager Demo', label: 'Lab QC Manager', desc: 'NABL & quality', icon: Microscope, color: 'text-emerald-600', bg: 'bg-emerald-500/10', email: 'lab.quality.mgr@findmedi.com', pass: 'password' },
  { key: 'analyzer_staff', category: 'lab', name: 'Analyzer Staff Demo', label: 'Analyzer Staff', desc: 'Machine operation', icon: Microscope, color: 'text-emerald-600', bg: 'bg-emerald-500/10', email: 'analyzer.staff@findmedi.com', pass: 'password' },
  { key: 'lab_inventory_mgr', category: 'lab', name: 'Lab Inventory Mgr Demo', label: 'Lab Inventory', desc: 'Reagents & stock', icon: Microscope, color: 'text-emerald-600', bg: 'bg-emerald-500/10', email: 'lab.inventory.mgr@findmedi.com', pass: 'password' },
  { key: 'radiology_manager', category: 'lab', name: 'Radiology Manager Demo', label: 'Radiology Manager', desc: 'Imaging administration', icon: ScanLine, color: 'text-sky-600', bg: 'bg-sky-500/10', email: 'radiology.manager@findmedi.com', pass: 'password' },
  { key: 'radiology_scheduler', category: 'lab', name: 'Radiology Scheduler Demo', label: 'Radiology Scheduler', desc: 'Appointments & slots', icon: ScanLine, color: 'text-sky-600', bg: 'bg-sky-500/10', email: 'radiology.scheduler@findmedi.com', pass: 'password' },
  { key: 'radiology_prep_staff', category: 'lab', name: 'Radiology Prep Demo', label: 'Radiology Prep', desc: 'Preparation & safety', icon: ScanLine, color: 'text-sky-600', bg: 'bg-sky-500/10', email: 'radiology.prep.staff@findmedi.com', pass: 'password' },
  { key: 'mri_technician', category: 'lab', name: 'MRI Technician Demo', label: 'MRI Tech', desc: 'MRI console', icon: ScanLine, color: 'text-sky-600', bg: 'bg-sky-500/10', email: 'mri.technician@findmedi.com', pass: 'password' },
  { key: 'xray_technician', category: 'lab', name: 'X-Ray Technician Demo', label: 'X-Ray Tech', desc: 'X-Ray console', icon: ScanLine, color: 'text-sky-600', bg: 'bg-sky-500/10', email: 'xray.technician@findmedi.com', pass: 'password' },
  { key: 'ct_technician', category: 'lab', name: 'CT Technician Demo', label: 'CT Tech', desc: 'CT console', icon: ScanLine, color: 'text-sky-600', bg: 'bg-sky-500/10', email: 'ct.technician@findmedi.com', pass: 'password' },
  { key: 'us_technician', category: 'lab', name: 'Ultrasound Tech Demo', label: 'Sonography Tech', desc: 'USG & Doppler', icon: ScanLine, color: 'text-sky-600', bg: 'bg-sky-500/10', email: 'us.technician@findmedi.com', pass: 'password' },
  { key: 'mammo_technician', category: 'lab', name: 'Mammo Tech Demo', label: 'Mammo Tech', desc: 'Mammography console', icon: ScanLine, color: 'text-sky-600', bg: 'bg-sky-500/10', email: 'mammo.technician@findmedi.com', pass: 'password' },
  { key: 'reporting_assistant', category: 'lab', name: 'Reporting Assistant Demo', label: 'Reporting Assistant', desc: 'Reports & transcription', icon: ScanLine, color: 'text-sky-600', bg: 'bg-sky-500/10', email: 'reporting.assistant@findmedi.com', pass: 'password' },
  { key: 'pacs_admin', category: 'lab', name: 'PACS Admin Demo', label: 'PACS Admin', desc: 'PACS & DICOM', icon: ScanLine, color: 'text-sky-600', bg: 'bg-sky-500/10', email: 'pacs.admin@findmedi.com', pass: 'password' },
  { key: 'radiology_admin', category: 'lab', name: 'Radiology Admin Demo', label: 'Radiology Admin', desc: 'Admin console', icon: ScanLine, color: 'text-sky-600', bg: 'bg-sky-500/10', email: 'radiology.admin@findmedi.com', pass: 'password' },
  { key: 'radiology_receptionist', category: 'lab', name: 'Radiology Receptionist Demo', label: 'Radiology Reception', desc: 'Front desk', icon: Headset, color: 'text-sky-600', bg: 'bg-sky-500/10', email: 'radiology.receptionist@findmedi.com', pass: 'password' },
  { key: 'radiology_billing_executive', category: 'lab', name: 'Radiology Billing Demo', label: 'Radiology Billing', desc: 'Imaging billing', icon: Receipt, color: 'text-yellow-600', bg: 'bg-yellow-500/10', email: 'radiology.billing.executive@findmedi.com', pass: 'password' },
  { key: 'equipment_manager', category: 'lab', name: 'Equipment Manager Demo', label: 'Equipment Manager', desc: 'Imaging equipment', icon: Microscope, color: 'text-violet-600', bg: 'bg-violet-500/10', email: 'equipment.manager@findmedi.com', pass: 'password' },
  { key: 'radiology_technician', category: 'lab', name: 'Radiology Technician Demo', label: 'Radiology Tech', desc: 'Radiographer bench', icon: ScanLine, color: 'text-sky-600', bg: 'bg-sky-500/10', email: 'radiology.technician@findmedi.com', pass: 'password' },
  // Clinic (CMS) staff
  { key: 'clinic_receptionist', category: 'clinic', name: 'Clinic Receptionist Demo', label: 'Clinic Reception', desc: 'Registration & queue', icon: Headset, color: 'text-orange-600', bg: 'bg-orange-500/10', email: 'clinic.receptionist@findmedi.com', pass: 'password' },
  { key: 'clinic_nurse', category: 'clinic', name: 'Clinic Nurse Demo', label: 'Clinic Nurse', desc: 'Triage & vitals', icon: HeartPulse, color: 'text-pink-600', bg: 'bg-pink-500/10', email: 'clinic.nurse@findmedi.com', pass: 'password' },
  { key: 'clinic_accountant', category: 'clinic', name: 'Clinic Accountant Demo', label: 'Clinic Accountant', desc: 'Clinic accounts', icon: Receipt, color: 'text-yellow-600', bg: 'bg-yellow-500/10', email: 'clinic.accountant@findmedi.com', pass: 'password' },
  { key: 'clinic_pharmacist', category: 'clinic', name: 'Clinic Pharmacist Demo', label: 'Clinic Pharmacist', desc: 'Dispensing & stock', icon: Pill, color: 'text-amber-600', bg: 'bg-amber-500/10', email: 'clinic.pharmacist@findmedi.com', pass: 'password' },
  { key: 'clinic_cashier', category: 'clinic', name: 'Clinic Cashier Demo', label: 'Clinic Cashier', desc: 'Cashier desk', icon: Receipt, color: 'text-yellow-600', bg: 'bg-yellow-500/10', email: 'clinic.cashier@findmedi.com', pass: 'password' },
  { key: 'clinic_branch_manager', category: 'clinic', name: 'Clinic Branch Manager Demo', label: 'Branch Manager', desc: 'Multi-branch ops', icon: Building2, color: 'text-emerald-700', bg: 'bg-emerald-500/10', email: 'clinic.branch.manager@findmedi.com', pass: 'password' },
  { key: 'clinic_telemed_coordinator', category: 'clinic', name: 'Telemed Coordinator Demo', label: 'Telemed Coordinator', desc: 'Video consult queue', icon: Heart, color: 'text-cyan-600', bg: 'bg-cyan-500/10', email: 'clinic.telemed.coordinator@findmedi.com', pass: 'password' },
  { key: 'clinic_lab_tech', category: 'clinic', name: 'Clinic Lab Tech Demo', label: 'Clinic Lab Tech', desc: 'Clinic pathology', icon: Microscope, color: 'text-emerald-600', bg: 'bg-emerald-500/10', email: 'clinic.lab.tech@findmedi.com', pass: 'password' },
  { key: 'clinic_radiology_tech', category: 'clinic', name: 'Clinic Radiology Tech Demo', label: 'Clinic Radiology', desc: 'Clinic imaging', icon: ScanLine, color: 'text-sky-600', bg: 'bg-sky-500/10', email: 'clinic.radiology.tech@findmedi.com', pass: 'password' },
  { key: 'clinic_inventory_mgr', category: 'clinic', name: 'Clinic Inventory Mgr Demo', label: 'Clinic Inventory', desc: 'Stock & reorder', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-500/10', email: 'clinic.inventory.mgr@findmedi.com', pass: 'password' },
  { key: 'clinic_purchase_officer', category: 'clinic', name: 'Clinic Purchase Demo', label: 'Clinic Purchase', desc: 'Vendor orders & POs', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-500/10', email: 'clinic.purchase.officer@findmedi.com', pass: 'password' },
  { key: 'clinic_hr_admin', category: 'clinic', name: 'Clinic HR Demo', label: 'Clinic HR', desc: 'Staff & rosters', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-500/10', email: 'clinic.hr.admin@findmedi.com', pass: 'password' },
  { key: 'clinic_home_collection', category: 'clinic', name: 'Clinic Home Collection Demo', label: 'Clinic Home Collection', desc: 'Field collection', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-500/10', email: 'clinic.home.collection@findmedi.com', pass: 'password' },
  { key: 'clinic_telemed_coord', category: 'clinic', name: 'Telemed Coord Demo', label: 'Telemed Coord', desc: 'Telemedicine ops', icon: Heart, color: 'text-cyan-600', bg: 'bg-cyan-500/10', email: 'clinic.telemed.coord@findmedi.com', pass: 'password' },
  { key: 'clinic_crm_staff', category: 'clinic', name: 'Clinic CRM Demo', label: 'Clinic CRM', desc: 'CRM & follow-ups', icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-500/10', email: 'clinic.crm.staff@findmedi.com', pass: 'password' },
  { key: 'clinic_quality_mgr', category: 'clinic', name: 'Clinic Quality Demo', label: 'Clinic Quality', desc: 'Quality & audits', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-500/10', email: 'clinic.quality.mgr@findmedi.com', pass: 'password' },
  { key: 'clinic_patient_portal', category: 'clinic', name: 'Clinic Portal Demo', label: 'Clinic Patient Portal', desc: 'Patient self-service', icon: UserRound, color: 'text-success', bg: 'bg-success/10', email: 'clinic.patient.portal@findmedi.com', pass: 'password' },
  { key: 'clinic_owner_analytics', category: 'clinic', name: 'Clinic Owner Analytics Demo', label: 'Clinic Analytics', desc: 'Executive analytics', icon: Building2, color: 'text-emerald-700', bg: 'bg-emerald-500/10', email: 'clinic.owner.analytics@findmedi.com', pass: 'password' },
  // Platform / ops consoles — 2FA-mandatory, demo password is followed by an authenticator code
  { key: 'content_editor', category: 'platform', name: 'Content Editor Demo', label: 'Content Editor', desc: '2FA · Health content CMS', icon: Scale, color: 'text-indigo-600', bg: 'bg-indigo-500/10', email: 'content.editor@findmedi.com', pass: 'password' },
  { key: 'medical_reviewer', category: 'platform', name: 'Medical Reviewer Demo', label: 'Medical Reviewer', desc: '2FA · Medical review', icon: Scale, color: 'text-indigo-600', bg: 'bg-indigo-500/10', email: 'medical.reviewer@findmedi.com', pass: 'password' },
  { key: 'moderator', category: 'platform', name: 'Moderator Demo', label: 'Moderator', desc: '2FA · Moderation queues', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-500/10', email: 'moderator@findmedi.com', pass: 'password' },
  { key: 'support_agent', category: 'platform', name: 'Support Agent Demo', label: 'Support Agent', desc: '2FA · Support inbox', icon: Headset, color: 'text-cyan-600', bg: 'bg-cyan-500/10', email: 'support.agent@findmedi.com', pass: 'password' },
  { key: 'finance_admin', category: 'platform', name: 'Finance Admin Demo', label: 'Finance Admin', desc: '2FA · Payouts & commission', icon: Receipt, color: 'text-yellow-600', bg: 'bg-yellow-500/10', email: 'finance@findmedi.com', pass: 'password' },
  { key: 'kyc_reviewer', category: 'platform', name: 'KYC Reviewer Demo', label: 'KYC Reviewer', desc: '2FA · Provider KYC', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-500/10', email: 'kyc@findmedi.com', pass: 'password' },
  { key: 'compliance_officer', category: 'platform', name: 'Compliance Officer Demo', label: 'Compliance Officer', desc: '2FA · Audit & licenses', icon: Scale, color: 'text-indigo-600', bg: 'bg-indigo-500/10', email: 'compliance@findmedi.com', pass: 'password' },
  { key: 'platform_admin', category: 'platform', name: 'Platform Admin Demo', label: 'Platform Admin', desc: '2FA · Platform operations', icon: Shield, color: 'text-purple-600', bg: 'bg-purple-500/10', email: 'platform.admin@findmedi.com', pass: 'password' },
  { key: 'support_l1', category: 'platform', name: 'Support L1 Demo', label: 'Support L1', desc: '2FA · First-line support', icon: Headset, color: 'text-cyan-600', bg: 'bg-cyan-500/10', email: 'support.l1@findmedi.com', pass: 'password' },
  { key: 'support_l2', category: 'platform', name: 'Support L2 Demo', label: 'Support L2', desc: '2FA · Escalations & disputes', icon: Headset, color: 'text-cyan-600', bg: 'bg-cyan-500/10', email: 'support.l2@findmedi.com', pass: 'password' },
  { key: 'dpo', category: 'platform', name: 'DPO Demo', label: 'DPO', desc: '2FA · Privacy & DSRs', icon: Scale, color: 'text-indigo-600', bg: 'bg-indigo-500/10', email: 'dpo@findmedi.com', pass: 'password' },
  { key: 'security_admin', category: 'platform', name: 'Security Admin Demo', label: 'Security Admin', desc: '2FA · Security & access', icon: Shield, color: 'text-purple-600', bg: 'bg-purple-500/10', email: 'security.admin@findmedi.com', pass: 'password' },
  { key: 'clinical_safety', category: 'platform', name: 'Clinical Safety Demo', label: 'Clinical Safety', desc: '2FA · Incidents & crises', icon: HeartPulse, color: 'text-pink-600', bg: 'bg-pink-500/10', email: 'clinical.safety@findmedi.com', pass: 'password' },
  { key: 'analyst', category: 'platform', name: 'Analyst Demo', label: 'Analyst', desc: '2FA · Analytics & CRM', icon: Scale, color: 'text-indigo-600', bg: 'bg-indigo-500/10', email: 'analyst@findmedi.com', pass: 'password' },
  { key: 'auditor', category: 'platform', name: 'Auditor Demo', label: 'Auditor', desc: '2FA · Audit trail', icon: Scale, color: 'text-indigo-600', bg: 'bg-indigo-500/10', email: 'auditor@findmedi.com', pass: 'password' },
  { key: 'catalog_manager', category: 'platform', name: 'Catalog Manager Demo', label: 'Catalog Manager', desc: '2FA · Categories & types', icon: Building2, color: 'text-slate-600', bg: 'bg-slate-500/10', email: 'catalog.manager@findmedi.com', pass: 'password' },
  { key: 'city_manager', category: 'platform', name: 'City Manager Demo', label: 'City Manager', desc: '2FA · Launch cities', icon: Building2, color: 'text-slate-600', bg: 'bg-slate-500/10', email: 'city.manager@findmedi.com', pass: 'password' },
  { key: 'super_admin', category: 'platform', name: 'Super Admin Demo', label: 'Super Admin', desc: '2FA · CMS super admin', icon: Shield, color: 'text-purple-600', bg: 'bg-purple-500/10', email: 'super.admin@findmedi.com', pass: 'password' },
  // Others
  { key: 'ngo_admin', category: 'others', name: 'NGO Admin Demo', label: 'NGO Admin', desc: 'Community & camps', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-500/10', email: 'ngo.admin@findmedi.com', pass: 'password' },
  { key: 'technician', category: 'others', name: 'Technician Demo', label: 'Technician', desc: 'Biomedical technician', icon: Microscope, color: 'text-violet-600', bg: 'bg-violet-500/10', email: 'technician@findmedi.com', pass: 'password' },
  { key: 'helper', category: 'others', name: 'Helper Demo', label: 'Helper', desc: 'General ward support', icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-500/10', email: 'helper@findmedi.com', pass: 'password' },
];

const isDemoEmail = (emailStr?: string) => {
  if (!emailStr) return false;
  const e = emailStr.toLowerCase().trim();
  return (
    e.endsWith('@findmedi.com') ||
    e.endsWith('@mindsupport.seed') ||
    e.endsWith('@medicore.com') ||
    e.endsWith('@findmedi.local') ||
    e.startsWith('demo-') ||
    e.startsWith('demo_') ||
    e === 'mahendrapra0077@gmail.com'
  );
};

export default function Login() {
  const navigate = useNavigate();
  const { user, loading: authLoading, login, completeGoogleLogin, completeTwoFactorLogin } = useAuth();
  // AUTH-UI: start with NO role selected. An empty role is omitted from the
  // payload entirely (see handleLogin), so the server logs the account in
  // without a `user.role !== role` mismatch - which is what made the 7 roles
  // that had no tile unloginable before this page became data-driven.
  const [role, setRole] = useState('');
  // Live list from GET /auth/login-roles; falls back to the bundled metadata.
  const [roleKeys, setRoleKeys] = useState<string[] | null>(null);
  const [demoCategory, setDemoCategory] = useState<'all' | 'hospital' | 'lab' | 'clinic' | 'vertical' | 'platform' | 'others'>('all');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // AUTH-B-03: pending 2FA step (set when the server answers with a ticket).
  const [twoFactorTicket, setTwoFactorTicket] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  // AUTH-UI: fetch the authoritative role list. Must run before the early
  // returns below (React hook ordering), and failures must not block login -
  // the bundled fallback keeps the grid usable when the API is down.
  useEffect(() => {
    let alive = true;
    api.loginRoles()
      .then((data: any) => {
        const keys = Array.isArray(data?.roles) ? data.roles.filter(Boolean) : null;
        if (alive && keys && keys.length) setRoleKeys(keys);
      })
      .catch(() => { /* offline / 5xx -> keep bundled fallback */ });
    return () => { alive = false; };
  }, []);

  const roleTiles = buildRoles(Array.from(new Set([
    ...FALLBACK_ROLE_KEYS,
    ...(roleKeys ?? []),
  ])));

  // Wait for /auth/me hydration before redirecting. Otherwise a stale user in
  // memory during session validation can bounce between /login and /dashboard.
  // AUTH-F-06: a temp-password session goes to /set-password instead - every
  // data endpoint will 403 PASSWORD_RESET_REQUIRED until the flag is cleared.
  if (authLoading) return <div className="min-h-screen" role="status" aria-label="Checking session" />;
  if (user) return <Navigate to={(user.mustResetPassword && !isDemoEmail(user.email)) ? '/set-password' : '/dashboard'} replace />;

  const pickRole = (r: string) => {
    setRole(r);
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleGoogleCredential = async (idToken: any, accessToken: any = null) => {
    setError('');
    setGoogleLoading(true);
    try {
      // AUTH-UI: omit `role` entirely when no tile is selected. Sending ''
      // would 400 against the zod enum, and sending a role the account does not
      // have 403s - so an unselected role means "log in as whatever this is".
      const data = await api.googleAuth({ idToken, accessToken, ...(role ? { role } : {}) });
      if (data.exists && data.token && data.user) {
        setAuthTokens(data.token);
        completeGoogleLogin(data.user);
        // AUTH-F-06: google sessions for temp-password accounts land on the
        // forced-rotation page too (the old login-time check never ran here).
        navigate((data.user.mustResetPassword && !isDemoEmail(data.user.email)) ? '/set-password' : '/dashboard', { replace: true });
        return;
      }

      const g = data.googleUser || {};
      const signupData = {
        role: role || 'patient',
        name: g.name || '',
        email: g.email || '',
        avatar: g.picture || '',
        isGoogle: true,
      };
      localStorage.setItem('google_signup', JSON.stringify(signupData));
      navigate('/signup', { state: signupData });
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;

  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Sign-In is not configured. Contact the administrator.');
      return;
    }

    const winGoogle = (window as any).google;

    if (winGoogle?.accounts?.oauth2) {
      try {
        const tokenClient = winGoogle.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          callback: (tokenResponse: any) => {
            if (tokenResponse?.access_token) {
              handleGoogleCredential(null, tokenResponse.access_token);
            }
          },
          error_callback: (err: any) => {
            console.error('Google OAuth popup error:', err);
            setError('Google sign-in was cancelled or closed.');
          },
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (oauthErr: any) {
        console.warn('initTokenClient failed, falling back to ID prompt:', oauthErr);
      }
    }

    if (winGoogle?.accounts?.id) {
      winGoogle.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: any) => handleGoogleCredential(response.credential),
      });
      winGoogle.accounts.id.prompt();
    } else {
      setError('Google Sign-In script is loading. Please try again in a moment.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password, role || undefined);
      // AUTH-B-03: 2FA-enrolled accounts get a ticket, not a session.
      if (result?.requiresTwoFactor) {
        setTwoFactorTicket(result.twoFactorTicket);
        setTwoFactorCode('');
        return;
      }
      // AUTH-F-06: temp-password accounts must rotate before anything else (except demo accounts).
      if (result?.mustResetPassword && !isDemoEmail(email)) {
        navigate('/set-password', { replace: true });
        return;
      }
      navigate('/dashboard');
    } catch (err: any) {
      if (err?.requiresVerification || err?.message?.toLowerCase().includes('verify your email')) {
        const params = new URLSearchParams({ email });
        if (err.otpError || err.emailDeliveryFailed) params.set('delivery', 'failed');
        navigate(`/verify-otp?${params.toString()}`);
      } else if (err?.approvalPending || err?.approvalRejected) {
        navigate(
          `/pending-approval?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}&status=${
            err.approvalRejected ? 'rejected' : 'pending'
          }`
        );
      } else {
        setError(err?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // AUTH-B-03: second leg of the 2FA login (ticket + code -> real session).
  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = twoFactorCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await completeTwoFactorLogin({ twoFactorTicket: twoFactorTicket!, token: code });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Invalid 2FA code');
    } finally {
      setLoading(false);
    }
  };

  if (twoFactorTicket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-6 bg-card rounded-2xl border border-border shadow-sm"
        >
          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground mb-1">Two-factor verification</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Enter the 6-digit code from your authenticator app to finish signing in.
          </p>
          <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-2xl tracking-[0.4em]"
              aria-label="Two-factor code"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify and continue'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setTwoFactorTicket(null);
                setTwoFactorCode('');
                setError('');
                setPassword('');
              }}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Use a different account
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full min-w-0 bg-background flex overflow-x-clip">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar items-center justify-center p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, hsl(174,62%,48%) 0%, transparent 50%), radial-gradient(circle at 75% 75%, hsl(210,80%,55%) 0%, transparent 50%)',
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 text-center max-w-md"
        >
          <div className="w-24 h-24 flex items-center justify-center mx-auto mb-6 rounded-2xl overflow-hidden shadow-lg">
            <img src="/logo.png" alt="FindMedi Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-heading text-4xl font-bold text-sidebar-primary-foreground mb-4">FindMedi</h1>
          <p className="text-sidebar-foreground/70 text-lg leading-relaxed mb-10">
            Complete hospital management solution. Manage patients, doctors, appointments, and billing — all in one place.
          </p>
        </motion.div>
      </div>

      {/* Right Panel */}
      <div className="min-w-0 flex-1 flex items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full min-w-0 max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl overflow-hidden shadow-sm">
              <img src="/logo.png" alt="FindMedi Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="font-heading text-xl font-bold text-foreground">FindMedi</h1>
          </div>

          <h2 className="font-heading text-2xl font-bold text-foreground mb-1">Welcome back</h2>
          <p className="text-muted-foreground mb-6">Select your role and sign in to continue</p>

          {/* Join Platform */}
          <div className="mb-5 p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
            <p className="text-xs font-medium text-foreground mb-2">Are you a healthcare provider?</p>
            <Link to="/join-platform">
              <Button
                variant="outline"
                className="w-full gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/5 text-xs h-9"
              >
                <Building2 className="w-3.5 h-3.5" /> Join Platform
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {/* Role Selection */}
          <div
            aria-label="Demo role cards"
            className="mb-6 max-h-[min(42vh,22rem)] overflow-y-auto overscroll-contain rounded-xl border border-border/60 p-2 [scrollbar-gutter:stable]"
          >
            <div className="grid grid-cols-2 gap-2 xs:grid-cols-3 sm:grid-cols-4">
            {roleTiles.map(({ key, label, desc, icon: Icon, color, bg }) => (
              <button
                key={key}
                type="button"
                onClick={() => pickRole(key)}
                aria-pressed={role === key}
                className={`min-w-0 p-2 rounded-lg border text-center transition-all ${
                  role === key
                    ? 'border-primary bg-accent shadow-sm'
                    : 'border-border hover:border-primary/30 hover:bg-muted/50'
                }`}
              >
                <div className={`w-6 h-6 rounded-md ${bg} flex items-center justify-center mx-auto mb-1`}>
                  <Icon className={`w-3 h-3 ${color}`} />
                </div>
                <p className={`text-[11px] font-semibold leading-tight ${role === key ? 'text-primary' : 'text-foreground'}`}>
                  {label}
                </p>
                <p className="text-[8px] text-muted-foreground mt-0.5 leading-tight">{desc}</p>
              </button>
            ))}
            </div>
            {roleTiles.length > 8 && (
              <p className="sticky bottom-0 mt-2 rounded-lg bg-background/95 px-2 py-1.5 text-center text-[11px] text-muted-foreground shadow-sm">
                Scroll to see all {roleTiles.length} demo roles
              </p>
            )}
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="h-10"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="text-right -mt-1">
              <Link to="/forgot-password" className="text-xs text-primary font-medium hover:underline">
                Forgot password?
              </Link>
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          {(() => {
            const qs = typeof window !== 'undefined' ? window.location.search.slice(1) : '';
            const ref = new URLSearchParams(qs).get('ref');
            return ref ? (
              <p className="text-xs text-center text-muted-foreground mt-3">
                Naya account? <Link to={`/signup?ref=${ref}`} className="text-primary underline">Signup karo</Link> apna referral bonus paane ke liye.
              </p>
            ) : null;
          })()}

          <p className="text-sm text-muted-foreground text-center mt-5">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Sign Up
            </Link>
          </p>

          <div className="relative mt-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 mt-4"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </Button>

          {import.meta.env.DEV && (
              <div className="mt-4 p-3 bg-muted/50 rounded-xl border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground">⚡ Quick Demo Login:</p>
              <span className="text-[10px] text-muted-foreground font-mono">superadmin: admin@123 · 2FA roles: authenticator code</span>
            </div>

            {/* Category Pills */}
            <div className="flex gap-1 overflow-x-auto pb-1 mb-2.5 scrollbar-none">
              {[
                { id: 'all', label: 'All' },
                { id: 'hospital', label: '🏥 Hospital (48)' },
                { id: 'lab', label: '🔬 Lab & Radiology (34)' },
                { id: 'clinic', label: '🏥 Clinic CMS (18)' },
                { id: 'vertical', label: '💼 Verticals (19)' },
                { id: 'platform', label: '🔐 Platform 2FA (18)' },
                { id: 'others', label: '🤝 Others (3)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDemoCategory(tab.id as any)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                    demoCategory === tab.id
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-background/80 text-muted-foreground hover:bg-background border border-border/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Grid of Accounts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-72 overflow-y-auto pr-1">
              {demoAccounts
                .filter((acc) => demoCategory === 'all' ? true : acc.category === demoCategory)
                .map(({ key, label, desc, icon: Icon, color, bg, email: demoEmail, pass }, index) => (
                  <button
                    key={`${key}-${demoEmail}-${index}`}
                    type="button"
                    onClick={() => {
                      setRole(key);
                      setEmail(demoEmail);
                      setPassword(pass);
                      setError('');
                    }}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      email === demoEmail
                        ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30'
                        : 'border-border/80 bg-background/80 hover:border-primary/40 hover:bg-background'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md ${bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-3.5 h-3.5 ${color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold leading-tight text-foreground truncate">{label}</p>
                        <p className="text-[8.5px] text-muted-foreground leading-tight truncate mt-0.5">{desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
            {demoCategory === 'all' && (
              <p className="text-xs text-center text-foreground font-medium mt-2 border-t border-border/40 pt-1.5">
                Tip: Tabs se role-families filter karein (🏥 Hospital · 🔬 Lab & Radiology · 🏙 Clinic · 💼 Verticals · 🔐 Platform). 2FA accounts ka password password hai, uske baad authenticator code maanga jata hai.
              </p>
            )}
          </div>
            )}
        </motion.div>
      </div>
    </div>
  );
}
