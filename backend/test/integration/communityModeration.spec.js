import { jest as jestApi, describe, it, expect } from '@jest/globals';
import { mountApp, query } from '../helpers/appHarness.js';

const report = {
  _id: '650000000000000000000101', reporterId: 'patient-2', reason: 'privacy',
  details: 'Contains personal contact details', status: 'open', createdAt: new Date('2026-10-01T00:00:00Z'),
};
const post = {
  _id: '650000000000000000000001', authorId: 'patient-1', category: 'mental_health',
  title: 'A support thread', body: 'A private phone number was posted.', status: 'visible',
  comments: [{ _id: '650000000000000000000102', authorId: 'patient-3', body: 'Please remove it.', createdAt: new Date() }],
  reports: [report], hiddenBy: null, save: jestApi.fn().mockResolvedValue(undefined),
};
post.reports.id = (id) => post.reports.find((item) => String(item._id) === String(id));

const find = jestApi.fn(() => query([post]));
const findById = jestApi.fn(() => query(post));
const findOneAndUpdate = jestApi.fn().mockResolvedValue({ ...post, reports: [...post.reports, { ...report, _id: '650000000000000000000103' }] });
const exists = jestApi.fn().mockResolvedValue(true);
const auditLog = jestApi.fn().mockResolvedValue(undefined);

jestApi.unstable_mockModule('../../src/models/CommunityPost.js', () => ({
  default: { find, findById, findOneAndUpdate, exists },
  COMMUNITY_POST_CATEGORIES: ['general', 'mental_health'],
}));
jestApi.unstable_mockModule('../../src/middleware/audit.js', () => ({
 auditLog,
  auditLogRequired: (...args) => (typeof auditLog === 'function' ? auditLog(...args) : Promise.resolve()),
}));

const { as } = await mountApp('community');

describe('community reporting and moderation', () => {
  it('does not expose author identifiers in public post or comment DTOs', async () => {
    const res = await as({ _id: 'patient-4', role: 'patient' }).get('/');
    expect(res.status).toBe(200);
    expect(res.body.posts[0].authorId).toBeUndefined();
    expect(res.body.posts[0].comments[0].authorId).toBeUndefined();
    expect(res.body.posts[0].reports).toBeUndefined();
  });

  it('accepts one bounded report and audits only the report reason', async () => {
    const res = await as({ _id: 'patient-2', role: 'patient' }).post(`/${post._id}/reports`).send({ reason: 'privacy', details: 'Personal contact detail' });
    expect(res.status).toBe(201);
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: post._id, status: 'visible', 'reports.reporterId': { $ne: 'patient-2' } }),
      expect.objectContaining({ $push: { reports: expect.objectContaining({ reporterId: 'patient-2', reason: 'privacy' }) } }),
      { new: true },
    );
    expect(auditLog).toHaveBeenCalledWith('community_post_reported', 'patient-2', expect.objectContaining({ reason: 'privacy' }));
    expect(JSON.stringify(auditLog.mock.calls)).not.toContain('Personal contact detail');
  });

  it('rejects report reasons outside the allowlist', async () => {
    const res = await as({ _id: 'patient-2', role: 'patient' }).post(`/${post._id}/reports`).send({ reason: 'diagnose_me' });
    expect(res.status).toBe(400);
  });

  it('denies the report queue to non-moderators', async () => {
    const res = await as({ _id: 'patient-2', role: 'patient' }).get('/moderation/reports');
    expect(res.status).toBe(403);
  });

  it('lets a moderator hide a reported post and records the decision', async () => {
    report.status = 'open';
    post.status = 'visible';
    const res = await as({ _id: 'moderator-1', role: 'moderator' })
      .patch(`/moderation/reports/${post._id}/${report._id}`).send({ action: 'hide' });
    expect(res.status).toBe(200);
    expect(post.status).toBe('hidden');
    expect(report.status).toBe('resolved');
    expect(auditLog).toHaveBeenCalledWith('community_report_reviewed', 'moderator-1', expect.objectContaining({ action: 'hide' }));
  });
});
