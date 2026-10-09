import express from 'express';
import { protect } from '../middleware/auth.js';
import NewbornScreening from '../models/NewbornScreening.js';

const router = express.Router();
router.use(protect);

const PANEL = [
  'TSH', 'G6PD', 'PKU', 'Galactosemia', 'Hemoglobinopathy', 'Biotinidase', 'CAH', 'Hearing'
];

router.get('/patient/:patientId', async (req, res) => {
  try {
    const rows = await NewbornScreening.find({ patientId: req.params.patientId, hospitalId: req.user.hospitalId }).lean();
    res.json({ screenings: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/patient/:patientId', async (req, res) => {
  try {
    const tests = PANEL.map((name) => ({ name, result: '', normal: true, flagged: false }));
    const row = await NewbornScreening.create({
      hospitalId: req.user.hospitalId,
      patientId: req.params.patientId,
      ...req.body,
      tests,
      createdBy: req.user._id,
    });
    res.status(201).json({ screening: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/patient/:patientId/result', async (req, res) => {
  try {
    const { testName, result, flagged } = req.body;
    const row = await NewbornScreening.findOneAndUpdate(
      { patientId: req.params.patientId, hospitalId: req.user.hospitalId, 'tests.name': testName },
      { $set: { 'tests.$.result': result, 'tests.$.flagged': flagged, 'tests.$.normal': !flagged } },
      { new: true },
    );
    if (row) {
      const anyFlagged = row.tests.some((t) => t.flagged);
      row.status = anyFlagged ? 'flagged' : 'done';
      await row.save();
    }
    res.json({ screening: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
