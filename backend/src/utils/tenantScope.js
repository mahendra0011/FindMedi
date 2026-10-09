/**
 * Tenant-scope resolution (AUTHZ-B-07).
 *
 * The codebase used to hand-roll `if (req.user.hospitalId && role !== 'superadmin')
 * filter.hospitalId = ...` everywhere. That guard silently collapses to "no
 * filter" whenever the caller has no hospitalId (a self-registered hospital_admin,
 * a rider, an assistant, a doctor without a hospital link, lab/pharmacy staff
 * without a facility) — i.e. a platform-wide read for anyone holding the role.
 *
 * These helpers make the three cases explicit:
 *   - superadmin            → no tenant predicate (sees everything, by design)
 *   - tenant staff          → MUST have a tenant, otherwise 403
 *   - non-tenant accounts   → only rows that belong to no tenant at all
 */
export const TENANT_STAFF_ROLES = [
  'hospital_admin', 'admin', 'superadmin',
  'doctor', 'clinic_doctor', 'counsellor', 'psychiatrist', 'nurse',
  'lab_owner', 'lab_receptionist', 'lab_technician', 'pathologist', 'radiologist',
  'pharmacy_owner', 'pharmacist', 'pharmacy_staff',
  'accountant', 'receptionist', 'helper', 'technician', 'security',
  'dietitian', 'physiotherapist', 'lab_receptionist',
  // 7.md 3: facility-inside roles get tenant treatment (their hospitalId /
  // facilityId scopes them). Marketplace roles (vendors, instructors,
  // organizers, hosts, reviewers) stay OUT — they carry no tenant scope and
  // must fail closed, not inherit a facility they were never assigned.
  'dentist', 'dental_clinic_admin', 'optician', 'optical_shop_owner',
  'phlebotomist', 'home_nursing_admin', 'tpa_agent',
  'blood_bank_admin', 'dialysis_admin', 'fertility_admin', 'maternity_admin',
  'rehab_admin', 'govt_facility_staff',
  // Doc 12 §3: clinic org staff work inside their clinic tenant.
  'clinic_admin', 'clinic_receptionist', 'clinic_nurse',
  'clinic_accountant', 'clinic_pharmacist',
];

export const isTenantStaff = (user) => TENANT_STAFF_ROLES.includes(user?.role);

/**
 * @returns {{ isSuperadmin: boolean, hospitalId: string|null, facilityId: string|null }}
 */
export const resolveTenantScope = (user) => {
  if (!user) return { isSuperadmin: false, hospitalId: null, facilityId: null };
  if (user.role === 'superadmin') return { isSuperadmin: true, hospitalId: null, facilityId: null };
  const hospitalId = user.hospitalId ? String(user.hospitalId) : null;
  const facilityId = user.facilityId ? String(user.facilityId) : hospitalId;
  return { isSuperadmin: false, hospitalId, facilityId };
};

/**
 * Apply the tenant predicate to a list filter.
 *
 * @param {object} req        express request (needs req.user)
 * @param {object} filter     the Mongo filter being built (mutated)
 * @param {object} [opts]
 * @param {string[]} [opts.fields] fields to scope (default: ['facilityId'])
 * @param {boolean} [opts.allowSharedRowsForNonStaff=true] non-tenant accounts see
 *        only rows that belong to no tenant (public catalogue-style data)
 * @returns {{ ok: true } | { ok: false, message: string }}  — caller answers 403
 */
export const applyTenantScope = (req, filter, opts = {}) => {
  const { fields = ['facilityId'], allowSharedRowsForNonStaff = true } = opts;
  const scope = resolveTenantScope(req.user);
  if (scope.isSuperadmin) return { ok: true };

  if (isTenantStaff(req.user)) {
    if (!scope.facilityId) {
      return { ok: false, message: 'No hospital/facility linked to this account' };
    }
    for (const field of fields) {
      filter[field] = field === 'hospitalId' ? scope.hospitalId : scope.facilityId;
    }
    return { ok: true };
  }

  if (allowSharedRowsForNonStaff) {
    // `$in: [null]` matches both explicit null and missing → "belongs to no tenant".
    for (const field of fields) {
      filter[field] = { $in: [null] };
    }
    return { ok: true };
  }

  return { ok: false, message: 'Not authorized for this tenant data' };
};

/**
 * Object-level check: may `user` act on a document that carries `docScopeField(s)`?
 * Fails CLOSED when either side is missing a tenant.
 */
export const callerOwnsTenant = (user, doc, fields = ['hospitalId']) => {
  if (!user || !doc) return false;
  if (user.role === 'superadmin') return true;
  for (const field of fields) {
    const userScope = field === 'hospitalId' ? user.hospitalId : (user.facilityId || user.hospitalId);
    const docScope = doc[field];
    if (!userScope || !docScope) return false;
    if (String(userScope) !== String(docScope)) return false;
  }
  return true;
};