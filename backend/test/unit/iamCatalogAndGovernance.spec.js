/**
 * File 25: Tests for Fine-Grained Action Catalog, Provider Tier Guardrails,
 * Backward-Compatibility Mappings, and Governance / SoD rules.
 */
import { describe, it, expect } from '@jest/globals';
import {
  ACTION_CATALOG,
  SENSITIVITY_CLASSES,
  COARSE_TO_FINE_MAP,
  isActionAllowedForTier,
} from '../../src/lib/iamCatalog.js';

describe('IAM Action Catalog (~120 actions across modules)', () => {
  it('contains over 100 fine-grained actions', () => {
    expect(ACTION_CATALOG.length).toBeGreaterThanOrEqual(100);
  });

  it('covers all sensitivity classes defined in architecture', () => {
    expect(SENSITIVITY_CLASSES).toEqual([
      'standard',
      'sensitive',
      'restricted',
      'financial',
      'hr_sensitive',
      'admin_critical',
    ]);

    const catalogSensitivities = new Set(ACTION_CATALOG.map((a) => a.sensitivity));
    for (const sc of SENSITIVITY_CLASSES) {
      expect(catalogSensitivities.has(sc)).toBe(true);
    }
  });

  it('tags high-risk clinical and statutory actions as restricted or admin_critical', () => {
    const restrictedActions = ACTION_CATALOG.filter((a) => a.sensitivity === 'restricted').map((a) => a.action);
    expect(restrictedActions).toContain('records:restricted:read');
    expect(restrictedActions).toContain('records:clinical:amend');
    expect(restrictedActions).toContain('emergency:access:breakglass');

    const criticalActions = ACTION_CATALOG.filter((a) => a.sensitivity === 'admin_critical').map((a) => a.action);
    expect(criticalActions).toContain('iam:role:create');
    expect(criticalActions).toContain('iam:policy:attach');
    expect(criticalActions).toContain('apikey:manage');
  });

  it('maps legacy coarse permissions to fine-grained action arrays', () => {
    expect(COARSE_TO_FINE_MAP['records:read']).toEqual(
      expect.arrayContaining(['records:summary:read', 'records:clinical:read', 'records:attachments:read'])
    );
    expect(COARSE_TO_FINE_MAP['billing:write']).toEqual(
      expect.arrayContaining(['billing:invoice:write', 'billing:discount:apply'])
    );
    expect(COARSE_TO_FINE_MAP['lab:enter_result']).toEqual(['lab:result:enter']);
  });
});

describe('Platform Guardrails: Provider Tier Boundaries', () => {
  it('allows clinical actions for T1 (Hospitals, Clinics, Doctors)', () => {
    expect(isActionAllowedForTier('T1', 'records:clinical:write')).toBe(true);
    expect(isActionAllowedForTier('T1', 'prescriptions:sign')).toBe(true);
    expect(isActionAllowedForTier('T1', 'vitals:write')).toBe(true);
  });

  it('allows diagnostic & pharmacy actions for T2 (Labs, Diagnostic Centers, Pharmacies)', () => {
    expect(isActionAllowedForTier('T2', 'lab:result:enter')).toBe(true);
    expect(isActionAllowedForTier('T2', 'pharmacy:dispense')).toBe(true);
  });

  it('strictly blocks clinical and diagnostic actions for T3 (Gyms, Wellness, Nutrition stores)', () => {
    // T3 wellness cannot touch EMR, prescriptions, lab results, OT
    expect(isActionAllowedForTier('T3', 'records:clinical:write')).toBe(false);
    expect(isActionAllowedForTier('T3', 'records:restricted:read')).toBe(false);
    expect(isActionAllowedForTier('T3', 'prescriptions:sign')).toBe(false);
    expect(isActionAllowedForTier('T3', 'lab:result:enter')).toBe(false);
    expect(isActionAllowedForTier('T3', 'nursing:chart:write')).toBe(false);

    // T3 can do standard appointments, inventory, and billing
    expect(isActionAllowedForTier('T3', 'appointments:book')).toBe(true);
    expect(isActionAllowedForTier('T3', 'inventory:read')).toBe(true);
    expect(isActionAllowedForTier('T3', 'billing:invoice:read')).toBe(true);
  });
});
