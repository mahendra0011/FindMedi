import express from 'express';
import { z } from 'zod';
import OperationTheatre from '../models/OperationTheatre.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { validate, createSurgerySchema, vitalsShape, checklistMapShape } from '../utils/validate.js';
import { generateTimestampedId } from '../utils/idGenerator.js';
import { escapeRegex, capSearch } from '../utils/escapeRegex.js';

const otCompleteSchema = z.object({ findings: z.string().optional(), procedure: z.string().optional(), complications: z.string().optional(), postOpInstructions: z.string().optional(), instrumentsAfter: z.number().optional(), spongesAfter: z.number().optional() });
const otRecoverySchema = z.object({ recoveryNotes: z.string().trim().max(4000).optional(), vitals: vitalsShape.optional() });
const otChecklistSchema = z.object({ checklist: checklistMapShape });
const otPreOpVitalsSchema = z.object({ bp: z.string().optional(), hr: z.string().optional(), temp: z.string().optional(), spO2: z.string().optional(), weight: z.string().optional(), notes: z.string().optional() });
const otInstrumentsSchema = z.object({ instrumentsBefore: z.number().optional(), spongesBefore: z.number().optional() });

const router = express.Router();

const generateOTId = async () => generateTimestampedId('OT');

router.post('/surgeries', protect, adminOnly, validate(createSurgerySchema), async (req, res) => {
  try {
    const { patientId, patientName, surgeryName, surgeryType, anaesthesiaType, assistants, otNumber, scheduledDate } = req.body;
    if (!patientId || !surgeryName) return res.status(400).json({ message: 'Patient and surgery required' });
    const otId = await generateOTId();
    const surgery = await OperationTheatre.create({
      otId, patientId, patientName, doctorId: req.user.doctorProfileId || req.user._id, doctorName: req.user.name,
      hospitalId: req.user.hospitalId || undefined,
      surgeryName, surgeryType: surgeryType || 'Elective',
      anaesthesiaType: anaesthesiaType || 'General', assistants: assistants || [],
      otNumber: otNumber || '', scheduledDate,
      createdBy: req.user._id,
    });
    // File 22 P0-4: link the admitted stay so op-note charges roll into the bill.
    try {
      const { openAdmissionFor } = await import('../lib/charges.js');
      const { safeFirst } = await import('../lib/approvalWiring.js');
      const stay = await safeFirst(openAdmissionFor(surgery.hospitalId, patientId));
      if (stay) {
        surgery.admissionId = stay._id;
        if (stay.encounterId) surgery.encounterId = stay.encounterId;
        await surgery.save();
      }
    } catch { /* linkage must never break scheduling */ }
    res.status(201).json(surgery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/surgeries', protect, async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') filter.hospitalId = req.user.hospitalId;
    if (status && status !== 'All') filter.status = status;
    if (search) {
      filter.$or = [
        { otId: new RegExp(escapeRegex(capSearch(search)), 'i') }, { patientName: new RegExp(escapeRegex(capSearch(search)), 'i') },
        { surgeryName: new RegExp(escapeRegex(capSearch(search)), 'i') }, { doctorName: new RegExp(escapeRegex(capSearch(search)), 'i') },
      ];
    }
    const surgeries = await OperationTheatre.find(filter)
      .populate('patientId', 'name email phone').populate('doctorId', 'name')
      .sort({ createdAt: -1 });
    res.json({ surgeries });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/surgeries/:id', protect, async (req, res) => {
  try {
    const surgery = await OperationTheatre.findById(req.params.id)
      .populate('patientId', 'name email phone').populate('doctorId', 'name');
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && surgery.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(surgery);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/surgeries/:id/start', protect, async (req, res) => {
  try {
    const surgery = await OperationTheatre.findById(req.params.id);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && surgery.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    surgery.status = 'In Progress';
    surgery.startTime = new Date();
    await surgery.save();
    res.json(surgery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/surgeries/:id/complete', protect, validate(otCompleteSchema), async (req, res) => {
  try {
    const { findings, procedure, complications, postOpInstructions, instrumentsAfter, spongesAfter } = req.body;
    const surgery = await OperationTheatre.findById(req.params.id);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && surgery.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    surgery.status = 'Recovery';
    surgery.endTime = new Date();
    surgery.findings = findings || '';
    surgery.procedure = procedure || '';
    surgery.complications = complications || '';
    surgery.postOpInstructions = postOpInstructions || '';
    if (instrumentsAfter !== undefined) {
      surgery.instrumentsCount.after = instrumentsAfter;
      surgery.instrumentsCount.correct = surgery.instrumentsCount.before === instrumentsAfter;
    }
    if (spongesAfter !== undefined) {
      surgery.spongeCount.after = spongesAfter;
      surgery.spongeCount.correct = surgery.spongeCount.before === spongesAfter;
    }
    await surgery.save();
    res.json(surgery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/surgeries/:id/recovery', protect, validate(otRecoverySchema), async (req, res) => {
  try {
    const { recoveryNotes, vitals } = req.body;
    const surgery = await OperationTheatre.findById(req.params.id);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && surgery.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    surgery.status = 'Completed';
    surgery.recoveryNotes = recoveryNotes || '';
    if (vitals) surgery.recoveryVitals.push(vitals);
    await surgery.save();
    res.json(surgery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/surgeries/:id/checklist', protect, validate(otChecklistSchema), async (req, res) => {
  try {
    const { checklist } = req.body;
    const requiredFields = ['consentSigned', 'bloodGroupConfirmed', 'anaesthesiaFitness', 'npoStatus', 'allergiesChecked', 'siteMarked', 'investigationsReviewed'];
    const missingFields = requiredFields.filter(f => !checklist?.[f]);
    if (missingFields.length > 0) {
      return res.status(400).json({ message: `Mandatory checklist fields missing: ${missingFields.join(', ')}` });
    }
    const surgery = await OperationTheatre.findById(req.params.id);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && surgery.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    surgery.preOpChecklist = checklist;
    surgery.status = 'Pre-Op';
    await surgery.save();
    res.json(surgery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/surgeries/:id/pre-op-vitals', protect, validate(otPreOpVitalsSchema), async (req, res) => {
  try {
    const { bp, hr, temp, spO2, weight, notes } = req.body;
    const surgery = await OperationTheatre.findById(req.params.id);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && surgery.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (bp) surgery.preOpVitals.bp = bp;
    if (hr) surgery.preOpVitals.hr = hr;
    if (temp) surgery.preOpVitals.temp = temp;
    if (spO2) surgery.preOpVitals.spO2 = spO2;
    if (weight) surgery.preOpVitals.weight = weight;
    
    surgery.status = 'Pre-Op';
    await surgery.save();
    res.json(surgery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.post('/surgeries/:id/instruments', protect, validate(otInstrumentsSchema), async (req, res) => {
  try {
    const { instrumentsBefore, spongesBefore } = req.body;
    const surgery = await OperationTheatre.findById(req.params.id);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });
    if (req.user.hospitalId && req.user.role !== 'superadmin' && surgery.hospitalId?.toString() !== req.user.hospitalId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (instrumentsBefore !== undefined) surgery.instrumentsCount.before = instrumentsBefore;
    if (spongesBefore !== undefined) surgery.spongeCount.before = spongesBefore;
    
    await surgery.save();
    res.json(surgery);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// File 09 §9.2/04.6: PAC + WHO surgical safety checklist + op note.
// Implants/consumables auto-post Pending ChargeItems to the encounter.
router.put('/surgeries/:id/pac', protect, async (req, res) => {
  try {
    const { asaGrade, npoConfirmed, fitness, notes } = req.body || {};
    const s = await OperationTheatre.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'Surgery not found' });
    s.pac = {
      asaGrade: asaGrade || '', npoConfirmed: Boolean(npoConfirmed),
      fitness: fitness || '', notes: String(notes || '').slice(0, 2000),
      by: req.user._id, at: new Date(),
    };
    await s.save();
    res.json({ id: String(s._id), pac: s.pac });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/surgeries/:id/who-checklist', protect, async (req, res) => {
  try {
    const { signIn, timeOut, signOut } = req.body || {};
    const s = await OperationTheatre.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'Surgery not found' });
    s.whoChecklist = {
      signIn: Boolean(signIn), timeOut: Boolean(timeOut), signOut: Boolean(signOut),
      by: req.user._id, at: new Date(),
    };
    await s.save();
    res.json({ id: String(s._id), whoChecklist: s.whoChecklist });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.put('/surgeries/:id/op-note', protect, async (req, res) => {
  try {
    const { findings, procedure, anaesthesiaRecord, implants, consumables, teamFees } = req.body || {};
    const s = await OperationTheatre.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'Surgery not found' });
    if (findings !== undefined) s.findings = String(findings).slice(0, 4000);
    if (procedure !== undefined) s.procedure = String(procedure).slice(0, 4000);
    if (anaesthesiaRecord !== undefined) s.anaesthesiaRecord = String(anaesthesiaRecord).slice(0, 4000);
    if (Array.isArray(implants)) s.implants = implants.slice(0, 50);
    if (Array.isArray(consumables)) s.consumables = consumables.slice(0, 100);
    if (teamFees) s.teamFees = teamFees;
    await s.save();
    // Auto-charge implants + consumables to the encounter/admission account.
    const { default: ChargeItem } = await import('../models/ChargeItem.js');
    const lines = [
      ...(s.implants || []).map((i) => ({ description: `Implant: ${i.name}`, qty: 1, unitPrice: i.price || 0 })),
      ...(s.consumables || []).map((c) => ({ description: `Consumable: ${c.name}`, qty: c.qty || 1, unitPrice: c.price || 0 })),
    ].filter((l) => l.unitPrice > 0);
    // File 22 P0-4: team fees ride the same op-note (idempotent per surgery:
    // re-saving the note must not re-bill the team).
    const teamTotal = Number(s.teamFees?.surgeon || 0) + Number(s.teamFees?.assistant || 0) + Number(s.teamFees?.anaesthetist || 0);
    if (teamTotal > 0) {
      const { postCharge } = await import('../lib/charges.js');
      await postCharge({
        hospitalId: s.hospitalId, patientId: s.patientId,
        encounterId: s.encounterId || null, admissionId: s.admissionId || null,
        source: 'procedure', sourceRef: { model: 'OperationTheatre', id: s._id },
        description: `OT team fees (${s.procedure ? String(s.procedure).slice(0, 80) : 'procedure'})`,
        qty: 1, unitPrice: teamTotal, postedBy: req.user._id,
      }).catch(() => null);
    }
    if (lines.length) {
      await ChargeItem.insertMany(lines.map((l) => ({
        patientId: s.patientId, hospitalId: s.hospitalId,
        source: 'ot', sourceRef: { model: 'OperationTheatre', id: s._id },
        description: l.description, qty: l.qty, unitPrice: l.unitPrice,
        amount: l.qty * l.unitPrice, postedBy: req.user._id,
      })));
    }
    res.json({ id: String(s._id), chargedLines: lines.length });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

router.get('/stats', protect, async (req, res) => {
  try {
    const hFilter = {};
    if (req.user.hospitalId && req.user.role !== 'superadmin') hFilter.hospitalId = req.user.hospitalId;
    const total = await OperationTheatre.countDocuments(hFilter);
    const scheduled = await OperationTheatre.countDocuments({ ...hFilter, status: 'Scheduled' });
    const inProgress = await OperationTheatre.countDocuments({ ...hFilter, status: { $in: ['In Progress', 'Pre-Op'] } });
    const completed = await OperationTheatre.countDocuments({ ...hFilter, status: 'Completed' });
    const today = await OperationTheatre.countDocuments({ ...hFilter, scheduledDate: { $gte: new Date().setHours(0,0,0,0) } });
    res.json({ total, scheduled, inProgress, completed, today });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;