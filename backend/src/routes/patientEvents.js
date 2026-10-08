import express from 'express';
import EventRegistration from '../models/EventRegistration.js';
import { protect } from '../middleware/auth.js';
import { REGISTRATION_STATUS } from '../lib/flowStates.js';

const router = express.Router();

const actorId = (req) => req.user._id ?? req.user.id;

const toPositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

// ─── My events (6.md 140 `GET /patient/events`) ────────────────────────────
// My registrations with the event attached — the dashboard's "what's on for
// me" list. Session-scoped at the QUERY: userId comes from the session and
// there is no id parameter at all, so another attendee's registration is not
// reachable by guessing — there is nothing to guess.
//
// checkInCode stays OUT of the projection: it is the credential scanned at
// the venue door, and the detail read (events.js GET /:id/registration) is
// where the attendee fetches it. The event join carries the public event
// fields minus outcomeReport — the same allowlist the public list uses.
// authz: self
router.get('/', protect, async (req, res) => {
  try {
    const filter = { userId: actorId(req) };
    const wanted = req.query.status ? String(req.query.status) : '';
    if (wanted && Object.values(REGISTRATION_STATUS).includes(wanted)) filter.status = wanted;

    const limit = toPositiveInt(req.query.limit, 20, 100);
    const page = toPositiveInt(req.query.page, 1, 10000);

    const [registrations, total] = await Promise.all([
      EventRegistration.find(filter)
        .select('-checkInCode -__v')
        .populate('eventId', '-outcomeReport -__v')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      EventRegistration.countDocuments(filter),
    ]);

    res.json({
      registrations,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      limit,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
