import { guardrailsAllow } from '../../src/lib/iamEvaluator.js';

describe('clinical safety', () => {
  it('T3 providers cannot access clinical actions (PHI isolation)', () => {
    for (const kind of ['wellness', 'commerce', 'community']) {
      for (const action of ['records:read', 'prescriptions:write', 'patients:read']) {
        expect(guardrailsAllow({ tenantKind: kind, isOwner: true }, action).ok).toBe(false);
      }
    }
  });

  it('sensitive categories are flagged in taxonomy', async () => {
    const { SENSITIVE_CATEGORY_CODES } = await import('../../src/lib/sensitiveCategories.js');
    expect(Array.isArray(SENSITIVE_CATEGORY_CODES)).toBe(true);
    expect(SENSITIVE_CATEGORY_CODES.length).toBeGreaterThan(0);
  });

  it('prescription schedule enum includes controlled schedules', async () => {
    const { default: Medicine } = await import('../../src/models/Medicine.js');
    const path = Medicine.schema.path('rxSchedule');
    // rxSchedule may be on Medicine or Product; check either
    const enumVals = path?.enumValues || [];
    if (enumVals.length) {
      expect(enumVals).toContain('H1');
    } else {
      // fallback: Product model
      const { default: Product } = await import('../../src/models/Product.js');
      const p = Product.schema.path('rxSchedule');
      expect(p?.enumValues || []).toContain('H1');
    }
  });
});
