import express from 'express';
import CommunityPost, { COMMUNITY_POST_CATEGORIES } from '../models/CommunityPost.js';
import { protect } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { sendServerError } from '../utils/safeError.js';

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
    res.json({ posts: rows });
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
    return res.status(201).json(post);
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
    return res.json({ comments: post.comments });
  } catch (err) {
    sendServerError(err, res, 'community');
  }
});

// authz: role
router.patch('/:id/hide', requireObjectId, async (req, res) => {
  try {
    const staff = ['moderator', 'superadmin', 'compliance_officer'].includes(String(req.user?.role || ''));
    if (!staff) return res.status(403).json({ message: 'Moderator access required' });
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
