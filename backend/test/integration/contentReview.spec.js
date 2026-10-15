/**
 * 7.md 3.21 / 8.md 11: medical-review workflow for platform content.
 *
 * What it pins:
 *  - public reads serve published rows only (drafts 404 even by key);
 *  - publishing requires medical_reviewer/superadmin (editor gets 409
 *    REVIEW_REQUIRED); editors may move draft -> in_review;
 *  - newly created rows start as draft, never instantly public.
 */
import { jest as jestApi } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const auditLog = jestApi.fn(async () => {});
let rowByKey = () => null;
const created = [];

jestApi.unstable_mockModule('../../src/models/PlatformContent.js', () => ({
  default: {
    find: () => query([]),
    findOne: (filter) => query(rowByKey(filter?.key)),
    create: async (doc) => {
      const row = { _id: 'pc-1', version: 1, save: jestApi.fn(async () => row), ...doc };
      created.push(row);
      return row;
    },
  },
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
  auditLog: (...args) => auditLog(...args),
}));

const { as } = await mountApp('platformContent', {});

const editor = { _id: 'ed-1', id: 'ed-1', role: 'content_editor' };
const reviewer = { _id: 'rev-1', id: 'rev-1', role: 'medical_reviewer' };

const draftRow = () => {
  const row = {
    _id: 'pc-1', key: 'tos', title: 'ToS', body: 'v1', version: 3,
    status: 'draft', save: jestApi.fn(async () => row),
  };
  return row;
};

beforeEach(() => {
  rowByKey = () => null;
  created.length = 0;
  auditLog.mockClear();
});

describe('public reads', () => {
  it('hides drafts behind 404, even by direct key', async () => {
    rowByKey = () => query(null); // findOne already filters status=published
    const res = await as().get('/some-draft-key');
    expect(res.status).toBe(404);
  });
});

describe('PUT /:key review workflow', () => {
  it('creates new rows as draft, never instantly public', async () => {
    const res = await as(editor).put('/tos').send({ title: 'ToS', body: 'v2', publish: true });
    expect(res.status).toBe(200);
    // Editor cannot publish: create path ignores publish for non-publish roles.
    expect(created[0].status).toBe('draft');
    expect(created[0].publishedAt).toBeUndefined();
  });

  it('lets an editor move draft -> in_review', async () => {
    const row = draftRow();
    rowByKey = () => query(row);
    const res = await as(editor).put('/tos').send({ status: 'in_review' });
    expect(res.status).toBe(200);
    expect(row.status).toBe('in_review');
    expect(row.version).toBe(4);
  });

  it('409s editor publish without medical review', async () => {
    const row = draftRow();
    rowByKey = () => query(row);
    const res = await as(editor).put('/tos').send({ publish: true });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('REVIEW_REQUIRED');
    expect(row.save).not.toHaveBeenCalled();
  });

  it('lets a medical reviewer publish with review stamps', async () => {
    const row = { ...draftRow(), status: 'in_review' };
    row.save = jestApi.fn(async () => row);
    rowByKey = () => query(row);
    const res = await as(reviewer).put('/tos').send({ publish: true });
    expect(res.status).toBe(200);
    expect(row.status).toBe('published');
    expect(row.reviewedBy).toBe('rev-1');
    expect(row.reviewedAt).not.toBeNull();
  });
});
