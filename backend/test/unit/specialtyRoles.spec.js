/**
 * 7.md 3 specialty-vertical roles — the auth-surface half of the roles slice.
 *
 * What it pins (change-detector by design: ANY edit to these lists breaks
 * this spec on purpose, forcing the author to re-justify the privilege):
 *  - the matrix is complete (assertRoleMatrixComplete) and every User.role
 *    enum value is canonical (an alias would deny it everything);
 *  - every canonical role is accepted by the login role hint;
 *  - exact permission sets for the new roles — least-privilege regression net
 *    against future creep (a vendor must never gain records:write by accident);
 *  - new facility roles are NOT in MANDATORY_TWO_FACTOR_ROLES (facility scope,
 *    env-driven like hospital_admin — platform-wide ops roles only);
 *  - PractitionerProfile.roleType is exactly the original nine plus the two
 *    spec-grounded additions (ayush_practitioner, phlebotomist);
 *  - TENANT_STAFF_ROLES admits exactly the facility-inside roles (vendors,
 *    instructors, organizers, reviewers stay out and fail closed).
 */
import { describe, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import {
  CANONICAL_ROLES, MANDATORY_TWO_FACTOR_ROLES, ROLE_PERMISSIONS,
  assertRoleMatrixComplete,
} from '../../src/config/permissions.js';
import { USER_ROLE_OPTIONS } from '../../src/utils/validate.js';
import { TENANT_STAFF_ROLES } from '../../src/utils/tenantScope.js';

const importModel = async (path, name) => {
  const mod = await import(path);
  return mod.default ?? mongoose.model(name);
};
const enumValues = (model, path) => model.schema.path(path).enumValues ?? [];

const NEW_ROLES = [
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

describe('7.md 3 specialty roles', () => {
  it('keeps the matrix complete and the enum canonical', () => {
    expect(() => assertRoleMatrixComplete(ROLE_PERMISSIONS)).not.toThrow();
    expect(CANONICAL_ROLES).toEqual(expect.arrayContaining(NEW_ROLES));
  });

  it('admits every User.role spelling (enum, canonical list, login hint agree)', async () => {
    const User = await importModel('../../src/models/User.js', 'User');
    const modelRoles = enumValues(User, 'role');
    // The three counselor aliases are pre-save-migrated to `counsellor` and
    // resolved by canonicalRole() — they are valid rows but not canonical
    // roles, by design (see the User.js enum comment).
    const LEGACY_ALIASES = ['counselor', 'mid_level_counselor', 'senior_counselor'];
    for (const role of modelRoles) {
      if (LEGACY_ALIASES.includes(role)) continue;
      expect(CANONICAL_ROLES).toContain(role);
    }
    for (const role of CANONICAL_ROLES) {
      expect(USER_ROLE_OPTIONS).toContain(role);
    }
  });

  it('pins the new clinical and desk sets exactly', () => {
    expect([...ROLE_PERMISSIONS.dentist].sort()).toEqual([
      'appointments:read', 'appointments:write', 'chat:read', 'chat:write',
      'notifications:read', 'patients:read', 'prescriptions:write',
      'profile:read', 'profile:write', 'radiology:read', 'records:read',
      'records:write', 'upload:write',
    ].sort());
    expect([...ROLE_PERMISSIONS.tpa_agent].sort()).toEqual([
      'billing:read', 'chat:read', 'chat:write', 'insurance:read',
      'insurance:write', 'notifications:read',
    ].sort());
    expect([...ROLE_PERMISSIONS.phlebotomist].sort()).toEqual([
      'lab:book', 'lab:read', 'notifications:read',
    ].sort());
    expect([...ROLE_PERMISSIONS.govt_facility_staff].sort()).toEqual([
      'appointments:read', 'chat:read', 'chat:write', 'notifications:read',
      'patients:read',
    ].sort());
    expect([...ROLE_PERMISSIONS.medical_reviewer].sort()).toEqual([
      'content:read', 'content:write', 'notifications:read',
    ].sort());
  });

  it('pins the vendor and admin sets exactly (no clinical strings)', () => {
    for (const role of ['equipment_vendor', 'product_vendor']) {
      expect(ROLE_PERMISSIONS[role]).toContain('inventory:manage');
      expect(ROLE_PERMISSIONS[role]).not.toContain('records:write');
      expect(ROLE_PERMISSIONS[role]).not.toContain('records:read');
    }
    // dental_clinic_admin additionally carries records:read/write (7.md:3.1
    // co-managed clinical documentation) — effective only through
    // provider-ownership-guarded dental routes, never cross-tenant.
    expect([...ROLE_PERMISSIONS.dental_clinic_admin].sort()).toEqual([
      'appointments:read', 'appointments:write', 'billing:read',
      'chat:read', 'chat:write', 'notifications:read', 'patients:read',
      'records:read', 'records:write', 'reports:read', 'staff:manage',
    ].sort());
    for (const role of ['blood_bank_admin', 'dialysis_admin', 'fertility_admin', 'maternity_admin', 'rehab_admin']) {
      expect([...ROLE_PERMISSIONS[role]].sort()).toEqual([
        'appointments:read', 'appointments:write', 'billing:read',
        'chat:read', 'chat:write', 'notifications:read', 'patients:read',
        'reports:read', 'staff:manage',
      ].sort());
    }
    for (const role of ['yoga_instructor', 'trainer', 'therapist', 'group_host']) {
      expect(ROLE_PERMISSIONS[role]).not.toContain('billing:read');
      expect(ROLE_PERMISSIONS[role]).not.toContain('records:read');
    }
  });

  it('keeps facility roles out of mandatory 2FA (platform-wide ops only)', () => {
    for (const role of NEW_ROLES) {
      expect(MANDATORY_TWO_FACTOR_ROLES).not.toContain(role);
    }
  });

  it('extends PractitionerProfile.roleType by exactly the spec-grounded two', async () => {
    const PractitionerProfile = await importModel('../../src/models/PractitionerProfile.js', 'PractitionerProfile');
    expect(new Set(enumValues(PractitionerProfile, 'roleType'))).toEqual(new Set([
      'doctor', 'dentist', 'physio', 'dietitian', 'nurse', 'counsellor',
      'yoga_teacher', 'trainer', 'lawyer',
      'ayush_practitioner', 'phlebotomist',
    ]));
  });

  it('treats exactly the facility-inside roles as tenant staff', () => {
    for (const role of [
      'dentist', 'dental_clinic_admin', 'optician', 'optical_shop_owner',
      'phlebotomist', 'home_nursing_admin', 'tpa_agent',
      'blood_bank_admin', 'dialysis_admin', 'fertility_admin', 'maternity_admin',
      'rehab_admin', 'govt_facility_staff',
    ]) {
      expect(TENANT_STAFF_ROLES).toContain(role);
    }
    for (const role of [
      'equipment_vendor', 'product_vendor', 'yoga_instructor', 'yoga_studio_admin',
      'gym_owner', 'trainer', 'wellness_admin', 'therapist',
      'event_organizer', 'ngo_admin', 'group_host', 'trainer_org', 'medical_reviewer',
    ]) {
      expect(TENANT_STAFF_ROLES).not.toContain(role);
    }
  });
});
