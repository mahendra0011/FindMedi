// 2.md 9 — staff invitation role templates for an approved provider.
//
// A provider owner does not pick an arbitrary platform role (that would be a
// privilege-escalation checkbox); they pick one of these TEMPLATES, and the
// template carries the role. Each role is a real value from the User role enum
// (utils/validate.js USER_ROLE_OPTIONS), and each is a role that exists
// precisely so a listing's own staff can work its console.
//
// `roleRequiresTwoFactor` mirrors the requirement set in middleware/auth.js
// (`MANDATORY_TWO_FACTOR_ROLES` unioned with the TWO_FACTOR_REQUIRED_ROLES env)
// so the invite/setup responses can tell the client which roles are currently
// 2FA-gated. It is a mirror, not an import, because middleware/auth.js does not
// export that set and pulling it out would touch the auth middleware for a
// read-only answer; validateVocab-style tests keep the mirror honest by
// checking these roles are all in USER_ROLE_OPTIONS.

import { MANDATORY_TWO_FACTOR_ROLES } from '../config/permissions.js';

export const PROVIDER_STAFF_TEMPLATES = {
  provider_admin: {
    role: 'hospital_admin',
    label: 'Provider administrator',
    description: 'Full console access for the listing; 2FA when TWO_FACTOR_REQUIRED_ROLES includes hospital_admin',
  },
  front_desk: {
    role: 'front_desk',
    label: 'Front desk',
    description: 'Check-in, appointments and walk-ins',
  },
  reception: {
    role: 'receptionist',
    label: 'Receptionist',
    description: 'Front-of-house scheduling and phone desk',
  },
  billing: {
    role: 'billing_executive',
    label: 'Billing & counter',
    description: 'Invoices, counter payments, receipts',
  },
  pharmacy: {
    role: 'pharmacist',
    label: 'Pharmacy counter',
    description: 'Dispensing and medicine counter (pharmacy listings)',
  },
  nursing: {
    role: 'nurse',
    label: 'Nursing staff',
    description: 'Clinical support staff on the listing',
  },
};

export const PROVIDER_STAFF_TEMPLATE_KEYS = Object.keys(PROVIDER_STAFF_TEMPLATES);

/** Mirror of the 2FA requirement set in middleware/auth.js (see header). */
export function roleRequiresTwoFactor(role) {
  const normalized = String(role ?? '').toLowerCase();
  if (MANDATORY_TWO_FACTOR_ROLES.includes(normalized)) return true;
  return String(process.env.TWO_FACTOR_REQUIRED_ROLES || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}
