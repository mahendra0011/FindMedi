import express from 'express';
import Appointment from '../models/Appointment.js';
import LabBooking from '../models/LabBooking.js';
import AppointmentSeries from '../models/AppointmentSeries.js';
import Event from '../models/Event.js';
import EventRegistration from '../models/EventRegistration.js';
import VaccinationSchedule from '../models/VaccinationSchedule.js';
import Record from '../models/Record.js';
import { protect, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { getISTDateString } from '../utils/dateUtils.js';
import { RECORD_TYPE_OPTIONS } from '../utils/validate.js';
import { REGISTRATION_STATUS } from '../lib/flowStates.js';
import { resolveProfileAccess } from '../services/profileAccess.js';

const router = express.Router();

const actorId = (req) => req.user._id ?? req.user.id;

// 6.md §2.6's upcoming kinds and §2.10's records history, behind one route.
// Physio sessions, home visits and classes are listed in §2.6 but have no
// schedule to read in this repo: Physiotherapy.sessions is a log of COMPLETED
// sessions (exercisesPerformed/progressNote, sessionsCompleted mirrors its
// length) and no home-visit/class model exists — the timeline shows what the
// data can actually answer rather than inventing future slots.
const UPCOMING_TYPES = ['appointment', 'lab_test', 'series', 'event', 'vaccination'];

const SOURCE_CAP = 50;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// Same normalization as Record's `set` mutator (lowercase + underscored), so
// display-style vocabulary like 'Lab Report' queries the stored 'lab_report'.
const normalizeRecordType = (raw) => raw.toLowerCase().replace(/\s+/g, '_');

const isIsoDate = (raw) => /^\d{4}-\d{2}-\d{2}$/.test(raw);

// ─── Unified timeline (6.md §2.6 upcoming + §2.10 history, route /patient/timeline) ──
// segment=upcoming merges the patient's future bookings into one list sorted
// by instant; segment=history is the records timeline with person/type/date
// filters. Every source is session-scoped with the SAME forward-compatible
// `familyMemberId` predicate the dashboard summary uses: null matches rows
// written today without the field, a profile id asks for rows attributed to
// that family member (VaccinationSchedule carries it today, the booking
// models light up when their person tag lands).
//
// DTO allowlist: each kind picks its own display fields — no raw document is
// echoed, and family/clinical fields outside the list can never ride along.
// authz: object
router.get('/', protect, authorize('records:read', 'records:read:own'), async (req, res) => {
  try {
    const me = actorId(req);

    const segment = req.query.segment == null || req.query.segment === '' ? 'upcoming' : String(req.query.segment);
    if (!['upcoming', 'history'].includes(segment)) {
      return res.status(400).json({ message: 'segment must be upcoming or history' });
    }

    // History's vocabulary IS the Record type enum (via the zod options that
    // validateVocab pins as a superset of the model enum).
    const allowedTypes = segment === 'upcoming' ? UPCOMING_TYPES : RECORD_TYPE_OPTIONS;
    let type = req.query.type == null || req.query.type === '' ? null : String(req.query.type);
    if (type && !allowedTypes.includes(type)) {
      // 400, not a silent ignore: an unknown filter that quietly returns
      // everything (upcoming) or nothing (history) reads as "no data".
      return res.status(400).json({ message: `Unknown type filter for ${segment}` });
    }
    if (type && segment === 'history') type = normalizeRecordType(type);

    const dateFrom = req.query.dateFrom == null || req.query.dateFrom === '' ? null : String(req.query.dateFrom);
    const dateTo = req.query.dateTo == null || req.query.dateTo === '' ? null : String(req.query.dateTo);
    if (segment === 'history') {
      if ((dateFrom && !isIsoDate(dateFrom)) || (dateTo && !isIsoDate(dateTo))) {
        return res.status(400).json({ message: 'dateFrom/dateTo must be YYYY-MM-DD' });
      }
      if (dateFrom && dateTo && dateTo < dateFrom) {
        return res.status(400).json({ message: 'dateTo must not precede dateFrom' });
      }
    }

    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(req.query.limit ?? String(DEFAULT_LIMIT)), 10) || DEFAULT_LIMIT));

    // Object-level decision (self or authorised family) before any read.
    const access = await resolveProfileAccess(req, req.query.personId);
    if (!access.ok) return res.status(404).json({ message: 'Profile not found' });

    res.set('Cache-Control', 'no-store');
    const scope = access.scope;
    let items = [];
    let total = 0;

    if (segment === 'upcoming') {
      const today = getISTDateString();
      const now = new Date();
      const wanted = (kind) => !type || type === kind;
      const sources = await Promise.all([
        wanted('appointment') ? Appointment.find({
          patientId: me, familyMemberId: scope,
          date: { $gte: today }, status: { $in: ['Pending', 'Confirmed'] },
        }).sort({ date: 1, time: 1 }).limit(SOURCE_CAP).lean() : [],
        wanted('lab_test') ? LabBooking.find({
          patientId: me, familyMemberId: scope,
          bookingDate: { $gte: now }, status: { $nin: ['Cancelled', 'Completed', 'Rescheduled'] },
        }).sort({ bookingDate: 1 }).limit(SOURCE_CAP).lean() : [],
        wanted('series') ? AppointmentSeries.find({
          patientId: me, familyMemberId: scope, status: 'active',
          occurrenceDates: { $gte: today },
        }).limit(SOURCE_CAP).lean() : [],
        wanted('event') ? (async () => {
          const regs = await EventRegistration.find({
            userId: me, familyMemberId: scope, status: REGISTRATION_STATUS.REGISTERED,
          }).limit(SOURCE_CAP).lean();
          if (!regs.length) return [];
          const events = await Event.find({
            _id: { $in: regs.map((r) => r.eventId) },
            'schedule.start': { $gte: now },
          }).lean();
          return events.map((e) => ({ reg: regs.find((r) => String(r.eventId) === String(e._id)), event: e }));
        })() : [],
        wanted('vaccination') ? VaccinationSchedule.find({
          userId: me, familyMemberId: scope, status: 'scheduled',
          doses: { $elemMatch: { dueAt: { $gte: now }, givenAt: null } },
        }).limit(SOURCE_CAP).lean() : [],
      ]);

      const [appointments, labBookings, series, eventPairs, vaccinations] = sources;

      for (const a of appointments) {
        items.push({ kind: 'appointment', id: String(a._id), at: a.date, time: a.time, status: a.status, title: a.doctor, department: a.department });
      }
      for (const b of labBookings) {
        items.push({ kind: 'lab_test', id: String(b._id), at: b.bookingDate?.toISOString?.() ?? String(b.bookingDate), time: b.timeSlot ?? '', status: b.status, title: (b.tests ?? []).join(', '), visitType: b.visitType });
      }
      for (const s of series) {
        for (const d of (s.occurrenceDates ?? []).filter((d) => d >= today).slice(0, SOURCE_CAP)) {
          items.push({ kind: 'series', id: String(s._id), at: d, time: s.time, status: s.status, title: s.doctor, seriesType: s.type });
        }
      }
      for (const pair of eventPairs) {
        items.push({
          kind: 'event', id: String(pair.reg._id), eventId: String(pair.event._id),
          at: pair.event.schedule?.start?.toISOString?.() ?? '', status: pair.reg.status,
          title: pair.event.title, mode: pair.event.venue?.mode,
        });
      }
      for (const v of vaccinations) {
        for (const dose of (v.doses ?? []).filter((d) => d.dueAt && !d.givenAt && d.dueAt >= now)) {
          items.push({ kind: 'vaccination', id: `${v._id}#${dose.number}`, at: dose.dueAt.toISOString(), status: v.status, title: v.vaccineName, dose: dose.number, centre: dose.centre || undefined });
        }
      }

      items.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.id < b.id ? -1 : 1));
      total = items.length;
      items = items.slice((page - 1) * limit, page * limit);
    } else {
      const dateFilter = {};
      if (dateFrom) dateFilter.$gte = dateFrom;
      if (dateTo) dateFilter.$lte = dateTo;
      const filter = { patientId: me, familyMemberId: scope };
      if (type) filter.type = type;
      if (dateFrom || dateTo) filter.date = dateFilter;

      total = await Record.countDocuments(filter);
      const rows = await Record.find(filter)
        .sort({ date: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      // Allowlist: id/date/type/doctor/diagnosis only — vitals, prescription
      // body, appointment linkage and the raw `patient` string stay out.
      items = rows.map((r) => ({
        kind: 'record', id: String(r._id), at: r.date, type: r.type,
        title: r.diagnosis || r.type, doctor: r.doctor,
      }));
    }

    await auditLog('patient_timeline_viewed', me, {
      segment, type, personId: access.profile.id, personKind: access.profile.kind, count: items.length,
      ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.json({
      segment,
      person: access.profile,
      items, total, page, limit,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
