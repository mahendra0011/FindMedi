// MISS-AUTHZ-001: role → permission matrix. Roles carry permission strings;
// authorize('perm') checks the user's role grants it. Superadmin bypasses all.
//
// Convention: a bare permission (`records:read`) is a staff/professional grant —
// it means "you may act on anyone's data of this shape". A `:own`-suffixed
// permission (`records:read:own`) is a self-service grant: the route is reachable
// by the account's owner only, and the handler must still scope by req.user._id.
// Patient self-service routes use the `:own` form so declarative gating does not
// hand patients cross-tenant access.
/**
 * Role canonicalisation (AUTHZ-B-05).
 *
 * The `User.role` enum historically carried BOTH spellings of the same role
 * (`counselor` and `counsellor`), plus overlapping pairs like `doctor`/
 * `clinic_doctor`. Two spellings means two classes of account: one that passes
 * `authorize()` and one that silently 403s, and one that misses every
 * `role === 'counsellor'` special-case in a handler while the other passes it.
 * That is not a cosmetic bug — it is an authorization inconsistency that depends
 * on which spelling the signup form happened to submit.
 *
 * `canonicalRole()` collapses the aliases, so every permission check, notification
 * scope and socket room can rely on one spelling. `assertRoleMatrixComplete()`
 * proves the permission matrix covers every canonical role.
 */
export const ROLE_ALIASES = {
  counselor: 'counsellor',
  counsellor: 'counsellor',
  mid_level_counselor: 'counsellor',
  senior_counselor: 'counsellor',
};

/** Roles that share a permission set (aliases for authorization purposes only). */
export const ROLE_EQUIVALENTS = {
  counsellor: ['counsellor', 'psychiatrist'],
  psychiatrist: ['counsellor', 'psychiatrist'],
  doctor: ['doctor', 'clinic_doctor', 'surgeon', 'anaesthetist', 'resident_doctor', 'icu_doctor', 'doctor_portal'],
  clinic_doctor: ['doctor', 'clinic_doctor', 'surgeon', 'anaesthetist', 'resident_doctor', 'icu_doctor', 'doctor_portal'],
  surgeon: ['doctor', 'clinic_doctor', 'surgeon', 'anaesthetist', 'resident_doctor', 'icu_doctor', 'doctor_portal'],
  anaesthetist: ['doctor', 'clinic_doctor', 'surgeon', 'anaesthetist', 'resident_doctor', 'icu_doctor', 'doctor_portal'],
  resident_doctor: ['doctor', 'clinic_doctor', 'surgeon', 'anaesthetist', 'resident_doctor', 'icu_doctor', 'doctor_portal'],
  icu_doctor: ['doctor', 'clinic_doctor', 'surgeon', 'anaesthetist', 'resident_doctor', 'icu_doctor', 'doctor_portal'],
  doctor_portal: ['doctor', 'clinic_doctor', 'surgeon', 'anaesthetist', 'resident_doctor', 'icu_doctor', 'doctor_portal'],
  nurse: ['nurse', 'ward_nurse', 'icu_nurse', 'ot_nurse', 'infection_control_nurse', 'nursing_supervisor', 'matron'],
  ward_nurse: ['nurse', 'ward_nurse', 'icu_nurse', 'ot_nurse', 'infection_control_nurse', 'nursing_supervisor', 'matron'],
  icu_nurse: ['nurse', 'ward_nurse', 'icu_nurse', 'ot_nurse', 'infection_control_nurse', 'nursing_supervisor', 'matron'],
  ot_nurse: ['nurse', 'ward_nurse', 'icu_nurse', 'ot_nurse', 'infection_control_nurse', 'nursing_supervisor', 'matron'],
  infection_control_nurse: ['nurse', 'ward_nurse', 'icu_nurse', 'ot_nurse', 'infection_control_nurse', 'nursing_supervisor', 'matron'],
  nursing_supervisor: ['nurse', 'ward_nurse', 'icu_nurse', 'ot_nurse', 'infection_control_nurse', 'nursing_supervisor', 'matron'],
  matron: ['nurse', 'ward_nurse', 'icu_nurse', 'ot_nurse', 'infection_control_nurse', 'nursing_supervisor', 'matron'],
  // `receptionist` is declared ONCE, below, with the wider set that also holds
  // radiology_receptionist — this earlier duplicate was shadowed by it (the
  // last key wins) and was only ever a no-dupe-keys lint error.
  front_desk: ['receptionist', 'front_desk'],
  medical_director: ['medical_director', 'cmo', 'hospital_owner', 'medical_superintendent'],
  cmo: ['medical_director', 'cmo', 'hospital_owner', 'medical_superintendent'],
  hospital_owner: ['medical_director', 'cmo', 'hospital_owner', 'medical_superintendent'],
  medical_superintendent: ['medical_director', 'cmo', 'hospital_owner', 'medical_superintendent'],
  maintenance: ['maintenance', 'facility_manager'],
  facility_manager: ['maintenance', 'facility_manager'],
  superadmin: ['superadmin', 'super_admin'],
  super_admin: ['superadmin', 'super_admin'],
  clinic_telemed_coordinator: ['clinic_telemed_coordinator', 'clinic_telemed_coord'],
  clinic_telemed_coord: ['clinic_telemed_coordinator', 'clinic_telemed_coord'],
  store_keeper: ['store_keeper', 'purchase_officer', 'lab_inventory_mgr'],
  purchase_officer: ['store_keeper', 'purchase_officer', 'lab_inventory_mgr'],
  lab_inventory_mgr: ['store_keeper', 'purchase_officer', 'lab_inventory_mgr'],
  lab_owner: ['lab_owner', 'lab_admin', 'lab_manager'],
  lab_admin: ['lab_owner', 'lab_admin', 'lab_manager'],
  lab_manager: ['lab_owner', 'lab_admin', 'lab_manager'],
  radiology_manager: ['radiology_manager', 'radiology_admin'],
  radiology_admin: ['radiology_manager', 'radiology_admin'],
  receptionist: ['receptionist', 'front_desk', 'radiology_receptionist'],
  radiology_receptionist: ['receptionist', 'front_desk', 'radiology_receptionist'],
  billing_executive: ['billing_executive', 'radiology_billing_executive'],
  radiology_billing_executive: ['billing_executive', 'radiology_billing_executive'],
  biomedical_engineer: ['biomedical_engineer', 'maintenance', 'facility_manager', 'equipment_manager'],
  equipment_manager: ['biomedical_engineer', 'maintenance', 'facility_manager', 'equipment_manager'],
  quality_officer: ['quality_officer', 'lab_quality_mgr'],
  lab_quality_mgr: ['quality_officer', 'lab_quality_mgr'],
  technician: ['technician', 'analyzer_staff'],
  analyzer_staff: ['technician', 'analyzer_staff'],
};

export const canonicalRole = (role) => {
  if (!role) return role;
  const key = String(role).toLowerCase();
  return ROLE_ALIASES[key] || key;
};

/**
 * True when `role` should be treated as one of `group` for authorization.
 * Used by authorize() so a `counselor` account is not 403'd purely because of the
 * spelling it was created with.
 */
export const rolesEquivalent = (role, group) => {
  const canonical = canonicalRole(role);
  const family = ROLE_EQUIVALENTS[canonical] || [canonical];
  return family.includes(canonicalRole(group));
};

/**
 * Build the canonical, alias-free role list. Kept next to the alias map so the
 * User enum and the matrix can be generated from one source.
 */
export const CANONICAL_ROLES = [
  'superadmin', 'hospital_admin', 'doctor', 'clinic_doctor', 'patient',
  'lab_owner', 'lab_receptionist', 'lab_technician', 'pathologist',
  'pharmacy_owner', 'pharmacist', 'nurse', 'radiologist', 'dietitian',
  'physiotherapist', 'counsellor', 'psychiatrist', 'accountant', 'security',
  'technician', 'helper', 'delivery_boy', 'rider', 'assistant', 'lawyer',
  'ambulance',
  // File 23 §2: scoped platform roles (god-mode split). Least-privilege sets
  // in ROLE_PERMISSIONS below; none carries clinical PHI permissions.
  'platform_admin', 'support_l1', 'support_l2', 'dpo',
  'security_admin', 'clinical_safety', 'analyst', 'auditor',
  // File 09 §8.2: hospital front-desk (tenant-scoped, no clinical reads).
  'receptionist',
  // Doc 12 §3 & CMS Blueprint 70-module clinic operational roles.
  'super_admin',
  'clinic_admin', 'clinic_receptionist', 'clinic_nurse',
  'clinic_accountant', 'clinic_pharmacist',
  'clinic_cashier', 'clinic_branch_manager', 'clinic_telemed_coordinator',
  'clinic_lab_tech', 'clinic_radiology_tech', 'clinic_inventory_mgr',
  'clinic_purchase_officer', 'clinic_hr_admin', 'clinic_home_collection',
  'clinic_telemed_coord', 'clinic_crm_staff', 'clinic_quality_mgr',
  'clinic_patient_portal', 'clinic_owner_analytics',
  // File 22 P0-8 (docs2/08 §8.2): hospital operations roles.
  'front_desk',
  'billing_executive', 'cashier', 'insurance_desk',
  'medical_director', 'cmo',
  'nursing_supervisor', 'matron',
  'ward_nurse', 'icu_nurse', 'ot_nurse', 'infection_control_nurse',
  'surgeon', 'anaesthetist',
  'ot_technician', 'cssd_technician',
  'store_keeper', 'purchase_officer',
  'hr_manager',
  'biomedical_engineer', 'maintenance',
  'housekeeping_supervisor', 'ward_boy',
  'dietician_head', 'kitchen_staff',
  'mortuary_attendant',
  'medical_records_officer',
  'quality_officer',
  'pharmacovigilance_officer',
  'call_center_agent',
  // 8.md 1 / 7.md 4: the ops console carries NO "god mode". Each console
  // section gets an account that can reach its own queue and nothing else, so
  // a stolen kyc_reviewer session cannot rewrite commission config or read the
  // audit log. Same reason the enum, this list and ROLE_PERMISSIONS are keyed
  // by exactly these spellings.
  'kyc_reviewer', 'moderator', 'support_agent', 'finance_admin',
  'catalog_manager', 'compliance_officer', 'content_editor', 'city_manager',
  // 7.md 3: specialty-vertical roles. Admitted to the enum AND the matrix
  // together (assertRoleMatrixComplete throws otherwise) — each matrix entry
  // below is least-privilege over permission strings that routes actually
  // enforce; see the ROLE_PERMISSIONS block for the per-role rationale.
  'dentist', 'dental_clinic_admin',
  'optician', 'optical_shop_owner',
  'phlebotomist', 'home_nursing_admin',
  'yoga_instructor', 'yoga_studio_admin', 'gym_owner', 'trainer',
  'wellness_admin', 'therapist',
  'equipment_vendor', 'product_vendor',
  'event_organizer', 'ngo_admin', 'group_host', 'trainer_org',
  'blood_bank_admin', 'dialysis_admin', 'fertility_admin',
  'maternity_admin', 'rehab_admin', 'govt_facility_staff',
  'tpa_agent', 'medical_reviewer',
  // File 07 §3.25 to §3.30 specialty vertical roles
  'elder_care_admin', 'vaccination_admin', 'diet_kitchen_admin',
  'corporate_admin', 'child_dev_admin', 'specialty_centre_admin',
  // PATHOLOGY/LAB §9: department-scoped lab roles (one console section each,
  // least privilege over the lab:* strings the lab routes actually gate on).
  'lab_supervisor', 'lab_receiving', 'biochem_tech', 'hematology_tech',
  'clinical_pathology_tech', 'microbiology_tech', 'histopathology_tech',
  'cytology_tech', 'serology_tech', 'molecular_tech', 'report_coordinator',
  'home_collection_staff', 'it_admin',
  'lab_admin', 'lab_manager', 'lab_quality_mgr', 'analyzer_staff', 'lab_inventory_mgr',
  // File 28 §36/§37: radiology (RIS) department roles — one least-privilege
  // account per job on the imaging floor (manager, scheduler, prep, per-
  // modality technicians, reporting/PACS support).
  'radiology_manager', 'radiology_scheduler', 'radiology_prep_staff',
  'mri_technician', 'xray_technician', 'ct_technician', 'us_technician',
  'mammo_technician', 'reporting_assistant', 'pacs_admin',
  'radiology_admin', 'radiology_receptionist', 'radiology_billing_executive', 'equipment_manager',
  // HMS Blueprint 6-layer operational roles
  'hospital_owner', 'medical_superintendent', 'hod', 'resident_doctor',
  'emergency', 'icu_doctor', 'ot_coordinator', 'radiology_technician',
  'opd_coordinator', 'admission_coordinator', 'bed_manager', 'facility_manager',
  'patient_relations', 'discharge_coordinator', 'mis_reporting', 'doctor_portal',
];

/**
 * 8.md 1 + 13 ("Mandatory 2FA ... step-up on sensitive actions") / 7.md 8.
 *
 * Ops roles hold platform-wide reach (approvals, payouts, audit), so 2FA is a
 * property of the ROLE, not of an env var an operator has to remember to set:
 * the code-level default below is unioned with `TWO_FACTOR_REQUIRED_ROLES` in
 * middleware/auth.js. superadmin/hospital_admin stay env-driven — flipping them
 * on by default would 403 every existing session that has not enrolled.
 */
export const MANDATORY_TWO_FACTOR_ROLES = [
  'kyc_reviewer', 'moderator', 'support_agent', 'finance_admin',
  'catalog_manager', 'compliance_officer', 'content_editor', 'city_manager',
  // File 23 §6: every platform-wide admin role — 2FA is a property of the role.
  'platform_admin', 'support_l1', 'support_l2', 'dpo',
  'security_admin', 'clinical_safety', 'analyst', 'auditor',
];

/** The whole ops-console cast, for gates and tests that want all of them. */
export const OPS_ROLES = [...MANDATORY_TWO_FACTOR_ROLES];

export function assertRoleMatrixComplete(ROLE_PERMISSIONS) {
  const missing = CANONICAL_ROLES.filter(
    (role) => !Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)
  );
  if (missing.length) {
    throw new Error(
      `Role/permission matrix drift: no entry for ${missing.join(', ')}. `
      + 'A role with no matrix entry denies EVERY authorize() check, which presents '
      + 'to the user as a broken feature rather than a misconfiguration.'
    );
  }
  return true;
}

export const ROLE_PERMISSIONS = {
  superadmin: ['*'],
  super_admin: ['*'],
  // ── Ops console (8.md 1, 7.md 4) ───────────────────────────────────────────
  // Least privilege per role: each set is the smallest one that lets that role
  // do ITS job. `support:manage`, payout CREATION/PAYMENT, commission-config
  // writes, review DELETE and every export stay superadmin-only — the four-eyes
  // split (8.md 8: dual approval above threshold) is what makes a finance_admin
  // approving a payout meaningful.
  // 8.md 2: review queue, watermarked doc viewer, decide/needs-info/escalate.
  kyc_reviewer: ['applications:read', 'applications:decide', 'documents:read'],
  // 8.md 5: moderation queues + canned actions (flag/unflag/warn). Removing a
  // row outright is irreversible, so DELETE /reviews/:id stays superadmin.
  moderator: ['moderation:read', 'moderation:write'],
  // 7.md 3.22: unified inbox — read the queue, reply on the ticket. Assign /
  // status / stats (`support:manage`) stay with support leads + superadmin.
  support_agent: ['support:read', 'support:write'],
  // 7.md 3.23 / 8.md 8: settlements, refunds, commission config READ, ledger,
  // tax summary, payout approve (the second pair of eyes). Creating or paying a
  // payout and editing commission config are NOT in this set.
  finance_admin: ['commission:read', 'payouts:read', 'payouts:approve'],
  // 8.md 4: category tree editor (incl. merge) + provider-type join configs.
  catalog_manager: [
    'categories:read', 'categories:write',
    'provider-types:read', 'provider-types:write',
  ],
  // 8.md 11: immutable audit log read, DPDP data-subject request queue,
  // licence/registry tracker. Erasure EXECUTION stays superadmin (four hands).
  compliance_officer: [
    'audit:read', 'dsr:read', 'dsr:approve', 'licenses:read', 'licenses:write',
    'breakglass:read',
  ],
  // 7.md 3.21 / 8.md 11: versioned platform content (ToS, privacy, policies).
  content_editor: ['content:read', 'content:write'],
  // 8.md 4: city + service-city launch/pause (delete stays superadmin).
  city_manager: ['cities:read', 'cities:write', 'service-cities:read', 'service-cities:write', 'crm:read', 'crm:write'],
  hospital_admin: [
    'hospital:manage', 'staff:manage', 'staff:view', 'beds:manage', 'departments:manage',
    'records:read', 'records:write', 'records:amend', 'billing:read', 'billing:write',
    'pharmacy:manage', 'pharmacy:read', 'pharmacy:dispense',
    'lab:manage', 'lab:read', 'lab:book', 'lab:enter_result', 'lab:verify',
    'reports:read', 'notifications:send', 'notifications:read',
    'appointments:read', 'appointments:write', 'inventory:manage', 'inventory:read',
    'operations:read', 'operations:write', 'admin:read', 'admin:manage', 'nursing:read',
    'housekeeping:manage', 'security:read', 'security:manage',
    'commission:read', 'loyalty:manage', 'insurance:read', 'insurance:write',
    'legal:read', 'legal:write', 'audit:read', 'reviews:read', 'reviews:write',
    'support:read', 'support:write', 'support:manage', 'chat:read', 'chat:write',
    'ride:read', 'ride:write', 'emergency:read', 'emergency:write',
    'upload:read', 'upload:write', 'drive:read', 'drive:write',
    'profile:read', 'profile:write', 'patients:read', 'patients:write',
    'radiology:read', 'radiology:write', 'radiology:cancel', 'radiology:amend',
  ],
  doctor: [
    'records:read', 'records:write', 'appointments:read', 'appointments:write',
    'prescriptions:write', 'patients:read', 'lab:order', 'lab:read',
    'radiology:read', 'radiology:order', 'chat:read', 'chat:write', 'profile:read', 'profile:write',
    'notifications:read', 'upload:write', 'drive:write',
  ],
  clinic_doctor: [
    'records:read', 'records:write', 'appointments:read', 'appointments:write',
    'prescriptions:write', 'patients:read', 'chat:read', 'chat:write',
    'profile:read', 'profile:write', 'notifications:read', 'upload:write',
  ],
  counsellor: ['records:read', 'appointments:read', 'patients:read', 'chat:read', 'chat:write'],
  psychiatrist: ['records:read', 'records:write', 'appointments:read', 'patients:read', 'chat:read', 'chat:write'],
  nurse: ['records:read', 'vitals:write', 'patients:read', 'beds:read', 'notifications:read', 'nursing:read'],
  lab_owner: ['lab:manage', 'lab:read', 'lab:book', 'lab:verify', 'reports:read'],
  lab_receptionist: ['lab:read', 'lab:book', 'notifications:read'],
  lab_technician: ['lab:read', 'lab:enter_result', 'notifications:read'],
  pathologist: ['lab:read', 'lab:verify', 'notifications:read'],
  // ── PATHOLOGY/LAB §9 department roles ──────────────────────────────────
  // New lab:* strings introduced by the lab routes: lab:cancel (order voiding),
  // lab:receive (sample intake), lab:assign (worklist + reference-lab handoff),
  // lab:finalize (release), lab:correct (report amendment), lab:visit
  // (home-collection visit workflow). Every one is held by at least one
  // non-superadmin role (scripts/checkPermissionMatrix.mjs enforces this).
  // Section technicians carry the SAME entry-level set as lab_technician —
  // which section you work in is routing metadata, not an access level.
  lab_supervisor: [
    'lab:manage', 'lab:read', 'lab:book', 'lab:enter_result', 'lab:verify',
    'lab:cancel', 'lab:receive', 'lab:assign', 'lab:finalize', 'lab:correct',
    'lab:visit', 'lab:print', 'reports:read', 'notifications:read',
  ],
  lab_receiving: ['lab:read', 'lab:book', 'lab:receive', 'lab:assign', 'lab:print', 'notifications:read'],
  biochem_tech: ['lab:read', 'lab:enter_result', 'notifications:read'],
  hematology_tech: ['lab:read', 'lab:enter_result', 'notifications:read'],
  clinical_pathology_tech: ['lab:read', 'lab:enter_result', 'notifications:read'],
  microbiology_tech: ['lab:read', 'lab:enter_result', 'notifications:read'],
  histopathology_tech: ['lab:read', 'lab:enter_result', 'notifications:read'],
  cytology_tech: ['lab:read', 'lab:enter_result', 'notifications:read'],
  serology_tech: ['lab:read', 'lab:enter_result', 'notifications:read'],
  molecular_tech: ['lab:read', 'lab:enter_result', 'notifications:read'],
  report_coordinator: [
    'lab:read', 'lab:finalize', 'lab:correct', 'lab:print', 'lab:export',
    'notifications:read',
  ],
  home_collection_staff: ['lab:read', 'lab:book', 'lab:visit', 'notifications:read'],
  // IT admin touches equipment/analytics configuration — no PHI, no lab writes.
  it_admin: [
    'equipment:read', 'reports:read', 'staff:view', 'notifications:read',
    'profile:read:own', 'profile:write:own',
  ],
  lab_admin: [
    'lab:manage', 'lab:read', 'lab:book', 'lab:verify', 'reports:read',
    'lab:cancel', 'lab:receive', 'lab:assign', 'lab:finalize', 'lab:correct',
    'inventory:read', 'inventory:manage', 'billing:read', 'notifications:read',
  ],
  lab_manager: [
    'lab:manage', 'lab:read', 'lab:book', 'lab:verify', 'reports:read',
    'lab:cancel', 'lab:receive', 'lab:assign', 'lab:finalize', 'lab:correct',
    'inventory:read', 'inventory:manage', 'billing:read', 'notifications:read',
  ],
  lab_quality_mgr: [
    'lab:read', 'reports:read', 'audit:read', 'notifications:read',
    'operations:read', 'quality:read',
  ],
  analyzer_staff: [
    'lab:read', 'lab:enter_result', 'equipment:read', 'notifications:read',
  ],
  lab_inventory_mgr: [
    'inventory:read', 'inventory:manage', 'lab:read', 'notifications:read',
  ],
  pharmacy_owner: ['pharmacy:manage', 'pharmacy:read', 'pharmacy:dispense', 'inventory:manage', 'notifications:read'],
  pharmacist: ['pharmacy:read', 'pharmacy:dispense', 'notifications:read'],
  // §36: radiologists sign/amend reports (radiology:amend on the report
  // route) and read the MIS surface (reports:read) for TAT/workload review.
  radiologist: ['radiology:read', 'radiology:write', 'radiology:amend', 'lab:read', 'reports:read', 'notifications:read'],
  // ── File 28 §36/§37 radiology (RIS) department roles ───────────────────
  // Every string is enforced by a radiology.js authorize() call site:
  // radiology:read (queues/worklists/dose audit/PACS), radiology:write
  // (schedule/start/complete/report/prep/appointments), radiology:cancel
  // (order cancellation + refund flag — hospital_admin + manager only),
  // equipment:read (modality asset metadata), reports:read (MIS).
  radiology_manager: [
    'radiology:read', 'radiology:write', 'radiology:cancel',
    'equipment:read', 'reports:read', 'notifications:read',
  ],
  radiology_scheduler: ['radiology:read', 'radiology:write', 'notifications:read'],
  radiology_prep_staff: ['radiology:read', 'radiology:write', 'notifications:read'],
  // Modality technicians share the entry-level imaging set (same shape as
  // technician/radiologist write access); which machine you run is routing
  // metadata, not an access level.
  mri_technician: ['radiology:read', 'radiology:write', 'notifications:read'],
  xray_technician: ['radiology:read', 'radiology:write', 'notifications:read'],
  ct_technician: ['radiology:read', 'radiology:write', 'notifications:read'],
  us_technician: ['radiology:read', 'radiology:write', 'notifications:read'],
  mammo_technician: ['radiology:read', 'radiology:write', 'notifications:read'],
  // Reporting assistant: read worklists + MIS, never signs a report.
  reporting_assistant: ['radiology:read', 'reports:read', 'notifications:read'],
  // PACS admin: connectivity/worklist/viewer + equipment metadata. No report
  // writes and no PHI-class records:read (BreakGlass covers anything more).
  pacs_admin: ['radiology:read', 'equipment:read', 'notifications:read'],
  radiology_admin: [
    'radiology:read', 'radiology:write', 'radiology:cancel',
    'equipment:read', 'equipment:manage', 'reports:read', 'billing:read', 'notifications:read',
  ],
  radiology_receptionist: [
    'radiology:read', 'radiology:write', 'patients:read', 'patients:write',
    'billing:read', 'billing:write', 'notifications:read',
  ],
  radiology_billing_executive: [
    'billing:read', 'billing:write', 'radiology:read', 'notifications:read',
  ],
  equipment_manager: [
    'equipment:read', 'equipment:manage', 'inventory:read', 'notifications:read',
  ],
  dietitian: ['diet:read', 'diet:write'],
  physiotherapist: ['physio:read', 'physio:write'],
  accountant: ['billing:read', 'commission:read', 'reports:read', 'notifications:read'],
  security: ['audit:read', 'security:read', 'security:manage'],
  technician: ['beds:read', 'equipment:read', 'radiology:read'],
  helper: [],
  delivery_boy: ['delivery:read', 'delivery:write', 'chat:read', 'chat:write'],
  rider: ['ride:read', 'ride:write', 'chat:read', 'chat:write', 'notifications:read', 'wallet:withdraw'],
  assistant: ['assistant:read', 'assistant:write', 'chat:read', 'chat:write', 'legal:read', 'wallet:withdraw'],
  lawyer: [
    'legal:read', 'legal:write', 'billing:read', 'chat:read', 'chat:write',
    'profile:read', 'profile:write', 'notifications:read', 'upload:write',
    'wallet:withdraw',
  ],
  ambulance: ['ambulance:read', 'ambulance:write', 'ride:read', 'ride:write'],
  // Self-service: every grant is `:own`-scoped, so the handler must still
  // resolve the document against req.user._id.
  patient: [
    'records:read:own', 'records:write:own',
    'appointments:read:own', 'appointments:write:own',
    'prescriptions:read:own', 'pharmacy:read:own', 'pharmacy:order:own',
    'lab:read:own', 'lab:book:own', 'billing:read:own', 'billing:write:own',
    // §36: patients read their own imaging orders/reports (the GET
    // /radiology/orders handler already scopes role=patient by patientId).
    'radiology:read:own',
    'support:read:own', 'profile:read:own',
    'profile:write:own', 'loyalty:read:own', 'loyalty:write:own',
    'chat:read:own', 'chat:write:own', 'legal:read:own', 'legal:write:own',
    'legal:book', 'reviews:write:own', 'insurance:read:own', 'insurance:write:own',
    'ride:read:own', 'ride:write:own', 'emergency:read:own', 'emergency:write:own',
    'notifications:read:own', 'notifications:write:own', 'upload:read:own',
    'upload:write:own', 'drive:read:own', 'drive:write:own', 'support:write:own',
    'staff:read:own', 'patients:read:own', 'mentor:read:own',
  ],
  // ── 7.md 3 specialty-vertical roles ──────────────────────────────────────
  // Least-privilege notes (every string below is enforced by at least one
  // authorize() call site — no invented permissions):
  // - dentist starts from the clinic_doctor baseline (same clinical surface:
  //   records, prescriptions, bookings, own profile) plus radiology:read for
  //   OPG/RVG imaging. Tenant scoping is unchanged (same handlers).
  // - *_admin (clinic/blood/dialysis/fertility/maternity/rehab) manage their
  //   facility's bookings, billing and roster — never platform-wide queues,
  //   so they stay OUT of MANDATORY_TWO_FACTOR_ROLES like hospital_admin.
  // - vendors/organizers/instructors get the booking+chat+profile surface
  //   their storefronts run on; equipment/product catalog WRITES have no
  //   guards yet, so inventory:manage (the one enforced commerce string) is
  //   the ceiling until those routes grow their own checks.
  // - patients:read appears only where an existing clinical role already
  //   carries it (nurse/counsellor parity), even though no route enforces it
  //   yet — forward-looking, same as diet:read/physio:read.
  dentist: [
    'records:read', 'records:write', 'appointments:read', 'appointments:write',
    'prescriptions:write', 'patients:read', 'chat:read', 'chat:write',
    'profile:read', 'profile:write', 'notifications:read', 'upload:write',
    'radiology:read', 'radiology:order',
  ],
  dental_clinic_admin: [
    'appointments:read', 'appointments:write', 'patients:read', 'billing:read',
    'staff:manage', 'reports:read', 'notifications:read', 'chat:read', 'chat:write',
    // 7.md:3.1 dental module: clinic admins co-manage clinical documentation
    // (charts/plans/lab-work) inside OWNED facilities. The permission only
    // unlocks the door — every dental route additionally proves provider
    // ownership via authorizeObject, so this grants nothing cross-tenant.
    'records:read', 'records:write',
  ],
  optician: [
    'appointments:read', 'appointments:write', 'profile:read:own', 'profile:write:own',
    'chat:read', 'chat:write', 'notifications:read',
  ],
  optical_shop_owner: [
    'appointments:read', 'appointments:write', 'profile:read:own', 'profile:write:own',
    'inventory:manage', 'billing:read', 'chat:read', 'chat:write', 'notifications:read',
  ],
  phlebotomist: ['lab:read', 'lab:book', 'notifications:read'],
  home_nursing_admin: [
    'appointments:read', 'appointments:write', 'patients:read',
    'chat:read', 'chat:write', 'notifications:read',
  ],
  yoga_instructor: [
    'appointments:read', 'appointments:write', 'profile:read:own', 'profile:write:own',
    'chat:read', 'chat:write', 'notifications:read',
  ],
  yoga_studio_admin: [
    'appointments:read', 'appointments:write', 'profile:read:own', 'profile:write:own',
    'billing:read', 'reports:read', 'chat:read', 'chat:write', 'notifications:read',
  ],
  gym_owner: [
    'appointments:read', 'appointments:write', 'profile:read:own', 'profile:write:own',
    'billing:read', 'reports:read', 'chat:read', 'chat:write', 'notifications:read',
  ],
  trainer: [
    'appointments:read', 'appointments:write', 'profile:read:own', 'profile:write:own',
    'chat:read', 'chat:write', 'notifications:read',
  ],
  wellness_admin: [
    'appointments:read', 'appointments:write', 'profile:read:own', 'profile:write:own',
    'billing:read', 'reports:read', 'chat:read', 'chat:write', 'notifications:read',
  ],
  therapist: [
    'appointments:read', 'appointments:write', 'profile:read:own', 'profile:write:own',
    'chat:read', 'chat:write', 'notifications:read',
  ],
  equipment_vendor: [
    'inventory:manage', 'billing:read', 'profile:read:own', 'profile:write:own',
    'chat:read', 'chat:write', 'notifications:read',
  ],
  product_vendor: [
    'inventory:manage', 'billing:read', 'profile:read:own', 'profile:write:own',
    'chat:read', 'chat:write', 'notifications:read',
  ],
  event_organizer: [
    'appointments:read', 'appointments:write', 'profile:read:own', 'profile:write:own',
    'chat:read', 'chat:write', 'notifications:read',
  ],
  ngo_admin: [
    'appointments:read', 'appointments:write', 'profile:read:own', 'profile:write:own',
    'reports:read', 'chat:read', 'chat:write', 'notifications:read',
  ],
  group_host: [
    'appointments:read', 'appointments:write', 'profile:read:own', 'profile:write:own',
    'chat:read', 'chat:write', 'notifications:read',
  ],
  trainer_org: [
    'appointments:read', 'appointments:write', 'profile:read:own', 'profile:write:own',
    'billing:read', 'reports:read', 'chat:read', 'chat:write', 'notifications:read',
  ],
  blood_bank_admin: [
    'appointments:read', 'appointments:write', 'patients:read', 'billing:read',
    'staff:manage', 'reports:read', 'notifications:read', 'chat:read', 'chat:write',
  ],
  dialysis_admin: [
    'appointments:read', 'appointments:write', 'patients:read', 'billing:read',
    'staff:manage', 'reports:read', 'notifications:read', 'chat:read', 'chat:write',
  ],
  fertility_admin: [
    'appointments:read', 'appointments:write', 'patients:read', 'billing:read',
    'staff:manage', 'reports:read', 'notifications:read', 'chat:read', 'chat:write',
  ],
  maternity_admin: [
    'appointments:read', 'appointments:write', 'patients:read', 'billing:read',
    'staff:manage', 'reports:read', 'notifications:read', 'chat:read', 'chat:write',
  ],
  rehab_admin: [
    'appointments:read', 'appointments:write', 'patients:read', 'billing:read',
    'staff:manage', 'reports:read', 'notifications:read', 'chat:read', 'chat:write',
  ],
  govt_facility_staff: [
    'appointments:read', 'patients:read', 'chat:read', 'chat:write', 'notifications:read',
  ],
  tpa_agent: [
    'insurance:read', 'insurance:write', 'billing:read',
    'chat:read', 'chat:write', 'notifications:read',
  ],
  medical_reviewer: ['content:read', 'content:write', 'notifications:read'],
  // ── File 07 §3.25 to §3.30 specialty vertical roles ───────────────────────
  // nursing:read is the non-PHI grant that lets elder_care_admin open its own
  // resident roster: GET /eldercare/residents is authorize('records:read',
  // 'nursing:read'), and records:read is break-glass-classed so it is NOT the
  // intended door for a facility manager.
  elder_care_admin: [
    'appointments:read', 'appointments:write', 'patients:read', 'billing:read',
    'staff:manage', 'reports:read', 'notifications:read', 'chat:read', 'chat:write',
    'nursing:read',
  ],
  vaccination_admin: [
    'appointments:read', 'appointments:write', 'patients:read', 'billing:read',
    'inventory:manage', 'reports:read', 'notifications:read', 'chat:read', 'chat:write',
  ],
  diet_kitchen_admin: [
    'appointments:read', 'appointments:write', 'inventory:manage', 'billing:read',
    'reports:read', 'notifications:read', 'chat:read', 'chat:write',
  ],
  corporate_admin: [
    'appointments:read', 'appointments:write', 'billing:read', 'reports:read',
    'notifications:read', 'chat:read', 'chat:write',
  ],
  child_dev_admin: [
    'appointments:read', 'appointments:write', 'patients:read', 'billing:read',
    'staff:manage', 'reports:read', 'notifications:read', 'chat:read', 'chat:write',
  ],
  specialty_centre_admin: [
    'appointments:read', 'appointments:write', 'patients:read', 'billing:read',
    'staff:manage', 'reports:read', 'notifications:read', 'chat:read', 'chat:write',
  ],
  // ── File 23 §2 scoped platform roles (god-mode split) ───────────────────
  // None carries clinical PHI permissions (records:read, patients:read,
  // mentalhealth/chat reads). PHI reads go through BreakGlassGrant even for
  // these roles; `breakglass:write` = request, `breakglass:approve` = decide
  // (a different person; two approvers for mental-health/legal subjects).
  // Platform config (categories/cities/commission) — no PHI, no secrets.
  platform_admin: [
    'categories:read', 'categories:write',
    'cities:read', 'cities:write', 'service-cities:read', 'service-cities:write',
    'commission:read', 'content:read', 'notifications:read',
    'crm:read', 'crm:write',
  ],
  // Support L1: masked metadata only (booking/order status, timelines).
  support_l1: ['support:read', 'support:write', 'notifications:read'],
  // Support L2: disputes + consent-scoped sessions + request break-glass.
  support_l2: [
    'support:read', 'support:write', 'support:manage',
    'chat:read', 'chat:write', 'notifications:read',
    'breakglass:read', 'breakglass:write',
  ],
  // DPO: privacy queue + break-glass review. No clinical reads by default.
  dpo: [
    'audit:read', 'dsr:read', 'dsr:approve', 'licenses:read',
    'breakglass:read', 'breakglass:approve', 'notifications:read',
  ],
  // Security admin: sessions, alerts, access reviews. No clinical data.
  security_admin: ['audit:read', 'breakglass:read', 'notifications:read'],
  // Clinical safety: incidents + crisis; reads via break-glass only.
  clinical_safety: [
    'support:read', 'chat:read', 'notifications:read',
    'breakglass:read', 'breakglass:write',
  ],
  // Analyst: aggregated product metrics only (k-anonymous dashboards).
  analyst: ['reports:read', 'notifications:read', 'crm:read'],
  // Auditor: read-only audit + configs.
  auditor: ['audit:read'],
  // ── File 09 §8.2 front-desk ──────────────────────────────────────────
  // Registration + tokens + OPD counter billing. Demographics read (search)
  // scoped by tenant handlers; clinical modules stay unreachable.
  receptionist: [
    'appointments:read', 'appointments:write', 'patients:read',
    'billing:read', 'billing:write', 'chat:read', 'chat:write',
    'notifications:read', 'profile:read:own', 'profile:write:own', 'staff:view',
  ],
  // ── Doc 12 §3 clinic org (tenant-scoped clinic staff) ────────────────
  clinic_admin: [
    'appointments:read', 'appointments:write', 'patients:read',
    'records:read', 'billing:read', 'billing:write', 'staff:manage', 'staff:view',
    'inventory:manage', 'chat:read', 'chat:write', 'notifications:read',
    'profile:read:own', 'profile:write:own',
  ],
  clinic_receptionist: [
    'appointments:read', 'appointments:write', 'patients:read',
    'billing:read', 'billing:write', 'chat:read', 'chat:write',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  clinic_nurse: [
    'appointments:read', 'patients:read', 'records:read', 'vitals:write',
    'chat:read', 'chat:write', 'notifications:read',
    'profile:read:own', 'profile:write:own',
  ],
  clinic_accountant: [
    'billing:read', 'billing:write', 'commission:read', 'reports:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  clinic_pharmacist: [
    'pharmacy:read', 'pharmacy:dispense', 'inventory:manage',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  // Doc 12 §3 additions: counter, branch and telemed roles of the clinic org
  // (mirrors cashier / hospital ops manager / receptionist, tenant-scoped).
  clinic_cashier: [
    'billing:read', 'billing:write', 'patients:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  clinic_branch_manager: [
    'appointments:read', 'appointments:write', 'patients:read',
    'staff:manage', 'staff:view', 'billing:read', 'inventory:manage',
    'reports:read', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  clinic_telemed_coordinator: [
    'appointments:read', 'appointments:write', 'patients:read', 'records:read',
    'chat:read', 'chat:write', 'notifications:read',
    'profile:read:own', 'profile:write:own',
  ],
  clinic_lab_tech: [
    'lab:read', 'lab:enter_result', 'lab:book', 'patients:read',
    'appointments:read', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  clinic_radiology_tech: [
    'radiology:read', 'radiology:write', 'patients:read',
    'appointments:read', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  clinic_inventory_mgr: [
    'inventory:read', 'inventory:manage', 'pharmacy:read', 'pharmacy:manage',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  clinic_purchase_officer: [
    'inventory:read', 'inventory:manage', 'billing:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  clinic_hr_admin: [
    'staff:view', 'staff:manage', 'admin:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  clinic_home_collection: [
    'lab:read', 'lab:book', 'patients:read', 'appointments:read', 'ride:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  clinic_telemed_coord: [
    'appointments:read', 'appointments:write', 'patients:read', 'records:read',
    'chat:read', 'chat:write', 'notifications:read',
    'profile:read:own', 'profile:write:own',
  ],
  clinic_crm_staff: [
    'patients:read', 'appointments:read', 'appointments:write', 'reviews:read',
    'crm:read', 'crm:write', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  clinic_quality_mgr: [
    'audit:read', 'reviews:read', 'operations:read', 'reports:read',
    'admin:read', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  clinic_patient_portal: [
    'appointments:read:own', 'appointments:write:own', 'records:read:own',
    'billing:read:own', 'profile:read:own', 'profile:write:own',
    'chat:read', 'chat:write', 'notifications:read:own', 'notifications:write:own',
  ],
  clinic_owner_analytics: [
    'reports:read', 'billing:read', 'analytics:read', 'clinic:manage',
    'admin:read', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  // ── File 22 P0-8 (docs2/08 §8.2/§8.3): hospital operations roles ─────────
  // Every string below is already enforced by an authorize() call site —
  // module writes that stay adminOnly (OT/housekeeping/diet) are deliberately
  // NOT granted here; those roles read their modules until the routes grow
  // role-aware writes.
  front_desk: [
    'appointments:read', 'appointments:write', 'patients:read',
    'billing:read', 'billing:write', 'chat:read', 'chat:write',
    'notifications:read', 'profile:read:own', 'profile:write:own', 'staff:view',
  ],
  billing_executive: [
    'billing:read', 'billing:write', 'patients:read', 'appointments:read',
    'insurance:read', 'reports:read', 'chat:read', 'chat:write',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  cashier: [
    'billing:read', 'billing:write', 'patients:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  insurance_desk: [
    'insurance:read', 'insurance:write', 'billing:read', 'patients:read',
    'chat:read', 'chat:write', 'notifications:read',
    'profile:read:own', 'profile:write:own',
  ],
  medical_director: [
    'records:read', 'reports:read', 'audit:read', 'appointments:read',
    'patients:read', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  cmo: [
    'records:read', 'reports:read', 'audit:read', 'appointments:read',
    'patients:read', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  nursing_supervisor: [
    'records:read', 'vitals:write', 'patients:read', 'beds:read',
    'staff:manage', 'staff:view', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  matron: [
    'records:read', 'vitals:write', 'patients:read', 'beds:read',
    'staff:manage', 'staff:view', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  ward_nurse: [
    'records:read', 'vitals:write', 'patients:read', 'beds:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  icu_nurse: [
    'records:read', 'vitals:write', 'patients:read', 'beds:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  ot_nurse: [
    'records:read', 'vitals:write', 'patients:read', 'beds:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  infection_control_nurse: [
    'records:read', 'patients:read', 'reports:read', 'staff:view',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  surgeon: [
    'records:read', 'records:write', 'appointments:read', 'appointments:write',
    'prescriptions:write', 'patients:read', 'radiology:read', 'radiology:order',
    'chat:read', 'chat:write', 'profile:read', 'profile:write',
    'notifications:read', 'upload:write',
  ],
  anaesthetist: [
    'records:read', 'records:write', 'appointments:read', 'patients:read',
    'chat:read', 'chat:write', 'profile:read', 'profile:write',
    'notifications:read', 'upload:write',
  ],
  ot_technician: [
    'beds:read', 'equipment:read', 'records:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  // CSSD sets/cycles run on inventory:manage (cssd.js) — same string the
  // pharmacist carries; sterilisation writes stay inside that gate.
  cssd_technician: [
    'inventory:manage', 'equipment:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  store_keeper: [
    'inventory:manage', 'inventory:read', 'reports:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  purchase_officer: [
    'inventory:manage', 'inventory:read', 'reports:read', 'billing:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  hr_manager: [
    'staff:manage', 'staff:view', 'reports:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  biomedical_engineer: [
    'equipment:read', 'beds:read', 'inventory:read', 'operations:read', 'operations:write',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  maintenance: [
    'equipment:read', 'beds:read', 'operations:read', 'operations:write',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  housekeeping_supervisor: [
    'beds:read', 'housekeeping:manage', 'operations:read', 'operations:write',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  ward_boy: [
    'beds:read', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  dietician_head: [
    'diet:read', 'diet:write', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  kitchen_staff: [
    'diet:read', 'diet:write', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  mortuary_attendant: [
    'patients:read', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  medical_records_officer: [
    'records:read', 'patients:read', 'reports:read', 'dsr:read', 'staff:view',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  quality_officer: [
    'audit:read', 'reports:read', 'records:read', 'staff:view',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  pharmacovigilance_officer: [
    'pharmacy:read', 'records:read', 'patients:read', 'reports:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  call_center_agent: [
    'appointments:read', 'appointments:write', 'patients:read',
    'chat:read', 'chat:write', 'notifications:read', 'staff:view',
    'profile:read:own', 'profile:write:own',
  ],
  // HMS Blueprint 6-layer operational roles
  hospital_owner: [
    'reports:read', 'billing:read', 'operations:read', 'staff:manage', 'staff:view',
    'patients:read', 'appointments:read', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  medical_superintendent: [
    'clinical:manage', 'records:read', 'quality:manage', 'reports:read', 'staff:view',
    'patients:read', 'appointments:read', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  hod: [
    'clinical:manage', 'appointments:read', 'appointments:write', 'staff:read', 'staff:view',
    'reports:read', 'records:read', 'patients:read', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  resident_doctor: [
    'records:write', 'records:read', 'orders:write', 'vitals:read', 'vitals:write',
    'consultation:write', 'prescriptions:write', 'appointments:read', 'patients:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  emergency: [
    'emergency:manage', 'clinical:write', 'records:write', 'records:read', 'admissions:write',
    'vitals:read', 'vitals:write', 'patients:read', 'patients:create', 'notifications:read',
    'profile:read:own', 'profile:write:own',
  ],
  icu_doctor: [
    'icu:manage', 'clinical:write', 'records:write', 'records:read', 'orders:write',
    'vitals:read', 'vitals:write', 'patients:read', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  ot_coordinator: [
    'ot:manage', 'operations:manage', 'operations:read', 'records:read', 'staff:read', 'staff:view',
    'patients:read', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  radiology_technician: [
    'radiology:write', 'radiology:read', 'operations:read', 'patients:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  opd_coordinator: [
    'appointments:manage', 'appointments:read', 'appointments:write', 'staff:read', 'staff:view',
    'operations:read', 'patients:read', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  admission_coordinator: [
    'admissions:manage', 'beds:read', 'beds:manage', 'insurance:read', 'billing:create', 'billing:read',
    'patients:read', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  bed_manager: [
    'beds:manage', 'beds:read', 'housekeeping:read', 'reports:read', 'operations:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  facility_manager: [
    'maintenance:manage', 'operations:read', 'operations:manage',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  patient_relations: [
    'support:manage', 'operations:read', 'patients:read', 'chat:read', 'chat:write',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  discharge_coordinator: [
    'discharges:manage', 'operations:read', 'billing:read', 'records:read', 'patients:read',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  mis_reporting: [
    'reports:read', 'billing:read', 'operations:read', 'clinical:read', 'records:read', 'staff:view',
    'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
  doctor_portal: [
    'consultation:write', 'records:read', 'records:write', 'prescriptions:write', 'appointments:read',
    'patients:read', 'notifications:read', 'profile:read:own', 'profile:write:own',
  ],
};

export function roleHasPermission(role, permission) {
  // AUTHZ-B-05: resolve aliases and role families first, so a `counselor`
  // account is judged by the `counsellor` permission set rather than silently
  // denied everything because the enum accepted a second spelling.
  const canonical = canonicalRole(role);
  const perms = ROLE_PERMISSIONS[canonical];
  if (!perms) return false;
  if (perms.includes('*') || perms.includes(permission)) return true;

  // `doctor` and `clinic_doctor` are distinct roles in the product but share a
  // permission family; a permission granted to one is honoured for the other only
  // when it is NOT self-service (`:own`), which must stay role-exact.
  if (!String(permission).endsWith(':own')) {
    const family = ROLE_EQUIVALENTS[canonical] || [];
    return family.some((r) => {
      const p = ROLE_PERMISSIONS[r];
      return Boolean(p) && !p.includes('*') && p.includes(permission);
    });
  }
  return false;
}

// AUTHZ-B-05: fail loudly at boot rather than shipping a role that denies
// everything (or, worse, that an operator later "fixes" by granting `*`).
assertRoleMatrixComplete(ROLE_PERMISSIONS);
