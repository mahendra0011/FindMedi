/**
 * 8.md §17 catalogue alignment: `adClaimsRestricted` categories auto-escalate
 * queue items to at least HIGH severity.
 */
import { jest as jestApi } from '@jest/globals';

let moderationFindOneImpl = async () => null;
let categoryFindOneImpl = async () => null;
let createdDoc = null;

jestApi.unstable_mockModule('../../src/models/ModerationItem.js', () => ({
  __esModule: true,
  default: {
    findOne: (...args) => moderationFindOneImpl(...args),
    create: async (body) => {
      createdDoc = body;
      return { _id: 'item-1', ...body };
    },
  },
}));
jestApi.unstable_mockModule('../../src/models/Category.js', () => ({
  __esModule: true,
  default: {
    findOne: (...args) => ({
      select: () => ({ lean: () => categoryFindOneImpl(...args) }),
    }),
  },
}));
jestApi.unstable_mockModule('../../src/models/Strike.js', () => ({ __esModule: true, default: {} }));
jestApi.unstable_mockModule('../../src/models/Notification.js', () => ({
  __esModule: true,
  default: { create: async () => ({}) },
}));
jestApi.unstable_mockModule('../../src/models/Review.js', () => ({ __esModule: true, default: {} }));
jestApi.unstable_mockModule('../../src/models/Provider.js', () => ({ __esModule: true, default: {} }));
jestApi.unstable_mockModule('../../src/models/User.js', () => ({ __esModule: true, default: {} }));
jestApi.unstable_mockModule('../../src/models/ChatReport.js', () => ({ __esModule: true, default: {} }));

const { ensureModerationItem } = await import('../../src/lib/moderationActions.js');

beforeEach(() => {
  moderationFindOneImpl = async () => null;
  categoryFindOneImpl = async () => null;
  createdDoc = null;
});

describe('adClaimsRestricted boost', () => {
  it('raises a restricted-category item to high', async () => {
    categoryFindOneImpl = async () => ({ adClaimsRestricted: true });
    const { item, created } = await ensureModerationItem({
      targetType: 'listing',
      targetId: 't1',
      category: 'SPEC.WEIGHTLOSS',
      reason: 'miracle cure claim',
    });
    expect(created).toBe(true);
    expect(item.severity).toBe('high');
  });

  it('leaves unrestricted categories at computed severity', async () => {
    categoryFindOneImpl = async () => ({ adClaimsRestricted: false });
    const { item } = await ensureModerationItem({
      targetType: 'listing',
      targetId: 't2',
      category: 'other',
      reason: 'spammy',
    });
    expect(item.severity).not.toBe('high');
  });

  it('fails open when the catalogue read errors', async () => {
    categoryFindOneImpl = async () => { throw new Error('db down'); };
    const { item, created } = await ensureModerationItem({
      targetType: 'review',
      targetId: 't3',
      category: 'SPEC.SKIN',
      reason: 'x',
    });
    expect(created).toBe(true);
    expect(item.severity).toBeTruthy();
  });
});
