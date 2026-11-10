import express from 'express';
import CommunityPost, { COMMUNITY_POST_CATEGORIES } from '../models/CommunityPost.js';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { sendServerError } from '../utils/safeError.js';
import { communityReportLimiter } from '../middleware/rateLimit.js';

// Peer-support forums (T2). Not medical care: dosage/diagnosis instructions
// are refused here so peer threads cannot become a prescription channel.
const router = express.Router();
router.use(protect);

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id)) ? next() : res.status(404).json({ message: 'Not found' })
);

const actorId = (req) => req.user._id ?? req.user.id;
const BLOCKED = /(take|start|stop|increase|decrease)\s+.{0,40}(mg|dose|tablet|insulin|antibiotic)/i;
const CRISIS = /(suicide|self.harm|kill myself|end my life)/i;
const REPORT_REASONS = ['harassment', 'medical_advice', 'crisis', 'privacy', 'spam', 'other'];
const MODERATOR_ROLES = new Set(['moderator', 'compliance_officer', 'superadmin', 'super_admin']);

const publicPost = (post) => {
  const row = typeof post?.toObject === 'function' ? post.toObject() : post;
  return {
    _id: row._id,
    category: row.category,
    title: row.title,
    body: row.body,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    comments: (row.comments || []).map((comment) => ({
      _id: comment._id,
      body: comment.body,
      createdAt: comment.createdAt,
    })),
  };
};

const moderatorOnly = (req, res, next) => (
  MODERATOR_ROLES.has(String(req.user?.role || ''))
    ? next()
    : res.status(403).json({ message: 'Moderator access required' })
);

const screen = (title, body) => {
  if (CRISIS.test(`${title} ${body}`)) return 'Crisis content is not allowed in forums. Call Tele-MANAS 14416 or 112.';
  if (BLOCKED.test(`${title} ${body}`)) return 'Dosage/medication instructions are not allowed in forums. Ask your doctor.';
  return '';
};

// authz: self
router.get('/', async (req, res) => {
  try {
    const filter = { status: 'visible' };
    if (req.query.category && COMMUNITY_POST_CATEGORIES.includes(String(req.query.category))) {
      filter.category = String(req.query.category);
    }
    const rows = await CommunityPost.find(filter)
      .sort({ createdAt: -1 }).limit(100).lean();
    res.json({ posts: rows.map(publicPost) });
  } catch (err) {
    sendServerError(err, res, 'community');
  }
});

// authz: self
router.post('/', async (req, res) => {
  try {
    const { category, title, body } = req.body || {};
    if (!title || !String(title).trim() || !body || !String(body).trim()) {
      return res.status(400).json({ message: 'Title and body are required' });
    }
    if (category && !COMMUNITY_POST_CATEGORIES.includes(String(category))) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    const hit = screen(String(title), String(body));
    if (hit) return res.status(422).json({ message: hit, code: 'FORUM_SAFETY' });
    const post = await CommunityPost.create({
      authorId: actorId(req),
      category: category || 'general',
      title: String(title).trim().slice(0, 200),
      body: String(body).trim().slice(0, 8000),
    });
    await auditLog('create_community_post', actorId(req), { recordId: post._id });
    return res.status(201).json(publicPost(post));
  } catch (err) {
    sendServerError(err, res, 'community');
  }
});

// authz: self
router.post('/:id/comments', requireObjectId, async (req, res) => {
  try {
    const bodyText = String((req.body || {}).body || '').trim();
    if (!bodyText) return res.status(400).json({ message: 'Comment body is required' });
    const hit = screen('', bodyText);
    if (hit) return res.status(422).json({ message: hit, code: 'FORUM_SAFETY' });
    const post = await CommunityPost.findOne({ _id: req.params.id, status: 'visible' });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    post.comments.push({ authorId: actorId(req), body: bodyText.slice(0, 2000) });
    await post.save();
    return res.json({ comments: publicPost(post).comments });
  } catch (err) {
    sendServerError(err, res, 'community');
  }
});

// authz: self. One report per member/post prevents repeat-report harassment.
router.post('/:id/reports', communityReportLimiter, requireObjectId, async (req, res) => {
  try {
    const { reason, details = '' } = req.body || {};
    if (!REPORT_REASONS.includes(String(reason))) return res.status(400).json({ message: 'Invalid report reason' });
    if (typeof details !== 'string' || details.length > 1000) return res.status(400).json({ message: 'Report details must be at most 1000 characters' });
    const reporter = String(actorId(req));
    const post = await CommunityPost.findOneAndUpdate(
      { _id: req.params.id, status: 'visible', 'reports.reporterId': { $ne: reporter } },
      { $push: { reports: { reporterId: actorId(req), reason, details: details.trim() } } },
      { new: true },
    );
    if (!post) {
      const exists = await CommunityPost.exists({ _id: req.params.id, status: 'visible' });
      if (!exists) return res.status(404).json({ message: 'Post not found' });
      return res.status(409).json({ message: 'You have already reported this post' });
    }
    const report = post.reports[post.reports.length - 1];
    await auditLog('community_post_reported', actorId(req), { postId: post._id, reportId: report._id, reason });
    return res.status(201).json({ reportId: String(report._id), status: report.status });
  } catch (err) {
    sendServerError(err, res, 'community');
  }
});

// authz: moderator. Reporter identity is not included in this queue response.
router.get('/moderation/reports', moderatorOnly, async (_req, res) => {
  try {
    const rows = await CommunityPost.find({ 'reports.status': 'open' }).sort({ updatedAt: 1 }).limit(100).lean();
    const reports = [];
    for (const row of rows) {
      for (const report of row.reports || []) {
        if (report.status !== 'open') continue;
        reports.push({
          postId: String(row._id), reportId: String(report._id), reason: report.reason,
          details: report.details || '', reportedAt: report.createdAt,
          post: { title: row.title, body: row.body, category: row.category },
        });
      }
    }
    return res.json({ reports: reports.slice(0, 100) });
  } catch (err) {
    sendServerError(err, res, 'community');
  }
});

// authz: moderator. `hide` removes the post from public listings; `dismiss`
// records a reviewed report without hiding it.
router.patch('/moderation/reports/:postId/:reportId', moderatorOnly, async (req, res) => {
  try {
    const { postId, reportId } = req.params;
    if (!OBJECT_ID.test(postId) || !OBJECT_ID.test(reportId)) return res.status(404).json({ message: 'Report not found' });
    const { action } = req.body || {};
    if (!['hide', 'dismiss'].includes(String(action))) return res.status(400).json({ message: 'Action must be hide or dismiss' });
    const post = await CommunityPost.findById(postId);
    if (!post) return res.status(404).json({ message: 'Report not found' });
    const report = post.reports?.id(reportId);
    if (!report || report.status !== 'open') return res.status(404).json({ message: 'Open report not found' });
    report.status = action === 'hide' ? 'resolved' : 'dismissed';
    report.reviewedBy = actorId(req);
    report.reviewedAt = new Date();
    if (action === 'hide') {
      post.status = 'hidden';
      post.hiddenBy = actorId(req);
    }
    await post.save();
    await auditLog('community_report_reviewed', actorId(req), { postId: post._id, reportId: report._id, action });
    return res.json({ ok: true, action, postStatus: post.status });
  } catch (err) {
    sendServerError(err, res, 'community');
  }
});

// authz: role
router.patch('/:id/hide', requireObjectId, async (req, res) => {
  try {
    if (!MODERATOR_ROLES.has(String(req.user?.role || ''))) return res.status(403).json({ message: 'Moderator access required' });
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    post.status = 'hidden';
    post.hiddenBy = actorId(req);
    await post.save();
    await auditLog('hide_community_post', actorId(req), { recordId: post._id });
    return res.json({ ok: true });
  } catch (err) {
    sendServerError(err, res, 'community');
  }
});

export default router;
