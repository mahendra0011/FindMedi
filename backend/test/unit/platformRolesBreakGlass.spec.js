/**
 * File 23 (god-mode split) + file 24 (CRM) — auth-surface regression net.
 *
 * Pins: matrix completeness with the 8 scoped platform roles; enum/login-hint
 * agreement; mandatory 2FA for all platform-wide ops roles; NO clinical PHI
 * permissions on scoped roles; break-glass permission holders; CRM model
 * enums (Lead stages, Partner stages).
 */
import { describe, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import {
  CANONICAL_ROLES, MANDATORY_TWO_FACTOR_ROLES, ROLE_PERMISSIONS, roleHasPermission,
  assertRoleMatrixComplete,
} from '../../src/config/permissions.js';
import { USER_ROLE_OPTIONS } from '../../src/utils/validate.js';

const SCOPED_ROLES = [
  'platform_admin', 'support_l1', 'support_l2', 'dpo',
  'security_admin', 'clinical_safety', 'analyst', 'auditor',
];
const PHI_PERMS = ['records:read', 'records:write', 'patients:read', 'patients:write'];

const importModel = async (path, name) => {
  const mod = await import(path);
  return mod.default ?? mongoose.model(name);
};
const enumValues = (model, path) => model.schema.path(path).enumValues ?? [];

describe('file 23 scoped platform roles', () => {
  it('keeps the matrix complete with the 8 new roles', () => {
    expect(() => assertRoleMatrixComplete(ROLE_PERMISSIONS)).not.toThrow();
    expect(CANONICAL_ROLES).toEqual(expect.arrayContaining(SCOPED_ROLES));
  });

  it('admits every new role in the User enum and login hint', async () => {
    const User = await importModel('../../src/models/User.js', 'User');
    const modelRoles = enumValues(User, 'role');
    for (const role of SCOPED_ROLES) {
      expect(modelRoles).toContain(role);
      expect(USER_ROLE_OPTIONS).toContain(role);
    }
  });

  it('mandates 2FA for every platform-wide ops role', () => {
    for (const role of SCOPED_ROLES) {
      expect(MANDATORY_TWO_FACTOR_ROLES).toContain(role);
    }
  });

  it('gives scoped roles NO clinical PHI permissions', () => {
    for (const role of SCOPED_ROLES) {
      for (const perm of PHI_PERMS) {
        expect(roleHasPermission(role, perm)).toBe(false);
      }
    }
  });

  it('holds break-glass request/decide on the right roles only', () => {
    expect(roleHasPermission('support_l2', 'breakglass:write')).toBe(true);
    expect(roleHasPermission('clinical_safety', 'breakglass:write')).toBe(true);
    expect(roleHasPermission('dpo', 'breakglass:approve')).toBe(true);
    expect(roleHasPermission('dpo', 'breakglass:read')).toBe(true);
    expect(roleHasPermission('support_l1', 'breakglass:approve')).toBe(false);
    expect(roleHasPermission('analyst', 'breakglass:write')).toBe(false);
    expect(roleHasPermission('auditor', 'breakglass:write')).toBe(false);
  });

  it('keeps support L1 to masked metadata (no manage, no approve)', () => {
    expect(roleHasPermission('support_l1', 'support:manage')).toBe(false);
    expect(roleHasPermission('support_l1', 'support:read')).toBe(true);
  });
});

describe('file 24 CRM models', () => {
  it('pins Lead stages and Partner stages', async () => {
    const Lead = await importModel('../../src/models/Lead.js', 'Lead');
    expect(enumValues(Lead, 'stage')).toEqual(expect.arrayContaining(
      ['identified', 'application_submitted', 'activated', 'at_risk', 'churned'],
    ));
    const Partner = await importModel('../../src/models/Partner.js', 'Partner');
    expect(enumValues(Partner, 'stage')).toEqual(expect.arrayContaining(
      ['identified', 'agreement_signed', 'active', 'lost'],
    ));
  });

  it('bounds break-glass grants (single subject, <= 60 min, view-only)', async () => {
    const BreakGlassGrant = await importModel('../../src/models/BreakGlassGrant.js', 'BreakGlassGrant');
    expect(enumValues(BreakGlassGrant, 'status')).toEqual(
      expect.arrayContaining(['pending', 'approved', 'denied', 'expired', 'revoked']),
    );
    expect(BreakGlassGrant.schema.path('durationMin').options).toMatchObject({ min: 5, max: 60 });
    expect(BreakGlassGrant.schema.path('scope').options.enum).toEqual(['read']);
  });
});
