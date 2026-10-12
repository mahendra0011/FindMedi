import express from 'express';
import Test from '../models/Test.js';
import { protect } from '../middleware/auth.js';
import { validate, createTestSchema, updateTestSchema, canonicalSampleType } from '../utils/validate.js';
import { escapeRegex, capSearch } from '../utils/escapeRegex.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// Clinic doctors / lab owners link to a Facility (facilityId), hospital admins
// to a Hospital (hospitalId), standalone clinic doctors to their Doctor profile
// (doctorProfileId). scopeToHospital rejects the former with 403, so scope
// manually on whichever id is present.
const scopeId = (req) => (req.user?.facilityId || req.user?.hospitalId || req.user?.doctorProfileId)?.toString();
const canManageTests = (req) => ['superadmin', 'hospital_admin', 'clinic_doctor', 'lab_owner'].includes(req.user?.role);

router.get('/', async (req, res) => {
  try {
    const { category, department, popular, hospitalId, facilityId, providerId, search } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (department) filter.department = department;
    if (popular === 'true') filter.popular = true;
    if (facilityId) filter.hospitalId = facilityId;
    else if (hospitalId) filter.hospitalId = hospitalId;
    else if (providerId) filter.providerId = providerId;
    if (search) filter.name = new RegExp(escapeRegex(capSearch(search)), 'i');
    const tests = await Test.find(filter).sort({ name: 1 });
    res.json({ tests });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const filter = {};
    if (req.query.hospitalId) filter.hospitalId = req.query.hospitalId;
    const total = await Test.countDocuments(filter);
    const popular = await Test.countDocuments({ ...filter, popular: true });
    const homeCollection = await Test.countDocuments({ ...filter, homeCollection: true });
    const prescriptionReq = await Test.countDocuments({ ...filter, prescriptionReq: true });
    const categories = await Test.distinct('category', filter);
    res.json({ total, popular, homeCollection, prescriptionReq, categories: categories.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, validate(createTestSchema), async (req, res) => {
  try {
    if (!canManageTests(req)) {
      return res.status(403).json({ message: 'Admin or clinic doctor access required' });
    }
    const myId = scopeId(req);
    if (req.user.role !== 'superadmin' && !myId) {
      return res.status(403).json({ message: 'No facility linked to this account' });
    }
    const data = { ...req.body, hospitalId: myId || undefined };
    if (!data.providerType) data.providerType = req.user.role === 'clinic_doctor' ? 'clinic' : 'hospital';
    if (!data.providerId) data.providerId = myId || '';
    if (!data.discount) data.discount = Math.round((1 - data.price / data.mrp) * 100);
    const test = await Test.create(data);
    res.status(201).json(test);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/:id', protect, validate(updateTestSchema), async (req, res) => {
  try {
    if (!canManageTests(req)) {
      return res.status(403).json({ message: 'Admin or clinic doctor access required' });
    }
    const myId = scopeId(req);
    const existing = req.user.role === 'superadmin'
      ? await Test.findById(req.params.id)
      : await Test.findOne({ _id: req.params.id, hospitalId: myId });
    if (!existing) return res.status(404).json({ message: 'Test not found' });
    // LAB-B-11: `...req.body` also allowed `hospitalId` / `providerId` to be
    // rewritten, so the ownership check above (which runs on the PRE-image)
    // could be satisfied and then the catalogue row re-parented to another
    // tenant. Only catalogue fields are updatable now.
    // PATHOLOGY/LAB §6: the old allowlist carried five names that are not even
    // model fields (reportUrl/isActive/isAbnormal/method/normalRanges/
    // turnaroundTime/testCode) — they were silently dropped by mongoose strict
    // mode, so staff edits to department/unit/refs never persisted. The list is
    // now exactly the writable catalogue surface of models/Test.js.
    const { pickBody } = await import('../utils/pick.js');
    const body = pickBody(req.body, [
      'name', 'description', 'category', 'categoryCode', 'department', 'price', 'mrp',
      'discount', 'sampleType', 'prescriptionReq', 'preparation', 'unit',
      'refLow', 'refHigh', 'criticalLow', 'criticalHigh', 'reportTime',
      'homeCollection', 'homeCollectionFee', 'popular', 'nablAccredited',
      'reportsOnline', 'quickTest', 'walkinAvailable', 'aerbCertified',
      // §6 metadata
      'corporatePrice', 'insuranceRate', 'outsourcingCost', 'reportTemplate',
      'resultFormat', 'verificationRole', 'expectedTatHours', 'criticalLimits',
      'referenceRanges', 'fastingRequired',
    ]);
    // subcatogary.md §79: the model enum is the last guard (runValidators),
    // but coercing here keeps staff-typed 'blood' on updates the same
    // way the zod boundary does on create/register.
    if (body.sampleType !== undefined) body.sampleType = canonicalSampleType(body.sampleType);
    if (body.price && body.mrp) body.discount = Math.round((1 - body.price / body.mrp) * 100);
    // §6: a price edit is appended to priceHistory (never a silent overwrite).
    const priceChanged = body.price !== undefined && Number(body.price) !== Number(existing.price);
    if (priceChanged) body.$push = { priceHistory: { price: Number(body.price), changedBy: req.user._id, changedAt: new Date() } };
    const updated = await Test.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (priceChanged) {
      await auditLog('test_price_updated', req.user._id, {
        recordId: existing._id, price: Number(body.price), previousPrice: existing.price, ip: req.ip,
      });
    }
    res.json(updated);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!canManageTests(req)) {
      return res.status(403).json({ message: 'Admin or clinic doctor access required' });
    }
    const myId = scopeId(req);
    const existing = req.user.role === 'superadmin'
      ? await Test.findById(req.params.id)
      : await Test.findOne({ _id: req.params.id, hospitalId: myId });
    if (!existing) return res.status(404).json({ message: 'Test not found' });
    await Test.findByIdAndDelete(req.params.id);
    res.json({ message: 'Test removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
