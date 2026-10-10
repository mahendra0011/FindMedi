import express from 'express';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

const jobs = new Map();

router.post('/render', async (req, res) => {
  try {
    const { html, css, filename } = req.body;
    if (!html) return res.status(400).json({ message: 'html required' });
    const jobId = `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    jobs.set(jobId, { status: 'queued', createdAt: Date.now() });
    setTimeout(() => { jobs.set(jobId, { status: 'done', jobId, filename: filename || 'document.pdf' }); }, 100);
    res.status(202).json({ jobId, status: 'queued' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/status/:jobId', async (req, res) => {
  try {
    const job = jobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
