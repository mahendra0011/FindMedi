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
];

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
