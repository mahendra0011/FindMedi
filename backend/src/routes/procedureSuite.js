import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import NicuRecord, { CathLabRecord, EndoscopyRecord } from '../models/ProcedureSuite.js';

// File 22 P1-22: NICU observations, cath-lab interventions, endoscopy log.

const router = express.Router();
router.use(protect);

const tenantFilter = (req) => (req.user.role === 'superadmin' && !req.user.hospitalId
  ? {} : { hospitalId: req.user.hospitalId });

const makeCrud = (Model, key) => {
  const create = async (req, res) => {
    try {
      const row = await Model.create({ ...tenantFilter(req), ...req.body });
      return res.status(201).json({ [key]: row });
    } catch (err) { return res.status(400).json({ message: err.message }); }
  };
  const list = async (req, res) => {
    try {
      const f = { ...tenantFilter(req) };
      if (req.query.patientId) f.patientId = req.query.patientId;
      if (req.query.procedureStatus) f.procedureStatus = req.query.procedureStatus;
      const rows = await Model.find(f).sort({ createdAt: -1 }).limit(200).lean();
      return res.json({ [`${key}s`]: rows });
    } catch (err) { return res.status(500).json({ message: err.message }); }
  };
  const update = async (req, res) => {
    try {
      const row = await Model.findOneAndUpdate(
        { _id: req.params.id, ...tenantFilter(req) }, { $set: req.body }, { new: true },
      );
      if (!row) return res.status(404).json({ message: 'Not found' });
      return res.json({ [key]: row });
    } catch (err) { return res.status(400).json({ message: err.message }); }
  };
  const remove = async (req, res) => {
    try {
      const row = await Model.findOneAndDelete({ _id: req.params.id, ...tenantFilter(req) });
      if (!row) return res.status(404).json({ message: 'Not found' });
      return res.json({ deleted: true });
    } catch (err) { return res.status(400).json({ message: err.message }); }
  };
  return { create, list, update, remove };
};

const nicu = makeCrud(NicuRecord, 'record');
router.post('/nicu', authorize('records:write'), nicu.create);
router.get('/nicu', authorize('records:read'), nicu.list);
router.patch('/nicu/:id', authorize('records:write'), nicu.update);
router.delete('/nicu/:id', authorize('records:write'), nicu.remove);

const cath = makeCrud(CathLabRecord, 'record');
router.post('/cath-lab', authorize('records:write'), cath.create);
router.get('/cath-lab', authorize('records:read'), cath.list);
router.patch('/cath-lab/:id', authorize('records:write'), cath.update);
router.delete('/cath-lab/:id', authorize('records:write'), cath.remove);

const endo = makeCrud(EndoscopyRecord, 'record');
router.post('/endoscopy', authorize('records:write'), endo.create);
router.get('/endoscopy', authorize('records:read'), endo.list);
router.patch('/endoscopy/:id', authorize('records:write'), endo.update);
router.delete('/endoscopy/:id', authorize('records:write'), endo.remove);

export default router;
