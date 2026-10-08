/**
 * File 25 Phase B–E: policy grammar, sensitivity labels, tenant grants,
 * API keys, CRM-adjacent IAM models. Fail-closed pins: wildcard Allow is
 * rejected, restricted labels exist, grants are time-boxed, keys hide hashes.
 */
import { describe, it, expect } from '@jest/globals';
import mongoose from 'mongoose';
import { iamPolicySchema } from '../../src/utils/validate.js';

const importModel = async (path, name) => {
  const mod = await import(path);
  return mod.default ?? mongoose.model(name);
};
const enumValues = (model, path) => model.schema.path(path).enumValues ?? [];

describe('policy grammar (no privilege-escalation by construction)', () => {
  const good = {
    name: 'Ward-3 Nurse',
    statements: [
      { sid: 'V', effect: 'Allow', actions: ['vitals:write'], resources: ['ward/w3/*'], conditions: { shift: 'current' } },
      { sid: 'NoClin', effect: 'Deny', actions: ['records:clinical:*'], resources: ['tenant/self/*'] },
    ],
  };

  it('accepts a least-privilege policy with a Deny wildcard', () => {
    expect(iamPolicySchema.safeParse(good).success).toBe(true);
  });

  it('rejects wildcard Allow, global resources, unknown conditions, >50 statements', () => {
    const allowWild = { ...good, statements: [{ sid: 'X', effect: 'Allow', actions: ['records:*'], resources: ['tenant/self/*'] }] };
    expect(iamPolicySchema.safeParse(allowWild).success).toBe(false);
    const globalRes = { ...good, statements: [{ sid: 'X', effect: 'Allow', actions: ['billing:read'], resources: ['*'] }] };
    expect(iamPolicySchema.safeParse(globalRes).success).toBe(false);
    const badCond = { ...good, statements: [{ sid: 'X', effect: 'Allow', actions: ['billing:read'], resources: ['tenant/self/*'], conditions: { exec: 'x' } }] };
    expect(iamPolicySchema.safeParse(badCond).success).toBe(false);
    const many = { ...good, statements: Array.from({ length: 51 }, (_, i) => ({ sid: `S${i}`, effect: 'Allow', actions: ['billing:read'], resources: ['tenant/self/*'] })) };
    expect(iamPolicySchema.safeParse(many).success).toBe(false);
  });
});

describe('sensitivity + grants + keys models', () => {
  it('labels records standard/sensitive/restricted/vip/minor', async () => {
    const Record = await importModel('../../src/models/Record.js', 'Record');
    expect(enumValues(Record, 'sensitivity')).toEqual(
      expect.arrayContaining(['standard', 'sensitive', 'restricted', 'vip', 'minor']),
    );
  });

  it('bounds tenant grants and access requests', async () => {
    const TenantGrant = await importModel('../../src/models/TenantGrant.js', 'TenantGrant');
    expect(enumValues(TenantGrant, 'status')).toEqual(
      expect.arrayContaining(['pending', 'approved', 'denied', 'expired', 'revoked']),
    );
    expect(enumValues(TenantGrant, 'reasonCode')).toEqual(
      expect.arrayContaining(['emergency_care', 'safety_incident', 'legal_order', 'treatment']),
    );
    const AccessRequest = await importModel('../../src/models/AccessRequest.js', 'AccessRequest');
    expect(enumValues(AccessRequest, 'status')).toEqual(
      expect.arrayContaining(['pending', 'approved', 'denied', 'expired']),
    );
  });

  it('hides API key hashes by default (show-once)', async () => {
    const ApiKey = await importModel('../../src/models/ApiKey.js', 'ApiKey');
    expect(ApiKey.schema.path('hash').options.select).toBe(false);
  });
});
