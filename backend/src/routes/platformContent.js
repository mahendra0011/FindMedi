import express from 'express';
import PlatformContent from '../models/PlatformContent.js';
import { protect, requireRole } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const filter = { status: 'published' };
    if (req.query.key) filter.key = req.query.key;
    const contents = await PlatformContent.find(filter).sort({ updatedAt: -1 });
    res.json({ contents });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:key', async (req, res) => {
  try {
    // Drafts/in-review pieces are never public, even by direct key.
    const content = await PlatformContent.findOne({ key: req.params.key, status: 'published' });
    if (!content) return res.status(404).json({ message: 'Content not found' });
    res.json(content);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// 8.md 11 / 7.md 3.21: the console edits versioned platform content (ToS,
// privacy, policies) - every write bumps `version` and is audited, so handing
// it to the ops content_editor is a scoped edit right, not a delete right.
//
// Review workflow enforced: draft -> in_review (editor), in_review ->
// published REQUIRES medical_reviewer/superadmin. Publishing straight from
// draft is a 409, not a shortcut.
const PUBLISH_ROLES = ['superadmin', 'medical_reviewer'];
router.put('/:key', protect, requireRole(['superadmin', 'content_editor', 'medical_reviewer']), async (req, res) => {
  try {
    const { title, body, changeNotes, status } = req.body;
    let content = await PlatformContent.findOne({ key: req.params.key });
    if (content) {
      if (status && !['draft', 'in_review', 'published'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      if (status === 'published' && content.status !== 'published'
        && content.status !== 'in_review'
        && !PUBLISH_ROLES.includes(req.user.role)) {
        return res.status(409).json({ message: 'Medical review required before publish', code: 'REVIEW_REQUIRED' });
      }
      content.version += 1;
      content.title = title || content.title;
      content.body = body || content.body;
      content.changeNotes = changeNotes || '';
      content.updatedBy = req.user._id;
      if (status) content.status = status;
      if (req.body.publish) {
        if (!PUBLISH_ROLES.includes(req.user.role)) {
          return res.status(409).json({ message: 'Medical review required before publish', code: 'REVIEW_REQUIRED' });
        }
        content.status = 'published';
        content.publishedAt = new Date();
        content.reviewedBy = req.user._id;
        content.reviewedAt = new Date();
      }
    } else {
      // New rows start as DRAFT (never instantly public), even though the
      // model defaults legacy rows to published.
      content = await PlatformContent.create({
        key: req.params.key, title, body, changeNotes, updatedBy: req.user._id,
        status: 'draft',
        publishedAt: undefined,
      });
    }
    await content.save();
    await auditLog('update_platform_content', req.user._id, { contentKey: req.params.key, version: content.version, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(content);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

export default router;
