import express from 'express';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import Billing from '../models/Billing.js';
import LabBooking from '../models/LabBooking.js';
import { protect, authorize, optionalProtect as authStublessProtect } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimit.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import { validate } from '../utils/validate.js';
import { z } from 'zod';
import { scrubAndValidateEvent, generatePseudonymousId } from '../config/analyticsEvents.js';
import logger from '../config/logger.js';
import { Types } from 'mongoose';

const router = express.Router();

// DLB-23: this endpoint was `protect`-only and scoped with
// `if (req.user?.hospitalId)`. Every account WITHOUT a hospital (patients,
// doctors, riders, lawyers) got platform-wide appointments, patients, bills and
// lab bookings — i.e. the whole clinic's revenue and patient list.
router.get('/doctor', protect, authorize('reports:read'), async (req, res) => {
  try {
    const { doctorId, name } = req.query;
    const query = {};

    // Tenant scope is mandatory: superadmin may omit it, nobody else.
    if (req.user?.role !== 'superadmin') {
      const scope = req.user?.hospitalId || req.user?.facilityId;
      if (!scope) {
        return res.status(403).json({ message: 'Analytics are limited to hospital/facility accounts' });
      }
      query.hospitalId = String(scope);
    }

    // Determine doctor filter
    if (doctorId && doctorId !== 'all') {
      if (Types.ObjectId.isValid(doctorId)) {
        query.doctorId = new Types.ObjectId(doctorId);
      } else {
        query.doctor = { $regex: doctorId, $options: 'i' };
      }
    } else if (name) {
      query.doctor = { $regex: name, $options: 'i' };
    } else if (['Clinic Doctor', 'clinic_doctor', 'Hospital Doctor', 'doctor'].includes(req.user.role)) {
      query.doctor = { $regex: req.user.name, $options: 'i' };
    }

    // Fetch Appointments
    const appointments = await Appointment.find(query).select('date time status type').lean();
    
    // Fetch Patients
    const patientQuery = {};
    if (query.hospitalId) patientQuery.hospitalId = query.hospitalId;
    if (query.doctor) patientQuery.doctor = query.doctor;
    if (query.doctorId) patientQuery.doctorId = query.doctorId;
    const patients = await Patient.find(patientQuery).select('age gender').lean();

    // Fetch Bills for Earnings
    const bills = await Billing.find(query).select('date amount paid type service').lean();

    // Fetch Lab Bookings (tests)
    const labQuery = {};
    if (query.hospitalId) labQuery.hospitalId = query.hospitalId;
    if (req.user?._id) labQuery.createdBy = req.user._id;
    const labBookings = await LabBooking.find(labQuery).select('bookingDate status totalAmount paymentStatus').lean();

    res.json({
      success: true,
      appointments,
      patients,
      bills,
      labBookings,
    });
  } catch (error) {
    logger.error('Error fetching doctor analytics:', error);
    res.status(500).json({ success: false, message: 'Error fetching analytics' });
  }
});

// ─── SITE-ANT 3.3: event ingestion — the ONLY write path for product analytics.
// Public (anonymous sessions must be countable), but every event passes the
// registry scrubber (config/analyticsEvents.js): unknown names, PII in props,
// sensitive-category detail and minors are all rejected/dropped server-side.
// Storage is fire-and-forget: analytics must never slow or fail a page.
const analyticsIngestSchema = z
  .object({
    consent_analytics: z.boolean().optional(),
    events: z
      .array(
        z
          .object({
            name: z.string().min(1).max(64),
            ts: z.string().datetime().optional(),
            props: z
              .record(z.string().max(60), z.union([z.string().max(240), z.number(), z.boolean()]))
              .optional(),
            session_id: z.string().max(64).optional(),
            platform: z.enum(['web', 'pwa', 'android', 'ios', 'server']).optional(),
            app_version: z.string().max(32).optional(),
            locale: z.enum(['hi', 'en']).optional(),
            city_code: z.string().max(24).optional(),
            anon_id: z.string().max(64).optional(),
            is_minor: z.boolean().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(25),
  })
  .strict();

router.post('/events', generalLimiter, authStublessProtect, validate(analyticsIngestSchema), async (req, res) => {
  const { events, consent_analytics } = req.body;
  // Consent-first (events.yaml: consent_analytics is a global): "false" in the
  // payload stores nothing — accepted so the client does not retry forever.
  if (consent_analytics === false) {
    return res.status(202).json({ success: true, accepted: 0, rejected: events.length, reason: 'consent_withdrawn' });
  }
  const results = [];
  for (const item of events) {
    // The scrubber rejects minors, unknown names and PII-carrying props, then
    // returns the values we are ALLOWED to store (PII-free, sensitive category
    // masked to count-only).
    const ownerRef = req.user ? String(req.user.id || req.user._id || '') : item.anon_id || null;
    const scrubbed = scrubAndValidateEvent(item.name, item.props || {}, {
      userId: ownerRef || null,
      isMinor: Boolean(item.is_minor),
    });
    if (!scrubbed.ok) {
      results.push({ name: item.name, ok: false, reason: scrubbed.reason });
      continue;
    }
    const row = {
      event_id: scrubbed.event.event_id,
      name: item.name,
      ts: item.ts ? new Date(item.ts) : new Date(scrubbed.event.ts),
      distinct_id: scrubbed.event.distinct_id || generatePseudonymousId(item.anon_id || '') || '',
      session_id: item.session_id || '',
      platform: item.platform || '',
      app_version: item.app_version || '',
      locale: item.locale || '',
      city_code: item.city_code || '',
      user_role: req.user?.role ? String(req.user.role) : '',
      consent: { analytics: true },
      props: scrubbed.event || {},
    };
    results.push({ name: item.name, ok: true });
    AnalyticsEvent.create(row).catch((err) => {
      if (err?.name !== 'ValidationError') logger.error(`analytics ingest failed: ${err.message}`);
    });
  }
  res.status(202).json({
    success: true,
    accepted: results.filter((r) => r.ok).length,
    rejected: results.filter((r) => !r.ok),
  });
});

export default router;
