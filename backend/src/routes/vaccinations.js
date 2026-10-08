import express from 'express';
import VaccinationSchedule from '../models/VaccinationSchedule.js';
import FamilyMember from '../models/FamilyMember.js';
import Record from '../models/Record.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import {
  validate, createVaccinationScheduleSchema, doseGivenSchema,
} from '../utils/validate.js';
import logger from '../config/logger.js';

// A4 / rolesmd 6.md §2.5 (page /patient/vaccinations: "Vaccine schedule &
// certificates") + 10.md §4.3 (GET /api/patient/vaccinations).
//
// This is the SCHEDULE; a Record of type `vaccination_record` is ONE
// administered dose's certificate. "due/overdue" is a date comparison against
// the row, so it is derived at READ time (Event `full` pattern) and never
// stored - a stored flag goes stale the moment the clock crosses the due date,
// and backfilling it would be a migration for a value that is pure arithmetic.
//
// Gating: protect + authorize(records:*:own) - the clinical-records permission
// the patient role holds - with the handler additionally scoped to the
// session's own rows, so a foreign id answers 404 rather than an empty 200
// (AUTHZ-M-01's existence oracle). The `// authz: role` tags record the
// middleware gate, which is what classify() sees on these definition lines.
const router = express.Router();
router.use(protect);

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id))
    ? next()
    : res.status(404).json({ message: 'Not found' })
);

const actorId = (req) => req.user._id ?? req.user.id;

// Read-time reminder window: "overdue" = past due and not yet given, "due" =
// within the next 30 days, otherwise "upcoming". Data, not a calendar lookup
// the client performs - the page renders straight from these tokens.
const DUE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Attach the derived read-time state. Nothing here is written back: the row
 * keeps only `doses[].givenAt`, and every list/detail response recomputes
 * state/overdueCount/nextDueAt against the clock it was read at.
 */
const derive = (row) => {
  const plain = typeof row?.toObject === 'function' ? row.toObject() : { ...row };
  const now = Date.now();
  let overdueCount = 0;
  let nextDueMs = null;
  const doses = (plain.doses || []).map((dose) => {
    const dueMs = dose.dueAt ? new Date(dose.dueAt).getTime() : NaN;
    const given = Boolean(dose.givenAt);
    let state = 'upcoming';
    if (given) {
      state = 'given';
    } else if (Number.isFinite(dueMs)) {
      if (dueMs < now) {
        state = 'overdue';
        overdueCount += 1;
      } else if (dueMs <= now + DUE_WINDOW_MS) {
        state = 'due';
      }
      if (nextDueMs === null || dueMs < nextDueMs) nextDueMs = dueMs;
    }
    return { ...dose, state };
  });
  return {
    ...plain,
    doses,
    overdueCount,
    nextDueAt: nextDueMs === null ? null : new Date(nextDueMs),
  };
};

// ─── List / create ──────────────────────────────────────────────────────────

// authz: role
router.get('/', authorize('records:read:own'), async (req, res) => {
  try {
    const filter = { userId: actorId(req) };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.familyMemberId !== undefined) {
      if (!OBJECT_ID.test(String(req.query.familyMemberId))) {
        return res.status(400).json({ message: 'familyMemberId must be a valid id' });
      }
      filter.familyMemberId = req.query.familyMemberId;
    }
    const rows = await VaccinationSchedule.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ schedules: rows.map(derive) });
  } catch (err) {
    logger.error(`List vaccination schedules error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role
router.post('/', authorize('records:write:own'), validate(createVaccinationScheduleSchema), async (req, res) => {
  try {
    // A child schedule belongs to a FAMILY MEMBER of this account: a
    // familyMemberId outside that set is a 404, never a silently-adopted
    // stranger's row (the same re-parenting hole P1-5 closed on FamilyMember).
    if (req.body.familyMemberId) {
      const member = await FamilyMember.findOne({ _id: req.body.familyMemberId, patientId: actorId(req) });
      if (!member) return res.status(404).json({ message: 'Family member not found' });
    }
    const created = await VaccinationSchedule.create({ ...req.body, userId: actorId(req) });
    await auditLog('vaccination_schedule_created', actorId(req), {
      scheduleId: created._id, familyMemberId: created.familyMemberId ?? null, ip: req.ip,
    });
    return res.status(201).json(derive(created));
  } catch (err) {
    logger.error(`Create vaccination schedule error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
});

// ─── Detail / dose check-off / cancel ───────────────────────────────────────

// authz: role
router.get('/:id', authorize('records:read:own'), requireObjectId, async (req, res) => {
  try {
    const row = await VaccinationSchedule.findOne({ _id: req.params.id, userId: actorId(req) }).lean();
    // 404 rather than 403 for a foreign id: confirming the id exists is itself
    // a disclosure (deletionRequests' rule).
    if (!row) return res.status(404).json({ message: 'Vaccination schedule not found' });
    return res.json(derive(row));
  } catch (err) {
    logger.error(`Get vaccination schedule error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

// authz: role
router.post('/:id/doses/:number/given', authorize('records:write:own'), requireObjectId, validate(doseGivenSchema), async (req, res) => {
  try {
    const row = await VaccinationSchedule.findOne({ _id: req.params.id, userId: actorId(req) });
    if (!row) return res.status(404).json({ message: 'Vaccination schedule not found' });
    if (row.status === 'cancelled') {
      return res.status(409).json({ message: `Cannot record a dose on a '${row.status}' schedule` });
    }
    const dose = (row.doses || []).find((d) => Number(d.number) === Number(req.params.number));
    if (!dose) return res.status(404).json({ message: 'Dose not found' });
    if (dose.givenAt) return res.status(409).json({ message: 'Dose already given' });

    // The certificate is a Record; it must exist AND belong to this account
    // before it can be cited, or the link would become a cross-account read.
    if (req.body.recordId) {
      const record = await Record.findById(req.body.recordId).select('_id patientId').lean();
      if (!record || String(record.patientId) !== String(actorId(req))) {
        return res.status(404).json({ message: 'Record not found' });
      }
    }

    dose.givenAt = req.body.givenAt ?? new Date();
    if (req.body.centre !== undefined) dose.centre = req.body.centre;
    if (req.body.batchNo !== undefined) dose.batchNo = req.body.batchNo;
    if (req.body.recordId !== undefined) dose.recordId = req.body.recordId;

    // Completion is derived from the rows: every dose given means the schedule
    // is done. There is no client-writable `status`.
    const allGiven = (row.doses || []).every((d) => d.givenAt);
    if (allGiven && row.status === 'scheduled') {
      row.status = 'completed';
      row.completedAt = new Date();
    }
    await row.save();

    await auditLog('vaccination_dose_recorded', actorId(req), {
      scheduleId: row._id, doseNumber: Number(req.params.number), ip: req.ip,
    });
    return res.json(derive(row));
  } catch (err) {
    logger.error(`Record vaccination dose error: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
});

// Cancel-in-place: the schedule is history (doses were checked off against it),
// so DELETE flips `status` rather than removing the row - the same reasoning as
// providerCatalog's archive-on-delete.
// authz: role
router.delete('/:id', authorize('records:write:own'), requireObjectId, async (req, res) => {
  try {
    const row = await VaccinationSchedule.findOne({ _id: req.params.id, userId: actorId(req) });
    if (!row) return res.status(404).json({ message: 'Vaccination schedule not found' });
    if (row.status !== 'scheduled') {
      return res.status(409).json({ message: `Cannot cancel a schedule in status '${row.status}'` });
    }
    row.status = 'cancelled';
    await row.save();
    await auditLog('vaccination_schedule_cancelled', actorId(req), {
      scheduleId: row._id, ip: req.ip,
    });
    return res.json({ _id: row._id, status: row.status });
  } catch (err) {
    logger.error(`Cancel vaccination schedule error: ${err.message}`);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
