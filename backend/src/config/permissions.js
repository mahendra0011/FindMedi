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
  doctor: ['doctor', 'clinic_doctor'],
  clinic_doctor: ['doctor', 'clinic_doctor'],
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
  ],
  // 7.md 3.21 / 8.md 11: versioned platform content (ToS, privacy, policies).
  content_editor: ['content:read', 'content:write'],
  // 8.md 4: city + service-city launch/pause (delete stays superadmin).
  city_manager: ['cities:read', 'cities:write', 'service-cities:read', 'service-cities:write'],
  hospital_admin: [
    'hospital:manage', 'staff:manage', 'beds:manage', 'departments:manage',
    'records:read', 'records:write', 'billing:read', 'billing:write',
    'pharmacy:manage', 'pharmacy:read', 'pharmacy:dispense',
    'lab:manage', 'lab:read', 'lab:book', 'lab:enter_result', 'lab:verify',
    'reports:read', 'notifications:send', 'notifications:read',
    'appointments:read', 'appointments:write', 'inventory:manage',
    'commission:read', 'loyalty:manage', 'insurance:read', 'insurance:write',
    'legal:read', 'legal:write', 'audit:read', 'reviews:read', 'reviews:write',
    'support:read', 'support:write', 'support:manage', 'chat:read', 'chat:write',
    'ride:read', 'ride:write', 'emergency:read', 'emergency:write',
    'upload:read', 'upload:write', 'drive:read', 'drive:write',
    'profile:read', 'profile:write', 'patients:read', 'patients:write',
  ],
  doctor: [
    'records:read', 'records:write', 'appointments:read', 'appointments:write',
    'prescriptions:write', 'patients:read', 'lab:order', 'lab:read',
    'radiology:read', 'chat:read', 'chat:write', 'profile:read', 'profile:write',
    'notifications:read', 'upload:write', 'drive:write',
  ],
  clinic_doctor: [
    'records:read', 'records:write', 'appointments:read', 'appointments:write',
    'prescriptions:write', 'patients:read', 'chat:read', 'chat:write',
    'profile:read', 'profile:write', 'notifications:read', 'upload:write',
  ],
  counsellor: ['records:read', 'appointments:read', 'patients:read', 'chat:read', 'chat:write'],
  psychiatrist: ['records:read', 'records:write', 'appointments:read', 'patients:read', 'chat:read', 'chat:write'],
  nurse: ['records:read', 'vitals:write', 'patients:read', 'beds:read', 'notifications:read'],
  lab_owner: ['lab:manage', 'lab:read', 'lab:book', 'lab:verify', 'reports:read'],
  lab_receptionist: ['lab:read', 'lab:book', 'notifications:read'],
  lab_technician: ['lab:read', 'lab:enter_result', 'notifications:read'],
  pathologist: ['lab:read', 'lab:verify', 'notifications:read'],
  pharmacy_owner: ['pharmacy:manage', 'pharmacy:read', 'pharmacy:dispense', 'inventory:manage', 'notifications:read'],
  pharmacist: ['pharmacy:read', 'pharmacy:dispense', 'notifications:read'],
  radiologist: ['radiology:read', 'radiology:write', 'lab:read', 'notifications:read'],
  dietitian: ['diet:read', 'diet:write'],
  physiotherapist: ['physio:read', 'physio:write'],
  accountant: ['billing:read', 'commission:read', 'reports:read', 'notifications:read'],
  security: ['audit:read'],
  technician: ['beds:read', 'equipment:read'],
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
    'radiology:read',
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
