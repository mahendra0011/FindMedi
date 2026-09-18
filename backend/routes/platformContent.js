import express from 'express';
import PlatformContent from '../models/PlatformContent.js';
import { protect, superadminOnly } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.key) filter.key = req.query.key;
    const contents = await PlatformContent.find(filter).sort({ updatedAt: -1 });
    res.json({ contents });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:key', async (req, res) => {
  try {
    const content = await PlatformContent.findOne({ key: req.params.key });
    if (!content) return res.status(404).json({ message: 'Content not found' });
    res.json(content);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:key', protect, superadminOnly, async (req, res) => {
  try {
    const { title, body, changeNotes } = req.body;
    let content = await PlatformContent.findOne({ key: req.params.key });
    if (content) {
      content.version += 1;
      content.title = title || content.title;
      content.body = body || content.body;
      content.changeNotes = changeNotes || '';
      content.updatedBy = req.user._id;
      if (req.body.publish) content.publishedAt = new Date();
    } else {
      content = await PlatformContent.create({
        key: req.params.key, title, body, changeNotes, updatedBy: req.user._id,
        publishedAt: req.body.publish ? new Date() : undefined,
      });
    }
    await content.save();
    await auditLog('update_platform_content', req.user._id, { contentKey: req.params.key, version: content.version, ip: req.ip, userAgent: req.get('user-agent') });
    res.json(content);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

export default router;
