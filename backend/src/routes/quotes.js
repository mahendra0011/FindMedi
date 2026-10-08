import express from 'express';
import Quote from '../models/Quote.js';
import Provider from '../models/Provider.js';
import { authorizeObject } from '../middleware/authorize.js';
import { auditLog } from '../middleware/audit.js';
import { bookingLimiter } from '../middleware/rateLimit.js';
import { idempotencyGuard } from '../middleware/idempotency.js';
import {
  validate, createQuoteRequestSchema, sendQuoteSchema, acceptQuoteSchema, quoteDecisionSchema,
} from '../utils/validate.js';
import { protect } from '../middleware/auth.js';
import {
  QUOTE_STATUS, QUOTE_TRANSITIONS, canTransition, computeQuoteTotals,
  quoteExpiryDate, isQuoteExpired,
} from '../lib/flowStates.js';

// FLOW-B (5.md 3) - request & quote.
//
//   REQUESTED -> QUOTE_SENT -> ACCEPTED | DECLINED | EXPIRED | CANCELLED
//
// Every state move goes through a compare-and-set (`{_id, status: from}` in the
// filter of findOneAndUpdate) rather than read-then-write. Two of the three
// moves here are money-adjacent — sending a quote the patient may pay against,
// and accepting it — and the failure mode of a check-then-set is both clicks
// succeeding. The transition table in lib/flowStates.js is the only authority on
// what may follow what; this file never invents an edge.
//
// Prices: the provider sends LINE ITEMS, the server computes the totals
// (computeQuoteTotals) and stores them. A body carrying `totalAmount` is a 400
// from the strict schema, so there is no path where a patient is billed a
// number they supplied.

const router = express.Router();

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const requireObjectId = (req, res, next) => (
  OBJECT_ID.test(String(req.params.id))
    ? next()
    : res.status(404).json({ message: 'Not found' })
);

const actorId = (req) => req.user._id ?? req.user.id;

const denyTransition = (res, from, to) => res.status(409).json({
  message: `Quote cannot move from ${from} to ${to}`,
  code: 'ILLEGAL_STATE_TRANSITION',
  from,
  to,
});

const historyEntry = (req, from, to, note = '') => ({
  from, to, by: actorId(req), role: String(req.user.role || ''), note, at: new Date(),
});

/** The caller's own providers, or [] when they own none. */
const ownedProviderIds = async (req) => {
  const owned = await Provider.find({ ownerUserId: actorId(req) }).select('_id').lean();
  return owned.map((p) => String(p._id));
};

//
// The subject of a request is the patient who filed it; the provider who was
// addressed it is the other party. A caller may see either side but only
// their own: the filter is an OR over the two ids the caller can actually hold,
// never over the id in the query string.
// authz: self
router.get('/', protect, async (req, res) => {
  try {
    const me = actorId(req);
    const filter = {};
    if (req.user.role !== 'superadmin') {
      const scopes = [{ patientId: me }];
      const providerIds = await ownedProviderIds(req);
      if (providerIds.length) scopes.push({ providerOwnerId: { $in: providerIds } });
      filter.$or = scopes;
    }
    if (req.query.providerId) {
      const requested = String(req.query.providerId);
      if (req.user.role !== 'superadmin') {
        const mine = await ownedProviderIds(req);
        if (!mine.includes(requested)) return res.status(404).json({ message: 'Not found' });
      }
      filter.providerId = requested;
    }
    if (req.query.status && QUOTE_TRANSITIONS[req.query.status]) filter.status = String(req.query.status);

    const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit ?? 20), 10) || 20, 1), 100);
    const page = Math.max(Number.parseInt(String(req.query.page ?? 1), 10) || 1, 1);
    const [quotes, total] = await Promise.all([
      Quote.find(filter)
        .select('-updatedAt -__v')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Quote.countDocuments(filter),
    ]);
    return res.json({
      quotes: quotes.map((q) => ({ ...q, effectiveStatus: isQuoteExpired(q) ? QUOTE_STATUS.EXPIRED : q.status })),
      total, page, pages: Math.ceil(total / limit) || 1, limit,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

//
// The patient files the request and names the provider; nobody OWNS that
// provider here, so this is a self-scoped create: patientId comes from the
// session, providerId is looked up and must exist and be taking work. The
// provider's owner id is denormalized onto the row so every later
// authorization can resolve ownership without a second query.
// authz: self
router.post('/', protect, bookingLimiter, idempotencyGuard({ prefix: 'quote-request' }), validate(createQuoteRequestSchema), async (req, res) => {
  try {
    const provider = await Provider.findById(req.body.providerId).lean();
    if (!provider) return res.status(404).json({ message: 'Not found' });
    if (!['approved', 'live'].includes(provider.status)) {
      return res.status(409).json({ message: 'Provider is not accepting requests', code: 'PROVIDER_NOT_TAKING_REQUESTS' });
    }
    if (!provider.ownerUserId) {
      return res.status(409).json({ message: 'Provider has no owner to answer', code: 'PROVIDER_HAS_NO_OWNER' });
    }

    const { providerId, ...data } = req.body;
    const quote = await Quote.create({
      ...data,
      patientId: actorId(req),
      providerId,
      providerOwnerId: provider.ownerUserId,
      status: QUOTE_STATUS.REQUESTED,
    });
    await auditLog('quote_requested', actorId(req), {
      quoteId: quote._id, providerId, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.status(201).json(quote);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
router.get('/:id', protect, requireObjectId, authorizeObject({
  model: Quote,
  idFrom: (req) => req.params.id,
  ownerFields: ['patientId', 'providerOwnerId'],
  actorRoles: [],
  read: true,
}), (req, res) => {
  const quote = req.scoped;
  const expired = isQuoteExpired(quote);
  return res.json({ ...quote.toObject(), effectiveStatus: expired ? QUOTE_STATUS.EXPIRED : quote.status });
});

// authz: object
//
// Only the ADDRESSEE may quote: ownership resolves through the parent provider
// (ownerLoader), the same shape routes/providerServices.js uses, so a caller
// cannot attach a price to somebody else's request.
router.post('/:id/quote', protect, requireObjectId, bookingLimiter, validate(sendQuoteSchema), authorizeObject({
  model: Quote,
  idFrom: (req) => req.params.id,
  ownerLoader: async (doc) => {
    const provider = await Provider.findById(doc.providerId);
    return provider?.ownerUserId ?? null;
  },
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const current = req.scoped;
    const totals = computeQuoteTotals({ lineItems: req.body.lineItems, gstRate: req.body.gstRate ?? 0 });
    const now = new Date();
    const validUntil = quoteExpiryDate(now);
    const update = {
      $set: {
        status: QUOTE_STATUS.QUOTE_SENT,
        quote: {
          ...totals,
          validUntil,
          cancellationTerms: req.body.cancellationTerms ?? '',
          notes: req.body.notes ?? '',
          sentAt: now,
        },
        expiresAt: validUntil,
      },
      $push: { history: historyEntry(req, current.status, QUOTE_STATUS.QUOTE_SENT) },
    };
    if (!canTransition(QUOTE_TRANSITIONS, current.status, QUOTE_STATUS.QUOTE_SENT)) {
      return denyTransition(res, current.status, QUOTE_STATUS.QUOTE_SENT);
    }
    // CAS: two provider clicks must not append two quotes or push the
    // validity window twice.
    const updated = await Quote.findOneAndUpdate(
      { _id: current._id, status: current.status },
      update,
      { new: true, runValidators: true },
    );
    if (!updated) return denyTransition(res, current.status, QUOTE_STATUS.QUOTE_SENT);
    await auditLog('quote_sent', actorId(req), {
      quoteId: updated._id, totalAmount: totals.totalAmount, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.json(updated);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
//
// The accept is the money-adjacent move, so it is guarded three ways: the
// strict schema refuses any body field (including a price), the transition
// table refuses a quote that is not QUOTE_SENT, and the update itself is a CAS
// on `status` so the second of two simultaneous clicks matches nothing and
// replays the first's result instead of charging twice.
//
// TODO(FLOW-B): escrow. 5.md 3 holds the advance until the service starts and
// releases it after a 48 h dispute window. There is no escrow ledger entry in
// this codebase yet (payments.js captures, demoPayment.js holds), so the row
// records the agreed advance amount with `held: false` rather than pretending
// money moved. Wiring this = create the Payment/Refund pair keyed on quoteId at
// this transition and flip `held` on capture.
router.post('/:id/accept', protect, requireObjectId, bookingLimiter, idempotencyGuard({ prefix: 'quote-accept' }), validate(acceptQuoteSchema), authorizeObject({
  model: Quote,
  idFrom: (req) => req.params.id,
  ownerField: 'patientId',
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const current = req.scoped;
    if (isQuoteExpired(current)) {
      await Quote.updateOne({ _id: current._id, status: { $in: [QUOTE_STATUS.QUOTE_SENT, QUOTE_STATUS.EXPIRED] } }, {
        $set: { status: QUOTE_STATUS.EXPIRED },
        $push: { history: historyEntry(req, current.status, QUOTE_STATUS.EXPIRED, 'validity window elapsed') },
      });
      return res.status(409).json({ message: 'Quote validity has elapsed', code: 'QUOTE_EXPIRED' });
    }
    if (!canTransition(QUOTE_TRANSITIONS, current.status, QUOTE_STATUS.ACCEPTED)) {
      return denyTransition(res, current.status, QUOTE_STATUS.ACCEPTED);
    }

    const now = new Date();
    const updated = await Quote.findOneAndUpdate(
      { _id: current._id, status: QUOTE_STATUS.QUOTE_SENT },
      {
        $set: {
          status: QUOTE_STATUS.ACCEPTED,
          acceptedAt: now,
          'advance.amount': current.quote?.totalAmount ?? 0,
          'advance.held': false,
        },
        $push: { history: historyEntry(req, QUOTE_STATUS.QUOTE_SENT, QUOTE_STATUS.ACCEPTED) },
      },
      { new: true, runValidators: true },
    );

    if (!updated) {
      // Somebody else's accept won the CAS. Re-reading turns "lost the race"
      // into the idempotent 200 the winner already got - NOT a second write.
      const existing = await Quote.findById(current._id).lean();
      if (existing?.status === QUOTE_STATUS.ACCEPTED) return res.json(existing);
      return denyTransition(res, current.status, QUOTE_STATUS.ACCEPTED);
    }

    await auditLog('quote_accepted', actorId(req), {
      quoteId: updated._id, totalAmount: updated.quote?.totalAmount ?? 0, ip: req.ip, userAgent: req.get('user-agent'),
    });
    return res.json(updated);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
//
// Either party may walk away — the patient rejecting the price, the provider
// declining the job — and both need a reason, because the reason is what the
// dispute flow reads later.
router.post('/:id/decline', protect, requireObjectId, validate(quoteDecisionSchema), authorizeObject({
  model: Quote,
  idFrom: (req) => req.params.id,
  ownerFields: ['patientId', 'providerOwnerId'],
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const current = req.scoped;
    if (!canTransition(QUOTE_TRANSITIONS, current.status, QUOTE_STATUS.DECLINED)) {
      return denyTransition(res, current.status, QUOTE_STATUS.DECLINED);
    }
    const updated = await Quote.findOneAndUpdate(
      { _id: current._id, status: current.status },
      {
        $set: { status: QUOTE_STATUS.DECLINED, decision: { reason: req.body.reason, by: actorId(req), at: new Date() } },
        $push: { history: historyEntry(req, current.status, QUOTE_STATUS.DECLINED, req.body.reason) },
      },
      { new: true, runValidators: true },
    );
    if (!updated) return denyTransition(res, current.status, QUOTE_STATUS.DECLINED);
    await auditLog('quote_declined', actorId(req), { quoteId: updated._id, by: req.user.role, ip: req.ip });
    return res.json(updated);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// authz: object
//
// Cancel is the PATIENT withdrawing the request before a quote is settled.
// It is separate from decline because decline is a judgement on the quote and
// cancel is a withdrawal of the ask; the table treats both as terminal.
router.post('/:id/cancel', protect, requireObjectId, validate(quoteDecisionSchema), authorizeObject({
  model: Quote,
  idFrom: (req) => req.params.id,
  ownerField: 'patientId',
  actorRoles: [],
  write: true,
}), async (req, res) => {
  try {
    const current = req.scoped;
    if (!canTransition(QUOTE_TRANSITIONS, current.status, QUOTE_STATUS.CANCELLED)) {
      return denyTransition(res, current.status, QUOTE_STATUS.CANCELLED);
    }
    const updated = await Quote.findOneAndUpdate(
      { _id: current._id, status: current.status },
      {
        $set: { status: QUOTE_STATUS.CANCELLED, decision: { reason: req.body.reason, by: actorId(req), at: new Date() } },
        $push: { history: historyEntry(req, current.status, QUOTE_STATUS.CANCELLED, req.body.reason) },
      },
      { new: true, runValidators: true },
    );
    if (!updated) return denyTransition(res, current.status, QUOTE_STATUS.CANCELLED);
    await auditLog('quote_cancelled', actorId(req), { quoteId: updated._id, ip: req.ip });
    return res.json(updated);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

export default router;
