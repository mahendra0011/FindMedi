import express from 'express';
import { protect } from '../middleware/auth.js';
import VaccinationAlert from '../models/VaccinationAlert.js';

const router = express.Router();
router.use(protect);

const SCHEDULE = [
  { vaccine: 'BCG', dose: 1, atDays: 0 },
  { vaccine: 'Hep B', dose: 1, atDays: 0 },
  { vaccine: 'OPV', dose: 0, atDays: 0 },
  { vaccine: 'DPT', dose: 1, atDays: 42 },
  { vaccine: 'Hib', dose: 1, atDays: 42 },
  { vaccine: 'PCV', dose: 1, atDays: 42 },
  { vaccine: 'Rotavirus', dose: 1, atDays: 42 },
  { vaccine: 'IPV', dose: 1, atDays: 42 },
  { vaccine: 'DPT', dose: 2, atDays: 70 },
  { vaccine: 'Hib', dose: 2, atDays: 70 },
  { vaccine: 'PCV', dose: 2, atDays: 70 },
  { vaccine: 'Rotavirus', dose: 2, atDays: 70 },
  { vaccine: 'IPV', dose: 2, atDays: 70 },
  { vaccine: 'DPT', dose: 3, atDays: 98 },
  { vaccine: 'Hib', dose: 3, atDays: 98 },
  { vaccine: 'PCV', dose: 3, atDays: 98 },
  { vaccine: 'Rotavirus', dose: 3, atDays: 98 },
  { vaccine: 'IPV', dose: 3, atDays: 98 },
  { vaccine: 'Measles', dose: 1, atDays: 270 },
  { vaccine: 'Hep A', dose: 1, atDays: 365 },
  { vaccine: 'MMR', dose: 1, atDays: 365 },
  { vaccine: 'Varicella', dose: 1, atDays: 365 },
  { vaccine: 'DPT', dose: 4, atDays: 455 },
  { vaccine: 'OPV', dose: 1, atDays: 455 },
  { vaccine: 'Hib', dose: 4, atDays: 455 },
  { vaccine: 'PCV', dose: 4, atDays: 455 },
  { vaccine: 'Typhoid', dose: 1, atDays: 540 },
  { vaccine: 'Hep A', dose: 2, atDays: 540 },
  { vaccine: 'MMR', dose: 2, atDays: 720 },
  { vaccine: 'DPT', dose: 5, atDays: 1440 },
  { vaccine: 'OPV', dose: 2, atDays: 1440 },
  { vaccine: 'Tdap', dose: 1, atDays: 2555 },
];

router.get('/patient/:patientId', async (req, res) => {
  try {
    const rows = await VaccinationAlert.find({ patientId: req.params.patientId, hospitalId: req.user.hospitalId }).lean();
    res.json({ vaccinations: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/schedule/:patientId', async (req, res) => {
  try {
    const { birthDate } = req.body;
    const b = new Date(birthDate);
    const docs = SCHEDULE.map((s) => ({
      hospitalId: req.user.hospitalId,
      patientId: req.params.patientId,
      vaccineName: s.vaccine,
      doseNumber: s.dose,
      dueDate: new Date(b.getTime() + s.atDays * 86400000),
    }));
    await VaccinationAlert.insertMany(docs);
    res.json({ created: docs.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/administer/:id', async (req, res) => {
  try {
    const row = await VaccinationAlert.findByIdAndUpdate(req.params.id, {
      status: 'administered',
      administeredDate: new Date(),
      administeredBy: req.user._id,
    }, { new: true });
    res.json({ vaccination: row });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
